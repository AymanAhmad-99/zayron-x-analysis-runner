# ZAYRON-X — 191 CONTENT & KNOWLEDGE PAGE CLASSIFICATION (04)

This audit classifies the existing repository and database pages, content entities, and knowledge routes into strict operational categories.

---

## 1. Classification Methodology

Every page and entity is classified into one of the following official statuses:

- `KEEP_AS_KNOWLEDGE`: Authoritative reference material preserved for RAG retrieval and analyst study.
- `KEEP_AS_REFERENCE`: High-signal documentation page (standards, legal, governance).
- `KEEP_BUT_REWRITE`: Core product interface that must be refactored to remove boilerplate.
- `MOVE_TO_KNOWLEDGE_BASE`: Content that belongs in a structured technical library rather than an operational feed.
- `REMOVE_FROM_REPORT_PIPELINE`: Data that must not enter the automated report generation context.
- `REMOVE_FROM_PUBLIC_UI`: Pages that dilute signal-to-noise or contain unverified seed data.
- `DUPLICATE`: Redundant route or entry that duplicates an existing view.

---

## 2. Global Page & Route Inventory Breakdown

| Category / Route Group | Page / Entity Count | Representative Routes / Slugs | Current Role | Audit Findings | Target Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Operational Intelligence Reports** | 132 | `/intelligence/[id]`, `/reports/[id]` | Real-time threat reports | High noise, 130 boilerplate reports, conflated provenance | `KEEP_BUT_REWRITE` (Purge synthetic fields, show raw evidence if unanalyzed) |
| **Knowledge Base Books & Standards** | 22 | `/knowledge`, `/standards`, manifest docs | Authoritative technical references | High quality, but currently bypassed by collector DO | `KEEP_AS_KNOWLEDGE` (Expose via searchable knowledge drawer) |
| **Threat Entity Dossiers (Actors)** | 9 | `/actors`, `/actors/[id]` (APT28, APT29, Lazarus, etc.) | Static threat actor profiles | Seed data from initial setup; lack recent telemetry links | `MOVE_TO_KNOWLEDGE_BASE` |
| **Malware Family Profiles** | 5 | `/malware`, `/malware/[id]` (Cobalt Strike, DarkSide, etc.) | Static malware capability profiles | Solid descriptions, but static rather than live telemetry | `MOVE_TO_KNOWLEDGE_BASE` |
| **Campaign Profiles** | 2 | `/campaigns`, `/campaigns/[id]` | Campaign correlation views | Sparse data | `MOVE_TO_KNOWLEDGE_BASE` |
| **Derived Articles** | 20 | `/articles`, `/articles/[slug]` | AI-generated summary articles | Paraphrased summaries of Telegram messages | `REMOVE_FROM_PUBLIC_UI` (Redundant with `/intelligence/[id]`) |
| **Compliance, Trust & Legal** | 11 | `/about`, `/methodology`, `/trust`, `/trust/ai-governance`, `/responsible-disclosure`, `/transparency`, `/terms`, `/privacy`, `/cookies`, `/acceptable-use`, `/intelligence-disclaimer` | Platform governance, ethics, and methodology | Professional, accurate, compliant with AI governance | `KEEP_AS_REFERENCE` |
| **Utility / Administrative Routes** | 5 | `/search`, `/sources`, `/login`, `/access`, `/contact` | System operations & discovery | Necessary for user management and source discovery | `KEEP_AS_REFERENCE` |

---

## 3. High-Priority Rationalization Actions

1. **Eliminate Duplicate Route `/reports/[id]`**:
   - `/reports/[id]` and `/intelligence/[id]` display overlapping content.
   - **Recommendation**: Canonicalize strictly on `/intelligence/[id]`. Redirect `/reports/*` to `/intelligence/*`.
2. **Deprecate `/articles` Public Feed**:
   - `/articles` contains shallow rewritten blog posts of the same Telegram messages found in `/intelligence`. This violates the core CTI principle of eliminating filler and duplicate prose.
   - **Recommendation**: Remove `/articles` from public navigation. All analysis must reside in the structured dossier at `/intelligence/[id]`.
3. **Transition `/actors` and `/malware` to Knowledge Base Library**:
   - Static entity pages should be linked as *contextual background references* when observed in live reports, rather than pretending to be live operational alerts.
