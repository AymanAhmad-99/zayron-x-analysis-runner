# SEMANTIC INTEGRITY AUDIT — ZAYRON-X

Scope: CVE/product/relationship/campaign/evidence/claim/ATT&CK/attack-path/ransomware/exploitation scoping in the current code, existing hardcoded protections, and the hierarchy that must own semantics.

---

## 1. Where semantics currently live (and their gaps)

| Concern | Current implementation | Gap |
|---|---|---|
| CVE scope | `cve_id` fields scattered (vulnerabilities.cve_id, enrichment.cve_id, report.subject) — no single subject identity type | facts not bound to subject; cross-CVE mixing structurally possible |
| Product scope | `affected_vendor/affected_product` free-text columns; CPE parsing in `parseNvdCpeData` | no (vendor,product,version-range) identity; versions leak on dedup/fusion |
| Relationship scope | `relations` rows (source/target type+id, relation_type, confidence) — no provenance/scope columns | relation provenance untracked; can't audit why a relation exists |
| Campaign scope | `campaigns` table + `detectCampaignCandidate` text heuristic | campaign membership from text proximity — contamination vector |
| Evidence scope | `evidence` table (event_id, source_message_id, type, url, weight) + `evidence_ledger` (2nd store) + `intelligence_evidence` (empty 3rd) | three stores, no epistemic class, no subject binding |
| Claim scope | `analysis_claims` exists ONLY in fabric DB; main DB has none | claims are implicit in report JSON — unauditable |
| ATT&CK scope | `ttp_mappings` table + `buildStructuredAttackMappings`, `lookupTTP` | technique confidence/candidate-vs-confirmed not enforced |
| Attack path | `buildBoundedAttackPath` (bounded, kernel-validated) | bounded by design ✅; needs epistemic gating |
| Ransomware scope | `ransomware_campaign_use` boolean from S1 static map; text regex elsewhere | static + regex origin; no campaign-scope evidence requirement |
| Exploitation scope | `is_exploited_in_wild` from text regex; KEV via static map or mention regex | text mention ≠ authoritative state |

## 2. Hardcoded CVE-specific protections found

| Pattern | Location | Classification |
|---|---|---|
| `KNOWN_CISA_KEV_ENTRIES` (8 CVEs) | engine_v2/enrichment.ts | BAD HARD-CODED FIXTURE (replaced per STATIC_INTELLIGENCE_AUDIT §2) |
| micro76 CVE-2023-46805 guard | REMOVED by prior P0 pass ✅ | (historical) — must NOT return in CVE-specific form |
| micro77 CVE oracle | `.tmp-micro77-check/micro77_cve_2024_6387_oracle.js` | LEGACY TEST LOGIC (fine at root scratch; keep out of src) |
| CVE-2024-3400 fixture | reporting/cve20243400Fixture.ts | BAD (runtime) / GOOD (as isolated fixture) |
| Missing general rules | — | MISSING GENERAL RULE: all of §1 gaps; replacement = semantics/invariants I1–I8 (STATIC_INTELLIGENCE_AUDIT §4) |

## 3. EVENT vs SIGNAL vs FACT vs EVIDENCE vs CLAIM vs ASSESSMENT vs REPORT — current vs target

Current reality: the words are used interchangeably. `intelligence_events` holds signals AND reports' subjects; `evidence` rows are created per signal; reports embed "claims" as prose.

**Target hierarchy (one definition, enforced by schema + invariants):**

```
SIGNAL      raw observation from a source (telegram msg, feed item, API record)
            → stored: source_messages (+ payload hash)          [immutable, append-only]
EVENT       deduplicated real-world occurrence inferred from ≥1 SIGNAL
            → stored: intelligence_events (identity = type + subject + time window + content hash)
EVIDENCE    a SOURCE-BOUND, epistemically-classed artifact supporting exactly one CLAIM
            (class: AUTHORITATIVE | PRIMARY | SECONDARY | OSINT | SIGNAL | UNVERIFIED; weight by class)
            → stored: evidence (single store) with subject_id + claim_id + epistemic_class
FACT        normalized atomic assertion extracted from EVIDENCE (subject-scoped, typed)
            → stored: fabric `analysis_claims` shape generalized: claims table
CLAIM       a proposition with epistemic_status (OBSERVED/INFERRED/SYNTHESIZED) + evidence links
ASSESSMENT  analyst/AI judgment over claims, with confidence + rationale
REPORT      compiled, validated (invariants I1–I8), versioned projection of assessments
PUBLICATION  immutable published artifact of a REPORT (article/social/API) with publication identity
```

Rules that make it integrity-safe:
1. A CLAIM without ≥1 EVIDENCE link cannot exist (DB constraint + invariant I8).
2. EVIDENCE is never deleted; superseded (keeps audit trail).
3. `epistemic_status=SYNTHESIZED` claims are labeled in every surface and cannot raise exploitation/KEV/severity state (I6).
4. Subject identity (CVE ID, malware family ID, actor ID) is a typed value on SIGNAL→EVENT→CLAIM→REPORT; invariant I1 enforces containment.
5. Confidence is computed ONCE (single calculator) from evidence classes + contradiction state (Phase 17).

## 4. Source trust model (Phase 19) — current state and target classes

Current: `sources.trust_score` numeric (0–1?) + `metadata.authoritative` ad-hoc flags + `authority_tier` in some payloads. Not consistently applied anywhere downstream.

Target classes (mapped to existing fields):
- AUTHORITATIVE — CISA KEV, NVD, CNAs (tier 1). Contradicts OSINT → OSINT demoted, conflict logged.
- PRIMARY — vendor advisories (MSRC etc.), exploit-DB entries for exploit existence.
- SECONDARY — established press/analyst feeds.
- OSINT — Telegram channels (trust_score per source), MISP community feeds.
- UNVERIFIED — unregistered/unknown handles.
- SIGNAL — machine telemetry (collector heartbeats, EPSS/Vectorize signals).

Implementation: single `SOURCE_CLASS` enum in `packages/types`; `sources.source_class` column (migration); weighting constants in ONE confidence module. A Telegram signal can never outrank a CISA fact because weight(class) is monotonic and invariant I8 caps conflicting outcomes.

## 5. Publication state machine (Phase 10) — reconstructed as-is

States found (intelligence_events.status + trace stages): RECEIVED → QUEUED → EVIDENCE_READY → ANALYZED → TRUSTED → READY_TO_PUBLISH → (PUBLISHED via articles) ; QUARANTINED (TRUST gate); DUPLICATE.

| Property | Finding |
|---|---|
| Multiple publication owners | YES: api `/publish` route, api queue consumer (`PUBLISH_INTELLIGENCE`), `Publisher` service entrypoint — all call `publishApprovedIntelligence`; plus source-fabric `publications` table (3rd owner, unused) |
| Duplicate generation | articles.slug + `canonical_intel_event_id`; publication idempotency only via `idempotency_key` param (not enforced by unique constraint evidence) |
| Publish bypass | canary routes build reports in-process and may write articles without TRUST stage (route-dependent) |
| Deadlocks | none found (no locks), but frozen-queue-no-ack creates redelivery storm instead of a QUARANTINED state |
| READY_TO_PUBLISH ⇒ publishable? | NOT PROVEN. TRUST gate sets it, but no invariant re-verifies evidence presence at publish time; publish gate exists (`publicationGate`) but its checks are separate from the state machine. Evidence: 6 TRUST=READY_TO_PUBLISH traces vs 2 articles total — transitions happen without publication following. |

**Required correction:** one publication owner (the single processor's PUBLISH step), one gate invocation enforced by the state transition itself (READY_TO_PUBLISH only settable BY the gate pass), publication identity = sha(report_id + publication_target) unique index.
