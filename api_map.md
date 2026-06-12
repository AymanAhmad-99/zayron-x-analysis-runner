# ZAYRON-X: API Map Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** REST Endpoint Inventory, Payloads, Authentication and Rate Limiting Policies  
**Timestamp:** 2026-06-11T03:50:00Z  

---

## 1. REST Endpoint Inventory

The platform exposes the following serverless endpoints:

### 1.1 `/api/remediate`
- **Method**: `POST`
- **Purpose**: Autonomous mitigation rule deployment.
- **Access Level**: authenticated + SUBSCRIBER clearance level (enforced by middleware).
- **Request Payload**:
  ```json
  {
    "threatId": "UUID string (Required)",
    "threatTitle": "String description (Optional)"
  }
  ```
- **Response Payload (Success - 200)**:
  ```json
  {
    "success": true,
    "timestamp": "ISO timestamp",
    "action": "DEPLOY_MITIGATION_RULES",
    "telemetry": {
      "threatId": "UUID string",
      "threatTitle": "String",
      "nodesPatched": 124,
      "wafRulesInjected": ["YARA-RULE-MATCH-GATING", "SIGMA-LOG-FILTERING"],
      "blastRadiusMitigatedUSD": 1450000.00,
      "status": "OPERATIONAL_REASSURANCE_ACTIVE"
    }
  }
  ```

### 1.2 `/api/download-sitrep`
- **Method**: `GET`
- **Purpose**: Retrieves the executive SITREP summary as a PDF document.
- **Access Level**: authenticated + SUBSCRIBER clearance level (enforced by middleware).
- **Parameters**: `?threatId=UUID`
- **Response (Success - 200)**: Binary payload (Content-Type: `application/pdf`, attachment).

### 1.3 `/api/subscribe`
- **Method**: `POST`
- **Purpose**: Registers a newsletter subscription email.
- **Access Level**: Public (anon)
- **Rate Limit**: 3 requests per 60 seconds per IP address (tracked in Upstash Redis).
- **Request Payload**:
  ```json
  {
    "email": "user@example.com (Required)"
  }
  ```
- **Response Payload (Success - 201)**:
  ```json
  {
    "success": true,
    "message": "Successfully subscribed."
  }
  ```

### 1.4 `/api/revalidate`
- **Method**: `POST`
- **Purpose**: Resets the incremental static cache.
- **Access Level**: Secret signature validation.
- **Request Payload**:
  ```json
  {
    "secret": "REVALIDATION_SECRET",
    "paths": ["/intelligence", "/"]
  }
  ```
- **Response Payload (Success - 200)**:
  ```json
  {
    "revalidated": true,
    "now": "timestamp"
  }
  ```

### 1.5 `/api/seed-analysts`
- **Method**: `GET` / `POST`
- **Purpose**: Database seeding for team analyst listings.
- **Access Level**: Admin Basic Auth (`ADMIN_USER` / `ADMIN_PASSWORD`).
- **Response Payload (Success - 200)**:
  ```json
  {
    "success": true,
    "message": "Analysts database seeded successfully."
  }
  ```

---

## 2. Global Rate Limiting Policies

The Next.js Edge Middleware intercepts client routes to check traffic ceilings using Upstash Redis caches:

| Endpoint Path | Rate Limit Threshold | Key Scope | Action on Limit Exceeded |
| :--- | :--- | :--- | :--- |
| `/login` | 5 requests / 60 seconds | `login:{client_ip}` | HTTP 429 Too Many Requests |
| `/register` | 3 requests / 60 seconds | `register:{client_ip}` | HTTP 429 Too Many Requests |
| `/api/subscribe` | 3 requests / 60 seconds | `sub:{client_ip}` | HTTP 429 Too Many Requests |
