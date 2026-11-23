# MASTER RECOVERY BASELINE (2026-09-18, re-verification pass)

## Repository
| Item | Value |
|---|---|
| Branch | `cleanup/forensic-production-simplification` |
| HEAD | `17f197c27f5092fcf6fbcbfe6462cc0603dd2785` |
| Dirty paths | 1,087 (pre-existing, includes 753-file staged changeset — IMMUTABLE per Phase 0 rules; nothing staged/committed/discarded by this pass) |
| This pass added | `packages/intelligence/src/engine_v2/{enrichment.ts,types.ts,index.ts,claims.ts,compiler.ts}` edits; `tests/fixtures/kev_evidence_fixture.ts` (new); `tests/unit/p01_evidence_enrichment.test.ts` (new); two test files updated to inject evidence ports |

## Live Cloudflare account (authoritative, re-read 2026-09-18)
- **14 Workers** (see MASTER_LIVE_CLOUDFLARE_INVENTORY for full detail). 4 not reproducible from repo.
- **D1**: `zayron-x-db` (prod, 100MB), `zayron-x-preview-db`, `zayron-x-intelligence-db` (fabric).
- **Queues**: 8 (2 with no consumers: `zayron-x-source-analysis`, `zayron-x-source-publication`). No DLQ configured on any queue.
- **Cron schedules**: ZERO across all 14 workers (re-verified live this pass).
- **DO**: `TelegramCollectorDO` (SQLite, shard-per-collector).
- **Vectorize**: `zayron-knowledge-index` (+ staging index in source-fabric).

## Production D1 truth (re-verified this pass)
- `d1_migrations` = **6 applied** (repo has 25) — migration drift CONFIRMED live.
- No `kev_state`/EPSS tables exist (nothing wired to real KEV/EPSS in DB).
- `vulnerabilities`: 1,238 rows, **1,238 null cvss_score, 1,238 null epss_score**.
- Canonical core (`canonical_vulnerabilities`, `vulnerability_source_records`, `intelligence_reports`): **0 rows**.
- `articles`: 2 (1 published). Last pipeline activity: **2026-09-12 09:52:07** (dormant).

## Forensic rules in force
- No destructive DB operations this phase (no drops; classification-first per §17).
- Preview/production isolation defects documented, not "fixed" by config guessing (§23 → SECURITY_MODEL).
- Pre-existing changeset untouched; all new work is additive files/edits listed above.
