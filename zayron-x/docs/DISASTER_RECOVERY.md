# ZAYRON-X - Disaster Recovery Plan

**Status:** Cloudflare-native recovery plan. Legacy VPS / PM2 / Nginx recovery paths are retired.

## 1. Recovery Principles

- Re-deploy on Cloudflare first.
- Restore data from source-of-truth systems only.
- Rebuild cache, never manually repair cache state.
- Keep canonical routes and public availability under Cloudflare control.

## 2. Primary Recovery Scenarios

### Cloudflare Worker failure

- Roll back the last known-good deployment.
- Verify `wrangler tail` for runtime errors.
- Confirm public pages and APIs return 200/expected redirects.

### KV corruption or cache miss spike

- Flush stale keys only if needed.
- Rebuild from origin data.
- Verify ISR and tag cache regeneration.

### R2 artifact loss

- Restore from the latest backup copy.
- Verify logs, reports, and exported artifacts.

### Public routing or canonical mismatch

- Fix the Worker route or redirect logic.
- Confirm one canonical hostname.
- Verify sitemap and metadata URLs match production.

## 3. Backup Strategy

- R2 stores archives, logs, and backups.
- Git history stores code and docs.
- Cache is disposable and rebuildable.

## 4. Verification

- `wrangler deploy --env production`
- `wrangler tail --env production`
- `curl -I https://zayron-x.com`
- `curl -s https://zayron-x.com/api/status`

## 5. Legacy Policy

- Do not use SSH, PM2, or Nginx in recovery.
- Do not use VPS provisioning as a recovery step.
- Do not keep old operational steps as active instructions.
