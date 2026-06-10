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

print("--- CVEs Count ---")
cursor.execute("SELECT count(*) FROM public.cves WHERE cve_id LIKE 'CVE-2026-99999%';")
print(cursor.fetchone()[0])

print("\n--- Threat Artifacts Secure Count ---")
cursor.execute("SELECT count(*) FROM public.threat_artifacts_secure WHERE title LIKE 'APT41 Active%';")
print(cursor.fetchone()[0])

print("\n--- Recent Threat Artifacts Secure Rows ---")
cursor.execute("SELECT id, title, severity, cvss_score, fbr_total, sector, unmasked_target_entities FROM public.threat_artifacts_secure ORDER BY created_at DESC LIMIT 2;")
for row in cursor.fetchall():
    print(row)

cursor.close()
conn.close()
