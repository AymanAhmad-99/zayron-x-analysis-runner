import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

endpoints = [
    ("List Frameworks", "https://zayron-x-api.aabusabih.workers.dev/api/v1/knowledge?type=framework"),
    ("List Regulations", "https://zayron-x-api.aabusabih.workers.dev/api/v1/regulations"),
    ("Source Directory", "https://zayron-x-api.aabusabih.workers.dev/api/v1/sources/directory"),
    ("Get MITRE ATT&CK", "https://zayron-x-api.aabusabih.workers.dev/api/v1/knowledge/kb_mitre_attack"),
    ("Get EU NIS2", "https://zayron-x-api.aabusabih.workers.dev/api/v1/knowledge/kb_reg_eu_nis2"),
    ("Get EU DORA", "https://zayron-x-api.aabusabih.workers.dev/api/v1/knowledge/kb_reg_eu_dora")
]

print("=" * 80)
print("  ZAYRON-X PHASE 4: KNOWLEDGE CENTER ENDPOINTS VERIFICATION")
print("=" * 80)

for label, url in endpoints:
    req = urllib.request.Request(url, headers={'User-Agent': 'ZayronKnowledgeTest/4.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"\n=== {label} [{resp.status}] ===")
            if 'total' in data:
                print(f"Total Count: {data['total']}")
            if 'data' in data and isinstance(data['data'], list):
                for item in data['data'][:4]:
                    print(f"  • [{item['id']}] {item['title']} (Tier: {item['authority_tier']}, Type: {item['document_type']})")
            elif 'data' in data and isinstance(data['data'], dict):
                item = data['data']
                print(f"  • Title:     {item['title']}")
                print(f"  • Authority: Tier {item['authority_tier']} ({item['publisher']})")
                print(f"  • Official:  {item['source_url']}")
                print(f"  • Summary:   {item['summary'][:120]}...")
                print(f"  • CISO Context: {item.get('why_it_matters', {}).get('ciso', 'N/A')}")
            elif 'sources' in data:
                for s in data['sources'][:4]:
                    print(f"  • [{s['id']}] {s['title']} ({s['topic']})")
            elif 'regulations' in data:
                for r in data['regulations'][:4]:
                    print(f"  • [{r['id']}] {r['title']} ({r['jurisdiction']})")
    except Exception as e:
        print(f"Error on {label}: {e}")

print("=" * 80)
