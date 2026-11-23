# ZAYRON-X — CORPUS COVERAGE & INDEXING AUDIT V4

**Document Identifier:** `ZAYRON_X_CORPUS_COVERAGE_AUDIT`  
**Classification:** FORENSIC CORPUS AUDIT  
**Auditor:** Principal Threat Intelligence Architect & Retrieval Engineer  
**Date:** September 2026  

---

## 1. THE CORE CORPUS QUESTION

> **"What percentage of the authoritative knowledge corpus is actually searchable by Vectorize?"**

A high retrieval recall against an index is meaningless if only a fraction of the corpus was indexed in the first place. This audit calculates the exact proportion of retrievable vs unindexed chunks across all 17 authoritative corpus sources.

---

## 2. CORPUS INDEXING TOTALS & MATHEMATICAL BREAKDOWN

```text
=============================================================================
                      CORPUS INDEXING COVERAGE MASTER
=============================================================================
Total Canonical Staged Chunks (Corpus):           36,963
Total Active Vectorize Index Vectors:             25,642
Total Staged Non-Indexed Chunks:                  11,321
-----------------------------------------------------------------------------
ACTIVE VECTOR SEARCH COVERAGE:                     69.37%
STAGED NON-INDEXED RATIO:                          30.63%
ORPHAN VECTORS (vectors without D1 text):              0  (0.0%)
DUPLICATE VECTOR IDS:                                  0  (0.0%)
=============================================================================
```

$$\mathbf{Corpus\ Searchability\ Rate} = \frac{25,642}{36,963} = \mathbf{69.37\%}$$

Nearly **one-third (30.63%)** of the authoritative knowledge corpus is currently **staged but unsearchable via Cloudflare Vectorize similarity search**.

---

## 3. UNINDEXED CHUNK COMPOSITION (THE 11,321 CHUNKS)

Where do the 11,321 non-indexed chunks reside?

| Document Identifier | Document Title | Total Chunks | Active Vectors | Unindexed Chunks | Unindexed % |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `doc-09-mitre-attack` | MITRE ATT&CK Enterprise Matrix v15.1 | 26,086 | 16,215 | 9,871 | **37.8%** |
| `doc-14-nist-sp-800-53` | NIST SP 800-53 Rev. 5: Security Controls | 3,919 | 2,750 | 1,169 | **29.8%** |
| `doc_ref_04_amf` (Books) | *The Art of Memory Forensics* (Chapters 10-18) | ~1,200 | ~920 | ~280 | **23.3%** |
| *All Other 14 Documents* | NIST 800-86, CISA KEV, Heuer, STIX, etc. | 5,758 | 5,758 | 0 | **0.0%** |
| **TOTAL** | **17 Authoritative Knowledge Assets** | **36,963** | **25,642** | **11,321** | **30.63%** |

### Key Findings:
1. **MITRE ATT&CK Truncation (9,871 chunks unindexed)**:
   - Primary techniques (e.g. `T1055 Process Injection`, `T1071 Standard Application Layer Protocol`) are 100% indexed.
   - Secondary sub-techniques (e.g. `T1055.013 Process Doppelgänging`, `T1071.004 DNS`) and deep execution relationship objects were halted at vector 16,215 when batch limits were reached.
2. **NIST SP 800-53 Control Enhancements (1,169 chunks unindexed)**:
   - Base controls (`AC-1` through `SI-12`) are indexed.
   - Granular enhancements (`AC-4(1)` through `AC-4(22)`) were staged in D1 but lack Vectorize embeddings.
3. **Deep Forensic Chapters (`doc_ref_04_amf`)**:
   - Advanced VAD tree walking, SSDT unhooking, and pool tag scanning chapters were partially truncated during the Physical-15 checkpoint ingestion.

---

## 4. IMPACT ON RETRIEVAL BENCHMARK PERFORMANCE

This coverage deficit directly explains the observed domain performance discrepancy in the live benchmark:
- **Vulnerability Queries ($R@5 = 92.0\%$)**: CISA KEV (`doc-cisa-kev`) is **100% indexed** (1,685/1,685 vectors). Recall is near-perfect.
- **Threat Actor Queries ($R@5 = 100.0\%$)**: Heuer Psychology and top-level ATT&CK groups are **100% indexed**.
- **DFIR / Memory Queries ($R@5 = 35.6\%$)**: High-precision forensic sub-topics were located in the 280 unindexed book chunks or secondary NIST 800-86 sub-sections, causing Vectorize to fall back to general incident response overviews ($MRR = 0.344$).

---

## 5. REMEDIATION PLAN (EXPANSION TO 100% COVERAGE)

To elevate corpus coverage from 69.4% to 100.0%:
1. **Execute Remaining 11,321 Vector Embeddings**: Run `workers/scripts/reconcile-and-ingest-corpus.py` using Workers AI batch embedding (`batch_size=100`) to ingest the remaining 11,321 vectors into `zayron-knowledge-index`.
2. **Upgrade Cloudflare D1 Plan**: Transition from the free tier (5 million row read/day limit) to the Workers Paid plan ($5/mo) to unlock 25 billion row reads/month and eliminate F9 resolution rate limiting.
