-- ============================================================
-- ZAYRON-X — Zero-Leak Cryptographic Content Gating & RLS Setup
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────
-- 1. TABLE: profiles
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID PRIMARY KEY,
  clearance_level   TEXT NOT NULL DEFAULT 'FREE',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role full access to profiles" ON public.profiles;

-- Create policies
CREATE POLICY "Allow users to read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow service role full access to profiles" ON public.profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────
-- 2. TABLE: threat_artifacts_secure (Raw Storage)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.threat_artifacts_secure (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                     TEXT NOT NULL,
  severity                  TEXT NOT NULL,
  cvss_score                NUMERIC(3,1) NOT NULL,
  fbr_total                 NUMERIC(12,2) NOT NULL,
  sector                    TEXT NOT NULL,
  yara_rules                TEXT,
  sigma_rules               TEXT,
  raw_iocs                  TEXT,
  unmasked_target_entities  TEXT,
  sitrep_pdf_url            TEXT,
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on the secure underlying storage
ALTER TABLE public.threat_artifacts_secure ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on threat_artifacts_secure
DROP POLICY IF EXISTS "Allow service role full access to secure threats" ON public.threat_artifacts_secure;
DROP POLICY IF EXISTS "Allow subscriber select access to secure threats" ON public.threat_artifacts_secure;

-- Policy: Only service_role can perform general CRUD on secure underlying storage directly
CREATE POLICY "Allow service role full access to secure threats" ON public.threat_artifacts_secure
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────
-- 3. HELPER FUNCTION: check_is_subscriber
-- ──────────────────────────────────────────────
-- A SECURITY DEFINER function executes with database administrator privileges,
-- allowing it to check the public.profiles table even if the client's session has RLS enabled.
CREATE OR REPLACE FUNCTION public.check_is_subscriber()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND clearance_level = 'SUBSCRIBER'
  );
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────
-- 4. VIEW: threat_artifacts (Dynamic Gating View)
-- ──────────────────────────────────────────────
-- Create a secure view that masks sensitive columns when queried by anyone who isn't a SUBSCRIBER.
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

-- Grant SELECT access on the public-facing view to anon, authenticated, and service_role.
GRANT SELECT ON public.threat_artifacts TO anon, authenticated, service_role;

-- ──────────────────────────────────────────────
-- 5. TRIGGER: Sync profiles on Auth User Creation
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, clearance_level)
  VALUES (new.id, 'FREE')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────
-- 6. SEED DATA
-- ──────────────────────────────────────────────
INSERT INTO public.threat_artifacts_secure (
  id, title, severity, cvss_score, fbr_total, sector,
  yara_rules, sigma_rules, raw_iocs, unmasked_target_entities, sitrep_pdf_url
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'APT29 (Nobelium) Active Active Directory Exploitation Campaign',
    'CRITICAL',
    9.8,
    4200000.00,
    'Critical Infrastructure',
    'rule APT29_AD_Exploitation_May2026 {\n  meta:\n    description = "Detects APT29 AD persistence and Golden Ticket manipulation"\n    author = "ZAYRON-X Intel"\n    severity = "CRITICAL"\n  strings:\n    $ad_exploit_1 = { 4b 65 72 62 65 72 6f 73 5f 41 53 5f 52 45 51 }\n    $ad_exploit_2 = "mimikatz"\n  condition:\n    any of them\n}',
    'title: AD Golden Ticket Event Logs\nid: ad-golden-ticket-detect\nstatus: stable\ndescription: Detects AD ticket manipulation\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 4624\n    LogonType: 3\n  condition: selection',
    'IPs: 185.220.101.44, 45.227.254.12\nDomains: secure-update-node.net, c2-channel.org\nHashes: 8b4c52fa31e13a48e427bc5292eb5c20, 5d4b58c5a21e4a3b8e4e6b52a92eb5f2',
    'Federal Reserve Bank of Dallas, US Department of Energy, ExxonMobil',
    'https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/APT29-AD-SITREP-2026-05.pdf'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'LockBit 4.0 (Black) Ransomware Target Gating Health Sector',
    'CRITICAL',
    9.6,
    8950000.00,
    'Healthcare',
    'rule LockBit_4_0_Black_Ransom {\n  meta:\n    description = "Detects LockBit 4.0 ransomware binary indicators"\n    author = "ZAYRON-X Intel"\n    severity = "CRITICAL"\n  strings:\n    $lockbit_black_1 = "LockBit-Black-Remediation"\n    $lockbit_black_2 = ".lockbit"\n  condition:\n    all of them\n}',
    'title: LockBit 4.0 File Encryption Activity\nid: lockbit-4-file-enc\nstatus: experimental\nlogsource:\n  category: file_event\ndetection:\n  selection:\n    TargetFilename|endswith: \'.lockbit\'\n  condition: selection',
    'IPs: 91.240.118.15, 109.230.199.4\nDomains: lockbitpayload.to, recoverynode.biz\nHashes: f2c4b58a529ebf427bc5292eb5c203b1, 9a8b7c6d5e4d3c2b1a0f9e8d7c6b5a4b',
    'Mount Sinai Hospital, Blue Cross Blue Shield, National Health Service (UK)',
    'https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/LockBit4-HealthSector-SITREP-2026-05.pdf'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Volt Typhoon Stealth Intrusion in Power Grid Controllers',
    'HIGH',
    8.8,
    3150000.00,
    'Energy',
    'rule Volt_Typhoon_PowerGrid_Stealth {\n  meta:\n    description = "Detects Volt Typhoon custom proxy and LOTL tools"\n    author = "ZAYRON-X Intel"\n    severity = "HIGH"\n  strings:\n    $lotl_tools_1 = "wmic.exe shadowcopy delete"\n    $lotl_tools_2 = "vssadmin.exe delete shadows"\n  condition:\n    any of them\n}',
    'title: Shadow Copy Deletion (Living off the Land)\nid: shadow-copy-delete-lotl\nstatus: stable\nlogsource:\n  category: process_creation\ndetection:\n  selection:\n    Image|endswith: \'\\wmic.exe\'\n    CommandLine|contains: \'shadowcopy\'\n  condition: selection',
    'IPs: 185.112.144.9, 192.3.166.42\nDomains: local-dns-resolver.net, gateway-cdn.com\nHashes: c5e4b7a2d1e53a48e427bc5292eb5c20, a8b7c6d5e4f3a2b109e8d7c6b5a4b3c2',
    'Pacific Gas and Electric Company (PG&E), Tokyo Electric Power, Enedis',
    'https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/VoltTyphoon-Grid-SITREP-2026-05.pdf'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
