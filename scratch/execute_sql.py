import os
import pg8000.dbapi

DATABASE_URL = "postgresql://postgres.xdfndojvqazffcjngglr:Ay20941699nuor582002@aws-1-us-west-1.pooler.supabase.com:6543/postgres"

print("Parsing connection parameters...")
# Clean the connection URL protocol
assert DATABASE_URL.startswith("postgresql://")
url_body = DATABASE_URL[len("postgresql://"):]

# User & password
auth_part, host_part = url_body.split("@", 1)
user, password = auth_part.split(":", 1)

# Host, port & db name
host_port, dbname = host_part.split("/", 1)
host, port = host_port.split(":", 1)
port = int(port)

print(f"Connecting to host={host}, port={port}, user={user}, dbname={dbname}...")

sql = """
CREATE TABLE IF NOT EXISTS knowledge_base_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL,
  filename TEXT NOT NULL UNIQUE,
  words_count INTEGER DEFAULT 0,
  chunks_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE knowledge_base_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_knowledge_base_registry" ON knowledge_base_registry;
DROP POLICY IF EXISTS "admin_write_knowledge_base_registry" ON knowledge_base_registry;
DROP POLICY IF EXISTS "anon_read_knowledge_base_registry" ON knowledge_base_registry;

-- 1. Full access for service_role
CREATE POLICY "service_role_full_knowledge_base_registry"
  ON knowledge_base_registry FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- 2. Full access for admin role check in JWT
CREATE POLICY "admin_write_knowledge_base_registry"
  ON knowledge_base_registry FOR ALL
  TO authenticated
  USING (coalesce(auth.jwt() ->> 'role', '') = 'admin')
  WITH CHECK (coalesce(auth.jwt() ->> 'role', '') = 'admin');

-- 3. SELECT read access for anon and authenticated users
CREATE POLICY "anon_read_knowledge_base_registry"
  ON knowledge_base_registry FOR SELECT
  TO anon, authenticated
  USING (TRUE);
"""

conn = pg8000.dbapi.connect(
    user=user,
    password=password,
    host=host,
    port=port,
    database=dbname,
    ssl_context=True
)

try:
    cursor = conn.cursor()
    print("Executing database migration SQL...")
    cursor.execute(sql)
    conn.commit()
    print("Database mutation completed successfully!")
finally:
    conn.close()
