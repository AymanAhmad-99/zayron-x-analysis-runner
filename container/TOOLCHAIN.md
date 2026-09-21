# M14.3 Toolchain Register — pinned versions, licenses, digests policy

All versions were resolved from official upstream release metadata at
implementation time (GitHub Releases API / PyPI JSON API). No `latest`, `main`,
or unpinned package resolution appears in production container configuration.

| tool | upstream | pinned version | release metadata date | license (verified from upstream metadata) | integration surface |
|---|---|---|---|---|---|
| LIEF | PyPI `lief` / lief-project/LIEF | `1.0.0` | 2026-07-12 (GitHub release; PyPI 1.0.0 Jul 2026) | Apache-2.0 (project dual Apache/MIT; binding distributed under Apache-2.0 per PyPI metadata) | python binding, in-process |
| FLOSS | PyPI `flare-floss` / mandiant/flare-floss | `3.1.1` | 2024-09-26 (latest GitHub release) | Apache-2.0 (PyPI classifier `License :: OSI Approved :: Apache Software License`; license text confirmed) | python entrypoint `floss` |
| capa | PyPI `flare-capa` / mandiant/capa | `9.4.0` | 2026-04-01 (latest GitHub release) | Apache-2.0 (PyPI classifier confirmed) | python entrypoint `capa` + vendored `capa-rules` v9.4.0 |
| YARA-X | virustotal/yara-x | `1.20.0` | 2026-08-24 (latest GitHub release) | BSD-3-Clause (upstream repo/package metadata) | official release binary `yr` |
| Detect-It-Easy | horsicq/DIE-engine | `3.21` | 2026-04-21 (latest GitHub release) | MIT (upstream repo) | official release binary `diec` |

Rulesets:
- capa-rules v9.4.0 vendored into the image at build time (pinned release zip).
- YARA rules: the repository contains NO canonical YARA ruleset (verified by
  scan during M14.3; `OPEN_SOURCE_ADOPTION_MATRIX.md` lists YARA Rules as a
  future ADOPT item). No rules are invented. YARA-X therefore returns
  `NO_RESULT` with explicit tooling coverage until a rules source is approved.
  The container reserves `/opt/zx-tools/yara-rules` and exposes
  `YARAX_RULESET_VERSION` for a future pinned ruleset.

Digest policy: base image is digest-pinned in the Dockerfile. Tool artifacts
are version-pinned from official releases; image build records binary digests
in the executor provenance (`tool_binary_digest: UNKNOWN` until the first
production image build records them — the executor never fabricates values).

Network policy: runtime outbound access is DENY (host `--network none` /
Cloudflare Container networking) and the image contains no update fetcher.
All tool/rule material is baked in at build time.
