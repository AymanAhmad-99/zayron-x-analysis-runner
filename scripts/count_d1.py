import subprocess
import json
import os
import sys

tables = [
    'sources', 'source_messages', 'intelligence_events', 'evidence',
    'vulnerabilities', 'iocs', 'actors', 'malware', 'campaigns',
    'relations', 'ttp_mappings', 'articles', 'reports', 'alerts',
    'watchlists', 'ai_runs', 'jobs', 'feature_usage', 'social_publications',
    'social_assets', 'posts', 'threat_iocs', 'malware_reports'
]

# We can query multiple tables in small union chunks (up to 5 per query)
chunks = [tables[i:i+5] for i in range(0, len(tables), 5)]
results = {}

for chunk in chunks:
    sub_selects = " UNION ALL ".join([f"SELECT '{t}' as tbl, count(*) as cnt FROM {t}" for t in chunk])
    cmd = f'npx wrangler d1 execute zayron-x-db --remote --json --command "{sub_selects};"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    try:
        data = json.loads(res.stdout)
        for row in data[0]['results']:
            results[row['tbl']] = row['cnt']
    except Exception as e:
        print(f"Error parsing chunk {chunk}: {e}\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")

print("=== D1 TABLE ROW COUNTS ===")
for t in tables:
    print(f"{t}: {results.get(t, 'N/A')}")
