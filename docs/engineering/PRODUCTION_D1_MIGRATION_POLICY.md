# ZAYRON-X — Production D1 Migration Policy & State Authority

Date: 2026-09-16  
Authority: ZAYRON-X Engineering / Architecture Board  
Status: ACTIVE & ENFORCED

---

## 1. Authoritative Production Migration State

Production D1 database `zayron-x-db` (`c19c8f45-801b-4034-bd76-402e5e5389b5`) has been comprehensively audited and forensic verification was performed in Tasks 51, 52, and 53.

### 1.1 Tracked Migrations (in `d1_migrations`)
The internal Cloudflare `d1_migrations` table records exactly six migrations:
- `0000_wandering_energizer.sql` (applied 2026-08-21 13:12:43)
- `0001_evidence_ledger.sql` (applied 2026-08-28 12:21:43)
- `0002_knowledge_core.sql` (applied 2026-08-28 13:16:45)
- `0003_knowledge_chunk_provenance.sql` (applied 2026-08-28 13:24:06)
- `0004_canary_events.sql` (applied 2026-08-28 18:42:47)
- `0005_canonical_trust_state.sql` (applied 2026-08-28 18:42:47)

### 1.2 Verified Out-of-Band Migrations (Applied Structurally)
The following migrations exist structurally in Production D1 as verified by schema inspection (`sqlite_master`):
- `0002a_knowledge_documents_chunks.sql`: Objects `knowledge_documents` and `knowledge_chunks` exist and are populated.
- `0006_nvd_identity_reconciliation.sql`: Table `nvd_event_reconciliation` exists.
- `0007_event_trace.sql`: Table `event_trace` exists and contains 23,524 rows.
- `0008_canonical_article_slug.sql`: Data repair migration executed in earlier lifecycle; `articles` table present.
- `0009_dynamic_source_registry.sql`: Partial; indexes `idx_sources_status` and `idx_sources_type` exist.
- `0010_canonical_intelligence.sql`: Tables `intelligence_reports`, `intelligence_evidence`, `message_processing` exist.
- `0011_articles_canonical_event_index.sql`: Index `idx_articles_canonical_event` exists.
- `0013_read_budget_hardening.sql`: Indexes `idx_intelligence_events_status_first_seen`, `idx_ai_runs_created_at`, `idx_knowledge_chunks_doc`, `idx_articles_published_slug`, `idx_intelligence_events_created_at` exist.
- `0021_vulnerability_intelligence.sql`: Applied and verified in Task 51; `canonical_vulnerabilities`, `vulnerability_source_records`, and `idx_canonical_vulnerabilities_cve` exist.
- `0022_editorial_lineage_articles.sql`: Lineage columns present on `articles`.

### 1.3 Unapplied Migrations in Production
The following migrations are **NOT applied** to Production `zayron-x-db`:
- `0014_source_fabric_foundation.sql`: Tables (`fabric_sources`, etc.) do not exist.
- `0015_canonical_dossier_gate.sql`: Tables (`canonical_dossiers`, etc.) do not exist.
- `0016_knowledge_objects_v3_fts.sql`: Tables (`knowledge_objects_v3`, etc.) do not exist.
- `0017_knowledge_objects_v3_foundation.sql`: Not applied.
- `0018_v3_control_plane.sql`: Tables (`v3_document_identities`, etc.) do not exist.
- `0019_v3_seed_chunks.sql`: Table `v3_seed_chunks` does not exist.
- `0020_v3_seed_recovery.sql`: Not applied.

---

## 2. Mandatory Freeze Policy

> **Production D1 migration history is frozen in its current verified state. Historical d1_migrations reconciliation is not supported and must not be fabricated.**

1. **No Retrospective Insertion**: Cloudflare D1 and Wrangler do not provide an official mechanism (e.g. `--skip` or `--fake`) to mark out-of-band migrations as tracked without executing DDL. Manual `INSERT` statements into `d1_migrations` violate fail-closed sovereignty and are strictly prohibited.
2. **No Historical Re-execution**: Running `wrangler d1 migrations apply` against the root sequence would attempt to re-execute migrations starting from `0002a` or `0006`, which will either fail with schema conflicts or attempt to apply unapproved migrations (0014–0020). Blind execution of historical migrations is strictly forbidden.

---

## 3. Safe Forward Rule

1. Any future Production schema changes must use a new migration file numbered **strictly higher than the current repository maximum** (`0023_*.sql` or higher).
2. Future migrations must be strictly additive (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, or safe `ALTER TABLE ADD COLUMN`).
3. Migrations intended for Production must be explicitly vetted and applied through controlled execution, never bundled with legacy unapplied staging migrations.
