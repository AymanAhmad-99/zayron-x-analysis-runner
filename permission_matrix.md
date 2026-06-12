# ZAYRON-X: Permission Matrix Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** RBAC Roles, Table Permissions, Trust Zones, and Privilege Escalation Boundaries  
**Timestamp:** 2026-06-11T03:51:00Z  

---

## 1. Role Definitions & Permissions

The database architecture segregates roles into four tiers:

| Database Role | System Trust Level | Access Bounds | Allowed Operations |
| :--- | :--- | :--- | :--- |
| **`anon`** | Unauthenticated Public | Public Landing Nodes | READ on `articles` (if published), `cves`, `tools`, `programming_langs`. INSERT on `subscribers`. |
| **`authenticated`** | Authenticated User | User-owned Profiles | Same as `anon`, plus read/write own profile (`auth.uid() = id`). |
| **`SUBSCRIBER` (clearance)**| Premium Customer | Gated Intelligence View | Same as `authenticated`, plus access to unmasked YARA, Sigma, IoCs, and PDF links on `threat_artifacts`. |
| **`admin`** | Administrator | Complete Database CRUD | Full SELECT, INSERT, UPDATE, and DELETE operations. Bypasses RLS locks. |
| **`service_role`** | Internal Worker Daemon | Full Root Bypass | Bypasses Row Level Security (RLS) policies completely. Used by Python ingestors and swarm orchestrator. |

---

## 2. Trust Zones Map

```
                  [ PUBLIC / INTERNET ]
                            │
                      (Trust Boundary)
                            ▼
     ┌──────────────────────────────────────────────┐
     │                   ZONE 1                     │
     │  - Anon / Free Client Views  - Public APIs   │
     └──────────────────────┬───────────────────────┘
                            │
                      (Trust Boundary)
                            ▼
     ┌──────────────────────────────────────────────┐
     │                   ZONE 2                     │
     │  - Authenticated Profiles  - Subscriber Views│
     └──────────────────────┬───────────────────────┘
                            │
                      (Trust Boundary)
                            ▼
     ┌──────────────────────────────────────────────┐
     │                   ZONE 3                     │
     │  - Internal Swarm Network  - Admin Panel     │
     │  - service_role Operations  - Tor Proxy      │
     └──────────────────────────────────────────────┘
```

- **Zone 1: Public Egress Interface (Low Trust)**: Anon connections. Handled using anonymous client calls. Row Level Security limits queries to published articles and metadata records.
- **Zone 2: Authenticated Client Layer (Medium Trust)**: User JWT validation. Access to remediate APIs and threat detail files. Row-Level Security checks `public.profiles` level.
- **Zone 3: Core Swarm Core System (High Trust)**: Isolated daemon containers. Connection pools utilize the `service_role` secret token to execute writes.

---

## 3. Privilege Escalation Risks

1. **Service Role Token Exposure**:
   - **Risk**: The Python swarm core utilizes the `SUPABASE_SERVICE_KEY` secret. If a container is compromised or environment variables are dumped, an attacker gains full database administrative bypass capability.
   - **Remediation**: The Docker Swarm configuration blocks public network port exposures to worker containers, isolating them inside a virtual bridge network.

2. **Security Definer Function Hijack**:
   - **Risk**: `check_is_subscriber()` and `handle_new_user()` bypass standard RLS restrictions because they are declared as `SECURITY DEFINER`. If a SQL injection vulnerability exists in these functions, user security boundaries could be breached.
   - **Remediation**: Both functions contain zero parameter arguments and execute pre-compiled internal routines, making SQL injection inputs impossible.
