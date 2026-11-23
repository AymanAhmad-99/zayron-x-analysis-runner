# MASTER RECOVERY ROADMAP

## Priorities
### P0 — Security / Data Integrity / Production Truth (blocking everything)
| Item | Status | Action |
|---|---|---|
| Static KEV dictionary | ✅ DONE this pass | evidence ports; fixture isolated; grep-clean |
| Fabricated EPSS | ✅ DONE this pass | null/UNKNOWN semantics + compiler fix |
| Text→KEV fabrication | ✅ DONE this pass | demoted to telemetry |
| Web→preview API URL | OPEN | env-driven base + prod config restore (config-only) |
| Preview can write prod R2/Vectorize | OPEN | per-env redeclaration (config-only, next deploy) |
| Publish-queue frozen no-ack | OPEN | ack + QUARANTINED state |
| Direct-to-prod SQL scripts | OPEN | freeze workers/scripts SQL paths |
| Zero crons | OPEN | add 15-min discovery cron (after no-ack fix) |
| Orphan workers ×4 | OPEN | inspect → export → delete |
| 56% consumer failure rate | OPEN | root-cause via event_trace error codes before any deploy |

### P1 — Canonical CVE Core (only when P0 clean)
1. Migrations: reconcile 0006–0023 (diff → idempotent rewrite → one journal). 2. New tables: kev_state, epss_scores, processing_runs (+ claims consolidation). 3. Build `zayron-x-processor` consuming the queue; wire existing structured parsers as mappers (capability exists — MASTER_DATA_FIDELITY). 4. KEV/EPSS adapters fetch→D1→port. 5. Golden CVE suite (16 fixtures incl. real KEV slices) + semantic invariants I1–I8 with mutation tests. 6. Kill parallel brains (engine v1, analyst-path for CVE, in-collector analysis) — tests keep adapters. 7. Single migration to consolidate evidence/publication stores.

### P2 — Intelligence Platform
API contract DTOs + envelope + contract tests · knowledge corpora consolidation (keep v3) · source-fabric merge · observability completion (model_version in traces) · authorization for commercial API.

### P3 — Advanced CTI Correlation
Campaign/actor/attack graph algorithms on the relationship model · ransomware-as-claims · cross-domain correlation · Vectorize for semantic retrieval at scale.

## Phase sequencing (§64)
A ✅ re-verified · B ✅ live inventory · C ✅ D1 reconciliation · D = P0 config fixes · E ✅ static intel (S1–S3 done; S4–S6 in P1) · F = invariants with golden suite (P1) · G ✅ decision (Option A) · H/I = P1 build · J = real-world canary proof · K = launch baseline · L–N = domains · O = OSINT deepening.

## Extensibility test (target state)
"Add a CVE source" = adapter + registration + fixtures (3 files). "Add malware" = domain model + mappers + fixtures (shared infra untouched). "Add campaign correlation" = algorithm over relationship store. No processor rewrites. (Today: 6+ files across 3 subsystems + hidden gates.)

## "Why did this CVE fail?" (§40) — answerable in minutes when P1 lands
```sql
SELECT stage, status, attempt, started_at, duration_ms, error_code, error_message
FROM processing_runs WHERE subject_id = 'CVE-X' ORDER BY started_at;
```
plus raw payload in R2 by (source, external_id, content_hash); evidence via claim joins.
