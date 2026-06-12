# ZAYRON-X: Event Flow Map Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Ingestion Streams, Processing Queues, and Event Lifecycle Mapping  
**Timestamp:** 2026-06-11T03:52:00Z  

---

## 1. Ingestion Event Cycles

Ingestion events run as scheduled background daemons:

```
[ Telegram Scraper ] ── (Polls every 5m) ──► Check duplicate in SQLite (radar_dedup.db)
                                                       │
                                                       ▼ (If novel)
                                             Write raw_feeds (pending)

[ RSS Ingestor ]     ── (Polls every 15m) ─► Check duplicate url_hash in database
                                                       │
                                                       ▼ (If novel)
                                             Write raw_feeds (pending)

[ Darkweb Ingestor ] ── (Polls every 5m) ──► Check duplicate url_hash in database
                                                       │
                                                       ▼ (If novel)
                                             Write raw_feeds (pending)

[ CVE Worker ]       ── (Polls every 15m) ─► Calculate Financial Blast Radius
                                                       │
                                                       ▼ (If novel)
                                             Write public.cves (Active)
```

---

## 2. Processing Queue Flow

The core execution queue processes feeds sequentially:

```mermaid
sequenceDiagram
    autonumber
    participant D as zayron_crew_daemon
    participant DB as Supabase public.raw_feeds
    participant R as Upstash Redis Ledger
    participant L as Gemini API (1.5 Pro)
    participant A as Supabase public.articles
    participant CF as Cloudflare Workers ISR

    loop Every 180 seconds (3 minutes pacing loop)
        D->>DB: Fetch pending feeds (Claim lock)
        DB->>D: Return claimed feed (status updated to processing_crew)
        D->>R: check daily limit (quota_get_today)
        R->>D: Return current daily count
        alt quota not exceeded (< 480)
            D->>L: Send feed content + RAG context
            L->>D: Return structured SITREP JSON
            D->>R: increment count (quota_increment)
            D->>A: Insert compiled report
            D->>DB: Update feed status to crew_promoted
            D->>CF: Trigger API cache bust (/api/revalidate)
        else quota exceeded (>= 480)
            D->>DB: Release feed lock (status returned to pending)
            D->>D: Pause execution for 30 minutes
        end
    end
```

---

## 3. Cache Invalidation Lifecycle

When `persist_sitrep()` successfully completes, Next.js page caches are updated:

```
[ zayron_crew_daemon ]
          │
          ▼ (HTTP POST)
[ /api/revalidate API Endpoint ] 
          │
          ▼ (Verifies REVALIDATION_SECRET signature)
[ Next.js Cache Invalidator ]
          │
          ├─► Invalidate path "/"
          ├─► Invalidate path "/intelligence"
          │
          ▼ (Purges cache keys from Cloudflare KV Namespace)
[ Static site regenerated on next visitor request ]
```
