# MASTER DATA FIDELITY AUDIT (STRUCTURED → TEXT loss points)

## Confirmed loss points (with exact code)
1. **NVD JSON flatten** — `workers/ingest/src/index.ts` scheduled(): `` rawText = `${cveId}: ${description}` `` — the `cve.metrics` object is passed only as `metadata.cvss` on the queue message and NEVER re-read downstream; consumer re-parses text. Loses: CVSS score/vector (→ 1238/1238 NULL in prod D1), CWE, CPE ranges, references, lastModified (kills versioning), dates.
2. **12,000-char truncation** on every `rawText` (KEV, NVD, RSS, Telegram) — silent tail loss on long advisories.
3. **KEV JSON flatten** — item fields (`dueDate`, `knownRansomwareCampaignUse`, `requiredAction`, `cwes`) flattened to prose; only cveID/name/shortDescription survive in text. **`dueDate` is dropped entirely — not modeled anywhere downstream.**
4. **CSAF/vendor advisory** — `normalizeVendorAdvisory` exists (structured) but the queue path never consumes it; canary routes parse separately.
5. **EPSS** — never fetched at all (was fabricated pre-P0.1; now UNKNOWN when absent).
6. **Report→article rendering** — claim/evidence structure collapses to editorial prose (`articles.content`); structured lineage retained only if `structured_report` JSON column used by API detail routes.

## Preserved-well (counter-evidence, not everything is lost)
- `parseNvdCpeData`, `reconcileOpenSourceEnrichment`, `parseCisaVulnrichment`, `parseOsvRecord`, `parseGhsaAdvisories`, `parseCsafDocument` — real structured parsers EXIST in sources/adapters.ts and are exercised by micro75/76; the loss is a WIRING failure (queue path bypasses them), not a capability gap.
- `vulnrichment` vendor fixtures are read directly from `vendor/` in tests (micro70) — structured path proven.
- Evidence rows preserve url+snippet+weight per source message.
- `event_trace` preserves per-stage runs with durations and error codes.

## Field lineage (40+ fields, SOURCE→MAPPER→CANONICAL→ENRICHMENT→ANALYSIS→REPORT→DB→API→WEB)
| Field | Survives to DB? | Dies at |
|---|---|---|
| CVSS score/vector | ❌ (1238 null) | ingest flatten |
| severity (text) | ✅ | — (but authority lost) |
| CWE | ❌ | ingest flatten |
| affected versions | partial (vendor/product text) | CPE detail at flatten |
| fixed versions | ❌ | no column; oracle-only |
| product/vendor | ✅ text | — |
| KEV flag | ⚠️ pre-P0.1 fabricated; post-P0.1 requires evidence | — |
| KEV date_added | ⚠️ pre-P0.1 static; post-P0.1 evidence-only | — |
| KEV due date | ❌ | dropped at KEV flatten (never modeled) |
| ransomware | ⚠️ static-map pre-P0.1; evidence-only after | — |
| exploitation | ⚠️ text regex (all rows=1 artifact) | — |
| EPSS | ❌ | never fetched (UNKNOWN post-P0.1) |
| exploit availability | ⚠️ regex on text | — |
| technical mechanism | ✅ prose | — |
| remediation | ❌ (8 static strings pre-P0.1) | flatten |
| publication date | ✅ | — |
| modification date | ❌ | ingest flatten |
| first/last observed | ✅ intelligence_events | — |
| ATT&CK | ✅ ttp_mappings (sparse) | — |
| attack path | ✅ bounded builder | — |
| claims | ⚠️ embedded in report JSON only | DB column absent |
| evidence | ✅ (best-preserved) | — |
| confidence | ⚠️ 5 calculators | — |
| source authority | ⚠️ trust_score column; not applied downstream | — |
