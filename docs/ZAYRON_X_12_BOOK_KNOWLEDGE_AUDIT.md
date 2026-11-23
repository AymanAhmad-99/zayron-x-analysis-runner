# ZAYRON-X — 12-BOOK KNOWLEDGE CORPUS AUDIT (03)

This audit evaluates the 12 core books/knowledge sources declared in the ZAYRON-X knowledge manifest, their analytical boundaries, failure modes, and legitimate applications.

---

## 1. Inventory & Analytical Boundary Matrix

| Document ID | Title & Author | Analytical Purpose | Authority Level | Permitted Report Types | Sections It Can Legitimately Influence | Sections It Must NEVER Influence | Can Support Facts? | Can Support Assessment? | Keep In Report? | Additions Needed? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **doc_ref_01_idir** | *Intelligence-Driven Incident Response* (Brown & Roberts) | CTI lifecycle, F3EAD, Diamond Model, confidence calibration | Tier 1 (Methodology) | ALL | Analyst Assessment, Confidence Calibration, Diamond Model | Verified Facts, Technical Vulnerability Analysis, IOCs | **NO** (Context only) | **YES** | Hidden in Knowledge Applied | None (Strong baseline) |
| **doc_ref_02_pma** | *Practical Malware Analysis* (Sikorski & Honig) | Static/dynamic analysis, PE headers, imports, unpacking | Tier 1 (Technical) | MALWARE | Technical Analysis, Capability Profile, Detection & Hunting | Verified Facts (unless matching specific PE), Exploitability | **NO** (Reference only) | **YES** | Hidden in Knowledge Applied | Needs x64/modern PE updates |
| **doc_ref_03_pnsm** | *The Practice of NSM* (Bejtlich) | Network telemetry, PCAP, NetFlow, sensor placement | Tier 1 (Doctrine) | GENERAL_CTI, INCIDENT | Observed Telemetry, Detection & Hunting | Vulnerability Root Cause, Malware Disassembly | **NO** | **YES** | Hidden in Knowledge Applied | None |
| **doc_ref_04_amf** | *The Art of Memory Forensics* (Ligh et al.) | RAM acquisition, kernel objects, process injection, VAD | Tier 1 (Technical) | MALWARE, INCIDENT | In-Memory Behavior, Injection Analysis, Detection & Hunting | Vulnerability Root Cause, CVSS, Network C2 | **NO** | **YES** | Hidden in Knowledge Applied | Currently misrouted to CVE reports |
| **doc_ref_05_mac** | *Malware Analyst's Cookbook* (Ligh et al.) | Deobfuscation, shellcode decoding, Yara rules | Tier 1 (Technical) | MALWARE | Technical Analysis, IOC Extraction, Detection & Hunting | Executive Assessment, CVSS Scoring | **NO** | **YES** | Hidden in Knowledge Applied | None |
| **doc_ref_06_tm** | *Threat Modeling: Designing for Security* (Shostack) | STRIDE, attack trees, elevation of privilege | Tier 1 (Architecture) | VULNERABILITY, ARCHITECTURE | Vulnerability Analysis, Threat Intelligence Context | Verified Facts, IOCs, In-the-Wild Status | **NO** | **YES** | Hidden in Knowledge Applied | Add CWE top 25 context |
| **doc_ref_07_tih** | *The Threat Intelligence Handbook* (Recorded Future) | Tactical vs Operational CTI, SecOps integration | Tier 1 (Operations) | ALL | Analyst Assessment, Defensive Actions | Specific Malware Behavior, Technical Exploits | **NO** | **YES** | Hidden in Knowledge Applied | None |
| **doc_ref_08_ansm** | *Applied Network Security Monitoring* (Sanders & Smith) | Zeek/Snort/Suricata rules, packet triage | Tier 1 (Engineering) | GENERAL_CTI, MALWARE | Detection & Hunting, Defensive Actions | Vulnerability Disassembly, Actor Attribution | **NO** | **YES** | Hidden in Knowledge Applied | None |
| **doc_ref_09_nsm_adv** | *Network Security Monitoring Principles* (Bejtlich) | Defensible architecture, sensor topology | Tier 1 (Doctrine) | GENERAL_CTI, INCIDENT | Defensive Actions | Vulnerability Mechanics, Malware Reversing | **NO** | **YES** | Background only | Deprecate in favor of doc_ref_03 |
| **doc_ref_10_hae** | *Hacking: The Art of Exploitation* (Erickson) | Stack/heap overflows, memory layout, shellcode | Tier 1 (Technical) | VULNERABILITY, EXPLOIT | Root Cause, Attack Path, Exploitability | Active Threat Campaigns, Attribution, Actor TTPs | **NO** | **YES** | Hidden in Knowledge Applied | Add modern ROP/ASLR mitigations |
| **doc_ref_11_mitre_attack** | *MITRE ATT&CK Enterprise Framework* (MITRE) | Standardized TTP ontology and adversary tactics | Tier 0 (Normative) | ALL | ATT&CK Mapping, Detection & Hunting | Verified Facts (unless observed in telemetry) | **NO** (Taxonomy only) | **YES** | Explicit Mapping Table | Keep core |
| **doc_ref_17_nvd_cvss** | *NVD / NIST & CVSS v3.1/v4.0 Spec* (NIST/FIRST) | Base metrics, attack vectors, complexity, scope | Tier 0 (Normative) | VULNERABILITY | Vulnerability Analysis, Severity & Scoring | Threat Actor Attribution, In-the-Wild Telemetry | **PARTIAL** (Vector metrics) | **YES** | Explicit CVSS Table | Keep core |

---

## 2. Key Findings: Where the Books are Misused Today

1. **Misrouting Memory Forensics to Network/Advisory Disclosures**:
   - `doc_ref_04_amf` (*Art of Memory Forensics*) is retrieved in 100% of vulnerability reports as a "considered" item, despite the fact that a remote web vulnerability advisory contains zero volatile memory dump data.
2. **Treating Methodological Books as Factual Evidence**:
   - Technical books describe *how a class of vulnerability or malware behaves in general*, NOT what happened in the specific incident reported by telemetry.
   - The engine must NEVER cite *Practical Malware Analysis* to assert that a specific binary injected into `explorer.exe` unless that injection was literally observed in the incident telemetry.
3. **Missing Operational Knowledge Standards**:
   - The corpus lacked official mappings for:
     - **CISA KEV** (Known Exploited Vulnerabilities): Vital for separating "exploit exists" from "actively exploited in wild".
     - **FIRST EPSS** (Exploit Prediction Scoring System): Necessary for probabilistic exploitability assessments.
