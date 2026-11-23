# SQLite vs Cloudflare D1 Gap Analysis

## Proven by SQLite staging

- Migration SQL parses and executes against SQLite 3.50.4.
- Existing representative V3 and FTS5 tables coexist with the new tables.
- `IF NOT EXISTS` migration execution succeeds twice.
- Foreign keys reject missing corpus/deployment references when enabled.
- Unique constraints and the seed idempotency index reject duplicates.
- Check constraints reject invalid lifecycle/predicate values.

## Still requires actual Cloudflare D1 validation

- D1's exact SQLite build and extension behavior.
- Wrangler's remote migration execution path and error reporting.
- D1 transaction/statement behavior for the complete migration.
- Foreign-key enforcement defaults and behavior under D1 runtime settings.
- D1 concurrency and retry behavior around idempotency.
- Worker binding behavior after control-plane tables exist.
- D1 limits, execution time, and schema propagation behavior.
- Production-like staging environment configuration.

The local harness is pure Python `sqlite3`, not a D1 emulator. Its success is SQL/constraint evidence only and is not production authorization or proof of Cloudflare D1 parity.
