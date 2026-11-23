# REAL ARCHITECTURE MAP — ZAYRON-X (as evidenced 2026-09-18)

Purpose: what the system IS, not what documents say it should be. Every claim is traceable to code or live Cloudflare state.

---

## 1. Topology (actual)

```
                        ┌──────────────────────────────────────────────────────┐
                        │                    CLOUDFLARE ACCOUNT                │
                        │                                                      │
  zayron-x.co/api/* ──▶ │  zayron-x-api (4,792-line monolith)                  │
                        │   ├─ default fetch: 60+ /api/v1/* routes             │
                        │   ├─ queue consumer: PUBLISH_INTELLIGENCE jobs       │
                        │   ├─ Publisher (WorkerEntrypoint, service-bound)     │
                        │   ├─ KnowledgeProcessor (WorkerEntrypoint)           │
                        │   ├─ ResearchWorkflow (Workflow)                     │
                        │   └─ KnowledgeCorpusWorkflow (Workflow)              │
                        │                                                      │
  zayron-x.co (web) ──▶ │  zayron-x-web (deployed; config NOT in repo)         │
                        │  zayron-x-web-preview (vinext/React 19 SSR)          │
                        │                                                      │
  cron: NONE ──────✖──▶ │  zayron-x-ingest                                     │
                        │   ├─ scheduled(): discovery — DEAD (no cron, and     │
                        │   │    LEGACY_FREEZE=true early-returns in prod)     │
                        │   ├─ queue(): signal consumer (batch of 20)          │
                        │   └─ IngestWorker (WorkerEntrypoint): submitNvdCanary│
                        │        + triggerControlledKevTest (RPC)              │
                        │                                                      │
                        │  zayron-telegram-collector-do (TelegramCollectorDO)  │
                        │  zayron-x-source-fabric (5-stage queue fabric)       │
                        │  zayron-x-preview (LEGACY monolith, not in repo)     │
                        │  zayron-nvd-candidate-trigger (not in repo)          │
                        │  zayron-x-api-diagnostic (not in repo)               │
                        └──────────────────────────────────────────────────────┘
```

## 2. Storage planes (actual)

| Plane | Resource | Reality |
|---|---|---|
| D1 "main" | `zayron-x-db` (100 MB) | Operational intelligence + knowledge core + e-commerce schema, mutated by scripts; only 6/25 migrations journaled |
| D1 "preview" | `zayron-x-preview-db` (3.3 MB) | 30 tables; 0 migrations journaled (created by script/deploy, not wrangler migrations) |
| D1 "fabric" | `zayron-x-intelligence-db` (3.1 MB) | source-fabric only: fabric_sources, collection_runs, pipeline_runs, publications, knowledge_objects_v3(+FTS) |
| R2 | `zayron-x-knowledge`, `zayron-x-intelligence-raw`, `zayron-x-storage(-preview)` | knowledge artifacts / raw payloads / media (KNOWLEDGE_BUCKET/RAW_ARTIFACTS/STORAGE bindings) |
| Vectorize | `zayron-knowledge-index` | knowledge chunk retrieval (bge-base-en-v1.5, 768d) |
| DO | `TelegramCollectorDO` | per-shard Telegram collector state (SQLite) |
| Queues | 8 (see baseline) | 2 dead-end (source-analysis, source-publication) |
| Workers memory | `SEARCH_LRU_CACHE`, module-level registries | **cross-request mutable global state** in zayron-x-api |

## 3. Component inventory (actual)

### 3.1 Workers
| Worker | LOC | Responsibilities (evidenced) |
|---|---|---|
| `workers/api` (`zayron-x-api`) | 4,792 src | HTTP API (60+ routes), queue consumer for publication, 2 service entrypoints, 2 workflows, in-process knowledge corpus, hybrid retrieval, AI analyze, publishing, social derivatives |
| `workers/ingest` (`zayron-x-ingest`) | 1,227 | Signal ingestion queue consumer, dedup, evidence ledger, canonical event matching, CVE_PROCESS job path, scheduled discovery (dormant), NVD canary RPC |
| `workers/source-fabric` | 634 | Source registry/collection/normalization/evidence fabric; produces to 5 queues, consumes 3 |
| `workers/telegram-collector-do` | 2,491 | MTProto collection per shard, DO persistence, feeds INGEST_QUEUE; imports engine_v2 via relative path across package boundary |
| `apps/web` | Next-style app on vinext | SSR site, talks to API via **hardcoded preview URL** |

### 3.2 Package `@zayron/intelligence` — the brain warehouse
Eight parallel processing stacks under one package (details in CVE_BRAIN_INVENTORY):
`engine_v2` · `engine` · `analyst` · `core/pipeline` (+rust kernel adapter + WASM) · `pipeline/canonical|fusion|adapters` · `dossier` · `reporting` (+static registries/fixtures) · `sources` (+ingestion adapters). Plus `knowledge/` (3 corpus generations: 20-manifest, 320-chunk, v3), `rag/`, `publishing/`, `normalization/`, `resolution/`, `corroboration/`, `campaigns/`, `graph/`, `ttps/`, `telegram/`, `social/`, `subscription/`, `ai/`, `budget/`, `cache/`, `integrity/`, `control_plane/`.

### 3.3 Pipeline stages that actually run for a CVE today (preview/test path)
1. Producer enqueues signal (`enqueueExternalSignal`, or `submitNvdCanary` RPC, or KEV test trigger)
2. `zayron-x-ingest` queue consumer: dedup (`intelligence_events` recent-3-day window + content hash), evidence INSERT OR IGNORE, entity resolution (`resolveVulnerability`), event matching, status transitions (RECEIVED→QUEUED→EVIDENCE_READY→ANALYZED→TRUSTED→READY_TO_PUBLISH)
3. `zayron-x-api` publish-queue consumer or direct RPC → `publishApprovedIntelligence` → Trust Gate → articles row + telegram publish
4. `ResearchWorkflow` (on demand) runs retrieval → AI analysis → publication trace steps

### 3.4 The canonical CVE core that does NOT run
`canonical_vulnerabilities`, `vulnerability_source_records`, `intelligence_evidence`, `intelligence_reports`, `cves`-stage processors exist as code (migration 0021, adapters, `sources/` persistence) but production rows = 0 and no entry point reaches them in the dormant graph.

## 4. Configuration matrix (repo configs vs deployment)

| Config | Deployable? | Env isolation | Issues |
|---|---|---|---|
| `wrangler.toml` (root) | NO — tooling | prod+preview D1/R2/queues | declared non-deployable; but named `zayron-x` (deployment drift with legacy `zayron-x-preview` worker unclear) |
| `workers/api/wrangler.toml` | YES | prod + preview env | consumer on PUBLISH_QUEUE; workflows declared but `script_name` missing in api's own workflow blocks (valid only because they live in same script); ingest declares same workflows with `script_name=zayron-x-api` — cross-worker workflow binding |
| `workers/ingest/wrangler.toml` | YES | prod + preview | KnowledgeProcessor service binding to api entrypoint; no cron despite scheduled() |
| `workers/source-fabric/wrangler.toml` | YES | prod + staging | staging env binds PREVIEW D1 (cross-env coupling by design; risky); 2 queues with no consumer |
| `workers/telegram-collector-do/wrangler.toml` | YES | prod (+preview deployed) | DO + queue producer + D1 |
| `apps/web/wrangler.jsonc` | YES | **preview only** | **no production env defined**; `NEXT_PUBLIC_API_BASE_URL` hardcoded to preview API |

## 5. Entry points (HTTP / RPC / queue / scheduled) — actual list

HTTP (zayron-x-api, GET-only in production due to LEGACY_FREEZE guard):
`/api/v1/health`, `/knowledge`, `/knowledge/:id`, `/knowledge/search` (POST), `/sources/*` (8 routes), `/regulations`, `/knowledge/corpus`, `/rag/*` (3), `/analyze`, `/admin/*` (6), `/social/derivatives`, `/research/workflow`, `/canary/nvd` (POST), `/publish` (POST), `/publish/outbound`, `/feed`, `/intelligence/*` (12+), `/articles`, `/articles/:slug`, `/threats/:id`, `/vulnerabilities`, `/reports`, `/reports/:id`, `/graph/edges`, `/ai/runs`, `/alerts`, `/ai/analyze`, `/webhook/telegram`, `/canary/analyst-grade-cve` (POST), `/canary/cisa-kev-single` (POST), `/intelligence/ingest-event` (POST), `/intelligence/adapters/:x` (POST)…

RPC (service bindings): `IngestWorker.submitNvdCanary`, `IngestWorker.triggerControlledKevTest`, `Publisher.publishApprovedIntelligence`, `KnowledgeProcessor.smokeTest/processBatch(throws)`, collector fetch.

Queue consumers: `zayron-x-api.queue` (PUBLISH_INTELLIGENCE), `zayron-x-ingest.queue` (signals/CVE_PROCESS), source-fabric ×3.

Scheduled: `zayron-x-ingest.scheduled` — **never triggered (no cron) + frozen in prod**.

## 6. Cross-boundary violations found (architecture truth)

1. `workers/telegram-collector-do` imports `packages/intelligence/src/engine_v2` via **relative path** (`../../../packages/...`) bypassing the package boundary.
2. `apps/web/app/lib/api.ts` hardcodes `API_BASE = ...zayron-x-api-preview...workers.dev/api/v1` (production site reads preview API).
3. Web calls `${base}/graph/edges|/campaigns|/actors|/iocs` with `/api/v1` stripped — endpoints that do not exist under that prefix on the API worker.
4. `packages/intelligence/src/reporting/productionReports.ts` seeds static reports at import time (module side effect in runtime path).
5. `workers/api` keeps cross-request mutable caches in worker memory (`SEARCH_LRU_CACHE`, `cachedCorpusChunkCount`).
6. Root `wrangler.toml` shares migration dir with source-fabric whose D1 is a different DB — migration application target ambiguity.
7. Committed build artifacts inside source tree (`workers/api/workers/api/dist-micro77d3`, `dist-prod-check`, `dist-preview`) — evidence of past "verify by inspecting bundle" loops.
8. `workers/scripts/*.py` operate directly on production D1 outside any migration system (this is how 19 unjournaled schema changes landed).

## 7. What is dead / legacy / duplicated (summary; details in dedicated docs)

- **Dead in production:** scheduled discovery, canonical CVE core writes, knowledge-chunk ingestion (`processBatch` throws), source-fabric analysis/publication stages (no consumers), all POST API surface (LEGACY_FREEZE).
- **Legacy:** `zayron-x-preview` worker (June, not in repo), `zayron-nvd-candidate-trigger`, 9 `*_quarantine_bak` tables, `intelligence_reports`/`reports`/`evidence_ledger` vs `articles` publication stacks, `engine` v1 vs `engine_v2`.
- **Duplicated:** three knowledge corpora, two report compilers (`reporting/compiler` + `engine_v2/compiler`), two quality gates (`reporting/qualityGate` + `engine_v2/quality_gate`), five confidence calculators, two D1 schemas for events (canary_events vs intelligence_events vs source_messages).
