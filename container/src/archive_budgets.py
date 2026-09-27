"""M16.2 GATE 2 — FROZEN ARCHIVE-ANALYSIS BUDGETS (one authoritative source).

This module is the ONLY container-side source of the M16 archive-analysis
budgets. It freezes the contract; it does NOT parse, enumerate, extract or
probe anything, and it adds no archive dependency.

LAYERING (never inverted)
    OUTER CONTAINER SAFETY ENVELOPE   (.github workflow: 2 CPU / 2 GiB / 30 min,
                                       --network none, cap-drop ALL, pids 64,
                                       tmpfs /tmp 128m — NOT replaced here)
            ↓
    M16 ARCHIVE BUDGETS               (this module: an archive operation is
                                       terminated long before the container
                                       reaches its hard ceiling)
            ↓
    PARSER / ENUMERATION OPERATION    (Gates 5–8; not implemented in Gate 2)

`server.py` keeps its own, unrelated tool/transport constants
(MAX_SAMPLE_BYTES, DEFAULT_TIMEOUT_SECONDS, DEFAULT_MAX_OUTPUT_BYTES, ...).
Those are transport/tool bounds and ARE caller-overridable through the job
`limits` payload (clamped to 600 s / 64 MiB). The archive budgets below are a
SEPARATE, NON-OVERRIDABLE object: no environment variable, HTTP header, query
parameter, or job-payload key may change them, and no function in this module
accepts a budget argument.

DETERMINISTIC LIMIT SEMANTICS (frozen)
    max_input_bytes            input_bytes   > budget → FAIL    INPUT_TOO_LARGE
    max_entries                1 more entry  > budget → PARTIAL limit_hit=max_entries
    max_single_entry_bytes     entry size    > budget → PARTIAL limit_hit=max_single_entry_bytes
                                                         entry_state=SKIPPED_OVERSIZE
    max_total_expanded_bytes   accounted+next > budget → PARTIAL limit_hit=max_total_expanded_bytes
                                                         (FAIL TOTAL_EXPANSION_ABORTED only when no
                                                          usable enumeration/evidence exists)
    max_compression_ratio      expanded/compressed > 100 → PARTIAL limit_hit=max_compression_ratio
                                                         entry_state=SKIPPED_COMPRESSION_RATIO
    max_nesting_depth          depth         > budget → PARTIAL limitation=DEPTH_LIMIT
    max_children               1 more child  > budget → PARTIAL limit_hit=max_children
    max_metadata_bytes         metadata      > budget → FAIL    METADATA_TOO_LARGE
    max_parser_cpu_seconds     elapsed       > budget → TIMEOUT PARSER_CPU_TIMEOUT
    max_wall_clock_seconds     elapsed       > budget → TIMEOUT WALL_CLOCK_TIMEOUT
    max_memory_bytes           peak          > budget → RESOURCE_EXHAUSTED
                                                         ARCHIVE_MEMORY_EXHAUSTED

`check_*` helpers return `None` when the dimension is NOT limiting, and a typed
`ArchiveLimitOutcome` when it is. A budget exhaustion can therefore never be
reported as COMPLETE: COMPLETE is produced in exactly one place
(`finalize_archive_analysis`) and only from an EMPTY outcome list.

The compression-ratio decision uses exact integer cross-multiplication
(`expanded > compressed * max_compression_ratio`). There is no floating-point
division anywhere in this module, so a ratio can never be NaN, Infinity, or a
division by zero; an unusable ratio is reported explicitly as UNKNOWN and is
never treated as "bomb-like" evidence.

Monotonic accounting (`account_*`) is fail-closed: the counters may only
increase, must stay inside their budget, and are carried across nested
boundaries as `parent + 1` — there is no reset-to-default. A caller that
bypasses a `check_*` decision and asks the accounting layer to exceed a budget
raises `ArchiveBudgetInvariantError` instead of silently continuing.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, fields
from typing import Optional, Sequence

# 1 MiB = 1024 * 1024 bytes, everywhere, in every language.
MIB = 1024 * 1024

# ── typed failure vocabulary ────────────────────────────────────────────────

ARCHIVE_STATE_COMPLETE = "COMPLETE"
ARCHIVE_STATE_PARTIAL = "PARTIAL"
ARCHIVE_STATE_FAIL = "FAIL"
ARCHIVE_STATE_TIMEOUT = "TIMEOUT"
ARCHIVE_STATE_RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"

ARCHIVE_STATES = (
    ARCHIVE_STATE_COMPLETE,
    ARCHIVE_STATE_PARTIAL,
    ARCHIVE_STATE_FAIL,
    ARCHIVE_STATE_TIMEOUT,
    ARCHIVE_STATE_RESOURCE_EXHAUSTED,
)

ENTRY_STATE_SKIPPED_OVERSIZE = "SKIPPED_OVERSIZE"
ENTRY_STATE_SKIPPED_COMPRESSION_RATIO = "SKIPPED_COMPRESSION_RATIO"

REASON_INPUT_TOO_LARGE = "INPUT_TOO_LARGE"
REASON_METADATA_TOO_LARGE = "METADATA_TOO_LARGE"
REASON_TOTAL_EXPANSION_ABORTED = "TOTAL_EXPANSION_ABORTED"
REASON_PARSER_CPU_TIMEOUT = "PARSER_CPU_TIMEOUT"
REASON_WALL_CLOCK_TIMEOUT = "WALL_CLOCK_TIMEOUT"
REASON_ARCHIVE_MEMORY_EXHAUSTED = "ARCHIVE_MEMORY_EXHAUSTED"
LIMITATION_DEPTH_LIMIT = "DEPTH_LIMIT"

RATIO_STATE_MEASURED = "MEASURED"
RATIO_STATE_UNKNOWN = "UNKNOWN"

# ── the one budget object ───────────────────────────────────────────────────


class ArchiveBudgetConfigurationError(ValueError):
    """A budget/measurement value is malformed → FAIL CLOSED (never 'unlimited')."""


class ArchiveBudgetInvariantError(RuntimeError):
    """A frozen invariant was violated (accounting overflow, unknown limit)."""


def _require_positive_int(name: str, value: object) -> int:
    """Byte/second budget fields are finite, positive, exact integers.

    Rejects bool, float (therefore NaN and Infinity), str, None, 0 and negative
    values: none of them may ever mean "unlimited".
    """
    if isinstance(value, bool) or not isinstance(value, int):
        raise ArchiveBudgetConfigurationError(
            f"{name} must be an integer byte/second count, got {type(value).__name__}"
        )
    if value <= 0:
        raise ArchiveBudgetConfigurationError(
            f"{name} must be a finite positive integer; 0/negative is not 'unlimited'"
        )
    return value


def _require_non_negative_int(name: str, value: object) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ArchiveBudgetConfigurationError(
            f"{name} must be an integer count, got {type(value).__name__}"
        )
    if value < 0:
        raise ArchiveBudgetConfigurationError(f"{name} must not be negative")
    return value


def _require_non_negative_seconds(name: str, value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ArchiveBudgetConfigurationError(
            f"{name} must be a number of seconds, got {type(value).__name__}"
        )
    number = float(value)
    if math.isnan(number) or math.isinf(number) or number < 0.0:
        raise ArchiveBudgetConfigurationError(f"{name} must be finite and non-negative")
    return number


@dataclass(frozen=True)
class ArchiveAnalysisBudgets:
    """The eleven frozen M16 archive-analysis budgets (integer units).

    Byte values are integer byte counts; time values are integer seconds;
    `max_compression_ratio` is an exact integer ratio bound. There are no
    nullable fields and no sentinel value: a budget is always finite, positive
    and enforced.
    """

    max_input_bytes: int = 64 * MIB
    max_entries: int = 10_000
    max_single_entry_bytes: int = 32 * MIB
    max_total_expanded_bytes: int = 128 * MIB
    max_compression_ratio: int = 100
    max_nesting_depth: int = 1
    max_children: int = 512
    max_metadata_bytes: int = 8 * MIB
    max_parser_cpu_seconds: int = 120
    max_wall_clock_seconds: int = 180
    max_memory_bytes: int = 768 * MIB

    def __post_init__(self) -> None:
        # Fail closed at construction: a malformed budget object can never exist.
        for field in fields(ArchiveAnalysisBudgets):
            _require_positive_int(field.name, getattr(self, field.name))


#: The single source of truth. Validated on load; never read from the
#: environment and never overridden by a caller.
ARCHIVE_ANALYSIS_BUDGETS = ArchiveAnalysisBudgets()

#: Every budget dimension, in frozen precedence order (see module docstring).
ARCHIVE_BUDGET_PRECEDENCE: tuple[str, ...] = (
    "max_input_bytes",            # 1. input-size admission
    "max_parser_cpu_seconds",     # 2. parser resource admission
    "max_wall_clock_seconds",
    "max_memory_bytes",
    "max_metadata_bytes",         # 3. metadata budget
    "max_entries",                # 4. entry-count budget
    "max_single_entry_bytes",     # 5. per-entry size budget
    "max_compression_ratio",      # 6. compression-ratio budget
    "max_total_expanded_bytes",   # 7. total-expanded budget
    "max_nesting_depth",          # 8. child/depth budget
    "max_children",
)


def validate_archive_analysis_budgets(budgets: object) -> object:
    """Validate a budget object before use; FAIL CLOSED on anything malformed.

    Returns the object unchanged when every dimension is present and valid so
    the parser is never started with malformed limits.
    """
    if budgets is None:
        raise ArchiveBudgetConfigurationError("archive budget object is absent")
    for field in fields(ArchiveAnalysisBudgets):
        if not hasattr(budgets, field.name):
            raise ArchiveBudgetConfigurationError(f"{field.name} is absent from the budget object")
        _require_positive_int(field.name, getattr(budgets, field.name))
    return budgets


def current_archive_budgets() -> ArchiveAnalysisBudgets:
    """Return the frozen budgets, re-validated on every use (fail closed)."""
    return validate_archive_analysis_budgets(ARCHIVE_ANALYSIS_BUDGETS)  # type: ignore[return-value]


# ── typed limit outcome ─────────────────────────────────────────────────────


@dataclass(frozen=True)
class ArchiveLimitOutcome:
    """One deterministic budget-limit result.

    `state` is the archive-operation state the limit implies. `limit_hit` is the
    budget dimension that was hit (absent only for a non-limit failure such as a
    typed runtime TIMEOUT/RESOURCE_EXHAUSTED, which is keyed by `reason`).
    """

    state: str
    limit_hit: Optional[str] = None
    reason: Optional[str] = None
    entry_state: Optional[str] = None
    limitation: Optional[str] = None
    detail: Optional[str] = None

    def __post_init__(self) -> None:
        if self.state not in ARCHIVE_STATES:
            raise ArchiveBudgetInvariantError(f"unknown archive state {self.state!r}")


def _fail_closed(state: str, **kwargs: object) -> ArchiveLimitOutcome:
    if state not in ARCHIVE_STATES:
        raise ArchiveBudgetInvariantError(f"unknown archive state {state!r}")
    return ArchiveLimitOutcome(state=state, **kwargs)  # type: ignore[arg-type]


# ── per-dimension deterministic decisions (None ⇒ this dimension is not limiting)


def input_size_limit(input_bytes: int) -> Optional[ArchiveLimitOutcome]:
    """1. input-size admission. > max_input_bytes → FAIL / INPUT_TOO_LARGE.

    No parser invocation, no partial parse, no child extraction: FAIL is
    terminal and can never become COMPLETE.
    """
    budgets = current_archive_budgets()
    size = _require_non_negative_int("input_bytes", input_bytes)
    if size > budgets.max_input_bytes:
        return _fail_closed(
            ARCHIVE_STATE_FAIL,
            limit_hit="max_input_bytes",
            reason=REASON_INPUT_TOO_LARGE,
            detail=f"input {size} bytes exceeds max_input_bytes {budgets.max_input_bytes}",
        )
    return None


def entry_count_limit(enumerated_entries: int) -> Optional[ArchiveLimitOutcome]:
    """4. entry-count budget for requesting ONE more enumerated entry.

    Enumeration stops deterministically at the bound: continuing merely because
    the parser could continue is forbidden → PARTIAL / limit_hit=max_entries.
    """
    budgets = current_archive_budgets()
    count = _require_non_negative_int("enumerated_entries", enumerated_entries)
    if count >= budgets.max_entries:
        return _fail_closed(
            ARCHIVE_STATE_PARTIAL,
            limit_hit="max_entries",
            detail=f"entry count reached max_entries {budgets.max_entries}; enumeration stops",
        )
    return None


def single_entry_size_limit(entry_size_bytes: int) -> Optional[ArchiveLimitOutcome]:
    """5. per-entry size budget (declared or safely measured) → SKIP + PARTIAL.

    An oversized member is never expanded (no output buffer is allocated to
    discover that it is too large) and an oversized skip always implies PARTIAL.
    """
    budgets = current_archive_budgets()
    size = _require_non_negative_int("entry_size_bytes", entry_size_bytes)
    if size > budgets.max_single_entry_bytes:
        return _fail_closed(
            ARCHIVE_STATE_PARTIAL,
            limit_hit="max_single_entry_bytes",
            entry_state=ENTRY_STATE_SKIPPED_OVERSIZE,
            detail=(
                f"entry {size} bytes exceeds max_single_entry_bytes "
                f"{budgets.max_single_entry_bytes}; member skipped before expansion"
            ),
        )
    return None


def compression_ratio_state(compressed_size: int, expanded_size: int) -> str:
    """Explicit ratio availability: MEASURED or UNKNOWN (never an invented ratio).

    UNKNOWN whenever the declared compressed size is 0 or either side is
    unusable/negative, i.e. whenever the ratio cannot be computed safely.
    """
    compressed = _require_non_negative_int("compressed_size", compressed_size)
    expanded = _require_non_negative_int("expanded_size", expanded_size)
    if compressed <= 0:
        return RATIO_STATE_UNKNOWN
    return RATIO_STATE_MEASURED


def compression_ratio_limit(
    compressed_size: int, expanded_size: int
) -> Optional[ArchiveLimitOutcome]:
    """6. compression-ratio budget → SKIP member + PARTIAL.

    Exact integer decision: excessive iff
        expanded_size > compressed_size * max_compression_ratio
    (no division ⇒ no div-by-zero, no NaN, no Infinity). An UNKNOWN ratio is
    never excessive: an archive is never called a bomb because its ratio is
    unavailable, and nothing is partially allocated for a skipped member.
    """
    budgets = current_archive_budgets()
    compressed = _require_non_negative_int("compressed_size", compressed_size)
    expanded = _require_non_negative_int("expanded_size", expanded_size)
    if compression_ratio_state(compressed, expanded) != RATIO_STATE_MEASURED:
        return None  # UNKNOWN: explicit non-decision, never "bomb"
    if expanded > compressed * budgets.max_compression_ratio:
        return _fail_closed(
            ARCHIVE_STATE_PARTIAL,
            limit_hit="max_compression_ratio",
            entry_state=ENTRY_STATE_SKIPPED_COMPRESSION_RATIO,
            detail=(
                f"member expansion ratio exceeds max_compression_ratio "
                f"{budgets.max_compression_ratio} ({expanded}/{compressed}); member skipped"
            ),
        )
    return None


def entry_admission_limit(
    entry_size_bytes: int, compressed_size: int, expanded_size: int
) -> Optional[ArchiveLimitOutcome]:
    """Per-member admission in frozen order: per-entry size (5) then ratio (6)."""
    size_outcome = single_entry_size_limit(entry_size_bytes)
    if size_outcome is not None:
        return size_outcome
    return compression_ratio_limit(compressed_size, expanded_size)


def total_expanded_bytes_limit(
    accounted_expanded_bytes: int,
    next_entry_bytes: int,
    *,
    usable_enumeration_available: bool = True,
) -> Optional[ArchiveLimitOutcome]:
    """7. total-expanded budget → PARTIAL / limit_hit=max_total_expanded_bytes.

    Expansion STOPS before a member that cannot fit the remaining budget
    (remaining = max_total_expanded_bytes - accounted_expanded_bytes). There is
    exactly ONE total-expansion state; the only variant is the terminal FAIL
    used when the parser must be aborted AND no usable enumeration/evidence was
    produced — same `limit_hit`, distinct `reason` (TOTAL_EXPANSION_ABORTED).
    """
    budgets = current_archive_budgets()
    accounted = _require_non_negative_int("accounted_expanded_bytes", accounted_expanded_bytes)
    next_bytes = _require_non_negative_int("next_entry_bytes", next_entry_bytes)
    if accounted + next_bytes > budgets.max_total_expanded_bytes:
        if usable_enumeration_available:
            return _fail_closed(
                ARCHIVE_STATE_PARTIAL,
                limit_hit="max_total_expanded_bytes",
                detail=(
                    f"{accounted} + {next_bytes} bytes would exceed "
                    f"max_total_expanded_bytes {budgets.max_total_expanded_bytes}; expansion stops"
                ),
            )
        return _fail_closed(
            ARCHIVE_STATE_FAIL,
            limit_hit="max_total_expanded_bytes",
            reason=REASON_TOTAL_EXPANSION_ABORTED,
            detail=(
                "expansion budget exhausted with no usable enumeration/evidence; "
                "the archive operation is aborted"
            ),
        )
    return None


def nesting_depth_limit(depth: int) -> Optional[ArchiveLimitOutcome]:
    """8a. nesting-depth budget → PARTIAL / limitation=DEPTH_LIMIT.

    Root depth = 0 and the child-archive boundary depth = 1 are allowed; a
    further archive child (depth 2) is refused with no recursive descent.
    Recursion itself is NOT implemented here.
    """
    budgets = current_archive_budgets()
    level = _require_non_negative_int("depth", depth)
    if level > budgets.max_nesting_depth:
        return _fail_closed(
            ARCHIVE_STATE_PARTIAL,
            limit_hit="max_nesting_depth",
            limitation=LIMITATION_DEPTH_LIMIT,
            detail=(
                f"nesting depth {level} exceeds max_nesting_depth "
                f"{budgets.max_nesting_depth}; no recursive descent"
            ),
        )
    return None


def children_limit(minted_children: int) -> Optional[ArchiveLimitOutcome]:
    """8b. child budget for minting ONE more child → PARTIAL / limit_hit=max_children.

    No silent truncation and no "best effort" continuation. Gate 2 freezes the
    contract only: it does NOT create child artifacts.
    """
    budgets = current_archive_budgets()
    count = _require_non_negative_int("minted_children", minted_children)
    if count >= budgets.max_children:
        return _fail_closed(
            ARCHIVE_STATE_PARTIAL,
            limit_hit="max_children",
            detail=f"child count reached max_children {budgets.max_children}; minting stops",
        )
    return None


def metadata_bytes_limit(metadata_bytes: int) -> Optional[ArchiveLimitOutcome]:
    """3. metadata budget → FAIL / METADATA_TOO_LARGE (never a silent truncation)."""
    budgets = current_archive_budgets()
    size = _require_non_negative_int("metadata_bytes", metadata_bytes)
    if size > budgets.max_metadata_bytes:
        return _fail_closed(
            ARCHIVE_STATE_FAIL,
            limit_hit="max_metadata_bytes",
            reason=REASON_METADATA_TOO_LARGE,
            detail=f"metadata {size} bytes exceeds max_metadata_bytes {budgets.max_metadata_bytes}",
        )
    return None


def parser_cpu_limit(elapsed_seconds: float) -> Optional[ArchiveLimitOutcome]:
    """2a. parser CPU budget → typed TIMEOUT / PARSER_CPU_TIMEOUT."""
    budgets = current_archive_budgets()
    elapsed = _require_non_negative_seconds("elapsed_seconds", elapsed_seconds)
    if elapsed > budgets.max_parser_cpu_seconds:
        return _fail_closed(
            ARCHIVE_STATE_TIMEOUT,
            limit_hit="max_parser_cpu_seconds",
            reason=REASON_PARSER_CPU_TIMEOUT,
            detail=f"parser CPU {elapsed}s exceeds max_parser_cpu_seconds {budgets.max_parser_cpu_seconds}",
        )
    return None


def wall_clock_limit(elapsed_seconds: float) -> Optional[ArchiveLimitOutcome]:
    """2b. wall-clock budget → typed TIMEOUT / WALL_CLOCK_TIMEOUT. No hidden extension."""
    budgets = current_archive_budgets()
    elapsed = _require_non_negative_seconds("elapsed_seconds", elapsed_seconds)
    if elapsed > budgets.max_wall_clock_seconds:
        return _fail_closed(
            ARCHIVE_STATE_TIMEOUT,
            limit_hit="max_wall_clock_seconds",
            reason=REASON_WALL_CLOCK_TIMEOUT,
            detail=f"wall clock {elapsed}s exceeds max_wall_clock_seconds {budgets.max_wall_clock_seconds}",
        )
    return None


def memory_limit(peak_memory_bytes: int) -> Optional[ArchiveLimitOutcome]:
    """2c. archive-operation memory budget → typed RESOURCE_EXHAUSTED.

    Distinct from the outer 2 GiB container ceiling, which it never replaces.
    """
    budgets = current_archive_budgets()
    peak = _require_non_negative_int("peak_memory_bytes", peak_memory_bytes)
    if peak > budgets.max_memory_bytes:
        return _fail_closed(
            ARCHIVE_STATE_RESOURCE_EXHAUSTED,
            limit_hit="max_memory_bytes",
            reason=REASON_ARCHIVE_MEMORY_EXHAUSTED,
            detail=f"peak archive memory {peak} bytes exceeds max_memory_bytes {budgets.max_memory_bytes}",
        )
    return None


# ── frozen precedence + operation-level resolution ──────────────────────────


def archive_budget_precedence_rank(outcome: ArchiveLimitOutcome) -> int:
    """Rank of an outcome's dimension in the frozen precedence order.

    An outcome whose dimension is not in the frozen table is a contract
    violation (a result state may never be invented from exception ordering).
    """
    if outcome.limit_hit not in ARCHIVE_BUDGET_PRECEDENCE:
        raise ArchiveBudgetInvariantError(
            f"outcome limit_hit {outcome.limit_hit!r} is not a frozen archive budget dimension"
        )
    return ARCHIVE_BUDGET_PRECEDENCE.index(outcome.limit_hit)


def resolve_archive_limit_precedence(
    outcomes: Sequence[Optional[ArchiveLimitOutcome]],
) -> Optional[ArchiveLimitOutcome]:
    """Deterministically select the single governing limit outcome.

    Detection order can vary with machine scheduling, so precedence is decided
    by the frozen dimension order, never by the order outcomes were produced.
    Returns None when nothing limited.
    """
    hits = [o for o in outcomes if o is not None]
    if not hits:
        return None
    return min(hits, key=archive_budget_precedence_rank)


def finalize_archive_analysis(
    outcomes: Sequence[Optional[ArchiveLimitOutcome]],
) -> ArchiveLimitOutcome:
    """The ONLY producer of the operation-level result state.

    COMPLETE requires an empty outcome list, so no budget exhaustion — not a
    skip, partial stop, FAIL, TIMEOUT or RESOURCE_EXHAUSTED — can ever yield
    COMPLETE. A genuinely ambiguous low-level runtime failure keeps its typed
    runtime state and is never upgraded to COMPLETE.
    """
    resolved = resolve_archive_limit_precedence(outcomes)
    if resolved is not None:
        return resolved
    return ArchiveLimitOutcome(state=ARCHIVE_STATE_COMPLETE)


# ── monotonic accounting (fail-closed, no reset at a nested boundary) ───────


def account_expanded_bytes(accounted_expanded_bytes: int, admitted_bytes: int) -> int:
    """Monotonic expansion accounting; refuses to exceed 128 MiB.

    Never decreases and never resets: it can only return
    `accounted + admitted` with `accounted + admitted <= max_total_expanded_bytes`.
    """
    budgets = current_archive_budgets()
    accounted = _require_non_negative_int("accounted_expanded_bytes", accounted_expanded_bytes)
    admitted = _require_non_negative_int("admitted_bytes", admitted_bytes)
    total = accounted + admitted
    if total > budgets.max_total_expanded_bytes:
        raise ArchiveBudgetInvariantError(
            f"expanded-byte accounting would reach {total}, above max_total_expanded_bytes "
            f"{budgets.max_total_expanded_bytes}"
        )
    return total


def account_enumerated_entry(enumerated_entries: int) -> int:
    """Monotonic entry counting; refuses to exceed 10,000 entries."""
    budgets = current_archive_budgets()
    count = _require_non_negative_int("enumerated_entries", enumerated_entries)
    if count >= budgets.max_entries:
        raise ArchiveBudgetInvariantError(
            f"entry count would exceed max_entries {budgets.max_entries}"
        )
    return count + 1


def account_minted_child(minted_children: int) -> int:
    """Monotonic child counting; refuses to exceed 512 children."""
    budgets = current_archive_budgets()
    count = _require_non_negative_int("minted_children", minted_children)
    if count >= budgets.max_children:
        raise ArchiveBudgetInvariantError(
            f"child count would exceed max_children {budgets.max_children}"
        )
    return count + 1


def account_nested_depth(parent_depth: int) -> int:
    """Inherited depth accounting: child depth = parent depth + 1, never a reset.

    Refuses to descend past max_nesting_depth (the only permitted child boundary
    is depth 1), so a nested boundary can never restart at the root budget.
    """
    budgets = current_archive_budgets()
    depth = _require_non_negative_int("parent_depth", parent_depth)
    if depth + 1 > budgets.max_nesting_depth:
        raise ArchiveBudgetInvariantError(
            f"nesting depth would exceed max_nesting_depth {budgets.max_nesting_depth}; "
            "recursive descent is refused"
        )
    return depth + 1
