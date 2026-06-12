# ZAYRON-X: System Architecture Document
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Frontend, Backend, Infrastructure, Data, AI, and Authentication/Authorization Architectures  
**Timestamp:** 2026-06-11T03:47:00Z  

---

## 1. Frontend Architecture

The frontend is built using **Next.js 16 (App Router)** and optimized to deploy onto **Cloudflare Workers / Pages** via OpenNext.

```
                  [ USER / BROWSER ]
                          │
                          ▼ (HTTPS Request)
             [ CLOUDFLARE EDGE ROUTING ]
                          │
           ┌──────────────┴──────────────┐
           ▼ (Static Assets)             ▼ (API & Server Routes)
    [ CLOUDFLARE PAGES ]          [ CLOUDFLARE WORKER ROUTER ]
    (.open-next/assets)           (.open-next/worker.js)
                                         │
                                  ┌──────┴──────┐
                                  ▼             ▼
                           [ NEXT.JS EDGE ]  [ MIDDLEWARE ]
                           (ISR Page Cache)  (Rate Limiting & Auth)
```

### Key Design Pillars:
- **Edge Native Runtime (`experimental-edge`)**: All API routes and page renders execute on Cloudflare Workers, ensuring low latency.
- **Incremental Static Regeneration (ISR)**: Major intelligence landing pages are statically pre-rendered for maximum speed. Invalidation is managed via `/api/revalidate` webhooks triggered by the backend after inserting novel threat reports.
- **Incremental Cache Storage**: Cache states are persisted using Cloudflare KV namespaces (`ZAYRON_CACHE`).
- **Glassmorphic UI & Styling**: Built using Tailwind CSS, vanilla CSS variables, and Framer Motion micro-animations. Implements a responsive cyber threat dashboard with dark theme styles.

---

## 2. Backend Architecture

The backend is designed as an event-driven, decoupled ingestion and agent processing swarm structured as independent Docker container processes:

```
  [ INGESTION DAEMONS ]                   [ STORAGE ]             [ AI PROCESSING CORE ]
┌────────────────────────┐
│ zayron_radar (Telegram)│─────────────┐
├────────────────────────┤             │
│ zayron_rss (RSS feeds) │─────────────┼─────► [ Supabase ] ◄───── [ zayron_crew ]
├────────────────────────┤             │      (raw_feeds)       (Gemini Swarm Orchestrator)
│ zayron_darkweb (Leaks) │─────────────┘
├────────────────────────┤
│ zayron_cve (NVD API)   ├───────────────────► [ Supabase ]
└────────────────────────┘                       (cves)
```

### Architectural Safeguards:
- **Decoupled Staging Queue**: Ingestors never parse, analyze, or write directly to target published tables. They write raw telemetry to the `raw_feeds` table in a `'pending'` state.
- **Optimistic Locking Claim Engine**: To support scaling to multiple parallel worker instances, the processing core claims pending items using a patching transaction that simulates `FOR UPDATE SKIP LOCKED`. Only the worker that successfully transitions the status to `'processing_crew'` can run LLM logic on that row.
- **Egress Isolation**: Egress crawlers execute scraping calls inside a bridged network, routing onion and Telegram HTTP lookups through a local Tor SOCKS5 container.

---

## 3. Infrastructure Architecture

The platform runs on a hybrid deployment infrastructure combining Edge Serverless and Dedicated VPS hosting:

```
     ┌────────────────────────────────────────────────────────┐
     │                      CLOUDFLARE WORKERS                │
     │  - Next.js Web App   - Edge API Routes   - KV Cache    │
     └──────────────────────────┬─────────────────────────────┘
                                │
                        HTTPS DB Queries
                                │
                                ▼
     ┌────────────────────────────────────────────────────────┐
     │                  SUPABASE CLOUD PLATFORM               │
     │  - Postgres Database     - Row Level Security (RLS)    │
     │  - Database Views        - Auth & Security Definers    │
     └──────────────────────────▲─────────────────────────────┘
                                │
                        HTTPS DB Queries
                                │
     ┌──────────────────────────┴─────────────────────────────┐
     │                    DEDICATED VPS HOSTING               │
     │                      (65.75.200.149)                   │
     │   - Docker Bridge Network (zayron_net)                 │
     │   - Ingestion Daemons (Radar, RSS, CVE, Darkweb)       │
     │   - Tor Network Egress Proxy (tor_proxy SOCKS5 Gateway)│
     │   - Agent Swarm Orchestrator (Gemini Master Crew)      │
     └────────────────────────────────────────────────────────┘
```

- **Network Segregation**: The VPS Docker daemon runs on a bridge network `zayron_net`. The `tor_proxy` exposes ports `9150` (SOCKS5 egress) and `9051` (Tor ControlPort) internally to the bridge, meaning they are inaccessible from the public internet.
- **Stealth Egress routing**: Egress crawlers rotate SOCKS5 proxy circuits by sending authentication control frames to the proxy container periodically.

---

## 4. Data Architecture

The data architecture is anchored on **Supabase (PostgreSQL)**, utilizing Row-Level Security (RLS), security-gated views, database triggers, and local caching engines:

```
  [ PUBLIC visitor / anon ]               [ SUBSCRIBER Client ]
             │                                       │
             ▼                                       ▼
    [ threat_artifacts VIEW ]               [ threat_artifacts VIEW ]
             │                                       │
             ├─► clearance_level = 'FREE'            ├─► clearance_level = 'SUBSCRIBER'
             │                                       │
             ▼                                       ▼
     Masks sensitive columns                 Returns unmasked rules,
    ('[ RESTRICTED_INTEL ]')                  IoCs, and PDF links
             │                                       │
             └───────────────┬───────────────────────┘
                             ▼
              [ threat_artifacts_secure TABLE ]
```

### Relational Data Models & Constraints:
- **`raw_feeds`**: Captures raw target streams. Uses `source_channel` and a unique hash representation to enforce database-level deduplication.
- **`articles`**: Contains compiled published CTI dossiers. Slug and URL hashes are unique. Contains a GIN index on `to_tsvector` for fast keyword-based searches.
- **`threat_artifacts_secure`**: Holds unmasked indicators of compromise (IoCs), Snort signatures, YARA/Sigma rules, and threat actor details.
- **`threat_artifacts` (View)**: Integrates `check_is_subscriber()` security definer helper to dynamic mask sensitive intellectual property. This blocks leaking premium CTI bytes to public visitors at the database engine layer.
- **`knowledge_embeddings`**: Holds text chunks from target security literature (Richards Heuer's SAT, Stevens' TCP/IP, Mitnick's Deception paradigms, Kleppmann's DDIA) embedded with 384 dimensions.

---

## 5. AI Architecture

ZAYRON-X implements a **Consolidated Multi-Agent Swarm** condensed into a single-pass execution loop using the **Gemini 1.5 Pro** model (2M context window):

```
       [ Input raw_feed ] 
                │
                ▼
  [ Supabase RAG FTS Lookup ] ──► Retrieves grounded references from literature
                │
                ▼
  [ consolidated sys_prompt ] ──► Directs 7 virtual sub-agent roles:
                │                 1. Harvester / OSINT Spy (Heuer / Pherson analysis)
                │                 2. Forensic Validator (ATT&CK mapping)
                │                 3. Compliance Auditor (ISO 27001 / GDPR impact)
                │                 4. Quant Econometrician (FAIR risk quantification)
                │                 5. Infrastructure Architect (DDIA / TCP/IP analysis)
                │                 6. Insider Threat Parser (Mitnick social engineering check)
                │                 7. Weaver Grid (Synthesis into clean HTML)
                │
                ▼
 [ Gemini 1.5 Pro (2M Tokens) ]
                │
                ▼
 [ Output structured JSON ]
                │
                ▼
[ clean_anti_fud_text() Scrub ] ──► Removes FUD terms and enforces corporate tone
                │
                ▼
   [ ExecutiveSITREP Schema ] ──► Validates fields against inter-agent contracts
```

### Quota Ledger and Rate Mitigation:
To keep usage under the free-tier daily rate limits (500 requests/day), `omni_crew` checks a persistent Redis ledger (`zayron:quota:YYYY-MM-DD`). The worker runs on a strict 180-second loop (3 minutes), limiting queries to exactly 480 requests/day, ensuring a 20-request buffer.

---

## 6. Authentication & Authorization Architecture

### 6.1 Authentication Flow
- **Framework**: Supabase Auth Client (`@supabase/supabase-js` + `@supabase/ssr`).
- **Middleware Integration**: Next.js `middleware.ts` interceptor executes session refreshes (`updateSession(request)`) on all routed traffic, logging token validation status.

### 6.2 Authorization Flow
Authorization uses a role-based access control (RBAC) model managed at both the middleware and database level:

```
                  [ USER / REQUEST ]
                          │
                          ▼
                [ Next.js Middleware ]
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
  [ /admin/* ]      [ /api/remediate ]   [ Public Routes ]
  Checks JWT:       Checks profiles:     Passthrough
  role == 'admin'   clearance == 'SUBSCRIBER'
       │                  │                  │
       ▼                  ▼                  ▼
 [ DB Queries ]     [ DB Queries ]     [ DB Queries ]
 (Admin Client)     (Anon Client)      (Anon Client)
       │                  │                  │
       ▼                  ▼                  ▼
  Bypasses RLS       Enforces RLS       Enforces RLS
                     (check_is_sub()    (Allows reading
                      restricts view)    public tables)
```

- **Fail-Closed Gateways**: If `process.env.ADMIN_USER` or `process.env.ADMIN_PASSWORD` are missing, admin endpoints automatically reject requests. If metadata role parameters are invalid, the request is blocked.
- **SQL Security Definer Functions**: `check_is_subscriber()` and `handle_new_user()` run with database administrator privileges. They can query the `public.profiles` security table regardless of the current connection's RLS constraints, resolving potential permission bottlenecks.
