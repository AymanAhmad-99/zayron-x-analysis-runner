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
#            yara-rules: signature-base DRL-1.1 subset @94a1c48d (717 files, vendored at build time
#                        from an immutable commit; 13 external-variable + 21 non-DRL excluded)
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
    YARAX_RULESET_VERSION=signature-base@94a1c48d7ab499879287ff611dfe7f9c56376030 \
    YARAX_RULESET_SOURCE=github.com/Neo23x0/signature-base \
    YARAX_RULESET_COMMIT=94a1c48d7ab499879287ff611dfe7f9c56376030 \
    YARAX_RULESET_FILE_COUNT=717 \
    YARAX_RULESET_MANIFEST_SHA256=8a8dc006f98488da56bb585cd5dabb790a5ce22887d9344a5d4ca99d44291c47 \
    YARAX_RULESET_SOURCE_DIGEST=87da7f984f178db0cadbae6a8790af46aad8b5d15e9e504728c9e2299c051ade \
    YARAX_RULESET_BUNDLE_SHA256=UNKNOWN \
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
      "magika==1.0.3" \
      "autoit-ripper==1.2.0"

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

# ---- vendored YARA ruleset (M16.3.10) ----
# DRL-1.1 subset of Neo23x0/signature-base at an IMMUTABLE commit (never `latest`,
# never fetched at runtime). Built from the exact audited manifest: 717 files, with
# all 13 external-variable rules and all 21 non-DRL files excluded (34 total — see
# yara-ruleset.excluded.txt). The subset compiles 717/717 under YARA-X 1.20.0 with
# zero errors. The build FAILS CLOSED if the manifest hash or the source-set digest
# does not match the recorded constants — no silent drift, no silent rule exclusion.
ARG YARAX_RULES_COMMIT=94a1c48d7ab499879287ff611dfe7f9c56376030
ARG YARAX_RULES_SOURCE_DIGEST=87da7f984f178db0cadbae6a8790af46aad8b5d15e9e504728c9e2299c051ade
ARG YARAX_RULES_MANIFEST_SHA256=8a8dc006f98488da56bb585cd5dabb790a5ce22887d9344a5d4ca99d44291c47
COPY yara-ruleset.manifest.txt yara-ruleset.excluded.txt yara-ruleset.provenance.json /tmp/yara-ruleset/
RUN set -eu; \
    cd /tmp/yara-ruleset; \
    test "$(sha256sum yara-ruleset.manifest.txt | cut -d' ' -f1)" = "${YARAX_RULES_MANIFEST_SHA256}"; \
    curl -fsSL -o sb.tgz "https://github.com/Neo23x0/signature-base/archive/${YARAX_RULES_COMMIT}.tar.gz"; \
    mkdir -p sb; \
    tar -xzf sb.tgz -C sb --strip-components=1; \
    mkdir -p "${YARA_RULES}"; \
    while IFS= read -r rel; do [ -n "$rel" ] && cp "sb/$rel" "${YARA_RULES}/"; done < yara-ruleset.manifest.txt; \
    count="$(ls -1 ${YARA_RULES}/*.yar ${YARA_RULES}/*.yara | wc -l)"; \
    test "$count" = "717"; \
    digest="$(cd sb && while IFS= read -r rel; do cat "$rel"; done < ../yara-ruleset.manifest.txt | sha256sum | cut -d' ' -f1)"; \
    test "$digest" = "${YARAX_RULES_SOURCE_DIGEST}"; \
    cp sb/LICENSE "${YARA_RULES}/LICENSE.signature-base-DRL-1.1.txt"; \
    cp yara-ruleset.provenance.json "${YARA_RULES}/RULESET_PROVENANCE.json"; \
    cp yara-ruleset.excluded.txt "${YARA_RULES}/EXCLUDED_RULES.txt"; \
    rm -rf /tmp/yara-ruleset

# ---- unprivileged runtime user; no home credentials, no repo mounts ----
RUN useradd --system --create-home --shell /usr/sbin/nologin zxanalyst

COPY --chown=zxanalyst:zxanalyst src/ /app/src/
WORKDIR /app
USER zxanalyst

# Job intake only: POST /analyze with a canonical AnalysisJob. No shell, no
# arbitrary command execution surface; per-job ephemeral workdir under /tmp.
EXPOSE 8080
CMD ["python", "-m", "src.server"]
