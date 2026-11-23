# ZAYRON-X — REMOVAL, MERGE & RETENTION PLAN (08)

This plan specifies exactly what content, pages, and code paths should be removed, merged, hidden behind expandable drawers, or retained across the platform.

---

## 1. Content & Routes to REMOVE ENTIRELY from Public UI

| Route / Component | Current Location | Justification for Removal | Action |
| :--- | :--- | :--- | :--- |
| **/articles** | `apps/web/app/articles/` | Low-value, redundant AI prose rewriting raw Telegram posts into shallow articles. Violates intelligence tradecraft. | Remove from navigation and sitemap. Redirect `/articles/*` to `/intelligence`. |
| **/reports/[id]** | `apps/web/app/reports/[id]/` | Duplicate route mirroring `/intelligence/[id]`. Creates split analytics and confusing user paths. | Deprecate route; issue 301 Permanent Redirect to `/intelligence/[id]`. |
| **Synthetic Boilerplate Strings** | `workers/telegram-collector-do/src/collector-do.ts` | Hardcoded strings ("Technical risk analysis indicates immediate exploitation feasibility") create false sense of analysis. | Purge all static placeholder strings from worker generation logic. |
| **Unjustified ATT&CK Defaults** | `workers/telegram-collector-do/src/collector-do.ts` | Default fallback to `T1190` misrepresents non-web vulnerabilities and creates false telemetry. | Remove default; replace with empty array / "None established". |

---

## 2. Content to MOVE TO KNOWLEDGE BASE (Reference Library)

| Entity / Category | Current Location | New Destination | Rationale |
| :--- | :--- | :--- | :--- |
| **Static Threat Actors** (APT28, APT29, Lazarus) | `/actors`, `/actors/[id]` | `/knowledge/actors/[id]` | These profiles contain static encyclopedic descriptions rather than real-time telemetry. They belong in the knowledge corpus. |
| **Static Malware Families** (Cobalt Strike, DarkSide) | `/malware`, `/malware/[id]` | `/knowledge/malware/[id]` | Encyclopedic malware capability profiles should serve as reference material for RAG routing rather than pseudo-live alerts. |
| **Campaign Overviews** | `/campaigns`, `/campaigns/[id]` | `/knowledge/campaigns/[id]` | Historic campaigns serve as background correlation context. |

---

## 3. Content to HIDE BEHIND EXPANDABLE DRAWERS

| Information Element | Current Display | Target UI Placement | Rationale |
| :--- | :--- | :--- | :--- |
| **Knowledge Trace & Rejected Chunks** | Rendered as text blocks | Expandable Accordion: `"Knowledge Applied (X Used, Y Considered)"` | Analysts only inspect rejected chunks during deep forensic audits; executive readers need clean assessments. |
| **Raw Message Payload & Headers** | Mixed in summary / body | Slide-over Raw Telemetry Drawer (`"View Original Ingestion Payload"`) | Keeps the primary intelligence dossier focused on verified facts and actionable analysis. |
| **Full CVSS Vector Strings** | Injected in body | CVSS Metric Pill + Expandable Vector Breakdown | Avoids visual clutter while keeping CVSS metrics fully auditable. |

---

## 4. Content to RETAIN as Core Platform Value

| Route / Asset | Role | Retention Rationale |
| :--- | :--- | :--- |
| **/intelligence** | Real-time Intelligence Feed | High-signal, searchable feed of normalized operational threats. |
| **/intelligence/[id]** | Canonical Intelligence Dossier | Core product: 10-section structured report with epistemic distinction. |
| **/sources** | Live Telegram Source Registry | Full operational visibility of monitored channels, health, and discovery. |
| **/knowledge** | Authoritative Reference Corpus | 12 core books, standards, and normative frameworks. |
| **/methodology & /trust** | Governance & AI Transparency | Essential for enterprise trust, compliance, and methodology defensibility. |
