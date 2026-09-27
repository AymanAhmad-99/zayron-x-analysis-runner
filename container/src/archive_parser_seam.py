"""M16.2 GATE 3 — PARSER-NEUTRAL ARCHIVE ABSTRACTION SEAM.

ONE normalized boundary between raw archive bytes and the rest of the engine:

    RAW ARCHIVE BYTES
            ↓
    PARSER ADAPTER            (an `ArchiveParserAdapter`: probe / enumerate only)
            ↓
    NORMALIZED
        ArchiveParserMetadata
        ArchiveProbeResult
        ArchiveEnumerationResult
        ArchiveEntry
            ↓
    materializer / future archive logic

The rest of the engine MUST NOT know which parser implementation produced a
normalized result. Parser-private structures terminate inside the adapter: every
value that crosses this module's seam is checked by `ensure_normalized`, which
raises `ParserLeakError` on anything that is not one of the canonical types.

WHAT THIS GATE IS **NOT**
    * no archive parser is installed and no parser dependency exists;
    * no archive bytes are parsed, probed, enumerated or extracted anywhere in
      this module or its tests (test doubles only);
    * no member bytes are written anywhere, and there is no extraction call
      (`extract_member` / `extract_all` / `unpack` / `write_members` /
      `materialize_children`) reachable through this interface — Gate 3 offers
      probe + enumeration only;
    * no recursion and no child-artifact creation.

BUDGETS
    The adapter receives the Gate-2 frozen `ARCHIVE_ANALYSIS_BUDGETS` singleton
    as a DEPENDENCY. `assert_authoritative_budgets` requires object *identity*
    with that singleton, so no caller-selected budget can ever be injected and
    there is no second configuration source. No budget literal is defined here.

FORMAT AUTHORITY (Gate 1 stays authoritative)
    The adapter may return `detected_container_type` as EVIDENCE only.
    `resolve_structural_format` always returns the canonical structural format
    supplied by `staticAnalysis.detectFormat`; parser evidence can never mutate
    routing.

STATUS DIMENSIONS (never conflated) — Gate 3.1 correction
    parser status        OBSERVED | NO_RESULT | UNSUPPORTED | ERROR | UNAVAILABLE   (frozen five)
    resource outcome     null | TIMEOUT | RESOURCE_EXHAUSTED   (Gate-2 tokens, SEPARATE dimension)
    enumeration state    COMPLETE | PARTIAL | FAILED | UNSUPPORTED
    entry rejection state ADMITTED | SKIPPED_OVERSIZE | SKIPPED_COMPRESSION_RATIO
                         (the last two reused from Gate 2)
    limit outcome        the Gate-2 `ArchiveLimitOutcome`

`TIMEOUT` and `RESOURCE_EXHAUSTED` are NOT parser statuses. A resource limit is
represented as parser status ERROR plus a distinct `resource_outcome`, so the
two dimensions stay separate (e.g. status=ERROR, resource_outcome=TIMEOUT,
enumeration_state=FAILED) and no resource state is ever smuggled into the
parser-status vocabulary.
"""

from __future__ import annotations

import abc
import hashlib
import re
from dataclasses import dataclass, replace
from typing import Iterable, Optional, Tuple

try:  # imported as a package (container root on sys.path)
    from src.archive_budgets import (  # noqa: F401  (single budget source, no literals)
        ARCHIVE_ANALYSIS_BUDGETS,
        ARCHIVE_BUDGET_PRECEDENCE,
        ARCHIVE_STATE_RESOURCE_EXHAUSTED,
        ARCHIVE_STATE_TIMEOUT,
        ENTRY_STATE_SKIPPED_COMPRESSION_RATIO,
        ENTRY_STATE_SKIPPED_OVERSIZE,
        ArchiveAnalysisBudgets,
        ArchiveBudgetConfigurationError,
        ArchiveLimitOutcome,
    )
except ImportError:  # imported with src/ itself on sys.path
    from archive_budgets import (  # type: ignore[no-redef]  # noqa: F401
        ARCHIVE_ANALYSIS_BUDGETS,
        ARCHIVE_BUDGET_PRECEDENCE,
        ARCHIVE_STATE_RESOURCE_EXHAUSTED,
        ARCHIVE_STATE_TIMEOUT,
        ENTRY_STATE_SKIPPED_COMPRESSION_RATIO,
        ENTRY_STATE_SKIPPED_OVERSIZE,
        ArchiveAnalysisBudgets,
        ArchiveBudgetConfigurationError,
        ArchiveLimitOutcome,
    )

# ── frozen vocabularies ─────────────────────────────────────────────────────


class ArchiveSeamError(ValueError):
    """Malformed normalized data at the seam → FAIL CLOSED."""


class ParserLeakError(ArchiveSeamError):
    """A parser-private object attempted to cross the adapter boundary."""


class InputIntegrityError(ArchiveSeamError):
    """SHA256(raw bytes) did not match the declared input identity."""


class ExtractionNotPermittedError(ArchiveSeamError):
    """An extraction surface was requested; Gate 3 exposes probe/enumerate only."""


#: Parser status vocabulary — EXACTLY the frozen five (Gate 3.1). Resource
#: states are deliberately absent: they are a separate dimension below.
PARSER_STATUS_OBSERVED = "OBSERVED"
PARSER_STATUS_NO_RESULT = "NO_RESULT"
PARSER_STATUS_UNSUPPORTED = "UNSUPPORTED"
PARSER_STATUS_ERROR = "ERROR"
PARSER_STATUS_UNAVAILABLE = "UNAVAILABLE"

PARSER_STATUSES: Tuple[str, ...] = (
    PARSER_STATUS_OBSERVED,
    PARSER_STATUS_NO_RESULT,
    PARSER_STATUS_UNSUPPORTED,
    PARSER_STATUS_ERROR,
    PARSER_STATUS_UNAVAILABLE,
)

#: Resource-outcome dimension. Reuses the Gate-2 typed tokens verbatim; a
#: resource outcome is representable ONLY alongside parser status ERROR, and
#: may never be used as a parser status. `None` means "no resource limit hit".
RESOURCE_OUTCOME_TIMEOUT = "TIMEOUT"
RESOURCE_OUTCOME_EXHAUSTED = "RESOURCE_EXHAUSTED"

RESOURCE_OUTCOMES: Tuple[str, ...] = (
    RESOURCE_OUTCOME_TIMEOUT,
    RESOURCE_OUTCOME_EXHAUSTED,
)

#: A resource outcome is only meaningful when the parser failed.
RESOURCE_OUTCOME_STATUSES: Tuple[str, ...] = (PARSER_STATUS_ERROR,)

#: Enumeration state vocabulary (Gate 3 §14 frozen set).
ENUMERATION_COMPLETE = "COMPLETE"
ENUMERATION_PARTIAL = "PARTIAL"
ENUMERATION_FAILED = "FAILED"
ENUMERATION_UNSUPPORTED = "UNSUPPORTED"

ENUMERATION_STATES: Tuple[str, ...] = (
    ENUMERATION_COMPLETE,
    ENUMERATION_PARTIAL,
    ENUMERATION_FAILED,
    ENUMERATION_UNSUPPORTED,
)

ENTRY_REJECTION_ADMITTED = "ADMITTED"
ENTRY_REJECTION_STATES: Tuple[str, ...] = (
    ENTRY_REJECTION_ADMITTED,
    ENTRY_STATE_SKIPPED_OVERSIZE,
    ENTRY_STATE_SKIPPED_COMPRESSION_RATIO,
)

ENTRY_TYPES: Tuple[str, ...] = (
    "FILE",
    "DIRECTORY",
    "SYMLINK",
    "HARDLINK",
    "DEVICE",
    "SPECIAL",
    "UNKNOWN",
)

ENCRYPTION_STATES: Tuple[str, ...] = ("NONE", "ENCRYPTED", "UNKNOWN")

DIRECTORY_STATES: Tuple[str, ...] = ("FILE", "DIRECTORY", "UNKNOWN")

#: The two seam operations. Extraction is deliberately absent.
SEAM_OPERATIONS: Tuple[str, ...] = ("probe", "enumerate")

#: Names that must never be reachable through the Gate-3 adapter interface.
FORBIDDEN_ADAPTER_OPERATIONS: Tuple[str, ...] = (
    "extract_member",
    "extract_all",
    "extract",
    "unpack",
    "write_members",
    "materialize_children",
    "extract_to_disk",
)

#: Explicit abstraction policy for `parser_build_digest` (Gate 3.1 §3).
#: Presence of the FIELD and availability of a VALUE are different concepts:
#:   * OBSERVED            → a real, non-empty build/source digest string;
#:   * any other status    → `null` ONLY (never "", never a sentinel).
#: No digest is ever fabricated anywhere in this module.
DIGEST_SENTINELS: Tuple[str, ...] = (
    "unknown",
    "not_installed",
    "not installed",
    "pending",
    "n/a",
    "na",
    "none",
    "null",
    "tbd",
)
DIGEST_NULL_STATUSES: Tuple[str, ...] = (
    PARSER_STATUS_NO_RESULT,
    PARSER_STATUS_UNSUPPORTED,
    PARSER_STATUS_ERROR,
    PARSER_STATUS_UNAVAILABLE,
)

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

# ── normalized record types ─────────────────────────────────────────────────


def _require_non_empty_str(name: str, value: object) -> str:
    if not isinstance(value, str) or not value:
        raise ArchiveSeamError(f"{name} must be a non-empty string")
    return value


def _require_optional_int(name: str, value: object) -> Optional[int]:
    if value is None:
        return None  # an unsupported/unknown value stays null, never fabricated
    if isinstance(value, bool) or not isinstance(value, int):
        raise ArchiveSeamError(f"{name} must be an integer or None")
    if value < 0:
        raise ArchiveSeamError(f"{name} must not be negative")
    return value


def _require_optional_str(name: str, value: object) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ArchiveSeamError(f"{name} must be a string or None")
    return value


@dataclass(frozen=True)
class ArchiveParserMetadata:
    """Provenance and status of ONE parser invocation.

    `input_sha256` is mandatory and must equal the canonical parent artifact
    SHA256 (verified against the actual bytes by `verify_input_identity`, never
    trusted from the caller).

    `status` is one of the frozen five. `resource_outcome` is a SEPARATE
    dimension carrying the Gate-2 tokens (TIMEOUT / RESOURCE_EXHAUSTED) and is
    only representable when `status == ERROR`.

    `parser_build_digest`: for OBSERVED it is a real build/source digest; for
    every other status it MUST be `null` — no sentinel string, no empty string,
    no fabricated value.
    """

    parser_id: str
    parser_version: str
    parser_build_digest: Optional[str]
    input_sha256: str
    status: str
    resource_outcome: Optional[str] = None

    def __post_init__(self) -> None:
        _require_non_empty_str("parser_id", self.parser_id)
        _require_non_empty_str("parser_version", self.parser_version)
        if self.status not in PARSER_STATUSES:
            raise ArchiveSeamError(f"invalid parser status {self.status!r}")
        if not isinstance(self.input_sha256, str) or not _SHA256_RE.match(self.input_sha256):
            raise ArchiveSeamError("input_sha256 must be a lowercase 64-hex SHA256")
        digest = self.parser_build_digest
        if digest is not None and not isinstance(digest, str):
            raise ArchiveSeamError("parser_build_digest must be a string or None (null)")
        if self.status == PARSER_STATUS_OBSERVED:
            if digest is None:
                raise ArchiveSeamError(
                    "OBSERVED requires a real parser_build_digest; null is not valid "
                    "provenance for a successful observation"
                )
            if not digest.strip():
                raise ArchiveSeamError(
                    "OBSERVED requires a real parser_build_digest; an empty string is "
                    "never a digest"
                )
            if digest.strip().lower() in DIGEST_SENTINELS:
                raise ArchiveSeamError(
                    f"{digest!r} is a sentinel placeholder, not a real parser_build_digest"
                )
        elif digest is not None:
            if digest == "":
                raise ArchiveSeamError(
                    "parser_build_digest must be null (not an empty string) when no real "
                    "digest exists; value unavailability is represented as null"
                )
            raise ArchiveSeamError(
                f"parser_build_digest must be null when status is {self.status}; a real "
                "digest is only valid provenance for OBSERVED"
            )
        if self.resource_outcome is not None:
            if self.resource_outcome not in RESOURCE_OUTCOMES:
                raise ArchiveSeamError(
                    f"invalid resource_outcome {self.resource_outcome!r}; expected one of "
                    f"{RESOURCE_OUTCOMES} or null"
                )
            if self.status not in RESOURCE_OUTCOME_STATUSES:
                raise ArchiveSeamError(
                    "resource_outcome is a separate dimension from parser status and is "
                    f"only representable when status is {RESOURCE_OUTCOME_STATUSES[0]}; "
                    f"got status {self.status}"
                )


@dataclass(frozen=True)
class ArchiveEntry:
    """One normalized archive member. Unknown optionals stay None."""

    normalized_path: str
    raw_path: str
    entry_type: str
    encryption_state: str
    directory_state: str
    entry_ordinal: int
    declared_size: Optional[int] = None
    compressed_size: Optional[int] = None
    compression_method: Optional[str] = None
    rejection_state: str = ENTRY_REJECTION_ADMITTED
    crc: Optional[int] = None
    mode: Optional[int] = None
    attributes: Optional[str] = None
    timestamp: Optional[int] = None
    extra: Optional[str] = None

    def __post_init__(self) -> None:
        _require_non_empty_str("normalized_path", self.normalized_path)
        _require_non_empty_str("raw_path", self.raw_path)
        if self.entry_type not in ENTRY_TYPES:
            raise ArchiveSeamError(f"invalid entry_type {self.entry_type!r}")
        if self.encryption_state not in ENCRYPTION_STATES:
            raise ArchiveSeamError(f"invalid encryption_state {self.encryption_state!r}")
        if self.directory_state not in DIRECTORY_STATES:
            raise ArchiveSeamError(f"invalid directory_state {self.directory_state!r}")
        if self.rejection_state not in ENTRY_REJECTION_STATES:
            raise ArchiveSeamError(f"invalid rejection_state {self.rejection_state!r}")
        if isinstance(self.entry_ordinal, bool) or not isinstance(self.entry_ordinal, int):
            raise ArchiveSeamError("entry_ordinal must be an integer")
        if self.entry_ordinal < 0:
            raise ArchiveSeamError("entry_ordinal must not be negative")
        for name in ("declared_size", "compressed_size", "crc", "mode", "timestamp"):
            _require_optional_int(name, getattr(self, name))
        for name in ("compression_method", "attributes", "extra"):
            _require_optional_str(name, getattr(self, name))


@dataclass(frozen=True)
class ArchiveProbeResult:
    """Cheap capability/probe outcome. No enumeration is implied."""

    metadata: ArchiveParserMetadata
    detected_container_type: Optional[str] = None
    entry_count_declared: Optional[int] = None
    encrypted: Optional[bool] = None
    multi_volume: Optional[bool] = None
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        _ensure_metadata(self.metadata)
        _require_optional_str("detected_container_type", self.detected_container_type)
        _require_optional_int("entry_count_declared", self.entry_count_declared)
        for name in ("encrypted", "multi_volume"):
            value = getattr(self, name)
            if value is not None and not isinstance(value, bool):
                raise ArchiveSeamError(f"{name} must be a bool or None")
        _require_optional_str("notes", self.notes)


@dataclass(frozen=True)
class ArchiveEnumerationResult:
    """Deterministic enumeration outcome. State is carried explicitly.

    COMPLETE/PARTIAL/FAILED/UNSUPPORTED live in `enumeration_state`; limit
    information lives in `limit_hit` (a Gate-2 budget dimension) — the semantic
    state never depends on exception text.
    """

    metadata: ArchiveParserMetadata
    entries: Tuple[ArchiveEntry, ...]
    entry_count_returned: int
    truncated: bool
    enumeration_state: str
    limit_hit: Optional[str] = None
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        _ensure_metadata(self.metadata)
        if self.enumeration_state not in ENUMERATION_STATES:
            raise ArchiveSeamError(f"invalid enumeration_state {self.enumeration_state!r}")
        if not isinstance(self.truncated, bool):
            raise ArchiveSeamError("truncated must be a bool")
        if isinstance(self.entry_count_returned, bool) or not isinstance(
            self.entry_count_returned, int
        ):
            raise ArchiveSeamError("entry_count_returned must be an integer")
        if self.entry_count_returned < 0:
            raise ArchiveSeamError("entry_count_returned must not be negative")
        entries = tuple(self.entries)
        if any(not isinstance(e, ArchiveEntry) for e in entries):
            raise ParserLeakError("enumeration entries must all be ArchiveEntry instances")
        object.__setattr__(self, "entries", entries)
        if self.entry_count_returned != len(entries):
            raise ArchiveSeamError(
                "entry_count_returned must equal the number of normalized entries"
            )
        if self.limit_hit is not None and self.limit_hit not in ARCHIVE_BUDGET_PRECEDENCE:
            raise ArchiveSeamError(
                f"limit_hit {self.limit_hit!r} is not a frozen archive budget dimension"
            )
        if self.limit_hit is not None and self.enumeration_state == ENUMERATION_COMPLETE:
            # no budget exhaustion can ever produce COMPLETE (Gate-2 G2-7)
            raise ArchiveSeamError(
                "an enumeration that hit a budget limit cannot be COMPLETE"
            )
        _require_optional_str("notes", self.notes)


def _ensure_metadata(metadata: object) -> None:
    if not isinstance(metadata, ArchiveParserMetadata):
        raise ParserLeakError(
            f"parser metadata must be ArchiveParserMetadata, got {type(metadata).__name__}"
        )


NORMALIZED_ARCHIVE_TYPES: Tuple[type, ...] = (
    ArchiveParserMetadata,
    ArchiveProbeResult,
    ArchiveEnumerationResult,
    ArchiveEntry,
)


def is_normalized_archive_structure(value: object) -> bool:
    """True only for a canonical Gate-3 structure (parser-private is False)."""
    return isinstance(value, NORMALIZED_ARCHIVE_TYPES)


def ensure_normalized(value: object) -> object:
    """Raise `ParserLeakError` unless `value` is a canonical normalized type.

    This is the normalization law check: only normalized structures may leave an
    adapter.
    """
    if not is_normalized_archive_structure(value):
        raise ParserLeakError(
            f"parser-private or non-normalized value {type(value).__module__}."
            f"{type(value).__name__} attempted to cross the adapter boundary"
        )
    return value


# ── input integrity (one authoritative verification point) ──────────────────


def sha256_hex(raw_bytes: bytes) -> str:
    if not isinstance(raw_bytes, (bytes, bytearray)):
        raise ArchiveSeamError("raw_bytes must be bytes")
    return hashlib.sha256(bytes(raw_bytes)).hexdigest()


def verify_input_identity(raw_bytes: bytes, declared_sha256: str) -> str:
    """Verify SHA256(raw bytes) == declared identity; raise on mismatch.

    The caller's SHA is never trusted on its own. Returns the verified identity
    so downstream code can carry a single authoritative value.
    """
    if not isinstance(declared_sha256, str) or not _SHA256_RE.match(declared_sha256):
        raise InputIntegrityError("declared input_sha256 must be a lowercase 64-hex SHA256")
    actual = sha256_hex(raw_bytes)
    if actual != declared_sha256:
        raise InputIntegrityError(
            "SHA256(raw bytes) does not match the declared input identity"
        )
    return actual


# ── error normalization ─────────────────────────────────────────────────────

#: Parser-private outcome → canonical PARSER STATUS. Resource tokens map to
#: ERROR here *by design*: the resource dimension is carried separately by
#: RESOURCE_OUTCOME_NORMALIZATION below. The right-hand side is the whole public
#: contract; exception text never is. An unknown outcome is ERROR, never
#: OBSERVED.
PARSER_OUTCOME_NORMALIZATION = {
    "OBSERVED": PARSER_STATUS_OBSERVED,
    "SUCCESS": PARSER_STATUS_OBSERVED,
    "NO_RESULT": PARSER_STATUS_NO_RESULT,
    "EMPTY": PARSER_STATUS_NO_RESULT,
    "UNSUPPORTED": PARSER_STATUS_UNSUPPORTED,
    "FORMAT_UNSUPPORTED": PARSER_STATUS_UNSUPPORTED,
    "CANNOT_HANDLE_FORMAT": PARSER_STATUS_UNSUPPORTED,
    "ERROR": PARSER_STATUS_ERROR,
    "FAILURE": PARSER_STATUS_ERROR,
    "CRASH": PARSER_STATUS_ERROR,
    "UNAVAILABLE": PARSER_STATUS_UNAVAILABLE,
    "NOT_INSTALLED": PARSER_STATUS_UNAVAILABLE,
    "MISSING": PARSER_STATUS_UNAVAILABLE,
    # resource limits are failures, never parser statuses
    "TIMEOUT": PARSER_STATUS_ERROR,
    "CPU_TIMEOUT": PARSER_STATUS_ERROR,
    "WALL_CLOCK_TIMEOUT": PARSER_STATUS_ERROR,
    "RESOURCE_EXHAUSTED": PARSER_STATUS_ERROR,
    "OUT_OF_MEMORY": PARSER_STATUS_ERROR,
    "MEMORY_EXHAUSTED": PARSER_STATUS_ERROR,
}

#: Parser-private outcome → SEPARATE resource-outcome dimension. Only the two
#: Gate-2 resource tokens ever appear here; everything else is null.
RESOURCE_OUTCOME_NORMALIZATION = {
    "TIMEOUT": RESOURCE_OUTCOME_TIMEOUT,
    "CPU_TIMEOUT": RESOURCE_OUTCOME_TIMEOUT,
    "WALL_CLOCK_TIMEOUT": RESOURCE_OUTCOME_TIMEOUT,
    "RESOURCE_EXHAUSTED": RESOURCE_OUTCOME_EXHAUSTED,
    "OUT_OF_MEMORY": RESOURCE_OUTCOME_EXHAUSTED,
    "MEMORY_EXHAUSTED": RESOURCE_OUTCOME_EXHAUSTED,
}


#: The Gate-2 typed limit state → the separate resource-outcome token. Any other
#: Gate-2 state (including the typed runtime FAIL) is not a resource outcome.
_LIMIT_STATE_TO_RESOURCE_OUTCOME = {
    ARCHIVE_STATE_TIMEOUT: RESOURCE_OUTCOME_TIMEOUT,
    ARCHIVE_STATE_RESOURCE_EXHAUSTED: RESOURCE_OUTCOME_EXHAUSTED,
}


def normalize_parser_outcome(raw_outcome: object) -> str:
    """Map a parser-private outcome token onto a canonical parser status.

    Unknown, absent, non-string and parser-specific tokens normalize to ERROR —
    never OBSERVED, and never leaked as business logic. A resource token yields
    ERROR, with the resource dimension handled by `normalize_resource_outcome`.
    """
    if isinstance(raw_outcome, str):
        mapped = PARSER_OUTCOME_NORMALIZATION.get(raw_outcome)
        if mapped is not None:
            return mapped
    return PARSER_STATUS_ERROR


def normalize_resource_outcome(raw_outcome: object) -> Optional[str]:
    """Map a parser-private outcome onto the SEPARATE resource-outcome dimension.

    Returns null unless the outcome is one of the Gate-2 resource tokens, so a
    resource limit can never be smuggled in as a parser status and an ordinary
    failure can never be upgraded into one.
    """
    if isinstance(raw_outcome, str):
        return RESOURCE_OUTCOME_NORMALIZATION.get(raw_outcome)
    return None


def resource_outcome_from_limit_outcome(outcome: object) -> Optional[str]:
    """Gate-2 limit outcome → resource-outcome token (null for anything else)."""
    if not isinstance(outcome, ArchiveLimitOutcome):
        return None
    return _LIMIT_STATE_TO_RESOURCE_OUTCOME.get(outcome.state)


def metadata_with_resource_limit(
    metadata: ArchiveParserMetadata, outcome: object
) -> ArchiveParserMetadata:
    """Attach a Gate-2 resource limit to metadata as a SEPARATE dimension.

    The parser status becomes ERROR (a resource limit is a failure, never a
    status of its own) and, per the digest contract, `parser_build_digest`
    becomes null because a real digest is only valid provenance for OBSERVED.
    """
    if not isinstance(metadata, ArchiveParserMetadata):
        raise ParserLeakError("metadata must be an ArchiveParserMetadata instance")
    resource_outcome = resource_outcome_from_limit_outcome(outcome)
    if resource_outcome is None:
        raise ArchiveSeamError("the supplied Gate-2 outcome is not a resource limit")
    return replace(
        metadata,
        status=PARSER_STATUS_ERROR,
        parser_build_digest=None,
        resource_outcome=resource_outcome,
    )


def canonical_status_from_exception(exc: BaseException) -> str:
    """A raised parser exception is ERROR — never OBSERVED, never its message."""
    return PARSER_STATUS_ERROR


# ── budget boundary ────────────────────────────────────────────────────────


def assert_authoritative_budgets(budgets: object) -> ArchiveAnalysisBudgets:
    """Require the Gate-2 frozen singleton by identity — no caller budgets.

    A structurally identical but caller-constructed budget object is refused:
    budget identity is singular, so no second configuration source can exist.
    """
    if budgets is not ARCHIVE_ANALYSIS_BUDGETS:
        raise ArchiveBudgetConfigurationError(
            "archive budgets must be the frozen ARCHIVE_ANALYSIS_BUDGETS singleton; "
            "caller-selected budgets are not accepted"
        )
    return ARCHIVE_ANALYSIS_BUDGETS


# ── format authority ───────────────────────────────────────────────────────


def resolve_structural_format(canonical_structural_format: str, evidence: object) -> str:
    """Return the canonical structural format, unchanged by parser evidence.

    `evidence` (e.g. an `ArchiveProbeResult.detected_container_type`) is
    recorded as evidence only; it can never mutate routing.
    """
    _require_non_empty_str("canonical_structural_format", canonical_structural_format)
    return canonical_structural_format


def container_type_evidence(result: object) -> Optional[str]:
    """Extract `detected_container_type` as EVIDENCE (never as routing input)."""
    if isinstance(result, ArchiveProbeResult):
        return result.detected_container_type
    return None


# ── deterministic normalization of entry order ─────────────────────────────


def canonicalize_entries(entries: Iterable[ArchiveEntry]) -> Tuple[ArchiveEntry, ...]:
    """Establish a deterministic entry representation.

    Parser-native iteration order must not become business semantics: entries are
    ordered by (normalized_path, raw_path, entry_type) and `entry_ordinal` is
    reassigned from that stable order, so an unstable parser order produces the
    same normalized result.
    """
    materialized = [ensure_normalized(e) for e in entries]
    ordered = sorted(materialized, key=lambda e: (e.normalized_path, e.raw_path, e.entry_type))
    return tuple(replace(e, entry_ordinal=index) for index, e in enumerate(ordered))


# ── the adapter interface (probe + enumerate ONLY) ──────────────────────────


class ArchiveParserAdapter(abc.ABC):
    """Parser-neutral archive adapter.

    A concrete adapter is the ONLY place parser-private structures may exist. It
    must translate them into the normalized types above; its own return values
    are checked by `run_probe` / `run_enumerate`.

    There is intentionally NO extract/unpack operation: the child-byte trust
    boundary belongs to a later, verified-extraction gate.
    """

    @property
    @abc.abstractmethod
    def parser_id(self) -> str:  # pragma: no cover - interface
        ...

    @property
    @abc.abstractmethod
    def parser_version(self) -> str:  # pragma: no cover - interface
        ...

    @property
    @abc.abstractmethod
    def parser_build_digest(self) -> str:  # pragma: no cover - interface
        ...

    @abc.abstractmethod
    def probe(
        self, raw_bytes: bytes, input_sha256: str, budgets: ArchiveAnalysisBudgets
    ) -> ArchiveProbeResult:  # pragma: no cover - interface
        ...

    @abc.abstractmethod
    def enumerate(
        self, raw_bytes: bytes, input_sha256: str, budgets: ArchiveAnalysisBudgets
    ) -> ArchiveEnumerationResult:  # pragma: no cover - interface
        ...


def assert_no_extraction_surface(adapter: object) -> None:
    """Refuse any adapter that exposes an extraction operation (G3-9)."""
    for name in FORBIDDEN_ADAPTER_OPERATIONS:
        if hasattr(adapter, name):
            raise ExtractionNotPermittedError(
                f"adapter exposes forbidden extraction operation {name!r}"
            )


def _failure_metadata(
    adapter: object,
    input_sha256: str,
    status: str,
    resource_outcome: Optional[str] = None,
) -> ArchiveParserMetadata:
    """Typed failure provenance for a seam-level rejection.

    A non-OBSERVED status carries `parser_build_digest = null` by contract: an
    unavailable value is represented as null, never as a sentinel string and
    never as a fabricated digest. No adapter digest is read or invented here.
    """
    parser_id = getattr(adapter, "parser_id", None)
    parser_version = getattr(adapter, "parser_version", None)
    if not isinstance(parser_id, str) or not parser_id:
        parser_id = "SEAM"
    if not isinstance(parser_version, str) or not parser_version:
        parser_version = "0"
    return ArchiveParserMetadata(
        parser_id=parser_id,
        parser_version=parser_version,
        parser_build_digest=None,
        input_sha256=input_sha256,
        status=status,
        resource_outcome=resource_outcome,
    )


def _resolved_input_sha(raw_bytes: bytes, input_sha256: str) -> str:
    """One authoritative verification: never trust the caller's SHA alone."""
    if not isinstance(input_sha256, str) or not _SHA256_RE.match(input_sha256):
        raise InputIntegrityError("declared input_sha256 must be a lowercase 64-hex SHA256")
    return verify_input_identity(raw_bytes, input_sha256)


def _failure_sha(raw_bytes: bytes, input_sha256: object) -> str:
    """Metadata identity for a rejection: the declared SHA when usable, else the
    REAL digest of the bytes (a measured value, not an invented one)."""
    if isinstance(input_sha256, str) and _SHA256_RE.match(input_sha256):
        return input_sha256
    return sha256_hex(raw_bytes)


def run_probe(
    adapter: object,
    raw_bytes: bytes,
    input_sha256: str,
    budgets: object,
) -> ArchiveProbeResult:
    """Invoke `adapter.probe` behind the seam and enforce the normalization law.

    Order: budget identity → extraction-surface guard → input integrity →
    adapter call → normalized-type check. Integrity failure and parser leakage
    are typed results, and can never be OBSERVED.
    """
    authoritative = assert_authoritative_budgets(budgets)
    assert_no_extraction_surface(adapter)
    try:
        verified_sha = _resolved_input_sha(raw_bytes, input_sha256)
    except InputIntegrityError:
        return ArchiveProbeResult(
            metadata=_failure_metadata(adapter, _failure_sha(raw_bytes, input_sha256), PARSER_STATUS_ERROR),
            notes="input integrity failure: bytes do not match declared SHA256",
        )
    try:
        result = adapter.probe(raw_bytes, verified_sha, authoritative)
    except BaseException:  # parser-private failure → typed ERROR (never OBSERVED)
        return ArchiveProbeResult(
            metadata=_failure_metadata(adapter, verified_sha, PARSER_STATUS_ERROR),
            notes="parser failure normalized to ERROR",
        )
    ensure_normalized(result)
    if not isinstance(result, ArchiveProbeResult):
        raise ParserLeakError(
            f"probe must return ArchiveProbeResult, got {type(result).__name__}"
        )
    if result.metadata.status == PARSER_STATUS_OBSERVED and result.metadata.input_sha256 != verified_sha:
        raise ParserLeakError("probe result carries an input_sha256 that was not verified")
    return result


def run_enumerate(
    adapter: object,
    raw_bytes: bytes,
    input_sha256: str,
    budgets: object,
) -> ArchiveEnumerationResult:
    """Invoke `adapter.enumerate` behind the seam (distinct from `run_probe`)."""
    authoritative = assert_authoritative_budgets(budgets)
    assert_no_extraction_surface(adapter)
    try:
        verified_sha = _resolved_input_sha(raw_bytes, input_sha256)
    except InputIntegrityError:
        return ArchiveEnumerationResult(
            metadata=_failure_metadata(adapter, _failure_sha(raw_bytes, input_sha256), PARSER_STATUS_ERROR),
            entries=(),
            entry_count_returned=0,
            truncated=False,
            enumeration_state=ENUMERATION_FAILED,
            notes="input integrity failure: bytes do not match declared SHA256",
        )
    try:
        result = adapter.enumerate(raw_bytes, verified_sha, authoritative)
    except BaseException:  # parser-private failure → typed FAILED (never COMPLETE)
        return ArchiveEnumerationResult(
            metadata=_failure_metadata(adapter, verified_sha, PARSER_STATUS_ERROR),
            entries=(),
            entry_count_returned=0,
            truncated=False,
            enumeration_state=ENUMERATION_FAILED,
            notes="parser failure normalized to FAILED",
        )
    ensure_normalized(result)
    if not isinstance(result, ArchiveEnumerationResult):
        raise ParserLeakError(
            f"enumerate must return ArchiveEnumerationResult, got {type(result).__name__}"
        )
    # Only an OBSERVED parser can report a COMPLETE enumeration; a failure, an
    # unsupported/unavailable parser, or a resource-limited parser cannot.
    if (
        result.metadata.status != PARSER_STATUS_OBSERVED
        and result.enumeration_state == ENUMERATION_COMPLETE
    ):
        raise ArchiveSeamError(
            f"parser status {result.metadata.status} cannot yield a COMPLETE enumeration"
        )
    if result.metadata.input_sha256 != verified_sha:
        raise ParserLeakError("enumeration result carries an input_sha256 that was not verified")
    return result


#: Deterministic parser status → enumeration state mapping (only OBSERVED is
#: COMPLETE; a resource-limited run is ERROR + a resource_outcome, so it can
#: never map to COMPLETE).
ENUMERATION_STATE_BY_PARSER_STATUS = {
    PARSER_STATUS_OBSERVED: ENUMERATION_COMPLETE,
    PARSER_STATUS_NO_RESULT: ENUMERATION_FAILED,
    PARSER_STATUS_UNSUPPORTED: ENUMERATION_UNSUPPORTED,
    PARSER_STATUS_ERROR: ENUMERATION_FAILED,
    PARSER_STATUS_UNAVAILABLE: ENUMERATION_UNSUPPORTED,
}


def enumeration_state_for_parser_status(parser_status: str) -> str:
    """Deterministic parser status → enumeration state mapping (never COMPLETE
    for a non-OBSERVED parser)."""
    if parser_status not in PARSER_STATUSES:
        raise ArchiveSeamError(f"invalid parser status {parser_status!r}")
    return ENUMERATION_STATE_BY_PARSER_STATUS[parser_status]


__all__ = [
    "ArchiveSeamError",
    "ParserLeakError",
    "InputIntegrityError",
    "ExtractionNotPermittedError",
    "PARSER_STATUSES",
    "RESOURCE_OUTCOMES",
    "RESOURCE_OUTCOME_TIMEOUT",
    "RESOURCE_OUTCOME_EXHAUSTED",
    "RESOURCE_OUTCOME_STATUSES",
    "DIGEST_SENTINELS",
    "DIGEST_NULL_STATUSES",
    "ENUMERATION_STATES",
    "ENTRY_REJECTION_STATES",
    "ENTRY_TYPES",
    "ENCRYPTION_STATES",
    "DIRECTORY_STATES",
    "SEAM_OPERATIONS",
    "FORBIDDEN_ADAPTER_OPERATIONS",
    "PARSER_OUTCOME_NORMALIZATION",
    "RESOURCE_OUTCOME_NORMALIZATION",
    "ENUMERATION_STATE_BY_PARSER_STATUS",
    "NORMALIZED_ARCHIVE_TYPES",
    "ArchiveParserMetadata",
    "ArchiveEntry",
    "ArchiveProbeResult",
    "ArchiveEnumerationResult",
    "ArchiveParserAdapter",
    "is_normalized_archive_structure",
    "ensure_normalized",
    "sha256_hex",
    "verify_input_identity",
    "normalize_parser_outcome",
    "normalize_resource_outcome",
    "resource_outcome_from_limit_outcome",
    "metadata_with_resource_limit",
    "canonical_status_from_exception",
    "assert_authoritative_budgets",
    "resolve_structural_format",
    "container_type_evidence",
    "canonicalize_entries",
    "assert_no_extraction_surface",
    "run_probe",
    "run_enumerate",
    "enumeration_state_for_parser_status",
]
