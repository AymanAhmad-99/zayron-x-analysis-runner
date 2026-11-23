# D1 AUTHORITY MATRIX
## ZAYRON-X — 2026-09-09
### Evidence: All wrangler.toml files read from repository root

---

## THE TWO D1 DATABASES

| Property | Database A | Database B |
|---|---|---|
| Name | zayron-x-db | zayron-x-intelligence-db |
| ID | c19c8f45-801b-4034-bd76-402e5e5389b5 | 91ed8f95-95ad-4451-bb18-e0d1dbadbe53 |
| Purpose | Application/frontend — intelligence articles, sources, billing, auth, legacy chunks | Source fabric — V3 knowledge objects, FTS5, source artifacts, evidence |
| Migration dir | db/migrations | db/migrations (same dir, different binding) |
| Environment | production | production |
| Evidence | wrangler.toml (root) | workers/source-fabric/wrangler.toml |

---

## BINDING MATRIX

| Resource | D1 Name | D1 ID | Binding Name | Worker/App | Config File |
|---|---|---|---|---|---|
| Root tooling (migrations CLI) | zayron-x-db | c19c8f45-... | DB | wrangler CLI (root) | wrangler.toml |
| API Worker | zayron-x-db | c19c8f45-... | DB | zayron-x-api | workers/api/wrangler.toml |
| Ingest Worker | zayron-x-db | c19c8f45-... | DB | zayron-x-ingest | workers/ingest/wrangler.toml |
| Telegram Collector DO | zayron-x-db | c19c8f45-... | DB | zayron-telegram-collector-do | workers/telegram-collector-do/wrangler.toml |
| Source Fabric Worker (prod) | zayron-x-intelligence-db | 91ed8f95-... | SOURCE_STATE | zayron-x-source-fabric | workers/source-fabric/wrangler.toml |
| Source Fabric Worker (staging) | zayron-x-preview-db | 34962f8f-... | SOURCE_STATE | zayron-x-source-fabric-staging | workers/source-fabric/wrangler.toml [env.staging] |
| Preview environment (root) | zayron-x-preview-db | 34962f8f-... | DB | wrangler preview | wrangler.toml [env.preview] |

---

## WHAT LIVES WHERE

### zayron-x-db (c19c8f45-...)
Contains tables created by db/migrations/0000 through 0020 applied via:
  npx wrangler d1 migrations apply DB

Known tables (from migration files):
- intelligence (articles/reports) — migration 0000
- evidence_ledger — migration 0001
- knowledge_documents, knowledge_chunks — migrations 0002, 0002a
- knowledge_chunk_provenance — migration 0003
- canary_events — migration 0004
- canonical_trust_state — migration 0005
- nvd_identity — migration 0006
- event_trace — migration 0007
- canonical_articles (slug) — migration 0008
- source_registry — migration 0009
- canonical_intelligence, intelligence_canonical_events — migration 0010
- articles_canonical_event_index — migration 0011
- [0012 MISSING]
- read_budget — migration 0013
- source_fabric tables — migration 0014
- dossier_gate — migration 0015
- knowledge_objects_v3 (replicated here?) — migrations 0016, 0017
- v3_control_plane — migration 0018 (UNAPPLIED)
- v3_seed_chunks — migration 0019 (UNAPPLIED)
- v3_seed_recovery — migration 0020 (UNAPPLIED)

NOTE: Migrations 0016-0017 appear to create knowledge_objects_v3 and knowledge_objects_v3_fts.
Whether these tables exist in zayron-x-db is UNKNOWN — migration history table is empty.
The d1_migrations table having 0 rows means the applied state of 0000-0017 in this DB is unverified.

### zayron-x-intelligence-db (91ed8f95-...)
Contains V3 knowledge objects as used by source-fabric.
PROVEN to contain:
- knowledge_objects_v3 — PROVEN (pre-incident: 286 rows post-deletion; 371 before)
- knowledge_objects_v3_fts — PROVEN (pre-incident: 371 rows; current state UNKNOWN after partial cleanup)
- source_artifacts — from migration 0014 (PROBABLE)
- entities, evidence — from source-fabric queue handler code
- FTS5 schema: standalone virtual table (no CONTENT= directive — confirmed from migration 0016)

---

## WHICH MIGRATIONS TARGET WHICH DATABASE

| Migration | Applied via which binding | Target DB | Applied State |
|---|---|---|---|
| 0000-0020 | `wrangler d1 migrations apply DB` (root wrangler.toml) | zayron-x-db | UNKNOWN (d1_migrations = 0 rows) |
| 0016, 0017 | Also references `SOURCE_STATE` binding in source-fabric context | zayron-x-intelligence-db | PROVEN applied (table exists) |

CRITICAL AMBIGUITY: The `migrations_dir = "../../db/migrations"` in source-fabric wrangler.toml
points to the same db/migrations/ folder. This means BOTH databases could have had the same
migrations applied via different wrangler contexts. The exact application history per database is
UNKNOWN because the d1_migrations table was empty in the checkpoint for the primary DB.

---

## SCRIPTS TARGETING WHICH DATABASE

| Script/Tool | Target DB (by evidence) | Method |
|---|---|---|
| workers/scripts/*.py (reseed, reconcile) | zayron-x-intelligence-db | Uses PILOT_INTERNAL_TOKEN against source-fabric worker |
| scripts/p4_nist_800_150_ingestion.ts | zayron-x-intelligence-db | Via source-fabric /internal/v3-pilot-d1-seed endpoint |
| npx wrangler d1 execute zayron-x-intelligence-db | zayron-x-intelligence-db (91ed8f95) | Direct CLI |
| npx wrangler d1 execute zayron-x-db | zayron-x-db (c19c8f45) | Direct CLI |
| npx wrangler d1 migrations apply DB | zayron-x-db (c19c8f45) per root wrangler.toml | Via root wrangler.toml binding |
| CF REST API /accounts/.../d1/database/c19c8f45.../query | zayron-x-db | Direct API (knowledge_objects_v3 NOT found here) |
| CF REST API /accounts/.../d1/database/91ed8f95.../query | zayron-x-intelligence-db | Direct API (knowledge_objects_v3 IS here) |

---

## V3 DATA AUTHORITY

The V3 intelligence corpus (knowledge_objects_v3, knowledge_objects_v3_fts) is authoritative
in zayron-x-intelligence-db (91ed8f95-...) via the source-fabric worker's SOURCE_STATE binding.

The same table schema ALSO exists in the migration files applied to zayron-x-db — but whether
the table is populated there is UNKNOWN.

---

## SAFETY RULE (DESIGNED — NOT DEPLOYED)

Every future mutating command targeting D1 MUST assert:

  TARGET_DATABASE_ID = [intended ID]
  TARGET_DATABASE_NAME = [intended name]
  TARGET_ENVIRONMENT = [production|staging|local]

And verify against:
  PRODUCTION_DATABASE_A_ID = c19c8f45-801b-4034-bd76-402e5e5389b5
  PRODUCTION_DATABASE_B_ID = 91ed8f95-95ad-4451-bb18-e0d1dbadbe53

Never assume a wrangler command targets a specific database without checking the active wrangler.toml context.

---

Generated: 2026-09-09T23:09:00+03:00
Evidence: All wrangler.toml files read via Get-ChildItem -Recurse -Filter wrangler.toml
