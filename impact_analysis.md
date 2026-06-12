# ZAYRON-X: Impact Analysis Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Major System Components, Dependencies, and Operational Blast Radius Mapping  
**Timestamp:** 2026-06-11T03:54:00Z  

---

## 1. `tor_proxy` (Secure Egress Gateway Container)
- **Component Purpose**: Establishes a SOCKS5 proxy tunnel to route intelligence crawlers anonymously over the Tor network.
- **Upstream Dependencies**: Local Docker network interface, host internet connection, Tor network exit nodes.
- **Downstream Dependencies**: `zayron_radar` (Telegram collector), `zayron_darkweb` (Onion crawler).
- **Blast Radius**: **High**
  - If this proxy fails, the ingestion of Telegram alerts and Ransomware leak feeds halts immediately. The platform will fail to stream fresh indicators of compromise, though clearnet RSS ingestion and NIST CVE tracking remain operational.

---

## 2. `zayron_crew` (Agent Processing Swarm Core)
- **Component Purpose**: Consumes raw feeds from the queue, runs RAG-grounded LLM inference, and compiles published CTI reports.
- **Upstream Dependencies**: Supabase REST API (reading from `raw_feeds`), Upstash Redis (quota counter), Google Generative AI (Gemini API).
- **Downstream Dependencies**: Supabase tables (`articles`, `cves`, `threat_artifacts_secure`), Next.js Edge cache invalidator.
- **Blast Radius**: **Critical**
  - If the worker daemon fails, the ingestion queues will freeze. The Next.js frontend will serve stale cached reports indefinitely, and no fresh analysis, YARA/Sigma rules, or CVE enrichments will be published.

---

## 3. `public.profiles` (Database Table)
- **Component Purpose**: Enforces Row Level Security constraints by matching clearance tiers to auth users.
- **Upstream Dependencies**: Supabase Auth core user creation triggers.
- **Downstream Dependencies**: `public.threat_artifacts` view, user query clients.
- **Blast Radius**: **Critical**
  - Any data corruption or schema changes in this table will immediately break client authorization. Standard users will see database connection timeouts or have their access downgraded to the FREE tier, blocking premium CTI deliveries.

---

## 4. Upstash Redis (Counter Ledger)
- **Component Purpose**: Handles rate limit checks and daily API token consumption tracking.
- **Upstream Dependencies**: Upstash REST API clearnet endpoint.
- **Downstream Dependencies**: Next.js auth routes (`/login`, `/register`, `/api/subscribe`), `zayron_crew` orchestrator.
- **Blast Radius**: **High**
  - If the Redis instance becomes unreachable, the Next.js login/registration portals will return HTTP 429 exceptions, locking out users. The backend worker daemon will fail to verify its daily quota bounds and will halt feed processing to prevent potential rate-limit overages.
