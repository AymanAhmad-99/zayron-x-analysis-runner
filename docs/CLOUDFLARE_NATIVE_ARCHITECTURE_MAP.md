# ZAYRON-X — CLOUDFLARE-NATIVE ARCHITECTURE MAP
**Date:** 2026-09-01 | **Classification:** Architecture Documentation

---

## DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Edge                               │
│                                                                      │
│  DNS: zayron-x.co / www.zayron-x.co                                │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  zayron-x-web (OpenNext/Worker)  [apps/web/]                │    │
│  │  Route: zayron-x.co (custom_domain)                        │    │
│  │  Build: opennextjs-cloudflare                              │    │
│  │  Bindings: DB (D1), ASSETS, API_WORKER (Service)          │    │
│  │  Observability: enabled=true, sampling=10%                 │    │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              │ Service Binding                       │
│  ┌───────────────────────────▼─────────────────────────────────┐    │
│  │  zayron-x-api (Worker)  [workers/api/]                      │    │
│  │  Route: zayron-x.co/api/*                                  │    │
│  │  Bindings:                                                 │    │
│  │    DB → D1 (zayron-x-db)                                  │    │
│  │    AI → Workers AI                                         │    │
│  │    VECTORIZE → Vectorize (zayron-knowledge-index)         │    │
│  │    KNOWLEDGE_BUCKET → R2 (zayron-x-knowledge)            │    │
│  │    INGEST_QUEUE → Cloudflare Queue                         │    │
│  │    PUBLISH_QUEUE → Cloudflare Queue                        │    │
│  │    RESEARCH_WORKFLOW → CF Workflow                         │    │
│  │    KNOWLEDGE_CORPUS_WORKFLOW → CF Workflow                 │    │
│  │    TELEGRAM_COLLECTOR_SERVICE → DO Service                 │    │
│  │    INGEST → Service (zayron-x-ingest)                     │    │
│  └──────┬──────────────┬────────────────────────────────────────┘    │
│         │              │                                              │
│  ┌──────▼───────┐  ┌───▼──────────────────────────────────────┐    │
│  │  INGEST_Q    │  │  zayron-x-ingest (Worker) [workers/ingest]│    │
│  │  PUBLISH_Q   │  │  Bindings: DB, INGEST_QUEUE, PUBLISH_QUEUE│    │
│  │  Cloudflare  │  │           AI, VECTORIZE, KNOWLEDGE_BUCKET │    │
│  │  Queues      │  │           RESEARCH_WORKFLOW               │    │
│  └──────────────┘  │           KNOWLEDGE_CORPUS_WORKFLOW       │    │
│                    └───────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  zayron-telegram-collector-do (Durable Object Worker)       │    │
│  │  [workers/telegram-collector-do/]                           │    │
│  │  Bindings: DB, TELEGRAM_COLLECTOR_DO (DO), INGEST_QUEUE    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  nvd-candidate-trigger (Cron Worker)                       │    │
│  │  ready-candidate-trigger (Cron Worker)                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Data Layer (All Cloudflare-native)                         │    │
│  │  D1: zayron-x-db (SQLite/D1, drizzle-orm/d1)              │    │
│  │  Vectorize: zayron-knowledge-index (768-dim embeddings)    │    │
│  │  R2: zayron-x-knowledge (corpus/knowledge objects)         │    │
│  │  R2: zayron-x-storage (media/assets)                      │    │
│  │  Workers AI: @cf/meta/llama-3.1-8b-instruct               │    │
│  │             @cf/baai/bge-base-en-v1.5                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## DATA FLOW: INTELLIGENCE INGESTION

```
External Sources:
  NVD API → nvd-candidate-trigger → INGEST_QUEUE
  Telegram Channels → TelegramCollectorDO → INGEST_QUEUE
  Manual Ingest → POST /api/v1/ingest → INGEST_QUEUE

INGEST_QUEUE:
  → zayron-x-ingest Worker
    ├── Normalize & extract entities (CVEs, actors, malware, IOCs)
    ├── AI translate (Workers AI llama-3.1-8b if non-English)
    ├── Embed (Workers AI bge-base-en-v1.5)
    ├── Upsert to D1 (evidence_ledger, intelligence_events, canary_events)
    ├── Upsert to Vectorize (knowledge index)
    └── Trigger ResearchWorkflow → generate article → PUBLISH_QUEUE

PUBLISH_QUEUE:
  → zayron-x-api (queue consumer)
    ├── Publish article to D1
    └── Send Telegram alert via Bot API
```

---

## DATA FLOW: API QUERY (RAG)

```
Browser → POST /api/v1/ai/analyze
  → zayron-x-api Worker
    ├── Extract entities from query (CVE IDs, actor names, malware)
    ├── executeHybridRetrieval():
    │     ├── D1 query (vulnerabilities, actors, intelligence_events)
    │     └── Vectorize semantic search (knowledge_chunks)
    ├── Epistemic discipline: INSUFFICIENT_EVIDENCE if no grounding found
    └── Workers AI llama-3.1-8b: structured analysis from grounded context
```

---

## TECHNOLOGY STACK SUMMARY

| Layer | Technology | Provider | Notes |
|-------|-----------|---------|-------|
| Frontend | Next.js 16.3.2 | Self-hosted on CF | Via OpenNext/Cloudflare |
| API | Cloudflare Workers (TypeScript) | Cloudflare | Edge runtime |
| Database | Cloudflare D1 (SQLite) | Cloudflare | ORM: drizzle-orm/d1 |
| Vector Search | Cloudflare Vectorize | Cloudflare | 768-dim BAAI/BGE |
| AI Inference | Cloudflare Workers AI | Cloudflare | llama-3.1-8b, bge-base-en |
| Object Storage | Cloudflare R2 | Cloudflare | 2 buckets |
| Async Processing | Cloudflare Queues | Cloudflare | INGEST_QUEUE, PUBLISH_QUEUE |
| State Machines | Cloudflare Workflows | Cloudflare | Research, KnowledgeCorpus |
| Persistent State | Cloudflare Durable Objects | Cloudflare | TelegramCollectorDO |
| Build | OpenNext Cloudflare | Open Source | Next.js → CF Workers |
| CI/CD | Manual `wrangler deploy` | — | No `.github/` exists |
| Observability | Cloudflare native | Cloudflare | 10% trace sampling |
| Data Collection | Telegram MTProto | Telegram API | Via GramJS in DO |
