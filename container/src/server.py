"""
ZAYRON-X M14.3 static-analysis container server.

Accepts ONE canonical analysis job shape (POST /analyze):

    AnalysisJob {
      analysis_run_id, artifact_id, sha256,
      sample_b64 (or sample_path for mounted transports),
      requested_tools[], limits {timeout_seconds, max_output_bytes},
      extraction_requests[] {kind: "AUTOIT_RCDATA_RESOURCE", magic?,
                             host_extent? {host_offset, size_bytes}, magic_offset?}
    }

The read-only extraction pass (phase 6) returns one typed result per request
(EXTRACTED / NO_RESULT / ERROR) under `extractions`; it never executes what it
extracts and never guesses a boundary.

The decode pass (phase 6.2) deterministically decodes each successful
extraction's recovered bytes with the PINNED AutoIt-Ripper EA06 decoder and
verifies every record against the format's own declared adler32 checksum and
declared sizes before returning anything. It never executes what it decodes.

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
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import traceback
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
MAGIKA_VERSION = os.environ.get("MAGIKA_VERSION", "1.0.3")
# Phase 6: deterministic READ-ONLY resource extraction. No new runtime, no new
# dependency, no execution of the extracted bytes.
AUTOIT_EXTRACTOR_VERSION = os.environ.get(
    "AUTOIT_EXTRACTOR_VERSION", "1.0.0-autoitresourceextractor-canonical"
)
AUTOIT_RESOURCE_MAGIC = b"AU3!EA06"

# Phase 6.2 — pinned, deterministic EA06 decoder (AutoIt-Ripper, MIT, PyPI wheel).
# The pin is enforced at import time: a different installed version is an
# UNAVAILABLE state, never a silent downgrade to "whatever is present".
AUTOIT_DECODER_PACKAGE = "autoit-ripper"
AUTOIT_DECODER_VERSION = "1.2.0"
AUTOIT_DECODER_METHOD = "AUTOIT_RIPPER_EA06_LAME_DEFLATE"
AUTOIT_MAX_DECODED_BYTES = 8 * 1024 * 1024
AUTOIT_EXTRACTION_METHOD = "PE_RESOURCE_DIRECTORY_RCDATA"
MAX_EXTRACTION_REQUESTS = 4
MAX_EXTRACTED_BYTES = 4 * 1024 * 1024
PE_RESOURCE_TYPE_RCDATA = 10
MAX_PE_SECTIONS = 96
MAX_RESOURCE_ENTRIES = 4096
MAX_RESOURCE_DEPTH = 3
# Magika prediction mode is CONFIGURED here (the tool does not echo it back), and
# is recorded verbatim as provenance. It is a content-typing tolerance only.
MAGIKA_PREDICTION_MODE = os.environ.get("MAGIKA_PREDICTION_MODE", "HIGH_CONFIDENCE")

SUPPORTED_TOOLS = ("lief", "floss", "die", "yara-x", "capa", "magika")

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


def adapt_magika(sample: Path, timeout, max_out):
    """Content-type classification via the pinned Google Magika python binding.

    Answers ONE question: what type of content does this artifact appear to
    contain? It is NOT a malware verdict, family, capability, behavior, or
    intent assessment, and its prediction score is NOT threat confidence.

    Runs in-process like the LIEF adapter (same pinned venv, no new runtime, no
    network); the model is loaded once per job. A missing package is UNAVAILABLE
    and a failure is ERROR — never a default content type.
    """
    try:
        from magika import Magika  # pinned in-image
    except Exception as exc:
        return {
            "status": "UNAVAILABLE",
            "output": None,
            "note": f"magika module not present in image: {type(exc).__name__}",
        }

    try:
        from magika import PredictionMode

        mode = PredictionMode[MAGIKA_PREDICTION_MODE]
    except Exception:
        # An unknown configured mode is a configuration error, never silently
        # downgraded to a different mode.
        return {
            "status": "ERROR",
            "output": None,
            "note": f"magika prediction mode '{MAGIKA_PREDICTION_MODE}' is not supported by this magika version",
        }

    started = time.monotonic()
    try:
        identifier = Magika(prediction_mode=mode)
        result = identifier.identify_path(str(sample))
    except Exception as exc:  # execution failure → ERROR, never a default type
        return {
            "status": "ERROR",
            "output": None,
            "note": f"magika execution failed: {type(exc).__name__}",
        }
    duration_ms = round((time.monotonic() - started) * 1000, 3)

    if not getattr(result, "ok", False):
        # Every non-OK magika status (FILE_NOT_FOUND_ERROR, PERMISSION_ERROR,
        # UNKNOWN) is an EXECUTION FAILURE, not an empty result: mapping it to
        # NO_RESULT would collapse "magika could not run on this input" into
        # "magika ran and found nothing", which the canonical state contract
        # forbids (ERROR and NO_RESULT are never collapsed).
        status = getattr(getattr(result, "status", None), "name", None)
        return {
            "status": "ERROR",
            "output": None,
            "note": f"magika could not classify the input (status {status or 'UNKNOWN'})",
        }

    try:
        final = result.output
        raw = result.dl
        label = str(getattr(final, "label", "") or "")
        if not label:
            return {"status": "NO_RESULT", "output": None, "note": "magika returned an empty content-type label"}
        overrule = getattr(result, "overwrite_reason", None)
        if overrule is None:
            prediction = result.prediction
            overrule = getattr(prediction, "overwrite_reason", None)
        overrule_name = getattr(overrule, "name", None)
        score = getattr(result, "score", None)
        try:
            score_value = float(score) if score is not None else None
        except (TypeError, ValueError):
            score_value = None
        # Version/model provenance is read from the tool itself and NEVER
        # defaulted: magika exposes its module version and its model NAME
        # (`standard_v3_3`); it exposes no separate model-version accessor, so
        # the model identifier recorded here IS the model name and nothing is
        # invented to fill a version-shaped field. A getter that fails raises
        # into the fail-closed normalization handler below rather than being
        # swallowed into a silent null.
        model_version = str(identifier.get_model_name())
        package_version = str(identifier.get_module_version())
        payload = {
            "kind": "magika",
            "content_type": label,
            "content_type_description": str(getattr(final, "description", "") or "") or None,
            "content_type_group": str(getattr(final, "group", "") or "") or None,
            "mime_type": str(getattr(final, "mime_type", "") or "") or None,
            "is_text": bool(getattr(final, "is_text", False)),
            "prediction_score": score_value,
            "prediction_mode": MAGIKA_PREDICTION_MODE,
            "model_prediction": (str(getattr(raw, "label", "") or "") or None),
            "overwrite_reason": (overrule_name if isinstance(overrule_name, str) else None),
            "model_version": model_version,
            "package_version": package_version,
            "execution_duration_ms": duration_ms,
        }
    except Exception as exc:
        return {
            "status": "ERROR",
            "output": None,
            "note": f"magika result normalization failed: {type(exc).__name__}",
        }

    return {"status": "OBSERVED", "output": payload, "note": None}


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
                "namespace": str(rule.get("namespace", "") or "") or None,
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
    "magika": adapt_magika,
}

TOOL_VERSIONS = {
    "lief": LIEF_VERSION,
    "floss": FLOSS_VERSION,
    "capa": CAPA_VERSION,
    "yara-x": YARAX_VERSION,
    "die": DIE_VERSION,
    "magika": MAGIKA_VERSION,
}


# ── phase 6: deterministic PE-resource extraction (read-only) ─────────────
#
# The ONLY boundary source is the PE resource directory: an extracted payload
# must BE an IMAGE_RESOURCE_DATA_ENTRY (type RCDATA) extent, never a range found
# by scanning the file for a signature. Fixed offsets only, hard bounds, no
# shell, no execution, no network, no write outside the ephemeral job dir.
# (bounded, typed, fail-closed)


class _PeLayoutError(Exception):
    """Typed PE/resource parse failure — never silently treated as absence."""

    def __init__(self, error_class: str, note: str):
        super().__init__(note)
        self.error_class = error_class
        self.note = note


def _u16(raw: bytes, off: int) -> int:
    return int.from_bytes(raw[off:off + 2], "little")


def _u32(raw: bytes, off: int) -> int:
    return int.from_bytes(raw[off:off + 4], "little")


def _pe_sections(raw: bytes):
    """Bounded PE header parse → (sections, resource_dir_rva, resource_dir_size)."""
    if len(raw) < 0x40:
        raise _PeLayoutError("PE_LAYOUT_INVALID", "input is smaller than a DOS header")
    if raw[0:2] != b"MZ":
        raise _PeLayoutError("PE_LAYOUT_INVALID", "no MZ signature")
    pe = _u32(raw, 0x3C)
    if pe <= 0 or pe + 24 > len(raw) or raw[pe:pe + 4] != b"PE\x00\x00":
        raise _PeLayoutError("PE_LAYOUT_INVALID", "no PE signature at e_lfanew")
    num_sections = _u16(raw, pe + 6)
    size_opt = _u16(raw, pe + 20)
    if num_sections == 0 or num_sections > MAX_PE_SECTIONS:
        raise _PeLayoutError("PE_LAYOUT_INVALID", "section count outside the supported bound")
    opt = pe + 24
    if opt + size_opt > len(raw):
        raise _PeLayoutError("PE_LAYOUT_INVALID", "optional header extends past end of file")
    magic = _u16(raw, opt)
    if magic not in (0x10B, 0x20B):
        raise _PeLayoutError("PE_LAYOUT_INVALID", "optional header magic is neither PE32 nor PE32+")
    dd = opt + (112 if magic == 0x20B else 96)
    if dd + 24 > len(raw):
        raise _PeLayoutError("PE_LAYOUT_INVALID", "data directory table truncated")
    res_rva = _u32(raw, dd + 2 * 8)
    res_size = _u32(raw, dd + 2 * 8 + 4)
    table = opt + size_opt
    sections = []
    for i in range(num_sections):
        base = table + i * 40
        if base + 40 > len(raw):
            raise _PeLayoutError("PE_LAYOUT_INVALID", "section table truncated")
        sections.append((_u32(raw, base + 12), _u32(raw, base + 8), _u32(raw, base + 20), _u32(raw, base + 16)))
    return sections, res_rva, res_size


def _rva_to_offset(sections, rva: int, size: int):
    """Map an RVA to a file offset using the section table; None when unmapped."""
    for va, vsize, poff, rsize in sections:
        span = max(vsize, rsize)
        if va <= rva < va + span:
            delta = rva - va
            if delta + size > max(vsize, rsize):
                return None
            return poff + delta
    return None


def _resource_data_entries(raw: bytes, sections, res_rva: int, res_size: int):
    """Walk the resource directory (bounded, ≤3 levels) → RCDATA data entries."""
    if res_rva == 0 or res_size == 0:
        raise _PeLayoutError("RESOURCE_DIRECTORY_ABSENT", "the PE image declares no resource directory")
    base = _rva_to_offset(sections, res_rva, res_size)
    if base is None or base + 16 > len(raw):
        raise _PeLayoutError("RESOURCE_DIRECTORY_UNMAPPED", "resource directory RVA does not map into the file")
    entries = []
    walked = {"count": 0}

    def walk(dir_off: int, path, depth: int) -> None:
        if depth > MAX_RESOURCE_DEPTH:
            raise _PeLayoutError("RESOURCE_DEPTH_EXCEEDED", "resource directory nesting exceeded the bound")
        if dir_off < 0 or dir_off + 16 > len(raw):
            raise _PeLayoutError("RESOURCE_ENTRY_OUT_OF_BOUNDS", "resource directory entry outside the file")
        named = _u16(raw, dir_off + 12)
        ids = _u16(raw, dir_off + 14)
        for i in range(named + ids):
            ent = dir_off + 16 + i * 8
            if ent + 8 > len(raw):
                raise _PeLayoutError("RESOURCE_ENTRY_OUT_OF_BOUNDS", "resource directory entry outside the file")
            walked["count"] += 1
            if walked["count"] > MAX_RESOURCE_ENTRIES:
                raise _PeLayoutError("RESOURCE_ENTRY_BUDGET_EXHAUSTED", "resource inventory exceeded the entry budget")
            name_field = _u32(raw, ent)
            child = _u32(raw, ent + 4)
            ident = None if (name_field & 0x80000000) else name_field
            if child & 0x80000000:
                walk(base + (child & 0x7FFFFFFF), path + [ident], depth + 1)
                continue
            data_ent = base + child
            if data_ent + 16 > len(raw):
                raise _PeLayoutError("RESOURCE_ENTRY_OUT_OF_BOUNDS", "resource data entry outside the file")
            data_rva = _u32(raw, data_ent)
            size = _u32(raw, data_ent + 4)
            if size == 0:
                continue
            if data_rva == 0:
                raise _PeLayoutError("RESOURCE_ENTRY_OUT_OF_BOUNDS", "resource data entry has a null address")
            off = _rva_to_offset(sections, data_rva, size)
            if off is None or off + size > len(raw):
                raise _PeLayoutError("EXTENT_OUT_OF_BOUNDS", "resource extent is not inside the file")
            entries.append({
                "type_id": path[0] if path else None,
                "id": ident if depth == 1 else (path[1] if len(path) > 1 else None),
                "offset": off,
                "size": size,
            })

    walk(base, [], 0)
    return entries


def _extraction_error(error_class: str, note: str, started: float):
    """Typed extraction failure — never bytes, never a guessed extent."""
    return {
        "status": "ERROR",
        "error_class": error_class,
        "note": note[:512],
        "extractor_version": AUTOIT_EXTRACTOR_VERSION,
        "extraction_method": AUTOIT_EXTRACTION_METHOD,
        "duration_ms": round((time.monotonic() - started) * 1000, 3),
    }


def decode_autoit_ea06(payload: bytes) -> dict:
    """Deterministically decode a recovered AU3!EA06 resource extent.

    The record layout of THIS plane's extracted extent is fixed and validated
    before any transform: 16-byte pass prefix, 8-byte AU3!EA06 magic, 16-byte
    checksum area, then the AU3 records (the layout the library's own
    ``unpack_ea06`` uses after PE-resource slicing, verified against the live
    specimen and its declared adler32/uncompressed-size ground truth).

    Ground truth, not plausibility: every accepted record's decrypted compressed
    payload must match the adler32 checksum the record itself declares, and the
    decompressed length must equal the record's declared uncompressed size.
    A decode that cannot prove both is an ERROR, never output.

    Pure data transformation: nothing is written, executed or sent anywhere.
    """
    started = time.monotonic()
    try:
        import autoit_ripper  # noqa: F401
        from importlib.metadata import version as _pkg_version

        installed = _pkg_version(AUTOIT_DECODER_PACKAGE)
    except Exception as exc:  # missing package → UNAVAILABLE, never a guess
        return {
            "status": "UNAVAILABLE",
            "note": f"decoder package not present in image: {type(exc).__name__}",
            "decoder_method": AUTOIT_DECODER_METHOD,
            "decoder_version": AUTOIT_DECODER_VERSION,
            "duration_ms": round((time.monotonic() - started) * 1000, 3),
        }
    if installed != AUTOIT_DECODER_VERSION:
        return {
            "status": "ERROR",
            "note": f"decoder version drift: installed {installed}, pinned {AUTOIT_DECODER_VERSION}",
            "decoder_method": AUTOIT_DECODER_METHOD,
            "decoder_version": AUTOIT_DECODER_VERSION,
            "duration_ms": round((time.monotonic() - started) * 1000, 3),
        }

    if len(payload) < 0x18 + 16 or payload[0x10:0x18] != AUTOIT_RESOURCE_MAGIC:
        return {
            "status": "ERROR",
            "note": "payload is not a recognised AU3!EA06 extent layout",
            "decoder_method": AUTOIT_DECODER_METHOD,
            "decoder_version": AUTOIT_DECODER_VERSION,
            "duration_ms": round((time.monotonic() - started) * 1000, 3),
        }

    try:
        from autoit_ripper.autoit_unpack import EA06Decryptor, decompress, parse_all
        from autoit_ripper.utils import ByteStream
        from zlib import adler32

        dec = EA06Decryptor()
        stream = ByteStream(payload[0x18:])
        stream.get_bytes(16)  # checksum area (parse_all reads it; EA06 key is static)

        records = []
        while True:
            try:
                head = stream.get_bytes(4)
            except Exception:
                break
            if len(head) < 4 or dec.decrypt(head, dec.au3_ResType) != b"FILE":
                break  # end of embedded data — a normal, verified termination

            def _string(keys) -> str:
                length = stream.u32() ^ keys[0]
                enc_key = length + keys[1]
                blob = dec.decrypt(stream.get_bytes(length << 1), enc_key)
                return blob.decode("utf-16")

            subtype = _string(dec.au3_ResSubType)
            name = _string(dec.au3_ResName)
            if subtype == ">>>AUTOIT NO CMDEXECUTE<<<":
                stream.skip_bytes(1)
                stream.skip_bytes((stream.u32() ^ dec.au3_ResSize) + 0x18)
                continue

            is_compressed = stream.u8()
            size_compressed = stream.u32() ^ dec.au3_ResSize
            size_plain = stream.u32() ^ dec.au3_ResSize
            crc_declared = stream.u32() ^ dec.au3_ResCrcCompressed
            stream.get_bytes(16)  # creation/last-write FILETIMEs
            if size_compressed > len(payload) or size_plain > AUTOIT_MAX_DECODED_BYTES:
                return {
                    "status": "ERROR",
                    "note": "record declares sizes outside the verified bounds; nothing is decoded",
                    "decoder_method": AUTOIT_DECODER_METHOD,
                    "decoder_version": AUTOIT_DECODER_VERSION,
                    "duration_ms": round((time.monotonic() - started) * 1000, 3),
                }
            decrypted = dec.decrypt(stream.get_bytes(size_compressed), dec.au3_ResContent)
            if (adler32(decrypted) & 0xFFFFFFFF) != crc_declared:
                return {
                    "status": "ERROR",
                    "note": "record content failed its own declared adler32 checksum; no output is published",
                    "decoder_method": AUTOIT_DECODER_METHOD,
                    "decoder_version": AUTOIT_DECODER_VERSION,
                    "duration_ms": round((time.monotonic() - started) * 1000, 3),
                }
            plain = decrypted if is_compressed != 1 else decompress(ByteStream(decrypted))
            if plain is None or len(plain) != size_plain:
                return {
                    "status": "ERROR",
                    "note": "decompressed length does not equal the record's declared uncompressed size",
                    "decoder_method": AUTOIT_DECODER_METHOD,
                    "decoder_version": AUTOIT_DECODER_VERSION,
                    "duration_ms": round((time.monotonic() - started) * 1000, 3),
                }
            records.append({"subtype": subtype, "name": name, "size": len(plain), "content": plain})

        if not records:
            return {
                "status": "NO_RESULT",
                "note": "extent parsed as EA06 but contained no decodable script record",
                "decoder_method": AUTOIT_DECODER_METHOD,
                "decoder_version": AUTOIT_DECODER_VERSION,
                "duration_ms": round((time.monotonic() - started) * 1000, 3),
            }
        # The compiled script is the record the canonical configuration layer
        # models; extra records stay listed with their digests, never dropped
        # silently and never interpreted.
        script = next((r for r in records if r["subtype"] == ">>>AUTOIT SCRIPT<<<"), records[0])
        return {
            "status": "DECODED",
            "note": None,
            "decoder_method": AUTOIT_DECODER_METHOD,
            "decoder_version": AUTOIT_DECODER_VERSION,
            "output_sha256": hashlib.sha256(script["content"]).hexdigest(),
            "output_size_bytes": len(script["content"]),
            "output_b64": base64.b64encode(script["content"]).decode("ascii"),
            "output_name": script["name"],
            "records": [
                {"subtype": r["subtype"], "name": r["name"], "size": r["size"],
                 "sha256": hashlib.sha256(r["content"]).hexdigest()}
                for r in records
            ],
            "verification": "adler32-of-decrypted-content == record-declared crc AND decompressed length == record-declared uncompressed size (every record)",
            "duration_ms": round((time.monotonic() - started) * 1000, 3),
        }
    except Exception as exc:  # decoder crash → typed ERROR, never a default
        return {
            "status": "ERROR",
            "note": f"decoder execution failed: {type(exc).__name__}",
            "decoder_method": AUTOIT_DECODER_METHOD,
            "decoder_version": AUTOIT_DECODER_VERSION,
            "duration_ms": round((time.monotonic() - started) * 1000, 3),
        }


def extract_autoit_resource(sample: Path, request: dict) -> dict:
    """Extract the RCDATA resource extent that hosts a compiled-AutoIt magic.

    Validates, in order: declared parent sha256 == measured bytes; PE layout
    parses; the resource directory exists; RCDATA extents exist and stay inside
    the file; exactly ONE RCDATA extent contains the magic (more than one is
    AMBIGUOUS and refused — never guessed); any caller-declared extent / magic
    offset matches that entry exactly; the payload is within the transport bound.
    """
    started = time.monotonic()
    try:
        raw = sample.read_bytes()
    except OSError as exc:
        return _extraction_error("SAMPLE_UNREADABLE", type(exc).__name__, started)
    measured = hashlib.sha256(raw).hexdigest()
    declared = str(request.get("expected_parent_sha256") or "").strip().lower()
    if declared and declared != measured:
        return _extraction_error(
            "PARENT_SHA256_MISMATCH", "measured parent bytes do not match the declared parent sha256", started
        )
    magic_field = request.get("magic")
    magic = AUTOIT_RESOURCE_MAGIC if not magic_field else str(magic_field).encode("ascii", "ignore")
    if not magic:
        return _extraction_error("INVALID_REQUEST", "magic must be a non-empty ASCII string", started)
    declared_extent = request.get("host_extent")
    declared_magic_offset = request.get("magic_offset")
    try:
        sections, res_rva, res_size = _pe_sections(raw)
        entries = _resource_data_entries(raw, sections, res_rva, res_size)
    except _PeLayoutError as exc:
        return _extraction_error(exc.error_class, exc.note, started)

    candidates = []
    for entry in entries:
        if entry["type_id"] != PE_RESOURCE_TYPE_RCDATA:
            continue
        segment = raw[entry["offset"]:entry["offset"] + entry["size"]]
        at = segment.find(magic)
        if at < 0:
            continue
        candidates.append({**entry, "magic_offset": entry["offset"] + at})
    candidates.sort(key=lambda c: (c["offset"], c["size"], c["magic_offset"]))
    if not candidates:
        return {
            "status": "NO_RESULT",
            "error_class": None,
            "note": "no RCDATA resource extent contains the requested magic; this is NOT evidence of absence",
            "extractor_version": AUTOIT_EXTRACTOR_VERSION,
            "extraction_method": AUTOIT_EXTRACTION_METHOD,
            "parent_sha256": measured,
            "duration_ms": round((time.monotonic() - started) * 1000, 3),
        }
    if len(candidates) > 1:
        return _extraction_error(
            "AMBIGUOUS_RESOURCE_MATCH",
            f"{len(candidates)} RCDATA extents contain the magic; the boundary is ambiguous and nothing is extracted",
            started,
        )
    chosen = candidates[0]
    if isinstance(declared_extent, dict):
        host = declared_extent.get("host_offset")
        size = declared_extent.get("size_bytes")
        if host is not None and int(host) != chosen["offset"]:
            return _extraction_error("DECLARED_EXTENT_MISMATCH", "declared host offset is not a resource extent", started)
        if size is not None and int(size) != chosen["size"]:
            return _extraction_error("DECLARED_EXTENT_MISMATCH", "declared extent size is not the resource extent size", started)
    if declared_magic_offset is not None and int(declared_magic_offset) != chosen["magic_offset"]:
        return _extraction_error("MAGIC_OFFSET_MISMATCH", "declared magic offset differs from the resource-contained magic", started)
    if chosen["size"] > MAX_EXTRACTED_BYTES:
        return _extraction_error(
            "OUTPUT_TOO_LARGE", f"resource extent {chosen['size']} exceeds the extraction transport bound", started
        )
    payload = raw[chosen["offset"]:chosen["offset"] + chosen["size"]]
    if len(payload) != chosen["size"]:
        return _extraction_error("EXTENT_OUT_OF_BOUNDS", "resource extent is not fully inside the file", started)
    return {
        "status": "EXTRACTED",
        "error_class": None,
        "note": None,
        "extractor_version": AUTOIT_EXTRACTOR_VERSION,
        "extraction_method": AUTOIT_EXTRACTION_METHOD,
        "parent_sha256": measured,
        "host_offset": chosen["offset"],
        "size_bytes": chosen["size"],
        "resource_type": "RCDATA",
        "resource_id": chosen["id"],
        "magic_offset": chosen["magic_offset"],
        "output_sha256": hashlib.sha256(payload).hexdigest(),
        "output_size_bytes": len(payload),
        "output_b64": base64.b64encode(payload).decode("ascii"),
        "duration_ms": round((time.monotonic() - started) * 1000, 3),
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
        # Deterministic, read-only extraction pass over the canonical evidence
        # boundary (PE resource directory). Runs AFTER the analyzers, never
        # before, and its failure can never fail the job.
        extractions = []
        requests = job.get("extraction_requests") or []
        if isinstance(requests, list):
            for req in requests[:MAX_EXTRACTION_REQUESTS]:
                if not isinstance(req, dict):
                    extractions.append({
                        "status": "ERROR", "error_class": "INVALID_REQUEST",
                        "note": "extraction request must be an object",
                        "extractor_version": AUTOIT_EXTRACTOR_VERSION,
                        "extraction_method": AUTOIT_EXTRACTION_METHOD,
                    })
                    continue
                if req.get("kind") != "AUTOIT_RCDATA_RESOURCE":
                    extractions.append({
                        "status": "ERROR", "error_class": "UNSUPPORTED_EXTRACTION_KIND",
                        "note": "only AUTOIT_RCDATA_RESOURCE is supported by this plane",
                        "extractor_version": AUTOIT_EXTRACTOR_VERSION,
                        "extraction_method": AUTOIT_EXTRACTION_METHOD,
                    })
                    continue
                try:
                    extractions.append(extract_autoit_resource(sample, req))
                except Exception as exc:  # extraction crash → typed ERROR, job continues
                    extractions.append({
                        "status": "ERROR", "error_class": "EXTRACTOR_CRASH",
                        "note": type(exc).__name__,
                        "extractor_version": AUTOIT_EXTRACTOR_VERSION,
                        "extraction_method": AUTOIT_EXTRACTION_METHOD,
                    })
        # Phase 6.2 — deterministic decode pass over the RECOVERED payloads of
        # this same job. Input = this job's own successful extraction records
        # (never a caller-supplied byte source). Every record's output is
        # verified against the format's own declared checksums before it is
        # returned; a decode failure is a typed state, never a default.
        decodings = []
        for rec in extractions:
            if rec.get("status") != "EXTRACTED":
                continue
            try:
                decodings.append(decode_autoit_ea06(base64.b64decode(rec["output_b64"])))
            except Exception as exc:  # decode crash → typed ERROR, job continues
                decodings.append({
                    "status": "ERROR",
                    "note": f"decode pass crash: {type(exc).__name__}",
                    "decoder_method": AUTOIT_DECODER_METHOD,
                    "decoder_version": AUTOIT_DECODER_VERSION,
                })
        return {
            "job_status": "COMPLETED",
            "analysis_run_id": analysis_run_id,
            "artifact_id": artifact_id,
            "sha256": declared_sha,
            "results": results,
            "extractions": extractions,
            "decodings": decodings,
        }
    finally:
        # ephemeral teardown: sample + every tool temp artifact (§24)
        shutil.rmtree(workdir, ignore_errors=True)


def _bounded_diagnostic(exc: BaseException) -> str:
    """Bounded, secret-free diagnostic line for the HTTP error response.

    Contains ONLY the exception class name — never sample bytes, never
    environment values, never a traceback (the traceback goes to stderr only).
    """
    return f"{type(exc).__name__} raised during job execution"[:512]


def _log_bounded_traceback(exc: BaseException) -> None:
    """Full traceback to container stderr ONLY (bounded), for docker logs."""
    buf = io.StringIO()
    traceback.print_exception(type(exc), exc, exc.__traceback__, file=buf, limit=25)
    print(("[zx-container] unexpected exception:\n" + buf.getvalue())[:8192],
          file=sys.stderr, flush=True)


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
        # M14.4.1: an unexpected run_job exception must NEVER silently close
        # the HTTP connection. Bounded top-level handler: HTTP 500 + bounded
        # JSON {job_status: ERROR, reason: <exception class>, diagnostic}.
        # The full traceback goes to stderr only; the response never carries
        # sample bytes, secrets, or a traceback.
        try:
            result = run_job(job)
        except Exception as exc:  # deliberate top-level observability boundary
            _log_bounded_traceback(exc)
            body = json.dumps({
                "job_status": "ERROR",
                "reason": type(exc).__name__,
                "diagnostic": _bounded_diagnostic(exc),
            }).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        status = 200 if result.get("job_status") == "COMPLETED" else 422
        body = json.dumps(result).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):  # bounded, secret-free logging (§45)
        print(f"[zx-container] {self.address_string()} {fmt % args}"[:512], flush=True)


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
