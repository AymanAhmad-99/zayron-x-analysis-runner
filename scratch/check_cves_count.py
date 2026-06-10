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
    cursor.execute("SELECT COUNT(*) FROM cves;")
    cve_count = cursor.fetchone()[0]
    
    # Check if threat_artifacts_secure table exists and get count
    cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'threat_artifacts_secure');")
    secure_exists = cursor.fetchone()[0]
    
    secure_count = 0
    if secure_exists:
        cursor.execute("SELECT COUNT(*) FROM threat_artifacts_secure;")
        secure_count = cursor.fetchone()[0]
        
    print(f"Total CVEs in database: {cve_count}")
    print(f"threat_artifacts_secure exists: {secure_exists}, Total rows: {secure_count}")
    
finally:
    conn.close()
