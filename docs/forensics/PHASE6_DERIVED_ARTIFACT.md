# Phase 6 — Deterministic AutoIt resource extraction (derived artifact)

**Specimen:** `art_gmf_7b98cd3800dede65` · SHA-256 `7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f`
**Run:** `ar-p6b-1790151992793` (job `job-p6b-1790151992793`, workflow run `35837140598`)
**Report:** `mir_95b7cc8d37636837` · contract `1.4.0-malwarereport-derivedartifactcontract` · live HTTP 200

## What phase 6 adds

One read-only, deterministic extraction pass that turns the *already identified*
embedded object of an artifact into a first-class **derived artifact** — without
introducing a general-purpose unpacker, a decoder, or any new semantics.

* container: `tools/malware-analysis-container/src/server.py` — `extract_autoit_resource`
  walks the **PE resource directory** and returns the exact `RCDATA` data-entry bytes.
  No `AUTOIT_RCDATA_RESOURCE` request, no extraction. No network. No execution.
* canonical layer: `packages/intelligence/src/malware/canonical/autoItResourceExtractor.ts`
  — `verifyContainerExtraction` re-measures the container's record against the bytes the
  layer itself holds, and `bindExtractionToCanonicalEvidence` publishes the derived
  artifact only when the extraction is exactly the extent **this run's own canonical
  `COMPILED_AUTOIT_SCRIPT` embedded object** reports.

## Boundary rule (the defect fixed in this phase)

The specimen's canonical embedded-object evidence records **two** `AU3!EA06` magic hits
inside **one** `RCDATA` extent (`815544 + 576146`, magics at `815560` and `1391682`).

The first implementation required *exactly one* hit and therefore refused to publish a
correct extraction. The rule is now:

* the canonical **extent** is authoritative — never re-derived from magic positions;
* every canonical magic hit inside that one extent is **lineage** for the derived artifact;
* several magic hits in one extent are **one** container;
* two *different* extents claiming the same boundary is ambiguity → refused;
* the extent's **first** magic must equal the magic offset the plane extracted from.

Magic hits are validation evidence only: they can confirm an extraction, never define,
expand, shrink or relocate one.

## Verified live result

| field | value |
| --- | --- |
| derived artifact | `art_8532c00e3a92c79aea45190c310fafabfce9989715fa6e3f3b4216f9aef5f081` |
| derived sha256 | `8532c00e3a92c79aea45190c310fafabfce9989715fa6e3f3b4216f9aef5f081` |
| size | `576146` bytes (exact `RCDATA` data entry) |
| method / version | `PE_RESOURCE_DIRECTORY_RCDATA` · `1.0.0-autoitresourceextractor-canonical` |
| parent | unchanged (`art_gmf_7b98cd3800dede65`, same sha256) |
| extent | `host_offset 815544`, `size_bytes 576146`, `magic_offset 815560` |
| lineage | `obs_static_art_gmf_7b98cd3800dede65_embedded_objects_081e831f1568ff40` · `ev_static_71837a84071ee00b` |
| decoder | UNAVAILABLE (no deterministic AutoIt decoder exists in the toolchain) |
| configuration | `CONFIGURATION_CANDIDATE`, blocker `AWAITING_DETERMINISTIC_DECODER`, `0` values |
| read gate / contract | 0 rejections · 0 contract rejections · 0 derived-provenance errors |
| grounding | 30 grounded / 0 ungrounded / 0 AI facts |
| non-promotion | behaviors 0 · family `UNRESOLVED` · infrastructure 0 · ATT&CK/MBC 0 |

## Determinism

* Extracted bytes and digest are identical across **two independent real runs**
  (`ar-p6-1790150989012` and `ar-p6b-1790151992793` → `8532c00e…`).
* Derived identity is **content-addressed** (`art_<sha256>`): identical bytes are one
  artifact, different bytes a different artifact. No clock, random, UUID or counter
  participates in identity.
* Container-side repeated extraction and the TS-level repeated binding both return
  identical bytes/digest/id; only the measured duration may differ.

## Extraction is not decoding

`decoded_configuration` is `null` and the configuration layer keeps its item at
`STATIC_CANDIDATE`: recovering a container is evidence that the container exists, never
evidence of what it contains. `behaviors`, `family`, `infrastructure` and `attack_mbc`
stay empty because extraction establishes none of them.

## Files

* `tools/malware-analysis-container/src/server.py` — resource-directory extractor
* `tools/malware-analysis-container/tests/test_autoit_extractor.py` — 26 container checks
* `packages/intelligence/src/malware/canonical/autoItResourceExtractor.ts` — verify + bind + provenance validator
* `packages/intelligence/src/malware/canonical/{malwareProductionPipeline,reportMaterialization,reportContract,storedReportValidation,staticEvidenceProjection,staticConfigurationLayer,index}.ts`
* `workers/malware-validation/src/index.ts`, `.github/workflows/zayron-malware-validation.yml` — carry `extraction_requests` / `extractions`
* `tests/unit/p6_autoit_resource_extraction.test.ts` — 17 focused cases
