# ZAYRON-X Analysis Runner (INTERNAL VALIDATION ONLY)

Ephemeral GitHub-hosted validation runner for the ZAYRON-X malware static-analysis container.

## Scope (STRICT)

- Internal CI / regression / golden-sample validation ONLY.
- Triggered exclusively via `workflow_dispatch` by the Cloudflare control plane (GitHub App, Actions:write).
- The tool set is hard-coded: **lief, floss, die (Detect-It-Easy), yara-x, capa**. No arbitrary executables.
- NOT a public malware-analysis service. No upload endpoints. No arbitrary job inputs.

## Contents

- `.github/workflows/zayron-malware-validation.yml` — the validation workflow
- `container/` — pinned static-analysis container (Dockerfile + job server)
- `README.md` — this file

This repository deliberately contains NO ZAYRON-X application source, NO Cloudflare credentials,
NO GitHub App private keys, and NO malware samples.
