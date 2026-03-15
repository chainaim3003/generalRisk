"""
Unbundle SWAPS and SWPPV Postman collections.
Run: python unbundle.py
Reads bundle_swaps_swppv.json and extracts 12 individual collection files.
"""
import json, os, pathlib

HERE = pathlib.Path(__file__).parent
bundle_path = HERE / "bundle_swaps_swppv.json"

with open(bundle_path, "r", encoding="utf-8") as f:
    bundle = json.load(f)

for filename, content in bundle.items():
    out = HERE / filename
    with open(out, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2)
    print(f"  ✅ {filename}")

print(f"\nDone — {len(bundle)} files extracted.")
