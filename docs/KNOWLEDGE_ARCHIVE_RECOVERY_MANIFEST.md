# Knowledge Archive Recovery Manifest

Recovery is read-only. No R2 object was moved, deleted, or overwritten.

Authoritative local archive discovered: `.zayron/knowledge/physical-15`.
The deployment configuration identifies the legacy R2 bucket as `zayron-x-knowledge`.

## Recovered objects

| # | Document ID | Title | Legacy/local key | Size | SHA-256 | Full text | Status |
|---:|---|---|---|---:|---|---|---|
| 1 | doc-01-heuer-psychology | Psychology of Intelligence Analysis | physical-15/01-heuer-psychology.pdf | 1,904,188 | BC703F2140E39E14E277C1277A84055A2529161F90DB6633136F5457B6C60849 | YES | RECOVERED_FULL_TEXT |
| 2 | doc-03-nist-sp-800-150 | NIST SP 800-150 | physical-15/03-nist-sp-800-150.pdf | 509,487 | C9ADE17B8524D0BAE4F77E4AEFA79F0B752CA18DCAF01C84214BF2B8A05376F8 | YES | RECOVERED_FULL_TEXT |
| 3 | doc-04-nist-sp-800-86 | NIST SP 800-86 | physical-15/04-nist-sp-800-86.pdf | 2,818,618 | EA7EB645BCD3FEAF3AB9EA7DFC3C8987A08BF260C40682DF1E5E8292BF9FE9B4 | YES | RECOVERED_FULL_TEXT |
| 4 | doc-05-nist-sp-800-61r3 | NIST SP 800-61 Rev. 3 | physical-15/05-nist-sp-800-61r3.pdf | 1,040,566 | E5593D6BB85DAECEC7E8D9549400C7B3473BCC3F06E469C82218073AFA7FBA2D | YES | RECOVERED_FULL_TEXT |
| 5 | doc-06-nist-csf-2 | NIST CSF 2.0 | physical-15/06-nist-csf-2.pdf | 1,518,858 | 3C31F46FEE98CAC0C4323453E5109291A213B4DE7FEF8C058AF9BF67F717433C | YES | RECOVERED_FULL_TEXT |
| 6 | doc-07-first-cvss4 | FIRST CVSS v4.0 | physical-15/07-first-cvss4.html | 118,046 | 888A1511D51140291EE84EBAE103C92FB129DC2DE41557D1FA23FDEFC674B328 | YES | RECOVERED_FULL_TEXT |
| 7 | doc-08-first-epss | FIRST EPSS | physical-15/08-first-epss.html | 26,804 | 8296EDEE51C9665F408209E3ED27213F3E6A9E44D23FB4A48277C23A36668A1F | YES | RECOVERED_FULL_TEXT |
| 8 | doc-09-mitre-attack | MITRE ATT&CK Enterprise | physical-15/09-mitre-attack.json | 53,835,637 | DC1639CAA5501D720E280CF1CBD8FBE009884A0C9B3E6E9ED9D0C25166C3D8F4 | YES | RECOVERED_FULL_TEXT |
| 9 | doc-10-oasis-stix21 | OASIS STIX 2.1 | physical-15/10-oasis-stix21.pdf | 6,133,192 | EBF562ADC1F20216CCBBEA958A492292BD9A54496FDD834A6331EDE405614EB3 | YES | RECOVERED_FULL_TEXT |
| 10 | doc-11-oasis-taxii21 | OASIS TAXII 2.1 | physical-15/11-oasis-taxii21.pdf | 1,275,632 | 28D19DD11F3B4558B0CCFDA2205F163D8EB62C52BEC8E073B0DA29831D250213 | YES | RECOVERED_FULL_TEXT |
| 11 | doc-12-nist-ai-rmf | NIST AI RMF 1.0 | physical-15/12-nist-ai-rmf/NIST.AI.100-1.pdf | 1,946,127 | 7576EDB531D9848825814EE88E28B1795D3A84B435B4B797D3670EAFDC4A89F1 | YES | RECOVERED_FULL_TEXT |
| 12 | doc-13-nist-genai-profile | NIST GenAI Profile | physical-15/13-nist-genai-profile/NIST.SP.600-1.pdf | 1,174,643 | 6E73620AB6B64E90EF2C04BF0E0D6246185A2F4B1B13CAB0DF494496CFF89B6A | YES | RECOVERED_FULL_TEXT |
| 13 | doc-14-nist-sp-800-53 | NIST SP 800-53 Rev. 5 | physical-15/14-nist-sp-800-53/NIST.SP.800-53r5.pdf | 6,073,678 | FC63BCD61715D0181DD8E85998B1E6201AE3515FC6626102101CAB1841E11EC6 | YES | RECOVERED_FULL_TEXT |
| 14 | doc-15-owasp-top10 | OWASP Top 10 | physical-15/15-owasp-top10/owasp-top10.html | 71,432 | E9D0D652F54B9F882101DA06E1A23B8A9D3BE9E4560424AB3A7A5374D0FFB6C2 | YES | RECOVERED_FULL_TEXT |

## Archive findings

The local archive contains 14 non-zero source objects and a derived processing artifact with 35,185 chunks. The acquisition records show 14 source entries; two additional manifest rows are duplicate references to the NIST 800-150 and 800-86 files. The CISA KEV JSON listed in the manifest is absent from the local source-object inventory and is therefore not counted as recovered full text here.

No R2 API listing was available through the installed Wrangler CLI; the CLI supports object get/put/delete but not bucket listing. The bucket identity is therefore configuration-derived, while the recoverable object inventory above is filesystem-verified.

```text
LEGACY_KNOWLEDGE_STORE_FOUND: YES (configuration + preserved local archive)
LEGACY_OBJECT_COUNT: 14 source objects
PREVIOUS_CORPUS_REFERENCES_FOUND: 15 manifest entries / 14 unique source objects
FULL_TEXT_RECOVERED: 14
METADATA_ONLY: 1 manifest-only CISA KEV entry
NOT_FOUND: 1 source entry (CISA KEV JSON)
CORRUPTED: 0 observed
DUPLICATES: 2 manifest aliases (NIST SP 800-150 and SP 800-86)
TARGET_REFERENCES: 30
ALREADY_RECOVERED_FOR_TARGET: 14
REMAINING_TARGET_GAPS: 16
```

## Initial domain coverage

`INTELLIGENCE_TRADECRAFT`, `ANALYTICAL_REASONING`, `BIAS / UNCERTAINTY`, `CTI`, `VULNERABILITY_INTELLIGENCE`, `DFIR`, `INCIDENT_RESPONSE`, `SECURITY_ENGINEERING`, `ATTACK_TAXONOMY`, `VULNERABILITY_TAXONOMY`, and `REPORTING` have meaningful coverage. `MALWARE`, `REVERSE_ENGINEERING`, `NETWORK_ANALYSIS`, and `DETECTION_ENGINEERING` are present only at partial depth. Commercial deep-book coverage remains unverified and requires lawful licensing/access.

No chunking, embeddings, Vectorize ingestion, FTS ingestion, AI retrieval, or production writes were performed in this recovery gate.
