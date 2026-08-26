# ZAYRON-X: System Inventory Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Repository Inventory Map, Modules, Packages, Runtimes, Environments, and Build Pipelines  
**Timestamp:** 2026-06-11T03:45:00Z  

---

## 1. Repository Structure Map

The repository is organized as a multi-language hybrid project (Next.js frontend + Python ingestion and orchestration layer):

```
zayron-app/ (Workspace Root)
├── .env.example                          # Root environment variables template
├── .gitignore                            # Root git ignore config
├── bun.lock                              # Root lockfile (optional/unused)
├── deploy.sh                             # Main deploy automation shell script
├── package.json                          # Root package json (defines workspace dependencies)
├── shared/                               # Shared Python data structures
│   ├── __init__.py
│   └── models/                           # Shared Pydantic data schemas
│       ├── __init__.py
│       ├── article.py                    # Schema enforcement for articles table
│       ├── cve.py                        # Schema enforcement for CVE entries
│       ├── fbr_calculator.py             # Financial Blast Radius logic
│       └── ioc.py                        # Indicator of Compromise structures
├── workers/                              # Python Agent Swarm and Ingestion core
│   ├── __init__.py
│   ├── config.py                         # Single source of truth config (banned phrases, etc.)
│   ├── omni_crew.py                      # Consolidated Master Agent scheduler
│   ├── persistence.py                    # Database connection claiming & mapping wrapper
│   ├── requirements.txt                  # Python dependency configuration
│   ├── Dockerfile.workers                # Swarm execution worker production image
│   ├── docker-compose.yml                # Docker Swarm configurations (tor, crew, ingestors)
│   ├── targets.json                      # Ingestion source settings
│   ├── agents/                           # Agent definitions for logical swarm pipeline
│   │   ├── compliance.py
│   │   ├── harvester.py
│   │   ├── infra_architect.py
│   │   ├── osint_spy.py
│   │   ├── quant.py
│   │   ├── validator.py
│   │   └── weaver.py
│   └── ingestors/                        # Raw source collectors
│       ├── cve_worker.py                 # NIST NVD API collector
│       ├── darkweb_ingestor.py           # Ransomwatch and onion collector
│       ├── radar_engine.py               # Parallel Telegram channel scraper
│       └── rss_ingestor.py               # RSS feeds scraper (BleepingComputer, etc.)
└── zayron-x/                       # Next.js web application frontend
    ├── app/                              # Next.js App Router root
    │   ├── api/                          # Next.js Serverless API endpoints
    │   └── (site)/                       # Main UI views
    ├── components/                       # Shared UI layout modules
    ├── lib/                              # Helper functions
    │   ├── cache/                        # Redis-based rate limiters
    │   └── supabase/                     # Supabase JS clients and queries
    ├── scripts/                          # CI verification and devops scripts
    ├── package.json                      # Next.js dependencies and scripts
    └── wrangler.toml                     # Cloudflare Pages deployment configuration
```

---

## 2. Module Inventory

### 2.1 Ingestion Layer (Python)
- **`workers/ingestors/radar_engine.py`**: A parallel Telegram client (via Telethon or HTTP web preview fallback) monitoring 60+ channels. Egress traffic passes through an isolated SOCKS5 Tor proxy.
- **`workers/ingestors/rss_ingestor.py`**: Fetches RSS feeds from BleepingComputer, The Hacker News, and Dark Reading. Periodically pushes feeds to the pending processing queue in Supabase.
- **`workers/ingestors/darkweb_ingestor.py`**: Connects to the Ransomwatch JSON endpoint and onion leak sites. Forces all onion scraping over an isolated SOCKS5 Tor network proxy.
- **`workers/ingestors/cve_worker.py`**: Polls the NIST NVD API v2.0 for vulnerability postings. Computes local threat scores and financial impact bounds before writing records to the database.

### 2.2 Processing Layer (Python)
- **`workers/omni_crew.py`**: Orchestrates 7 specialized LLM agent submodules into a single-pass inference loop. Integrates RAG query context, scrubs anti-FUD vocabulary words, and maps outputs to inter-agent contracts.
- **`workers/persistence.py`**: Provides optimistic locking, raw feed claiming, and article mapping functions using pydantic models before routing records to `articles` or `threat_artifacts_secure` tables.

---

## 3. Service Inventory

The ZAYRON-X production platform runs the following containerized daemon processes:

| Container / Daemon Name | Runtime Module | Purpose | Egress Path |
| :--- | :--- | :--- | :--- |
| **`zayron_tor_proxy`** | `peterdavehello/tor-socks-proxy:latest` | SOCKS5 proxy on port 9150 and ControlPort on port 9051. | Tor Egress network |
| **`zayron_crew_daemon`** | `workers.omni_crew` | Consumes pending feeds, runs Gemini LLM inference, inserts CTI reports. | Clearnet + Tor proxy |
| **`zayron_radar_daemon`** | `workers.ingestors.radar_engine` | Telegram crawler. | Tor proxy |
| **`zayron_rss_daemon`** | `workers.ingestors.rss_ingestor` | Scrapes BleepingComputer, THN, and Dark Reading. | Clearnet |
| **`zayron_darkweb_daemon`**| `workers.ingestors.darkweb_ingestor`| Scrapes Ransomwatch and onion sites. | Tor proxy |
| **`zayron_cve_daemon`** | `workers.ingestors.cve_worker` | NIST NVD API poller. | Clearnet |

---

## 4. Package Inventory

### 4.1 Frontend (`zayron-x/package.json`)
- **Key Frameworks**: Next.js (`^16.2.6`), React (`19.1.0`), React DOM (`19.1.0`)
- **State & Routing Tools**: `next-intl` (Internationalization), `next-themes` (Dark/Light mode)
- **Database / API Client**: `@supabase/ssr` (`^0.10.3`), `@supabase/supabase-js` (`^2.106.2`)
- **Caching & Limits**: `@upstash/redis` (`1.34.6`), `@upstash/ratelimit` (`2.0.5`)
- **Styling & UI**: `tailwindcss` (`4.1.4`), `framer-motion` (`11.18.2`), `lucide-react` (`0.487.0`), `react-markdown` (`10.1.0`)
- **Dev / Build Tools**: `@opennextjs/cloudflare` (`^1.19.11`), `wrangler` (`^4.96.0`), `@biomejs/biome` (`1.9.4`), `vitest` (`^2.1.0`)

### 4.2 Backend Swarm (`workers/requirements.txt`)
- **LLM SDK**: `google-generativeai` (for Gemini API calls)
- **HTTP / Async Client**: `aiohttp`, `aiohttp-socks` (for SOCKS5 Tor network routing)
- **XML / RSS Parser**: `feedparser`
- **Data Validation**: `pydantic`
- **Environment**: `python-dotenv`
- **Telegram Client**: `telethon` (MTProto implementation)

---

## 5. Runtime Inventory

### 5.1 Next.js Frontend
- **Target Platform**: Cloudflare Workers / Pages
- **Compilation Engine**: OpenNext (`opennextjs-cloudflare` builds `.open-next/worker.js` target)
- **Compatibility Level**: `nodejs_compat` (uses native Node APIs), compatibility date `2025-09-23`
- **Asset Egress**: Cloudflare Workers Static Assets (`.open-next/assets`)

### 5.2 Python Swarm
- **Language Environment**: Python 3.11-slim
- **Process Manager**: Docker Compose (services configured to restart automatically on failure)
- **Data Persistence**: SQLite (`radar_dedup.db` for local duplicate filtering)

---

## 6. Environment Inventory

| Variable Name | Domain | Type | Sensitive | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Backend | String | Yes | Authentication for Google Generative AI |
| `GEMINI_PRO_MODEL` | Backend | String | No | Gemini Model (e.g. `gemini-1.5-pro-latest`) |
| `GEMINI_FLASH_MODEL` | Backend | String | No | Gemini Model (e.g. `gemini-1.5-flash-latest`) |
| `SUPABASE_URL` | Global | String | No | URL of Supabase Project |
| `SUPABASE_SERVICE_KEY` | Backend | String | Yes | Admin database access bypasses RLS |
| `SUPABASE_ANON_KEY` | Frontend | String | No | Public database client key |
| `UPSTASH_REDIS_REST_URL` | Global | String | No | Redis cluster endpoint |
| `UPSTASH_REDIS_REST_TOKEN`| Global | String | Yes | Redis cluster access token |
| `DAILY_REQUEST_LIMIT` | Backend | Integer | No | Daily Gemini usage cap |
| `REVALIDATION_SECRET` | Global | String | Yes | Token for Vercel/Cloudflare ISR bust |
| `NVD_API_KEY` | Backend | String | Yes | NIST NVD API authentication token |
| `TELEGRAM_API_ID` | Backend | Integer | Yes | MTProto API application identification |
| `TELEGRAM_API_HASH` | Backend | String | Yes | MTProto API application secret hash |

---

## 7. Build Pipeline Inventory

The deployment is split into two pipeline workflows:

### 7.1 Frontend Deployment Flow
1. **Source Control Trigger**: Git push to `production` branch.
2. **Lint & Code Check**: `@biomejs/biome` checks formatting, `tsc --noEmit` verifies type constraints.
3. **Build Target Preparation**: `opennextjs-cloudflare` builds Next.js assets to Cloudflare worker layouts.
4. **Wrangler Deploy**: Pushes compiled files to Cloudflare Pages edge.
5. **Gradual Deploy (Canary)**: Egress stages (10% -> 25% -> 50% -> 100%) monitor traffic for faults. Canary check runs `canary-health-check.sh`. In case of failure, `wrangler rollback` is triggered.

### 7.2 Backend Deployment Flow
1. **Sync Action**: Executes `deploy.sh` script on the target VPS instance (`65.75.200.149`).
2. **Resource Prune**: Shuts down existing docker compose structures.
3. **Docker Build**: Re-compiles `Dockerfile.workers` image from the project context without build cache.
4. **Service Launch**: Starts Docker Compose daemons in background mode.
5. **Watchdog Check**: Initiates Supabase watchdog RPC (`revert_stale_crew_claims`) to clear stale lock states.
