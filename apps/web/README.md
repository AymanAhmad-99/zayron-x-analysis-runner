# ZAYRON-X Web

Canonical frontend for ZAYRON-X Cyber Threat Intelligence platform.

## Architecture
- **Framework**: Next.js 16 (Turbopack) & OpenNext
- **Target Runtime**: Cloudflare Workers
- **Production Domain**: `https://zayron-x.co`

## Deployment
```bash
# Build Cloudflare package
bun run build:cf

# Deploy to Cloudflare Production
bun run deploy:production
```

