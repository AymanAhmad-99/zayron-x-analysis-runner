# CVE BRAIN INVENTORY — ZAYRON-X

Every function/symbol that performs CVE-relevant processing: normalize, enrich, resolve, interpret, analyze, confidence, evidence, semantics, report build, publish, persist.

**Critical question: Can two paths process the same CVE and produce different intelligence? → YES. Demonstrated below (§3).**

---

## 1. Brain table

| # | Brain | File | Key symbols | Input | Output | Caller(s) | Active (prod)? | Legacy? | Duplicates |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Engine v2 enrichment | `packages/intelligence/src/engine_v2/enrichment.ts` | `enrichAuthoritativeData`, `determineExploitStatus`, `calculateEpss`, `deriveOperationalPriority` | rawText + cveId + CVSS fields | `AuthoritativeEnrichmentV2` (KEV flag, EPSS, exploit status, priority) | engine_v2 pipeline; collector-do (cross-boundary relative import); canary routes | ⚠️ via collector/canary only | No | EPSS/KEV logic duplicated w/ #2, #5 |
| 2 | Engine v2 orchestrator | `engine_v2/index.ts` | `executeDeepIntelligenceAnalysisV2`, `calculateCalibratedConfidenceMatrix` | Telegram-shaped signal | report + quality gate | collector-do, api `/intelligence/shadow-vectorize`, tests | ⚠️ collector only in prod | No | parallel to #3,#4 |
| 3 | Analyst engine | `analyst/engine.ts` + `analyst/dossier.ts` + `analyst/confidence.ts` | `runIntelligenceAnalyst`, `formatEvidenceGroundedDossier` | signal + evidence | dossier/report + confidence | api `/analyze`, `/canary/analyst-grade-cve`, ResearchWorkflow, ingest consumer | ✅ (queue consumer) | No | parallel to #2 |
| 4 | Engine v1 | `engine/engine.ts` | older analysis entry | signal | report | exported; referenced by registry/tests | ❌ | YES | superseded by #2 |
| 5 | Core pipeline | `core/pipeline.ts`, `core/dossier.ts`, `core/membership.ts`, `core/consistency.ts`, `core/entityResolution.ts`, `core/detections.ts` | kernel-backed validation/assessment | mixed | validated report, WASM kernel results | api (`executeRustKernelValidation`, `validateReportSemantics`), `core/pipeline` exports | ✅ partial (validation only) | No | overlaps #3 quality logic |
| 6 | Pipeline canonical/fusion | `pipeline/canonical.ts` (526), `pipeline/fusion.ts` (449), `pipeline/adapters.ts` (437) | canonical event mapping, fusion, `matchCanonicalEvent`, `detectSourceConflicts`, `evaluateCorroboration` | signals | canonical events, corroboration verdicts | ingest consumer | ✅ (queue consumer) | No | overlaps #9 dedup/matching |
| 7 | Reporting engine | `reporting/engine.ts`, `reporting/compiler.ts`, `reporting/qualityGate.ts` (655), `reporting/registry.ts`, `reporting/validation.ts` | `ReportingEngine.composeReport/publishReport`, template registry | canonical objects | report + gate | productionReports seeding, reporting tests | ❌ (fixture-seeded) | PARTIAL | parallel to #2 compiler/gate |
| 8 | Static report registry | `reporting/productionReports.ts`, `reporting/cve20243400Fixture.ts`, `reporting/realMalwareData.ts`, `reporting/redlineMalwareFixture.ts` | `ProductionReportRegistry` (seeds at import), fixtures | none (hardcoded) | static CanonicalIntelligenceReports | exported from package index; web/tests importers | ❌ in worker (bundle may include) — **UNSAFE if imported** | YES (should be test-fixture only) | n/a |
| 9 | Ingestion adapters | `ingestion/*` (cisaKevAdapter, exploitDbAdapter, malwareBazaarAdapter, mispAdapter, mitreAttackAdapter, threatFoxAdapter, orchestrator, canonicalStore) | `mapCisaKevRecord`, `validateStructuredCVERecord`, `IngestionOrchestrator`, `GlobalCanonicalStore` | raw source payloads | canonical records | ingest consumer (CVE_PROCESS), api adapter routes | ✅ (CVE_PROCESS branch) | No | canonicalStore overlaps D1 canonical tables |
| 10 | Sources framework | `sources/adapters.ts` (2,017), `sources/orchestration.ts`, `sources/persistence.ts`, `sources/registry.ts` | `UnifiedIngestionEvent`, CVESourceAdapter, VendorAdvisorySourceAdapter, persistence to `vulnerability_source_records` | unified events | source records + persistence | api `/intelligence/adapters/*` routes | ❌ (POST frozen) | No | overlaps #9 |
| 11 | Normalization pipeline | `normalization/pipeline.ts` (635) | `normalizeIntelligenceSignal`, `validateEnglishQuality` | raw signal | normalized signal | ingest consumer | ✅ | No | — |
| 12 | Resolution | `resolution/index.ts` | `resolveVulnerability`, `resolveActor`, `resolveMalware`, `CANONICAL_ACTORS`, `CANONICAL_MALWARE` (static registries) | text | resolved entity IDs | ingest consumer, collector | ✅ | No | static entity registry = static intelligence in runtime |
| 13 | Dossier stack | `dossier/engine.ts`, `dossier/index.ts` | dossier build | evidence | dossier | api routes | ⚠️ | PARTIAL | overlaps analyst/dossier + core/dossier |
| 14 | Publishing stack | `publishing/publisher.ts` (501), `publicationGate.ts`, `sanitizer.ts`, `social.ts` (450), `outbound.ts`, `indexnow.ts`, `editorialDto.ts` | `executePublishingWorkflow`, `evaluatePublicationGate`, `formatCanonicalArticle` | report | article/social output | api publish routes + queue consumer | ⚠️ (publish path frozen) | No | multiple publication owners (see below) |
| 15 | Knowledge corpus (3 generations) | `knowledge/manifest.ts`, `corpus.ts`, `corpus_expanded_350.ts`, `master_manifest.ts` (893), `knowledge_routing.ts`, `knowledge/v3/*` | `KNOWLEDGE_MANIFEST_20`, `MASTER_KNOWLEDGE_ENTITIES_115`, `MASTER_EXPANDED_CHUNKS_320`, v3 embedding/FTS | queries | retrieval context | api RAG routes, engine_v2 knowledge_router | ✅ (in-memory + D1 v3) | gen1/gen2 LEGACY | 3 overlapping corpora |
| 16 | RAG/retrieval | `rag/retrieval.ts` (477), `rag/context_pack.ts`, `engine_v2/shadow_vectorize.ts` (597) | `executeHybridRetrieval`, `buildBoundedContextPack`, `executeShadowVectorizeRetrieval` | query | chunks/answers | api, collector | ✅ | No | shadow_vectorize duplicates Vectorize concerns |
| 17 | Confidence calculators (5×) | `engine_v2/index.ts` (calibrated matrix), `analyst/confidence.ts`, `reporting/qualityGate.ts`, `core/consistency.ts`, `corroboration/index.ts` | various | varies | confidence numbers/ratings | respective brains | ✅ | — | **5 different confidence semantics** |
| 18 | Quality gates (2×) | `engine_v2/quality_gate.ts`, `reporting/qualityGate.ts` | `evaluateDeepQualityGateV2`, reporting gate | report | pass/fail | respective compilers | ✅ | — | 2 gates, different rules |
| 19 | Semantic validators | `core/` (`validateReportSemantics`, `validateTechnicalMechanismIsolation`), `engine_v2/contradictions.ts` | validators | report | issues | api | ✅ | No | micro76-generic replacements live here |
| 20 | R2/D1 persistence for intel | `sources/persistence.ts`, `ingestion/canonicalStore.ts`, api inline SQL | various | records | D1 rows / R2 objects | adapters | ⚠️ | No | 3 persistence styles (inline SQL in workers, store class, drizzle schema) |

## 2. Hardcoded/static intelligence inside runtime package (see STATIC_INTELLIGENCE_AUDIT)

`KNOWN_CISA_KEV_ENTRIES` (enrichment), `CANONICAL_ACTORS`/`CANONICAL_MALWARE` (resolution), `MASTER_*` corpora (knowledge), `productionReports` fixtures (reporting), `calculateEpss` fabricated probabilities (enrichment).

## 3. PROOF: same CVE, two paths, different intelligence

Take **CVE-2024-3400** (KEV-listed, ransomware:true, CVSS 10.0):

- **Path A (canary `/canary/cisa-kev-single`, preview):** fetches live KEV JSON → `mapCisaKevRecord` → structured record with REAL `dateAdded`, vendor-defined `requiredAction`, real CVSS from source payload.
- **Path B (text-signal → engine_v2 enrichment):** `KNOWN_CISA_KEV_ENTRIES['CVE-2024-3400']` → `date_added='2024-04-12'`, `ransomware=true`, `required_action='Apply Palo Alto PAN-OS hotfix and disable device telemetry.'`; EPSS **fabricated** as 0.942/99th percentile (no FIRST EPSS call); CVSS only if present in free text.
- **Path C (ingest queue consumer):** free-text normalization + `resolveVulnerability` + `matchCanonicalEvent`; NO KEV lookup, NO EPSS, NO CVSS — `is_exploited_in_wild` from regex on text; severity from text keywords.

Concrete divergence: `required_action` differs (source string vs hardcoded string), `epss` = fabricated constant vs absent vs real-data-absent, severity may be HIGH (text) vs CRITICAL (CVSS). Three representations of one CVE, three truth sources, zero reconciliation. **This is the cross-CVE contamination class of bug in structural form.**

## 4. Consolidation targets

- One enrichment brain (real KEV + real EPSS + real CVSS adapters; regex/text heuristics demoted to SIGNAL class evidence).
- One canonical event path (ingest consumer becomes thin transport; canonicalization moves to the single processor).
- One confidence model + one quality gate, parameterized by domain.
- Reporting: delete static registry, keep one compiler.
