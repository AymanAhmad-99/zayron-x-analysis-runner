# ZAYRON-X — Alerting Rules

> Production alerting for the ZAYRON-X platform. These rules assume
> Cloudflare Workers Analytics for latency/error metrics and Sentry for
> exception-based alerting.  Integrate with PagerDuty, Opsgenie, Slack,
> or email via Sentry's Alert Rules UI.

---

## 1. 🚨 Error Rate Spike

**Severity:** Critical  
**Source:** Sentry + Cloudflare Workers Analytics  
**Condition:** Error rate exceeds 5% of total requests over a 5-minute rolling window.  
**Threshold:** `error_count / total_requests > 0.05` for `5m`

```
Sentry Alert Rule:
  - Type: Metric Alert
  - Filter: event.type:error OR event.type:default
  - Window: 5 minutes
  - Condition: error_rate > 5%
  - Action: PagerDuty Critical + #zayron-x-alerts (Slack)
```

**Runbook:**
1. Open Sentry → Issues → sort by `last_seen`
2. Check Cloudflare Dashboard → Workers → `zayron-x` → Metrics for error spike correlation
3. If >50% of errors share the same stack trace → identify PR/deploy that introduced it
4. If errors are diverse → suspect infrastructure issue (DB, Redis, KV)
5. Roll back to last known-good deploy if root cause not found within 10 min

---

## 2. ⏱️ P95 Latency > 2s

**Severity:** Warning → Critical (escalates after 10 min)  
**Source:** Cloudflare Workers Analytics + Sentry Performance  
**Condition:** P95 request latency exceeds 2000 ms for 3 consecutive 5-minute windows.  
**Threshold:** `p95_latency > 2000` for `15m`

```
Sentry Alert Rule:
  - Type: Metric Alert
  - Metric: p95(transaction.duration)
  - Window: 15 minutes (3 × 5m buckets)
  - Condition: p95 > 2000ms
  - Action: Slack #zayron-x-ops (Warning) → PagerDuty after 10 min (Critical)
```

**Runbook:**
1. Check `lib/cache/redis.ts` — is Redis circuit breaker open? (see Alert #5)
2. Check Supabase Dashboard → Database → Query Performance for slow queries
3. Check `wrangler tail` for any cold-start spikes or CPU-throttled requests
4. Look at Sentry Performance → slowest transactions → trace waterfall
5. If DB is bottleneck: check for missing indexes, connection pool exhaustion

---

## 3. 💾 Memory / CPU Throttling

**Severity:** Warning  
**Source:** Cloudflare Workers Analytics  
**Condition:** CPU-time-per-request exceeds 30 ms average over a 10-minute window, OR any single request exceeds 400 MB memory (Wall-Time limit hit).  
**Threshold:** `avg_cpu_ms > 30` for `10m` OR `cpu_ms_max > 400`

```
Sentry Alert Rule:
  - Type: Metric Alert
  - Filter: has:transaction
  - Metric: avg(measurements.cpu_usage)
  - Window: 10 minutes
  - Condition: avg > 0.6 (60% of 50ms Workers CPU limit)
  - Action: Slack #zayron-x-ops
```

**Runbook:**
1. Review `wrangler tail` for large response payloads
2. Check if SSR pages are doing heavy Markdown rendering or image processing
3. Verify `sharp` image optimization is not processing images on the critical path
4. Consider increasing Workers CPU limits (Paid plan → 30 s wall-time)
5. Look for unoptimized `fuse.js` searches or large `dompurify` sanitization

---

## 4. 🗄️ Database Connection Exhaustion

**Severity:** Critical  
**Source:** Supabase Dashboard → Database → Connections  
**Condition:** Active PostgreSQL connections exceed 80% of pool capacity (pool size × number of Workers).  
**Threshold:** `active_connections > 0.8 * max_connections` for `5m`

This is monitored via Supabase project metrics, not Sentry.  Configure in Supabase:
```
Supabase Dashboard → Reports → Create Alert:
  - Metric: "Database Connections"
  - Condition: > 80% for 5 minutes
  - Action: Webhook → PagerDuty
```

**Runbook:**
1. Check `select count(*) from pg_stat_activity` — identify idle-in-transaction sessions
2. Check if a deploy just happened — cold starts spin up new connections
3. Verify Drizzle ORM connection pooling is configured with a `max` limit
4. If idle connections are accumulating, check for leaked connections in middleware
5. Emergency: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction'`

---

## 5. 🔴 Redis Circuit Breaker Open

**Severity:** Critical  
**Source:** Application logs ⇒ Sentry  
**Condition:** 10+ `[CACHE CIRCUIT BREAKER]` log entries in a 5-minute window indicating Redis is unreachable.  
**Threshold:** `count(logs matching "CACHE CIRCUIT BREAKER") > 10` for `5m`

```
Sentry Alert Rule:
  - Type: Issue Alert
  - Filter: message:"CACHE CIRCUIT BREAKER" OR message:"Redis not configured"
  - Window: 5 minutes
  - Condition: event count > 10
  - Action: PagerDuty Critical + Slack #zayron-x-alerts
```

**Runbook:**
1. Check Upstash Console → Redis → Metrics for connection count, memory, and evictions
2. Verify `REDIS_URL` and `REDIS_TOKEN` secrets are still valid
3. Check `lib/cache/redis.ts:29-33` — are the URL/token validation checks passing?
4. Rate limiters (`lib/cache/ratelimit.ts`) will FAIL CLOSED when Redis is down — all rate-limited endpoints (login, register, search) will return 429
5. If Redis is up but circuit breaker is tripping: increase `REDIS_TIMEOUT_MS` from 1000 ms to 2000 ms temporarily
6. If Redis is permanently down: deploy with `REDIS_URL` unset to allow the application to degrade gracefully (cache bypass mode)

---

## 6. 📦 KV Cache Miss Rate Spike

**Severity:** Warning  
**Source:** Cloudflare Workers Analytics → KV Metrics  
**Condition:** KV cache-miss rate exceeds 30% over a 15-minute window (indicates cache is cold or invalidated).  
**Threshold:** `kv_miss_rate > 0.30` for `15m`

```
Cloudflare Dashboard → Workers → zayron-x → Analytics → KV:
  - Metric: KV Read Cache Miss Rate
  - Condition: > 30% for 15 minutes
  - Notification: Email → ops@zayron-x.com
```

Note: Cloudflare KV has a 60-second global consistency window.  A burst
of writes will temporarily evict cached reads.  This is normal after a
bulk article import or CVE refresh — set the alert to auto-snooze for
30 min after known data-load events.

**Runbook:**
1. Check if a bulk article/CVE import just ran (expected, snooze 30 min)
2. Check KV namespace usage in Cloudflare Dashboard — approaching limits?
3. Review `ZAYRON_CACHE` binding — is the KV namespace still valid?
4. Check if `cacheInvalidate()` was called with an overly broad pattern
5. If miss rate stays elevated: check if cache keys are being written with very short TTLs

---

## 7. 🗺️ Impossible Travel Detection

**Severity:** Critical  
**Source:** Sentry (custom context on `request.ip` geolocation)  
**Condition:** Two authenticated requests from the same user session originate from IPs >1000 km apart within 5 minutes.  
**Threshold:** `2+ distinct geolocations > 1000 km` within `5m`

```
Sentry Alert Rule:
  - Type: Issue Alert
  - Filter: event.type:error AND tags.impossible_travel:true
  - Window: 5 minutes
  - Condition: event count > 0
  - Action: PagerDuty Critical + Slack #zayron-x-security
```

**Implementation note:** This requires custom instrumentation. Add a
per-request Sentry tag with the Cloudflare `cf-ipcountry` header and
compare against the user's previous request location stored in Redis.
See `middleware.ts` for the integration point.

```typescript
// Pseudocode for middleware (not production code — implement after audit)
const country = request.headers.get('cf-ipcountry');
const userId = session?.user?.id;
if (userId && country) {
  const lastCountry = await redis.get(`geo:${userId}`);
  if (lastCountry && lastCountry !== country) {
    const distance = haversineDistance(lastCountry, country);
    if (distance > 1000) {
      Sentry.captureEvent({
        message: `Impossible travel: ${lastCountry} → ${country} (${distance}km)`,
        level: 'error',
        tags: { impossible_travel: true, user_id: userId },
      });
    }
  }
  await redis.set(`geo:${userId}`, country, { ex: 3600 });
}
```

**Runbook:**
1. Check if user is on a VPN or corporate network with geo-distributed exit nodes
2. Correlate with login history in Supabase `auth.users` → `last_sign_in_at`
3. If confirmed credential compromise: invalidate all sessions for that user, force password reset
4. Check for API token theft — rotate `SUPABASE_SERVICE_ROLE_KEY` if admin endpoints were accessed
5. Notify security@zayron-x.com

---

## Alert Routing Matrix

| Alert | Slack | PagerDuty | Email | Auto-snooze |
|---|---|---|---|---|
| Error Rate Spike | `#zayron-x-alerts` | Critical (immediate) | — | — |
| P95 Latency >2s | `#zayron-x-ops` | Critical (after 10 min) | — | 30 min after deploy |
| CPU Throttling | `#zayron-x-ops` | — | ops@ | — |
| DB Connection Exhaustion | `#zayron-x-alerts` | Critical (immediate) | dba@ | — |
| Redis Circuit Breaker | `#zayron-x-alerts` | Critical (immediate) | — | — |
| KV Miss Rate | — | — | ops@ | 30 min after imports |
| Impossible Travel | `#zayron-x-security` | Critical (immediate) | security@ | — |

## Silencing During Maintenance

All alerts can be silenced via Sentry's **Maintenance Window** feature:
1. Sentry → Alerts → Maintenance Windows → Create
2. Select the project `zayron-x-web`
3. Set start/end times
4. All alerts will auto-resume when the window expires

Alternatively, deploy with an `ALERT_MAINTENANCE=true` env var to disable
non-critical alerts at the application level.
