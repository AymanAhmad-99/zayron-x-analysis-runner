import subprocess
import json
import sys
from production_mutation_lock import require_local_mutation_authorization

require_local_mutation_authorization('reset_production_d1.py')

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 64)
print("  ZAYRON-X CONTROLLED PRODUCTION RESET")
print("=" * 64)

reset_queries = [
    # 1. Dependent social & derived tables
    "DELETE FROM social_publications;",
    "DELETE FROM social_assets;",
    "DELETE FROM posts;",
    "DELETE FROM threat_iocs;",
    "DELETE FROM malware_reports;",
    
    # 2. Graph, TTPs, and IOCs
    "DELETE FROM relations;",
    "DELETE FROM ttp_mappings;",
    "DELETE FROM iocs;",
    
    # 3. Evidence and Articles
    "DELETE FROM evidence;",
    "DELETE FROM articles;",
    "DELETE FROM reports;",
    "DELETE FROM alerts;",
    "DELETE FROM watchlists;",
    
    # 4. Intelligence Events & Source Messages
    "DELETE FROM intelligence_events;",
    "DELETE FROM source_messages;",
    
    # 5. Logs & jobs
    "DELETE FROM ai_runs;",
    "DELETE FROM feature_usage;",
    "DELETE FROM jobs;",
    
    # 6. Entity Directories (Derivations / Seeded Prototype Data)
    "DELETE FROM campaigns;",
    "DELETE FROM malware;",
    "DELETE FROM actors;",
    "DELETE FROM vulnerabilities;",
    
    # 7. Remove Synthetic Test Channel from Sources Registry
    "DELETE FROM sources WHERE id = 'tg_test_channel';"
]

sql_batch = " ".join(reset_queries)

print("[*] Executing reset SQL on remote database zayron-x-db...")
cmd = f'npx wrangler d1 execute zayron-x-db --remote --command "{sql_batch}"'
res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')

if res.returncode != 0:
    print(f"[✗] Error executing reset SQL:\n{res.stderr}\n{res.stdout}")
    sys.exit(1)

print("[✓] Deletion executed successfully.")
print("\n" + "=" * 64)
print("  VERIFYING TABLE ROW COUNTS POST-RESET")
print("=" * 64)

tables = [
    'sources', 'source_messages', 'intelligence_events', 'evidence',
    'vulnerabilities', 'iocs', 'actors', 'malware', 'campaigns',
    'relations', 'ttp_mappings', 'articles', 'reports', 'alerts',
    'watchlists', 'ai_runs', 'jobs', 'feature_usage', 'social_publications',
    'social_assets', 'posts', 'threat_iocs', 'malware_reports'
]

# Query table counts in chunks
chunks = [tables[i:i+5] for i in range(0, len(tables), 5)]
results = {}

for chunk in chunks:
    sub_selects = " UNION ALL ".join([f"SELECT '{t}' as tbl, count(*) as cnt FROM {t}" for t in chunk])
    cmd = f'npx wrangler d1 execute zayron-x-db --remote --json --command "{sub_selects};"'
    q_res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    try:
        data = json.loads(q_res.stdout)
        for row in data[0]['results']:
            results[row['tbl']] = row['cnt']
    except Exception as e:
        print(f"Error checking counts for chunk {chunk}: {e}")

print(f"{'TABLE':<24} | {'STATUS':<12} | {'ROW COUNT'}")
print("-" * 50)
for t in tables:
    count = results.get(t, 'N/A')
    status = "PRESERVED" if t == 'sources' and count > 0 else ("CLEAN (0)" if count == 0 else f"DIRTY ({count})")
    print(f"{t:<24} | {status:<12} | {count}")

print("=" * 64)
