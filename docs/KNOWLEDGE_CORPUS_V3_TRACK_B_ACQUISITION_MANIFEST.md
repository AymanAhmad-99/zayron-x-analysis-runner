# Knowledge Corpus v3 — Track B acquisition manifest

This gate is limited to the 16 planned references. Originals are stored under
`.zayron/knowledge/corpus-v3/track-b/originals` and, for acquired items, in
the immutable-keyed `zayron-x-intelligence-raw` R2 namespace
`knowledge/raw/{document_id}/{sha256}/original.{ext}`. The frozen legacy
35,185-chunk corpus was not read or modified.

Retrieved: 2026-09-08. Hashes below are independently computed from the local
files after download. `KNOWLEDGE_READY` is deliberately not asserted until a
separate quality review clears parser duplicate findings and source-specific
classification/citation review.

| # | Planned reference | Canonical/ resolved title | Type | Official source | Actual file | License | Version/status | Document ID | Size | SHA-256 | Parser | Status |
|---:|---|---|---|---|---|---|---|---|---:|---|---|---|
|15|CISA CTI Feed Value White Paper|Assessing the Potential Value of Cyber Threat Intelligence Feeds|PDF|CISA|No|Open government source not acquired|URL returned 404|v3-cisa-cti-feed-value|—|—|Not run|ACQUISITION_FAILED |
|16|CISA Cybersecurity Incident & Vulnerability Response Playbooks|Cybersecurity Incident & Vulnerability Response Playbooks|PDF|CISA|Yes|Open government source|Current guidance artifact; date requires source review|v3-cisa-response-playbooks|1,159,167|`ba8ab05388a8a81ec2bafce79dd377d9d7454ef00aef4dcbe2f3de20d46c25cb`|97 nodes / 97 objects|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |
|17|CISA Low Regret CTI Triage Methodology|Applying a Low Regret Methodology to Cyber Threat Intelligence Triage|PDF|CISA|No|Open government source not acquired|URL returned 404|v3-cisa-low-regret-cti|—|—|Not run|ACQUISITION_FAILED |
|18|MITRE CWE|Common Weakness Enumeration (CWE) current XML catalog|ZIP/XML|MITRE CWE|Yes|Open taxonomy source|Latest catalog|v3-mitre-cwe|2,021,351|`3976f599e5e5200219a3108bb896d06e2a88fbb293369e1883cb423a5e9d7d50`|Format-specific parser pending|FULL_TEXT_ACQUIRED; HASH_VERIFIED |
|19|MITRE CAPEC|Common Attack Pattern Enumeration and Classification (CAPEC) current XML catalog|XML|MITRE CAPEC|Yes|Open taxonomy source|Latest catalog|v3-mitre-capec|3,849,998|`70279a2dff0cb0ad79e546adb07828335a704ad5210e047e09e986172fc9e34d`|Format-specific parser pending|FULL_TEXT_ACQUIRED; HASH_VERIFIED |
|20|Sigma Rules Specification|Sigma Specification|HTML|SigmaHQ|Yes|Open specification|Current web specification|v3-sigma-specification|7,300|`63b2931885e386829135e7aaf1593bfd3673fd5dd3eb896bb49ae9cd4d2883d2`|19 nodes / 19 objects|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |
|21|NIST SP 800-92 Log Management|Guide to Computer Security Log Management|PDF|NIST|Yes|Open government publication|SP 800-92, legacy publication|v3-nist-800-92|1,759,842|`466c3ab1580bc3b2e25d11bbd4b2ac92fd1762b3c5b10596924981bc1b9e61e1`|243 nodes / 238 objects; duplicates 3|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED; HISTORICAL_REFERENCE |
|22|NIST SP 800-218 SSDF|Secure Software Development Framework (SSDF) Version 1.1|PDF|NIST|Yes|Open government publication|SP 800-218, current|v3-nist-800-218|739,891|`617746e553a9e2da49bfbd4eef0dfc3094758a39b869314e4173ac36605cde22`|301 nodes / 301 objects; duplicates 34|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |
|23|NIST SP 800-101 Mobile Device Forensics|Guidelines on Mobile Device Forensics|PDF|NIST|Yes|Open government publication|SP 800-101 Rev. 1|v3-nist-800-101|1,338,568|`efd3f02258276fb294d62a73bb0a6ec80051fd625d5197584220beaface31718`|213 nodes / 213 objects; duplicates 6|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |
|24|NIST SP 800-40 Vulnerability Management|Guide to Enterprise Patch Management Planning: Preventive Maintenance for Technology|PDF|NIST|Yes|Open government publication|SP 800-40 Rev. 4, current|v3-nist-800-40|562,944|`351f4a828d6c0bc8bf98f25ba3f87ec5add0ed8cf8bb4a6e6cb4e7e4a9731833`|69 nodes / 69 objects; duplicates 2|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |
|25|OWASP Web Security Testing Guide|Web Security Testing Guide|HTML|OWASP|Yes|Open guide|Current web edition|v3-owasp-wstg|112,624|`1938859b686ba567cc0c7aad2a5914bdd3e38d909b28e86d6b01c5e75ea4ed26`|11 nodes / 11 objects|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |
|26|OWASP ASVS|Application Security Verification Standard|PDF|OWASP|No|Open standard; release asset URL not acquired|Release URL returned 404|v3-owasp-asvs|—|—|Not run|ACQUISITION_FAILED |
|27|CISA Malware Analysis / Incident Guidance|Technical Approaches to Uncovering and Remediating Malicious Activity|PDF|CISA|No|Open government source not acquired|Candidate URL returned 404; exact current title unresolved|v3-cisa-malware-guidance|—|—|Not run|ACQUISITION_FAILED |
|28|NIST Network Security Monitoring guidance|Guide to Intrusion Detection and Prevention Systems (IDPS)|PDF|NIST|Yes|Open government publication|SP 800-94, historical reference|v3-nist-network-monitoring|1,060,429|`289c2ed27f7e3aac41624bf2e6fad268642bad2dabe352a5ab28fa169824a96e`|486 nodes / 486 objects; duplicates 21|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED; HISTORICAL_REFERENCE |
|29|CISA Threat Hunting guidance|Best Practices for MITRE ATT&CK Mapping|PDF|CISA|No|Open government source not acquired|Candidate URL returned 404; capability/title requires resolution|v3-cisa-threat-hunting|—|—|Not run|ACQUISITION_FAILED |
|30|OWASP Secure Coding / Developer guidance|OWASP Developer Guide|PDF|OWASP|Yes|Open guide|Retrieved official export|v3-owasp-developer-guide|5,734,917|`fabee410318a2bb8a80c85caa5f1cce184bd7eeee44c6c2f5b46b50a31c647a7`|331 nodes / 331 objects|FULL_TEXT_ACQUIRED; HASH_VERIFIED; STRUCTURALLY_PARSED |

## Gate totals

```text
PLANNED_NEW_REFERENCES: 16
EXACT_NEW_FULL_TEXT_ACQUIRED: 11
EXACT_NEW_PARSED: 8
EXACT_NEW_KNOWLEDGE_OBJECTS: 1746
EXACT_NEW_LICENSE_REQUIRED: 0
EXACT_NEW_UNAVAILABLE: 0 confirmed (5 acquisition gaps remain unresolved)
EXACT_NEW_DUPLICATES: 0 bibliographic duplicates; parser-local duplicate object IDs were retained as a quality finding, not emitted as a second document
R2_ORIGINALS_UPLOADED: 11
TOTAL_CORPUS_REFERENCES: 25 (14 previously recovered + 11 acquired)
TOTAL_FULL_TEXT_READY: 25 at source-file level; 8 newly structurally parsed
TOTAL_KNOWLEDGE_READY: 0 newly promoted pending quality review
EMBEDDING_STATUS: EMBEDDING_PENDING
VECTORIZE_STATUS: NOT_RUN
FTS_STATUS: NOT RUN; local canonical representations only
LEGACY_CHUNKS_TOUCHED: FALSE
PUBLICATION: DISABLED
SOURCE_ACTIVATION: DISABLED
BILLING: DISABLED
```

The acquired artifacts are knowledge references only. They do not create
case-specific evidence, prove an observed incident, or alter the Source Fabric
evidence pipeline.
