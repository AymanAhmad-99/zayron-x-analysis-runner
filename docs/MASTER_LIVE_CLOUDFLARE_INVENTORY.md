# MASTER LIVE CLOUDFLARE INVENTORY (verified via API 2026-09-18)

## Workers (14)
| Worker | Last modified | Repo config | Classification |
|---|---|---|---|
| `zayron-x-api` | 2026-09-16 | ✅ workers/api | ACTIVE (prod) — likely behind HEAD |
| `zayron-x-api-preview` | 2026-09-17 | ✅ (env.preview) | ACTIVE (dev target) |
| `zayron-x-ingest` | 2026-09-11 | ✅ workers/ingest | DORMANT — no cron, oldest deploy |
| `zayron-x-ingest-preview` | 2026-09-16 | ✅ | ACTIVE (preview) |
| `zayron-telegram-collector-do` | 2026-09-10 | ✅ | ACTIVE (collection) |
| `zayron-telegram-collector-do-preview` | 2026-09-17 | ✅ | ACTIVE (preview) |
| `zayron-x-source-fabric` | 2026-09-08 | ✅ | SEMI-ACTIVE (2 dead-end queues) |
| `zayron-x-source-fabric-staging` | 2026-09-09 | ✅ | FROZEN |
| `zayron-x-source-fabric-staging-staging` | 2026-09-09 | ❌ | ORPHAN (deploy accident) |
| `zayron-x-web` | 2026-09-14 | ❌ **no repo config** | **UNREPRODUCIBLE** (prod web) |
| `zayron-x-web-preview` | 2026-09-17 | ✅ apps/web | ACTIVE (preview) |
| `zayron-x-preview` | 2026-06-24 | ❌ | UNREPRODUCIBLE (legacy monolith) |
| `zayron-nvd-candidate-trigger` | 2026-08-29 | ❌ | UNREPRODUCIBLE |
| `zayron-x-api-diagnostic` | 2026-09-17 | ❌ | UNREPRODUCIBLE (diagnostic debris) |

## Bindings matrix (prod / preview)
| Resource | Production | Preview |
|---|---|---|
| D1 `DB` | `zayron-x-db` | `zayron-x-preview-db` |
| R2 `STORAGE` | `zayron-x-storage` | `zayron-x-storage-preview` |
| R2 `KNOWLEDGE_BUCKET` | `zayron-x-knowledge` | ⚠️ inherits prod bucket (no preview redeclaration) |
| Queue `INGEST_QUEUE` | `zayron-ingest-queue` | `zayron-ingest-queue-preview` |
| Queue `PUBLISH_QUEUE` | `zayron-publish-queue` | ❌ none |
| Vectorize | `zayron-knowledge-index` | ⚠️ inherits prod index |
| Service `INGEST` | `zayron-x-ingest` | `zayron-x-ingest-preview` |
| Service `TELEGRAM_COLLECTOR_SERVICE` | prod collector | preview collector |
| Service `KNOWLEDGE_PROCESSOR` | `zayron-x-api#KnowledgeProcessor` | ⚠️ not redeclared (inheritance ambiguity) |
| Workflows | `ResearchWorkflow`, `KnowledgeCorpusWorkflow` (api) | not redeclared |
| AI | Workers AI both envs | ✅ |

## Routes / domains
- `zayron-x.co/api/*` → `zayron-x-api` (per repo config; zone attachment not verifiable via scripts API — flag).
- Web: prod `zayron-x-web` (workers.dev + unknown route), preview `zayron-x-web-preview` (workers.dev).

## Schedules
None on any of the 14 workers (live-verified). The `scheduled()` handler in ingest is unreachable.

## Environment variables/secrets (non-secret observations)
`ENVIRONMENT`, `LEGACY_FREEZE=true` (prod api/ingest/collector), `TELEGRAM_TARGET_CHANNEL`, `API_ID` (collector). Gemini key referenced via `process.env` in code — will not resolve as a Worker secret (see MASTER_AI_MODEL).
