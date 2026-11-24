"""
Rehearsal B″ — production clone (prod_20261124.sql) -> migration 0029.

The dump is 73,732 individual INSERT statements (~91 MB). Python's stdlib
sqlite3 `executescript` runs them in one C-level pass (~23 s), which is why this
rehearsal is a small Python tool rather than part of the Bun greenfield runner.
Nothing here is remote: the clone is a throwaway file in the OS temp directory.

    python tools/rehearse-prod-clone.py [--dump PATH]
"""
import json
import os
import sqlite3
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUMP = "C:/Users/aabus/zayron-backups/prod_20261124.sql"
if "--dump" in sys.argv:
    DUMP = sys.argv[sys.argv.index("--dump") + 1]
if not os.path.exists(DUMP):
    print(json.dumps({"rehearsal": "FAIL", "error": f"DUMP_NOT_FOUND:{DUMP}"}))
    sys.exit(1)

db_file = os.path.join(tempfile.gettempdir(), f"zayron_gate3a3_b_{int(time.time())}.sqlite")
if os.path.exists(db_file):
    os.remove(db_file)
con = sqlite3.connect(db_file)
con.row_factory = sqlite3.Row
con.execute("PRAGMA journal_mode = OFF")
con.execute("PRAGMA synchronous = OFF")

started = time.time()
with open(DUMP, encoding="utf-8") as handle:
    con.executescript(handle.read())
load_ms = int((time.time() - started) * 1000)
con.commit()


def scalar(sql):
    return con.execute(sql).fetchone()[0]


def snapshot(label, include_provenance=False):
    report = {
        "label": label,
        "integrity_check": [row[0] for row in con.execute("PRAGMA integrity_check").fetchall()],
        "foreign_key_check": [dict(row) for row in con.execute("PRAGMA foreign_key_check").fetchall()],
        "total_vulnerabilities": scalar("SELECT COUNT(*) FROM vulnerabilities"),
        "synthetic_description_markers": scalar(
            "SELECT COUNT(*) FROM vulnerabilities WHERE description LIKE 'CRITICAL ADVISORY%'"
        ),
        "null_cvss": scalar("SELECT COUNT(*) FROM vulnerabilities WHERE cvss_score IS NULL"),
        "exploited_true": scalar("SELECT COUNT(*) FROM vulnerabilities WHERE is_exploited_in_wild = 1"),
        "first_epss_source": scalar("SELECT COUNT(*) FROM sources WHERE id = 'first-epss'"),
    }
    if include_provenance:
        report.update({
            "provenance_state_counts": [dict(row) for row in con.execute(
                "SELECT provenance_state, COUNT(*) AS total FROM vulnerabilities GROUP BY provenance_state ORDER BY total DESC"
            ).fetchall()],
            "severity_unknown": scalar(
                "SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'SYNTHETIC_UNVERIFIED' AND severity = 'UNKNOWN'"
            ),
            "exploited_reset": scalar(
                "SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'SYNTHETIC_UNVERIFIED' AND is_exploited_in_wild = 0"
            ),
            "still_exploited_quarantined": scalar(
                "SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'SYNTHETIC_UNVERIFIED' AND is_exploited_in_wild = 1"
            ),
            "unverified_with_cvss": scalar(
                "SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'UNVERIFIED' AND cvss_score IS NOT NULL"
            ),
            "cve_2026_1453": [dict(row) for row in con.execute(
                "SELECT cve_id, severity, cvss_score, is_exploited_in_wild, provenance_state "
                "FROM vulnerabilities WHERE cve_id = 'CVE-2026-1453'"
            ).fetchall()],
        })
    return report


before = snapshot("B_prod_clone_before_0029")
with open(os.path.join(ROOT, "db", "migrations", "0029_cve_provenance_quarantine.sql"), encoding="utf-8") as handle:
    con.executescript(handle.read())
con.commit()
after = snapshot("B_prod_clone_after_0029", include_provenance=True)
con.close()

result = {
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "dump": DUMP,
    "load_ms": load_ms,
    "statements": 73732,
    "before": before,
    "after": after,
}
os.makedirs(os.path.join(ROOT, "scratch"), exist_ok=True)
with open(os.path.join(ROOT, "scratch", "gate3a3_rehearsal_B.json"), "w", encoding="utf-8") as handle:
    json.dump(result, handle, indent=2)
print(json.dumps(result, indent=2))

failures = []
if after["integrity_check"] != ["ok"]:
    failures.append("integrity_check not ok")
if after["foreign_key_check"]:
    failures.append("foreign_key_check not empty")
if after["total_vulnerabilities"] != before["total_vulnerabilities"]:
    failures.append("row count changed (data loss)")
if after["first_epss_source"] != 1:
    failures.append("first-epss source missing")
if not after["cve_2026_1453"] or after["cve_2026_1453"][0]["provenance_state"] != "SYNTHETIC_UNVERIFIED":
    failures.append("CVE-2026-1453 not quarantined")
print(json.dumps({"rehearsal": "FAIL" if failures else "PASS", "failures": failures}, indent=2))
sys.exit(1 if failures else 0)
