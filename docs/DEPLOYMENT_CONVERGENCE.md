# DEPLOYMENT CONVERGENCE — ZAYRON-X

Repo vs Cloudflare, per worker. Evidence: live Workers/D1/Queues/Schedules API reads (2026-09-18) + repo wrangler configs.

---

## 1. Convergence matrix

| Worker (deployed) | Repo source | Config drift | Deployment drift | Schema drift | Verdict |
|---|---|---|---|---|---|
| `zayron-x-api` | `workers/api` | Routes declared (`zayron-x.co/api/*`); can't verify zone attachment from script list alone | modified 2026-09-16, HEAD commit 2026-09-11+P0 work — **likely 1+ versions behind repo** | binds prod D1 (mutated snowflake) | CONVERGE REQUIRED (redeploy from repo) |
| `zayron-x-api-preview` | `workers/api` env.preview | matches repo | modified 2026-09-17 (active testing) | preview DB (0 migrations) | ACTIVE dev target — this is where reality lives |
| `zayron-x-ingest` | `workers/ingest` | No cron in config AND none deployed (consistent) | modified 2026-09-11 — **oldest deploy; pre-dates P0 commit; 4 major repo changes since** | prod D1 | **GREATEST DRIFT** — redeploy required before any judgment of current ingest code |
| `zayron-x-ingest-preview` | env.preview | matches | modified 2026-09-16 | preview DB | ACTIVE |
| `zayron-telegram-collector-do` | `workers/telegram-collector-do` | matches | modified 2026-09-10 | prod D1 | behind staged changes (collector-do.ts heavily modified in working tree, +2,065 lines diff) |
| `zayron-telegram-collector-do-preview` | env.preview | matches | modified 2026-09-17 | preview DB | ACTIVE |
| `zayron-x-source-fabric` | `workers/source-fabric` | matches | modified 2026-09-08 | fabric DB | stable-ish; 2 dead-end queues |
| `zayron-x-source-fabric-staging` | env.staging | **staging binds PREVIEW D1** (`zayron-x-preview-db`) — deliberate but unusual; source-fabric-staging ALSO has its own `-staging` suffix deploy accident (below) | 2026-09-09 | preview DB | review staging strategy |
| `zayron-x-source-fabric-staging-staging` | ❌ none | — | deploy-command accident (`--env staging` applied twice) | — | orphan; delete candidate (after log check) |
| `zayron-x-web` | ❌ **no repo config** (apps/web/wrangler.jsonc has preview only) | — | deployed 2026-08-21, modified 2026-09-14 — **production web is un-reproducible from repo** | n/a | **CRITICAL: restore prod web config to repo** |
| `zayron-x-web-preview` | `apps/web/wrangler.jsonc` | matches (preview-only) | modified 2026-09-17 | n/a | ACTIVE |
| `zayron-x-preview` | ❌ none (root wrangler.toml declares non-deployability; name `zayron-x` ≠ `zayron-x-preview`) | — | created 2026-06-03 (first-gen monolith era) | prod D1 | legacy; freeze pending dependency check |
| `zayron-nvd-candidate-trigger` | ❌ none | — | 2026-08-29 | unknown | unknown provenance; freeze + inspect content |
| `zayron-x-api-diagnostic` | ❌ none | — | 2026-09-17 (same day as micro83/84 diagnostics) | — | diagnostic deploy; delete candidate |

## 2. Binding-level isolation (preview vs production)

| Binding | Prod | Preview | Isolation verdict |
|---|---|---|---|
| D1 `DB` | `zayron-x-db` | `zayron-x-preview-db` | ✅ separated |
| R2 `STORAGE` | `zayron-x-storage` | `zayron-x-storage-preview` | ✅ |
| R2 `KNOWLEDGE_BUCKET` | `zayron-x-knowledge` | ❌ **no preview binding declared** (api/ingest preview envs inherit nothing → prod bucket only declared at top level; api preview uses KNOWLEDGE_BUCKET? → top-level binding is NOT inherited into env.preview unless re-declared — actually top-level bindings DO apply to envs unless overridden; verify per-deploy) | ⚠️ ambiguous — audit on deploy |
| Queue `INGEST_QUEUE` | `zayron-ingest-queue` | `zayron-ingest-queue-preview` (api preview + ingest preview) | ✅ |
| Queue `PUBLISH_QUEUE` | `zayron-publish-queue` | ❌ **no preview producer/consumer** — publish path is prod-only | ⚠️ preview publishing blocked (consistent with frozen publish) |
| Service `INGEST` | `zayron-x-ingest` | `zayron-x-ingest-preview` | ✅ |
| Service `TELEGRAM_COLLECTOR_SERVICE` | prod collector | preview collector | ✅ |
| Service `KNOWLEDGE_PROCESSOR` | `zayron-x-api#KnowledgeProcessor` | ❌ not redeclared in preview env | ⚠️ ingest-preview's smoke test may resolve against PROD api depending on inheritance semantics — audit |
| Workflows | `zayron-research-workflow` (api) | ❌ none redeclared | ⚠️ same inheritance question |
| Vectorize | `zayron-knowledge-index` | ❌ none redeclared in preview envs (source-fabric staging uses `zayron-doc04-staging-index`) | ⚠️ preview reads/writes may hit prod index |
| AI | ✅ both | ✅ | ✅ |

**Pattern:** preview envs are PARTIALLY isolated — D1/queues/services are redeclared, but R2/Vectorize/workflows/service entrypoints rely on top-level inheritance or are missing. Every "missing redeclaration" is a potential preview→production write path. Per wrangler semantics top-level bindings apply to envs unless overridden, so `KNOWLEDGE_BUCKET` (prod bucket) and `VECTORIZE` (prod index) are LIVE in preview envs → **preview CAN write production R2/Vectorize today.**

## 3. Workflows & DO state

- `ResearchWorkflow` + `KnowledgeCorpusWorkflow` classes exported by `zayron-x-api`; ingest declares the same workflows with `script_name=zayron-x-api` (cross-worker binding, correct) while api's own config omits `script_name` (same-script, also correct). No drift, but two ways to bind — simplify.
- `TelegramCollectorDO`: SQLite-backed, migration tag v1, both prod + preview deployed.

## 4. Secrets/vars

- Production vars: `ENVIRONMENT`, `LEGACY_FREEZE=true` (api/ingest/collector), `TELEGRAM_TARGET_CHANNEL`, `API_ID` (collector, public int). Secrets not enumerable via API by design — assumed present (Telegram credentials, AI tokens). Root `.env` exists in repo root (303 bytes) — flagged: ensure it holds no production secrets (out of scope this pass; do not print).

## 5. Convergence actions (ordered, none executed)

1. Redeploy `zayron-x-ingest` from current repo (it is 3+ changes behind) — but ONLY after removing the queue-consumer frozen-no-ack defect (see STATIC/AI docs) to avoid re-arming a redelivery loop.
2. Restore production web config into `apps/web/wrangler.jsonc` (env.production) with `NEXT_PUBLIC_API_BASE_URL` pointing at the PRODUCTION API; fix `api.ts` hardcoded preview URL.
3. Redeclare `KNOWLEDGE_BUCKET`/`VECTORIZE`/workflows explicitly per env to make isolation explicit (deny inheritance ambiguity).
4. Delete-after-review: `zayron-x-api-diagnostic`, `zayron-x-source-fabric-staging-staging` (orphan), `zayron-nvd-candidate-trigger` (after content inspection), `zayron-x-preview` (after dependency + data check).
5. Add cron (e.g. `*/15 * * * *`) to ingest once discovery is unfrozen — see CLOUDFLARE_ARCHITECTURE_DECISION.
