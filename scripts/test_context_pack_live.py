import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request(
    'https://zayron-x-api.aabusabih.workers.dev/api/v1/rag/context-pack',
    data=json.dumps({
        'signalId': 'sig_prod_cross_domain_test',
        'channel': '@vxunderground',
        'query': 'Assess CVE-2024-3400 unauthenticated RCE affecting major financial banking core in the European Union.',
        'cves': ['CVE-2024-3400'],
        'actors': ['Volt Typhoon'],
        'malware': ['Cobalt Strike'],
        'iocs': ['194.26.29.112'],
        'jurisdiction': 'European Union',
        'sector': 'Financial Sector'
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronContextPackTest/4.5'}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    pack = res['context_pack']
    print("=" * 80)
    print("  ZAYRON-X PHASE 4.5: BOUNDED CONTEXT PACK VERIFICATION")
    print("=" * 80)
    print("Signal ID:            ", pack['observation_layer']['raw_signal_id'])
    print("Observed Telemetry:   ", pack['current_evidence'])
    print("Authoritative Chunks: ", len(pack['authoritative_knowledge']['chunks']))
    for c in pack['authoritative_knowledge']['chunks'][:3]:
        print(f"  • [{c['chunk_id']}] {c['heading']} (Tier {c['authority']}, {c['version']})")
    print("Regulatory Context:   ", pack['regulatory_context']['applicable'])
    print("Applicable Regulations:", [r['regulation_id'] for r in pack['regulatory_context']['regulations']])
    print("Legal Disclaimer:     ", pack['regulatory_context']['disclaimer'])
    print("Auditable Telemetry:  ", len(pack['auditable_telemetry']))
    if len(pack['auditable_telemetry']) > 0:
        top_tel = pack['auditable_telemetry'][0]
        print(f"Top Score Telemetry:   Chunk {top_tel['chunk_id']} -> Score: {top_tel['final_score']} ({top_tel['selection_rationale']})")
    print("=" * 80)
