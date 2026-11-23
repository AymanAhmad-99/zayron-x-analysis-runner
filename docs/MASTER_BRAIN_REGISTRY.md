# MASTER BRAIN REGISTRY (independent components capable of intelligence decisions)

| Brain | File | Symbol | Responsibility | Caller | Active? | Production? | Duplicate? | Legacy? |
|---|---|---|---|---|---|---|---|---|
| Engine v2 orchestrator | engine_v2/index.ts | executeDeepIntelligenceAnalysisV2 | full signal→report pipeline | collector (relative import), api routes | ✅ | partial | duplicates analyst | no |
| Enrichment (P0.1) | engine_v2/enrichment.ts | enrichAuthoritativeData | KEV/EPSS/CVSS/exploit status via evidence ports | engine_v2 pipeline | ✅ | partial | — | no (migrated this pass) |
| Analyst engine | analyst/engine.ts | runIntelligenceAnalyst | dossier narrative + confidence | api routes, ResearchWorkflow | ✅ | partial | duplicates engine_v2 | no |
| Engine v1 | engine/engine.ts | legacy analysis | superseded analysis | barrel export only | ❌ | no | — | YES |
| Core pipeline | core/pipeline.ts + kernel | rust-kernel validation | report validation | api | ✅ | yes (validation) | overlaps gates | no |
| Pipeline canonical/fusion | pipeline/canonical.ts, fusion.ts | matchCanonicalEvent, evaluateCorroboration | event identity + corroboration | ingest queue consumer | ✅ | yes | overlaps fabric | no |
| Reporting engine | reporting/engine.ts + compiler | ReportingEngine | template report compile | productionReports (static seeding) | ❌ | no | duplicates compiler v2 | partial |
| Static report registry | reporting/productionReports.ts | ProductionReportRegistry | import-time fixture seeding | barrel export | ❌ | no (UNSAFE if bundled) | — | YES |
| Ingestion adapters | ingestion/* | mapCisaKevRecord etc. | structured source mapping | ingest consumer (CVE_PROCESS) | ✅ | partial | overlaps sources/ | no |
| Sources framework | sources/adapters.ts (2017 LOC) | CVESourceAdapter, reconcileOpenSourceEnrichment | canonical vulnerability build + CPE | api adapter routes, micro75/76 | ✅ | partial | overlaps ingestion | no |
| Normalization | normalization/pipeline.ts | normalizeIntelligenceSignal | text normalize/validate | ingest consumer | ✅ | yes | — | no |
| Resolution | resolution/index.ts | resolveVulnerability/Actor/Malware + static registries | entity identity | ingest, collector | ✅ | yes | — | partial (registries) |
| Publishing | publishing/publisher.ts + gate | publishApprovedIntelligence | trust gate + article render | 3 owners | ✅ | frozen | — | no |
| Knowledge corpora ×3 | knowledge/manifest, corpus, corpus_expanded_350, master_manifest, v3 | static chunk sets | retrieval context | api RAG, engine_v2 router | ✅ | yes (gen3 D1) | 3 generations | gen1/2 YES |
| RAG/retrieval | rag/retrieval.ts, engine_v2/shadow_vectorize.ts | executeHybridRetrieval | hybrid D1+vector retrieval | api, collector | ✅ | yes | shadow duplicates | no |
| Confidence ×5 | engine_v2/index, analyst/confidence, reporting/qualityGate, core/consistency, corroboration | various | confidence semantics | respective brains | ✅ | yes | **5 different semantics** | — |
| Quality gates ×2 | engine_v2/quality_gate.ts, reporting/qualityGate.ts | evaluate* | report acceptance | respective compilers | ✅ | yes | 2 rule sets | — |
| Fabric pipeline | workers/source-fabric | collection/normalization/evidence stages | 5-stage source fabric | queues (2 unconsumed) | ✅ | partial | overlaps ingest | no |

## Multiple-brain divergence demonstration (same CVE, different answers)
CVE-2024-3400: Path B (queue) → text-extracted severity, no KEV/EPSS; Path D (canary, pre-P0.1) → hardcoded KEV + fabricated EPSS 0.942; Path E (collector, pre-P0.1) → same fabricated pair. Post-P0.1, engine_v2 paths now require injected evidence — divergence remains BETWEEN brains, not within.
