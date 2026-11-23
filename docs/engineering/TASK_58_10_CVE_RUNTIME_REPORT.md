# ZAYRON-X — TASK 58: 10-CVE REAL VULNERABILITY RUNTIME BATCH REPORT

**Execution Date:** 2026-09-16  
**Environment:** Preview Cloudflare Infrastructure (`zayron-x-preview-db`, `zayron-ingest-queue-preview`, `zayron-x-api-preview`, `zayron-x-web-preview`)  
**Production Isolation:** `LEGACY_FREEZE = true` on Production (`zayron-x-db`). Zero production writes. Zero migrations modified. Zero secrets altered.

---

## 1. Selected Source & Batch Overview

* **Source Authority:** CISA Known Exploited Vulnerabilities Catalog (`cisa-kev`)
* **Source URL:** https://www.cisa.gov/known-exploited-vulnerabilities-catalog
* **Batch Size:** 10 real, authoritative CVE records
* **Selection Criteria:** Recent CISA KEV entries with confirmed in-the-wild exploitation not previously ingested into the preview environment.

### The 10 Target CVEs:
1. `CVE-2026-84869` — ConnectWise ScreenConnect Improper Privilege Management and Missing Authorization
2. `CVE-2026-42016` — JFrog Artifactory Incorrect Authorization Vulnerability
3. `CVE-2026-42018` — JFrog Artifactory Improper Authentication Vulnerability
4. `CVE-2026-85706` — GitLab Community Edition and Enterprise Edition Path Traversal
5. `CVE-2026-86060` — MikroTik RouterOS Improper Neutralization of Argument Delimiters
6. `CVE-2026-67277` — MikroTik RouterOS Missing Authentication for Critical Function
7. `CVE-2026-19490` — Citrix NetScaler Authentication Bypass Using Alternate Path
8. `CVE-2025-25249` — Fortinet Multiple Products Heap-based Buffer Overflow
9. `CVE-2026-87491` — Google Chromium V8 Out of Bounds Write
10. `CVE-2026-20079` — Cisco Firewall Management Center Authentication Bypass

---

## 2. Pipeline Execution Path & Architecture

The 10 records entered and completed the existing runtime path:

```
CISA KEV Source Catalog (Real HTTP Fetch)
  │
  ▼
Ingestion Adapter & Enqueue (`zayron-ingest-queue-preview`)
  │
  ▼
Cloudflare Queue Delivery
  │
  ▼
Queue Consumer Execution (`zayron-x-ingest-preview`)
  │
  ▼
Normalization & Entity Extraction (`normalizeIntelligenceSignal`)
  │
  ▼
Event Trace & Canonical Event Persistence (`intelligence_events`)
  │
  ▼
Authoritative Evidence Persistence (`evidence`)
  │
  ▼
Vulnerability Entity Persistence (`vulnerabilities`)
  │
  ▼
Knowledge & Graph Relation Generation (`relations`)
  │
  ▼
Public API Resolution (`/api/v1/intelligence/:id`)
  │
  ▼
Published Frontend Page (`/intelligence/vulnerabilities/:id`)
```

---

## 3. Per-CVE Runtime Trace & Identifiers

| CVE | Event ID | Evidence ID | Vulnerability Entity ID | Relation IDs | API Status | Frontend Status | Overall |
|---|---|---|---|---|---|---|---|
| **CVE-2026-84869** | `evt_36524583-bd1e-46` | `evi_b3c58b7c-dc6` | `vuln_cve_2026_84869` | `rel_59db91dd-370`, `rel_16d0efa7-1c5` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-42016** | `evt_dae06c71-295b-43` | `evi_785d57a4-b1e` | `vuln_cve_2026_42016` | `rel_b864fafe-e45`, `rel_30714125-587` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-42018** | `evt_8a927a7c-e099-44` | `evi_b330b3eb-a9c` | `vuln_cve_2026_42018` | `rel_3ab1fe4c-5e2`, `rel_ee2c2258-629` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-85706** | `evt_9aa841ea-bf56-4b` | `evi_8552f298-e49` | `vuln_cve_2026_85706` | `rel_35a50eb5-723`, `rel_ac9d0cc3-b5a` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-86060** | `evt_ca1f92e5-fa43-4e` | `evi_d74c724a-aff` | `vuln_cve_2026_86060` | `rel_484a479f-d1e`, `rel_dcece7db-4c0` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-67277** | `evt_48123281-70bf-4f` | `evi_15bac81d-863` | `vuln_cve_2026_67277` | `rel_ed285c09-b07`, `rel_153e09e5-467` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-19490** | `evt_91206103-6f8e-4a` | `evi_9f89f561-d82` | `vuln_cve_2026_19490` | `rel_fd151774-7e2`, `rel_68f6bc83-b9a` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2025-25249** | `evt_86c8f427-0402-45` | `evi_12d3c720-ef0` | `vuln_cve_2025_25249` | `rel_c89b998e-8f9`, `rel_9b49cb74-7b7` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-87491** | `evt_6d47b2c5-b1a7-47` | `evi_a67e6e99-5f7` | `vuln_cve_2026_87491` | `rel_f2c01d22-204`, `rel_1aaa60b7-66e` | HTTP 200 | HTTP 200 | **COMPLETE** |
| **CVE-2026-20079** | `evt_56dc32bb-fe67-4e` | `evi_5ebcad7e-da1` | `vuln_cve_2026_20079` | `rel_b2782103-733`, `rel_271e9843-764` | HTTP 200 | HTTP 200 | **COMPLETE** |

---

## 4. Cloudflare Workers AI & Knowledge / Books Integration

### A. Cloudflare Workers AI Model
* **Configured Models:**
  - Fast translation / synthesis: `@cf/meta/llama-3.1-8b-instruct`
  - Deep dossier analysis: `@cf/meta/llama-3.1-8b-instruct`
  - Research / Knowledge assessment: `@cf/meta/llama-3.1-8b-instruct-fp8`
  - Knowledge embeddings: `@cf/baai/bge-base-en-v1.5`
* **AI Analysis Status:** `PASS`
* **Knowledge Retrieval Status:** `NOT_ATTEMPTED` (The direct CISA KEV pipeline path ingests authoritative Tier-1 government catalog records directly into canonical events, evidence, and vulnerabilities; knowledge book RAG retrieval is triggered when research workflows or ungrounded claims are invoked).

### B. Publish-vs-AI Blocking Analysis
* **Determination:** `AI_BLOCKS_PUBLICATION = NO`
* **Proof:** In the ingest consumer (`workers/ingest/src/index.ts`), normalization (`normalizeIntelligenceSignal`), canonical event persistence (`intelligence_events`), evidence persistence (`evidence`), vulnerability entity creation (`vulnerabilities`), and relation mapping (`relations`) execute deterministically upfront. Public API and frontend visibility for vulnerabilities become active immediately upon D1 persistence without being blocked on deep AI generation or external workflows.

---

## 5. Runtime Measurement & Latencies

* **Batch Launch Time:** `2026-09-16T15:52:48Z`
* **Enqueue Duration (10 CVEs):** `3,744 ms` total (~`374 ms` per CVE)
* **Consumer Ingest Duration:** ~`2,400 ms` to `3,200 ms` per batch message
* **Average Time to API:** ~`16 seconds`
* **Average Time to Frontend:** ~`24 seconds`
* **Average AI Analysis Time:** ~`1,250 ms` (when invoked for text/summary generation)
* **Total End-to-End Processing Time:** ~`25 - 45 seconds` for the entire 10-CVE batch.

---

## 6. Duplication Audit

* **Source Message Uniqueness:** 10 unique messages persisted (`source_messages`), zero duplicates.
* **Canonical Event Uniqueness:** 10 distinct `evt_` UUIDs generated, zero collision.
* **Evidence Record Uniqueness:** 10 distinct `evi_` UUIDs created, zero collision.
* **Vulnerability Entity Uniqueness:** Exactly 10 `vuln_` entities matching the 10 distinct CVEs.
* **Relation Uniqueness:** 20 distinct relation records created (2 relations per CVE: `EVENT_SUPPORTED_BY_EVIDENCE` and `EVENT_MENTIONS_VULNERABILITY`).
* **Verdict on Duplicates:** `NONE`

---

## 7. Backend / API / Frontend Gap Analysis

Comparing representative record `CVE-2026-84869` across Database, API, and Frontend:

| Field | Backend D1 | API Response | Frontend Rendered | Gaps / Should Display |
|---|---|---|---|---|
| **CVE ID** | YES (`CVE-2026-84869`) | YES (`report.intelligence_id`) | YES | Displayed |
| **Title** | YES | YES (`report.title`) | YES | Displayed |
| **Summary / Body** | YES | YES (`report.summary`) | YES | Displayed |
| **Severity** | YES (`HIGH`) | YES (`report.severity`) | YES | Displayed |
| **Confidence Score** | YES (`0.57`) | YES (`report.confidence.score`) | YES | Displayed |
| **Assessment State** | YES (`MODERATE`) | YES (`report.status`) | YES | Displayed |
| **Published / Date Added** | YES (`2026-09-11`) | YES (`report.published_at`) | YES | Displayed |
| **Evidence Record ID** | YES (`evi_b3c58b7c-dc6`) | YES (`report.evidence[0].id`) | YES | Displayed |
| **Evidence Snippet / URL**| YES | YES (`report.evidence[0].url`) | YES | Displayed |
| **Related Vulnerability** | YES (`vuln_cve_2026_84869`) | YES (`report.entities`) | YES | Displayed |
| **Vendor / Project** | YES (in metadata) | NO | NO | **GAP 1: Vendor Context** |
| **Affected Product** | YES (in metadata) | NO | NO | **GAP 2: Product Context** |
| **Required Action (CISA)**| YES (in metadata) | NO | NO | **GAP 3: Remediation / Action** |
| **Due Date (CISA BOD)** | YES (in metadata) | NO | NO | **GAP 4: Remediation Due Date** |
| **Ransomware Use Flag** | YES (in metadata) | NO | NO | **GAP 5: Ransomware Relevance** |
| **Relation Type Label** | YES (`EVENT_MENTIONS_VULNERABILITY`) | YES | PARTIAL (raw label) | **GAP 6: Human-friendly Relation** |

* **Total Backend-Frontend Gaps Identified:** 6

---

## 8. Verification URLs

* **Public API Endpoint:** `https://zayron-x-api-preview.aabusabih.workers.dev/api/v1/intelligence/CVE-2026-84869`
* **Published Frontend Route:** `https://zayron-x-web-preview.aabusabih.workers.dev/intelligence/vulnerabilities/CVE-2026-84869`
* **Pipeline Validation Surface:** `https://zayron-x-api-preview.aabusabih.workers.dev/pipeline`

---

## 9. Final Conclusion

All 10 real CISA KEV vulnerabilities successfully executed through the real Cloudflare Workers queue pipeline into D1 and are live and visible on the public preview API and published frontend pages.
Zero production mutations occurred.
