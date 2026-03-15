#!/usr/bin/env python3
"""
Supply Chain Tariff Simulation Generator — SWAPS & SWPPV
=========================================================
Generates working ACTUS simulations for /eventsBatch endpoint.
Based on:
  - CFO Working Capital Playbook (India-US textiles corridor)
  - GTAP Armington elasticities
  - Working tariff1-4 examples from master Postman collection
  - Official ACTUS SWAPS/SWPPV documentation

Each risk factor dimension modeled independently first,
then combined in integrated simulations.

Corridors: India-US (Textiles σ=3.8), China-US (Electronics σ=8.1),
           Mexico-US (Auto Parts σ=2.8)

Usage:
  python generate_simulations.py
"""

import json
import os
from copy import deepcopy

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
ACTUS_URL = "http://127.0.0.1:8083/eventsBatch"

# ============================================================
# RATE PATHS — From CFO Playbook Scenarios A, B, C
# ============================================================

# Quarterly dates for 3-year horizon (matching tariff1-4 pattern)
QUARTERLY_DATES = [
    "2026-03-01T00:00:00",
    "2026-06-01T00:00:00",
    "2026-09-01T00:00:00",
    "2026-12-01T00:00:00",
    "2027-03-01T00:00:00",
    "2027-06-01T00:00:00",
    "2027-09-01T00:00:00",
    "2027-12-01T00:00:00",
    "2028-03-01T00:00:00",
    "2028-06-01T00:00:00",
    "2028-09-01T00:00:00",
    "2028-12-01T00:00:00",
    "2029-03-01T00:00:00",
]

# Scenario A: No Tariff — SOFR easing from 4.25% to 3.5%
SOFR_BASELINE = [0.0425, 0.042, 0.040, 0.038, 0.037, 0.036, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035, 0.035]

# Scenario B: 26% Tariff — SOFR moderate rise then settles
SOFR_MODERATE = [0.0425, 0.045, 0.048, 0.048, 0.046, 0.044, 0.042, 0.042, 0.040, 0.040, 0.040, 0.040, 0.040]

# Scenario C: 50% Tariff — SOFR spikes then slowly normalizes
SOFR_SEVERE = [0.0425, 0.048, 0.053, 0.055, 0.055, 0.053, 0.050, 0.048, 0.046, 0.045, 0.045, 0.045, 0.045]

# FX-amplified path (tariff + INR depreciation contagion)
SOFR_FX_AMPLIFIED = [0.0425, 0.050, 0.058, 0.060, 0.058, 0.055, 0.052, 0.050, 0.048, 0.047, 0.046, 0.045, 0.045]

# Port-congestion moderate path (logistics inflation)
SOFR_PORT_STRESS = [0.0425, 0.044, 0.046, 0.048, 0.047, 0.045, 0.043, 0.042, 0.040, 0.039, 0.038, 0.037, 0.036]


def make_rf_data(moc, values, dates=QUARTERLY_DATES):
    return {"marketObjectCode": moc, "base": 1.0,
            "data": [{"time": d, "value": v} for d, v in zip(dates, values)]}


def make_swppv_contract(cid, notional, fixed_rate, float_init_rate, moc,
                         spread=0.0, role="RFL", maturity="2029-03-01T00:00:00"):
    """SWPPV per https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWPPV
    nominalInterestRate = fixed leg, nominalInterestRate2 = initial float leg"""
    return {
        "contractType": "SWPPV", "contractID": cid,
        "statusDate": "2026-02-28T00:00:00", "contractRole": role,
        "currency": "USD", "contractDealDate": "2026-02-28T00:00:00",
        "initialExchangeDate": "2026-03-01T00:00:00", "maturityDate": maturity,
        "notionalPrincipal": notional,
        "cycleAnchorDateOfInterestPayment": "2026-06-01T00:00:00",
        "cycleOfInterestPayment": "P3ML1",
        "nominalInterestRate": fixed_rate, "nominalInterestRate2": float_init_rate,
        "dayCountConvention": "30E360",
        "cycleAnchorDateOfRateReset": "2026-03-01T00:00:00",
        "cycleOfRateReset": "P3ML1", "rateSpread": spread,
        "marketObjectCodeOfRateReset": moc, "fixingPeriod": "P0D",
        "deliverySettlement": "S"
    }


def make_swaps_contract(cid, notional, fixed_rate, float_init_rate, moc,
                         spread=0.0, maturity="2029-03-01T00:00:00"):
    """SWAPS per https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWAPS
    Uses contractStructure with FIL (fixed) + SEL (float) PAM child legs"""
    return {
        "contractType": "SWAPS", "contractID": cid,
        "contractRole": "RFL", "currency": "USD",
        "contractDealDate": "2026-02-28T00:00:00",
        "statusDate": "2026-02-28T00:00:00", "deliverySettlement": "D",
        "contractStructure": [
            {"object": {
                "contractType": "PAM", "contractID": f"{cid}-leg1-fixed",
                "contractDealDate": "2026-02-28T00:00:00",
                "initialExchangeDate": "2026-03-01T00:00:00",
                "currency": "USD", "statusDate": "2026-02-28T00:00:00",
                "notionalPrincipal": str(notional), "dayCountConvention": "30E360",
                "nominalInterestRate": str(fixed_rate), "maturityDate": maturity,
                "cycleAnchorDateOfInterestPayment": "2026-06-01T00:00:00",
                "cycleOfInterestPayment": "P3ML1", "premiumDiscountAtIED": "0"
            }, "referenceType": "CNT", "referenceRole": "FIL"},
            {"object": {
                "contractType": "PAM", "contractID": f"{cid}-leg2-float",
                "contractDealDate": "2026-02-28T00:00:00",
                "initialExchangeDate": "2026-03-01T00:00:00",
                "currency": "USD", "statusDate": "2026-02-28T00:00:00",
                "notionalPrincipal": str(notional), "dayCountConvention": "30E360",
                "nominalInterestRate": str(float_init_rate), "maturityDate": maturity,
                "cycleAnchorDateOfInterestPayment": "2026-06-01T00:00:00",
                "cycleOfInterestPayment": "P3ML1", "cycleOfRateReset": "P3ML1",
                "cycleAnchorDateOfRateReset": "2026-03-01T00:00:00",
                "marketObjectCodeOfRateReset": moc, "rateMultiplier": "1.0",
                "rateSpread": str(spread), "premiumDiscountAtIED": "0"
            }, "referenceType": "CNT", "referenceRole": "SEL"}
        ]
    }


def make_pam_loan(cid, notional, init_rate, moc, spread=0.02,
                   maturity="2029-03-01T00:00:00"):
    return {
        "contractType": "PAM", "contractID": cid, "contractRole": "RPA",
        "contractDealDate": "2026-02-28T00:00:00", "statusDate": "2026-02-28T00:00:00",
        "initialExchangeDate": "2026-03-01T00:00:00", "maturityDate": maturity,
        "notionalPrincipal": notional, "nominalInterestRate": init_rate,
        "currency": "USD", "dayCountConvention": "30E360",
        "cycleOfInterestPayment": "P3ML1",
        "cycleAnchorDateOfInterestPayment": "2026-06-01T00:00:00",
        "marketObjectCodeOfRateReset": moc, "cycleOfRateReset": "P3ML1",
        "cycleAnchorDateOfRateReset": "2026-03-01T00:00:00", "rateSpread": spread
    }


def _test_script_single(title):
    """Postman test script for single-contract simulations (SWPPV or SWAPS)"""
    return [
        "pm.test('Simulation success', function(){",
        "    pm.response.to.have.status(200);",
        "    var data = pm.response.json();",
        "    console.log('='.repeat(64));",
        f"    console.log('{title}');",
        "    console.log('='.repeat(64));",
        "    var r = data[0];",
        "    if(r.status !== 'Success'){ console.log('FAILED: ' + (r.statusMessage||'unknown')); return; }",
        "    var events = r.events;",
        "    console.log('Status: ' + r.status + ' | Events: ' + events.length);",
        "    var counts = {};",
        "    events.forEach(function(e){ counts[e.type] = (counts[e.type]||0)+1; });",
        "    Object.keys(counts).sort().forEach(function(k){ console.log('  ' + k + ': ' + counts[k]); });",
        "    var totalIP = 0;",
        "    console.log('');",
        "    console.log('INTEREST PAYMENTS:');",
        "    events.filter(function(e){return e.type==='IP';}).forEach(function(e){",
        "        totalIP += e.payoff;",
        "        console.log('  ' + e.time.substring(0,10) + '  payoff=' + e.payoff.toFixed(2) + '  rate=' + (e.nominalRate||0).toFixed(6));",
        "    });",
        "    console.log('TOTAL IP: ' + totalIP.toFixed(2));",
        "    console.log('');",
        "});",
    ]



def _test_script_swaps(title):
    """Postman test script for SWAPS with FIL/SEL leg breakdown"""
    base = _test_script_single(title)
    # Insert leg breakdown before the closing lines
    leg_lines = [
        "    console.log('');",
        "    console.log('LEG BREAKDOWN:');",
        "    var legs = {};",
        "    events.forEach(function(e){ var l=e.contractId||'?'; if(!legs[l])legs[l]=[]; legs[l].push(e); });",
        "    Object.keys(legs).sort().forEach(function(l){",
        "        var ipSum = 0;",
        "        legs[l].filter(function(e){return e.type==='IP';}).forEach(function(e){ ipSum+=e.payoff; });",
        "        var role = l.indexOf('leg1')>=0||l.indexOf('fixed')>=0 ? 'FIXED' : 'FLOAT';",
        "        console.log('  ' + role + ' (' + l + '): IP=' + ipSum.toFixed(2));",
        "    });",
        "    console.log('='.repeat(64));",
        "});"
    ]
    # Insert before last 2 lines (console.log('='.repeat(64)); and });)
    return base[:-2] + leg_lines + base[-2:]


def _test_script_portfolio(title):
    """Postman test script for multi-contract portfolio simulations"""
    return [
        "pm.test('Simulation success', function(){",
        "    pm.response.to.have.status(200);",
        "    var data = pm.response.json();",
        "    console.log('='.repeat(64));",
        f"    console.log('{title}');",
        "    console.log('='.repeat(64));",
        "    data.forEach(function(r, idx){",
        "        console.log('');",
        "        console.log('CONTRACT ' + (idx+1) + ': ' + (r.contractId||'?') + ' (' + (r.contractType||'?') + ') - ' + r.status);",
        "        if(r.status !== 'Success'){ console.log('  FAILED: ' + (r.statusMessage||'')); return; }",
        "        var events = r.events;",
        "        var counts = {};",
        "        events.forEach(function(e){ counts[e.type] = (counts[e.type]||0)+1; });",
        "        Object.keys(counts).sort().forEach(function(k){ console.log('  ' + k + ': ' + counts[k]); });",
        "        var totalIP = 0;",
        "        events.filter(function(e){return e.type==='IP';}).forEach(function(e){",
        "            totalIP += e.payoff;",
        "            console.log('  ' + e.time.substring(0,10) + ' IP payoff=' + e.payoff.toFixed(2) + ' rate=' + (e.nominalRate||0).toFixed(6));",
        "        });",
        "        console.log('  TOTAL IP: ' + totalIP.toFixed(2));",
        "    });",
        "    console.log('='.repeat(64));",
        "});"
    ]


def save(fn, contracts, rfs, desc=""):
    """Save simulation as Postman Collection v2.1.0 JSON (importable into Postman)"""
    # Build the raw payload (contracts + riskFactors)
    payload = {"contracts": contracts, "riskFactors": rfs}
    payload_str = json.dumps(payload, separators=(',', ':'), ensure_ascii=True)

    # Determine test script type based on contract structure
    title = desc.split('.')[0] if '.' in desc else desc[:80]
    if len(contracts) > 1:
        test_exec = _test_script_portfolio(title)
    elif contracts[0].get('contractType') == 'SWAPS':
        test_exec = _test_script_swaps(title)
    else:
        test_exec = _test_script_single(title)

    # Build Postman collection
    name = fn.replace('.json', '')
    postman_id = 'sc3-' + name.split('-')[0]
    collection = {
        "info": {
            "_postman_id": postman_id,
            "name": name,
            "description": desc,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [{
            "name": f"Run {name}",
            "request": {
                "method": "POST",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "url": {
                    "raw": ACTUS_URL,
                    "protocol": "http",
                    "host": ["127.0.0.1:8083"],
                    "path": ["eventsBatch"]
                },
                "body": {
                    "mode": "raw",
                    "raw": payload_str,
                    "options": {"raw": {"language": "json"}}
                }
            },
            "event": [{
                "listen": "test",
                "script": {
                    "type": "text/javascript",
                    "exec": test_exec
                }
            }]
        }]
    }

    path = os.path.join(OUTPUT_DIR, fn)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(collection, f, indent=2, ensure_ascii=True)
    print(f"  Created: {fn} (Postman v2.1.0)")



# === 1. TARIFF SPREAD ===
print("\n=== 1. TARIFF SPREAD ===")
save("01a-SWPPV-TariffSpread-Baseline.json",
     [make_swppv_contract("SWPPV-TS-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWPPV TariffSpread BASELINE: No tariff. 70% hedge ($700K). Fixed 4.2%, receive SOFR easing 4.25%→3.5%. Scenario A.")
save("01b-SWPPV-TariffSpread-Stressed.json",
     [make_swppv_contract("SWPPV-TS-ST-01", 700000, 0.048, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "SWPPV TariffSpread STRESSED: 50% tariff. Fixed 4.8% locked before blow-out. SOFR spikes 4.25%→5.5%. Scenario C.")
save("01c-SWAPS-TariffSpread-Baseline.json",
     [make_swaps_contract("SWAPS-TS-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWAPS TariffSpread BASELINE: Two-leg structure. Fixed leg 4.2%, Float leg SOFR.")
save("01d-SWAPS-TariffSpread-Stressed.json",
     [make_swaps_contract("SWAPS-TS-ST-01", 700000, 0.048, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "SWAPS TariffSpread STRESSED: Fixed 4.8%, Float SOFR_STRESS. Tariff-driven rate spike.")
save("01e-Portfolio-TariffSpread-LoanPlusHedge.json",
     [make_pam_loan("LOAN-TS-01", 1000000, 0.0675, "USD_SOFR_STRESS", spread=0.025),
      make_swppv_contract("HEDGE-TS-01", 700000, 0.048, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "PORTFOLIO: $1M PAM loan (SOFR+250bps) + $700K SWPPV hedge (fixed 4.8%). CFO Playbook: swap saves ~$35K.")

# === 2. REVENUE ELASTICITY (GTAP Armington) ===
print("\n=== 2. REVENUE ELASTICITY ===")
save("02a-SWPPV-RevenueElasticity-Baseline.json",
     [make_swppv_contract("SWPPV-RE-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWPPV RevenueElasticity BASELINE: Full revenue, full $700K hedge. Textiles σ=3.8.")
save("02b-SWPPV-RevenueElasticity-Stressed.json",
     [make_swppv_contract("SWPPV-RE-ST-01", 434000, 0.048, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "SWPPV RevenueElasticity STRESSED: Textiles σ=3.8, 50% tariff → 38% revenue drop. Hedge right-sized to $434K.")
save("02c-SWAPS-RevenueElasticity-Baseline.json",
     [make_swaps_contract("SWAPS-RE-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWAPS RevenueElasticity BASELINE: Full $700K two-leg structure.")
save("02d-SWAPS-RevenueElasticity-Electronics.json",
     [make_swaps_contract("SWAPS-RE-ELE-01", 150000, 0.052, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "SWAPS RevenueElasticity ELECTRONICS: σ=8.1. 60% tariff → near-total collapse. $150K hedge. Survival mode.")

# === 3. PORT CONGESTION ===
print("\n=== 3. PORT CONGESTION ===")
save("03a-SWPPV-PortCongestion-Baseline.json",
     [make_swppv_contract("SWPPV-PC-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWPPV PortCongestion BASELINE: Normal 4-day port dwell.")
save("03b-SWPPV-PortCongestion-Stressed.json",
     [make_swppv_contract("SWPPV-PC-ST-01", 700000, 0.044, 0.0425, "USD_SOFR_PORT", spread=0.005)],
     [make_rf_data("USD_SOFR_PORT", SOFR_PORT_STRESS)],
     "SWPPV PortCongestion STRESSED: 12-day dwell, SOFR+50bps logistics spread. ~$15K/shipment extra.")
save("03c-SWAPS-PortCongestion-Baseline.json",
     [make_swaps_contract("SWAPS-PC-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWAPS PortCongestion BASELINE: Two-leg swap, no congestion.")
save("03d-SWAPS-PortCongestion-Stressed.json",
     [make_swaps_contract("SWAPS-PC-ST-01", 700000, 0.044, 0.0425, "USD_SOFR_PORT", spread=0.005)],
     [make_rf_data("USD_SOFR_PORT", SOFR_PORT_STRESS)],
     "SWAPS PortCongestion STRESSED: Float leg SOFR+50bps logistics spread.")

# === 4. FX-TARIFF CORRELATION ===
print("\n=== 4. FX-TARIFF CORRELATION ===")
save("04a-SWPPV-FXTariffCorrelation-Baseline.json",
     [make_swppv_contract("SWPPV-FX-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWPPV FXTariffCorrelation BASELINE: No FX stress.")
save("04b-SWPPV-FXTariffCorrelation-Stressed.json",
     [make_swppv_contract("SWPPV-FX-ST-01", 700000, 0.050, 0.0425, "USD_SOFR_FX")],
     [make_rf_data("USD_SOFR_FX", SOFR_FX_AMPLIFIED)],
     "SWPPV FXTariffCorrelation STRESSED: INR -12%, SOFR peaks 6.0%. Fixed 5.0%.")
save("04c-SWAPS-FXTariffCorrelation-Baseline.json",
     [make_swaps_contract("SWAPS-FX-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWAPS FXTariffCorrelation BASELINE: Two-leg swap, no FX stress.")
save("04d-SWAPS-FXTariffCorrelation-Stressed.json",
     [make_swaps_contract("SWAPS-FX-ST-01", 700000, 0.050, 0.0425, "USD_SOFR_FX")],
     [make_rf_data("USD_SOFR_FX", SOFR_FX_AMPLIFIED)],
     "SWAPS FXTariffCorrelation STRESSED: FX-amplified, peaks 6.0%.")

# === 5. HEDGE EFFECTIVENESS ===
print("\n=== 5. HEDGE EFFECTIVENESS ===")
for ratio, pct in [(0.30, "30pct"), (0.50, "50pct"), (0.70, "70pct"), (0.80, "80pct")]:
    n = int(1000000 * ratio)
    save(f"05a-SWPPV-HedgeEffectiveness-{pct}.json",
         [make_swppv_contract(f"SWPPV-HE-{pct}-01", n, 0.048, 0.0425, "USD_SOFR_STRESS")],
         [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
         f"SWPPV HedgeEffectiveness {pct}: {int(ratio*100)}% hedge = ${n:,}. Scenario C.")
    save(f"05b-SWAPS-HedgeEffectiveness-{pct}.json",
         [make_swaps_contract(f"SWAPS-HE-{pct}-01", n, 0.048, 0.0425, "USD_SOFR_STRESS")],
         [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
         f"SWAPS HedgeEffectiveness {pct}: Two-leg, {int(ratio*100)}% hedge.")
for ratio, pct, label in [(0.30, "30pct", "Marine-Conservative"),
                           (0.70, "70pct", "Textiles-Standard"),
                           (0.80, "80pct", "Gems-Aggressive")]:
    n = int(1000000 * ratio)
    save(f"05c-Portfolio-HedgeEffectiveness-{pct}-{label}.json",
         [make_pam_loan("LOAN-HE-01", 1000000, 0.0675, "USD_SOFR_STRESS", spread=0.025),
          make_swppv_contract(f"HEDGE-HE-{pct}-01", n, 0.048, 0.0425, "USD_SOFR_STRESS")],
         [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
         f"PORTFOLIO {label}: $1M loan + ${n:,} SWPPV ({int(ratio*100)}%).")

# === 6. WORKING CAPITAL STRESS ===
print("\n=== 6. WORKING CAPITAL STRESS ===")
IWC = 1200000; IH = 840000
save("06a-SWPPV-WorkingCapitalStress-Baseline.json",
     [make_swppv_contract("SWPPV-WC-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWPPV WorkingCapitalStress BASELINE: Normal $1M WC, $700K hedge.")
save("06b-SWPPV-WorkingCapitalStress-Stressed.json",
     [make_swppv_contract("SWPPV-WC-ST-01", IH, 0.050, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "SWPPV WorkingCapitalStress STRESSED: WC +20% to $1.2M. $840K hedge at 5.0%.")
save("06c-SWAPS-WorkingCapitalStress-Baseline.json",
     [make_swaps_contract("SWAPS-WC-BL-01", 700000, 0.042, 0.0425, "USD_SOFR")],
     [make_rf_data("USD_SOFR", SOFR_BASELINE)],
     "SWAPS WorkingCapitalStress BASELINE: Two-leg swap, normal WC.")
save("06d-SWAPS-WorkingCapitalStress-Stressed.json",
     [make_swaps_contract("SWAPS-WC-ST-01", IH, 0.050, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "SWAPS WorkingCapitalStress STRESSED: Two-leg, increased WC.")
save("06e-Portfolio-WorkingCapitalStress-Full.json",
     [make_pam_loan("LOAN-WC-01", IWC, 0.0725, "USD_SOFR_STRESS", spread=0.030),
      make_swppv_contract("HEDGE-WC-01", IH, 0.050, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "PORTFOLIO: $1.2M loan (SOFR+300bps) + $840K hedge. The CFO Playbook 'squeeze'.")

# === 7. COMMODITY CORRIDORS ===
print("\n=== 7. COMMODITY CORRIDORS ===")
corridors = [
    {"name": "IN-Textiles", "sigma": 3.8, "hr": 0.80, "fr": 0.050, "sp": 0.025, "n": 1000000,
     "d": "Indian Textiles (Tirupur). σ=3.8. Hedge 80%. 50% tariff → 30-50% decline."},
    {"name": "IN-Gems", "sigma": 3.8, "hr": 0.85, "fr": 0.052, "sp": 0.030, "n": 2000000,
     "d": "Indian Gems (Surat). US=60% exports. Hedge 80-90%. Extreme concentration."},
    {"name": "IN-Marine", "sigma": 1.3, "hr": 0.55, "fr": 0.044, "sp": 0.020, "n": 500000,
     "d": "Indian Marine/Shrimp. σ=1.3 LOW. Hedge 50-60%. Natural stickiness."},
    {"name": "CN-Electronics", "sigma": 8.1, "hr": 0.90, "fr": 0.055, "sp": 0.035, "n": 5000000,
     "d": "Chinese Electronics (Shenzhen). σ=8.1 VERY HIGH. Hedge 90%+. Survival mode."},
    {"name": "MX-AutoParts", "sigma": 2.8, "hr": 0.65, "fr": 0.046, "sp": 0.022, "n": 3000000,
     "d": "Mexican Auto Parts. σ=2.8 MODERATE. Hedge 60-70%. USMCA leverage."},
]
for c in corridors:
    hn = int(c["n"] * c["hr"]); t = c["name"].replace("-","").replace(" ","")
    save(f"07-SWPPV-Corridor-{c['name']}.json",
         [make_swppv_contract(f"SWPPV-{t}-01", hn, c["fr"], 0.0425, "USD_SOFR_STRESS")],
         [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)], f"SWPPV {c['name']}: {c['d']}")
    save(f"07-SWAPS-Corridor-{c['name']}.json",
         [make_swaps_contract(f"SWAPS-{t}-01", hn, c["fr"], 0.0425, "USD_SOFR_STRESS")],
         [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)], f"SWAPS {c['name']}: {c['d']}")
    save(f"07-Portfolio-Corridor-{c['name']}.json",
         [make_pam_loan(f"LOAN-{t}-01", c["n"], 0.0425+c["sp"], "USD_SOFR_STRESS", spread=c["sp"]),
          make_swppv_contract(f"HEDGE-{t}-01", hn, c["fr"], 0.0425, "USD_SOFR_STRESS")],
         [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
         f"PORTFOLIO {c['name']}: ${c['n']:,} loan + ${hn:,} hedge ({int(c['hr']*100)}%). {c['d']}")

# === 8. INTEGRATED ===
print("\n=== 8. INTEGRATED ===")
save("08a-Integrated-TariffSpread-RevenueElasticity.json",
     [make_pam_loan("LOAN-INT-TSRE-01", 620000, 0.0725, "USD_SOFR_STRESS", spread=0.030),
      make_swppv_contract("HEDGE-INT-TSRE-01", 434000, 0.048, 0.0425, "USD_SOFR_STRESS")],
     [make_rf_data("USD_SOFR_STRESS", SOFR_SEVERE)],
     "INTEGRATED TariffSpread+RevenueElasticity: Revenue -38% (σ=3.8), spread +100bps, SOFR spikes.")
save("08b-Integrated-AllFactors-WorstCase.json",
     [make_pam_loan("LOAN-INT-ALL-01", 1200000, 0.0875, "USD_SOFR_FX", spread=0.035),
      make_swppv_contract("HEDGE-INT-ALL-01", 960000, 0.052, 0.0425, "USD_SOFR_FX"),
      make_pam_loan("LOAN-INT-PORT-01", 200000, 0.075, "USD_SOFR_FX", spread=0.030,
                    maturity="2027-03-01T00:00:00")],
     [make_rf_data("USD_SOFR_FX", SOFR_FX_AMPLIFIED)],
     "INTEGRATED ALL FACTORS: $1.2M loan + $960K hedge + $200K port facility. FX peak 6.0%.")
save("08c-Integrated-ModerateScenario.json",
     [make_pam_loan("LOAN-INT-MOD-01", 1000000, 0.070, "USD_SOFR_MOD", spread=0.025),
      make_swppv_contract("HEDGE-INT-MOD-01", 650000, 0.045, 0.0425, "USD_SOFR_MOD")],
     [make_rf_data("USD_SOFR_MOD", SOFR_MODERATE)],
     "INTEGRATED Moderate (Scenario B): 26% tariff. $1M loan + $650K hedge at 4.5%.")

print(f"\n{'='*60}\nGENERATION COMPLETE\nOutput: {OUTPUT_DIR}\nEndpoint: {ACTUS_URL}\n{'='*60}")
