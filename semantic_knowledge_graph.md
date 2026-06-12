# ZAYRON-X: Semantic Knowledge Graph
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Features, Ingestion Services, API Mappings, Database Tables, and User Interface Flows  
**Timestamp:** 2026-06-11T03:58:00Z  

---

## 1. Domain Entanglements Graph

```mermaid
graph TD
    subgraph Business Domains
        BD1[Cyber Threat Intelligence CTI]
        BD2[Vulnerability Scoring & CVSS]
        BD3[Premium Security Rule Gating]
    end

    subgraph Features
        F1[Cyber Reports Dashboard]
        F2[CVE Track Engine]
        F3[YARA & Sigma Rules Display]
        F4[Remediation Sandbox Router]
    end

    subgraph APIs & Handlers
        API1[/api/search]
        API2[/api/revalidate]
        API3[/api/remediate]
        API4[/api/download-sitrep]
    end

    subgraph Database Tables
        T1[(public.articles)]
        T2[(public.cves)]
        T3[(public.threat_artifacts_secure)]
        T4[(public.profiles)]
    end

    subgraph Egress Services
        S1[zayron_crew]
        S2[zayron_radar]
        S3[zayron_darkweb]
        S4[zayron_cve]
    end

    BD1 --> F1
    BD2 --> F2
    BD3 --> F3 & F4

    F1 --> API1 & API2
    F2 --> T2
    F3 --> T3
    F4 --> API3 & API4

    S1 --> T1 & T2 & T3
    S2 & S3 --> T1
    S4 --> T2

    T1 --> API1
    T3 --> API3 & API4
    T4 --> API3 & API4
    T4 -->|authorizes| F3
```

---

## 2. Key User Journeys

### 2.1 Journey A: Public Analyst Incident Discovery
1. **User Action**: Navigates to `/` or `/intelligence`.
2. **System Event**: The Next.js Edge Router serves statically cached pages from the Cloudflare Workers runtime, reading published article layouts directly.
3. **Data Request**: Anon queries `public.articles` for matches where `is_published = TRUE`.

### 2.2 Journey B: Subscriber Remediation Verification
1. **User Action**: Logs in to their portal and opens a Critical Threat Dossier details page.
2. **System Event**: Next.js auth middleware fetches their JWT credentials and queries `public.profiles` to resolve subscriber permissions.
3. **Data Request**: Bypasses masked strings to read full rule blocks from the `public.threat_artifacts` security view.
4. **Remediation Trigger**: User hits "Deploy Mitigation". Post request sent to `/api/remediate`, validated by middleware, and returns deployed rules telemetry.
