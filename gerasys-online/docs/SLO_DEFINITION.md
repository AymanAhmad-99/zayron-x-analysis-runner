# ZAYRON-X — Service Level Objectives (SLO)

**Version:** 1.0  
**Date:** 2026-06-02  
**Owner:** SRE Team  
**Review Cadence:** Quarterly  

---

## 1. Platform-Level SLO

| Metric | Target |
|---|---|
| **Uptime** | 99.9% ("three nines") |
| **Measurement Window** | Rolling 30 days |
| **Error Budget** | 43.2 minutes/month (0.1% of 43,200 min/month) |
| **SLI** | Availability = `(successful_requests) / (total_requests)` where success = HTTP 2xx/3xx |

### Error Budget Policy

| Budget Remaining | Action |
|---|---|
| **> 50%** (>21.6 min) | Normal operations. Feature deploys allowed. |
| **25-50%** (10.8–21.6 min) | Caution. Feature deploys require SRE review. |
| **10-25%** (4.3–10.8 min) | Restricted. Only bug fixes and security patches deployed. |
| **< 10%** (<4.3 min) | Frozen. All deploys halted. Entire team focuses on reliability. |
| **Exhausted** (0 min) | **Incident declared.** Postmortem mandatory. SLO reset negotiation with stakeholders. |

### Error Budget Burn Rate Alert

| Burn Rate | Alert Severity | Action |
|---|---|---|
| **2% in 1 hour** (0.86 min/hour) | Warning | Slack #zayron-x-ops |
| **5% in 6 hours** (2.15 min/6h) | Critical | PagerDuty + freeze feature deploys |
| **10% in 1 day** (4.32 min/day) | Emergency | Incident declared |

---

## 2. Per-Service SLOs

### 2.1 Cloudflare Worker (Edge Runtime)

| Metric | Target | SLI |
|---|---|---|
| **Availability** | 99.95% | Successful requests / total requests |
| **P95 Latency** | < 500 ms | P95 of `request_time_ms` over 5 min windows |
| **P99 Latency** | < 2,000 ms | P99 of `request_time_ms` over 5 min windows |
| **Error Rate** | < 0.5% | 5xx errors / total requests |
| **Measurement Source** | Cloudflare Workers Analytics + Sentry | |

**Error Budget:** 21.6 minutes/month (0.05% of 43,200 min)

### 2.2 Supabase (PostgreSQL)

| Metric | Target | SLI |
|---|---|---|
| **Availability** | 99.9% | Successful queries / total queries |
| **P95 Query Time** | < 200 ms | P95 of query execution time |
| **P99 Query Time** | < 1,000 ms | P99 of query execution time |
| **Connection Pool Usage** | < 80% | Active connections / max connections |
| **Measurement Source** | Supabase Dashboard + Drizzle ORM logs | |

**Error Budget:** 43.2 minutes/month

### 2.3 Redis (Upstash)

| Metric | Target | SLI |
|---|---|---|
| **Availability** | 99.9% | Successful PING responses / total health checks |
| **P95 Latency** | < 5 ms | P95 of Redis command execution time |
| **Circuit Breaker Open Rate** | < 0.1% | Time spent in circuit-breaker-open state / total time |
| **Measurement Source** | App-level health checks + Upstash Console | |

**Error Budget:** 43.2 minutes/month

### 2.4 Cloudflare KV

| Metric | Target | SLI |
|---|---|---|
| **Availability** | 99.9% | Successful reads / total reads |
| **Cache Hit Rate** | > 70% | Cache hits / (hits + misses) |
| **Read P95 Latency** | < 100 ms | P95 of KV read time (global) |
| **Measurement Source** | Cloudflare Workers Analytics → KV Metrics | |

**Error Budget:** 43.2 minutes/month  
**Note:** KV has a 60-second global consistency window. Write-heavy workloads should expect temporary elevated miss rates.

### 2.5 Gemini AI (External API)

| Metric | Target | SLI |
|---|---|---|
| **Availability** | 99.5% (external dependency) | Successful API calls / total API calls |
| **P95 Latency** | < 5,000 ms | P95 of Gemini API response time |
| **Measurement Source** | App-level instrumentation | |

**Error Budget:** 216 minutes/month (0.5% — external service, lower target)

---

## 3. Composite SLO Calculation

The platform overall SLO is the **product** of individual service availabilities:

```
Platform Availability = Worker × Supabase × Redis × KV

  = 0.9995 × 0.999 × 0.999 × 0.999
  = 0.9965 (99.65%)

Target after Gemini excluded (external):
  = 0.9995 × 0.999 × 0.999 × 0.999
  ≈ 0.9965
```

**Note:** The composite SLO (99.65%) is lower than the per-service SLO (99.9%) because failures are additive across dependencies. To achieve 99.9% platform availability, each service needs **99.975%** individual availability.

For practical purposes, ZAYRON-X targets **99.9% platform uptime** measured by external synthetic monitoring (BetterStack/UptimeRobot checks against `/api/status` every 60 seconds).

---

## 4. Monitoring Implementation

### 4.1 Synthetic Checks (External)

```yaml
# BetterStack / UptimeRobot configuration
monitors:
  - name: ZAYRON-X Homepage
    url: https://zayron-x.com
    interval: 60s
    timeout: 10s
    regions: [us-east, eu-west, ap-southeast]
    alert_on: [down, degraded]

  - name: ZAYRON-X Health API
    url: https://zayron-x.com/api/status
    interval: 60s
    timeout: 10s
    alert_on: [degraded, down]
    response_check: '.overall == "healthy"'
```

### 4.2 Real-User Monitoring (Sentry)

- **Apdex threshold:** T = 500 ms (satisfactory page load)
- **LCP target:** < 2.5 seconds
- **CLS target:** < 0.1
- **INP target:** < 200 ms

### 4.3 SLO Dashboards

| Dashboard | Source | Refresh |
|---|---|---|
| **Platform SLO Overview** | Sentry + CF Analytics | 5 min |
| **Error Budget Burn** | Custom Grafana (future) or Sentry Discover | 1 hour |
| **Per-Service Health** | `/api/status` history | 1 min |

---

## 5. SLO Review Process

### Monthly Review (First Monday of each month)

1. Review error budget consumption for each service
2. Identify top 3 error sources (by event count)
3. Decide: continue feature work, or invest in reliability
4. Update SLO targets if business requirements changed

### Quarterly Deep Dive (Aligned with DR test)

1. Re-evaluate SLO targets — are they still realistic?
2. Review all SLO-affecting incidents from the quarter
3. Propose SLO adjustments for next quarter
4. Publish SLO Performance Report to stakeholders

---

## 6. SLO Performance Report Template

```
ZAYRON-X SLO Performance Report — [MONTH] [YEAR]
══════════════════════════════════════════════════

Platform Uptime: 99.94% (Target: 99.9%)  ✅ MET
Error Budget Remaining: 17.3 min / 43.2 min (40%)

Per-Service:
  Worker:  99.97% (Target: 99.95%) ✅
  Supabase: 99.91% (Target: 99.9%)  ✅
  Redis:   99.95% (Target: 99.9%)  ✅
  KV:      99.89% (Target: 99.9%)  ❌ — 0.01% under target
  Gemini:  99.82% (Target: 99.5%)  ✅

Top Incidents:
  1. KV elevated latency (Jun 15, 14:00-14:45 UTC) — 45 min
  2. Supabase connection spike (Jun 22, 09:00-09:15 UTC) — 15 min

Action Items:
  - [ ] Investigate KV miss rate spike correlation with article imports
  - [ ] Tune connection pool max from 20 to 30

Next Review: [First Monday of next month]
```
