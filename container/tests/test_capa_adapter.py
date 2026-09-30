"""M16.4.29 — CAPA adapter repair tests (REAL capa 9.4.0 output).

Every success/zero-match assertion is driven by the byte-exact stdout of the
pinned capa 9.4.0 binary (see tests/fixtures/capa/), captured against the
ruleset whose source digest (`c93149e1…`) recomputes identically to the digest
the analysis image reports for /opt/zx-tools/capa-rules. Nothing here asserts a
hand-written structure capa never emits:

  * success          -> real `rules` document + real `[address, match]` pairs
  * zero-match       -> real {"rules": {}} successful scan
  * unsupported      -> real exit 16 (E_INVALID_FILE_TYPE) stderr
  * malformed JSON   -> explicit ERROR
  * malformed match  -> fail CLOSED (typed ERROR, no invented capability)
  * timeout          -> TIMEOUT class preserved on the execution record
  * provenance       -> raw exit/bytes/sha256 bounded into the tool result

Only the subprocess seam (`server._run_argv`) and tool/rules resolution are
stubbed; the REAL adapter runs unchanged.

Run:  python -m pytest tools/malware-analysis-container/tests/test_capa_adapter.py
"""

import hashlib
import json
import sys
from pathlib import Path

import pytest

CONTAINER_ROOT = Path(__file__).resolve().parents[1]
if str(CONTAINER_ROOT) not in sys.path:
    sys.path.insert(0, str(CONTAINER_ROOT))

from src import server  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "capa"
SUCCESS = (FIXTURES / "capa_success.json").read_bytes()
ZERO_MATCH = (FIXTURES / "capa_zero_match.json").read_bytes()
UNSUPPORTED_STDERR = (FIXTURES / "capa_unsupported_exit16.stderr.txt").read_text(
    encoding="utf-8", errors="replace"
)
MANIFEST = json.loads((FIXTURES / "FIXTURES.json").read_text(encoding="utf-8"))


def _stub_run(exit_status=0, stdout="", stderr="", error_class=None):
    return {
        "exit_status": exit_status,
        "duration_seconds": 0.0,
        "stdout_bytes": len(stdout.encode("utf-8")),
        "stdout_truncated": False,
        "stdout": stdout,
        "stderr": stderr,
        "error_class": error_class,
    }


@pytest.fixture
def capa_env(monkeypatch, tmp_path):
    """Present capa + a vendored rules dir, and capture the exact argv used."""
    monkeypatch.setattr(server, "_probe", lambda name: "/usr/bin/capa" if name == "capa" else None)
    monkeypatch.setattr(server, "CAPA_RULES", tmp_path)
    seen = {}

    def fake_run(argv, timeout, max_out, cwd):
        seen["argv"] = list(argv)
        return seen["result"]

    monkeypatch.setattr(server, "_run_argv", fake_run)
    return seen


# ── fixture integrity (real bytes, real hashes) ───────────────────────────


def test_fixtures_match_recorded_hashes():
    by_file = {f["file"]: f for f in MANIFEST["fixtures"]}
    assert hashlib.sha256(SUCCESS).hexdigest() == by_file["capa_success.json"]["sha256"]
    assert hashlib.sha256(ZERO_MATCH).hexdigest() == by_file["capa_zero_match.json"]["sha256"]
    assert len(SUCCESS) == by_file["capa_success.json"]["bytes"]


def test_success_fixture_is_real_capa_shape():
    doc = json.loads(SUCCESS)
    # Top level of a real 9.4.0 document: exactly {meta, rules}.
    assert set(doc.keys()) == {"meta", "rules"}
    assert doc["meta"]["version"] == "9.4.0"
    # Real matches are [address, match] two-element pairs (never mappings).
    for rule in doc["rules"].values():
        for entry in rule["matches"]:
            assert isinstance(entry, list) and len(entry) == 2
            assert isinstance(entry[0], dict) and "type" in entry[0]


# ── success path ──────────────────────────────────────────────────────────


def test_success_parses_real_document(capa_env):
    capa_env["result"] = _stub_run(stdout=SUCCESS.decode("utf-8"))
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "OBSERVED"
    caps = out["output"]["capabilities"]
    assert [c["name"] for c in caps] == sorted(c["name"] for c in caps)
    assert len(caps) == 6
    by_name = {c["name"]: c for c in caps}

    # Real [address, match] pair -> deterministic address string.
    assert by_name["find process by PID"]["address"] == "dn token:0x6000001"
    # Real `no address` pair -> null (never a guessed address).
    assert by_name["compiled to the .NET platform"]["address"] is None
    # Real `attack` key + real entry fields (id + tactic::technique).
    assert by_name["find process by PID"]["attack"] == ["T1057 Discovery::Process Discovery"]
    assert by_name["invoke .NET assembly method"]["attack"] == [
        "T1620 Defense Evasion::Reflective Code Loading"
    ]
    # Real `mbc` key + real entry fields.
    assert by_name["terminate process"]["mbc"] == ["C0018 Process::Terminate Process"]
    assert by_name["reference analysis tools strings"]["mbc"] == [
        "B0013.001 Discovery::Analysis Tool Discovery::Process detection"
    ]
    # No attack/mbc on a rule that carries none -> null, never [].
    assert by_name["compiled to the .NET platform"]["attack"] is None
    assert by_name["compiled to the .NET platform"]["mbc"] is None


def test_success_argv_is_the_effective_configuration(capa_env):
    capa_env["result"] = _stub_run(stdout=SUCCESS.decode("utf-8"))
    sample = Path("/tmp/sample.bin")
    server.adapt_capa(sample, 120, 8 << 20)
    argv = capa_env["argv"]
    assert argv[1:3] == ["--quiet", "--json"]
    assert argv[3] == "--rules"
    assert argv[-1] == str(sample)


# ── zero-match path ───────────────────────────────────────────────────────


def test_zero_match_is_a_successful_scan(capa_env):
    capa_env["result"] = _stub_run(stdout=ZERO_MATCH.decode("utf-8"))
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "NO_RESULT"
    assert out["output"]["capabilities"] == []
    assert out["note"] is None


# ── unsupported input (exit 16) ───────────────────────────────────────────


def test_unsupported_input_is_distinct_from_failure(capa_env):
    capa_env["result"] = _stub_run(exit_status=16, stdout="", stderr=UNSUPPORTED_STDERR)
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "UNSUPPORTED"  # NOT ERROR
    assert "exit 16" in out["note"]
    assert "does not appear to be a supported" in out["note"]


def test_corrupt_file_exit_13_is_error_not_unsupported(capa_env):
    capa_env["result"] = _stub_run(exit_status=13, stdout="", stderr="corrupt")
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert "capa exit 13" in out["note"]


def test_missing_signature_exit_1_is_error_not_unsupported(capa_env):
    capa_env["result"] = _stub_run(exit_status=1, stdout="", stderr="signature path missing")
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert "capa exit 1" in out["note"]


# ── malformed inputs ──────────────────────────────────────────────────────


def test_malformed_json_is_error(capa_env):
    capa_env["result"] = _stub_run(stdout="{not json")
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert out["note"] == "capa produced malformed JSON"


def test_missing_rules_object_is_error(capa_env):
    capa_env["result"] = _stub_run(stdout=json.dumps({"meta": {"version": "9.4.0"}}))
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert "no `rules` object" in out["note"]


def test_malformed_match_entry_fails_closed(capa_env):
    doc = json.loads(SUCCESS)
    # Inject an unsupported match shape into an otherwise-real document.
    first = next(iter(doc["rules"]))
    doc["rules"][first]["matches"] = [{"loc": "0x0"}]
    capa_env["result"] = _stub_run(stdout=json.dumps(doc))
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert "schema violation" in out["note"]
    # No capability may be invented from a malformed document.
    assert out["output"] is None


def test_unknown_address_type_fails_closed(capa_env):
    doc = json.loads(SUCCESS)
    first = next(iter(doc["rules"]))
    doc["rules"][first]["matches"] = [[{"type": "quantum", "value": 1}, {}]]
    capa_env["result"] = _stub_run(stdout=json.dumps(doc))
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert "unknown address type" in out["note"]


def test_malformed_attack_entry_fails_closed(capa_env):
    doc = json.loads(SUCCESS)
    for rule in doc["rules"].values():
        if rule["meta"].get("attack"):
            rule["meta"]["attack"] = [{"tactic": "Execution"}]  # no id
            break
    capa_env["result"] = _stub_run(stdout=json.dumps(doc))
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert "attack entry has no identifier" in out["note"]


# ── timeout / availability ────────────────────────────────────────────────


def test_timeout_is_error_with_timed_out_note(capa_env):
    capa_env["result"] = _stub_run(exit_status=None, error_class="TIMEOUT")
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "ERROR"
    assert out["note"] == "capa timed out"


def test_missing_binary_is_unavailable(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "_probe", lambda name: None)
    monkeypatch.setattr(server, "CAPA_RULES", tmp_path)
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "UNAVAILABLE"


def test_missing_ruleset_is_no_result_not_clean(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "_probe", lambda name: "/usr/bin/capa")
    monkeypatch.setattr(server, "CAPA_RULES", tmp_path / "does-not-exist")
    out = server.adapt_capa(Path("/tmp/sample.bin"), 120, 8 << 20)
    assert out["status"] == "NO_RESULT"
    assert "no capa rules vendored" in out["note"]


# ── bounded raw-output provenance ─────────────────────────────────────────


def test_execution_record_hashes_and_bounds_streams():
    stdout = b"x" * 10000
    stderr = b"e" * 10
    rec = server._make_execution_record(
        exit_status=0, duration_seconds=1.5, stdout=stdout, stderr=stderr,
        stdout_truncated=False, error_class=None,
    )
    assert rec["stdout_bytes"] == 10000
    assert rec["stdout_sha256"] == hashlib.sha256(stdout).hexdigest()
    assert rec["stderr_sha256"] == hashlib.sha256(stderr).hexdigest()
    # Excerpts are hard-capped and never unbounded.
    assert len(rec["stdout_excerpt"].encode("utf-8")) <= server.EXEC_PROVENANCE_MAX_BYTES
    assert rec["exit_status"] == 0


def test_execution_record_is_null_safe():
    rec = server._make_execution_record(
        exit_status=None, duration_seconds=None, stdout=None, stderr=None,
        stdout_truncated=False, error_class="TIMEOUT",
    )
    assert rec["stdout_bytes"] == 0
    assert rec["stdout_excerpt"] is None
    assert rec["error_class"] == "TIMEOUT"


def test_execution_wrapper_attaches_and_isolates():
    def adapter_that_runs_once(*a, **k):
        server._ACTIVE_EXECUTIONS.append({"exit_status": 0, "stdout_sha256": "a" * 64})
        return {"status": "OBSERVED", "output": None, "note": None}

    wrapped = server._execution_wrapping(adapter_that_runs_once)
    assert server._ACTIVE_EXECUTIONS == []
    out = wrapped()
    assert out["execution_count"] == 1
    assert out["execution"]["stdout_sha256"] == "a" * 64
    # The log is drained after the call: a sibling can never inherit it.
    assert server._ACTIVE_EXECUTIONS == []

    def adapter_that_runs_twice(*a, **k):
        server._ACTIVE_EXECUTIONS.append({"exit_status": 0})
        server._ACTIVE_EXECUTIONS.append({"exit_status": 1})
        return {"status": "OBSERVED", "output": None, "note": None}

    out2 = server._execution_wrapping(adapter_that_runs_twice)()
    assert out2["execution_count"] == 2
    assert out2["execution"]["exit_status"] == 1  # last execution


def test_execution_provenance_fields_are_flat_and_null_safe():
    fields = server._execution_provenance_fields({
        "execution": {"exit_status": 16, "stdout_bytes": 0, "stdout_sha256": "b" * 64},
        "execution_count": 1,
    })
    assert fields["execution_exit_status"] == 16
    assert fields["execution_stdout_sha256"] == "b" * 64
    assert fields["execution_stderr_bytes"] is None
    assert fields["execution_count"] == 1
    # Absent execution -> all nulls (recorded, never fabricated).
    empty = server._execution_provenance_fields({"status": "UNAVAILABLE"})
    assert empty["execution_exit_status"] is None
    assert empty["execution_count"] is None


def test_capa_adapter_is_execution_wrapped():
    # The dispatch table must wrap capa so run_job carries its provenance.
    assert server.ADAPTERS["capa"] is not server.adapt_capa
    assert server.ADAPTERS["capa"].__name__ == "adapt_capa"
