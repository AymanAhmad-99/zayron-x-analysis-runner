# Seed Execution Flow

1. HTTP request enters `workers/source-fabric/src/index.ts`, route `/internal/v3-pilot-d1-seed` (lines 187–330).
2. Authorization checks POST and `Bearer ${env.PIPELINE_TEST_TOKEN}` (line 188). Failure returns 404.
3. JSON is parsed (line 194). Malformed JSON reaches the route catch and returns 502.
4. Required linkage fields are checked (lines 205–207).
5. Control-plane corpus/seed rows are joined from D1 (lines 212–220).
6. Approval, target D1, execution state, digest, and count are checked (lines 221–225).
7. Optional V3/FTS schema initialization occurs before claiming (lines 226–251).
8. Payload count and unique object IDs are validated (lines 252–255).
9. Seed revision is conditionally claimed with `NOT_STARTED → RUNNING` (line 263).
10. Per-object V3, FTS delete, and FTS insert statements are accumulated in memory (lines 266–310).
11. The accumulated object statements execute through one `SOURCE_STATE.batch(stmts)` call (line 311).
12. Seed state updates `RUNNING → SUCCEEDED` (line 313).
13. On post-claim exception, seed state updates to `FAILED` and HTTP 502 is returned (lines 320–329).

The claim and final state updates are separate D1 calls from the object batch. The object batch is not explicitly wrapped in an application-created transaction. No chunking or retry loop exists in this route.
