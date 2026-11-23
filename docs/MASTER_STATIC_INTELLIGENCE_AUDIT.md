# MASTER STATIC INTELLIGENCE AUDIT (post-P0.1 status)

| # | Dataset | Location | Classification | Status after this pass |
|---|---|---|---|---|
| S1 | KNOWN_CISA_KEV_ENTRIES (8 CVEs) | was engine_v2/enrichment.ts:10 | UNSAFE (fabricated KEV authority) | **REMOVED from runtime** — records moved to `tests/fixtures/kev_evidence_fixture.ts`, injected via port in tests only. Production module grep-clean. |
| S2 | calculateEpss fabricated table | was engine_v2/enrichment.ts | UNSAFE (fake probabilities: 0.942/0.815/…) | **REMOVED** — EPSS now from injected EpssEvidencePort; no evidence → null (UNKNOWN). |
| S3 | Text-mention → KEV membership | was enrichment.ts:215 | UNSAFE (arbitrary text granted catalog status) | **REMOVED** — mentions demoted to exploit_status telemetry; membership only via evidence port. |
| S4 | CANONICAL_ACTORS / CANONICAL_MALWARE | resolution/index.ts | UNSAFE-as-authority | OPEN — static registries still feed resolution (P1 scope). |
| S5 | Static corpora gen1/gen2 | knowledge/manifest.ts, corpus.ts, corpus_expanded_350.ts, master_manifest.ts | LEGACY | OPEN — served by knowledge/RAG routes (P1 scope). |
| S6 | ProductionReportRegistry + CVE-2024-3400/WannaCry fixtures | reporting/productionReports.ts + fixture files | UNSAFE in runtime / TF isolated | OPEN — barrel-exported; not observed in worker import graph but deletion blocked only by test rewiring (P1 scope). |
| S7 | micro*/task91/ground-truth JSON | repo root | HISTORICAL | OPEN (relocate to validation/artifacts). |
| S8 | workers/targets.json (channel list) | workers/ | config-as-data | LOW (fold into D1 sources). |
| S9 | KEV oracle fixture (6 CVEs) | tests/fixtures/ground_truth_oracles.ts | TEST FIXTURE | OK (isolated). |

## Verification performed this pass
- `grep KNOWN_CISA_KEV_ENTRIES|calculateEpss` over `packages/ workers/ apps/ scripts/ validation/`: **0 hits** (dist artifacts excluded).
- Falsifiability test proves enrichment output is driven by the injected port, not any residual registry: restricting evidence to one CVE flips all other CVEs to ABSENT (tests/unit/p01_evidence_enrichment.test.ts).
