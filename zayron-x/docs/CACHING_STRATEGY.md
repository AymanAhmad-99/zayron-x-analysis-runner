# ZAYRON-X Multi-Tier Caching Strategy

**Date**: 2026-06-02
**Architecture**: 4-Tier (CDN → KV → Redis → PostgreSQL)

---

## Tier Overview

| Tier | Technology | Latency | TTL Range | Use Case |
|------|-----------|---------|-----------|----------|
| 1 | Cloudflare CDN | <5ms | 30-3600s | Static/dynamic API responses at edge |
| 2 | Cloudflare KV | <20ms | 60-3600s | ISR pages (revalidate), tag-cache |
| 3 | Upstash Redis | 10-50ms | 30-3600s | CVE feed cache, search results |
| 4 | Supabase PostgreSQL | 50-200ms | N/A | Ultimate source of truth |

---

## API Route Cache Headers (Fully Standardized)

| Route | Method | Cache-Control | TTL | stale-while-revalidate |
|-------|--------|---------------|-----|----------------------|
| `/api/articles` | GET | `public, s-maxage=60, stale-while-revalidate=300` | 60s | 300s |
| `/api/articles/[slug]` | GET | `public, s-maxage=120, stale-while-revalidate=600` | 120s | 600s |
| `/api/cves` | GET | `public, s-maxage=60, stale-while-revalidate=120` | 60s | 120s |
| `/api/search` | GET | `public, s-maxage=30, stale-while-revalidate=60` | 30s | 60s |
| `/api/rss` | GET | `public, max-age=3600, stale-while-revalidate=300` | 3600s | 300s |
| `/api/og` | GET | `public, s-maxage=86400, stale-while-revalidate=3600` | 86400s | 3600s |
| `/api/db-status` | GET | `no-store` | 0 | N/A |
| `/api/remediate` | POST | `no-store` | 0 | N/A |
| `/api/download-sitrep` | GET | `no-store` | 0 | N/A |
| `/api/subscribe` | POST | `no-store` | 0 | N/A |
| `/api/views/[id]` | POST | `no-store` | 0 | N/A |
| `/api/seed-analysts` | POST | `no-store` | 0 | N/A |
| `/api/revalidate` | POST | `no-store` | 0 | N/A |

All cacheable GET responses include `CDN-Cache-Control` headers.
All error responses (400, 401, 404, 429, 500) include `Cache-Control: no-store`.

---

## Page-Level Revalidation

| Page | revalidate | Strategy |
|------|-----------|----------|
| `/` (Homepage) | 60 | ISR via KV — regen every 60s |
| `/intelligence/[category]` | 0 | force-dynamic — always server-rendered |
| `/intelligence/[category]/[slug]` | 0 | force-dynamic — always server-rendered |
| `/cve` | 0 | force-dynamic |
| `/tools` | 0 | force-dynamic |
| `/news` | 60 | unstable_cache with ISR |
| `/analysts` | 3600 | Static-like — hourly regen |
| `/search` | 0 | force-dynamic |
| `/dark-web-recon` | 0 | force-dynamic |

---

## Redis Caching (Tier 3)

| Cache Key Pattern | TTL | Circuit Breaker |
|-------------------|-----|-----------------|
| `cves:feed:p_*:l_*:s_*` | 60s | Yes (1000ms) |
| Custom (via `getCachedOrFetch<T>`) | Configurable | Yes (1000ms) |
| Custom (via `cacheGet<T>`) | Configurable | No (simple) |

---

## KV Namespace (Tier 2)

- Binding: `ZAYRON_CACHE`
- Managed by: OpenNext (incrementalCache, tagCache, queue adapters)
- ISR pages stored with TTL = `revalidate` value
- revalidatePath() triggers KV invalidation
- revalidateTag() support enabled via tagCache: 'kv'

---

## CDN Edge (Tier 1)

- All cacheable responses carry `CDN-Cache-Control` for Cloudflare-specific directives
- `stale-while-revalidate` allows serving stale content while background refresh occurs
- Error responses explicitly carry `no-store` to prevent caching failures
- Static assets (`/_next/static/*`) carry `max-age=31536000, immutable`
