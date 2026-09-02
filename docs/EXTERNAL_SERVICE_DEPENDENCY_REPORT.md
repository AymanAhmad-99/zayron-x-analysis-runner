# ZAYRON-X — EXTERNAL SERVICE DEPENDENCY REPORT
**Date:** 2026-09-01 | **Classification:** Infrastructure Audit

---

## PURPOSE

This report audits every external service dependency (non-Cloudflare, non-npm) that the application makes runtime network calls to.

---

## EXTERNAL SERVICES SCAN

### Third-Party Hosting Platforms
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| Vercel | YES | NO (gitignore artifact only) | CLEAN |
| Netlify | YES | NO | CLEAN |
| Heroku | YES | NO | CLEAN |
| Railway | YES | NO | CLEAN |
| Fly.io | YES | NO | CLEAN |
| Render | YES | NO | CLEAN |

### External Auth Providers
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| Clerk | YES | NO | CLEAN |
| Auth0 | YES | NO | CLEAN |
| NextAuth | YES | NO | CLEAN |
| Passport.js | YES | NO | CLEAN |

**Auth status confirmed:** `apps/web/app/login/page.tsx` explicitly states "Authentication is not enabled here. No verified auth provider, session flow, or login endpoint is present."

### External AI Providers
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| OpenAI | YES | NO | CLEAN |
| Anthropic | YES | NO | CLEAN |
| Cohere | YES | NO | CLEAN |
| Hugging Face (external API) | YES | NO | CLEAN |

**AI in use:** Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`, `@cf/baai/bge-base-en-v1.5`) — edge-native, zero external AI calls.

### External Vector Databases
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| Pinecone | YES | NO | CLEAN |
| Weaviate | YES | NO | CLEAN |
| Qdrant | YES | NO | CLEAN |
| Chroma | YES | NO | CLEAN |
| Meilisearch | YES | NO | CLEAN |

**Vector DB in use:** Cloudflare Vectorize (`env.VECTORIZE`) — Cloudflare-native.

### External Observability
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| Sentry | YES | DELETED | REMEDIATED |
| Datadog | YES | NO | CLEAN |
| New Relic | YES | NO | CLEAN |
| Grafana Cloud | YES | NO | CLEAN |
| Logtail | YES | NO | CLEAN |

**Observability in use:** Cloudflare native observability (`[observability] enabled = true`) in `apps/web/wrangler.toml`.

### Email / Messaging Services
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| Resend | YES | NO | CLEAN |
| SendGrid | YES | NO | CLEAN |
| Mailgun | YES | NO | CLEAN |
| Twilio | YES | NO | CLEAN |

**Messaging in use:** Telegram Bot API (outbound alerts only — Cloudflare Queue consumer sends to Telegram).

### Cloud Storage
| Service | Searched | Found | Status |
|---------|---------|-------|--------|
| AWS S3 | YES | NO | CLEAN |
| Google Cloud Storage | YES | NO | CLEAN |
| Azure Blob | YES | NO | CLEAN |

**Storage in use:** Cloudflare R2 (`env.KNOWLEDGE_BUCKET`, `env.KNOWLEDGE_PROCESSOR`) — S3-compatible API via Cloudflare.

---

## CONFIRMED ACTIVE EXTERNAL CALLS (PERMITTED)

| Endpoint | Purpose | Called From | Status |
|----------|---------|-------------|--------|
| `https://services.nvd.nist.gov/` | NVD vulnerability API | `workers/nvd-candidate-trigger` | PERMITTED — public data source |
| `https://api.telegram.org/` | Telegram Bot API | `packages/intelligence/src/social/distribution.ts` | PERMITTED — outbound alerts |
| `https://t.me/` | MTProto Telegram | `workers/telegram-collector-do` | PERMITTED — data collection |
| Cloudflare Workers AI | AI inference | `workers/api`, `workers/ingest` | INTERNAL — Cloudflare native |
| Cloudflare Vectorize | Vector search | `workers/api`, `workers/ingest` | INTERNAL — Cloudflare native |
| Cloudflare D1 | Database | All workers | INTERNAL — Cloudflare native |

---

## VERDICT: CLEAN — No unauthorized external service dependencies. All non-Cloudflare calls are to permitted data sources (NVD, Telegram).
