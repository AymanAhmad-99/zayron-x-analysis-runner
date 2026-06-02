# ZAYRON-X — Operational Runbooks

**Version:** 1.0  
**Date:** 2026-06-02  
**Owner:** SRE Team  
**Review Cadence:** Monthly  

---

## 1. Daily Health Checks

**When:** Every morning (09:00 local time)  
**Who:** On-call SRE  
**Duration:** ~10 minutes  

### Checklist

```
☐ 1. STATUS PAGE: Open https://zayron-x.com/status
     → All services must show green (healthy).
     → If any service is degraded, investigate immediately.

☐ 2. SENTRY: Open Sentry → Issues → sorted by "Last Seen"
     → Any NEW issues in the last 24 hours?
     → Any REGRESSED issues (previously resolved, now reappeared)?
     → Action: Triage new issues — assign or resolve.

☐ 3. CLOUDFLARE DASHBOARD
     → Workers → zayron-x → Metrics
     → Check: error rate <1%, P95 latency <500ms
     → Check: KV cache hit rate >70%
     → Action: Investigate anomalies.

☐ 4. SUPABASE DASHBOARD
     → Database → Connection pool: usage <80%
     → Database → Query performance: no queries >1s avg
     → Action: If connection pool is high, check for leaks.

☐ 5. UPSTASH CONSOLE
     → Redis → Metrics: memory usage <80%, no evictions
     → Action: If evictions, increase memory or review TTLs.

☐ 6. DATA FRESHNESS
     → Check /api/articles — latest article published within last 24h
     → Check /api/cves — latest CVE fetched within last 24h
     → Action: If stale, check PM2 worker status on VPS.

☐ 7. BACKUP STATUS
     → Check R2 bucket zayron-x-backups/daily/ — latest file is from today
     → Action: If missing, run backup script manually.

☐ 8. LOG ERRORS
     → Check R2 bucket zayron-x-logs/worker-logs/{TODAY}/
     → Scan for ERROR-level entries
     → Action: Triage any unexpected errors.

☐ 9. ALERTS REVIEW
     → Sentry → Alerts → Alert History
     → Any alerts fired overnight?
     → Action: Acknowledge and triage any unhandled alerts.

☐ 10. EXTERNAL MONITORING
      → BetterStack/UptimeRobot: all monitors green
      → Action: Investigate any downtime blips.
```

### Automated Daily Check Script

```bash
#!/bin/bash
# scripts/daily-health-check.sh
# Run via cron: 0 9 * * * /var/www/zayron/scripts/daily-health-check.sh

echo "=== ZAYRON-X Daily Health Check — $(date -u) ==="

# 1. Status endpoint
STATUS=$(curl -sf https://zayron-x.com/api/status | jq -r .overall)
echo "Platform Status: $STATUS"
if [ "$STATUS" != "healthy" ]; then
  echo "WARNING: Platform is not healthy! Status: $STATUS"
fi

# 2. Latest backup
LATEST_BACKUP=$(wrangler r2 object list zayron-x-backups/daily/ --json 2>/dev/null | \
  jq -r 'sort_by(.uploaded) | last | .uploaded')
echo "Latest Backup:  ${LATEST_BACKUP:-MISSING}"

# 3. PM2 status (if VPS)
if command -v pm2 &> /dev/null; then
  pm2 status
fi

echo "=== Health Check Complete ==="
```

---

## 2. Weekly Backup Verification

**When:** Every Sunday morning  
**Who:** On-call SRE  
**Duration:** ~15 minutes  

### Procedure

```
☐ 1. Download latest daily backup from R2

☐ 2. Verify file integrity:
     gunzip -t zayron-db-YYYY-MM-DD.sql.gz

☐ 3. Count tables and rows:
     zgrep "CREATE TABLE" zayron-db-YYYY-MM-DD.sql.gz | wc -l
     (Should match expected schema table count)

☐ 4. Verify critical tables are present:
     zgrep -E "articles|profiles|cves|analysts" zayron-db-YYYY-MM-DD.sql.gz | head -20

☐ 5. Attempt restore to a temporary local database:
     createdb zayron_restore_test
     gunzip -c zayron-db-YYYY-MM-DD.sql.gz | psql zayron_restore_test
     psql zayron_restore_test -c "SELECT count(*) FROM articles;"
     dropdb zayron_restore_test

☐ 6. Log results to #zayron-x-ops Slack channel

☐ 7. If any verification fails: escalate to DBA immediately
```

---

## 3. Monthly Security Review

**When:** First Monday of each month  
**Who:** Security Lead + SRE Lead  
**Duration:** ~2 hours  

### Procedure

```
☐ 1. DEPENDENCY AUDIT
     → Review Dependabot alerts (GitHub → Security → Dependabot)
     → Update any packages with critical vulnerabilities
     → Run: bun update [package] for each critical CVE

☐ 2. SECRETS ROTATION
     → Verify all wrangler secrets are still valid
     → Rotate SUPABASE_SERVICE_ROLE_KEY (quarterly)
     → Rotate SENTRY_AUTH_TOKEN (quarterly)
     → Rotate CLOUDFLARE_API_TOKEN (quarterly)

☐ 3. ACCESS REVIEW
     → GitHub: Review team members and access levels
     → Cloudflare: Review API tokens and their scopes
     → Supabase: Review database users and permissions
     → Sentry: Review organization members

☐ 4. RATE LIMIT REVIEW
     → Review Sentry for any rate-limit bypass attempts
     → Check Redis rate-limit hit rates in Upstash Console
     → Tune limits if false positives are high

☐ 5. CSP REPORT REVIEW
     → Sentry → Issues → filter by CSP violations
     → Review any blocked resources — are they legitimate?
     → Update CSP in next.config.ts if needed

☐ 6. AUDIT LOG REVIEW (future — once implemented)
     → Check for unauthorized admin actions
     → Check for unusual API access patterns

☐ 7. DOCUMENT UPDATES
     → Review and update monitoring thresholds
     → Update emergency contact list if personnel changed
     → Update DR plan if infrastructure changed
```

---

## 4. Incident Response Procedure

### Severity Levels

| Level | Name | Response Time | Resolution Time | Examples |
|---|---|---|---|---|
| **SEV1** | Critical | 15 min | 4 hours | Platform down, data breach, complete outage |
| **SEV2** | Major | 30 min | 8 hours | Single service down, degraded performance |
| **SEV3** | Minor | 2 hours | 24 hours | Non-critical feature broken, intermittent errors |
| **SEV4** | Cosmetic | 1 business day | Next sprint | UI glitch, typo, minor visual bug |

### Incident Lifecycle

```
┌──────────────┐
│  DETECTION   │  ← Alert fires, or user report
└──────┬───────┘
       ▼
┌──────────────┐
│  DECLARATION │  ← Incident Commander declares severity
└──────┬───────┘       Notify #zayron-x-incidents (Slack)
       ▼
┌──────────────┐
│   TRIAGE     │  ← Identify affected services & impact
└──────┬───────┘       Assign responders
       ▼
┌──────────────┐
│  CONTAINMENT │  ← Roll back, isolate, rate-limit
└──────┬───────┘       Stop the bleeding first
       ▼
┌──────────────┐
│  RESOLUTION  │  ← Apply fix, verify recovery
└──────┬───────┘       Monitor for 30 min post-fix
       ▼
┌──────────────┐
│   CLOSURE    │  ← Declare incident resolved
└──────┬───────┘       Communicate to stakeholders
       ▼
┌──────────────┐
│  POSTMORTEM  │  ← Within 48 hours (SEV1/2)
└──────────────┘       Within 1 week (SEV3)
```

### Incident Commander Responsibilities

1. **Declare** the incident and its severity
2. **Assign** roles: Ops Lead, Comms Lead, Scribe
3. **Communicate** status every 30 minutes (SEV1/2) or 60 minutes (SEV3)
4. **Escalate** if resolution exceeds time targets
5. **Close** the incident when recovery is verified
6. **Schedule** the postmortem

### Communication Templates

**Incident Declaration (Slack):**
```
🚨 INCIDENT DECLARED
Severity: SEV1/SEV2/SEV3
Time: [TIME UTC]
Summary: [One-line description]
Impact: [What users are experiencing]
War Room: [Zoom/Meet link]
Commander: [Name]
```

**Status Update (every 30 min):**
```
📡 INCIDENT UPDATE — [TIME UTC]
Elapsed: [DURATION]
Status: [Investigating / Mitigating / Resolved]
Current theory: [What we believe is happening]
Next steps: [What we're doing now]
Next update: [TIME + 30 min]
```

**Incident Resolved:**
```
✅ INCIDENT RESOLVED — [TIME UTC]
Duration: [TOTAL DOWNTIME]
Root cause: [Brief summary]
Impact: [Users affected, requests failed]
Follow-up: Postmortem scheduled for [DATE]
```

---

## 5. Postmortem Template

```markdown
# Postmortem: [INCIDENT TITLE]

**Date:** [YYYY-MM-DD]
**Incident ID:** INC-YYYY-NNN
**Severity:** SEV1 / SEV2 / SEV3
**Duration:** [START] to [END] UTC ([TOTAL DURATION])

## Summary
[One paragraph describing what happened and the impact]

## Timeline (UTC)
| Time | Event |
|---|---|
| HH:MM | Alert fired: [alert name] |
| HH:MM | Incident declared by [name] |
| HH:MM | Root cause identified: [description] |
| HH:MM | Fix applied: [description] |
| HH:MM | Recovery verified |
| HH:MM | Incident resolved |

## Root Cause
[Detailed technical explanation of what caused the incident]

## Impact
- **Users affected:** [number or percentage]
- **Requests failed:** [count]
- **Error budget consumed:** [X minutes] of [Y minutes] monthly budget
- **Revenue impact:** [$X estimated] (if applicable)

## Detection
- **How was it detected:** [alert / user report / manual]
- **Time to detect:** [X minutes]
- **Could detection have been faster?** [Yes/No — explanation]

## Resolution
- **What fixed it:** [rollback / hotfix / config change / infra change]
- **Time to resolve:** [X minutes]
- **Could resolution have been faster?** [Yes/No — explanation]

## Lessons Learned
- **What went well:** [processes, tools, or decisions that helped]
- **What went poorly:** [processes, tools, or decisions that hindered]
- **What surprised us:** [unexpected behaviors or failures]

## Action Items
| # | Action | Owner | Due Date | Status |
|---|---|---|---|---|
| 1 | [Prevent recurrence] | [Name] | YYYY-MM-DD | ⬜ |
| 2 | [Improve detection] | [Name] | YYYY-MM-DD | ⬜ |
| 3 | [Improve resolution] | [Name] | YYYY-MM-DD | ⬜ |
| 4 | [Update runbooks/docs] | [Name] | YYYY-MM-DD | ⬜ |

## Appendix
- [Link to Slack thread]
- [Link to Sentry issue]
- [Link to relevant dashboard]
- [Link to PR with fix]
```

---

## 6. On-Call Handoff Checklist

### Outgoing Engineer (End of Shift)

```
☐ 1. Update the handoff doc with:
     → Any ongoing incidents
     → Any flapping alerts or known issues
     → Any planned maintenance or deploys during next shift

☐ 2. Acknowledge all open Sentry alerts
     → Resolve any that have been addressed
     → Leave notes on any that need investigation

☐ 3. Verify monitoring is green
     → /api/status — all services healthy
     → Sentry — no unacknowledged critical alerts
     → BetterStack/UptimeRobot — all monitors green

☐ 4. Update #zayron-x-ops with:
     "On-call handoff: [NAME] → [NAME]. No active incidents.
      Open items: [list or 'none']. Next shift starts: [TIME]."

☐ 5. Confirm incoming engineer has acknowledged the handoff
```

### Incoming Engineer (Start of Shift)

```
☐ 1. Read the handoff doc from the outgoing engineer

☐ 2. Verify you can access:
     → Cloudflare Dashboard
     → Supabase Dashboard
     → Upstash Console
     → Sentry
     → VPS (SSH)
     → GitHub
     → BetterStack / UptimeRobot

☐ 3. Run the Daily Health Check (Section 1)

☐ 4. Acknowledge handoff in #zayron-x-ops

☐ 5. Set up your notification channels:
     → Slack notifications ON for #zayron-x-alerts, #zayron-x-incidents
     → PagerDuty ON (if used)
     → Phone volume ON
```

---

## 7. Common Operational Procedures

### 7.1 Rotating a Secret

```bash
# 1. Generate new secret value
# 2. Upload to Cloudflare
wrangler secret put [SECRET_NAME] --env production
# 3. Update GitHub Actions secret (if used in CI)
gh secret set [SECRET_NAME] --body "[NEW_VALUE]"
# 4. Verify the Worker picks up the new secret
#    (secrets are injected on next deploy — redeploy if needed)
wrangler deploy --env production
# 5. Revoke the old secret value at the source
# 6. Document rotation in #zayron-x-ops
```

### 7.2 Scaling the Worker

```bash
# Cloudflare Workers scale automatically.
# To increase CPU limits, upgrade to the Paid plan:
#   Dashboard → Workers → zayron-x → Usage → Upgrade

# For memory pressure, check the observability data:
wrangler tail --env production
# Look for "Wall time exceeded" or "CPU time exceeded" errors
```

### 7.3 Pausing / Resuming Alerting

```bash
# Sentry Maintenance Window (preferred):
#   Sentry → Alerts → Maintenance Windows → Create
#   Select project: zayron-x-web
#   Set time window

# Slack Pause:
#   Set Slack status: "⏸️ On-call — maintenance window until [TIME]"
```

### 7.4 Forcing a Deploy

```bash
cd /var/www/zayron/gerasys-online
git pull origin production
bun install --frozen-lockfile
bun run build
wrangler deploy --env production
# Monitor for 5 minutes after deploy
```

---

## 8. Runbook Maintenance

This document is reviewed and updated:

- **Monthly:** During the security review cycle
- **After every SEV1/SEV2 incident:** Update relevant procedures with lessons learned
- **Quarterly:** During DR test — verify all procedures still work

**Ownership:** SRE Lead  
**Source of Truth:** `docs/OPERATIONAL_RUNBOOKS.md` in the ZAYRON-X GitHub repository
