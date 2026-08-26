# ZAYRON-X Master Engineering Specification

Source: `../reference/ZAYRON-X_MASTER_ENGINEERING_SPECIFICATION_v1.1.pdf`

This file is the project-local operating contract for humans and all AI agents.
If any other instruction conflicts with this document, this document wins inside the ZAYRON-X repo unless a newer, explicitly approved engineering decision says otherwise.

## 1. Core mandate

- Build ZAYRON-X as a Cloudflare-first platform.
- Treat Cloudflare as the primary edge, deployment, cache, routing, and observability layer.
- Keep the system consistent with the product spec, but let verified current vendor docs override stale historical notes.
- Avoid architecture drift. Every new feature must fit the Cloudflare-first model.

## 2. Execution hierarchy

1. Cloudflare Workers and OpenNext on Cloudflare
2. Cloudflare KV, R2, D1, Workers Assets, Cron, and Observability
3. Supabase for data, auth, and storage where already part of the stack
4. Redis only where it is explicitly justified and edge-safe
5. External VPS-style components only as a temporary fallback or a clearly documented exception

## 3. Hard prohibitions for AI agents

- Do not invent new infrastructure outside the spec.
- Do not add new business logic on a VPS if the same logic can run on Cloudflare Workers.
- Do not make Cloudflare optional in any critical path.
- Do not store secrets in source files, docs, or environment examples.
- Do not widen permissions, bypass auth, or weaken RLS/CSP/rate limits without an explicit security review.
- Do not remove or downgrade Cloudflare observability, logging, or rollback controls.

## 4. Cloudflare architecture rules

- Workers is the primary application runtime.
- OpenNext is the Next.js bridge for Cloudflare deployment.
- KV is the incremental cache / ISR layer.
- R2 is for logs, archives, and backup objects.
- D1 is for edge-native relational data only where the architecture explicitly uses it.
- Cloudflare secrets are the source of truth for runtime secrets.
- DNS, custom domains, and edge routing must be configured so traffic lands on Cloudflare first.
- Any fallback origin must remain secondary and documented.

## 5. Repository alignment rules

- Keep `wrangler.toml`, `open-next.config.ts`, deployment scripts, and runtime code consistent.
- If the repo still contains VPS, PM2, or Nginx references, treat them as legacy until intentionally retired.
- Prefer `app/`, `lib/`, `workers/`, `docs/`, and `scripts/` patterns that already exist.
- Keep docs, code, and infrastructure files synchronized after every architectural change.

## 6. AI agent operating procedure

Before making changes:
- Read this file.
- Read the relevant code paths.
- Verify the current deployment model in `wrangler.toml`, `open-next.config.ts`, and the Cloudflare-related docs.
- Identify conflicts between the spec and the codebase.

While making changes:
- Prefer minimal, targeted edits that move the repo toward the specification.
- Preserve existing security controls.
- Keep Cloudflare as the default assumption in code and docs.

After making changes:
- Re-check that the repo still follows the spec.
- Update docs if the code changed the operational truth.
- If the repo cannot fully match the spec yet, record the gap explicitly and keep Cloudflare-first as the target state.

## 7. Current interpretation of the PDF

The PDF is not just a design brief. It is a system contract that requires:
- Cloudflare-first execution
- Strong content and threat-intelligence workflows
- Formal AI operating procedures
- Strict governance, security, reliability, and acceptance criteria
- Repository structure that reflects the system boundaries

## 8. Local working rule

If you are an AI agent and you are about to modify ZAYRON-X:
1. Read `docs/AI_MASTER_SPECIFICATION.md`.
2. Inspect the relevant implementation files.
3. Compare them against the specification.
4. Then edit only what is necessary.

