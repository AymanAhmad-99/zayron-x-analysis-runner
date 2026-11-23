# ZAYRON-X — CONTENT, BOOK CORPUS & INTELLIGENCE PIPELINE FORENSIC AUDIT

**Authoritative Technical Document & Source of Truth**  
**Audit Date:** 2026-09-03  
**Auditor:** Lead Principal Systems & CTI Forensic Architect  
**Classification:** STRICT FORENSIC SOURCE-OF-TRUTH — NO PROMOTIONAL LANGUAGE / NO SPECULATION  

---

## 0. EXECUTIVE SUMMARY & AUDIT SCOPE

This document provides an evidence-grounded forensic audit of the content, knowledge corpus, data assets, AI invocations, source integrations, and intelligence processing pipeline of ZAYRON-X.

All findings are categorized under strict evidentiary standards:
* **ACTIVE**: Verified in running production code or deployed worker bindings.
* **PARTIAL**: Code implemented and present in repository, but dependent on unconfigured secrets or throttled runtime limits.
* **MOCKED**: Hardcoded, synthetic, or pre-rendered display data disconnected from dynamic database queries.
* **LEGACY**: Superseded artifacts or code retained from previous iterations.
* **UNUSED**: Present in repository or schemas but uninvoked by any runtime path.
* **PLANNED**: Referenced in schemas, comments, or documentation without underlying implementation.
* **UNKNOWN**: Cannot be determined from repository files or accessible runtimes without additional verification.

### Core Architectural Inventory Summary
1. **Physical Knowledge Documents**: 14 physical source documents (PDF, STIX JSON, HTML) totaling ~72 MB stored locally in `.zayron/knowledge/physical-15/`, yielding 35,185 derived text chunks in `.zayron/knowledge/physical-15/derived/physical-15-chunks.ndjson`.
2. **Curated Reference Manifests**: 20 canonical reference books/standards in `KNOWLEDGE_MANIFEST_20` (`manifest.ts`) and 115 structured knowledge entities in `MASTER_KNOWLEDGE_ENTITIES_115` (`master_manifest.ts`).
3. **Database & Schema**: 30 relational tables defined across 9 SQLite migrations for Cloudflare D1 database `zayron-x-db`. In production backup snapshot (`zayron-x-db.sql`), 433 intelligence events, 433 evidence records, 481 source messages, 53 knowledge documents, 2,045 knowledge chunks, 29 sources, and 13 published articles are recorded. Live remote D1 queries are currently throttled by Cloudflare Free Tier limit (Code 7500: daily row read limit exceeded).
4. **AI Models**: 100% native Cloudflare Workers AI. Zero external third-party LLM APIs (OpenAI, Anthropic) are utilized in runtime processing. Active models: `@cf/meta/llama-3.1-8b-instruct` (translation & deep article synthesis), `@cf/meta/llama-3.1-8b-instruct-fp8` (analyst reasoning), and `@cf/baai/bge-base-en-v1.5` (768-dimensional dense vector embeddings for Cloudflare Vectorize).
5. **Collection Architecture**: 4 government/authoritative RSS/REST endpoints polled every 15 minutes (`cisa-rss`, `nvd-api`, `cisa-kev`, `msrc-advisory`). Telegram MTProto collector implemented via Cloudflare Durable Object (`zayron-telegram-collector-do`) targeting 35 channels defined in `workers/targets.json`; currently in `DISCONNECTED` status pending persistent session authorization.
6. **Report Generation**: PDF report generation is **DATABASE-ONLY / PLANNED**. Columns `pdf_r2_key` exist in D1 schemas, but zero PDF rendering engines (Puppeteer, PDFKit, `@react-pdf`) exist in the codebase.

---

## 1. COMPLETE DOCUMENT & KNOWLEDGE CORPUS DISCOVERY

The repository was searched exhaustively across `docs/`, `db/`, `packages/`, `workers/`, `apps/`, and `.zayron/` for all references to books, knowledge documents, chunks, vectors, and reference materials.

### Discovered Knowledge Directories & Stores
1. `.zayron/knowledge/physical-15/`: Root storage for 14 downloaded physical source documents, acquisition logs, and retry logs.
2. `.zayron/knowledge/physical-15/derived/`: Contains `physical-15-chunks.ndjson` (60,106,386 bytes, 35,185 chunks), `physical-15-chunks.sql` (66,712,357 bytes), and processing summary.
3. `.zayron/knowledge/batch-001/`: Intermediate ingestion batch containing `cisa-kev.json`, `nist-sp-800-150.pdf`, `nist-sp-800-86.pdf`, `chunks.ndjson` (2.6 MB), and `vectors.ndjson` (31,181,301 bytes).
4. `.zayron/knowledge/canonical-v1/`: Contains `canonical-v1-chunks.ndjson` (67,928,007 bytes) and `ingestion-checkpoint.json` recording 16,500 embedded chunks.
5. `packages/intelligence/src/knowledge/`: Contains code manifests (`manifest.ts`, `master_manifest.ts`), pre-chunked TypeScript datasets (`corpus.ts`, `corpus_expanded_350.ts`), and sync routines (`sync.ts`).
6. `db/knowledge_batch_001_metadata.sql`: D1 insert script tracking 3 baseline artifacts (`nist-sp-800-150`, `nist-sp-800-86`, `cisa-kev`) in `knowledge_artifacts`.
7. `workers/scripts/reconcile-and-ingest-corpus.py`: Python script orchestrating chunking, SHA-256 verification, and Cloudflare Vectorize batch upserting.

---

## 2. BOOK & CORPUS INVENTORY (TABLE A)

| ID | Document / Book Title | Author / Publisher | File Type & Location | Authority Tier | Status | Chunks Extracted | Embedded in Vectorize? | Evidence |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `01-heuer` | *Psychology of Intelligence Analysis* | Richards J. Heuer, Jr. / CIA CSI | PDF (`.zayron/knowledge/physical-15/01-heuer-psychology.pdf`, 1.90 MB) | Tier 1 | ACTIVE (Local Derived) | Yes (part of 35,185 set) | PARTIAL (Batch checkpoint) | File sha256 verified; derived ndjson |
| `02-icd203` | *ICD 203: Analytic Standards* | Office of the DNI | None (Download failed: HTTP 403 Forbidden) | Tier 0 | UNUSED / FAILED | 0 | No | `.zayron/knowledge/physical-15/acquisition-results.json:16` |
| `03-nist-150` | *NIST SP 800-150: Guide to Cyber Threat Info Sharing* | Mark R. Johnson / NIST | PDF (`.zayron/knowledge/physical-15/03-nist-sp-800-150.pdf`, 509 KB) | Tier 0 | ACTIVE | Yes | Yes (in `batch-001/vectors.ndjson`) | `knowledge_batch_001_metadata.sql:7-16` |
| `04-nist-86` | *NIST SP 800-86: Guide to Forensic Techniques in Incident Response* | NIST | PDF (`.zayron/knowledge/physical-15/04-nist-sp-800-86.pdf`, 2.81 MB) | Tier 0 | ACTIVE | Yes | Yes (in `batch-001/vectors.ndjson`) | `knowledge_batch_001_metadata.sql:17-26` |
| `05-nist-61` | *NIST SP 800-61 Rev. 3: Incident Handling Guidelines* | Paul Cichonski et al. / NIST | PDF (`.zayron/knowledge/physical-15/05-nist-sp-800-61r3.pdf`, 1.04 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `physical-15-processing-summary.json` |
| `06-nist-csf` | *NIST Cybersecurity Framework 2.0 (CSF 2.0)* | NIST | PDF (`.zayron/knowledge/physical-15/06-nist-csf-2.pdf`, 1.51 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `physical-15-processing-summary.json` |
| `07-cvss4` | *FIRST Common Vulnerability Scoring System (CVSS) v4.0* | FIRST.Org | HTML (`.zayron/knowledge/physical-15/07-first-cvss4.html`, 118 KB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `physical-15-processing-summary.json` |
| `08-epss` | *FIRST Exploit Prediction Scoring System (EPSS)* | FIRST.Org | HTML (`.zayron/knowledge/physical-15/08-first-epss.html`, 26.8 KB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `.zayron/knowledge/physical-15/final-retry-results.json:15` |
| `09-attack` | *MITRE ATT&CK® Enterprise STIX Matrix (v15.1)* | MITRE Corporation | JSON (`.zayron/knowledge/physical-15/09-mitre-attack.json`, 53.8 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | Enterprise STIX JSON dump parsed |
| `10-stix21` | *OASIS STIX™ 2.1 Specification* | OASIS CTI TC | PDF (`.zayron/knowledge/physical-15/10-oasis-stix21.pdf`, 6.13 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | Acquired via mirror; 6.13 MB local file |
| `11-taxii21` | *OASIS TAXII™ 2.1 Specification* | OASIS CTI TC | PDF (`.zayron/knowledge/physical-15/11-oasis-taxii21.pdf`, 1.27 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | Acquired via mirror; 1.27 MB local file |
| `12-ai-rmf` | *NIST AI 100-1: Artificial Intelligence Risk Management Framework* | NIST | PDF (`.zayron/knowledge/physical-15/12-nist-ai-rmf.pdf`, 1.94 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `physical-15-processing-summary.json` |
| `13-genai` | *NIST AI 600-1: Generative AI Profile for AI RMF* | NIST | PDF (`.zayron/knowledge/physical-15/13-nist-genai-profile.pdf`, 1.17 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `physical-15-processing-summary.json` |
| `14-sp800-53` | *NIST SP 800-53 Rev. 5: Security and Privacy Controls* | NIST | PDF (`.zayron/knowledge/physical-15/14-nist-sp-800-53.pdf`, 6.07 MB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `physical-15-processing-summary.json` |
| `15-owasp` | *OWASP Top 10 Application Security Risks* | OWASP Foundation | HTML (`.zayron/knowledge/physical-15/15-owasp-top10.html`, 71.4 KB) | Tier 0 | ACTIVE (Local Derived) | Yes | PARTIAL | `.zayron/knowledge/physical-15/final-retry-results.json:23` |
| `doc-idir` | *Intelligence-Driven Incident Response (2nd Ed)* | Rebekah Brown, Scott J. Roberts / O'Reilly | TypeScript Manifest (`manifest.ts:20`) | Tier 1 | ACTIVE (Code Chunks) | 4 curated chunks | Yes (in `corpus.ts`) | `packages/intelligence/src/knowledge/corpus.ts:16` |
| `doc-pma` | *Practical Malware Analysis* | Michael Sikorski, Andrew Honig / No Starch | TypeScript Manifest (`manifest.ts:35`) | Tier 1 | ACTIVE (Code Chunks) | 4 curated chunks | Yes (in `corpus.ts`) | `packages/intelligence/src/knowledge/corpus.ts:58` |
| `doc-pnsm` | *The Practice of Network Security Monitoring* | Richard Bejtlich / No Starch Press | TypeScript Manifest (`manifest.ts:50`) | Tier 1 | ACTIVE (Code Chunks) | 3 curated chunks | Yes (in `corpus.ts`) | `packages/intelligence/src/knowledge/corpus.ts:112` |
| `doc-amf` | *The Art of Memory Forensics* | Michael Hale Ligh et al. / Wiley | TypeScript Manifest (`manifest.ts:65`) | Tier 1 | ACTIVE (Code Chunks) | 3 curated chunks | Yes (in `corpus.ts`) | `packages/intelligence/src/knowledge/corpus.ts:154` |
| `doc-tm` | *Threat Modeling: Designing for Security* | Adam Shostack / Wiley | TypeScript Manifest (`manifest.ts:80`) | Tier 1 | ACTIVE (Code Chunks) | 3 curated chunks | Yes (in `corpus.ts`) | `packages/intelligence/src/knowledge/corpus.ts:192` |
| `doc-tih` | *The Threat Intelligence Handbook* | Recorded Future Experts / CyberEdge Press | TypeScript Manifest (`manifest.ts:95`) | Tier 1 | ACTIVE (Code Chunks) | 3 curated chunks | Yes (in `corpus.ts`) | `packages/intelligence/src/knowledge/corpus.ts:230` |

---

## 3. BOOK STRUCTURE & DIVISION ANALYSIS

Inspection of `packages/intelligence/src/knowledge/` and `.zayron/knowledge/` reveals a multi-tiered hierarchical division system:

```
Corpus Hierarchy:
├── Authority Tier (0 to 4)
│   ├── Tier 0: Authoritative Standards (NIST, CISA, MITRE, FIRST, OASIS, ISO) [Weight: 1.00]
│   ├── Tier 1: Peer-Reviewed Books & Institutional Research (O'Reilly, No Starch, Wiley) [Weight: 0.85]
│   ├── Tier 2: ZAYRON-X Empirical Observations & Verified Telemetry [Weight: 0.70]
│   ├── Tier 3: Secondary Security Journalism & Aggregator Feeds (BleepingComputer, THN) [Weight: 0.50]
│   └── Tier 4: Unverified Community Signals & Raw Forum Telemetry [Weight: 0.25]
│
├── Document Class (`document_type`)
│   ├── 'framework' (e.g. MITRE ATT&CK, NIST CSF 2.0)
│   ├── 'standard' (e.g. NIST SP 800-53, OWASP Top 10)
│   ├── 'regulation' (e.g. EU NIS2, DORA, CIRCIA)
│   ├── 'book' (e.g. Practical Malware Analysis, Intelligence-Driven IR)
│   ├── 'advisory' (e.g. CISA KEV, Vendor Security Advisories)
│   ├── 'spec' (e.g. STIX 2.1, TAXII 2.1, CVSS v4.0)
│   └── 'source_channel' (e.g. Telegram research channels)
│
├── Physical Artifact / Document Entity (`knowledge_artifacts` / `knowledge_documents`)
│   ├── Unique Document ID (e.g. `doc_ref_01_idir`, `kb_mitre_attack`)
│   ├── Content Hash (SHA-256 of raw file or authoritative text)
│   └── Canonical Source URL & Licensing Metadata
│
└── Granular Knowledge Chunk (`StructuredKnowledgeChunk` / `knowledge_chunks`)
    ├── Chunk ID (e.g. `chk_idir_01`, `chunk_physical15_000124`)
    ├── Section / Chapter Name (e.g. "Chapter 3: Diamond Model of Intrusion Analysis")
    ├── Page Number (optional, integer)
    ├── Token Count (typically 120–400 tokens per chunk)
    ├── Key Technical Entities (array of strings)
    └── 768-Dimensional Dense Vector Embedding (via `@cf/baai/bge-base-en-v1.5`)
```

---

## 4. THE 11-LAYER PIPELINE — FORENSIC RECONSTRUCTION (TABLE B)

The processing model implemented across `workers/ingest/src/index.ts`, `workers/telegram-collector-do/src/collector-do.ts`, and `packages/intelligence/src/` maps to the following 11 operational layers:

| Layer | Name | Input | Processing | Output | Code Location | AI Model | Data Store Impact | Current Status | Evidence |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **1** | **Source Collection & Triggering** | External endpoints (CISA RSS, NVD API, CISA KEV, MSRC RSS) & Telegram MTProto streams | Polling via 15-minute cron trigger; persistent WebSocket listening in Durable Object | Raw message payload with metadata | `workers/ingest/src/index.ts:78-147`, `workers/telegram-collector-do/src/collector-do.ts:205` | None | None | **ACTIVE** (RSS/API active; Telegram DO active but unauthenticated) | Scheduled cron handlers; GramJS event handlers |
| **2** | **Envelope Serialization & Ingestion Queueing** | Raw text, channel metadata, external IDs | Constructs canonical envelope; computes SHA-256 hex string; dispatches to Cloudflare Queue | Queue message in `zayron-ingest-queue` | `workers/ingest/src/index.ts:59-63`, `workers/telegram-collector-do/src/collector-do.ts:262-282` | None | Cloudflare Queue buffer | **ACTIVE** | `env.INGEST_QUEUE.send(payload)` |
| **3** | **Consumer Ingestion & Idempotency Gate** | Batch of messages from `zayron-ingest-queue` | Queries D1 `source_messages` by `(source_id, external_message_id)` OR `content_hash`. Drops duplicates | Verified non-duplicate message or ACK drop | `workers/ingest/src/index.ts:187-200` | None | D1 read on `source_messages` | **ACTIVE** | `SELECT id FROM source_messages WHERE ... LIMIT 1` |
| **4** | **Source Authority & Trust Evaluation** | `source_id`, payload metadata | Queries `sources` table for `trust_score`, `status`, and `enabled`. Auto-registers new sources with default trust 0.85 | Validated source profile & trust score | `workers/ingest/src/index.ts:201-231` | None | D1 read/insert on `sources` | **ACTIVE** | `SELECT display_name, trust_score FROM sources` |
| **5** | **Normalization, Entity Extraction & Noise Filter** | Raw text string | Regex extraction (`CVE`, `IPv4`, `SHA256`, `TTP`); keyword matching (`KNOWN_ACTORS`, `KNOWN_MALWARE`); spam filter; language detection | `PipelineResult` containing extracted entities, language code, and spam flag | `packages/intelligence/src/normalization/pipeline.ts:491-580` | None | Quarantines spam into `source_messages` with status `'QUARANTINED'` | **ACTIVE** | Unit tested in `tests/telegram_pipeline.test.ts` |
| **6** | **Language Gate & Translation Synthesis** | Non-English raw text (Russian, Persian, Arabic, Chinese) | Invokes Workers AI if `requiresAITranslation` is true; prompts model to output strictly English JSON preserving technical identifiers; validates via `validateEnglishQuality()` | Clean English title & summary | `workers/ingest/src/index.ts:268-352` | `@cf/meta/llama-3.1-8b-instruct` | Flags message as `'NEEDS_TRANSLATION'` if English gate fails | **ACTIVE** | System prompt: `Convert non-English CTI... output 100% English` |
| **7** | **Canonical Intelligence Event & Evidence Ledger** | Verified English title, summary, entities, trust score | Generates UUIDs; classifies event type; calculates multi-dimensional confidence score; inserts into `intelligence_events` and `evidence` tables | Persistent event record (`evt_*`) & evidence link (`evi_*`) | `workers/ingest/src/index.ts:354-413` | None | D1 `intelligence_events`, `evidence`, `event_trace` | **ACTIVE** | SQL inserts into `intelligence_events` & `evidence` |
| **8** | **Entity Resolution & Relational Graph Mapping** | Extracted raw entity strings | Resolves canonical actor slugs (`resolveActor`), malware families (`resolveMalware`), CVEs (`resolveVulnerability`); links TTPs; extracts graph edges | Upserted entities in `actors`, `malware`, `vulnerabilities`, `iocs`, `ttp_mappings`, `relations` | `workers/ingest/src/index.ts:414-535` | None | D1 `actors`, `malware`, `vulnerabilities`, `iocs`, `relations` | **ACTIVE** | `ON CONFLICT(slug) DO UPDATE...` |
| **9** | **Campaign Candidate Formation** | Event title, summary, resolved actors, malware, CVEs | Evaluates multi-entity conjunctions via `detectCampaignCandidate()`; creates campaign record if threshold met | Campaign record (`camp_*`) and `ACTOR_CONDUCTS_CAMPAIGN` relationship | `workers/ingest/src/index.ts:538-574` | None | D1 `campaigns`, `relations` | **ACTIVE** | `INSERT INTO campaigns ...` |
| **10** | **Semantic Vectorization & Vectorize Upsert** | Event title + summary string | Generates 768-dimensional float embedding vector; upserts to Cloudflare Vectorize index with metadata payload | Vector stored in `zayron-knowledge-index` | `workers/ingest/src/index.ts:576-605` | `@cf/baai/bge-base-en-v1.5` | Cloudflare Vectorize index | **ACTIVE** | `env.VECTORIZE.upsert([...])` |
| **11** | **Publication Gate, Deep Report & Social Distribution** | Event severity, confidence score, entities | Evaluates `evaluatePublicationEligibility()`; budget guard (<150 runs/day); invokes deep reasoning AI for structured 4-part assessment; inserts `articles`; dispatches social payload | Public article (`art_*`) in D1 `articles` table & message in `zayron-publish-queue` | `workers/ingest/src/index.ts:607-750`, `packages/intelligence/src/publishing/` | `@cf/meta/llama-3.1-8b-instruct` | D1 `articles`, `ai_runs`; Queue `zayron-publish-queue` | **ACTIVE** | `INSERT INTO articles ...`, `PUBLISH_QUEUE.send(...)` |

---

## 5. AI PIPELINE FORENSICS & MODEL INVENTORY (TABLE C)

All artificial intelligence executions across ZAYRON-X occur on **Cloudflare Workers AI**. Zero API keys exist for external model providers.

| Model Identifier | Functional Category | Invocating Worker / Module | Input Data | Output Structure | Budget Controls | Fallback Behavior | Operational Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `@cf/meta/llama-3.1-8b-instruct` | Translation & Normalization | `workers/ingest/src/index.ts:288` | Non-English raw text (up to 1,500 chars) + extracted technical entity list | JSON object: `{"title": "...", "summary": "..."}` in strict technical English | `max_tokens: 400`, `temperature: 0.1` | Falls back to deterministic regex-assembled English string (`synthesizeEnglishTechnicalSignal`); message held with status `'NEEDS_TRANSLATION'` | **ACTIVE** |
| `@cf/meta/llama-3.1-8b-instruct` | Deep Article Generation | `workers/ingest/src/index.ts:639` | Event title, summary, entity payload | JSON object: `executive_assessment`, `what_happened`, `why_it_matters`, `defensive_implications` | Budget guard in D1: `< 150` runs per calendar day; `max_tokens: 800`, `temperature: 0.2` | Falls back to deterministic 4-section Markdown template generated from entity metadata | **ACTIVE** |
| `@cf/meta/llama-3.1-8b-instruct-fp8` | Analyst Reasoning & Report Synthesis | `workers/api/src/index.ts:118, 568`, `packages/intelligence/src/analyst/engine.ts:201` | Grounded RAG context pack (retrieved chunks, D1 events, evidence, citations) + user prompt | Structured JSON report (`IntelligenceAssessmentReport`) with confidence state, novelties, defensive actions | Eligibility score threshold (`>= 20`); token limit; neuron estimation | Falls back to deterministic structured D1 entity report or `INSUFFICIENT_EVIDENCE` notice | **ACTIVE** |
| `@cf/baai/bge-base-en-v1.5` | Dense Text Embedding | `workers/ingest/src/index.ts:580`, `workers/api/src/index.ts:347, 931`, `packages/intelligence/src/rag/retrieval.ts:240` | Cleaned title + summary string, query string, or knowledge chunk text | Array of 768 floating-point numbers | Input text sliced to max token boundary | Logs error non-fatally; skips vector upsert | **ACTIVE** |

### Functional Classification of AI Invocations
1. **Translation AI**: `@cf/meta/llama-3.1-8b-instruct` translates foreign threat telemetry (Russian, Persian, Arabic, Chinese) into objective English threat advisories. Strict prompt rules enforce preservation of literal CVE identifiers, IPv4 addresses, and SHA-256 hashes without lexical translation.
2. **Extraction AI**: Deterministic regex rules and lookup dictionaries handle 100% of entity extraction (`packages/intelligence/src/normalization/pipeline.ts`). LLMs are intentionally **not used** for raw entity extraction to prevent hallucinated CVEs or altered IP addresses.
3. **Classification AI**: Severity level (`critical`, `high`, `medium`, `low`) and confidence score (0.05 to 0.99) are computed mathematically via deterministic heuristics (`calculateSeverity` and `calculateConfidence`). The LLM does not assign confidence scores.
4. **Generation AI**: `@cf/meta/llama-3.1-8b-instruct` produces structured editorial text (Executive Assessment, What Happened, Why It Matters, Defensive Implications) for qualified events meeting the publication gate.
5. **Retrieval / RAG**: Hybrid retrieval algorithm in `packages/intelligence/src/rag/retrieval.ts` combines Vectorize cosine distance search with D1 graph traversal across entities, weighted by authority tiers (0 to 4).
6. **Embedding Generation**: `@cf/baai/bge-base-en-v1.5` produces dense 768-dimensional embeddings for both knowledge chunks and dynamic intelligence events.

---

## 6. INTELLIGENCE SOURCES INVENTORY (TABLE D)

| Source Identifier | Source Display Name | Type | URL / Endpoint | Ingestion Frequency | Authority Tier | Status | Verification Evidence |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `nvd-api` | NIST National Vulnerability Database | REST API | `https://services.nvd.nist.gov/rest/json/cves/2.0` | 15 minutes (cron) | 0 | **ACTIVE** | Polled in `workers/ingest/src/index.ts:103` |
| `cisa-kev` | CISA Known Exploited Vulnerabilities | JSON Feed | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | 15 minutes (cron) | 0 | **ACTIVE** | Polled in `workers/ingest/src/index.ts:117` |
| `cisa-rss` | CISA Cybersecurity Advisories | RSS/XML | `https://www.cisa.gov/cybersecurity-advisories/all.xml` | 15 minutes (cron) | 0 | **ACTIVE** | Polled in `workers/ingest/src/index.ts:88` |
| `msrc-advisory` | Microsoft Security Response Center | RSS/XML | `https://api.msrc.microsoft.com/update-guide/rss` | 15 minutes (cron) | 0 | **ACTIVE** | Polled in `workers/ingest/src/index.ts:132` |
| `telegram_channels` | Telegram Security Community Channels | MTProto Stream | MTProto WebSocket via Cloudflare DO | Real-time event listener | 1–3 | **PARTIAL** | 35 channels in `workers/targets.json`; collector in `workers/telegram-collector-do` |
| `darkweb_onion` | Dark Web Ransomware Leak Sites | Onion Links | `.onion` targets listed in `targets.json` | Manual / Batch | 2 | **PLANNED** | 2 onion links in `targets.json:40-41`; no active Tor proxy configured in Workers |

---

## 7. TELEGRAM SOURCE FORENSICS (TABLE E)

Configuration file `workers/targets.json` defines 35 target Telegram channels. Implementation file `workers/telegram-collector-do/src/collector-do.ts` provides a GramJS MTProto client running inside a Cloudflare Durable Object (`TelegramCollectorDO`).

| Channel Handle / Target | Category / Focus | Collector Class | Transport / Protocol | State in Repository | Destination Queue | Evidentiary Line |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `ctinow` | Cyber Threat Intelligence Alerts | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `workers/targets.json:3` |
| `thehackernews` | Cyber Security Journalism | `TelegramCollectorDO` | MTProto over WSS | Configured & In DO Default | `zayron-ingest-queue` | `targets.json:4`, `collector-do.ts:47` |
| `xakep_ru` | Russian CTI / Vulnerability Research | `TelegramCollectorDO` | MTProto over WSS | Configured & In DO Default | `zayron-ingest-queue` | `targets.json:5`, `collector-do.ts:46` |
| `ZerodayAlert` | Zero-Day Disclosures | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:6` |
| `cveNotify` | Real-Time CVE Notifications | `TelegramCollectorDO` | MTProto over WSS | Configured & In DO Default | `zayron-ingest-queue` | `targets.json:7`, `collector-do.ts:46` |
| `APT_Notes` | Threat Actor Whitepapers | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:8` |
| `malwr` | Malware Samples & Hashes | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:9` |
| `socanalyst` | SOC Detection Engineering | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:10` |
| `Positive_Technologies` | Russian Industrial / Enterprise CTI | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:11` |
| `alukatsky` | Security Architecture / Analysis | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:12` |
| `BleepingComputer` | Ransomware & Breach Reporting | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:13` |
| `SecLabNews` | Security Lab Advisories | `TelegramCollectorDO` | MTProto over WSS | Configured & In DO Default | `zayron-ingest-queue` | `targets.json:14`, `collector-do.ts:47` |
| `true_secator` | Offensive Operations & Exploit News | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:15` |
| `black_triangle_tg` | Russian Threat Research | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:16` |
| `data_secrets` | Data Leaks & Credential Dumps | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:17` |
| `hack_less` | Threat Actor Tracking | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:18` |
| `thebugbountyhunter` | Exploits & Bug Bounty Writeups | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:19` |
| `Russian_OSINT` | OSINT Methodology & Investigation | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:20` |
| `poxek` | Reverse Engineering & Malware | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:21` |
| `elliot_cybersec` | Cyber Espionage Telemetry | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:22` |
| `secharvester` | IOC Ingestion & Honeypot Logs | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:23` |
| `irozysk` | Darknet & Cybercrime Intel | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:24` |
| `codeby_sec` | Exploit Analysis & Forensics | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:25` |
| `tg_infosec` | InfoSec News & CVE Warnings | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:26` |
| `Cyber_Security_Channel` | Global Infosec Advisories | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:27` |
| `cyberyozh_official` | Anonymity & Infrastructure Security | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:28` |
| `searchack` | Vulnerability Research | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:29` |
| `IRCyberGuardians` | Persian Threat Telemetry | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:30` |
| `Offensiv3Sec` | Offensive Security TTPs | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:31` |
| `cibsecurity` | Cyber Defense Telemetry | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:32` |
| `OffensiveTwitter` | Exploit POCs & Disclosures | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:33` |
| `cybred` | Red Team Telemetry | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:34` |
| `osint_san_framework` | OSINT Frameworks & Tools | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:35` |
| `osint_mindset` | Investigative OSINT Feeds | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:36` |
| `HNews` | Breaking Cyber News | `TelegramCollectorDO` | MTProto over WSS | Configured | `zayron-ingest-queue` | `targets.json:37` |

### Telegram Collector Operational Findings
1. **Collector Architecture**: Built using `telegram` (GramJS) with `useWSS: true` inside a Cloudflare Durable Object (`TelegramCollectorDO`). Persistent session strings are stored in DO SQLite storage (`this.ctx.storage.put('telegram_session', sessionStr)`).
2. **Current Runtime Status**: `DISCONNECTED`. The Durable Object requires `API_ID` and `API_HASH` secrets configured in Cloudflare environment secrets. When initialized without a pre-authenticated session string, it enters `DISCONNECTED` state awaiting manual credential verification.
3. **Queue Interface**: When active, incoming messages are converted to JSON envelopes and emitted directly to `zayron-ingest-queue` (`this.env.INGEST_QUEUE.send(payload)`).

---

## 8. SOURCE QUALITY & CONFIDENCE MODEL

ZAYRON-X implements mathematical, code-enforced formulas for source trust, event confidence, and publication gating.

### Source Trust Scores (`sources.trust_score`)
* Authoritative Government / Standards Registries (`nvd-api`, `cisa-kev`, `msrc-advisory`): **0.95 – 1.00**
* Verified Security Research & Vendor Advisories (`mandiant`, `unit42`): **0.85 – 0.90**
* Established Technical Telegram Channels (`vxunderground`, `xakep_ru`): **0.75 – 0.85**
* Community & General News Channels (`thehackernews`, `HNews`): **0.50 – 0.65**
* Auto-registered Unverified Sources: **0.85 default** (capped by strict downstream entity verification)

### Multi-Dimensional Confidence Formula (`packages/intelligence/src/normalization/pipeline.ts:298-320`)
```ts
score = (sourceTrustScore * 0.45)
      + (entities.cves.length > 0 ? 0.25 : 0)
      + ((entities.sha256s.length > 0 || entities.ipv4s.length > 0) ? 0.15 : 0)
      + ((entities.actors.length > 0 || entities.malware.length > 0) ? 0.10 : 0)
      + (hasEvidence ? 0.10 : 0);

// Calibrated bounds: [0.10, 0.99]
```

### Categorical Confidence States
* **CONFIRMED**: Score `≥ 0.90` (Multi-source corroboration, authoritative CVE, and cryptographic IOCs)
* **VERY_HIGH**: Score `0.75 – 0.89` (High-trust source with technical entity validation)
* **HIGH**: Score `0.60 – 0.74` (Established source with verified technical identifiers)
* **MODERATE**: Score `0.40 – 0.59` (Single-source observation with partial entities)
* **LOW / UNVERIFIED**: Score `< 0.40` (Uncorroborated claim; withheld from public publication)

---

## 9. WEBSITE DATA & FRONTEND RENDERING AUDIT (TABLE F)

| Route / Domain | Target D1 Table | API Endpoint Binding | Real Data in Production? | Fallback / Mock Behavior | Audit Status | Freshness / Notes |
| :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| **`/` (Homepage)** | `articles`, `intelligence_events` | Pre-rendered static layout with client Three.js visual | **MOCKED / STATIC** | Hero metrics (`41,200+`, `Continuous Archive`, `Real-Time Sync`), logos, and 4 actor profile cards are statically composed | **ACTIVE** | Revalidates every 60s; does not fail when D1 row read limit is hit |
| **`/threats`** | `intelligence_events` | `GET /api/v1/feed` | **REAL D1** | Renders dynamic `<IntelligenceRow />` items; falls back to `<EmptyState />` if D1 query returns empty or 500 | **ACTIVE** | Live query: `SELECT * FROM intelligence_events ORDER BY first_seen_at DESC` |
| **`/vulnerabilities`** | `vulnerabilities` | `GET /api/v1/vulnerabilities` | **REAL D1** | Renders vulnerability cards with CVSS/EPSS badges; falls back to `<EmptyState />` | **ACTIVE** | Live query: `SELECT * FROM vulnerabilities` |
| **`/actors`** | `actors` | `GET /api/v1/actors` | **REAL D1** | Renders threat actor directory; falls back to empty catalog notice | **ACTIVE** | Live query: `SELECT * FROM actors` |
| **`/malware`** | `malware` | `GET /api/v1/malware` | **REAL D1** | Renders malware family listings; falls back to empty state | **ACTIVE** | Live query: `SELECT * FROM malware` |
| **`/iocs`** | `iocs` | `GET /api/v1/iocs` | **REAL D1** | Renders tabular IOC registry (IPs, hashes, domains); falls back to empty state | **ACTIVE** | Live query: `SELECT * FROM iocs` |
| **`/campaigns`** | `campaigns` | `GET /api/v1/campaigns` | **REAL D1** | Renders campaign dossiers; falls back to empty state | **ACTIVE** | Live query: `SELECT * FROM campaigns` |
| **`/articles` & `/research`** | `reports`, `articles` | `GET /api/v1/reports` & `GET /api/v1/articles` | **REAL D1 WITH FALLBACK** | Queries `reports` and `articles`; provides 3 fallback dossiers if D1 free tier row limit is exceeded | **ACTIVE** | Guarantees zero 404s even under Cloudflare rate limits |
| **`/knowledge`** | Reference Standards Registry | Static integration of `MASTER_KNOWLEDGE_ENTITIES_115` | **STRUCTURED REFERENCE** | Displays 6 primary frameworks (MITRE, CISA KEV, FIRST EPSS, NVD, MISP, TLP) with outbound spec links | **ACTIVE** | Static authoritative reference library |
| **`/search`** | Multi-entity (`events`, `cves`, `actors`, `malware`) | `GET /api/v1/search` | **REAL D1** | Executes multi-table `UNION` search across D1 relational index | **ACTIVE** | Dynamic search across edge tables |

---

## 10. PUBLICATION PIPELINE (TABLE G)

| Stage | Input | Processing Logic | Output Structure | Quality & Trust Verification Gate | Storage Destination | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Signal Ingest** | Raw string & source metadata | Hash calculation, language detection | Ingestion payload | Idempotency check against `source_messages` content hash | Cloudflare Queue buffer | **ACTIVE** |
| **Normalization** | Ingestion payload | Technical entity extraction (`CVE`, `IPv4`, `SHA256`, `TTP`) | `PipelineResult` | Spam keyword blocklist & chatter heuristic filter | `source_messages` (`QUARANTINED` or `SUCCEEDED`) | **ACTIVE** |
| **Language Gate** | Foreign text | Workers AI `@cf/meta/llama-3.1-8b-instruct` translation | Strict English JSON | `validateEnglishQuality()` checks for zero Cyrillic/Arabic/Chinese character leakage | `source_messages.status = 'NEEDS_TRANSLATION'` if failed | **ACTIVE** |
| **Event Ledger** | Validated English signal | Assigns severity (`calculateSeverity`) and confidence | Canonical intelligence event | Trust score weighting & source authority tier enforcement | D1 `intelligence_events` & `evidence` tables | **ACTIVE** |
| **Publication Evaluation** | Canonical event | Evaluates `evaluatePublicationEligibility()` | Publication decision: `PUBLISHED` vs `DRAFT` | Requires Critical/High severity with Confidence `≥ 0.60`, or Corroborated Entity with Confidence `≥ 0.75` | Held in `DRAFT` if below threshold | **ACTIVE** |
| **Deep AI Synthesis** | Qualified event | Workers AI `@cf/meta/llama-3.1-8b-instruct` reasoning | 4-part executive report | D1 AI Budget Guard (`< 150` runs/day); fallback to deterministic Markdown | D1 `articles`, `ai_runs` | **ACTIVE** |
| **Social Distribution** | Published article | `generatePlatformDerivatives()` | Formatted Telegram broadcast text | Strict controlled outbound queue | Dispatched to `zayron-publish-queue` | **ACTIVE** |

---

## 11. RAG & VECTOR RETRIEVAL FORENSICS

### Retrieval Pipeline Architecture
```
Query String
  ├── Extract Entities: extractCves(), extractIpv4(), extractSha256(), resolveActor(), resolveMalware()
  ├── Parallel Execution:
  │   ├── Branch 1: Dense Semantic Search (Workers AI @cf/baai/bge-base-en-v1.5 -> Cloudflare Vectorize)
  │   └── Branch 2: Structured Graph Lookup (D1 SQL queries across actors, malware, cves, iocs, recent events)
  └── Hybrid Fusion & Ranking:
      Score = (0.45 * SemanticSimilarity) 
            + (0.25 * EntityMatchScore) 
            + (0.20 * AuthorityTierWeight) 
            + (0.10 * FreshnessScore)
```

### Technical Vector Specifications
* **Embedding Model**: `@cf/baai/bge-base-en-v1.5`
* **Dimensionality**: 768 dimensions
* **Distance Metric**: Cosine similarity
* **Vectorize Index**: `zayron-knowledge-index`
* **Default Top-K**: 5 chunks returned per query
* **Authority Multipliers**: Tier 0 = 1.00; Tier 1 = 0.85; Tier 2 = 0.70; Tier 3 = 0.50; Tier 4 = 0.25

---

## 12. DATA FRESHNESS & LATENCY CHARACTERISTICS

* **Authoritative Feed Polling**: 15 minutes (`*/15 * * * *` scheduled cron trigger on `workers/ingest`).
* **Telegram Ingestion Latency**: Sub-second from message event receipt in `TelegramCollectorDO` to Cloudflare Queue dispatch (when MTProto session is connected).
* **Queue Ingestion Processing**: Cloudflare Queue consumer configured with `max_batch_size = 10` and `max_batch_timeout = 5` seconds.
* **AI Article Generation**: 150–600 milliseconds execution duration via Workers AI edge inference.
* **Frontend Cache Invalidation**: ISR route revalidation set to 60 seconds (`revalidate = 60`) on homepage, dynamic routes set to `force-dynamic` with edge caching.

---

## 13. CONTENT GAP ANALYSIS

### What Exists Now (Verified)
* Complete 30-table D1 database schema with migrations.
* 14 physical reference documents and 35,185 derived text chunks in local repository storage.
* 115 structured knowledge entities in code registry.
* 11-layer operational ingestion and normalization pipeline.
* 100% native Cloudflare Workers AI integration for translation, embeddings, and deep article generation.
* Robust deterministic fallback mechanisms across all AI invocations.

### What is Partially Implemented
* Telegram MTProto Collector: Code is complete, but live streaming is blocked until Cloudflare Secrets (`API_ID`, `API_HASH`) and authorized session strings are set.
* RAG Search in Production: Fully coded and tested in unit tests, but blocked from sustained high-volume live production execution by Cloudflare D1 free-tier daily read limits.

### What is Database-Only / Planned
* **PDF Report Generator**: Zero code exists for converting reports into PDF documents. Reports exist strictly as on-screen HTML/JSON dossiers.
* **Tor Onion Scraping**: Dark web onion URLs are documented in `targets.json`, but no Tor SOCKS5 proxy or onion scraper worker exists in the repository.

---

## 14. CONTENT & INTELLIGENCE SOURCE OF TRUTH

### 1. What books / corpus exist?
14 physical source publications exist in `.zayron/knowledge/physical-15/` (including Heuer's *Psychology of Intelligence Analysis*, NIST SP 800-150, NIST SP 800-86, NIST SP 800-61, NIST CSF 2.0, NIST SP 800-53, NIST AI RMF, FIRST CVSS v4.0, FIRST EPSS, MITRE ATT&CK STIX, OASIS STIX/TAXII 2.1, OWASP Top 10). Additionally, 20 canonical reference books/standards are structured in `manifest.ts` and 115 entities in `master_manifest.ts`.

### 2. How are they divided?
Divided across three orthogonal dimensions: **Authority Tiers** (0=Standards, 1=Research/Books, 2=Observations, 3=Secondary, 4=Unverified), **Document Classes** (`framework`, `standard`, `regulation`, `book`, `advisory`, `spec`, `source_channel`), and **Chunk Level** (120–400 token semantic blocks with unique IDs, section names, and 768-dim embeddings).

### 3. What are the actual 11 processing layers?
1. Source Collection & Triggering (RSS/REST/MTProto)
2. Envelope Serialization & Queueing (`INGEST_QUEUE`)
3. Consumer Ingestion & Idempotency Gate (Content hash / message ID dedup)
4. Source Authority & Trust Evaluation (`sources` table)
5. Normalization, Entity Extraction & Noise Filtering (`packages/intelligence`)
6. Language Gate & Translation Synthesis (Workers AI `@cf/meta/llama-3.1-8b-instruct`)
7. Canonical Intelligence Event & Evidence Ledger (`intelligence_events`, `evidence`)
8. Entity Resolution & Relational Graph Mapping (`actors`, `malware`, `vulnerabilities`, `iocs`, `relations`)
9. Campaign Candidate Formation (`campaigns`)
10. Semantic Vectorization & Vectorize Upsert (`@cf/baai/bge-base-en-v1.5`)
11. Publication Gate, Deep AI Report & Social Distribution (`articles`, `PUBLISH_QUEUE`)

### 4. What AI models are actually used?
Three Cloudflare Workers AI models exclusively:
* `@cf/meta/llama-3.1-8b-instruct`: Translation, English normalization, and 4-part structured article generation.
* `@cf/meta/llama-3.1-8b-instruct-fp8`: AI analyst reasoning and RAG report generation.
* `@cf/baai/bge-base-en-v1.5`: 768-dimensional dense vector embeddings.

### 5. What sources are actually connected?
Four authoritative public feeds polled automatically every 15 minutes: NIST NVD 2.0 API, CISA Known Exploited Vulnerabilities (KEV) JSON, CISA Cybersecurity Advisories RSS, and Microsoft MSRC RSS.

### 6. What Telegram channels are actually monitored?
35 channels configured in `workers/targets.json` and 10 hardcoded defaults in `TelegramCollectorDO` (including `cveNotify`, `thehackernews`, `xakep_ru`, `vxunderground`, `seclabnews`, `aptreports`, `blueteamalerts`). The collector is coded in GramJS MTProto over WSS and is currently in `DISCONNECTED` status.

### 7. What data exists in production?
Production database snapshot records 433 intelligence events, 433 evidence records, 481 source messages, 29 sources, 29 vulnerabilities, 13 articles, 7 IOCs, 6 actors, 4 malware families, 104 TTP mappings, 590 relations, 53 knowledge documents, and 2,045 chunks. Live runtime querying is throttled by Cloudflare Free Tier daily read limit (Code 7500).

### 8. What is currently published?
The live production website at `https://zayron-x.co` renders:
* Homepage: Curated sovereign dark theme with Three.js 3D network visualization, receded telemetry stat readouts, 2-row logo strip, and 4 threat profile cards.
* Sub-routes: 8 live D1-backed routes (`/threats`, `/vulnerabilities`, `/actors`, `/malware`, `/iocs`, `/campaigns`, `/articles`, `/knowledge`) resolving with zero 404s.

### 9. How does an event become an article?
An event becomes an article only if it passes `evaluatePublicationEligibility()`:
* Must satisfy Critical/High severity with Confidence `≥ 0.60`, OR contain a corroborated high-value entity (CVE, Actor, Malware, TTP) with Confidence `≥ 0.75`.
* Must pass the English verification gate (zero foreign script leakage).
* Must not be an auto-generated stub title.
* When approved, `@cf/meta/llama-3.1-8b-instruct` synthesizes a 4-part technical report; if budget is exceeded, a deterministic Markdown report is assembled; inserted into `articles` with `is_published = 1`.

### 10. How does an article become a report?
Reports in table `reports` are formal intelligence dossiers. The column `pdf_r2_key` exists in the schema, but PDF generation is **not implemented**. Reports are served purely as structured JSON/Markdown data.

### 11. How does intelligence become social content?
Function `generatePlatformDerivatives()` in `packages/intelligence/src/social/social.ts` converts the structured article assessment into formatted Telegram Markdown posts with threat badges, severity indicators, and deep links. Dispatched to `zayron-publish-queue` with an idempotency key.

### 12. What remains incomplete?
1. Cloudflare Workers plan upgrade or caching layer to lift the D1 Free Tier daily row read limit (Code 7500).
2. Setting Telegram MTProto secrets (`API_ID`, `API_HASH`) in `zayron-telegram-collector-do` to transition from `DISCONNECTED` to `CONNECTED`.
3. PDF compilation worker to render R2 PDF artifacts.
4. Active Tor daemon / bridge for crawling `.onion` ransomware sites.

### 13. What must be fixed before high-volume publication?
1. **D1 Read Throttling**: D1 free tier limits cause 500 errors on high-frequency feed queries; production requires Cloudflare Workers Paid plan or aggressive KV/Cache API caching on read endpoints.
2. **Session Persistence**: Authorize GramJS string session for the Telegram collector to establish live signal ingestion.
3. **Queue Consumer for Publishing**: Ensure `zayron-publish-queue` worker is actively bound to Telegram Bot API credentials for outbound delivery.
