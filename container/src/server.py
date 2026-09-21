"""
ZAYRON-X M14.3 static-analysis container server.

Accepts ONE canonical analysis job shape (POST /analyze):

    AnalysisJob {
      analysis_run_id, artifact_id, sha256,
      sample_b64 (or sample_path for mounted transports),
      requested_tools[], limits {timeout_seconds, max_output_bytes}
    }

Constraints enforced here:
  - static analysis ONLY; the sample never touches the network (the container
    is run with networking disabled by the host runtime AND this process
    performs no fetch/update of any kind)
  - no credentials, secrets, or repo mounts reach this process
  - per-tool timeout / stdout / stderr / exit-code / output-size capture
  - tool failure never fails the whole run (failure isolation)
  - the sample and all tool temp files are deleted after every job
  - no shell interpolation anywhere: fixed argv vectors only
  - responses carry tool provenance; unavailable values are "UNKNOWN"

No tool output is interpreted here beyond structural normalization — the
canonical M4 bridge owns epistemic semantics.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

MAX_SAMPLE_BYTES = 256 * 1024 * 1024  # 256 MiB hard input bound
DEFAULT_TIMEOUT_SECONDS = 120
DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024

RUNNER_IDENTITY = os.environ.get("ZX_RUNNER_IDENTITY", "UNKNOWN")
LIEF_VERSION = "1.0.0"
FLOSS_VERSION = "3.1.1"
CAPA_VERSION = "9.4.0"
YARAX_VERSION = os.environ.get("YARAX_VERSION", "1.20.0")
DIE_VERSION = "3.21"
CAPA_RULES_VERSION = "9.4.0"
YARAX_RULESET_VERSION = os.environ.get("YARAX_RULESET_VERSION", "none")

SUPPORTED_TOOLS = ("lief", "floss", "die", "yara-x", "capa")

TOOLS_HOME = Path(os.environ.get("TOOLS_HOME", "/opt/zx-tools"))
CAPA_RULES = Path(os.environ.get("CAPA_RULES", str(TOOLS_HOME / "capa-rules")))
YARA_RULES = Path(os.environ.get("YARA_RULES", str(TOOLS_HOME / "yara-rules")))


def _probe(bin_name: str):
    p = shutil.which(bin_name)
    return str(p) if p else None


def _file_digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _run_argv(argv, timeout, max_out, cwd):
    """Fixed-argv execution with hard timeout and output bounds. No shell."""
    started = time.monotonic()
    try:
        proc = subprocess.run(
            argv,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            shell=False,
        )
        duration = time.monotonic() - started
        out = proc.stdout[:max_out]
        err = proc.stderr[:64 * 1024]
        return {
            "exit_status": proc.returncode,
            "duration_seconds": round(duration, 3),
            "stdout_bytes": len(proc.stdout),
            "stdout_truncated": len(proc.stdout) > max_out,
            "stdout": out.decode("utf-8", "replace"),
            "stderr": err.decode("utf-8", "replace"),
            "error_class": None,
        }
    except subprocess.TimeoutExpired:
        return {
            "exit_status": None, "duration_seconds": round(time.monotonic() - started, 3),
            "stdout_bytes": 0, "stdout_truncated": False, "stdout": "", "stderr": "",
            "error_class": "TIMEOUT",
        }
    except (OSError, subprocess.SubprocessError) as exc:
        return {
            "exit_status": None, "duration_seconds": round(time.monotonic() - started, 3),
            "stdout_bytes": 0, "stdout_truncated": False, "stdout": "", "stderr": str(exc)[:2048],
            "error_class": type(exc).__name__,
        }


# ── adapters: raw tool result → normalized {status, output} ────────────────

def adapt_lief(sample: Path):
    """PE/ELF/Mach-O structural metadata via the LIEF python binding."""
    import lief  # pinned in-image

    lief.logging.disable()
    ext = sample.suffix.lower() or ".bin"
    try:
        if ext == ".elf" or sample.read_bytes()[:4] == b"\x7fELF":
            parsed = lief.ELF.parse(str(sample))
        elif sample.read_bytes()[:2] == b"MZ":
            parsed = lief.PE.parse(str(sample))
        else:
            parsed = lief.MachO.parse(str(sample))
    except Exception as exc:  # parse failure → tool ERROR, never clean
        return {"status": "ERROR", "output": None, "note": f"lief parse failed: {type(exc).__name__}"}
    if parsed is None:
        return {"status": "NO_RESULT", "output": None, "note": "lief could not parse the artifact"}

    meta = {}
    try:
        header = parsed.header
        meta["format"] = str(parsed.format).split(".")[-1]
        if hasattr(parsed, "machine") and parsed.machine is not None:
            meta["architecture"] = str(parsed.machine).split(".")[-1]
        if hasattr(header, "entrypoint") and header.entrypoint:
            meta["entry_point"] = str(header.entrypoint)
        # PE-only optional fields
        pe = parsed
        if hasattr(pe, "optional_header") and pe.optional_header is not None:
            oh = pe.optional_header
            if getattr(oh, "image_base", 0):
                meta["image_base"] = str(oh.image_base)
        if hasattr(pe, "sections"):
            meta["section_count"] = len(list(pe.sections))
            imports = getattr(pe, "imports", None)
            if imports is not None:
                libs = [e.name for e in imports]
                meta["import_libraries"] = ",".join(sorted(libs)[:64])
                meta["import_library_count"] = len(libs)
            exports = getattr(pe, "get_export", None)
            if callable(exports):
                exp = exports()
                if exp is not None and getattr(exp, "entries", None) is not None:
                    names = [e.name for e in exp.entries if e.name]
                    meta["export_count"] = len(names)
                    meta["export_names_sample"] = ",".join(sorted(names)[:64])
        sig = getattr(parsed, "signatures", None)
        if sig is not None:
            meta["signature_indicator"] = "CERTIFICATE_DIRECTORY_PRESENT" if len(list(sig)) > 0 else "CERTIFICATE_DIRECTORY_ABSENT"
    except Exception as exc:
        meta["partial_parse_note"] = f"field extraction error: {type(exc).__name__}"

    return {"status": "OBSERVED", "output": {"kind": "lief", "metadata": meta}, "note": None}


def adapt_floss(sample: Path, timeout, max_out):
    """String intelligence via FLOSS: static, stack, tight, decoded strings."""
    exe = _probe("floss")
    if not exe:
        return {"status": "UNAVAILABLE", "output": None, "note": "floss binary not present in image"}
    argv = [exe, "--json", str(sample)]
    res = _run_argv(argv, timeout, max_out, sample.parent)
    if res["error_class"] == "TIMEOUT":
        return {"status": "ERROR", "output": None, "note": "floss timed out"}
    if res["exit_status"] != 0:
        return {"status": "ERROR", "output": None, "note": f"floss exit {res['exit_status']}"}
    try:
        doc = json.loads(res["stdout"])
    except json.JSONDecodeError:
        return {"status": "ERROR", "output": None, "note": "floss produced malformed JSON"}
    strings = doc.get("strings", {})
    stack = [s.get("string", "") for s in strings.get("stack", [])][:512]
    tight = [s.get("string", "") for s in strings.get("tight", [])][:512]
    decoded = [d.get("string", "") for d in strings.get("decoded", [])][:512]
    static = doc.get("strings", {}).get("static", [])
    return {
        "status": "OBSERVED" if (stack or tight or decoded or static) else "NO_RESULT",
        "output": {
            "kind": "floss",
            "strings": {"stack": stack, "decoded": decoded, "tight": tight, "static": len(static)},
            "total_extracted": len(stack) + len(tight) + len(decoded),
        },
        "note": None,
    }


def adapt_die(sample: Path, timeout, max_out):
    """Packer / compiler / linker signature detection via diec."""
    exe = _probe("diec")
    if not exe:
        return {"status": "UNAVAILABLE", "output": None, "note": "diec binary not present in image"}
    argv = [exe, "-j", str(sample)]
    res = _run_argv(argv, timeout, max_out, sample.parent)
    if res["error_class"] == "TIMEOUT":
        return {"status": "ERROR", "output": None, "note": "diec timed out"}
    if res["exit_status"] != 0:
        return {"status": "ERROR", "output": None, "note": f"diec exit {res['exit_status']}"}
    try:
        doc = json.loads(res["stdout"])
    except json.JSONDecodeError:
        return {"status": "ERROR", "output": None, "note": "diec produced malformed JSON"}
    detections = []
    for det in doc.get("detects", []):
        for entry in det.get("values", []):
            detections.append({
                "type": str(det.get("filetype", "UNKNOWN")),
                "value": str(entry.get("name", "")),
                "method": str(entry.get("method", "")) or None,
            })
    detections.sort(key=lambda d: (d["type"], d["value"]))
    return {
        "status": "OBSERVED" if detections else "NO_RESULT",
        "output": {"kind": "die", "detections": detections},
        "note": None,
    }


def adapt_yarax(sample: Path, timeout, max_out):
    """YARA-X rule matching against the (optional) vendored ruleset.

    No canonical ruleset exists in the repository, so the no-rules case is the
    expected production state: NO_RESULT with explicit tooling coverage.
    Rules are NEVER invented here.
    """
    exe = _probe("yr")
    if not exe:
        return {"status": "UNAVAILABLE", "output": None, "note": "yr binary not present in image"}
    rules = sorted(YARA_RULES.glob("*.yar")) + sorted(YARA_RULES.glob("*.yara"))
    if not rules:
        return {
            "status": "NO_RESULT",
            "output": None,
            "note": "no canonical YARA ruleset is configured (YARAX_RULESET_VERSION=%s); tooling coverage is explicit, this is NOT a clean result" % YARAX_RULESET_VERSION,
        }
    matches = []
    status = "NO_RESULT"
    for rule_file in rules:
        argv = [exe, "scan", "-C", str(rule_file), str(sample)]
        res = _run_argv(argv, timeout, max_out, sample.parent)
        if res["error_class"] == "TIMEOUT":
            return {"status": "ERROR", "output": None, "note": f"yara-x timed out on {rule_file.name}"}
        # yr scan exit 0/1/2: 1 = matches found (exit code 1), 2 = error
        if res["exit_status"] not in (0, 1):
            return {"status": "ERROR", "output": None, "note": f"yara-x exit {res['exit_status']} on {rule_file.name}"}
        try:
            doc = json.loads(res["stdout"])
        except json.JSONDecodeError:
            return {"status": "ERROR", "output": None, "note": "yara-x produced malformed JSON"}
        for m in doc.get("matches", []):
            rule = m.get("rule", {})
            matches.append({
                "rule": str(rule.get("identifier", "")),
                "namespace": str(rule.get("namespace", "")) or None,
                "meta": {str(k): str(v) for k, v in (rule.get("metadata") or {}).items()},
            })
            status = "OBSERVED"
    matches.sort(key=lambda m: (m["namespace"] or "", m["rule"]))
    return {"status": status, "output": {"kind": "yara", "matches": matches}, "note": None}


def adapt_capa(sample: Path, timeout, max_out):
    """Capability candidates via capa. Capabilities stay CAN_DO semantics at the
    canonical layer; this adapter only normalizes structured output."""
    exe = _probe("capa")
    if not exe:
        return {"status": "UNAVAILABLE", "output": None, "note": "capa binary not present in image"}
    rules = str(CAPA_RULES)
    if not CAPA_RULES.exists():
        return {"status": "NO_RESULT", "output": None, "note": "no capa rules vendored (coverage explicit, NOT a clean result)"}
    argv = [exe, "--quiet", "--json", "--rules", rules, str(sample)]
    res = _run_argv(argv, timeout, max_out, sample.parent)
    if res["error_class"] == "TIMEOUT":
        return {"status": "ERROR", "output": None, "note": "capa timed out"}
    if res["exit_status"] != 0:
        return {"status": "ERROR", "output": None, "note": f"capa exit {res['exit_status']}"}
    try:
        doc = json.loads(res["stdout"])
    except json.JSONDecodeError:
        return {"status": "ERROR", "output": None, "note": "capa produced malformed JSON"}
    capabilities = []
    for rule_name, rule in (doc.get("rules") or {}).items():
        meta = rule.get("meta", {})
        attack = [f"{b.get('canonical', '')}" for b in meta.get("att&ck", [])]
        mbc = [f"{b.get('canonical', '')}" for b in meta.get("mbc", [])]
        locs = rule.get("matches", [])
        capabilities.append({
            "name": str(rule_name),
            "address": str(locs[0].get("loc", "")) if locs else None,
            "source_rule": str(meta.get("name", "")) or None,
            "attack": attack or None,
            "mbc": mbc or None,
        })
    capabilities.sort(key=lambda c: c["name"])
    return {"status": "OBSERVED" if capabilities else "NO_RESULT", "output": {"kind": "capa", "capabilities": capabilities}, "note": None}


ADAPTERS = {
    "lief": adapt_lief,
    "floss": adapt_floss,
    "die": adapt_die,
    "yara-x": adapt_yarax,
    "capa": adapt_capa,
}

TOOL_VERSIONS = {
    "lief": LIEF_VERSION,
    "floss": FLOSS_VERSION,
    "capa": CAPA_VERSION,
    "yara-x": YARAX_VERSION,
    "die": DIE_VERSION,
}


def run_job(job: dict) -> dict:
    analysis_run_id = str(job.get("analysis_run_id", ""))
    artifact_id = str(job.get("artifact_id", ""))
    declared_sha = str(job.get("sha256", "")).lower()
    requested = [t for t in (job.get("requested_tools") or []) if t in SUPPORTED_TOOLS]
    limits = job.get("limits") or {}
    timeout = min(int(limits.get("timeout_seconds", DEFAULT_TIMEOUT_SECONDS)), 600)
    max_out = min(int(limits.get("max_output_bytes", DEFAULT_MAX_OUTPUT_BYTES)), 64 * 1024 * 1024)

    if not (analysis_run_id and artifact_id and declared_sha):
        return {"job_status": "REJECTED", "reason": "analysis_run_id/artifact_id/sha256 are required"}

    # ── sample materialization into a fresh ephemeral dir (never reused) ──
    workdir = Path(tempfile.mkdtemp(prefix="zxjob-"))
    try:
        if job.get("sample_b64"):
            raw = base64.b64decode(job["sample_b64"], validate=True)
        elif job.get("sample_path"):
            src = Path(str(job["sample_path"]))
            if not src.is_file():
                return {"job_status": "REJECTED", "reason": "sample_path does not exist"}
            raw = src.read_bytes()
        else:
            return {"job_status": "REJECTED", "reason": "sample_b64 or sample_path required"}
        if len(raw) > MAX_SAMPLE_BYTES:
            return {"job_status": "REJECTED", "reason": "sample exceeds MAX_SAMPLE_BYTES"}
        if hashlib.sha256(raw).hexdigest() != declared_sha:
            return {"job_status": "REJECTED", "reason": "sha256 mismatch: bytes do not match declared identity"}

        sample = workdir / f"sample_{declared_sha[:16]}"
        sample.write_bytes(raw)
        sample.chmod(0o400)  # read-only for the analysis user

        results = []
        for tool in SUPPORTED_TOOLS:  # deterministic tool order
            if tool not in requested:
                continue
            adapter = ADAPTERS[tool]
            try:
                if tool == "lief":
                    outcome = adapt_lief(sample)
                else:
                    outcome = adapter(sample, timeout, max_out)
            except Exception as exc:  # adapter crash → tool ERROR; run continues
                outcome = {"status": "ERROR", "output": None, "note": f"adapter crash: {type(exc).__name__}"}
            results.append({
                "tool_id": tool,
                "tool_version": TOOL_VERSIONS[tool],
                "status": outcome["status"],
                "output": outcome["output"],
                "note": outcome.get("note"),
                "provenance": {
                    "tool_id": tool,
                    "tool_version": TOOL_VERSIONS[tool],
                    "analysis_run_id": analysis_run_id,
                    "artifact_id": artifact_id,
                    "input_sha256": declared_sha,
                    "runner_identity": RUNNER_IDENTITY,
                    "ruleset_version": (
                        CAPA_RULES_VERSION if tool == "capa"
                        else YARAX_RULESET_VERSION if tool == "yara-x"
                        else None
                    ),
                    "ruleset_digest": "UNKNOWN",
                    "tool_binary_digest": "UNKNOWN",
                },
            })
        return {
            "job_status": "COMPLETED",
            "analysis_run_id": analysis_run_id,
            "artifact_id": artifact_id,
            "sha256": declared_sha,
            "results": results,
        }
    finally:
        # ephemeral teardown: sample + every tool temp artifact
        shutil.rmtree(workdir, ignore_errors=True)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # health only — no other GET surface
        if self.path == "/health":
            body = json.dumps({"status": "ok", "runner_identity": RUNNER_IDENTITY}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path != "/analyze":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > (MAX_SAMPLE_BYTES + 4 * 1024 * 1024):
            self.send_response(413)
            self.end_headers()
            return
        try:
            job = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return
        result = run_job(job)
        status = 200 if result.get("job_status") == "COMPLETED" else 422
        body = json.dumps(result).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # bounded, secret-free logging
        print(f"[zx-container] {self.address_string()} {fmt % args}"[:512], flush=True)


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
