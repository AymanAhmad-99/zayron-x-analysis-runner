# ZAYRON-X — CANONICAL SYSTEM GOVERNANCE

## SECTION A — VERIFIED SYSTEM ARCHITECTURE

This section contains only verified mechanisms backed by actual live source code in the repository and verified live Cloudflare infrastructure.

### 1. Cloudflare Serverless Infrastructure Topology
* **Edge Proxy & SSR Host:** `apps/web/worker-proxy.js` intercepts all incoming requests to `https://zayron-x.co`. It enforces apex canonical 301 redirects, redirects legacy `/news` to `/threats`, serves `/api/health`, injects edge security headers, and proxies `/api/*` to `zayron-x-api` via Service Binding.
* **REST & Analytical Engine:** `workers/api/src/index.ts` exposes API routes, handles intelligence queries, and orchestrates workflows (`ResearchWorkflow`, `KnowledgeCorpusWorkflow`).
* **Ingestion & Queue Consumer:** `workers/ingest/src/index.ts` consumes `zayron-ingest-queue`, executes SHA-256 deduplication, normalizes multi-lingual signals, and records evidence in D1.
* **Telegram Collector:** `workers/telegram-collector-do/src/collector-do.ts` runs a stateful Cloudflare Durable Object managing stream ingestion with a 10,000-hash bounded memory cache.

### 2. Knowledge Core & Hybrid RAG Retrieval
* **D1 Knowledge Corpus:** 36,808 canonical chunks stored in table `knowledge_chunks` with 75 parent documents in `knowledge_documents` and 15 grounded standards in `knowledge_artifacts`.
* **Hybrid Retrieval Path (`packages/intelligence/src/rag/retrieval.ts`):**
  - **Vector Semantic Search:** Queries Cloudflare Vectorize (`zayron-knowledge-index`, 768 dimensions, cosine metric) using `@cf/baai/bge-base-en-v1.5`.
  - **Deterministic SQL Fallback:** When vector matches are empty, executes parameterized token queries across `knowledge_chunks` with `authority_tier` weighting.
  - **Citation Verification:** Validates that chunk IDs in AI output exist in retrieved context pack; rejects fabricated chunk IDs.

### 3. 12-Layer CTI Analysis Framework (`packages/intelligence/src/analyst/engine.ts`)
* Implements the 12-layer analytical framework:
  1. Source Validation (Tier 0 to 4)
  2. Atomic Claim Extraction
  3. Fact / Inference / Reported Claim Epistemic Separation
  4. Cross-Source Corroboration & Contradiction Detection
  5. Deterministic Entity Resolution (CVE, Actors, Malware, IOCs)
  6. Temporal Chronology Analysis
  7. MITRE ATT&CK Mapping
  8. Vulnerability Analysis (CVSS, EPSS, CISA KEV)
  9. Malware Analysis (Capabilities & Persistence)
  10. Target & Infrastructure Impact Analysis
  11. Decoupled Mathematical Confidence Calculation (0.0 to 1.0)
  12. Grounded Analyst Assessment & Mitigations

### 4. Fail-Closed Trust Gate & Idempotent Publishing
* **Trust Gate (`workers/api/src/index.ts`, `workers/ingest/src/index.ts`):** Default status is `QUARANTINED`. Transitions to `READY_TO_PUBLISH` only if source is Authoritative Tier 0 or evidence weight $\ge 0.90$.
* **Idempotency Guarantee:** Events and articles use SHA-256 content hashing. Repeated ingest triggers update existing records (`ON CONFLICT`) rather than creating duplicates.
* **Social & Telegram Derivatives (`packages/intelligence/src/publishing/social.ts`):** Generates 40–70 word high-density cards for Telegram distribution with deterministic entity hashtags.

### 5. Edge Security & Technical SEO (`apps/web/worker-proxy.js`)
* **Security Headers:** Injects `Strict-Transport-Security` (2-year preload), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Content-Security-Policy`.
* **Canonical Domain:** Enforces `https://zayron-x.co` apex routing with 301 redirects.
* **Structured Data:** Embeds JSON-LD `Organization` with `alternateName: ["ZAYRON", "ZERONX", "ZAYRON-X Intelligence"]`.

---

## SECTION B — MANDATORY OPERATING RULES FOR ANY AI AGENT ON THIS PROJECT

1. EVIDENCE SOVEREIGNTY: No success claim ("works", "verified", "production ready") without raw, unedited execution output attached in the same message.
2. SCRIPT DISCIPLINE: No throwaway scripts. Any verification script must be saved permanently under `/scripts/verification/`, versioned, with full source code shown before execution and full raw stdout/stderr shown after. Prefer direct CLI commands (curl, wrangler, sqlite3) over wrapper scripts whenever possible.
3. ZERO SELF-PRAISE: No congratulatory, marketing, or emotionally positive language about the system's own quality. State facts only: what ran, what returned, whether it matches the required specification.
4. MANDATORY 3-STATE CLASSIFICATION: Every checked item is VERIFIED, UNVERIFIED, or FAILED. No intermediate labels ("partially", "hybrid active", "mostly working").
5. SEGREGATION OF DUTIES: The session/agent that implemented a change may not issue the final verdict on its own success. Final verification requires a separate session with no prior context, acting adversarially.
6. FORMULA TRANSPARENCY: Every number or percentage must show numerator, denominator, and the exact command/query that produced each.
7. JUDGMENT CRITERIA DISCLOSURE: Before giving any qualitative verdict (e.g. "relevant", "high quality"), the exact evaluation criteria must be stated first.
8. CONTRADICTION RESOLUTION: Any internal contradiction between two claims must halt the response and be resolved explicitly before continuing.
9. LOCAL VS. LIVE DISTINCTION: Evidence from local machines, localhost, or cached data is not production evidence. Only live checks against the actual production domain and live Cloudflare account count.
10. SOURCE & CONFIDENCE DISCLOSURE: Any intelligence data point (IOC, actor, CVE) must carry source name, retrieval date, and a confidence rating based on an explicit, named methodology (e.g. Admiralty Scale).
11. ESCALATE, DON'T GUESS: On ambiguity or missing data, stop and state the ambiguity explicitly. Never fill gaps with plausible-sounding assumptions.
12. IMMUTABLE AUDIT TRAIL: Past reports and scripts are never deleted or silently edited. Updates are new entries referencing what they supersede and why.
13. MANDATORY DECLARATION: Every response involving verification or implementation must begin with the literal line: "Compliance: Governed by .agents/GOVERNANCE.md — Articles [list relevant article numbers]." A response missing this line is invalid and must be redone.
14. SCOPE BOUNDARY & PRE-NOTIFICATION: Any file modification outside the explicit scope of the current user task is strictly prohibited without prior disclosure. If an unexpected modification is required to unblock a task (e.g. resolving a blocking compilation error or dependency failure), the exact file path and technical rationale must be explicitly disclosed BEFORE the modification is made.
