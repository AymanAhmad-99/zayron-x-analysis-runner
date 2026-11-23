# DOC-04 Final Cloudflare D1 Gate Report

## ACTUAL D1 PROVEN

Migration 0018, idempotency, schema constraints, synthetic lifecycle, staging Worker binding, HTTP health, D1 seed requests, concurrency claim behavior, bounded 100/1,000-object batches, isolated Vectorize upsert/query, and staging FTS/hybrid routes were observed on Cloudflare resources.

## WORKER RUNTIME PROVEN

`zayron-x-source-fabric-staging` executed against `zayron-x-preview-db`. Health, D1, seed, AI embedding, Vectorize, FTS, and hybrid HTTP paths returned successfully where tested.

## SEED ENDPOINT PROVEN

Valid staging seed returned HTTP 200. Replay returned HTTP 409 after the local claim fix. Five concurrent identical requests produced one success and four HTTP 409 responses. Invalid revision, target, digest, count, and duplicate-ID requests were rejected with HTTP 409.

## CONCURRENCY RESULT

PASS for the conditional seed claim under the tested five-request contention. Broader network failure/retry races remain unverified.

## LARGE-BATCH RESULT

100 and 1,000 object requests succeeded. The 29,636-object corpus was not tested. Large-scale limits remain a risk.

## VECTORIZE RESULT

A separate `zayron-doc04-staging-index` was created. Synthetic upsert succeeded and retrieval succeeded after observed eventual consistency. Production Vectorize was not touched.

## HYBRID RETRIEVAL RESULT

Staging FTS and hybrid endpoints executed against D1. A pre-fix replay had created duplicate lexical rows; the local FTS projection cleanup was implemented and a fresh governed write produced one FTS row.

## PERFORMANCE BASELINE

Observed: 100-object seed 460 ms Worker time, 1,000-object seed 899 ms, FTS 71 ms, Vectorize query 1,026 ms, hybrid 442 ms. This is a lightweight baseline, not a stress test or p95 claim.

## CLOUDflare ARCHITECTURE ASSESSMENT

`ACCEPTED WITH CONTROLS`. No validated requirement in this gate requires leaving Cloudflare. Bounded ingestion, revision governance, isolated staging, attestation, and production freeze remain required controls.

## LOCAL FIXES ACTUALLY IMPLEMENTED

- Added isolated staging Worker environment bound to preview D1.
- Added target-D1 validation to the seed request.
- Added conditional seed revision claim and replay/concurrency rejection.
- Added FTS projection cleanup before governed object insertion.

## PRODUCTION STATE

Production remained read-only: 371 V3 rows, 371 FTS rows, 286 distinct hashes, zero migration-ledger rows, zero control-plane tables, no production Worker deployment, and no production Vectorize write.

## REMAINING UNKNOWN

- Full 29,636-object batch behavior.
- Mid-batch D1 rollback semantics.
- Network retry/timeout behavior under failure.
- Full production Vectorize parity.
- Historical production provenance and doc-02/doc-03 identity.

## REMAINING RISKS

- Malformed JSON currently returns HTTP 502 rather than a client-classified 400.
- Source-fabric staging configuration warns that top-level queues/R2 are not inherited; those bindings were intentionally not copied from production.
- Existing staging test data includes evidence of the pre-fix duplicate FTS behavior.

## ARCHITECTURAL DECISION

`ACCEPTED WITH CONTROLS`

## PRODUCTION AUTHORIZATION

`NOT AUTHORIZED`
