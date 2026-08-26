# ZAYRON-X Enterprise Execution Standard

## Purpose

This is the delivery standard for an intelligence platform that must earn trust before it earns scale. It is not a marketing checklist. Every capability below has an owner, an evidence trail, a rollback path, and a measurable operating signal.

## The Five Capabilities To Add Next

### 1. Intelligence Provenance Ledger

Every public intelligence item must retain a stable event identifier, source references, collection time, transformation history, analyst or automated decision, confidence score, and review status. The user interface must expose a concise evidence panel, not only a headline.

Implementation:
- Store canonical event metadata and evidence references in D1.
- Store immutable source captures and signed report artifacts in R2.
- Use KV only for read-through cache and temporary review state.
- Reject publication when confidence, provenance, or next action is absent.

Success signal: no intelligence item can be published without an explainable lineage.

### 2. Release Evidence Gate

Each release should produce a machine-readable evidence record: source revision, build result, type check, route checks, architecture readiness, deployment version, and rollback version.

Implementation:
- Run `bun run architecture:readiness`, `bun run type-check`, and the Worker build before a production deployment.
- Attach the resulting evidence to the pull request or release record.
- Deploy previews first; promote only a verified version.

Success signal: any production version can be traced to a verifiable build and rolled back without guessing.

### 3. Trust-Centered Command Interface

The premium interface should be designed as an evidence-first command center, not a generic SaaS dashboard. Every intelligence card needs severity, confidence, provenance, freshness, and one clearly scoped next action.

Implementation:
- Establish reusable `Severity`, `Confidence`, `Provenance`, `Freshness`, and `NextAction` primitives before adding more pages.
- Use a dense but quiet visual hierarchy: white and near-white surfaces, `#111111` text, and `#FF6B00` only for decisive operational emphasis.
- Require equivalent RTL and mobile behavior for every component, tested as a release requirement.

Success signal: a security leader can answer “how serious, how sure, why, and what next?” within one screen.

### 4. Edge Safety Envelope

External content, including Telegram inputs, is untrusted. It must pass validation, normalization, size controls, idempotency, and provenance stamping before it reaches a model, database, or public page.

Implementation:
- Receive inputs through a narrow Worker endpoint protected by WAF, rate limits, and a request signature where feasible.
- Queue accepted inputs; do not perform long-running ingestion in a request handler.
- Normalize and deduplicate in a Queue or Workflow stage before model enrichment.
- Treat model output as a proposal requiring structured validation, never as a source of truth.

Success signal: prompt injection and malformed data cannot silently become stored or published intelligence.

### 5. Operational Telemetry Contract

Observability must cover user impact and data quality, not just exceptions. Define service-level indicators for availability, latency, ingestion freshness, queue backlog, publication failure, and evidence completeness.

Implementation:
- Enable Workers Observability and route relevant logs to a protected R2 retention bucket through Logpush.
- Define alert thresholds and a named response action for every SLO breach.
- Keep the public status surface separate from internal diagnostics.

Success signal: the team learns of a data or availability regression before customers do.

## Free High-Leverage Tooling

| Need | Free tool or platform capability | Why it belongs here |
| --- | --- | --- |
| Cloudflare-aware AI work | Cloudflare API, Docs, Bindings, and Observability MCP servers | Gives an agent current platform context and authenticated inspection after OAuth authorization. |
| Design-aware AI work | Figma MCP server | Lets an AI use approved components and design tokens instead of inventing inconsistent UI. |
| Supply-chain and secret checks | GitHub Dependabot, CodeQL, and secret scanning | Provides continuous feedback before release. |
| Browser and accessibility confidence | Playwright plus Lighthouse CI | Tests critical flows and catches performance/accessibility regressions. |
| Edge deployment discipline | Cloudflare Workers Builds or the existing GitHub Actions workflow | Creates preview-to-production promotion instead of manual release drift. |

## Required Cloudflare Authorization

Static files show configured account, D1, KV, assets, cron, and observability declarations. They do not prove live access. To allow a human or AI agent to inspect and operate the account, authorize the Cloudflare MCP server through OAuth or run `wrangler login` locally. For CI, use a least-privilege `CLOUDFLARE_API_TOKEN` stored only in the CI secret store.

The minimum verified access checks are:

1. `wrangler whoami`
2. `wrangler deployments list --env production`
3. `wrangler d1 info zayron-x-db`
4. `wrangler kv namespace list`
5. `wrangler tail zayron-x --env production`

Do not paste any token, secret, or OAuth credential into this repository or an AI chat.

## Current Live-State Gate

Read `docs/CLOUDFLARE_LIVE_STATE_AUDIT_2026-08-20.md` before attempting a production deployment. It records verified account access and the current Worker, D1, and environment-binding discrepancies. An agent must not claim production readiness until that audit is remediated and rerun.

## Delivery Order

1. Connect the official Cloudflare MCP servers and verify access using read-only account inspection.
2. Stabilize the data boundary: D1 canonical metadata, R2 immutable artifacts, KV cache only.
3. Build the evidence primitives and apply them to public intelligence cards.
4. Put the ingestion safety envelope behind Queues and Workflows.
5. Enforce release evidence and deploy preview-first.
6. Add SLOs, Logpush retention, and incident drills.

## Model Rule

Any AI agent must verify important work in three independent ways: static inspection, automated validation, and runtime or Cloudflare inspection. If one method is unavailable, it must state the gap explicitly rather than claiming completion.
