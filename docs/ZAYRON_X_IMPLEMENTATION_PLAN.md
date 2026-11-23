# ZAYRON-X — ENGINEERING IMPLEMENTATION PLAN (10)

This document outlines the precise, phased engineering tasks required to transition ZAYRON-X to Reporting Standard v2.0 once the audit is formally accepted.

---

## Phase 1: Ingestion & Parser Hardening (Collector DO)
1. **Vendor Advisory Key-Value Parser**:
   - Parse `Source: <vendor>`, `CVSS Score: <score> (<severity>)`, `Remotely Exploitable: <bool>`, and advisory URLs directly from Telegram message bodies.
   - Set `issuing_authority: <vendor>` and `collection_channel: "Telegram"`.
2. **Honoring Published CVSS & Severity**:
   - If `CVSS Score:` is present, map severity strictly to FIRST CVSS thresholds (0.1-3.9 Low, 4.0-6.9 Medium, 7.0-8.9 High, 9.0-10.0 Critical).
   - Prohibit keyword overrides from converting Medium vulnerabilities into Criticals unless listed on CISA KEV.

---

## Phase 2: Elimination of Synthetic Boilerplate & Hallucinated ATT&CK
1. **Purge Static Strings from `collector-do.ts`**:
   - Delete hardcoded strings:
     - `"Technical risk analysis indicates immediate exploitation feasibility."`
     - `"Defenders must audit external interfaces and apply verified patches."`
     - `"Adversary activity tracking across enterprise attack surfaces."`
2. **Strict ATT&CK Justification Gate**:
   - Eliminate unconditional fallback to `T1190`.
   - If no technique is explicitly justified by observed behavior, return an empty array or `"No validated ATT&CK mapping established."`

---

## Phase 3: True Knowledge Routing Integration
1. **Connect Collector DO to Real Knowledge Chunks**:
   - Ingest `KNOWLEDGE_CHUNKS_CORPUS` directly into the worker or query the knowledge routing service rather than returning static simulation objects.
   - Enforce domain guards: Disallow memory forensics chunks from entering remote CVE reports unless memory artifacts are present in telemetry.

---

## Phase 4: UI & Public Route Consolidation
1. **Deprecate `/articles` and `/reports/[id]`**:
   - Remove `/articles` from navigation.
   - Redirect `/reports/[id]` to `/intelligence/[id]`.
2. **Dossier UI Polish**:
   - Refactor `/intelligence/[id]` to cleanly render the 10-section V2.0 template with collapsible Knowledge Applied drawer and Raw Ingestion Payload drawer.

---

## Phase 5: Verification & Acceptance
1. Update test suite with regression tests checking that:
   - No report contains the banned boilerplate strings.
   - Non-web vulnerabilities do not receive `T1190`.
   - Vendor CVSS scores are preserved without artificial inflation.
   - Telegram is never listed as the issuing authority for vendor advisories.
