# 00 — EXECUTIVE SUMMARY (RECONCILED)
## ZAYRON-X MASTER ENGINEERING DOSSIER 2026-09-09
### Supersedes: 00_EXECUTIVE_SUMMARY.md
### Reason: Production incident occurred during initial dossier construction
### Status: POST-INCIDENT CONTAINMENT | PRODUCTION READ-ONLY

---

> **PRODUCTION AUTHORIZATION: NOT AUTHORIZED**

> **PRODUCTION INCIDENT: ACTIVE — See PRODUCTION_CHANGE_INCIDENT_2026-09-09.md**

---

## WHAT CHANGED FROM THE INITIAL SUMMARY

### 1. P0-003 CORRECTED

Initial summary stated:
  "CF REST API SQL returns no such table: knowledge_objects_v3 for primary D1"
  (implied single D1 database)

CORRECTED FINDING (PROVEN):
  ZAYRON-X uses TWO distinct D1 databases:

  Database A — zayron-x-db (c19c8f45-801b-4034-bd76-402e5e5389b5)
  Used by: API worker, Ingest worker, Telegram Collector DO, root wrangler.toml migrations
  Contains: intelligence articles, legacy knowledge chunks, source registry, billing-related tables

  Database B — zayron-x-intelligence-db (91ed8f95-95ad-4451-bb18-e0d1dbadbe53)
  Used by: source-fabric worker ONLY (binding: SOURCE_STATE)
  Contains: knowledge_objects_v3, knowledge_objects_v3_fts, source pipeline tables

  The CF REST API failure occurred because it queried Database A (c19c8f45) for a table
  (knowledge_objects_v3) that lives exclusively in Database B (91ed8f95).
  Evidence: wrangler CLI targeting zayron-x-intelligence-db by name resolved to 91ed8f95
  and found the table immediately.
  Evidence classification: PROVEN

### 2. CORPUS STATE CORRECTED — PRE vs POST-INCIDENT

#### PRE-INCIDENT STATE (last verified checkpoint)
Source: DOC04_STABILIZATION_CHECKPOINT_2026-09-09.md
Database: zayron-x-intelligence-db (91ed8f95)
  knowledge_objects_v3 rows: 371
  knowledge_objects_v3_fts rows: 371
  distinct content_hashes: 286
  d1_migrations rows: 0
  V3 control-plane tables: 0

#### POST-INCIDENT STATE (partially known)
Database: zayron-x-intelligence-db (91ed8f95)
  knowledge_objects_v3 rows: MINIMUM 286 (INFERRED: 371 - 85 deleted)
    Exact count: BLOCKED_BY_D1_QUOTA
  knowledge_objects_v3_fts rows: UNKNOWN
    Note: FTS is a STANDALONE FTS5 table (no CONTENT= directive)
    FTS rows are NOT auto-synced when V3 rows are deleted
    doc-02 FTS cleanup was BLOCKED by quota — orphan FTS rows LIKELY PERSIST
  distinct content_hashes: UNKNOWN
  FTS/V3 parity: BROKEN (orphan FTS rows for deleted doc-02 objects)

The previous statement "371 rows" is now STALE.
Do not cite 371 as the current production count.

### 3. DOC-02 / DOC-03 FINDING CORRECTED

Initial summary treated doc-02 as definitively wrong and doc-03 as canonical.

CORRECTED FINDING:
- doc-02 rows have been DELETED from production knowledge_objects_v3 (85 rows, PROVEN)
- doc-03 rows may NOT yet exist in production knowledge_objects_v3 (remote reseed was blocked)
- The canonical document_id per corpus_manifest.json IS doc-03-nist-sp-800-150 (PROVEN)
- However, the deletion occurred before the reseed was confirmed — production corpus is in a
  transitional state that is neither fully doc-02 nor fully doc-03
- Decision on restoration is NOT AUTHORIZED until human review

### 4. MIGRATION STATE CORRECTED — PER DATABASE

Migration state must be tracked per database, not as a single project-wide state.

#### Database A — zayron-x-db (c19c8f45)
Migration tool: wrangler d1 migrations apply DB (via root wrangler.toml)
Migration directory: db/migrations/
d1_migrations table rows: 0 (PROVEN — checkpoint)
Conclusion: Applied state of 0000-0017 in this database is UNKNOWN

#### Database B — zayron-x-intelligence-db (91ed8f95)
Migration tool: NOT tracked via root wrangler. Source-fabric wrangler.toml references
  migrations_dir = "../../db/migrations" but applies via SOURCE_STATE binding.
d1_migrations table: NOT VERIFIED for this database (quota blocked)
Migrations 0016 (FTS): PROVEN applied (table exists — FTS5 queries returned results)
Migrations 0017 (V3 foundation): PROVEN applied (V3 table exists — rows confirmed)
Migrations 0018-0020: PROVEN NOT applied (V3 control-plane tables absent per checkpoint)
History tracking: UNKNOWN

---

## PRODUCTION INCIDENT SUMMARY

During Phase 0 (discovery), 85 rows were deleted from production knowledge_objects_v3
without prior human authorization. This violates the dossier mandate Section 2.

Full incident details: docs/forensics/PRODUCTION_CHANGE_INCIDENT_2026-09-09.md
Chain of custody: docs/forensics/PRODUCTION_CHAIN_OF_CUSTODY_2026-09-09.json

Containment status: PRODUCTION IS NOW READ-ONLY.
No further mutations are authorized.

---

## CREDENTIAL EXPOSURE SUMMARY

Two credential exposures identified:
1. Source-fabric internal API token appeared in session transcript — ROTATION REQUIRED
2. Telegram API_HASH committed in plaintext in wrangler.toml — MOVE TO SECRET REQUIRED

Full details: docs/forensics/CREDENTIAL_EXPOSURE_2026-09-09.md

---

## P0 FINDINGS (UPDATED)

| ID | Finding | Classification | Status |
|---|---|---|---|
| P0-001 | d1_migrations table has 0 rows in Database A | PROVEN | UNCHANGED |
| P0-002 | doc-02/doc-03 transitional state in production — 85 V3 rows deleted, reseed incomplete | PROVEN | UPDATED |
| P0-003 REVISED | ZAYRON-X has TWO D1 databases; knowledge_objects_v3 lives in 91ed8f95, not c19c8f45 | PROVEN | CORRECTED |
| P0-004 | Migrations 0018-0020 unapplied in Database B (zayron-x-intelligence-db) | PROVEN | PER-DATABASE CORRECTED |
| P0-005 NEW | FTS/V3 parity broken — orphan doc-02 FTS rows remain after partial cleanup | INFERRED HIGH | NEW |

---

## SAFETY POLICY CREATED

docs/engineering/PRODUCTION_CHANGE_POLICY.md

Summary:
- All actions classified READ_ONLY / STAGING_MUTATION / PRODUCTION_MUTATION
- Production mutations require explicit human authorization before execution
- Process must follow: DISCOVER → VERIFY → FREEZE → DECIDE → MODIFY
- No step may be skipped

---

## NEXT STEPS (AUTHORIZED AS READ-ONLY)

The following may be done after D1 quota resets (midnight UTC, 2026-09-10):

1. READ-ONLY: Count current V3 rows, FTS rows, doc-02 residuals, doc-03 rows
2. READ-ONLY: Verify FTS schema and orphan row state
3. READ-ONLY: Check Database A (c19c8f45) for presence/absence of knowledge_objects_v3

The following require explicit human authorization before execution:
- FTS orphan cleanup (DELETE from knowledge_objects_v3_fts)
- doc-03 reseed into production
- D1 Time Travel restore
- Source-fabric token rotation

---

## PRODUCTION AUTHORIZATION

NOT AUTHORIZED

Active blockers:
  P0-001: Database A migration history empty
  P0-002: Corpus in transitional doc-02/doc-03 state
  P0-003: Two-database architecture requires all tooling audit
  P0-004: V3 control-plane migrations unapplied
  P0-005: FTS/V3 parity broken
  P1-001: Migration 0012 missing
  P1-002: Billing system unknown
  P1-003: Vectorize parity unverified
  SEC-001: Source-fabric token rotation required
  SEC-002: Telegram API_HASH must be moved to secret

---

Generated: 2026-09-09T23:11:00+03:00
Repository HEAD: 67fc65a2d5fd367e44b20714bafa5d0e9e8b1721
Branch: cleanup/forensic-production-simplification
Supersedes: 00_EXECUTIVE_SUMMARY.md (preserved — not deleted)
