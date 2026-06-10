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

try:
    cursor.execute("""
        SELECT id, title, teaser_text, is_public_teaser, created_at 
        FROM public.threat_artifacts_secure 
        ORDER BY created_at DESC 
        LIMIT 5;
    """)
    rows = cursor.fetchall()
    print("=== Recently Processed Threat Artifacts ===")
    for row in rows:
        print(f"ID: {row[0]}")
        print(f"Title: {row[1]}")
        print(f"Teaser Text: {row[2]}")
        print(f"Is Public Teaser: {row[3]}")
        print(f"Created At: {row[4]}")
        print("-" * 50)
        
except Exception as e:
    print(f"Error querying threat artifacts: {e}")
finally:
    conn.close()
