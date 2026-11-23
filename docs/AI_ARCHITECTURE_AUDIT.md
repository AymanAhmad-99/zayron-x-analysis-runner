# AI ARCHITECTURE AUDIT — ZAYRON-X

Every AI invocation inventoried from code. Classification: DETERMINISTIC (no LLM needed) · AI-ASSISTED (LLM within evidence bounds) · ANALYST-REVIEWABLE (LLM output gated by human/contract review).

---

## 1. Invocation inventory

| # | Site | Model | Task | Input context | Output validation | Persistence | Retry/fallback | Failure behavior | Classification |
|---|---|---|---|---|---|---|---|---|---|
| A1 | `analyst/engine.ts:201` | `@cf/meta/llama-3.1-8b-instruct-fp8` | analyst narrative synthesis | evidence pack + signal | `parseWorkersAIResponse` + `validateGroundedAIResponse` (grounded citations) | ai_runs (D1) | budget-gated (`budget/index.ts` neuron estimates) | degrade to template report | AI-ASSISTED |
| A2 | `analyst/report_templates.ts:471,770` | llama-3.1-8b (declared in output metadata) | template rendering metadata | — | n/a | report fields | — | — | DETERMINISTIC (metadata only) |
| A3 | `engine_v2/gemini_reasoner.ts:111-144` | `gemini-1.5-pro` via Google API | L9 analytical synthesis | prompt built by `buildGeminiReasoningPrompt` from grounded citations | `INSUFFICIENT_GROUNDING_SENTENCE` contract; response schema validation | runtime only | apiKey from `process.env.GEMINI_API_KEY` or param | returns insufficiency sentence | AI-ASSISTED (⚠️ env-var read inside Workers is fragile; secret must be a Worker secret, not process.env) |
| A4 | `engine_v2/shadow_vectorize.ts:271,475` | `@cf/baai/bge-base-en-v1.5` (768d) | embedding for shadow retrieval | chunks/query | dimension check | shadow store + D1 v3 | direct | throw | DETERMINISTIC (embeddings) |
| A5 | `rag/retrieval.ts:241` | bge-base-en-v1.5 | hybrid retrieval embeddings | query | dimension check | — | — | degrade to token match | DETERMINISTIC |
| A6 | `api/src/index.ts` KnowledgeProcessor.smokeTest | bge-base-en-v1.5 | AI health smoke | fixed text | vector dim 768 | event_trace | — | throw | DETERMINISTIC |
| A7 | api `/ai/analyze` route | (via executeHybridRetrieval + AI) | grounded Q&A | bounded context pack | prompt-injection containment regexes; grounding validation | ai_runs | — | INSUFFICIENT_EVIDENCE responses | AI-ASSISTED |
| A8 | api `/admin/benchmark-models` | llama-3.1-8b | benchmark orchestration | benchmark cases | benchmark harness | ai_runs | — | error surfaced | ANALYST-REVIEWABLE |
| A9 | `pipeline/canonical.ts` CURRENT_AI_MODEL constant | llama-3.1-8b declared | model identity for pipeline metadata | — | — | — | — | — | DETERMINISTIC (metadata) |

## 2. Findings

1. **Two LLM providers, no unified gateway:** Workers AI (llama, bge) + direct Google Gemini call. No AI Gateway binding despite `core/aiGateway.ts` existing (partial abstraction, not consistently routed through). Cost/observability/logging diverge per provider.
2. **Secret handling defect:** `gemini_reasoner.ts` reads `globalThis.process?.env?.GEMINI_API_KEY`. In Workers, `process.env` is shimmed only under `nodejs_compat` and Workers secrets are injected into `env`, not `process.env` — this call will silently return undefined in production unless a shim populates it. Correct shape: pass `env.GEMINI_API_KEY` (Worker secret) explicitly through the request object. (No key material was read or printed during this audit.)
3. **AI certainty vs source authority:** no current mechanism prevents AI-synthesized text from influencing `confidence` or `exploit_status`. Invariant I6 (epistemic_status=SYNTHESIZED cannot raise operational state) is the required gate; today confidence calculators accept any inputs.
4. **Grounding contract exists and is good:** `validateGroundedAIResponse` + citation boundary tests (`tests/citation_boundary_matrix.test.ts`, `epistemic_safeguards.test.ts`) are real checks — preserve them and route ALL narrative synthesis through them.
5. **Embeddings are deterministic and fine** (bge-base 768d, dimension-checked in 3 sites). Keep.
6. **Prompt-injection containment** on `/ai/analyze` is regex-based (blocklist) — acceptable as first line, but the durable defense is the grounding validator + invariant I8, not regexes.
7. **Budget system exists** (`budget/index.ts` neuron estimation, daily caps) — preserve; wire Gemini spend into it or remove Gemini until needed (see decision).

## 3. Decisions

- DETERMINISTIC set (A2, A4, A5, A6, A9 + all CVSS/KEV/EPSS parsing) must NOT require an LLM — they don't today. ✅
- Keep ONE narrative synthesizer: recommend Workers AI llama-3.1-8b-fp8 as default (in-account, budgeted, gateway-observable); Gemini stays optional behind the same port with explicit `env` secret and OFF by default in production until cost/observability is wired.
- All AI calls route through one adapter port (`AiPort`) exposing: model, task, inputs-hash, evidence-pack-hash, output schema validation, trace emission (run_id, stage AI_ANALYSIS). This makes A1/A3/A7 interchangeable and auditable.
- AI output NEVER persists as fact: it persists as a CLAIM with epistemic_status=SYNTHESIZED + provenance (model, prompt hash, evidence hash). Report rendering labels it.
