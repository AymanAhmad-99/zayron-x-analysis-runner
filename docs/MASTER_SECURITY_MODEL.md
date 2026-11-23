# MASTER SECURITY MODEL

## Preview/Production write boundaries
| Path | Status |
|---|---|
| D1 | ✅ isolated (separate DBs) |
| INGEST queue | ✅ isolated |
| R2 KNOWLEDGE_BUCKET | ❌ preview inherits PROD bucket binding → preview can write prod objects |
| Vectorize | ❌ preview inherits PROD index → preview can write prod vectors |
| Workflows/KnowledgeProcessor binding | ⚠️ inheritance ambiguity in preview envs |
| PUBLISH queue | prod-only (preview cannot publish) |

Required fix (config-only, next deploy window): redeclare `KNOWLEDGE_BUCKET`, `VECTORIZE`, workflows per env; add staging-prefixed index/bucket.

## Trust classes (policy)
AUTHORITATIVE (CISA KEV, NVD, CNAs) > PRIMARY (vendor advisories, exploit-db for exploit existence) > TRUSTED SECONDARY (established press/analyst) > OSINT (Telegram channels via trust_score) > SIGNAL (telemetry: EPSS values, collector heartbeats) > UNVERIFIED. Implementation today: `sources.trust_score` numeric + ad-hoc `authority_tier` metadata — not systematically applied. Post-P0.1, KEV/EPSS gating is the first enforced instance of this model.

## External-content defense (untrusted input)
| Threat | Current state |
|---|---|
| Prompt injection via source text | Partial: regex blocklist on /ai/analyze + grounding validator; source text and model instructions NOT structurally separated in all paths |
| Oversized payloads | 12k char truncation (blunt but present); no depth/size limits on JSON parse |
| SSRF via source URLs | Fetches restricted to hardcoded feed URLs in ingest; canary routes accept URL-adjacent input — review |
| Parser abuse (XML/RSS) | Regex-based XML parsing (not a real parser) — fragile, not exploitable for XXE, but lossy |
| Poisoned intelligence | KEV text-mention fabrication REMOVED this pass (was the widest poisoning vector); static actor/malware registries remain spoofable-by-code (P1) |
| Secrets in code | `.env` at repo root (unprinted); Gemini key read via `process.env` (broken pattern — would silently disable Gemini, not leak) |

## Supply chain
No dependency-risk scan in CI; wrangler 4.96, pinned bun.lock + pnpm lockfiles coexist (two package managers — supply-chain surface and drift risk).
