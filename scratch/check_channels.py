import pg8000.dbapi
import urllib.parse

DATABASE_URL = "postgresql://postgres.xdfndojvqazffcjngglr:Ay20941699nuor582002@aws-1-us-west-1.pooler.supabase.com:6543/postgres"

result = urllib.parse.urlparse(DATABASE_URL)
username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port or 5432

conn = pg8000.dbapi.connect(
    user=username,
    password=password,
    host=hostname,
    port=port,
    database=database,
    ssl_context=True
)

try:
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT source_channel FROM raw_feeds;")
    rows = cursor.fetchall()
    print("Unique source_channels in raw_feeds:")
    for r in rows:
        print(f" - {r[0]}")
finally:
    conn.close()
