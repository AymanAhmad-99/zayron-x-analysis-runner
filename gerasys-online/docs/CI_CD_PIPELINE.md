# ZAYRON-X CI/CD Pipeline Documentation

## Overview

The ZAYRON-X CI/CD pipeline is powered by **GitHub Actions** and enforces quality gates at every change. The pipeline runs on every push and pull request to `main` and `production` branches.

## Pipeline Architecture

```
Pull Request / Push
       │
       ▼
┌──────────────────┐
│  secrets-scan    │  ← truffleHog (verified secrets = FAIL)
│  dependency-audit│  ← Dependency Review + Dependabot
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────────┐
│ lint │  │type-check│   ← Parallel (Biome + tsc)
└──┬───┘  └────┬─────┘
   │            │
   └─────┬──────┘
         ▼
┌──────────────┐
│ unit-tests    │          ← Sequential (needs type-check)
│ (Vitest)      │
└──────┬───────┘
       │
┌──────┴───────┐
│ bundle-size  │           ← Compares against baseline, warns >10%
└──────┬───────┘
       │
  ┌────┴─────┐
  ▼          ▼
┌──────┐  ┌──────────┐
│deploy│  │e2e-tests │     ← PR only (Playwright)
│preview│ └──────────┘
└──────┘
       │
       ▼ (on push to production)
┌──────────────┐
│ deploy:      │
│ production   │            ← Production only, after all gates
│ (CANARY)     │            ← Gradual: 10% → 25% → 50% → 100%
│ + health     │            ← Sentry error-rate check after each stage
│ + auto-roll  │            ← wrangler rollback if canary fails
└──────────────┘
```

## Job Descriptions

| # | Job | Trigger | Timeout | Retry | What It Does |
|---|---|---------|---------|-------|-------------|
| 1 | **secrets-scan** | Always | 10 min | — | Scans full git history with truffleHog for leaked API keys, tokens, passwords. **Fails the build** if any verified secret is found. |
| 2 | **dependency-audit** | Always | 10 min | — | PR diff check via GitHub Dependency Review (fails on critical CVEs). Full lockfile audit via Dependabot. |
| 3 | **lint** | Always | 5 min | — | Runs Biome across all files — ensures formatting and linting rules are met |
| 4 | **type-check** | Always | 5 min | — | Runs `tsc --noEmit` — verifies full TypeScript compilation |
| 5 | **unit-tests** | Always | 10 min | — | Runs Vitest against `__tests__/unit/**` — tests pure logic with mocked DB |
| 6 | **bundle-size** | Always | 15 min | — | Builds project, measures `.open-next/` size, compares against baseline. **Warns >10% increase**, **fails >15% on production** |
| 7 | **e2e-tests** | PR only | 20 min | — | Runs Playwright against a built preview — verifies real pages render |
| 8 | **deploy-preview** | PR only | 15 min | — | Deploys to Cloudflare Workers preview environment via `wrangler deploy --env preview` |
| 9 | **deploy-production (CANARY)** | Push to `production` | 45 min | — | Deploys to Cloudflare Workers with gradual deployment (10%→25%→50%→100%). Runs Sentry health check after each stage. **Auto-rolls back** on health check failure. |

## Canary Deployment Architecture

```
Deploy to Production (Commit ABC)
  │
  ├─ Stage 1: 10% of traffic → new version (5 min monitor)
  │     └─ Health check: Sentry error rate <1%? → Continue / Rollback
  │
  ├─ Stage 2: 25% of traffic → new version (10 min monitor)
  │     └─ Health check: Sentry error rate <1%? → Continue / Rollback
  │
  ├─ Stage 3: 50% of traffic → new version (15 min monitor)
  │     └─ Health check: Sentry error rate <1%? → Continue / Rollback
  │
  └─ Stage 4: 100% of traffic → new version
        └─ Full rollout complete. All users on commit ABC.
```

If any stage health check fails, `scripts/rollback.sh` runs `wrangler rollback` to immediately revert to the previous deployment.

## Local Development Commands

```bash
# Install dependencies
bun install --frozen-lockfile

# Secrets scanning (local)
bunx trufflehog git file://. --only-verified

# Lint (check only)
bun run lint

# Lint + auto-fix
bun run lint:fix

# TypeScript type checking
bun run type-check

# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# E2E tests (requires Playwright browsers)
bunx playwright install --with-deps chromium
bun run test:e2e

# All tests
bun run test:all

# Build for production
bun run build

# Bundle analysis
bun run analyze

# Deploy preview
bun run deploy:preview

# Deploy production
bun run deploy:production

# Rollback production
bash scripts/rollback.sh

# Canary health check (standalone)
bash scripts/canary-health-check.sh
```

## Environment Strategy

| Environment | Wrangler Env | Branch | URL |
|------------|-------------|--------|-----|
| **Local** | (none) | any | http://localhost:3000 |
| **Preview** | `preview` | PR branch | Cloudflare preview URL |
| **Production** | `production` | `production` | https://zayron-x.com |

## Required GitHub Secrets

These must be configured in `Settings → Secrets and variables → Actions`:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers deploy + edit scope |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `DATABASE_URL` | PostgreSQL connection string (for production deploy) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for production deploy) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (for source map upload + canary health check) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (for production build with error reporting) |

## Required Repository Secrets (wrangler.toml)

Deployed via `wrangler secret put` on both production and preview:

```
SUPABASE_SERVICE_ROLE_KEY    DATABASE_URL
SUPABASE_URL                 SUPABASE_ANON_KEY
REDIS_URL                    REDIS_TOKEN
RESEND_API_KEY               ADMIN_USER
ADMIN_PASSWORD               REVALIDATION_SECRET
NVD_API_KEY                  GEMINI_API_KEY
TELEGRAM_API_ID              TELEGRAM_API_HASH
NEXT_PUBLIC_SENTRY_DSN       SENTRY_AUTH_TOKEN
```

## Monitoring

Sentry is integrated at three layers:
- **Client** (`sentry.client.config.ts`) — React errors, browser performance
- **Server** (`sentry.server.config.ts`) — API errors, DB timeouts
- **Edge** (`sentry.edge.config.ts`) — Middleware failures, cold-start latency

Set `NEXT_PUBLIC_SENTRY_DSN` in your environment to activate.

Canary health checks use the Sentry API (`/api/0/projects/{org}/{project}/stats/`) to monitor error rates during gradual rollouts.

## Adding New Checks

1. Add the script to `package.json` `scripts` block
2. Add a new job to `.github/workflows/ci.yml`
3. Set appropriate `needs` dependencies for parallel/sequential execution
4. Add `timeout-minutes` based on job complexity (5 min for lint, 15 min for build, etc.)
5. If the check is blocking, ensure it `needs` the appropriate upstream jobs
