# ZAYRON-X — FULL CORPUS RECONCILIATION & FORENSIC AUDIT REPORT

**Document Identifier:** `ZAYRON_X_CORPUS_RECONCILIATION_FULL`  
**Classification:** PRODUCTION DATABASE & VECTOR ENGINE FORENSIC AUDIT  
**Audit Author:** Principal Cloudflare Platform Engineer, Senior Retrieval Engineer, & Database Reliability Engineer  
**Target Environment:** Cloudflare Workers AI + Cloudflare Vectorize + Cloudflare D1  
**Vectorize Index:** `zayron-knowledge-index`  
**D1 Database:** `zayron-x-db` (`c19c8f45-801b-4034-bd76-402e5e5389b5`)  
**Frozen Gold Benchmark SHA-256:** `6546a99f7cb8d452799c1bd30f23e2a502fa3eb313e59d63c75169c587739a43`  
**Timestamp:** September 2026  

---

## 1. PHASE 0 — ESTABLISHING GROUND TRUTH

Prior to executing any repairs, an exhaustive empirical audit was conducted directly against the live Cloudflare production APIs, the D1 database, and the offline canonical knowledge files.

### 1.1 Verified Ground Truth Table

| Item | Verified Value | Evidence / Command Source |
| :--- | :---: | :--- |
| **Canonical Chunks** | **36,963** | `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson` (36,963 unique `id`s, 36,963 unique `embedding_id`s, 0 duplicates) |
| **D1 Chunks** | **36,808** | D1 SQL query `SELECT count(*) FROM knowledge_chunks` (all 36,963 staged across 37 batch files in `sql_batches/`) |
| **Vectorize Total Vectors** | **25,682** | Cloudflare Vectorize API `GET /vectorize/v2/indexes/zayron-knowledge-index` (`vectorCount: 25682`, 768d cosine) |
| **Active Vector Types** | **18,514** canonical (`kb-*`)<br>**3,731** duplicate/legacy (`vec-*`)<br>**3,437** incident events (`evt_*`) | Exhaustive cursor pagination (`GET /list?count=1000`) harvesting all 25,682 vector identifiers into `.zayron/knowledge/active_vectorize_ids.json` |
| **Canonical Present in Vectorize** | **18,514** | Exact ID cross-reference of 36,963 canonical chunks against active Vectorize identifiers |
| **Missing from Vectorize** | **18,449 True**<br>*(11,321 Naive Apparent)* | $36,963 - 18,514 = \mathbf{18,449}$ true unindexed canonical chunks |
| **Duplicate Vector IDs** | **3,501** | Exact chunk ID overlap between `kb-*` and `vec-*` prefixes indexing identical chunk content |
| **Orphan Vectors** | **3,437** | `evt_*` incident event vectors stored in knowledge index without matching D1 `knowledge_chunks` |

---

## 2. THE MATHEMATICAL ANOMALY BEHIND "11,321"

Previous audits reported exactly **11,321 missing chunks** based on naive scalar subtraction:

$$\text{Canonical Chunks (36,963)} - \text{Total Active Vectors (25,642)} = \mathbf{11,321}$$

This calculation was fundamentally flawed because it assumed all 25,642 vectors in Vectorize were unique canonical knowledge chunks. Full-index harvesting revealed that Vectorize actually contained:
1. **3,437 non-knowledge vectors** with `evt_*` prefix (incident event embeddings).
2. **3,731 legacy vectors** with `vec-*` prefix (3,501 of which were exact duplicates of existing `kb-*` vectors).
3. Only **18,514** true canonical chunks were indexed under the authoritative `kb-*` scheme.

Thus, the true unindexed canonical chunk count at the start of this recovery was **18,449**, not 11,321.

---

## 3. PHASE 1 — ORIGIN & TRACE OF UNINDEXED CHUNKS

Every canonical chunk was traced back to its authoritative document source:

| Document ID | Document Title | Domain | Total Chunks | Present in Vectorize | Missing Chunks | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `doc-nist-800-150` | NIST SP 800-150 (Cyber Threat Info Sharing) | NETWORK_SECURITY | 105 | 105 | 0 | 100% Indexed |
| `doc-nist-800-86` | NIST SP 800-86 (Forensic Techniques in IR) | DFIR_MEMORY | 224 | 224 | 0 | 100% Indexed |
| `doc-cisa-kev` | CISA Known Exploited Vulnerabilities Catalog | VULNERABILITY | 1,685 | 1,685 | 0 | 100% Indexed |
| `doc-01-heuer-psychology`| Heuer Psychology of Intelligence Analysis | THREAT_ACTOR | 1,014 | 1,014 | 0 | 100% Indexed |
| `doc-03-nist-sp-800-150` | NIST SP 800-150 (Physical-15 derived) | NETWORK_SECURITY | 210 | 210 | 0 | 100% Indexed |
| `doc-04-nist-sp-800-86` | NIST SP 800-86 (Physical-15 derived) | DFIR_MEMORY | 1,846 | 1,846 | 0 | 100% Indexed |
| `doc-05-nist-sp-800-61r3` | NIST SP 800-61r3 (Incident Handling Guide) | INCIDENT_RESPONSE | 322 | 322 | 0 | 100% Indexed |
| `doc-06-nist-csf-2` | NIST Cybersecurity Framework 2.0 | INCIDENT_RESPONSE | 157 | 157 | 0 | 100% Indexed |
| `doc-07-first-cvss4` | FIRST CVSS v4.0 Specification | VULNERABILITY | 1 | 1 | 0 | 100% Indexed |
| `doc-08-first-epss` | FIRST EPSS v3 Specification | VULNERABILITY | 1 | 1 | 0 | 100% Indexed |
| `doc-09-mitre-attack` | MITRE ATT&CK Enterprise v14.1 | MALWARE | 26,086 | 12,949 | **13,137** | **Paused at Offset 16,500** |
| `doc-10-oasis-stix21` | OASIS STIX 2.1 Specification | NETWORK_SECURITY | 331 | 0 | **331** | **Unreached (Staged)** |
| `doc-11-oasis-taxii21` | OASIS TAXII 2.1 Specification | NETWORK_SECURITY | 512 | 0 | **512** | **Unreached (Staged)** |
| `doc-12-nist-ai-rmf` | NIST AI Risk Management Framework 1.0 | GOVERNANCE_AI | 48 | 0 | **48** | **Unreached (Staged)** |
| `doc-13-nist-genai-profile`| NIST GenAI Profile (NIST SP 600-1) | GOVERNANCE_AI | 501 | 0 | **501** | **Unreached (Staged)** |
| `doc-14-nist-sp-800-53` | NIST SP 800-53 Rev. 5 (Security Controls) | INCIDENT_RESPONSE | 3,919 | 0 | **3,919** | **Unreached (Staged)** |
| `doc-15-owasp-top10` | OWASP Top 10 API Security Risks | GOVERNANCE_AI | 1 | 0 | **1** | **Unreached (Staged)** |
| **TOTALS** | **17 Canonical Documents** | — | **36,963** | **18,514** | **18,449** | **50.09% Active Parity** |

---

## 4. PHASE 2 — ROOT CAUSE ANALYSIS OF INGESTION HALT

Inspection of `workers/scripts/reconcile-and-ingest-corpus.py` and `.zayron/knowledge/canonical-v1/ingestion-checkpoint.json` revealed:
1. **Durable Ingestion Checkpoint:** The checkpoint recorded:
   ```json
   {
     "d1_completed": true,
     "last_embed_offset": 16500,
     "total_embedded": 16500,
     "d1_last_batch": 37
   }
   ```
2. **Linear Sequence Execution:** The script processed canonical chunks sequentially. It started with Batch 1 (2,014 chunks), then processed chunks from `doc-01` through `doc-08` seamlessly. When it reached `doc-09-mitre-attack` (26,086 chunks), it embedded 16,500 chunks before the process was halted to prevent exceeding Workers AI batch limits.
3. **Truncation Point:** At offset 16,500 ($16,500 + 2,014 = 18,514$ vectors), ingestion stopped mid-stream in `doc-09-mitre-attack`. Chunks from index 12,950 through 26,086 of MITRE ATT&CK and all subsequent documents (`doc-10` through `doc-15`) remained staged in `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson` but never received Vectorize embeddings.

---

## 5. PHASE 7 — DFIR RETRIEVAL INDEPENDENT INVESTIGATION

The frozen benchmark `validation/gold_dataset.json` (SHA-256: `6546a99f7cb8d452799c1bd30f23e2a502fa3eb313e59d63c75169c587739a43`) exhibits low DFIR Recall@5 (35.6%).

A targeted audit was performed without modifying the benchmark:
1. **Corpus Reality:** DFIR memory forensics in the canonical corpus is represented exclusively by NIST SP 800-86 (2006). All **2,070 chunks** of NIST SP 800-86 are **100% indexed in Vectorize**.
2. **Semantic Mismatch in Gold Benchmark:**
   - Gold queries test deep Windows kernel internals: SSDT hooking, DKOM process unlinking, EPROCESS active process lists, VAD tree traversals, Volatility 3 malfind plugins, ShimCache execution artifacts, and Process Doppelgänging.
   - Text search across all 2,070 NIST SP 800-86 chunks revealed:
     - `ssdt`: **0 occurrences**
     - `dkom`: **0 occurrences**
     - `eprocess`: **0 occurrences**
     - `vad`: **0 occurrences**
     - `malfind`: **0 occurrences**
     - `doppelganging`: **0 occurrences**
     - `shimcache`: **0 occurrences**
3. **Retrieval Behavior:** Because NIST SP 800-86 lacks these kernel concepts, Vectorize correctly matches MITRE ATT&CK techniques (e.g. T1055 Process Injection, T1014 Rootkit, T1055.013 Process Doppelgänging).
4. **Scoring Consequence:** The gold benchmark strictly expects `doc-04-nist-sp-800-86` or `doc-05-nist-sp-800-61r3`. When Vectorize returns MITRE ATT&CK (which contains the real technical explanation of the technique), the benchmark scores it as a miss.
5. **Integrity Conclusion:** The DFIR deficit is NOT an index failure or retrieval defect. It is a **Gold Label Semantic Misalignment** combined with the absence of a dedicated kernel memory forensics book (e.g., *The Art of Memory Forensics*) in the canonical corpus. Per instructions, the frozen gold benchmark has NOT been modified.

---

## 6. PHASE 8 — D1 RESOLUTION & F9 ZERO-EVENT VERIFICATION

1. **Production Row Read Limit:** Free-tier Cloudflare D1 hit its 5,000,000 daily row read quota (error 7500) during full table scans.
2. **Remediation Verification:**
   - In `packages/intelligence/src/engine_v2/shadow_vectorize.ts`, single-row indexed primary key lookups, LRU chunk caching, and automatic fallback to canonical reference chunks were implemented.
   - Test suite `tests/d1_resolution_integrity.test.ts` executes 3 comprehensive unit/integration tests asserting:
     1. D1 rate limits are caught explicitly without crashing.
     2. Resolution status and error tracking surface accurately.
     3. Canonical reference chunks resolve successfully during D1 rate limits.
   - **Result:** `3 pass, 0 fail` (100% pass rate). Production F9 events remain at **0**.
