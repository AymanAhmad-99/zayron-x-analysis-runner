# ZAYRON-X Phase 0 Architecture Discovery

Status: `VERIFIED NOW` from the active repository on 2026-09-14. This is an architecture and information-architecture artifact only. No frontend, backend, schema, Cloudflare resource, or deployment was changed by this discovery.

## Executive boundary

The active frontend was intentionally removed: `apps/web` and `packages/ui` do not exist. The backend remains in `workers/api`, `workers/ingest`, `workers/telegram-collector-do`, `workers/source-fabric`, `packages/intelligence`, `packages/intelligence-kernel`, `packages/types`, `db`, `validation`, corpus assets, and backend tests.

Repository presence is not proof of live deployment or live data. Live service reachability, row counts, bindings, and production route behavior remain `UNCERTAIN` unless verified separately.

## Capability status vocabulary

- `IMPLEMENTED`: active code path and contract are present.
- `PARTIAL`: code exists but has explicit fallback, freeze, missing binding, incomplete contract, or unproven runtime behavior.
- `NOT IMPLEMENTED`: no active backend capability was found for the requested behavior.
- `UNCERTAIN`: source intent exists, but current live behavior or sufficient evidence was not established.

## 1. Backend architecture

| Component | Purpose / input | Output / storage | Frontend relevance | Status |
|---|---|---|---|---|
| API Worker `zayron-x-api` | HTTP `/api/v1/*`; D1, queues, service bindings, AI, Vectorize, R2, WASM | JSON read APIs, controlled mutations, health, reports, search | Primary frontend contract | `PARTIAL`: source routes exist; live availability is not proven |
| Ingest Worker `zayron-x-ingest` | Source signals, queue messages, NVD/CISA/Telegram and enrichment inputs | Canonical events, entities, evidence, embeddings, publication queue messages | Supplies public intelligence | `IMPLEMENTED` in source; runtime topology remains `UNCERTAIN` |
| Telegram Collector DO | Telegram source registry, collection, source health, intelligence fallback | Durable Object state and collector responses | Source and feed fallback | `PARTIAL` |
| Source Fabric Worker | Source registry/raw acquisition and corpus staging | Separate D1/R2/queues/vector indexes | Provenance and source directory | `PARTIAL` |
| D1 | Events, reports, articles, evidence, sources, entities, relations, metrics, jobs | Relational canonical/public data | All listing/detail pages | `IMPLEMENTED` schema; live state `UNCERTAIN` |
| R2 | Knowledge and raw/source artifacts | Corpus objects and range-readable payloads | Internal grounding only unless an explicit public endpoint exposes metadata | `IMPLEMENTED` |
| Vectorize | 768-dimensional knowledge embeddings and shadow retrieval | Vector index records | Search/grounding support, not direct public corpus exposure | `PARTIAL` |
| Workers AI | Embeddings, grounded analysis, editorial synthesis | AI runs and validated outputs | Derived intelligence only after gates | `PARTIAL`, budget and response validation apply |
| Queues | Ingest, publish, source and processing handoff | Asynchronous messages and retries | Eventual availability | `IMPLEMENTED` in configuration/source; live consumers `UNCERTAIN` |
| Workflows | Research and knowledge-corpus processing | Workflow instances and D1 processing ledgers | Background freshness and corpus processing | `IMPLEMENTED` in source/config |
| Rust/WASM kernel | Deterministic validation/parity path | Validation result and health signal | Confidence/trust boundary | `IMPLEMENTED` source and WASM present |
| Publication pipeline | Evidence membership, quality gates, canonical report/article construction | `READY_TO_PUBLISH`, `PUBLISHED`, rejection/quarantine states | Determines safe public content | `IMPLEMENTED` with fail-closed controls |

## 2. Implemented data model

Verified tables/types include:

- `intelligence_events`: id, type, title, summary, severity, confidence, status, content hash, first/last seen, entities, MITRE data, timestamps.
- `intelligence_reports`: intelligence identity, source metadata, title/summary/body, categories, severity/priority, confidence vector, entities, indicators, evidence, citations, publication status, hashes, timestamps.
- `vulnerabilities`: CVE identity and vulnerability attributes; exact current column contract is present in migrations/API queries.
- `malware`: name, slug, type, family, description, YARA and Sigma rule fields.
- `actors`: name, slug, aliases, country, motivation, description, first seen and last active.
- `campaigns`: name, slug, actor link, target sectors/regions, description and dates.
- `iocs`: type, normalized value, event/malware/actor links, confidence and timestamps.
- `articles`: title, slug, dek/content/excerpt, category/tags, severity/confidence, publication flags, canonical event link and publication time.
- `evidence`: event/source/message links, type, URL, weight, snippet, reviewer state and timestamps.
- `sources`: registry identity, handle/display name, URL, type/category/language/region/topic, authority/trust, monitoring and verification states.
- `relations`: typed source/target entity IDs, relation type, confidence and timestamps.
- `ai_runs`, `event_trace`, jobs, audit, publication, social and knowledge-processing tables.

The domain-agnostic intelligence core additionally defines domains for vulnerability, malware, ransomware, exploit, threat actor, campaign, incident, infrastructure, IOC, tool and technique. A type definition alone does not prove that every domain has a complete public API or populated data.

## 3. Evidence, provenance, confidence and lifecycle

The active contracts support canonical facts, source authority tiers, temporal scope, evidence IDs, source IDs, URLs, statements, provenance hashes, evidence references, claim status, confidence scores, unknowns, limitations and contradiction checks.

Observed claim states: `CONFIRMED`, `ASSESSED`, `UNKNOWN`, `DISALLOWED`.

Observed evidence-membership states: `SUPPORTED`, `PARTIALLY_SUPPORTED`, `UNSUPPORTED`, `CONTRADICTED`, `AMBIGUOUS`, `UNKNOWN`.

Observed report/publication states include `NEW`, `PROCESSING`, `HOLD`, `ENRICH`, `READY_FOR_REVIEW`, `APPROVED`, `PUBLISHED`, `REVISED`, `RETIRED`, plus publication `HOLD`/`REJECT` and event states such as `QUARANTINED`, `READY_TO_PUBLISH`, and `PUBLISHED`.

Observed exploitation classifications include `NO_PUBLIC_EXPLOIT_EVIDENCE`, `PUBLIC_POC`, `PUBLIC_EXPLOIT`, `KNOWN_EXPLOITED`, `OBSERVED_EXPLOITATION`, `HIGH_RISK_SIGNAL`, and `UNKNOWN`; these must not be collapsed into one generic severity label.

The publication path is:

`SOURCE -> INGESTION -> NORMALIZATION -> CANONICALIZATION -> EVIDENCE MEMBERSHIP -> VALIDATION / CONTRADICTION CHECK -> QUALITY GATE -> REPORT / ARTICLE -> PUBLICATION STATUS -> API`.

The frontend may expose evidence metadata and citations returned by public read APIs. It must not expose internal prompts, raw RAG/book content, private source credentials, internal IDs that are not part of the public contract, or unvalidated AI output.

## 4. API discovery

The following routes are present in `workers/api/src/index.ts`.

### Public/read-oriented routes

| Method / path | Capability | Parameters observed | Status |
|---|---|---|---|
| `GET /api/v1/health` | D1/kernel/AI/Vectorize health response | none | `IMPLEMENTED`, live status `UNCERTAIN` |
| `GET /api/v1/intelligence` | Published intelligence feed | limit, offset, category, severity, q | `IMPLEMENTED` |
| `GET /api/v1/intelligence/:id` | Single intelligence report | id | `IMPLEMENTED` |
| `GET /api/v1/intelligence/stats` | Intelligence metrics | none observed | `IMPLEMENTED` route; live values `UNCERTAIN` |
| `GET /api/v1/intelligence/latest` | Latest intelligence | route-specific query | `IMPLEMENTED` |
| `GET /api/v1/intelligence/trending` | Trending intelligence | route-specific query | `IMPLEMENTED` |
| `GET /api/v1/intelligence/categories/:category` | Category feed | category and route query | `IMPLEMENTED` |
| `GET /api/v1/articles`, `/articles/:slug` | Published article listing/detail | limit, offset, category, severity, slug | `IMPLEMENTED` |
| `GET /api/v1/threats/:id` | Threat detail | id | `IMPLEMENTED`; list capability not separately verified |
| `GET /api/v1/vulnerabilities`, `/:id` | Vulnerability listing/detail | route query and id | `IMPLEMENTED` |
| `GET /api/v1/actors`, `/:id` | Actor listing/detail | route query and id | `IMPLEMENTED` |
| `GET /api/v1/malware`, `/:id` | Malware listing/detail | route query and id | `IMPLEMENTED` |
| `GET /api/v1/iocs`, `/:value` | IOC listing/detail | route query and value | `IMPLEMENTED` |
| `GET /api/v1/campaigns`, `/:id` | Campaign listing/detail | route query and id | `IMPLEMENTED` |
| `GET /api/v1/reports`, `/:id` | Report listing/detail | route query and id | `IMPLEMENTED` |
| `GET /api/v1/graph`, `/graph/edges` | Relationship graph edges | route query | `IMPLEMENTED` |
| `GET /api/v1/search` | Bounded cross-entity search | q, max length 80; cached; prefix/contains SQL LIKE | `IMPLEMENTED`, lexical only |
| `GET /api/v1/sources`, `/sources/:id` | Source registry/detail | page/limit/offset, status, monitoring, verification, category, q | `IMPLEMENTED` |
| `GET /api/v1/sources/directory` | Source directory | route-specific query | `IMPLEMENTED` |
| `GET /api/v1/knowledge`, `/knowledge/:id` | Knowledge metadata/list/detail | type, topic, tier, jurisdiction, status, limit, offset | `IMPLEMENTED`, public exposure boundary requires review |
| `GET /api/v1/regulations` | Regulation metadata | route-specific query | `IMPLEMENTED` |
| `GET /api/v1/ai/runs` | AI run metadata | route-specific query | `IMPLEMENTED`, likely internal-only |
| `GET /api/v1/alerts` | Alerts | route-specific query | `IMPLEMENTED` route; user/auth model not proven |

### Internal, mutation, preview or operator routes

Admin preview ingest/editorial, source registration/update/delete/sync, collector health/control, CISA canary, RAG tests/retrieval/grounded answers, analysis, intelligence ingestion/adapters/process/backfill, shadow Vectorize, research workflow, publication, social derivatives, corpus sync/batch, Telegram webhook, AI analysis and Workers AI benchmark routes are present. They are not frontend-public contracts by default and must be treated as `INTERNAL ONLY` or `PARTIAL` until authentication and deployment boundaries are verified.

Authentication is not established as a general public API contract in the inspected route source. The API has CORS and a production legacy-freeze guard; this is not equivalent to user authentication or authorization.

## 5. Search and filtering

`GET /api/v1/search` provides bounded lexical cross-entity search over actors, vulnerabilities, malware, IOCs, intelligence events and articles. It supports identifier/name/value/title/summary-style LIKE matching, returns up to ten items per entity and a capped total. It is not verified as FTS, semantic, alias-normalized, EDB-aware, or Vectorize-backed. A global search UI is therefore `PARTIAL` but implementable with explicit degraded/lexical wording.

Verified feed filters include category, severity, query, limit and offset. Source filters include status, monitoring status, verification status, category and query. Article filters include category and severity. Broader filters such as vendor, product, EPSS, CVSS, exploited state, confidence, evidence strength, actor, campaign and source are not uniformly verified on every public listing endpoint and must be treated as `PARTIAL` or `UNCERTAIN` per endpoint.

## 6. Public/private classification

| Domain | Classification | Basis |
|---|---|---|
| Published intelligence/events | `PUBLIC DAY-0` | Published feed/detail routes exist; publication status is checked |
| Vulnerabilities | `PUBLIC DAY-0` | Public list/detail routes and canonical fields exist |
| Malware | `PUBLIC DAY-0` | Public list/detail routes exist |
| Threat actors | `PUBLIC DAY-0` | Public list/detail routes exist; evidence quality still applies |
| Campaigns | `PUBLIC DAY-0` | Public list/detail routes exist |
| IOCs | `PARTIALLY PUBLIC` | Public routes exist; exposure, privacy and contextual evidence need policy |
| Articles/news | `PUBLIC DAY-0` when `is_published=1` | Publication flag and article routes exist |
| Research | `PARTIAL` | Workflow and report routes exist; standalone public research contract is not fully established |
| Exploits | `PARTIAL` | Domain/types and report fields exist; dedicated public exploit list/detail capability was not verified |
| Attacks/incidents | `PARTIAL` | Event/relationship structures exist; dedicated public attack model is not established |
| Evidence/sources | `PARTIALLY PUBLIC` | Public response fields exist; raw/private provenance must be filtered |
| RAG/books/corpus | `INTERNAL ONLY` | Knowledge/RAG routes and R2/vector storage exist; public corpus text exposure is not authorized by this discovery |
| Pricing | `NOT IMPLEMENTED` as active frontend | Frontend was removed; no frontend contract remains |

## 7. Information architecture recommendation

| Navigation item | Classification |
|---|---|
| Home | `COMING SOON`; no implementation now |
| Intelligence feed | `READY` at API contract level |
| Vulnerabilities | `READY` |
| Malware | `READY` |
| Exploits | `PARTIAL`; expose only when a dedicated public contract is confirmed |
| Attacks / Campaigns | `PARTIAL`; campaigns are ready, attack graph is partial |
| Threat Actors | `READY` |
| IOCs | `PARTIAL` pending public exposure policy |
| News / Articles | `READY` for published articles |
| Research | `PARTIAL` |
| Sources / Evidence | `READY` with redaction and provenance rules |
| Search | `PARTIAL`, lexical bounded search |
| Pricing | `COMING SOON`; no active frontend or verified product entitlement contract |

Entity pages should use identity, canonical fields, temporal context, status, severity/metrics where present, evidence/citations, source authority, relationships, unknowns and limitations. They must not display absent fields as invented values.

## 8. Homepage information requirements, without design

The future homepage may communicate only: the existence of published intelligence, current published items returned by the feed, real source/evidence links, supported domains, bounded search, and verified service/status information. It must not invent counts, customers, partnerships, live threat maps, latency, coverage, confidence, or freshness claims. Metrics are safe only when returned by a verified API response and labelled with their time/context.

## 9. 3D preparation, not implementation

| Surface | Real data now | API required | Risk/value |
|---|---|---|---|
| Relationship graph | Graph edge route and relation table exist | Node/edge normalization and pagination still needed | High analyst value; mobile/performance risk |
| Evidence graph | Evidence/source links exist in reports | Public evidence membership endpoint/DTO needed | High value; privacy/provenance risk |
| Vulnerability ecosystem | Vulnerability, malware, campaign, actor and relation tables exist | Stable typed relationship contract needed | High value; avoid inferred edges |
| Temporal activity | First/last seen and article timestamps exist | Stable event timeline contract needed | Useful; current historical semantics need care |
| Global activity map | No verified geographic event contract | Region/entity normalization and privacy policy needed | Do not build yet |

Decorative 3D, fake telemetry, fabricated maps and WebGL presentation without a supported data contract are `DO NOT BUILD`.

## 10. Frontend blockers caused by backend

1. No active frontend application or frontend data adapter exists after the wipe.
2. Live API Worker, route, binding and row availability are not proven by source inspection.
3. General authentication/authorization for public versus operator routes is not established.
4. Exploit-specific public list/detail APIs are not verified.
5. Standalone attack/incident public model and timeline are not verified.
6. Research public DTO and lifecycle are incomplete.
7. Evidence membership/public redaction contract is not exposed as a dedicated stable endpoint.
8. Relationship graph node/edge typing, pagination and evidence references need a stable public contract.
9. Search is lexical bounded LIKE search, not verified FTS/semantic/entity-aware search.
10. Filter parity across entity listings is incomplete.
11. Public statistics/freshness semantics require live verification and time labels.
12. Pricing, entitlements, billing and account capability are not an active frontend contract.

## 11. Proposed frontend data contract

Every public DTO should include a stable `id`, `entity_type`, `display_name`/title, `status`, `observed_at`/published timestamp where applicable, source references, evidence references or an explicit `evidence_status`, confidence only when supplied by the backend, and `unknowns`/`limitations` when the backend cannot establish a fact.

Recommended envelope:

```ts
type PublicResponse<T> = {
  status: 'SUCCESS' | 'DEGRADED' | 'NOT_FOUND' | 'UNAVAILABLE' | 'REJECTED';
  data: T;
  meta?: { limit?: number; offset?: number; total?: number; next?: string; generated_at?: string };
  provenance?: { source_ids: string[]; evidence_ids: string[]; as_of?: string };
  warnings?: string[];
  unknowns?: string[];
};
```

This is a proposal, not an implemented contract. The future frontend must consume actual endpoint DTOs or an approved versioned adapter; it must not infer missing values.

## Final classification

`IMPLEMENTED`: backend workers, D1 schemas, ingestion, evidence/publishing code, core domain types, public API route source, lexical search, and deterministic kernel source/artifact.

`PARTIAL`: live topology, public authentication, research/exploit/attack completeness, relationship/evidence DTO stability, Vectorize/semantic search exposure, and uniform filtering.

`NOT IMPLEMENTED`: active frontend, frontend design system, public pricing UI, and any new homepage.

`UNCERTAIN`: current production route behavior, live data freshness/counts, actual remote bindings, and any capability inferred solely from configuration or historical documentation.
