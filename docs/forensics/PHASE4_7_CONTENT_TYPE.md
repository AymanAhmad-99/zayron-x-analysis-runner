# Phase 4.7 — Deterministic content-type classification (Google Magika)

**Specimen:** `art_gmf_7b98cd3800dede65` · SHA-256 `7b98cd3800dede6537cf78e7b61eeeda71d251dc97c70cb7c2135c6aa310ab7f`
**Fresh run:** `ar-p47-1790129140855` (job `job-p47-1790129140855` · workflow run 35808984255)
**Live report:** `mir_901e9c0071d375ce` — contract `1.2.0-malwarereport-contenttypecontract`
**Status:** VERIFIED — magika runs pinned inside the isolated container and publishes one typed content-type
observation; no verdict, family, behavior, configuration, infrastructure or technique is created from it.

## What magika is here

One question only: *what type of content does this artifact appear to contain?* It is a classifier, not an
AV verdict. The score is `prediction_score` — the model's score for its content-type prediction — and is
never published as `confidence`, threat confidence, or any malware/family/behavior signal.

## Live result (verbatim from the API payload)

| field | value |
| --- | --- |
| tool / version | `magika` / `1.0.3` (pinned PyPI wheel, `magika==1.0.3`) |
| observation_status | `OBSERVED` |
| content_type | `pebin` — “PE Windows executable” (group `executable`, mime `application/x-dosexec`, `is_text: false`) |
| prediction_score | `0.9999990463256836` |
| prediction_mode | `HIGH_CONFIDENCE` (configured on the analysis plane; magika does not echo it back) |
| model identifier | `standard_v3_3` (the model NAME — magika exposes no model-version accessor, so nothing is invented) |
| execution_duration_ms | `59.571` (measured in-container: model construction + one inference on 58,332 bytes) |
| evidence lineage | `observation_id obs_tool_magika_…`, `evidence_id ev_tool_magika_45e4da0a9c9a3ee5`, run/artifact scoped |
| cross-tool | `AGREES` with the structural class `PE` (LIEF `PE`; DIE: AutoIt, Microsoft Linker, MSVC, Records) |

Unchanged analyzer states in the same run: **LIEF `OBSERVED`, DIE `OBSERVED`, FLOSS `ERROR`, CAPA `ERROR`,
YARA-X `NO_RESULT`**, plus `magika OBSERVED`. Routing is untouched: magika neither skips nor triggers
another analyzer, and its disagreement with the structural reading is recorded as an unresolved cross-tool
discrepancy (never auto-adjudicated).

## Report-level invariants (live, read gate 0 rejections)

`static_indicators` 16 · `embedded_objects` 2 · `capabilities` 1 (`AUTOIT_COMPILED_SCRIPT_SUPPORT`) ·
`behaviors` 0 · `configuration` 0 · `infrastructure` 0 · `attack_mbc` 0 · `conflicts` 0 ·
`family` UNRESOLVED · `grounding.all_statements_grounded` true (28 grounded / 0 ungrounded / 0 AI facts) ·
`overall_status` SUCCEEDED · no `verdict`/`malicious` field exists in the payload.

## Container deployment (approved, toolchain register kept at `toolchain-1.0.0`)

The live analysis plane builds `container/` from `AymanAhmad-99/zayron-x-analysis-runner`, so the pinned
toolchain was deployed there and read back byte-identical to this repository's tracked source:

| commit | file |
| --- | --- |
| `27b62930…` | `container/Dockerfile` — `magika==1.0.3` pinned in the venv, `MAGIKA_VERSION=1.0.3` |
| `35f0a6d1…` | `container/src/server.py` — in-process `adapt_magika` adapter |
| `844aa189…` | `.github/workflows/zayron-malware-validation.yml` — `magika` in `requested_tools`, `MAGIKA_VERSION` env |

Isolation is unchanged: `--network none`, `--cap-drop ALL`, `--security-opt no-new-privileges`,
`--pids-limit 64`, `--memory 2g`, `--cpus 2`, read-only sample mount, no added capabilities or host mounts.
The pinned wheel bundles `models/standard_v3_3/model.onnx` (verified in the `python-v1.0.3` source tree), so
there is **no runtime network dependency** — proven by the run itself succeeding under `--network none`.

## Defects found and fixed (each one directly triggered by this phase)

1. **Read gate rejected a truthful tool status.** The gate reused the *container-results* vocabulary
   (`OBSERVED|NO_RESULT|UNSUPPORTED|ERROR|UNAVAILABLE`) for the *published* tool table, where the
   materializer legitimately writes `NO_CONTAINER_RESULT` (no execution record for a requested tool).
   Adding magika made that reachable: a valid report was rejected as `tool_results:unknown_status`.
   Fix: `PUBLISHED_TOOL_STATUS_VOCABULARY` (superset) used by the gate; the container-result validation
   keeps the narrower vocabulary, so the plane still cannot smuggle `NO_CONTAINER_RESULT` into its records.
2. **Non-OK magika status collapsed into `NO_RESULT`.** `FILE_NOT_FOUND_ERROR` / `PERMISSION_ERROR` /
   `UNKNOWN` are execution failures; mapping them to `NO_RESULT` merged “could not run” with “ran, found
   nothing”. Fix: non-OK status → `ERROR` (with the status name); `NO_RESULT` now means only “executed, no
   usable classification” (empty label). Regression-locked in the python adapter test.
3. **Silent null model provenance.** The adapter called `identifier.get_model_version()`, which does not
   exist in magika 1.0.3 (`get_model_name()` / `get_module_version()` do), inside a bare `except` that
   swallowed the failure — so the model identifier was always `null`. Fix: read the two accessors magika
   actually provides; a getter failure now surfaces as `ERROR` instead of a silent null.

## Verification

| check | result |
| --- | --- |
| focused TS tests (9 malware files: bridge, planner, runtime, container executor, materialization, contract versioning, read gate, capability, report) | **117 pass / 0 fail** |
| container adapter tests (`tools/malware-analysis-container/tests/test_magika_adapter.py`, dependency-free stub of the pinned API) | **9 pass / 0 fail** |
| adapter normalization determinism (same bytes twice → identical normalized payload) | pass |
| evidence identity determinism (`run:tool:artifact:version` → fnv1a64; no clock/random/duration) | pass |
| typecheck (`packages/intelligence`, malwarescope) | clean (pre-existing errors remain in untouched `reporting/`, `engine_v2`, `sources/`, `core/`) |
| live read gate on the new row | 0 rejections (contract 0, content-type section 0) |
| historical rows | pre-hardening `mir_c8eb2d1f6815fd7b`, `mir_d65a9df02b4ee06f`, `mir_0237708343825ecd` → 404; the five valid rows → 200; list serves 6 |
| live magika execution | `OBSERVED` under `--network none` |

## Rust-grade review of the changed files

No catch-and-ignore on an evidence path (every adapter failure returns an explicit `ERROR`/`UNAVAILABLE`/
`NO_RESULT`), no default content type, no default score, no generic `confidence` field, no nondeterministic
identity, no cross-run or cross-artifact access (the projection fails closed on any mismatch), no hidden
network call, no shared mutable state, no second source of truth (the section is a view over the canonical
tool observation), no automatic maliciousness inference. One documented, non-triggering smell remains:
`is_text: bool(getattr(final, "is_text", False))` would fabricate `false` if the field were ever absent —
impossible with the pinned dataclass, and left unchanged rather than re-cutting a verified adapter.

## Remaining issue

Magika's prediction is evidence only: nothing consumes it for routing or depth yet, so the classifier adds
analyst-visible context without adding a single piece of new intelligence.
