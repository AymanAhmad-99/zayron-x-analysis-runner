# ZAYRON-X Permanent Engineering Governance System

## WHAT ZAYRON-X IS
A fully Cloudflare-native intelligence platform.

## ARCHITECTURE
- **WHERE THE FRONTEND IS**: `apps/web`
- **WHERE BACKEND IS**: `workers/api`, `workers/ingest`
- **WHERE TELEGRAM IS**: `workers/telegram-collector-do`
- **WHERE D1 IS**: `zayron-x-db`
- **WHERE RAG IS**: `workers/ingest` (Vectorize: `zayron-knowledge-index`)
- **WHERE AI IS**: Cloudflare Workers AI

## HOW TO TEST
Use the L0-L9 testing levels defined in `TESTING_POLICY.md`.

## HOW TO DEPLOY
Via GitHub Actions CI/CD to `zayron-x-web`.

## WHAT IS PROTECTED
See `PROTECTED_ZONES.md`. (D1, Do, Queues, Vectors, CI/CD).

## WHAT REQUIRES AUTHORIZATION
Any change to P0 zones requires Architecture Change Request.

## HOW TO REPORT UNCERTAINTY
Mark as UNKNOWN. Do not guess.
