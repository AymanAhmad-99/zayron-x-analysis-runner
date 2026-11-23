# ZAYRON-X Phase 0 Containment Report

**Baseline:** `phase0-2026-09-10-67fc65a2`  
**HEAD at baseline:** `67fc65a2d5fd367e44b20714bafa5d0e9e8b1721`  
**Mode:** containment and recovery; no database, R2, Queue, Vectorize, Worker, or deployment mutation.

## A. VERIFIED NOW

- Git HEAD was recorded as `67fc65a2d5fd367e44b20714bafa5d0e9e8b1721`.
- Git status contained 751 entries at capture; the worktree was already non-clean.
- The worktree contained staged additions/deletions/modifications and one untracked fresh-audit report. No reset, clean, stash, checkout, or overwrite was performed.
- `workers/ingest/src/index.ts` previously set `intelligence_events.status='READY_TO_PUBLISH'`, inserted `articles.is_published=1`, and sent `PUBLISH_INTELLIGENCE` from the ingest path.
- The ingest path is now fail-closed: it inserts `articles.is_published=0`, sets the event to `QUARANTINED` with `INGEST_TRUST_GATE_NOT_PROVEN`, and gates the publish handoff behind `trustGateProven=false`.
- Static scan shows the ingest path no longer contains an active `status = 'READY_TO_PUBLISH'` assignment.
- The canonical API Trust Workflow still contains the only intended live `READY_TO_PUBLISH` transition observed in `workers/api/src/index.ts`; it requires its local `trustPassed` calculation.
- `scripts/persist_live_article.ts` can generate direct `READY_TO_PUBLISH` SQL, but it calls `requireNonProductionMutationAuthorization` before doing so.
- **NEW P0 finding:** the API Trust path previously used `evidence.every(...)` without requiring a non-empty evidence set; JavaScript makes `[].every(...)` true. This was an independent fail-open path.
- The API Trust path now requires `evidence.length > 0 && evidence.every(...)` before returning `READY_TO_PUBLISH`.
- `PRODUCTION_MUTATION_LOCKED=true` is the default in the local TypeScript mutation guard.
- `zayron-x-api` secret listing returned only the secret name `API_HASH`; the Worker itself was reported not found.
- Credential-like material exists in Telegram tooling and `workers/source-fabric/.dev.vars`; values were not printed.
- Local negative/quality tests passed: 22 passed, 0 failed across publication, truthfulness, and zero-defect suites.
- Public GET probes to `/api/health`, `/api/v1/health`, `/api/v1/intelligence`, and `/api/v1/sources` returned HTTP 404, so no live route-level mutation or bypass test was possible.

## B. INFERRED

- The previous ingest code was an unsafe publication transition because it did not prove the canonical Trust Workflow before creating a publicly flagged article and queue handoff.
- The containment change prevents that specific deployed ingest code path from creating a ready/publication handoff if deployed.
- The canonical API Trust path may still be safe only if its `trustPassed` evidence rule is sufficient and the API Worker is actually deployed; both require further proof.
- The repository's large staged/untracked change set makes it unsafe to infer that any other file is disposable or authoritative.

## C. UNKNOWN

- Whether the containment patch has been deployed. No deployment was performed.
- Whether any other deployed Worker version contains the old ingest behavior.
- Whether `API_HASH` is active, exposed in historical revisions, or used by a deployed Worker.
- Whether Telegram's provider has invalidated or rotated the old API hash.
- Whether `.env`, `.pilot-token.tmp`, or `.dev.vars` are required by a deployed path.
- Whether all internal API routes enforce authentication and authorization.
- Whether any external caller can reach a legacy script outside the local lock.

## D. BLOCKED

- Credential rotation: blocked because Telegram API credential rotation requires the authoritative Telegram application/control-plane account; no provider rotation operation was executed or evidenced.
- Cloudflare API Worker runtime negative testing: blocked because Wrangler reported `zayron-x-api` not found (`10007`) and public API paths returned 404.
- Old-secret invalidation: blocked because no provider-side rotation occurred.
- Full runtime negative testing for missing/invalid evidence IDs, failed downstream dependencies, and unauthorized internal invocation: blocked by missing live API Worker/runtime.

## E. Files changed

1. `workers/ingest/src/index.ts` — containment only; no schema or architecture change.
2. `workers/api/src/index.ts` — fail-closed empty-evidence Trust guard.
3. `docs/forensics/PHASE0_BASELINE_2026-09-10.json` — additive machine-readable baseline.
4. `docs/forensics/PHASE0_CONTAINMENT_REPORT_2026-09-10.md` — additive evidence report.

No existing file was reset, deleted, cleaned, or discarded.

## F. Cloudflare resources changed

None. No D1, R2, Queue, Vectorize, Worker, secret, route, or deployment was changed.

## G. Secrets rotated

None. No rotation success is claimed.

## H. Old secrets invalidated

UNKNOWN/BLOCKED. Provider-side invalidation was not performed.

## I. READY_TO_PUBLISH paths found

| Path | Capability | Containment status |
|---|---|---|
| `workers/ingest/src/index.ts` | direct event status, article publication flag, publish queue | contained in current source; deployment unverified |
| `workers/api/src/index.ts` Trust Workflow | sets status after `trustPassed` | not changed; runtime unavailable |
| `workers/api/src/index.ts` publisher | accepts only `READY_TO_PUBLISH` or `PUBLISHED` | gate present; runtime unavailable |
| `scripts/persist_live_article.ts` | generates direct ready/publication SQL | local mutation guard present; never executed |

## J. First negative test result

**Static containment test: PASS.** The current ingest file has no active direct ready assignment, uses `QUARANTINED`, sets `is_published=0`, and has no active publish handoff because `trustGateProven=false`. The API Trust path now rejects an empty evidence set before evaluating `every(...)`.

## K. Second independent verification result

**Local negative check: PASS.** An empty evidence array evaluated to `trustPassed=false` under the guarded expression.  
**Local test suite: PASS.** 22 publication/truthfulness/zero-defect tests passed.  
**Live route verification: BLOCKED.** Public API paths returned 404 and the declared API Worker was absent. Therefore Phase 0 cannot be closed.

## L. Remaining P0 blockers

1. Rotate/revoke Telegram API hash through the authoritative provider.
2. Inspect and rotate any active `.env`, `.dev.vars`, `.pilot-token.tmp`, Cloudflare, or webhook credentials.
3. Restore or formally retire the missing `zayron-x-api` identity.
4. Verify the containment patch in the deployed Worker before enabling any ingestion.
5. Prove the canonical Trust Workflow with live negative and positive tests.
6. Confirm every legacy mutation tool remains locked.
7. Reconcile deployed versions and routes with the current source.

## M. Exact evidence commands/tests

```text
git rev-parse HEAD
git status --porcelain=v1
git diff --stat
rg -n "READY_TO_PUBLISH|PUBLISH_INTELLIGENCE|is_published|PUBLISH_QUEUE" workers scripts packages apps
npx wrangler secret list --name zayron-x-api
npx wrangler secret list --name zayron-telegram-collector-do
curl.exe ... https://zayron-x.co/api/v1/health
bun test tests/publication_gate_regression.test.ts tests/zero_defect_publication_gate.test.ts tests/truthfulness_remediation.test.ts
```

## Final status

# PHASE 0 PARTIAL

Containment was applied and independently checked locally, but Phase 0 is not closed because provider-side secret rotation, old-secret invalidation, deployed patch verification, and live route-level negative testing remain unavailable.
