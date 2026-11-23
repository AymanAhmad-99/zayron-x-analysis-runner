# 00 — EXECUTIVE SUMMARY
## ZAYRON-X MASTER ENGINEERING DOSSIER 2026-09-09
### Evidence Classification: FORENSIC BASELINE | Phase 0

> **PRODUCTION AUTHORIZATION: NOT AUTHORIZED**

---

## 1. WHAT ZAYRON-X IS

ZAYRON-X is a Cloudflare-native cyber threat intelligence (CTI) platform in active development. It ingests security intelligence from ~40 declared sources, produces normalized knowledge objects, performs hybrid FTS5+Vectorize retrieval, and publishes intelligence reports to a Next.js frontend at https://zayron-x.co

**Monorepo structure:**
- 1 frontend app (apps/web — Next.js, 552 files)
- 5 Cloudflare Workers (api, ingest, source-fabric, nvd-candidate-trigger, ready-candidate-trigger)
- 1 Durable Object worker (telegram-collector-do)
- 1 intelligence package (packages/intelligence, 79 files)
- 1 shared D1 database (zayron-x-intelligence-db, c19c8f45-801b-4034-bd76-402e5e5389b5)
- 1 R2 bucket (zayron-x-storage)
- 1 Vectorize index (zayron-knowledge-index)
- 21 database migrations (0000-0020, gap at 0012)
- 34 test files, 100 scripts

**Git HEAD:** 67fc65a2d5fd367e44b20714bafa5d0e9e8b1721
**Active branch:** cleanup/forensic-production-simplification
**Evidence classification:** PROVEN

---

## 2. INTENDED vs IMPLEMENTED vs DEPLOYED

| Dimension | State | Confidence |
|---|---|---|
| Intended | Premium AI CTI platform, 40 live sources, hybrid retrieval, subscriptions | PROBABLE |
| Implemented | Corpus v3 (371 rows), hybrid FTS5 search, source-fabric worker, Next.js UI | STRONGLY SUPPORTED |
| Deployed | Workers deployed, frontend at zayron-x.co | PROBABLE |
| Production-ready | NO — billing unknown, doc ID drift, migration history empty | PROVEN DEFICIENCIES |

---

## 3. DATABASE STATE (PROVEN)

Source: DOC04_STABILIZATION_CHECKPOINT_2026-09-09.md

- knowledge_objects_v3: 371 rows
- knowledge_objects_v3_fts: 371 rows
- Distinct content hashes: 286
- d1_migrations: 0 rows — P0 BLOCKER
- V3 control-plane tables: 0 — migrations 0018-0020 unapplied

NOTE: 371 rows / 286 distinct hashes = 85 duplicate hash rows.
Explained by doc-02/doc-03 ID drift: 85 NIST objects seeded under both IDs.

---

## 4. P0 FINDINGS (PROVEN)

| ID | Finding | Evidence |
|---|---|---|
| P0-001 | d1_migrations table has 0 rows — schema applied without migration tracking | Checkpoint doc |
| P0-002 | doc-02/doc-03 document ID drift — 85 duplicate hash rows in production D1 | P4 pipeline |
| P0-003 | CF REST API SQL returns "no such table: knowledge_objects_v3" for primary D1 | This session |
| P0-004 | Migrations 0018-0020 unapplied — V3 control plane absent from production | Checkpoint |

---

## 5. P1 FINDINGS

| ID | Finding | Confidence |
|---|---|---|
| P1-001 | Migration 0012 missing — sequence gap 0011-0013 | PROVEN |
| P1-002 | Billing system status UNKNOWN | UNKNOWN |
| P1-003 | Vectorize parity unverified — 286 unique hashes, Vectorize count unknown | UNKNOWN |
| P1-004 | Remote reseed blocked by WAF HTTP 403 1010 | PROVEN |
| P1-005 | telegram-collector-do/wrangler.toml has uncommitted modifications | PROVEN |
| P1-006 | Active branch is not main or production | PROVEN |
| P1-007 | SOURCE_ACTIVATION_ENABLED = "false" — all source activation disabled | PROVEN |

---

## 6. CLOUDFLARE INFRASTRUCTURE

| Resource | Name | ID | Status |
|---|---|---|---|
| D1 prod | zayron-x-intelligence-db | c19c8f45-801b-4034-bd76-402e5e5389b5 | ACTIVE |
| D1 preview | zayron-x-preview-db | 34962f8f-abd1-4b0b-8bd7-b4eab59bd902 | UNKNOWN |
| R2 | zayron-x-storage | STORAGE | ACTIVE |
| Vectorize | zayron-knowledge-index | VECTORIZE | ACTIVE (parity UNVERIFIED) |
| Queue | zayron-ingest-queue | INGEST_QUEUE | UNKNOWN |
| Queue | zayron-publish-queue | PUBLISH_QUEUE | UNKNOWN |
| AI | Workers AI | AI | ACTIVE |
| Domain | zayron-x.co | — | STRONGLY SUPPORTED |

---

## 7. MIGRATION INVENTORY

| File | Applied | Risk |
|---|---|---|
| 0000-0017 | UNKNOWN (history empty) | Various |
| 0012 | MISSING | P1 |
| 0016 (FTS) | PROVEN applied | CRITICAL |
| 0017 (V3 foundation) | PROVEN applied | CRITICAL |
| 0018 (control plane) | PROVEN NOT applied | P0 |
| 0019 (seed chunks) | PROVEN NOT applied | P0 |
| 0020 (seed recovery) | PROVEN NOT applied | P0 |

---

## 8. CURRENT SESSION P4 STATUS

Ingesting NIST SP 800-150 as corpus document #2.
- Local: 170 NIST rows (85 doc-02 + 85 doc-03)
- Remote: 85 doc-02 rows present, doc-03 reseed BLOCKED (WAF 403)
- Action required: Delete doc-02 from remote via wrangler CLI, reseed doc-03

---

## 9. MOST IMPORTANT 10 FINDINGS

1. d1_migrations empty — no migration history (P0-001)
2. doc-02/doc-03 ID drift — 85 duplicate rows in production (P0-002)
3. CF REST API cannot see knowledge_objects_v3 — correction blocked (P0-003)
4. Migrations 0018-0020 unapplied — V3 governance absent (P0-004)
5. Migration 0012 missing — permanent gap (P1-001)
6. Source activation disabled — no live ingestion (P1-007)
7. Vectorize parity unverified (P1-003)
8. Active branch not main/production (P1-006)
9. Billing system unknown (P1-002)
10. WAF blocks Python tooling from remote ops (P1-004)

---

## 10. EASIEST HIGH-VALUE 10 FIXES

1. Delete doc-02 via wrangler CLI (XS)
2. Reseed doc-03 via bun fetch with correct headers (XS)
3. Run wrangler d1 migrations list (XS)
4. Verify Vectorize count via CF API (XS)
5. Enforce canonical document_id via corpus_manifest lookup (S)
6. Document migration 0012 gap (XS)
7. Grep billing subsystem to establish state (S)
8. git diff main to active branch (XS)
9. Re-enable source health monitoring (S)
10. Clarify knowledge_objects_v3 CF REST API discrepancy (XS)

---

## NEXT GATE

GATE-P4-REMEDIATION: Correct doc-02/doc-03 ID drift in remote D1.

---

## PRODUCTION AUTHORIZATION

NOT AUTHORIZED

Blockers: P0-001, P0-002, P0-003, P0-004, P1-001, P1-002, P1-003, P1-006

Generated: 2026-09-09
Repository HEAD: 67fc65a2d5fd367e44b20714bafa5d0e9e8b1721
Branch: cleanup/forensic-production-simplification
