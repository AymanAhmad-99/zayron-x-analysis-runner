import pg8000.dbapi
import urllib.parse
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
    database=database,
    ssl_context=True
)

cursor = conn.cursor()

ddl_statements = [
    # 1. Add columns to articles
    "ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_public_teaser BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS teaser_text TEXT;",

    # 2. Add columns to threat_artifacts_secure
    "ALTER TABLE public.threat_artifacts_secure ADD COLUMN IF NOT EXISTS is_public_teaser BOOLEAN DEFAULT TRUE;",
    "ALTER TABLE public.threat_artifacts_secure ADD COLUMN IF NOT EXISTS teaser_text TEXT;",

    # 3. Drop view first to allow column reordering/additions
    "DROP VIEW IF EXISTS public.threat_artifacts;",

    # 4. Recreate public.threat_artifacts view to expose the columns
    """
    CREATE OR REPLACE VIEW public.threat_artifacts AS
    SELECT
      id,
      title,
      severity,
      cvss_score,
      fbr_total,
      sector,
      is_public_teaser,
      teaser_text,
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

    # 5. Regrant select permission on the view
    "GRANT SELECT ON public.threat_artifacts TO anon, authenticated, service_role;"
]

try:
    for statement in ddl_statements:
        print(f"Executing:\n{statement[:100]}...")
        cursor.execute(statement)
    conn.commit()
    print("[SUCCESS] Database migration completed successfully.")
except Exception as e:
    conn.rollback()
    print(f"[ERROR] Database migration failed: {e}")
finally:
    conn.close()
