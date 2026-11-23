# ZAYRON-X Source Fabric Foundation

Status: local foundation only. No production bindings, migrations, queues, buckets, routes, or secrets were changed.

The registry contains 40 disabled-by-default sources. The adapter contract enforces the collection sequence: discover, collect, validate, hash, persistRaw, normalize, emitEvidence, recordHealth, and advanceCheckpoint. Raw payloads are represented by an R2 key and an immutable content hash; queue messages should carry only source/artifact/event references.

Cloudflare Radar is contextual telemetry. Its observations retain dataset, endpoint, time window, measurement, collection time through the artifact envelope, and explicit limitations. Radar output cannot independently establish exploitation of a specific vulnerability.

## Current conflict inventory

| Existing resource | Classification | Reason |
|---|---|---|
| `zayron-x-db` / `DB` | LEGACY / RETIRE | Frozen production D1; must not be reused by the new foundation |
| `zayron-x-knowledge`, `zayron-x-storage` | LEGACY / ARCHIVE | Existing R2 buckets; preserve until dependency and retention review |
| `zayron-ingest-queue`, `zayron-publish-queue` | LEGACY / RETIRE | Historical pipeline queues; no new source consumer may attach |
| `zayron-x-api`, `zayron-x-ingest`, ready trigger | LEGACY / RETIRE | Frozen Workers and historical mutation surface |
| Telegram Durable Object | LEGACY / RETIRE | Discovery-only policy; no auto-publication |
| `zayron-x.co` routes/custom domains | KEEP | Public shell remains live; source fabric must not claim these routes |

## Target names (not provisioned)

`zayron-source-collection-*`, `zayron-source-events-v1`, `zayron-source-state`, and `zayron-source-raw`. Provisioning requires a separate Cloudflare conflict review and explicit deployment gate.

## Architecture

```text
40 sources -> isolated adapters -> collection events -> R2 raw artifacts
                                      -> normalization -> evidence -> new D1 structured state
                                      -> correlation -> vulnerability analysis -> selective publication
```

Collection is separate from publication. Telegram remains discovery-only. Publication budget is a policy gate, not a collection limit.
