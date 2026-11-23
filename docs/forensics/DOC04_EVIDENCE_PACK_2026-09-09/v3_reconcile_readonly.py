"""Read-only V3 corpus reconciliation.

Compares local V3 JSONL artifacts with an exported D1 JSON array. It never
connects to or mutates Cloudflare resources and reports UNKNOWN when the D1
export is not supplied.
"""
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

def digest(entries):
    canonical = "\n".join("\t".join((str(e.get("object_id", "")), str(e.get("document_id", "")), str(e.get("content_hash") or e.get("integrity", {}).get("content_hash", ""))))
                         for e in sorted(entries, key=lambda x: x.get("object_id", "")))
    return hashlib.sha256(canonical.encode()).hexdigest()

def load_jsonl(paths):
    rows = []
    for path in paths:
        for line in Path(path).read_text(encoding="utf-8-sig").splitlines():
            if line.strip(): rows.append(json.loads(line))
    return rows

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--local", nargs="+", required=True)
    p.add_argument("--d1-json", help="Read-only JSON export containing D1 rows")
    p.add_argument("--output", required=True)
    args = p.parse_args()
    local = load_jsonl(args.local)
    d1 = json.loads(Path(args.d1_json).read_text(encoding="utf-8")) if args.d1_json else None
    local_ids = {x.get("object_id") for x in local}
    local_hashes = {x.get("content_hash") or x.get("integrity", {}).get("content_hash") for x in local}
    result = {
        "artifact_type": "v3-reconciliation",
        "read_only": True,
        "local_count": len(local),
        "local_duplicate_ids": len(local) - len(local_ids),
        "local_duplicate_hashes": len(local) - len(local_hashes),
        "local_object_set_digest": digest(local),
        "status": "UNVERIFIED" if d1 is None else "MATCH",
    }
    if d1 is not None:
        d1_ids = {x.get("object_id") for x in d1}
        result.update({
            "d1_count": len(d1),
            "missing_ids": sorted(local_ids - d1_ids),
            "unexpected_ids": sorted(d1_ids - local_ids),
            "d1_duplicate_ids": len(d1) - len(d1_ids),
            "d1_object_set_digest": digest(d1),
        })
        result["status"] = "MATCH" if local_ids == d1_ids and len(local) == len(d1) else "MISMATCH"
    Path(args.output).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))

if __name__ == "__main__": main()
