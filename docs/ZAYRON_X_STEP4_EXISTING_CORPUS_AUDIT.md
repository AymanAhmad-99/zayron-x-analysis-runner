# Z.X.INTELLIGENCE — STEP 4 EXISTING 17-DOCUMENT CORPUS AUDIT
**DATE:** 2026-09-05  
**CLASSIFICATION:** REUSABLE AUDIT & CLASSIFICATION REPORT  
**CORRESPONDING ARTIFACT:** `validation/step4_existing_corpus_audit.json`  
**REFERENCE STANDARD:** Step 3 Universal Book Ingestion Standard (`v2.1.0`)

---

## 1. OBJECTIVE & AUDIT SCOPE

This audit rigorously evaluates all 17 existing canonical documents currently catalogued in `corpus_manifest.json` and `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson` against the Step 3 Universal Book Ingestion Standard.

Each document is classified into one of four deterministic operational states:
- **KEEP**: Already high quality, semantically coherent, well-bounded, 100% indexed in Vectorize and D1.
- **REPROCESS**: Existing source is valid, but current chunking is monolithic, over-fragmented, or missing from Vectorize (0% indexed).
- **INVESTIGATE**: Duplicate alias colliding with another numbered canonical document pointing to the same source.
- **BLOCKED**: Source file missing or permanently corrupt (0 documents blocked).

---

## 2. CORPUS AUDIT SUMMARY TABLE

| Document | Extraction | Chunking | Metadata | D1 | Vectorize | Citation | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **doc-nist-800-150** | PASS | PASS | PARTIAL | PASS | PASS | PASS | **INVESTIGATE** |
| **doc-nist-800-86** | PASS | PASS | PARTIAL | PASS | PASS | PASS | **INVESTIGATE** |
| **doc-cisa-kev** | PASS | PASS | PASS | PASS | PASS | PASS | **KEEP** |
| **doc-01-heuer-psychology** | PASS | PASS | PARTIAL | PASS | PASS | PASS | **KEEP** |
| **doc-03-nist-sp-800-150** | PASS | PASS | PARTIAL | PASS | PASS | PASS | **KEEP** |
| **doc-04-nist-sp-800-86** | PASS | PARTIAL | PARTIAL | PASS | PASS | PASS | **REPROCESS** |
| **doc-05-nist-sp-800-61r3** | PASS | PASS | PARTIAL | PASS | PASS | PASS | **KEEP** |
| **doc-06-nist-csf-2** | PASS | PASS | PARTIAL | PASS | PASS | PASS | **KEEP** |
| **doc-07-first-cvss4** | PASS | FAIL | FAIL | PASS | PASS | PARTIAL | **REPROCESS** |
| **doc-08-first-epss** | PASS | FAIL | FAIL | PASS | PASS | PARTIAL | **REPROCESS** |
| **doc-09-mitre-attack** | PASS | FAIL | PARTIAL | PASS | PASS | PASS | **REPROCESS** |
| **doc-10-oasis-stix21** | PASS | PARTIAL | PARTIAL | PASS | FAIL | PASS | **REPROCESS** |
| **doc-11-oasis-taxii21** | PASS | PARTIAL | PARTIAL | PASS | FAIL | PASS | **REPROCESS** |
| **doc-12-nist-ai-rmf** | PASS | PARTIAL | PARTIAL | PASS | FAIL | PASS | **REPROCESS** |
| **doc-13-nist-genai-profile** | PASS | PARTIAL | PARTIAL | PASS | FAIL | PASS | **REPROCESS** |
| **doc-14-nist-sp-800-53** | PASS | PARTIAL | PARTIAL | PASS | FAIL | PASS | **REPROCESS** |
| **doc-15-owasp-top10** | PASS | FAIL | FAIL | PASS | PASS | PARTIAL | **REPROCESS** |

---

## 3. DETAILED DOCUMENT ANALYSIS & FINDINGS

### A. The KEEP Documents (5 Documents)
These documents represent clean, functional knowledge assets that meet the retrieval standard and should remain in production without disruption:
1. **`doc-cisa-kev`** (1,685 chunks, avg 770 chars): Granular structured JSON entries for known exploited vulnerabilities. 100% indexed, valid schema, no oversized chunks.
2. **`doc-01-heuer-psychology`** (1,014 chunks, avg 420 chars): Well-bounded paragraph chunks from Heuer's *Psychology of Intelligence Analysis*. 100% indexed.
3. **`doc-03-nist-sp-800-150`** (210 chunks, avg 483 chars): NIST threat information sharing standard. Coherent size distribution, 100% indexed.
4. **`doc-05-nist-sp-800-61r3`** (322 chunks, avg 304 chars): NIST Computer Security Incident Handling Guide. 100% indexed, reliable retrieval.
5. **`doc-06-nist-csf-2`** (157 chunks, avg 424 chars): NIST Cybersecurity Framework 2.0. Clean boundaries, 100% indexed.

### B. The INVESTIGATE Documents (2 Documents)
1. **`doc-nist-800-150`** (105 chunks): Identical source PDF as `doc-03-nist-sp-800-150` (210 chunks). Both exist in D1 and Vectorize.
   - *Recommendation*: Investigate whether downstream workflows query `doc-nist-800-150` or `doc-03-nist-sp-800-150` to deprecate the duplicate row set safely.
2. **`doc-nist-800-86`** (224 chunks): Identical source PDF as `doc-04-nist-sp-800-86` (1,846 chunks).
   - *Recommendation*: Investigate and consolidate into a single clean canonical document ID.

### C. The REPROCESS Documents (10 Documents)
These documents must be reprocessed through the Step 3 Universal Pipeline:

#### Group 1: Monolithic Single Chunks (3 Documents)
- **`doc-07-first-cvss4`**: 1 single chunk of 81,385 characters contaminated with FIRST website front-matter. Step 3 proved it chunks cleanly into 106 section-aware units.
- **`doc-08-first-epss`**: 1 single chunk of 8,678 characters. Needs semantic section chunking.
- **`doc-15-owasp-top10`**: 1 single chunk of 24,141 characters. Needs splitting into discrete API risk chunks.

#### Group 2: Massive Oversized Chunks (1 Document)
- **`doc-09-mitre-attack`**: 26,086 chunks, but contains single raw JSON chunks reaching **3,069,114 characters**. Requires structured technique-by-technique chunking.

#### Group 3: Over-Fragmented Chunks (1 Document)
- **`doc-04-nist-sp-800-86`**: 1,846 tiny chunks with an average size of only 171 characters. Too fragmented for coherent context.

#### Group 4: Unindexed Standards (5 Documents)
These documents are in D1 and canonical NDJSON, but have **0 vectors in Vectorize (0% indexed)**:
- **`doc-10-oasis-stix21`** (331 chunks)
- **`doc-11-oasis-taxii21`** (512 chunks)
- **`doc-12-nist-ai-rmf`** (48 chunks)
- **`doc-13-nist-genai-profile`** (501 chunks)
- **`doc-14-nist-sp-800-53`** (3,919 chunks)

---

## 4. PROVEN, FAILED, UNKNOWN

### PROVEN
1. All 17 canonical document source files physically exist on disk in `.zayron/knowledge/physical-15/` (0 blocked).
2. Exactly 5 documents meet high-quality operational standards and are designated **KEEP**.
3. Exactly 10 documents exhibit structural chunking defects (monolithic blobs, 3MB oversized chunks, over-fragmentation) or have 0% vector indexing and are designated **REPROCESS**.
4. Exactly 2 documents are redundant aliases colliding with numbered counterparts and are designated **INVESTIGATE**.
5. No production data was modified during this audit step.

### FAILED
- None in the audit execution.

### UNKNOWN
- Whether external API callers or frontend search interfaces currently issue explicit queries targeting the un-prefixed IDs (`doc-nist-800-150` / `doc-nist-800-86`) instead of the numbered IDs (`doc-03` / `doc-04`).

---

## 5. REPROCESS QUEUE (Prioritized Order)

1. **`doc-07-first-cvss4`** (P0): Eliminate 81KB monolithic chunk; replace with 106 section-aware chunks.
2. **`doc-08-first-epss`** (P0): Eliminate 8.6KB monolithic chunk; parse into discrete probability and percentile metric sections.
3. **`doc-15-owasp-top10`** (P0): Eliminate 24KB monolithic chunk; chunk into individual API risk categories (API1:2023 through API10:2023).
4. **`doc-10-oasis-stix21`** (P1): Process through PDF pipeline; index into Vectorize (currently 0%).
5. **`doc-11-oasis-taxii21`** (P1): Process through PDF pipeline; index into Vectorize (currently 0%).
6. **`doc-12-nist-ai-rmf`** (P1): Process through PDF pipeline; index into Vectorize (currently 0%).
7. **`doc-13-nist-genai-profile`** (P1): Process through PDF pipeline; index into Vectorize (currently 0%).
8. **`doc-14-nist-sp-800-53`** (P1): Process through PDF pipeline; index into Vectorize (currently 0%).
9. **`doc-04-nist-sp-800-86`** (P2): Consolidate over-fragmented 171-char chunks into coherent section-based chunks.
10. **`doc-09-mitre-attack`** (P2): Re-chunk structured Enterprise ATT&CK matrix; eliminate 3MB raw JSON dumps and ensure 100% Vectorize indexing.
