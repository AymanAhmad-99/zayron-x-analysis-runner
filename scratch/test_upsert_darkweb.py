import pg8000.dbapi
import urllib.parse
import hashlib
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

source_channel = "darkweb_leak"
leak_summary = "LockBit v4 Ransomware exfiltrated 450GB of health records from HealthFirst Group via an Active Directory compromise. Threat actors demand 50 BTC. Forensic analysis reveals YARA signature matches for active Russian affiliate groups."
content_hash = hashlib.sha256(leak_summary.encode("utf-8")).hexdigest()

raw_content = (
    f"[ALERT:DARKWEB_LEAK] [HASH:{content_hash}]\n\n"
    f"Ransomware group LockBit v4 claims a successful data breach on HealthFirst Group.\n"
    f"Target Sector: Healthcare\n"
    f"Estimated Records Compromised: 120,000 patient records\n"
    f"Exfiltrated Size: 450GB including internal SQL databases\n"
    f"Attack Vector: Cloud Active Directory Golden Ticket forgery\n\n"
    f"Telemetric details: IOCs show connection to C2 server 194.26.29.82. The attackers used a known zero-day in core SSL negotiation libraries. Yara rule 'lockbit_v4_decryptor_key' matches current active binary signatures."
)

try:
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM raw_feeds WHERE raw_content LIKE %s;", (f"%{content_hash}%",))
    existing = cursor.fetchone()
    if existing:
        print(f"Mock darkweb feed already exists, deleting first...")
        cursor.execute("DELETE FROM raw_feeds WHERE id = %s;", (existing[0],))
        conn.commit()

    # Insert raw feed
    cursor.execute("""
        INSERT INTO raw_feeds (source_channel, raw_content, original_language, status, category)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id;
    """, (source_channel, raw_content, "en", "pending", "threat_intel"))
    
    feed_id = cursor.fetchone()[0]
    conn.commit()
    print(f"[SUCCESS] Inserted pending Darkweb raw feed with ID: {feed_id}")

finally:
    conn.close()
