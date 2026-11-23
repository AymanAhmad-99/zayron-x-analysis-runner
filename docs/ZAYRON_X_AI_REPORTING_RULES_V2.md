# ZAYRON-X — AI REPORTING RULES V2.0 (07)

These machine-enforceable rules govern every analytical LLM prompt, deterministic parser, and quality gate in the ZAYRON-X pipeline.

---

## 1. Zero-Tolerance Negative Constraints (Banned AI Behaviors)

1. **RULE 1: PROHIBITION OF SYNTHETIC ANALYSIS**
   - The AI MUST NOT generate synthetic phrases to satisfy template length requirements.
   - Banned phrases:
     - `"Technical risk analysis indicates immediate exploitation feasibility."`
     - `"Defenders must audit external interfaces and apply verified patches."`
     - `"Adversary activity tracking across enterprise attack surfaces."`
   - If technical depth is missing from the source signal, the section MUST be omitted or state: *"Technical mechanics not detailed in initial advisory."*

2. **RULE 2: PROHIBITION OF ATT&CK GUESSWORK**
   - The AI MUST NOT default to `T1190 (Exploit Public-Facing Application)`.
   - If an ATT&CK technique cannot be linked to a specific observed technical behavior in the telemetry, the output MUST be:
     `"No validated ATT&CK mapping established from current telemetry."`

3. **RULE 3: PROHIBITION OF SEVERITY OVERRIDES**
   - The AI MUST NOT override an official vendor CVSS base score or NVD rating based on descriptive prose.
   - If the advisory states `CVSS Score: 5.9 (MEDIUM)`, the report severity MUST be `MEDIUM`, not `CRITICAL`.
   - Threat priority can only be elevated to `P1` if corroborating evidence proves active in-the-wild exploitation (e.g. listed on CISA KEV).

4. **RULE 4: PROHIBITION OF PROVENANCE CONFLATION**
   - The AI MUST NOT cite a Telegram channel as the issuing authority when the message cites or forwards an advisory from Red Hat, Microsoft, Debian, or CISA.
   - The original issuing organization MUST be recorded as `original_source`, and Telegram MUST be recorded as `collection_source`.

5. **RULE 5: PROHIBITION OF HALLUCINATED CAPABILITIES**
   - The AI MUST NOT assign persistence, credential dumping, or lateral movement to a malware sample unless those behaviors were observed in the sample's sandbox analysis or specifically cited in the telemetry.

---

## 2. Positive Generation Requirements (Mandatory AI Behaviors)

1. **RULE 6: THE EVIDENCE LINKING MANDATE**
   - Every claim in Section 02 (`VERIFIED FACTS`) and Section 03 (`VULNERABILITY / MALWARE ANALYSIS`) must reference an `evidence_id` or direct excerpt.

2. **RULE 7: SEPARATION OF EXPLOIT CLAIMS**
   - Exploitation status must be categorized into exactly one state:
     - `NO_KNOWN_EXPLOIT`
     - `POC_EXISTS_PUBLICLY`
     - `WEAPONIZED_EXPLOIT_REPORTED`
     - `ACTIVE_WILD_EXPLOITATION_VERIFIED`

3. **RULE 8: KNOWLEDGE CITATION TRUTHFULNESS**
   - A knowledge document may only be marked as `USED` if a specific factual parameter or structured methodology chunk from that document was injected into the prompt and directly shaped the assessment.
