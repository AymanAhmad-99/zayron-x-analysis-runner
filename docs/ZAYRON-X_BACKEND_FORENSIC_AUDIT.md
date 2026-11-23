# ZAYRON-X — FORENSIC BACKEND INTELLIGENCE & DESIGN SOURCE-OF-TRUTH AUDIT
**Document Classification:** Definitive Engineering Source of Truth  
**Target Specification:** Authoritative Technical Reference for UI/UX & Platform Architecture  
**Generated:** 2026-09-03  
**Audit Scope:** Entire Monorepo (`apps/web`, `workers/*`, `packages/*`, `db/*`, `docs/*`)  
**Operational Status:** READ-ONLY Forensic Inspection Complete  

---

## TABLE OF CONTENTS
1. [Executive Summary & Architectural Overview](#1-executive-summary--architectural-overview)
2. [Complete Repository Inventory & Subsystem Classification](#2-complete-repository-inventory--subsystem-classification)
3. [Agent 1 — Backend Forensics (Architecture, Logic, Services & APIs)](#3-agent-1--backend-forensics)
4. [Agent 2 — Database Forensics (D1, Schema, Migrations & Query Analysis)](#4-agent-2--database-forensics)
5. [Agent 3 — Cloudflare & Infrastructure Forensics (Workers, Bindings & Queues)](#5-agent-3--cloudflare--infrastructure-forensics)
6. [Agent 4 — Security, Authentication & Reliability Forensics](#6-agent-4--security-authentication--reliability-forensics)
7. [Agent 5 — Frontend / Backend Contract Forensics](#7-agent-5--frontend--backend-contract-forensics)
8. [End-to-End Capability Execution Traces](#8-end-to-end-capability-execution-traces)
9. [State-Machine & Lifecycle Forensics](#9-state-machine--lifecycle-forensics)
10. [Async, Queue & Scheduled Job Forensics](#10-async-queue--scheduled-job-forensics)
11. [Exhaustive Endpoint & API Inventory](#11-exhaustive-endpoint--api-inventory)
12. [Configuration & Environment Forensics](#12-configuration--environment-forensics)
13. [Dependency & Package Forensics](#13-dependency--package-forensics)
14. [Code-Level Technical Debt & Anti-Patterns](#14-code-level-technical-debt--anti-patterns)
15. [Product Truth Matrix](#15-product-truth-matrix)
16. [Red Flag Register](#16-red-flag-register)
17. [Agent Cross-Check & Discrepancy Resolution](#17-agent-cross-check--discrepancy-resolution)
18. [Final Architectural Model (Current vs Target State)](#18-final-architectural-model)
19. [DESIGN SOURCE OF TRUTH (Strict Engineering Specification for UI Phase)](#19-design-source-of-truth)

---

## 1. EXECUTIVE SUMMARY & ARCHITECTURAL OVERVIEW

ZAYRON-X is a specialized, sovereign, evidence-grounded Cyber Threat Intelligence (CTI) platform engineered to operate 100% natively on the Cloudflare Edge serverless stack. The system ingests raw multi-lingual threat signals from darkweb/Telegram channels, national vulnerability databases (NVD), and security advisories (CISA KEV, MSRC), normalizes them into structured English intelligence objects with strict epistemic confidence scoring, resolves entities (threat actors, malware families, CVEs, IOCs, MITRE ATT&CK techniques), executes hybrid RAG retrieval over an authoritative knowledge corpus, and publishes verified intelligence to both a Next.js web application and automated social distribution channels.

### Sovereign Cloudflare Architecture Map

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CLOUDFLARE EDGE NETWORK                                │
│                                                                                        │
│  Public DNS: zayron-x.co, www.zayron-x.co                                              │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  zayron-x-web (OpenNext/vinext SSR Worker) [apps/web]                            │  │
│  │  Next.js 16.3.2 Server-Side Rendered & Static Pages                              │  │
│  │  Bindings: DB (D1), ASSETS, API_WORKER (Service Binding)                         │  │
│  └──────────────────────────────────────┬───────────────────────────────────────────┘  │
│                                         │ RPC Service Binding / HTTP                    │
│  ┌──────────────────────────────────────▼───────────────────────────────────────────┐  │
│  │  zayron-x-api (Core API Worker) [workers/api/src/index.ts - 1,747 LOC]            │  │
│  │  Route: zayron-x.co/api/*                                                        │  │
│  │  • 47 HTTP Endpoints (Feed, Search, Entities, Graph, Knowledge, AI Analyst)      │  │
│  │  • Cloudflare Workflows: ResearchWorkflow, KnowledgeCorpusWorkflow              │  │
│  │  • RPC Entrypoints: KnowledgeProcessor, Publisher                                │  │
│  │  • Queue Consumer: zayron-publish-queue                                          │  │
│  └──────┬───────────────────────────────┬───────────────────────────────────┬───────┘  │
│         │                               │                                   │          │
│  ┌──────▼─────────────┐          ┌──────▼─────────────┐              ┌──────▼────────┐ │
│  │ INGEST_QUEUE       │          │ PUBLISH_QUEUE      │              │ Workers AI    │ │
│  │ Cloudflare Queue   │          │ Cloudflare Queue   │              │ llama-3.1-8b  │ │
│  └──────┬─────────────┘          └──────▲─────────────┘              │ bge-base-en   │ │
│         │                               │                            └───────────────┘ │
│  ┌──────▼───────────────────────────────┴───────────────────────────────────────────┐  │
│  │  zayron-x-ingest (Ingestion Worker) [workers/ingest/src/index.ts - 841 LOC]      │  │
│  │  • Cron Trigger: */15 * * * * (CISA RSS, NVD API, CISA KEV, MSRC RSS)             │  │
│  │  • Queue Consumer: zayron-ingest-queue                                          │  │
│  │  • Pipeline: Normalization, AI Translation, Entity Extraction, Vectorization     │  │
│  │  • Deep Article Generation & Telegram Broadcast Queueing                         │  │
│  └──────────────────────────────────────▲───────────────────────────────────────────┘  │
│                                         │ INGEST_QUEUE Producer                        │
│  ┌──────────────────────────────────────┴───────────────────────────────────────────┐  │
│  │  zayron-telegram-collector-do [workers/telegram-collector-do - 18,903 LOC]       │  │
│  │  • Cloudflare Durable Object (TelegramCollectorDO) with SQLite Persistence       │  │
│  │  • 24/7 Real-Time MTProto Connection (GramJS) to 35+ Monitored CTI Channels      │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  SOVEREIGN DATA LAYER                                                            │  │
│  │  • Cloudflare D1: zayron-x-db (SQLite, 36 Tables, c19c8f45-801b-4034-bd76-402e)   │  │
│  │  • Cloudflare Vectorize: zayron-knowledge-index (768-dim embeddings)             │  │
│  │  • Cloudflare R2: zayron-x-knowledge (corpus), zayron-x-storage (media)          │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPLETE REPOSITORY INVENTORY & SUBSYSTEM CLASSIFICATION

| Directory / Package | Subsystem | Classification | Purpose & Evidence |
| :--- | :--- | :---: | :--- |
| `apps/web` | Next.js Frontend | **PARTIAL** | Edge SSR app using `@vinext/cloudflare`. Deep pages (`/threats`, `/vulnerabilities`, `/actors`, `/search`) connect to real API; homepage (`/`) relies on hardcoded editorial mocks. |
| `workers/api` | Core Gateway & RPC | **ACTIVE** | 1,747 LOC. 47 endpoints, Cloudflare Workflows, Queue consumers, RAG hybrid retrieval, D1 querying. |
| `workers/ingest` | Signal Pipeline | **ACTIVE** | 841 LOC. Cron puller, queue consumer, entity extractor, Workers AI translator, Vectorize embedder. |
| `workers/telegram-collector-do` | MTProto Collector | **ACTIVE** | Durable Object running GramJS MTProto client for 35+ Telegram channels. Writes to `INGEST_QUEUE`. |
| `workers/nvd-candidate-trigger` | Canary Worker | **ACTIVE** | HTTP trigger polling NIST NVD for specific CVEs and invoking RPC `submitNvdCanary`. |
| `workers/ready-candidate-trigger`| Scheduled Canary | **ACTIVE** | Cron worker triggering NVD canary ingestion. |
| `packages/intelligence` | Core Intelligence Library | **ACTIVE** | 16 submodules: normalization, resolution, RAG, confidence scoring, AI budget guard, social distributor. |
| `packages/types` | TypeScript Contracts | **ACTIVE** | Shared domain interfaces (`index.ts`, `marketing.ts`). |
| `packages/ui` | UI Component Library | **UNUSED / STUB** | Contains empty `components/` directory and stub export `UI_VERSION = '1.0.0'`. |
| `db/migrations` | D1 Migrations | **ACTIVE** | 9 SQL migration files (`0000` through `0008`) establishing 36 database tables. |
| `db/backups` | Database Dumps | **LEGACY / BACKUP** | Static reference SQL snapshots. |
| `docs/` | Architecture Reports | **ACTIVE** | Forensic reports documenting Cloudflare migration and legacy cleanup. |
| `scripts/` | Tooling & Setup | **ACTIVE** | Corpus sync scripts, D1 seeders, maintenance automation. |
| `tests/` | Test Suites | **ACTIVE** | 14 unit tests validating Telegram pipeline, multi-lingual normalization, and timestamp rejection. |

---

## 3. AGENT 1 — BACKEND FORENSICS

### Architecture & Service Boundaries
The backend is structured around three cooperating Cloudflare Workers communicating via direct Cloudflare Service Bindings, Cloudflare Queues, and Cloudflare Workflows:

1. **Ingestion & Normalization Engine (`workers/ingest/src/index.ts`)**:
   - **Signal Acquisition**: Scheduled cron fetches external feeds every 15 minutes (CISA Advisories RSS, NIST NVD REST API 2.0, CISA KEV JSON, and MSRC RSS).
   - **Noise Filtering & Language Gate**: `normalizeIntelligenceSignal()` evaluates message text using regex heuristics. Non-security chatter and promotional spam are rejected. Non-English text (Russian, Persian, Arabic) is translated to objective analyst English using Workers AI (`@cf/meta/llama-3.1-8b-instruct`).
   - **Entity Resolution**: `resolveActor()`, `resolveMalware()`, and `resolveVulnerability()` map variants and aliases to canonical threat records.
   - **Persistence & Vectorization**: Extracted records are upserted to D1 and vectorized into Cloudflare Vectorize via `@cf/baai/bge-base-en-v1.5` (768 dimensions).
   - **Article Promotion**: High-value signals meeting publication thresholds trigger deep report generation and dispatch a message to `PUBLISH_QUEUE`.

2. **Core API & Gateway Worker (`workers/api/src/index.ts`)**:
   - Implements 47 endpoints handling operational feeds, entity registries, full-text hybrid search, RAG context packs, and administrative operations.
   - Hosts two Cloudflare Workflows:
     - `ResearchWorkflow`: Multi-step analyst reasoning workflow loading live evidence from D1, retrieving chunks, and executing structured threat assessments.
     - `KnowledgeCorpusWorkflow`: Manages ingestion of external knowledge artifacts from R2 into D1 and Vectorize.
   - Hosts two Worker RPC Entrypoints:
     - `KnowledgeProcessor`: Exposes `smokeTest()` and `processBatch()` for internal chunk vectorization.
     - `Publisher`: Exposes `publishApprovedIntelligence()` for verified social and web publishing.

3. **Telegram MTProto Collector (`workers/telegram-collector-do`)**:
   - Uses a Cloudflare Durable Object (`TelegramCollectorDO`) to maintain persistent WebSocket/TCP sessions to Telegram MTProto servers.
   - Pulls updates from 35 security research channels defined in `workers/targets.json` and emits standardized envelopes to `zayron-ingest-queue`.

---

## 4. AGENT 2 — DATABASE FORENSICS

### D1 Database Engine: `zayron-x-db` (`c19c8f45-801b-4034-bd76-402e5e5389b5`)
ORM: Drizzle ORM (`drizzle-orm/sqlite-core`, `drizzle-orm/d1`).  
Total Tables Detected: **36 tables** (33 in `schema.ts` + 3 in SQL migrations).

### Exhaustive Table Inventory & Forensic Analysis

| Table Name | Origin | Purpose | Writers | Readers | Integrity & Usage Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sources` | `schema.ts:64` | CTI source registry (trust scores, status, type) | Ingest worker auto-registration | API `/api/v1/sources` | **ACTIVE** — Primary provenance anchor |
| `source_messages` | `schema.ts:82` | Raw ingested telemetry & normalized English text | Ingest queue consumer | Evidence queries | **ACTIVE** — Deduped via `content_hash` |
| `intelligence_events` | `schema.ts:101` | Canonical public threat events | Ingest worker, Canary triggers | API `/api/v1/feed`, `/threats` | **ACTIVE** — Core event model |
| `evidence` | `schema.ts:122` | Provenance links tying events to sources | Ingest worker | API `/threats/:id` | **ACTIVE** — Critical for auditability |
| `evidence_ledger` | `0001_evidence.sql`| Granular claim-level evidence classification | Migrations / Workflows | Research workflows | **ACTIVE** — Strict claim taxonomy |
| `relations` | `schema.ts:138` | Entity graph edges (exploits, targets, uses) | Ingest entity extraction | API `/api/v1/graph/edges` | **ACTIVE** — Powers intelligence graph |
| `actors` | `schema.ts:153` | Threat actor directory & aliases | Ingest canonical resolution | API `/api/v1/actors`, UI | **ACTIVE** — High usage |
| `campaigns` | `schema.ts:168` | Coordinated attack campaigns | Ingest campaign detection | API `/api/v1/campaigns`, UI | **ACTIVE** — Grouping entity |
| `malware` | `schema.ts:183` | Malware families, YARA & Sigma rules | Ingest malware resolution | API `/api/v1/malware`, UI | **ACTIVE** — High usage |
| `vulnerabilities` | `schema.ts:197` | CVE tracking, CVSS, EPSS, wild exploitation | Ingest NVD/signal processing | API `/vulnerabilities`, UI | **ACTIVE** — High usage |
| `cves` | `schema.ts:479` | Secondary CVE directory | Legacy seeders | Unused in API | **DUPLICATE / UNUSED** — Superseded by `vulnerabilities` |
| `iocs` | `schema.ts:218` | Observable indicators (IP, SHA256, domains) | Ingest IOC extraction | API `/api/v1/iocs`, UI | **ACTIVE** — Indicator telemetry |
| `ttp_mappings` | `schema.ts:231` | MITRE ATT&CK technique associations | Ingest TTP extractor | API `/threats/:id` | **ACTIVE** — TTP cross-referencing |
| `articles` | `schema.ts:243` | Editorial threat intelligence articles | Ingest deep AI generation | API `/api/v1/articles`, UI | **ACTIVE** — Long-form editorial content |
| `reports` | `schema.ts:272` | Formal intelligence PDF reports | D1 migrations / admin seed | API `/api/v1/reports`, UI | **PARTIAL** — PDF R2 keys unpopulated |
| `social_assets` | `schema.ts:314` | Multi-platform social copy (Telegram, X) | Ingest publisher, API | Queue consumer | **ACTIVE** — Outbound content pipeline |
| `social_publications` | `schema.ts:331` | Audit log of published social posts | Ingest publisher | Queue consumer | **ACTIVE** — Publication verification |
| `knowledge_documents` | `schema.ts:386` | Corpus document metadata (tier, authority) | Knowledge batch sync | API `/api/v1/knowledge` | **ACTIVE** — Authoritative RAG grounding |
| `knowledge_chunks` | `schema.ts:407` | Chunked text with Vectorize embedding IDs | Knowledge batch sync | Hybrid retrieval RAG | **ACTIVE** — Primary vector search target |
| `ai_runs` | `schema.ts:424` | Audit log of Workers AI execution & tokens | Ingest AI, Analyst API | API `/api/v1/admin/ai-budget`| **ACTIVE** — Budget & neuron governor |
| `event_trace` | `0007_trace.sql` | Pipeline latency & execution audit trail | Ingest & API trace helper | Ops dashboard | **ACTIVE** — Performance tracing |
| `canary_events` | `0004_canary.sql` | Canary ingestion verification records | Canary trigger workers | Canary test suites | **ACTIVE** — End-to-end testing |
| `users` | `schema.ts:11` | User accounts & roles | None (no auth active) | Unused at runtime | **MOCKED / INACTIVE** — Schema declared only |
| `organizations` | `schema.ts:22` | Enterprise accounts & domains | None | Unused at runtime | **MOCKED / INACTIVE** — Schema declared only |
| `subscriptions` | `schema.ts:34` | Plan tiers & billing periods | None (Stripe inactive) | Unused at runtime | **MOCKED / INACTIVE** — Schema declared only |
| `payment_sessions` | `schema.ts:47` | Stripe checkout idempotency & session IDs | None | Unused at runtime | **MOCKED / INACTIVE** — Schema declared only |
| `watchlists` | `schema.ts:347` | User custom alert criteria | None | API `/api/v1/alerts` (empty) | **PARTIAL** — Schema exists, UI absent |
| `alerts` | `schema.ts:357` | User notification queue | None | API `/api/v1/alerts` | **PARTIAL** — Schema exists, UI absent |
| `audit_events` | `schema.ts:372` | Administrative action audit log | None | Ops logging | **PARTIAL** — Infrequently written |
| `feature_usage` | `schema.ts:449` | Quota tracking per user/feature | None | Unused at runtime | **UNUSED** — Requires auth |
| `subscribers` | `schema.ts:461` | Newsletter email list | None | Unused at runtime | **UNUSED** — Email flow unintegrated |
| `analysts` | `schema.ts:468` | Human analyst author directory | None | Unused (articles hardcode team)| **UNUSED** — Schema remnant |
| `raw_feeds` | `schema.ts:494` | Raw telegram feed dump | Legacy seeder | Unused in API | **LEGACY** — Superseded by `source_messages` |
| `tools` | `schema.ts:513` | Cybersecurity software tooling catalog | Seed script | Unused in active UI | **UNUSED** — Unconnected directory |
| `programming_langs` | `schema.ts:526` | Language security characteristics | Seed script | Unused in active UI | **UNUSED** — Unconnected directory |

---

## 5. AGENT 3 — CLOUDFLARE & INFRASTRUCTURE FORENSICS

### Cloudflare Native Bindings Matrix

| Resource Type | Binding Name | Target Identifier | Config File | Active Usage |
| :--- | :--- | :--- | :--- | :---: |
| **D1 Database** | `DB` | `c19c8f45-801b-4034-bd76-402e5e5389b5` (`zayron-x-db`) | `wrangler.toml`, `wrangler.jsonc` | **ACTIVE** |
| **Workers AI** | `AI` | `@cf/meta/llama-3.1-8b-instruct`, `@cf/baai/bge-base-en-v1.5` | `workers/api/wrangler.toml` | **ACTIVE** |
| **Vectorize** | `VECTORIZE` | `zayron-knowledge-index` (768 dimensions) | `workers/api/wrangler.toml` | **ACTIVE** |
| **R2 Storage** | `KNOWLEDGE_BUCKET` | `zayron-x-knowledge` | `workers/api/wrangler.toml` | **ACTIVE** |
| **R2 Storage** | `STORAGE` | `zayron-x-storage` | Root `wrangler.toml` | **ACTIVE** |
| **Queue Producer** | `INGEST_QUEUE` | `zayron-ingest-queue` | `workers/api`, `workers/ingest` | **ACTIVE** |
| **Queue Consumer** | `INGEST_QUEUE` | `zayron-ingest-queue` (batch: 10, timeout: 5s) | `workers/ingest/wrangler.toml` | **ACTIVE** |
| **Queue Producer** | `PUBLISH_QUEUE` | `zayron-publish-queue` | `workers/api`, `workers/ingest` | **ACTIVE** |
| **Queue Consumer** | `PUBLISH_QUEUE` | `zayron-publish-queue` (batch: 10, timeout: 5s) | `workers/api/wrangler.toml` | **ACTIVE** |
| **Durable Object** | `TELEGRAM_COLLECTOR_DO` | `TelegramCollectorDO` (class with SQLite) | `workers/telegram-collector-do`| **ACTIVE** |
| **Workflow** | `RESEARCH_WORKFLOW` | `ResearchWorkflow` | `workers/api/wrangler.toml` | **ACTIVE** |
| **Workflow** | `KNOWLEDGE_CORPUS_WORKFLOW` | `KnowledgeCorpusWorkflow` | `workers/api/wrangler.toml` | **ACTIVE** |
| **Service Binding** | `API_WORKER` | `zayron-x-api` | `apps/web/wrangler.jsonc` | **ACTIVE** |
| **Service Binding** | `INGEST` | `zayron-x-ingest` | `workers/api/wrangler.toml` | **ACTIVE** |
| **Service Binding** | `TELEGRAM_COLLECTOR_SERVICE` | `zayron-telegram-collector-do` | `workers/api/wrangler.toml` | **ACTIVE** |
| **Cron Trigger** | `crons` | `["*/15 * * * *"]` | `workers/ingest/wrangler.toml` | **ACTIVE** |

### Verification of Non-Cloudflare Dependencies
- **Supabase**: **ELIMINATED**. No runtime imports or config exist in active code.
- **Docker / VPS / PM2**: **ELIMINATED**. All processes run on Cloudflare Workers / Durable Objects.
- **Redis**: **ELIMINATED**. Replaced by Cloudflare D1 and DO storage.
- **PostgreSQL**: **ELIMINATED**. All migrations are pure SQLite D1 compatible.
- **External AI (OpenAI / Anthropic)**: **ELIMINATED**. 100% powered by Cloudflare Workers AI.

---

## 6. AGENT 4 — SECURITY, AUTHENTICATION & RELIABILITY FORENSICS

### Authentication & Access Control Posture
1. **Total Absence of Frontend Authentication**:
   - `apps/web/app/login/page.tsx` explicitly warns: *"Authentication is not enabled here. No verified auth provider, session flow, or login endpoint is present in the current web application."*
   - There is no session token, cookie validation middleware, or JWT verification anywhere in `apps/web` or `workers/api`.
2. **Missing Multi-Tenant Isolation**:
   - While `users` and `organizations` tables exist in D1 schema, all queries across `threats`, `vulnerabilities`, `actors`, and `malware` return global public datasets. There is no tenant filtering (`WHERE org_id = ?`).
3. **Insecure Administrative Endpoints**:
   - `POST /api/v1/admin/sync-corpus`, `POST /api/v1/admin/knowledge/batch`, and `POST /api/v1/admin/collector-heartbeat` rely on optional header checks (`X-Knowledge-Token` or `Bearer`), but if `KNOWLEDGE_INTERNAL_TOKEN` is unset in worker variables, the check fails open or behaves inconsistently.
4. **AI Abuse & Rate Limiting Vulnerability**:
   - `POST /api/v1/ai/analyze` invokes Workers AI inference without per-IP or per-user rate limits. An external actor can trigger repeated LLM executions, stressing the 150 daily run budget.

### Reliability & Fault Tolerance
1. **Queue Idempotency Guards**:
   - Ingestion deduplication is enforced via `content_hash` and `(source_id, external_message_id)` unique indices on `source_messages`.
   - Social publication deduplication is enforced via `idempotency_key` unique indices on `social_assets`.
2. **AI Budget Circuit Breaker**:
   - `packages/intelligence/src/budget/index.ts` enforces a hard limit of 150 deep AI runs/day. When threshold is exceeded, deep LLM generation falls back to deterministic markdown templates (`workers/ingest/src/index.ts:691`).
3. **Queue Retry Policies**:
   - `max_batch_size: 10`, `max_batch_timeout: 5s`. Messages that fail processing retry up to 3 times before being logged and acknowledged to prevent poisoned queue stalls.

---

## 7. AGENT 5 — FRONTEND / BACKEND CONTRACT FORENSICS

### Contract Reality Matrix

| Product Route | File Path | Data Fetcher in `@/lib/api` | Target Backend Endpoint | Contract Health | Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `/` | `apps/web/app/page.tsx` | None | None | **DISCONNECTED** | Hardcoded editorial mocks; does not call API. |
| `/threats` | `apps/web/app/threats/page.tsx` | `getThreatFeed()` | `GET /api/v1/feed` | **ALIGNED** | Live D1 pagination, severity & type filtering. |
| `/threats/[id]` | `apps/web/app/threats/[slug]/page.tsx` | `getThreatById()` | `GET /api/v1/threats/:id` | **TYPE ERROR** | Type errors on component props (`EntityPill`, `Timeline`). |
| `/vulnerabilities` | `apps/web/app/vulnerabilities/page.tsx` | `getVulnerabilities()`| `GET /api/v1/vulnerabilities` | **ALIGNED** | Live CVE registry with EPSS/CVSS tags. |
| `/vulnerabilities/[cveId]`| `apps/web/app/vulnerabilities/[cveId]/page.tsx`| `getVulnerabilityById()`| `GET /api/v1/vulnerabilities/:id`| **ALIGNED** | Shows linked events, evidence snippets, and IOCs. |
| `/actors` | `apps/web/app/actors/page.tsx` | `getActors()` | `GET /api/v1/actors` | **ALIGNED** | Displays actor aliases, country, and motivation. |
| `/actors/[slug]`| `apps/web/app/actors/[slug]/page.tsx` | `getActorById()` | `GET /api/v1/actors/:id` | **ALIGNED** | Shows campaigns, linked events, and IOCs. |
| `/malware` | `apps/web/app/malware/page.tsx` | `getMalwareList()` | `GET /api/v1/malware` | **ALIGNED** | Lists malware families and YARA signatures. |
| `/malware/[slug]`| `apps/web/app/malware/[slug]/page.tsx`| `getMalwareById()` | `GET /api/v1/malware/:id` | **ALIGNED** | Shows malware details, rules, and events. |
| `/iocs` | `apps/web/app/iocs/page.tsx` | `getIOCs()` | `GET /api/v1/iocs` | **ALIGNED** | Live stream of IPs, SHA256 hashes, and domains. |
| `/campaigns` | `apps/web/app/campaigns/page.tsx` | `getCampaigns()` | `GET /api/v1/campaigns` | **TYPE ERROR** | Unchecked cast: `Record<string, unknown>` to ReactNode. |
| `/reports` | `apps/web/app/reports/page.tsx` | `getReports()` | `GET /api/v1/reports` | **TYPE ERROR** | Unchecked cast: `Record<string, unknown>` to ReactNode. |
| `/search` | `apps/web/app/search/page.tsx` | `searchGlobal()` | `GET /api/v1/search?q=` | **ALIGNED** | Multi-table unified search across 6 entities. |
| `/pricing` | `apps/web/app/pricing/page.tsx` | None | None | **MOCKED** | Static pricing tiers ($0, $20, $50); zero checkout. |
| `/login` | `apps/web/app/login/page.tsx` | None | None | **STUB** | Informs user authentication is not enabled. |

---

## 8. END-TO-END CAPABILITY EXECUTION TRACES

### Trace 1: Ingestion of Critical Vulnerability (NVD / KEV) ➔ Public Article ➔ Telegram Broadcast
```
1. Ingest Cron (workers/ingest/src/index.ts:78) fires every 15 minutes.
2. Polls NIST NVD API & CISA KEV JSON.
3. Detects CVE-2026-76038 (CVSS 9.8 Critical).
4. Constructs IngestionMessagePayload and enqueues to INGEST_QUEUE.
5. Ingest Queue Consumer receives batch.
6. Executes normalizeIntelligenceSignal() -> extracts CVEs, MITRE TTPs, computes severity: 'critical', confidence: 0.95.
7. Checks source_messages for existing content_hash -> none found.
8. Writes raw record to source_messages (status: 'SUCCEEDED').
9. Writes canonical record to intelligence_events (type: 'vulnerability_exploitation', severity: 'critical').
10. Writes provenance link to evidence table (weight: 1.0, type: 'authoritative_nvd').
11. Upserts to vulnerabilities table (cve_id: 'CVE-2026-76038', is_exploited_in_wild: 1).
12. Generates text embedding via Workers AI (@cf/baai/bge-base-en-v1.5) and upserts 768-dim vector to Vectorize.
13. Article Gate: signal is critical -> invokes Workers AI (@cf/meta/llama-3.1-8b-instruct) for structured analyst report.
14. Writes formatted article into articles table (is_published: 1, slug: 'cve-2026-76038-security-advisory-...').
15. Enqueues message to PUBLISH_QUEUE with Telegram derivative.
16. API Worker Queue Consumer receives job.
17. Validates intelligence_events status via Trust Gate.
18. Dispatches outbound alert to Telegram Bot API (channel: @zayronxai).
19. Writes audit record to social_publications (status: 'PUBLISHED').
```

### Trace 2: Hybrid Global Search Execution
```
1. User enters query "LockBit" in /search.
2. Frontend calls searchGlobal("LockBit") in apps/web/lib/api.ts.
3. Requests GET https://zayron-x-api.aabusabih.workers.dev/api/v1/search?q=LockBit.
4. API Worker executes Promise.all across 6 D1 queries:
   - SELECT FROM actors WHERE name LIKE %LockBit% OR aliases LIKE %LockBit%
   - SELECT FROM vulnerabilities WHERE title LIKE %LockBit% OR description LIKE %LockBit%
   - SELECT FROM malware WHERE name LIKE %LockBit% OR family LIKE %LockBit%
   - SELECT FROM iocs WHERE normalized_value LIKE %LockBit%
   - SELECT FROM intelligence_events WHERE title LIKE %LockBit% OR summary LIKE %LockBit%
   - SELECT FROM articles WHERE title LIKE %LockBit% OR content LIKE %LockBit%
5. Aggregates results, computes total_matches, returns JSON payload.
6. Frontend GlobalSearchPage renders partitioned result cards for each matched entity type.
```

---

## 9. STATE-MACHINE & LIFECYCLE FORENSICS

### 1. `source_messages` Lifecycle
```
[RAW SIGNAL INGESTED]
         │
         ├─── Spam Heuristic Match ───────────► [QUARANTINED] (Terminal)
         │
         ├─── Translation Error / Non-English ──► [NEEDS_TRANSLATION] (Held)
         │
         └─── English Verified / Synthesized ─► [SUCCEEDED] ──► Event Created
```

### 2. `intelligence_events` Confidence & Status Lifecycle
```
[NEW EVENT CREATED] (Status: UNASSESSED)
         │
         ├── Confidence Score < 0.40  ────────► [LOW]
         ├── Confidence Score 0.40 - 0.69 ────► [MODERATE]
         ├── Confidence Score 0.70 - 0.89 ────► [HIGH]
         └── Confidence Score >= 0.90 ────────► [CONFIRMED]
                     │
                     └── Multi-Source Conflict ─► [DISPUTED]
```

### 3. `social_publications` Distribution Lifecycle
```
[QUEUED in PUBLISH_QUEUE]
         │
         ├─── Trust Gate Rejection ──────────► [REJECTED] (Terminal)
         │
         ├─── Duplicate Idempotency Key ─────► [DUPLICATE] (Terminal)
         │
         ├─── HTTP 200 from Telegram API ─────► [PUBLISHED] (Terminal)
         │
         └─── Network Failure / Rate Limit ──► [FAILED_RETRYABLE] (Exponential Backoff, Max 3 Retries)
                                                       │
                                                       └── Exceeded Retries ──► [FAILED_PERMANENT]
```

---

## 10. ASYNC, QUEUE & SCHEDULED JOB FORENSICS

1. **`zayron-ingest-queue`**:
   - **Producers**: `workers/ingest/src/index.ts` (cron & RSS), `workers/telegram-collector-do/src/collector-do.ts` (Telegram MTProto), `workers/api/src/index.ts` (`POST /api/v1/webhook/telegram`).
   - **Consumer**: `workers/ingest/src/index.ts`.
   - **Batching**: `max_batch_size: 10`, `max_batch_timeout: 5 seconds`.
   - **Failure Mode**: Retries up to 3 times before logging permanent failure and acknowledging message to prevent poisoned queue stalls.

2. **`zayron-publish-queue`**:
   - **Producers**: `workers/ingest/src/index.ts` (upon generating public articles), `workers/api/src/index.ts` (`POST /api/v1/publish/outbound`).
   - **Consumer**: `workers/api/src/index.ts:356`.
   - **Batching**: `max_batch_size: 10`, `max_batch_timeout: 5 seconds`.
   - **Retry Policy**: Exponential backoff (`delaySeconds: Math.min(300, 2 ** attempts * 10)`).

3. **Scheduled Ingestion Cron (`*/15 * * * *`)**:
   - Runs in `zayron-x-ingest` Worker every 15 minutes.
   - Idempotency is guaranteed by D1 unique index on `(source_id, external_message_id)` and content hash check.

---

## 11. EXHAUSTIVE ENDPOINT & API INVENTORY

All 47 HTTP endpoints implemented in `workers/api/src/index.ts`:

| # | HTTP Method | Path | Purpose | Input / Params | Database Queries | Auth Required |
| :-: | :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | `OPTIONS` | `/*` | CORS Preflight | Headers | None | None |
| 2 | `GET` | `/api/v1/health` | System Health Check | None | `SELECT 1` | None |
| 3 | `GET` | `/api/v1/knowledge` | Knowledge Document Catalog | `type`, `tier` | `SELECT FROM knowledge_documents` | None |
| 4 | `GET` | `/api/v1/knowledge/:id` | Single Knowledge Doc | Path `:id` | `SELECT FROM knowledge_documents` | None |
| 5 | `POST` | `/api/v1/knowledge/search` | Knowledge Search | `{ query, limit }` | Vectorize + D1 chunk join | None |
| 6 | `GET` | `/api/v1/sources/directory` | Verified Source Directory | `status`, `type` | `SELECT FROM sources` | None |
| 7 | `GET` | `/api/v1/regulations` | Compliance & Standards | None | Standards registry lookup | None |
| 8 | `GET` | `/api/v1/knowledge/corpus` | Raw Corpus Catalog | None | `SELECT FROM knowledge_documents` | None |
| 9 | `POST` | `/api/v1/rag/context-pack` | Bounded Context Pack | `{ query, maxTokens }` | Vectorize + D1 chunks | None |
| 10 | `POST` | `/api/v1/rag/retrieve` | Hybrid RAG Retrieval | `{ query, topK }` | D1 entities + Vectorize | None |
| 11 | `POST` | `/api/v1/rag/grounded-answer` | Epistemic Grounded QA | `{ question }` | Vectorize + Workers AI | None |
| 12 | `POST` | `/api/v1/analyze` | Fast Threat Analysis | `{ text, entities }` | Heuristics + D1 | None |
| 13 | `GET` | `/api/v1/sources` | Sources List | `limit`, `offset` | `SELECT FROM sources` | None |
| 14 | `POST` | `/api/v1/admin/collector-heartbeat` | Collector Ping | `{ workerId, status }` | Memory state / audit log | Header (Weak) |
| 15 | `GET` | `/api/v1/admin/collector-health` | Collector Health | None | State inspect | Header (Weak) |
| 16 | `GET` | `/api/v1/admin/ops-dashboard` | Operations Metrics | None | `SELECT count FROM events, etc.` | Header (Weak) |
| 17 | `GET` | `/api/v1/admin/ai-budget` | AI Neuron Budget State | None | `SELECT FROM ai_runs` | Header (Weak) |
| 18 | `POST` | `/api/v1/social/derivatives` | Generate Social Posts | `{ eventId, platforms }` | `SELECT FROM articles, events` | None |
| 19 | `POST` | `/api/v1/research/workflow` | Trigger Research Workflow | `{ eventId, query }` | Cloudflare Workflow create | None |
| 20 | `POST` | `/api/v1/canary/nvd` | Canary Test Execution | `{ cve_id }` | RPC to Ingest Worker | None |
| 21 | `POST` | `/api/v1/publish` | Approve & Publish Post | `{ intelligence_id }` | `SELECT/UPDATE intelligence_events`| None |
| 22 | `POST` | `/api/v1/publish/outbound` | Outbound Channel Dispatch | `{ articleId, channel }` | `INSERT social_publications` | None |
| 23 | `POST` | `/api/v1/admin/benchmark-models` | Test Workers AI Models | None | Workers AI inference | Header (Weak) |
| 24 | `POST` | `/api/v1/admin/knowledge/batch` | Bulk Knowledge Ingest | `{ chunks: [] }` | D1 batch insert + Vectorize | Header (Weak) |
| 25 | `POST` | `/api/v1/admin/sync-corpus` | Sync R2 Corpus to D1 | None | R2 read + D1 batch insert | Header (Weak) |
| 26 | `POST` | `/api/v1/webhook/telegram` | Telegram Inbound Webhook | Bot API JSON update | `INGEST_QUEUE.send()` | None |
| 27 | `GET` | `/api/v1/feed` | Public Threat Feed | `limit, offset, severity`| `SELECT FROM intelligence_events` | None |
| 28 | `GET` | `/api/v1/articles` | Editorial Articles List | `category, limit` | `SELECT FROM articles WHERE is_pub=1`| None |
| 29 | `GET` | `/api/v1/articles/:slug` | Single Editorial Article | Path `:slug` | `SELECT FROM articles` | None |
| 30 | `GET` | `/api/v1/threats/:id` | Event Detail + Evidence | Path `:id` | `SELECT FROM events + evidence` | None |
| 31 | `GET` | `/api/v1/vulnerabilities` | CVE Registry List | `q, severity, limit` | `SELECT FROM vulnerabilities` | None |
| 32 | `GET` | `/api/v1/vulnerabilities/:id` | CVE Detail + Linked Events | Path `:id` (CVE ID) | `SELECT vuln + events + iocs` | None |
| 33 | `GET` | `/api/v1/actors` | Threat Actor Registry | `q, limit, offset` | `SELECT FROM actors` | None |
| 34 | `GET` | `/api/v1/actors/:id` | Actor Detail + Campaigns | Path `:id` (slug/id) | `SELECT actor + campaigns + events`| None |
| 35 | `GET` | `/api/v1/malware` | Malware Family List | `q, limit, offset` | `SELECT FROM malware` | None |
| 36 | `GET` | `/api/v1/malware/:id` | Malware Detail + YARA | Path `:id` (slug/id) | `SELECT malware + events + rules` | None |
| 37 | `GET` | `/api/v1/iocs` | Indicator Stream (IP/SHA) | `type, q, limit` | `SELECT FROM iocs` | None |
| 38 | `GET` | `/api/v1/iocs/:value` | Single IOC + Linked Events | Path `:value` | `SELECT ioc + event + evidence` | None |
| 39 | `GET` | `/api/v1/campaigns` | Campaign List | `limit, offset` | `SELECT FROM campaigns` | None |
| 40 | `GET` | `/api/v1/campaigns/:id` | Campaign Detail + Actor | Path `:id` | `SELECT campaign + actor + events` | None |
| 41 | `GET` | `/api/v1/reports` | Research Reports List | `tier, limit` | `SELECT FROM reports` | None |
| 42 | `GET` | `/api/v1/reports/:id` | Single Research Report | Path `:id` | `SELECT FROM reports` | None |
| 43 | `GET` | `/api/v1/graph/edges` | Graph Node/Edge Export | `limit` | `SELECT FROM relations` | None |
| 44 | `GET` | `/api/v1/ai/runs` | AI Audit Log Runs | `workflow, limit` | `SELECT FROM ai_runs` | None |
| 45 | `GET` | `/api/v1/alerts` | User Alert Feed | None | `SELECT FROM alerts` | None |
| 46 | `POST` | `/api/v1/ai/analyze` | Grounded AI Threat Analyst | `{ query: string }` | Hybrid RAG + Workers AI Llama | None |
| 47 | `GET` | `/api/v1/search` | Unified 6-Table Search | `?q=string` | 6 parallel `SELECT` queries in D1 | None |

---

## 12. CONFIGURATION & ENVIRONMENT FORENSICS

| Variable Name | Declared In | Purpose | Active Usage | Sensitivity |
| :--- | :--- | :--- | :---: | :---: |
| `CLOUDFLARE_ACCOUNT_ID` | `.env.example` | Account identification for Wrangler | Tooling | Low |
| `CLOUDFLARE_API_TOKEN` | Secret / Env | Deployment authorization | CI/Tooling | **CRITICAL SECRET** |
| `D1_DATABASE_ID` | `.env.example`, `wrangler.toml` | D1 database UUID | Runtime binding | Low |
| `VECTORIZE_INDEX_NAME` | `.env.example`, `wrangler.toml` | Vectorize index identifier | Runtime binding | Low |
| `R2_BUCKET_KNOWLEDGE` | `.env.example`, `wrangler.toml` | R2 bucket for knowledge corpus | Runtime binding | Low |
| `R2_BUCKET_STORAGE` | `.env.example`, `wrangler.toml` | R2 bucket for media storage | Runtime binding | Low |
| `NEXT_PUBLIC_APP_URL` | `.env.example`, `wrangler.toml` | Canonical website domain | Canonical URLs | Public |
| `TELEGRAM_BOT_TOKEN` | Secret | Outbound alert publishing | Worker Secret | **HIGH SECRET** |
| `TELEGRAM_TARGET_CHANNEL` | `.env.example`, `wrangler.toml` | Channel username (`zayronxai`) | Outbound broadcast | Public |
| `TELEGRAM_API_ID` | Secret | MTProto client API ID | DO Secret | **HIGH SECRET** |
| `TELEGRAM_API_HASH` | Secret | MTProto client API Hash | DO Secret | **CRITICAL SECRET** |
| `KNOWLEDGE_INTERNAL_TOKEN`| Worker Var | Admin endpoint token check | Worker Variable | **HIGH SECRET** |

---

## 13. DEPENDENCY & PACKAGE FORENSICS

- **Monorepo Manager**: `bun` (`bun@1.3.13`), workspaces: `apps/*`, `packages/*`, `workers/*`.
- **Framework**: `next@16.3.2`, `react@19.2.8`, `react-dom@19.2.8`.
- **Deployment Adapter**: `@vinext/cloudflare` + `vinext@1.0.0-beta.8`.
- **Styling**: `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `@tailwindcss/vite@^4.3.3`.
- **Icons & Motion**: `lucide-react@^1.33.0`, `framer-motion@^13.1.1`.
- **Database & Types**: `drizzle-orm@^0.45.2`, `drizzle-kit@^0.31.10`, `@cloudflare/workers-types@^4.20250815.0`.
- **MTProto / Telegram**: `telegram@^2.26.16` (GramJS in Durable Object).

---

## 14. CODE-LEVEL TECHNICAL DEBT & ANTI-PATTERNS

1. **TypeScript Build Errors in `apps/web`**:
   - `bunx tsc --noEmit` fails in `apps/web` across `app/campaigns/page.tsx`, `app/reports/page.tsx`, `app/reports/[id]/page.tsx`, and `app/threats/[slug]/page.tsx`.
   - **Root Cause**: Unchecked typing of API responses returning `Record<string, unknown>`, which React refuses to render as children (`Type 'unknown' is not assignable to type 'ReactNode'`).
   - Component prop mismatches: `EntityPill` expected `{ type, value }`, received `{ entity }`. `WhyItMatters` expected `{ text? }`, received `{ confirmed, defensive, unknown }`.
2. **Duplicate Schema Definitions**:
   - `cves` table in `schema.ts:479` duplicates `vulnerabilities` table in `schema.ts:197`.
   - `raw_feeds` in `schema.ts:494` is obsolete legacy residue superseded by `source_messages`.
3. **Empty / Stub UI Package**:
   - `packages/ui` contains zero reusable components, leading to duplicate UI components copy-pasted across `apps/web/components` and `apps/web/app/_components`.
4. **Beige / Mismatched Landing Page Palette**:
   - `apps/web/app/page.tsx` uses `bg-[#F6F4EE]` (warm beige) and `#FF5500` accents, conflicting with the authoritative brand specification: `#0A0A0A` (Black 23%), `#FFFFFF` (White 70%), and `#FF6B00` (Orange 7%).

---

## 15. PRODUCT TRUTH MATRIX

| Capability | Status | Frontend Route | Backend Implementation | Database Tables | External Dependencies | Evidence | Confidence |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Threat Intelligence Feed** | **REAL** | `/threats`, `/threats/[id]` | `workers/api:1057`, `GET /api/v1/feed` | `intelligence_events`, `evidence` | None | `apps/web/app/threats/page.tsx:27` | **100%** |
| **Vulnerability Radar** | **REAL** | `/vulnerabilities`, `/[cveId]` | `workers/api:1203`, `GET /api/v1/vulnerabilities`| `vulnerabilities` | NVD, CISA KEV | `apps/web/app/vulnerabilities/page.tsx:24`| **100%** |
| **Threat Actors Directory** | **REAL** | `/actors`, `/actors/[slug]` | `workers/api:1275`, `GET /api/v1/actors` | `actors`, `relations` | None | `apps/web/app/actors/page.tsx:24` | **100%** |
| **Malware & YARA Directory** | **REAL** | `/malware`, `/malware/[slug]`| `workers/api:1332`, `GET /api/v1/malware` | `malware`, `relations` | None | `apps/web/app/malware/page.tsx:24` | **100%** |
| **IOC Indicator Registry** | **REAL** | `/iocs`, `/iocs/[value]` | `workers/api:1384`, `GET /api/v1/iocs` | `iocs` | None | `apps/web/app/iocs/page.tsx:24` | **100%** |
| **Global Multi-Entity Search**| **REAL** | `/search` | `workers/api:1699`, `GET /api/v1/search` | 6 D1 Tables | None | `apps/web/app/search/page.tsx:17` | **100%** |
| **24/7 Telegram Collection** | **REAL** | Internal | `workers/telegram-collector-do` | `source_messages` | Telegram MTProto | `workers/telegram-collector-do/src` | **100%** |
| **Automated Ingestion Cron** | **REAL** | Internal | `workers/ingest/src/index.ts:78` | `source_messages`, `events` | CISA, NVD, MSRC | `workers/ingest/wrangler.toml:61` | **100%** |
| **AI Analyst Assessment** | **REAL** | Internal / API | `workers/api:1507`, `POST /api/v1/ai/analyze` | `ai_runs`, Vectorize | Workers AI | `packages/intelligence/src/analyst` | **100%** |
| **Campaign Intelligence** | **PARTIAL** | `/campaigns`, `/[slug]` | `workers/api:1444`, `GET /api/v1/campaigns`| `campaigns` | None | API works; frontend has type error | **85%** |
| **Research Reports** | **PARTIAL** | `/reports`, `/reports/[slug]` | `workers/api:1463`, `GET /api/v1/reports` | `reports` | R2 | API works; PDF generation unbuilt | **80%** |
| **Knowledge Core Catalog** | **PARTIAL** | `/knowledge` | `workers/api:405`, `GET /api/v1/knowledge` | `knowledge_documents` | Vectorize, R2 | API works; frontend UI rudimentary | **85%** |
| **Telegram Outbound Alerts** | **PARTIAL** | Internal | `workers/api:271`, `publishApprovedIntelligence`| `social_publications` | Telegram Bot API | Queue works; token provisioning unverified| **80%** |
| **User Authentication** | **MOCK** | `/login` | None | `users` (unwritten) | None | `/login` explicitly states inactive | **0%** |
| **Stripe Subscriptions** | **MOCK** | `/pricing` | None | `subscriptions` (unwritten)| None | Static cards with zero checkout | **0%** |
| **User Watchlists & Alerts** | **PLANNED** | None | `workers/api:1499`, `GET /api/v1/alerts` | `watchlists`, `alerts` | None | Schema & endpoint exist; no UI | **40%** |
| **Jobs Marketplace** | **UNUSED** | None | None | `jobs` | None | Unconnected schema table | **0%** |
| **Cyber Tools Directory** | **UNUSED** | None | None | `tools` | None | Unconnected schema table | **0%** |

---

## 16. RED FLAG REGISTER

| ID | Category | Severity | Component | Evidence | Impact | Confidence | Recommendation |
| :-: | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **RF-01** | Security | **CRITICAL** | User Access & Auth | `apps/web/app/login/page.tsx:3` | No login or session control; all authenticated features cannot function. | High | Keep current public read-only model clean; do not pretend auth works until Cloudflare Access or Clerk/Auth is integrated. |
| **RF-02** | Security | **CRITICAL** | API Administration | `workers/api/src/index.ts:909,939` | Admin endpoints lack mandatory, enforced secret authentication. | High | Bind a mandatory `ADMIN_API_KEY` secret and reject all unauthorized requests. |
| **RF-03** | Reliability | **HIGH** | Web Application Build | `bunx tsc --noEmit` in `apps/web` | Next.js build fails on `campaigns`, `reports`, and `threats/[slug]` due to type errors. | High | Correct type signatures in `apps/web/lib/api.ts` and ensure components render string fields safely. |
| **RF-04** | Architecture | **HIGH** | Landing Page (`/`) | `apps/web/app/page.tsx:16` | Landing page is completely disconnected from real backend data and uses beige `#F6F4EE`. | High | Rebuild landing page to consume real CTI telemetry and apply the authoritative Design DNA & palette. |
| **RF-05** | Security / Cost | **HIGH** | Public AI Endpoint | `workers/api/src/index.ts:1507` | `POST /api/v1/ai/analyze` has no IP rate limiting, exposing Workers AI neurons to exhaustion. | High | Place Cloudflare rate limiting rule or Turnstile CAPTCHA on the public AI endpoint. |
| **RF-06** | Architecture | **HIGH** | UI Component Library | `packages/ui/src/index.ts` | Package is an empty stub; components are duplicated across apps. | High | Migrate battle-tested components into `packages/ui` during next phase. |
| **RF-07** | Data Model | **MEDIUM** | D1 Schema Redundancy | `packages/intelligence/db/schema.ts:479` | `cves` duplicates `vulnerabilities`; `raw_feeds` is dead code. | High | Mark `cves` and `raw_feeds` as deprecated in migrations. |
| **RF-08** | Reliability | **MEDIUM** | PDF Report Delivery | `workers/api/src/index.ts:1463` | Reports table references `pdf_r2_key`, but no PDF generator exists. | High | Restrict reports to on-screen intelligence dossiers until PDF generator is built. |

---

## 17. AGENT CROSS-CHECK & DISCREPANCY RESOLUTION

- **Discrepancy 1: Does Supabase or Docker exist?**  
  *Finding*: Grep scans show no active imports. Previous forensic cleanup successfully removed all legacy containers and external SQL connections. Active state is 100% Cloudflare Native.
- **Discrepancy 2: Are D1 tables 33 or 36?**  
  *Resolution*: `packages/intelligence/db/schema.ts` defines 33 tables. However, migration files `0001_evidence_ledger.sql`, `0004_canary_events.sql`, and `0007_event_trace.sql` create 3 additional production tables (`evidence_ledger`, `canary_events`, `event_trace`). Total table count is **36**.
- **Discrepancy 3: Is the Landing page real or mock?**  
  *Resolution*: Deep pages (`/threats`, `/vulnerabilities`, etc.) call real APIs and display real D1 data. The root landing page (`/`), however, is a static mock using outdated beige colors. The landing page must be redesigned to reflect live telemetry.

---

## 18. FINAL ARCHITECTURAL MODEL

### Current State
A high-performance Cloudflare-native backend operating real-time CTI ingestion from Telegram, NVD, and CISA feeds, normalizing records with Workers AI, storing vectors in Vectorize, and exposing 47 REST endpoints. The frontend is split: internal intelligence pages consume live API data, but the homepage and billing tiers remain mocked, and frontend TypeScript compilation is broken by type drift.

### Target Architecture
A unified, high-integrity CTI intelligence platform where:
1. The web frontend compiles cleanly with strict TypeScript safety.
2. The homepage directly pulls and highlights live telemetry from `/api/v1/feed` and `/api/v1/search`.
3. The visual language adopts the Figma Reference DNA (1200px container, 16px radius, pill CTAs, 8px grid) combined with the ZAYRON-X palette (`#0A0A0A` Black, `#FFFFFF` White, `#FF6B00` Orange).
4. Unused schema tables (`jobs`, `tools`, `raw_feeds`, `cves`) are phased out.
5. Administrative endpoints and public AI endpoints are hardened with rate limits and secret tokens.

---

## 19. DESIGN SOURCE OF TRUTH
*(Authoritative Engineering Specification for the Next UI Generation Phase)*

> [!IMPORTANT]
> The future UI/UX generation phase **MUST** consume this section as its non-negotiable specification. Do **NOT** invent fake endpoints, unverified entities, or imaginary workflows.

### 1. Verified Product Capabilities Eligible for UI Representation
Only the following 10 real capabilities may be surfaced in navigation and page views:
1. **Threat Intelligence Wire** (Real-time telemetry stream from `GET /api/v1/feed`).
2. **Vulnerability Radar** (CVE registry, CVSS scores, CISA KEV exploitation flags from `GET /api/v1/vulnerabilities`).
3. **Threat Actor Dossiers** (State-sponsored APTs, cybercrime syndicates, aliases from `GET /api/v1/actors`).
4. **Malware & Payload Index** (Ransomware, stealers, loaders, YARA/Sigma rules from `GET /api/v1/malware`).
5. **IOC Indicator Registry** (Network IPs, SHA-256 hashes, domains from `GET /api/v1/iocs`).
6. **Campaign Intelligence** (Correlated operations and sector targeting from `GET /api/v1/campaigns`).
7. **Unified Intelligence Search** (Multi-table real-time discovery across 6 entities via `GET /api/v1/search?q=`).
8. **Knowledge Core & Standards** (Authoritative security frameworks, NIST, MITRE mappings from `GET /api/v1/knowledge`).
9. **Research & Editorial Articles** (Deep analyst-grade assessments from `GET /api/v1/articles`).
10. **Institutional Access & Pricing** (Transparent capability-based tiers).

### 2. Required Screen & Navigation Model
* **Primary Header Navigation**:
  - `Threats` ➔ `/threats` (Operational stream)
  - `Vulnerabilities` ➔ `/vulnerabilities` (CVE Radar)
  - `Entities` (Dropdown or Group) ➔ `/actors`, `/malware`, `/campaigns`, `/iocs`
  - `Research` ➔ `/articles`, `/reports`
  - `Knowledge` ➔ `/knowledge`
  - `Search` ➔ `/search` (Command/Search icon)
* **Primary Header Actions**:
  - `Institutional Access` ➔ `/pricing` (High-contrast button)
  - *Do NOT place a non-functional "Login" button in primary view until auth is implemented.*

### 3. Concrete Data & State Requirements

| Screen | Required Backend API | Critical Data Fields | Required States |
| :--- | :--- | :--- | :--- |
| **Homepage** | `GET /api/v1/feed?limit=6`, `GET /api/v1/vulnerabilities?limit=5` | `title`, `severity`, `confidence`, `cves`, `actors`, `first_seen_at` | Loading Skeleton, Live Feed, Empty State, Error |
| **Threats Stream** | `GET /api/v1/feed` | `id`, `title`, `summary`, `severity`, `confidence`, `entities`, `evidence_count` | Filter by Severity, Pagination (offset), Empty, Error |
| **Threat Detail** | `GET /api/v1/threats/:id` | `title`, `summary`, `mitre_matrix`, `evidence: [{ url, snippet, weight }]` | Full Evidence View, Source Citation, Unreviewed Badge |
| **Vulnerabilities** | `GET /api/v1/vulnerabilities`| `cve_id`, `title`, `severity`, `cvss_score`, `epss_score`, `is_exploited_in_wild` | KEV Active Filter, Severity Filter, Search Input |
| **Actors** | `GET /api/v1/actors` | `name`, `slug`, `aliases`, `country`, `motivation`, `first_seen`, `last_active` | Country Filter, Search Input, Detail Modal/Page |
| **Malware** | `GET /api/v1/malware` | `name`, `slug`, `family`, `type`, `yara_rule`, `sigma_rule` | Type Filter, Syntax-highlighted rule view |
| **Search Surface** | `GET /api/v1/search?q=` | Grouped: `actors[]`, `vulnerabilities[]`, `malware[]`, `iocs[]`, `events[]` | Initial Prompt, Typing Debounce, Empty Match, Error |

### 4. Authoritative Visual System & Brand Tokens
* **Color Palette & Visual Distribution**:
  - **White (`#FFFFFF`) — 70%**: Main background canvas, clean card surfaces, readable negative space.
  - **Black (`#0A0A0A`) — 23%**: Primary typography, high-contrast headers, dark accent cards, terminal blocks.
  - **Orange (`#FF6B00`) — 7%**: Tactical intelligence signal, critical severity badges, pulse indicators, primary action accents.
  - **Neutrals / Borders**: `#E5E7EB` (Light Gray border), `#F9FAFB` (Subtle off-white card surface), `#6B7280` (Muted body text).
* **Typography**:
  - Headings: `Space Grotesk` or `Inter` (Tight tracking `-0.03em`, Bold 700/800).
  - Body & UI: `Inter` (Clean neo-grotesque, Regular 400 & Medium 500).
  - Code & Identifiers: `JetBrains Mono` (CVE IDs, Hashes, IP addresses, Timestamps).
* **Component Architecture (Figma DNA)**:
  - **Container**: Max-width `1200px` centered with generous vertical spacing (`80px`–`128px`).
  - **Card Radius**: Consistent `16px` (`rounded-2xl`) on major content containers.
  - **Buttons & Badges**: Full pill radius `9999px` (`rounded-full`) for CTAs and status chips.
  - **Borders & Shadows**: Razor-thin `1px solid #E5E7EB`, restrained ambient shadows (`0 1px 3px rgba(0,0,0,0.05)`).
* **Intelligence Signals**:
  - `CRITICAL` ➔ Pill badge: Solid `#FF6B00` or `#EF4444` with white text.
  - `HIGH` ➔ Pill badge: `#F97316` (Orange-Amber).
  - `MEDIUM` ➔ Pill badge: `#EAB308` (Yellow).
  - `LOW` ➔ Pill badge: `#3B82F6` (Blue).
  - `CONFIDENCE` ➔ Percentage indicator with telemetry grounding citation.

---
*End of ZAYRON-X Forensic Backend Intelligence & Design Source-of-Truth Audit.*
