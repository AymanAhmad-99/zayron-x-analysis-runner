# MASTER D1 RECONCILIATION (live-verified 2026-09-18)

## Migration drift (CONFIRMED live)
- Production `d1_migrations`: **6** (0000–0005). Repo `db/migrations/`: **25 files** (0000–0023 + 0002a).
- Tables from migrations 0006–0023 EXIST in production → schema mutated by `workers/scripts/*.py` outside the journal.
- Drizzle `meta/_journal.json` lists only 0000 — two competing migration regimes.
- Preview DB: 30 tables, **0** journaled migrations. Fabric DB: own journal (source-fabric migrations dir).

## Production row counts (key tables)
| Table | Rows | Note |
|---|---|---|
| vulnerabilities | 1,238 | all null CVSS/EPSS |
| articles | 2 | 1 published |
| reports / intelligence_reports / canonical_vulnerabilities / vulnerability_source_records / intelligence_evidence | 0 | canonical core empty |
| relations | 5,283 | no provenance columns |
| source_messages | 4,041 | telegram era |
| evidence / evidence_ledger / intelligence_evidence | 5 / — / 0 | 3 evidence stores |
| event_trace | 23,524 | dormant since 2026-09-12 |
| knowledge_chunks / documents | 33,540 / 75 | v3 core |
| `*_quarantine_bak` | 9 tables | backup remnants |
| cves | **does not exist** | prior concern contradicted |

## Classification (§17 — no drops this phase)
| Object | Class |
|---|---|
| `*_quarantine_bak` (9) | ARCHIVE→DELETE later (R2 backup first) |
| evidence vs evidence_ledger vs intelligence_evidence | DUPLICATE — consolidate to 1 |
| reports vs intelligence_reports vs articles | DUPLICATE — 1 publication owner |
| canary_events | MERGE into identity model |
| users/subscriptions/payment_sessions/posts/watchlists | FREEZE (foreign product layer) |
| kev_state, epss_scores, processing_runs | **MISSING — create (P1)** |
| fabric DB claims/evidence/publications model | KEEP as canonical-core blueprint |

## Ownership (single owner per object)
CVE identity → D1 canonical_vulnerabilities (empty; to be filled by P1 core) · raw source payload → R2 · evidence → D1 evidence (single store target) · claims → D1 (fabric shape) · publication → articles (rendered) + reports (structured) · processing state → processing_runs (missing) · embeddings → Vectorize (derivable) · collection state → TelegramCollectorDO.
