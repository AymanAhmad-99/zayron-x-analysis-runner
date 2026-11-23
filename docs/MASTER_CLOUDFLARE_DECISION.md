# MASTER CLOUDFLARE DECISION

## Workload model (measured, not imagined)
≤ tens of CVEs/day real feed volume; 4k telegram messages lifetime; 100MB D1 after 4 weeks DORMANT; consumer failure rate 56% historical; single-region, single-operator. Latency requirement: minutes, not milliseconds. Durability requirement: absolute (intelligence must not duplicate or vanish).

## Options evaluated
| Criterion | A: Queue+processor+D1 | B: Queue+Workflow | C: Workflow-primary | D: current | E: consolidated current |
|---|---|---|---|---|---|
| durability | D1 state machine ✅ | engine state ✅+ | engine ✅+ | broken | D1 ✅ |
| retries | per-message + processor | per-step ✅ | per-step | manual | per-message |
| external API waits | sleep/pacing in processor | step.sleep ✅ | ✅ | none | pacing sufficient at this volume |
| state | ONE place (D1) | two (engine+D1) | two | fragmented | ONE |
| observability | event_trace SQL | engine UI + traces | both | weak | event_trace ✅ |
| complexity | LOWEST | medium | high | very high | low-medium |
| cost | lowest | +workflows | higher | current | lower |
| debugging | SQL | engine semantics | hardest | painful | SQL |
| fit at 100–10k CVEs/day | ✅ to 10k w/ batching | ✅ | overkill | ❌ | ✅ |

## DECISION — Option A (smallest architecture that safely satisfies requirements)
- **Workers:** `zayron-x-api` (read API + publish consumer + on-demand workflows) · `zayron-x-ingest` (cron discovery + transport consumer) · NEW `zayron-x-processor` (ONE brain: mapping→canonical→normalize→enrich(ports)→analysis→evidence→semantic→confidence→publish-decision) · `telegram-collector-do` (collection only) · source-fabric SHRUNK to source registry then merged.
- **Queues:** 3 — ingest (at-least-once; idempotency via processing_runs unique key), publish, DLQ (NEW — none exist today; without DLQ Cloudflare deletes after retries).
- **Workflows:** keep ResearchWorkflow for on-demand deep analysis only; NO pipeline Workflows (rejected: second state store + engine semantics for a minutes-scale pipeline; revisit only for >4h waits or human-gates).
- **D1:** single durable truth (canonical objects, claims, evidence, reports, publications, kev_state, epss_scores, processing_runs, sources). Migrations: one journal, reconciled.
- **R2:** raw source payloads (immutable), corpus artifacts, backups. NOT relational intelligence.
- **DO:** TelegramCollectorDO only (justified coordination atom: per-shard collection state). No global DOs.
- **Vectorize:** retrieval index for knowledge/report chunks; NEVER identity lookup; document metadata indexes; rebuildable.
- **Workers AI:** bge embeddings + one narrative model via a single AiPort; Gemini frozen (unbudgeted, broken secret pattern).
- **Service bindings:** processor exposed via ONE service entrypoint; collector keeps its binding; remove api→ingest→api KnowledgeProcessor chain.
- **Cron:** 15-min discovery on ingest (the single missing heartbeat).

Every KEEP/SIMPLIFY/REMOVE with workload justification is in MASTER_TARGET_ARCHITECTURE + MASTER_RECOVERY_DECISION (DELETE/MERGE/KEEP/FREEZE/REBUILD lists).
