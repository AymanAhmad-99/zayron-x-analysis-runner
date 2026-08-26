# ZAYRON-X - Operational Runbooks

**Status:** Cloudflare-native operations guide. Legacy VPS / PM2 / Nginx procedures are retired.

## 1. Daily Checks

- Open `/api/status`
- Review Cloudflare Workers metrics
- Review KV cache health
- Review R2 log artifacts
- Review Sentry issues and alerts
- Verify sitemap and canonical routes resolve correctly

## 2. Deploy Checks

Before deploy:
- `bun run type-check`
- `bun run test:unit`
- `bun run build:cf`
- `wrangler deploy --env preview`

After deploy:
- Confirm `wrangler tail --env production`
- Confirm public pages render
- Confirm `robots.txt`, sitemap, and canonical URLs

## 3. Incident Flow

1. Declare severity.
2. Contain the blast radius.
3. Roll back the last Cloudflare deployment if needed.
4. Verify cache and public routes.
5. Update logs and follow-up tasks.

## 4. Secret Rotation

Rotate via:
- `wrangler secret put`
- GitHub repository secrets if used by CI

Never store secrets in Git, docs, or client-side env examples.

## 5. Legacy Handling

- Do not use PM2 status, SSH procedures, or Nginx reload steps.
- Do not reference VPS-based recovery.
- If a historical note remains necessary, mark it explicitly as legacy and non-operational.
