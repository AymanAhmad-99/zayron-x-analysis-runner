import pg8000.dbapi
import urllib.parse
from collections import Counter

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
    
    # 1. Total count of pending
    cursor.execute("SELECT count(*) FROM raw_feeds WHERE status = 'pending';")
    total_pending = cursor.fetchone()[0]
    print(f"Total pending: {total_pending}")

    # 2. Check for null or empty values
    cursor.execute("""
        SELECT 
            sum(case when raw_content is null or raw_content = '' then 1 else 0 end) as null_empty_content,
            sum(case when source_channel is null or source_channel = '' then 1 else 0 end) as null_empty_channel,
            sum(case when created_at is null then 1 else 0 end) as null_created_at
        FROM raw_feeds WHERE status = 'pending';
    """)
    null_stats = cursor.fetchone()
    print(f"Null/Empty Content: {null_stats[0]}, Null/Empty Channel: {null_stats[1]}, Null Created At: {null_stats[2]}")

    # 3. Distribution by channel
    print("\n=== Pending Count by Channel (Top 15) ===")
    cursor.execute("""
        SELECT source_channel, count(*) 
        FROM raw_feeds 
        WHERE status = 'pending' 
        GROUP BY source_channel 
        ORDER BY count(*) DESC 
        LIMIT 15;
    """)
    for row in cursor.fetchall():
        print(f"Channel: {row[0]:<50} Count: {row[1]}")

    # 4. Distribution by creation date (daily count for top 10 days)
    print("\n=== Pending Count by Day (Top 10 days) ===")
    cursor.execute("""
        SELECT date_trunc('day', created_at) as day, count(*) 
        FROM raw_feeds 
        WHERE status = 'pending' 
        GROUP BY day 
        ORDER BY count(*) DESC 
        LIMIT 10;
    """)
    for row in cursor.fetchall():
        print(f"Day: {str(row[0]):<30} Count: {row[1]}")

    # 5. Check if there are any duplicate raw_contents in raw_feeds
    print("\n=== Check Duplicate Content in raw_feeds ===")
    cursor.execute("""
        SELECT md5(raw_content), count(*) 
        FROM raw_feeds 
        GROUP BY md5(raw_content) 
        HAVING count(*) > 1 
        ORDER BY count(*) DESC 
        LIMIT 5;
    """)
    dups = cursor.fetchall()
    if dups:
        print(f"Found duplicate contents! Top 5 md5 hashes with counts:")
        for row in dups:
            print(f"Hash: {row[0]} -> Count: {row[1]}")
    else:
        print("No duplicate contents found.")

finally:
    conn.close()
