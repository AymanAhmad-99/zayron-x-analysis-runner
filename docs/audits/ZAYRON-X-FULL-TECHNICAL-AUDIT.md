# ZAYRON-X Full Technical Audit

Audit date: 2026-06-16  
Workspace: `D:\Desktop\zayron-app`  
Mode: read-only repository and local configuration analysis. No source code was modified.

Important note: the requested prompt file `docs/prompts/full-audit-prompt.md` was not present in the repository. The audit instructions were taken from the available file `D:\Desktop\promet.txt`, which contained the full audit prompt. Sensitive values found in environment-related files are intentionally not reproduced.

## 1. Verified Access Map

### Verified access

The audit could access the local filesystem under `D:\Desktop\zayron-app`, including the main Next.js application, Python workers, SQL files, CI/CD workflows, deployment configuration, tests, telemetry artifacts, and existing architecture/audit documents.

Verified local areas:

| Area | Verified evidence |
|---|---|
| Main web app | `zayron-x/app`, `zayron-x/components`, `zayron-x/lib`, `zayron-x/package.json`, `zayron-x/next.config.ts`, `zayron-x/middleware.ts` |
| API surface | `zayron-x/app/api/**/route.ts`, `telemetry/api_endpoints.json` |
| Supabase/DB design | `docs/sql/*.sql`, `zayron-x/supabase_*.sql`, `telemetry/database_schema.json` |
| Workers/ingestion | `workers/*.py`, `workers/ingestors/*.py`, `workers/docker-compose.yml`, `workers/requirements.txt` |
| Shared models | `shared/models/*.py` |
| Cloudflare deployment | `zayron-x/wrangler.toml`, `zayron-x/open-next.config.ts`, `zayron-x/worker-wrapper.js` |
| CI/CD | `.github/workflows/zayron-preview.yml`, `.github/workflows/zayron-production.yml` |
| Tests | `zayron-x/__tests__/**`, `workers/tests/**` |
| Local secrets presence | `.env`, `zayron-x/.env`, `zayron-x/.env.local`, `zayron-x/.mcp.json`, `zayron-x/.mcp-secrets` |

### Not accessible from current context

The following systems were not accessible from current context:

| System | Status |
|---|---|
| Live Supabase database | Not accessible from current context |
| Supabase advisors output | Not accessible from current context |
| Supabase dashboard Data API settings | Not accessible from current context |
| Cloudflare account, zone, DNS, deployments, logs | Not accessible from current context |
| GitHub issues, PRs, repository settings, branch protection | Not accessible from current context |
| VPS/server service status and live Docker containers | Not accessible from current context |
| Production logs, Sentry events, Logpush data | Not accessible from current context |
| Stripe dashboard/webhook delivery logs | Not accessible from current context |
| Upstash Redis dashboard/metrics | Not accessible from current context |
| NVD/Gemini billing and quota state | Not accessible from current context |

### MCP integrations

No callable GitHub, Cloudflare, Supabase SQL, VPS, or production observability MCP tools were available in this thread. Supabase-specific review guidance was available as a local skill and was used for Supabase/RLS/security analysis.

### Safe commands run

Read-only commands were used: `Get-Content`, `Get-ChildItem`, `Test-Path`, and `rg`. One directory creation command was run only after approval to create the requested report folder: `New-Item -ItemType Directory -Force docs\audits`.

### Inferred but not verified infrastructure

The repository strongly indicates Cloudflare Workers/OpenNext deployment, Supabase Postgres/Auth, Upstash Redis, Stripe billing, Sentry, Gemini, Dockerized Python workers, Tor proxy, NVD, RSS, Telegram, and Ransomwatch ingestion. Their live health, credentials, access policies, DNS, and deployment correctness were not verified against production.

### Missing for complete production audit

Needed next:

- Supabase read-only schema/policy dump from the live project.
- Supabase Data API table exposure settings.
- Cloudflare worker routes, custom domains, DNS records, WAF rules, cache rules, deployment history, and logs.
- GitHub branch protection, secrets list, workflow run history, dependency security alerts.
- Sentry project issue history and release traces.
- Stripe webhook event logs and products/prices.
- Upstash Redis metrics and rate-limit logs.
- VPS Docker status, systemd services, cron entries, resource graphs, and logs.

## 2. Repository Architecture

### High-level repository layout

The repository is not a single app; it is a platform workspace.

| Path | Purpose |
|---|---|
| `zayron-x/` | Main ZAYRON-X web SaaS built with Next.js App Router. |
| `workers/` | Python daemon layer for ingestion, AI enrichment, queue processing, and persistence. |
| `shared/` | Shared Python data models for articles, CVEs, IOCs, and financial blast-radius calculation. |
| `docs/sql/` | Supabase schema and security SQL scripts. |
| `.github/workflows/` | Preview and production Cloudflare deployment workflows. |
| `telemetry/` | Generated API and database inventory. |
| `evidence/`, `metrics/`, `graphs/` | Generated architecture/security/quality evidence. |
| `architecture/`, `governance/`, `memory/`, `knowledge/`, `decisions/` | Documentation and planning corpus. |
| `scripts/` | Root audit/report/security helper scripts. |

### Frontend architecture

The frontend is a Next.js App Router application under `zayron-x/app`.

Route groups:

- `app/(site)`: public website, homepage, articles, CVEs, tools, analysts, search, legal pages.
- `app/(auth)`: login/register pages.
- `app/admin`: admin dashboard, articles, CVEs, feeds, settings.
- `app/intelligence`: category and article intelligence pages.
- `app/api`: route handlers.
- `app/threats/[id]`: threat artifact detail pages.
- `app/offline`: PWA offline page.

Root layout:

- `zayron-x/app/layout.tsx`
- Wraps app with `Providers`, `SecurityGatingProvider`, `Header`, `Footer`, PWA prompt, and scroll controls.
- Sets metadata, fonts, PWA manifest, and robots defaults.

Component organization is mostly domain-based:

- `components/layout`
- `components/homepage`
- `components/article`
- `components/cve`
- `components/platform`
- `components/ui`

Server/client split:

- Many pages are server components and fetch Supabase data server-side.
- Interactive controls are client components, e.g. `ArticleBody`, `SecurityGatingContext`, `ThreatDetailClient`, search UI, dashboards.
- Client-side gating in `SecurityGatingContext.tsx` stores `zx_auth_clearance` in localStorage. This is UX-only and not a security boundary.

Data fetching patterns:

- Server components call `lib/supabase/queries/*`.
- Public APIs also call Supabase query modules.
- Some pages use `getCached` with Upstash Redis.
- Some routes use `force-dynamic` and/or `revalidate = 0`.

Loading/error states:

- Loading pages exist for several public/intelligence routes.
- Error boundaries exist in selected places, e.g. `app/(site)/error.tsx`, `app/admin/error.tsx`, intelligence article error.
- Coverage is uneven.

SEO:

- `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, and page-level metadata exist.
- Article pages generate OpenGraph and JSON-LD.
- Risk: some metadata uses unsanitized/generated content fields. This is not necessarily exploitable but depends on safe escaping and content trust.

Performance risks:

- Public article and CVE queries use exact counts and broad selects.
- Search uses `ilike` and `.or(...)` string filters.
- `getCategoriesWithCounts` fetches all published article categories and counts in memory.
- Some pages use service-role/admin queries and dynamic rendering, bypassing CDN/ISR benefits.

## 3. Infrastructure Architecture

### Hosting model

Verified configuration points to Cloudflare Workers through OpenNext:

- `zayron-x/wrangler.toml`
- `zayron-x/open-next.config.ts`
- `zayron-x/worker-wrapper.js`
- `.github/workflows/zayron-preview.yml`
- `.github/workflows/zayron-production.yml`

The web app package scripts include:

- `build`: Next build with webpack.
- `build:cf`: OpenNext Cloudflare build.
- `deploy`: OpenNext Cloudflare deploy.
- `preview`: OpenNext Cloudflare preview.
- `deploy:preview`: Wrangler preview deploy.
- `deploy:production`: Wrangler production deploy.

### Cloudflare configuration

Verified:

- Worker name: `zayron-x`.
- Compatibility date: `2025-09-23`.
- Flags: `nodejs_compat`, `global_fetch_strictly_public`.
- KV bindings: `ZAYRON_CACHE`, `NEXT_INC_CACHE_KV`.
- Assets directory: `.open-next/assets`.
- Production and preview envs are configured.
- Observability enabled with `head_sampling_rate = 0.1`.

Risks:

- `env.production.name = "zayron-x-preview"` appears mislabeled for production.
- `workers_dev = true` for production while custom domain routes are commented out.
- DNS/custom domain readiness is not verified.
- `public/_headers` contains only partial CSP-like header syntax and may not apply to Worker responses.
- The repo contains built artifacts (`.next`, `.open-next`, `.wrangler`) locally; whether they are committed was not verified.

### Docker/VPS workers

Verified:

- `workers/docker-compose.yml` defines `zayron_crew`, `zayron_radar`, `zayron_rss`, `zayron_darkweb`, `zayron_cve`, and `tor_proxy`.
- `workers/Dockerfile.workers` exists.
- Services use `.env` and service-role Supabase credentials.
- Tor proxy has a control port configured.

Risks:

- Live VPS and Docker status are not accessible from current context.
- `tor_proxy` command includes a hashed control password in compose. Even though it is a hash, this is still operationally sensitive and should be treated as a credential/config secret.
- Workers use Supabase REST with service-role credentials. Compromise of the worker or logs is high impact.

### CI/CD

Verified:

- Preview workflow runs on `main` push/PR/workflow dispatch.
- Production workflow runs on `production` push/workflow dispatch.
- Steps: checkout, install Bun, install deps, lint, type-check, unit tests, OpenNext build, patch `node:fs`, verify bundle, deploy via Wrangler.
- Production includes Sentry canary health check and rollback script on failure.

Risks:

- Workflows install Bun via shell curl without pinning installer integrity.
- `BUN_VERSION` env is declared but not used by the install step.
- Production deployment branch is `production`; branch protection not accessible.
- E2E and integration tests are not run in deploy workflows.

## 4. Database and Supabase Audit

### Verified database inventory

From `telemetry/database_schema.json`:

Tables:

- `profiles`
- `threat_artifacts_secure`
- `analysts`
- `articles`
- `cves`
- `programming_langs`
- `tools`
- `subscribers`
- `raw_feeds`
- `trending`
- `knowledge_embeddings`
- `tags`
- `revalidations`

Views:

- `threat_artifacts`

Functions:

- `check_is_subscriber`
- `handle_new_user`
- `update_updated_at_column`
- `match_knowledge`
- `revert_stale_crew_claims`

RLS-enabled list in telemetry:

- `profiles`
- `threat_artifacts_secure`
- `articles`
- `cves`
- `tools`
- `analysts`
- `subscribers`
- `raw_feeds`
- `trending`
- `programming_langs`
- `radar_targets`
- `threat_artifacts`

Notable mismatch:

- `knowledge_embeddings`, `tags`, and `revalidations` appear in tables but not in the telemetry `rls_enabled_tables` list. SQL files later attempt to enable or grant access to `knowledge_embeddings`, but live status is not verified.

### RLS and grants

Important SQL files:

- `docs/sql/supabase_rls_remediation_v3.sql`
- `docs/sql/v3_knowledge_embeddings.sql`
- `docs/sql/p0_fix_check_is_subscriber_and_view.sql`
- `zayron-x/supabase_rls_policies.sql`
- `zayron-x/supabase_security_patch.sql`
- `zayron-x/supabase_gating_migration.sql`
- `zayron-x/supabase_tier_mfa_migration.sql`

Verified concerns:

1. Some policies use `raw_user_meta_data->>'role' = 'admin'`. In Supabase, user metadata is user-editable and must not be used for authorization.
2. `docs/sql/supabase_rls_remediation_v3.sql` grants `SELECT` on `public.articles` to `anon` and `authenticated`. Since RLS filters rows but not columns, any premium columns in `articles` can be directly exposed through the Data API unless column privileges or views prevent it.
3. `v3_knowledge_embeddings.sql` grants `SELECT, INSERT, UPDATE, DELETE` on `knowledge_embeddings` to `anon`, `authenticated`, and `service_role`. This is dangerous if applied as-is.
4. Several functions are `SECURITY DEFINER`, including `check_is_subscriber`, `check_is_admin`, `protect_clearance_level`, `handle_new_user`, `revert_stale_crew_claims`, and `match_knowledge` variants. Some are legitimate, but all require explicit `search_path`, strict grants, and advisor review.
5. View security is a concern. Supabase/Postgres views can bypass RLS unless `security_invoker = true` or access is otherwise constrained. Some SQL files mention a public `threat_artifacts` view; live security settings are not verified.

### Schema design

Strengths:

- Separation between `articles`, `cves`, `raw_feeds`, and `threat_artifacts_secure` is directionally good.
- `profiles` holds billing/subscription state.
- `knowledge_embeddings` uses pgvector-compatible type and FTS GIN index.
- `raw_feeds` status supports a processing queue.

Weaknesses:

- Premium intelligence exists in both `articles` and `threat_artifacts_secure`. This blurs public/private boundaries.
- Direct PostgREST grants to tables create a large attack surface.
- No verified foreign keys/constraints were confirmed from live schema.
- `raw_feeds` table is doing queue duty without verified robust locking, retry counters, poison-message handling, or DLQ table.
- API key table design for external API monetization was not found.

### Query performance risks

Verified patterns:

- `getArticleCount` and `getCVECount` use exact counts.
- `getCategoriesWithCounts` loads all categories and counts in app memory.
- `searchArticles` uses `or(title.ilike...,excerpt.ilike...)`.
- `searchCVEs` uses `or(cve_id.ilike...,description.ilike...)`.
- Public APIs accept `limit` without hard maximum caps.
- `getAllTags` scans all article tag arrays.

Recommended indexes:

- `articles(is_published, published_at desc)`
- `articles(category, is_published, published_at desc)`
- `articles(slug)` unique
- `articles(url_hash)` unique or at least indexed
- FTS indexes on article title/excerpt/content if search is product-critical
- `cves(cve_id)` unique
- `cves(severity, published_date desc)`
- `cves(vendor)`
- `raw_feeds(status, created_at)`
- `raw_feeds(source_channel, status)`
- `profiles(stripe_customer_id)` unique
- `profiles(stripe_subscription_id)` unique
- `threat_artifacts_secure(created_at desc)`
- `knowledge_embeddings` vector index if semantic search is used at scale

### Safe migration order

Recommended order:

1. Dump live grants, policies, views, functions, indexes, and table definitions.
2. Remove authorization dependencies on user-editable metadata.
3. Create public-safe views for article listings/details excluding premium columns.
4. Switch public app/API queries to views.
5. Revoke direct anon/authenticated table access to sensitive base tables.
6. Add missing indexes concurrently where possible.
7. Add constraints and uniqueness after data cleanup.
8. Add RLS tests for anon, authenticated free user, subscriber, admin, and service role.
9. Only then simplify app-layer redaction.

## 5. API and Backend Audit

### Verified endpoints

From source and `telemetry/api_endpoints.json`:

| Endpoint | Methods | Intended access | Rate limited |
|---|---:|---|---|
| `/api/admin/sync-knowledge` | POST | Admin/worker | No |
| `/api/articles` | GET/POST | Public/secret revalidation | GET yes |
| `/api/articles/[slug]` | GET | Public | No |
| `/api/billing/checkout` | POST | Authenticated | Middleware CSRF path |
| `/api/billing/portal` | POST | Authenticated | Middleware CSRF path |
| `/api/csp-report` | POST | Public browser reports | No |
| `/api/cves` | GET | Public | Yes |
| `/api/db-status` | GET | Public | No |
| `/api/download-sitrep` | GET | Subscriber | No |
| `/api/og` | GET | Public | Not verified |
| `/api/remediate` | POST | Subscriber | No |
| `/api/revalidate` | POST | Shared secret | No |
| `/api/rss` | GET | Public | No |
| `/api/search` | GET | Public | Yes |
| `/api/seed-analysts` | POST | Admin basic auth/middleware | No |
| `/api/status` | GET | Public health | No |
| `/api/subscribe` | POST | Public | Yes |
| `/api/unsplash-search` | GET | Public | No |
| `/api/views/[id]` | POST | Public | Yes |
| `/api/webhooks/stripe` | POST | Stripe webhook | Signature verified |

### Input validation

Good:

- Login/register forms use Zod client-side.
- Stripe webhook validates signature.
- Subscribe validates email format.
- Some route parameters are checked for presence.

Weak:

- Several public query parameters lack Zod/server validation and hard caps.
- Search strings are interpolated into Supabase `.or(...)` filters.
- `path` in revalidation can invalidate arbitrary provided paths when secret is valid.
- `tierId` in checkout is lightly constrained by branch logic but not schema-validated.
- `threatId` is checked for presence but not shape.

### Error handling

Most handlers return generic JSON errors, but:

- Some return raw `err.message`, e.g. billing and premium APIs.
- Some logs include internal operational details.
- Health endpoint exposes dependency status and latency publicly.

### Auth and authorization

Strengths:

- Supabase `auth.getUser()` is used server-side.
- Premium APIs double-check user and profile subscription.
- Stripe checkout and portal require authenticated users.
- Webhook verifies Stripe signature.
- Middleware implements CSRF origin/referer and token checks for state-changing requests.

Weaknesses:

- Admin middleware accepts `user.user_metadata.role === 'admin'`.
- SQL policies in older files use `raw_user_meta_data`.
- Some page/server components use service-role client and then redact server-side. This is acceptable only if DTO redaction is perfect and tested.
- `auth/callback` redirects to a `next` query value without visible allowlist validation.

### Caching

Good:

- `/api/articles` and `/api/cves` set CDN cache headers.
- Redis `getCached` used for homepage data.
- Public CVE feed caches via Upstash fallback wrapper.

Risks:

- Subscriber redaction combined with public CDN caching needs careful `Vary`/private cache controls. `/api/articles` computes `isSubscriber` and returns redacted/unredacted data, but sets public cache headers. If subscriber data is ever returned through this endpoint, this is cache-leak sensitive.
- `/api/articles/[slug]` returns full article object from `getArticleBySlug` without subscriber redaction and sets public cache headers.

## 6. Frontend Audit

### Strengths

- Clear route organization.
- Rich product UI with platform-specific dashboards.
- PWA support via manifest/service worker.
- Article/CVE/tool/search/admin flows are present.
- Server-side rendering is used for core content.
- Metadata/robots/sitemap exist.

### Weaknesses

- `SecurityGatingContext.tsx` can create false security expectations because localStorage controls UX access.
- `ArticleBody.tsx` renders HTML content with `dangerouslySetInnerHTML` without calling the available `sanitizeHtml` utility.
- Generated article content comes from AI/ingestion, which creates a stored XSS trust-chain risk.
- Admin dashboard uses mock fallback data if DB queries fail. This can mislead operators.
- Several UI strings contain mojibake/encoding corruption, which damages trust.
- `next.config.ts` sets `typescript.ignoreBuildErrors: true`, meaning type errors can ship.

### State management

State is simple and local. No dedicated global state library is present. This is good for maintainability at the current size.

### Performance risks

- Heavy dashboard server rendering.
- Multiple Supabase calls per page.
- Public pages with dynamic rendering reduce Cloudflare cache benefit.
- Article markdown/HTML rendering can be expensive for long generated reports.

## 7. Security Audit

### Security posture summary

The project has visible security engineering effort: middleware CSRF, rate limiting, RLS SQL, Sentry, security headers, Stripe signature verification, service-role warnings, and deployment checks. However, the most important risks are boundary consistency issues: public versus premium data, admin authorization source of truth, CSP mismatch, stored HTML rendering, and service-role blast radius.

### Authentication

Verified:

- Supabase Auth for login/register.
- Server-side `auth.getUser()` in protected routes.
- Auth callback exchanges code for session.

Risks:

- Open redirect risk in `app/auth/callback/route.ts` through unvalidated `next`.
- Admin authorization checks conflict across middleware, layout email allowlist, SQL metadata policies, and profile clearance.

### Authorization

Critical issue:

- Authorization checks use unsafe metadata in some places:
  - `zayron-x/middleware.ts` uses `user?.user_metadata?.role === 'admin'`.
  - `zayron-x/supabase_rls_policies.sql` uses `raw_user_meta_data->>'role'`.
  - `zayron-x/supabase_tier_mfa_migration.sql` uses `raw_user_meta_data->>'role'`.

Supabase user metadata is user-editable and must not authorize admin access.

### Session/cookie security

Verified:

- Supabase SSR cookie integration exists.
- CSRF cookie is `sameSite: 'lax'`, `secure: true`, and readable by JS for double-submit.

Risks:

- CSRF token is not `httpOnly` by design; XSS compromises it.
- Session refresh queue uses global memory; this is fragile in serverless/edge runtime.

### XSS

High risk:

- `ArticleBody.tsx` checks whether content looks like HTML and directly renders it with `dangerouslySetInnerHTML`.
- AI-generated or ingested HTML can become stored XSS if not sanitized before persistence or render.
- `sanitize-edge.ts` exists but is not used at the render point.
- CSP allows `unsafe-inline` and `unsafe-eval`, reducing mitigation value.

### SSRF

Potential risks:

- Workers fetch external feeds, RSS, Telegram URLs, Ransomwatch, onion targets, and Supabase REST.
- `unsplash-search` calls Unsplash based on query; fixed host reduces SSRF risk.
- No general arbitrary URL fetch API was confirmed in web routes.

Worker SSRF/egress risk should be controlled by allowlisted feed sources, network egress policy, and timeouts.

### SQL/PostgREST injection

No direct SQL string concatenation was found in Next route code. However:

- Supabase `.or(...)` strings in `searchArticles` and `searchCVEs` interpolate user query text into PostgREST filter syntax.
- This can cause filter syntax manipulation or errors. Escape or replace with RPC/FTS.

### RLS bypass/service role

Service-role clients are used in:

- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- billing checkout/webhook
- subscribe
- seed analysts
- raw feed queries
- article/CVE admin query functions
- dark-web recon page
- premium remediation/SITREP routes
- Python workers

This is a high-blast-radius pattern. It can be acceptable in backend-only contexts, but every route using it must have strict auth, input validation, logging, rate limiting, and DTO redaction.

### Rate limiting

Verified rate-limited:

- Login/register in middleware.
- `/api/articles`
- `/api/cves`
- `/api/search`
- `/api/subscribe`
- `/api/views/[id]`

Missing or not verified:

- `/api/articles/[slug]`
- `/api/csp-report`
- `/api/db-status`
- `/api/download-sitrep`
- `/api/remediate`
- `/api/revalidate`
- `/api/rss`
- `/api/seed-analysts`
- `/api/status`
- `/api/unsplash-search`
- `/api/admin/sync-knowledge`

### Secrets

Verified sensitive files exist:

- `D:\Desktop\zayron-app\.env`
- `D:\Desktop\zayron-app\zayron-x\.env`
- `D:\Desktop\zayron-app\zayron-x\.env.local`
- `D:\Desktop\zayron-app\zayron-x\.mcp.json`
- `D:\Desktop\zayron-app\zayron-x\.mcp-secrets`

Values were not read into this report. Risk: local secret files may be accidentally copied, bundled, committed, or leaked through built artifacts. Built output folders also contain `.env` copies according to read-only listing:

- `zayron-x/.next/standalone/.env`
- `zayron-x/.open-next/server-functions/default/.env`

This is high risk if build artifacts are published, uploaded, or committed.

### Supply chain

Risks:

- Dependencies include newest/advanced stack: Next 16, React 19, OpenNext Cloudflare, Sentry, Stripe, Supabase, Upstash, Gemini SDK.
- `@supabase/ssr` and `@supabase/supabase-js` in root `package.json` use caret ranges, while app lockfile pins resolved versions.
- Python worker requirements use several `>=` ranges.
- CI does not run dependency audit in verified workflow.

## 8. Cloudflare / Deployment Audit

### Current state

Cloudflare Worker deployment is configured through Wrangler and OpenNext. KV is configured for incremental cache. Observability is enabled. Build scripts include node builtin patching and bundle verification.

### Risks

| Area | Risk | Priority |
|---|---|---|
| Production env name | Production name appears set to `zayron-x-preview`. | High |
| Custom domains | Routes are commented out; `workers_dev = true`. | High |
| Secrets | Actual secret presence in local env/build folders. | Critical |
| CSP | Worker/Next headers allow unsafe script behavior. | High |
| Runtime compatibility | Requires patch script to remove/replace Node built-ins. | Medium |
| CI coverage | E2E/integration tests not part of deploy gates. | Medium |
| Rollback | Script exists and production workflow calls it on canary failure. Live capability not verified. | Medium |

### Best practice recommendations

- Correct production worker name and custom domain route mapping.
- Keep `wrangler.toml` free of sensitive values.
- Verify Worker secrets with `wrangler secret list` in a secure admin context.
- Add deployment smoke tests after deploy.
- Make bundle verification part of PR checks.
- Add Cloudflare cache rules for public content and bypass rules for auth/subscriber routes.
- Add WAF/rate-limit rules at Cloudflare for public APIs.

## 9. Worker and Ingestion Audit

### Verified workers

| Worker | File | Purpose |
|---|---|---|
| Omni crew | `workers/omni_crew.py` | Claims pending feeds, fetches RAG context, calls Gemini, validates IOCs, persists reports. |
| CVE worker | `workers/ingestors/cve_worker.py` | Polls NVD API, parses CVEs, upserts `cves`, queues raw feeds. |
| Dark web ingestor | `workers/ingestors/darkweb_ingestor.py` | Pulls Ransomwatch and optional onion targets, queues raw feeds. |
| Radar engine | `workers/ingestors/radar_engine.py` | Telegram/HTTP fallback channel monitoring. |
| RSS ingestor | `workers/ingestors/rss_ingestor.py` | RSS collection. |

### Queueing model

The queue is implemented through Supabase `raw_feeds` rows and status transitions:

- `pending`
- `processing_crew`
- `crew_promoted`
- `crew_failed`
- `crew_ignored`
- `persist_failed`

`claim_pending_feeds` uses a select-then-patch optimistic lock pattern through Supabase REST, not true `SELECT FOR UPDATE SKIP LOCKED`.

### Strengths

- Deduplication through content hashes.
- Backoff on Gemini rate limits.
- Quota ledger through Upstash Redis.
- Worker health checks in Docker compose.
- Watchdog SQL exists for stale crew claims.
- Pydantic models validate AI output and persistence payloads.

### Risks

- No verified dead-letter queue table.
- Retry counts are not clearly persisted per feed.
- Poison data handling is limited.
- AI-generated HTML/content trust is risky.
- Workers use service-role keys broadly.
- RSS/Telegram/dark-web feed trust and source reputation controls need stronger metadata.
- Worker logs may include sensitive source content or operational details.

## 10. AI Pipeline Audit

### Current architecture

The AI pipeline is centered in `workers/omni_crew.py`.

Flow:

1. Claim pending feed.
2. Deduplicate by hash.
3. Fetch local RAG context from `knowledge_embeddings`.
4. Deterministically extract IOCs, CVEs, and MITRE TTPs.
5. Call Gemini Pro with strict Pydantic response schema.
6. Validate LLM IOCs using shared IOC validation.
7. Build `ExecutiveSITREP`.
8. Anti-FUD phrase cleanup.
9. Persist to articles/CVEs/threat artifacts.
10. Trigger revalidation.

### Strengths

- Single-call architecture controls API cost better than multi-call chains.
- Structured schema output reduces parser fragility.
- Deterministic IOC/CVE/TTP extraction anchors some content.
- Daily quota gate exists.
- Anti-FUD vocabulary gate exists.

### Weaknesses

- Prompt instructs the model to synthesize high-probability estimates if data is missing. This directly increases hallucination risk for an intelligence product.
- Evidence provenance is not strong enough. Claims should be tied to source URLs, timestamps, reliability grades, and observed fields.
- RAG context is fetched from local knowledge base with broad fallback; irrelevant fallback context can contaminate reports.
- AI output can include HTML that later renders in the frontend.
- Confidence/source grading exists conceptually but requires stronger validation.
- No eval suite was found for report factuality, hallucination, severity scoring, MITRE correctness, or YARA/Sigma validity.

### Recommended direction

- Separate observed facts from AI analysis and estimates.
- Store source citations and confidence per claim.
- Never instruct AI to synthesize missing telemetry for factual fields.
- Require all IOCs/YARA/Sigma/MITRE mappings to pass validators.
- Add human review for high-severity or paid reports.
- Store sanitized HTML or render Markdown only.

## 11. Performance and Scalability Audit

### 1,000 visits/day

Likely works if Supabase and Redis are configured. Main risks are rate-limiter fail-closed behavior and dynamic rendering overhead.

Actions:

- Cap query limits.
- Cache public article/CVE pages.
- Fix secrets in build artifacts.

### 10,000 visits/day

Will likely need stronger CDN caching and query optimization.

Risks:

- Exact count queries.
- Search `ilike` scans.
- Category/tag in-memory aggregation.
- Public API cache ambiguity with subscriber data.

Actions:

- Add indexes.
- Move category/tag counts to materialized or cached views.
- Add Cloudflare cache rules.

### 50,000 visits/day

Will stress Supabase REST and Redis unless most public traffic is cached.

Risks:

- `/api/articles/[slug]` not rate limited and caches full article objects.
- `/api/status` can fan out to multiple external services.
- Search can become costly.

Actions:

- Introduce search-specific FTS/RPC endpoint.
- Add origin protection at Cloudflare.
- Use stale-while-revalidate content APIs.

### 100,000 visits/day

Requires disciplined edge caching and database isolation.

Risks:

- Dynamic pages bypass cache.
- Supabase API request volume grows quickly.
- Logs and health checks can become noisy.

Actions:

- Move public content to public-safe cached views.
- Pre-render/ISR public pages.
- Use separate paid-user API path with private cache controls.

### 1,000 API users

Current system is not API-product ready.

Needed:

- API keys.
- Per-key quotas.
- Usage metering.
- Versioned API.
- Abuse detection.
- Documentation.

### 10,000 API users

Requires formal API gateway model, quotas, billing linkage, and read replicas/cache.

### 50 reports/day

Likely manageable with Gemini quota and Supabase writes.

### 500 reports/day

Cost and quality controls become important. Need batching, queue visibility, DLQ, and review workflows.

### 5,000 raw feed items/day

Likely requires better deduplication, priority queueing, source scoring, and worker concurrency control.

### 100,000 raw feed items/day

Current raw table queue model is insufficient. Need durable queue, partitioning/archiving, DLQ, bulk ingestion, and source-level throttling.

## 12. Cost Audit

### Cloudflare

Current cost risk: low to medium. Workers and KV are cost-efficient if public content is cached. Dynamic SSR and frequent health checks can increase cost.

Hidden cost bombs:

- Dynamic rendering for public pages.
- Excessive Worker invocations from APIs without cache.
- Logpush/Sentry volume.

### Supabase

Current cost risk: medium to high.

Hidden cost bombs:

- Exact counts at scale.
- Full table scans for search/category/tags.
- Large generated article content.
- Public Data API abuse.
- Service-role worker writes without backpressure.

### Upstash Redis

Current cost risk: low to medium.

Risks:

- Rate-limit analytics and cache keys can grow.
- Quota counter is simple, but cache pattern could become expensive if many per-user/per-query keys are added.

### AI API calls

Current cost risk: high.

Controls present:

- Daily request limit.
- Single-call Omni pipeline.
- Backoff/fallback.

Missing:

- Per-source budgets.
- Per-customer cost attribution.
- Report quality/cost acceptance thresholds.
- AI output caching/evals.

### VPS/Docker workers

Current cost risk: medium.

Risks:

- Multiple always-on containers.
- Tor proxy overhead.
- Python memory/CPU from LLM/HTTP jobs.

### Keep per-user cost low

- Make public pages cached and mostly static.
- Keep AI-generated reports paid or delayed.
- Cache CVE feed aggressively.
- Batch ingestion and enrichment.
- Avoid free users triggering premium compute.
- Make remediation/SITREP export paid and quota-limited.

## 13. Testing and Quality Audit

### Verified tests

Web app tests:

- `zayron-x/__tests__/unit/db.test.ts`
- `zayron-x/__tests__/unit/api-remediate.test.ts`
- `zayron-x/__tests__/unit/api-download-sitrep.test.ts`
- `zayron-x/__tests__/unit/api-csrf.test.ts`
- `zayron-x/__tests__/unit/api-billing.test.ts`
- `zayron-x/__tests__/integration/api.test.ts`
- `zayron-x/__tests__/e2e/auth.spec.ts`
- `zayron-x/__tests__/e2e/homepage.spec.ts`
- `zayron-x/__tests__/e2e/pages.spec.ts`

Worker tests:

- `workers/tests/verify_imports.py`
- `workers/tests/test_omni_agent.py`
- `workers/tests/diag_health_check.py`

### Quality gates

Verified package scripts:

- `lint`
- `type-check`
- `test:unit`
- `test:integration`
- `test:e2e`
- `test:all`

CI runs lint, type-check, unit tests, build, bundle verification. It does not run integration or e2e tests in verified workflows.

### Major quality risks

- `typescript.ignoreBuildErrors: true` in `next.config.ts`.
- Tests rely heavily on mocks; live RLS and Supabase policy behavior are not verified.
- No security regression suite for admin metadata authorization.
- No XSS sanitization tests around generated HTML.
- No AI factuality/eval tests.
- No load tests.
- Encoding corruption appears across files.

### Testing roadmap

1. Make type errors fail production build.
2. Add API parameter validation tests.
3. Add RLS tests using anon/authenticated/subscriber/admin/service-role credentials in a test project.
4. Add XSS tests for generated article content.
5. Add cache leak tests for subscriber versus public responses.
6. Add worker queue retry/DLQ tests.
7. Add AI output schema and factuality eval fixtures.
8. Add Playwright smoke against deployed preview.
9. Add dependency/security scanning in CI.
10. Add load tests for `/api/articles`, `/api/cves`, `/api/search`, homepage, and article pages.

## 14. Global Standards Scorecard

| Area | Score | Why |
|---|---:|---|
| Production readiness | 5.5/10 | Real deploy pipeline and architecture exist, but env/build artifact, Docker, cache, and auth concerns remain. |
| Security readiness | 4.5/10 | Strong intent, but critical boundary issues: metadata auth, CSP mismatch, stored HTML, premium data exposure risk. |
| SaaS readiness | 5.5/10 | Auth, billing, tiers, admin, and premium features exist; entitlement model and API monetization are incomplete. |
| Multi-tenant readiness | 3.5/10 | Profiles exist, but no clear tenant/org model, per-tenant isolation, or API keys. |
| Cloudflare edge readiness | 6/10 | OpenNext/Wrangler configured and bundle checks exist; runtime patching and production env naming are risky. |
| Database reliability readiness | 4.5/10 | Schema/RLS docs exist, but live state not verified; queueing, indexes, retention, and migrations need hardening. |
| SOC/CTI product credibility | 5/10 | Rich CTI concepts and ingestion exist; provenance, factuality, and analyst review need major improvement. |
| Incident response readiness | 4.5/10 | Some runbooks/Sentry/canary exist; live alerting/logs/rollback not verified. |
| Scalability readiness | 5/10 | Cloudflare and cache direction is good; DB query patterns and AI queue need scale redesign. |
| Cost-efficiency readiness | 6/10 | Cloudflare, Redis, and single-call AI help; AI and Supabase costs can spike. |
| Maintainability readiness | 5/10 | Organized folders, but duplicated SQL, drift artifacts, encoding issues, and service-role spread hurt maintainability. |
| Developer experience readiness | 5.5/10 | Scripts/tests/docs exist; root/app package split and ignored TS build errors create confusion. |
| Testing readiness | 5/10 | Unit/integration/e2e tests exist, but security/RLS/deployment/eval coverage is insufficient. |
| Compliance-readiness basics | 3.5/10 | Legal pages and control mappings exist, but audit logs, data retention, access governance, and evidence chain are not production-grade. |
| Investor/demo readiness | 6/10 | Product has strong visual/architectural ambition; operational/security gaps must be fixed before serious diligence. |

## 15. Critical Findings Table

| ID | Severity | Area | File/path | Evidence | Impact | Attack scenario | Recommended fix | Effort | Priority |
|---|---|---|---|---|---|---|---|---|---|
| ZX-001 | Critical | Data exposure | `articles` access via SQL files and `lib/supabase/queries/articles.ts` | Public SELECT grants on `articles`; premium fields mapped in `mapArticle`; `/api/articles/[slug]` returns full article object. | Premium intelligence/IOCs/YARA/financial fields may leak. | Attacker uses anon Supabase key or article API to fetch premium columns. | Move premium fields to private table or public-safe views; revoke direct public table access. | 1-3 days | P0 |
| ZX-002 | Critical | Authorization | `middleware.ts`, `supabase_rls_policies.sql`, `supabase_tier_mfa_migration.sql` | `user_metadata`/`raw_user_meta_data` used for admin role checks. | User-controlled metadata can become admin authorization source. | User alters metadata then reaches admin route/policy. | Use `app_metadata` or protected `profiles.clearance_level`; update all policies/routes. | 1 day | P0 |
| ZX-003 | Critical | Secrets/build artifacts | `.env`, `zayron-x/.env*`, `.mcp-secrets`, `.next/standalone/.env`, `.open-next/.../.env` | Local secret files and built `.env` copies exist. | Secrets can leak via commit, artifact upload, or deployment bundle. | Attacker obtains build artifact and extracts service-role/API keys. | Ensure gitignore, remove env from artifacts, rotate exposed keys if artifacts left machine, add secret scanning. | 0.5-1 day | P0 |
| ZX-004 | High | XSS | `components/article/ArticleBody.tsx` | Direct `dangerouslySetInnerHTML` for HTML-looking content. | Stored XSS through AI/ingested content. | Poisoned feed causes malicious HTML to be persisted and rendered to users/admins. | Sanitize before render/persist; prefer Markdown AST allowlist. | 1 day | P0 |
| ZX-005 | High | CSP | `next.config.ts`, `middleware.ts` | Comments claim strict CSP, but `script-src` allows `unsafe-inline` and `unsafe-eval`. | XSS impact amplified. | Any injection executes because CSP is permissive. | Implement real nonce/hash CSP; remove unsafe script directives. | 1-2 days | P0 |
| ZX-006 | High | Cache/data leak | `app/api/articles/route.ts`, `app/api/articles/[slug]/route.ts` | Subscriber-aware responses and public cache headers; slug endpoint lacks redaction. | Premium response may be cached publicly. | Subscriber request populates CDN cache with unredacted object. | Split public/private endpoints; use `private, no-store` for auth-aware responses. | 1 day | P0 |
| ZX-007 | High | Service-role blast radius | `lib/supabase/server.ts`, `lib/supabase/client.ts`, API routes, workers | Broad service-role use across app and workers. | Any route bug can become full DB compromise. | Attacker exploits auth/input bug on service-role route. | Minimize service-role use; isolate to backend-only modules; add route-level guards and audits. | 2-5 days | P1 |
| ZX-008 | High | Rate limiting | Multiple API routes | Telemetry marks many public/premium routes as not rate-limited. | API abuse and cost spikes. | Attacker hammers health, RSS, status, unsplash, revalidate, premium APIs. | Add route-specific rate limits and Cloudflare rules. | 1-2 days | P1 |
| ZX-009 | High | Open redirect | `app/auth/callback/route.ts` | Redirects to `${origin}${next}` with query-controlled `next`. | Phishing/session confusion risk. | Auth link redirects user to attacker-controlled or confusing path if not constrained. | Allow only relative internal paths; normalize and deny `//`, full URLs. | 0.5 day | P1 |
| ZX-010 | High | Database policy | `docs/sql/v3_knowledge_embeddings.sql` | Grants full CRUD on `knowledge_embeddings` to anon/authenticated. | Data poisoning or deletion if applied live. | Anonymous user inserts malicious RAG content. | Revoke public write/delete; service/admin-only writes; public read only if content is non-sensitive. | 0.5 day | P1 |
| ZX-011 | Medium | Query injection/DoS | `lib/supabase/queries/articles.ts`, `cves.ts` | User query interpolated into Supabase `.or(...)`. | Query errors, filter manipulation, expensive scans. | Crafted search string breaks or broadens filter. | Escape PostgREST filter syntax or move to RPC/FTS. | 1 day | P1 |
| ZX-012 | Medium | Build integrity | `next.config.ts` | `typescript.ignoreBuildErrors: true`. | Broken/security-relevant type errors can ship. | Regression passes build despite TS failures. | Set false; fix type errors. | 1-3 days | P1 |
| ZX-013 | Medium | Docker deploy | `zayron-x/Dockerfile`, `package.json` | Docker runs `bun run start`; package has no `start` script. | Container deployment fails. | VPS Docker image starts and exits. | Add correct `start` script or change CMD. | 0.5 day | P2 |
| ZX-014 | Medium | Health disclosure | `app/api/status/route.ts` | Public health endpoint checks Supabase, Redis, KV, Gemini and returns detailed statuses. | Dependency fingerprinting. | Attacker learns outage/dependency state and targets weak link. | Keep public simple; move detailed checks behind admin/monitoring token. | 0.5 day | P2 |
| ZX-015 | Medium | AI trust chain | `workers/omni_crew.py` | Prompt permits synthesizing missing telemetry. | False intelligence and customer trust loss. | AI invents CVSS/vendor/impact details. | Separate observed facts from estimates; require provenance. | 3-7 days | P1 |

## 16. High Priority Fixes

1. Replace public `articles` table exposure with public-safe views and remove premium fields from public APIs.
2. Remove all `user_metadata`/`raw_user_meta_data` authorization checks.
3. Remove `.env` from build artifacts and rotate keys if artifacts may have been exposed.
4. Sanitize or disallow stored HTML before render.
5. Fix CSP to remove `unsafe-inline` and `unsafe-eval` for scripts.
6. Split public and authenticated cache behavior.
7. Add rate limits to all public and premium endpoints.
8. Replace `knowledge_embeddings` public write grants.
9. Validate auth callback redirects.
10. Make TypeScript build errors fail production builds.

## 17. Medium Priority Fixes

1. Add hard `limit` caps for public APIs.
2. Replace `ilike` search with indexed FTS/RPC.
3. Add missing DB indexes and constraints.
4. Add RLS/security tests.
5. Add DLQ and retry counters to raw feed processing.
6. Fix Docker `start` mismatch.
7. Remove or clearly label mock admin fallbacks.
8. Add Cloudflare WAF/rate-limit rules.
9. Normalize encoding and remove mojibake.
10. Add dependency audit to CI.

## 18. Low Priority Fixes

1. Clean duplicate/outdated SQL files after live schema is verified.
2. Consolidate root/app package management story.
3. Improve report UX copy and trust signals.
4. Add API versioning scaffold.
5. Add public API docs only after auth/quota model exists.
6. Improve PWA offline strategy.
7. Add data retention docs.
8. Add generated report style/eval dashboards.
9. Improve internal architecture diagrams.
10. Reduce unused/dead files from scratch/build output.

## 19. 30-Day Roadmap

### Week 1: Critical security and build stability

| Task | Objective | Files likely involved | Impact | Risk | Effort | Validation command | Done criteria |
|---|---|---|---|---|---|---|---|
| Public-safe article access | Stop premium leaks. | `lib/supabase/queries/articles.ts`, SQL migrations, API routes | Critical security improvement | Schema migration risk | 2-3 days | RLS/API tests | Anon cannot read premium columns. |
| Admin auth cleanup | Remove metadata-based admin auth. | `middleware.ts`, SQL policy files | Prevent privilege escalation | Requires live role migration | 1 day | Auth/RLS tests | Only protected role source grants admin. |
| Stored HTML hardening | Prevent stored XSS. | `ArticleBody.tsx`, ingestion/persistence sanitizer | XSS reduction | Content rendering changes | 1 day | XSS fixtures | Malicious HTML is neutralized. |
| CSP fix | Enforce browser-level defense. | `next.config.ts`, `middleware.ts` | XSS mitigation | Inline scripts/styles may break | 1-2 days | Playwright + CSP report | No unsafe script directives. |
| Secret artifact cleanup | Prevent credential leakage. | `.gitignore`, build config, CI | Critical ops hygiene | Key rotation needed | 0.5-1 day | Secret scan | No env files in build outputs or git. |
| TypeScript build gate | Stop shipping type errors. | `next.config.ts`, TS fixes | Build confidence | May reveal many errors | 1-3 days | `bun run type-check && bun run build` | Build fails on TS errors and passes cleanly. |

### Week 2: Database, RLS, API hardening

| Task | Objective | Files likely involved | Impact | Risk | Effort | Validation command | Done criteria |
|---|---|---|---|---|---|---|---|
| Live schema dump | Verify actual Supabase state. | Supabase CLI/MCP output | Removes guesswork | Needs access | 0.5 day | `supabase db dump`/advisor | Audited live policies. |
| Index pass | Improve DB performance. | SQL migrations | Faster public APIs | Locking if not concurrent | 1-2 days | `EXPLAIN` on key queries | Key queries use indexes. |
| API validation | Add schemas/caps. | `app/api/**/route.ts` | Abuse reduction | Minor breaking changes | 1-2 days | Unit/API tests | Invalid input returns 400. |
| Rate limits | Cover exposed APIs. | `lib/cache/ratelimit.ts`, routes | Cost/abuse control | Redis dependency | 1 day | Unit tests | All public expensive routes limited. |
| Cache policy split | Prevent subscriber cache leaks. | API routes/pages | Security and perf | Requires endpoint design | 1 day | Cache tests | Public responses never vary by subscriber state. |

### Week 3: Workers, AI cost, report quality

| Task | Objective | Files likely involved | Impact | Risk | Effort | Validation command | Done criteria |
|---|---|---|---|---|---|---|---|
| DLQ/retry model | Make ingestion reliable. | `workers/persistence.py`, SQL | Better operations | Migration complexity | 2 days | Worker tests | Failed items have retry count/DLQ. |
| Provenance model | Tie claims to evidence. | Workers, schema | CTI credibility | Data model change | 3 days | AI eval fixtures | Reports show source and confidence. |
| Prompt rewrite | Reduce hallucination. | `workers/omni_crew.py` | Better trust | Output changes | 1-2 days | Eval suite | Missing data stays unknown/estimated clearly. |
| AI budget controls | Control costs. | `omni_crew.py`, Redis config | Cost stability | False throttling | 1 day | Quota tests | Per-source/per-day limits enforced. |
| Search strategy | Improve scale. | SQL, query modules | Faster search | Migration needed | 2 days | Load/query tests | FTS search replaces `ilike` scans. |

### Week 4: Product polish, monitoring, demo readiness

| Task | Objective | Files likely involved | Impact | Risk | Effort | Validation command | Done criteria |
|---|---|---|---|---|---|---|---|
| Monitoring dashboards | Improve incident visibility. | Sentry/Cloudflare/Upstash docs/config | Ops readiness | Needs external access | 1-2 days | Synthetic check | Alerts fire on failures. |
| Deployment smoke tests | Catch broken deploys. | CI workflows, Playwright | Release confidence | CI time | 1 day | GitHub workflow | Preview smoke passes. |
| Admin mock cleanup | Avoid operator deception. | `app/admin/**` | Trust | UI changes | 1 day | Manual QA | DB failures show explicit degraded state. |
| Billing entitlement QA | Harden paid access. | Billing routes, profiles SQL | SaaS readiness | Stripe test setup | 1-2 days | Stripe test events | Entitlements update correctly. |
| Launch checklist | Make go/no-go concrete. | Docs | Readiness | None | 0.5 day | Checklist review | Owner can verify launch criteria. |

## 20. Final CTO Summary

### Is this project serious or experimental?

ZAYRON-X is serious in scope and architecture, but still experimental in production security and reliability. It has a real SaaS shape: Next.js app, Supabase, Stripe, Cloudflare, workers, ingestion, AI pipeline, tests, and CI/CD. The remaining gaps are not cosmetic; they are boundary, trust, and operational correctness issues.

### Strongest parts

1. Clear product ambition and architecture around CTI SaaS.
2. Next.js/Cloudflare edge deployment path exists.
3. Supabase Auth and RLS work has been considered.
4. Python worker ingestion layer is substantial.
5. AI pipeline uses schema validation and deterministic IOC extraction.
6. Stripe integration is real and signature verification exists.
7. CI/CD with lint/type/unit/build/deploy/canary exists.
8. Sentry and health checks are present.
9. Domain-specific UI is well developed.
10. Documentation/audit artifacts are unusually extensive.

### Weakest parts

1. Security source of truth is inconsistent.
2. Public/private data separation is not clean enough.
3. Stored HTML rendering is unsafe unless sanitized upstream.
4. CSP is weaker than comments claim.
5. Service-role access is too broadly used.
6. Live infrastructure state is not verified.
7. Worker queue lacks production-grade DLQ/retry observability.
8. AI factuality/provenance is insufficient for a CTI product.
9. TypeScript build errors are ignored.
10. Environment/build artifact hygiene needs immediate cleanup.

### Top 10 risks

1. Premium intelligence leakage through public table/API access.
2. Admin privilege escalation through user-editable metadata.
3. Secret exposure through env files/build artifacts.
4. Stored XSS from AI/ingested HTML.
5. Permissive CSP allowing script execution.
6. Public cache leak of subscriber-aware data.
7. Service-role route compromise causing full database access.
8. Public API abuse/cost spikes due to missing rate limits.
9. AI hallucinated intelligence damaging credibility.
10. Deployment mismatch or broken production config.

### Top 10 fixes

1. Public-safe views and revoked sensitive table/column access.
2. Protected role model using app metadata or locked profile role.
3. Secret scan, artifact cleanup, and key rotation if needed.
4. HTML sanitization/rendering redesign.
5. Strict CSP.
6. Cache split for public/private responses.
7. Service-role minimization.
8. Route-wide validation and rate limits.
9. Worker DLQ/retry/provenance model.
10. CI hardening with type/build/e2e/security gates.

### What should not be touched yet

- Do not rewrite the entire app architecture.
- Do not migrate away from Supabase until security boundaries are fixed.
- Do not add public API monetization before API auth/quota exists.
- Do not expand AI features before provenance and output validation improve.
- Do not scale feed volume until queue/DLQ/cost controls are implemented.

### What should be deleted or simplified

- Remove or archive outdated/mock SQL files after live schema is verified.
- Remove mock admin operational fallbacks or label them visibly as degraded.
- Remove generated/built artifacts from the repo if committed.
- Remove duplicate root/app dependency ambiguity where possible.
- Remove direct HTML rendering unless sanitized and tested.

### Improvements for first users

- Reliable public article/CVE browsing.
- Clear subscriber boundaries.
- Trustworthy report provenance.
- Stable billing/entitlement flow.
- Accurate status/degraded-state messaging.

### Improvements before paid users

- Fix P0 security issues.
- Add entitlement tests.
- Add no-leak cache tests.
- Add subscriber quota/rate limits.
- Add support/audit logs for account and billing events.

### Improvements before investors or companies see it

- Live security posture evidence.
- Clean CI/CD and deployment story.
- Real CTI provenance and quality controls.
- No mock/fallback operational dashboards.
- Documented uptime, incident response, and rollback.

### Realistic scores

| Dimension | Score |
|---|---:|
| Production readiness | 5.5/10 |
| Security readiness | 4.5/10 |
| Scalability readiness | 5/10 |
| Business readiness | 5.5/10 |

Final assessment: this is a promising but not-yet-production-grade cybersecurity SaaS. The next phase should be a security and reliability hardening sprint, not feature expansion.
