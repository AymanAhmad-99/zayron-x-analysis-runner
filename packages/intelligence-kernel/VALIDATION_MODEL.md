# ZAYRON-X Deterministic Intelligence Kernel — Validation Model

## 1. Multi-Stage Validation Pipeline

Every evaluation request progresses through deterministic gates:

1. **Schema & Version Validation**:
   - Validates `schema_version` and ensures all newtype IDs and closed enums conform to typed definitions.
2. **Canonical Fact Integrity Gate**:
   - Inspects candidate claims against immutable canonical facts (e.g. CVSS score, vendor identity, affected product).
   - Any value incompatibility immediately halts validation with status `CONTRADICTED`.
3. **Evidence Membership & Containment Gate**:
   - Validates citation references against the authoritative `EvidenceBundle`.
   - Performs domain-agnostic token containment across canonical fields and evidence statements.
   - Detects ungrounded entities (e.g. GitLab references injected into a PAN-OS vulnerability report) without hardcoding product blocklists.
4. **Entity Resolution Engine**:
   - Deterministic 4-state resolution: `RESOLVED`, `POSSIBLE`, `AMBIGUOUS`, and `UNRESOLVED`.
   - Strict priority: Canonical ID -> Normalized Primary Match -> Declared Aliases -> Lexical Substrings. Fuzzy matching is never treated as definitive proof.
5. **Semantic & Temporal Consistency Engine**:
   - Rejects mutually exclusive claims (e.g., asserting an unauthenticated vulnerability while claiming authentication is required).
   - Rejects temporal inversions (e.g., observation timestamps preceding disclosure, or negative time ranges).
6. **Conflict & Syndication Engine**:
   - Evaluates source authority tiers and independence keys.
   - Preserves minority or conflicting evidence in `conflicts` and `limitations` rather than discarding it.
7. **Lifecycle State Enforcement**:
   - Transitions strictly between valid states (`Ingested` -> `Normalized` -> `Correlated` -> `Analyzed` -> `Validating` -> `Validated` / `Rejected`).
   - If any critical claim fails validation or a canonical conflict exists, the state terminates at `REJECTED`.
