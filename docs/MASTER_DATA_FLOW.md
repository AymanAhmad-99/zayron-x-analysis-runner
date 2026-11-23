# MASTER DATA FLOW (source → surface, with loss points)

| Stage | Input | Transform | Output | Fidelity |
|---|---|---|---|---|
| Discovery | KEV/NVD/MSRC/CISA feeds | scheduled() fetch (DEAD — no cron) | queue messages | n/a (dormant) |
| Ingest | queue message | JSON→text flatten (12k cap), regex extraction | source_messages, evidence rows | **LOSS: NVD metrics block (CVSS/CWE/CPE/dates) dropped at flatten** — root cause of 1238/1238 null scores |
| Entity resolution | raw text | registries + heuristics | resolved IDs | medium; actor/malware identity from static registries |
| Canonical event match | normalized signal | 3-day window + hash | intelligence_events | partial idempotency only |
| Analysis | text + enrichment | engine_v2 / analyst / queue-path | report objects | divergent outputs per brain (pre-P0.1); KEV/EPSS now evidence-gated |
| Enrichment (post-P0.1) | injected ports | KEV/EPSS evidence lookup | enrichment + provenance | **improved: no fabrication; ABSENT/UNKNOWN states explicit** |
| Report compile | report object | 2 compilers | sections + claims | shape-validated, not truth-validated |
| Publication | READY_TO_PUBLISH | gate → articles | articles row + telegram | 1 published article ever; 3 owners; frozen |
| API | D1 rows | inline SQL → JSON | 60+ GET routes | raw row leakage; 3 envelopes |
| Web | API JSON | hardcoded preview base | SSR pages | **production web reads preview API** |
