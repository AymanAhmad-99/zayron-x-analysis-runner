# DOC04 Resumable Seed Remediation Report

## ROOT CAUSE

The prior implementation stored chunk metadata but not payloads, trusted caller-provided chunk digests, and had no stale-`RUNNING` recovery.

## OLD ARCHITECTURE

Caller supplied each chunk payload directly to the execute endpoint. V3 and FTS writes were batched, while claim and completion were separate D1 calls.

## NEW ARCHITECTURE

Chunk execution now independently recomputes the canonical chunk digest from `object_id`, `document_id`, and `content_hash`. Chunk claims carry a generated owner token and a 15-minute lease; expired `RUNNING` chunks are reclaimable. Completion and failure updates require ownership.

## PAYLOAD DURABILITY

PARTIAL. The current patch authenticates received payloads but does not yet persist payloads in R2. Caller retention remains required for recovery.

## PAYLOAD INTEGRITY

Improved locally: the Worker recomputes and compares the chunk digest before claiming. Whole-seed digest reconciliation remains incomplete.

## CHUNK IDENTITY

Planner identity remains deterministic; Worker now validates payload digest against the registered digest.

## CLAIM / LEASE MODEL

Additive migration `0020_v3_seed_recovery.sql` adds payload metadata, owner, and lease expiry. Claims are conditional and ownership-bound.

## TRANSACTION MODEL

V3 and FTS writes remain one batch. Claim/completion remain separate, so reconciliation is still required after a crash between data commit and completion.

## CRASH RECOVERY

Expired running claims can be reclaimed. Replay remains data-idempotent through object replacement and FTS delete/insert, but durable payload storage is still outstanding.

## RETRY MODEL

`PLANNED`, `FAILED`, and expired `RUNNING` are retryable. Active leases and completed chunks are rejected/replayed respectively.

## STALE RUNNING RECOVERY

Implemented as a 15-minute lease expiry and conditional takeover.

## FINALIZATION

Existing finalization still needs independent object/hash/ordinal reconciliation before production use.

## FTS CONSISTENCY

The per-chunk V3/FTS batch is preserved. Runtime proof remains blocked by staging quota.

## VECTORIZE RELATIONSHIP

Chunk execution does not touch Vectorize. D1 remains authoritative.

## CONCURRENCY

Owner-token conditional claims prevent two active owners for one chunk. Runtime tests were not repeated.

## MEMORY BOUNDARY

Worker receives one chunk, not the full corpus. The local planner remains an offline full-corpus tool.

## BYTE BOUNDARY

No byte guard was added because a safe limit still requires measured staging/runtime evidence; this remains an open control.

## D1 COST/QUOTA CONSIDERATIONS

No remote D1 calls were made during this remediation. Production remains untouched.

## TEST RESULTS

Focused static/source verification completed. Remote tests remain blocked by prior staging D1 free-tier exhaustion.

## LOCAL FIXES

Added `0020_v3_seed_recovery.sql`; added digest recomputation, lease expiry, owner-token claim, owner-bound completion, and owner-bound failure handling in `workers/source-fabric/src/index.ts`.

## PRODUCTION VERIFICATION

Read-only known state: 371 V3 rows, 371 FTS rows, 286 distinct hashes, zero migration rows, and absent control-plane tables.

## REMAINING UNKNOWN

R2 payload persistence, crash-after-commit reconciliation, FTS parity, concurrency, and 10K/29,636 runtime behavior.

## REMAINING RISKS

The implementation is not production-authorized until payload durability and independent reconciliation are implemented and tested.
