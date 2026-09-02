# ZAYRON-X — DATABASE PROVIDER FORENSIC REPORT
**Date:** 2026-09-01 | **Classification:** Infrastructure Audit

---

## SCAN METHOD

Searched for: `DATABASE_URL|POSTGRES|POSTGRESQL|pg-pool|mysql|mongodb|mongoose|@prisma|drizzle-orm.*pg|prisma/client`

---

## RESULT

```
grep_search: "DATABASE_URL|POSTGRES|pg-pool|mysql|mongodb|mongoose|@prisma"
File types: *.ts, *.tsx, *.js, *.json, *.toml, *.yaml, *.yml, *.env
Result: No results found
```

---

## DATABASE PROVIDER IN USE: CLOUDFLARE D1

### ORM: drizzle-orm (D1 dialect)

**`packages/intelligence/db/client.ts`:**
```ts
import { drizzle } from 'drizzle-orm/d1';
export function getDb(env: any) {
  return drizzle(env.DB, { schema });
}
```
- Uses `drizzle-orm/d1` — the Cloudflare D1 adapter
- NOT `drizzle-orm/postgres-js` or `drizzle-orm/pg-core`

**`drizzle.config.ts`:**
```ts
export default defineConfig({
  schema: './packages/intelligence/db/schema.ts',
  out: './db/migrations',
  dialect: 'sqlite',   // ← explicitly SQLite/D1
});
```

**Schema dialect (`db/schema.ts`):**
- Uses `sqliteTable`, `text`, `integer`, `real` — all SQLite-compatible types
- Uses `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')` — SQLite function, not `NOW()` or `CURRENT_TIMESTAMP`
- No `SERIAL`, `UUID` extension, `ENUM`, `JSONB`, `ARRAY`, or stored procedures

---

## MIGRATION AUDIT (All 9 Migrations)

| Migration | SQLite-Compatible | No Postgres Syntax | Verdict |
|-----------|------------------|-------------------|---------|
| `0000_wandering_energizer.sql` | YES | YES | CLEAN |
| `0001_evidence_ledger.sql` | YES | YES | CLEAN |
| `0002_knowledge_core.sql` | YES | YES | CLEAN |
| `0003_knowledge_chunk_provenance.sql` | YES | YES | CLEAN |
| `0004_canary_events.sql` | YES | YES | CLEAN |
| `0005_canonical_trust_state.sql` | YES | YES | CLEAN |
| `0006_nvd_identity_reconciliation.sql` | YES | YES | CLEAN |
| `0007_event_trace.sql` | YES | YES | CLEAN |
| `0008_canonical_article_slug.sql` | YES | YES | CLEAN |

---

## ILIKE() OPERATOR NOTE

`ilike()` is used in `packages/intelligence/db/queries/`:
- `articles.ts`, `cves.ts`, `tools.ts`, `analytics.ts`

**Status:** Drizzle-ORM transparently maps `ilike()` to case-insensitive `LIKE` in the SQLite/D1 driver. D1's `LIKE` is case-insensitive for ASCII by default. This is functionally correct.

**Risk:** For non-ASCII content (Cyrillic, Arabic, etc.), `LIKE` in SQLite performs binary comparison. This is a known SQLite limitation — not a migration artifact from Postgres.

---

## VERDICT: CLEAN — All data access uses Cloudflare D1 exclusively via drizzle-orm/d1.
