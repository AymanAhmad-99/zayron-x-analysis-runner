# Chunk seed execution graph

`workers/scripts/plan_v3_chunks.py` reads all selected JSONL files, sorts by `object_id`, computes the object-set SHA-256, partitions into 500-object payload files, and emits chunk IDs/digests.

`workers/source-fabric/src/index.ts:187-202` `/internal/v3-seed/chunks/plan` validates approved corpus/seed linkage and inserts `PLANNED` rows in `v3_seed_chunks`.

`workers/source-fabric/src/index.ts:204-233` `/internal/v3-seed/chunks/execute` validates the caller-supplied chunk linkage, atomically claims `PLANNED`/`FAILED`, batches V3 `INSERT OR REPLACE`, FTS delete, and FTS insert, then marks the chunk complete.

`workers/source-fabric/src/index.ts:235-246` `/internal/v3-seed/finalize` counts chunk rows and changes the seed to `SUCCEEDED`.

There is no persisted payload store, digest recomputation, attestation, lease, stale-runner takeover, or independent seed reconciliation.
