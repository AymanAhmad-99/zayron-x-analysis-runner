# MASTER RUNTIME GRAPH (traced from code, not filenames)

```
                    ┌──────────────────────────── PRODUCTION ────────────────────────────┐
 zayron-x.co/api/* ─▶ zayron-x-api                                                        │
                    │  ├ fetch: 60+ GET routes (POST blocked by LEGACY_FREEZE)            │
                    │  ├ queue(PUBLISH_QUEUE): consumer — frozen early-return, NO ACK     │
                    │  ├ Publisher RPC · KnowledgeProcessor RPC · 2 Workflows             │
                    │  └ in-memory caches (cross-request mutable)                         │
 cron: NONE ──────✖─▶ zayron-x-ingest                                                     │
                    │  ├ scheduled(): unreachable (no trigger) + frozen in prod           │
                    │  ├ queue(INGEST_QUEUE): keeps ONLY testRun messages when frozen     │
                    │  └ RPC: submitNvdCanary (frozen) · triggerControlledKevTest         │
                    │                                                                     │
                    │  zayron-telegram-collector-do ─▶ INGEST_QUEUE (produces)            │
                    │  zayron-x-source-fabric ─▶ 5 queues (2 unconsumed)                  │
                    └─────────────────────────────────────────────────────────────────────┘
```

## Actual call relationships (symbol level)
- `collector-do.ts:4` imports `executeDeepIntelligenceAnalysisV2` from engine_v2 via relative path → analysis happens INSIDE collection (boundary violation).
- `ingest.queue` → `normalizeIntelligenceSignal` → `resolveVulnerability/Actor/Malware` → `matchCanonicalEvent` → evidence INSERT → status transitions → (READY_TO_PUBLISH).
- Publication consumers: api `/publish` route, api queue consumer, `Publisher.publishApprovedIntelligence` RPC — three owners, one shared function.
- `ResearchWorkflow`: validate → retrieval → vectorize → AI → trust gate → ledger (only stage-traced path).
- D1 writes flow from api + ingest + collector directly (no single writer); R2 knowledge bucket written by knowledge ingestion paths; Vectorize indexed from knowledge chunks (bge 768d).

## CVE lifecycle reality
SOURCE (KEV/NVD/RSS/Telegram) → DISCOVERY (**dead: no cron**) → JOB (queue; prod admits only testRun) → RESOLUTION/MAPPING (queue consumer; free-text) → NORMALIZATION (text pipeline) → ENRICHMENT (engine_v2 — now evidence-ports based after P0.1) → ANALYSIS (3 parallel brains) → EVIDENCE (3 stores) → SEMANTIC (ad-hoc validators) → CONFIDENCE (5 calculators) → REPORT (2 compilers) → PUBLISH (3 owners, frozen) → PERSIST (articles/reports/canonical split) → API (GET only) → WEB (reads preview API).
