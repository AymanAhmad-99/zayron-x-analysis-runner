# STATIC INTELLIGENCE AUDIT — ZAYRON-X

Classification: PRODUCTION AUTHORITY (PA) · TEST FIXTURE (TF) · DOCUMENTATION (DOC) · HISTORICAL (H) · LEGACY (L) · UNSAFE (U)

---

## 1. Registry of static datasets found in runtime package

| # | Static dataset | File:line | Contents | Leaks into production via | Classification | Risk |
|---|---|---|---|---|---|---|
| S1 | `KNOWN_CISA_KEV_ENTRIES` | `packages/intelligence/src/engine_v2/enrichment.ts:10` | 8 CVEs → date_added/ransomware/action | engine_v2 enrichment → collector-do analysis path; any engine_v2 import | **UNSAFE — PA impersonation** | HIGH: fabricated KEV facts (date_added, ransomware flag, remediation) presented as authoritative |
| S2 | `calculateEpss` lookup table | `engine_v2/enrichment.ts:118` | exploit status → fabricated EPSS (0.942/0.815/0.428/0.125/0.045/0.009) | same as S1 | **UNSAFE** | HIGH: fake probabilistic intelligence with percentile precision |
| S3 | `CANONICAL_ACTORS`, `CANONICAL_MALWARE` | `resolution/index.ts` | hardcoded entity registry | ingest consumer + collector entity resolution | **UNSAFE-as-authority / TF-if-isolated** | MEDIUM: entity identity fixed in code; new actors unresolvable |
| S4 | `KNOWLEDGE_MANIFEST_20`, `MASTER_KNOWLEDGE_ENTITIES_115`, `MASTER_EXPANDED_CHUNKS_320` | `knowledge/manifest.ts`, `master_manifest.ts` (893 LOC), `corpus.ts`, `corpus_expanded_350.ts` | 3 generations of in-memory knowledge corpora | api knowledge/RAG routes | **LEGACY (gen1/2) + PA-for-v3?** | MEDIUM: stale static knowledge served as corpus truth; v3 lives in D1+R2 (real) |
| S5 | `ProductionReportRegistry` + `CANONICAL_CVE_2024_3400_FIXTURE` + WannaCry/ExploitDB raw bytes | `reporting/productionReports.ts`, `cve20243400Fixture.ts`, `realMalwareData.ts`, `redlineMalwareFixture.ts`, `rawMalwarePayload.ts`, `rawExploitPayload.ts` | fully-formed reports + raw source fixtures | package barrel export; constructor seeds at import-time; web/tests import | **UNSAFE in runtime; TF when isolated** | HIGH if bundled into worker (report fabrication at import); MEDIUM otherwise |
| S6 | `production_mutation_lock.py` + p0 scripts expectations | `workers/scripts/` | mutation lock state | ops scripts | H | LOW |
| S7 | Ground-truth/micro* JSON at repo root | `micro*.json`, `task91_*.json`, `ground_truth_matrix.json`, `report_fidelity_matrix.json` | verification artifacts | nothing (root only) | DOC/H | LOW — relocate to validation/artifacts |
| S8 | `workers/targets.json` | `workers/targets.json` | telegram channel list, RSS URLs | collector config (manual) | PA-ish (config-as-data) | LOW — move to D1 sources registry (already exists) |
| S9 | Vendor corpus in repo | `.zayron/knowledge/**`, `vendor/**` | source fabric / corpus | build tooling | DOC | LOW |
| S10 | Root `wrangler.toml` claims | — | — | — | — | n/a (config) |

## 2. P0.1 — `KNOWN_CISA_KEV_ENTRIES` forensic analysis (targeted removal)

**Precise facts (from code + references):**
- Definition: `enrichment.ts:10-19` — `Record<string, {date_added, ransomware, action}>`, 8 CVEs: 2023-34362, 2023-2868, 2024-3400, 2024-21887, 2024-1709, 2023-22515, 2023-4966, 2021-44228.
- Sole in-repo consumer: `enrichAuthoritativeData` (`enrichment.ts:214`): `kevRecord = KNOWN_CISA_KEV_ENTRIES[cve]`; feeds:
  - `cisa_kev.is_in_kev` (also ORs a text regex `\bcisa kev\b` mention)
  - `cisa_kev.date_added`, `cisa_kev.ransomware_campaign_use`, `cisa_kev.required_action`
  - transitively: `exploit_status` (inKev → EXPLOITATION_IN_THE_WILD), `epss` (fabricated 0.942), `analyst_priority` (inKev → P1)
- Export chain: `enrichment.ts` → `engine_v2/index.ts` (`export * from './enrichment'`) → `@zayron/intelligence` barrel. Runtime callers: `workers/telegram-collector-do` (relative import of engine_v2) and engine_v2's own pipeline; the API worker does not import `enrichAuthoritativeData` directly (its bundles contain a copy from older builds).
- Tests affected: `tests/deep_intelligence_engine_v2.test.ts` and engine_v2 suites assert enrichment outputs incl. KEV-derived fields for the 8 hardcoded CVEs (must be re-pointed at fixtures).
- Prior classification: FROZEN by P0 pass (P0_CLEANUP_FORENSIC_REPORT.md §11) — correctly deferred, not forgotten.

**Migration design (do NOT delete first):**

```
CURRENT:  CVE ──▶ static dictionary ──▶ KEV facts (unprovenanced)
TARGET:   CVE ──▶ CISA KEV feed (JSON, authoritative) 
                 ──▶ kev_state table (D1): cve_id PK, date_added, ransomware, required_action,
                     kev_catalog_version, fetched_at, source_url, content_hash
                 ──▶ normalization (mapCisaKevRecord already exists)
                 ──▶ provenance: evidence row (source_id='cisa-kev', url, weight=1.0)
                 ──▶ validation: exploit_status=EXPLOITATION_IN_THE_WILD ONLY from kev_state row
                                  or a KEV-source evidence row (regex text mention demoted to SIGNAL class)
                 ──▶ consumers read kev_state (cache TTL ≤ feed release cadence) — never memory
```

Steps (ordered, atomic):
1. Add `ingestion/cisaKevAdapter`-backed `kev_state` sync (the feed is already fetched in 3 places — consolidate to ONE fetch point in the single processor).
2. Add D1 migration `0024_kev_state.sql` (kev_state + evidence linkage; idempotent).
3. Rewire `enrichAuthoritativeData` to accept injected `KevLookup` port (interface) — worker passes D1-backed impl; tests pass in-memory fixture port. Static map MOVES to `tests/fixtures/kev_static_8.json` used ONLY via the test port.
4. Delete `KNOWN_CISA_KEV_ENTRIES` from runtime package. Mutation test: removing a KEV row from fixture must flip `is_in_kev`, `exploit_status`, `analyst_priority` in tests — proving tests exercise the port, not the dictionary.
5. Delete the `\bcisa kev\b` text-regex elevation (it allows arbitrary text to claim KEV status); replace with evidence-weighted inference logged as inferred, observed≠inferred preserved.

## 3. EPSS correction (same file, same class)

`calculateEpss` must call the FIRST EPSS API (model scores are public, keyed by CVE) or leave `epss = null` with `epss_status='UNKNOWN'`. Fabricating a constant 0.942 for every in-the-wild CVE is false precision — flag it in reports as missing rather than invented. (Cloudflare-friendly: 1 fetch per CVE, cacheable in D1 `epss_scores`.)

## 4. Phase 7 — Micro76 protection, restored generically

Historical guard: CVE-2023-46805 contamination fix (CVE-specific). Requirement: generic semantic invariant system.

**Design: `packages/intelligence/src/semantics/invariants.ts`** (new, single module, evidence-scope aware; no `if CVE == X`):

| Invariant | Rule (generic) | Catches |
|---|---|---|
| I1 Cross-CVE identity | Every fact carries `subject_id`; subject_id must match the report's subject for all OBSERVED/CONFIRMED facts; related-CVE facts may appear only as REFERENCED with their own subject_id + evidence | CVE-B fact in CVE-A report |
| I2 Product/version scope | version ranges attach to (product, vendor) pair identity; imported evidence must bind to same (vendor,product) else DEMOTE to referenced | version leakage across products |
| I3 Campaign fact scope | campaign membership claims require campaign-scope evidence; CVE→campaign links are SEPARATE claims with own evidence | ransomware status leaking from campaign narrative |
| I4 ATT&CK epistemic gate | technique = CONFIRMED only with direct evidence; inferred techniques render as CANDIDATE with confidence cap 0.5 | ATT&CK overclaiming |
| I5 Exploitation vs ransomware separation | `exploitation` (KEV/observed) and `ransomware_use` are independent dimensions; neither implies the other | dimension confusion |
| I6 Inferred≠observed | every claim has `epistemic_status ∈ {OBSERVED, INFERRED, SYNTHESIZED}`; SYNTHESIZED (AI) may never raise `is_in_kev`, `exploit_status`, severity, or confidence above source evidence | AI inflation |
| I7 Evidence-confidence monotonicity | confidence ≤ f(supporting evidence weight); removing evidence MUST lower confidence (mutation-tested) | orphaned high confidence |
| I8 Contradiction handling | authoritative contradiction → confidence capped MODERATE + conflict surfaced in report; AUTHORITATIVE source outranks OSINT (see trust model) | conflicting sources |

Required negative cases (all 8 from the mandate) map 1:1 onto I1–I8; each ships as a table-driven test (`tests/semantics/invariants.test.ts`) with mutation checks (flip any rule → ≥1 negative case must fail).

Placement: between ASSESSMENT and PUBLISH in the single processor; violations → QUARANTINED with error code `SEMANTIC_INVARIANT_<ID>`.

## 5. Fixture quarantine (mechanics)

- Move `reporting/*Fixture.ts`, `rawMalwarePayload.ts`, `rawExploitPayload.ts`, static corpora gen1/gen2 → `packages/intelligence/fixtures/` (not exported by barrel) or `tests/fixtures/`.
- `productionReports.ts`: delete from runtime; replace its two legitimate uses (web demo, tests) with explicit fixture loaders.
- Add a lint rule (grep in CI): forbid `KNOWN_`, `FIXTURE`, `CANONICAL_ACTORS` style constants in `src/**` outside allowlist.
