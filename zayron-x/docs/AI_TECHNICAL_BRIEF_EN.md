# ZAYRON-X Technical Operating Brief

This document is the English technical instruction set for general-purpose models, including Gemini-class systems, when they are asked to work on ZAYRON-X.

## 1. Mandatory Reading Order

Before making any change, read and honor the following in order:
1. `docs/reference/ZAYRON-X_MASTER_ENGINEERING_SPECIFICATION_v1.1.pdf`
2. `docs/AI_MASTER_SPECIFICATION.md`
3. `AGENTS.md`
4. The relevant implementation files for the requested work
5. The current operational docs only as supporting context

## 2. Non-Negotiable Platform Rules

- Cloudflare is the primary runtime, routing, security, cache, deployment, and observability layer.
- OpenNext is the only approved Next.js deployment bridge for Cloudflare.
- Workers, KV, R2, D1, Queues, Workflows, Cron, Workers AI, and AI Gateway are the preferred platform primitives.
- Secrets must remain in Cloudflare Secrets or another approved secret manager.
- Legacy VPS / PM2 / Nginx paths are deprecated and must not be treated as the operating standard.

## 3. What Changed Most Recently

The most recent repository changes were:
- Replaced Redis-backed cache helpers with Cloudflare KV-oriented implementations.
- Replaced Redis-backed rate limiting with KV-based edge-safe logic.
- Simplified the platform health endpoint so it no longer advertises Redis or Supabase as required live checks.
- Rewrote the infrastructure, runbook, and disaster recovery documents to remove legacy operational guidance and to reflect a Cloudflare-native operating model.
- Replaced several public API routes with explicit `legacy-deprecated` responses while the Cloudflare-native data layer migration is completed.

## 4. How to Verify Work

Do not trust a single signal. Verify the result in at least three ways whenever possible:
- Static inspection of the changed files.
- TypeScript or lint/build validation.
- Runtime validation through Wrangler or local equivalent.

For high-risk changes, verify:
- request/response behavior
- redirect and canonical behavior
- cache behavior
- security boundaries
- production compatibility

## 5. Decision Standards

- Prefer the smallest change that moves the repository toward the specification.
- Do not introduce new architecture outside the spec.
- If the request conflicts with the PDF or master spec, stop and explain the conflict instead of improvising.
- Do not widen permissions, weaken auth, or bypass rate limiting unless explicitly authorized by the governing spec.
- Preserve the existing visual identity unless a controlled redesign is explicitly requested.

## 6. Gemini-Specific Instruction

If Gemini is asked to modify or review the project, it must:
- explain what changed in precise technical English,
- identify the exact files touched,
- state why the change is consistent with Cloudflare-first architecture,
- verify the change more than once,
- and call out any remaining gaps clearly.

Gemini must never assume that a change is correct because it compiles once. It should validate from multiple angles and report uncertainty explicitly.

## 7. Required Output Format for Any Model

When reporting work, structure the answer as:
1. Current status
2. Files changed
3. Architectural impact
4. Verification performed
5. Remaining risks or gaps
6. Rollback notes, if applicable

## 8. Final Rule

Cloudflare-first is the default. Anything else requires explicit justification and a documented exit path.

## 9. Enterprise Delivery Additions

Before implementing a new public intelligence feature, the agent must check `docs/ENTERPRISE_EXECUTION_2027.md`.

The agent must not invent evidence, severity, confidence, source provenance, live Cloudflare access, deployment success, or operational metrics. It must distinguish configured state from authenticated live state.

For infrastructure work, use the official Cloudflare MCP servers defined in `.mcp.json` when OAuth access is available. Start with read-only inspection and request explicit authorization before any state-changing operation.
