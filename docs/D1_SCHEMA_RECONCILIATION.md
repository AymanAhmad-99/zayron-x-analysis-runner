# D1 SCHEMA RECONCILIATION — ZAYRON-X

Comparison: REPOSITORY (`db/migrations` + drizzle schema) vs PRODUCTION (`zayron-x-db`) vs PREVIEW (`zayron-x-preview-db`) vs FABRIC (`zayron-x-intelligence-db`) vs MIGRATION HISTORY. Live evidence gathered read-only 2026-09-18. **No schema was modified.**

---

## 1. Migration journal vs reality (production)

| Repo migration | In production `d1_migrations`? | Table exists in production? |
|---|---|---|
| 0000_wandering_energizer | ✅ applied 2026-08-21 | ✅ |
| 0001_evidence_ledger | ✅ 2026-08-28 | ✅ (`evidence_ledger` present; also separate `evidence`) |
| 0002_knowledge_core | ✅ 2026-08-28 | ✅ |
| 0002a_knowledge_documents_chunks | ❌ | ✅ (tables exist) |
| 0003_knowledge_chunk_provenance | ✅ 2026-08-28 | ✅ |
| 0004_canary_events | ✅ 2026-08-28 | ✅ |
| 0005_canonical_trust_state | ✅ 2026-08-28 | ✅ |
| 0006–0023 (17 migrations) | ❌ **never journaled** | ✅ most tables exist anyway |

**Diagnosis:** production schema was mutated **outside the migration system** (matching `workers/scripts/*.py` — `reset_production_d1.py`, `structural_knowledge_ingest.py`, `reconcile_v3_seed.py`, etc.). 19 migrations are simultaneously "unapplied" and "already reflected" — applying them via `wrangler d1 migrations apply` now is UNSAFE (they are not idempotent and will conflict with the mutated state). The migration ledger is not a trustworthy record of production.

Also: `db/migrations/meta/_journal.json` (drizzle) lists ONLY 0000 — drizzle-kit and wrangler journals disagree; two competing migration regimes exist.

## 2. Table inventory (production, 51 tables)

**Intelligence core:** `intelligence_events` (2), `articles` (2), `reports` (0), `intelligence_reports` (0), `vulnerabilities` (1,238), `canonical_vulnerabilities` (0), `vulnerability_source_records` (0), `intelligence_evidence` (0), `evidence` (5), `evidence_ledger`, `canary_events` (0), `source_messages` (4,041), `sources` (32), `relations` (5,283), `malware` (5), `actors` (9), `campaigns` (2), `iocs` (0), `threat_iocs`, `ttp_mappings`, `nvd_event_reconciliation` (4), `social_publications` (0), `social_assets`.

**Knowledge core:** `knowledge_documents` (75), `knowledge_chunks` (33,540), `knowledge_artifacts`, `knowledge_jobs`, `knowledge_processing_batches`.

**Ops/state:** `event_trace` (23,524), `jobs` (0), `message_processing` (0), `audit_events`, `feature_usage`, `zero_defect_audit_log` (4), `alerts`.

**Business/e-commerce (appears foreign to CTI core):** `users`, `organizations`, `subscriptions`, `payment_sessions`, `posts`, `watchlists`.

**Backup remnants (should not exist in prod):** `alerts_quarantine_bak`, `articles_quarantine_bak`, `intelligence_events_quarantine_bak`, `intelligence_reports_quarantine_bak`, `iocs_quarantine_bak`, `social_assets_quarantine_bak`, `ttp_mappings_quarantine_bak` (7+ backup tables).

**Named in prompt, verdict:** `cves` — **does not exist** (prior concern CONTRADICTED BY CURRENT EVIDENCE). `canonical_vulnerabilities` + `vulnerability_source_records` + `intelligence_evidence` — exist, **empty** (canonical core never wrote).

## 3. Key column-level observations (live)

- `articles`: 23 cols incl. `is_published`, `canonical_intel_event_id`, `fbr_score`, `ai_summary` — editorial schema, NOT the structured canonical report schema. Publication truth = `articles.is_published` (+ `reports`/`intelligence_reports` empty alternates). **Three report tables, one used.**
- `vulnerabilities`: flat legacy shape (`cve_id, severity, cvss_score, cvss_vector, epss_score, is_exploited_in_wild, affected_vendor, affected_product, patch_url`) — no evidence/claim/assessment linkage; all 1,238 rows `cvss_score=NULL, epss_score=NULL`, all `is_exploited_in_wild=1` in samples (text-extraction artifact).
- `event_trace`: real lifecycle table (trace_id, event_id, stage, status, attempt, started_at, completed_at, duration_ms, resource_id, error_code, error_message) — the only observability backbone; used only by api paths, not by ingest consumer stages.
- `sources`: `cisa-rss` registered with `source_type='telegram'` (registration bug), 31 telegram sources + nvd-api + cisa-kev.

## 4. Preview DB (`zayron-x-preview-db`)

30 tables; **0 rows in `d1_migrations`** — schema created by deploy-time drift or scripts, not migrations. Bound as `DB` by ALL preview/staging envs including source-fabric-staging (cross-worker shared preview DB). Cannot be treated as a reproducible environment; it is a second mutated snowflake.

## 5. Fabric DB (`zayron-x-intelligence-db`)

21 objects: `fabric_sources`, `source_endpoints`, `source_artifacts`, `collection_runs`, `pipeline_runs`, `analysis_claims`, `evidence`, `entities`, `relations`, `knowledge_refs`, `knowledge_objects_v3` (+FTS5 shadow tables), `publications`, `publication_candidates`, `publication_revisions`, `d1_migrations`.

**Verdict:** a THIRD, better-designed relational plane (claims/evidence/publications separated) that the main pipeline does not use. It is the de-facto schema of the future canonical core — but it is bound only by source-fabric, whose analysis/publication queues have no consumers.

## 6. Suspected legacy / dangerous operations

| Object | Status | Danger |
|---|---|---|
| `*_quarantine_bak` (7+) | legacy backup remnants | DROP only after dated backup export to R2 |
| `evidence` vs `evidence_ledger` vs `intelligence_evidence` | 3 evidence stores, 2 active-ish | consolidation required before any drop |
| `reports` vs `intelligence_reports` vs `articles` | 3 publication stores | publication owner must be declared (see PUBLISHING section of final report) |
| `users/subscriptions/payment_sessions/posts/watchlists` | business schema in intel DB | likely from first-generation product; freeze, do not delete yet |
| pending migrations 0006–0023 | unapplied AND already-mutated | **DO NOT apply wholesale**; requires per-migration diff + idempotent rewrite |

## 7. Reconciliation plan (ordered, non-destructive)

1. Freeze all direct-to-prod D1 scripts (`workers/scripts/*.py` SQL paths) — they are the root cause of ledger divergence.
2. Export full schema+data snapshot of prod + preview to R2 (dated).
3. Generate per-migration diff (repo migration SQL vs live schema via `sqlite_master` + `pragma_table_info`) → classify: ALREADY-APPLIED (mark applied), CONFLICTED (rewrite idempotent), STILL-NEEDED (apply), OBSOLETE (retire file).
4. Adopt ONE journal (wrangler d1_migrations; delete drizzle journal or generate from it) and ONE migrations directory shared by all workers.
5. Consolidate evidence/report/event tables toward the fabric-DB shape as the canonical core comes online (single writer per table).
6. Only then: drop `_bak` tables with verified R2 backup + rename period.
