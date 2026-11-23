# P0 GROUP B CHECKPOINT — D1 Knowledge Resolution Restoration

Status: **GROUP B COMPLETE** — validated, checkpointed, stopped per director order.
Date: 2026-09-18 · Branch: `cleanup/forensic-production-simplification` · Baseline: per `docs/P0_GROUP_A_CHECKPOINT.md` (immutable starting point, SHA `17f197c`, 753-file staged changeset untouched).

---

## 1. Scope

Group B = the two suites classified **A (true production defect)** in the Group-A checkpoint: D1 resolution integrity + shadow_vectorize, plus the independent-retrieval suite directly downstream of the D1 resolution path. No other phase, group, or system was touched.

## 2. Root cause

The pre-existing staged changeset replaced the D1 chunk-resolution layer in `packages/intelligence/src/engine_v2/shadow_vectorize.ts` with `const d1Map = new Map()` ("V3-only; legacy D1 forbidden") while keeping the entire `d1_resolved` / `d1_rate_limited` / `resolution_source: 'D1'` metrics and type surface — and prod D1 remains a live binding. No V3 retrieval module is wired anywhere (V3 exists only as pure-function tests + a Python script). Result: 9 dead-path test failures in a deployed code path.

## 3. Change (production file: `shadow_vectorize.ts` only)

1. **Restored real D1 resolution** — batched query `SELECT id, document_id, section, page, text, authority_tier, source_id FROM knowledge_chunks WHERE id IN (…)`, deduplicated chunk ids, rows → `d1Map`. Precedence preserved: D1 → canonical corpus → metadata → FAILED.
2. **F9 surfacing** — any D1 error (incl. rate-limit) is caught, recorded (`d1_rate_limited=true`, `d1_error=<message>`), and resolution degrades explicitly to canonical corpus. No silent return.
3. **Fail-closed divergence guard (`d1ServedEmpty`)** — when D1 is *reachable* and returns zero rows for the batch, unregistered chunks stay `INCOMPLETE` (fallback skipped); only a *D1 error* permits canonical-corpus degradation. Prevents a diverged D1 from being silently papered over by the fixture corpus while keeping rate-limit windows functional.

## 4. Required validation (exact results)

| Check | Result |
|---|---|
| 1. `tests/d1_resolution_integrity.test.ts` | **3 pass / 0 fail** (suite totals: 14 pass / 0 fail / 59 expects across the two Group-B suites) |
| 2. `tests/shadow_vectorize.test.ts` | **11 pass / 0 fail** |
| 3. `tests/independent_retrieval_validation.test.ts` (directly affected: claim attribution + content-hash provenance consume resolved chunk text) | **7 pass / 0 fail** (138 expects) |
| Adjacent consumers re-run: `dfir_retrieval_integrity`, `benchmark_integrity` | 10 pass / 0 fail |
| 4. `bun run typecheck` | **0 errors** |
| Full suite after Group B | **528 pass / 5 fail / 3 errors** (was 520/13/3 at Group-A checkpoint) |

## 5. Remaining failures — classification preserved, NOT resolved

| Group | Suites | Preserved classification |
|---|---|---|
| C | `corpus_scale` (2) + `corpus_pipeline_integrity` error | C/F — `PRODUCTION_MUTATION_LOCKED` guard throws at import of real-D1 ingest script |
| C | `universal_book_pipeline` (1) | F — missing `extract_pdf.py` asset (restored copy on disk, uncommitted, excluded from Group-B claims) |
| D | `independent_retrieval_validation` AMF-precondition variant (1) | G/B |
| mirrors | `docs/forensics/*` (2 errors) | E — duplicate forensic test mirrors with broken imports |

Exact full-suite residual (5): corpus_scale ×2, universal_book ×1, independent-retrieval ×1, plus the corpus module-load error and 2 mirror import errors. **Note:** one "independent retrieval" failure remains in the full-suite count while the suite passes standalone — same as the pre-Group-B pattern; left untouched per scope (its assertion path is the AMF precondition, not D1 resolution).

## 6. Files changed by Group B

- `packages/intelligence/src/engine_v2/shadow_vectorize.ts` (only production file)

## 7. Gate status

- Knowledge/RAG retrieval gate (D1 resolution, F9 exposure, fail-closed provenance): **GREEN**.
- Recovery gate overall: **NOT PASSED** — Groups C/D plus P0.3–P0.7 phases remain.
