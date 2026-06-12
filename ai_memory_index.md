# ZAYRON-X: AI Memory Index Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Design Decisions Registry, Components, Dependencies, and RAG Knowledge References  
**Timestamp:** 2026-06-11T03:59:00Z  

---

## 1. Decision Index

| Date | Architectural Decision | Primary Reason | Tradeoffs |
| :--- | :--- | :--- | :--- |
| **2026-06-10** | Single-Pass 7-Agent Consolidated Swarm (`omni_crew.py`) | Minimizes total Google Gemini API consumption to fit within free tier limits (500 req/day). | Increased cognitive requirements in system prompt templates, slower single-inference latency (~45s). |
| **2026-06-10** | Upstash Redis Daily Quota Tracking | Keeps a persistent record of Gemini token use across Docker container restarts. | Introduces network dependency on Upstash Redis endpoints. |
| **2026-06-10** | Tor Circuit Egress Proxy Routing | Prevents leak crawlers and Telegram clients from exposing target egress IP addresses. | Introduces proxy connection latency, requiring Poisson-jitter delays in crawl logic. |
| **2026-06-10** | Database-Level Security Definer Views | Isolates premium CTI rules at the Postgres view level. | Offloads data masking logic onto Postgres query functions. |

---

## 2. Architecture & Component Index

- **Frontend Core**: Next.js 16 Edge deployment bundle. Output file: `.open-next/worker.js`.
- **Backend Swarm Core**: Python 3.11 Docker container layout. Output files: `workers/omni_crew.py`, `workers/persistence.py`.
- **Ingestors Configuration**:
  - Telegram: `workers/ingestors/radar_engine.py` (Parallel Scraper, SQLite dedup)
  - RSS Feeds: `workers/ingestors/rss_ingestor.py` ( feedparser helper)
  - CVE Telemetry: `workers/ingestors/cve_worker.py` (Financial Blast Radius scoring)
  - Dark Web: `workers/ingestors/darkweb_ingestor.py` (Ransomwatch parser)

---

## 3. Dependency & Knowledge Index

- **Dependency Configurations**:
  - Python Libraries: `workers/requirements.txt`
  - JavaScript Libraries: `gerasys-online/package.json`
  - Cloudflare Worker Assets: `gerasys-online/wrangler.toml`
- **RAG Knowledge References (literature-based templates)**:
  - Structured Analytic Techniques: Richards Heuer & Randolph H. Pherson
  - Psychology of Intelligence Analysis: Richards Heuer
  - Designing Data-Intensive Applications (DDIA): Martin Kleppmann
  - TCP/IP Illustrated: W. Richard Stevens
  - The Art of Deception: Kevin Mitnick
  - FAIR Methodology (Information Risk Quantification)
