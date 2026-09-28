"""M16.4.27 — D-1 regression: CAFEBABE (Mach-O FAT vs JVM class file).

Locks the structural disambiguation of the SHARED `CA FE BA BE` magic and the
routing that follows it. Fixtures are minimal but structurally faithful to each
format's own header layout — never arbitrary four-byte blobs, never a filename
or extension.

Run (either form; both fail loudly with a non-zero exit):
    python tests/test_child_type_sniff.py
    python -m pytest tools/malware-analysis-container/tests/test_child_type_sniff.py

The container image ships no pytest (and does not copy `tests/`), so this file
is self-running: the `__main__` harness below FAILS if it discovers zero tests,
so a mis-invocation can never be mistaken for a passing suite.
"""

import inspect
import io
import shutil
import struct
import sys
import tempfile
import zipfile
from pathlib import Path

CONTAINER_ROOT = Path(__file__).resolve().parents[1]
if str(CONTAINER_ROOT) not in sys.path:
    sys.path.insert(0, str(CONTAINER_ROOT))

from src import archive_expansion as ae  # noqa: E402
from src import server  # noqa: E402

CAFEBABE = b"\xca\xfe\xba\xbe"
# Mach-O 64-bit thin magic — a DIFFERENT magic that must stay Mach-O.
MACHO_THIN_64_LE = b"\xcf\xfa\xed\xfe"
ELF_MAGIC = b"\x7fELF"


# ── structurally faithful fixtures ────────────────────────────────────────

def java_class(major=52, minor=0, constant_pool_count=1):
    """A minimal, structurally valid JVM class file.

    Layout: magic(4) minor_version(u16) major_version(u16)
    constant_pool_count(u16) then the trailing count fields (all zero):
    access_flags, this_class, super_class, interfaces_count, fields_count,
    methods_count, attributes_count — 7 * u16 = 14 bytes.
    """
    header = CAFEBABE + struct.pack(">HHH", minor, major, constant_pool_count)
    return header + b"\x00" * 14


def macho_fat(nfat_arch=2, entry_bytes=20):
    """A minimal Mach-O FAT/universal header: magic(4) nfat_arch(u32 BE) + table."""
    return CAFEBABE + struct.pack(">I", nfat_arch) + b"\x00" * (nfat_arch * entry_bytes)


# ── A. valid Java class -> JAVA_CLASS ─────────────────────────────────────

def test_A_valid_java_class_is_java_bytecode():
    for major in (45, 52, 61, ae.MAX_JAVA_MAJOR_VERSION):
        assert ae._sniff_child_type(java_class(major=major)) == "JAVA_CLASS", major
    # A preview class declares minor_version 0xFFFF.
    assert ae._sniff_child_type(java_class(minor=0xFFFF, major=61)) == "JAVA_CLASS"


def test_A_java_class_is_never_macho():
    """The exact D-1 failure mode: 13 classes must not become 13 MACHO."""
    children = [java_class(major=52) for _ in range(13)]
    types = [ae._sniff_child_type(c) for c in children]
    assert types == ["JAVA_CLASS"] * 13
    assert "MACHO" not in types


# ── B. valid Mach-O FAT/universal -> MACHO ────────────────────────────────

def test_B_valid_macho_fat_is_macho():
    for nfat in (1, 2, 3, 8, ae.MAX_MACHO_FAT_ARCH):
        assert ae._sniff_child_type(macho_fat(nfat)) == "MACHO", nfat
    # The separate 64-bit thin magic keeps its existing classification.
    assert ae._sniff_child_type(MACHO_THIN_64_LE + b"\x00" * 32) == "MACHO"


def test_B_macho_is_never_java():
    for nfat in (1, 2, 8, ae.MAX_MACHO_FAT_ARCH):
        assert ae._sniff_child_type(macho_fat(nfat)) != "JAVA_CLASS", nfat


# ── C. malformed / ambiguous CAFEBABE -> safe fallback ────────────────────

def test_C_malformed_cafebabe_falls_back_safely():
    cases = {
        "magic only": CAFEBABE,
        "magic + 4 zero bytes (nfat_arch = 0)": CAFEBABE + b"\x00" * 4,
        "nfat_arch claims 5 but the table is truncated": CAFEBABE + struct.pack(">I", 5) + b"\x00" * 8,
        "truncated before constant_pool_count": CAFEBABE + struct.pack(">HH", 0, 52),
        "java major below the 1.1 floor": java_class(major=44, minor=0),
        "java major above the accepted ceiling": java_class(major=ae.MAX_JAVA_MAJOR_VERSION + 1),
        "java constant_pool_count = 0": java_class(major=52, constant_pool_count=0),
        "java minor neither 0 nor 0xFFFF": java_class(major=52, minor=1),
        "fat table does not fit AND java shape invalid": CAFEBABE + struct.pack(">I", 0xFFFFFFFF),
    }
    for label, blob in cases.items():
        assert ae._sniff_child_type(blob) == "UNKNOWN", label


def test_C_disjointness_is_structural():
    """No input may be interpretable as BOTH Mach-O FAT and a Java class.

    Mach-O FAT requires u32be[4:8] <= MAX_MACHO_FAT_ARCH; a Java class with
    minor_version 0 has u32be[4:8] == major_version >= MIN_JAVA_MAJOR_VERSION,
    and minor_version 0xFFFF makes it far larger. The ranges cannot overlap.
    """
    assert ae.MAX_MACHO_FAT_ARCH < ae.MIN_JAVA_MAJOR_VERSION
    fat_window = set(range(1, ae.MAX_MACHO_FAT_ARCH + 1))
    java_window = set(range(ae.MIN_JAVA_MAJOR_VERSION, ae.MAX_JAVA_MAJOR_VERSION + 1))
    assert fat_window.isdisjoint(java_window)


# ── D. routing follows the corrected type ────────────────────────────────

def test_D_routing_follows_corrected_type():
    assert server._child_tools_for("JAVA_CLASS") == ("magika", "die", "yara-x")
    assert "lief" not in server._child_tools_for("JAVA_CLASS")
    assert "capa" not in server._child_tools_for("JAVA_CLASS")
    # Mach-O routing is unchanged.
    assert server._child_tools_for("MACHO") == ("lief", "die", "magika", "yara-x")


# ── E. existing archive limits still hold ────────────────────────────────

def test_E_archive_limits_unchanged():
    assert ae.detect_archive_format(b"PK\x03\x04" + b"\x00" * 32) == "zip"
    assert ae.detect_archive_format(b"\x1f\x8b" + b"\x00" * 32) == "gzip"
    assert ae.detect_archive_format(b"not-an-archive") is None
    rec = ae.expand_archive(b"not-an-archive", "0" * 64, declared_depth=0)
    assert rec["expansion_status"] == "ARCHIVE_UNSUPPORTED"
    assert rec["child_count"] == 0
    # Depth bound is still enforced before any expansion work.
    deep = ae.expand_archive(b"PK\x03\x04" + b"\x00" * 32, "0" * 64, declared_depth=ae.MAX_ARCHIVE_DEPTH)
    assert deep["expansion_status"] == "DEPTH_LIMIT"


# ── F. ownership invariants survive the new type ─────────────────────────

def test_F_child_tool_ownership_invariants():
    # Every routed tool must be a registered, supported adapter — otherwise the
    # child loop would raise instead of recording a typed tool result.
    for detected_type, tools in server._CHILD_TOOL_ROUTING.items():
        for tool in tools:
            assert tool in server.SUPPORTED_TOOLS, (detected_type, tool)
            assert tool in server.ADAPTERS, (detected_type, tool)
    # The new type is registered explicitly (never left to the default fallback).
    assert "JAVA_CLASS" in server._CHILD_TOOL_ROUTING


# ── integration: a real container carrying both child kinds ──────────────

def test_integration_zip_children_are_typed_independently():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("chrome/I.class", java_class(major=52))
        zf.writestr("chrome/IL.class", java_class(major=50))
        zf.writestr("machofat.bin", macho_fat(2))
        zf.writestr("plain.txt", "hello world\n")
    rec = ae.expand_archive(buf.getvalue(), "a" * 64, declared_depth=0)
    assert rec["expansion_status"] == "COMPLETE"
    by_path = {c["relative_path"]: c for c in rec["children"]}
    assert by_path["chrome/I.class"]["detected_type"] == "JAVA_CLASS"
    assert by_path["chrome/IL.class"]["detected_type"] == "JAVA_CLASS"
    assert by_path["machofat.bin"]["detected_type"] == "MACHO"
    assert by_path["plain.txt"]["detected_type"] == "TEXT"
    # A Java child never drags LIEF in; a Mach-O child still does.
    assert server._child_tools_for(by_path["chrome/I.class"]["detected_type"]) == ("magika", "die", "yara-x")
    assert "lief" in server._child_tools_for(by_path["machofat.bin"]["detected_type"])


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
        mp, workdir = _MonkeyPatch(), tempfile.mkdtemp(prefix="m16427-sniff-")
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
