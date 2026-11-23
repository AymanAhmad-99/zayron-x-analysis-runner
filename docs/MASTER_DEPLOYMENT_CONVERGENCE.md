# MASTER DEPLOYMENT CONVERGENCE

| Resource | Repository | Preview | Production | Match? | Drift | Risk |
|---|---|---|---|---|---|---|
| zayron-x-api | ✅ | ✅ env.preview | deployed 09-16 | PARTIAL | code likely behind HEAD | MEDIUM |
| zayron-x-ingest | ✅ | ✅ | deployed **09-11** | NO | 4+ repo changes behind; no cron in either | HIGH (dormancy) |
| telegram-collector-do | ✅ | ✅ | 09-10 vs staged working-tree edits | NO | analysis import +2k line diff pending | MEDIUM |
| source-fabric (+staging×2) | ✅ | staging→preview DB | 09-08/09 | PARTIAL | `-staging-staging` orphan | LOW |
| zayron-x-web | ❌ **no config** | ✅ | deployed 09-14 | NO | **UNREPRODUCIBLE prod web** | HIGH |
| zayron-x-preview worker | ❌ | — | deployed 06-24 | NO | UNREPRODUCIBLE | HIGH (unknown behavior) |
| nvd-candidate-trigger | ❌ | — | deployed 08-29 | NO | UNREPRODUCIBLE | MEDIUM |
| api-diagnostic | ❌ | — | 09-17 | NO | diagnostic debris | LOW |
| D1 zayron-x-db | 25 migrations | — | 6 applied | NO | script mutation | HIGH |
| D1 preview-db | 25 migrations | 0 applied | — | NO | snowflake | MEDIUM |
| KNOWLEDGE_BUCKET (R2) | prod binding | inherits prod | prod | PARTIAL | preview can write prod bucket | HIGH |
| VECTORIZE | prod index | inherits prod | prod | PARTIAL | preview can write prod index | HIGH |
| PUBLISH_QUEUE | prod only | none | prod | — | preview publish impossible | LOW |
| Cron | none | none | none | ✅ | BOTH missing discovery | CRITICAL |
| Web→API base | hardcoded preview URL in api.ts | preview | n/a | NO | **prod web reads preview API** | CRITICAL |

**Verdict:** production is not a deployment of this repository. Four resources are UNREPRODUCIBLE. The only fully converged env is preview — which is where all real activity happens.
