# Phase 3 Closure — Evidence-Depth Changes Verified End-to-End

**Specimen** `art_gmf_7b98cd3800dede65` · SHA-256 `7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f` (1,435,648 bytes)

| | baseline (phase 2) | fresh (phase 3 closure) |
|---|---|---|
| job | `job-p2b-1790119332370` | `job-p3-1790120706395` |
| run | `ar-p2b-1790119332370` | `ar-p3-1790120706395` |
| runner | `gh-runner-35797077384` | `gh-runner-35798903565` |
| workflow | 35797077384 | 35798903565 |
| report | `mir_ec4f353d0030b941` | **`mir_2262217467a8e4b2`** |
| observations / claims | 11 / 7 | **12 / 8** |
| grounded statements | 20 / 20 | **22 / 22** (0 ungrounded) |
| tool states | lief OBSERVED · floss ERROR · die OBSERVED · yara-x NO_RESULT · capa ERROR | identical (unchanged plane, unchanged timeouts) |

The fresh run was produced by the real container plane (same workflow mechanism, same image, no timeout
change, FLOSS/CAPA untouched, no YARA rules added). The malware-validation worker was re-deployed so the
bundle carries the phase-3 analyzer (`40617dd5-fe69-4651-8120-37e33d25e8b5`); the presence of the
`embedded_objects` observation in the live report proves the deployed worker executed the phase-3 code.

## 1. Invariants proven from code (phase 2)

| Invariant | Where it is enforced |
|---|---|
| artifact identity immutable | `artifact_id` fixed at acquisition; report `sample_identity`/`analyzed_artifact` must agree with `run_binding` (read gate rejects otherwise) |
| sha256 immutable | recomputed from the bytes before materialization (Gates 1–2); `run_binding.sha256` = `analyzed_artifact.sha256` = stored row `sha256` |
| analysis_run_id immutable | job identity immutable at issuance (`job_identity_mismatch`, `analysis_run_already_bound`); binding rendered into the report and validated on read |
| observations scoped to artifact + run | every observation carries `artifact_id` + `analysis_run_id`; `string_indicators`/`embedded_objects` inherit the single `STATIC` evidence ref (`ev_static_*`, `source_snapshot_id = analysis_run_id`) |
| claims scoped to artifact + run | `claimProcessor` rejects observations whose `artifact_id` differs; claim ids are `clm_<artifact_id>_<key>` |
| embedded_objects = structural evidence only | `scanEmbeddedObjects` reports overlay/resource inventory/signature offsets; observation note: *"a detected structure is not a confirmed payload and nothing is extracted or executed"* |
| embedded object ≠ derived artifact | no child artifact is constructed anywhere; `detection_artifacts.derived_artifacts` stays `[]`; nothing is decompressed or executed |
| no promotion | capability/behavior/configuration/family/ATT&CK/MBC processors receive only claims; `behaviors`, `configuration`, `attack_mbc`, `conflicts` are `[]` in the live report |
| string indicators static only | `STRING_INDICATOR_PATTERNS` → indicator evidence; `epistemic_note` states no execution/behaviour/C2/intent/persistence |
| tool error/no-result ≠ absence | limitations carry `ERROR_ANALYZER` (floss, capa), `NO_RESULT_ANALYZER` (yara-x) with *"This is not evidence of absence."*; `EMPTY_SECTION` for empty categories |

## 2. Fresh canonical report (verified live)

`mir_2262217467a8e4b2` → detail **HTTP 200**; read gate re-validated locally on the stored payload:
**0 rejections**. `run_binding = {domain: MALWARE, job_id: job-p3-1790120706395, analysis_run_id:
ar-p3-1790120706395, artifact_id: art_gmf_7b98cd3800dede65, sha256: 7b98cd38…ab7f}`.
`grounding = {all_statements_grounded: true, grounded: 22, ungrounded: 0, ai_generated_facts: 0}`.
`evidence_counts = {observations: 12, claims: 8, behaviors: 0, configurations: 0}`.
`infrastructure.items = 0`, `detection_artifacts = {derived_artifacts: []}`, `family.resolution_state = UNRESOLVED`
(`resolved_family: null`).

List endpoint: `{data: [mir_2262217467a8e4b2, mir_ec4f353d0030b941, mir_1e7d55f38d751da6], meta:{total:3, excluded_invalid:3}}`
— the two other served rows are run-bound and valid. Pre-hardening rows `mir_c8eb2d1f6815fd7b`,
`mir_d65a9df02b4ee06f`, `mir_0237708343825ecd` → **HTTP 404** (retained in the store, unmodified).

## 3. Semantic deltas (phase 4)

| Evidence | Baseline | Fresh | Verified by |
|---|---|---|---|
| string evidence | present | present | `string_indicators` observation + `REPORTS_VALUE`/`DERIVED` claim |
| UTF-16 evidence | **absent (not scanned)** | present | deterministic replay of the run's exact bytes: 1,590 UTF-16 strings (0 before) |
| indicator classes | 5 classes, 0 matches | **13 classes, 16 matches** (`executable_name` ×16) | same replay; classes listed in `indicator_categories` |
| embedded object | absent | **present** (`embedded_objects`, `OBSERVED`) | live report statement + replay |
| AutoIt structural evidence | DIE signature only | DIE signature **+ resource structure** | replay: 26 resources / 610,780 B, largest RCDATA 576,146 B @0xc71b8, H=8.00, `AU3!EA06` @0xc71c8 and @0x153c42, overlay 0 |
| scan limits | implicit (silent 256 KiB cut) | **explicit** (`scanned_capped`, `byte_scan_capped`, 64 MiB bound, 4096/2048 string caps, 64/16 indicator budget) | code + replay output |

The report payload shows the *statements*; the underlying values are verified by replaying the identical
bytes (sha256-verified) through the identical deployed analyzer — 3 replays produce one evidence digest.

## 4. Embedded object semantics for this specimen (phase 5)

Reported only as structure; **no child artifact, no recursion, no decompression**:

* resource type `RCDATA`, size `576,146`, file offset `0xc71b8` (26 resources, 610,780 bytes total);
* magic evidence: `AU3!EA06` at `0xc71c8` (start+16) and `0x153c42` (final 8 bytes of that resource);
* entropy `7.9997` (encrypted/compressed payload, no plaintext script);
* overlay `0`; no nested PE, no archive magic;
* embedded-object digest (structural object digest, *not* a canonical child identity):
  `8532c00e3a92c79aea45190c310fafabfce9989715fa6e3f3b4216f9aef5f081`;
* scope: `analysis_run_id ar-p3-1790120706395`, `artifact_id art_gmf_7b98cd3800dede65`,
  source `STATIC_ANALYSIS 1.0.0-static-canonical`.

## 5. Determinism (phase 6) — PASS

Three replays of the same bytes → identical normalized evidence identity
`sha256(a154e5a7318753c11b19a90e0d42ca38a497ad116a6943f22bedd932bf3b0e02)`: same 7 analyzer
observations, same 16 indicators with the same classes/order, same `embedded_objects` observation, same
evidence ids (`scripts/p3_out/determinism.json`). No nondeterminism found; no patch required.

## 6. Rust-grade review (phase 7) — concrete issues only

1. **`catch { return null }`** in `parsePe` / `parseElf` / `peLayout` discards the failure reason: a
   malformed PE is indistinguishable from a non-PE at the call site (typed `Result`/error would be required).
2. **Silent truncation without a flag**: indicator values are cut at `MAX_STRING_VALUE_LEN` (256) and raw
   runs at `MAX_STRING_RUN_LEN` (512); a pattern match beyond the cut is dropped and nothing records
   `value_truncated` / `run_truncated`.
3. **Budget exhaustion is only implicit**: hitting `MAX_STRING_INDICATORS` (64) or the per-class cap (16)
   is visible only as a count, not as an explicit truncation flag.
4. **Walk aborts wholesale**: in the resource walk `if (entry + 8 > bytes.length) return;` abandons the
   remaining inventory instead of skipping the malformed entry (silently short inventory, no flag).
5. **Module-level mutable data**: `EMBEDDED_SIGNATURES` is a plain array of mutable `number[]`
   (not `readonly`/frozen); a mutation would change detection for every artifact.
6. **Duplicated budget constants**: `MAX_STRING_INDICATORS` and `MAX_STRING_INDICATOR_ATTRS` are both 64
   in different places; if they drift, projection silently drops indicators.
7. **Duplicate parsing paths**: `peLayout` re-parses the PE header/section table already parsed by
   `parsePe` — two readers of one structure (divergence risk; should be one typed layout).
8. **Compile-time-only immutability**: canonical objects are `readonly`-typed but never frozen; nothing
   prevents downstream mutation of emitted attributes.
9. `any` appears only in the local diagnostic scripts (`scripts/p3_*.ts`), never in the canonical package.

## 7. Next-layer contract (phase 9) — defined, not implemented

Capability evidence already enters at exactly one place: `claimProcessor.ts` `tool_analysis` branch
(`TOOL_CLAIM_CLASSES[tool]` → predicate/status/modality; `capa` → `CAN_DO`). The next deterministic layer
must attach there and nowhere else:

* **new observation type** `capability_indicators` (producer: `STATIC_ANALYSIS`, class `STATIC`), attributes:
  `analysis_status`, `capability_count`, `capability_<i>_name`, `capability_<i>_basis`
  (`ENUM: import | string_indicator | resource | packer`), `capability_<i>_evidence_ref_id`,
  `basis_catalog_version`;
* **claim**: predicate `HAS_CAPABILITY`, modality `CAN_DO`, status `DERIVED`, evidence class `STATIC`,
  new discriminator `capability_source: STATIC_INFERENCE` distinct from `TOOL_CAPA`, non-empty
  `evidence_refs` scoped to `artifact_id` + `analysis_run_id` (mandatory, fail-closed);
* **hard boundaries**: cannot produce a Behavior (`OBSERVED_DOING`), cannot enter Configuration, Family,
  ATT&CK/MBC or infrastructure correlation, cannot be merged/deduped with capa-derived claims.

## 8. Files / tests / artifacts

Changed: `staticAnalysis.ts`, `claimProcessor.ts`, `tests/unit/m7_claim_processor.test.ts`,
`tests/unit/p3_string_indicator_depth.test.ts` (new), `docs/forensics/PHASE3_EVIDENCE_DEPTH.md` (phase-3
record), this closure record; worker redeployed (no source change beyond the package). Local diagnostics:
`scripts/p3_*.ts` + `scripts/p3_out/*` (never canonical evidence).

Tests: **525 pass / 0 fail** across 32 malware-domain test files (11 new cases). Typecheck: clean on all
changed files. Nothing was committed; the malware boundary is untracked in this working tree.

**Live URLs:** report `https://zayron-x-api-preview.aabusabih.workers.dev/api/v1/malware/intelligence/reports/mir_2262217467a8e4b2` ·
list `https://zayron-x-api-preview.aabusabih.workers.dev/api/v1/malware/intelligence/reports`
