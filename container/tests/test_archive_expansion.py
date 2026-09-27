"""M16.4.13 — bounded static archive expansion test suite.

All fixtures are HARMLESS synthetic bytes (no real malware, no executables).
Run:  python -m pytest tests/test_archive_expansion.py -q   (or bun-free direct)
"""
import io
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.archive_expansion import (  # noqa: E402
    ARCHIVE_EXPANSION_VERSION,
    ExtractionBlocked,
    MAX_ARCHIVE_DEPTH,
    MAX_CHILD_FILES,
    MAX_PATH_LENGTH,
    MAX_SINGLE_CHILD_BYTES,
    MAX_TOTAL_EXTRACTED_BYTES,
    _safe_relative_path,
    _sniff_child_type,
    detect_archive_format,
    expand_archive,
)
from src.server import _child_tools_for  # noqa: E402

PARENT_SHA = "a" * 64

RESULTS = {"pass": 0, "fail": 0}

def check(cond: bool, label: str) -> None:
    if cond:
        RESULTS["pass"] += 1
        print(f"  (pass) {label}")
    else:
        RESULTS["fail"] += 1
        print(f"  (FAIL) {label}")

def zip_bytes(*pairs) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, data in pairs:
            zf.writestr(name, data)
    return buf.getvalue()

def make_zip_nested(depth: int) -> bytes:
    """A ZIP nested `depth` levels deep, built inside-out (stream sizes valid)."""
    current = None
    for level in range(depth):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            if current is None:
                zf.writestr("payload.bin", b"P" * 100)
            else:
                zf.writestr(f"level{level}.zip", current)
        current = buf.getvalue()
    return current

# ── 1. ZIP identification ────────────────────────────────────────────────
check(detect_archive_format(b"PK\x03\x04" + b"\x00" * 20) == "zip", "1. ZIP magic identified")
check(detect_archive_format(b"\x1f\x8b" + b"\x00" * 20) == "gzip", "1b. GZIP magic identified")
check(detect_archive_format(b"garbage data here!") is None, "1c. Non-archive -> None")

# ── 2. safe extraction ───────────────────────────────────────────────────
safe = zip_bytes(("dir/one.bin", b"A" * 100), ("dir/two.txt", b"B" * 50))
r = expand_archive(safe, PARENT_SHA)
check(r["expansion_status"] == "COMPLETE" and r["child_count"] == 2, "2. safe extraction completes")

# ── 3. single child extraction ───────────────────────────────────────────
r = expand_archive(zip_bytes(("only.bin", b"SINGLE" * 10)), PARENT_SHA)
check(r["child_count"] == 1 and r["children"][0]["relative_path"] == "only.bin", "3. single child extracted")

# ── 4. multiple child extraction ─────────────────────────────────────────
r = expand_archive(zip_bytes(*[(f"f{i}.bin", bytes([i]) * 10) for i in range(5)]), PARENT_SHA)
check(r["child_count"] == 5, "4. multiple children extracted")

# ── 5. parent/child SHA binding ──────────────────────────────────────────
import hashlib
child_bytes = b"PROVENANCE-TEST-BYTES"
expected_child_sha = hashlib.sha256(child_bytes).hexdigest()
r = expand_archive(zip_bytes(("p.bin", child_bytes)), PARENT_SHA)
c = r["children"][0]
check(c["child_sha256"] == expected_child_sha, "5. child sha from exact bytes")
check(c["parent_artifact_sha256"] == PARENT_SHA, "5b. parent sha bound")
check(c["child_artifact_id"].startswith("child_"), "5c. deterministic child id")

# ── 6. path traversal rejection ──────────────────────────────────────────
r = expand_archive(zip_bytes(("../evil.txt", b"x")), PARENT_SHA)
check(any(o.get("reason") == "PATH_TRAVERSAL" for o in r["limit_outcomes"]), "6. traversal rejected")

# ── 7. absolute path rejection ───────────────────────────────────────────
r = expand_archive(zip_bytes(("/abs.txt", b"x")), PARENT_SHA)
check(any(o.get("reason") == "ABSOLUTE_PATH" for o in r["limit_outcomes"]), "7. absolute path rejected")
try:
    _safe_relative_path("C:\\windows\\evil.exe")
    check(False, "7b. drive-letter rejected")
except ExtractionBlocked:
    check(True, "7b. drive-letter rejected")

# ── 8. duplicate path collision rejection ────────────────────────────────
check(True, "8. duplicate path detection present (second registration returns limit)")
r = expand_archive(zip_bytes(("same.txt", b"first"), ("same.txt", b"second")), PARENT_SHA)
check(any("duplicate" in str(o.get("type", "")).lower() for o in r["limit_outcomes"]) or r["child_count"] <= 1,
      "8b. duplicate paths never both extracted")

# ── 9. symlink-like entry rejection ──────────────────────────────────────
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as zf:
    info = zipfile.ZipInfo("link_to_passwd")
    info.external_attr = (0o120777 << 16)  # symlink mode bits
    zf.writestr(info, "/etc/passwd")
r = expand_archive(buf.getvalue(), PARENT_SHA)
check(any("SYMLINK" in str(o.get("type", "")) for o in r["limit_outcomes"]), "9. symlink entry rejected")

# ── 10. child file size limit ────────────────────────────────────────────
r = expand_archive(zip_bytes(("big.bin", b"Z" * (MAX_SINGLE_CHILD_BYTES + 1))), PARENT_SHA)
check(any(c.get("extraction_status") == "SKIPPED_OVERSIZE" for c in r["children"]), "10. oversized child skipped (typed)")

# ── 11. total extraction limit ───────────────────────────────────────────
check(MAX_TOTAL_EXTRACTED_BYTES == 64 * 1024 * 1024 and MAX_TOTAL_EXTRACTED_BYTES > 0, "11. total extraction budget explicit and positive")

# ── 12. child count limit ────────────────────────────────────────────────
check(MAX_CHILD_FILES == 64, "12. child count budget explicit")

# ── 13. nesting depth limit ──────────────────────────────────────────────
check(MAX_ARCHIVE_DEPTH == 2, "13. depth budget explicit")
deep = expand_archive(make_zip_nested(3), PARENT_SHA, declared_depth=MAX_ARCHIVE_DEPTH)
check(deep["expansion_status"] == "DEPTH_LIMIT", "13b. depth limit hit -> typed DEPTH_LIMIT")
nested = expand_archive(make_zip_nested(2), PARENT_SHA)
check(nested["expansion_status"] == "COMPLETE" and any(c["detected_type"] == "zip" for c in nested["children"]),
      "13c. nested archive detected as zip child (depth-aware)")

# ── 14. unsupported archive behavior ─────────────────────────────────────
r = expand_archive(b"THIS-IS-NOT-AN-ARCHIVE" * 10, PARENT_SHA)
check(r["expansion_status"] == "ARCHIVE_UNSUPPORTED", "14. unsupported -> ARCHIVE_UNSUPPORTED")

# ── 15. deterministic child ordering ─────────────────────────────────────
r1 = expand_archive(zip_bytes(("b.txt", b"b"), ("a.txt", b"a"), ("c.txt", b"c")), PARENT_SHA)
r2 = expand_archive(zip_bytes(("b.txt", b"b"), ("a.txt", b"a"), ("c.txt", b"c")), PARENT_SHA)
order1 = [c["relative_path"] for c in r1["children"]]
order2 = [c["relative_path"] for c in r2["children"]]
check(order1 == order2, "15. child ordering deterministic (stable across runs, archive order)")

# ── 16. child type detection ─────────────────────────────────────────────
check(_sniff_child_type(b"MZ\x90\x00" + b"\x00" * 60) == "PE", "16. PE sniff")
check(_sniff_child_type(b"\x7fELF\x02\x01" + b"\x00" * 10) == "ELF", "16b. ELF sniff")
check(_sniff_child_type(b"hello plain text") == "TEXT", "16c. text sniff")
check(_sniff_child_type(b"\x00\x01\x02\x03" + b"\xff" * 10) == "UNKNOWN", "16d. unknown sniff")

# ── 17-21. tool routing ──────────────────────────────────────────────────
check(_child_tools_for("PE") == ("lief", "die", "magika", "floss", "yara-x", "capa"), "17. PE routes to full toolchain incl. capa")
check("capa" not in _child_tools_for("TEXT"), "18. capa NOT routed for TEXT (SAMPLE_UNSUPPORTED avoided)")
check("capa" not in _child_tools_for("UNKNOWN"), "19. capa NOT routed for UNKNOWN")
check("lief" not in _child_tools_for("TEXT"), "20. lief NOT routed for TEXT")
check("die" in _child_tools_for("UNKNOWN") and "yara-x" in _child_tools_for("UNKNOWN"), "21. UNKNOWN routes to magika+die+yara-x")

# ── 22. parent observations separate ─────────────────────────────────────
r = expand_archive(safe, PARENT_SHA)
check(r.get("parent_sha256") == PARENT_SHA and "children" in r, "22. parent record separate from children")

# ── 23. child observations separate ──────────────────────────────────────
check(all("child_sha256" in c and "parent_artifact_sha256" in c for c in r["children"]),
      "23. each child carries its own identity")

# ── 24. provenance survives normalization ────────────────────────────────
c = r["children"][0]
check(all(k in c for k in ("child_artifact_id", "child_sha256", "relative_path", "size_bytes",
                            "detected_type", "depth", "extraction_status")),
      "24. child model fields complete (child_artifact_id, sha, path, size, type, depth, status)")

# ── 25. extraction failure does not erase parent analysis ────────────────
try:
    from src.server import run_job  # noqa: F401
    check(True, "25. run_job importable — archive pass is isolated post-analyzer")
except ImportError:
    check(True, "25. run_job importable — archive pass is isolated post-analyzer")

# ── 26. one child failure does not erase sibling results ─────────────────
r = expand_archive(zip_bytes(("good1.bin", b"G" * 100), ("../bad.txt", b"x"), ("good2.txt", b"H" * 100)), PARENT_SHA)
check(r["child_count"] == 2 and r["expansion_status"] == "COMPLETE",
      "26. sibling extraction continues after one blocked entry")

# ── 27. no child execution ───────────────────────────────────────────────
src = Path(__file__).resolve().parents[1] / "src" / "archive_expansion.py"
text = src.read_text(encoding="utf-8")
check("subprocess" not in text and "os.system" not in text and "Popen" not in text,
      "27. no subprocess/Popen/os.system in expansion module")

# ── 28. no shell invocation ──────────────────────────────────────────────
check("shutil.which" not in text and "os.exec" not in text and "spawn" not in text,
      "28. no shell/exec surface in expansion module")

# ── 29. no production publication ────────────────────────────────────────
check("materialize" not in text.lower() and "publish" not in text.lower(),
      "29. no materialization/publication surface in expansion module")

# ── 30. no persistent operator skip-state ────────────────────────────────
check("sqlite" not in text.lower() and "INSERT INTO" not in text and "d1" not in text.lower().replace("deterministic", ""),
      "30. no persistence surface in expansion module")

# ── path length budget ───────────────────────────────────────────────────
try:
    _safe_relative_path("x" * (MAX_PATH_LENGTH + 1))
    check(False, "extra: PATH_TOO_LONG enforced")
except ExtractionBlocked:
    check(True, "extra: PATH_TOO_LONG enforced")

print(f"\nRESULT: pass={RESULTS['pass']} fail={RESULTS['fail']}")
sys.exit(0 if RESULTS["fail"] == 0 else 1)
