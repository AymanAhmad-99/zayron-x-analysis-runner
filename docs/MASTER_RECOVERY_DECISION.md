# MASTER RECOVERY DECISION

## Prior-audit re-verification ledger
| Prior finding | Verdict this pass |
|---|---|
| Zero cron triggers / dormant discovery | PREVIOUS AUDIT CONFIRMED (live API, all 14 workers) |
| 6/25 migrations journaled; script-mutated schema | CONFIRMED (live d1_migrations) |
| 1238 vulnerabilities, all null CVSS/EPSS | CONFIRMED (live aggregates) |
| Canonical core empty; 1 article published | CONFIRMED |
| Dormant since 2026-09-12 | CONFIRMED (MAX(event_trace)) |
| 2 dead-end fabric queues; no DLQ anywhere | CONFIRMED |
| 4 unreproducible workers (web, preview, nvd-trigger, diagnostic) | CONFIRMED |
| Web hardcoded to preview API | CONFIRMED (apps/web/app/lib/api.ts:357) |
| Static KEV dictionary + fabricated EPSS | CONFIRMED and **REMOVED** (P0.1, this pass) |
| Three divergent CVE brains | CONFIRMED (path matrix §10); engine_v2 consumers now evidence-gated |
| "Multiple confidence calculators (5)" | CONFIRMED |
| Prior docs' claim that a `cves` table is a risk | PREVIOUS AUDIT CONTRADICTED — table does not exist |

## What is actually BROKEN (truth/integrity)
- Discovery automation absent (no cron) → the product cannot ingest without humans.
- Data fidelity: structured sources flattened at the ingest boundary → null CVSS/EPSS across the board, due dates never modeled.
- Fabricated intelligence (KEV/EPSS) — removed this pass for engine_v2 paths; queue path bypasses enrichment entirely (no enrichment at all).
- Publication deadlock (frozen no-ack) + three owners.
- Prod web reads preview API.
- Preview→prod write paths via binding inheritance.

## What is merely UGLY
4,792-line router; relative cross-package imports; committed dist bundles; 100+ root-level artifact files; two lockfiles; regex XML parsing.

## What is LEGACY
`zayron-x-preview` worker, engine v1, static corpora gen1/2, business tables, `_bak` tables, canary identity store.

## What is DANGEROUS
Unreproducible prod workers (unknown behavior, unauditable) · preview→prod R2/Vectorize writes · no DLQ (message loss after retries) · static actor/malware registries (code-level poisoning surface) · `workers/scripts/*.py` direct prod SQL.

## DELETE (after backup/export + inspection)
`zayron-x-preview`, `zayron-nvd-candidate-trigger`, `zayron-x-api-diagnostic`, `zayron-x-source-fabric-staging-staging`, committed dist dirs, engine v1 module, corpora gen1/2, `productionReports` runtime seeding, `_bak` tables, root artifact JSONs (relocate).

## MERGE
2 quality gates → 1 · 5 confidence calculators → 1 · 3 evidence stores → 1 · 3 publication stores → 1+articles · canary identity → main · fabric queues → processor job types · 2 lockfiles → 1.

## KEEP
Evidence model + event_trace · structured parsers (sources/adapters, ingestion adapters) · publication gate · grounding/epistemic validators · knowledge v3 · collector DO · ResearchWorkflow (on-demand) · micro75/76 fidelity tests (fix their broken expectations in P1).

## FREEZE
Gemini reasoner · business tables · fabric DB · direct-to-prod scripts (immediately).

## REBUILD
The queue consumer's flatten boundary (structured mappers) · migration journal (reconciled, idempotent) · queue path enrichment wiring (ports to real KEV/EPSS feeds via D1) — inside the NEW processor.

## What becomes canonical (the one recommendation)
**Option A: Queue + ONE deterministic processor + D1 state machine** (full spec: MASTER_CLOUDFLARE_DECISION, MASTER_TARGET_ARCHITECTURE). Rejected alternatives: B/C (Workflows add a second state store and engine semantics for a minutes-scale pipeline; keep ResearchWorkflow for on-demand), D (current fragmentation is the disease), full rewrite (destroys proven parsers, gates, trace, evidence assets).

**Sequence:** finish P0 config/security items → reconcile migrations → processor + ports + golden suite → retire parallel brains → real-world canary (new CVE through cron→web, replay/duplicate/quarantine proofs) → then domains.

## CTO final answer (§75)
Ship: cron → ingest (discovery+transport) → INGEST_QUEUE(+DLQ) → **one processor** (adapters→canonical→ports-based enrichment→evidence→invariants→confidence→publish-decision) → D1 truth + R2 raw + Vectorize index + collector DO → publish queue → api (read+publish) → env-driven web. Remove: fabricated-anything, parallel brains, unreproducible workers, flatten boundary, direct-prod scripts, static corpora gen1/2, orphan queues. Preserve: parsers, gates, validators, evidence/trace models, knowledge v3, DO. Sequence: P0 config/security (days) → migration reconciliation (week) → processor core + golden suite (2–3 weeks) → brain retirement + canary proof (2 weeks) → launch baseline → domains by 3-file extensions.
