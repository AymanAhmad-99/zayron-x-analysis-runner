# ZAYRON-X: Dependency Graph Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Imports/Exports, Internal Services, Database Dependencies, API Mappings, and Queue Events  
**Timestamp:** 2026-06-11T03:46:00Z  

---

## 1. Code Level Import/Export Dependencies

### 1.1 Python Core Swarm (`workers/`)
The Python backend processes follow a strict import pattern to avoid circular dependencies:

```
[workers.config]
     │
     ├── imports environment settings
     └── exposes GEMINI_PRO_MODEL, SUPABASE_SERVICE_KEY, etc.
     
[workers.contracts.inter_agent]
     │
     ├── imports pydantic.BaseModel
     └── exports HarvestPayload, ValidatedIntel, ExecutiveSITREP
     
[shared.models.article] (and other models under shared/models)
     │
     ├── imports pydantic.BaseModel
     └── exports ArticleInsert, ArticleSITREP

[workers.persistence]
     │
     ├── imports workers.config (SUPABASE_SERVICE_KEY, etc.)
     ├── imports shared.models.ArticleInsert
     ├── imports workers.contracts.inter_agent.ExecutiveSITREP
     └── exports claim_pending_feeds(), mark_feed_status(), persist_sitrep()

[workers.omni_crew]
     │
     ├── imports workers.config (GEMINI_API_KEY, GEMINI_PRO_MODEL, etc.)
     ├── imports workers.contracts.inter_agent.ExecutiveSITREP
     ├── imports workers.persistence (claim_pending_feeds, persist_sitrep, etc.)
     └── exports GeminiClient, master_crew_scheduler(), main()
```

### 1.2 Frontend Code Base (`gerasys-online/`)
- **`gerasys-online/lib/supabase/client.ts`**: Imports `@supabase/supabase-js`. Exports `getSupabaseClient()` (public anonymous access) and `getSupabaseAdmin()` (admin access using service role key).
- **`gerasys-online/lib/supabase/queries/articles.ts`**: Imports `getSupabaseClient` and `getSupabaseAdmin` from client setup. Exports CRUD queries (`getArticleBySlug`, `createArticle`, `updateArticle`, `deleteArticle`).
- **`gerasys-online/middleware.ts`**: Imports `@supabase/ssr` (`createServerClient`) and rate-limiting modules. Restricts `/admin/*` routes, `/api/remediate`, `/api/download-sitrep` routes, and rate-limits `/login` and `/register`.

---

## 2. Ingestion to Processing Pipeline Flow

The event routing queue links ingestors, storage, and processing cores:

```mermaid
graph TD
    subgraph Ingestion Layer (Docker Containers)
        A[zayron_radar] -->|Scrapes Telegram| D[(Supabase raw_feeds)]
        B[zayron_rss] -->|Scrapes RSS| D
        C[zayron_darkweb] -->|Scrapes Leaks| D
        E[zayron_cve] -->|Scrapes NVD| F[(Supabase cves)]
    end

    subgraph Database Queue
        D -->|status: pending| G{omni_crew claim}
    end

    subgraph Processing Swarm
        G -->|Optimistic status lock| H[zayron_crew_daemon]
        H -->|RAG Grounding FTS| I[(Supabase knowledge_embeddings)]
        H -->|Gemini single-pass inference| J{Weaver Output}
    end

    subgraph Persistence Dispatcher
        J -->|Category: vulnerabilities| K[(Supabase articles & cves)]
        J -->|Category: threat_intel / tools / osint| L[(Supabase articles & threat_artifacts_secure)]
        K & L -->|ISR Cache Invalidation| M[Next.js Frontend Client]
    end
```

---

## 3. Database Dependencies

All components interact with database schema objects. The dependencies are mapped as follows:

| Database Object | Type | Reader Components | Writer Components |
| :--- | :--- | :--- | :--- |
| `public.raw_feeds` | Table | `zayron_crew` | `zayron_radar`, `zayron_rss`, `zayron_darkweb` |
| `public.articles` | Table | Next.js Frontend App | `zayron_crew` |
| `public.cves` | Table | Next.js Frontend App | `zayron_cve`, `zayron_crew` (routing logic) |
| `public.profiles` | Table | Next.js Auth Middleware, `check_is_subscriber()` | Supabase Auth Trigger (`handle_new_user`) |
| `public.threat_artifacts_secure` | Table | `public.threat_artifacts` view | `zayron_crew` (routing logic) |
| `public.threat_artifacts` | View | Next.js Frontend App | *Read-only (displays masked/unmasked CTI)* |
| `public.knowledge_embeddings` | Table | `zayron_crew` (FTS RAG query) | Manual / CLI upload tool |
| `public.analysts` | Table | Next.js Frontend App | Next.js Admin API (`/api/seed-analysts`) |
| `public.tools` | Table | Next.js Frontend App | *Seeded once at setup* |
| `public.programming_langs` | Table | Next.js Frontend App | *Seeded once at setup* |
| `public.trending` | Table | Next.js Frontend App | Next.js Serverless Functions |

---

## 4. API & Egress Dependencies

The system depends on several third-party API networks and endpoints:

1. **Google Generative AI API (`api.generativeai.google.com`)**:
   - **Dependent Component**: `zayron_crew_daemon`
   - **Purpose**: Swarm inference processing (resolves threat details via Gemini Pro/Flash).
   - **Egress Path**: Clearnet HTTPS.

2. **NIST NVD REST API (`services.nvd.nist.gov/rest/json/cves/2.0`)**:
   - **Dependent Component**: `zayron_cve_daemon`
   - **Purpose**: Tracking CVE disclosures using poll windows.
   - **Egress Path**: Clearnet HTTPS.

3. **Ransomwatch Feed (`raw.githubusercontent.com/joshhighet/ransomwatch/...`)**:
   - **Dependent Component**: `zayron_darkweb_daemon`
   - **Purpose**: Real-time ransomware leak tracking.
   - **Egress Path**: Clearnet HTTPS.

4. **Tor Network Egress Proxy (`tor_proxy:9150` / `tor_proxy:9051`)**:
   - **Dependent Components**: `zayron_radar_daemon` (Telegram scraper), `zayron_darkweb_daemon` (onion web crawlers).
   - **Purpose**: Routing CTI intelligence scans anonymously.
   - **Egress Path**: SOCKS5 / Tor Egress.

5. **Upstash Redis HTTP API**:
   - **Dependent Component**: `zayron_crew_daemon` (quota enforcement), Next.js Middleware (request throttling).
   - **Purpose**: Atomic daily API counter state management and client rate limiting.
   - **Egress Path**: Clearnet HTTPS.

---

## 5. Background Jobs, Queues & Event Flows

1. **Background Job - Telegram Radar Scraper**: 
   Runs in `zayron_radar_daemon` every 5 minutes. Scrapes targets and updates SQLite `radar_dedup.db`. New alerts write to `raw_feeds` with `status='pending'`.
2. **Background Job - RSS Ingestor**: 
   Runs in `zayron_rss_daemon` every 15 minutes. Scrapes clearnet sites, checks database content hashes, and writes new items as `pending` raw feeds.
3. **Background Job - Darkweb Monitor**: 
   Runs in `zayron_darkweb_daemon` every 5 minutes. Rotates Tor proxy circuits, crawls Ransomwatch posts, and writes to `raw_feeds` with `status='pending'`.
4. **Processing Event - Swarm Worker**: 
   Runs in `zayron_crew_daemon`. Paced to wake up every 3 minutes. Fetches exactly 1 pending feed via optimistic database lock `claim_pending_feeds()`. If claimed, updates status to `processing_crew`, runs RAG query, queries Gemini model, writes results to target tables, and updates status to `crew_promoted`.
5. **Revalidation Event - ISR Cache Bust**: 
   Triggered by `zayron_crew_daemon` calling `trigger_revalidation()`. Posts to the frontend endpoint `/api/revalidate`. Next.js clears cached paths `/` and `/intelligence` instantly.
