# MASTER AI MODEL

## Invocation inventory
| Site | Model | Task | Validation | Classification |
|---|---|---|---|---|
| analyst/engine.ts:201 | llama-3.1-8b-fp8 | narrative synthesis | parseWorkersAIResponse + grounded-citation validator | AI-ASSISTED |
| engine_v2/gemini_reasoner.ts | gemini-1.5-pro (Google API) | L9 synthesis | grounding sentence fallback | AI-ASSISTED (frozen recommended) |
| shadow_vectorize.ts / rag/retrieval.ts | bge-base-en-v1.5 | embeddings | dim check | DETERMINISTIC |
| KnowledgeProcessor.smokeTest | bge | health check | dim check | DETERMINISTIC |
| api /ai/analyze | via hybrid retrieval | grounded Q&A | injection regexes + grounding | AI-ASSISTED |
| budget/index.ts | neuron estimation | cost gate | — | DETERMINISTIC |

## Rules (enforced + proposed)
1. ENFORCED (existing, keep): grounded citations must exist verbatim in retrieved chunks; epistemic safeguards block in-the-wild assertions without telemetry/KEV (quality_gate.ts:236-244 — now evidence-gated post-P0.1).
2. AI output can never be AUTHORITATIVE: it may only produce SYNTHESIZED/INFERRED claims; operational state (KEV, exploit_status, severity) derives from evidence ports and deterministic parsers only (P0.1 makes this structural for KEV/EPSS).
3. Gemini secret defect: `process?.env?.GEMINI_API_KEY` does not resolve Worker secrets — Gemini silently disabled in production (fail-safe direction; make explicit with env injection or remove).
4. Cost: Workers AI budget module exists; Gemini unbudgeted — keep OFF until wired into budget + gateway.
5. Model/prompt versions are recorded in report metadata (analyst templates) but NOT in event_trace — add model_version to lifecycle traces (P1).
