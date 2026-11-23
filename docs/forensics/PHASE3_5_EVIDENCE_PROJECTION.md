# Phase 3.5 — Evidence Projection & Parser Hardening

Specimen `art_gmf_7b98cd3800dede65` · SHA-256 `7b98cd38…ab7f`

| | value |
|---|---|
| fresh run | `ar-p35-1790121998277` (job `job-p35-1790121998277`, workflow 35800570001) |
| fresh report | `mir_70ca296acf6ece9d` (live HTTP 200) |
| static indicators | **16** (`EXECUTABLE_NAME` present; 13 canonical types available) |
| embedded objects | **2** (`COMPILED_AUTOIT_SCRIPT`, RCDATA in `.rsrc`, digest `8532c00e…f081`) |
| observations / claims | 12 / 8 · grounded 22/22 · behaviours 0 · configurations 0 · family UNRESOLVED |
| read gate | 0 rejections on the live payload |

## 1. What was added

**Typed projection (new module `staticEvidenceProjection.ts`)** — one canonical view layer:

* `StaticIndicatorSection` — `count`, `classes_present`, typed `indicators`
  (`indicator_type`, `value`, `encoding`, `artifact_id`, `analysis_run_id`, `evidence_id`,
  `observation_id`, `source_tool`, `tool_version`, `epistemic_status: STATIC_CANDIDATE`,
  `execution_confirmed: false`), `coverage` (string counts + `scanned_capped` / `byte_scan_capped`)
  and `source` lineage. 13 closed canonical types; the analyzer class→type mapping is closed, so an
  unknown class fails the projection instead of being coerced.
* `EmbeddedObjectSection` — `object_type` (8 closed types), `signature`, `offset`, `size_bytes`
  (hosting extent), `host_section`, `host_resource_type`, `entropy`, `digest {sha256}`,
  `parent_artifact_id`, `analysis_run_id`, `evidence_id`, `observation_id`, `extracted: false`,
  `child_artifact_id: null`, plus inventory coverage (resources, overlay, scanned bytes).
* Fail-closed validators: missing `evidence_id` / `artifact_id` / `analysis_run_id` / `source_tool` /
  `observation_id`, a non-`STATIC_CANDIDATE` status, `execution_confirmed`, an unknown type/signature,
  an `extracted` object or a promoted `child_artifact_id` all raise
  `StaticEvidenceProjectionError`; the report builder throws and the caller rejects the report.
* The projection is a **view**: values come from the canonical observation attributes, the section
  references the observation and evidence ids, and no second extraction or evidence store exists.

**Report exposure** — `MalwareIntelligenceReport.static_indicators` / `.embedded_objects`, and both are
part of the public payload alongside `static_findings`. The embedded-object digest (sha256) is computed
by `materializeCanonicalReport` over the exact analyzed bytes, bounded (≤16 objects, ≤8 MiB each,
extent must be inside the artifact); an object without a deterministic extent keeps `digest: null`.

**Parser hardening** — `ParseOutcomeStatus = OK | NO_DATA | INVALID_SCHEMA | PARSE_ERROR`.
`parsePeOutcome` / `parseElfOutcome` (and the internal PE-layout wrapper) turn a null parse into
`INVALID_SCHEMA` when the format magic is present and `NO_DATA` when it is not, so a parser failure can
never be recorded as an empty result. The analyzer records `parse_outcome` on `binary_metadata` and
`pe_layout_outcome` on `embedded_objects`.

**Budget single source** — every cap now lives in the frozen `STATIC_EXTRACTION_BUDGETS`
(scan bytes, ASCII/UTF-16 string caps, run/value character caps, indicator + per-class caps, signature
hits, resource entries); the duplicated `MAX_STRING_INDICATOR_ATTRS` is gone and all paths read the same
object. Truncation is reported (`truncated_string_count`, `truncated_indicator_count`,
`indicator_budget_capped`, `resource_inventory_capped`) instead of being silent.

## 2. Semantics preserved

Every indicator is `STATIC_CANDIDATE` with `execution_confirmed: false`; nothing is promoted to C2,
network communication, persistence, credential theft, behaviour, family or infrastructure (verified by
test and by the live payload: behaviours/configuration/infrastructure/attack_mbc/conflicts all empty,
family UNRESOLVED). Embedded objects stay structural: never a child artifact, never extracted,
decompressed or executed.

## 3. Determinism

Three replays of the same bytes and the fresh live report agree on: 16 indicators with identical
values/classes/order, identical coverage and caps, identical embedded-object records (offsets
815560 / 1391682, RCDATA host, entropy 7.9997, digest `8532c00e…`). `scripts/p3_out/determinism.json`
holds the normalized evidence digest (`a154e5a7…`) for the deterministic extraction layer.

## 4. Files / tests

Changed: `staticEvidenceProjection.ts` (new), `staticAnalysis.ts` (budgets, typed parse outcomes,
structured embedded-object records), `malwareProductionPipeline.ts` (report sections + payload),
`reportMaterialization.ts` (digest computation), `index.ts` (barrel),
`tests/unit/p3_5_static_evidence_projection.test.ts` (new, 11 cases), and the local diagnostics
`scripts/p3_*.ts` / `scripts/p3_out/*` (never canonical evidence).

Tests: **536 pass / 0 fail** across 33 malware-domain files. Typecheck: clean on every changed file.
Worker redeployed (`69f8feba-780c-4237-a904-86f55b7bd46d`) so the live run exercised this code; the
prior report `mir_2262217467a8e4b2` remains valid and served, and the pre-hardening rows stay 404.
