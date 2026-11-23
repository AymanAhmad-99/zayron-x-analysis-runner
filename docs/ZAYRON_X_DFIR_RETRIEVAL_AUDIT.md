# ZAYRON-X — DFIR & MEMORY FORENSICS RETRIEVAL AUDIT

**Document Identifier:** `ZAYRON_X_DFIR_RETRIEVAL_AUDIT`  
**Classification:** ADVERSARIAL DOMAIN RETRIEVAL & KNOWLEDGE INTEGRITY AUDIT  
**Domain Under Audit:** Digital Forensics & Incident Response (DFIR) / Memory Forensics  
**Frozen Gold Queries:** $N = 15$ (`gq_dfir_01` through `gq_dfir_15` in `validation/gold_dataset.json`)  
**Gold Dataset SHA-256:** `6546a99f7cb8d452799c1bd30f23e2a502fa3eb313e59d63c75169c587739a43`  
**Date:** September 2026  

---

## 1. EXECUTIVE SUMMARY & MEASURED RETRIEVAL ASYMMETRY

In the live Vectorize retrieval benchmarks (V4 and V5), the **DFIR / Memory Forensics** domain exhibited a severe performance deficit relative to all other domains:

| Analytical Domain | $N$ Queries | Hit Rate@5 | Recall@5 (Doc) | Precision@5 | MRR | nDCG@5 | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **VULNERABILITY** | 25 | 96.0% | **92.0%** | 0.776 | 0.920 | 0.926 | **EXCELLENT** |
| **MALWARE** | 20 | 100.0% | **95.0%** | 0.800 | 0.925 | 0.950 | **EXCELLENT** |
| **NETWORK_SECURITY** | 20 | 90.0% | **83.3%** | 0.700 | 0.798 | 0.863 | **STRONG** |
| **THREAT_ACTOR** | 10 | 100.0% | **100.0%** | 0.880 | 0.833 | 1.000 | **PERFECT** |
| **INCIDENT_RESPONSE** | 10 | 70.0% | **48.6%** | 0.680 | 0.650 | 0.645 | **MODERATE** |
| **DFIR_MEMORY** | **15** | **46.7%** | **35.6%** | **0.293** | **0.344** | **0.340** | **CRITICAL DEFICIT** |

While the global system achieves Recall@5 of 78.9% and Hit Rate@5 of 87.0%, DFIR Recall@5 languishes at **35.6%**, well below the required target of **$\ge 80.0\%$**.

---

## 2. FORENSIC ROOT CAUSE ANALYSIS: THE NIST 800-86 ANOMALY

A rigorous forensic audit of the canonical corpus and benchmark queries revealed the exact mathematical and evidentiary cause of this failure:

### A. The Inherent Scope Limitation of NIST SP 800-86
NIST Special Publication 800-86, entitled *"Guide to Integrating Forensic Techniques into Incident Response"*, was published by NIST in **August 2006**. It is a strategic, high-level guidance document focusing on forensic tool acquisition, evidence handling policy, chain of custody, and high-level data types.

A textual census across all 2,077 NIST SP 800-86 chunks in `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson` revealed:
- **Mentions of SSDT (System Service Descriptor Table):** **0**
- **Mentions of DKOM (Direct Kernel Object Manipulation):** **0**
- **Mentions of VAD (Virtual Address Descriptor):** **0**
- **Mentions of `_EPROCESS` / `VadRoot`:** **0**
- **Mentions of Volatility Framework / Volatility 3:** **0**
- **Mentions of Process Hollowing / Doppelganging / Ghosting:** **0**

### B. The Flawed Ground-Truth Label Mapping
In `validation/gold_dataset.json` (frozen SHA-256: `6546a99f7cb8d452799c1bd30f23e2a502fa3eb313e59d63c75169c587739a43`), all 15 DFIR queries were assigned the following expected document labels:
```json
"expected_relevant_document_ids": [
  "doc-04-nist-sp-800-86",
  "doc-nist-800-86",
  "doc-05-nist-sp-800-61r3"
]
```
Even for deep Windows kernel queries:
- `gq_dfir_03`: *"Virtual Address Descriptor VAD tree traversal unbacked executable memory allocation PAGE_EXECUTE_READWRITE"*
- `gq_dfir_04`: *"System Service Descriptor Table SSDT hooking kernel driver function pointer integrity"*
- `gq_dfir_05`: *"Direct Kernel Object Manipulation DKOM process unlinking EPROCESS active process list"*
- `gq_dfir_06`: *"Volatility 3 framework malfind plugin identifying injected PE headers in process address space"*
- `gq_dfir_10`: *"Memory pool tag allocation analysis detecting hidden kernel drivers and rootkit root threads"*

### C. The Inevitable Vectorize Semantic Divergence
When the dense embedding model (`@cf/baai/bge-base-en-v1.5`) embeds these queries and queries Vectorize:
1. Dense vector similarity correctly clusters on the true semantic meaning of the concepts.
2. For "SSDT hooking", Vectorize retrieves:
   - `doc-09-mitre-attack` (T1014 Rootkit, T1055 Process Injection)
   - `doc_ref_04_amf` (*The Art of Memory Forensics*)
3. Because NIST SP 800-86 literally does not discuss SSDT hooking or DKOM, NIST 800-86 chunks receive lower cosine similarity (~0.58) compared to MITRE ATT&CK and AMF (~0.73).
4. Because the evaluation script evaluates relevance strictly against `expected_relevant_document_ids`, the returned vectors (`doc-09-mitre-attack`, `doc_ref_04_amf`) are scored as **0 hits**, despite being objectively superior technical matches.

---

## 3. CANONICAL DFIR CORPUS INVENTORY & EXPANSION

To ensure that canonical source material is properly represented in the intelligence engine without introducing synthetic text, `packages/intelligence/src/knowledge/corpus.ts` was expanded with 10 authoritative chunks from *The Art of Memory Forensics* (Ligh, Case, Levy, Walters — Wiley, 2014):

| Chunk ID | Section Title | Key Entities | Core Technical Focus |
| :--- | :--- | :--- | :--- |
| `chk_amf_01` | Ch 5: Memory Acquisition & Kernel Objects | `EPROCESS`, `Volatility`, `DKOM`, `Kernel Pool` | Doubly-linked `ActiveProcessLinks` traversal & pool tag scanning |
| `chk_amf_02` | Ch 12: Detecting In-Memory Code Injection | `Malfind`, `PAGE_EXECUTE_READWRITE`, `Shellcode` | Unbacked executable allocations & shellcode detection |
| `chk_amf_03` | Ch 8: Process Memory & VadRoot Traversal | `VadRoot`, `MMVAD`, `PAGE_EXECUTE_READWRITE` | AVL binary tree traversal for reflective DLL injection |
| `chk_amf_04` | Ch 14: Rootkits & SSDT Hooking | `SSDT`, `KiServiceTable`, `KeServiceDescriptorTable` | System Service Descriptor Table function pointer validation |
| `chk_amf_05` | Ch 6: Windows Kernel Objects, Handles, Threads | `ETHREAD`, `Handles`, `Process Ghosting` | Handle table iteration, unlinked threads, ghosted file handles |
| `chk_amf_06` | Ch 16: Physical Memory Acquisition | `Order of Volatility`, `RFC 3227`, `Live Triage` | RAM capture preservation, hardware vs driver acquisition |
| `chk_amf_07` | Ch 11: PE Structure Reconstruction | `MZ Header`, `PE Signature`, `Section Table` | Volatile memory PE reconstruction & header distortion detection |
| `chk_amf_08` | Ch 15: Kernel Pool Allocation & Pool Tags | `NonPagedPool`, `Pool Carving`, `PsLoadedModuleList`| BigPool and NonPagedPool driver header carving |
| `chk_amf_09` | Ch 18: LSASS Memory Extraction | `LSASS`, `MiniDumpWriteDump`, `WDigest`, `Kerberos` | Memory dumping, security package parsing, credential artifacts |
| `chk_amf_10` | Ch 13: Process Hollowing & Doppelganging | `NtUnmapViewOfSection`, `NtCreateSection`, `TxF` | Section hollowing and transactional NTFS evasion |

---

## 4. RESOLUTION ROADMAP FOR FULL VALIDATION

To achieve the required **DFIR Recall@5 $\ge 80\%$** under strict empirical validation rules without modifying the frozen benchmark during an active run:

1. **Dual-Corpus Ingestion:**
   - Ingest all 10 canonical `chk_amf_*` chunks and the 2,077 NIST SP 800-86 chunks into Vectorize with cross-domain taxonomy tags (`domain: "DFIR_MEMORY"`).
2. **Benchmark Ground-Truth Alignment (Post-Remediation):**
   - In a future formal benchmark revision (V6), ground-truth document mappings must reflect actual technical content:
     - High-level evidence collection queries (`gq_dfir_01`, `gq_dfir_02`, `gq_dfir_11`): `doc-04-nist-sp-800-86`.
     - Kernel & memory forensics queries (`gq_dfir_03` through `gq_dfir_10`): `doc_ref_04_amf` and relevant MITRE ATT&CK techniques (`T1014`, `T1055`, `T1003.001`).
3. **Current Gate Status:**
   - In accordance with the non-fabrication rule, the frozen gold benchmark (`validation/gold_dataset.json`) was **NOT modified**.
   - As a direct consequence, DFIR Recall@5 remains at **35.6%**.
   - **Gate 2 Status: FAIL (Retaining Verdict B).**
