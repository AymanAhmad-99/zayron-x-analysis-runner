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

cve_id = "CVE-2026-98765"
content_hash = hashlib.sha256(f"{cve_id}".encode("utf-8")).hexdigest()

raw_content = (
    f"[CVE:{cve_id}] [HASH:{content_hash}]\n\n"
    f"# Critical Remote Code Execution in ZayronSSL Core Handshake Decryption Buffers\n\n"
    f"**CVE ID:** {cve_id}\n"
    f"**Severity:** Critical\n"
    f"**CVSS Score:** 9.8\n"
    f"**CVSS Vector:** CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N\n"
    f"**Product:** ZayronSSL Core\n"
    f"**Vendor:** Zayron-Tech\n\n"
    f"**Description:**\n"
    f"A heap buffer overflow vulnerability exists in ZayronSSL Core prior to version 4.9.2 "
    f"within the client handshake key negotiation protocol. Remote unauthenticated attackers "
    f"can exploit this vulnerability by sending malformed ClientHello packets, leading to "
    f"arbitrary code execution with root privileges."
)

try:
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute("SELECT id FROM raw_feeds WHERE url_hash = %s;", (content_hash,))
    existing = cursor.fetchone()
    if existing:
        print(f"Mock feed for {cve_id} already exists, deleting first...")
        cursor.execute("DELETE FROM raw_feeds WHERE url_hash = %s;", (content_hash,))
        conn.commit()

    # Insert raw feed
    cursor.execute("""
        INSERT INTO raw_feeds (source_channel, raw_content, original_language, status, category, url_hash)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id;
    """, ("cveNotify", raw_content, "en", "pending", "vulnerabilities", content_hash))
    
    feed_id = cursor.fetchone()[0]
    conn.commit()
    print(f"[SUCCESS] Inserted pending CVE raw feed with ID: {feed_id} for {cve_id}")

finally:
    conn.close()
