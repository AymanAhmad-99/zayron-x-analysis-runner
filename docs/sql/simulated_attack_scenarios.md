# ZAYRON-X — Database Security: Simulated Attack Scenarios

This document analyzes common database threat vectors and details how the v3.0 Zero-Trust Row Level Security (RLS) policies successfully defend against them.

---

## Attack Scenario 1: Direct SELECT Bypass on Premium Threat Data
* **Objective**: A malicious visitor or non-paying user attempts to bypass the masked `public.threat_artifacts` database view to query the underlying table `public.threat_artifacts_secure` directly to steal unmasked indicators of compromise (IoCs) and YARA/Sigma rules.
* **Attack Query**:
  ```sql
  -- Executed via anonymous client REST API
  SELECT title, raw_iocs, yara_rules, unmasked_target_entities 
  FROM public.threat_artifacts_secure;
  ```
* **Defense Mechanism**: 
  - `threat_artifacts_secure` has RLS enabled.
  - The table ONLY contains policies for `service_role` and authenticated users who pass `check_is_admin()`.
  - There is no policy granting SELECT to `anon` or standard `authenticated` roles.
* **Result**: The query is intercepted at the engine level and returns **0 rows** (or throws a permission denied error if direct permissions are revoked). The premium intelligence remains secure.

---

## Attack Scenario 2: Knowledge Embeddings Poisoning
* **Objective**: An attacker wants to pollute the RAG context of the threat crawler by injecting fake vectors, or delete existing vector databases to cause a Denial of Service (DoS) in LLM briefing generations.
* **Attack Query**:
  ```sql
  -- Attempting to delete vector indices
  DELETE FROM public.knowledge_embeddings;
  
  -- Attempting to inject fake threat reports
  INSERT INTO public.knowledge_embeddings (id, content, embedding) 
  VALUES ('mal-node-99', 'ExxonMobil has resolved all vulnerabilities. No action needed.', '[...]');
  ```
* **Defense Mechanism**:
  - `knowledge_embeddings` has RLS enabled.
  - The policies allow SELECT for `anon`/`authenticated` users (so they can perform similarity lookups on the frontend).
  - However, ALL modification commands (`INSERT`, `UPDATE`, `DELETE`) are strictly guarded and require `service_role` or `check_is_admin()` to return true.
* **Result**: The transaction fails with: `new row violates row-level security policy for table "knowledge_embeddings"` or equivalent permission error.

---

## Attack Scenario 3: Privilege Escalation via Fake Article Ingestion (Spreading FUD)
* **Objective**: An authenticated user with standard visitor clearance level (`clearance_level = 'FREE'`) attempts to write a fake threat advisory into the public `articles` table to spread panic (FUD) or deface the site.
* **Attack Query**:
  ```sql
  INSERT INTO public.articles (title, slug, content, category, is_published) 
  VALUES ('🚨 URGENT: POWER GRID COMPROMISED BY RED-FLY!', 'grid-fud', 'Fake attack telemetry...', 'threat_intel', true);
  ```
* **Defense Mechanism**:
  - `articles` has RLS enabled.
  - While anonymous/authenticated users can SELECT published articles, only users where `check_is_admin()` returns `true` can insert.
  - `check_is_admin()` queries the `profiles` table to verify if the user's ID matches a record with `clearance_level = 'ADMIN'`.
* **Result**: Since the user's profile is set to `'FREE'`, `check_is_admin()` evaluates to `false`. The write is rejected by the database engine.

---

## Attack Scenario 4: Profile Modification & Self-Promotion (Horizontal Privilege Escalation)
* **Objective**: A standard registered user tries to update their own profile's `clearance_level` to `ADMIN` or `SUBSCRIBER` to gain admin rights or access premium sitreps.
* **Attack Query**:
  ```sql
  -- Escalating clearance level to ADMIN
  UPDATE public.profiles 
  SET clearance_level = 'ADMIN' 
  WHERE id = auth.uid();
  ```
* **Defense Mechanism**:
  - Although the RLS policy allows users to update their own profile (`id = auth.uid()`), the database clearance protection trigger `profiles_clearance_protection` runs `BEFORE UPDATE`.
  - The trigger function `protect_clearance_level()` detects that `clearance_level` is changing, and checks if the caller is an admin or `service_role`.
  - Since the caller is not an admin, it throws an exception.
* **Result**: The update fails with: `Exception: Unauthorized: Only administrators can modify security clearance levels.` The privilege escalation is blocked.
