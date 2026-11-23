# Z.X.INTELLIGENCE — STEP 1 CURRENT SYSTEM TRUTH AUDIT
**AUDIT DATE:** 2026-09-05  
**CLASSIFICATION:** INTERNAL AUDIT — GROUND TRUTH DISCOVERY  
**CORRESPONDING ARTIFACT:** `validation/step1_current_state.json`

---

## EXECUTIVE SUMMARY

This audit determines the exact, unvarnished state of the existing Z.X.Intelligence platform across 10 defined functional areas, focusing specifically on the canonical corpus, book ingestion pipeline, vector retrieval, and grounding infrastructure.

---

## A. VERIFIED

1. **Canonical Corpus Chunks on Disk**:
   - Exactly **17 unique `document_id` entries** containing **36,963 chunks** exist in `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson`.
   - Redundancy exists across document IDs: `doc-nist-800-150` (105 chunks) duplicates `doc-03-nist-sp-800-150` (210 chunks); `doc-nist-800-86` (224 chunks) duplicates `doc-04-nist-sp-800-86` (1,846 chunks).
   - Three documents exist as single monolithic chunks:
     - `doc-07-first-cvss4`: 1 chunk of **81,385 characters**
     - `doc-08-first-epss`: 1 chunk of **8,678 characters**
     - `doc-15-owasp-top10`: 1 chunk of **24,141 characters**
   - One document dominates the corpus: `doc-09-mitre-attack` comprises **26,086 chunks** (70.6% of all chunks), with individual chunk sizes reaching up to 3,069,114 characters.

2. **Corpus Manifest**:
   - `corpus_manifest.json` exists in the repository root (Schema v1.0.0, updated `2026-09-04T17:52:00.000Z`).
   - Catalogues 17 documents with domain classifications and authority tiers.
   - However, the manifest states `ingestion_status: "INDEXED"` for all 17 documents, which is empirically false.

3. **D1 Knowledge Storage**:
   - Database `zayron-x-db` (ID: `c19c8f45-801b-4034-bd76-402e5e5389b5`) holds the `knowledge_chunks` table.
   - 36,808 rows are recorded in D1 (155 fewer than the 36,963 in the canonical NDJSON).
   - 239 legacy duplicate and test rows were verified cleaned from D1 in prior maintenance.

4. **Vectorize Searchability Per Document**:
   - Total vectors in `zayron-knowledge-index`: **25,682 vectors** (768 dimensions, cosine similarity).
   - True canonical coverage: **18,514 / 36,963 (50.09%)**.
   - Exactly **10 documents are 100% indexed in Vectorize**:
     - `doc-nist-800-150` (105 / 105)
     - `doc-nist-800-86` (224 / 224)
     - `doc-cisa-kev` (1,685 / 1,685)
     - `doc-01-heuer-psychology` (1,014 / 1,014)
     - `doc-03-nist-sp-800-150` (210 / 210)
     - `doc-04-nist-sp-800-86` (1,846 / 1,846)
     - `doc-05-nist-sp-800-61r3` (322 / 322)
     - `doc-06-nist-csf-2` (157 / 157)
     - `doc-07-first-cvss4` (1 / 1)
     - `doc-08-first-epss` (1 / 1)
   - Exactly **1 document is partially indexed**:
     - `doc-09-mitre-attack` (12,949 / 26,086 = 49.6%)
   - Exactly **6 documents have 0 vectors in Vectorize (0% indexed)**:
     - `doc-10-oasis-stix21` (0 / 331)
     - `doc-11-oasis-taxii21` (0 / 512)
     - `doc-12-nist-ai-rmf` (0 / 48)
     - `doc-13-nist-genai-profile` (0 / 501)
     - `doc-14-nist-sp-800-53` (0 / 3,919)
     - `doc-15-owasp-top10` (0 / 1)

5. **Retrieval Implementation**:
   - `packages/intelligence/src/engine_v2/shadow_vectorize.ts` contains `executeShadowVectorizeRetrieval()`.
   - Embeds incoming queries via `@cf/baai/bge-base-en-v1.5` (768d), queries Vectorize, overfetches by 2x for precondition filtering, and resolves full text via a 5-tier resolution ladder (D1 -> LRU Cache -> Canonical NDJSON Map -> Metadata -> FAILED).

6. **Citation Grounding & Quality Gate**:
   - `packages/intelligence/src/engine_v2/claims.ts` and `packages/intelligence/src/engine_v2/quality_gate.ts` enforce verbatim chunk text matching.
   - Stage 3 Hard Gate rejects non-verbatim claims and actively filters FIRST administrative boilerplate via `BOILERPLATE_PATTERNS`.
   - Real corpus evaluation on 23 cases passes with 100% verbatim fidelity, 0 fallbacks, and a realistic technical distribution across Attack Vectors and Severity scales.

7. **Entity & Report Schema**:
   - `packages/intelligence/src/engine_v2/types.ts` defines `CanonicalReportV2` with 18 structured sections, epistemic claim graphs, provenance tiers, and contradiction tracking.

8. **Test Suite Baseline**:
   - 103 tests across 17 test suites; 101 tests pass.

---

## B. PARTIALLY VERIFIED

1. **Source Document Storage (`.zayron/knowledge/physical-15/`)**:
   - Physical directory contains 14 raw source files (8 PDFs, 3 HTML files, 1 JSON file, and processing metadata).
   - Some documents (e.g. CVSS v4, EPSS, OWASP Top 10) are raw web HTML scrapes rather than structured technical manuals, explaining why front-matter navigation was ingested into the single chunk.

2. **D1 Chunk Synchronization**:
   - D1 contains 36,808 chunks compared to 36,963 in the canonical NDJSON. A deficit of 155 chunks remains unverified as to whether they are synthetic test artifacts or omitted standard chunks.

---

## C. MISSING

1. **Gemini Integration**:
   - **There is NO active Gemini API or SDK integration in the repository.**
   - The production intelligence engine exclusively runs on Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct-fp8` for LLM inference and `@cf/baai/bge-base-en-v1.5` for embeddings).
   - Gemini appears only once as an external rate-limit documentation note in `.zayron/infra/isolated_pipeline_health.json`.

2. **Generic Book / Document Ingestion Engine**:
   - There is NO general ingestion pipeline that can ingest an arbitrary new book (PDF, Markdown, or HTML) without custom scripting.
   - `scripts/corpus_pipeline_ingest.ts` lacks a PDF parsing engine (uses `fs.readFileSync(filePath, "utf-8")`), which fails on binary PDFs.

3. **Semantic Section-Aware Chunking**:
   - Section headers, chapters, tables, and hierarchical metadata are not preserved in the chunking logic.
   - The system falls back to naive paragraph splitting (`\n\s*\n`) or single monolithic chunking (e.g. 81,385 chars in CVSS v4).

4. **Vectorize Index Completeness**:
   - 6 documents (STIX 2.1, TAXII 2.1, AI RMF 1.0, GenAI Profile, SP 800-53, OWASP Top 10) are completely absent from Vectorize (0% indexed).
   - 13,137 chunks of MITRE ATT&CK are unindexed.

---

## D. BROKEN

1. **Standalone Corpus Scale Ingestion (`tests/corpus_scale_test.test.ts`)**:
   - Fails 2/2 tests due to HTTP 401 Authentication Error during REST API upsert to Cloudflare Vectorize.
   - The OAuth/API token in `~/.wrangler/config/default.toml` is expired or unauthorized for standalone CLI execution.

2. **Corpus Manifest Ingestion Statuses**:
   - `corpus_manifest.json` claims `ingestion_status: "INDEXED"` for all 17 documents, despite 6 documents having 0 vectors in Vectorize.

3. **Chunking Fidelity for Key Standards**:
   - `doc-07-first-cvss4` (81,385 chars), `doc-08-first-epss` (8,678 chars), and `doc-15-owasp-top10` (24,141 chars) exist as single monolithic chunks rather than granular, section-grounded reference units.

---

## E. UNKNOWN

1. **Live D1 Query Latency Under Full Concurrency**:
   - Retrieval fallback from Vectorize to D1 via `IN (?, ?, ...)` handles batches of 5-10 chunks in local benchmarks, but D1 latency under real-time concurrent event ingestion on Cloudflare Edge is not benchmarked.

2. **Orphan Vector Semantics**:
   - 3,437 vectors in Vectorize are classified as "orphan event vectors" (vectors that do not map to canonical corpus document IDs). Their provenance and retention requirements remain unknown.

---

## F. BOOK PIPELINE EVALUATION

Current path for a book entering the system:

```
Book (PDF / HTML / JSON)
       ↓
Extraction   [FAIL]     (No PDF parser in ingest script; reads UTF-8 raw bytes; HTML unparsed)
       ↓
Chunking     [FAIL]     (Naive paragraph split or monolithic blob; no section/table preservation)
       ↓
D1 Storage   [PASS]     (SQL batch writer stores chunks reliably in knowledge_chunks)
       ↓
Embedding    [PASS]     (@cf/baai/bge-base-en-v1.5 generates 768d vectors via Workers AI)
       ↓
Vectorize    [PARTIAL]  (Upsert works in deployed workers, but fails with 401 in CLI scripts; 6 books unindexed)
       ↓
Retrieval    [PASS]     (shadow_vectorize.ts successfully queries 768d vectors & resolves D1 text)
       ↓
AI           [PASS]     (Workers AI Llama-3.1 consumes retrieved grounding context)
```

### Stage-by-Stage Status:
- **Book Source**: `PARTIAL` (Files exist in physical-15, but mix PDFs, raw HTML, and JSON)
- **Extraction**: `FAIL` (Cannot extract text from arbitrary PDFs; leaves raw HTML tags)
- **Chunking**: `FAIL` (Produces 81KB single chunks; destroys semantic table & chapter boundaries)
- **D1**: `PASS` (`knowledge_chunks` table schema is solid and stores 36,808 chunks)
- **Embedding**: `PASS` (BGE-base-en-v1.5 produces authentic 768d embeddings)
- **Vectorize**: `PARTIAL` (Only 50.09% of canonical corpus is indexed; 6 books have 0 vectors)
- **Retrieval**: `PASS` (Robust 5-tier resolution and precondition filtering)
- **AI**: `PASS` (Workers AI integration operates cleanly in production)

### Pipeline Answers to Mandatory Questions:
1. **Can the current pipeline ingest a NEW book without writing a custom script?**  
   **NO.** There is no automated CLI/pipeline command that accepts a new PDF/EPUB book, extracts its text, chunks it semantically, embeds it, and indexes it into D1/Vectorize without custom code.
2. **Does the current chunking system preserve meaningful sections?**  
   **NO.** Sections are largely empty strings or generic document titles; monolithic chunks collapse entire specifications into a single row.

---

## G. FINAL STATUS

### **FOUNDATION PARTIAL**

**Rationale:**  
The runtime retrieval engine (`shadow_vectorize.ts`), D1 schema, and citation verification quality gate (`quality_gate.ts` Stage 3) are solidly built, verified, and passing on real data. However, the upstream **Book Ingestion Pipeline is broken/incomplete**:
- 6 of the 17 canonical documents have **zero vectors** in Vectorize.
- Key standards like CVSS v4 are collapsed into monolithic 81KB blobs.
- No general PDF extraction or section-aware chunking engine exists.
- Standalone CLI Vectorize upsert fails due to expired OAuth credentials.
- No Gemini integration exists in the codebase (the system currently uses Cloudflare Workers AI Llama-3.1).
