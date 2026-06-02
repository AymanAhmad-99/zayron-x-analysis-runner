# PROMPT 5 — Observability Architecture Implementation

**Date:** 2026-06-02  
**Author:** Claude Opus 4.8 (Cloudflare Observability Architect)  
**Branch:** `production`  
**Status:** ✅ Complete — all 6 tasks delivered

---

## Executive Summary

ZAYRON-X had Sentry configured but not activated, no log aggregation pipeline,
no status page, no alerting rules, and incomplete Wrangler environments.
This implementation activates the full observability stack: error tracking
(Sentry), log aggregation (Logpush → R2), health monitoring (status page),
alerting rules (7 alerts), and production-ready Wrangler environments.

---

## 1. Sentry Activation

### Files Changed

| File | Change |
|---|---|
| `sentry.config.shared.ts` | Rewrote with DSN validation, startup warning, environment tagging, `/api/status` and `/api/monitoring` added to `ignoreTransactions` |
| `.env.example` | Added `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` with wrangler secret commands |
| `wrangler.toml` | Added `wrangler secret put NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to secrets documentation |

### Architecture

```
┌─────────────────────────────────────────────────┐
│  sentry.config.shared.ts (imported by all 3)    │
│  ┌───────────────────────────────────────────┐  │
│  │ DSN: NEXT_PUBLIC_SENTRY_DSN               │  │
│  │ tracesSampleRate: 0.1 (default)           │  │
│  │ profilesSampleRate: 0.1                   │  │
│  │ enabled: !dev && DSN.length > 0           │  │
│  │ environment: NODE_ENV                     │  │
│  └───────────────────────────────────────────┘  │
└──────────┬──────────┬──────────┬────────────────┘
           │          │          │
    ┌──────▼───┐ ┌───▼────┐ ┌──▼──────────┐
    │  CLIENT   │ │ SERVER │ │    EDGE      │
    │  0.1 rate │ │ 0.05   │ │   0.05 rate  │
    │ + Replay  │ │ + Prof │ │   minimal    │
    └───────────┘ └────────┘ └──────────────┘
```

### Sample Rates

| Runtime | tracesSampleRate | profilesSampleRate | Rationale |
|---|---|---|---|
| Client (browser) | 0.1 (10%) | 0.1 (10%) | Enough to capture UX regressions |
| Server (Node.js) | 0.05 (5%) | 0.05 (5%) | Controls cost on high-volume API routes |
| Edge (Worker) | 0.05 (5%) | — | Stateless, short-lived; keep minimal |

### Startup Validation

The shared config now validates the DSN at import time:
- **Dev mode:** Sentry disabled (no noise during development)
- **Production with DSN:** Sentry fully enabled
- **Production without DSN:** Warning logged to console, Sentry disabled

```
[SENTRY] NEXT_PUBLIC_SENTRY_DSN is not set — error reporting is DISABLED.
  Upload it with: wrangler secret put NEXT_PUBLIC_SENTRY_DSN
```

### Required Secrets

```bash
wrangler secret put NEXT_PUBLIC_SENTRY_DSN
wrangler secret put SENTRY_AUTH_TOKEN
```

The `SENTRY_AUTH_TOKEN` is already wired in CI (`ci.yml` line 127) and in
`next.config.ts` via `withSentryConfig()` for source-map uploads.

---

## 2. Logpush — Worker Logs → R2

### New File

**`docs/LOGPUSH_SETUP.md`** — Complete step-by-step guide covering:

1. **R2 bucket creation** (`zayron-x-logs`)
2. **Worker trace events** Logpush job — exceptions, logs, CPU/wall time per request
3. **HTTP request logs** Logpush job — edge-level request metadata (if DNS-proxied)
4. **Verification commands** — list jobs, check health, inspect R2 objects
5. **Lifecycle policy** — 90-day auto-deletion for cost control
6. **Troubleshooting table** — 5 common failure modes with fixes

### Log Data Flow

```
Cloudflare Worker
  │
  ├── workers_trace_events ──→ Logpush (every ~5 min) ──→ R2: zayron-x-logs/worker-logs/{DATE}/
  │   (exceptions, logs, CPU ms, wall-time ms, request metadata)
  │
  └── http_requests (if DNS proxied) ──→ Logpush ──→ R2: zayron-x-logs/http-logs/{DATE}/
      (ClientIP, Country, Cache status, Origin duration, Security level)
```

**Retention:** 90 days, then auto-purge via R2 lifecycle policy.

---

## 3. Wrangler Environments

### File Changed

**`wrangler.toml`** — Complete rewrite with full environment configuration.

### Structure

```toml
# Top-level (defaults)
[vars]
NEXT_PUBLIC_SITE_URL = "https://zayron-x.com"
NEXT_PUBLIC_SITE_NAME = "ZAYRON-X"

[observability]
enabled = true
head_sampling_rate = 0.1

# ── Production ──
[env.production]
name = "zayron-x-production"
routes = [
  { pattern = "zayron-x.com", custom_domain = true },
  { pattern = "www.zayron-x.com", custom_domain = true },
]
[[env.production.kv_namespaces]]
binding = "ZAYRON_CACHE"
id = "c5704144e6984dd597e2f000a1e84aa2"
[env.production.vars]
NEXT_PUBLIC_SITE_URL = "https://zayron-x.com"
NEXT_PUBLIC_SITE_NAME = "ZAYRON-X"

# ── Preview ──
[env.preview]
name = "zayron-x-preview"
workers_dev = true
[[env.preview.kv_namespaces]]
binding = "ZAYRON_CACHE"
id = "834e78268ee0457196ecf48026b06ece"
[env.preview.vars]
NEXT_PUBLIC_SITE_URL = "https://preview.zayron-x.workers.dev"
NEXT_PUBLIC_SITE_NAME = "ZAYRON-X [PREVIEW]"
```

### Key Additions

| Feature | Before | After |
|---|---|---|
| `[vars]` | Missing | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME` |
| `[observability]` | Missing | `enabled: true`, `head_sampling_rate: 0.1` |
| `[env.production]` | KV only | KV + routes + vars |
| `[env.preview]` | KV only | KV + workers_dev + vars |
| Secrets docs | 14 secrets | 16 secrets (+ `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) |
| Preview secrets note | Missing | Added `--env preview` documentation |

---

## 4. Alerting Rules

### New File

**`docs/ALERTING_RULES.md`** — 7 production alerts with runbooks.

### Alert Summary

| # | Alert | Severity | Source | Threshold |
|---|---|---|---|---|
| 1 | **Error Rate Spike** | Critical | Sentry + CF Analytics | >5% errors over 5 min |
| 2 | **P95 Latency >2s** | Warning → Critical | CF Analytics + Sentry | P95 >2000ms for 15 min |
| 3 | **CPU/Memory Throttling** | Warning | CF Workers Analytics | Avg CPU >30ms over 10 min |
| 4 | **DB Connection Exhaustion** | Critical | Supabase Dashboard | >80% pool capacity for 5 min |
| 5 | **Redis Circuit Breaker Open** | Critical | App logs → Sentry | >10 circuit-breaker events in 5 min |
| 6 | **KV Cache Miss Rate Spike** | Warning | CF Workers Analytics | >30% miss rate over 15 min |
| 7 | **Impossible Travel Detection** | Critical | Custom instrumentation → Sentry | >1000km between requests within 5 min |

Each alert includes:
- **Condition** — exact metric, threshold, window
- **Sentry Alert Rule config** — copy-pasteable JSON/UI instructions
- **Runbook** — step-by-step triage and remediation
- **Escalation path** — Slack → PagerDuty → email

### Routing Matrix

| Alert | Slack | PagerDuty | Email |
|---|---|---|---|
| Error Rate | `#zayron-x-alerts` | Critical (immediate) | — |
| P95 Latency | `#zayron-x-ops` | Critical (after 10 min) | — |
| CPU Throttling | `#zayron-x-ops` | — | ops@ |
| DB Connections | `#zayron-x-alerts` | Critical (immediate) | dba@ |
| Redis Circuit Breaker | `#zayron-x-alerts` | Critical (immediate) | — |
| KV Miss Rate | — | — | ops@ |
| Impossible Travel | `#zayron-x-security` | Critical (immediate) | security@ |

### Alert #7 — Impossible Travel (Implementation Note)

This is a **custom instrumentation** alert (not off-the-shelf). The runbook
includes pseudocode for `middleware.ts` that:
1. Reads `cf-ipcountry` from the request header
2. Compares against the user's last known country stored in Redis
3. Fires a Sentry event if the distance exceeds 1000 km within 5 minutes

Full implementation is deferred to a follow-up PR — the infrastructure
(Redis geo-key, Sentry custom event) is documented and ready.

---

## 5. Status Page

### New Files

| File | Purpose |
|---|---|
| `app/api/status/route.ts` | Health-check API endpoint for all 5 dependencies |
| `app/(site)/status/page.tsx` | Client-side status dashboard with auto-refresh |

### Modified Files

| File | Change |
|---|---|
| `components/layout/Footer.tsx` | Added "Infrastructure" column with Platform Status link (green dot indicator) |

### API Endpoint: `GET /api/status`

Checks 5 services concurrently:

```json
{
  "timestamp": "2026-06-02T19:30:00.000Z",
  "overall": "healthy",
  "uptime_seconds": 12345,
  "checks": {
    "worker":   { "status": "healthy",   "latencyMs": 0,    "message": "Responding" },
    "supabase": { "status": "healthy",   "latencyMs": 45.2,  "message": null },
    "redis":    { "status": "healthy",   "latencyMs": 12.8,  "message": null },
    "kv":       { "status": "healthy",   "latencyMs": 3.1,   "message": null },
    "gemini":   { "status": "unknown",   "latencyMs": 0,     "message": "GEMINI_API_KEY not configured" }
  }
}
```

**Response headers:**
- `X-Health-Overall`, `X-Health-Supabase`, `X-Health-Redis`, `X-Health-KV`, `X-Health-Gemini`
- `Cache-Control: no-store` (always fresh)

**HTTP status codes:**
- `200` — healthy or degraded
- `503` — unhealthy (at least one critical service unreachable)

### Check Methodology

| Service | Method | Timeout | Status Logic |
|---|---|---|---|
| **Worker** | Trivial (responded) | — | Always `healthy` if response received |
| **Supabase** | `GET /rest/v1/` with anon key | 3s | `healthy` if 200, `degraded` if non-200, `unhealthy` on error |
| **Redis** | Upstash REST `PING` | 2s | `healthy` if PONG, `unknown` if not configured |
| **KV** | `put` + `get` health-check key via binding | — | `healthy` on success, `unknown` in local dev, `degraded` if binding missing on Workers |
| **Gemini** | `GET /v1beta/models` (no quota cost) | 5s | `healthy` if 200, `unknown` if key not configured |

### Status Page UI

- **Dark theme** (`bg-slate-950`) matching ZAYRON-X military/intelligence branding
- **Overall status banner** at top with green/amber/red indicator
- **Service cards grid** (3 columns on desktop, 2 on tablet, 1 on mobile)
- **Per-service details:** icon, description, status badge, latency (color-coded), error message
- **Auto-refresh:** every 60 seconds via `setInterval` + manual refresh button
- **Worker uptime** displayed in days/hours/minutes/seconds
- **Incident history** section with link to external Statuspage
- **Navigation:** "← ZAYRON-X HOME" breadcrumb at top
- **Footer link:** Green dot + "Platform Status" in the new "Infrastructure" column

### Footer Changes

The Footer now has 5 columns (was 4):
1. Corporate
2. Compliance
3. Operations
4. Legal
5. **Infrastructure** ← NEW — Platform Status link, API version, Edge runtime info

Grid updated: `lg:grid-cols-4` → `lg:grid-cols-5`.

---

## 6. Files Changed Summary

```
NEW:
  docs/LOGPUSH_SETUP.md           ← Log aggregation pipeline setup
  docs/ALERTING_RULES.md          ← 7 production alerts with runbooks
  app/api/status/route.ts         ← Health-check API endpoint
  app/(site)/status/page.tsx      ← Status dashboard (client component)

MODIFIED:
  sentry.config.shared.ts         ← DSN validation, env tagging, startup warning
  .env.example                    ← +NEXT_PUBLIC_SENTRY_DSN, +SENTRY_AUTH_TOKEN
  wrangler.toml                   ← +[vars], +[observability], complete [env.*]
  components/layout/Footer.tsx    ← +Infrastructure column, /status link

UNCHANGED:
  sentry.client.config.ts         ← Already correct (0.1 rate, Replay)
  sentry.server.config.ts         ← Already correct (0.05 rate, profiling)
  sentry.edge.config.ts           ← Already correct (0.05 rate)
  next.config.ts                  ← Already correct (withSentryConfig wrapper)
  middleware.ts                   ← Already correct (CSP nonce, rate limiting)
```

---

## Deployment Checklist

Before deploying to production:

- [ ] **Sentry DSN:** `wrangler secret put NEXT_PUBLIC_SENTRY_DSN`
- [ ] **Sentry Auth Token:** `wrangler secret put SENTRY_AUTH_TOKEN`
- [ ] **Preview secrets:** Repeat the above with `--env preview`
- [ ] **R2 bucket:** `wrangler r2 bucket create zayron-x-logs`
- [ ] **Logpush jobs:** Run the curl commands in `docs/LOGPUSH_SETUP.md`
- [ ] **Sentr Alert Rules:** Configure 7 alerts in Sentry UI per `docs/ALERTING_RULES.md`
- [ ] **Supabase alert:** Configure DB connection alert in Supabase Dashboard
- [ ] **Status page:** Deploy and verify `GET /api/status` returns 200
- [ ] **Status page:** Verify `GET /status` renders the dashboard
- [ ] **Footer:** Verify `/status` link appears in the Infrastructure column

---

## Security Notes

- **Sentry DSN is public-safe** (it's a DSN, not an API key) — however, it's stored as a Worker secret to avoid leaking the Sentry org/project ID in client-side bundles of preview deployments
- **SENTRY_AUTH_TOKEN has `project:releases` scope** — minimum required for source-map uploads. Never grant `org:admin` or `project:admin`
- **Health endpoint** (`/api/status`) does NOT expose connection strings, keys, or internal IPs — only latency and status indicators
- **Logpush to R2** uses a Cloudflare API token with scoped `Logs:Write` + `R2:Write` permissions — not the global API key
