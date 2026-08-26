import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

payload = {
    'report': {
        'assessment': {
            'headline': 'CRITICAL: APT29 Weaponizing CVE-2026-1453 with Cobalt Strike',
            'executive_summary': 'Adversary observed deploying unauthenticated remote code execution exploit against edge VPN gateways with Cobalt Strike beaconing on C2 194.26.29.112.',
            'threat_level': 'CRITICAL',
            'confidence_state': 'CONFIRMED',
            'confidence_score': 0.99
        },
        'vulnerabilities': [{'cveId': 'CVE-2026-1453'}],
        'actors': [{'name': 'APT29'}],
        'malware': [{'name': 'Cobalt Strike'}],
        'iocs': [{'type': 'ipv4', 'value': '194.26.29.112'}],
        'defensive_implications': [{'recommendation': 'Apply vendor patch immediately and block IP 194.26.29.112 on perimeter firewalls.'}]
    }
}

req = urllib.request.Request(
    'https://zayron-x-api.aabusabih.workers.dev/api/v1/social/derivatives',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronSocialTest/2.5'}
)

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print("=" * 64)
    print("  DETERMINISTIC MULTI-PLATFORM SOCIAL DERIVATIVES")
    print("  (Cost: ZERO Extra LLM Calls)")
    print("=" * 64)
    derivatives = res.get('derivatives', {})
    for platform in ['telegram', 'twitter', 'linkedIn', 'facebook', 'threads', 'instagram']:
        print(f"\n[{platform.upper()} DERIVATIVE]:")
        print(derivatives.get(platform))
        print("-" * 40)
