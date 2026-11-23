# Phase 2 — Tool-state mapping proposal (PROPOSAL ONLY, not wired)

Evidence base: one REAL container run for the specimen
`art_gmf_7b98cd3800dede65` (sha256 `7b98cd38…ab7f`), job `job-p2-1790118173988`,
analysis run `ar-p2-1790118173988`, GitHub workflow run `35795483972`,
runner identity `gh-runner-35795483972`, image `zx-malware-analysis:toolchain-1.0.0`
(build context `container/` in `AymanAhmad-99/zayron-x-analysis-runner`,
Dockerfile blob `4e0426cf00622375881da6f6fe6057130377a0a9`), toolchain `toolchain-1.0.0`.

Observed canonical outcomes (verbatim, from the callback's normalized records):

| tool | version | status | note |
|---|---|---|---|
| lief | 1.0.0 | OBSERVED | — |
| floss | 3.1.1 | ERROR | `floss timed out` (hard per-tool timeout 120 s) |
| die | 3.21 | OBSERVED | — |
| yara-x | 1.20.0 | NO_RESULT | `no canonical YARA ruleset is configured (YARAX_RULESET_VERSION=none); tooling coverage is explicit, this is NOT a clean result` |
| capa | 9.4.0 | ERROR | `capa exit 1` (rules v9.4.0 vendored at `/opt/zx-tools/capa-rules`) |

## Proposed canonical semantics

| state | authority | meaning | producer |
|---|---|---|---|
| `OBSERVED` | container | the analyzer executed and produced usable evidence | container adapter |
| `ERROR` | container | the analyzer executed and failed: timeout, non-zero exit, malformed output, adapter crash | container adapter |
| `NO_RESULT` | container | no canonical result is available: either successful execution with empty extraction **or** the run was attempted without a configured canonical input (no ruleset) | container adapter |
| `UNAVAILABLE` | container / runner | the capability itself was unavailable: binary absent from the image, or no analysis endpoint configured | container adapter / runner provisioning |
| `NOT_RUN` | control plane | the step was deliberately not scheduled (excluded by the plan or belonging to a later phase) | pipeline planner |
| `NO_CONTAINER_RESULT` | control plane normalization | the execution attempt completed but the callback carried no record for that requested tool | materializer (`fixedResults` miss) |

## Discrepancy found against the phase-1 contract wording (reported, not forced)

1. phase-1 text described `NO_RESULT` as "executed successfully but produced no
   canonical result". The container also returns `NO_RESULT` **without running the
   scan** when no canonical ruleset exists (YARA-X path returns before invocation).
   The state is correct; the wording must say "attempted, no canonical result".
2. phase-1 text implied `NOT_RUN → NOT_RUN_ANALYZER`. The runtime authority for
   "no record at all" is the control-plane normalization step, which today emits
   `NO_CONTAINER_RESULT` (a materialization status, not a limitation code). No
   limitation code exists for `NOT_RUN` today.
3. A hard tool timeout maps to `ERROR` (container contract), never to
   `NO_RESULT` and never to absence of capability.
4. `tool_binary_digest` / `ruleset_digest` are `UNKNOWN` by explicit policy until
   an image build records them; the executor never fabricates digests.
