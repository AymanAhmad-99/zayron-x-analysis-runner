# ZAYRON-X frontend capability matrix

| Backend capability | Endpoint | Frontend feature | Status |
|---|---|---|---|
| Intelligence feed | `GET /api/v1/intelligence` | `/intelligence` overview | PARTIAL — typed client and fail-closed states added; preview binding requires API base configuration |
| Intelligence search | `GET /api/v1/search` | API-layer search function | PARTIAL — client added; interactive surface pending |
| Vulnerabilities | `GET /api/v1/vulnerabilities` | Entity list | NOT IMPLEMENTED |
| Vulnerability detail | `GET /api/v1/vulnerabilities/:id` | Entity detail | NOT IMPLEMENTED |
| Malware | `GET /api/v1/malware` | Entity list/detail | NOT IMPLEMENTED |
| Threat actors | `GET /api/v1/actors` | Entity list/detail | NOT IMPLEMENTED |
| Campaigns | `GET /api/v1/campaigns` | Entity list/detail | NOT IMPLEMENTED |
| IOCs | `GET /api/v1/iocs` | Observable list/detail | NOT IMPLEMENTED |
| Articles | `GET /api/v1/articles` | News/research | NOT IMPLEMENTED |
| Graph | `GET /api/v1/graph` | Relationship explorer | NOT IMPLEMENTED |

No capability is described as fully connected until a deployed frontend-to-API runtime path is verified.
