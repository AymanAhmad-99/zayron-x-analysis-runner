# ZAYRON-X: Database Map Report
**Target System:** ZAYRON-X Autonomous CTI Platform  
**Scope:** Tables, Views, Functions, Triggers, Policies, and Field Configurations  
**Timestamp:** 2026-06-11T03:48:00Z  

---

## 1. Tables Map

### 1.1 `public.raw_feeds`
- **Purpose**: Unified staging queue for raw source ingestors.
- **Fields**:
  - `id`: `UUID` PRIMARY KEY (Default: `gen_random_uuid()`)
  - `source_channel`: `TEXT` NOT NULL
  - `raw_content`: `TEXT` NOT NULL
  - `original_language`: `TEXT` NOT NULL (Default: `'ru'`)
  - `status`: `TEXT` NOT NULL (Default: `'pending'`) (Statuses: `pending`, `processing_crew`, `crew_promoted`, `crew_failed`, `crew_ignored`, `persist_failed`)
  - `translated_title`: `TEXT` NULL
  - `translated_content`: `TEXT` NULL
  - `analysis`: `TEXT` NULL
  - `ai_generated_flag`: `BOOLEAN` (Default: `FALSE`)
  - `prompt_tokens`: `INTEGER` NULL
  - `completion_tokens`: `INTEGER` NULL
  - `timestamp`: `TIMESTAMP` (Default: `NOW()`)
  - `created_at`: `TIMESTAMP` (Default: `NOW()`)
  - `promoted_at`: `TIMESTAMP` NULL
- **Indexes**:
  - `idx_raw_feeds_status` ON `raw_feeds(status)`
  - `idx_raw_feeds_created_at` ON `raw_feeds(created_at DESC)`

### 1.2 `public.articles`
- **Purpose**: Production-grade threat intelligence dossiers and published reports.
- **Fields**:
  - `id`: `UUID` PRIMARY KEY (Default: `gen_random_uuid()`)
  - `title`: `TEXT` NOT NULL
  - `slug`: `TEXT` NOT NULL UNIQUE
  - `url_hash`: `TEXT` UNIQUE
  - `subtitle`: `TEXT` NULL
  - `author`: `TEXT` NOT NULL (Default: `'Zayron Intel'`)
  - `category`: `TEXT` NOT NULL
  - `tags`: `TEXT[]` (Default: `'{}'`)
  - `security_score`: `DECIMAL(3,1)` NULL
  - `content`: `TEXT` NOT NULL
  - `excerpt`: `TEXT` NULL
  - `image_url`: `TEXT` NULL
  - `read_time`: `INTEGER` (Default: `8`)
  - `views`: `INTEGER` (Default: `0`)
  - `is_published`: `BOOLEAN` (Default: `TRUE`)
  - `is_featured`: `BOOLEAN` (Default: `FALSE`)
  - `is_breaking`: `BOOLEAN` (Default: `FALSE`)
  - `published_at`: `TIMESTAMP` (Default: `NOW()`)
  - `created_at`: `TIMESTAMP` (Default: `NOW()`)
  - `updated_at`: `TIMESTAMP` (Default: `NOW()`)
- **Indexes**:
  - `idx_articles_slug` ON `articles(slug)`
  - `idx_articles_category` ON `articles(category)`
  - `idx_articles_url_hash` ON `articles(url_hash)`
  - `idx_articles_published` ON `articles(is_published) WHERE is_published = TRUE`
  - `idx_articles_fts` ON `articles USING GIN` (Full-text GIN index on `title`, `excerpt`, and `content`)

### 1.3 `public.threat_artifacts_secure`
- **Purpose**: Direct underlying storage for unmasked intelligence assets (rules, targets, raw indicators).
- **Fields**:
  - `id`: `UUID` PRIMARY KEY (Default: `gen_random_uuid()`)
  - `title`: `TEXT` NOT NULL
  - `severity`: `TEXT` NOT NULL
  - `cvss_score`: `NUMERIC(3,1)` NOT NULL
  - `fbr_total`: `NUMERIC(12,2)` NOT NULL
  - `sector`: `TEXT` NOT NULL
  - `yara_rules`: `TEXT` NULL
  - `sigma_rules`: `TEXT` NULL
  - `raw_iocs`: `TEXT` NULL
  - `unmasked_target_entities`: `TEXT` NULL
  - `sitrep_pdf_url`: `TEXT` NULL
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `timezone('utc'::text, now())`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `timezone('utc'::text, now())`)

### 1.4 `public.profiles`
- **Purpose**: Holds user account security configurations.
- **Fields**:
  - `id`: `UUID` PRIMARY KEY (Maps directly to `auth.users.id`)
  - `clearance_level`: `TEXT` NOT NULL (Default: `'FREE'`) (clearance_levels: `FREE`, `SUBSCRIBER`, `ADMIN`)
  - `created_at`: `TIMESTAMP WITH TIME ZONE` (Default: `timezone('utc'::text, now())`)
  - `updated_at`: `TIMESTAMP WITH TIME ZONE` (Default: `timezone('utc'::text, now())`)

### 1.5 `public.cves`
- **Purpose**: NIST NVD vulnerability records.
- **Fields**:
  - `id`: `UUID` PRIMARY KEY (Default: `gen_random_uuid()`)
  - `cve_id`: `TEXT` NOT NULL UNIQUE
  - `title`: `TEXT` NULL
  - `description`: `TEXT` NULL
  - `severity`: `TEXT` NOT NULL
  - `cvss_score`: `DECIMAL(3,1)` NULL
  - `cvss_vector`: `TEXT` NULL
  - `affected_product`: `TEXT` NULL
  - `vendor`: `TEXT` NULL
  - `status`: `TEXT` (Default: `'Active'`)
  - `published_date`: `TIMESTAMP` NULL
  - `created_at`: `TIMESTAMP` (Default: `NOW()`)

---

## 2. Views Map

### 2.1 `public.threat_artifacts`
- **Purpose**: Public gating interface overlaying `public.threat_artifacts_secure`.
- **Definition**:
  ```sql
  CREATE OR REPLACE VIEW public.threat_artifacts AS
  SELECT
    id,
    title,
    severity,
    cvss_score,
    fbr_total,
    sector,
    CASE
      WHEN public.check_is_subscriber() THEN yara_rules
      ELSE '[ RESTRICTED_INTEL ]'
    END AS yara_rules,
    CASE
      WHEN public.check_is_subscriber() THEN sigma_rules
      ELSE '[ RESTRICTED_INTEL ]'
    END AS sigma_rules,
    CASE
      WHEN public.check_is_subscriber() THEN raw_iocs
      ELSE '[ RESTRICTED_INTEL ]'
    END AS raw_iocs,
    CASE
      WHEN public.check_is_subscriber() THEN unmasked_target_entities
      ELSE '[ RESTRICTED_INTEL ]'
    END AS unmasked_target_entities,
    CASE
      WHEN public.check_is_subscriber() THEN sitrep_pdf_url
      ELSE '[ RESTRICTED_INTEL ]'
    END AS sitrep_pdf_url,
    created_at,
    updated_at
  FROM public.threat_artifacts_secure;
  ```

---

## 3. Database Functions & Triggers

### 3.1 Functions
1. **`public.check_is_subscriber()`**:
   - **Type**: `SECURITY DEFINER`
   - **Language**: `plpgsql`
   - **Logic**: Returns `TRUE` if `auth.uid()` has `clearance_level = 'SUBSCRIBER'` in the `public.profiles` table.
2. **`public.handle_new_user()`**:
   - **Type**: `SECURITY DEFINER`
   - **Language**: `plpgsql`
   - **Logic**: Inserts a matching record into `public.profiles` when a new record is added to `auth.users`.
3. **`public.update_updated_at_column()`**:
   - **Language**: `plpgsql`
   - **Logic**: Automatically updates the `updated_at` timestamp of the target record to `NOW()`.

### 3.2 Triggers
1. **`on_auth_user_created`**:
   - **Timing**: `AFTER INSERT` ON `auth.users`
   - **Scope**: `FOR EACH ROW`
   - **Action**: Executes `public.handle_new_user()`.
2. **`articles_updated_at`**:
   - **Timing**: `BEFORE UPDATE` ON `public.articles`
   - **Scope**: `FOR EACH ROW`
   - **Action**: Executes `public.update_updated_at_column()`.

---

## 4. Row Level Security (RLS) Policies

All tables restrict direct operations to ensure zero leakage:

| Table | Operations | Allowed Roles | Constraint Condition |
| :--- | :--- | :--- | :--- |
| `articles` | SELECT | `anon`, `authenticated` | `is_published = TRUE` |
| `articles` | ALL | `service_role` | `TRUE` |
| `cves` | SELECT | `anon`, `authenticated` | `TRUE` |
| `profiles` | SELECT / UPDATE | `authenticated` | `auth.uid() = id` |
| `profiles` | ALL | `service_role` | `TRUE` |
| `subscribers`| INSERT | `anon`, `authenticated` | `TRUE` |
| `raw_feeds` | ALL | `service_role` | `TRUE` (No anonymous select/insert allowed) |
| `threat_artifacts_secure` | ALL | `service_role` | `TRUE` (Direct client reads blocked) |
| `threat_artifacts` (View)| SELECT | `anon`, `authenticated` | Dynamic mask logic handled by security query |
