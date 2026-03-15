#!/usr/bin/env python3
"""
Supply Chain Tariff Simulation Runner — SWAPS & SWPPV
=====================================================
Sends each generated JSON to ACTUS /eventsBatch and prints results.

Usage:
  python run_all_simulations.py                                              # run 6 smoke tests
  python run_all_simulations.py --url http://34.203.247.32:8083/eventsBatch  # remote server
  python run_all_simulations.py --file 01c-SWAPS-TariffSpread-Baseline.json  # single file
  python run_all_simulations.py --category 01                                # all TariffSpread
  python run_all_simulations.py --compare 01a 01b                            # baseline vs stressed
  python run_all_simulations.py --quick                                      # 6 key smoke tests
  python run_all_simulations.py --all                                        # all 51 simulations
"""

import json, os, sys, argparse, glob
from datetime import datetime

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run:  pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_URL = "http://127.0.0.1:8083/eventsBatch"

def fmt_money(v):
    if v is None: return "$0.00"
    return f"${abs(v):,.2f}" if v >= 0 else f"-${abs(v):,.2f}"

def event_summary(events):
    summary = {}
    for e in events:
        t = e.get("type", "?")
        p = e.get("payoff", 0) or 0
        if t not in summary:
            summary[t] = {"count": 0, "total_payoff": 0.0}
        summary[t]["count"] += 1
        summary[t]["total_payoff"] += p
    return summary

def total_interest(events):
    return sum(e.get("payoff", 0) or 0 for e in events if e.get("type") == "IP")

def total_cashflows(events):
    return sum(e.get("payoff", 0) or 0 for e in events)

def extract_payload(sim):
    """Extract contracts/riskFactors from either raw payload or Postman Collection format."""
    # Postman Collection v2.1.0 format
    if "info" in sim and "item" in sim:
        try:
            raw_str = sim["item"][0]["request"]["body"]["raw"]
            payload = json.loads(raw_str)
            desc = sim["info"].get("description", "")
            return payload, desc
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            raise ValueError(f"Postman format detected but payload extraction failed: {e}")
    # Raw payload format (legacy)
    if "contracts" in sim:
        desc = sim.get("_description", "")
        return {"contracts": sim["contracts"], "riskFactors": sim.get("riskFactors", [])}, desc
    raise ValueError("Unrecognized file format: expected Postman Collection or raw payload")

def run_simulation(filepath, url, verbose=True):
    with open(filepath) as f:
        sim = json.load(f)
    try:
        payload, desc = extract_payload(sim)
    except ValueError as e:
        print(f"  ERROR parsing {filepath}: {e}")
        return None
    fname = os.path.basename(filepath)

    if verbose:
        print(f"\n{'='*72}")
        print(f"FILE: {fname}")
        print(f"DESC: {desc}")
        print(f"CONTRACTS: {len(payload['contracts'])} | RISK FACTORS: {len(payload.get('riskFactors', []))}")
        print(f"{'='*72}")

    try:
        resp = requests.post(url, json=payload, timeout=60)
        resp.raise_for_status()
        results = resp.json()
    except requests.exceptions.ConnectionError:
        print(f"  CONNECT FAILED: {url}")
        print(f"     Start ACTUS: cd actus-webapp && mvn spring-boot:run")
        return None
    except requests.exceptions.HTTPError as ex:
        print(f"  HTTP {ex.response.status_code}: {ex.response.text[:300]}")
        return None
    except Exception as ex:
        print(f"  ERROR: {ex}")
        return None

    contract_summaries = []
    for i, cr in enumerate(results):
        cid = cr.get("contractId", f"contract-{i}")
        ctype = cr.get("contractType", "?")
        events = cr.get("events", [])
        status = cr.get("status", "?")

        if verbose:
            print(f"\n  CONTRACT: {cid} ({ctype}) -- {status}")

        if status != "Success":
            err = cr.get("statusMessage", "unknown error")
            if verbose:
                print(f"    WARNING: {err}")
            contract_summaries.append({"id": cid, "type": ctype, "status": status, "error": err})
            continue

        summ = event_summary(events)
        ti = total_interest(events)
        tc = total_cashflows(events)

        if verbose:
            print(f"    Events: {len(events)} total")
            for etype, info in sorted(summ.items()):
                print(f"      {etype:5s}: {info['count']:3d} events, net payoff {fmt_money(info['total_payoff'])}")
            print(f"    Total Interest (IP):  {fmt_money(ti)}")
            print(f"    Total All Cashflows:  {fmt_money(tc)}")

        # SWAPS child leg breakdown
        if ctype == "SWAPS" and verbose:
            child_events = {}
            for e in events:
                leg = e.get("contractId", cid)
                if leg not in child_events:
                    child_events[leg] = []
                child_events[leg].append(e)
            if len(child_events) > 1:
                print(f"    --- LEG BREAKDOWN ---")
                for leg_id, leg_evts in sorted(child_events.items()):
                    leg_ip = sum(e.get("payoff", 0) or 0 for e in leg_evts if e.get("type") == "IP")
                    role = "FIXED" if "leg1" in leg_id or "fixed" in leg_id else "FLOAT"
                    print(f"      {role:5s} ({leg_id}): {len(leg_evts)} events, IP={fmt_money(leg_ip)}")

        # IP event samples
        ip_events = [e for e in events if e.get("type") == "IP"]
        if ip_events and verbose:
            print(f"    --- INTEREST PAYMENTS ({len(ip_events)} total) ---")
            for e in ip_events[:3]:
                t = e.get("time", "?")[:10]
                p = e.get("payoff", 0) or 0
                nr = e.get("nominalRate", 0) or 0
                nv = e.get("nominalValue", 0) or 0
                print(f"      {t}  payoff={fmt_money(p):>14s}  rate={nr:.4f}  nominal={fmt_money(nv)}")
            if len(ip_events) > 3:
                print(f"      ... ({len(ip_events) - 3} more)")

        contract_summaries.append({
            "id": cid, "type": ctype, "status": status,
            "events": len(events), "total_interest": ti, "total_cashflows": tc
        })

    return {"file": fname, "description": desc, "contracts": contract_summaries}


def run_comparison(file_prefixes, url):
    all_results = []
    for prefix in file_prefixes:
        matches = sorted(glob.glob(os.path.join(SCRIPT_DIR, f"{prefix}*.json")))
        if not matches:
            print(f"  No files matching '{prefix}*.json'")
            continue
        r = run_simulation(matches[0], url, verbose=True)
        if r:
            all_results.append(r)

    if len(all_results) >= 2:
        print(f"\n{'='*72}")
        print(f"COMPARISON SUMMARY")
        print(f"{'='*72}")
        for r in all_results:
            total_ip = sum(c.get("total_interest", 0) for c in r["contracts"])
            total_cf = sum(c.get("total_cashflows", 0) for c in r["contracts"])
            print(f"  {r['file'][:50]:<50s} IP={fmt_money(total_ip):>14s}  CF={fmt_money(total_cf):>14s}")
        ip0 = sum(c.get("total_interest", 0) for c in all_results[0]["contracts"])
        ip1 = sum(c.get("total_interest", 0) for c in all_results[1]["contracts"])
        diff = ip1 - ip0
        print(f"\n  DIFFERENCE (file2 - file1): {fmt_money(diff)}")
        if ip0 != 0:
            print(f"  IMPACT: {abs(diff/ip0)*100:.1f}% {'increase' if diff > 0 else 'decrease'}")


QUICK_TEST_FILES = [
    "01a-SWPPV-TariffSpread-Baseline.json",
    "01b-SWPPV-TariffSpread-Stressed.json",
    "01c-SWAPS-TariffSpread-Baseline.json",
    "01d-SWAPS-TariffSpread-Stressed.json",
    "01e-Portfolio-TariffSpread-LoanPlusHedge.json",
    "08c-Integrated-ModerateScenario.json",
]

def main():
    parser = argparse.ArgumentParser(description="ACTUS Supply Chain Tariff Simulation Runner")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"ACTUS endpoint (default: {DEFAULT_URL})")
    parser.add_argument("--file", help="Run a single JSON file")
    parser.add_argument("--category", help="Run all files starting with prefix (e.g., '01', '07')")
    parser.add_argument("--compare", nargs="+", help="Compare 2+ file prefixes (e.g., --compare 01a 01b)")
    parser.add_argument("--quick", action="store_true", help="Run 6 key smoke tests")
    parser.add_argument("--all", action="store_true", help="Run all 51 simulations")
    args = parser.parse_args()

    print(f"{'='*72}")
    print(f"  ACTUS Supply Chain Tariff Simulations -- SWAPS & SWPPV")
    print(f"  Endpoint: {args.url}")
    print(f"  Time:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*72}")

    all_results = []

    if args.file:
        path = os.path.join(SCRIPT_DIR, args.file) if not os.path.isabs(args.file) else args.file
        r = run_simulation(path, args.url)
        if r: all_results.append(r)

    elif args.compare:
        run_comparison(args.compare, args.url)
        return

    elif args.category:
        files = sorted(glob.glob(os.path.join(SCRIPT_DIR, f"{args.category}*.json")))
        if not files:
            print(f"  No files matching '{args.category}*.json' -- run generate_simulations.py first")
            return
        print(f"\n  CATEGORY {args.category}: {len(files)} files")
        for path in files:
            r = run_simulation(path, args.url)
            if r: all_results.append(r)

    elif args.all:
        files = sorted(glob.glob(os.path.join(SCRIPT_DIR, "*.json")))
        print(f"\n  ALL SIMULATIONS: {len(files)} files")
        for path in files:
            r = run_simulation(path, args.url)
            if r: all_results.append(r)

    else:
        # Default = quick smoke test
        print(f"\n  QUICK SMOKE TEST (use --all for all 51)")
        for fn in QUICK_TEST_FILES:
            path = os.path.join(SCRIPT_DIR, fn)
            if os.path.exists(path):
                r = run_simulation(path, args.url)
                if r: all_results.append(r)
            else:
                print(f"  {fn} not found -- run generate_simulations.py first")

    # Summary table
    if all_results and len(all_results) > 1:
        print(f"\n{'='*72}")
        print(f"SUMMARY -- {len(all_results)} simulations completed")
        print(f"{'='*72}")
        print(f"  {'File':<45s} {'#C':>3s} {'Status':>8s} {'Total IP':>14s}")
        print(f"  {'-'*45} {'-'*3} {'-'*8} {'-'*14}")
        for r in all_results:
            n_ok = sum(1 for c in r["contracts"] if c.get("status") == "Success")
            n_tot = len(r["contracts"])
            total_ip = sum(c.get("total_interest", 0) for c in r["contracts"])
            status_str = f"{n_ok}/{n_tot}"
            print(f"  {r['file'][:45]:<45s} {n_tot:>3d} {status_str:>8s} {fmt_money(total_ip):>14s}")

    passed = sum(1 for r in all_results if all(c.get("status") == "Success" for c in r["contracts"]))
    failed = len(all_results) - passed
    print(f"\n  {passed} passed  {'  ' + str(failed) + ' failed' if failed else ''}")


if __name__ == "__main__":
    main()
