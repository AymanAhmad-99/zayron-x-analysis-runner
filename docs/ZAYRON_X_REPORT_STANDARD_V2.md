# ZAYRON-X — INTELLIGENCE REPORT STANDARD V2.0 (06)

This specification defines the canonical structure, rules, and boundaries for all intelligence products published by the ZAYRON-X platform.

---

## 1. Core Operating Philosophy: The Epistemic Triad

Every report must maintain an uncompromising boundary across three categories:

1. **VERIFIED FACTS**: Directly attested by primary evidence (vendor advisory, CVE registration, direct technical hash).
2. **ANALYST ASSESSMENT**: Inferences, risk implications, and contextual interpretations derived logically from evidence and authoritative methodology.
3. **UNKNOWN / UNRESOLVED**: Missing dimensions (e.g. unknown actor, unobserved victims, unverified exploitation status). Never masked by AI assumptions.

---

## 2. Canonical Vulnerability Report Specification (V2.0)

| Section # | Section Title | Epistemic Category | Permitted Influencing Knowledge | Required Proof / Conditions |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **EXECUTIVE ASSESSMENT** | Analyst Assessment | CTI Lifecycle (doc_ref_01), Threat Modeling (doc_ref_06) | Concise 3-4 sentence operational synthesis. No promotional hype. |
| **02** | **VERIFIED FACTS** | Verified Fact | Primary advisory, CVE database | Explicit list of verified data points (CVE ID, Affected package, Advisory date, Issuing vendor). |
| **03** | **VULNERABILITY ANALYSIS** | Technical Analysis | NIST CVSS (doc_ref_17), Hacking (doc_ref_10) | Root cause, attack preconditions, authentication requirements. Omitted if technical advisory lacks detail. |
| **04** | **THREAT & EXPLOITATION CONTEXT**| Analyst Assessment | CISA KEV (doc_ref_16), FIRST EPSS (doc_ref_18) | Must explicitly separate: *PoC Exists* vs *Exploited in Wild* vs *No Known Exploitation*. |
| **05** | **EVIDENCE MATRIX** | Provenance | Telemetry Ingestion Contract | Issuing authority, Collection channel, Message ID, Content SHA-256. |
| **06** | **ATT&CK MAPPING** | Standardized Mapping | MITRE ATT&CK (doc_ref_11) | Only mapped if technique is explicitly justified by telemetry. Default to *"No validated ATT&CK mapping established."* |
| **07** | **DEFENSIVE & DETECTION ACTIONS**| Actionable Guidance | Applied NSM (doc_ref_08), MITRE D3FEND (doc_ref_12) | Concrete detection rules (YARA, Sigma, Zeek) or patch links. Never generic filler. |
| **08** | **UNKNOWN / UNRESOLVED** | Explicit Uncertainty | ICD 203, Intelligence Doctrine | Explicitly lists gaps in visibility. |
| **09** | **KNOWLEDGE TRACE** | System Metadata | Knowledge Corpus Router | Auditable list of documents used vs rejected with score and chunk ID. |
| **10** | **REFERENCES & PROVENANCE** | Provenance | Primary links | Clickable links to vendor advisory and source publication. |

---

## 3. Canonical Malware Report Specification (V2.0)

| Section # | Section Title | Epistemic Category | Permitted Influencing Knowledge | Required Proof / Conditions |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **EXECUTIVE ASSESSMENT** | Analyst Assessment | CTI Lifecycle (doc_ref_01) | Executive summary of malware campaign/sample. |
| **02** | **MALWARE IDENTITY** | Verified Fact | Telemetry / Sample metadata | Canonical name, family, hashes (SHA-256/MD5), sample size, architecture. |
| **03** | **OBSERVED CAPABILITIES** | Verified Fact / Analysis| Practical Malware Analysis (doc_ref_02) | Only behaviors observed in current sample or telemetry. |
| **04** | **TECHNICAL ANALYSIS** | Technical Analysis | Memory Forensics (doc_ref_04), PMA (doc_ref_02)| Injection primitives, persistence keys, network beaconing. |
| **05** | **IOCs & INFRASTRUCTURE** | Verified Fact | Observed telemetry | Validated IPs, domains, hashes. Naked lists prohibited without context. |
| **06** | **ATT&CK MAPPING** | Standardized Mapping | MITRE ATT&CK (doc_ref_11) | Specific sub-techniques mapped to concrete binary behaviors. |
| **07** | **DETECTION & HUNTING** | Actionable Guidance | Applied NSM (doc_ref_08), YARA | Concrete Sigma/Yara/Snort detection signatures. |
| **08** | **ANALYST ASSESSMENT** | Analyst Assessment | Diamond Model (doc_ref_22), ACH (doc_ref_21) | Threat actor linkages, intended targeting, operational risk. |
| **09** | **UNKNOWN / UNRESOLVED** | Explicit Uncertainty | Intelligence Doctrine | Missing victimology, unverified C2 infrastructure. |
| **10** | **KNOWLEDGE TRACE & PROVENANCE**| System Metadata | Knowledge Corpus Router | Documents and chunks utilized in analysis. |
