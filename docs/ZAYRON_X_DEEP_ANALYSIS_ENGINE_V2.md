# ZAYRON-X — DEEP INTELLIGENCE ANALYSIS ENGINE v2
## Analytical Reasoning Layer Specification & Production Architecture Document

**Author**: Principal Threat Intelligence Architect, Senior CTI Analyst, Detection Engineering Lead, Knowledge Systems Architect, AI Safety Engineer  
**Date**: September 2026  
**Status**: APPROVED & IMPLEMENTED  
**Version**: 2.0.0  
**Scope**: `packages/intelligence`, `workers/telegram-collector-do`, `apps/web`

---

## 1. Executive Summary & Core Principle

ZAYRON-X must operate as an evidence-grounded intelligence analysis engine, not an LLM article generator. The foundational doctrine of ZAYRON-X is:

```text
RAW SIGNAL
→ VERIFIED EVIDENCE
→ ENTITY RESOLUTION
→ SOURCE / PROVENANCE CLASSIFICATION
→ AUTHORITATIVE DATA ENRICHMENT (CVE / NVD / KEV / EPSS / ATT&CK)
→ DOMAIN-AWARE KNOWLEDGE RETRIEVAL (12 Master References)
→ METHODOLOGY REASONING & PRECONDITION GATING
→ STRUCTURED CLAIM GENERATION
→ CONTRADICTION DETECTION & RESOLUTION
→ CONFIDENCE CALIBRATION (Multi-dimensional)
→ QUALITY & SAFETY GATE (7 Validation Stages)
→ CANONICAL 10-SECTION REPORT COMPILATION
```

The system strictly enforces the rule:
> **The AI must NEVER skip directly from RAW TELEGRAM TEXT to a NARRATIVE REPORT.**
> **TEXTBOOK KNOWLEDGE IS METHODOLOGY, NOT INCIDENT EVIDENCE.**

---

## 2. Current Architecture (v1.0 Baseline & P0 Remediation)

The P0/P1 remediation eliminated hallucinated ATT&CK mappings (e.g. ungrounded T1190), banned synthetic boilerplate, stopped Telegram from being declared an issuing authority when forwarding vendor errata, and suppressed fabricated knowledge traces.

However, the v1.0 pipeline possessed structural limitations:
1. **Implicit Claim Compilation**: Analytical statements were formulated as structured text blocks rather than discrete, typed, evidence-linked Claim objects.
2. **Coarse Knowledge Gating**: Knowledge retrieval relied primarily on token overlap and broad domain matches without validating whether the case telemetry fulfilled the *preconditions* of the retrieved methodology (e.g., retrieving *Art of Memory Forensics* for an advisory without a memory dump).
3. **Collapsed Vulnerability Dimensions**: Vulnerability presence, public exploit existence, and active exploitation in the wild were tracked in aggregate rather than as distinct operational states.
4. **Binary Quality Gate**: Gate checks were largely regex-based rather than schema-governed claim graphs.

---

## 3. Proposed Analytical Architecture (Engine v2)

The Engine v2 introduces a modular, deterministic, evidence-grounded reasoning layer:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ZAYRON-X ENGINE v2                              │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Telemetry Ingestion & Source Provenance                             │
│    - Issuing Authority vs. Collection Channel                          │
│    - Source Authority Tiers (Primary, Secondary, Community)            │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Authoritative Enrichment Engine                                     │
│    - CVE/NVD Base Score, Vector Breakdown, Attack Surface Preconditions│
│    - CISA KEV (Known Exploited Vulnerabilities) Verification           │
│    - FIRST EPSS (Exploit Prediction Scoring System) Probability        │
│    - MITRE ATT&CK Authoritative Dataset Cross-Referencing              │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Domain-Aware Knowledge Router & Precondition Gate                   │
│    - Domain Classification across 16 Analytical Disciplines            │
│    - Real Retrieval across 12 Master Knowledge Assets (Foundational)   │
│    - Precondition Validator: Book = Methodology ONLY                   │
│    - Machine-Enforced: No Memory Forensics without Dump Telemetry      │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Structured Claim & Contradiction Graph                              │
│    - Grounded Claims: VERIFIED_FACT, OBSERVED_BEHAVIOR,                │
│      SUPPORTED_INFERENCE, ANALYST_ASSESSMENT, UNKNOWN                  │
│    - Discrepancy & Contradiction Resolver (Vendor vs. Aggregator)      │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Multi-Stage Publication Quality Gate (7 Stages)                     │
│    - Source, Claim, Knowledge, ATT&CK, Provenance, Confidence,         │
│      Report Consistency                                                │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Canonical 10-Section Report Compiler                                │
│    - Adaptive Depth Scaling: LOW (Fact-Centered), MODERATE, HIGH (Deep)│
│    - Actionable Defensive Guidance (Exact queries/IOCs, no fluff)      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Knowledge-Routing Design & The 12 Master Assets

### 4.1 Knowledge Doctrine: Methodology vs. Incident Evidence
Textbooks and standards document *how to analyze*, *how systems behave*, and *what patterns mean*. They do not prove what happened in a specific target network.

| Component | Nature | Role in ZAYRON-X Engine v2 |
| :--- | :--- | :--- |
| **Telemetry / Evidence** | Case Fact | Proves that an event, byte sequence, packet, or advisory occurred. |
| **Knowledge Book / Standard** | Analytical Methodology | Interprets the mechanism, validates root cause, guides triage, derives detection logic. |
| **Assessment** | Synthesis | Connects evidence to knowledge with explicit uncertainty bounds. |

### 4.2 Precondition Gating Matrix for the 12 Core Assets
Before any knowledge chunk is tagged as `USED`, the case telemetry must satisfy explicit evidentiary preconditions:

| Document ID | Canonical Title | Primary Domain | Evidentiary Precondition to Mark `USED` |
| :--- | :--- | :--- | :--- |
| `doc_ref_01_pma` | Practical Malware Analysis | Malware Analysis | Binary sample, disassembly, IAT strings, or PE telemetry present. |
| `doc_ref_02_mac` | Malware Analyst's Cookbook | Reverse Engineering | Malware artifacts, deobfuscation, packer telemetry, or shellcode. |
| `doc_ref_03_rh` | Rootkit Hunter / Subverting Windows Kernel | Windows Internals | Kernel driver, SSDT/IDT hooks, DKOM, or ring-0 telemetry. |
| `doc_ref_04_amf` | The Art of Memory Forensics | Memory Forensics | Memory dump, VAD tree, memory injection, or Volatility artifact. |
| `doc_ref_05_pnsm` | Practical Packet Analysis / NSM | Network Security Monitoring | PCAP, Zeek/Suricata logs, NetFlow, or network payload trace. |
| `doc_ref_06_wint` | Windows Internals (7th Ed) | Windows Internals | Windows API, LPC/ALPC, token privileges, LSASS, or handle telemetry. |
| `doc_ref_07_lins` | Linux Security & Kernel Exploitation | Linux Security | Linux syscalls, eBPF, ELF binaries, cgroups, or container escape. |
| `doc_ref_08_cisa` | CISA Known Exploited Vulnerabilities | Vuln Management | CVE identifier actively tracked or evaluated against CISA KEV catalog. |
| `doc_ref_09_epss` | FIRST EPSS Methodology & Scoring | Vuln Management | CVE identifier requiring empirical exploit probability calculation. |
| `doc_ref_10_mitre`| MITRE ATT&CK Enterprise Matrix | ATT&CK Framework | Explicit observed behavioral technique telemetry requiring validation. |
| `doc_ref_11_d3f` | MITRE D3FEND Matrix | Defensive Countermeasures | Architectural defensive countermeasure derivation from observed TTPs. |
| `doc_ref_12_diamond`| The Diamond Model of Intrusion Analysis | CTI Methodology | Multi-source adversary infrastructure, capability, and victim tracking. |

If preconditions are not satisfied, the candidate is marked `CONSIDERED_NOT_USED` with a transparent audit reason. If retrieval did not execute, `knowledge_trace = []`.

---

## 5. Claim / Evidence Model

The intelligence reasoning engine operates on an explicit **Claim Graph**:

```typescript
export interface GroundedClaimItemV2 {
  claim_id: string;
  claim_type:
    | 'VERIFIED_FACT'        // Direct empirical observation in telemetry/official errata
    | 'OBSERVED_BEHAVIOR'     // Execution/telemetry behavior recorded in incident data
    | 'SUPPORTED_INFERENCE'   // Logical deduction supported by evidence + methodology
    | 'ANALYST_ASSESSMENT'    // Strategic or operational assessment of significance
    | 'UNKNOWN';              // Explicit visibility gap or unresolved element
  statement: string;
  evidence_ids: string[];
  knowledge_ids: string[];
  source_ids: string[];
  confidence: number;
  epistemic_status: 'OBSERVED' | 'INFERRED' | 'CONTEXTUAL' | 'UNRESOLVED';
  timestamp: string;
  rationale: string;
}
```

### Claim Rules Machine-Enforced:
1. A claim typed `VERIFIED_FACT` **must** have `evidence_ids.length > 0`.
2. A claim typed `SUPPORTED_INFERENCE` **must** reference both evidence and knowledge (or authoritative metadata).
3. A claim typed `OBSERVED_BEHAVIOR` cannot rely solely on textbook descriptions.

---

## 6. Confidence Model

Engine v2 isolates confidence from severity, priority, and source reputation into an explainable multi-dimensional vector:

```typescript
export interface ConfidenceMatrixV2 {
  source_reliability: number;     // 0.0 - 1.0 (Tier 1 Vendor = 0.95, Community = 0.50)
  evidence_strength: number;      // 0.0 - 1.0 (Direct cryptographic hash/PCAP vs. unverified text)
  analytical_confidence: number;  // 0.0 - 1.0 (Corroboration & methodology grounding)
  overall_confidence: number;     // Weighted compound calculation
  confidence_rating: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_EVIDENCE';
  calibration_rationale: string;
}
```

Confidence is degraded if:
- Single secondary source without corroboration.
- Contradictory reporting between vendor and community aggregators.
- Ambiguous technical observables.

---

## 7. Source & Provenance Model

Every report tracks full chain-of-custody metadata:

```typescript
export interface SourceProvenanceItemV2 {
  source_id: string;
  issuing_authority: string;      // e.g. "Red Hat Product Security", "SonicWall PSIRT"
  collection_channel: string;     // e.g. "@cveNotify", "Internal Telemetry Shard 2"
  source_tier:
    | 'PRIMARY_FACT_SOURCE'       // Vendor PSIRT, CERT/CC, CISA, Kernel maintainer
    | 'SECONDARY_RESEARCH'        // Threat research blogs, academic papers
    | 'COMMUNITY_DISCOVERY'       // Telegram channels, social aggregators, forums
    | 'METHODOLOGY'               // Reference books, standards bodies
    | 'TELEMETRY';                // Live endpoint/network sensors
  reference_url: string | null;
  observed_at: string;
  published_at: string;
  retrieved_at: string;
  content_hash: string;
}
```

---

## 8. Authoritative Data Enrichment (CVE / NVD / KEV / EPSS / ATT&CK)

To prevent conflation of threat dimensions, Engine v2 enforces clean structural separation:

```typescript
export interface AuthoritativeEnrichmentV2 {
  cve_id: string | null;
  cvss_score: number | null;
  cvss_severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  cvss_vector: string | null;
  cvss_vector_breakdown?: {
    attack_vector?: 'NETWORK' | 'ADJACENT' | 'LOCAL' | 'PHYSICAL';
    privileges_required?: 'NONE' | 'LOW' | 'HIGH';
    user_interaction?: 'NONE' | 'REQUIRED';
    scope?: 'UNCHANGED' | 'CHANGED';
    impact_confidentiality?: 'HIGH' | 'LOW' | 'NONE';
    impact_integrity?: 'HIGH' | 'LOW' | 'NONE';
    impact_availability?: 'HIGH' | 'LOW' | 'NONE';
  };
  exploit_status:
    | 'VULNERABILITY_EXISTS'
    | 'PUBLIC_EXPLOIT_EXISTS'
    | 'EXPLOITATION_OBSERVED'
    | 'EXPLOITATION_IN_THE_WILD';
  cisa_kev: {
    is_in_kev: boolean;
    date_added?: string;
    ransomware_campaign_use?: boolean;
    required_action?: string;
  };
  epss: {
    score: number;       // 0.0 to 1.0 (empirical exploitation probability)
    percentile: number;  // Relative percentile
  };
  analyst_priority: 'P1' | 'P2' | 'P3' | 'P4';
}
```

---

## 9. Contradiction Detection & Discrepancy Resolution

When sources conflict, Engine v2 resolves using the **Authoritative Source Hierarchy**:
1. **Primary Issuing Authority (Vendor/PSIRT)** supersedes Community Aggregators on CVSS base score, affected version ranges, and official patches.
2. **CISA KEV / Telemetry Evidence** supersedes Vendor Claim of "No known exploitation" if empirical telemetry confirms in-the-wild activity.
3. Both perspectives are explicitly preserved in the report under `CONTRADICTIONS & UNCERTAINTIES`.

---

## 10. Adaptive Depth & Report Compiler (10 Canonical Sections)

The report compiler adapts report depth based on evidence density:
- **LOW Evidence**: Short, fact-centered report (focuses on facts, advisory scope, explicit unknowns).
- **MODERATE Evidence**: Facts + technical analysis + preconditions + defensive mitigations.
- **HIGH Evidence**: Deep analysis + TTP validation + concrete detection engineering + operational risk.

### The 10 Canonical Sections:
1. **01 — EXECUTIVE ASSESSMENT**: Immediate strategic and operational takeaway.
2. **02 — VERIFIED FACTS**: Grounded facts with source citations only.
3. **03 — TECHNICAL ANALYSIS**: Technical mechanism grounded in evidence and methodology.
4. **04 — THREAT & EXPLOITATION CONTEXT**: Exploit availability, KEV status, EPSS probability.
5. **05 — EVIDENCE MATRIX**: Evidence chain, hashes, weights, and provenance.
6. **06 — ATT&CK MAPPING**: Validated mappings only (no evidence = NO MAPPING).
7. **07 — DEFENSIVE & DETECTION ACTIONS**: Exact observables, patches, Sigma/YARA/Zeek queries when detail exists.
8. **08 — UNKNOWN / UNRESOLVED**: Visibility gaps, unconfirmed affiliates, unverified claims.
9. **09 — KNOWLEDGE APPLIED**: Auditable trace of books/standards used and why.
10. **10 — REFERENCES & PROVENANCE**: Primary citations, issuing authorities, and collection vehicles.

---

## 11. Multi-Stage Publication Quality Gate (7 Stages)

```
[STAGE 1: SOURCE VALIDATION]
   └── Verifies issuing authority, collection channel, and anti-recursion firewall.
[STAGE 2: CLAIM VALIDATION]
   └── Checks every claim for valid epistemic status and supporting evidence.
[STAGE 3: KNOWLEDGE VALIDATION]
   └── Verifies books are not used as incident evidence and preconditions are met.
[STAGE 4: ATT&CK VALIDATION]
   └── Rejects any technique lacking behavioral telemetry.
[STAGE 5: PROVENANCE VALIDATION]
   └── Checks content hash, timestamps, and reference URLs.
[STAGE 6: CONFIDENCE VALIDATION]
   └── Ensures confidence score meets publication threshold (>= 0.35).
[STAGE 7: REPORT CONSISTENCY]
   └── Ensures no banned boilerplate, no promotional fluff, and strict section integrity.
```

---

## 12. Test Strategy & Test Cases A–G

| Case | Scenario | Expected Engine Behavior |
| :--- | :--- | :--- |
| **Case A** | Medium CVSS (e.g. 5.9) with alarming keywords ("remote", "exploit") | CVSS 5.9 authoritative; severity remains MEDIUM; no inflation. |
| **Case B** | Vulnerability advisory with zero network/server telemetry | Zero ATT&CK techniques mapped (NO MAPPING stated). |
| **Case C** | Malware telemetry with confirmed process injection evidence | Maps T1055 only if behavioral telemetry supports it. |
| **Case D** | Incident report containing memory dump and volatility artifacts | Memory Forensics knowledge (`doc_ref_04_amf`) marked `USED`. |
| **Case E** | Brief vendor advisory with no deep technical telemetry | Short fact-centered report; does not invent synthetic depth. |
| **Case F** | Vendor claims CVSS 5.3 / no exploit; aggregator claims Critical / 0-day | Contradiction detected; vendor score preserved; conflict documented. |
| **Case G** | Relevant book available but retrieval bypassed/not executed | Knowledge trace is strictly empty (`knowledge_trace = []`); book never marked `USED`. |

---

## 13. System Measurement Metrics

1. **Evidence Grounding Score (EGS)**: Percentage of report claims backed by verified evidence snippets ($EGS \ge 95\%$).
2. **Claim Support Rate (CSR)**: Ratio of supported claims to total claims ($CSR = 1.00$).
3. **Unsupported Claim Rate (UCR)**: Percentage of assertions lacking evidence or citation ($UCR = 0.00\%$).
4. **ATT&CK Precision**: Correctly mapped techniques with evidentiary backing ($100\%$).
5. **Provenance Accuracy**: Proper separation of issuing vendor from Telegram collection vehicle ($100\%$).
6. **CVSS Accuracy**: Agreement between extracted advisory CVSS and published report severity ($100\%$).
7. **Knowledge Usage Accuracy**: Percentage of `USED` books meeting evidentiary preconditions ($100\%$).
8. **Publication Safety Rate**: Percentage of malformed or noise inputs safely quarantined ($100\%$).

---

## 14. Implementation & Production Rollout Strategy

1. **Staging & Evaluation Path**: Implement `/api/v1/intelligence/preview` in `collector-do.ts` for real-time comparison between v1 truthful reports and v2 deep analytical reports.
2. **Deterministic Engine Implementation**: Implement `DeepIntelligenceEngineV2` in `packages/intelligence/src/engine_v2/`.
3. **Collector DO Integration**: Wire `collector-do.ts` to use `DeepIntelligenceEngineV2` for canonical normalization, claim evaluation, and publication gating.
4. **End-to-End Regression Verification**: Run complete test suite covering all cases A–G, deploy to Cloudflare, and verify production behavior.
