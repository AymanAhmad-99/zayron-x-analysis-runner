# ZAYRON-X ENGINEERING RECOVERY REPORT — FINAL

**Date:** 2026-09-18 · **Evidence basis:** live Cloudflare account reads + full repo trace + production D1 queries (all read-only) · Companion docs: BASELINE, REAL_ARCHITECTURE_MAP, CVE_EXECUTION_GRAPHS, CVE_BRAIN_INVENTORY, D1_SCHEMA_RECONCILIATION, DEPLOYMENT_CONVERGENCE, STATIC_INTELLIGENCE_AUDIT, SEMANTIC_INTEGRITY_AUDIT, AI_ARCHITECTURE_AUDIT, CLOUDFLARE_ARCHITECTURE_DECISION, TARGET_CVE_ARCHITECTURE.

---

## PART I — CURRENT REALITY

**What is actually deployed?** 14 workers. Only 4 carry the product (api, ingest, collector-do, web) + their previews. 4 are unreproducible from the repo (legacy `zayron-x-preview`, `zayron-nvd-candidate-trigger`, `zayron-x-api-diagnostic`, prod web `zayron-x-web`), 1 is a deploy accident (`-staging-staging`).

**What actually executes?** The ingest queue consumer (preview/test signals only — production filters everything without `testRun:true`), the api read API (GETs), Telegram collection, and on-demand preview analysis. Zero crons exist. The publish consumer early-returns frozen. Discovery (scheduled) never runs. Canonical pipeline writes: zero rows ever.

**What actually stores data?** Production D1 `zayron-x-db` (mutated by scripts, 6/25 migrations journaled): 1,238 vulnerabilities (all CVSS/EPSS null), 4,041 source_messages, 5,283 relations, 33,540 knowledge chunks, 23,524 traces, **2 articles (1 published)**. Fabric DB: the well-designed canonical schema, empty. R2: knowledge artifacts. Vectorize: knowledge index.

**What actually publishes?** Exactly one thing ever: article `art_611d1cb3` (CVE-2026-86060, 2026-09-11), via the preview path. Three publication code owners exist (publish route, publish queue consumer, Publisher RPC) + a fourth unused (fabric publications).

**What is dead?** Scheduled discovery, all production POSTs (LEGACY_FREEZE), canonical CVE core, knowledge-chunk ingestion (throws), fabric analysis/publication stages, `reports`/`intelligence_reports`/`canonical_*` tables, engine v1.

**What is legacy?** June-era `zayron-x-preview` worker, 9+ `_quarantine_bak` tables, gen1/gen2 static knowledge corpora, 3 generation-old API bundles committed into the tree, business/e-commerce tables in the intel DB.

**What is duplicated?** Three CVE brains (engine_v2 / analyst / queue-consumer-text-path) producing different intelligence for the same CVE (proven in CVE_BRAIN_INVENTORY §3) · 5 confidence calculators · 2 quality gates · 2 report compilers · 3 evidence stores · 3 report stores · 3 knowledge corpora · 2 migration regimes.

## PART II — ROOT CAUSES

1. **Why did architecture fragment?** Development proceeded as serial "micro" patches (micro75→micro89 artifacts in root) — each fix landed on the path that was failing, new paths were cheaper than fixing existing ones, and the package barrel exports everything so any module can reach any other. Nobody ever decommissioned a path; they were guarded (`LEGACY_FREEZE`) instead of removed. Freezing is not deletion: the frozen paths still define code reality.
2. **Why did previous fixes not eliminate the problem?** Fixes were path-local and test-local: a guard added to one route, a regex to one brain, a quarantine to one table. The other parallel paths kept the old behavior. Tests asserted the patched path; the system stayed green while the other brains diverged.
3. **Why could static fixtures mask failures?** The enrichment defaults guarantee a plausible report from any input: missing CVSS → 'MEDIUM' fallback, missing EPSS → fabricated constant, missing KEV → static 8-CVE map, missing evidence → text regexes. Quality gates check report SHAPE, not truth. Tests consume the same static data they assert on — circular verification. Result: CI green while production published nothing for 6 days.
4. **Why could data disappear between source and report?** The ingest boundary flattens structured sources to text: NVD JSON becomes `` `${cveId}: ${description}` `` truncated at 12,000 chars — the `metrics` block (CVSS vector/score) is dropped before persistence. That single design choice is why **all 1,238 vulnerabilities have cvss_score=NULL, epss_score=NULL**. Downstream, report→article rendering drops claim/evidence structure, and three evidence stores split what remains.
5. **Why could different paths produce different intelligence?** Three independent implementations of "what does this CVE mean" (queue text-path, analyst engine, engine_v2) with different heuristics, no shared canonical object, no shared evidence model, no invariant layer. Same CVE → three outputs (proven concretely for CVE-2024-3400).

## PART III — RECOVERY (what happens to what)

**Must be deleted (after the checks named in DEPLOYMENT_CONVERGENCE):** `zayron-x-preview`, `zayron-nvd-candidate-trigger`, `zayron-x-api-diagnostic`, `zayron-x-source-fabric-staging-staging` workers; gen1/gen2 static corpora + `productionReports` runtime seeding; committed dist bundles; `_bak` tables (after R2 export); dead fabric queues.

**Must be frozen:** Gemini reasoner (behind port, off by default), business tables, fabric DB until canonical merge, `workers/scripts/*.py` direct-to-prod SQL (immediately — they caused the migration divergence).

**Must be merged:** quality gates → 1; confidence calculators → 1; evidence stores → 1 (`evidence` + claims model from fabric); report stores → 1 (`reports`, articles as rendered projection); canary identity → main identity; fabric queues → processor job types; source-fabric → shrinking registry + job types.

**Must be rewritten:** `packages/intelligence` core (one pipeline module replacing 8 brains) — the only true rewrite, and it is a consolidation rewrite (adapters, invariants, canonical object, one compiler, one gate are KEPT pieces moved into it). API monolith: split into read-API + publish consumer + workflows (files move; logic mostly kept).

**Must be preserved:** evidence model, event_trace (extend to all stages), KEV/NVD/EPSS adapters (they're correct, just unwired), knowledge v3 (D1+R2+FTS — real), collector DO, publication gate, citation/grounding validators, ResearchWorkflow for on-demand analysis.

## PART IV — TARGET

**Minimum coherent CVE architecture:** cron → ingest (discovery + transport) → INGEST_QUEUE → **one processor** (mapping → canonical → normalize → enrich → analyze → evidence → semantic invariants → confidence → publish decision) → D1 state machine + event_trace → PUBLISH_QUEUE → api publish consumer → articles/web. Full detail + boundaries: TARGET_CVE_ARCHITECTURE.md.

**Cloudflare services actually required:** Workers (4: api, ingest, processor, collector-do + shrinking source-fabric), Queues (3: ingest, publish, DLQ), D1 (1 main, fabric merged in), R2 (raw payloads + artifacts + backups), Vectorize (retrieval index only), 1 DO (collector), 1 cron, Workers AI (bge embeddings + one narrative model). Workflows: kept for on-demand research only; NOT adopted for the pipeline (Option A rationale in CLOUDFLARE_ARCHITECTURE_DECISION).

**Ownership:** D1 = durable intelligence state; R2 = raw/immutable artifacts; Vectorize = derivable retrieval index; DO = collection coordination; Queues = transport; Worker memory = cache only; AI = synthesized claims (never facts).

## PART V — REMAINING MANDATE SECTIONS

### Phase 15 — API/Web contract
Current violations: web hardcodes **preview** API URL in production code (`api.ts:357`); web calls 4 endpoints under a prefix the API doesn't serve (`/graph/edges`, `/campaigns`, `/actors`, `/iocs` without `/api/v1`); API returns raw D1 rows (column leakage) with 3 different response envelopes; web silently degrades to empty states (acceptable) but also fabricates entity names via fallbacks (resolveEntity chains 4 fallback fields). Target: versioned `/api/v1` contract with explicit DTOs (`editorialDto.ts` pattern extended), `NEXT_PUBLIC_API_BASE_URL` env-driven per env, one envelope `{meta, data, error}`, contract tests in CI that run the real worker routes against fixtures.

### Phase 16 — Field lineage (where fields die)
| Field | Origin | Deaths |
|---|---|---|
| CVSS score/vector | NVD metrics JSON | **dies at ingest flattening** (never persisted) → null in 1,238/1,238 rows |
| severity | NVD/text | survives as text-classified keyword; loses authority chain |
| CWE | NVD | dies at flattening; `resolveCweDetails` exists but unconnected |
| affected versions | NVD CPE | dies at flattening (regex `affected_vendor/product` only) |
| fixed versions | vendor advisories | no column at all — MISSING |
| KEV / date_added / due date | KEV feed | KEV flag survives via static map/regex (fabricated); date_added fabricated for 8 CVEs; **due date: not modeled anywhere** — MISSING |
| exploitation | KEV/text | survives as regex artifact (`is_exploited_in_wild=1` on all sampled rows) |
| ransomware | KEV feed | survives only as static-map boolean for 8 CVEs; else absent |
| EPSS | FIRST API | **never fetched** — fabricated constants in engine_v2 only; null in DB |
| technical mechanism | description text | survives as prose; `validateTechnicalMechanismIsolation` guards it |
| references | source URLs | survives as evidence rows (best-preserved field) |
| remediation | KEV/vendor | survives only as 8 static-map strings; else MISSING |
| ATT&CK | mitre adapter | survives as ttp_mappings (sparse), no epistemic gate |
| publication date | publish step | survives |
| modified date | NVD lastModified | **dropped at flattening** — versioning of vulnerabilities impossible |
| confidence | calculators | computed 5 different ways; none evidence-monotonic |

### Phase 17 — Confidence invariants (enforced rules for the ONE calculator)
1. `confidence=HIGH` requires ≥1 AUTHORITATIVE-or-PRIMARY evidence supporting the claim — otherwise cap MODERATE.
2. `confidence=VERY_HIGH` requires zero UNKNOWN critical fields (cvss, exploitation, affected) — otherwise cap HIGH.
3. AI output contributes ≤0 weight to operational confidence (I6); narrative only.
4. Each AUTHORITATIVE contradiction caps at MODERATE and surfaces the conflict (I8).
5. Evidence removal ⇒ confidence strictly non-increasing (mutation-tested).
6. Missing evidence is rendered as UNKNOWN, never as a default value (kills the MEDIUM/0.942 fabrication class).

### Phase 21 — Maintainability test (new engineer, three tasks)
| Task | Files touched today | Target |
|---|---|---|
| Add a CVE source | ingest.scheduled + ingestion adapter + validation + api adapter route + sources registry + tests + possibly wrangler (≈7 files, 3 subsystems, hidden gates: LEGACY_FREEZE/testRun/3-day dedup) | mapper + fixture + registration (3 files) |
| Add a malware source | same + canonicalMalwareBuilder + reporting registry + web component (≈9 files) | same 3-file pattern |
| Add ransomware intelligence | **no pipeline exists** — would require inventing claim semantics (today it's a static boolean) | new mapper + claim type on shared infra |
Verdict: high coupling via the 4,792-line router file and the barrel export; consolidation removes both coupling sources.

### Phase 22 — Complexity hotspots (top 20, with disposition)
1. api/src/index.ts 4,792 — SPLIT (read API / publish consumer / workflows) 2. collector-do.ts 2,491 — REFACTOR (drop analysis import) 3. sources/adapters.ts 2,017 — SPLIT per source 4. ingest/index.ts 1,227 — SPLIT (discovery/transport/canary) 5. knowledge/master_manifest.ts 893 — DELETE 6. analyst/report_templates.ts 785 — MERGE into reporting 7. ingestion/universal_book_pipeline.ts 782 — FREEZE (corpus domain, not CVE) 8. reporting/qualityGate.ts 655 — MERGE with engine_v2 gate 9. normalization/pipeline.ts 635 — KEEP 10. source-fabric/index.ts 634 — MERGE gradually 11. engine_v2/shadow_vectorize.ts 597 — MERGE with rag 12. knowledge/corpus.ts 587 — DELETE 13. db/schema.ts 572 — RECONCILE 14. pipeline/canonical.ts 526 — KEEP (canonical core) 15. knowledge/manifest.ts 502 — DELETE 16. publishing/publisher.ts 501 — KEEP (publication owner) 17. engine_v2/knowledge_router.ts 503 — MERGE 18. reporting/registry.ts 485 — KEEP post-dedup 19. rag/retrieval.ts 477 — KEEP 20. reporting/types.ts 477 — MERGE types. Disposition honors "reduce conceptual, not line-count" complexity: the KEEP items are the target architecture's bones.

### Phase 23 — Deletion candidates (separated lists)
**Proven safe to delete (after final dependency check):** committed dist dirs (`workers/api/workers/api/dist-micro77d3`, `dist-prod-check`, `dist-preview`), `KnowledgeProcessor.processBatch` (throws by design), gen1/gen2 corpora constants, `engine/engine.ts` v1 (post-detangle), root micro*/task91 artifacts (relocate to `validation/artifacts/`), `.tmp-micro77-check/`.
**Safe to freeze:** legacy/unknown workers, business tables, fabric DB, Gemini, universal_book_pipeline.
**Needs migration first:** `KNOWN_CISA_KEV_ENTRIES` removal (§P0.1 port migration), `_bak` tables (R2 backup), publication table consolidation, canary→main identity, `sources.source_type` fix, EPSS adapter + kev_state migrations.
**Must remain:** evidence/event_trace/articles/vulnerabilities (until canonical replaces), knowledge v3, collector, KEV/NVD/EPSS adapters, publication gate, grounding validators.
**Historical artifacts:** 100+ root/*.md audit reports → `docs/history/`; micro JSON → `validation/artifacts/`.

### Phase 37 — Business feasibility (tied to technical constraints)
- **Low operating cost:** plausible. Queue+processor+D1 at hundreds of CVEs/day is well inside Workers paid tiers; Workers AI is budget-gated; the unbounded item today is Gemini (frozen by decision). D1 100 MB after 4 weeks of idle implies storage growth is manageable with retention policy on raw text (R2 offload).
- **Small engineering team:** the 8-brain sprawl is the team-killer; after consolidation the system is ~4 workers + 1 package with explicit boundaries — maintainable by 2–3 engineers.
- **Launch:** blocked TODAY by integrity debt, not features: fabricated EPSS/KEV values are indefensible in customer due diligence; the public site reads preview data; pipeline is dormant. The P0.1+EPSS+publication-owner+cron items are launch-blocking.
- **Hundreds of CVEs/day:** the Option-A design handles it (batch consumer, D1 batched writes, NVD rate-limit pacing in the processor). The 56% consumer failure rate must first be root-caused (error codes exist in event_trace) — at 100× volume that failure rate is the business risk.
- **Future malware/ransomware/campaign domains:** the shared-infra + per-domain mapper model (TARGET §2) supports them by construction; ransomware-as-claim-type is the correct primitive.
- **Commercial API:** read-only API exists; contract hardening + API keys + rate limiting are additive, not architectural.
**Unsupportable claims avoided:** no SLA is defensible while the only published article came from a preview path; "production ready" statements in prior reports are CONTRADICTED BY CURRENT EVIDENCE (zero crons, zero canonical rows, frozen mutation surface).

## PART VI — SUCCESS CONDITIONS (A–L, verified)

A ✅ architecture understood (REAL_ARCHITECTURE_MAP) · B ✅ every CVE entry path known (CVE_EXECUTION_GRAPHS: 7 graphs, 4 dead/latent) · C ✅ every duplicate brain identified (20-row inventory, divergence proven) · D ✅ static intelligence enumerated with removal design (S1–S10 + P0.1 plan) · E ✅ micro76 generic replacement designed (invariants I1–I8 + 8 negative cases) · F ✅ D1 state reconciled (6/25 migrations, 3 planes, empty canonical core) · G ✅ deployment drift mapped (4 unreproducible workers, oldest ingest 4 changes behind) · H ✅ data ownership explicit (TARGET §3) · I ✅ publication ownership explicit (3 owners found → 1 rule) · J ✅ credible single canonical architecture (TARGET, converging all graphs) · K ✅ target is simpler (8 brains → 1; 14 workers → ~5; 8 queues → 3; 3 corpora → 1) · L ✅ a new engineer reads TARGET_CVE_ARCHITECTURE + ONE processor module — not 36,000 lines.

## PART VII — THE FINAL CTO TEST

**If I were CTO of ZAYRON-X tomorrow, personally responsible for the next 12 months:**

**I would consolidate and partially rewrite — not continue, not full-rewrite.**

- **Continue? No.** The current architecture publishes fiction on one path and nothing on the others; every additional feature deepens the six-brains problem.
- **Full rewrite? No.** Too much is correct: adapters, evidence model, trace table, publication gate, grounding validators, knowledge v3, collector. A rewrite would burn proven assets to re-earn lessons already paid for.
- **Consolidate + rewrite the core? Yes.** Concretely, in order:
  1. **Month 1 — stop the bleeding:** execute P0.1 (KEV port migration), kill EPSS fabrication (real FIRST API or UNKNOWN), fix web→production API URL, fix queue-consumer frozen-no-ack, freeze the direct-to-prod Python scripts, add the cron. No features, no new tables beyond kev_state/epss/processing_runs.
  2. **Months 2–3 — one processor:** build the single CVE processor against the empty canonical tables that already exist; move engine_v2/analyst/queue-path logic into it (logic kept, location unified); ship the golden CVE suite (16 fixtures) and the I1–I8 invariants with mutation tests; retire the parallel brains behind compatibility adapters in tests only.
  3. **Months 4–6 — convergence:** one migration journal (diff-and-reconcile 0006–0023), publication owner = one, evidence stores = one, API contract DTOs + contract tests, prod web config restored, delete the four orphan workers + `_bak` tables, source-fabric folded to registry + job types.
  4. **Months 7–12 — extend on the clean core:** malware domain (mapper+fixtures only), campaign claims, commercial API keys — each proving the 3-file addition claim. Workflows adopted only if a real workload need appears (long waits/human gates) — the decision doc names the triggers.

**Reasoning, in the required dimensions:** CORRECTNESS — the fabricated-data paths must die before any growth, or growth multiplies fiction. SIMPLICITY — one brain, one confidence, one gate; every deletion list in this report increases conceptual simplicity, not just line counts. MAINTAINABILITY — the 3-file source-addition test is the hiring multiplier. EVIDENCE INTEGRITY — the flattening fix + claim/evidence model makes every public field traceable; that traceability is the product. COST — Option A is the cheapest durable design that satisfies the integrity requirements; Workflows/DOs are paid for by need, not fashion. RELIABILITY — per-subject isolation + run lineage + DLQ convert the 56% consumer failure rate from a silent disease into a visible metric. FUTURE CTI EXTENSIBILITY — shared infrastructure, per-domain mappers: malware/campaign/actor plug in without touching the CVE core.

**The one-sentence version:** ZAYRON-X does not need a bigger system; it needs the system it already has, minus every path that lies, converged into one that cannot.

---

*All 12 deliverables complete. No production state was modified during this recovery pass; every destructive action remains forbidden per docs/ENGINEERING_RECOVERY_BASELINE.md §5 until the phased plan above is executed with its own checkpoints.*
