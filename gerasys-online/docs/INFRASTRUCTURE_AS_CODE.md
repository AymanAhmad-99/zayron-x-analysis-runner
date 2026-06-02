# ZAYRON-X — Infrastructure as Code

**Version:** 1.0  
**Date:** 2026-06-02  
**Status:** CLI commands documented; Terraform/Pulumi proposal included  

---

## 1. Infrastructure Inventory

### Resource Map

```
ZAYRON-X Platform
├── Cloudflare Account
│   ├── Workers Script: zayron-x (production + preview)
│   ├── KV Namespace: ZAYRON_CACHE
│   ├── R2 Bucket: zayron-x-logs
│   ├── R2 Bucket: zayron-x-backups
│   ├── Custom Domain: zayron-x.com → Worker
│   └── Logpush Jobs (2x: workers_trace_events, http_requests)
│
├── Supabase Project
│   ├── PostgreSQL Database (with Drizzle ORM schema)
│   ├── Auth (Supabase Auth with SSR)
│   ├── Storage (article images, assets)
│   ├── Edge Functions (future)
│   └── PITR Backups (continuous WAL + daily pg_dump)
│
├── Upstash Redis
│   └── Global Redis instance (rate limiting + cache)
│
├── Sentry
│   ├── Project: zayron-x-web
│   ├── Alert Rules (7x — see ALERTING_RULES.md)
│   └── Auth Token (source-map uploads)
│
├── Google AI
│   └── Gemini API Key (LLM intelligence pipeline)
│
├── GitHub
│   ├── Repository: zayron-x/zayron-x
│   ├── CI/CD: .github/workflows/ci.yml
│   ├── Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, etc.
│   └── Dependabot (dependency monitoring)
│
└── VPS (Hetzner / DigitalOcean / AWS EC2)
    ├── PM2 Process Manager
    │   ├── zayron-web (Next.js — 2 instances, cluster mode)
    │   ├── telegram-radar (Python, every 15 min)
    │   ├── article-engine (Python, every 5 min)
    │   ├── cti-ingestion (Python, every 3 hours)
    │   └── cve-worker (Python, every 6 hours)
    ├── Nginx (reverse proxy → localhost:3000)
    └── Cron Jobs
        ├── Daily DB backup (03:00 UTC)
        └── Weekly backup verification (Sunday 04:00 UTC)
```

---

## 2. Recreate From Scratch — CLI Commands

### 2.1 Cloudflare Workers

```bash
# Authenticate
wrangler login
wrangler whoami

# Create KV namespace
wrangler kv:namespace create ZAYRON_CACHE
# → Copy the `id` to wrangler.toml → top-level kv_namespaces[0].id
wrangler kv:namespace create ZAYRON_CACHE --preview
# → Copy the `preview_id` to wrangler.toml → top-level kv_namespaces[0].preview_id

# Create R2 buckets
wrangler r2 bucket create zayron-x-logs
wrangler r2 bucket create zayron-x-backups

# Set R2 lifecycle (log retention)
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/zayron-x-logs/lifecycle" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"rules":[{"id":"expire-90d","status":"enabled","filter":{"prefix":""},"deleteObjectsAfterDays":90}]}'

# Deploy Worker (initial)
bun run build
wrangler deploy --env production

# Deploy Worker (preview)
wrangler deploy --env preview

# Upload secrets (16 total — run each interactively)
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put DATABASE_URL --env production
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put REDIS_URL --env production
wrangler secret put REDIS_TOKEN --env production
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

# Repeat with --env preview for preview environment
```

### 2.2 Supabase

```bash
# Via Supabase CLI
supabase login
supabase init

# Create a new project (or use existing)
# Dashboard → New Project → zayron-x
# Note the project reference ID and region

# Link local project
supabase link --project-ref [PROJECT_REF]

# Apply database schema
bun run db:push

# Apply RLS policies
# Copy supabase_rls_policies.sql → Supabase SQL Editor → Run

# Enable PITR backups
# Dashboard → Database → Backups → Enable PITR

# Store connection strings
# DATABASE_URL = postgresql://postgres.[REF]:[PASSWORD]@aws-1-us-west-1.pooler.supabase.com:6543/postgres
# SUPABASE_URL = https://[REF].supabase.co
```

### 2.3 Upstash Redis

```bash
# Create Redis instance via Upstash Console
# https://console.upstash.com/redis
# → Create Redis Database
# → Region: us-west-1 (same as Supabase for low latency)
# → Type: Global (for edge routing from Cloudflare Workers)
# → Note REST URL and token

# Store as Cloudflare Worker secrets
wrangler secret put REDIS_URL --env production
# Value: https://[UPSTASH_ENDPOINT].upstash.io
wrangler secret put REDIS_TOKEN --env production
# Value: [UPSTASH_REST_TOKEN]
```

### 2.4 Sentry

```bash
# 1. Create Sentry project (via web UI)
#    https://sentry.io/organizations/zayron-x/projects/new/
#    → Platform: Next.js
#    → Project name: zayron-x-web

# 2. Note the DSN
#    Settings → Projects → zayron-x-web → Client Keys (DSN)

# 3. Create Auth Token for source maps
#    Settings → Account → API → Auth Tokens → Create
#    Scopes: project:releases, org:read

# 4. Store in Cloudflare
wrangler secret put NEXT_PUBLIC_SENTRY_DSN --env production
# Value: https://[KEY]@o[ORG_ID].ingest.us.sentry.io/[PROJECT_ID]
wrangler secret put SENTRY_AUTH_TOKEN --env production
# Value: [AUTH_TOKEN]

# 5. Configure Alert Rules (7 total)
#    Sentry → Alerts → Create Alert → follow ALERTING_RULES.md
```

### 2.5 GitHub

```bash
# Repository secrets (Settings → Secrets and variables → Actions)
# Add each:
gh secret set CLOUDFLARE_API_TOKEN --body "[TOKEN]"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "[ACCOUNT_ID]"
gh secret set DATABASE_URL --body "[DATABASE_URL]"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "[KEY]"
gh secret set SENTRY_AUTH_TOKEN --body "[TOKEN]"
gh secret set NEXT_PUBLIC_SENTRY_DSN --body "[DSN]"

# Enable Dependabot
# Settings → Code security → Dependabot → Enable
```

### 2.6 VPS (Application Server)

```bash
# Assumes Ubuntu 22.04 LTS on Hetzner/DigitalOcean/AWS EC2

# ── Initial Setup ─────────────────────────────────────
ssh root@[VPS_IP]

# Create user
adduser zayron
usermod -aG sudo zayron
su - zayron

# Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip nginx python3 python3-pip postgresql-client

# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Node.js (for PM2)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
npm install -g pm2

# ── Clone & Build ─────────────────────────────────────
sudo mkdir -p /var/www/zayron
sudo chown zayron:zayron /var/www/zayron

git clone https://github.com/zayron-x/zayron-x.git /var/www/zayron
cd /var/www/zayron/gerasys-online
bun install --frozen-lockfile --production
bun run build

# ── PM2 Setup ─────────────────────────────────────────
pm2 start /var/www/zayron/gerasys-online/pm2.ecosystem.config.js
pm2 save
pm2 startup systemd  # → follow instructions to enable boot-start

# ── Nginx Setup ───────────────────────────────────────
sudo tee /etc/nginx/sites-available/zayron-x << 'EOF'
server {
    listen 80;
    server_name zayron-x.com www.zayron-x.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/zayron-x /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# ── SSL (Certbot) ─────────────────────────────────────
sudo snap install --classic certbot
sudo certbot --nginx -d zayron-x.com -d www.zayron-x.com
sudo systemctl enable certbot.timer

# ── Cron Jobs ─────────────────────────────────────────
(crontab -l 2>/dev/null; echo "0 3 * * * /var/www/zayron/scripts/backup-db.sh") | crontab -
(crontab -l 2>/dev/null; echo "0 4 * * 0 /var/www/zayron/scripts/verify-backup.sh") | crontab -

# ── Firewall ──────────────────────────────────────────
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 3. Infrastructure Diagrams

### Network Flow

```
Internet
  │
  ├─ zayron-x.com (DNS → Cloudflare)
  │     │
  │     └─ Cloudflare Worker (zayron-x-production)
  │           │
  │           ├─ KV (ZAYRON_CACHE) ← ISR cache
  │           ├─ R2 (zayron-x-logs) ← Logpush
  │           ├─ R2 (zayron-x-backups) ← DB dumps
  │           │
  │           ├─ Supabase (postgresql://...pooler.supabase.com:6543)
  │           │     ├─ PostgreSQL (primary)
  │           │     ├─ Auth (Supabase Auth)
  │           │     └─ Storage (S3-compatible)
  │           │
  │           ├─ Upstash Redis (https://...upstash.io)
  │           │     ├─ Rate limiting (sliding window)
  │           │     └─ Read-through cache
  │           │
  │           └─ Google Gemini API (generativelanguage.googleapis.com)
  │
  └─ VPS (origin server, not in request path)
        ├─ Nginx → localhost:3000 (Next.js PM2 cluster)
        ├─ PM2 scheduled jobs (Python workers)
        └─ Cron: daily backups → R2
```

---

## 4. Terraform / Pulumi Proposal

### Recommended Approach: Terraform + Cloudflare Provider

Pulumi is also viable but Terraform has more mature Cloudflare support.

### Terraform Module Structure (Proposed)

```
terraform/
├── main.tf                    # Provider configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── terraform.tfvars.example   # Example variable values
│
├── modules/
│   ├── worker/
│   │   ├── main.tf            # cloudflare_worker_script
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── kv/
│   │   ├── main.tf            # cloudflare_workers_kv_namespace
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── r2/
│   │   ├── main.tf            # cloudflare_r2_bucket
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── secrets/
│   │   ├── main.tf            # cloudflare_workers_secret (16 secrets)
│   │   └── variables.tf
│   │
│   └── logpush/
│       ├── main.tf            # cloudflare_logpush_job
│       ├── variables.tf
│       └── outputs.tf
```

### Example: main.tf

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
  backend "s3" {
    bucket = "zayron-x-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-west-1"
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "supabase" {
  access_token = var.supabase_access_token
}

# ── KV Namespace ──────────────────────────────────────
resource "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.cloudflare_account_id
  title      = "ZAYRON_CACHE"
}

# ── Worker Script ─────────────────────────────────────
resource "cloudflare_worker_script" "zayron" {
  account_id    = var.cloudflare_account_id
  name          = "zayron-x-production"
  content       = file("../.open-next/worker.js")
  module        = true
  compatibility_date = "2025-09-23"
  compatibility_flags = ["nodejs_compat"]

  kv_namespace_binding {
    name         = "ZAYRON_CACHE"
    namespace_id = cloudflare_workers_kv_namespace.cache.id
  }

  secret_text_binding {
    name = "DATABASE_URL"
    text = var.database_url
  }
  # ... (repeat for all 16 secrets)

  routes {
    pattern = "zayron-x.com"
    custom_domain = true
  }
  routes {
    pattern = "www.zayron-x.com"
    custom_domain = true
  }
}

# ── R2 Buckets ────────────────────────────────────────
resource "cloudflare_r2_bucket" "logs" {
  account_id = var.cloudflare_account_id
  name       = "zayron-x-logs"
}

resource "cloudflare_r2_bucket" "backups" {
  account_id = var.cloudflare_account_id
  name       = "zayron-x-backups"
}

# ── Logpush Jobs ──────────────────────────────────────
resource "cloudflare_logpush_job" "worker_logs" {
  account_id       = var.cloudflare_account_id
  name             = "zayron-x-worker-logs"
  dataset          = "workers_trace_events"
  destination_conf = "r2://zayron-x-logs/worker-logs/{DATE}?account=${var.cloudflare_account_id}"
  enabled          = true
  frequency        = "high"
}
```

### Migration Path

| Phase | Timeline | Action |
|---|---|---|
| **Phase 1 (Current)** | Today | CLI-documented IaC (this document) |
| **Phase 2** | Month 1–2 | Terraform state import of existing resources |
| **Phase 3** | Month 2–3 | Add CI-driven Terraform plan on PR |
| **Phase 4** | Month 3–4 | Full GitOps: Terraform apply on merge to production |

---

## 5. Cost Estimates

| Resource | Provider | Estimated Monthly Cost |
|---|---|---|
| Workers (Paid plan) | Cloudflare | $5 + usage ($0.30/M requests) |
| KV (ZAYRON_CACHE) | Cloudflare | $0.50/GB stored + $0.50/M reads |
| R2 (logs + backups) | Cloudflare | $0.015/GB/month stored |
| Supabase (Pro plan) | Supabase | $25/month |
| Upstash Redis (Pay-as-you-go) | Upstash | ~$10/month (low traffic) |
| Sentry (Team plan) | Sentry | $26/month |
| VPS (2 vCPU, 4 GB RAM) | Hetzner | ~$12/month |
| **Total** | | **~$80–120/month** |

---

## 6. Environment Parity

| Resource | Production | Preview |
|---|---|---|
| Worker | `zayron-x-production` | `zayron-x-preview` |
| KV | `c5704144e6984dd597e2f000a1e84aa2` | `834e78268ee0457196ecf48026b06ece` |
| R2 Logs | `zayron-x-logs` | (shared) |
| Supabase | `[PROD_PROJECT_REF]` | `[PREVIEW_PROJECT_REF]` (separate project) |
| Redis | Production Upstash DB | Preview Upstash DB (separate) |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` (prod DSN) | Preview DSN (or `--env preview` secret) |
| Domain | `zayron-x.com` | `preview.zayron-x.workers.dev` |
