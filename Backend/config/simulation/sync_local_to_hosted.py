"""
sync_local_to_hosted.py
=======================
Syncs ACTUS Postman collection JSON files from LOCAL to HOSTED folder.
Replaces all localhost/127.0.0.1 references with the AWS server IP.

Usage:
    python sync_local_to_hosted.py

Or with custom paths:
    python sync_local_to_hosted.py <local_folder> <hosted_folder>
"""

import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime

# ── CONFIG: Edit these paths if needed ──────────────────────────────────────
BASE = Path(r"C:/KALAIVANI M/ChainAim/mcp server\ACTUS-EXT/actus-risk-service-extension1/actus-riskservice\simulations")

LOCAL_DIR  = BASE / "local"
HOSTED_DIR = BASE / "hosted"

AWS_IP = "34.203.247.32"

# ── Replacement rules ────────────────────────────────────────────────────────
REPLACEMENTS = [
    (f"http://localhost:8083",   f"http://{AWS_IP}:8083"),
    (f"http://localhost:8082",   f"http://{AWS_IP}:8082"),
    (f"http://127.0.0.1:8083",  f"http://{AWS_IP}:8083"),
    (f"http://127.0.0.1:8082",  f"http://{AWS_IP}:8082"),
    (f'"localhost:8083"',        f'"{AWS_IP}:8083"'),
    (f'"localhost:8082"',        f'"{AWS_IP}:8082"'),
    (f'"127.0.0.1:8083"',       f'"{AWS_IP}:8083"'),
    (f'"127.0.0.1:8082"',       f'"{AWS_IP}:8082"'),
    (f'"localhost"',             f'"{AWS_IP}"'),
    (f'"127.0.0.1"',            f'"{AWS_IP}"'),
]

# ── Helpers ──────────────────────────────────────────────────────────────────

def apply_replacements(text: str) -> tuple[str, list[str]]:
    changes = []
    for old, new in REPLACEMENTS:
        if old in text:
            count = text.count(old)
            text = text.replace(old, new)
            changes.append((old, new, count))
    return text, changes

def print_banner(title: str):
    print("\n" + "═" * 64)
    print(f"  {title}")
    print("═" * 64)

def print_diff(changes: list):
    for old, new, count in changes:
        print(f"    {old}")
        print(f"    → {new}  ({count}x)")

# ── Main sync ────────────────────────────────────────────────────────────────

def sync(local_dir: Path, hosted_dir: Path):
    print_banner("ACTUS LOCAL → HOSTED SYNC")
    print(f"  Local  : {local_dir}")
    print(f"  Hosted : {hosted_dir}")
    print(f"  AWS IP : {AWS_IP}")
    print(f"  Time   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if not local_dir.exists():
        print(f"\n[ERROR] Local folder not found:\n  {local_dir}")
        sys.exit(1)

    json_files = sorted(local_dir.rglob("*.json"))
    if not json_files:
        print(f"\n[ERROR] No JSON files found in:\n  {local_dir}")
        sys.exit(1)

    print(f"\n  Found {len(json_files)} JSON file(s) to sync\n")

    results = {"synced": [], "skipped": [], "errors": []}

    for src in json_files:
        rel      = src.relative_to(local_dir)
        dst      = hosted_dir / rel

        # Read source
        try:
            original = src.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ✗ {rel}  →  READ ERROR: {e}")
            results["errors"].append(str(rel))
            continue

        # Apply replacements
        updated, changes = apply_replacements(original)

        # Validate JSON
        try:
            json.loads(updated)
        except json.JSONDecodeError as e:
            print(f"  ✗ {rel}  →  JSON ERROR after update: {e}")
            results["errors"].append(str(rel))
            continue

        # Write to hosted
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_text(updated, encoding="utf-8")

        if changes:
            print(f"  ✅ SYNCED   {rel.name}")
            print_diff(changes)
            results["synced"].append((rel, changes))
        else:
            print(f"  ─  NO CHANGE  {rel.name}")
            results["skipped"].append(str(rel))

    # ── Summary ──────────────────────────────────────────────────────────────
    print_banner("SYNC SUMMARY")
    print(f"  Total files : {len(json_files)}")
    print(f"  ✅ Synced   : {len(results['synced'])}")
    print(f"  ─  Skipped  : {len(results['skipped'])}")
    print(f"  ✗  Errors   : {len(results['errors'])}")

    if results["errors"]:
        print("\n  Files with errors:")
        for f in results["errors"]:
            print(f"    - {f}")

    # ── Display updated contents ──────────────────────────────────────────────
    if results["synced"]:
        print_banner("UPDATED FILE CONTENTS")
        for rel, changes in results["synced"]:
            dst = hosted_dir / rel
            print(f"\n{'─' * 64}")
            print(f"  FILE : {rel.name}")
            print(f"  PATH : {dst}")
            print(f"{'─' * 64}")
            try:
                content = json.loads(dst.read_text(encoding="utf-8"))
                print(json.dumps(content, indent=2))
            except Exception as e:
                print(f"  [Could not display: {e}]")

    print("\n" + "═" * 64)
    print("  SYNC COMPLETE")
    print("═" * 64 + "\n")

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) == 3:
        local_dir  = Path(sys.argv[1])
        hosted_dir = Path(sys.argv[2])
    elif len(sys.argv) == 2:
        local_dir  = Path(sys.argv[1])
        hosted_dir = local_dir.parent.parent / "hosted" / local_dir.name
    else:
        local_dir  = LOCAL_DIR
        hosted_dir = HOSTED_DIR

    sync(local_dir.resolve(), hosted_dir.resolve())