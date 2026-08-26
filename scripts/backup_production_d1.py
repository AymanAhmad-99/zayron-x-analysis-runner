import subprocess
import json
import os
import sys
import datetime

sys.stdout.reconfigure(encoding='utf-8')


tables = [
    'sources', 'source_messages', 'intelligence_events', 'evidence',
    'vulnerabilities', 'iocs', 'actors', 'malware', 'campaigns',
    'relations', 'ttp_mappings', 'articles', 'reports', 'alerts',
    'watchlists', 'ai_runs', 'jobs', 'feature_usage', 'social_publications',
    'social_assets', 'posts', 'threat_iocs', 'malware_reports',
    'organizations', 'users', 'subscriptions', 'payment_sessions',
    'audit_events', 'd1_migrations'
]

timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%SZ")
backup_dir = "db/backups"
json_backup_file = os.path.join(backup_dir, f"production_d1_backup_{timestamp}.json")
sql_backup_file = os.path.join(backup_dir, f"production_d1_backup_{timestamp}.sql")

backup_data = {
    "timestamp": timestamp,
    "database": "zayron-x-db",
    "tables": {}
}

print(f"[*] Initiating Production D1 Backup at {timestamp}...")

sql_statements = []

for table in tables:
    cmd = f'npx wrangler d1 execute zayron-x-db --remote --json --command "SELECT * FROM {table};"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    try:
        data = json.loads(res.stdout)
        rows = data[0]['results']
        backup_data["tables"][table] = {
            "count": len(rows),
            "rows": rows
        }
        print(f"  [✓] Table '{table}': {len(rows)} rows backed up.")
        
        # Generate SQL INSERT statements
        if rows:
            for row in rows:
                cols = list(row.keys())
                vals = []
                for c in cols:
                    v = row[c]
                    if v is None:
                        vals.append("NULL")
                    elif isinstance(v, (int, float)):
                        vals.append(str(v))
                    else:
                        escaped = str(v).replace("'", "''")
                        vals.append(f"'{escaped}'")
                cols_str = ", ".join([f"`{c}`" for c in cols])
                vals_str = ", ".join(vals)
                sql_statements.append(f"INSERT INTO `{table}` ({cols_str}) VALUES ({vals_str});")
    except Exception as e:
        print(f"  [✗] Failed to backup table '{table}': {e}")
        backup_data["tables"][table] = {
            "error": str(e),
            "stdout": res.stdout[:200]
        }

with open(json_backup_file, "w", encoding="utf-8") as f:
    json.dump(backup_data, f, indent=2, ensure_ascii=False)

with open(sql_backup_file, "w", encoding="utf-8") as f:
    f.write(f"-- ZAYRON-X Production D1 Backup\n-- Date: {timestamp}\n\n")
    f.write("\n".join(sql_statements))
    f.write("\n")

print(f"[+] Backup completed successfully.")
print(f"    JSON: {json_backup_file} ({os.path.getsize(json_backup_file)} bytes)")
print(f"    SQL:  {sql_backup_file} ({os.path.getsize(sql_backup_file)} bytes)")
