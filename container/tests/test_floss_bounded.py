"""M16.3.9 — bounded FLOSS static-mode adapter contract tests.

Locks the bounded invocation (FLOSS 3.1.1 `--only static`, a deterministic
linear string scan with no emulation), the structured JSON -> output mapping
(static strings preserved as a bounded list, not merely counted), and the
fail-closed timeout behavior. The subprocess seam (`server._run_argv`) and tool
resolution (`server._probe`) are stubbed; the REAL production adapter runs
unchanged.

M16.4.27 / D-1b correction: the previous fixture encoded
`{"strings": {"static": [...]}}`, which is NOT the FLOSS document schema — it
mirrored the adapter's own wrong key names, so the suite locked the bug instead
of detecting it. FLOSS renders `dataclasses.asdict(ResultDocument)`, whose
Strings field names are `static_strings` / `stack_strings` / `tight_strings` /
`decoded_strings` (verified against the pinned flare-floss 3.1.1 wheel). The
fixture now uses the REAL schema, and `test_0_schema_contract` pins it.

Run (either form; both fail loudly with a non-zero exit):
    python tests/test_floss_bounded.py
    python -m pytest tools/malware-analysis-container/tests/test_floss_bounded.py

The container image ships no pytest (and does not copy `tests/`), so this file
is self-running: the `__main__` harness below supplies a minimal
`monkeypatch`/`tmp_path` equivalent and FAILS if it discovers zero tests, so a
mis-invocation can never be mistaken for a passing suite.
"""

import inspect
import json
import shutil
import sys
import tempfile
from pathlib import Path

CONTAINER_ROOT = Path(__file__).resolve().parents[1]
if str(CONTAINER_ROOT) not in sys.path:
    sys.path.insert(0, str(CONTAINER_ROOT))

from src import server  # noqa: E402

# The FLOSS ResultDocument string buckets, verbatim from the pinned wheel.
FLOSS_STRING_FIELDS = ("static_strings", "stack_strings", "tight_strings", "decoded_strings")


def _fake_run(exit_status=None, stdout="", stderr="", error_class=None):
    return {
        "exit_status": exit_status,
        "duration_seconds": 0.0,
        "stdout_bytes": len(stdout.encode("utf-8")),
        "stdout_truncated": False,
        "stdout": stdout,
        "stderr": stderr,
        "error_class": error_class,
    }


def _floss_document(static=(), stack=(), tight=(), decoded=()):
    """A FLOSS ResultDocument JSON body using the REAL field names."""
    def strings(items):
        return [{"string": s, "offset": i, "encoding": "ascii"} for i, s in enumerate(items)]

    return {
        "metadata": {"file_path": "sample.bin", "min_length": 4},
        "analysis": {"enable_static_strings": True},
        "strings": {
            "static_strings": strings(static),
            "stack_strings": strings(stack),
            "tight_strings": strings(tight),
            "decoded_strings": strings(decoded),
        },
    }


def _install_stub(monkeypatch, *, exit_status=0, stdout="", stderr="", error_class=None):
    """Stub the probe + subprocess seam; capture the real adapter's argv."""
    captured = {}

    def fake_run(argv, timeout, max_out, cwd):
        captured["argv"] = argv
        captured["timeout"] = timeout
        return _fake_run(exit_status=exit_status, stdout=stdout, stderr=stderr, error_class=error_class)

    monkeypatch.setattr(server, "_probe", lambda name: "/usr/bin/" + name)
    monkeypatch.setattr(server, "_run_argv", fake_run)
    return captured


def _install_static_stub(monkeypatch):
    """The original 'found something' stub, now on the REAL schema."""
    return _install_stub(
        monkeypatch,
        stdout=json.dumps(_floss_document(static=("hello", "world"))),
    )


# TEST 0 — the fixture schema is the FLOSS document schema (anti-drift lock).
def test_0_schema_contract():
    doc = _floss_document(static=("a",))
    assert set(doc["strings"]) == set(FLOSS_STRING_FIELDS)
    # The short aliases that caused D-1b must NOT appear anywhere in the schema.
    for alias in ("static", "stack", "tight", "decoded"):
        assert alias not in doc["strings"]


# TEST 1 — the adapter uses the bounded, supported invocation.
def test_1_bounded_invocation(monkeypatch, tmp_path):
    captured = _install_static_stub(monkeypatch)
    server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    argv = captured["argv"]
    assert argv[0] == "/usr/bin/floss"
    assert "--json" in argv
    assert argv[argv.index("--only") + 1] == "static"
    # `--` terminates options; the sample path is the last argument.
    assert "--" in argv and argv[-1].endswith("sample.bin")
    # The per-tool bound is unchanged (the fix is the mode, not a bigger timeout).
    assert captured["timeout"] == 120


# TEST 2 — structured JSON is parsed and static evidence is preserved.
def test_2_structured_output_preserved(monkeypatch, tmp_path):
    _install_static_stub(monkeypatch)
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "OBSERVED"
    assert out["output"]["kind"] == "floss"
    assert out["output"]["mode"] == "static_only_bounded"
    assert out["output"]["strings"]["static"] == ["hello", "world"]
    # Emulation phases are empty by construction, never fabricated.
    assert out["output"]["strings"]["stack"] == []
    assert out["output"]["strings"]["decoded"] == []
    assert out["output"]["strings"]["tight"] == []
    assert out["output"]["total_extracted"] == 2
    assert out["note"] is None


# TEST 2b — every FLOSS bucket is read by its REAL field name (D-1b regression).
def test_2b_all_real_buckets_are_read(monkeypatch, tmp_path):
    stdout = json.dumps(_floss_document(static=("s1",), stack=("st1",), tight=("t1",), decoded=("d1",)))
    _install_stub(monkeypatch, stdout=stdout)
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "OBSERVED"
    assert out["output"]["strings"] == {"stack": ["st1"], "decoded": ["d1"], "tight": ["t1"], "static": ["s1"]}
    assert out["output"]["total_extracted"] == 4


# TEST 2c — malformed bucket entries are tolerated and the list stays bounded.
def test_2c_bucket_normalization_and_bound(monkeypatch, tmp_path):
    body = _floss_document()
    body["strings"]["static_strings"] = [{"string": "k%d" % i} for i in range(600)] + ["not-a-dict"]
    _install_stub(monkeypatch, stdout=json.dumps(body))
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["output"]["total_extracted"] == 512, "bound must still cap the list"
    assert all(isinstance(s, str) for s in out["output"]["strings"]["static"])
    # A missing document bucket is NOT an error: it means the tool produced none.
    assert out["output"]["strings"]["stack"] == []


# TEST 3 — timeout behavior remains fail-closed.
def test_3_timeout_fail_closed(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "_probe", lambda name: "/usr/bin/" + name)
    monkeypatch.setattr(server, "_run_argv", lambda *a, **k: _fake_run(error_class="TIMEOUT"))
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "ERROR"
    assert out["output"] is None
    assert out["note"] == "floss timed out"


# TEST 3b — a non-zero exit stays fail-closed and surfaces bounded stderr.
def test_3b_nonzero_exit_fail_closed(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "_probe", lambda name: "/usr/bin/" + name)
    monkeypatch.setattr(server, "_run_argv", lambda *a, **k: _fake_run(exit_status=2, stderr="floss boom"))
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "ERROR"
    assert out["output"] is None
    assert out["note"].startswith("floss exit 2")
    assert "floss boom" in out["note"]


# ── M16.4.27 semantics: scanned-and-empty is NOT the same as did-not-analyse ──

# CASE A — supported input, real document, zero strings -> NO_RESULT.
def test_A_scanned_zero_strings_is_no_result(monkeypatch, tmp_path):
    _install_stub(monkeypatch, stdout=json.dumps(_floss_document()))
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "NO_RESULT"
    assert out["output"]["total_extracted"] == 0
    assert out["note"] is None


# CASE C — FLOSS renders no document when its byte scan finds nothing: it
# returns BEFORE printing (main.py: `if not static_strings: return 0`). A
# silent, clean process is "scanned, nothing to report" — explicitly noted.
def test_C_silent_document_absent_is_no_result_with_reason(monkeypatch, tmp_path):
    _install_stub(monkeypatch, exit_status=0, stdout="", stderr="")
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "NO_RESULT"
    assert out["note"] == "no static string met the configured minimum length"
    assert out["output"]["total_extracted"] == 0


# CASE C' — an absent document WITH stderr is abnormal: never NO_RESULT.
def test_Cprime_absent_document_with_stderr_is_error(monkeypatch, tmp_path):
    _install_stub(monkeypatch, exit_status=0, stdout="", stderr="FLOSS: unsupported input format")
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "ERROR"
    assert out["output"] is None
    assert "no result document" in out["note"]
    assert "unsupported input format" in out["note"]


# CASE D — invalid input: a non-JSON stdout is a typed error, not an empty scan.
def test_D_non_json_stdout_is_error(monkeypatch, tmp_path):
    _install_stub(monkeypatch, exit_status=0, stdout="not json at all")
    out = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)
    assert out["status"] == "ERROR"
    assert out["output"] is None
    assert out["note"] == "floss produced malformed JSON"


# The three states a reviewer must never confuse, asserted side by side.
def test_statuses_remain_distinct(monkeypatch, tmp_path):
    _install_stub(monkeypatch, stdout=json.dumps(_floss_document()))
    scanned_empty = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)

    _install_stub(monkeypatch, exit_status=0, stdout="", stderr="")
    not_rendered = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)

    _install_stub(monkeypatch, exit_status=0, stdout="", stderr="boom")
    abnormal = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)

    _install_stub(monkeypatch, stdout=json.dumps(_floss_document(static=("found",))))
    observed = server.adapt_floss(tmp_path / "sample.bin", 120, 8 * 1024 * 1024)

    assert scanned_empty["status"] == "NO_RESULT"
    assert not_rendered["status"] == "NO_RESULT"
    assert abnormal["status"] == "ERROR"
    assert observed["status"] == "OBSERVED"
    # Only OBSERVED carries a positive finding.
    assert not_rendered["output"]["total_extracted"] == 0
    assert abnormal["output"] is None
    assert observed["output"]["total_extracted"] == 1


# ── self-running harness (no pytest dependency) ──────────────────────────

class _MonkeyPatch:
    """Minimal stand-in for pytest's `monkeypatch`, undone after each test."""

    def __init__(self):
        self._undo = []

    def setattr(self, target, name, value):
        self._undo.append((target, name, getattr(target, name)))
        setattr(target, name, value)

    def undo(self):
        for target, name, old in reversed(self._undo):
            setattr(target, name, old)
        self._undo.clear()


def _run_all():
    tests = sorted(
        (n, f) for n, f in globals().items()
        if n.startswith("test_") and callable(f) and getattr(f, "__module__", "") == "__main__"
    )
    if not tests:
        print("FAIL: the harness discovered zero tests (mis-invocation, not a pass)")
        return 1

    passed = failed = 0
    for name, fn in tests:
        mp, workdir = _MonkeyPatch(), tempfile.mkdtemp(prefix="m16427-floss-")
        kwargs = {}
        params = inspect.signature(fn).parameters
        if "monkeypatch" in params:
            kwargs["monkeypatch"] = mp
        if "tmp_path" in params:
            kwargs["tmp_path"] = Path(workdir)
        try:
            fn(**kwargs)
            print("  (pass) %s" % name)
            passed += 1
        except AssertionError as exc:
            print("  (FAIL) %s: %s" % (name, exc))
            failed += 1
        except Exception as exc:  # a crash is a failure, never a pass
            print("  (FAIL) %s: %s: %s" % (name, type(exc).__name__, exc))
            failed += 1
        finally:
            mp.undo()
            shutil.rmtree(workdir, ignore_errors=True)

    print("\nRESULT: pass=%d fail=%d" % (passed, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(_run_all())
