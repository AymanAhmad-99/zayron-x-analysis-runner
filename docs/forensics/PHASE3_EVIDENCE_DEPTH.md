# Phase 3 — Evidence Depth (no architecture change)

**Specimen** `art_gmf_7b98cd3800dede65`
SHA-256 `7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f` (1,435,648 bytes)
**Live report of record** `mir_ec4f353d0030b941` · **run** `ar-p2b-1790119332370` · job `job-p2b-1790119332370` · workflow `35797077384`
**Canonical tool states of that run** LIEF `OBSERVED` · DIE `OBSERVED` · FLOSS `ERROR` (timeout) · CAPA `ERROR` (exit 1) · YARA-X `NO_RESULT` (no approved ruleset)

All analysis below is deterministic and read-only. The specimen bytes were fetched from the canonical
store (`r2://zayron-x-storage/malware-artifacts/<sha256>`) and their sha256 re-verified before use; every
number quoted for "the specimen" was produced from **those exact bytes** (the same input the run analyzed).
Nothing was executed: no dynamic analysis, no sample run, no payload extraction, no decompression.

---

## 1. What `string_indicators` actually is (trace)

`string_indicators` is **not** FLOSS output and **not** LIEF/DIE output. It is produced by the in-process
deterministic static analyzer:

| Stage | Location |
|---|---|
| Extractor | `packages/intelligence/src/malware/canonical/staticAnalysis.ts` → `extractStringIndicators()` |
| Observation | same file, `runStaticAnalysis()` → `makeObs(opts, ref, 'string_indicators', …)` |
| Evidence ref | `ev_static_<hash>`, `source_id = src_static_analyzer`, `source_snapshot_id = analysis_run_id`, `kind = STATIC` |
| Claim | `claimProcessor.ts` → `STATIC_CLAIM_TYPES` → predicate `REPORTS_VALUE`, status `DERIVED` |
| Report | `reportMaterialization.ts` → `static_findings.statements` (observation line + DERIVED static claim line) |
| Plan record | `analysis_status.plan_steps[0] = static_analyzer: OBSERVED` |

FLOSS, by contrast, is a container tool whose output would arrive as `tool_analysis`; on this run FLOSS is
`ERROR`, so **no FLOSS-derived strings exist and none were invented**. DIE/LIEF contribute
`tool_analysis` (packer/compiler detections and PE metadata) only.

For the live run the published projection is thin: 18 static statements = **11 observations + 7 claims**
(2 of the claims are tool-derived: DIE detections, LIEF metadata). The `string_indicators` statement reads
only *"recorded as OBSERVED"* — the indicator **values** live in the observation attributes
(`indicator_<n>_<class>`, `u16_indicator_<n>_<class>`) and are **not** projected into the report payload.

## 2. Depth defects found in the extractor (all four confirmed by re-derivation)

1. **Silent byte truncation.** `const cap = Math.min(bytes.length, MAX_STRINGS_SCANNED * 64)` with
   `if (i >= cap) break;` stopped the ASCII scan at **262,144 bytes**. This specimen's plaintext beyond
   that offset was never examined: the pre-fix run extracted **341 strings** from the first 256 KiB.
2. **ASCII-only.** UTF-16LE strings (interleaved printable byte + NUL) were invisible, although they are
   the dominant storage form for script/.NET/AutoIt artifacts. Pre-fix: **0** UTF-16 strings.
3. **Five narrow classes** (`url`, `ipv4`, `registry_path`, `windows_path`, `executable_name`) — no
   domains, IPv6, email, mutexes, command/script fragments, user agents or encoded blobs.
4. **First match only per string, per class**, and a naive base64-shaped regex that promoted filler runs
   (`"OOOO…"`) as `encoded_blob`.

### Fix (same analyzer, same observation, same status semantics)

* Whole-artifact scan, bounded by `MAX_STRING_SCAN_BYTES = 64 MiB` and reported via `byte_scan_capped`
  (a scan is never silently truncated).
* UTF-16LE pass (`scanUtf16leStrings`) with `unicode_strings` reported; indicator records carry
  `encoding: 'ascii' | 'utf16le'` and UTF-16 hits are keyed `u16_indicator_<n>_<class>`.
* 13 deterministic classes, ordered by evidentiary value so a noisy class cannot crowd out a meaningful
  one: `url`, `domain`, `email`, `ipv4`, `ipv6`, `mutex_like`, `registry_path`, `windows_path`,
  `unix_path`, `command_fragment`, `user_agent`, `encoded_blob_base64`, `executable_name`.
* Deterministic filters: `0.0.0.0` / `255.255.255.255` are literal strings but not indicators; a
  base64-shaped run is only an indicator when it has ≥2 character classes and no filler run >6;
  path/user-agent classes allow embedded spaces (bounded) instead of truncating at the first space.
* Bounded budget: ≤64 indicators total (`MAX_STRING_INDICATORS`), ≤16 per class, ≤4096 ASCII /
  ≤2048 UTF-16 strings, with `scanned_capped` / `byte_scan_capped` reporting every cap.
* Every indicator still flows through the single `STATIC` evidence ref (`src_static_analyzer`,
  `source_snapshot_id = analysis_run_id`, artifact identity on the observation) — no new evidence path.

## 3. New deterministic structure evidence: `embedded_objects`

`scanEmbeddedObjects()` (same analyzer, PE-aware, read-only) reports **structure only**: overlay bytes,
PE resource inventory (count, total bytes, largest resource + entropy) and well-known embedded-object
magics (nested `MZ`+valid PE header, ZIP/RAR/7z/gzip/bzip2/xz, compiled-AutoIt `AU3!EA06`). It is emitted
as the observation `embedded_objects` and registered in `STATIC_CLAIM_TYPES`
(`embedded_objects` → `REPORTS_VALUE` / `DERIVED`, evidence class `STATIC`). Nothing is decompressed,
extracted or executed, and an empty result is `NO_RESULT` with the reason *"absence of a detected
signature is not evidence of absence"* — never "clean".

## 4. AutoIt investigation (static only)

| Evidence (specimen) | Value |
|---|---|
| DIE detection (static) | `PE32 AutoIt` (+ Microsoft Linker / MSVC / Visual Studio / Records) |
| Section table | `.text` e=6.68, `.rdata` e=5.77, `.data` e=2.00, `.rsrc` e=7.95, `.reloc` e=5.25 |
| Resources | 26 entries, 610,780 bytes; largest = **RCDATA 576,146 bytes @0xc71b8, entropy 7.9997** |
| Embedded magics | `compiled_autoit_script` (`AU3!EA06`) at `0x0c71c8` (resource start +16) and at `0x153c42` (last 8 bytes of that resource) |
| Overlay | **0 bytes** (file ends exactly at the last section) |
| Nested PE / archives | **none detected** |
| Packing assessment | `INDICATED` (overall entropy 7.34 > 7.2 **and** max section entropy 7.95 > 7.3 — two independent signals) |

**Conclusion: `observed` — the specimen carries a compiled AutoIt script resource whose payload is
encrypted/compressed** (entropy ≈8.0, random header bytes, no plaintext script). It is *not* evidence of
execution, of a family, or of behaviour, and no family/campaign inference is made here.

## 5. Embedded artifact determination

* **Extraction status: `CONFIRMED` as a static embedded object; no child artifact registered.**
* Embedded-object digest (deterministic, computed from the run's bytes, reported as an *object* digest —
  **not** a canonical child artifact): `8532c00e3a92c79aea45190c310fafabfce9989715fa6e3f3b4216f9aef5f081`
  (the 576,146-byte RCDATA blob).
* Why no derived artifact: the blob is an encrypted AutoIt script resource, not a standalone file the
  canonical derived-artifact path can produce; extracting or decompressing it requires an AutoIt
  decompressor, which `toolchain-1.0.0` does not contain (`lief 1.0.0`, `floss 3.1.1`, `capa 9.4.0`,
  `yara-x 1.20.0`, `die 3.21` only). Per the phase rules, nothing was inferred and
  `detection_artifacts.derived_artifacts` stays `[]`.
* **Recursive analysis: `DEFERRED`.** No child artifact exists to recurse into; the extraction path is
  not proven safe/deterministic with the current toolchain.

## 6. Before / after (holding tool records constant)

Live run (pre-upgrade code, real container callback) → post-upgrade code, same bytes, same canonical path:

| Evidence | Live run `ar-p2b-…3306` (as published) | Post-upgrade (local materialization `mir_3008152d600375be`, tools `UNAVAILABLE`*) |
|---|---|---|
| static observations | 11 | **12** (`embedded_objects` added) |
| static claims | 7 (5 static + 2 tool) | 6 static + 2 tool when the live tool records are used |
| string_indicators | `OBSERVED`, **0 indicators** (341 ASCII strings, first 256 KiB only) | `OBSERVED`, **16 indicators** (4,096 ASCII strings = cap reached, 1,590 UTF-16 strings) |
| indicator classes | — | `executable_name` ×16 (import-name strings); no url/domain/ip/mutex/command class matched — the AutoIt payload is encrypted |
| embedded_objects | absent | `OBSERVED`: overlay 0, 26 resources / 610,780 bytes, largest 576,146 @0xc71b8 H=8.00, 2× `compiled_autoit_script` |
| infrastructure items | 0 | 0 |
| derived artifacts | `[]` | `[]` |
| read-gate rejections | 0 | **0** (upgraded payload still passes `validateStoredMalwareReport`) |

\* The local materialization truthfully records tools as `UNAVAILABLE` (no container plane in this
environment) and does not re-attribute any other run's execution records; it was **not published** — no D1
row was written and no existing report was touched.

Gains are in coverage and structure, not in volume: **+1 observation type**, **+1 static claim**,
**0 → 16 deterministic indicators**, **0 → 1,590 UTF-16 strings**, and scan coverage extended past the old
256 KiB bound (the string cap of 4,096 is now reached).

## 7. Evidence rules honoured (nothing inferred)

No string → behaviour, no domain → C2, no path → persistence, no packer/compiler → behaviour, no
AutoIt → family, no embedded candidate → confirmed payload, no CAPA error → "no capabilities", no FLOSS
error → "no strings", no YARA no-result → clean. Analyzer states (`OBSERVED | ERROR | NO_RESULT |
UNAVAILABLE | NOT_RUN`) are unchanged and never collapsed. FLOSS and CAPA were **not** fixed, no timeout
was raised, no YARA rules were added.

## 8. Files changed / tests / artifacts

**Changed:** `packages/intelligence/src/malware/canonical/staticAnalysis.ts` (extractor depth +
`embedded_objects` scan/observation), `packages/intelligence/src/malware/canonical/claimProcessor.ts`
(`embedded_objects` registered as a static claim class), `tests/unit/m7_claim_processor.test.ts` (rejection
counts now include the new non-positive-capable static observation), **new**
`tests/unit/p3_string_indicator_depth.test.ts` (11 cases).

**Tests:** 525 pass / 0 fail across 32 malware-domain test files, including the 11 new cases. Typecheck:
no errors in the changed files.

**Diagnostic artifacts (local, not canonical evidence):** `scripts/p3_evidence_depth.ts`,
`scripts/p3_resource_walk.ts`, `scripts/p3_post_upgrade_materialization.ts`, outputs in `scripts/p3_out/`.

**Remaining blocker (one line):** the depth increase is in the analyzer, so it appears in the *next*
run-bound report — the published `mir_ec4f353d0030b941` still shows the pre-upgrade string projection.
