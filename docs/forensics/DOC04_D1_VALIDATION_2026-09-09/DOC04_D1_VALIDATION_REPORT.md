# DOC-04 Cloudflare D1 Isolated Validation Report

## PROVEN ON ACTUAL D1

- Target isolation: `zayron-x-preview-db` (`34962f8f-abd1-4b0b-8bd7-b4eab59bd902`) is distinct from production.
- Migration 0018 first execution succeeded through Wrangler against Cloudflare D1.
- Migration second execution succeeded and wrote zero rows.
- All eight control-plane tables and the unique seed idempotency index exist.
- D1 rejected invalid foreign keys, duplicate identities, duplicate idempotency keys, and invalid predicates.
- Synthetic staging lifecycle records linked identity, corpus, seed, deployment, and dataset state successfully.
- Production remained read-only and unchanged.

## PROVEN IN SQLITE ONLY

- In-memory SQLite harness repeatability and local contract behavior.
- Python reconciliation implementation behavior.

## UNVERIFIED

- Seed endpoint runtime execution against isolated D1.
- Worker binding/runtime integration.
- Concurrent seed request behavior.
- D1 rollback behavior under partial failure.
- Large seed batch limits and timing.
- Vectorize parity.

## LOCAL FIXES IMPLEMENTED

None during this gate. No source, migration, configuration, or corpus files were modified.

## PRODUCTION STATE

Final read-only verification: 371 V3 rows, 371 FTS rows, 286 distinct content hashes, zero migration-ledger rows, zero control-plane tables, and zero rows written. No production migration, seed, Vectorize write, or Worker deployment occurred.

## REMAINING RISKS

- The configured source-fabric Worker is production-bound, so direct seed endpoint validation was correctly blocked.
- The preview database is an existing shared preview resource rather than a newly created disposable database; synthetic records are explicitly marked staging test data.
- D1 migration success does not prove Worker runtime or large-batch operational safety.

## PRODUCTION AUTHORIZATION

`NOT AUTHORIZED`

## OVERALL STATUS

`UNVERIFIED`
