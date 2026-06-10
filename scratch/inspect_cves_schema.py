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
    print("=== cves Table Schema ===")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'cves'
        ORDER BY ordinal_position;
    """)
    for row in cursor.fetchall():
        print(f"Column: {row[0]:<25} Type: {row[1]:<20} Nullable: {row[2]:<6} Default: {row[3]}")
finally:
    conn.close()
