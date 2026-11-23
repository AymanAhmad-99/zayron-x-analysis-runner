# MASTER CVE PATH MATRIX

## Path inventory
| # | Path | Entry | Status |
|---|---|---|---|
| A | Scheduled discovery → queue | ingest.scheduled | **DEAD** (no cron + frozen) |
| B | Queue consumer | ingest.queue | SEMI (prod: testRun only) |
| C | NVD canary RPC | api → INGEST.submitNvdCanary | FROZEN in prod, live preview |
| D | Canary analysis routes | api POST /canary/* | FROZEN in prod |
| E | Telegram signal | collector → queue | HISTORICALLY LIVE (4041 msgs) |
| F | ResearchWorkflow | on-demand | LIVE (preview/triggered) |
| G | source-fabric queues | fabric worker | 2 of 5 stages have NO consumer |

## Stage equivalence matrix
| Stage | A/B (queue) | C (canary) | D (canary routes) | E (telegram→engine_v2) | F (workflow) | Converged? |
|---|---|---|---|---|---|---|
| MAPPING | CVESourceAdapter/mapCisaKevRecord | inline | inline | text regex | analyst brain | ❌ |
| VALIDATION | validateStructuredCVERecord | ad-hoc | ad-hoc | none | gate | ❌ |
| NORMALIZATION | text pipeline | partial | partial | text pipeline | text pipeline | ❌ |
| ENRICHMENT | none (text) | engine_v2 | engine_v2 | engine_v2 (ports post-P0.1) | analyst | ❌ |
| ANALYSIS | matchCanonicalEvent+heuristics | analyst | engine_v2 | engine_v2 | analyst | ❌ |
| EVIDENCE | evidence table | canary path | in-process | evidence table | ledger | ❌ (3 stores) |
| SEMANTIC | none | validators | validators | validators | quality gate | ❌ |
| CONFIDENCE | heuristics | analyst | engine_v2 matrix | engine_v2 matrix | analyst | ❌ (5 calc) |
| REPORT | event fields | report obj | compiler v2 | compiler v2 | analyst templates | ❌ |
| PUBLISH | via publish queue | — | direct | — | via publish | ❌ (3 owners) |
| PERSIST | intelligence_events | canary_events | articles | — | event_trace | ❌ |

**Answer to §10: there is NO single complete canonical CVE lifecycle.** Paths diverge at MAPPING and never reconverge. Post-P0.1, at least ENRICHMENT now has one evidence-gated implementation shared by engine_v2 consumers (collector, canary, api routes); the queue path never calls it.
