# ZAYRON-X — COMPONENT VISUAL CONTRACTS

**Authority:** Master Visual Source of Truth  
**Enforcement:** CI Visual Governance & Code Review  

---

## 1. Header Navigation (`<Header />`)
- **Purpose**: Main brand anchor and top-level institutional routing.
- **Allowed Variants**: Global Sticky.
- **Visual Structure**:
  - Left: `ZAYRON-X` in bold sans with subtitle `CYBER THREAT INTELLIGENCE & RESEARCH` (10px uppercase, tracking +0.08em).
  - Center: Horizontal navigation text links (`INTELLIGENCE`, `THREATS`, `VULNERABILITIES`, `ACTORS`, `MALWARE`, `KNOWLEDGE`, `REGULATIONS`, `SEARCH`, `PRICING`) in 12px uppercase bold.
  - Right: Primary CTA button `EXPLORE INTELLIGENCE` (`#111214` solid fill, white text, 6px radius).
- **Background & Border**: `#F5F4F0` base background with bottom border `1px solid #E1DFD7`.
- **Forbidden**: Neon glow, colored gradients, bloated navbar heights, hamburger menus on desktop viewports.

---

## 2. Hero Unit (`<Hero />`)
- **Purpose**: Clear, declarative executive punchline and live threat focus.
- **Visual Structure**:
  - Chapter Label: `CHAPTER 01 - IDENTITY` (11px uppercase bold).
  - Headline: `UNDERSTAND WHAT CHANGED. KNOW WHY IT MATTERS.` in Editorial Display Serif (48px–60px, line-height 1.08).
  - Subtitle: Clean Inter prose (15px `#5A5D65`, max-width 480px).
  - Dual CTAs: Primary solid `#111214` button + Secondary outline `#FFFFFF` border button.
  - Right Flank: Floating `<ThreatAssessmentCard />` overlaid with high-elegance grayscale hardware / environment imagery.

---

## 3. Threat Assessment Floating Card (`<ThreatAssessmentCard />`)
- **Purpose**: Immediate high-density proof of live threat triage and correlation.
- **Visual Structure**:
  - Top Bar: Label `THREAT ASSESSMENT` (11px uppercase bold) + close `×`.
  - Severity / Confidence Row:
    - Left: `SEVERITY` label + value `HIGH` (in `#D9531E` bold uppercase).
    - Right: `CONFIDENCE` label + value `94% (Verified)` (in `#1D8A5E` bold).
  - Content Rows:
    - `Headline`: Bold sans CVE summary.
    - `Assessment`: Executive situational synthesis.
    - `Evidence`: Tag list with ingestion and RAG correlation markers.
    - `Entities`: Entity badge (`APT41`).
    - `Asset`: Targeted asset group (`Gov-EMEA-Data`).
    - `Last Updated`: Live signal dot (Orange pulse `#D9531E`) + timestamp (`21:58 | 2027-10-14`).
- **Container**: White `#FFFFFF` fill, 1px border `#E1DFD7`, 8px radius, refined elevation shadow.

---

## 4. Chapter Section Frame (`<ChapterSection />`)
- **Purpose**: Standardized vertical divider establishing the intelligence dossier rhythm.
- **Visual Structure**:
  - Top: Micro-label `CHAPTER XX - [NAME]` in 11px uppercase bold (`#111214` or `#8C8F98`).
  - Dividers: Subtle 1px rule separating chapters.
  - Spacing: 48px to 64px vertical padding between chapters.

---

## 5. Intelligence Wire Feed (`<IntelligenceWire />`)
- **Purpose**: High-density real-time chronological intelligence stream.
- **Visual Structure**:
  - Row Height: Compact, dense, data-rich.
  - Left: Monospace timestamp (`21:41`, `21:39`, `21:20`).
  - Severity Tag: Rectangular badge (`CRITICAL` in `#C82323`, `HIGH` in `#D9531E`, `MEDIUM` in `#D9821E`).
  - Title & Summary: High-contrast single-line entity context.
  - Hover: Subtle background shift to `#EBEAE5` (transition 150ms).

---

## 6. Threat Actor Network Graph (`<ThreatNetworkGraph />`)
- **Purpose**: Visual representation of entity correlation and blast radius.
- **Visual Structure**:
  - Central Node: High-prominence circular badge (`APT41` in `#D9531E` solid with white text).
  - Leaf Nodes: Clean white pills with 1px `#E1DFD7` border for `CVE-2027-1492 (Vuln)`, `Trickbot (Malware)`, `192.168.1.100 (IOC)`, `T1055 (Technique)`, `Operation Silent Grid (Campaign)`.
  - Connectors: Clean 1px solid lines with micro-labels (`Exploit`, `Command to`, `Attributed to`).
- **Forbidden**: Neon sci-fi particle animations, 3D rotating globes, flashing canvas matrix effects.

---

## 7. Action Capability Pipeline (`<ActionPipeline />`)
- **Purpose**: Demonstrates structured operational progression from triage to response.
- **Visual Structure**:
  - Surface: Dark Institutional Section (`#111215` background, `#FFFFFF` text).
  - Progression Steps: `DETECT → HUNT → ASSESS → PRIORITIZE → MITIGATE → RESPOND`.
  - Step Cards: 1px `#28292E` border, subtle dark fill `#1A1B1F`, connected via horizontal architectural rule with circular waypoint dots.

---

## 8. Institutional Footer (`<Footer />`)
- **Purpose**: Permanent sovereign trust anchor and comprehensive navigation matrix.
- **Visual Structure**:
  - Chapter Label: `CHAPTER 11 - ENTRY`.
  - Left Column: `ZAYRON-X` brand block + `CYBER THREAT INTELLIGENCE` sub-label.
  - Columns: `INTELLIGENCE`, `KNOWLEDGE`, `PLATFORM`, `LEGAL`.
  - Bottom Notice: Small neutral disclaimer `All data fictitious and realistic / Sovereign Intelligence Standard`.
