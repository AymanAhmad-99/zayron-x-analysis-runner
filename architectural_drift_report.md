# ZAYRON-X: Architectural Drift Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Architectural Violations, Coupling Analysis, Layer Verification, and Redundancy Review  
**Timestamp:** 2026-06-11T03:55:00Z  

---

## 1. Layer Violations & Coupling

### 1.1 Direct DB Writes by Swarm Persistence Layer
- **Violation**: The persistence helper `workers/persistence.py` bypasses the standard API interface and queries the Supabase REST endpoint directly using the `SUPABASE_SERVICE_KEY`.
- **Decoupling Impact**: This couples the database schema layout directly to the Python backend models. If the database schema changes, both the Next.js API router definitions and the Python worker Pydantic models must be updated concurrently.
- **Justification**: Querying the database directly via HTTP REST endpoints bypasses the localhost:3000 node runtime proxy completely, saving CPU resources and resolving potential connection timeout errors on Docker VPS environments.

### 1.2 Frontend SQL Bypass Gating
- **Violation**: The Next.js Edge frontend utilizes the public anonymous key to query the Postgres view `public.threat_artifacts` directly.
- **Decoupling Impact**: The frontend makes assumptions about the database schema structure (relying on `check_is_subscriber()` to mask details). This couples database-level RLS policy configurations directly to client-side page views.
- **Justification**: Offloading content gating to PostgreSQL RLS policies secures raw indicators and rules at the engine layer, preventing accidental disclosures on the frontend.

---

## 2. Circular Dependencies

An analysis of imports in the Python and TypeScript codebases was executed.
- **Python Swarm (`workers/`)**: The module import flow is strictly linear (`config -> contracts -> persistence -> omni_crew`). Import relationships are hierarchical and free of circular imports.
- **Frontend App Router (`gerasys-online/`)**: Next.js App Router configurations separate API routes (`/api/*`) from frontend pages (`(site)/*`). Types are centralized in `lib/types.ts` and database connectors in `lib/supabase/client.ts`, avoiding circular component references.

---

## 3. Duplicate Logic & Redundancy

### 3.1 Duplicate Type Definitions
- **Drift Location**: Python models (`shared/models/article.py`) and Next.js types (`gerasys-online/lib/types.ts`) define duplicate schema representations of `Article` and `CVE` interfaces.
- **Drift Impact**: If a column is added or renamed in the database table, it must be updated in three separate places: the DDL schema file, the TypeScript `types.ts` file, and the Python Pydantic models.
- **Justification**: Required because the system uses a hybrid runtime (TypeScript Edge frontend + Python swarm backend). Without a unified schema sync tool (like Prisma or Drizzle-Kit running cross-language templates), definitions must be maintained in both codebases.

### 3.2 Duplicate Deduplication Checks
- **Drift Location**: Deduplication checks occur in both the ingestors (`darkweb_ingestor.py` calling `hash_exists_in_raw_feeds`) and the swarm orchestrator (`omni_crew.py` executing `seen_hashes` and database duplicate checks before running LLM inference).
- **Drift Impact**: This creates redundant queries. However, it functions as a double-guard: the ingestor checks avoid writing duplicate raw logs, and the orchestrator checks prevent running expensive Gemini inference requests if a duplicate feed managed to bypass the ingestor.
