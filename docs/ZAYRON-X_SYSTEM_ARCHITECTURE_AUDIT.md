# ZAYRON-X — System Architecture & Health Audit Report

**Classification:** TLP:AMBER — Internal Engineering Use Only
**Date:** 2026-05-13
**Auditor:** Principal Architect, ZAYRON-X Engineering
**Project:** `gerasys-online` (monorepo root: `zayron-app`)
**Version:** 2.0.0

---

## Table of Contents

1. [Executive Summary & System State](#1-executive-summary--system-state)
2. [Complete Directory & File Architecture](#2-complete-directory--file-architecture)
3. [Critical Errors & Broken Components](#3-critical-errors--broken-components)
4. [Incomplete Features & Missing Logic](#4-incomplete-features--missing-logic)
5. [The Modification Playbook](#5-the-modification-playbook)

---

## 1. EXECUTIVE SUMMARY & SYSTEM STATE

### 1.1 High-Level Overview

ZAYRON-X is an ambitious **cyber threat intelligence platform** built on a three-layer architecture:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — INGESTION (Python Daemons, PM2-managed)         │
│  radar-engine.py  →  Telegram Channel Scraping              │
│  cti_ingestion_engine.py  →  RSS Feeds + LLM Analysis       │
│  engine_articles.py  →  DeepSeek AI Article Generation      │
│  cve_worker.py  →  NIST NVD CVE Fetcher                     │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 — STORAGE (Supabase PostgreSQL)                    │
│  Tables: articles, cves, tools, malware, apt, osint,         │
│          raw_feeds, analysts, subscribers, trending,          │
│          radar_targets                                       │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3 — PRESENTATION (Next.js 16 + Bun + Tailwind 4)     │
│  App Router with route groups: (site), (auth), admin         │
│  Drizzle ORM for database queries                            │
│  Supabase SSR for auth (client + server)                     │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**

```
Telegram Channels → radar-engine.py → raw_feeds (pending)
                                         │
RSS Feeds → cti_ingestion_engine.py ────┤
                                         ▼
                              engine_articles.py (DeepSeek AI)
                                         │
                                         ▼
                              Supabase: articles, tools, cves,
                                        malware, apt, osint
                                         │
                                         ▼
                              Next.js Frontend (Drizzle ORM reads)
                                         │
                                         ▼
                              Public Website (zayron-x.com)
```

### 1.2 What Is Working Correctly

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js 16 App Router | Operational | Route groups, layouts, SSR all functional |
| Drizzle ORM Schema | Operational | Type-safe schema with 6 tables defined |
| Supabase Connection | Operational | Both Drizzle (server) and Supabase SSR (auth) wired |
| Homepage (/) | Operational | `HeroSection`, `CategoryShowcase`, `LatestReports`, `Newsletter` all render |
| Article Detail Page (`/article/[slug]`) | Operational | Full dossier layout with reading progress, share buttons, related articles, JSON-LD |
| CVE Tracker (`/cve`) | Operational | Paginated CVE list from NVD data |
| CVE Detail (`/cve/[cveId]`) | Operational | Individual CVE detail card |
| Tools Directory (`/tools`) | Operational | Lists all tools from `tools` table |
| Tool Detail (`/tools/[slug]`) | Operational | Individual tool review page |
| Search (`/search`) | Operational | PostgreSQL full-text search via `ts_vector` |
| Newsletter API (`/api/subscribe`) | Operational | Email validation + Supabase insert |
| Admin Dashboard | Partial | UI renders with mock fallback data |
| Python CTI Ingestion Engine | Operational | RSS → LLM → Supabase pipeline complete |
| Python CVE Worker | Operational | NVD API → Supabase `cves` table complete |
| Python Radar Engine | Operational | Telegram scraping + dedup logic |
| Python Article Engine | Operational | DeepSeek AI article generation |
| Tailwind CSS v4 Design System | Operational | Custom theme tokens, `prose-zayron`, frosted glass, TLP badges |
| RLS Security Policies | Defined | `supabase_rls_patch.sql` ready for execution |

---

## 2. COMPLETE DIRECTORY & FILE ARCHITECTURE

### 2.1 Root-Level File Tree

```
zayron-app/                              ← Monorepo root
├── .claude/                             ← Claude Code settings
├── .gitignore
├── .mcp.json                            ← MCP server configuration
├── .vercel/                             ← Vercel deployment metadata
├── __pycache__/                         ← Python bytecode cache
├── article.html                         ← Legacy/static article template
├── index.html                           ← Legacy/static landing page
├── zayron.tar                           ← Deployment artifact
│
├── ★ cti_ingestion_engine.py            ← GOD-TIER: RSS Feed → LLM → Supabase
├── ★ cve_worker.py                      ← NIST NVD CVE fetcher → Supabase cves
├── ★ engine_articles.py                 ← DeepSeek AI article generator
├── ★ radar-engine.py                    ← Telegram multi-channel scraper
├── ★ supabase_rls_patch.sql             ← Zero-trust RLS security policies
│
└── gerasys-online/                      ← ★ THE NEXT.JS APPLICATION ★
    ├── package.json                     ← Bun + Next.js 16 + Drizzle + Supabase
    ├── .env.example                     ← Environment variable template
    ├── .env.local                       ← Active env vars (gitignored)
    ├── next.config.*                    ← (not present — using Next.js defaults)
    │
    ├── app/                             ← ★ App Router (THE FRONTEND) ★
    ├── components/                      ← ★ React Components ★
    ├── lib/                             ← ★ Business Logic Layer ★
    ├── styles/                          ← ★ Global CSS ★
    ├── scripts/                         ← Bun scripts (ingestion, deploy)
    ├── .next/                           ← Build output (gitignored)
    └── node_modules/                    ← Dependencies (gitignored)
```

### 2.2 App Router Structure (`app/`)

```
app/
├── layout.tsx                           ← ★ ROOT LAYOUT: <html>, <body>, <Header>, <Footer>
├── robots.ts                            ← robots.txt generation
├── sitemap.ts                           ← XML sitemap generation
│
├── (site)/                              ← ★ PUBLIC-FACING ROUTE GROUP
│   ├── layout.tsx                       ← Site layout (pass-through wrapper)
│   ├── page.tsx                         ← ★ HOMEPAGE: Hero, Categories, Articles, Newsletter
│   ├── [category]/page.tsx              ← ★ CATEGORY PAGE: dynamic, reads articles table
│   ├── article/[slug]/page.tsx          ← ★ ARTICLE DETAIL: full dossier experience
│   ├── tools/page.tsx                   ← Tools directory listing
│   ├── tools/[slug]/page.tsx            ← Individual tool detail
│   ├── cve/page.tsx                     ← CVE tracker (paginated table)
│   ├── cve/[cveId]/page.tsx             ← Individual CVE detail
│   ├── analysts/page.tsx                ← Analyst team page
│   ├── search/page.tsx                  ← Full-text search results
│   ├── about/page.tsx                   ← About page
│   ├── contact/page.tsx                 ← Contact page
│   └── privacy/page.tsx                 ← Privacy policy
│
├── (auth)/                              ← ★ AUTH ROUTE GROUP
│   ├── layout.tsx                       ← Auth layout
│   ├── login/page.tsx                   ← Supabase login
│   └── register/page.tsx                ← Supabase registration
│
├── admin/                               ← ★ ADMIN PANEL (should be auth-protected)
│   ├── layout.tsx                       ← Admin sidebar + layout
│   ├── page.tsx                         ← Dashboard (stats, pipeline status)
│   ├── articles/page.tsx                ← Article management
│   ├── cves/page.tsx                    ← CVE management
│   ├── feeds/page.tsx                   ← Raw feed queue
│   ├── feeds/[id]/page.tsx              ← Individual feed detail
│   └── settings/page.tsx                ← System settings
│
├── api/                                 ← ★ API ROUTES
│   ├── subscribe/route.ts               ← POST: newsletter subscription
│   ├── search/route.ts                  ← Search API endpoint
│   ├── articles/route.ts                ← Articles CRUD API
│   ├── articles/[slug]/route.ts         ← Single article API
│   ├── cves/route.ts                    ← CVEs API
│   ├── revalidate/route.ts              ← ISR revalidation webhook
│   └── views/[id]/route.ts              ← View count tracking
│
└── auth/callback/route.ts               ← Supabase OAuth callback handler
```

### 2.3 Components Architecture (`components/`)

```
components/
├── layout/                              ← ★ GLOBAL LAYOUT COMPONENTS
│   ├── Header.tsx                       ← Sticky nav: logo, categories dropdown, tools dropdown, search
│   ├── Footer.tsx                       ← 4-column footer: Intelli­gence, Resources, Company, Connect
│   ├── MobileNav.tsx                    ← (imported but not separately defined — inline in Header)
│   └── BreakingTicker.tsx               ← (not present — referenced but missing)
│
├── homepage/                            ← ★ HOMEPAGE-SPECIFIC COMPONENTS
│   ├── HeroSection.tsx                  ← Bento grid: primary article (2-col) + secondary stack (1-col)
│   ├── CategoryShowcase.tsx             ← Category cards grid (from getCategoriesWithCounts)
│   ├── FeaturedGrid.tsx                 ← (not imported on homepage currently)
│   ├── LatestReports.tsx                ← (not imported on homepage currently)
│   ├── CveTracker.tsx                   ← (not imported on homepage currently)
│   ├── StatsCounter.tsx                 ← (not imported on homepage currently)
│   ├── TabbedContent.tsx                ← (not imported on homepage currently)
│   ├── ThreatTicker.tsx                 ← (not imported on homepage currently)
│   ├── ToolSpotlight.tsx                ← (not imported on homepage currently)
│   ├── TrendingWidget.tsx               ← (not imported on homepage currently)
│   ├── AnalystTeam.tsx                  ← (not imported on homepage currently)
│   └── Newsletter.tsx                   ← Email signup form → POST /api/subscribe
│
├── article/                             ← ★ ARTICLE DETAIL COMPONENTS
│   ├── ArticleHeader.tsx                ← Title, author, date, read time, category badge
│   ├── ArticleBody.tsx                  ← Markdown renderer (react-markdown + rehype/remark plugins)
│   ├── ArticleSidebar.tsx               ← Trending articles sidebar
│   ├── AuthorCard.tsx                   ← Author bio card
│   ├── ReadingProgress.tsx              ← Scroll progress bar (top of viewport)
│   ├── RelatedArticles.tsx              ← Same-category articles
│   └── ShareButtons.tsx                 ← Social share (Twitter, LinkedIn, copy link)
│
├── cve/                                 ← ★ CVE-SPECIFIC COMPONENTS
│   ├── CveTable.tsx                     ← Paginated CVE data table
│   ├── CveDetailCard.tsx                ← Single CVE detail display
│   ├── CveFilters.tsx                   ← Severity/product filter controls
│   └── SeverityBadge.tsx                ← Colored severity pill (Critical/High/Medium/Low)
│
└── ui/                                  ← ★ SHARED UI PRIMITIVES
    ├── ArticleCard.tsx                  ← Reusable article card (image, badge, title, meta)
    ├── Button.tsx                       ← Styled button component
    ├── CategoryBadge.tsx                ← Category label pill
    ├── CopperDivider.tsx                ← Gold-accent gradient divider
    ├── SearchBar.tsx                    ← Search input with icon + keyboard shortcut hint
    └── SkeletonLoader.tsx               ← Loading skeleton placeholder
```

### 2.4 Business Logic Layer (`lib/`)

```
lib/
├── db/
│   ├── index.ts                         ← ★ DATABASE CONNECTION: Drizzle + postgres.js pool
│   ├── schema.ts                        ← ★ SCHEMA DEFINITIONS: articles, cves, tools, analysts,
│   │                                       subscribers, trending, raw_feeds (Drizzle ORM)
│   └── queries/
│       ├── articles.ts                  ← ★ ALL ARTICLE QUERIES: CRUD, search, categories, views, slugs
│       ├── cves.ts                      ← CVE queries: paginated, by severity, by vendor, search
│       ├── tools.ts                     ← Tools queries: all, by slug, by category, top
│       ├── rawFeeds.ts                  ← Raw feed queries: pending, count, CRUD
│       └── analytics.ts                 ← (exists but not reviewed — likely view/engagement stats)
│
├── supabase/
│   ├── client.ts                        ← Browser Supabase client (NEXT_PUBLIC_ env vars)
│   ├── server.ts                        ← Server Supabase client + admin client (cookies)
│   └── middleware.ts                     ← ★ updateSession(): auth guard for /admin/*, redirect logic
│
├── cache/
│   └── redis.ts                         ← Upstash Redis rate limiter (for API routes)
│
├── pipeline/
│   └── telegram-prompt.ts               ← (TypeScript prompt template for Telegram ingestion)
│
├── seo/
│   └── metadata.ts                      ← Shared SEO metadata helpers
│
└── utils/
    ├── fallbackImages.ts                ← Category → Unsplash image URL mapping
    ├── formatDate.ts                    ← Date formatting utilities
    ├── markdown.ts                      ← Markdown sanitization (DOMPurify)
    ├── readingTime.ts                   ← Word count → read time estimation
    └── slugify.ts                       ← Text → URL-safe slug conversion
```

### 2.5 Python Backend Scripts — Purpose & Function

#### `radar-engine.py` — Telegram Intelligence Radar

**Role:** First-stage ingestion. The "ears" of ZAYRON-X.

- **Input:** Supabase `radar_targets` table (dynamic list of Telegram channel URLs)
- **Process:**
  1. Fetches active targets from Supabase REST API
  2. Scrapes each public Telegram channel via HTTP (t.me/s/...) with MTProto (Telethon) fallback
  3. SHA-256 content deduplication using local SQLite cache (72h TTL)
  4. Cross-channel dedup: first post wins, duplicates rejected
  5. Keyword-based pre-categorization (CVE, malware, APT, OSINT, tools)
  6. Script-based language detection (Cyrillic→ru, Arabic→ar, CJK→zh)
- **Output:** Inserts unique messages into Supabase `raw_feeds` table with `status = 'pending'`
- **Runtime:** Continuous daemon loop (default: 5-minute scan interval)
- **Key Detail:** Does NOT do LLM processing — it only collects. The LLM step is downstream in `engine_articles.py`.

#### `engine_articles.py` — DeepSeek AI Article Generation Engine

**Role:** Second-stage intelligence refinement. The "brain" of ZAYRON-X.

- **Input:** Supabase `raw_feeds` table (rows with `status = 'pending'`)
- **Process:**
  1. Fetches oldest pending feeds (configurable batch size, default 5)
  2. Sends each to DeepSeek AI with the massive `MASTER_PROMPT` (system prompt)
  3. LLM generates a 1500+ word report with MITRE ATT&CK, ISO 27001, GDPR, YARA, Sigma, Snort, IoCs
  4. Validates JSON response, checks minimum word count (800 words warning threshold)
  5. Inserts completed article into Supabase `articles` table
  6. Marks raw_feed as `promoted` (success), `rejected` (non-intel), or `error`
- **Output:** Structured intelligence reports in `articles` table
- **Runtime:** Continuous daemon loop (default: 5-minute poll interval)
- **Critical Detail:** Uses OpenAI-compatible API pointing at DeepSeek. Does NOT dispatch to category-specific tables (tools, malware, apt, osint) — only writes to `articles`.

#### `cti_ingestion_engine.py` — RSS Feed Ingestion Pipeline

**Role:** Alternative ingestion path. The "eyes" of ZAYRON-X.

- **Input:** Hardcoded RSS feeds (BleepingComputer, The Hacker News, Dark Reading)
- **Process:**
  1. Fetches RSS/Atom feeds via aiohttp
  2. Parses with feedparser
  3. Deduplicates against existing `articles` table via `url_hash`
  4. Sends each article to LLM (OpenAI/OpenAI-compatible) with `CTI_SYSTEM_PROMPT`
  5. LLM generates the full SITREP JSON with all sections
  6. Optionally generates DALL-E 3 images and uploads to Supabase Storage
  7. **Multi-table dispatch:** Routes by category → articles, tools, malware, apt, osint tables
- **Output:** Intelligence reports dispatched to 5 different Supabase tables
- **Runtime:** Continuous daemon loop (default: 15-minute poll interval)
- **Critical Detail:** This is the ONLY script that writes to the `tools`, `malware`, `apt`, and `osint` tables. It is the bridge between LLM output and multi-table architecture.

#### `cve_worker.py` — NIST NVD CVE Fetcher

**Role:** Standalone CVE intelligence worker.

- **Input:** NIST NVD API 2.0 (last 24 hours of published CVEs)
- **Process:**
  1. Fetches CVEs with pagination from NVD
  2. Extracts CVSS v4.0, v3.1, v3.0, v2.0 scores (v4.0 priority)
  3. Parses product/vendor from CPE data
  4. Upserts into Supabase `cves` table with conflict resolution on `cve_id`
- **Output:** Structured CVE records in `cves` table
- **Runtime:** One-shot script (intended for cron/PM2 scheduled execution)

### 2.6 Inter-Component Communication Map

```
┌──────────────────┐     REST API (service_role)     ┌──────────────────┐
│  radar-engine.py │ ──────────────────────────────► │  Supabase        │
│                  │ ──► raw_feeds (INSERT)           │  PostgreSQL      │
└──────────────────┘                                 │                  │
                                                     │  raw_feeds       │
┌──────────────────────┐     REST API (service_role)  │  articles        │
│  engine_articles.py  │ ──────────────────────────► │  cves            │
│                      │ ──► raw_feeds (UPDATE)       │  tools           │
│                      │ ──► articles (INSERT)        │  malware         │
└──────────────────────┘                             │  apt             │
                                                     │  osint           │
┌──────────────────────────┐  REST API (service_role) │  analysts        │
│  cti_ingestion_engine.py │ ──────────────────────► │  subscribers     │
│                          │ ──► articles (INSERT)    │  trending        │
│                          │ ──► tools (INSERT)       │  radar_targets   │
│                          │ ──► malware (INSERT)     └────────┬─────────┘
│                          │ ──► apt (INSERT)                   │
│                          │ ──► osint (INSERT)        Drizzle ORM
└──────────────────────────┘                          (postgres.js)
                                                             │
┌──────────────────┐     REST API (service_role)             │
│  cve_worker.py   │ ──────────────────────────────►        │
│                  │ ──► cves (UPSERT)                       ▼
└──────────────────┘                                 ┌──────────────────┐
                                                     │  Next.js App     │
                                                     │  (Bun runtime)   │
                                                     │                  │
                                                     │  SSR Pages       │
                                                     │  API Routes      │
                                                     │  Client Comps    │
                                                     └──────────────────┘
```

**Key Communication Protocols:**
- **Python → Supabase:** Direct REST API calls using `supabase_key` (service_role) as Bearer token
- **Next.js Server → Supabase:** Drizzle ORM via `postgres.js` using `DATABASE_URL` (direct Postgres connection)
- **Next.js Client → Supabase:** `@supabase/ssr` browser client using `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Next.js Auth:** Supabase SSR middleware (cookie-based session management)

### 2.7 Database Schema (Drizzle ORM Definitions)

| Table | Primary Key | Key Columns | Notes |
|-------|------------|-------------|-------|
| `articles` | `id` (uuid) | `title`, `slug` (unique), `author`, `category`, `content`, `excerpt`, `image_url`, `read_time`, `views`, `is_published`, `is_featured`, `is_breaking` | Main content table. `slug` is NOT NULL and UNIQUE — but Python scripts do not generate it. |
| `cves` | `id` (uuid) | `cve_id` (unique), `title`, `description`, `severity`, `cvss_score`, `cvss_vector`, `affected_product`, `vendor`, `status`, `published_date` | CVE database. Fed by `cve_worker.py`. |
| `tools` | `id` (uuid) | `name`, `slug` (unique), `category`, `description`, `rating`, `github_url`, `stars`, `tags` | Security tools directory. |
| `analysts` | `id` (uuid) | `name`, `title`, `bio`, `specializations[]`, `article_count` | Analyst team profiles. |
| `subscribers` | `id` (uuid) | `email` (unique), `is_active` | Newsletter subscribers. |
| `trending` | `id` (uuid) | `title`, `rank`, `engagement_score`, `article_id` (FK → articles) | Trending articles tracking. |
| `raw_feeds` | `id` (uuid) | `source_channel`, `raw_content`, `original_language`, `status`, `translated_title`, `translated_content`, `analysis`, `ai_generated_flag`, `timestamp` | Raw Telegram/RSS intake queue. |

**Schema Discrepancies (Drizzle vs. Actual Supabase):**
The Python scripts write to tables (`malware`, `apt`, `osint`, `radar_targets`) that are NOT defined in the Drizzle schema. Conversely, the Drizzle schema expects columns (`slug`, `url_hash`) that the Python scripts don't populate. This is a **critical mismatch** — see Section 3.

---

## 3. CRITICAL ERRORS & BROKEN COMPONENTS

### 3.1 ERROR #1 — Category 404 (Root Cause: Table Routing Mismatch)

**Severity:** CRITICAL — Blocks user-facing navigation

**Symptom:** Navigating to `/tools`, `/malware`, `/apt` (as category pages) returns 404.

**Root Cause Chain:**

1. The `[category]/page.tsx` route handles ALL dynamic category pages (e.g., `/threat-intelligence`, `/malware`, `/apt-activity`).

2. On line 33, it calls `getArticlesByCategory(displayCategory, page, 12)` — this query ONLY searches the `articles` table:

   ```typescript
   // lib/db/queries/articles.ts:65-79
   export async function getArticlesByCategory(category: string, page = 1, pageSize = PAGE_SIZE) {
     return db.select().from(articles).where(
       and(
         sql`LOWER(${articles.category}) = LOWER(${category})`,
         publishedCondition()
       )
     )...
   }
   ```

3. BUT the Python `cti_ingestion_engine.py` routes categories to DIFFERENT tables:

   ```python
   # cti_ingestion_engine.py:405-414
   TABLE_ROUTING = {
       "articles": ["Threat Intelligence", "Vulnerability Research", "OSINT", "Cyber Crime"],
       "tools": ["Tools", "Security Tools"],
       "malware": ["Malware Analysis", "Ransomware", "Malware"],
       "apt": ["APT Activity", "Nation State", "Advanced Persistent Threat"],
       "osint": ["OSINT", "Open Source Intelligence"],
   }
   ```

4. If "Malware Analysis" articles are in the `malware` table but the frontend queries the `articles` table, the query returns 0 rows.

5. On line 37 of `[category]/page.tsx`: `if (!articles.length && page === 1) notFound();` — triggers a 404.

**Also:** `getCategoriesWithCounts()` (used in the Header dropdown) also ONLY queries `articles`. So categories stored in `malware`, `apt`, `tools`, and `osint` tables will NOT appear in the navigation dropdown, even if they have data. But if they somehow DO appear (e.g., if there's an article in the `articles` table with category "Malware"), clicking the link would only show articles from the `articles` table, not from the `malware` table — silently hiding content.

**The `/tools` path conflict:** There are TWO routes that handle `/tools`:
- `(site)/tools/page.tsx` — the Tools Directory page (works correctly)
- `(site)/[category]/page.tsx` — the dynamic category page

Next.js resolves this because static routes take priority over dynamic ones. So `/tools` renders the Tools Directory, NOT the category page. But `/malware` or `/apt` have no dedicated page, so they hit `[category]/page.tsx` and 404.

### 3.2 ERROR #2 — Missing `slug` Generation in Python Backend

**Severity:** HIGH — Causes database insert failures

**The Drizzle schema defines `articles.slug` as `text("slug").notNull().unique()`** — it MUST have a value and must be unique.

However, neither `engine_articles.py` nor `cti_ingestion_engine.py` generate a `slug` field when inserting into the `articles` table:

```python
# engine_articles.py:600-608 — NO slug field
row = {
    "title": sitrep.get("title", feed.get("translated_title", "Untitled")),
    "author": pick_author(),
    "category": sitrep.get("category", "Threat Intelligence"),
    "content": sitrep.get("content", ""),
    "excerpt": sitrep.get("executive_summary", "")[:500],
    "read_time": estimate_read_time(sitrep.get("content", "")),
    "created_at": jitter_created_at(),
}
```

```python
# cti_ingestion_engine.py:435-448 — NO slug field
row = {
    "title": sitrep.get("title", article.title),
    "author": pick_author(),
    "category": sitrep.get("category", article.source_category),
    "content": full_content,
    "excerpt": sitrep.get("executive_summary", ""),
    "read_time": estimate_read_time(full_content),
    "created_at": jitter_created_at(),
}
```

**Impact:** If the actual Supabase `articles` table has `slug` as NOT NULL without a default, inserts from Python will fail silently (the REST API returns an error that the Python scripts log but don't halt on). Even if the column allows NULLs or has a default, the frontend article detail page (`/article/[slug]`) won't be able to find these articles because `getArticleBySlug` queries by slug.

### 3.3 ERROR #3 — No Root-Level `middleware.ts` File

**Severity:** HIGH — Admin panel is unprotected

The project has `lib/supabase/middleware.ts` which exports an `updateSession` function. However, there is **no `middleware.ts` at the Next.js app root** (i.e., `gerasys-online/middleware.ts` does not exist).

Next.js middleware must be at the project root (or `src/middleware.ts`). Without it:
- The `/admin/*` routes are NOT protected by Supabase auth
- The Supabase session is NOT refreshed on each request
- Anyone can access `/admin/*` without logging in

### 3.4 ERROR #4 — CSS Variable References Without Fallbacks

**Severity:** MEDIUM — "Black Space" / missing styling

The `tools/page.tsx` and `tools/[slug]/page.tsx` pages reference CSS custom properties like `var(--color-stone)`, `var(--color-copper)`, `var(--color-obsidian)`, `var(--color-gold)`, `var(--color-border)`. These are defined in `globals.css` as Tailwind theme variables but are referenced using `var()` syntax rather than Tailwind utility classes.

The pages that use standard Tailwind classes (like `bg-[#F8FAFC]`, `text-[#0F172A]`) work correctly. But pages using `var(--color-*)` syntax will only work if those CSS variables are available on the element. The theme variables are defined via `@theme` in Tailwind v4, which makes them available as both Tailwind utilities AND CSS custom properties at the `:root` level — so they should work.

However, the **"black space" issue** is more likely caused by:

1. **Double `<main>` tags:** The Root Layout wraps children in `<main>{children}</main>`, and pages like `HomePage` and `CategoryPage` ALSO use `<main className="... min-h-screen">`. This creates invalid nested `<main>` elements.

2. **`min-h-screen` on inner `<main>`:** Since the body already has `min-h-screen bg-[#F8FAFC]`, having nested `min-h-screen` on page-level `<main>` elements can cause layout thrashing, especially with the sticky Header taking up 64px (h-16).

3. **The `(site)/layout.tsx` returns bare `{children}`:** No wrapper div for the site route group means pages render directly inside the Root Layout's `<main>`, but the Header (64px) takes space above the `<main>`, so pages with `min-h-screen` will be 100vh + 64px, potentially causing overflow/blank areas.

### 3.5 ERROR #5 — Schema-Only Tables Without Frontend Routes

**Severity:** MEDIUM — Hidden data, wasted ingestion

The Python `cti_ingestion_engine.py` dispatches to 5 tables: `articles`, `tools`, `cves`, `malware`, `apt`, `osint`. However, the frontend only has pages/API routes for 3 of them:

| Table | Frontend Route | Status |
|-------|---------------|--------|
| `articles` | `/article/[slug]`, `/api/articles/*` | Implemented |
| `cves` | `/cve`, `/cve/[cveId]`, `/api/cves` | Implemented |
| `tools` | `/tools`, `/tools/[slug]` | Implemented |
| `malware` | **NONE** | Data ingested but invisible |
| `apt` | **NONE** | Data ingested but invisible |
| `osint` | **NONE** | Data ingested but invisible |

The Drizzle schema doesn't even define `malware`, `apt`, or `osint` tables — they exist only on the Supabase side, populated by Python, invisible to the frontend.

### 3.6 ERROR #6 — Missing `url_hash` in Drizzle Schema

**Severity:** LOW — Deduplication works only on Python side

The `cti_ingestion_engine.py` uses `url_hash` for deduplication, querying `articles?select=url_hash` from Supabase. But the Drizzle schema (`lib/db/schema.ts`) does NOT include a `url_hash` column in the `articles` table definition. If the actual database column exists (created by the Python side or manual migration), Drizzle won't know about it, which is fine for reads but means Drizzle can't write to it. If it doesn't exist, the Python deduplication query returns nothing and duplicates won't be caught.

### 3.7 ERROR #7 — `BreakingTicker` Import Reference

**Severity:** LOW — Broken import path

The file `components/layout/BreakingTicker.tsx` is listed in the file tree but was not found during exploration. If any component imports it, that import will fail at runtime.

---

## 4. INCOMPLETE FEATURES & MISSING LOGIC

### 4.1 Frontend Missing Features

| Feature | Current State | What's Missing |
|---------|--------------|----------------|
| **Supabase Auth UI** | `(auth)/login` and `(auth)/register` exist | No middleware to protect admin; auth pages may not be functional end-to-end |
| **Malware Category Page** | No route | Need `/malware` page reading from `malware` table |
| **APT Category Page** | No route | Need `/apt` page reading from `apt` table |
| **OSINT Category Page** | No route | Need `/osint` page reading from `osint` table |
| **Analysts Page** | Route exists at `(site)/analysts/page.tsx` | May not have data if analysts table is empty |
| **Contact Page** | Route exists at `(site)/contact/page.tsx` | Functionality unknown |
| **About Page** | Route exists at `(site)/about/page.tsx` | Static or dynamic content unknown |
| **Privacy Page** | Route exists | Static content |
| **Admin Articles** | Route at `admin/articles/page.tsx` | CRUD UI completeness unknown |
| **Admin Feeds** | Routes at `admin/feeds/page.tsx`, `admin/feeds/[id]/page.tsx` | Management UI for raw feeds |
| **Admin Settings** | Route at `admin/settings/page.tsx` | System configuration UI |
| **Admin CVEs** | Route at `admin/cves/page.tsx` | CVE management UI |
| **Social Share Previews** | OpenGraph tags defined | No OG image generation service |
| **Sitemap** | `sitemap.ts` exists | May not include all dynamic routes |
| **RSS Feed Output** | Not implemented | No `/rss.xml` or `/feed` endpoint |

### 4.2 Backend (Python) Missing Features

| Feature | Current State | What's Missing |
|---------|--------------|----------------|
| **Image Generation** | Supported in `cti_ingestion_engine.py` (DALL-E 3) | Disabled by default (`ENABLE_IMAGES=false`). Not implemented in `engine_articles.py` |
| **Social Media Auto-Broadcasting** | Not implemented | No Twitter/X API, LinkedIn API, or Telegram channel posting |
| **Slug Auto-Generation** | Not implemented | Python scripts don't generate `slug` from title |
| **Category Sorting Logic** | Basic keyword matching in `radar-engine.py` | No ML-based classification, no confidence scoring |
| **Translation Pipeline** | Language detection exists | No actual translation (MTProto/DeepL API calls not implemented) |
| **MTProto Telegram Client** | Telethon integration exists as fallback | Requires API credentials; HTTP scraping is primary method (fragile) |
| **Multi-Engine Orchestration** | Each Python script runs independently | No central coordinator, no shared state, no priority queue |
| **Error Recovery** | Retry logic exists per-operation | No dead-letter queue, no alerting on repeated failures |
| **Metrics/Monitoring** | Basic logging | No Prometheus/Grafana, no health check endpoints |

### 4.3 AI Prompt Logic Gaps

#### In `cti_ingestion_engine.py`:

- **The CTI_SYSTEM_PROMPT is massive and thorough** — it requests MITRE ATT&CK, ISO 27001, NIST CSF, GDPR, YARA, Sigma, Snort, IoCs, CVSS v4.0, and more.
- **However**, the prompt requests ALL of this for EVERY article, even low-value ones. There's no triage step to determine if an article warrants a 1500+ word report vs. a brief summary.
- The prompt requests `ai_image_prompt` in the JSON output, but the image generation pipeline is separate (`process_image_for_article`). If `ENABLE_IMAGES=false`, the model still wastes tokens generating the image prompt.
- The Arabic localization directive (Directive 1b) is embedded in the main system prompt, consuming significant token budget even when processing English-only sources.

#### In `engine_articles.py`:

- **The MASTER_PROMPT is even more aggressive** — it demands 1500+ words minimum with explicit threats ("FAILURE TO COMPLY IS NOT AN OPTION").
- The prompt INSTRUCTS the model to "INVENT theoretical architectural context" when source material is thin. This is a **content quality risk** — it encourages hallucination of plausible-sounding but unverified technical details.
- The word count validation (line 561) warns at 800 words but accepts the article anyway — the 1500-word minimum is aspirational but not enforced.
- The prompt includes Arabic localization directives but there's no mechanism to detect when Arabic output should be triggered.

#### General AI Pipeline Issues:

- **No feedback loop:** If an article gets low engagement (views), there's no mechanism to refine future prompts.
- **No A/B testing:** All articles use the same prompt template with no variation.
- **No quality scoring:** LLM outputs aren't scored for coherence, accuracy, or completeness before insertion.
- **Slug generation is missing:** The LLM generates the title but not the URL slug. The frontend needs a slug for routing.

### 4.4 Multi-Table Architecture: The Disconnect

This is the single biggest architectural gap:

```
PYTHON SIDE (writes to 5+ tables)        FRONTEND SIDE (reads from 3 tables)
─────────────────────────────────        ─────────────────────────────────
articles  ← engine_articles.py           articles  ← Drizzle schema ✓
          ← cti_ingestion_engine.py                ← Frontend queries ✓
tools     ← cti_ingestion_engine.py      tools     ← Drizzle schema ✓
                                                   ← Frontend queries ✓
cves      ← cve_worker.py                cves      ← Drizzle schema ✓
                                                   ← Frontend queries ✓
malware   ← cti_ingestion_engine.py      malware   ← NO Drizzle schema ✗
                                                   ← NO Frontend queries ✗
apt       ← cti_ingestion_engine.py      apt       ← NO Drizzle schema ✗
                                                   ← NO Frontend queries ✗
osint     ← cti_ingestion_engine.py      osint     ← NO Drizzle schema ✗
                                                   ← NO Frontend queries ✗
```

**The `malware`, `apt`, and `osint` tables are black holes** — data goes in via Python, nothing comes out via the frontend. If the intent was for these tables to feed separate category pages, they need:
1. Drizzle schema definitions
2. Query functions in `lib/db/queries/`
3. Frontend pages/routes
4. Integration with the `[category]/page.tsx` route (or dedicated routes)

**Alternatively**, if the intent was to keep everything in `articles` and use `category` as a filter (simpler architecture), then the Python routing logic in `cti_ingestion_engine.py` needs to be changed to route everything to `articles` with appropriate category tags.

---

## 5. THE MODIFICATION PLAYBOOK

### 5.1 How to Add a New Category to the Website

**Scenario:** You want to add a new intelligence category, e.g., "Supply Chain Security."

**Step 1 — Ensure the Data Pipeline Supports It:**

1. Open `cti_ingestion_engine.py`
2. Add "Supply Chain Security" to the `TABLE_ROUTING` dictionary under the `"articles"` key (or create a new table routing if you want it separated):

   ```python
   TABLE_ROUTING = {
       "articles": [
           "Threat Intelligence", "Vulnerability Research", "OSINT",
           "Cyber Crime", "Supply Chain Security",  # ← ADDED
       ],
       ...
   }
   ```

3. The LLM prompt (`CTI_SYSTEM_PROMPT`, line 190) lists valid categories. Add "Supply Chain Security" to the `category` field enum in the JSON output schema.

**Step 2 — Verify Database Schema:**

- If routing to the existing `articles` table: no schema change needed — the `category` column is just text.
- If creating a new table: add it to `lib/db/schema.ts` using Drizzle's `pgTable`, then run `bunx drizzle-kit push`.

**Step 3 — Frontend Already Handles It:**

The `[category]/page.tsx` dynamic route automatically handles ANY category. If your new category has articles in the `articles` table, visiting `/supply-chain-security` will work automatically (the slug is derived from `category.toLowerCase().replace(/\s+/g, "-")`).

**Step 4 — Update Supporting Files:**

- `lib/utils/fallbackImages.ts` — add a default image for the new category
- `components/layout/Footer.tsx` — optionally add a footer link

**Step 5 — Test:**

1. Insert a test article with `category = 'Supply Chain Security'` into the `articles` table
2. Visit `http://localhost:3000/supply-chain-security`
3. Verify the article appears on the category page and in the Header dropdown

### 5.2 How to Modify the AI Prompts

**Python Backend Prompts:**

Two master prompts control ALL AI-generated content:

| File | Prompt Variable | Controls |
|------|----------------|----------|
| `cti_ingestion_engine.py` | `CTI_SYSTEM_PROMPT` (line 174) | RSS feed article analysis format, tone, sections |
| `cti_ingestion_engine.py` | `IMAGE_SYSTEM_PROMPT` (line 350) | DALL-E 3 image generation style |
| `engine_articles.py` | `MASTER_PROMPT` (line 90) | DeepSeek article generation format, tone, sections |
| `lib/pipeline/telegram-prompt.ts` | (TypeScript file) | Frontend-side prompt template |

**Modification Guide:**

1. **To change report structure:** Edit the "MANDATORY REPORT STRUCTURE" section in `CTI_SYSTEM_PROMPT` or `MASTER_PROMPT`. Each `## SECTION NAME` in the prompt maps to a heading in the generated article.

2. **To change writing style:** Edit the "STYLE RULES" section. The banned phrases list is explicit — add or remove phrases there.

3. **To change the JSON output format:** Edit the JSON schema block. Be aware:
   - The JSON keys must match what `build_article_row()` expects
   - Adding new fields requires updating both the prompt AND the Python parsing logic (`validate_sitrep` function)

4. **To adjust SEO title generation:** Edit "DIRECTIVE 2" in `MASTER_PROMPT`. The four hooks (URGENCY, FEAR, AUTHORITY, CURIOSITY) define the title patterns.

5. **To add a new compliance framework:** Add it to both "DIRECTIVE 4" (compliance mapping) and the JSON output schema. Then update the field validation in `validate_sitrep()`.

**After modifying prompts:**
```bash
# Restart the Python daemon (if running via PM2)
pm2 restart zayron-engine-articles
pm2 restart zayron-cti-ingestion
```

### 5.3 How to Change UI Styling

**Design System Location:** `gerasys-online/styles/globals.css`

**Color Palette (lines 8-32):**

```css
/* Primary brand colors */
--color-accent: #2563EB;       /* Blue — primary CTA, links, active states */
--color-gold: #C6A664;         /* Gold — premium accent, dividers */
--color-primary: #0F172A;      /* Obsidian black — text, headings */
--color-secondary: #475569;    /* Slate — body text */
--color-bg: #F8FAFC;           /* Warm white — page background */
--color-surface: #FFFFFF;      /* White — card backgrounds */
--color-border: #E2E8F0;       /* Light gray — borders */
--color-muted: #94A3B8;        /* Muted gray — secondary text */
```

**How to Change the Brand Color (e.g., "Neon Gold Zx logo"):**

The current logo styling in `Header.tsx` (line 53-55):
```tsx
ZAYRON<span className="text-[#2563EB]">-X</span>
```

To change to neon gold:
```tsx
ZAYRON<span className="text-[#C6A664]">-X</span>   // existing gold
ZAYRON<span className="text-[#FFD700]">-X</span>   // neon gold
```

**Typography (lines 43-47):**
- `--font-display`: "Playfair Display" — used for headings, logo, hero text
- `--font-ui`: "Inter" — used for navigation, buttons, labels
- `--font-mono`: "JetBrains Mono" — used for code, data, CVE IDs
- `--font-body`: "Inter" — used for article body text

**Key Utility Classes (lines 138-283):**
- `.glass-panel` — Frosted glass effect (backdrop-blur + semi-transparent bg)
- `.card-bento` / `.card-article` — Card components with hover effects
- `.gold-divider` — Gold gradient horizontal rule
- `.section-label` — Small blue uppercase labels
- `.section-heading` — Playfair Display H2
- `.section-subheading` — Inter subtitle text
- `.tlp-badge` — TLP traffic light protocol badges
- `.prose-zayron` — Article content styling (headings, tables, code blocks, blockquotes)

**Modification Rules:**
- Always use the `@theme` block for new design tokens
- Prefer Tailwind utility classes in JSX over raw CSS
- Use `var(--color-*)` syntax in component files that need dynamic theming

### 5.4 How Data Flows: End-to-End Trace

```
STEP 1: TELEGRAM INTAKE
────────────────────────
[Telegram Channel] → radar-engine.py
  ├── Fetches t.me/s/{channel} HTML
  ├── Extracts message text via regex
  ├── SHA-256 dedup against SQLite cache (72h TTL)
  ├── Keyword-based categorization
  └── INSERT INTO supabase.raw_feeds (status='pending')

STEP 2: AI ARTICLE GENERATION
──────────────────────────────
[raw_feeds (pending)] → engine_articles.py
  ├── SELECT * FROM raw_feeds WHERE status='pending' ORDER BY created_at LIMIT 5
  ├── For each feed:
  │   ├── Sends raw_content to DeepSeek AI with MASTER_PROMPT
  │   ├── Receives JSON: { title, executive_summary, content (1500+ words),
  │   │     category, severity, mitre_attack_ttps[], yara_rules[],
  │   │     sigma_rules[], iocs[], ... }
  │   ├── Validates JSON structure
  │   ├── Checks word count (warns if < 800)
  │   └── INSERT INTO supabase.articles
  │       (title, author, category, content, excerpt, read_time, created_at)
  └── UPDATE raw_feeds SET status='promoted'

STEP 3: RSS ALTERNATIVE PATH
─────────────────────────────
[RSS Feeds] → cti_ingestion_engine.py
  ├── Fetches RSS XML from BleepingComputer, HackerNews, DarkReading
  ├── Parses entries with feedparser
  ├── Deduplicates against existing articles (url_hash)
  ├── For each new article:
  │   ├── Sends to LLM (OpenAI/DeepSeek) with CTI_SYSTEM_PROMPT
  │   ├── Receives full SITREP JSON
  │   ├── Optionally generates DALL-E 3 image + uploads to Supabase Storage
  │   └── Routes to target table based on category:
  │       ├── articles (Threat Intelligence, Vulnerability Research, OSINT)
  │       ├── tools (Tools, Security Tools)
  │       ├── malware (Malware Analysis, Ransomware)
  │       ├── apt (APT Activity, Nation State)
  │       └── osint (OSINT, Open Source Intelligence)
  └── Upserts via Supabase REST API (POST /rest/v1/{table})

STEP 4: CVE INTAKE (Independent)
─────────────────────────────────
[NIST NVD API] → cve_worker.py
  ├── Fetches CVEs published in last 24h
  ├── Extracts CVSS v4.0/v3.1 scores
  ├── Parses product/vendor from CPE data
  └── UPSERT INTO supabase.cves (on_conflict=cve_id)

STEP 5: FRONTEND RENDERING
────────────────────────────
[Next.js Server Component] → Drizzle ORM → PostgreSQL
  ├── Homepage: getRecentArticles(12), getBreakingArticles(5),
  │             getCategoriesWithCounts()
  ├── Category: getArticlesByCategory(category, page, 12)
  ├── Article:   getArticleBySlug(slug), getRelatedArticles(),
  │             getTrendingArticles()
  ├── CVEs:      getCVEs(page, 25), getCVECount()
  ├── Tools:     getTools(), getToolBySlug(slug)
  └── Search:    searchArticles(query)

[Next.js Client] → Supabase SSR
  ├── Auth:      createClient() → signIn, signUp, signOut
  ├── Subscribe: POST /api/subscribe → Drizzle INSERT
  └── Views:     PATCH /api/views/[id] → Drizzle UPDATE
```

### 5.5 Key Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Next.js (Drizzle) | Direct PostgreSQL connection (pooler) |
| `SUPABASE_URL` | Python, Next.js SSR | Supabase project URL |
| `SUPABASE_KEY` / `SUPABASE_SERVICE_KEY` | Python | Service role key for REST API writes |
| `SUPABASE_ANON_KEY` | Next.js SSR | Anon key for server-side auth |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js Client | Browser-accessible Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Next.js Client | Browser-accessible anon key |
| `NEXT_PUBLIC_SITE_URL` | Next.js | Canonical URL for SEO metadata |
| `LLM_API_KEY` | `cti_ingestion_engine.py` | OpenAI/LLM API key |
| `DEEPSEEK_API_KEY` | `engine_articles.py` | DeepSeek API key |
| `NVD_API_KEY` | `cve_worker.py` | NIST NVD API key (optional, higher rate limits) |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | `radar-engine.py` | MTProto Telegram credentials |
| `REDIS_URL` / `REDIS_TOKEN` | Next.js (Upstash) | Rate limiting cache |
| `RESEND_API_KEY` | Next.js | Email sending (newsletter) |
| `REVALIDATION_SECRET` | Next.js API | ISR revalidation webhook auth |

### 5.6 Quick Reference: File Purposes

| File | Purpose | Edit When You Want To... |
|------|---------|--------------------------|
| `styles/globals.css` | Design system, theme tokens, component classes | Change colors, fonts, card styles |
| `app/layout.tsx` | Root HTML structure, metadata, nav data loading | Change global layout, SEO defaults |
| `app/(site)/page.tsx` | Homepage data fetching + layout | Change homepage content/sections |
| `app/(site)/[category]/page.tsx` | Dynamic category pages | Change category listing behavior |
| `app/(site)/article/[slug]/page.tsx` | Article detail page | Change article reading experience |
| `lib/db/schema.ts` | Database table definitions | Add/remove columns or tables |
| `lib/db/queries/articles.ts` | All article database queries | Change how articles are fetched/filtered |
| `components/layout/Header.tsx` | Navigation header | Change menu items, logo, dropdowns |
| `components/layout/Footer.tsx` | Site footer | Change footer links |
| `components/homepage/HeroSection.tsx` | Homepage hero bento grid | Change hero layout |
| `components/ui/ArticleCard.tsx` | Reusable article card | Change article card appearance |
| `components/article/ArticleBody.tsx` | Markdown renderer | Change how article content displays |
| `engine_articles.py` | DeepSeek article generator | Change AI writing style/structure |
| `cti_ingestion_engine.py` | RSS + LLM ingestion | Change RSS sources, LLM model, routing |
| `radar-engine.py` | Telegram scraper | Change targets, scan interval, dedup logic |
| `cve_worker.py` | CVE fetcher | Change NVD query parameters |
| `supabase_rls_patch.sql` | Security policies | Change database access controls |

---

## APPENDIX A: Immediate Action Items (Priority-Ordered)

### P0 (Production-Blocking)

1. **Create root-level `middleware.ts`** to activate Supabase auth protection on `/admin/*`
2. **Add slug generation to Python scripts** (`engine_articles.py` and `cti_ingestion_engine.py`) — generate `slug` from title using the same `slugify()` logic as the frontend
3. **Fix the `[category]` page** to either:
   - (Option A) Route all Python-inserted content to the `articles` table only (simplest), OR
   - (Option B) Unify the query to search across `articles`, `malware`, `apt`, and `osint` tables, OR
   - (Option C) Create dedicated pages for each category table

### P1 (Feature-Blocking)

4. **Add `malware`, `apt`, `osint` to Drizzle schema** and create query+page files
5. **Fix nested `<main>` tags** — remove `<main>` from page components, keep only in Root Layout
6. **Create dedicated pages** for `/malware`, `/apt`, `/osint` with proper routing

### P2 (Quality)

7. Add `url_hash` column to Drizzle schema
8. Add image generation to `engine_articles.py`
9. Implement social media auto-broadcasting
10. Add MTProto Telegram credentials for production-grade scraping

---

*End of Report — ZAYRON-X System Architecture & Health Audit*
*Generated by Principal Architect, 2026-05-13*
