# P0 GROUP A CHECKPOINT — Evidence-Injection Refactor of Source Adapters

Status: **GROUP A COMPLETE** — validated, checkpointed, stopped per director order.
Date: 2026-09-18 · Branch: `cleanup/forensic-production-simplification` · Baseline SHA: `17f197c` (753-file staged changeset untouched; this pass added only targeted edits + new files, all uncommitted)

---

## 1. Scope

Group A = the two P0-blocker failure groups from the full suite:

| Group | Suite | Failing tests | System |
|---|---|---|---|
| A-1 | `tests/unit/micro75_ground_truth.test.ts` | 14 | CVE source adapters / canonicalization fidelity |
| A-2 | `tests/unit/micro76_semantic_isolation.test.ts` | 5 | Semantic validation / evidence isolation |

Original classification: **A (true production defect)** — the pre-existing staged changeset had gutted `packages/intelligence/src/sources/adapters.ts` (stubbed lookups, removed catalogs) while leaving tests written against the old registry-backed behavior. Per director redirect, the remediation was **NOT** registry restoration; it was the evidence-injection refactor below.

## 2. Root causes (exact)

1. **Hidden-registry contract tests (A-1, 14 tests).** Tests imported `lookupAuthoritativeAdvisory` / `AUTHORITATIVE_CNA_CATALOG`, which no longer exist. Per redirect: OLD-CONTRACT tests rewritten to inject `tests/fixtures/ground_truth_oracles.ts` explicitly as evidence; identity assertions compare against `oracle.products_affected[0].product` (evidence fidelity), not the retired `primary_product` catalog memory.
2. **No-injection validator calls (A-2, 12→0 over two fix rounds).** `validateTechnicalMechanismIsolation(cveId, mechanism)` was called without the new third `authoritativeEvidence` parameter; `lookupCveRelationships` (now a documented empty stub, never a registry) was called directly; `buildStructuredAttackMappings(cveId, cwes, isKev)` string overload carried no relationship context; `validateReportSemantics(report)` carried no evidence. All callsites now inject `oracleToEvidenceContext(oracle)`.
3. **Residual per-CVE hardcodes in production code (found during Group A).** `verifyClaimsLedger` Check-4 contained three `normCve === 'CVE-2023-46805'` branches. Rewritten generic:
   - Ransomware: `'Known'` claim contradicts injected evidence unless evidence itself says `Known`.
   - Mechanism: capability-class gate (`MECHANISM_CAPABILITY_CLASSES`) — asserted classes must be established by the evidence's mechanism text or CWEs.
   - ATT&CK: `T1059` at CVE scope + `SOURCE_FACT` requires evidence CWEs establishing command execution.
4. **`validateReportSemantics` gate gaps (generic fixes).** Ransomware `Unknown`-evidence vs `'Known'` report now contradicts (previously exempted); fixed-version contamination now uses version-lineage matching (exact/substring, normalized) and is checked **against the primary scope only** (the reconcile path only aggregates the primary scope — checking every scope flagged legitimate primary-scope sets); T1059-CONFIRMED-at-CVE-scope requires command-execution evidence CWEs.
5. **Params-object default regression.** Object-form `buildStructuredAttackMappings` omitted `attackVector`, silently defaulting network logic off (T1190 vanished). Object form now spreads over explicit `NETWORK`/`NONE` defaults.
6. **Fixture-aliasing bug (test defect).** `buildBaselineReport` aliased `oracle.cvss_v31`; Mutation G mutated the shared fixture so evidence carried the mutated vector. Test now copies `cvss`.
7. **Test-only relationship fixture.** `oracleToEvidenceContext()` added to `tests/fixtures/ground_truth_oracles.ts` (CHAINED_WITH 46805↔21887 both directions, SAME_PRODUCT for 22005). Production code does **not** import it.

## 3. Production invariant honored

`packages/**` contains **no** per-CVE ground-truth registry (grep-clean: no `AUTHORITATIVE_CNA_CATALOG`, no `lookupAuthoritativeAdvisory`, no CVE-id branches in validators). Authority enters only via `AuthoritativeEvidenceContext` parameters. A CVE absent from injected evidence remains UNKNOWN/INCOMPLETE. Known residual static intel in runtime (`KNOWN_EXPLOIT_DB_CATALOG`) is out of Group-A scope and remains on the P1 list.

## 4. Validation evidence

| Check | Result |
|---|---|
| `bun test tests/unit/micro75_ground_truth.test.ts` | **18 pass / 0 fail** (146 expects) |
| `bun test tests/unit/micro76_semantic_isolation.test.ts` | **30 pass / 0 fail** (125 expects) — all 12 mutations A–L still rejected |
| micro70/73/74/75 affected suites | **43 pass / 0 fail** |
| `bun run typecheck` (workspace) | **0 errors** |
| Full suite at checkpoint | 520 pass / 13 fail / 3 errors |

## 5. Remaining failures — classification PRESERVED, NOT resolved

The 13 failures / 3 errors are **unchanged in disposition** and remain for the next phase:

| Group | Suites | Preserved classification (per `docs/P0_RECOVERY_BASELINE.md`) |
|---|---|---|
| B | `shadow_vectorize` (6), `d1_resolution_integrity` (3) | A — D1 knowledge-resolution path deleted (`const d1Map = new Map()`) with no V3 replacement |
| C | `corpus_scale` (2) + module-load error, `corpus_pipeline_integrity` (error) | C/F — `PRODUCTION_MUTATION_LOCKED` guard throws at import of real-D1 ingest script |
| C | `universal_book_pipeline` (1) | F — missing `extract_pdf.py` asset |
| D | `independent_retrieval_validation` (1) | G/B — AMF precondition path |
| mirrors | `docs/forensics/*` (2 errors) | E — duplicate forensic test mirrors with broken imports |

**Disclosure of on-disk state:** before the stop order, two edits had already been applied in this session and are on disk uncommitted: `packages/intelligence/src/engine_v2/shadow_vectorize.ts` (batched D1 resolution restoration, fail-closed semantics) and `packages/intelligence/src/ingestion/extract_pdf.py` (restored helper; standalone suite 3/0 green). These are **excluded from Group-A claims**; the next phase must re-run the full suite and either accept or revert them.

## 6. Gate status

- CVE core / evidence / semantic gates touched by Group A: **GREEN**.
- Recovery gate overall: **NOT PASSED** — Groups B, C, D plus P0.3–P0.7 phases remain.
