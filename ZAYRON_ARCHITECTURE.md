# ZAYRON-X — MASTER ARCHITECTURE BLUEPRINT

> **Classification:** INTERNAL — ENGINEERING  
> **Audit Date:** 2026-05-29  
> **Auditor Role:** Principal Solutions Architect  
> **Scope:** Full-Stack (Frontend · Backend Agents · Database · Infrastructure)

---

## TABLE OF CONTENTS

1. [Current System Topology](#1-current-system-topology)
2. [Data Flow Mapping (The Pipeline)](#2-data-flow-mapping-the-pipeline)
3. [Gap Analysis for Expansion](#3-gap-analysis-for-expansion)
4. [Immediate Refactoring Priorities](#4-immediate-refactoring-priorities)

---

## 1. CURRENT SYSTEM TOPOLOGY

### 1.1 Frontend — Next.js Application (`gerasys-online/`)

| Property | Value |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Runtime | Bun (scripts, dev server) |
| Styling | Tailwind CSS 4.1.4 |
| ORM | Drizzle ORM 0.42.0 → PostgreSQL (Supabase) |
| Auth | Supabase SSR (`@supabase/ssr` 0.10.3) |
| Deployment | Vercel (ISR — Incremental Static Regeneration) |
| Fonts | Inter, Playfair Display, JetBrains Mono (Google Fonts) |
| Key Libraries | Framer Motion, React-Markdown, Lucide Icons, Fuse.js, DOMPurify, Resend, Upstash Rate Limiting |

#### 1.1.1 Page Routes (`app/`)

| Route | Type | Description |
|---|---|---|
| `/(site)/page.tsx` | Server Component | **Homepage** — Sovereign dashboard with hero, live intel ticker, sector workspace, actionable alerts table, SITREP exporter, CVE panel, analyst panel |
| `/(site)/[category]/` | Dynamic Route | Category listing page (Intel, Exploits, Tools, Leaks) |
| `/(site)/article/` | Dynamic Route | Individual article / SITREP detail page |
| `/(site)/cve/page.tsx` | Server Component | CVE index with filterable table |
| `/(site)/cve/[cveId]/` | Dynamic Route | Individual CVE detail page |
| `/(site)/dark-web-recon/page.tsx` | Client Component | Dark Web Recon Matrix — simulated terminal feed with hardcoded ransomware logs |
| `/(site)/search/` | Page | Full-text article search |
| `/(site)/tools/` | Page | Security tools catalog |
| `/(site)/analysts/` | Page | Analyst team profiles |
| `/(site)/developers/` | Page | Developer resources |
| `/(site)/programming/` | Page | Programming languages catalog |
| `/(site)/about/` | Page | About page |
| `/(site)/contact/` | Page | Contact page |
| `/(site)/privacy/` | Page | Privacy policy |
| `/intelligence/threat-intelligence/` | Route | Threat intelligence listing |
| `/intelligence/operations/` | Route | Operations view |
| `/intelligence/[category]/` | Dynamic Route | Intelligence category filter |
| `/threats/[id]/` | Dynamic Route | Individual threat detail |
| `/news/page.tsx` | Server Component | News listing page |
| `/admin/page.tsx` | Protected Page | Admin dashboard (HTTP Basic Auth) |
| `/admin/articles/` | Protected Page | Article CRUD management |
| `/admin/cves/` | Protected Page | CVE management |
| `/admin/feeds/` | Protected Page | Raw feeds management |
| `/admin/dashboard/` | Protected Page | Analytics dashboard |
| `/admin/settings/` | Protected Page | System settings |
| `/(auth)/` | Route Group | Authentication flow (login/signup) |

#### 1.1.2 API Routes (`app/api/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/articles/` | GET/POST | Article CRUD |
| `/api/cves/` | GET | CVE data endpoint |
| `/api/search/` | GET | Full-text search |
| `/api/revalidate/` | POST | ISR revalidation trigger (called by Python crew after article persistence) |
| `/api/views/` | POST | Article view counter increment |
| `/api/subscribe/` | POST | Newsletter subscription (Resend integration) |
| `/api/rss/` | GET | RSS feed generation |
| `/api/og/` | GET | Open Graph image generation |
| `/api/db-status/` | GET | Database health check |
| `/api/remediate/` | POST | **Premium** — Remediation workflow (requires SUBSCRIBER clearance) |
| `/api/download-sitrep/` | POST | **Premium** — SITREP PDF download (requires SUBSCRIBER clearance) |
| `/api/seed-analysts/` | POST | Analyst seeding utility |

#### 1.1.3 Component Architecture

```
components/
├── article/           # Article rendering (3D image, body, header, sidebar, author, share)
│   ├── Article3DImage.tsx
│   ├── ArticleBody.tsx
│   ├── ArticleHeader.tsx
│   ├── ArticleSidebar.tsx
│   ├── AuthorCard.tsx
│   ├── ReadingProgress.tsx
│   ├── RelatedArticles.tsx
│   └── ShareButtons.tsx
│
├── cve/               # CVE display (table, filters, detail card, severity badge)
│   ├── CveDetailCard.tsx
│   ├── CveFilters.tsx
│   ├── CveTable.tsx
│   └── SeverityBadge.tsx
│
├── homepage/          # Landing page components
│   ├── HeroSection.tsx
│   ├── AnalystTeam.tsx
│   ├── CategoryShowcase.tsx
│   ├── CveTracker.tsx
│   ├── FeaturedGrid.tsx
│   ├── LatestReports.tsx
│   ├── Newsletter.tsx
│   ├── StatsCounter.tsx
│   ├── TabbedContent.tsx
│   ├── ThreatTicker.tsx
│   ├── ToolSpotlight.tsx
│   └── TrendingWidget.tsx
│
├── layout/            # Global chrome
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MobileNav.tsx
│   ├── NewsTicker.tsx
│   └── BreakingTicker.tsx
│
├── platform/          # Core SaaS intelligence platform components
│   ├── ActionableAlerts.tsx        # Data table for article alerts
│   ├── AnalystPanel.tsx            # Analyst team display
│   ├── AutomatedRoiCalculator.tsx  # ROI computation widget
│   ├── CvePanel.tsx                # CVE sidebar panel
│   ├── FinancialBlastRadius.tsx    # FBR score display
│   ├── InfrastructureRadar.tsx     # SVG node monitoring radar
│   ├── IntelCard.tsx               # Intelligence card + empty state
│   ├── LiveIntelTicker.tsx         # Bloomberg-style live ticker
│   ├── SectorWorkspace.tsx         # Tabbed sector workspace
│   ├── SecurityGatingContext.tsx   # Auth gating context provider
│   ├── SitrepExporter.tsx          # SITREP export card
│   ├── SovereignFinancialImpact.tsx # Financial impact display
│   ├── SovereignGateModal.tsx      # Paywall modal
│   └── ThreatDetailClient.tsx      # Client-side threat detail
│
└── ui/                # Primitives
    ├── ArticleCard.tsx
    ├── Button.tsx
    ├── CategoryBadge.tsx
    ├── CopperDivider.tsx
    ├── PageSkeleton.tsx
    ├── SearchBar.tsx
    └── SkeletonLoader.tsx
```

#### 1.1.4 Data Fetching Pattern

The frontend uses **Drizzle ORM** to query Supabase PostgreSQL directly via `postgres.js` (connection pooling). Queries are organized in:

| Query Module | Functions |
|---|---|
| `lib/db/queries/articles.ts` | `getArticles`, `getArticleBySlug`, `getArticleById`, `getFeaturedArticles`, `getBreakingArticles`, `getArticlesByCategory`, `getTrendingArticles`, `searchArticles`, `getCategoriesWithCounts`, `getAllArticleSlugs`, `incrementArticleViews` |
| `lib/db/queries/cves.ts` | `getCVEs`, `getCVEById`, `getCVEsBySeverity`, `getCriticalCVEs`, `searchCVEs`, `getCVECount`, `getCVESeverityDistribution`, `getRecentCVEs` |
| `lib/db/queries/rawFeeds.ts` | Raw feed queries for admin panel |
| `lib/db/queries/analysts.ts` | `getAnalysts` |
| `lib/db/queries/tools.ts` | Tool catalog queries |
| `lib/db/queries/programming.ts` | Programming language queries |
| `lib/db/queries/analytics.ts` | Analytics aggregation queries |

**ISR Revalidation:** Pages use `export const revalidate = 60` (60-second cache). After a new article is persisted, the Python crew triggers `POST /api/revalidate` to bust the cache immediately.

---

### 1.2 Backend — Python Agent Daemons (`workers/`)

#### 1.2.1 Multi-Agent Orchestrator (`omni_crew.py`)

The brain of Zayron-X. A **daemon process** that runs an infinite `while True` loop, polling Supabase for pending `raw_feeds` and processing them through a **5-agent sequential pipeline**.

```
┌─────────────────────────────────────────────────────────────────┐
│  omni_crew.py — Main Daemon Loop                                │
│                                                                 │
│  while True:                                                    │
│    1. Claim pending feeds (optimistic lock on raw_feeds table)   │
│    2. For each feed → run 5-agent crew pipeline                 │
│    3. Persist ExecutiveSITREP → articles table                  │
│    4. Trigger Vercel ISR revalidation                           │
│    5. Sleep CREW_POLL_INTERVAL_MIN (default: 5 min)             │
│                                                                 │
│  Resilience: try/except wraps entire cycle with 60s cooldown    │
└─────────────────────────────────────────────────────────────────┘
```

**Agent Pipeline (Sequential):**

| Stage | Agent | File | LLM Model | Token Budget | Role |
|---|---|---|---|---|---|
| 1 | **Harvester** | `agents/harvester.py` | Gemini Flash | 2,000 | Extract, translate, classify raw intel. Language detection. Entity extraction. |
| 2 | **Validator** | `agents/validator.py` | Gemini Flash | 2,000 | Cross-reference, verify IoCs (deterministic gate), map MITRE ATT&CK TTPs, grade source (NATO A-E). |
| 3a | **Compliance** | `agents/compliance.py` | Gemini Pro | 3,000 | Map to ISO 27001, NIST CSF 2.0, GDPR, NIS2, PCI-DSS, HIPAA. |
| 3b | **Quant** | `agents/quant.py` | Gemini Flash | 1,500 | Financial Blast Radius (FBR): breach cost range, sector/geo multipliers, mitigation ROI. |
| 4 | **Weaver** | `agents/weaver.py` | Gemini Pro | 8,000 | Synthesize 1500+ word Executive SITREP. Anti-FUD vocabulary gate (40+ banned phrases). |

**Inter-Agent Communication:**

All data passes through strict Pydantic models defined in `workers/contracts/inter_agent.py`:

```
HarvestPayload → ValidatedIntel → ComplianceReport + FinancialAssessment → ExecutiveSITREP
```

No unstructured `dict` crosses agent boundaries. This is a typed trust architecture.

**Key Resilience Features:**
- Exponential backoff on Google API rate limits (30s → 60s → 120s)
- Automatic model downgrade: Pro → Flash when blocked
- Master `try/except` with 60s cooldown before daemon resurrection
- Anti-FUD gate with up to 2 retries per feed
- Per-feed error isolation (one failure doesn't crash the cycle)

#### 1.2.2 Ingestors (Data Collection Daemons)

| Ingestor | File | Protocol | Data Source | Poll Interval | Status |
|---|---|---|---|---|---|
| **Telegram Radar** | `ingestors/radar_engine.py` | Telethon MTProto / HTTP fallback | 35 Telegram channels from `targets.json` | 5 min | **Production-ready** |
| **RSS Collector** | `ingestors/rss_ingestor.py` | HTTP (feedparser) | BleepingComputer, The Hacker News, Dark Reading | 15 min | **Production-ready** |
| **Dark Web Crawler** | `ingestors/darkweb_ingestor.py` | SOCKS5 via Tor proxy | 3 onion URLs (hardcoded seed targets) | 5 min | **Scaffold only** — placeholder URLs |
| **CVE Worker** | `ingestors/cve_worker.py` | HTTPS (NVD REST API v2.0) | NIST NVD | On-demand (24h lookback) | **Production-ready** |

**All ingestors write to the same staging table:** `raw_feeds` with `status='pending'`. The `omni_crew.py` daemon then claims and processes these feeds through the LLM pipeline.

**Exception:** `cve_worker.py` writes directly to the `cves` table (no LLM processing — it's structured NVD data).

#### 1.2.3 Persistence Layer (`persistence.py`)

| Function | Description |
|---|---|
| `claim_pending_feeds()` | SELECT pending feeds + atomic PATCH to `processing_crew` (optimistic lock) |
| `mark_feed_status()` | Update feed status: `skipped`, `crew_failed`, `anti_fud_rejected`, `crew_promoted`, `persist_failed`, `crew_error` |
| `persist_sitrep()` | Validate through `ArticleInsert` Pydantic model → POST to `articles` table |
| `trigger_revalidation()` | POST to Vercel `/api/revalidate` with shared secret |

#### 1.2.4 Shared Models (`shared/models/`)

| Model | File | Purpose |
|---|---|---|
| `ArticleInsert` | `article.py` | Strict DB row schema for `articles` table — 4 categories enforced: `Tools`, `Exploits`, `Intel`, `Leaks` |
| `ArticleSITREP` | `article.py` | LLM JSON output validation — minimum 200 words, severity normalization |
| `CVERecord` | `cve.py` | NVD API output validation |
| `CVEInsert` | `cve.py` | Strict DB row schema for `cves` table |
| `IoC` | `ioc.py` | **Deterministic hallucination gate** — rejects empty-string hashes, private IPs, placeholder domains |

#### 1.2.5 Configuration (`config.py`)

Single source of truth for all workers. Reads from `.env` via `python-dotenv`.

| Config | Default |
|---|---|
| `GEMINI_PRO_MODEL` | `gemini-1.5-pro-latest` |
| `GEMINI_FLASH_MODEL` | `gemini-1.5-flash-latest` |
| `CREW_POLL_INTERVAL_MIN` | 5 |
| `CREW_BATCH_SIZE` | 3 |
| `MAX_RETRIES_PER_AGENT` | 2 |
| `ANTI_FUD_BANNED_PHRASES` | 40+ phrases (hardcoded list) |
| `CTI_AUTHORS` | 8 fictional analyst names |
| `SECTOR_WEIGHTS` | Healthcare 1.8x → Education 1.0x |
| `GEO_EXPOSURE` | EU 1.4x, UK 1.3x, US 1.2x, APAC 1.1x |

---

### 1.3 Database — Supabase PostgreSQL

**Schema Source of Truth:** `gerasys-online/lib/db/schema.ts` (Drizzle ORM)

#### 1.3.1 Tables

| Table | Columns | Purpose |
|---|---|---|
| **`articles`** | `id` (uuid PK), `title`, `slug` (unique), `url_hash` (unique, SHA-256), `subtitle`, `author`, `category`, `tags[]`, `content`, `excerpt`, `image_url`, `read_time`, `views`, `is_published`, `is_featured`, `is_breaking`, `financial_exposure`, `regulatory_risk`, `mitigation_impact`, `yara_rule`, `published_at`, `created_at`, `updated_at` | Final intelligence products (Executive SITREPs) |
| **`cves`** | `id` (uuid PK), `cve_id` (unique), `title`, `description`, `severity`, `cvss_score`, `cvss_vector`, `affected_product`, `vendor`, `status`, `published_date`, `created_at` | CVE records from NVD |
| **`raw_feeds`** | `id` (uuid PK), `source_channel`, `raw_content`, `original_language`, `category`, `status`, `translated_title`, `translated_content`, `analysis`, `ai_generated_flag`, `prompt_tokens`, `completion_tokens`, `timestamp`, `created_at`, `promoted_at` | Staging table for unprocessed intelligence |
| **`analysts`** | `id`, `name`, `title`, `bio`, `nationality`, `specializations[]`, `article_count`, `created_at` | CTI analyst profiles |
| **`tools`** | `id`, `name`, `slug`, `category`, `description`, `rating`, `github_url`, `stars`, `tags[]`, `created_at` | Security tools catalog |
| **`subscribers`** | `id`, `email` (unique), `is_active`, `created_at` | Newsletter subscribers |
| **`trending`** | `id`, `title`, `rank`, `engagement_score`, `article_id` (FK → articles), `created_at` | Trending articles index |
| **`programming_langs`** | `id`, `name`, `slug`, `description`, `paradigm`, `use_case`, `code_snippet`, `security_features[]`, `article_count`, `created_at` | Programming language catalog |
| **`profiles`** | `id` (uuid PK, matches Supabase Auth), `clearance_level`, `created_at`, `updated_at` | User clearance levels (`FREE`, `SUBSCRIBER`) |
| **`threat_artifacts`** | `id`, `title`, `severity`, `cvss_score`, `fbr_total`, `sector`, `yara_rules`, `sigma_rules`, `raw_iocs`, `unmasked_target_entities`, `sitrep_pdf_url`, `created_at`, `updated_at` | Premium threat artifacts (gated content) |

#### 1.3.2 Key Constraints & Indexes

- `articles.slug` — UNIQUE (URL routing)
- `articles.url_hash` — UNIQUE (deduplication gate)
- `cves.cve_id` — UNIQUE (upsert conflict target)
- `raw_feeds.status` — used for feed claiming workflow (`pending` → `processing_crew` → `crew_promoted` / `crew_failed`)
- `profiles.id` — matches Supabase Auth user UUID

---

## 2. DATA FLOW MAPPING (THE PIPELINE)

### 2.1 End-to-End Data Journey: From Raw Signal to Rendered Intelligence

```
                                    INGESTION LAYER
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Telegram     │  │  RSS Feeds   │  │  Dark Web    │  │  NVD API     │
    │  (35 channels)│  │  (3 sources) │  │  (3 onions)  │  │  (NIST)      │
    │  radar_engine │  │  rss_ingestor│  │  darkweb_ing │  │  cve_worker  │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │                 │
           └─────────────────┼─────────────────┘                 │
                             │                                   │
                             ▼                                   ▼
                    ┌─────────────────┐                 ┌─────────────────┐
                    │  raw_feeds      │                 │  cves           │
                    │  (Supabase)     │                 │  (Supabase)     │
                    │  status=pending │                 │  Direct upsert  │
                    └────────┬────────┘                 └─────────────────┘
                             │
                    ┌────────┴────────┐
                    │  AI PROCESSING  │
                    │  LAYER          │
                    │                 │
                    │  omni_crew.py   │ ← Claims feeds (optimistic lock)
                    │                 │
                    │  ┌───────────┐  │
                    │  │ Harvester │──┤ Extract, translate, classify
                    │  └─────┬─────┘  │
                    │        ▼        │
                    │  ┌───────────┐  │
                    │  │ Validator │──┤ IoC gate, MITRE TTPs, source grade
                    │  └─────┬─────┘  │
                    │        │        │
                    │   ┌────┴────┐   │
                    │   ▼         ▼   │
                    │ ┌─────┐ ┌─────┐ │
                    │ │Compl│ │Quant│ │ Compliance + Financial (parallel-ish)
                    │ └──┬──┘ └──┬──┘ │
                    │    └───┬───┘    │
                    │        ▼        │
                    │  ┌───────────┐  │
                    │  │  Weaver   │──┤ 1500+ word SITREP + Anti-FUD gate
                    │  └─────┬─────┘  │
                    └────────┼────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  articles       │
                    │  (Supabase)     │  ← ArticleInsert Pydantic validation
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  POST           │
                    │  /api/revalidate│  ← Vercel ISR cache bust
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────────────────┐
                    │  PRESENTATION LAYER          │
                    │                              │
                    │  Next.js App Router           │
                    │  Drizzle ORM → articles/cves  │
                    │  Server Components render     │
                    │  ISR refreshes every 60s       │
                    └──────────────────────────────┘
```

### 2.2 Step-by-Step: A Telegram Message's Journey

1. **INGESTION** — `radar_engine.py` connects to Telegram via Telethon MTProto. A new message arrives in channel `@cveNotify`. The Radar deduplicates via SHA-256 content hash (SQLite cache, 72h TTL). If novel → `INSERT INTO raw_feeds (source_channel, raw_content, status) VALUES ('telegram_cveNotify', '...', 'pending')`.

2. **CLAIMING** — `omni_crew.py` wakes up on its 5-minute poll cycle. Calls `claim_pending_feeds()` which SELECTs up to 3 pending feeds ordered by `created_at ASC`, then atomically PATCHes each to `status='processing_crew'` (only if still `pending` — optimistic lock prevents double-processing).

3. **STAGE 1: HARVEST** — The raw text is sent to `Gemini Flash` with the Harvester system prompt. The LLM returns JSON: `{detected_language, translated_text, preliminary_category, extracted_entities, has_cve_reference, has_ioc_indicators, word_count}`. Parsed into `HarvestPayload` (Pydantic).

4. **STAGE 2: VALIDATE** — The `HarvestPayload` is forwarded to `Gemini Flash` with the Validator prompt. Returns IoCs, MITRE TTPs, CVE IDs, CVSS v4, severity, source reliability grade. The **deterministic IoC hallucination gate** (`shared/models/ioc.py`) rejects empty-string hashes, placeholder IPs, and known LLM-fabricated domains. Parsed into `ValidatedIntel`.

5. **STAGE 3a + 3b: COMPLIANCE + QUANT** — Run sequentially (not truly parallel due to a double-call bug — see §4). Compliance maps to ISO 27001, NIST CSF, GDPR, NIS2. Quant computes Financial Blast Radius (FBR). Outputs: `ComplianceReport` + `FinancialAssessment`.

6. **STAGE 4: WEAVE** — All upstream outputs are assembled into a comprehensive prompt for `Gemini Pro`. The Weaver produces a 1500+ word Markdown Executive SITREP as JSON. The **Anti-FUD gate** (deterministic regex scan) checks for 40+ banned phrases. If violations → retry with targeted feedback (up to 2 retries). Parsed into `ExecutiveSITREP`.

7. **PERSISTENCE** — `persist_sitrep()` validates through `ArticleInsert` (Pydantic), generates a URL slug, assigns a random CTI author, computes read time, and POSTs to the Supabase `articles` table. Feed status → `crew_promoted`.

8. **REVALIDATION** — `trigger_revalidation()` fires `POST /api/revalidate` with the shared secret, busting the ISR cache for `/` and `/intelligence`.

9. **RENDERING** — The Next.js frontend's Server Components re-fetch from Supabase via Drizzle ORM. The article appears on the homepage's `ActionableAlerts` table, `IntelCard` grid, and is accessible at `/article/[slug]`.

---

## 3. GAP ANALYSIS FOR EXPANSION

### 3.1 Dark Web Recon — Readiness Assessment

#### What We Already Have

| Layer | Asset | Status |
|---|---|---|
| **Frontend** | `/(site)/dark-web-recon/page.tsx` | ⚠️ **Simulation only** — Hardcoded `INITIAL_LOGS[]` with fake ransomware intercepts. Random log generation via `setInterval`. No connection to real data. |
| **Backend** | `workers/ingestors/darkweb_ingestor.py` | ⚠️ **Scaffold with placeholder URLs** — 3 fake `.onion` targets (`ransomwr38vhsd92.onion`, etc.). Dev-mode fallback generates mock JSON. |
| **Infrastructure** | `docker-compose.yml` — `zayron_darkweb` service | ✅ **Fully configured** — Container with Tor SOCKS5 proxy, circuit rotation, resource limits, healthcheck. |
| **Infrastructure** | `docker-compose.yml` — `tor_proxy` service | ✅ **Fully configured** — `peterdavehello/tor-socks-proxy:latest`, ControlPort 9051 for NEWNYM circuit rotation. |
| **Database** | `raw_feeds` table | ✅ **Ready** — Dark web feeds use `source_channel='darkweb_*'` prefix. |

#### What Is Missing for Production Dark Web Recon

| Gap | Priority | Description |
|---|---|---|
| **Real Onion Target List** | 🔴 CRITICAL | The 3 placeholder URLs in `darkweb_ingestor.py` are fictitious. Need actual ransomware leak site URLs (LockBit, ALPHV, Medusa, RansomHouse, Play, CL0P, etc.) and a mechanism to dynamically update them without redeployment. |
| **Dynamic Target Loading** | 🟡 HIGH | Targets should be loaded from a Supabase `darkweb_targets` table or a managed JSON config, not hardcoded in Python. |
| **HTML Parsing Pipeline** | 🟡 HIGH | `darkweb_ingestor.py` returns raw response text. Most dark web sites serve HTML, not JSON. Need BeautifulSoup/lxml parsing layer to extract structured intel from HTML leak pages. |
| **Frontend → Backend Connection** | 🟡 HIGH | `dark-web-recon/page.tsx` currently renders hardcoded simulation data. Needs to query `raw_feeds WHERE source_channel LIKE 'darkweb_%'` or a dedicated Supabase view/table for live intercepts. |
| **`poisson_delay()` Bug** | 🟠 MEDIUM | The delay function has a broken `asyncio.log.logging.math.log` call that will crash at runtime. Falls back to a random number, but the code path is erroneous. |
| **Rate Limit & Ban Detection** | 🟠 MEDIUM | No detection logic for Tor-level bans (HTTP 403, CAPTCHA). Need retry-with-circuit-rotation on specific HTTP response codes. |
| **Content Classification** | 🟠 MEDIUM | No pre-filtering of dark web content. The raw dump goes directly to `raw_feeds`. Need a triage layer to distinguish ransomware leak alerts from forum noise. |

---

### 3.2 Real-Time CVE Tracking — Readiness Assessment

#### What We Already Have

| Layer | Asset | Status |
|---|---|---|
| **Frontend** | `/(site)/cve/page.tsx` | ✅ CVE index page with filterable table |
| **Frontend** | `/(site)/cve/[cveId]/` | ✅ Individual CVE detail page |
| **Frontend** | `components/cve/` | ✅ `CveTable`, `CveFilters`, `CveDetailCard`, `SeverityBadge` — fully built |
| **Frontend** | `components/homepage/CveTracker.tsx` | ✅ Homepage CVE tracker widget |
| **Frontend** | `components/platform/CvePanel.tsx` | ✅ Sidebar CVE panel on homepage |
| **Backend** | `workers/ingestors/cve_worker.py` | ✅ **Functional** — Fetches from NIST NVD API v2.0, supports CVSS v4/v3.1/v3.0/v2, batch upsert to Supabase. |
| **Database** | `cves` table | ✅ Fully defined in Drizzle schema |
| **Shared** | `shared/models/cve.py` | ✅ `CVERecord` + `CVEInsert` Pydantic validation |

#### What Is Missing for "Moment-by-Moment" CVE Tracking

| Gap | Priority | Description |
|---|---|---|
| **No Daemon Loop** | 🔴 CRITICAL | `cve_worker.py` runs as a one-shot script (`if __name__ == "__main__": main()`). It fetches the last 24 hours and exits. No `while True:` polling loop for continuous operation. |
| **No Docker Service** | 🔴 CRITICAL | `cve_worker.py` is NOT included in `docker-compose.yml`. It must be run manually. Needs its own `zayron_cve` service container. |
| **No Real-Time Push** | 🟡 HIGH | The UI has no WebSocket / Server-Sent Events / Supabase Realtime subscription for live CVE updates. Users must refresh to see new CVEs. |
| **No CVE-to-Article Linking** | 🟡 HIGH | When `omni_crew.py` processes a feed that references a CVE, there is no foreign key relationship linking the resulting `article` to the `cves` table. This would enable "click a CVE → see all intelligence about it" workflows. |
| **No NVD API Key Enforcement** | 🟠 MEDIUM | Without `NVD_API_KEY`, rate limit is 5 requests / 30 seconds (vs. 50 with key). Extended polling will hit rate limits. |
| **Synchronous HTTP** | 🟠 MEDIUM | `cve_worker.py` uses synchronous `urllib.request` instead of `aiohttp`. Not blocking for its current one-shot use, but will become a bottleneck in a daemon loop. |
| **No CISA KEV Cross-Reference** | 🟠 MEDIUM | No integration with CISA Known Exploited Vulnerabilities catalog. High-value signal for prioritization. |
| **CVE Enrichment** | 🟠 MEDIUM | CVEs are stored as-is from NVD. No exploit-availability check (ExploitDB, GitHub PoC), no vendor advisory linking, no patch availability field. |

---

## 4. IMMEDIATE REFACTORING PRIORITIES

### 4.1 Critical Bugs

| ID | Severity | File | Issue | Impact |
|---|---|---|---|---|
| **BUG-001** | 🔴 CRITICAL | `omni_crew.py:478-483` | **Double Quant execution.** `stage_quant` is called twice — first with an empty `ComplianceReport()`, then again with the real compliance result. Wastes API tokens and produces inconsistent data on the first call. | LLM token waste; first quant result is discarded. |
| **BUG-002** | 🔴 CRITICAL | `darkweb_ingestor.py:90` | **`poisson_delay()` runtime crash.** Tries `asyncio.log.logging.math.log(u)` which doesn't exist. Falls to except-branch randomly, but the code is structurally broken. | Will crash on some Python versions. |
| **BUG-003** | 🟡 HIGH | `cve_worker.py:29` | **Broken import path.** `sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))` sets path to the file's own directory, not the project root. `from shared.models.cve import CVERecord` will fail unless run from a specific working directory. | CVE worker may fail to start. |

### 4.2 Hardcoded Data & Simulation Components

| ID | File | Issue | Recommendation |
|---|---|---|---|
| **HARD-001** | `dark-web-recon/page.tsx` | **Entirely hardcoded.** `INITIAL_LOGS[]` contains 7 fake ransomware intercepts. `MONITORED_FAMILIES` contains 5 hardcoded families with fake campaign counts. `setInterval` generates random fake logs every 4.5 seconds. | Replace with Supabase query: `raw_feeds WHERE source_channel LIKE 'darkweb_%' ORDER BY created_at DESC LIMIT 20`. |
| **HARD-002** | `page.tsx` (homepage) | **Hardcoded posture score.** `87%` / `SECURE` is a static SVG gauge. Not connected to any real telemetry. | Compute from real data: `(total_articles_with_mitigation / total_articles) * 100` or similar metric. |
| **HARD-003** | `page.tsx` (homepage) | **Hardcoded status telemetry.** Lines like `[PERIMETER_STATUS: 87% SECURE]`, `[TELEMETRY_LATENCY: 12ms]`, `[ONION_SCRAPERS: INTERCEPTING]` are static strings — pure UI theater. | Connect to real metrics or remove. |
| **HARD-004** | `config.py:130-139` | **Fictional CTI Authors.** 8 fictional human names are randomly assigned to articles. The latest system persona mandates `Author: "ZAYRON-X Intelligence Unit"` — never human pseudonyms. | Change to `"ZAYRON-X Intelligence Unit"` per persona spec. |
| **HARD-005** | `targets.json` | **Onion links in markdown format.** The dark web targets are wrapped in markdown links: `[http://lockbitaptxxxxxx.onion](http://lockbitaptxxxxxx.onion)` — the harvester's regex parsing handles this, but it's fragile. | Store as plain URLs. |

### 4.3 Legacy / Orphaned Files

| File | Location | Issue | Recommendation |
|---|---|---|---|
| `cti_ingestion_engine.py` | `gerasys-online/` | 40KB legacy monolith — the predecessor to the modular `workers/` pipeline. Contains GPT-4o and DALL-E 3 code. | **DELETE** — fully superseded by `workers/ingestors/` + `workers/omni_crew.py`. |
| `engine_articles.py` | `gerasys-online/` | 35KB legacy script — another predecessor to the multi-agent pipeline. | **DELETE** — fully superseded. |
| `radar-engine.py` | `gerasys-online/` | 27KB duplicate of `workers/ingestors/radar_engine.py`. | **DELETE** — the canonical version is in `workers/`. |
| `cve_worker.py` | `gerasys-online/` | 11KB duplicate of `workers/ingestors/cve_worker.py`. | **DELETE** — the canonical version is in `workers/`. |
| `article.html` | `gerasys-online/` | 20KB static HTML artifact. | **DELETE** — no longer used. |
| `index.html` | `gerasys-online/` | 115KB static HTML artifact. | **DELETE** — Next.js generates its own. |
| `hs_err_pid9796.log` | `gerasys-online/` | 67KB JVM crash log (unrelated). | **DELETE**. |
| `replay_pid9796.log` | `gerasys-online/` | 761KB JVM replay log (unrelated). | **DELETE**. |
| `zayron.tar` | `gerasys-online/` | 1MB tar archive. | **REVIEW** and likely DELETE. |
| `report` | `gerasys-online/` | 32KB file (no extension). | **REVIEW** — likely a test artifact. |
| `zayron_x_end` | `gerasys-online/` | 63KB file (no extension). | **REVIEW** — likely a test artifact. |
| `MASTER_DOSSIER` | `gerasys-online/` | 21KB file (no extension). Duplicate of `docs/MASTER_DOSSIER.md`. | **DELETE** the one without `.md` extension. |
| `X_System_Architecture_Document` | `gerasys-online/` | 33KB file (no extension). Duplicate of docs version. | **DELETE** the one without `.md` extension. |
| `ZAYRON-X_FULL_SYSTEM_AUDIT_*` | `gerasys-online/` | Two audit files (52KB, 62KB) — previous audit artifacts. | **KEEP** in `/docs/` only, delete frontend copies. |
| `supabase_gating_migration.sql` | `gerasys-online/` | 10KB SQL migration file. Should be in `docs/sql/`. | **MOVE** to `docs/sql/`. |
| `supabase_rls_patch_checklist.md` | `gerasys-online/` | 3.5KB RLS checklist. Should be in `docs/`. | **MOVE** to `docs/`. |
| `nginx.conf` | `gerasys-online/` | 2.8KB nginx config. Not used by Vercel deployment. | **MOVE** to `workers/` or `/docs/` for reference. |
| `pm2.ecosystem.config.js` | `gerasys-online/` | 2.3KB PM2 config. Legacy — Docker Compose is now the deployment standard. | **DELETE** or archive. |

### 4.4 Schema & Pipeline Misalignments

| ID | Issue | Impact |
|---|---|---|
| **SCHEMA-001** | `raw_feeds.original_language` defaults to `"ru"` in Drizzle schema, but ingestors set it to `"en"` for RSS feeds. | Cosmetic — default is overridden. But the Drizzle default should be `"en"`. |
| **SCHEMA-002** | `articles` table has no columns for MITRE TTPs, IoCs, CVSS v4, or FBR score — yet the `ExecutiveSITREP` model computes all of these. | **Data loss at persistence.** These valuable fields are computed by the crew but never stored. `persistence.py:213-227` only maps: `title`, `slug`, `author`, `category`, `content`, `excerpt`, `read_time`, `published_at`, `url_hash`, `financial_exposure`, `regulatory_risk`, `mitigation_impact`, `yara_rule`. |
| **SCHEMA-003** | No `source_url` or `source_channel` column in `articles`. After processing, the original source is lost. | Cannot trace an article back to its Telegram channel or RSS feed. |
| **SCHEMA-004** | No foreign key between `articles` and `cves`. | Cannot link articles to the CVEs they analyze. |
| **SCHEMA-005** | `threat_artifacts` table exists in Drizzle schema but is never populated by any backend code. | Dead table — designed for premium features not yet implemented. |

### 4.5 UI / UX Issues

| ID | Component | Issue |
|---|---|---|
| **UI-001** | `ArticleBody.tsx` | Articles render raw Markdown via `react-markdown`. Long YARA rules, Sigma YAML, and Snort signatures may produce **unformatted walls of text** if code fencing is inconsistent in LLM output. |
| **UI-002** | `Article3DImage.tsx` | Expects `image_url` column — but `persistence.py` never sets `image_url`. The `ai_image_prompt` is computed by the Weaver but never used to generate an actual image. **All articles will have missing images.** |
| **UI-003** | `BreakingTicker.tsx` | Contains only 129 bytes — likely a placeholder or stub component. |
| **UI-004** | Dark Web Recon | The page renders fake data with random hex strings every 4.5 seconds. Any real user will quickly identify this as simulation. |

### 4.6 Dependency & Infrastructure Notes

| Item | Observation |
|---|---|
| **Python `requirements.txt`** | Present in `workers/` (641 bytes). Should be audited for version pinning and deprecated packages. |
| **Docker Compose `version: "3.9"`** | The `version` key is deprecated in modern Docker Compose. Cosmetic, but should be removed. |
| **`Dockerfile.workers`** | Single Dockerfile for all worker services. Consider multi-stage build if image size becomes an issue. |
| **No CI/CD pipeline** | No GitHub Actions, no automated testing, no linting. Manual deployment via `deploy.sh`. |
| **No monitoring / alerting** | No Prometheus, Grafana, or Sentry integration. Daemon failures are only visible in Docker logs. |

---

## SUMMARY: SYSTEM MATURITY MATRIX

| Subsystem | Maturity | Notes |
|---|---|---|
| **Frontend (Next.js)** | 🟢 **Production** | Clean App Router architecture, Drizzle ORM, ISR, SEO, auth middleware |
| **Omni-Crew Pipeline** | 🟡 **Beta** | Architecture is sound, but has the double-quant bug and missing DB columns for enriched data |
| **RSS Ingestor** | 🟢 **Production** | Clean, deduplicating, async, with retry logic |
| **Telegram Radar** | 🟡 **Beta** | Feature-complete but needs real-world stress testing |
| **Dark Web Crawler** | 🔴 **Scaffold** | Placeholder URLs, broken delay function, no HTML parsing |
| **CVE Worker** | 🟡 **Beta** | Functional but one-shot, no daemon loop, not in Docker |
| **Database Schema** | 🟡 **Needs Expansion** | Missing columns for MITRE TTPs, IoCs, CVSS, FBR, source tracking |
| **Shared Models** | 🟢 **Production** | Strict Pydantic validation, deterministic IoC gate, category enforcement |
| **Docker Infrastructure** | 🟢 **Production** | Multi-container orchestration, Tor gateway, resource limits, healthchecks |
| **Monitoring** | 🔴 **Missing** | No structured logging pipeline, no metrics, no alerts |

---

> **This document serves as the master blueprint for all upcoming integrations. Reference it before writing any code.**
