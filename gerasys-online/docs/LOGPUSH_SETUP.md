# ZAYRON-X — Cloudflare Logpush to R2

> Push Worker execution logs, exceptions, and request traces to an R2 bucket
> for long-term retention, compliance, and custom alerting.

## Prerequisites

- `wrangler` v4+ installed and authenticated
- An R2 bucket named `zayron-x-logs` (create via Dashboard or CLI)
- Account-level Logpush permissions (Super Administrator or `Logs:Write`)

## Step 1 — Create the R2 destination bucket

```bash
wrangler r2 bucket create zayron-x-logs
```

Verify:

```bash
wrangler r2 bucket list
```

## Step 2 — Create a Logpush job (Worker trace events)

This pushes execution logs, exceptions, and request traces every 5 minutes
to the R2 bucket partitioned by date.

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/logpush/jobs" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "zayron-x-worker-logs",
    "logpull_options": "fields=EventTimestampMs,Outcome,Exceptions,Logs,ScriptName,RequestMethod,RequestURL,StatusCode,CPUMS,WallTimeMS&timestamps=rfc3339",
    "destination_conf": "r2://zayron-x-logs/worker-logs/{DATE}?account='${CF_ACCOUNT_ID}'",
    "dataset": "workers_trace_events",
    "enabled": true,
    "frequency": "high"
  }'
```

**Dataset reference:**

| Dataset | Description |
|---|---|
| `workers_trace_events` | Execution logs, exceptions, CPU/wall time per request |
| `workers_analytics_events` | Aggregated metrics (no per-request data) |
| `http_requests` | Zone-level HTTP logs (if proxied through CF) |

## Step 3 — Create a Logpush job (HTTP request logs)

If the Worker is behind a Cloudflare zone (DNS proxied), also capture edge logs:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/logpush/jobs" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "zayron-x-http-logs",
    "logpull_options": "fields=ClientIP,ClientRequestHost,ClientRequestMethod,ClientRequestURI,EdgeEndTimestamp,EdgeResponseStatus,OriginResponseDurationMs,ClientCountry,CacheCacheStatus,SecurityLevel&timestamps=rfc3339",
    "destination_conf": "r2://zayron-x-logs/http-logs/{DATE}?account='${CF_ACCOUNT_ID}'",
    "dataset": "http_requests",
    "enabled": true,
    "frequency": "high"
  }'
```

## Step 4 — Verify jobs are running

```bash
# List all Logpush jobs for the account
curl -s "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/logpush/jobs" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | jq '.result[] | {id, name, dataset, enabled, status: .last_complete}'

# Check a specific job's health
curl -s "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/logpush/jobs/${JOB_ID}/health" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | jq .
```

## Step 5 — Verify R2 is receiving logs

```bash
# After ~10 minutes, list objects in the R2 bucket
wrangler r2 object list zayron-x-logs/worker-logs/

# Download the latest log file to inspect
wrangler r2 object get zayron-x-logs/worker-logs/$(date -u +%Y-%m-%d)/ -o ./sample-logs/
```

## Step 6 — Set R2 lifecycle policy (cost control)

```bash
# Retain logs for 90 days, then auto-delete
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/zayron-x-logs/lifecycle" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [{
      "id": "expire-after-90d",
      "status": "enabled",
      "filter": { "prefix": "" },
      "deleteObjectsAfterDays": 90
    }]
  }'
```

## Environment Variables

Ensure these are set in your shell or CI before running the curl commands:

```bash
export CF_ACCOUNT_ID="<your-cloudflare-account-id>"
export CF_API_TOKEN="<api-token-with-logs:write-and-r2:write>"
export CF_ZONE_ID="<your-zone-id-if-using-proxied-dns>"
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Missing/invalid API token | Verify token has `Logs:Write` + `R2:Write` scopes |
| `10000: Invalid destination_conf` | R2 bucket doesn't exist | Run `wrangler r2 bucket create zayron-x-logs` |
| Job created but `last_complete: null` | First push hasn't occurred yet | Wait 5-10 min; frequency "high" pushes every ~5 min |
| Empty log files in R2 | Worker isn't receiving traffic | Trigger a few requests and wait for next push cycle |
| `workers_trace_events` returns `workers.dev` subdomain error | Worker not deployed on a custom domain | Set `account_tag` filter or deploy to custom domain |
