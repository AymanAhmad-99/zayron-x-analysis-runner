# ZAYRON-X — ROUTE AUDIT MATRIX

| Route | HTTP | Data Source | Real / Mock | SEO Meta | Canonical | JSON-LD | Mobile | Desktop | Status |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` | 200 | D1 `articles`, `events` | Real | Yes | `https://zayron-x.co` | WebSite | Yes | Yes | **LIVE** |
| `/intelligence` | 200 | D1 `articles` | Real | Yes | `https://zayron-x.co/intelligence` | Yes | Yes | Yes | **LIVE** |
| `/intelligence/today` | 200 | D1 Today `articles` | Real | Yes | `https://zayron-x.co/intelligence/today` | TechArticle | Yes | Yes | **LIVE** |
| `/threats` | 200 | D1 `intelligence_events` | Real | Yes | `https://zayron-x.co/threats` | Yes | Yes | Yes | **LIVE** |
| `/threats/[slug]` | 200 | D1 `articles`, `evidence` | Real | Yes | `https://zayron-x.co/threats/[slug]` | TechArticle | Yes | Yes | **LIVE** |
| `/vulnerabilities` | 200 | D1 `vulnerabilities` | Real | Yes | `https://zayron-x.co/vulnerabilities` | Yes | Yes | Yes | **LIVE** |
| `/vulnerabilities/[id]` | 200 | D1 `vulnerabilities` | Real | Yes | `https://zayron-x.co/vulnerabilities/[id]` | TechArticle | Yes | Yes | **LIVE** |
| `/actors` | 200 | D1 `actors` | Real | Yes | `https://zayron-x.co/actors` | Yes | Yes | Yes | **LIVE** |
| `/actors/[id]` | 200 | D1 `actors`, `relations` | Real | Yes | `https://zayron-x.co/actors/[id]` | Yes | Yes | Yes | **LIVE** |
| `/malware` | 200 | D1 `malware` | Real | Yes | `https://zayron-x.co/malware` | Yes | Yes | Yes | **LIVE** |
| `/malware/[id]` | 200 | D1 `malware` | Real | Yes | `https://zayron-x.co/malware/[id]` | Yes | Yes | Yes | **LIVE** |
| `/campaigns` | 200 | D1 `campaigns` | Real | Yes | `https://zayron-x.co/campaigns` | Yes | Yes | Yes | **LIVE** |
| `/campaigns/[id]` | 200 | D1 `campaigns` | Real | Yes | `https://zayron-x.co/campaigns/[id]` | Yes | Yes | Yes | **LIVE** |
| `/iocs` | 200 | D1 `iocs` | Real | Yes | `https://zayron-x.co/iocs` | Yes | Yes | Yes | **LIVE** |
| `/iocs/[value]` | 200 | D1 `iocs`, `events` | Real | Yes | `https://zayron-x.co/iocs/[value]` | Yes | Yes | Yes | **LIVE** |
| `/reports` | 200 | D1 `reports` | Real | Yes | `https://zayron-x.co/reports` | Yes | Yes | Yes | **LIVE** |
| `/reports/[id]` | 200 | D1 `reports` | Real | Yes | `https://zayron-x.co/reports/[id]` | TechArticle | Yes | Yes | **LIVE** |
| `/knowledge` | 200 | D1 & `MASTER_MANIFEST_115` | Real | Yes | `https://zayron-x.co/knowledge` | TechArticle | Yes | Yes | **LIVE** |
| `/sources` | 200 | D1 `sources` & `MANIFEST` | Real | Yes | `https://zayron-x.co/sources` | Yes | Yes | Yes | **LIVE** |
| `/regulations` | 200 | D1 `regulations` | Real | Yes | `https://zayron-x.co/regulations` | Yes | Yes | Yes | **LIVE** |
| `/search` | 200 | D1 + Vectorize Hybrid | Real | Yes | `https://zayron-x.co/search` | Yes | Yes | Yes | **LIVE** |
| `/sitemap.xml` | 200 | Dynamic D1 XML | Real | N/A | `https://zayron-x.co/sitemap.xml` | XML | Yes | Yes | **LIVE** |
| `/robots.txt` | 200 | Dynamic Edge Rule | Real | N/A | `https://zayron-x.co/robots.txt` | TXT | Yes | Yes | **LIVE** |
