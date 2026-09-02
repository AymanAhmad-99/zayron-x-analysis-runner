# ZAYRON-X — DEAD CODE AND ORPHAN REGISTRY
**Date:** 2026-09-01 | **Classification:** Infrastructure Audit

---

## PURPOSE

This document inventories all dead code, orphaned directories, ghost imports, and stale artifacts found and remediated during the deep forensic audit.

---

## CONFIRMED DEAD AND REMOVED (2026-09-01)

| # | Item | Type | Evidence of Death | Action |
|---|------|------|------------------|--------|
| 1 | `apps/admin/` | Empty directory | `list_dir` returned zero files | DELETED |
| 2 | `apps/mobile/` | Empty directory | `list_dir` returned zero files | DELETED |
| 3 | `workers/canary-replay-trigger/` | Stub worker | `src/` empty, no `wrangler.toml` | DELETED |
| 4 | `workers/publisher-control/` | Stub worker | `src/` empty, no `wrangler.toml` | DELETED |
| 5 | `workers/canary-trigger/` | Stub worker | `src/` empty, no `wrangler.toml` | DELETED |
| 6 | `workers/agents/` | Ghost dir | Only `__pycache__/`, no `.ts`/`.py` source | DELETED |
| 7 | `workers/contracts/` | Ghost dir | Only `__pycache__/`, no `.ts`/`.py` source | DELETED |
| 8 | `workers/tests/` | Ghost dir | Only `__pycache__/`, no `.ts`/`.py` source | DELETED |
| 9 | `workers/__pycache__/` | Stale bytecode | Root-level compiled Python bytecode | DELETED |
| 10 | `instrumentation-client.ts` | Ghost import | `@sentry/nextjs` not in any `package.json`; file already gitignored (`.gitignore:135`) | DELETED |

---

## REDACTED SECRETS (2026-09-01)

| # | File | Secret | Before | After |
|---|------|--------|--------|-------|
| 1 | `workers/ingestors/.env.collector.example` | `TELEGRAM_API_ID` | `37585861` (real value) | `<YOUR_TELEGRAM_API_ID>` |
| 2 | `workers/ingestors/.env.collector.example` | `TELEGRAM_API_HASH` | `e38c7289b2050a99...` (real value) | `<YOUR_TELEGRAM_API_HASH>` |

---

## NORMALIZED FILES (2026-09-01)

| # | File | Change | Reason |
|---|------|--------|--------|
| 1 | `.env.example` | `VECTORIZE_INDEX` → `VECTORIZE_INDEX_NAME` | Align with `.env` |
| 2 | `.env.example` | `R2_KNOWLEDGE_BUCKET` → `R2_BUCKET_KNOWLEDGE` | Align with `.env` |
| 3 | `.env.example` | `R2_STORAGE_BUCKET` → `R2_BUCKET_STORAGE` | Align with `.env` |

---

## ACTIVE ITEMS — LEGITIMATELY PRESENT (NOT DEAD)

| Item | Type | Reason Active | Files |
|------|------|---------------|-------|
| `workers/ingestors/.env.collector.example` | Config template | Documents Telegram collector setup (now sanitized) | 1 |
| `workers/ingestors/__pycache__/` | None — deleted | N/A | 0 |
| `.agents/archive/` | Historical archive | Prior-session quarantine of legacy docs | ~53 files |
| `scripts/_phase*.py` | Prior audit scripts | Historical record of discovery process | ~5 files |

---

## GITIGNORE COVERAGE VERIFICATION

The following dead-file categories are already covered by `.gitignore`:

| Pattern | `.gitignore` Line | Coverage |
|---------|-----------------|---------|
| `__pycache__/` | Line 43 | ALL Python bytecode dirs |
| `*.pyc` | Line 44 | ALL compiled Python files |
| `instrumentation-client.ts` | Line 135 | This specific dead file |
| `.env.sentry-build-plugin` | Line 66 | Sentry placeholder env file |
| `*.session` | Line 24 | Telegram session files |
| `*.tg_session` | Line 25 | Telegram session files |

---

## POST-REMEDIATION STATE

### `workers/` directory (active workers only):
```
workers/
├── api/                      # zayron-x-api — ACTIVE
├── ingest/                   # zayron-x-ingest — ACTIVE
├── ingestors/                # .env.collector.example only (sanitized)
├── nvd-candidate-trigger/    # nvd cron trigger — ACTIVE
├── ready-candidate-trigger/  # ready cron trigger — ACTIVE
├── scripts/                  # operational scripts — ACTIVE
└── telegram-collector-do/    # Durable Object — ACTIVE
```

### `apps/` directory:
```
apps/
└── web/                      # zayron-x-web (OpenNext) — ACTIVE
```

---

## VERDICT: CLEAN — All dead code, ghost imports, stale bytecode, and empty stub directories have been removed. Repository contains only active, deployable, Cloudflare-native code.
