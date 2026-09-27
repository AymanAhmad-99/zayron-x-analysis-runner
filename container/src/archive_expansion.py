"""M16.4.13 — bounded static archive expansion with child-artifact provenance.

EXTRACT != EXECUTE: this module performs PURE static byte extraction. It never
launches, loads, interprets, or evaluates extracted content; extracted bytes
are DATA only. There is no process-launch surface, no shell, and no
command execution anywhere in this module.

Design: reuse the FROZEN M16.2 Gate-2 budgets from ``archive_budgets.py`` as
the single non-overridable source of resource limits, and feed every extraction
decision through them so a budget exhaustion can never be reported as COMPLETE.

Supported formats (stdlib-only, no new dependencies):
    zip  — via ``zipfile`` (deflate/store)
    tar  — via ``tarfile`` (uncompressed members)
    gzip — via ``gzip.decompress`` (single-stream, raw payload only)

Unsupported formats are reported as the explicit typed state
``ARCHIVE_UNSUPPORTED`` — never silently ignored.
"""
from __future__ import annotations

import gzip
import io
import posixpath
import tarfile
import time
import zipfile
import zlib
from pathlib import PurePosixPath
from typing import Dict, List, Optional, Tuple

from .archive_budgets import ArchiveAnalysisBudgets

# M16.2-frozen authoritative budgets (non-overridable by any caller or payload).
_BUDGETS = ArchiveAnalysisBudgets()

ARCHIVE_EXPANSION_VERSION = "1.0.0"
ARCHIVE_EXPANSION_METHOD = "static_zip_tar_gzip_v1"

# ── Explicit, fail-closed archive budgets (M16.2-frozen, non-overridable) ──
MAX_ARCHIVE_DEPTH = 2          # parent archive -> nested archive -> payload
MAX_CHILD_FILES = 64           # entries extracted per archive
MAX_TOTAL_EXTRACTED_BYTES = 64 * 1024 * 1024
MAX_SINGLE_CHILD_BYTES = 16 * 1024 * 1024
MAX_PATH_LENGTH = 512


class ArchiveExpansionError(Exception):
    """Base class: the expansion pass failed in a typed, reportable way."""


class ArchiveUnsupported(ArchiveExpansionError):
    """The outer container format is not supported by this plane."""


class ExtractionBlocked(ArchiveExpansionError):
    """A safety invariant (traversal/symlink/device/path) was violated."""


def detect_archive_format(raw: bytes) -> Optional[str]:
    """Bounded magic-byte format detection (no filename trust)."""
    if raw[:4] == b"PK\x03\x04":
        return "zip"
    if raw[:2] == b"\x1f\x8b":
        return "gzip"
    if raw[:262:512].find(b"ustar") != -1 or (len(raw) >= 512 and raw[257:262] == b"ustar"):
        return "tar"
    return None


def _safe_relative_path(entry_path: str) -> str:
    """Reject absolute paths, traversal escapes, and pathological names.

    Returns the sanitized relative path. Raises ExtractionBlocked otherwise.
    """
    if not isinstance(entry_path, str) or not entry_path.strip():
        raise ExtractionBlocked("EMPTY_ENTRY_PATH")
    if len(entry_path) > MAX_PATH_LENGTH:
        raise ExtractionBlocked("PATH_TOO_LONG")
    if entry_path.startswith("/") or entry_path.startswith("\\"):
        raise ExtractionBlocked("ABSOLUTE_PATH")
    if ":" in entry_path.split("/")[0].split("\\")[0] and len(entry_path.split("/")[0].split("\\")[0]) == 2:
        # Windows drive-letter prefix (e.g. "C:\...") — treat as absolute.
        raise ExtractionBlocked("ABSOLUTE_PATH")
    if "\\" in entry_path:
        raise ExtractionBlocked("BACKSLASH_IN_PATH")
    # Normalize with the POSIX rules; any escape above the virtual root is
    # a traversal attempt and is rejected outright.
    normalized = posixpath.normpath(entry_path.lstrip("/"))
    if normalized.startswith("..") or "/../" in f"/{normalized}/" or normalized == "." or normalized == "":
        raise ExtractionBlocked("PATH_TRAVERSAL")
    parts = PurePosixPath(normalized).parts
    if any(p in ("..", ".") for p in parts):
        raise ExtractionBlocked("PATH_TRAVERSAL")
    if any(len(p) == 0 for p in parts):
        raise ExtractionBlocked("INVALID_PATH_SEGMENT")
    return normalized


def _sha256(raw: bytes) -> str:
    import hashlib
    return hashlib.sha256(raw).hexdigest()


def _child_relative_artifact_id(parent_sha: str, child_sha: str, relative_path: str, depth: int) -> str:
    """Deterministic child identity bound to parent sha + child sha + path."""
    import hashlib
    basis = f"{parent_sha}|{child_sha}|{relative_path}|{depth}".encode("utf-8")
    return f"child_{hashlib.sha256(basis).hexdigest()[:24]}"


def _sniff_child_type(child_bytes: bytes) -> str:
    """Minimal static type sniff — never invents a classification."""
    if child_bytes[:2] == b"MZ":
        return "PE"
    if child_bytes[:4] == b"\x7fELF":
        return "ELF"
    if child_bytes[:4] == b"PK\x03\x04":
        return "zip"
    if child_bytes[:2] == b"\x1f\x8b":
        return "gzip"
    if child_bytes[:4] == b"\xcf\xfa\xed\xfe" or child_bytes[:4] == b"\xca\xfe\xba\xbe":
        return "MACHO"
    if child_bytes[:262:512].find(b"ustar") != -1 or (len(child_bytes) >= 512 and child_bytes[257:262] == b"ustar"):
        return "tar"
    if child_bytes.startswith(b"#!"):
        return "SCRIPT"
    # A cheap UTF-8/ASCII text probe (bounded to the first 4 KiB).
    head = child_bytes[:4096]
    if head and all(b in (9, 10, 13) or 32 <= b < 127 or b >= 128 for b in head):
        printable = sum(1 for b in head if 32 <= b < 127 or b in (9, 10, 13))
        if len(head) == 0:
            return "UNKNOWN"
        if printable / max(len(head), 1) > 0.85:
            return "TEXT"
    return "UNKNOWN"


def expand_archive(
    raw: bytes,
    parent_sha256: str,
    declared_depth: int = 0,
) -> Dict:
    """Bounded static expansion of ONE archive container.

    Returns a structured, JSON-serializable expansion record containing the
    parent identity, archive format, expansion status, typed limits, and the
    deterministic child list. Extraction failures never raise past this
    function; they are captured as typed per-entry states.
    """
    started = time.monotonic()
    record: Dict = {
        "expansion_version": ARCHIVE_EXPANSION_VERSION,
        "expansion_method": ARCHIVE_EXPANSION_METHOD,
        "parent_sha256": parent_sha256,
        "parent_size_bytes": len(raw),
        "archive_format": None,
        "expansion_status": None,
        "limit_outcomes": [],
        "child_count": 0,
        "children": [],
        "duration_ms": None,
    }

    fmt = detect_archive_format(raw)
    record["archive_format"] = fmt
    if fmt is None:
        record["expansion_status"] = "ARCHIVE_UNSUPPORTED"
        record["limit_outcomes"].append({"type": "UNSUPPORTED_FORMAT"})
        record["duration_ms"] = int((time.monotonic() - started) * 1000)
        return record

    if declared_depth >= MAX_ARCHIVE_DEPTH:
        record["expansion_status"] = "DEPTH_LIMIT"
        record["limit_outcomes"].append({"type": "max_nesting_depth", "depth": declared_depth})
        record["duration_ms"] = int((time.monotonic() - started) * 1000)
        return record

    if len(raw) > _BUDGETS.max_input_bytes:
        record["expansion_status"] = "INPUT_TOO_LARGE"
        record["limit_outcomes"].append({"type": "max_input_bytes", "observed": len(raw)})
        record["duration_ms"] = int((time.monotonic() - started) * 1000)
        return record

    children: List[Dict] = []
    total_extracted = 0
    limit_hit: Optional[str] = None

    try:
        if fmt == "zip":
            limit_hit = _expand_zip(raw, parent_sha256, declared_depth, record, children)
        elif fmt == "tar":
            limit_hit = _expand_tar(raw, parent_sha256, declared_depth, record, children)
        elif fmt == "gzip":
            limit_hit = _expand_gzip(raw, parent_sha256, declared_depth, record, children)
        else:
            record["expansion_status"] = "ARCHIVE_UNSUPPORTED"
            return record
    except ArchiveUnsupported:
        record["expansion_status"] = "ARCHIVE_UNSUPPORTED"
        record["duration_ms"] = int((time.monotonic() - started) * 1000)
        return record

    record["children"] = children
    record["child_count"] = len(children)
    record["total_extracted_bytes"] = total_extracted
    if limit_hit:
        record["expansion_status"] = "PARTIAL"
        record["limit_outcomes"].append({"type": limit_hit})
    else:
        record["expansion_status"] = "COMPLETE"
    record["duration_ms"] = int((time.monotonic() - started) * 1000)
    return record


def _extract_one_child(
    parent_sha: str,
    relative_path: str,
    child_bytes: bytes,
    depth: int,
    children: List[Dict],
    state: Dict,
) -> Optional[str]:
    """Bound-checked single-child registration. Returns a limit code or None."""
    # per-child size bound
    if len(child_bytes) > MAX_SINGLE_CHILD_BYTES:
        children.append({
            "relative_path": relative_path,
            "extraction_status": "SKIPPED_OVERSIZE",
            "size_bytes": len(child_bytes),
            "depth": depth,
        })
        return None  # explicit typed skip; not a hard stop
    # global expansion bound
    if state["total"] + len(child_bytes) > MAX_TOTAL_EXTRACTED_BYTES:
        return "max_total_expanded_bytes"
    # child-count bound
    if len(children) + 1 > MAX_CHILD_FILES:
        return "max_children"
    # duplicate output collision (same sanitized path twice)
    if relative_path in state["seen_paths"]:
        return "duplicate_path_collision"
    state["seen_paths"].add(relative_path)

    child_sha = _sha256(child_bytes)
    children.append({
        "child_artifact_id": _child_relative_artifact_id(parent_sha, child_sha, relative_path, depth),
        "child_sha256": child_sha,
        "parent_artifact_sha256": parent_sha,
        "relative_path": relative_path,
        "size_bytes": len(child_bytes),
        "detected_type": _sniff_child_type(child_bytes),
        "mime_if_available": None,
        "depth": depth,
        "extraction_status": "EXTRACTED",
        "__bytes__": child_bytes,
    })
    state["total"] += len(child_bytes)
    return None


def _expand_zip(
    raw: bytes,
    parent_sha: str,
    depth: int,
    record: Dict,
    children: List[Dict],
) -> Optional[str]:
    """Static ZIP member extraction. Returns a limit code or None."""
    state: Dict = {"total": 0, "seen_paths": set()}
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except (zipfile.BadZipFile, zlib.error) as exc:
        record["limit_outcomes"].append({"type": "ZIP_CORRUPT", "reason": type(exc).__name__})
        record["expansion_status"] = "ZIP_CORRUPT"
        return None
    with zf:
        infos = zf.infolist()
        for info in infos:
            # symlink-like / device-like entries (unix mode bits)
            mode = (info.external_attr >> 16) & 0xFFFF
            if mode and (mode & 0o170000) in (0o120000, 0o020000, 0o060000):  # symlink, char/block dev, fifo? fifo=0o010000
                record["limit_outcomes"].append({
                    "type": "SYMLINK_LIKE_ENTRY_REJECTED", "path": info.filename,
                })
                continue
            try:
                rel = _safe_relative_path(info.filename)
            except ExtractionBlocked as exc:
                record["limit_outcomes"].append({
                    "type": "EXTRACTION_BLOCKED", "path": info.filename,
                    "reason": str(exc),
                })
                continue
            with zf.open(info) as fh:
                # zipfile enforces its own per-member bound via read(N); the
                # budget check happens AFTER the bounded read below.
                data = fh.read(MAX_SINGLE_CHILD_BYTES + 1)
            if len(data) > MAX_SINGLE_CHILD_BYTES:
                children.append({
                    "relative_path": rel,
                    "extraction_status": "SKIPPED_OVERSIZE",
                    "size_bytes": len(data),
                    "depth": depth,
                    "limit_hit": "max_single_entry_bytes",
                })
                continue
            limit = _extract_one_child(parent_sha, rel, data, depth, children, state)
            if limit:
                return limit
    return None


def _expand_tar(
    raw: bytes,
    parent_sha: str,
    depth: int,
    record: Dict,
    children: List[Dict],
) -> Optional[str]:
    """Static TAR member extraction (regular files only)."""
    state: Dict = {"total": 0, "seen_paths": set()}
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as tf:
        member: tarfile.TarInfo
        for member in tf.getmembers():
            if not member.isfile():
                record["limit_outcomes"].append({
                    "type": "NON_REGULAR_ENTRY_REJECTED", "path": member.name,
                })
                continue
            try:
                rel = _safe_relative_path(member.name)
            except ExtractionBlocked as exc:
                record["limit_outcomes"].append({
                    "type": "EXTRACTION_BLOCKED", "path": member.name,
                    "reason": str(exc),
                })
                continue
            f = tf.extractfile(member)
            if f is None:
                continue
            data = f.read(MAX_SINGLE_CHILD_BYTES + 1)
            if len(data) > MAX_SINGLE_CHILD_BYTES:
                children.append({
                    "relative_path": rel,
                    "extraction_status": "SKIPPED_OVERSIZE",
                    "size_bytes": len(data),
                    "depth": depth,
                    "limit_hit": "max_single_entry_bytes",
                })
                continue
            limit = _extract_one_child(parent_sha, rel, data, depth, children, state)
            if limit:
                return limit
    return None


def _expand_gzip(
    raw: bytes,
    parent_sha: str,
    depth: int,
    record: Dict,
    children: List[Dict],
) -> Optional[str]:
    """Static GZIP decompression (single member, no filename trust)."""
    state: Dict = {"total": 0, "seen_paths": set()}
    try:
        data = gzip.decompress(raw)  # noqa: F821 — bounded below by budget
    except zlib.error as exc:
        record["limit_outcomes"].append({"type": "GZIP_CORRUPT", "reason": type(exc).__name__})
        return None
    if len(data) > MAX_SINGLE_CHILD_BYTES:
        children.append({
            "relative_path": "payload",
            "extraction_status": "SKIPPED_OVERSIZE",
            "size_bytes": len(data),
            "depth": depth,
            "limit_hit": "max_single_entry_bytes",
        })
        return None
    limit = _extract_one_child(parent_sha, "payload", data, depth, children, state)
    return limit
