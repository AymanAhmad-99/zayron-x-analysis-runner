# M14.3 / M14.4 Toolchain Register — pinned versions, licenses, digests policy

All versions were resolved from official upstream release metadata at
implementation time (GitHub Releases API / PyPI JSON API / Docker Hub registry
API). No `latest`, `main`, or unpinned package resolution appears in production
container configuration.

Every build input below was re-verified live at M14.4, because the original
M14.3 register could not be built: the base-image digest was not a real
manifest digest, and three download URLs did not exist upstream (HTTP 404).
The corrected inputs are:

| tool | upstream | pinned version | verified build input | license (upstream metadata) | integration surface |
|---|---|---|---|---|---|
| base image | Docker Hub `library/ubuntu` | `24.04` | `@sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3` | Ubuntu base image licence (free redistributable) | container runtime |
| LIEF | PyPI `lief` / lief-project/LIEF | `1.0.0` | wheel `lief-1.0.0-cp312-abi3-manylinux_2_28_x86_64.whl` | Apache-2.0 (project dual Apache/MIT; binding distributed under Apache-2.0) | python binding, in-process |
| FLOSS | PyPI `flare-floss` / mandiant/flare-floss | `3.1.1` | wheel `flare_floss-3.1.1-py3-none-any.whl` | Apache-2.0 | python entrypoint `floss` (`-j/--json` prints JSON to stdout) |
| capa | PyPI `flare-capa` / mandiant/capa | `9.4.0` | wheel `flare_capa-9.4.0-py3-none-any.whl` | Apache-2.0 | python entrypoint `capa` (`--quiet --json --rules`) |
| YARA-X | VirusTotal/yara-x | `1.20.0` | release asset `yara-x-v1.20.0-x86_64-unknown-linux-gnu.tar.gz` (archive contains the static `yr` CLI) | BSD-3-Clause | official release binary `yr` (`yr scan -C <rules> <sample>`) |
| Detect-It-Easy | horsicq/DIE-engine | `3.21` | release asset `die_3.21_Ubuntu_24.04_amd64.deb` → installs `/usr/bin/diec` | MIT | release binary `diec` (`-j` JSON output); Qt5 runtime deps resolved by apt |

Rulesets:
- capa-rules v9.4.0 vendored into the image at build time from the pinned
  upstream **source tarball** `https://github.com/mandiant/capa-rules/archive/refs/tags/v9.4.0.tar.gz`
  (the v9.4.0 release publishes no binary asset; the source tag is the pinned
  artifact). Extracted with `--strip-components=1` into `/opt/zx-tools/capa-rules`.
- YARA rules: the repository contains NO canonical YARA ruleset (verified by
  scan during M14.3; `OPEN_SOURCE_ADOPTION_MATRIX.md` lists YARA Rules as a
  future ADOPT item). No rules are invented. YARA-X therefore returns
  `NO_RESULT` with explicit tooling coverage until a rules source is approved.
  The container reserves `/opt/zx-tools/yara-rules` and exposes
  `YARAX_RULESET_VERSION` for a future pinned ruleset.

Digest policy: the base image is digest-pinned in the Dockerfile. Tool artifacts
are version-pinned from official upstream releases (URLs verified live). The
image build records binary digests in the executor provenance
(`tool_binary_digest: UNKNOWN` / `ruleset_digest: UNKNOWN` until an image build
records them — the executor never fabricates values).

Network policy: runtime outbound access is DENY (host `--network none` /
Cloudflare Container networking) and the image contains no update fetcher.
All tool/rule material is baked in at build time. The only network access in
this image's lifecycle is `apt`/`pip`/release download during the build.
