# ZAYRON-X — REPORT ERROR REGISTER & HALLUCINATION AUDIT (02)

This register documents the verified error categories and concrete instances across the 132 live production intelligence reports currently published on `zayron-x.co`.

---

## 1. Systematic Hallucination / Unsupported Claim Register

| Report ID | Claim | Claim Type | Why Unsupported | Expected Evidence | Actual Evidence | Knowledge Source | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **intel_000000001041de64** | "T1190: Exploit Public-Facing Application" | ATT&CK Mapping | Target is `libsoup` (an HTTP client library), not a public-facing server. It triggers when client fetches from malicious server. | Observed adversary network ingress into server daemon | Flaw in client library processing server `SETTINGS_INITIAL_WINDOW_SIZE` | Hardcoded default in `collector-do.ts` | **CRITICAL** | Omit ATT&CK mapping or map correctly to client-side exploitation if evidence supports. |
| **intel_000000001041de64** | "Technical risk analysis indicates immediate exploitation feasibility." | Vulnerability Analysis | Source text specifies abort/denial of service on bounds check failure without active exploit. | Working PoC or wild telemetry of memory execution | Raw advisory states client aborts without bounds check | Injected boilerplate | **HIGH** | Analyze root cause from text: "Denial of service via bounds check failure when HTTP/2 server shrinks window size." |
| **intel_000000001041de64** | "Severity: CRITICAL, Priority: P1" | Severity Vector | Source advisory lists official Red Hat CVSS Score as 5.9 (MEDIUM). | CVSS >= 9.0 or active wild exploitation | Explicit `CVSS Score: 5.9 (MEDIUM)` in body | Regex triggered on word "remotely" | **HIGH** | Parse `CVSS Score:` directly from body and honor vendor base severity. |
| **intel_000000001041de64** | "Source: Telegram Channel (Tier 1)" | Source Provenance | Telegram merely republished Red Hat's security advisory. | Red Hat Advisory errata URL / signing key | Reposted text on Telegram scraper | Default collector channel attribution | **HIGH** | Attribute `issuing_authority: "Red Hat"` and `collection_channel: "Telegram"`. |
| **intel_0000000061443c1c** | "T1190: Exploit Public-Facing Application" | ATT&CK Mapping | Lumma / Cobalt Strike abusing `node.exe` is local execution & persistence, not public-facing web exploit. | Web server exploit telemetry | Telemetry discusses Node.js binary abuse for execution/persistence | Hardcoded default in `collector-do.ts` | **CRITICAL** | Map to `T1059` (Command and Scripting Interpreter) or `T1574` (Hijack Execution Flow). |
| **intel_0000000061443c1c** | "Defenders must audit external interfaces and apply verified patches." | Defensive Actions | Threat is trojanized local script execution; no patch exists for malicious JS script. | Patch advisory from vendor | Blog post on technique abuse | Injected boilerplate | **HIGH** | Recommend EDR script monitoring (`node.exe` command-line auditing) rather than patching external interfaces. |
| **intel_0000000061443c1c** | "Source: Telegram Channel (Tier 1)" | Source Provenance | Source is Hendry Adrian's DFIR technical blog (`hendryadrian.com`). | Original blog telemetry | Telegram post summarizing blog | Injected Telegram source metadata | **HIGH** | Preserve `original_source: "hendryadrian.com"` as Tier 2 research. |

---

## 2. Statistical Breakdown of Systematic Errors Across All 132 Reports

1. **ATT&CK T1190 Overmapping (100% of reports — 132/132)**:
   - Every single vulnerability and malware report in the live database is mapped to `T1190 (Exploit Public-Facing Application)`.
   - **Error Type**: Factual & Epistemic Error. Converts an unobserved, context-specific initial access technique into a universal default.
2. **Boilerplate Section 03 & Section 06 Injection (98.5% of reports — 130/132)**:
   - `"Technical risk analysis indicates immediate exploitation feasibility."` is injected across 130 reports.
   - `"Defenders must audit external interfaces and apply verified patches."` is injected across 130 reports.
   - **Error Type**: Quality Gate & Epistemic Failure. Disguises template placeholder strings as genuine analytical reasoning.
3. **Severity Inflation (61.4% of reports — 81/132)**:
   - Medium and low severity CVEs (CVSS 3.0 to 6.5) are marked as `CRITICAL / P1`.
   - **Error Type**: Algorithmic Over-sensitization. Regex flags on descriptive words ("remotely", "exploit") rather than actual CVSS severity metrics.
4. **Source Authority Conflation (95.5% of reports — 126/132)**:
   - Reports list `Telegram Channel` as the sole authority and primary citation.
   - **Error Type**: Provenance Failure. Violates the core principle: "Never display Telegram as the issuing authority when the Telegram post merely republishes a vendor advisory."
5. **Static Simulated Knowledge Trace (100% of reports — 132/132)**:
   - Every vulnerability report lists `doc_ref_17_nvd_cvss` as `USED` and `doc_ref_04_amf` as `CONSIDERED_NOT_USED`.
   - **Error Type**: Deceptive Transparency. Simulates retrieval without querying the actual knowledge corpus or applying document content.
