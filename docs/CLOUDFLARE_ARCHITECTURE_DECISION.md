# CLOUDFLARE ARCHITECTURE DECISION — ZAYRON-X

Per mandate: not fashionable, workload-first. Workload facts (measured): ≤ tens of CVEs/day (KEV feed ≈ 1.4k entries total, ~1–3/day added; NVD slice 5/run; Telegram 4k msgs lifetime), single low-volume API, 3 dormant/dead stages, 100 MB D1 after 4 weeks. This is a LOW-THROUGHPUT, HIGH-INTEGRITY workload.

Official capability comparison is from the live Cloudflare docs (Workflows = durable multi-step execution with automatic per-step retries and hibernation; Queues = at-least-once delivery with per-message ack/retry + DLQ). Where this summary could lag docs, the decision below relies only on long-stable, documented behaviors.

---

## Option analysis

| Criterion | A: Queue + deterministic processor + D1 state | B: Queue + Workflow + D1 | C: Workflow-primary + Queue ingress | D: Current model consolidated |
|---|---|---|---|---|
| Durability | D1 state machine (explicit) | Workflow instances persist step state | strongest | as A |
| Retries | queue-level + processor-level | per-step automatic | per-step | manual (today) |
| State mgmt | D1 only (one truth) | D1 + workflow instance state (two places) | two places | D1 |
| Observability | event_trace (already built) | workflow engine UI + traces | both | weak today |
| Complexity | lowest | medium | high | high (current) |
| Cost | lowest | workflow invocations+storage | higher | current |
| Debugging | straightforward SQL traces | need engine semantics | hardest | painful |
| Rate-limit friendliness (NVD) | full control in processor | steps wait via sleep | sleeps fine | none |
| Failure isolation | per-message ack/nack + QUARANTINE state | per-instance | per-instance | broken (frozen-no-ack) |
| Replay/idempotency | explicit run IDs (we must build) | instance IDs help | same | fragmented |

**Decision: Option A — Queue (ingress/buffering) + ONE deterministic processor Worker + D1 state machine.**
Workflows are NOT adopted now (Phase 13). Rationale: the orchestration is short (7 stages, seconds-to-minutes), the hard requirement is integrity + observability + idempotency (D1 + trace), the external-API pacing is simple, and Workflows would add a second state store and engine semantics to reconcile for no measured need. Workflows remain the documented ESCALATION if/when: multi-hour enrichment (sleep/wait), human-in-loop review gates, or >50k CVEs/day make cron+queue insufficient. `ResearchWorkflow` already exists and is kept for the on-demand deep-analysis path (it is a good fit there).

## Phase 14 — Cloudflare service audit (KEEP/SIMPLIFY/REUSE/MOVE/FREEZE/REMOVE)

| Service | Current | Decision | Why |
|---|---|---|---|
| zayron-x-api | 4,792-line monolith, 60+ routes | **SIMPLIFY** — becomes: read API + publish queue consumer only. Split knowledge/RAG into `zayron-x-knowledge` (or move to source-fabric DB plane) | product surface stays; brain moves out |
| zayron-x-ingest | consumer + dormant scheduled + canary RPC | **SIMPLIFY + REUSE** — becomes: transport-only consumer + ONE scheduled discovery trigger (cron added) + source adapter registry. ALL analysis logic moves to the processor | single canonical path |
| NEW zayron-x-processor | — | **CREATE (1 worker, not 5)** — the ONE CVE processor: mapping→canonical→normalization→enrichment→analysis→evidence→semantic→confidence→publish-decision; writes D1 + traces | mandate's ONE PROCESSOR |
| zayron-telegram-collector-do | DO collector + engine_v2 import | **KEEP (collection) + REMOVE analysis import** — collector collects; it must not analyze | failure isolation, package boundary |
| zayron-x-source-fabric | 5-stage queue fabric; 2 dead-end queues | **FREEZE then MERGE** — source registry/heartbeat stays; collection/normalization/evidence stages fold into processor job types; delete source-analysis/source-publication queues after proving no producers (none found: only source-fabric produces, consumers absent) | two fabrics = two brains |
| zayron-x-preview (June monolith) | not in repo | **REMOVE (after freeze+export)** | legacy, unreproducible |
| zayron-nvd-candidate-trigger | not in repo | **REMOVE (after inspection)** | provenance unknown |
| zayron-x-api-diagnostic | not in repo | **REMOVE** | diagnostic debris |
| zayron-x-source-fabric-staging-staging | — | **REMOVE** | deploy accident |
| zayron-x-web (prod) | deployed, config absent | **KEEP + restore config to repo** | production must be reproducible |
| D1 zayron-x-db | mutated snowflake | **REUSE + reconcile** (docs/D1_SCHEMA_RECONCILIATION plan) | data lives there |
| D1 fabric DB | better relational shape | **REUSE as canonical core target** (claims/evidence/publications) | proven design, empty |
| R2 | knowledge bucket + raw artifacts | **KEEP** — raw payload archive (raw source payloads + corpus); add dated backup exports before any drop | raw artifacts = R2's job |
| Vectorize | knowledge index | **KEEP** (retrieval only) | retrieval = Vectorize's job |
| DO | TelegramCollectorDO | **KEEP** (justified stateful coordination) | per-shard collection state |
| Workers AI | llama + bge | **KEEP** (bge embeddings + one narrative model via AiPort) | see AI_AUDIT |
| Gemini direct | gemini_reasoner | **FREEZE** (optional port, off by default) | cost + secret handling |
| Queues | 8 | **SIMPLIFY → 3**: ingest-queue, publish-queue, dlq; fold fabric queues | dead ends removed |
| Cron | none | **ADD** to processor/ingest: 15-min discovery | the missing heartbeat |
| Workflows | ResearchWorkflow, KnowledgeCorpusWorkflow | **KEEP for on-demand research only**; no new pipelines | option A |
| Service bindings | api→ingest→api (KnowledgeProcessor) | **SIMPLIFY** — processor exposes one service entry; collector keeps service binding | fewer chains |

## Net target shape

```
cron(15m) ─▶ [ingest: discovery] ─▶ INGEST_QUEUE ─▶ [ingest: transport consumer]
                                                        │ (validated signal, dedup)
                                                        ▼
                                              [processor: ONE CVE/intel brain]
                                              mapping → canonical → normalize → enrich(KEV/EPSS/CVSS adapters)
                                              → analysis → evidence → semantic(I1–I8) → confidence → publish-decision
                                              writes: D1 state machine + event_trace(run_id) ; raw → R2
                                                        │ READY_TO_PUBLISH (gate-passed)
                                                        ▼
                                              PUBLISH_QUEUE ─▶ [api: publish consumer] ─▶ articles + telegram/social
WEB ─▶ [api: read-only HTTP]  ◀── D1 reads
```

Workers: api, ingest, processor, collector-do, source-fabric (shrinking) → then 4 after fabric merge. Queues: 3 (+DLQ). D1: 2 (main + fabric-as-canonical, eventually merged). Cron: 1.
