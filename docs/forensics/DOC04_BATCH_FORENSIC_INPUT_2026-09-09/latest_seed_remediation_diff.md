# Latest Seed Remediation Diff

Current DOC-04 operational changes observed in `workers/source-fabric/src/index.ts` and `workers/source-fabric/wrangler.toml`:

- Request requires target D1 identity.
- Seed claim uses conditional `NOT_STARTED → RUNNING` update.
- Non-claimable/replayed seed returns HTTP 409.
- FTS projection is deleted by object ID before insertion.
- Post-claim exceptions transition `RUNNING → FAILED`.
- Staging Worker environment binds to `zayron-x-preview-db` and uses `ENVIRONMENT=staging`.
- Staging Vectorize binding uses `zayron-doc04-staging-index`.

This is an evidence description only; no files were modified by this collection task.
