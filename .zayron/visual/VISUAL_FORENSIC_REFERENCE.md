# ZAYRON-X — MASTER VISUAL FORENSIC REFERENCE

**Document Version:** 1.0.0  
**Authority:** Master Visual Source of Truth  
**Status:** CANONICAL & PERMANENT  

---

## 1. Overall Visual Philosophy

ZAYRON-X is an **Institutional Cyber Threat Intelligence & Research Platform**.  
Its visual identity embodies **sovereign authority, mathematical precision, and high-density editorial clarity**.

### Core Tenets:
1. **Intel-First Editorial Typography**: High-contrast editorial display headings (Playfair / Fraunces / Serif accents) paired with razor-sharp, highly legible sans-serif telemetry (Inter / Geist Sans).
2. **Warm Institutional Monochrome Palette**: Warm neutral base canvas (`#F4F3EF` / `#EDECE8`), pure stark white surfaces (`#FFFFFF`), deep obsidian/graphite structural accents (`#121316` / `#1C1D21`), and crisp architectural borders (`#E2E0D8`).
3. **Restrained Semantic Signal**: Color is never decorative. High-voltage orange (`#D9531E` / `#E65A20`) is used strictly as a **signal marker** (live telemetry dots, critical severity accents, and active node highlights).
4. **Structured "Chapter" Information Architecture**: Vertical hierarchy structured as explicit analytical chapters (`CHAPTER 01 - IDENTITY`, `CHAPTER 02 - VALUE`, `CHAPTER 04 - METHOD`, `CHAPTER 06 - INTELLIGENCE`, etc.), communicating rigorous intelligence dossier structure.
5. **Multi-Density Telemetry**: High-density dossier sidebars, wire feeds, interactive network entity graphs, and heatmap matrices anchored within generous, breathable architectural section framing.

---

## 2. Color Architecture & Palette

| Token Name | Hex Code | Role & Usage Restrictions |
|---|---|---|
| `color-base` | `#F5F4F0` | Warm cream/bone neutral master canvas background |
| `color-surface` | `#FFFFFF` | Primary content cards, data tables, dossiers, and assessment cards |
| `color-surface-subtle` | `#EBEAE5` | Secondary card fills, category filters, and pill backgrounds |
| `color-surface-dark` | `#111215` | Structural focus sections (Method pipeline, Action framework, dark cards) |
| `color-surface-dark-subtle` | `#1A1B1F` | Contrast elements within dark structural sections |
| `color-ink` | `#111214` | Primary high-contrast text, display typography, and solid primary CTA buttons |
| `color-ink-muted` | `#5A5D65` | Secondary metadata, explanatory subheadings, and wire timestamps |
| `color-ink-tertiary` | `#8C8F98` | Tertiary labels, breadcrumbs, chapter indicators, and passive borders |
| `color-border` | `#E1DFD7` | 1px clean architectural card borders and grid dividers |
| `color-border-dark` | `#28292E` | 1px dividers inside dark surface blocks |
| `color-signal` | `#D9531E` | Primary semantic alert accent, live activity pulse, and highlight indicator |
| `color-critical` | `#C82323` | CRITICAL threat severity badge and compromised entity marker |
| `color-high` | `#D9531E` | HIGH threat severity badge |
| `color-medium` | `#D9821E` | MEDIUM threat severity badge |
| `color-low` | `#2A7B62` | LOW threat severity badge |
| `color-success` | `#1D8A5E` | Verified confidence indicators, active heartbeat, and clean system state |

---

## 3. Typography Architecture

### Font Families
- **Display / Editorial**: `Playfair Display`, `Fraunces`, or `Georgia` (Serif Display) — Used strictly for major section titles, hero punchlines, and intelligence section headlines (`UNDERSTAND WHAT CHANGED.`, `INTELLIGENCE, NOT NOISE`, `RESEARCH & KNOWLEDGE`).
- **Telemetry / Primary UI**: `Inter`, `Geist Sans`, or system sans-serif — Used for all navigation, metadata, wire timestamps, labels, data tables, metrics, and body prose.
- **Monospace Telemetry**: `Geist Mono`, `JetBrains Mono`, or `Fira Code` — Used for CVE IDs, IPv4/SHA256 indicators, timestamps (`21:58 | 2027-10-14`), and entity badges.

### Type Scale & Rhythm
| Role | Size | Weight | Line Height | Tracking | Font |
|---|---|---|---|---|---|
| Display Hero | 48px – 64px | 600 / SemiBold | 1.05 | -0.02em | Editorial Serif |
| Section Headline (H2) | 32px – 40px | 600 / SemiBold | 1.15 | -0.015em | Editorial Serif |
| Subsection Title (H3) | 20px – 24px | 700 / Bold | 1.25 | -0.01em | Sans / Serif |
| Chapter Indicator | 11px – 12px | 700 / Bold | 1.0 | +0.08em | Sans (ALL CAPS) |
| Body Text | 15px – 16px | 400 / Regular | 1.55 | 0.0 | Sans |
| Technical Metadata | 12px – 13px | 500 / Medium | 1.4 | +0.02em | Sans / Mono |
| Badges & Tags | 10px – 11px | 700 / Bold | 1.0 | +0.06em | Sans (ALL CAPS) |

---

## 4. Spacing, Borders & Radius

- **Corner Radius Discipline**:
  - Buttons & Badges: `4px` to `6px` (Restrained, architectural, never pill/capsule overload).
  - Cards & Containers: `6px` to `8px` (Crisp rectangular geometry).
  - Modal / Assessment Flyout: `8px` with subtle 1px border and refined elevation shadow.
- **Elevation & Shadows**:
  - `shadow-none`: Default for embedded surface cards (1px border creates distinction).
  - `shadow-floating`: `0 12px 32px -4px rgba(17, 18, 20, 0.08), 0 4px 12px -2px rgba(17, 18, 20, 0.04)` for floating assessment cards and interactive popovers.
- **Dividers & Grid Lines**:
  - Pure `1px solid var(--color-border)` separating chapters and grid modules.

---

## 5. Component Visual Primitives

1. **Chapter Header**: Tiny uppercase tag (`CHAPTER 01 - IDENTITY`, `CHAPTER 06 - INTELLIGENCE`) placed directly above section titles to anchor reading context.
2. **Threat Assessment Floating Card**: High-contrast white card showcasing real-time threat telemetry with severity/confidence split header, key-value metadata list, and entity pill badges.
3. **Intelligence Wire (Feed)**: Compact chronological row listing with timestamp (`21:41`), severity pill (`CRITICAL`), entity tag, and concise headline.
4. **Interactive Threat Graph**: Radial or node-link graph with central threat actor (`APT41`) branching to CVEs, Malware, IOCs, and Techniques with clean directional connector lines.
5. **Action Capability Pipeline**: Sequential dark-surface progression (`DETECT → HUNT → ASSESS → PRIORITIZE → MITIGATE → RESPOND`) with discrete action triggers.
6. **Institutional Standards Bar**: Clean monochrome logo ribbon (`MITRE`, `NIST`, `CVE`, `STIX`, `TAXII`) demonstrating intelligence provenance.
7. **Understated Pricing Cards**: Stark contrast between Free and Pro with zero fake marketing gimmicks.
