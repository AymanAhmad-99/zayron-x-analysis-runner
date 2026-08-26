# ZAYRON-X Agent Rules

This repository is governed by `docs/AI_MASTER_SPECIFICATION.md`.
The Arabic strategic briefing and reusable master prompt are in `docs/AI_STRATEGIC_BRIEF_AR.md`.
The English technical operating brief for any external or general-purpose model is in `docs/AI_TECHNICAL_BRIEF_EN.md`.
The enterprise delivery standard and prioritized free tooling are in `docs/ENTERPRISE_EXECUTION_2027.md`.

Non-negotiable rules:
- Treat Cloudflare as the primary and authoritative runtime for the platform.
- Do not introduce new VPS-first, PM2-first, or non-edge deployment paths unless the specification explicitly allows them.
- Before changing architecture, compare the change against `docs/AI_MASTER_SPECIFICATION.md` and the current Cloudflare stack.
- Preserve security boundaries: secrets stay in Cloudflare secret storage or approved secret managers, never in committed files.
- Prefer existing project conventions, OpenNext, Workers, KV, R2, D1, and Cloudflare-native observability.
- If a change conflicts with the specification, stop and resolve the conflict before editing code.
- Any AI agent working here must read the specification file first and treat it as the local operating contract.

Priority order:
1. `docs/AI_MASTER_SPECIFICATION.md`
2. `docs/AI_STRATEGIC_BRIEF_AR.md` when Arabic work, reporting, product direction, or AI prompting is involved
3. `docs/AI_TECHNICAL_BRIEF_EN.md` when English technical instructions or cross-model prompting is involved
4. `docs/ENTERPRISE_EXECUTION_2027.md` when planning architecture, security, delivery, or product quality work
5. Current repo code and infrastructure files
6. Existing project docs and runbooks
7. Historical notes, audits, and archived drafts
