# P0 RECOVERY BASELINE — captured 2026-09-18 (before recovery-gate changes)

## Git state
- Branch: `cleanup/forensic-production-simplification`
- HEAD: `17f197c27f5092fcf6fbcbfe6462cc0603dd2785`
- Working tree: 1107 porcelain entries (pre-existing staged changeset: **753 files, +1,394,309/−44,250** — immutable, NOT to be reset/stashed/discarded)
- P0.1 files from the previous pass remain uncommitted on disk (enrichment.ts, types.ts, compiler.ts, claims.ts, index.ts, kev_evidence_fixture.ts, p01 test suite).

## Live Cloudflare state (verified read-only via API, 2026-09-18)
- 14 workers; **zero cron triggers on any schedule** (production discovery dormant).
- `zayron-x-api` (prod, 2026-09-16), `zayron-x-api-preview` (2026-09-17), `zayron-x-ingest` (2026-09-11, dormant, no cron) + preview twins, telegram collector + preview, publish consumer + preview, 2 dead-end fabric queues (no consumers, no DLQ).
- D1: production `zayron-x-db` (6/25 migrations journaled), preview `zayron-x-preview-db`, fabric `zayron-x-intelligence-db`.
- Live config: prod ingest `LEGACY_FREEZE=true`; preview ingest has **no R2/Vectorize bindings**; fabric staging has its own Vectorize index (drift report partially stale on that point).
- Production data: 1,238 vulnerabilities, 100% null CVSS/EPSS; canonical core tables empty; last activity 2026-09-12.

## Canonical failure map (bun test, full suite)
502 pass / 32 unique failing tests + 3 load errors, in 8 groups:

| Group | Tests | Root cause (root-caused this pass) | Category |
|---|---|---|---|
| A1 micro75 | 14 | Staged changeset gutted `adapters.ts` (`lookupAuthoritativeAdvisory→null`, `lookupCveRelationships→[]`, mechanism-isolation→no-op) while tests still encoded hidden-catalog enrichment | A/E mix |
| A2 micro76 | 5 | Same gutting: mechanism-isolation regression + relationship model + mutations C/E lost their (previously hardcoded) oracle data | A/E mix |
| B1 d1_resolution | 3 | `shadow_vectorize.ts` D1 resolution deleted (`const d1Map = new Map()`), metrics surface retained; no V3 replacement wired | A |
| B2 shadow_vectorize | 3 | Same deletion — chunks never resolve from D1 | A |
| C1 corpus_scale | 2 | `PRODUCTION_MUTATION_LOCKED` guard throws at module import (real-D1 ingestion script); also a real-D1 integration test | C/F |
| C2 universal_book | 1 | `extract_pdf.py` helper missing from repo (`src/ingestion/` expects it beside `extractFromPdf`) | F |
| D1 independent_retrieval | 1 | Same Group B deletion (AMF metadata-resolved chunk path) | A |
| Errors | 3 | `docs/forensics/*` contain 2 duplicate `control_plane_contract.test.ts` mirrors with broken relative imports; 1 corpus mutation-lock throw | F |

Group A/A2/E dispositions and fixes are detailed in `P0_TEST_FAILURE_FORENSICS.md`. Architectural redirect for Group A: **no static per-CVE registry may be restored into `packages/**`** — validators become evidence-aware via explicit `AuthoritativeEvidenceContext` injection; tests inject the oracle fixture.
