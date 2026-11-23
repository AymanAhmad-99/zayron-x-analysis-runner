# DOC-04 Operational Stress & Failure-Semantics Gate

## LARGE-BATCH RESULT

100, 1,000, and 5,000 object requests succeeded. The 10,000 object request returned HTTP 502 after approximately 41 seconds and wrote zero object/FTS rows. Larger stages were stopped at that boundary.

## ROLLBACK RESULT

The controlled mid-batch NOT NULL failure produced zero object and FTS rows. After the local fix, the seed state becomes `FAILED`. The pre-fix 10,000 failure left `RUNNING`, proving recovery semantics matter.

## RETRY/TIMEOUT RESULT

Completed request replay and concurrency are safe-with-controls. Client timeout and network interruption behavior remain unverified. A failed seed is rejected for replay until an explicit recovery protocol exists.

## IDEMPOTENCY RESULT

Conditional seed claim is atomic under tested contention. Same seed replay returns 409. Different-key identical-payload policy remains not fully defined.

## CONCURRENCY RESULT

Five simultaneous identical requests produced one success and four 409 responses.

## FTS RESULT

New governed writes maintain one FTS projection per object. The prior duplicate replay artifact remains in staging as evidence; it was not silently normalized.

## VECTORIZE RESULT

Isolated staging Vectorize upsert and retrieval passed after eventual consistency. Production Vectorize was untouched. Orphan scenarios were not fully exercised.

## HYBRID RETRIEVAL RESULT

Staging FTS, Vectorize, and hybrid paths executed. Full corpus reconciliation was not run.

## PERFORMANCE CHARACTERIZATION

Observed Worker/client timings: 100 = 460/815 ms; 1,000 = 899/1,100 ms; 5,000 = 11,472/12,082 ms; 10,000 failed at 41,069 ms. These are observations, not p95 benchmarks.

## D1 OPERATIONAL LIMITS

Cloudflare's current documented limits include 100 KB SQL statement length, 100 bound parameters per query, 30-second maximum query duration, plan-dependent Worker request body limits, and 1,000-vector Worker Vectorize upsert batches. The current seed route accumulates a large request and one large D1 batch, creating a demonstrated 10,000-object risk.

## LOCAL FIXES ACTUALLY IMPLEMENTED

- Seed claims now transition failed writes to `FAILED`.
- Existing target-D1, conditional claim, replay protection, and FTS projection cleanup remain active.

## PRODUCTION VERIFICATION

Production remained unchanged: 371 V3 rows, 371 FTS rows, 286 distinct hashes, zero migration records, zero control-plane tables, and no production writes/deployments.

## REMAINING RISKS

- No resumable/chunked seed protocol exists for batches at or above the observed 10,000-object failure.
- Timeout/network interruption recovery is not proven.
- Failed seed revisions require an explicit recovery protocol.
- Full Vectorize orphan and full-corpus reconciliation remain unverified.

## ARCHITECTURE STATUS

`ACCEPTED WITH CONTROLS`
