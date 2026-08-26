# ZAYRON-X Database Architecture

**Date**: 2026-06-02
**DBA**: DeepTrace-2027 Supabase Squad
**Engine**: PostgreSQL 15 via Supabase (PgBouncer pooler, port 6543)

---

## Entity-Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│    profiles      │       │   subscribers    │
│──────────────────│       │──────────────────│
│ id (PK)          │       │ id (PK)          │
│ clearance_level  │       │ email (UNIQUE)   │
│ created_at       │       │ is_active        │
│ updated_at       │       │ created_at       │
└──────────────────┘       └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│    articles      │       │  threat_artifacts│
│──────────────────│       │──────────────────│
│ id (PK)          │──┐    │ id (PK)          │
│ title            │  │    │ title            │
│ slug (UNIQUE)    │  │    │ severity         │
│ url_hash(UNIQUE) │  │    │ cvss_score       │
│ category         │  │    │ fbr_total        │
│ tags[]           │  │    │ sector           │
│ content          │  │    │ yara_rules       │
│ is_published     │  │    │ sigma_rules      │
│ is_featured      │  │    │ raw_iocs         │
│ is_breaking      │  │    │ created_at       │
│ views            │  │    │ updated_at       │
│ author           │  │    └──────────────────┘
│ financial_expos..│  │
│ mitre_ttps[]     │  │    ┌──────────────────┐
│ iocs_json        │  │    │    trending      │
│ yara_rule        │  │    │──────────────────│
│ published_at     │  │    │ id (PK)          │
│ created_at       │  │    │ title            │
│ updated_at       │  │    │ rank             │
└─────────┬────────┘  │    │ engagement_score │
          │           │    │ article_id (FK)──┼──┐
          │           │    │ created_at       │  │
┌─────────┴────────┐  │    └──────────────────┘  │
│    analysts      │  │                           │
│──────────────────│  │    ┌──────────────────┐   │
│ id (PK)          │  │    │   raw_feeds      │   │
│ name             │  │    │──────────────────│   │
│ title            │  │    │ id (PK)          │   │
│ bio              │  │    │ source_channel   │   │
│ nationality      │  │    │ raw_content      │   │
│ specializations[]│  │    │ status           │   │
│ article_count    │  │    │ category         │   │
│ created_at       │  │    │ ai_generated_flag│   │
└──────────────────┘  │    │ prompt_tokens    │   │
                       │    │ created_at       │   │
┌──────────────────┐   │    │ promoted_at      │   │
│      cves        │   │    └──────────────────┘   │
│──────────────────│   │                           │
│ id (PK)          │   │    ┌──────────────────┐   │
│ cve_id (UNIQUE)  │   │    │     tools        │   │
│ title            │   │    │──────────────────│   │
│ description      │   │    │ id (PK)          │   │
│ severity         │   │    │ name             │   │
│ cvss_score       │   │    │ slug (UNIQUE)    │   │
│ cvss_vector      │   │    │ category         │   │
│ affected_product │   │    │ rating           │   │
│ vendor           │   │    │ github_url       │   │
│ status           │   │    │ stars            │   │
│ published_date   │   │    │ tags[]           │   │
│ created_at       │   │    │ created_at       │   │
└──────────────────┘   │    └──────────────────┘   │
                        │                           │
┌───────────────────────┴───────────────────────────┘│
│  programming_langs     │                            │
│────────────────────────│                            │
│ id (PK)                │                            │
│ name (UNIQUE)          │                            │
│ slug (UNIQUE)          │                            │
│ paradigm               │                            │
│ security_features[]    │                            │
│ created_at             │                            │
└────────────────────────┘                            │
                                                      │
  FK: trending.article_id → articles.id               │
  FK: articles → analysts (not defined in schema) ────┘
```

---

## Table Descriptions

| Table | Purpose | RLS | Key Columns |
|-------|---------|-----|-------------|
| `articles` | Primary CTI content — 40 columns covering full intelligence lifecycle | Public read, Admin write | `slug`, `category`, `is_published`, `tags[]`, `fbr_score` |
| `cves` | CVE vulnerability tracking with CVSS scores | Public read, Admin write | `cve_id`, `severity`, `cvss_score` |
| `analysts` | 21 expert analyst personas for intelligence attribution | Public read, Admin write | `name`, `nationality`, `specializations[]` |
| `raw_feeds` | Raw Telegram intelligence before AI processing | Admin only | `source_channel`, `status`, `raw_content` |
| `profiles` | User profiles with clearance levels | User own, Admin all | `clearance_level` |
| `subscribers` | Newsletter subscribers | Public insert, Admin read | `email`, `is_active` |
| `threat_artifacts` | Premium threat data with YARA/Sigma rules | Subscriber read, Admin write | `fbr_total`, `yara_rules`, `sigma_rules` |
| `tools` | Security tools directory | Public read, Admin write | `slug`, `stars`, `rating` |
| `programming_langs` | Programming language reference | Public read, Admin write | `name`, `slug`, `security_features[]` |
| `trending` | Trending articles with engagement tracking | Public read, Admin write | `article_id` (FK), `rank` |

---

## Index Strategy

All indexes use `IF NOT EXISTS` for idempotent execution.

| Index | Table | Type | Query Optimized | Expected Improvement |
|-------|-------|------|----------------|---------------------|
| `idx_articles_fts` | articles | GIN | `searchArticles()` | 200-1000ms → <50ms |
| `idx_articles_category_pub` | articles | B-tree composite | `getArticlesByCategory()`, homepage | 100-300ms → <20ms |
| `idx_cves_pub_date_severity` | cves | B-tree composite | `getCVEs()`, `getCVEsBySeverity()` | 50-200ms → <10ms |
| `idx_cves_cve_id` | cves | B-tree | `getCVEByCveId()` | Instant (UNIQUE already) |
| `idx_articles_url_hash` | articles | UNIQUE B-tree | Deduplication | Prevents duplicates |
| `idx_articles_author` | articles | B-tree | Author queries | 100-300ms → <10ms |
| `idx_articles_published_at` | articles | B-tree DESC | All listings | 100-300ms → <10ms |
| `mat_tags` | (materialized view) | — | `getAllTags()` | 500-2000ms → <5ms |

### Materialized View Refresh

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mat_tags;
```

Schedule: every 5 minutes via `pg_cron` or application-level cron.

---

## RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `articles` | Public (published only) | Admin | Admin | Admin |
| `cves` | Public | Admin | Admin | Admin |
| `profiles` | Own row + Admin all | Service role | Own row | N/A |
| `subscribers` | Admin | Anyone | N/A | Admin |
| `raw_feeds` | Admin | Admin | Admin | Admin |
| `analysts` | Public | Admin | Admin | Admin |
| `threat_artifacts` | Subscribers | Admin | Admin | Admin |
| `tools` | Public | Admin | Admin | Admin |
| `programming_langs` | Public | Admin | Admin | Admin |
| `trending` | Public | Admin | Admin | Admin |

Admin check: `(SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'`
Subscriber check: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND clearance_level IN ('SUBSCRIBER','ADMIN'))`
Service role: Bypasses RLS entirely (trusted server-side).

---

## Backup and Restore

### Via Supabase Dashboard
1. Dashboard → Database → Backups
2. Click "Create backup" for on-demand
3. Pro plan: 7 days automated backups

### Via CLI (pg_dump)
```bash
pg_dump postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres > backup.sql
```

### Restore
```bash
psql postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres < backup.sql
```

### Point-in-Time Recovery (PITR)
Available on Supabase Team plan and above. Enables restore to any point within the retention window.

---

## Migration Workflow

```
1. Edit lib/db/schema.ts       ← Change TypeScript schema
2. bun run db:generate          ← Generate SQL migration
3. Review the generated SQL     ← Check for correctness
4. bun run db:migrate           ← Apply to development database
5. Test thoroughly              ← Run test suite
6. Commit and deploy            ← CI applies migration to production
```

### Commands
```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Apply pending migrations
bun run db:push       # Push schema directly (dev only — bypasses migrations)
bun run db:studio     # Open Drizzle Studio (GUI for DB inspection)
```

---

## Connection Pooling

- **PgBouncer**: Supabase pooler on port 6543 (transaction mode)
- **Drizzle config**: `prepare: false` (required for PgBouncer transaction mode)
- **Max connections**: 8 per Worker (production), 3 per Worker (development)
- **Idle timeout**: 15s (production), 1s (development)
- **Supabase Pro limit**: 60 direct connections

### Pool Monitoring
Watch for connection exhaustion:
```sql
SELECT count(*) FROM pg_stat_activity;
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### PgBouncer Admin
```sql
SHOW POOLS;
SHOW CLIENTS;
SHOW SERVERS;
```

---

## ENUM → TEXT Migration

The original migration 0000 defined `category` as a custom PostgreSQL ENUM, but the TypeScript schema uses `text()`. Migration 0001 includes a conditional ALTER that:
1. Checks if the `category` ENUM type exists
2. Converts `articles.category` and `raw_feeds.category` from ENUM to TEXT
3. Drops the ENUM type

This is safe because:
- All query comparisons use `LOWER()` or plain equality
- No application code relies on ENUM ordering
- Validation is handled at the application layer (Zod/TypeScript)

---

## Performance Tuning Notes

- **work_mem**: Consider increasing from default 4MB to 16MB for GIN index queries
- **maintenance_work_mem**: Increase for `CREATE INDEX CONCURRENTLY` operations
- **effective_cache_size**: Set to 75% of available RAM
- **random_page_cost**: 1.1 for SSD storage (Supabase default is appropriate)
- **ANALYZE**: Run `ANALYZE articles;` after creating indexes to update statistics

---

*Prepared by DeepTrace-2027 Supabase PostgreSQL DBA Squad*
*Palo Alto, California — 2 June 2026*
