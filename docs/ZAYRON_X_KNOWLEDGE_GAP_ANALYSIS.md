# ZAYRON-X — KNOWLEDGE GAP ANALYSIS & CORPUS ARCHITECTURE (09)

This analysis evaluates the current 12-book knowledge corpus against enterprise CTI requirements and identifies concrete knowledge gaps.

---

## 1. Do We Need More Books?

**Conclusion: NO MORE TEXTBOOKS ARE NEEDED.**  
Adding more general textbooks (e.g. general Linux, Python scripting, or introductory networking) would increase noise and dilute retrieval accuracy without improving operational report quality.

The 12 existing books already comprehensively cover:
- CTI Methodology (*Intelligence-Driven Incident Response*, *The Threat Intelligence Handbook*)
- Malware Analysis (*Practical Malware Analysis*, *Malware Analyst's Cookbook*)
- Memory Forensics (*The Art of Memory Forensics*)
- Network Forensics (*The Practice of NSM*, *Applied NSM*, *NSM Principles*)
- Vulnerability Mechanics (*Hacking: The Art of Exploitation*, *Threat Modeling*)

---

## 2. What Knowledge Is ACTUALLY Missing?

The critical gap is not narrative textbooks, but **authoritative, machine-readable operational standards and threat intelligence catalogs**:

| Missing / Incomplete Knowledge Asset | Nature of Knowledge | Why It Is Essential for Report Correctness | Proposed Source / Standard |
| :--- | :--- | :--- | :--- |
| **CISA KEV Catalog** | Dynamic Catalog | Prevents the system from speculating on whether a vulnerability is actively exploited in the wild. | CISA KEV JSON feed (`cisa.gov/known-exploited-vulnerabilities-catalog`) |
| **FIRST EPSS (Exploit Prediction Scoring)** | Empirical Model | Provides data-driven probability of exploitation within 30 days, replacing subjective AI guesswork. | FIRST EPSS API / Daily CSV dump |
| **MITRE ATT&CK Enterprise STIX 2.1** | Structured Graph | Provides authoritative mapping of technique ID -> platforms, data sources, and permissions, preventing invalid technique mapping. | Official MITRE ATT&CK STIX 2.1 repository |
| **NIST NVD CPE / Affected Products Dictionary** | Standard Dictionary | Allows accurate entity extraction of software vendors and product versions from raw text. | NIST Official CPE Match Criteria |
| **Vendor Advisory Parsers (Red Hat, Debian, Ubuntu, MS)** | Heuristic Normalizers | Extracts true issuing authority, official CVE, CVSS base score, and package names directly from structured Telegram bot messages. | Dedicated vendor alert regex parser in Normalization Layer |

---

## 3. Knowledge Corpus Quality Gate Rules

1. **Strict Domain Alignment**:
   - Chunks from *The Art of Memory Forensics* may ONLY enter the retrieval context if the input telemetry contains keywords: `memory dump`, `volatility`, `vad`, `process hollowing`, `dll injection`, or an attached crash dump.
2. **Authority Weighting in Retrieval**:
   - Tier 0 Standards (MITRE ATT&CK, NIST CVSS, CISA KEV) receive an automatic 1.25x retrieval multiplier.
   - Narrative books (Tier 1) receive a 1.0x baseline and must only influence *methodology* and *analytical interpretation*, never factual assertions.
