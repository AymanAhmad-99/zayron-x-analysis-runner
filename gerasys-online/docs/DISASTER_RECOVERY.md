# ZAYRON-X — Disaster Recovery Plan

**Version:** 1.0  
**Date:** 2026-06-02  
**Classification:** TLP:AMBER — Internal Use Only  
**Last Reviewed:** 2026-06-02  

---

## Executive Summary

| Metric | Target |
|---|---|
| **RTO** (Recovery Time Objective) | 4 hours |
| **RPO** (Recovery Point Objective) | 1 hour |
| **Maximum Tolerable Downtime** | 4 hours (business hours) / 8 hours (off-hours) |
| **DR Test Frequency** | Quarterly (every 3 months) |
| **Backup Verification** | Weekly automated + quarterly manual |

---

## 1. Recovery Scenarios

### Scenario 1 — Supabase (PostgreSQL) Outage

**Impact:** All database queries fail. Articles, CVEs, search, auth, and profiles are unavailable. Static pages served from KV cache may still render.

**Detection:**
- Sentry alert: "Error Rate Spike" (>5% errors)
- Health endpoint: `/api/status` shows `supabase: unhealthy`
- Supabase Dashboard → Status page shows degraded

**Recovery Procedure:**

| Step | Action | Expected Duration | Owner |
|---|---|---|---|
| 1 | Verify outage: check https://status.supabase.com | 2 min | On-call SRE |
| 2 | If Supabase-side outage: monitor status page, escalate via Supabase support ticket | 5 min | On-call SRE |
| 3 | If project-specific: check Supabase Dashboard → Database → Connection limits | 5 min | On-call SRE |
| 4 | If connection exhaustion: terminate idle connections `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction'` | 5 min | DBA |
| 5 | If database is corrupted: initiate Point-in-Time Recovery (PITR) from last backup. Supabase Dashboard → Database → Backups → Restore | 15-60 min | DBA |
| 6 | Verify recovery: `GET /api/status` returns `supabase: healthy` | 5 min | On-call SRE |
| 7 | Verify auth: attempt login, verify session creation | 5 min | QA |

**Rollback:** Not applicable — restore to most recent clean backup.

---

### Scenario 2 — Cloudflare Workers Outage

**Impact:** All edge compute fails. No pages render. API routes return 5xx. KV cache inaccessible.

**Detection:**
- Cloudflare Dashboard → Workers & Pages → `zayron-x` → Metrics shows zero requests or 100% errors
- External monitoring (BetterStack/UptimeRobot) alerts
- Sentry alert: "Error Rate Spike"

**Recovery Procedure:**

| Step | Action | Expected Duration | Owner |
|---|---|---|---|
| 1 | Verify outage: check https://www.cloudflarestatus.com | 2 min | On-call SRE |
| 2 | If Cloudflare-side: monitor status, activate comms plan (notify stakeholders) | 5 min | On-call SRE |
| 3 | If deployment-related: `wrangler rollback --env production` to revert to last known-good version | 5 min | On-call SRE |
| 4 | If rollback unavailable: redeploy last known-good commit `git log --oneline -5` → `wrangler deploy --env production --commit-hash <hash>` | 10 min | On-call SRE |
| 5 | If complete platform failure: deploy static failover page to Cloudflare Pages (see Section 3) | 15 min | SRE Lead |
| 6 | Verify recovery: `curl -I https://zayron-x.com` returns 200 | 5 min | On-call SRE |
| 7 | Verify /api/status returns healthy | 5 min | On-call SRE |

---

### Scenario 3 — Redis (Upstash) Outage

**Impact:** Rate limiting fails CLOSED (all rate-limited endpoints return 429). Read-through cache bypasses Redis — increased DB load. Session cache unavailable.

**Detection:**
- Sentry alert: "Redis Circuit Breaker Open" (>10 circuit-breaker events in 5 min)
- Health endpoint: `/api/status` shows `redis: unhealthy`
- Upstash Console → Redis → Metrics shows connection failures

**Recovery Procedure:**

| Step | Action | Expected Duration | Owner |
|---|---|---|---|
| 1 | Verify outage: check https://status.upstash.com | 2 min | On-call SRE |
| 2 | If Upstash-side: monitor status, escalate via Upstash support | 5 min | On-call SRE |
| 3 | If configuration issue: verify `REDIS_URL` and `REDIS_TOKEN` secrets in Cloudflare Dashboard → Workers → `zayron-x` → Variables | 5 min | On-call SRE |
| 4 | If secrets are wrong: re-upload `wrangler secret put REDIS_URL --env production` + `wrangler secret put REDIS_TOKEN --env production` | 5 min | On-call SRE |
| 5 | Emergency bypass: deploy with `REDIS_URL` unset → application degrades gracefully (direct DB fetches, rate limiters return `allowed: false` — consider temporarily disabling rate limiting by setting high limits) | 10 min | SRE Lead |
| 6 | Verify recovery: `/api/status` shows `redis: healthy` | 3 min | On-call SRE |

---

### Scenario 4 — VPS (Origin Server) Failure

**Impact:** If running PM2-based services (telegram-radar, article-engine, cti-ingestion, cve-worker), those background processes stop. The Workers deployment is unaffected for user-facing traffic, but data ingestion pipelines halt.

**Detection:**
- PM2 process monitoring: `pm2 status` shows stopped/errored processes
- Gap in article/CVE freshness (last published date > expected interval)
- Log file growth stops: `/var/log/zayron/*.log`

**Recovery Procedure:**

| Step | Action | Expected Duration | Owner |
|---|---|---|---|
| 1 | SSH into VPS: `ssh user@vps-ip` | 2 min | On-call SRE |
| 2 | Check system health: `htop`, `df -h`, `free -m` | 2 min | On-call SRE |
| 3 | If OOM: `pm2 restart all` after freeing memory | 3 min | On-call SRE |
| 4 | If disk full: `du -sh /var/log/zayron/*` → rotate/delete old logs | 5 min | On-call SRE |
| 5 | If PM2 corrupted: `pm2 kill && pm2 resurrect` | 3 min | On-call SRE |
| 6 | If hardware failure: provision new VPS (see Section 4 — Infrastructure as Code) | 60-120 min | SRE Lead |
| 7 | Verify: `pm2 status` shows all processes `online` | 2 min | On-call SRE |
| 8 | Trigger manual ingestion run to catch up missed cycles | 5 min | Data Engineer |

---

### Scenario 5 — Complete Platform Loss

**Impact:** Supabase, Cloudflare Workers, Redis, and VPS all unavailable simultaneously (e.g., multi-region cloud provider outage, catastrophic attack).

**Detection:**
- ALL Sentry alerts fire simultaneously
- ALL health checks fail
- External monitoring shows complete outage

**Recovery Procedure:**

| Step | Action | Expected Duration | Owner |
|---|---|---|---|
| 1 | **Declare incident.** Notify all stakeholders via backup comms channel (Signal group). | 5 min | Incident Commander |
| 2 | Triage: determine if this is a provider outage or a targeted attack | 15 min | Security Lead |
| 3 | If multi-provider outage (extremely unlikely): activate static failover site on Cloudflare Pages (separate account) | 15 min | SRE Lead |
| 4 | If Supabase is the last to recover: redirect DB to a PostgreSQL dump restored on a new Supabase project | 30-60 min | DBA |
| 5 | If Workers is last: deploy to backup Cloudflare account via `wrangler deploy --env production` with backup account credentials | 15 min | SRE Lead |
| 6 | If Redis is last: bypass Redis (direct DB mode, rate limiters temporarily disabled) | 10 min | SRE Lead |
| 7 | Restore data from latest backup (see Section 2) | 30-60 min | DBA |
| 8 | Verify full platform health: `/api/status` all green | 10 min | QA |
| 9 | Resume data ingestion pipelines (backfill missed articles/CVEs) | 30-120 min | Data Engineer |
| 10 | **Declare incident resolved.** Begin postmortem. | — | Incident Commander |

---

## 2. Backup Strategy

### 2.1 Supabase (PostgreSQL)

| Backup Type | Frequency | Retention | Method |
|---|---|---|---|
| **Continuous PITR** | Real-time (WAL streaming) | 7 days | Supabase managed — automatic |
| **Daily Logical Dump** | Every 24h at 03:00 UTC | 30 days | `pg_dump` → R2 bucket `zayron-x-backups` |
| **Weekly Full Dump** | Every Sunday 03:00 UTC | 90 days | `pg_dump --format=custom` → R2 |

**Daily Backup Command (runs on VPS cron):**

```bash
#!/bin/bash
# /etc/cron.daily/zayron-backup

DATE=$(date -u +%Y-%m-%d)
DUMP_FILE="/tmp/zayron-db-${DATE}.sql.gz"

pg_dump "$DATABASE_URL" | gzip > "$DUMP_FILE"

# Upload to R2
wrangler r2 object put "zayron-x-backups/daily/zayron-db-${DATE}.sql.gz" \
  --file "$DUMP_FILE" \
  --content-type application/gzip

rm "$DUMP_FILE"

# Prune backups older than 30 days
wrangler r2 object list "zayron-x-backups/daily/" | \
  jq -r '.[] | select(.uploaded < "'$(date -u -d '30 days ago' +%Y-%m-%d)'") | .key' | \
  xargs -I {} wrangler r2 object delete "zayron-x-backups/daily/{}"
```

### 2.2 Cloudflare Workers Code

| Backup Type | Frequency | Retention | Method |
|---|---|---|---|
| **Git history** | Every commit | Infinite | GitHub (primary) |
| **Deployment artifact** | Every deploy | Last 10 versions | Cloudflare Workers (automatic) |
| **Wrangler config** | Every change | Infinite | Git repository |

### 2.3 Cloudflare KV

KV is an ephemeral cache (ISR). No backup needed — data is rebuilt from the database on cache miss. In a complete loss scenario, KV repopulates automatically as traffic resumes.

### 2.4 Backup Verification (Weekly)

```bash
#!/bin/bash
# Run weekly (Sunday mornings) to verify backup integrity

LATEST_BACKUP=$(wrangler r2 object list zayron-x-backups/daily/ | jq -r 'sort_by(.uploaded) | last | .key')

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No daily backup found!"
  exit 1
fi

# Download and verify
wrangler r2 object get "zayron-x-backups/daily/${LATEST_BACKUP}" --file /tmp/verify.sql.gz
gunzip -t /tmp/verify.sql.gz && echo "Backup integrity: OK" || echo "ERROR: Corrupt backup!"
rm /tmp/verify.sql.gz
```

---

## 3. Static Failover Page

When the platform is completely down, deploy a static HTML failover page:

```bash
# Deploy to Cloudflare Pages (separate project: zayron-x-failover)
wrangler pages deploy failover/ --project-name=zayron-x-failover
```

**Failover page content** (`failover/index.html`): A simple branded page stating:
- "ZAYRON-X Intelligence Platform — Undergoing Maintenance"
- "Our team has been alerted and is working on restoration."
- "Expected recovery: within 4 hours"
- Link to status.zayron-x.com for updates

---

## 4. Quarterly DR Test Schedule

| Quarter | Test Type | Scenario | Success Criteria |
|---|---|---|---|
| **Q1 (Mar)** | Tabletop | Scenario 1 (Supabase outage) | Recovery procedure followed in <2h |
| **Q2 (Jun)** | Tabletop | Scenario 4 (VPS failure) | All processes restarted in <1h |
| **Q3 (Sep)** | Live | Scenario 2 (Workers outage) | Rollback completes in <15 min |
| **Q4 (Dec)** | Live | Scenario 5 (Complete loss) | Full recovery in <4h (RTO validated) |

### DR Test Procedure

1. **Schedule:** Announce DR test 2 weeks in advance via `#zayron-x-ops`
2. **Brief:** Review DR plan with participants 1 day before
3. **Execute:** Follow scenario recovery procedure step-by-step
4. **Time:** Record actual time for each step
5. **Document:** Note any deviations, blockers, or improvements
6. **Postmortem:** Within 1 week, publish findings and update DR plan

---

## 5. Emergency Contact List

| Role | Name | Phone | Email | Signal |
|---|---|---|---|---|
| **Incident Commander** | [TBD] | [TBD] | ic@zayron-x.com | [TBD] |
| **SRE Lead** | [TBD] | [TBD] | sre@zayron-x.com | [TBD] |
| **DBA** | [TBD] | [TBD] | dba@zayron-x.com | [TBD] |
| **Security Lead** | [TBD] | [TBD] | security@zayron-x.com | [TBD] |
| **Engineering Manager** | [TBD] | [TBD] | eng-mgr@zayron-x.com | [TBD] |
| **CEO / CTO** | [TBD] | [TBD] | cto@zayron-x.com | [TBD] |

**Escalation Path:**
1. On-call SRE (15 min response)
2. SRE Lead (30 min response)
3. Incident Commander (45 min response)
4. CTO (60 min response)

### External Vendor Contacts

| Vendor | Service | Support Portal | Support Tier |
|---|---|---|---|
| **Cloudflare** | Workers, KV, R2 | https://dash.cloudflare.com/?to=/:account/support | Enterprise |
| **Supabase** | PostgreSQL, Auth | https://supabase.com/dashboard/project/_/settings/billing | Team/Pro |
| **Upstash** | Redis | https://console.upstash.com/support | Pay-as-you-go |
| **Sentry** | Error tracking | https://sentry.io/support/ | Team |
| **GitHub** | Source control, CI | https://support.github.com | Free |

---

## 6. Communication Plan

### During Incident

| Channel | Audience | Purpose |
|---|---|---|
| **Signal Group** `ZAYRON-X War Room` | Core SRE/Eng team | Real-time coordination |
| **Slack** `#zayron-x-incidents` | All engineering | Status updates every 30 min |
| **Email** stakeholders@zayron-x.com | Leadership, clients | Status updates every 60 min |
| **Twitter/X** @ZayronXStatus | Public | Acknowledgment + ETA |

### Post-Incident

- **Postmortem meeting:** Within 48 hours
- **Postmortem doc:** Published within 1 week (see OPERATIONAL_RUNBOOKS.md)
- **Action items:** Tracked in GitHub Issues with `incident-followup` label
- **DR plan update:** If procedures were inaccurate, update within 1 week

---

## 7. Recovery Checklist (Print-Friendly)

```
┌─────────────────────────────────────────────────────────┐
│ ZAYRON-X DISASTER RECOVERY — QUICK REFERENCE            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ☐ 1. DECLARE: Announce incident, set up war room        │
│ ☐ 2. TRIAGE: Identify affected services                 │
│ ☐ 3. CONTAIN: Roll back / isolate / rate-limit          │
│ ☐ 4. RECOVER: Follow scenario-specific procedure        │
│ ☐ 5. VERIFY: /api/status all green                     │
│ ☐ 6. MONITOR: Watch Sentry for 30 min post-recovery     │
│ ☐ 7. COMMUNICATE: Notify stakeholders of resolution     │
│ ☐ 8. POSTMORTEM: Schedule within 48h                    │
│                                                         │
│ CRITICAL COMMANDS:                                      │
│   wrangler rollback --env production                    │
│   pm2 restart all                                       │
│   curl https://zayron-x.com/api/status | jq .overall   │
│                                                         │
│ EMERGENCY CONTACTS:                                     │
│   SRE Lead:  [TBD]                                      │
│   DBA:       [TBD]                                      │
│   CTO:       [TBD]                                      │
└─────────────────────────────────────────────────────────┘
```
