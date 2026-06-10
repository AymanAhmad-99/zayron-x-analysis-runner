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
    
    # 1. Table sizes and row counts
    print("=== Table Sizes and Row Counts ===")
    cursor.execute("""
        SELECT 
            relname AS table_name,
            reltuples::bigint AS row_count,
            pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
            pg_size_pretty(pg_relation_size(oid)) AS table_size,
            pg_size_pretty(pg_indexes_size(oid)) AS index_size
        FROM pg_class
        WHERE relkind = 'r' 
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY pg_total_relation_size(oid) DESC;
    """)
    for row in cursor.fetchall():
        print(f"Table: {row[0]:<25} Rows: {row[1]:<10} Total Size: {row[2]:<10} Table Size: {row[3]:<10} Index Size: {row[4]}")

    # 2. Table schemas
    print("\n=== Raw Feeds Table Schema ===")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'raw_feeds'
        ORDER BY ordinal_position;
    """)
    for row in cursor.fetchall():
        print(f"Column: {row[0]:<25} Type: {row[1]:<20} Nullable: {row[2]:<6} Default: {row[3]}")

    print("\n=== Articles Table Schema ===")
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'articles'
        ORDER BY ordinal_position;
    """)
    for row in cursor.fetchall():
        print(f"Column: {row[0]:<25} Type: {row[1]:<20} Nullable: {row[2]:<6} Default: {row[3]}")

    # 3. Status distribution in raw_feeds
    print("\n=== Status Distribution in raw_feeds ===")
    cursor.execute("SELECT status, count(*) FROM raw_feeds GROUP BY status;")
    for row in cursor.fetchall():
        print(f"Status: {row[0]:<25} Count: {row[1]}")

    # 4. Triggers on raw_feeds and articles
    print("\n=== Triggers ===")
    cursor.execute("""
        SELECT tgname, relname, tgtype
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE nspname = 'public' AND NOT tgisinternal;
    """)
    for row in cursor.fetchall():
        print(f"Trigger: {row[0]:<30} Table: {row[1]:<20}")

    # 5. Foreign keys
    print("\n=== Foreign Keys ===")
    cursor.execute("""
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    """)
    for row in cursor.fetchall():
        print(f"Table: {row[0]} ({row[1]}) -> {row[2]} ({row[3]})")

    # 6. Active sessions and locks
    print("\n=== Active/Blocking Locks ===")
    cursor.execute("""
        SELECT pid, relation::regclass, mode, granted 
        FROM pg_locks 
        WHERE NOT granted;
    """)
    locks = cursor.fetchall()
    if locks:
        for row in locks:
            print(f"Blocked PID: {row[0]} Relation: {row[1]} Mode: {row[2]} Granted: {row[3]}")
    else:
        print("No blocked locks detected.")

    # 7. Long running queries
    print("\n=== Active Long-Running Queries ===")
    cursor.execute("""
        SELECT pid, now() - query_start AS duration, query, state
        FROM pg_stat_activity
        WHERE state != 'idle' AND now() - query_start > interval '5 seconds';
    """)
    queries = cursor.fetchall()
    if queries:
        for row in queries:
            print(f"PID: {row[0]:<6} Duration: {row[1]} State: {row[3]}\nQuery: {row[2][:200]}...")
    else:
        print("No active queries running longer than 5 seconds.")

finally:
    conn.close()
