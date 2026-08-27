# ZAYRON-X — PAGE PATTERN SPECIFICATION

**Authority:** Master Visual Source of Truth  
**Status:** CANONICAL & APPLICABLE TO ALL ROUTES  

---

## 1. Universal Layout Structure
Every page on the ZAYRON-X platform strictly adheres to the **Three-Zone Shell**:
1. **Global Institutional Header**: 60px fixed/sticky, `#F5F4F0` base background, 1px bottom border.
2. **Main Content Canvas**: Maximum content width 1280px, padded 24px (mobile) to 48px (desktop), organized via explicit **Chapter Sections**.
3. **Institutional Trust Footer**: Universal 4-column reference structure with legal/source integrity notice.

---

## 2. Page-Specific Archetypes

### Pattern A: Intelligence Landing (`/`)
- **Density**: Low to Medium.
- **Hero**: Display Serif Headline + Live Floating Threat Assessment Card.
- **Section Progression**: Chapter 01 (Identity) → Chapter 02 (Value Grid) → Chapter 03 (Standards Ribbon) → Chapter 04 (Method Pipeline) → Chapter 05 (Entity Graph) → Chapter 06 (Dossier + Wire + Heatmap) → Chapter 07 (Research Index) → Chapter 08 (Action Stepper) → Chapter 09 (Understated Pricing) → Chapter 10 (Trust Matrix) → Chapter 11 (Footer).

### Pattern B: Intelligence Stream / Wire (`/intelligence`)
- **Density**: Medium to High.
- **Header**: Active Telemetry Status + Real-Time Filtering Bar (Severity, Entity Type, Confidence).
- **Core Unit**: Interactive Wire Feed with expandable inline summaries and direct link to Full Assessment.
- **Right Rail**: Live Heatmap Activity Chart + Top Compromised Assets.

### Pattern C: Threat & Vulnerability Dossier (`/threats/[slug]`, `/vulnerabilities/[id]`)
- **Density**: High (Deep Investigation Surface).
- **Header Block**: Split Severity Badge (`CRITICAL`) + Confidence Score (`96% Verified`) + CVE ID.
- **Executive Synthesis**: Editorial H2 summary answering *"What changed?"* and *"Why does it matter?"*.
- **Correlation Rail**: Radial Threat Actor Graph + Evidence Ingestion Provenance + YARA/Sigma Rule box.
- **Technical Indicator Matrix**: Collapsible table of IPv4, SHA256, Domain, and Registry IOCs with single-click copy.

### Pattern D: Entity Dossiers (`/actors/[id]`, `/malware/[id]`, `/campaigns/[id]`)
- **Density**: High.
- **Entity Identity Bar**: Known Aliases, Threat Level, Origin, Targeted Sectors.
- **Network Graph**: Central entity node connecting directly to associated infrastructure and campaigns.
- **Observed Activity Timeline**: Chronological bar/event map of confirmed attacks.

### Pattern E: Knowledge & Regulatory Center (`/knowledge`, `/regulations`)
- **Density**: Medium (Archive / Institutional Research Feel).
- **Structure**: Clean 2-column or 3-column curated grid of formal frameworks (MITRE ATT&CK, NIST CSF, DORA, NIS2, ISO 27001).
- **Typography**: Enhanced use of Fraunces/Serif headers for archival prestige.

### Pattern F: Unified Intelligence Search (`/search`)
- **Density**: High.
- **Interface**: Instant auto-filtering search input with live typeahead for CVEs, Actors, Malware, and IOCs.
- **Results View**: Grouped by entity type with severity tags and exact match evidence snippets.
