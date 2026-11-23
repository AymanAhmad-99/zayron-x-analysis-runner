# CVE EXECUTION GRAPHS — ZAYRON-X

Traced from entry point to termination, from current code + live deployment state (2026-09-18).

---

## GRAPH 1 — Scheduled CISA/NVD/MSRC discovery

```
[zayron-x-ingest.scheduled()]
  ├─ GATE: if (env.LEGACY_FREEZE === 'true') return;            ← production FREEZES discovery
  ├─ OPTIONAL: KNOWLEDGE_PROCESSOR.smokeTest() (service RPC)
  ├─ fetch CISA advisories RSS      → parse first <item> only   → enqueueExternalSignal(cisa-rss)
  ├─ fetch NVD cves/2.0 (30d, 20)   → slice(0,5)                → enqueueExternalSignal(nvd-api, metadata.authoritative)
  ├─ fetch CISA KEV JSON            → ALL items                 → enqueueExternalSignal(cisa-kev, job_type=CVE_PROCESS,
  │                                                                  cve_id, pipeline_version=cve-core-v1, contentHash=sha256(CISA_KEV:cve:dateReleased))
  └─ fetch MSRC RSS                 → parse first <item> only   → enqueueExternalSignal(msrc-advisory)
termination: INGEST_QUEUE (zayron-ingest-queue)
```

**VERDICT: DEAD END-TO-END.** No cron trigger exists on any deployed worker (live API check), AND the handler early-returns under `LEGACY_FREEZE=true` (the production var). Production CVE ingestion via schedule = **zero**.

## GRAPH 2 — Ingest queue consumer (the only live CVE path)

```
[zayron-ingest-queue] → zayron-x-ingest.queue(batch)
  GATE (LEGACY_FREEZE=true): keep ONLY messages with payload.testRun===true; others silently dropped (return, no ack)
  per message:
    dedup: SELECT intelligence_events WHERE first_seen_at >= now-3d LIMIT 50 (batch-memoized)
           + matchCanonicalEvent (content_hash / external_message_id)
    evidence: INSERT OR IGNORE INTO evidence (event_id, source_message_id, type, url, weight, snippet)
              → re-SELECT canonical row id
    entity resolution: resolveVulnerability / resolveActor / resolveMalware (@zayron/intelligence)
    CVE_PROCESS job branch: mapCisaKevRecord → validateStructuredCVERecord → CVESourceAdapter path
    status transitions: RECEIVED → QUEUED → EVIDENCE_READY → ANALYZED → TRUSTED → READY_TO_PUBLISH
    (intelligence_events + event_trace writes; failures recorded, retried by queue semantics)
termination: READY_TO_PUBLISH state in D1 (publication happens only if a publish job is later enqueued)
```

**VERDICT: PARTIALLY ALIVE (preview/test only in production env).** In production env with `LEGACY_FREEZE=true`, non-testRun messages are filtered out before processing. 6,313 FAILED consumer traces (56% of 11,218) attest historic instability. The 3-day dedup window means a KEV replay after 3 days reprocesses as a "new" event unless `external_message_id`/hash matching catches it — partial idempotency only.

## GRAPH 3 — NVD canary RPC (analyst/manual injection)

```
[zayron-x-api POST /api/v1/canary/nvd]
  → INGEST service binding → IngestWorker.submitNvdCanary({cve_id, source, raw_record})
     GATE: LEGACY_FREEZE=true → throw (production BLOCKED)
     validate: /^CVE-\d{4}-\d{4,19}$/
     dedup: canary_events by dedup_key = nvd-api:{cve}
       ├─ existing non-terminal → re-enqueue + status QUEUED_RETRY
       ├─ existing terminal     → DUPLICATE (no work)
       └─ new → INSERT canary_events(RECEIVED) → enqueueExternalSignal → UPDATE QUEUED
termination: same as GRAPH 2 consumer path
```

**VERDICT: DEAD in production (frozen), ALIVE in preview.** Note: parallel identity stores — `canary_events` (canary) vs `intelligence_events` (main) — two dedup states for the same CVE.

## GRAPH 4 — API canary routes (direct API analysis)

```
[zayron-x-api POST /api/v1/canary/nvd | /canary/analyst-grade-cve | /canary/cisa-kev-single]
  GATE (fetch-level): LEGACY_FREEZE=true && method!==GET → 503 LEGACY_FROZEN   ← ALL POST routes dead in prod
  /canary/analyst-grade-cve: builds analyst-grade report via runIntelligenceAnalyst / engine paths (in-process)
  /canary/cisa-kev-single: fetches live KEV feed, processes ONE CVE through engine_v2 → compileCanonicalReportV2
termination: in-process report JSON (may persist articles/reports depending on branch)
```

**VERDICT: DEAD in production. Preview-only.** These routes bypass ingest entirely — a SECOND, synchronous CVE processing path with different code (analyst/engine vs queue consumer) than GRAPH 2.

## GRAPH 5 — Publication path

```
[intelligence_events.status = READY_TO_PUBLISH]
  → (who enqueues PUBLISH_INTELLIGENCE? no scheduled producer exists; publish-queue consumer exists)
[zayron-publish-queue] → zayron-x-api.queue(batch)
  GATE: LEGACY_FREEZE=true → return without ack          ← BUG: message redelivered until max retries exhausted
  job.type === 'PUBLISH_INTELLIGENCE':
    publishApprovedIntelligence(env, {intelligence_id, publication_type:'telegram', idempotency_key, custom_message})
      → Trust Gate (publishing/publicationGate) → articles INSERT (is_published) → social/telegram publish
  retries: attempts>=3 → ack; else retry with exponential delay
```

**VERDICT: LATENT-DEAD with a frozen-state defect.** The `LEGACY_FREEZE` early-return does not ack → redelivery loop → messages eventually lost after delivery attempts. Also `Publisher.publishApprovedIntelligence` RPC exists as a parallel entry (service-binding only).

## GRAPH 6 — ResearchWorkflow (on-demand analysis)

```
[zayron-x-api POST /api/v1/research/workflow] (GET-only prod → dead) or RESEARCH_WORKFLOW.create() from ingest
  ResearchWorkflow.run(event, step):
    validate-input → retrieval (KNOWLEDGE_RETRIEVAL) → VECTORIZE → AI_ANALYSIS (Workers AI)
    → TRUST (quarantine or READY_TO_PUBLISH) → LEDGER
    every step traced via trace() → event_trace (trace_id, event_id, stage, status, attempt, duration)
termination: intelligence_events status update; publication only via GRAPH 5
```

**VERDICT: ALIVE only when triggered from preview/tests; last production run 2026-09-12.** This is the ONLY component with a real per-stage trace (run_id equivalent = trace_id). Note: engine_v2's own report/claims path is NOT used here; the workflow uses runIntelligenceAnalyst (analyst brain) — a THIRD analysis implementation.

## GRAPH 7 — Telegram signal → (optional CVE discovery)

```
TelegramCollectorDO (per-shard) → INGEST_QUEUE.send(signal)
  → GRAPH 2 consumer → resolveVulnerability extracts CVE IDs from raw text
    → CVE treated as free-text signal (no structured source mapping; KEV/enrichment only if engine_v2 later invoked)
```

**VERDICT: ALIVE historically (source_messages 4,041 rows; 31 telegram sources registered).** This is how the 1,238 `vulnerabilities` rows were born — text extraction, NOT the canonical CVE core; consistent with all `cvss_score=NULL`/`epss_score=NULL`.

## Cross-graph conclusions

1. **No entry point converges on one processor.** Queue path (ingest consumer + engine_v2/ingestion adapters), canary routes (analyst engine), ResearchWorkflow (analyst engine), and collector-side engine_v2 all process CVE-adjacent input with DIFFERENT code.
2. **The canonical CVE pipeline (discovery → canonical object → normalization → enrichment → evidence → semantic → confidence → publish) exists as fragments but no single runnable graph executes it end-to-end.**
3. **Idempotency is per-fragment:** canary_events dedup (canary), intelligence_events 3-day window + hash (queue), publication idempotency_key (publish). No unified processing-run identity.
4. **Every automated CVE entry is either dead (cron, frozen POSTs) or preview-scoped (testRun).** The platform's public CVE intelligence is stale (last activity 2026-09-12).
