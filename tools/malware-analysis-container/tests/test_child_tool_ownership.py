"""M16.4.18 — child tool-output ownership regression suite.

Covers the exact M16.4.17 defect: the child-analysis loop stamped one tool's
(LIEF's) output object onto every sibling record for DIE / Magika / FLOSS /
YARA-X / capa, so five "OBSERVED" records carried no tool-specific evidence.

This suite proves, with deterministic fake adapters, that:
  * each child tool record is produced by THAT tool's own executor;
  * no tool's output appears in any sibling record (no cross-contamination,
    either direction);
  * a tool failure / empty / malformed result never inherits a sibling's output;
  * provenance stays tool-specific and sha-bound in both directions;
  * archive_expansion / child_analyses survive intact through callback-style
    serialization and read-back (envelope round-trip);
  * run #43's legacy parent fields are untouched by the repair path.

All fixtures are HARMLESS synthetic bytes (no real malware, no executables).
Run:  python -m pytest tests/test_child_tool_ownership.py -q
(or python tests/test_child_tool_ownership.py)
"""
import base64
import io
import json
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src import server  # noqa: E402

PARENT_SHA = "b" * 64
CHILD_SHA = "c" * 64
RUN_ID = "ar_test_ownership"
ARTIFACT_ID = "art_test_ownership"

RESULTS = {"pass": 0, "fail": 0}

def check(cond: bool, label: str) -> None:
    if cond:
        RESULTS["pass"] += 1
        print(f"  (pass) {label}")
    else:
        RESULTS["fail"] += 1
        print(f"  (FAIL) {label}")

# ── deterministic fake per-tool executors (Phase 3 fixtures) ─────────────

FAKE_OUTPUTS = {
    "lief": {"engine": "lief-test", "machine": "I386"},
    "die": {"engine": "die-test", "detector": "compiler-X"},
    "magika": {"engine": "magika-test", "mime": "application/x-test"},
    "floss": {"engine": "floss-test", "strings": ["TEST_STRING"]},
    "yara-x": {"engine": "yara-test", "matches": ["RULE_TEST"]},
    "capa": {"engine": "capa-test", "capabilities": ["CAPABILITY_TEST"]},
}

def _fake_adapter(tool):
    def adapter(sample, timeout=None, max_out=None):
        return {"status": "OBSERVED", "output": json.loads(json.dumps(FAKE_OUTPUTS[tool])), "note": None}
    return adapter

# ── zip fixture: one PE-detected child (deterministic MZ sniff) ─────────

PE_BYTES = b"MZ" + b"A" * 62 + b"PE\x00\x00" + b"B" * 32  # sniffable PE prefix

def zip_with_child(name: str, data: bytes) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        # FIXED timestamp: writestr defaults to time.localtime(), which would
        # make two fixture invocations produce different parent SHAs when they
        # cross a second boundary (non-deterministic provenance assertions).
        info = zipfile.ZipInfo(name, date_time=(2020, 6, 22, 0, 0, 0))
        info.external_attr = 0o600 << 16
        zf.writestr(info, data)
    return buf.getvalue()

def run_child_job(monkeypatched_adapters, parent_bytes=None):
    """Run run_job with the real archive expansion and fake tool adapters.

    Returns the full run_job result. `parent_bytes` defaults to a zip whose
    only member is a PE-detected child.
    """
    if parent_bytes is None:
        parent_bytes = zip_with_child("COVID-19 WHO RECOMENDED V.exe", PE_BYTES)
    real_adapters = dict(server.ADAPTERS)
    real_lief_bytes = server.adapt_lief_bytes
    try:
        for tool, fake in monkeypatched_adapters.items():
            server.ADAPTERS[tool] = fake
        job = {
            "analysis_run_id": RUN_ID,
            "artifact_id": ARTIFACT_ID,
            "sha256": __import__("hashlib").sha256(parent_bytes).hexdigest(),
            "sample_b64": base64.b64encode(parent_bytes).decode("ascii"),
            "requested_tools": list(server.SUPPORTED_TOOLS),
            "limits": {"timeout_seconds": 5, "max_output_bytes": 1 << 20},
        }
        result = server.run_job(job)
    finally:
        server.ADAPTERS.clear()
        server.ADAPTERS.update(real_adapters)
        server.adapt_lief_bytes = real_lief_bytes
    return result

def child_records(result):
    return result.get("child_analyses") or []

# ── 1. each tool owns its own output ─────────────────────────────────────

def test_each_tool_owns_its_output():
    print("[1] per-tool output ownership (fake adapters)")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test", "machine": "I386"}, "note": None}
    result = run_child_job(fakes)
    recs = {r["tool_id"]: r for r in child_records(result)}
    check(result.get("job_status") == "COMPLETED", "job completed")
    check(len(child_records(result)) == 6, "six child records for PE routing")
    for tool, expected in FAKE_OUTPUTS.items():
        rec = recs.get(tool)
        check(rec is not None, f"{tool}: record present")
        if rec is None:
            continue
        check(rec["output"] == expected, f"{tool}: output is {tool}-test only")
        check(rec["status"] == "OBSERVED", f"{tool}: OBSERVED")
    # cross-contamination: no other tool's marker appears in any record
    serialized = json.dumps(child_records(result))
    for tool in FAKE_OUTPUTS:
        others = [t for t in FAKE_OUTPUTS if t != tool]
        for other in others:
            other_marker = FAKE_OUTPUTS[other]["engine"]
            check(other_marker not in json.dumps(recs[tool]["output"]),
                  f"{tool}: no {other} contamination")

# ── 2. lief output cannot appear in siblings (exact defect regression) ──

def test_m16417_stamping_defect_regressed():
    print("[2] M16.4.17 stamping-defect regression")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    lief_out = {"kind": "lief", "sections": [".text", ".rsrc", ".reloc"], "machine": "MACHINE_TYPES.I386", "subsystem": "SUBSYSTEM.WINDOWS_GUI"}
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": lief_out, "note": None}
    result = run_child_job(fakes)
    recs = {r["tool_id"]: r for r in child_records(result)}
    check(recs["lief"]["output"] == lief_out, "lief record owns lief output")
    for tool in ("die", "magika", "floss", "yara-x", "capa"):
        check(json.dumps(recs[tool]["output"]) != json.dumps(lief_out),
              f"{tool}: output differs from lief output (defect absent)")
        check("MACHINE_TYPES.I386" not in json.dumps(recs[tool]["output"]),
              f"{tool}: no lief machine stamp")

# ── 3. failure isolation ─────────────────────────────────────────────────

def test_failure_isolation():
    print("[3] tool failure cannot overwrite sibling results")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    def boom(sample, timeout=None, max_out=None):
        raise RuntimeError("die exploded")
    fakes["die"] = boom
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test"}, "note": None}
    result = run_child_job(fakes)
    recs = {r["tool_id"]: r for r in child_records(result)}
    die = recs["die"]
    check(die["status"] == "ERROR", "die: adapter crash → typed ERROR")
    check(die["output"] is None, "die: no inherited output")
    check("RuntimeError" in (die["note"] or ""), "die: crash note present")
    for tool in ("magika", "floss", "yara-x", "capa"):
        check(recs[tool]["status"] == "OBSERVED" and recs[tool]["output"] == FAKE_OUTPUTS[tool],
              f"{tool}: sibling unaffected by die failure")

# ── 4. empty / malformed results never inherit ───────────────────────────

def test_empty_and_malformed_results():
    print("[4] empty/malformed adapter results never inherit sibling output")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    fakes["magika"] = lambda s, timeout=None, max_out=None: {"status": "NO_RESULT", "output": None, "note": "magika empty"}
    def malformed_floss(sample, timeout=None, max_out=None):
        # malformed ONLY for the child materialization (child_ prefix), so the
        # untouched parent loop keeps its normal contract
        if Path(str(sample)).name.startswith("child_"):
            return "not-a-dict"
        return {"status": "OBSERVED", "output": json.loads(json.dumps(FAKE_OUTPUTS["floss"])), "note": None}
    fakes["floss"] = malformed_floss
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test"}, "note": None}
    result = run_child_job(fakes)
    recs = {r["tool_id"]: r for r in child_records(result)}
    check(recs["magika"]["status"] == "NO_RESULT" and recs["magika"]["output"] is None,
          "magika: explicit NO_RESULT, output stays None")
    check(recs["floss"]["status"] == "ERROR" and recs["floss"]["output"] is None,
          "floss: malformed result → typed ERROR, no inheritance")
    check(recs["capa"]["output"] == FAKE_OUTPUTS["capa"], "capa: unaffected")

# ── 5. provenance is tool-specific and sha-bound ─────────────────────────

def test_provenance_binding():
    print("[5] provenance: tool-specific, child-sha-bound, both directions")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test"}, "note": None}
    result = run_child_job(fakes)
    for rec in child_records(result):
        p = rec["provenance"]
        check(p["tool_id"] == rec["tool_id"], f"{rec['tool_id']}: provenance.tool_id matches record")
        check(p["input_sha256"] == CHILD_SHA_REPLACED, f"{rec['tool_id']}: input_sha256 == child sha")
        check(p["parent_sha256"] == PARENT_SHA_REAL, f"{rec['tool_id']}: parent_sha256 == parent sha")
        check(p["input_sha256"] != p["parent_sha256"], f"{rec['tool_id']}: child sha != parent sha")
        if rec["tool_id"] == "yara-x":
            check(p["ruleset_commit"] == server.YARAX_RULESET_COMMIT, "yara-x: ruleset provenance present")
        else:
            check(p["ruleset_commit"] is None, f"{rec['tool_id']}: no yara ruleset leakage")

# the shas are only known inside run (job computes them); derive from the fixture
import hashlib as _h
PARENT_SHA_REAL = _h.sha256(zip_with_child("COVID-19 WHO RECOMENDED V.exe", PE_BYTES)).hexdigest()
_child_sniff_len = len(PE_BYTES)
# child sha is computed by archive_expansion from parent|child|path|depth; use expansion to get it
from src.archive_expansion import expand_archive  # noqa: E402
_exp = expand_archive(zip_with_child("COVID-19 WHO RECOMENDED V.exe", PE_BYTES), PARENT_SHA_REAL, declared_depth=0)
CHILD_SHA_REPLACED = _exp["children"][0]["child_sha256"]

# ── 6. envelope survives callback-style serialization + read-back ────────

def test_envelope_roundtrip():
    print("[6] archive_expansion/child_analyses survive serialize → read-back")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test"}, "note": None}
    result = run_child_job(fakes)
    # worker persistence: JSON round-trip (buildPersistedEvidence stores the
    # envelope verbatim; unwrap reverses it) — simulate both
    envelope = {"results": result["results"], "archive_expansion": result["archive_expansion"],
                "child_analyses": result["child_analyses"]}
    blob = json.dumps(envelope)
    back = json.loads(blob)
    check(back["archive_expansion"] == result["archive_expansion"], "archive_expansion intact")
    check(back["child_analyses"] == result["child_analyses"], "child_analyses intact")
    check(json.loads(json.dumps(back)) == back, "stable double serialization")
    for rec in back["child_analyses"]:
        check(rec["output"] == recs_expected(rec), f"{rec['tool_id']}: output survives round-trip")

def recs_expected(rec):
    if rec["tool_id"] == "lief":
        return {"engine": "lief-test"}
    return FAKE_OUTPUTS.get(rec["tool_id"])

# ── 7. legacy parent fields remain untouched ─────────────────────────────

def test_legacy_parent_fields():
    print("[7] legacy parent result fields unaffected by repair")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test"}, "note": None}
    result = run_child_job(fakes)
    for key in ("results", "extractions", "decodings", "archive_expansion", "child_analyses"):
        check(key in result, f"legacy key present: {key}")
    check(result.get("job_status") == "COMPLETED", "job_status COMPLETED")
    check(len(result["results"]) == 6, "parent six-tool records preserved")

# ── 8. routing: non-PE child gets only its eligible tools ────────────────

def test_routing_policy_unchanged():
    print("[8] child routing policy unchanged")
    fakes = {t: _fake_adapter(t) for t in FAKE_OUTPUTS}
    server.adapt_lief_bytes = lambda b: {"status": "OBSERVED", "output": {"engine": "lief-test"}, "note": None}
    result = run_child_job(fakes, parent_bytes=zip_with_child("notes.txt", b"hello world"))
    tools = sorted(r["tool_id"] for r in child_records(result))
    check(tools == ["floss", "magika"], "TEXT child routes to magika+floss only")

if __name__ == "__main__":
    test_each_tool_owns_its_output()
    test_m16417_stamping_defect_regressed()
    test_failure_isolation()
    test_empty_and_malformed_results()
    test_provenance_binding()
    test_envelope_roundtrip()
    test_legacy_parent_fields()
    test_routing_policy_unchanged()
    print(f"\nTOTAL={RESULTS['pass'] + RESULTS['fail']} PASS={RESULTS['pass']} FAIL={RESULTS['fail']}")
    sys.exit(1 if RESULTS["fail"] else 0)
