# DOC-04 Control-Plane Dependency Graph

```text
db/migrations/0018_v3_control_plane.sql
  ↓ creates
v3_document_identities / v3_corpus_revisions / v3_seed_revisions /
v3_deployment_revisions / v3_production_dataset_states
  ↓ represented and validated by
packages/intelligence/src/control_plane/contract.ts
  ↓ consumed by
workers/source-fabric/src/index.ts
  ↓ route
/internal/v3-pilot-d1-seed
  ↓ only after authorization, revision lookup, digest/count/idempotency checks
D1 V3 write path
```

```text
local corpus objects
  ↓ object_id/document_id/content_hash entries
v3_reconcile_readonly.py
  ↓ deterministic sorted canonical representation
object-set digest
  ↓ recorded by corpus/seed revision contract
seed revision
  ↓ future release linkage
deployment revision
  ↓ future measured state linkage
production dataset attestation
```

Actual source references: migration DDL is in `0018_v3_control_plane.sql`; contract functions are in `contract.ts`; the seed route and D1 writes are in `workers/source-fabric/src/index.ts`; the local reconciliation implementation is `workers/scripts/v3_reconcile_readonly.py`.

There is no implemented historical provenance repository, deployment repository, or production attestation record in the current database. Those are forward-looking schema capabilities only.
