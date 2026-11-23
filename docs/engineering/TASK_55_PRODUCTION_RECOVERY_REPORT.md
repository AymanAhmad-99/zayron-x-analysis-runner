# ZAYRON-X — Production Recovery, DLQ, and Replay Safety Audit

**Document Authority:** ZAYRON-X Engineering & SRE Board  
**Target Resource:** Production Ingest & Distribution Subsystems  
**Date:** 2026-09-16  
**Status:** VALIDATED (FAIL-CLOSED)

---

## 1. Executive Status
An audit and runtime analysis of the Production ingestion failure, retry, dead-letter queue (DLQ), and replay recovery pathways was conducted under fail-closed verification standards.

- **Overall Recovery Status:** `RETRIES_ONLY_NO_DLQ`
- **DLQ Operational Status:** `NO_DLQ_CONFIGURED`
- **Retry Mechanism:** `RETRIES_CONFIGURED_AND_TRACED` (max_retries = 3 at Cloudflare Queue layer; 2 attempts in worker handler loop)
- **Replay Safety Status:** `PREVIEW_ONLY_BLOCKED_IN_PRODUCTION`
- **Production Data Mutation:** `NO` (all baseline production counts preserved exactly)

---

## 2. Production Queue Configuration

Authoritative Cloudflare Queue inspection of `zayron-ingest-queue` and `zayron-publish-queue` across `wrangler.toml` and remote bindings:

| Setting | `zayron-ingest-queue` (Prod) | `zayron-publish-queue` (Prod) |
| :--- | :--- | :--- |
| **Queue Name** | `zayron-ingest-queue` | `zayron-publish-queue` |
| **max_batch_size** | `10` | `10` |
| **max_batch_timeout** | `30` seconds | `30` seconds (consumer) / 5s (root) |
| **max_retries** | `3` | `3` |
| **Dead-Letter Queue (DLQ)** | **NONE** (unconfigured in Wrangler & Cloudflare Queue) | **NONE** |
| **Producers** | `zayron-x-api`, `zayron-x-ingest` (2 total) | `zayron-x-api`, `zayron-x-ingest` (2 total) |
| **Consumers** | `zayron-x-ingest` (1 total) | `zayron-x-api` (1 total) |

---

## 3. Failure & Retry Model Matrix

Based on runtime tracing and codebase analysis (`workers/ingest/src/index.ts` lines 199–990):

| Scenario | Consumer Behavior | Max Retries | Acknowledged? | Quarantined? | DLQ? | Duplicate Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A. Normalization Failure** | Caught by outer `try/catch`, logged as `CONSUMER/FAILED` in `event_trace`. | 2 attempts in Worker logic (`msg.retry()` if `attempts < 2`), then dropped (`msg.ack()`). | Yes, after attempt 2. | No | No (dropped) | None |
| **B. Entity Persistence Failure** | D1 execution throws, logged in `event_trace`. | Worker retries once (`msg.attempts < 2`). | Yes on 2nd failure. | No | No | None (transaction/insert aborted) |
| **C. Relation Persistence Failure** | Caught in loop, skips to catch block. | Retried once. | Yes on 2nd failure. | No | No | Partial graph relations may remain |
| **D. Transient Downstream Failure (AI/Vectorize)** | Vectorize errors are explicitly caught (`try/catch`) and logged non-fatally without aborting ingestion. AI failures fallback to summary defaults. | 0 (treated as non-fatal degradation). | Yes (`msg.ack()`). | No | No | None |
| **E. Repeated Message Delivery** | Evaluated at Step 1: `SELECT id FROM source_messages WHERE (source_id = ? AND external_message_id = ?) OR content_hash = ?`. | N/A | Yes (`msg.ack()`), logged as skipped duplicate. | No | No | None (Idempotent bypass) |
| **F. Partial Persistence + Retry** | If crash occurs after `intelligence_events` insert but before queue ack: retry enters Step 1 dedup or corroboration branch. | Retried up to 2 times. | Yes upon success or max attempt. | Yes (trust gate marks `QUARANTINED`). | No | Low: D1 unique constraints on `cve_id`, `slug`, `external_message_id` guard core objects. |

---

## 4. Replay Safety Assessment

The runtime entrypoint `IngestWorker.replaySourceMessage` (`workers/ingest/src/index.ts` line 995) was audited:
1. **Environment Gate:** Explicitly fails closed:
   ```typescript
   if (this.env.ENVIRONMENT !== 'preview') throw new Error('Replay is available only in Preview');
   ```
2. **Production Status:** Replay capability is strictly `PREVIEW_ONLY`. Production calls reject immediately.
3. **Attempt Limit:** Bounded by `event_trace` inspection (`attempt > 6` throws `Replay attempt limit exhausted`).
4. **Idempotency on Replay:** 
   - Vulnerabilities: Protected by `ON CONFLICT(cve_id) DO UPDATE`.
   - Relations: Pre-checked with `SELECT id FROM relations WHERE source_entity_type = ...` before insert.

---

## 5. Idempotency & Database Constraint Matrix

| Entity / Object | Uniqueness Enforcement | Mechanism / Constraint | Classification |
| :--- | :--- | :--- | :--- |
| **Source Messages** | Primary Key `id`; query check `(source_id + external_message_id) OR content_hash` | D1 autoindex PK + application SELECT query | `PARTIAL` (App-enforced dedup, DB PK) |
| **Evidence** | Primary Key `id`; check `SELECT id FROM evidence WHERE event_id = ? AND source_message_id = ? AND type = ?` | D1 autoindex PK + application query | `PARTIAL` (App-enforced dedup, DB PK) |
| **Vulnerabilities** | Unique on `cve_id` (`vulnerabilities_cve_id_unique`) | `CREATE UNIQUE INDEX vulnerabilities_cve_id_unique ON vulnerabilities (cve_id)` | **DATABASE_ENFORCED** |
| **Relations** | Primary Key `id`; check `SELECT id FROM relations WHERE source_entity_type = ? AND ...` | D1 autoindex PK + application query | `PARTIAL` |
| **IOCs** | Primary Key `id`; index `idx_iocs_type_val` (non-unique) | D1 autoindex PK + non-unique index | `APPLICATION_ONLY` |
| **Campaigns** | Unique on `slug` (`campaigns_slug_unique`) | `CREATE UNIQUE INDEX campaigns_slug_unique ON campaigns (slug)` | **DATABASE_ENFORCED** |
| **Actors** | Unique on `slug` (`actors_slug_unique`) | `CREATE UNIQUE INDEX actors_slug_unique ON actors (slug)` | **DATABASE_ENFORCED** |

---

## 6. Runtime Evidence from Production `event_trace`

Historical execution records in Production D1 `event_trace` (23,524 total records):
- **CONSUMER COMPLETED:** 4,754
- **CONSUMER STARTED:** 11,218
- **CONSUMER FAILED:** 6,313 (Dominant failure cause: D1 free-tier row read limits during historical bulk processing; zero data corruption).
- **AI_SMOKE_COMPLETED:** 543

---

## 7. Production Data Integrity Verification

Counts verified before and after all forensic evaluations:
- `vulnerabilities`: **1,238**
- `evidence`: **5**
- `intelligence_events`: **2**
- `relations`: **5,283**
- `sources`: **32**
- `source_messages`: **4,041**
- `event_trace`: **23,524**

**Business Data Mutated:** `NO` (Zero variance).

---

## 8. Open Blockers & Recommendations

- **BLOCKER (P2/Resilience):** Cloudflare Queues lack an explicit Dead-Letter Queue (`max_retries` drops messages via `msg.ack()` on repeated failure without dead-letter persistence).
- **RECOMMENDED NEXT STEP:** Implement a dedicated dead-letter queue (`zayron-ingest-dlq`) and configure `dead_letter_queue` in `workers/ingest/wrangler.toml` in a controlled forward maintenance release.
