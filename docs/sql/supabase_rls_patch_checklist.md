# ZAYRON-X — Supabase RLS Patch Checklist

> [!IMPORTANT]
> This is a **manual step** that requires access to your Supabase dashboard.
> The SQL file `supabase_rls_patch.sql` exists in the project root but must be applied manually.

---

## Pre-Requisites

- Active Supabase account with access to project `xdfndojvqazffcjngglr`
- Your `SUPABASE_SERVICE_KEY` (service_role JWT) — find it in Supabase Dashboard → Settings → API

---

## Step-by-Step Instructions

### 1. Open the SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select project **xdfndojvqazffcjngglr**
3. In the left sidebar, click **SQL Editor**
4. Click **New query**

---

### 2. Apply the RLS Patch

1. Open `supabase_rls_patch.sql` from the project root in any text editor
2. Copy the **entire** file contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (▶ button or `Ctrl+Enter`)

Expected output: Each `CREATE POLICY` / `ALTER TABLE` statement should show `Success`

---

### 3. Verify RLS Is Enabled

Run this query to confirm RLS is active on all public tables:

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: `rowsecurity = true` for every table.

---

### 4. Verify `raw_feeds` Is Not Publicly Readable

The audit flagged `raw_feeds` as publicly readable. After applying the patch, verify:

```sql
-- Should return 0 rows if anonymous access is blocked
SELECT count(*) FROM raw_feeds;
-- Run this as anon (use the anon key, not service_role)
```

Alternatively, in the Supabase Dashboard:
- Go to **Authentication → Policies**
- Find `raw_feeds` table
- Confirm there is **no** SELECT policy for the `anon` role

---

### 5. Test Article Reads (Public Should Work)

```sql
-- Run with ANON key — should return published articles
SELECT id, title, slug FROM articles
WHERE is_published = true
LIMIT 5;
```

---

### 6. Rotate Database Password (If Exposed)

> [!CAUTION]
> The audit document references a hardcoded password `zayron2026DB`.
> If this was ever in a committed file, **rotate your database password immediately**:
>
> 1. Supabase Dashboard → **Settings → Database**
> 2. Click **Reset database password**
> 3. Update `DATABASE_URL` in `.env.local` and your VPS environment

---

## Post-Patch Checklist

- [ ] `supabase_rls_patch.sql` applied successfully (no errors)
- [ ] RLS enabled on all tables (`rowsecurity = true`)
- [ ] `raw_feeds` has no anon SELECT policy
- [ ] `articles` has anon SELECT policy for `is_published = true` rows only
- [ ] `subscribers` has no anon SELECT policy (write-only via service_role)
- [ ] `analysts` has anon SELECT policy (public profiles)
- [ ] Database password rotated (if `zayron2026DB` was ever committed)
- [ ] `DATABASE_URL` updated in `.env.local` after rotation
- [ ] VPS environment variables updated after rotation

---

## Table-Level RLS Policy Summary

| Table | Anon SELECT | Anon INSERT | Service Role |
|---|---|---|---|
| `articles` | ✅ Published only | ❌ | ✅ Full |
| `cves` | ✅ All | ❌ | ✅ Full |
| `raw_feeds` | ❌ None | ❌ | ✅ Full |
| `subscribers` | ❌ None | ✅ Own email | ✅ Full |
| `analysts` | ✅ All | ❌ | ✅ Full |
| `tools` | ✅ All | ❌ | ✅ Full |
| `trending` | ✅ All | ❌ | ✅ Full |
| `programming_langs` | ✅ All | ❌ | ✅ Full |
