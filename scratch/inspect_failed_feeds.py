import pg8000.dbapi
import urllib.parse
import json

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
    
    # 1. Fetch a few persist_failed feeds
    print("=== Persist Failed Feeds Sample ===")
    cursor.execute("""
        SELECT id, source_channel, category, analysis, created_at, promoted_at 
        FROM raw_feeds 
        WHERE status = 'persist_failed' 
        LIMIT 5;
    """)
    for row in cursor.fetchall():
        print(f"ID: {row[0]}, Channel: {row[1]}, Category: {row[2]}")
        print(f"Analysis (trimmed): {row[3][:200] if row[3] else 'None'}")
        print(f"Created At: {row[4]}, Promoted At: {row[5]}")
        print("-" * 50)

    # 2. Fetch a few crew_failed feeds
    print("\n=== Crew Failed Feeds Sample ===")
    cursor.execute("""
        SELECT id, source_channel, category, analysis, created_at 
        FROM raw_feeds 
        WHERE status = 'crew_failed' 
        LIMIT 5;
    """)
    for row in cursor.fetchall():
        print(f"ID: {row[0]}, Channel: {row[1]}, Category: {row[2]}")
        print(f"Analysis: {row[3]}")
        print(f"Created At: {row[4]}")
        print("-" * 50)

    # 3. Check if there are any PostgreSQL constraint violations or errors recently in log/system?
    # We can't view PG logs directly, but we can check if there are unique constraints, non-null values, or data types that might fail.
    # Let's inspect unique constraints or indexes on `articles` and `raw_feeds`.
    print("\n=== Constraints on articles ===")
    cursor.execute("""
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'articles'::regclass;
    """)
    for row in cursor.fetchall():
        print(f"Constraint: {row[0]} -> {row[1]}")

    print("\n=== Constraints on raw_feeds ===")
    cursor.execute("""
        SELECT conname, pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'raw_feeds'::regclass;
    """)
    for row in cursor.fetchall():
        print(f"Constraint: {row[0]} -> {row[1]}")

finally:
    conn.close()
