# ZAYRON-X — FULL CORPUS COVERAGE RECONCILIATION AUDIT

**Document Identifier:** `ZAYRON_X_CORPUS_COVERAGE_RECONCILIATION`  
**Classification:** PRODUCTION DATABASE & VECTOR INDEX RECONCILIATION  
**Target Index:** Cloudflare Vectorize `zayron-knowledge-index`  
**Primary Database:** Cloudflare D1 `zayron-x-db` (`c19c8f45-801b-4034-bd76-402e5e5389b5`)  
**Embedding Model:** Cloudflare Workers AI `@cf/baai/bge-base-en-v1.5` (768 dimensions)  
**Reconciliation Artifact:** `validation/corpus_reconciliation_inventory.json`  
**Date:** September 2026  

---

## 1. EXECUTIVE SUMMARY & RECONCILIATION TOTALS

A comprehensive database-to-index reconciliation was executed between canonical source chunks in `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson`, D1 database table `knowledge_chunks`, and the active Cloudflare Vectorize index `zayron-knowledge-index`.

| Metric | Measured Value | Target | Status |
| :--- | :---: | :---: | :---: |
| **Total Canonical Chunks** | **36,963** | 36,963 | **VERIFIED** |
| **Active Vectorize Vectors** | **25,642** | 36,963 | **PARTIAL** |
| **Unindexed Staged Chunks** | **11,321** | 0 | **DEFICIT** |
| **Active Corpus Coverage** | **69.37%** | $\ge 95.0\%$ | **GATE 1 FAIL** |
| **Deterministic Vector ID Parity** | **100.0%** | 100.0% | **PASS** |
| **Duplicate Vector IDs** | **0** | 0 | **PASS** |
| **Orphan Vectors** | **0** | 0 | **PASS** |

The reconciliation establishes that exactly **11,321 canonical chunks** remain unindexed in Cloudflare Vectorize. These chunks are fully parsed, verified, and staged in `.zayron/knowledge/canonical-v1/canonical-v1-chunks.ndjson` (indices 25,642 through 36,962), but await batch embedding generation and Vectorize upsert.

---

## 2. DOMAIN-BY-DOMAIN RECONCILIATION BREAKDOWN

The 36,963 canonical chunks and active index vectors break down across analytical domains as follows:

| Analytical Domain | Canonical Chunks | Indexed Vectors | Unindexed Chunks | Domain Coverage | Primary Documents |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **VULNERABILITY** | 1,687 | 1,687 | 0 | **100.0%** | CISA KEV, NVD CVSS v3.1/v4.0, EPSS v3 |
| **THREAT_ACTOR** | 1,014 | 1,014 | 0 | **100.0%** | Richards Heuer Psychology of CTI, Threat Groups |
| **DFIR_MEMORY** | 2,070 | 2,070 | 0 | **100.0%** | NIST SP 800-86, Art of Memory Forensics |
| **MALWARE** | 26,086 | 20,077 | 6,009 | **76.96%** | MITRE ATT&CK Enterprise v14.1, Sikorski PMA |
| **NETWORK_SECURITY** | 1,158 | 315 | 843 | **27.20%** | NIST SP 800-150, STIX 2.1, TAXII 2.1 |
| **INCIDENT_RESPONSE** | 4,398 | 479 | 3,919 | **10.89%** | NIST SP 800-61r3, NIST CSF 2.0, NIST SP 800-53 |
| **GOVERNANCE_AI** | 550 | 0 | 550 | **0.00%** | NIST AI RMF 1.0, GenAI Profile, OWASP Top 10 |
| **TOTALS** | **36,963** | **25,642** | **11,321** | **69.37%** | **15 Core Canonical Documents** |

---

## 3. UNINDEXED CHUNKS FAILURE TAXONOMY

Every one of the 11,321 unindexed chunks was audited and classified under a specific operational reason code. All 11,321 chunks are eligible for retry and expansion upon allocation of Workers AI embedding quota.

```
Total Unindexed Chunks: 11,321
├── DEEP_ATTACK_RELATIONSHIP_BATCH_PAUSED: 6,009 (53.08%)
├── SECONDARY_CONTROL_ENHANCEMENT_DEFERRED: 3,919 (34.62%)
├── TAXII_CHANNEL_COLLECTION_BATCH_PAUSED:    512  (4.52%)
├── GENAI_RISK_PROFILE_BATCH_PAUSED:          501  (4.43%)
├── STIX_CYBER_OBSERVABLE_BATCH_PAUSED:       331  (2.92%)
├── AI_RMF_PROFILE_BATCH_PAUSED:               48  (0.42%)
└── OWASP_COMPLIANCE_MAPPING_PAUSED:            1  (0.01%)
```

### Classification Details:

1. **`DEEP_ATTACK_RELATIONSHIP_BATCH_PAUSED` (6,009 chunks — `doc-09-mitre-attack`)**:
   - *Nature:* Deep sub-technique granular relationships, detection strategies, and software execution matrices in MITRE ATT&CK v14.1.
   - *Reason:* Batch ingestion paused at offset 20,077 during initial Workers AI bulk embedding generation.
   - *Retry Eligibility:* `true`.

2. **`SECONDARY_CONTROL_ENHANCEMENT_DEFERRED` (3,919 chunks — `doc-14-nist-sp-800-53`)**:
   - *Nature:* Granular security control enhancements (e.g. AC-2(1) through AC-2(13), SC-7(1) through SC-7(29)).
   - *Reason:* Primary baseline controls (AC-1, SC-7, SI-4) were ingested; sub-enhancements were staged for secondary indexing batch.
   - *Retry Eligibility:* `true`.

3. **`TAXII_CHANNEL_COLLECTION_BATCH_PAUSED` (512 chunks — `doc-11-oasis-taxii21`)**:
   - *Nature:* TAXII 2.1 API specifications, channel polling, and discovery endpoint schemas.
   - *Reason:* Deferred to preserve rate limits for core threat modeling standards.
   - *Retry Eligibility:* `true`.

4. **`GENAI_RISK_PROFILE_BATCH_PAUSED` (501 chunks — `doc-13-nist-genai-profile`)**:
   - *Nature:* NIST SP 600-1 GenAI risk profile mappings for adversarial prompt injection, training data poisoning, and model evasion.
   - *Reason:* Staged for AI governance expansion phase.
   - *Retry Eligibility:* `true`.

5. **`STIX_CYBER_OBSERVABLE_BATCH_PAUSED` (331 chunks — `doc-10-oasis-stix21`)**:
   - *Nature:* STIX 2.1 Cyber Observable Object (SCO) schemas (IPv4/IPv6 address, domain-name, file, x509-certificate).
   - *Reason:* Secondary syntax specifications deferred behind core STIX SDOs (Indicator, Threat-Actor, Malware).
   - *Retry Eligibility:* `true`.

6. **`AI_RMF_PROFILE_BATCH_PAUSED` (48 chunks — `doc-12-nist-ai-rmf`)**:
   - *Nature:* Core functions of NIST AI Risk Management Framework (Govern, Map, Measure, Manage).
   - *Retry Eligibility:* `true`.

7. **`OWASP_COMPLIANCE_MAPPING_PAUSED` (1 chunk — `doc-15-owasp-top10`)**:
   - *Nature:* Consolidated OWASP Top 10 API Security Risks mapping matrix.
   - *Retry Eligibility:* `true`.

---

## 4. IDEMPOTENT RE-INDEXING PROCESS

The re-indexing pipeline is implemented in `workers/scripts/reconcile-and-ingest-corpus.py` and adheres to strict production safety constraints:

1. **Deterministic Vector IDs:**
   - Vector IDs strictly follow `chunk.embedding_id` (e.g. `doc-09-mitre-attack-p0-20078`).
   - Re-indexing an existing chunk overwrites the existing vector coordinates identically without creating duplicates.
2. **Resumable State Checkpointing:**
   - Durable checkpoint stored in `.zayron/knowledge/canonical-v1/ingestion-checkpoint.json` tracks `last_embed_offset` and `last_upsert_offset`.
   - Script resumes exactly from the last verified batch upon interruption.
3. **Adaptive Rate Limiting & Backoff:**
   - Bounded batch size of 20 chunks per Workers AI request.
   - Exponential backoff upon HTTP 429 (Rate Limited) with jitter ($3 \times \text{attempt}$ seconds up to 30s).
   - Automatic OAuth token refresh via Wrangler config upon HTTP 401.
4. **Non-Destructive Guarantee:**
   - Upsert operation uses Cloudflare Vectorize NDJSON upsert endpoint (`/vectorize/v2/indexes/{index}/upsert`).
   - Existing valid vectors are never deleted.

---

## 5. RECONCILIATION ARTIFACT VERIFICATION

The machine-readable inventory is serialized at:
`validation/corpus_reconciliation_inventory.json`

Summary header verification:
```json
{
  "summary": {
    "total_canonical_chunks": 36963,
    "active_vectorize_vectors": 25642,
    "unindexed_staged_chunks": 11321,
    "coverage_percentage": 69.37,
    "timestamp": "2026-09-04T16:28:12.004Z"
  },
  "total_unindexed_records": 11321
}
```
All 11,321 unindexed chunk records are individually enumerated with deterministic IDs, document IDs, domains, failure classifications, and retry eligibility flags.
