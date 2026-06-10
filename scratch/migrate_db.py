import pg8000.dbapi
import os
import re
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv("DATABASE_URL")

match = re.match(r"postgresql://([^:]+):([^@]+)@([^:/]+):(\d+)/(.+)", db_url)
user, password, host, port, database = match.groups()

conn = pg8000.dbapi.connect(
    user=user,
    password=password,
    host=host,
    port=int(port),
    database=database
)

cursor = conn.cursor()

ddl_statements = [
    # 1. Create profiles table if not exists
    """
    CREATE TABLE IF NOT EXISTS public.profiles (
      id                UUID PRIMARY KEY,
      clearance_level   TEXT NOT NULL DEFAULT 'FREE',
      created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    """,

    # 2. Enable RLS on profiles
    "ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;",

    # 3. Recreate policies on profiles (drop first to prevent duplicate errors)
    "DROP POLICY IF EXISTS \"Allow users to read their own profile\" ON public.profiles;",
    "DROP POLICY IF EXISTS \"Allow users to update their own profile\" ON public.profiles;",
    "DROP POLICY IF EXISTS \"Allow service role full access to profiles\" ON public.profiles;",
    
    """
    CREATE POLICY "Allow users to read their own profile" ON public.profiles
      FOR SELECT TO authenticated USING (auth.uid() = id);
    """,
    """
    CREATE POLICY "Allow users to update their own profile" ON public.profiles
      FOR UPDATE TO authenticated USING (auth.uid() = id);
    """,
    """
    CREATE POLICY "Allow service role full access to profiles" ON public.profiles
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    """,

    # 4. Create check_is_subscriber helper function
    """
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
    """,

    # 5. Drop existing view and table
    "DROP VIEW IF EXISTS public.threat_artifacts CASCADE;",
    "DROP TABLE IF EXISTS public.threat_artifacts_secure CASCADE;",

    # 6. Create the secure table
    """
    CREATE TABLE public.threat_artifacts_secure (
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
    """,

    # 7. Enable RLS and add service role policy
    "ALTER TABLE public.threat_artifacts_secure ENABLE ROW LEVEL SECURITY;",
    """
    CREATE POLICY "Allow service role full access to secure threats" ON public.threat_artifacts_secure
      FOR ALL TO service_role USING (true) WITH CHECK (true);
    """,

    # 8. Create the gating view
    """
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
    """,

    # 9. Grant SELECT access to roles
    "GRANT SELECT ON public.threat_artifacts TO anon, authenticated, service_role;",

    # 10. Seed the 3 mock rows
    """
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
        'rule APT29_AD_Exploitation_May2026 { condition: true }',
        'title: AD Golden Ticket Event Logs',
        'IPs: 185.220.101.44',
        'Federal Reserve Bank of Dallas',
        'https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/APT29-AD-SITREP-2026-05.pdf'
      ),
      (
        '22222222-2222-2222-2222-222222222222',
        'LockBit 4.0 (Black) Ransomware Target Gating Health Sector',
        'CRITICAL',
        9.6,
        8950000.00,
        'Healthcare',
        'rule LockBit_4_0_Black_Ransom { condition: true }',
        'title: LockBit 4.0 File Encryption Activity',
        'IPs: 91.240.118.15',
        'Mount Sinai Hospital',
        'https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/LockBit4-HealthSector-SITREP-2026-05.pdf'
      ),
      (
        '33333333-3333-3333-3333-333333333333',
        'Volt Typhoon Stealth Intrusion in Power Grid Controllers',
        'HIGH',
        8.8,
        3150000.00,
        'Energy',
        'rule Volt_Typhoon_PowerGrid_Stealth { condition: true }',
        'title: Shadow Copy Deletion',
        'IPs: 185.112.144.9',
        'Pacific Gas and Electric Company (PG&E)',
        'https://xdfndojvqazffcjngglr.supabase.co/storage/v1/object/public/sitreps/VoltTyphoon-Grid-SITREP-2026-05.pdf'
      )
    ON CONFLICT (id) DO NOTHING;
    """
]

try:
    print("Beginning transaction...")
    for stmt in ddl_statements:
        print(f"Executing statement...")
        cursor.execute(stmt)
    conn.commit()
    print("Migration executed and committed successfully!")
except Exception as exc:
    conn.rollback()
    print(f"Migration failed: {exc}")

cursor.close()
conn.close()
