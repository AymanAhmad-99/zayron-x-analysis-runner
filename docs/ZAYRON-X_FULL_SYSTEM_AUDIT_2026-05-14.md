# ZAYRON-X — Complete System Architecture & Health Audit

**Classification:** TLP:AMBER — Internal Engineering Use Only
**Date:** 2026-05-14
**Auditor:** Senior Software Architect (via Claude Code)
**Project:** `zayron-app` (monorepo root) / `gerasys-online` (Next.js application)
**Version:** 2.0.0

---

## SECTION 1 — PROJECT IDENTITY

### What is this project exactly?
ZAYRON-X is a **cyber threat intelligence (CTI) platform** that ingests raw intelligence from Telegram channels, RSS feeds, and the NIST NVD, processes it through AI (DeepSeek / OpenAI) to generate structured intelligence dossiers, stores everything in Supabase PostgreSQL, and displays it on a public-facing Next.js website with an admin panel for triage.

### What does it do in one sentence?
An automated pipeline that scrapes global OSINT sources, enriches them with AI-generated MITRE ATT&CK / ISO 27001 / NIST CSF analysis, and publishes classified-style threat intelligence reports to a cyberpunk-themed web platform.

### Tech stack (every technology with version)

| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.6 | App Router framework |
| React | 19.1.0 | UI library |
| TypeScript | 5.8.3 | Type system |
| Bun | 1.x (latest) | Runtime & package manager |
| Drizzle ORM | 0.42.0 | Database ORM |
| Drizzle Kit | 0.30.6 | Schema migrations |
| PostgreSQL (Supabase) | 15.x (pooler) | Primary database |
| postgres.js | 3.4.5 | PostgreSQL driver |
| Tailwind CSS | 4.1.4 | Utility-first CSS |
| Supabase SSR | 0.10.3 | Auth & session management |
| Supabase JS | 2.49.4 | Client SDK |
| Upstash Redis | 1.34.6 | Serverless Redis cache |
| Upstash Ratelimit | 2.0.5 | API rate limiting |
| Resend | 4.2.0 | Email delivery |
| DOMPurify | 3.2.4 | HTML sanitization |
| Framer Motion | 11.18.2 | Animation library |
| Fuse.js | 7.1.0 | Fuzzy search |
| react-markdown | 10.1.0 | Markdown rendering |
| date-fns | 3.6.0 | Date utilities |
| reading-time | 1.5.0 | Reading time estimation |
| rehype-highlight | 7.0.2 | Syntax highlighting |
| rehype-slug | 6.0.0 | Heading ID generation |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown |
| sharp | 0.34.1 | Image optimization |
| Lucide React | 0.487.0 | Icon library |
| Python | 3.14 | Backend workers |
| aiohttp | (latest) | Async HTTP client |
| feedparser | (latest) | RSS/Atom parser |
| OpenAI SDK (Python) | (latest) | LLM API client |
| Telethon | (optional) | MTProto Telegram client |
| Nginx | (latest) | Reverse proxy |
| PM2 | (latest) | Process manager |
| Docker | (latest) | Containerization |
| Vercel | — | Alternative deployment target |

### Monorepo or single project?
**Single project with scattered files.** The monorepo root (`zayron-app/`) contains:
- `gerasys-online/` — The Next.js application (primary codebase)
- Python workers at root level (`cve_worker.py`, `radar-engine.py`, `cti_ingestion_engine.py`, `engine_articles.py`)
- `supabase_rls_patch.sql` — Database security policies
- `index.html` and `article.html` — Legacy/static HTML templates
- `zayron.tar` — Deployment archive
- `ZAYRON-X_SYSTEM_ARCHITECTURE_AUDIT.md` — Previous audit (2026-05-13)

### What environment is it running in?
- **Local development:** Windows 11, Bun runtime
- **Production target:** Linux VPS (Ubuntu, `/var/www/zayron` per PM2 config)
- **Alternative target:** Vercel (via `scripts/deploy-vercel.ts`)
- **Database:** Supabase cloud PostgreSQL (project: `xdfndojvqazffcjngglr`, region: us-west-1)

### What is the deployment status right now?
**PARTIALLY DEPLOYED — UNKNOWN full production status.**
- Codebase is complete for development
- `.env.local` is **severely incomplete** (only 4 of ~15 required variables set)
- PM2 config exists but references Python workers at a path (`/var/www/workers`) where they don't exist in the repo
- Dockerfile exists and looks correct for containerized deployment
- Nginx config exists for production SSL termination
- Vercel deployment scripts exist as alternative
- The actual production state (whether workers are running, whether the site is live) is UNKNOWN

---

## SECTION 2 — COMPLETE FILE TREE

### Root level (`D:\Desktop\zayron-app\`)

```
.gitignore                    → Git ignore rules (only `.vercel`)          [HEALTHY]
.mcp.json                     → MCP server config (Supabase)               [HEALTHY]
.vercel/project.json          → Vercel project metadata                    [HEALTHY]
.vercel/README.txt            → Vercel auto-generated readme               [HEALTHY]
index.html                    → Legacy static landing page (2499 lines)    [UNKNOWN — deprecated?]
article.html                  → Legacy static article template (667 lines) [UNKNOWN — deprecated?]
zayron.tar                    → Deployment archive (binary)                [UNKNOWN]
ZAYRON-X_SYSTEM_ARCHITECTURE_AUDIT.md → Previous audit (726 lines)         [HEALTHY — outdated]

cve_worker.py                 → NIST NVD CVE fetcher → Supabase cves       [HEALTHY]
radar-engine.py               → Telegram multi-channel scraper → raw_feeds [HEALTHY]
cti_ingestion_engine.py       → RSS feed → LLM analysis → articles         [HAS ISSUES]
engine_articles.py            → DeepSeek AI article generator → articles   [HAS ISSUES]
supabase_rls_patch.sql        → Zero-trust RLS security policies (169 ln)  [HEALTHY — UNKNOWN if applied]
```

### `gerasys-online/` — Next.js Application

#### Config files

```
package.json                  → Dependencies & scripts (52 lines)          [HEALTHY]
tsconfig.json                 → TypeScript config (46 lines)               [HEALTHY]
next.config.ts                → Next.js config, CSP, images, headers       [HEALTHY]
next-env.d.ts                 → Next.js TypeScript declarations            [HEALTHY]
postcss.config.mjs            → PostCSS config (8 lines)                   [HAS ISSUES — wrong JSDoc @type]
drizzle.config.ts             → Drizzle ORM config (10 lines)              [HEALTHY]
.env.example                  → Environment variable template (23 lines)   [HAS ISSUES — exposes real anon key]
.env.local                    → Active environment variables (4 lines)     [HAS ISSUES — severely incomplete]
.gitignore                    → Git ignore rules (35 lines)                [HEALTHY]
middleware.ts                 → Supabase auth middleware (12 lines)        [HEALTHY]
Dockerfile                    → Multi-stage Docker build (37 lines)        [HEALTHY]
nginx.conf                    → Nginx reverse proxy config (101 lines)     [HAS ISSUES — domain mismatch]
pm2.ecosystem.config.js       → PM2 process config (54 lines)              [HAS ISSUES — worker paths wrong]
deploy.sh                     → VPS deployment script (42 lines)           [HAS ISSUES — domain mismatch]
bun.lock                      → Bun lockfile                               [HEALTHY]
tsconfig.tsbuildinfo          → TypeScript build cache                     [HEALTHY]
.claude/settings.local.json   → Claude Code settings (38 lines)            [HEALTHY]
```

#### `app/` — App Router

```
layout.tsx                    → Root layout: <html>, fonts, Header, Footer [HEALTHY]
not-found.tsx                 → Custom 404 with cyberpunk theme (36 lines) [HEALTHY]
robots.ts                     → robots.txt generation (17 lines)           [HEALTHY]
sitemap.ts                    → XML sitemap generation (50 lines)          [HEALTHY]

(site)/
  layout.tsx                  → Site route group wrapper (5 lines)         [HEALTHY]
  page.tsx                    → Homepage with GhostGrid fallback (550 ln)  [HEALTHY]
  [category]/page.tsx         → REDIRECTS to /intelligence/[category]      [HEALTHY — redirect shim]
  article/[slug]/page.tsx     → REDIRECTS to /intelligence/.../...         [HEALTHY — redirect shim]
  about/page.tsx              → Static about page (46 lines)               [HEALTHY]
  analysts/page.tsx           → Analyst team page (29 lines)               [HAS ISSUES — passes empty array]
  contact/page.tsx            → Contact info page (46 lines)               [HAS ISSUES — no form]
  cve/page.tsx                → CVE listing with pagination (70 lines)     [HEALTHY]
  cve/[cveId]/page.tsx        → CVE detail with ISR (65 lines)             [HEALTHY]
  privacy/page.tsx            → Privacy policy (42 lines)                  [HEALTHY]
  programming/page.tsx        → Programming hub (147 lines)                [HEALTHY]
  search/page.tsx             → Search results page (62 lines)             [HEALTHY]
  tools/page.tsx              → Tools directory (84 lines)                 [HEALTHY]
  tools/[slug]/page.tsx       → Tool detail page (104 lines)               [HEALTHY]

intelligence/
  [category]/page.tsx         → Category intel listing (320 lines)         [HEALTHY]
  [category]/[slug]/page.tsx  → Article dossier detail (245 lines)         [HEALTHY]

(auth)/
  layout.tsx                  → Auth layout wrapper (24 lines)             [HEALTHY]
  login/page.tsx              → Supabase login form (187 lines)            [HEALTHY]
  register/page.tsx           → Supabase registration (199 lines)          [HEALTHY]

admin/
  layout.tsx                  → Admin sidebar + layout (86 lines)          [HEALTHY]
  page.tsx                    → Admin dashboard (411 lines)                [HEALTHY]
  articles/page.tsx           → Article management (160 lines)             [HEALTHY]
  cves/page.tsx               → CVE management (149 lines)                 [HEALTHY]
  dashboard/page.tsx          → Redirect to /admin (5 lines)               [HEALTHY]
  feeds/page.tsx              → Raw feeds triage (468 lines)               [HEALTHY]
  feeds/[id]/page.tsx         → Feed detail + promote form (323 lines)     [HEALTHY]
  settings/page.tsx           → Settings placeholder (30 lines)            [HAS ISSUES — no functionality]

api/
  articles/route.ts           → GET articles with pagination (29 lines)    [HEALTHY]
  articles/[slug]/route.ts    → GET single article (26 lines)              [HEALTHY]
  cves/route.ts               → GET CVEs with optional severity filter     [HEALTHY]
  db-status/route.ts          → GET database connection status (26 lines)  [HEALTHY]
  revalidate/route.ts         → POST ISR revalidation (45 lines)           [HEALTHY]
  search/route.ts             → GET search articles + CVEs (37 lines)      [HEALTHY]
  subscribe/route.ts          → POST newsletter subscription (54 lines)    [HEALTHY]
  views/[id]/route.ts         → POST increment article views (20 lines)    [HEALTHY]

auth/
  callback/route.ts           → Supabase OAuth callback (18 lines)         [HEALTHY]
```

#### `components/` — React Components

```
layout/
  Header.tsx                  → Sticky nav, mega-dropdown, search (236 ln) [HEALTHY]
  Footer.tsx                  → 4-col footer + newsletter + DB status      [HEALTHY]
  MobileNav.tsx               → Slide-out mobile menu (55 lines)           [HAS ISSUES — dead links, not used]
  NewsTicker.tsx              → Breaking news marquee, server component    [HEALTHY]
  BreakingTicker.tsx          → DEPRECATED — exports empty object (3 ln)   [HEALTHY — stub]

homepage/
  HeroSection.tsx             → Bento grid hero (84 lines)                 [HAS ISSUES — old /article/ links]
  StatsCounter.tsx            → Animated stats counter (69 lines)          [HEALTHY]
  FeaturedGrid.tsx            → Featured articles grid (26 lines)          [HEALTHY]
  LatestReports.tsx           → Latest reports list (79 lines)             [HAS ISSUES — old /article/ links]
  CveTracker.tsx              → CVE table display (87 lines)               [HEALTHY]
  TabbedContent.tsx           → Tab-filtered content (78 lines)            [HEALTHY]
  Newsletter.tsx              → Email signup form (89 lines)               [HEALTHY]
  ThreatTicker.tsx            → CVE ticker bar (40 lines)                  [HEALTHY]
  TrendingWidget.tsx          → Trending articles sidebar (43 lines)       [HEALTHY]
  ToolSpotlight.tsx           → Top tools grid (65 lines)                  [HEALTHY]
  CategoryShowcase.tsx        → Category cards grid (69 lines)             [HAS ISSUES — old /[category] links]
  AnalystTeam.tsx             → Analyst cards (63 lines)                   [HEALTHY]

article/
  Article3DImage.tsx          → SVG 3D node visualization (244 lines)      [HEALTHY]
  ArticleBody.tsx             → react-markdown renderer (41 lines)         [HEALTHY]
  ArticleHeader.tsx           → Article title, meta, breadcrumb (91 lines) [HEALTHY]
  ArticleSidebar.tsx          → Trending + CTAs (42 lines)                 [HEALTHY]
  AuthorCard.tsx              → Author bio card (65 lines)                 [HEALTHY]
  ReadingProgress.tsx         → Scroll progress bar (32 lines)             [HEALTHY]
  RelatedArticles.tsx         → Related articles grid (23 lines)           [HEALTHY]
  ShareButtons.tsx            → Twitter/Facebook/copy share (60 lines)     [HEALTHY]

cve/
  CveDetailCard.tsx           → CVE detail display (97 lines)              [HEALTHY]
  CveFilters.tsx              → Search + severity filter (56 lines)        [HEALTHY]
  CveTable.tsx                → Paginated CVE table (94 lines)             [HEALTHY]
  SeverityBadge.tsx           → Colored severity pill (24 lines)           [HEALTHY]

ui/
  ArticleCard.tsx             → Reusable article card (118 lines)          [HEALTHY]
  Button.tsx                  → Styled button variants (42 lines)          [HEALTHY]
  CategoryBadge.tsx           → Silo-colored category pill (21 lines)      [HEALTHY]
  CopperDivider.tsx           → Gold gradient divider (3 lines)            [HEALTHY]
  SearchBar.tsx               → Search input with navigation (31 lines)    [HEALTHY]
  SkeletonLoader.tsx          → Loading skeleton variants (48 lines)       [HEALTHY]
```

#### `lib/` — Business Logic

```
db/
  index.ts                    → Drizzle + postgres.js connection (16 lines) [HEALTHY]
  schema.ts                   → 8 table definitions (129 lines)             [HAS ISSUES — missing tables]
  queries/
    articles.ts               → 20 article query functions (218 lines)      [HEALTHY]
    cves.ts                   → 12 CVE query functions (117 lines)          [HEALTHY]
    tools.ts                  → 5 tool query functions (46 lines)           [HEALTHY]
    programming.ts            → 3 programming lang queries (30 lines)       [HEALTHY]
    rawFeeds.ts               → 9 raw feed query functions (64 lines)       [HEALTHY]
    analytics.ts              → Subscriber count, total views (31 lines)    [HEALTHY]

supabase/
  client.ts                   → Browser Supabase client (8 lines)           [HEALTHY]
  server.ts                   → Server + admin client creation (44 lines)   [HEALTHY]
  middleware.ts                → updateSession(): auth guard + redirect (52) [HEALTHY]

cache/
  redis.ts                    → Upstash Redis with cache helpers (54 lines) [HEALTHY]

pipeline/
  telegram-prompt.ts          → DeepSeek CTI system prompt (117 lines)      [HEALTHY]

seo/
  metadata.ts                 → Shared SEO metadata generation (36 lines)   [HEALTHY]

utils/
  fallbackImages.ts           → Category → Unsplash image mapping (80 ln)   [HEALTHY]
  formatDate.ts               → date-fns date formatting (16 lines)         [HEALTHY]
  markdown.ts                 → DOMPurify HTML sanitization (27 lines)      [HEALTHY]
  readingTime.ts              → Word count → minutes estimation (5 lines)   [HEALTHY]
  slugify.ts                  → Text → URL-safe slug (9 lines)              [HEALTHY]

silos.ts                      → Tri-sector silo definitions (83 lines)      [HEALTHY]
```

#### `scripts/`

```
telegram-ingestion.ts         → Bun Telegram ingestion daemon (298 lines)   [HEALTHY]
deploy-vercel.ts              → Vercel deploy script (78 lines)             [HEALTHY]
```

#### `styles/` & `public/`

```
styles/globals.css            → Complete design system (680 lines)          [HAS ISSUES — duplicate CSS vars]
public/logo.svg               → Cyberpunk "Zx" logo SVG (85 lines)          [HEALTHY]
```

#### Test file

```
_test_db.mjs                  → Database connection tester (25 lines)       [HAS ISSUES — hardcoded password]
```

---

## SECTION 3 — DATABASE ARCHITECTURE

### Tables defined in Drizzle schema (`lib/db/schema.ts`)

#### 1. `articles` — Main intelligence content
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| title | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| subtitle | text | nullable |
| author | text | NOT NULL, default: "Zayron Intel" |
| category | text | NOT NULL |
| tags | text[] | default: [] |
| security_score | decimal(3,1) | nullable |
| content | text | NOT NULL |
| excerpt | text | nullable |
| image_url | text | nullable |
| read_time | integer | default: 8 |
| views | integer | default: 0 |
| is_published | boolean | default: true |
| is_featured | boolean | default: false |
| is_breaking | boolean | default: false |
| created_at | timestamp | default: now() |
| updated_at | timestamp | default: now() |

**NOTE:** `url_hash` column exists in actual DB (used by Python deduplication) but is **NOT in the Drizzle schema**. This means Drizzle has no awareness of it.

#### 2. `cves` — CVE vulnerability database
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| cve_id | text | NOT NULL, UNIQUE |
| title | text | nullable |
| description | text | nullable |
| severity | text | NOT NULL |
| cvss_score | decimal(3,1) | nullable |
| cvss_vector | text | nullable |
| affected_product | text | nullable |
| vendor | text | nullable |
| status | text | default: "Active" |
| published_date | timestamp | nullable |
| created_at | timestamp | default: now() |

#### 3. `programming_langs` — Programming language profiles
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| name | text | NOT NULL, UNIQUE |
| slug | text | NOT NULL, UNIQUE |
| description | text | nullable |
| paradigm | text | nullable |
| use_case | text | nullable |
| code_snippet | text | nullable |
| security_features | text[] | default: [] |
| article_count | integer | default: 0 |
| created_at | timestamp | default: now() |

#### 4. `tools` — Security tools directory
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| name | text | NOT NULL |
| slug | text | NOT NULL, UNIQUE |
| category | text | NOT NULL |
| description | text | nullable |
| rating | decimal(2,1) | nullable |
| github_url | text | nullable |
| stars | integer | default: 0 |
| tags | text[] | default: [] |
| created_at | timestamp | default: now() |

#### 5. `analysts` — Analyst team profiles
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| name | text | NOT NULL |
| title | text | nullable |
| bio | text | nullable |
| specializations | text[] | default: [] |
| article_count | integer | default: 0 |
| created_at | timestamp | default: now() |

#### 6. `subscribers` — Newsletter subscribers
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| email | text | NOT NULL, UNIQUE |
| is_active | boolean | default: true |
| created_at | timestamp | default: now() |

#### 7. `trending` — Trending articles tracker
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| title | text | nullable |
| rank | integer | default: 0 |
| engagement_score | integer | default: 0 |
| article_id | uuid | FK → articles.id ON DELETE SET NULL |
| created_at | timestamp | default: now() |

#### 8. `raw_feeds` — Raw intelligence intake queue
| Column | Type | Constraints |
|---|---|---|
| id | uuid | PRIMARY KEY, defaultRandom |
| source_channel | text | NOT NULL |
| raw_content | text | NOT NULL |
| original_language | text | NOT NULL, default: "ru" |
| status | text | NOT NULL, default: "pending" |
| translated_title | text | nullable |
| translated_content | text | nullable |
| analysis | text | nullable |
| ai_generated_flag | boolean | default: false |
| prompt_tokens | integer | nullable |
| completion_tokens | integer | nullable |
| timestamp | timestamp | default: now() |
| created_at | timestamp | default: now() |
| promoted_at | timestamp | nullable |

### Tables in actual database but NOT in Drizzle schema
The previous audit and Python scripts reference these tables that have NO Drizzle definitions:
- **`malware`** — Written to by `cti_ingestion_engine.py` (original version)
- **`apt`** — Written to by `cti_ingestion_engine.py` (original version)
- **`osint`** — Written to by `cti_ingestion_engine.py` (original version)
- **`radar_targets`** — Read by `radar-engine.py` for dynamic channel configuration

**Current state:** The `cti_ingestion_engine.py` has been UPDATED to route EVERYTHING to `articles` only (see the `dispatch_articles` function). However, `engine_articles.py` still writes only to `articles` and `raw_feeds`. So the `malware`, `apt`, `osint` tables may exist in the database but are possibly empty or orphaned.

### RLS Policies (from `supabase_rls_patch.sql`)

The SQL patch defines these policies but **it is UNKNOWN whether they have been applied** to the actual Supabase database.

| Table | anon: SELECT | anon: INSERT | anon: UPDATE | anon: DELETE | service_role |
|---|---|---|---|---|---|
| articles | Published only | NO | NO | NO | ALL |
| cves | YES (all) | NO | NO | NO | ALL |
| tools | YES (all) | NO | NO | NO | ALL |
| analysts | YES (all) | NO | NO | NO | ALL |
| subscribers | NO | YES (newsletter) | NO | NO | ALL |
| raw_feeds | YES (all) | NO | NO | NO | ALL |
| trending | YES (all) | NO | NO | NO | ALL |

**⚠️ WARNING:** The RLS patch allows `anon` SELECT on `raw_feeds` — this means **anyone can read raw intelligence feed data** without authentication. This is a potential data leak of pre-processed intelligence.

### Row counts and actual database state
**UNKNOWN — needs manual check.** The Supabase MCP tools were not available to query live data. The application includes a `/api/db-status` endpoint that would return article and CVE counts if the database is connected.

### Schema discrepancies summary

| Issue | Severity |
|---|---|
| `url_hash` column exists in DB but NOT in Drizzle schema | MEDIUM — Drizzle can't write to it |
| `malware`, `apt`, `osint`, `radar_targets` tables may exist in DB but NOT in schema | HIGH — orphaned/unmapped data |
| `slug` column is NOT NULL UNIQUE in Drizzle but Python scripts may not always generate it | CRITICAL — insert failures |
| The RLS SQL patch may NOT have been applied | HIGH — security gap |

---

## SECTION 4 — ROUTING MAP

### Public routes

| URL Path | File | Type | revalidate | Auth | Fetches |
|---|---|---|---|---|---|
| `/` | `(site)/page.tsx` | Server | 60s | No | recentArticles(15), breakingArticles(5), categories, criticalCVEs(4), cveCount |
| `/intelligence/[category]` | `intelligence/[category]/page.tsx` | Server | 300s | No | articlesByCategory, categories, allTags |
| `/intelligence/[category]/[slug]` | `intelligence/[category]/[slug]/page.tsx` | Server | 3600s | No | articleBySlug, relatedArticles(3), trendingArticles(5) |
| `/cve` | `(site)/cve/page.tsx` | Server | 300s | No | cves(page, 25), cveCount |
| `/cve/[cveId]` | `(site)/cve/[cveId]/page.tsx` | Server | 3600s | No | cveById |
| `/tools` | `(site)/tools/page.tsx` | Server | 3600s | No | allTools |
| `/tools/[slug]` | `(site)/tools/[slug]/page.tsx` | Server | 3600s | No | toolBySlug |
| `/search` | `(site)/search/page.tsx` | Server | None | No | searchArticles (if `?q=` present) |
| `/programming` | `(site)/programming/page.tsx` | Server | 600s | No | programmingLanguages |
| `/about` | `(site)/about/page.tsx` | Static | — | No | None (static content) |
| `/contact` | `(site)/contact/page.tsx` | Static | — | No | None (static content) |
| `/privacy` | `(site)/privacy/page.tsx` | Static | — | No | None (static content) |
| `/analysts` | `(site)/analysts/page.tsx` | Static | — | No | None (passes analysts={[]}) |

### Redirect routes (old URL scheme)

| Old URL | New URL | Type |
|---|---|---|
| `/article/[slug]` | `/intelligence/[category]/[slug]` | Permanent redirect (next.config.ts) + page-level redirect |
| `/[category]` | `/intelligence/[category]` | Page-level redirect |
| `/admin/dashboard` | `/admin` | Page-level redirect |

### Auth routes

| URL Path | File | Type | Auth |
|---|---|---|---|
| `/login` | `(auth)/login/page.tsx` | Client | None (login form) |
| `/register` | `(auth)/register/page.tsx` | Client | None (registration form) |
| `/auth/callback` | `auth/callback/route.ts` | API | OAuth code exchange |

### Admin routes (protected by middleware)

| URL Path | File | Type | Auth |
|---|---|---|---|
| `/admin` | `admin/page.tsx` | Server (force-dynamic) | **Protected** — checks Supabase session |
| `/admin/articles` | `admin/articles/page.tsx` | Server (force-dynamic) | **Protected** |
| `/admin/cves` | `admin/cves/page.tsx` | Server (force-dynamic) | **Protected** |
| `/admin/feeds` | `admin/feeds/page.tsx` | Server (force-dynamic) | **Protected** |
| `/admin/feeds/[id]` | `admin/feeds/[id]/page.tsx` | Server (force-dynamic) | **Protected** |
| `/admin/settings` | `admin/settings/page.tsx` | Static | **Protected** |

### API routes

| Endpoint | File | Method | Auth | Rate Limited? |
|---|---|---|---|---|
| `/api/articles` | `api/articles/route.ts` | GET | No | NO |
| `/api/articles/[slug]` | `api/articles/[slug]/route.ts` | GET | No | NO |
| `/api/cves` | `api/cves/route.ts` | GET | No | NO |
| `/api/search` | `api/search/route.ts` | GET | No | NO |
| `/api/subscribe` | `api/subscribe/route.ts` | POST | No | NO |
| `/api/views/[id]` | `api/views/[id]/route.ts` | POST | No | NO |
| `/api/db-status` | `api/db-status/route.ts` | GET | No | NO |
| `/api/revalidate` | `api/revalidate/route.ts` | POST | Secret header | NO |

### Missing route features
- **NO loading.tsx** on any route (except Suspense on login page)
- **NO error.tsx** on any route
- **NO loading states** for data fetches — GhostGrid is the only fallback (homepage only)

---

## SECTION 5 — COMPONENT INVENTORY

### Layout Components

**Header.tsx** — `"use client"`
- Props: `categories: NavCategory[]`, `tools: NavTool[]`
- State: `mounted` (false), `mobileOpen` (false), `activeDropdown` (null)
- useEffect: Sets `mounted=true` on mount (hydration safety gate)
- Links: `/intelligence/...` (correct), `/programming`, `/cve`, `/analysts`, `/tools`, `/login`
- Hydration risk: **LOW** — Uses two-pass rendering pattern to prevent mismatch

**Footer.tsx** — `"use client"`
- Props: None
- State: `email`, `status` ("idle"), `message` + `DbStatus` states
- useEffect: Fetches `/api/db-status` on mount
- Links: `/intelligence/malware`, `/intelligence/secure-coding` etc. **(some may 404)**
- Hydration risk: **LOW**

**MobileNav.tsx** — `"use client"`
- Props: `isOpen: boolean`, `onClose: () => void`
- **NOT USED by Header** — Header has its own inline mobile nav
- Links: `/intelligence` **(404 — no such page)**, `/vulnerabilities` **(404)**, `/ransomware` **(404)**, `/nation-state` **(404)**
- Hydration risk: N/A (not rendered)

**NewsTicker.tsx** — Server Component
- Fetches: `getBreakingArticles(8)` directly
- Links: `/intelligence/[category]/[slug]` (correct)
- Hydration risk: NONE (server component)

**BreakingTicker.tsx** — DEPRECATED
- Exports: `{}` (empty object)
- Hydration risk: NONE

### Homepage Components

**HeroSection.tsx** — Server Component
- Props: `primary: Article | null`, `secondary: Article[]`
- **ISSUE:** Links to `/article/${primary.slug}` (old URL!)
- Hydration risk: NONE

**StatsCounter.tsx** — `"use client"`
- Props: `articles`, `cves`, `tools`, `analysts` (numbers)
- State: Animated counter values via IntersectionObserver
- Hydration risk: **LOW** (initial renders at 0)

**LatestReports.tsx** — Server Component
- Props: `articles: Article[]`
- **ISSUE:** Links to `/article/${article.slug}` (old URL!)
- Hydration risk: NONE

**CategoryShowcase.tsx** — Server Component
- Props: `categories: CategoryItem[]`
- **ISSUE:** Links to `/${category.toLowerCase()...}` (old URL!) — should be `/intelligence/...`
- Hydration risk: NONE

**TrendingWidget.tsx** — Server Component
- Links: `/intelligence/[category]/[slug]` (correct ✓)
- Hydration risk: NONE

**Newsletter.tsx** — `"use client"`
- Posts to: `/api/subscribe`
- Hydration risk: **LOW**

**ToolSpotlight.tsx**, **CveTracker.tsx**, **ThreatTicker.tsx**, **FeaturedGrid.tsx**, **TabbedContent.tsx**, **AnalystTeam.tsx**
- All server components, no hydration risk, no URL issues

### Article Components

**Article3DImage.tsx** — Server Component
- Generates SVG 3D node visualization from article slug hash
- Hydration risk: NONE

**ArticleBody.tsx** — Server Component
- Uses: `react-markdown` with `remarkGfm`, `rehypeSlug`
- Custom img and anchor rendering
- Hydration risk: NONE

**ArticleHeader.tsx** — Server Component
- Links: `/intelligence/[category]` (correct ✓)
- Hydration risk: NONE

**ReadingProgress.tsx** — `"use client"`
- useEffect: Scroll listener for progress width
- Hydration risk: **LOW** (starts at 0 width)

**ShareButtons.tsx** — `"use client"`
- State: `copied` (false)
- Hydration risk: **LOW**

**ArticleSidebar.tsx**, **AuthorCard.tsx**, **RelatedArticles.tsx**
- Server components, no hydration risk

### CVE Components
All server components: **CveDetailCard**, **CveFilters** (`"use client"`), **CveTable**, **SeverityBadge**
- CveFilters: Client for search/filter interactivity
- Hydration risk: **LOW**

### UI Components

**ArticleCard.tsx** — Server Component
- Links: `/intelligence/[category]/[slug]` (correct ✓)
- Silo-based visual treatment
- Hydration risk: NONE

**Button.tsx** — Server Component
- 4 variants: primary, secondary, outline, ghost
- 3 sizes: sm, md, lg
- Hydration risk: NONE

**SearchBar.tsx** — `"use client"`
- State: `query` ("")
- Uses: `next/navigation` router.push to `/search?q=`
- Hydration risk: **LOW**

**CategoryBadge.tsx** — Server Component
- Uses: `getSiloForCategory` for color coding
- Hydration risk: NONE

**CopperDivider.tsx** — Server Component (just `<hr>`)
**SkeletonLoader.tsx** — Server Component (4 variants)

---

## SECTION 6 — DATA FLOW MAP

### ARTICLES data flow

```
[Telegram Channels] → radar-engine.py (scraper)
    │                   ├── SHA-256 dedup (SQLite, 72h TTL)
    │                   ├── Keyword categorization
    │                   └── INSERT → raw_feeds (status: pending)
    │
    ▼
[RSS Feeds] → cti_ingestion_engine.py (fetcher + LLM)
    │            ├── fetch_feed() → feedparser
    │            ├── url_hash dedup → skip existing
    │            ├── LLM analysis (CTI_SYSTEM_PROMPT, 1500+ words)
    │            ├── Optional DALL-E 3 image → Supabase Storage
    │            └── INSERT → articles table (via REST API)
    │
    ▼
[raw_feeds (pending)] → engine_articles.py (DeepSeek AI)
    │                      ├── Fetch oldest pending
    │                      ├── DeepSeek with MASTER_PROMPT
    │                      ├── Validate JSON, word count warning at 800
    │                      ├── INSERT → articles table
    │                      └── UPDATE raw_feeds → promoted/rejected/error
    │
    ▼
[Bun scripts] → telegram-ingestion.ts (optional TypeScript alternative)
                  ├── Live MTProto or simulation mode
                  └── INSERT → raw_feeds (status: pending)
    │
    ▼
[Supabase PostgreSQL — articles table]
    │
    ▼
[Next.js Server Components] → Drizzle ORM queries
    ├── Homepage: getRecentArticles(15), getBreakingArticles(5)
    ├── Category: getArticlesByCategory(category, page, 12)
    ├── Article: getArticleBySlug(slug), getRelatedArticles(3)
    └── Search: searchArticles(query) via ts_vector full-text
    │
    ▼
[Client Components]
    ├── ArticleCard → /intelligence/[category]/[slug] links
    ├── TrendingWidget → trending article list
    └── SearchBar → /search?q=
```

### CVEs data flow

```
[NIST NVD API 2.0] → cve_worker.py
    │                  ├── Fetch last 24h CVEs
    │                  ├── CVSS v4.0 → v3.1 → v3.0 → v2.0 priority
    │                  ├── CPE product/vendor extraction
    │                  └── UPSERT → cves (on_conflict=cve_id)
    │
    ▼
[Supabase PostgreSQL — cves table]
    │
    ▼
[Next.js Server Components]
    ├── CVE List: getCVEs(page, 25), getCVECount()
    ├── CVE Detail: getCVEById(cveId)
    ├── Homepage: getCriticalCVEs(4), getCVECount()
    └── Search: searchCVEs(query) via ts_vector
```

### THREAT EVENTS (raw_feeds) data flow

```
[Telegram] → radar-engine.py → raw_feeds (pending)
[RSS]      → cti_ingestion_engine.py → articles (direct)

raw_feeds pipeline:
    pending → engine_articles.py (DeepSeek) → promoted/rejected/error
    Admin panel: /admin/feeds for manual triage + promote
```

### IOCs data flow
IOCs are embedded in article content (Markdown) generated by LLMs. There is **no separate IOCs table** in the Drizzle schema. IOCs exist only within the `content` field of the `articles` table as structured markdown tables.

### Caching
- **Upstash Redis:** Configured but usage appears limited. The `cacheGet`/`cacheInvalidate` helpers exist but are only used for rate limiting infrastructure — actual data caching is not implemented in page components.
- **Next.js ISR:** Used via `revalidate` export on pages (60s homepage, 300s category, 3600s article). The `/api/revalidate` webhook endpoint exists for on-demand revalidation.
- **No in-memory caching** in server components.

---

## SECTION 7 — PYTHON WORKERS

### `cve_worker.py` — NIST NVD CVE Fetcher (285 lines)
- **What it does:** Fetches CVEs published in last 24 hours from NIST NVD API 2.0, extracts CVSS scores (v4.0 → v3.1 → v3.0 → v2.0 priority), parses CPE data for product/vendor, upserts into Supabase `cves` table.
- **How it runs:** One-shot script (intended for cron/PM2: `0 */6 * * *`)
- **Input:** NIST NVD API (optionally with `NVD_API_KEY` for higher rate limits)
- **Output:** Upserts CVE records into Supabase `cves` table via REST API
- **Credentials:** `SUPABASE_URL`, `SUPABASE_KEY` (service_role), `NVD_API_KEY` (optional)
- **Status:** UNKNOWN — needs manual verification if running on VPS
- **Issues:** None obvious in code. Well-structured with retry logic and dedup.

### `radar-engine.py` — Telegram Intelligence Radar (594 lines)
- **What it does:** Continuous daemon that fetches active targets from Supabase `radar_targets` table, scrapes public Telegram channels via HTTP (t.me/s/) with MTProto (Telethon) fallback, deduplicates via SHA-256 + SQLite cache (72h TTL), categorizes by keywords, inserts into `raw_feeds` table.
- **How it runs:** Continuous daemon (PM2: `*/15 * * * *` or `--once` flag for one-shot)
- **Input:** Supabase `radar_targets` table (dynamic channel list), Telegram channels
- **Output:** Inserts into Supabase `raw_feeds` with `status='pending'`
- **Credentials:** `SUPABASE_URL`, `SUPABASE_KEY`, `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_PHONE` (optional)
- **Status:** UNKNOWN
- **Issues:** Relies on HTTP scraping (fragile, can break when Telegram changes HTML). MTProto fallback requires Telethon installation.

### `cti_ingestion_engine.py` — RSS Feed → LLM Pipeline (909 lines)
- **What it does:** Fetches RSS/Atom feeds from 3 hardcoded sources (BleepingComputer, The Hacker News, Dark Reading), deduplicates via `url_hash`, sends to LLM (OpenAI/OpenAI-compatible) with `CTI_SYSTEM_PROMPT`, generates 1500+ word SITREP reports, optionally generates DALL-E 3 images and uploads to Supabase Storage, dispatches to `articles` table.
- **How it runs:** Continuous daemon (PM2: `0 */3 * * *` or `--once` flag)
- **Input:** RSS feeds (hardcoded URLs), LLM API
- **Output:** Inserts into Supabase `articles` table
- **Credentials:** `LLM_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
- **Status:** UNKNOWN
- **Issues:**
  - **`generate_slug()` function ADDED** (lines ~410-420) — this is a FIX from the previous audit. Now generates URL-safe slugs.
  - **Now routes EVERYTHING to `articles` only** — the multi-table dispatch to `malware`, `apt`, `osint` has been removed in favor of unified `articles` with category tags.
  - Hardcoded feed sources — can't add new RSS feeds without code changes.
  - LLM prompt wastes tokens generating `ai_image_prompt` even when `ENABLE_IMAGES=false`.

### `engine_articles.py` — DeepSeek AI Article Generator (595 lines)
- **What it does:** Fetches pending raw_feeds from Supabase, sends each to DeepSeek AI with `MASTER_PROMPT`, generates 1500+ word intelligence dossiers, inserts into `articles` table, marks feeds as `promoted`/`rejected`/`error`.
- **How it runs:** Continuous daemon (PM2: `*/5 * * * *` or `--once` flag)
- **Input:** Supabase `raw_feeds` (status='pending'), DeepSeek API
- **Output:** Inserts into `articles` table
- **Credentials:** `DEEPSEEK_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
- **Status:** UNKNOWN
- **Issues:**
  - **`generate_slug()` function ADDED** — fix for the slug generation gap.
  - **Prompt tells LLM to "INVENT theoretical architectural context"** when source material is thin — content quality risk.
  - Word count validates at 800 but minimum 1500 is not enforced.
  - The `MASTER_PROMPT` is 300+ lines — consumes massive token budget per request.

### Critical issue: Credential variable naming
Python scripts use `SUPABASE_KEY` but the Next.js `.env.example` uses `SUPABASE_SERVICE_KEY`. These MUST be the same value but are named differently, creating configuration confusion.

---

## SECTION 8 — ALL BUGS AND ISSUES FOUND

### CRITICAL

**[CRITICAL] Hardcoded database password in `_test_db.mjs`**
- File: `gerasys-online/_test_db.mjs`, lines 5-11
- Risk: Database password `zayron2026DB` is hardcoded in plaintext. If this file is committed or accessible, anyone can connect to the database.
- Fix: Delete this file or move to `.gitignore`, never hardcode credentials.

**[CRITICAL] `.env.local` is severely incomplete**
- File: `gerasys-online/.env.local`
- Only 4 of ~15 required variables are set. Missing: `DATABASE_URL`, `SUPABASE_SERVICE_KEY`, `REDIS_URL`, `REDIS_TOKEN`, `RESEND_API_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`, `REVALIDATION_SECRET`
- Risk: Application will crash on startup trying to connect to database with `process.env.DATABASE_URL!`
- Fix: Populate `.env.local` with all required values from `.env.example`.

**[CRITICAL] `.env.example` exposes real Supabase anon key**
- File: `gerasys-online/.env.example`, lines 6-7
- Risk: The anon key is a public key by design, but exposing the exact project reference URL and anon key together in a committed file makes the Supabase project easily discoverable.
- Fix: Replace real anon key with placeholder in `.env.example`.

**[CRITICAL] RLS SQL patch may not be applied**
- File: `supabase_rls_patch.sql`
- Risk: If RLS policies are not applied, **anon users can INSERT into articles, CVEs, and other tables** without restriction. The patch explicitly drops permissive policies — but it's a SQL file that must be run manually.
- Fix: Execute the SQL patch in Supabase SQL Editor. Verify with `SELECT * FROM pg_policies WHERE schemaname = 'public'`.

### HIGH

**[HIGH] Old URL patterns in 3 components**
- Files:
  - `components/homepage/HeroSection.tsx` — links to `/article/${primary.slug}`
  - `components/homepage/LatestReports.tsx` — links to `/article/${article.slug}`
  - `components/homepage/CategoryShowcase.tsx` — links to `/${category.slug}`
- Risk: Every click on these links triggers an unnecessary HTTP redirect to `/intelligence/...`, adding latency and hurting SEO.
- Fix: Update all links to use `/intelligence/[category]/[slug]` pattern.

**[HIGH] MobileNav has hardcoded dead links**
- File: `components/layout/MobileNav.tsx`
- Links to: `/intelligence` (404), `/vulnerabilities` (404), `/ransomware` (404), `/nation-state` (404)
- Mitigation: This component is **not currently used** — Header has its own inline mobile navigation. But if any page imports MobileNav, users will see broken links.
- Fix: Either update links to valid paths or delete this unused component.

**[HIGH] `url_hash` in DB but not in Drizzle schema**
- File: `lib/db/schema.ts`
- The `articles` table has a `url_hash` column in the actual database (used by Python dedup), but Drizzle schema doesn't define it. Drizzle can't write to it, and if migrations are generated from Drizzle, `url_hash` could be dropped.
- Fix: Add `url_hash: text("url_hash").unique()` to the Drizzle articles schema.

**[HIGH] Nginx domain mismatch**
- File: `nginx.conf`
- Uses domain `zayronsecurity.com` but `.env.example` references `zayron-x.com`. The PM2 deploy.sh also references `zayronsecurity.com`.
- Risk: SSL certificates and server_name won't match the actual domain.
- Fix: Unify on a single domain across all config files.

**[HIGH] Python `SUPABASE_KEY` vs Next.js `SUPABASE_SERVICE_KEY` naming**
- Python files read `SUPABASE_KEY` env var, but Next.js `.env.example` defines `SUPABASE_SERVICE_KEY`.
- Risk: If these aren't set to the same value in different environments, Python workers will fail.
- Fix: Standardize naming. Both should use `SUPABASE_SERVICE_KEY`.

**[HIGH] PM2 worker paths don't match repo structure**
- File: `pm2.ecosystem.config.js`
- Workers point to `/var/www/workers/news_worker.py`, `cve_worker.py`, `social_worker.py` — but:
  - The actual Python files are at repo root, not in a `workers/` directory
  - `social_worker.py` doesn't exist at all
  - `news_worker.py` doesn't exist (the engine is `engine_articles.py`)
- Fix: Update PM2 config to match actual file paths, or create the workers directory with symlinks.

### MEDIUM

**[MEDIUM] `postcss.config.mjs` has wrong JSDoc @type**
- File: `postcss.config.mjs`, line 1
- Says `/** @type {import('next').NextConfig} */` but should be PostCSS config type.
- Impact: Cosmetic — doesn't affect functionality but indicates copy-paste error.
- Fix: Change to `/** @type {import('postcss-load-config').Config} */`

**[MEDIUM] Analysts page passes hardcoded empty array**
- File: `app/(site)/analysts/page.tsx`, line 26
- `<AnalystTeam analysts={[]} />` — no database fetch, always renders empty.
- Fix: Fetch analysts from the `analysts` table using Drizzle.

**[MEDIUM] Contact page has no form or email**
- File: `app/(site)/contact/page.tsx`
- Static text only, no contact form, no email address displayed.
- Fix: Add a contact form or at minimum display a contact email.

**[MEDIUM] Admin settings page is a placeholder**
- File: `app/admin/settings/page.tsx`
- Displays "Site configuration settings will be available in a future update."
- Fix: Either implement settings or remove the page from admin navigation.

**[MEDIUM] No rate limiting on public API routes**
- Files: All `app/api/**/route.ts` files
- Upstash Ratelimit is in `package.json` but no API route implements rate limiting.
- Risk: API endpoints can be abused for scraping or spam.
- Fix: Implement rate limiting on `/api/subscribe` (spam risk) and `/api/search` (DB load risk).

**[MEDIUM] `raw_feeds` anon SELECT in RLS**
- File: `supabase_rls_patch.sql`
- Policy `anon_select_raw_feeds` allows anyone to SELECT all raw_feeds data.
- Risk: Pre-processed intelligence, source channel names, and raw content are publicly readable via Supabase REST API.
- Fix: Remove anon SELECT on raw_feeds, or restrict to authenticated users only.

### LOW

**[LOW] No `loading.tsx` files on any route**
- Effect: No loading UI during page transitions — content flashes or shows blank page.
- Fix: Add `loading.tsx` with SkeletonLoader components on heavy data-fetching pages.

**[LOW] No `error.tsx` files on any route**
- Effect: Unhandled errors show Next.js default error page (not brand-aligned).
- Fix: Add `error.tsx` with custom cyberpunk-themed error boundary.

**[LOW] Duplicate CSS variable `--color-obsidian`**
- File: `styles/globals.css`, lines 20 and 37
- Defined as `#111827` at line 20, overridden to `#FFFFFF` at line 37 (backward compat block).
- The second definition wins. If any element expects dark obsidian, it'll get white.
- Fix: Remove the backward compat override or rename one of them.

**[LOW] BreakingTicker.tsx is dead code**
- File: `components/layout/BreakingTicker.tsx`
- Exports empty object `{}`. No component imports it.
- Fix: Delete the file.

**[LOW] `index.html` and `article.html` purpose unknown**
- Files at root: `index.html` (2499 lines), `article.html` (667 lines)
- These appear to be legacy static templates. Unknown if still used.
- Fix: Determine if these are deployed anywhere. If deprecated, remove.

**[LOW] `zayron.tar` binary archive**
- File at root: `zayron.tar`
- Unknown contents. Could contain old deployment artifacts.
- Fix: Extract and review, then delete if not needed.

---

## SECTION 9 — SECURITY AUDIT

### 1. Exposed credentials

| Location | Credential | Risk |
|---|---|---|
| `_test_db.mjs`, lines 5-11 | Database password: `zayron2026DB` | **CRITICAL** — hardcoded plaintext |
| `.env.example`, lines 6-7 | Supabase anon key (public but identifiable) | **MEDIUM** — exposes project reference |
| `.env.example`, line 3 | Database connection string with placeholder `[PASSWORD]` | **LOW** — correctly masked |

### 2. Authentication gaps

**Middleware protection:** `middleware.ts` IS present and correctly protects `/admin/*` routes. It checks `supabase.auth.getUser()` and redirects unauthenticated users to `/login?redirect=...`. 

**What's protected:**
- `/admin` and all sub-routes ✓
- Auth pages redirect logged-in users away ✓

**What's NOT protected but should be:**
- `/api/revalidate` — protected by shared secret header only (acceptable)
- `/api/subscribe` — intentionally public for newsletter signup (acceptable)
- `/api/views/[id]` — POST endpoint has no CSRF protection (views can be inflated by bots)

**What's public that might be too exposed:**
- All API GET endpoints (`/api/articles`, `/api/cves`, `/api/search`) are public — acceptable for a public intelligence platform
- `/api/db-status` exposes article and CVE counts — low risk

### 3. Database security

**RLS Status:** UNKNOWN whether `supabase_rls_patch.sql` has been applied.

**If NOT applied, the following risks exist:**
- anon users can INSERT into any table without restriction
- anon users can UPDATE/DELETE any row

**If applied (per the SQL patch):**
- anon: SELECT published articles only ✓
- anon: SELECT all CVEs, tools, analysts, trending ✓ 
- anon: SELECT all raw_feeds ⚠️ (exposes raw intelligence)
- anon: INSERT subscribers only ✓
- anon: NO UPDATE/DELETE on any table ✓
- service_role: FULL access on all tables ✓

**Additional concern:** The Next.js Drizzle client connects with `DATABASE_URL` (direct Postgres connection, bypasses RLS entirely). This means server-side queries see ALL data regardless of RLS policies. This is correct architecture (server = trusted), but the `publishedCondition()` filter in article queries is the ONLY protection against showing unpublished articles.

### 4. API security

| Concern | Status |
|---|---|
| CORS configured? | Not in `next.config.ts` — defaults allow same-origin only |
| Rate limiting? | **NO** — Upstash is in deps but not used in any route |
| Input validation on `/api/subscribe`? | **YES** — regex email validation ✓ |
| SQL injection risk? | **LOW** — Drizzle ORM uses parameterized queries |
| CSRF on `/api/views/[id]`? | **NO** — any website can POST to increment views |
| CSRF on `/api/subscribe`? | **NO** — any website can POST to subscribe |

### 5. Environment variables

**Defined in `.env.example`:**
```
DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY,
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
REDIS_URL, REDIS_TOKEN, RESEND_API_KEY, ADMIN_USER, ADMIN_PASSWORD,
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SITE_NAME, REVALIDATION_SECRET
```

**Actually set in `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL (set)
NEXT_PUBLIC_SUPABASE_ANON_KEY (set)
SUPABASE_URL (set)
SUPABASE_ANON_KEY (set — but value appears to be Arabic text placeholder)
```

**Missing from `.env.local`:**
`DATABASE_URL`, `SUPABASE_SERVICE_KEY`, `REDIS_URL`, `REDIS_TOKEN`, `RESEND_API_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `REVALIDATION_SECRET`

**.gitignore coverage:** `.env`, `.env.local`, `.env.*.local` are all gitignored ✓. BUT the `.gitignore` at root level only ignores `.vercel`. The `gerasys-online/.gitignore` properly covers env files.

### 6. Content Security Policy
`next.config.ts` defines a robust CSP with:
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co` — `unsafe-eval` is needed for Next.js but is a concern
- `img-src` includes `images.unsplash.com` and `*.supabase.co`
- `object-src 'none'` — good
- `frame-src 'self'` — good
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, Referrer-Policy ✓

---

## SECTION 10 — DEPLOYMENT STATUS

### Dockerfile
- **Exists:** YES (`gerasys-online/Dockerfile`)
- **Status:** Appears correct — multi-stage build with Bun, production dependencies, proper user creation
- **Base image:** `oven/bun:1`
- **Exposes:** Port 3000
- **Issue:** Does NOT include Python workers or PM2 — only the Next.js application

### docker-compose.yml
- **Exists:** NO
- **Note:** No orchestration for the full stack (Next.js + Python workers + Nginx)

### Nginx config
- **Exists:** YES (`gerasys-online/nginx.conf`)
- **Domains configured:** `zayronsecurity.com`, `www.zayronsecurity.com`
- **SSL:** Let's Encrypt with TLS 1.2/1.3
- **Proxy:** Passes to `127.0.0.1:3000` (Next.js)
- **Static asset caching:** 1 year immutable for `/_next/static`
- **Security:** Blocks access to `.env`, `node_modules`, hidden files ✓
- **Issue:** Domain `zayronsecurity.com` differs from `.env.example` `NEXT_PUBLIC_SITE_URL=zayron-x.com`

### PM2 config
- **Exists:** YES (`gerasys-online/pm2.ecosystem.config.js`)
- **Processes defined:**
  1. `zayron-web` — Bun, cluster mode (2 instances), `/var/www/zayron`
  2. `news-worker` — Python3, `news_worker.py`, cron `*/15 * * * *`, `/var/www/workers` **(FILE DOES NOT EXIST)**
  3. `cve-worker` — Python3, `cve_worker.py`, cron `0 */6 * * *`, `/var/www/workers` **(PATH MISMATCH — file is at repo root)**
  4. `social-worker` — Python3, `social_worker.py`, cron `0 */3 * * *`, `/var/www/workers` **(FILE DOES NOT EXIST)**
- **Issue:** Two of four workers reference non-existent Python files. All worker paths don't match repo layout.

### Deploy script
- **Exists:** YES (`gerasys-online/deploy.sh`)
- **What it does:** Git pull → bun install → bun run build → db:push → PM2 reload → Nginx reload
- **Domain:** `zayronsecurity.com`
- **Repo URL:** `https://github.com/zayronsec/zayron-security.git`
- **Issue:** References GitHub repo — UNKNOWN if this repo actually exists or is just a placeholder.

### Vercel deployment
- **Alternative deploy script:** `scripts/deploy-vercel.ts`
- **Method:** Vercel CLI (`bunx vercel deploy`)
- **Project:** Linked to Vercel (`.vercel/project.json` exists)
- **Issue:** Uses `bunx vercel` which requires Vercel CLI to be installed globally.

### Current deployment status: UNKNOWN
- The codebase is complete for local development
- Production deployment requires: proper `.env.local`, RLS SQL patch applied, PM2 config fixed, Python workers running, Nginx configured
- No evidence of whether this is currently LIVE on any domain

---

## SECTION 11 — PERFORMANCE ANALYSIS

### Server-side data fetching efficiency
- **Homepage:** Fetches 5 queries in parallel via `Promise.allSettled` ✓
- **Category pages:** 2 parallel queries (articles + tags) ✓
- **Article pages:** 3 parallel queries (article + related + trending) ✓
- **Root layout:** Fetches categories + tools for navigation on EVERY page — this blocks all navigation if the DB is slow
- **ISR:** Pages use `revalidate` for time-based regeneration (60s to 3600s)

### N+1 query problems
- **NONE detected** in the main query functions — all use single queries with joins/where clauses
- `getArticleBySlug` fetches one article per call — efficient for detail pages
- `getRelatedArticles` uses a single query with category filter

### Caching strategy
- **Next.js ISR:** Used throughout (`revalidate` exports) ✓
- **Upstash Redis:** Initialized but NOT used for data caching — the `cacheGet`/`cacheInvalidate` helpers exist in `lib/cache/redis.ts` but are not called by any page or API route
- **Static assets:** 1-year immutable cache via Nginx and Next.js headers ✓
- **No browser caching strategy** for API responses — all API routes return uncached responses

### Image optimization
- `next/image` is NOT used anywhere — all images use native `<img>` tags with `loading="lazy"`
- `next.config.ts` configures image optimization (AVIF, WebP formats, device sizes) but since `next/image` is not used, this configuration has no effect
- Images come from Unsplash URLs and Supabase Storage — all external, no local optimization
- Fallback images use a data URI SVG (embedded) which is efficient

### Bundle size estimate
- **UNKNOWN without build analysis**
- Large dependencies: `date-fns` (tree-shaken but large), `framer-motion` (~30KB gzipped), `react-markdown` with plugins (~50KB gzipped)
- `lucide-react` uses ESM imports so icons are tree-shaken ✓
- `fuse.js` (~15KB gzipped) loaded for search but search is server-side — may not be needed client-side

### Large dependencies that should be lazy-loaded
- `framer-motion` — only needed for animated components, can be dynamically imported
- `fuse.js` — currently imported but search is done server-side via PostgreSQL full-text search. May be unused on client.

---

## SECTION 12 — WHAT IS MISSING

### SEO & metadata
- ✅ `sitemap.ts` — exists and generates dynamic sitemap
- ✅ `robots.ts` — exists, blocks `/admin/` and `/api/`
- ✅ OpenGraph metadata — generated per-page via `generateMetadata`
- ✅ JSON-LD structured data — implemented on article detail pages
- ❌ No `opengraph-image.tsx` or OG image generation — social shares will have no preview image
- ❌ No RSS feed output (`/rss.xml` or `/feed` endpoint)

### Error handling
- ❌ No `error.tsx` on ANY route — Next.js default error page on crashes
- ❌ No `loading.tsx` on ANY route — no loading skeletons during navigation
- ❌ No `global-error.tsx` — root-level error handling
- ✅ `not-found.tsx` exists with custom 404 UI

### Security
- ❌ No rate limiting on API routes (Upstash installed but not used)
- ❌ No CSRF protection on POST endpoints (`/api/subscribe`, `/api/views/[id]`)
- ⚠️ RLS patch SQL exists but UNKNOWN if applied to database
- ✅ CSP headers configured in `next.config.ts`
- ✅ Security headers (HSTS, X-Frame-Options, etc.) configured

### Admin panel
- ❌ Settings page is a placeholder with no functionality
- ✅ Dashboard has mock data fallback (renders even without DB)
- ✅ Raw feeds triage with promote-to-article form
- ❌ No bulk operations (batch delete, batch promote)
- ❌ No article edit form (admin/articles is read-only listing)
- ❌ No CVE management actions (admin/cves is read-only listing)

### Content
- ❌ No newsletter worker — `/api/subscribe` accepts emails but nothing sends newsletters
- ❌ No comment system
- ❌ No analytics integration (Umami mentioned in privacy policy but not implemented)
- ❌ No social media auto-broadcasting (mentioned in architecture doc but not implemented)

### Infrastructure
- ❌ No `docker-compose.yml` for full-stack orchestration
- ❌ No health check endpoints for monitoring
- ❌ No Prometheus/Grafana metrics
- ❌ No CI/CD pipeline configuration (GitHub Actions, etc.)
- ❌ No `.env.production` or `.env.staging` templates

### Documentation
- ✅ Previous architecture audit exists
- ❌ No README.md in the project
- ❌ No API documentation
- ❌ No setup/deployment guide for new developers
- ❌ No architecture decision records (ADRs)

---

## SECTION 13 — CURRENT STATE SUMMARY

### OVERALL HEALTH: 6/10

### WHAT WORKS
- Next.js 16 App Router with proper route groups, layouts, and SSR
- Drizzle ORM with type-safe schema and query functions
- Supabase SSR auth with middleware protection on admin routes
- Homepage with GhostGrid fallback (renders even with empty database)
- Intelligence category and article detail pages with silo-specific visual treatments
- CVE tracker with NVD integration
- Tools directory
- Search functionality via PostgreSQL full-text search
- Newsletter subscription API with email validation
- Admin panel with mock data fallbacks and raw feed triage
- Python workers for CVE fetching, Telegram scraping, and AI article generation
- RLS security policies (SQL file ready)
- CSP and security headers configured
- Responsive design with Tailwind CSS v4 custom design system
- sitemap.xml and robots.txt generation
- URL redirects from old scheme to new `/intelligence/` scheme

### WHAT IS BROKEN
- `.env.local` has only 4 variables set — application cannot start in production
- `_test_db.mjs` has hardcoded database password
- 3 components (HeroSection, LatestReports, CategoryShowcase) use old `/article/` and `/[category]` URL patterns
- PM2 config references 2 non-existent Python files (`news_worker.py`, `social_worker.py`)
- PM2 config has wrong paths for Python workers
- `postcss.config.mjs` has wrong JSDoc @type
- Analysts page passes hardcoded empty array
- Contact page has no contact form or email
- Admin settings page is a placeholder
- Duplicate CSS variable `--color-obsidian` causes unexpected white backgrounds
- Domain mismatch: `zayronsecurity.com` (nginx/deploy) vs `zayron-x.com` (.env.example)

### WHAT IS INCOMPLETE
- RLS SQL patch may not be applied to Supabase
- `url_hash` column missing from Drizzle schema
- No `loading.tsx` or `error.tsx` on any route
- No rate limiting on API routes despite having Upstash
- Redis initialized but not used for data caching
- `next/image` configured but not used — all images are raw `<img>` tags
- No newsletter sending functionality (subscriptions collected but not used)
- Admin panel has no edit/create forms for articles or CVEs
- No mobile-responsive testing evidence
- No OG image generation
- No RSS feed output
- No CI/CD pipeline
- No docker-compose for full stack

### WHAT IS DANGEROUS
1. **Hardcoded DB password** in `_test_db.mjs` — immediate credential exposure risk
2. **`.env.local` incomplete** — app crashes on startup without `DATABASE_URL`
3. **RLS patch unverified** — anon users may be able to write to all tables
4. **`raw_feeds` is PUBLICLY READABLE** per RLS policy — raw intelligence data exposed
5. **No rate limiting** on `/api/subscribe` — can be abused for spam
6. **No CSRF protection** on POST endpoints — cross-site request forgery possible
7. **Python SUPABASE_KEY vs JS SUPABASE_SERVICE_KEY** naming conflict — credentials may not be set correctly
8. **LLM prompt encourages hallucination** — "INVENT theoretical architectural context" when source material is thin

### TOP 5 PRIORITIES (in order)

1. **Fix `.env.local`** — Add all required environment variables so the application can start. This is the single biggest blocker.

2. **Remove `_test_db.mjs` or rotate credentials** — The hardcoded database password `zayron2026DB` is a security incident waiting to happen. Delete the file or gitignore it and rotate the database password immediately.

3. **Apply RLS SQL patch and verify** — Run `supabase_rls_patch.sql` in Supabase SQL Editor and verify policies are active. Remove `anon_select_raw_feeds` policy (feeds should not be public).

4. **Fix old URL patterns in 3 components** — Update HeroSection.tsx, LatestReports.tsx, and CategoryShowcase.tsx to use `/intelligence/[category]/[slug]` instead of old `/article/` and `/[category]` paths. This fixes unnecessary redirects and broken SEO.

5. **Fix PM2 config** — Update worker paths to match actual file locations. Remove references to non-existent `news_worker.py` and `social_worker.py`. Create `/var/www/workers/` directory with symlinks or update paths to repo root.

### ESTIMATED TIME TO FIX EVERYTHING: 15-20 hours

- P0 (security/config): 2-3 hours
- P1 (URL fixes, component bugs): 3-4 hours
- P2 (RLS, database alignment): 2-3 hours
- P3 (missing features — error pages, rate limiting, OG images): 5-6 hours
- P4 (testing, documentation, deployment): 3-4 hours

---

*End of Report — ZAYRON-X Complete System Architecture & Health Audit*
*Generated 2026-05-14*
