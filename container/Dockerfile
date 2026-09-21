# syntax=docker/dockerfile:1
# =============================================================================
# ZAYRON-X malware static-analysis container (M14.3)
#
# Purpose-built for UNTRUSTED-FILE STATIC ANALYSIS ONLY — not a generic app
# container. All tools are installed and PINNED at BUILD time; the analysis
# process performs no outbound network access and receives no credentials.
#
# Pinned versions (determined from official upstream release metadata at
# implementation time — GitHub releases API + PyPI JSON API; see TOOLCHAIN.md):
#   lief   1.0.0   (PyPI, Apache-2.0 / MIT dual — binding distributed under Apache-2.0)
#   floss  3.1.1   (PyPI flare-floss, Apache-2.0)
#   capa   9.4.0   (PyPI flare-capa, Apache-2.0)
#   yara-x 1.20.0  (VirusTotal/yara-x release binary, BSD-3-Clause)
#   diec   3.21    (horsicq/DIE-engine release, MIT)
#
# Network policy (runtime): outbound DENY — enforced by the host runtime
# (--network none / Cloudflare Container no networking) AND by the absence of
# any update fetcher in this image. Sample analysis never touches the network.
# =============================================================================

FROM python:3.12.11-slim-bookworm AS runtime-base

# Tool + ruleset paths (ruleset dirs are baked in; capa rules are vendored at
# build time from the pinned capa-rules release, never fetched at runtime).
ENV TOOLS_HOME=/opt/zx-tools \
    CAPA_RULES=/opt/zx-tools/capa-rules \
    YARA_RULES=/opt/zx-tools/yara-rules \
    YARAX_RULESET_VERSION=none \
    PYTHONUNBUFFERED=1

# ---- pinned python tooling (official PyPI packages, exact versions) ----
RUN pip install --no-cache-dir \
      "lief==1.0.0" \
      "flare-floss==3.1.1" \
      "flare-capa==9.4.0"

# ---- pinned native tooling ----
# yara-x: official release binary (runs on slim debian)
ARG YARAX_VERSION=1.20.0
RUN mkdir -p ${TOOLS_HOME}/bin \
 && curl -fsSL -o /tmp/yarax.tgz \
      "https://github.com/VirusTotal/yara-x/releases/download/v${YARAX_VERSION}/yara-x-${YARAX_VERSION}-x86_64-linux-gnu.tar.gz" \
 && tar -xzf /tmp/yarax.tgz -C ${TOOLS_HOME}/bin --strip-components=0 \
 && chmod +x ${TOOLS_HOME}/bin/yr ${TOOLS_HOME}/bin/yara-x 2>/dev/null || true \
 && rm -f /tmp/yarax.tgz

# diec: official DIE-engine Linux release
ARG DIE_VERSION=3.21
RUN curl -fsSL -o /tmp/die.tgz \
      "https://github.com/horsicq/DIE-engine/releases/download/${DIE_VERSION}/die_linux_${DIE_VERSION}.tar.gz" \
 && mkdir -p /opt/die && tar -xzf /tmp/die.tgz -C /opt/die \
 && chmod +x /opt/die/diec 2>/dev/null || true \
 && rm -f /tmp/die.tgz \
 && ln -s /opt/die/diec ${TOOLS_HOME}/bin/diec

ENV PATH="${TOOLS_HOME}/bin:${PATH}"

# ---- vendored rulesets (build-time; never fetched at runtime) ----
ARG CAPA_RULES_VERSION=9.4.0
RUN curl -fsSL -o /tmp/rules.zip \
      "https://github.com/mandiant/capa-rules/releases/download/v${CAPA_RULES_VERSION}/capa-rules-v${CAPA_RULES_VERSION}.zip" \
 && mkdir -p ${CAPA_RULES} \
 && python -c "import zipfile; zipfile.ZipFile('/tmp/rules.zip').extractall('${CAPA_RULES}')" \
 && rm -f /tmp/rules.zip
# No YARA ruleset is vendored: there is NO canonical ruleset (verified during
# M14.3). YARA-X therefore reports NO_RESULT with explicit tooling coverage
# until a rules source is approved. Never fabricate rules here.

# ---- unprivileged runtime user; no home credentials, no repo mounts ----
RUN useradd --system --create-home --shell /usr/sbin/nologin zxanalyst

COPY --chown=zxanalyst:zxanalyst src/ /app/src/
WORKDIR /app
USER zxanalyst

# Job intake only: POST /analyze with a canonical AnalysisJob. No shell, no
# arbitrary command execution surface; per-job ephemeral workdir under /tmp.
EXPOSE 8080
CMD ["python", "-m", "src.server"]
