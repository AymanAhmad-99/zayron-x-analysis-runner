# DOC04 Payload Reconciliation Gate Report

## CURRENT DEFECTS

Durable R2 payload registration/retrieval is not yet connected to chunk execution. Finalization is not yet independently reconciled against V3 and FTS.

## PAYLOAD DURABILITY

PARTIAL. D1 metadata exists, but caller-independent R2 recovery is not proven.

## PAYLOAD INTEGRITY

Semantic chunk digest recomputation is implemented. Byte-level R2 verification is pending.

## CHUNK RECOVERY

Lease expiry and owner-bound takeover are implemented.

## LEASE RECOVERY

Implemented locally; runtime validation remains blocked.

## CRASH AFTER COMMIT

Local reconciliation logic exists, but Worker finalization does not invoke it yet.

## CRASH BEFORE COMMIT

Expired claims can retry; durable payload retrieval is pending.

## RECONCILIATION

Added deterministic local verifier for payload counts, duplicate IDs, chunk digests, and object-set digest. D1/FTS comparison is not yet connected.

## FINALIZATION

Still requires independent reconciliation integration before completion can be trusted.

## DIGEST RECONSTRUCTION

Implemented in `workers/scripts/reconcile_v3_seed.py` using the deterministic canonical-entry algorithm.

## FTS CONSISTENCY

V3/FTS batch behavior remains unchanged; runtime parity is unverified.

## VECTORIZE RELATIONSHIP

Vectorize remains separate and derived.

## TEST RESULTS

Local code and planner/reconciler inspection completed. Small D1 contract is `BLOCKED_BY_ENVIRONMENT`; 10K and 29,636 tests were not run.

## LOCAL FIXES

Added the deterministic read-only reconciler and evidence package. Existing lease/digest fixes remain in place.

## D1 CONTRACT RESULT

Blocked by the previously observed staging free-tier D1 row-read exhaustion.

## PRODUCTION VERIFICATION

Read-only state remains V3 371, FTS 371, distinct hashes 286, migrations 0, and production writes 0.

## REMAINING RISKS

R2 payload persistence, R2 fail-closed execution, D1/FTS independent reconciliation, and finalization integration remain incomplete.
