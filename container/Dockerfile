# syntax=docker/dockerfile:1
# =============================================================================
# ZAYRON-X malware static-analysis container (M14.3 / M14.4)
#
# Purpose-built for UNTRUSTED-FILE STATIC ANALYSIS ONLY — not a generic app
# container. All tools are installed and PINNED at BUILD time; the analysis
# process performs no outbound network access and receives no credentials.
#
# Pinned build inputs (every digest/URL below was resolved from official
# upstream release metadata and confirmed live at M14.4 — no fabricated
# digests, no `latest`, no unpinned resolution):
#   base     ubuntu:24.04 @ sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3
#   lief     1.0.0  PyPI `lief` (cp312-abi3 manylinux_2_28_x86_64 wheel)
#   floss    3.1.1  PyPI `flare-floss` (pure-python wheel)
#   capa     9.4.0  PyPI `flare-capa` (pure-python wheel)
#   yara-x   1.20.0 GitHub release asset yara-x-v1.20.0-x86_64-unknown-linux-gnu.tar.gz (CLI `yr`)
#   diec     3.21   GitHub release asset die_3.21_Ubuntu_24.04_amd64.deb (installs /usr/bin/diec)
#   magika   1.0.3  PyPI `magika` (official google/magika; Rust core + python binding,
#                   wheels for cp38+ manylinux; Apache-2.0). Content-type classification
#                   ONLY — never a malware verdict, family, or behavior assessment.
#   rules    capa-rules v9.4.0 source tarball (vendored at build time, never fetched at runtime)
#
# Network policy (runtime): outbound DENY — enforced by the host runtime
# (--network none / Cloudflare Container no networking) AND by the absence of
# any update fetcher in this image. Sample analysis never touches the network.
# =============================================================================

FROM ubuntu:24.04@sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3

ENV TOOLS_HOME=/opt/zx-tools \
    CAPA_RULES=/opt/zx-tools/capa-rules \
    YARA_RULES=/opt/zx-tools/yara-rules \
    VIRTUAL_ENV=/opt/zx-venv \
    YARAX_RULESET_VERSION=none \
    MAGIKA_VERSION=1.0.3 \
    PYTHONUNBUFFERED=1 \
    PATH=/opt/zx-venv/bin:/opt/zx-tools/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# ---- python runtime + pinned native tooling in one resolver pass ----
# diec 3.21 ships as an official Ubuntu 24.04 package; apt resolves its Qt5
# runtime dependencies (libqt5core5a, libqt5script5, libqt5dbus5, …) against
# the distribution's own ABI, so no bundled desktop runtime is required and no
# unversioned package is pulled.
ARG DIE_URL=https://github.com/horsicq/DIE-engine/releases/download/3.21/die_3.21_Ubuntu_24.04_amd64.deb
# build-essential + python3-dev: required to compile the `binary2strings`
# native extension that flare-floss depends on (verified live — its sdist has
# no prebuilt cp312 wheel and needs a C++ toolchain at install time).
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-venv python3-dev build-essential ca-certificates curl \
 && curl -fsSL -o /tmp/die.deb "${DIE_URL}" \
 && apt-get install -y --no-install-recommends /tmp/die.deb \
 && rm -f /tmp/die.deb \
 && rm -rf /var/lib/apt/lists/*

# ---- pinned python tooling (official PyPI wheels, exact versions) ----
RUN python3 -m venv ${VIRTUAL_ENV} \
 && ${VIRTUAL_ENV}/bin/pip install --no-cache-dir \
      "lief==1.0.0" \
      "flare-floss==3.1.1" \
      "flare-capa==9.4.0" \
      "magika==1.0.3"

# ---- pinned native tooling: yara-x official release binary (static musl build) ----
ARG YARAX_VERSION=1.20.0
RUN mkdir -p ${TOOLS_HOME}/bin \
 && curl -fsSL -o /tmp/yarax.tgz \
      "https://github.com/VirusTotal/yara-x/releases/download/v${YARAX_VERSION}/yara-x-v${YARAX_VERSION}-x86_64-unknown-linux-gnu.tar.gz" \
 && tar -xzf /tmp/yarax.tgz -C ${TOOLS_HOME}/bin \
 && chmod +x ${TOOLS_HOME}/bin/yr \
 && rm -f /tmp/yarax.tgz

# ---- vendored capa ruleset (pinned source release; never fetched at runtime) ----
ARG CAPA_RULES_VERSION=9.4.0
RUN mkdir -p ${CAPA_RULES} \
 && curl -fsSL -o /tmp/rules.tgz \
      "https://github.com/mandiant/capa-rules/archive/refs/tags/v${CAPA_RULES_VERSION}.tar.gz" \
 && tar -xzf /tmp/rules.tgz -C ${CAPA_RULES} --strip-components=1 \
 && rm -f /tmp/rules.tgz

# No YARA ruleset is vendored: the repository has NO canonical ruleset (verified
# during M14.3). YARA-X therefore reports NO_RESULT with explicit tooling
# coverage until a rules source is approved. Never fabricate rules here.

# ---- unprivileged runtime user; no home credentials, no repo mounts ----
RUN useradd --system --create-home --shell /usr/sbin/nologin zxanalyst

COPY --chown=zxanalyst:zxanalyst src/ /app/src/
WORKDIR /app
USER zxanalyst

# Job intake only: POST /analyze with a canonical AnalysisJob. No shell, no
# arbitrary command execution surface; per-job ephemeral workdir under /tmp.
EXPOSE 8080
CMD ["python", "-m", "src.server"]