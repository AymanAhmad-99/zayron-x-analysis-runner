# ZAYRON-X DESIGN SYSTEM: "QUIET AUTHORITY"

This document serves as the canonical visual authority for the ZAYRON-X frontend. Any deviation from these rules requires explicit approval.

## 1. BRAND
**Name:** ZAYRON-X
**Logomark:** Typographic wordmark only. No shields, locks, skulls, globes, robots, AI heads, circuits, or hacker emblems.
**Primary Message:** "Understand what changed. Know why it matters."
**Aesthetic:** Calm, institutional, authoritative, precise.

## 2. TYPOGRAPHY
**Primary UI Font:** `Inter` or `Geist Sans`. Prioritize reading comfort.
**Editorial Font (Optional):** Selected serif (`Fraunces` or similar) strictly for feature headlines. No cyber/terminal fonts.
**Line Length:** 65–75 characters for articles to ensure optimal reading rhythm.

**Scale:**
- Display: 52px - 96px, tight tracking (-0.03em), tight leading (1.02)
- H1: 36px - 68px, tight tracking (-0.025em), leading (1.08)
- H2: 24px - 44px, tight tracking (-0.02em), leading (1.15)
- H3: 18px - 28px, tracking (-0.015em), leading (1.25)
- Lead: 18px - 24px, relaxed leading (1.6)
- Body: 16px - 18px, relaxed leading (1.7)
- Meta/Caption: 11px - 13px, tracking (0.01em - 0.06em uppercase), leading (1.3 - 1.4)

## 3. COLOR ARCHITECTURE
Never use rainbow interfaces. Saturated colors are strictly functional, not decorative.

**Base:**
- Warm Editorial Background: `#F7F7F5`
- Primary Surface: `#FFFFFF`
- Primary Text: `#111111`
- Secondary Text: `#56606B`
- Dark Background: `#080A0D`
- Dark Surface: `#161A20`
- Signal Accent: `#FF6A00` (Orange represents LIVE, ACTIVE, CRITICAL, PRIMARY ACTION)

**Semantic Indicators:**
- Red: Critical risk only
- Yellow: Warning only
- Blue: Authority / regulation only
- Green: Successful system state only

## 4. SPACING & GRID
**Spacing System:**
Strict 8px centralized rhythm (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`, `128px`). No ad-hoc spacing.

**Grid System:**
- Desktop: 12-column premium editorial grid. Generous negative space.
- Mobile: Single-column hierarchy.
Never fill empty space merely because it exists. 

## 5. MOTION
**Duration:** 150–250ms.
**Purpose:** Orientation, feedback, state transition.
**Prohibited:** Infinite glow, parallax, particles, animated noise, heavy visual transitions.
Always respect `prefers-reduced-motion`.

## 6. COMPONENTS
All components must use centralized tokens. No ad-hoc styling.
Canonical list:
- Header, Navigation, Footer
- Hero
- IntelligenceRow, IntelligenceCard
- SeverityBadge, ConfidenceBadge (These must be visually independent. Severity = "How Bad", Confidence = "How Certain")
- EntityPill
- EvidenceBlock (Visually authoritative: source, authority, timestamp)
- SourceIndicator
- WhyItMatters (Separates Confirmed, Why It Matters, Defensive Priority, Unknown)
- Timeline
- DossierHeader, KnowledgeCard, RegulationCard
- SearchResult
- EmptyState (Calm and institutional), ErrorState (Explain failure and available options)

## 7. RESPONSIVE BEHAVIOR
**Desktop:** 1440x900, 1920x1080. Controlled information density, clear alignment.
**Mobile:** 390x844, 430x932. No horizontal overflow. Simplified navigation. Highly readable articles. Accessible evidence.

## 8. ACCESSIBILITY
**Standard:** WCAG AA minimum.
Semantic HTML, keyboard navigation, visible focus (`outline-offset`), non-color indicators, ARIA labels, accessible tables.
