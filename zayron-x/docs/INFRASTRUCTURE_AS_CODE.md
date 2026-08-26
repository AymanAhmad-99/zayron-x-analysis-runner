# ZAYRON-X - Infrastructure as Code

**Status:** Cloudflare-native reference. Legacy VPS / PM2 / Nginx instructions are retired and must not be used as operating truth.

## 1. Infrastructure Inventory

### Source of truth

```text
ZAYRON-X Platform
├── Cloudflare Account
│   ├── Workers Script: zayron-x (production + preview)
│   ├── KV Namespace: ZAYRON_CACHE
│   ├── R2 Bucket: zayron-x-logs
│   ├── R2 Bucket: zayron-x-backups
│   ├── Custom Domain: zayron-x.com -> Worker
│   └── Logpush Jobs: workers_trace_events, http_requests
├── Sentry
│   ├── Project: zayron-x-web
│   └── Alerting and source maps
├── GitHub
│   ├── Repository: zayron-x/zayron-x
│   └── CI/CD: workflow automation and security checks
└── Browser / Public Web
    └── OpenNext on Cloudflare Workers
```

## 2. Cloudflare Provisioning

```bash
# Authenticate
wrangler login
wrangler whoami

# Create KV namespace
wrangler kv:namespace create ZAYRON_CACHE
wrangler kv:namespace create ZAYRON_CACHE --preview

# Create R2 buckets
wrangler r2 bucket create zayron-x-logs
wrangler r2 bucket create zayron-x-backups

# Deploy
bun run build
wrangler deploy --env preview
wrangler deploy --env production
```

## 3. Secrets

Cloudflare Secrets are the only approved runtime secret store.

```bash
wrangler secret put RESEND_API_KEY --env production
wrangler secret put ADMIN_USER --env production
wrangler secret put ADMIN_PASSWORD --env production
wrangler secret put REVALIDATION_SECRET --env production
wrangler secret put NVD_API_KEY --env production
wrangler secret put GEMINI_API_KEY --env production
wrangler secret put TELEGRAM_API_ID --env production
wrangler secret put TELEGRAM_API_HASH --env production
wrangler secret put NEXT_PUBLIC_SENTRY_DSN --env production
wrangler secret put SENTRY_AUTH_TOKEN --env production
```

## 4. Terraform Direction

Terraform is the preferred provisioning model for Cloudflare resources.

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}
```

Target resources:
- Workers
- KV
- R2
- Logpush
- DNS / routes

## 5. Routing Model

- Production must be canonical and explicit.
- Apex and `www` must not conflict.
- Routes must land on Cloudflare first.
- Any fallback origin is not part of the primary request path.

## 6. Legacy Policy

- Any historical VPS / PM2 / Nginx notes are deprecated.
- Do not copy them into new procedures.
- Replace them with Cloudflare Worker, KV, R2, and Wrangler instructions.
