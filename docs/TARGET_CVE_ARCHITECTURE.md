# TARGET CVE ARCHITECTURE — ZAYRON-X

The minimum coherent CVE architecture, verified against the actual codebase. This is the convergence point for every CVE entry path.

---

## 1. Boundary map (per mandate §27, corrected by evidence)

```
SOURCE            cisa-kev feed · nvd api · cisa rss · msrc rss · vendor advisories · telegram signals
                    │ adapters (ingestion/* retained: mapCisaKevRecord, parseNvdCve, mapVendorAdvisory)
                    ▼
DISCOVERY         ingest.scheduled (cron 15m) — fetch, hash, enqueue; idempotent by (source, external_id, content_hash)
                    │ INGEST_QUEUE
                    ▼
IDEMPOTENT JOB    ingest.queue consumer (transport only): validate, dedup (processing_runs unique key), enqueue
                    │
                    ▼
SOURCE RESOLUTION source record persisted (vulnerability_source_records) + raw payload → R2
                    │
                    ▼
SOURCE-SPECIFIC MAPPING  per-source mapper → CANONICAL CVE DOMAIN OBJECT
                  (subject identity = CVE ID; fields: title, description, severity, cvss{score,vector,breakdown},
                   affected{vendor,product,ranges}, fixed_versions, references, kev?, epss?, exploit?, dates)
                    │
                    ▼
NORMALIZATION     version ranges (semver/luhn), CWE normalization, date normalization, text hygiene
                    ▼
ENRICHMENT        evidence-backed ONLY: kev_state (D1) ← KEV feed; epss_scores (D1) ← FIRST API;
                  cwe details; actor/malware resolution as SIGNAL-class hints
                    ▼
ANALYSIS          deterministic rules + optional AiPort narrative (SYNTHESIZED claims only)
                    ▼
EVIDENCE VALIDATION  every claim ≥1 evidence; weights by SOURCE_CLASS; contradictions detected
                    ▼
SEMANTIC VALIDATION  invariants I1–I8 (semantics/invariants.ts) — violations → QUARANTINED
                    ▼
CONFIDENCE        ONE calculator: f(evidence classes, contradictions, coverage gaps); caps enforced
                    ▼
PUBLISH DECISION  publicationGate (existing) — pass ⇒ READY_TO_PUBLISH (state set ONLY by gate)
                    │ PUBLISH_QUEUE
                    ▼
PERSISTENCE       reports (one table) + articles (rendered) + publication identity unique
                    ▼
API               zayron-x-api read-only HTTP (stable contract, no DB internals leak)
                    ▼
WEB               apps/web (API_BASE from env, production URL)
```

**Corrections vs the mandate's diagram (why):**
- The mandate's linear chain is correct as DEPENDENCY ORDER but wrong as DEPLOYMENT: stages run in ONE worker process (the processor) against D1 state, not 14 separate services. Boundaries are module boundaries with trace events between them.
- `canonical_vulnerabilities` + `vulnerability_source_records` tables (already in D1, empty) become the canonical object + source record stores; fabric DB `analysis_claims` shape becomes the claims/evidence model (already designed there).

## 2. Domain-specific pipelines (Phase 29) — exact boundaries

| Pipeline | Owns | Shares |
|---|---|---|
| CVE | source mappers (kev/nvd/cna), CVE canonical object, kev_state/epss adapters, exploit-status logic | everything below |
| Malware | malwareBazaar/threatfox/misp mappers, family identity (existing MALWAREBAZAAR_* policies), canonical malware object | shared infra |
| Ransomware | ransomware CLAIMS about CVEs/actors live in CVE/actor pipelines as campaign-scope claims; no separate ransomware STORE in v1 (it is a claim type, not a domain object) — revisit if volume demands | claims/evidence |
| Campaign | campaign entity + membership claims (requires campaign-scope evidence — invariant I3) | shared infra |
| Actor | actor entities + aliases (resolution/), ttp_mappings | shared infra |
| Signal | source_messages ingestion + entity extraction (feeds the above as hints) | shared infra |

Shared infrastructure (ONE of each): evidence store + epistemic classes, provenance, identity resolution, relationship model, validation invariants, confidence, publication gate, trace, queue/D1/R2/Vectorize wiring.

Rule: a new domain = new mapper package + new canonical object type + new fixture suite. NOTHING else changes. (Phase 21 maintainability test result: today adding a source touches 6+ subsystems and 3 corpora; target = 2 files + fixtures.)

## 3. Storage ownership (Phase 30 verdict, workload-validated)

| Store | Owns (durable source of truth) |
|---|---|
| D1 (main) | business state: intelligence_events, canonical objects, source records, claims, evidence, reports, articles, publications, kev_state, epss_scores, event_trace, processing_runs, sources |
| D1 (fabric→canonical merge) | claims/evidence/publications model folds into main DB over time; fabric_sources remains source-fabric's registry until merge |
| R2 | raw source payloads (immutable), corpus artifacts, dated backups, large report renders |
| Vectorize | retrieval index for knowledge + report chunks (derivable data — rebuildable, never authoritative) |
| DO | TelegramCollectorDO shard state ONLY |
| Queue | transport/buffering only (ingest, publish, dlq) — never state |
| Worker memory | caches only, never authoritative |
| External | KEV/NVD/EPSS/vendor feeds (upstream authorities) |

## 4. Observability target (Phase 31)

`processing_runs` table (new migration): `run_id PK, subject_id (cve), stage, status, attempt, started_at, completed_at, duration_ms, deployment_id, source, error_code, error_message, pipeline_version, model_version`.

Lifecycle events (existing `trace()` helper extended): DISCOVERED → QUEUED → RESOLVED → MAPPED → NORMALIZED → ENRICHED → ANALYZED → EVIDENCE_VALIDATED → SEMANTIC_VALIDATED → READY_TO_PUBLISH → PUBLISHED / FAILED / QUARANTINED.

Operator answer for "What happened to CVE-X?": `SELECT * FROM processing_runs WHERE subject_id=? ORDER BY started_at` — one query, one run lineage. (Today: event_trace covers only api-side stages; ingest stages unwritten → gap closed by having the processor emit all stages.)

## 5. Failure isolation & idempotency (Phases 32–33)

- Per-subject processing in the processor; one subject failing cannot fail the batch (per-message ack/nack + QUARANTINED state with error code). Proven by test: CVE-A PASS / CVE-B QUARANTINED / CVE-C PASS in one batch.
- Retry safety: processor steps are pure functions of (source record + D1 state); re-running a stage is safe.
- Duplicate delivery safety: `processing_runs` unique key `(source_id, external_message_id, content_hash)`; report identity `sha(subject + pipeline_version + report_schema_version)`; publication identity unique `(report_id, publication_target)`. Replaying the same CVE updates in place; never duplicates articles.
- Identifier ladder: source event ID (hash) → CVE identity (CVE-YYYY-NNNNN) → processing run (run_id) → report identity → publication identity.

## 6. Golden CVE suite (Phase 34)

Fixtures in `tests/fixtures/golden_cves/` — each a real recorded source payload + expected canonical object + expected invariants outcome:

1. ordinary CVE (NVD record, no KEV, no exploit) 2. KEV CVE (real KEV JSON slice) 3. critical CVSS 9.8 4. complex version ranges (CPE ranges, per-product fixes) 5. vendor advisory (MSRC/CSAF) 6. related CVEs pair (I1 negative) 7. exploit available (ExploitDB) 8. exploit absent 9. ransomware UNKNOWN (no campaign evidence) 10. ATT&CK present (mapped) 11. ATT&CK absent 12. conflicting sources (KEV says exploited, vendor says patched-no-exploit → I8) 13. changing source (NVD modified date bump → versioning) 14. source unavailable (fetch fail → retry + FAILED trace, no partial state) 15. AI failure (AiPort throws → deterministic skeleton report, SYNTHESIZED claims absent) 16. enrichment failure (EPSS API down → epss=UNKNOWN, report still valid).

Each fixture doubles as a mutation-test target: corrupt a field in the source payload → exactly the expected downstream fields must change.

## 7. Production validation gate (Phase 36)

Definition of done for the canonical core: a genuinely NEW CVE appears in the KEV/NVD feed → cron discovers it → full lifecycle completes with zero manual input → public report URL live on zayron-x.co → `processing_runs` shows every stage COMPLETED for one run_id → the article's content is traceable claim-by-claim to evidence rows → replay of the same feed does not duplicate. (The current repo artifacts `first_auto_published_cve.json` / `task91_*` attest this was once attempted via preview manual injection; it must be redone through the scheduled path with no `testRun` flag.)
