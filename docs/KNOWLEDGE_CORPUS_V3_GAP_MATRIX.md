# Knowledge Corpus v3 — 30-Reference Gap Matrix

This is a planning/acquisition matrix only. `OPEN_SOURCE_CANDIDATE` means an
authoritative source was identified; it does not mean the file has been
downloaded or verified locally. The 14 recovered originals remain unchanged.

| # | Reference | Type | Domain | Authority | Legal/full-text status | Document ID | Coverage |
|---:|---|---|---|---|---|---|---|
| 1 | Psychology of Intelligence Analysis | government book | intelligence tradecraft / bias | CIA | FULL_TEXT_VERIFIED | doc-01-heuer-psychology | bias, uncertainty, evidence |
| 2 | NIST SP 800-150 | standard | CTI sharing | NIST | FULL_TEXT_VERIFIED | doc-03-nist-sp-800-150 | CTI, provenance |
| 3 | NIST SP 800-86 | standard | DFIR | NIST | FULL_TEXT_VERIFIED | doc-04-nist-sp-800-86 | forensics, IR |
| 4 | NIST SP 800-61 Rev. 3 | standard | incident response | NIST | FULL_TEXT_VERIFIED | doc-05-nist-sp-800-61r3 | IR depth |
| 5 | NIST CSF 2.0 | framework | security engineering | NIST | FULL_TEXT_VERIFIED | doc-06-nist-csf-2 | security engineering |
| 6 | FIRST CVSS v4.0 | specification | vulnerability analysis | FIRST | FULL_TEXT_VERIFIED | doc-07-first-cvss4 | severity |
| 7 | FIRST EPSS | specification | vulnerability intelligence | FIRST | FULL_TEXT_VERIFIED | doc-08-first-epss | exploitability |
| 8 | MITRE ATT&CK Enterprise | knowledge base | attack taxonomy | MITRE | FULL_TEXT_VERIFIED | doc-09-mitre-attack | ATT&CK, malware |
| 9 | OASIS STIX 2.1 | specification | CTI data | OASIS | FULL_TEXT_VERIFIED | doc-10-oasis-stix21 | CTI exchange |
| 10 | OASIS TAXII 2.1 | specification | CTI transport | OASIS | FULL_TEXT_VERIFIED | doc-11-oasis-taxii21 | CTI exchange |
| 11 | NIST AI RMF 1.0 | framework | analytical governance | NIST | FULL_TEXT_VERIFIED | doc-12-nist-ai-rmf | uncertainty, governance |
| 12 | NIST GenAI Profile | framework | AI assurance | NIST | FULL_TEXT_VERIFIED | doc-13-nist-genai-profile | AI safety |
| 13 | NIST SP 800-53 Rev. 5 | standard | security controls | NIST | FULL_TEXT_VERIFIED | doc-14-nist-sp-800-53 | controls |
| 14 | OWASP API Security Top 10 | reference | software security | OWASP | FULL_TEXT_VERIFIED | doc-15-owasp-top10 | API security |
| 15 | CISA CTI Feed Value White Paper | government white paper | CTI | CISA | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-cisa-cti-feed-value | source evaluation |
| 16 | CISA Cybersecurity Incident & Vulnerability Response Playbooks | government playbook | IR / vulnerability | CISA | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-cisa-response-playbooks | IR depth |
| 17 | CISA Low Regret CTI Triage Methodology | government white paper | CTI triage | CISA | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-cisa-low-regret-cti | CTI, prioritization |
| 18 | MITRE CWE | taxonomy | vulnerability taxonomy | MITRE | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-mitre-cwe | CWE, vulnerability |
| 19 | MITRE CAPEC | taxonomy | exploit analysis | MITRE | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-mitre-capec | CAPEC, exploit analysis |
| 20 | Sigma Rules Specification | specification | detection engineering | SigmaHQ | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-sigma-specification | Sigma, detection |
| 21 | NIST SP 800-92 Log Management | standard | logging / detection | NIST | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-nist-800-92 | telemetry, detection |
| 22 | NIST SP 800-218 SSDF | standard | secure software | NIST | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-nist-800-218 | software security |
| 23 | NIST SP 800-101 Mobile Device Forensics | standard | digital forensics | NIST | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-nist-800-101 | DFIR depth |
| 24 | NIST SP 800-40 Vulnerability Management | standard | vulnerability management | NIST | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-nist-800-40 | remediation |
| 25 | OWASP Web Security Testing Guide | open guide | exploit analysis / testing | OWASP | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-owasp-wstg | testing, reporting |
| 26 | OWASP ASVS | standard | application security | OWASP | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-owasp-asvs | validation |
| 27 | CISA Malware Analysis / Incident Guidance | government guidance | malware / IR | CISA | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-cisa-malware-guidance | malware analysis |
| 28 | NIST Network Security Monitoring guidance | government guidance | network analysis | NIST | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-nist-network-monitoring | network monitoring |
| 29 | CISA Threat Hunting guidance | government guidance | threat hunting | CISA | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-cisa-threat-hunting | threat hunting |
| 30 | OWASP Secure Coding / Developer Guide | open guide | security reporting / engineering | OWASP | OPEN_SOURCE_CANDIDATE / NOT_ACQUIRED | v3-owasp-developer-guide | reporting, remediation |

## Acquisition state

```text
RECOVERED_REFERENCES: 14
NEW_REFERENCES_SELECTED: 16
OPEN_FULL_TEXT_VERIFIED: 0 new in this gate
USER_LICENSED: 0
LICENSE_REQUIRED: commercial deep books not selected as corpus requirements yet
UNAVAILABLE: 0 confirmed
TOTAL_FULL_TEXT_READY: 14
```

Official candidate sources checked include CISA, NIST, MITRE, FIRST, OASIS,
SigmaHQ, and OWASP. Candidate pages are not counted as acquired documents.

```text
LEGACY_CHUNKS_TOUCHED: FALSE
```
