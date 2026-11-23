# Phase 6.1 — Decoder state for the recovered AutoIt container

**Specimen:** `art_gmf_7b98cd3800dede65` · SHA-256 `7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f`
**Recovered container:** `art_8532c00e3a92c79aea45190c310fafabfce9989715fa6e3f3b4216f9aef5f081` (576 146 bytes, `PE_RESOURCE_DIRECTORY_RCDATA`)
**Run:** `ar-p61-1790153509480` (job `job-p61-1790153509480`, workflow run `35839554525`)
**Report:** `mir_e2cf01c80723010f` · contract `1.5.0-malwarereport-decoderstatecontract` · live HTTP 200
**Outcome:** decoder **UNAVAILABLE** — the container is recognised, the decoder is not. Configuration remains a **CANDIDATE**.

## The determination, from the specimen's own bytes

Measured on the recovered extent itself (never on a claim about it):

| measurement | value |
| --- | --- |
| `AU3!EA06` magic | extent-relative **16** (equal to canonical `magic_offset 815560 − host_offset 815544`) |
| trailer magic | present — the same magic closes the extent (this is why the structural scan records **two** hits for **one** container) |
| prefix bytes before the magic | 16 |
| encoded region | **576 114** bytes between the magic and the trailer magic |
| zlib wrapper (`0x78`, FCHECK valid) | **absent** |
| gzip wrapper (`1f 8b`) | **absent** |
| raw-deflate at every plausible header offset | **fails** (`error`) |
| Shannon entropy of the encoded region | **7.9997 bits/byte** — indistinguishable from keyed data |
| decoder tooling in the hardened image | **none** (pinned toolset: LIEF, DIE, FLOSS, CAPA, YARA-X, Magika) |

The EA06 payload transform is AutoIt's proprietary keystream + LZ77 scheme. A hand-rolled
reimplementation could not be verified against any ground truth available inside this
container, so publishing bytes from one would publish a **fabricated** decoded artifact.
Per the phase rules ("do not guess keys", "fail closed", "do not fake success") the honest
answer is UNAVAILABLE, and this phase implements exactly that — it does not attempt a decode.

## What the code now does

* `recognizeAutoItResourceContainer(payload, magicRelativeOffset)` — a pure, total function of
  the bytes the verifying layer already holds. It reports `format`, `format_recognized`,
  `magic_relative_offset`, `prefix_bytes`, `trailer_magic_present`, `encoded_region_bytes`, the
  negative codec-wrapper controls, and the decode block. No clock, no randomness, no network,
  no execution, no offsets searched outside the verified extent.
* `validateDerivedArtifactDecoderState` — the fail-closed invariant, shared by the write path
  (grounding), the report contract and the stored-report read gate:
  * `DECODED` requires an output digest, an output size, a **content-addressed** child
    (`art_<sha256>`) and a pinned decoder method **and** version;
  * every other state must carry `null` output, `null` child and **no** decoder identity;
  * a `DECODED` claim over an `UNRECOGNIZED` container is rejected.
* Configuration: the item and the assessment carry `decoder_availability`
  (`AVAILABLE` / `UNAVAILABLE` / `UNKNOWN`) and `container_format`, and the validators reject
  any "available decoder" claim that does not correspond to an actual decoded item, or that
  contradicts the `AWAITING_DETERMINISTIC_DECODER` blocker. Nothing can promote a candidate
  without a real decode.
* Contract `1.5.0` makes the decoder state part of what a report must carry. It is
  **version-gated**: a row published under `1.4.0` or earlier stays valid under the contract it
  declared, so no historical report is invalidated retroactively.

## Verified live

* derived artifact `art_8532c00e…` — identical id, digest and size to the two earlier
  independent runs (`ar-p6-1790150989012`, `ar-p6b-1790151992793`): **three real runs, one
  artifact identity**.
* `container_format = AUTOIT_EA06_COMPILED_SCRIPT`, `magic_relative_offset = 16`,
  `prefix_bytes = 16`, `encoded_region_bytes = 576114`, `trailer_magic_present = true`,
  wrappers `{zlib:false, gzip:false}`.
* `decode.state = UNAVAILABLE`, decoder `null`, output `null`, child `null`, and
  **0 decoder-state errors**.
* configuration `CONFIGURATION_CANDIDATE` · `decoder_availability = UNAVAILABLE` ·
  blocker `AWAITING_DETERMINISTIC_DECODER` · **1 item, 0 values, 0 configuration errors**.
* read gate **0 rejections**, contract **0 rejections**, grounding **30 grounded / 0 ungrounded**.
* non-promotion: behaviors **0**, family **UNRESOLVED**, infrastructure **0**, ATT&CK/MBC **0**.
* tool states unchanged: LIEF `OBSERVED`, FLOSS `ERROR`, DIE `OBSERVED`, YARA-X `NO_RESULT`,
  CAPA `ERROR`, Magika `OBSERVED`.
* historical rows: the `1.4.0` / `1.3.0` / `1.2.0` rows still serve `200`; the three
  pre-hardening rows still `404`; the list serves 10 rows with `excluded_invalid: 3`.

## Files

* `packages/intelligence/src/malware/canonical/autoItResourceExtractor.ts` — container recognition, decode block, decoder-state validator
* `packages/intelligence/src/malware/canonical/staticConfigurationLayer.ts` — `decoder_availability` + `container_format` on item and assessment, with consistency validation
* `packages/intelligence/src/malware/canonical/reportContract.ts` — contract `1.5.0` (version-gated decoder-state requirement)
* `packages/intelligence/src/malware/canonical/malwareProductionPipeline.ts` — write-path grounding gate
* `tests/unit/p6_1_autoit_decoder_state.test.ts` — 15 focused cases
* `tests/unit/malware_report_contract_versioning.test.ts` — version list/current-contract expectations
* `scripts/p6_1_verify_live.ts` — read-only live verifier

No container change: the state is computed by the layer that holds the bytes, so the hardened
image, its isolation flags and the analyzer set are untouched.
