# ZAYRON-X AI Context
## WHAT ZAYRON-X IS
A fully Cloudflare-native intelligence platform.
## CANONICAL FRONTEND
apps/web
## PRODUCTION WORKERS
zayron-x-web, zayron-x-api, zayron-x-ingest, zayron-telegram-collector-do
## CLOUDFLARE RESOURCES
zayron-x-db (D1), zayron-ingest-queue (Queue), zayron-knowledge-index (Vectorize)
## TELEGRAM
MTProto connection maintained by zayron-telegram-collector-do Durable Object.
## CI/CD
Deployment gated by GitHub Actions (`.github/workflows/zayron-web-production.yml`).
## PROTECTED SYSTEMS
Database, domains, telegram session, queue.
## HOW TO VALIDATE CHANGES
Run `governance-check.sh`, `architecture-drift-check.sh`, and `project-reconcile.sh`.
