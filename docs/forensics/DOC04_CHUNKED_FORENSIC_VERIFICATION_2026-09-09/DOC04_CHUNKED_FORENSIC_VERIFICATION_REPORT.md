# DOC04 Chunked Forensic Verification Report

## EXECUTIVE VERDICT

The architecture improves request and D1 batch bounding, but it is not yet safe to call fully resumable. Payloads are caller-held, chunk digests are not recomputed by the Worker, stale `RUNNING` chunks have no automatic recovery, and finalization lacks independent reconciliation. Decision: `NOT READY`.

## ACTUAL CHUNK ARCHITECTURE

Local planner creates 60 deterministic chunk artifacts. Worker stores metadata only, then receives one chunk payload per execute request.

## DATA / PAYLOAD STORAGE MODEL

No durable payload storage exists. Resume is partial: the original caller or local artifact must remain available.

## MEMORY BOUNDARY

Execution is bounded to one request chunk, but local planning loads all objects. Byte-boundary validation is absent.

## TRANSACTION BOUNDARY

V3 and FTS writes share one D1 batch. Claim and completion are separate calls. A crash after the batch and before completion leaves `RUNNING`.

## IDEMPOTENCY

Completed replay is protected, but Worker-side payload digest verification is missing. Same registered chunk ID/digest with altered object contents is not rejected cryptographically.

## RESUMABILITY

`PARTIAL`: metadata supports retry, but payloads are not durable and stale-running takeover is absent.

## FAILURE RECOVERY

Caught failures become `FAILED` and can retry. Process death has a recovery gap.

## STALE RUNNING RECOVERY

`PARTIAL`: no lease, heartbeat, timeout, or takeover.

## FTS CONSISTENCY

The intended per-chunk V3/FTS batch is coherent, but runtime proof is blocked.

## VECTORIZE RELATIONSHIP

Vectorize is not touched by chunk execution and remains derived/separate.

## CONCURRENCY

Conditional chunk claim is database-protected. Runtime concurrency proof is unavailable.

## LARGE-BATCH MATHEMATICS

29,636 = 59 × 500 + 136 = 60 chunks. Local digest and plan match those values.

## D1 LIMITS

Cloudflare documents 100 bound parameters per query, approximately 5,000 Worker bindings, and 1,000/50 queries per invocation on Paid/Free plans. The per-object SQL statements are below the parameter limit, but a 500-object request creates 1,500 statements and 10,500 bindings across the batch. Exact runtime safety is unverified.

## D1 COST / QUOTA IMPLICATIONS

The observed staging failure was a free-tier daily row-read exhaustion, not evidence that chunk logic is defective. A quota-capable environment is required for runtime validation.

## OLD VS NEW ARCHITECTURE

The new path bounds each request and batch but does not yet close durability and recovery gaps.

## DEFECTS FOUND

1. No persisted payload/recovery source.
2. No Worker-side chunk digest recomputation.
3. No stale-running takeover.
4. Finalization does not independently reconcile objects, hashes, ordinals, or digests.
5. No byte-size guard.

## LOCAL FIXES IMPLEMENTED

None during this verification gate.

## TESTS

Local full plan PASS. Live staging tests were intentionally stopped after the quota blocker. No large remote run was attempted.

## PRODUCTION VERIFICATION

Read-only production state remains 371 V3 rows, 371 FTS rows, 286 distinct hashes, zero migration rows, and absent control-plane tables. No production mutation occurred.

## NEXT RUNTIME TEST

After quota reset or Workers Paid capacity, run a four-object staging contract test covering plan, execute, replay, malformed/digest mismatch, failed retry, concurrent claim, FTS parity, and finalize. Only after those pass should a bounded 10K pilot be considered.
