# DOC-04 Control-Plane Staging Validation — 2026-09-09

## Migration analyzed

`db/migrations/0018_v3_control_plane.sql`

All 9 statements are `CREATE TABLE IF NOT EXISTS` or `CREATE UNIQUE INDEX IF NOT EXISTS`.
They are additive, idempotent, and do not contain `ALTER`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, or `PRAGMA` statements.

Created tables:

`v3_document_identities`, `v3_document_identity_relations`, `v3_corpus_revisions`, `v3_corpus_documents`, `v3_ingestion_revisions`, `v3_seed_revisions`, `v3_deployment_revisions`, `v3_production_dataset_states`.

Created index: `idx_v3_seed_target_idempotency`.

## Staging environment

Disposable in-memory SQLite 3.50.4 with foreign keys enabled. Existing representative `knowledge_objects_v3` and `knowledge_objects_v3_fts` tables were created before applying the migration. No Cloudflare or production endpoint was used for staging writes.

## Results

- First migration execution: PASS.
- Second migration execution: PASS.
- Idempotency: PASS.
- Existing V3/FTS compatibility: PASS; existing tables remained present and untouched.
- Valid identity, corpus, document link, seed, deployment, and dataset records: accepted.
- Duplicate identity: rejected by unique document identity constraint.
- Invalid relationship: rejected by predicate check constraint.
- Seed with nonexistent corpus: rejected by foreign key.
- Duplicate seed idempotency key: rejected by unique index.
- Deployment with nonexistent corpus: rejected by foreign key.

## Seed integration

The seed route requires corpus revision ID, seed revision ID, object-set digest, expected count, and idempotency key. It queries the control-plane records before any schema initialization or object write. Missing control-plane tables or unapproved/mismatched revisions therefore reject the request. Dry-run validation occurs only after these checks and before writes.

## Production read-only verification

Production D1 remained unchanged: 371 V3 rows, 371 FTS rows, 286 distinct content hashes, zero `d1_migrations` rows, zero V3 control-plane tables, and zero rows written by the verification query.

## Files modified

- `workers/source-fabric/src/index.ts`
- `workers/scripts/v3_reconcile_readonly.py`
- `workers/scripts/validate_control_plane_staging.py`
- `docs/forensics/doc04_control_plane_staging_validation_2026-09-09.json`
- This report and prior DOC-04 forensic artifacts.

## Tests executed

- Staging migration/constraint harness: PASS.
- Control-plane contract tests: 7 passed.
- Reconciliation utility: PASS, local-only status `UNVERIFIED` without a D1 export.
- Python syntax validation: PASS.
- Repository typecheck: pre-existing failures remain.
- Repository lint: previously timed out; not treated as pass.

## Unresolved and authorization boundary

Historical seed provenance, historical deployment provenance, canonical doc-02/doc-03 identity, and complete Vectorize parity remain unknown. No historical facts were backfilled. Production application of migration 0018, production seeding, corpus promotion, identity merge/deletion, and Vectorize synchronization remain NOT AUTHORIZED.
