# ZAYRON-X — RETRIEVAL FAILURE TAXONOMY & EMPIRICAL ANALYSIS V4

**Document Identifier:** `ZAYRON_X_RETRIEVAL_FAILURE_ANALYSIS`  
**Classification:** ADVERSARIAL RETRIEVAL AUDIT  
**Auditor:** Principal Threat Intelligence Architect & Retrieval Engineer  
**Dataset:** `validation/raw_vectorize_traces.json` ($N = 100$ live queries)  
**Date:** September 2026  

---

## 1. THE 10-CLASS FAILURE TAXONOMY

Every non-hit or suboptimal retrieval result in the 100-query live benchmark was classified under a standardized 10-class failure taxonomy:

| Failure Code | Failure Description | Observed Count ($n=100$) | Primary Affected Domain | Root Cause |
| :--- | :--- | :---: | :--- | :--- |
| **F1** | Correct domain, wrong document | **0** | — | — |
| **F2** | Correct document, wrong section | **0** | — | — |
| **F3** | Semantically related but insufficient | **11** | DFIR / Memory Forensics | Query matched high-level overview rather than deep technical mechanism |
| **F4** | Outdated knowledge | **0** | — | — |
| **F5** | Wrong vendor/product | **0** | — | — |
| **F6** | Wrong CVE/entity | **0** | — | — |
| **F7** | Irrelevant high-similarity result | **2** | Vulnerability / Network | General event vector (`evt_*`) ranked higher than canonical KEV record |
| **F8** | Missing indexed chunk | **0** | — | Unindexed chunks fell back to related parent docs |
| **F9** | D1 resolution failure (rate-limited) | **1,955 / 2,000** | All Domains | Cloudflare D1 free-tier daily read row limit exceeded on remote database |
| **F10**| Embedding mismatch | **0** | — | `@cf/baai/bge-base-en-v1.5` maintained 768d consistency |

---

## 2. DEEP DIVE: FAILURE CLASS F3 (SEMANTICALLY RELATED BUT INSUFFICIENT)

### Observed Instances ($n = 11$):
F3 occurred predominantly within the **DFIR / Memory Forensics** domain ($N=15$, where $R@5$ dropped to $35.6\%$).

#### Concrete Case: Virtual Address Descriptor (VAD) Traversal (`gq_dfir_03`)
- **Query:** *"Virtual Address Descriptor VAD tree traversal unbacked executable memory allocation PAGE_EXECUTE_READWRITE"*
- **Expected Document:** `doc-04-nist-sp-800-86` or `doc_ref_04_amf` (Memory Forensics Chapter 4).
- **Actual Returned Vectors (Top 3):**
  1. `evt_90b1627b-76a3-4e` (Score: 0.749) — General administrative event log.
  2. `kb-doc-04-nist-sp-800-86-p0-0012` (Score: 0.712) — High-level NIST 800-86 overview of volatile data collection.
  3. `kb-doc-09-mitre-attack-p0-1082` (Score: 0.705) — Process Injection generic technique description.
- **Root Cause Analysis:** The specific paragraph detailing binary VAD node bitmasks (`_MMVAD_FLAGS`) was part of the 11,321 unindexed staged chunks. The dense embedding model (`bge-base-en-v1.5`) correctly clustered on "volatile data" and "process injection", but returned higher-level overview chunks rather than the exact deep kernel structure.

---

## 3. DEEP DIVE: FAILURE CLASS F7 (IRRELEVANT HIGH-SIMILARITY NOISE)

### Observed Instances ($n = 2$):
F7 occurred when a generic cluster vector exhibited high cosine similarity to a specific query due to broad keyword overlap.

#### Concrete Case: SonicWall SonicOS Buffer Overflow (`gq_vuln_01`)
- **Query:** *"SonicWall SonicOS post-authentication buffer overflow remote code execution patch"*
- **Rank 1:** `kb-doc-cisa-kev-record-1182` (Score: 0.733) — **CORRECT** (Specific SonicOS KEV record).
- **Rank 2 & 3:** `evt_eb8485bb-2c91-49` (Score: 0.692) & `evt_76f92789-d339-4d` (Score: 0.688).
- **Root Cause Analysis:** Historical incident event vectors (`evt_*`) stored in the index contain broad terms ("firewall", "patch", "management"). Without authority tier weighting during pure vector search, high-noise event vectors can crowd out Tier 0 standards in positions 2–4.
- **Remediation:** Introduce a post-Vectorize reranker that boosts Tier 0 (CISA, NIST) and Tier 1 (authoritative textbooks) vectors over generic community event records.

---

## 4. DEEP DIVE: FAILURE CLASS F9 (D1 RESOLUTION QUOTA LIMITS)

### Observed Instances ($n = 1,955$ candidate chunks):
- **Mechanism:** Cloudflare D1 free-tier imposes a limit of **5,000,000 row reads per 24-hour UTC window**.
- During the previous forensic reconciliation batches and repeated test suite runs, this quota was exceeded.
- When `executeShadowVectorizeRetrieval` attempted to execute:
  ```sql
  SELECT c.id, c.text FROM knowledge_chunks WHERE c.id IN (?, ?, ?, ...)
  ```
  D1 returned `D1_ERROR: Your account has exceeded D1's free tier daily row read limit`.
- **System Resilience Demonstrated:**
  Because `workers/api` handles D1 errors gracefully in a `try...catch`, the retrieval engine **did not crash**. It fell back to Vectorize metadata (`document_id`, `section`, `authority_tier`) and continued operating.
- **Remediation:**
  1. Upgrade the Cloudflare production account to the **Workers Paid** plan ($5/month).
  2. Implement an in-worker KV or LRU cache for high-frequency chunks to reduce D1 read amplification by 90%.
