# ENGINEERING RECOVERY BASELINE — ZAYRON-X

**Created:** 2026-09-18 (Phase 0 checkpoint)
**Auditor:** Principal Engineering Recovery (forensic pass)
**Rule in force:** No destructive action. No schema modification. No deployment. No deletion of pre-existing developer changes.

---

## 1. Repository state at checkpoint

| Item | Value |
|---|---|
| Branch | `cleanup/forensic-production-simplification` |
| HEAD SHA | `17f197c27f5092fcf6fbcbfe6462cc0603dd2785` |
| HEAD subject | `fix(core): complete P0 remediation — secrets isolation, ingest quarantine, type safety, queue consumers, and api route alignment` |
| Working tree | **DIRTY — 1,074 paths** (staged + unstaged, pre-existing, NOT created by this audit) |
| Staged changeset | 753 files, +1,394,309 / −44,250 lines (includes `.zayron/` knowledge corpus, backups, canonical-v1 NDJSON, remediation logs) |
| Contributors | 1 human, 203 commits, first commit 2026-05-28 |

### Known pre-existing artifacts in tree (not touched by this audit)
- `.zayron/**` — knowledge corpus, backups, SQL batches, remediation logs (staged)
- `P0_CLEANUP_*.{md,json}` at repo root — prior P0 pass outputs (staged)
- `micro7x_*.json`, `task91_*.json`, `micro85..89_*.json` at repo root — prior micro-verification outputs
- `scratch/`, `validation/`, `tests/fixtures/`
- `workers/api/workers/api/dist-micro77d3/` — **committed build output inside source tree** (historical accident)
- `.tmp-micro77-check/` — prior diagnostic scratch
- Multiple `*.bak.*` NDJSON files under `.zayron/knowledge/canonical-v1/`

**Instruction preserved:** none of the above may be overwritten or discarded during this phase.

## 2. Cloudflare account inventory (live, read-only API, 2026-09-18)

Account: `56534d53775d8280011a325dcf36ed09`

### 2.1 Workers deployed (14)

| Worker | Created | Last modified | In repo? |
|---|---|---|---|
| `zayron-x-api` | 2026-09-11 | 2026-09-16 | ✅ `workers/api` |
| `zayron-x-api-preview` | 2026-09-12 | 2026-09-17 | ✅ `workers/api` (env.preview) |
| `zayron-x-ingest` | 2026-09-11 | **2026-09-11** | ✅ `workers/ingest` |
| `zayron-x-ingest-preview` | 2026-09-16 | 2026-09-16 | ✅ `workers/ingest` (env.preview) |
| `zayron-telegram-collector-do` | 2026-09-10 | 2026-09-10 | ✅ `workers/telegram-collector-do` |
| `zayron-telegram-collector-do-preview` | 2026-09-17 | 2026-09-17 | ✅ (env.preview) |
| `zayron-x-source-fabric` | 2026-09-07 | 2026-09-08 | ✅ `workers/source-fabric` |
| `zayron-x-source-fabric-staging` | 2026-09-09 | 2026-09-09 | ✅ (env.staging) |
| `zayron-x-source-fabric-staging-staging` | 2026-09-09 | 2026-09-09 | ❌ **orphan deploy** (double-suffix accident) |
| `zayron-x-web` | 2026-08-21 | 2026-09-14 | ⚠️ **deployed but config absent from repo** |
| `zayron-x-web-preview` | 2026-09-11 | 2026-09-17 | ✅ `apps/web` (wrangler.jsonc) |
| `zayron-x-preview` | 2026-06-03 | 2026-06-24 | ❌ **legacy monolith, not in repo** |
| `zayron-nvd-candidate-trigger` | 2026-08-29 | 2026-08-29 | ❌ **not in repo** |
| `zayron-x-api-diagnostic` | 2026-09-17 | 2026-09-17 | ❌ diagnostic deploy, not in repo |

### 2.2 D1 databases (3)

| Database | UUID | Size | Bound by |
|---|---|---|---|
| `zayron-x-db` (PRODUCTION) | `c19c8f45-801b-4034-bd76-402e5e5389b5` | 100.2 MB | api, ingest, telegram-collector-do |
| `zayron-x-preview-db` | `34962f8f-abd1-4b0b-8bd7-b4eab59bd902` | 3.3 MB | all `_preview`/`_staging` envs |
| `zayron-x-intelligence-db` | `91ed8f95-95ad-4451-bb18-e0d1dbadbe53` | 3.1 MB | source-fabric only |

### 2.3 Queues (8)

| Queue | Consumers |
|---|---|
| `zayron-ingest-queue` | worker consumer ✅ |
| `zayron-ingest-queue-preview` | worker consumer ✅ |
| `zayron-publish-queue` | worker consumer ✅ |
| `zayron-x-source-collection` | worker consumer ✅ |
| `zayron-x-source-normalization` | worker consumer ✅ |
| `zayron-x-source-evidence` | worker consumer ✅ |
| `zayron-x-source-analysis` | ❌ **NO CONSUMER** (dead-end) |
| `zayron-x-source-publication` | ❌ **NO CONSUMER** (dead-end) |

### 2.4 Cron triggers

**ZERO cron schedules across all 14 workers.** No `[triggers]` in any repo wrangler config. Scheduled CVE discovery is not wired to any schedule. Repo config and deployment state agree on this.

### 2.5 R2 / Vectorize / Workflows / DOs
- R2 buckets referenced in configs: `zayron-x-storage`, `zayron-x-storage-preview`, `zayron-x-knowledge`, `zayron-x-intelligence-raw` (bucket API list not enumerated in this pass; flagged for follow-up).
- Vectorize index referenced: `zayron-knowledge-index` (+ `zayron-doc04-staging-index` in source-fabric staging).
- Workflows: `ResearchWorkflow`, `KnowledgeCorpusWorkflow` exported from `zayron-x-api`.
- Durable Objects: `TelegramCollectorDO` (SQLite-backed, migration tag v1).

## 3. D1 production state (read-only observations)

- 51 user tables; `d1_migrations` records **only 6 of 25 repo migrations applied** (0000–0005). Schema drift is structural: migrations 0006→0023 were never applied yet their tables exist (ad-hoc script mutation).
- 9 `*_quarantine_bak` tables (backup remnants inside production).
- Row counts (key tables): `vulnerabilities` 1,238 (all with `cvss_score=NULL`, `epss_score=NULL`); `articles` 2 (1 published); `reports` 0; `intelligence_reports` 0; `canonical_vulnerabilities` 0; `vulnerability_source_records` 0; `intelligence_evidence` 0; `relations` 5,283; `source_messages` 4,041; `event_trace` 23,524; `knowledge_chunks` 33,540; `knowledge_documents` 75.
- Table `cves` does **not exist** in production (referenced in prior audit docs as a concern — CONTRADICTED BY CURRENT EVIDENCE).
- Last pipeline activity (`event_trace`): **2026-09-12 09:52:07 UTC**. Dormant since.
- Consumer stage health: 11,218 STARTED / 4,754 COMPLETED / **6,313 FAILED (~56%)**.

## 4. Deployment identifiers

| Env | Worker | Notes |
|---|---|---|
| Production API | `zayron-x-api` | routes `zayron-x.co/api/*` (per repo config; verify zone on deploy) |
| Preview API | `zayron-x-api-preview` | workers.dev |
| Production web | `zayron-x-web` | deployed 2026-08-21; repo config missing |
| Preview web | `zayron-x-web-preview` | workers.dev |

## 5. Destructive actions explicitly FORBIDDEN in this phase

1. `wrangler delete` of ANY worker — including `zayron-x-preview`, `zayron-nvd-candidate-trigger`, `zayron-x-api-diagnostic`, `zayron-x-source-fabric-staging-staging` (all pending dependency analysis).
2. Any D1 schema change (ALTER/DROP/CREATE) on any database.
3. Any queue create/delete/unbind.
4. Any R2 object or bucket deletion.
5. Any Vectorize index deletion.
6. `git reset`/`checkout`/`stash` over pre-existing developer changes.
7. Editing or deleting `.zayron/**` corpus or backup files.
8. Applying pending migrations 0006–0023 without the reconciliation plan in `docs/D1_SCHEMA_RECONCILIATION.md`.
9. Deploying any worker (production or preview).
10. Revoking or rotating any secret without owner approval.

## 6. Evidence priority applied during this audit

1. Live Cloudflare API state (workers, D1, queues, schedules) — primary
2. Repository code and wrangler configs — primary
3. D1 production/preview contents — primary
4. Tests — secondary (see STATIC_INTELLIGENCE_AUDIT for fixture leakage)
5. Docs (100+ forensic reports in repo root + docs/) — tertiary; several prior claims CONTRADICTED by current evidence, noted inline in the deliverables.
