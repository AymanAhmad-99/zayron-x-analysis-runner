import pg8000.dbapi
import os
from dotenv import load_dotenv

load_dotenv(override=True)
db_url = os.getenv("DATABASE_URL")

import re
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
print("--- threat_artifacts Columns ---")
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'threat_artifacts';
""")
for row in cursor.fetchall():
    print(row)

print("\n--- View Definition ---")
cursor.execute("""
    SELECT definition 
    FROM pg_views 
    WHERE schemaname = 'public' AND viewname = 'threat_artifacts';
""")
for row in cursor.fetchall():
    print(row[0])

cursor.close()
conn.close()
