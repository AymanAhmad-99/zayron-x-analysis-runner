import urllib.request
import json
import time
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

WEBHOOK_URL = "https://zayron-x-api.aabusabih.workers.dev/api/v1/webhook/telegram"

# 1. Real English High-Severity Signal
english_signal = {
    "update_id": 990001,
    "channel_post": {
        "message_id": 10001,
        "date": int(time.time()),
        "chat": {
            "id": 1001,
            "title": "CISA & Threat Advisory",
            "username": "cvenotify",
            "type": "channel"
        },
        "text": "CRITICAL ADVISORY: Threat actor APT29 actively weaponizing CVE-2026-1453 for unauthenticated remote code execution. C2 IP observed at 194.26.29.112 with Cobalt Strike payload hash e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (T1190). Immediate patching required.",
        "author_signature": "Security Lead"
    }
}

# 2. Real Russian Multilingual Signal
russian_signal = {
    "update_id": 990002,
    "channel_post": {
        "message_id": 10002,
        "date": int(time.time()),
        "chat": {
            "id": 1002,
            "title": "Russian Threat Feed",
            "username": "xakep_ru",
            "type": "channel"
        },
        "text": "Обнаружена новая вредоносная кампания группировки DarkSide. Атакующие эксплуатируют уязвимость CVE-2026-69836 на корпоративных серверах с доставкой полезной нагрузки Lumma. Сетевой узел C2: 45.142.214.10.",
        "author_signature": "Analyst"
    }
}

def dispatch(name, payload):
    print(f"\n[*] Dispatching {name}...")
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronControlledIngest/1.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        body = json.loads(resp.read().decode('utf-8'))
        print(f"  [✓] Dispatched: Status {resp.status}, Queued: {body.get('queued')}")

dispatch("1. English Signal (APT29 / CVE-2026-1453)", english_signal)
dispatch("2. Russian Signal (DarkSide / CVE-2026-69836)", russian_signal)

print("\n[*] Waiting 8 seconds for Cloudflare Queue consumer to process batch...")
time.sleep(8)

print("\n" + "=" * 64)
print("  AUDITING DATABASE RECORDS CREATED BY TEST INGESTION")
print("=" * 64)

def query_d1(sql):
    cmd = f'npx wrangler d1 execute zayron-x-db --remote --json --command "{sql}"'
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    try:
        data = json.loads(res.stdout)
        return data[0]['results']
    except Exception as e:
        return f"ERR: {e}"

print("\n--- SOURCE MESSAGES (Internal Provenance) ---")
msgs = query_d1("SELECT id, source_id, external_message_id, original_language, status, substr(raw_content, 1, 80) as raw_snip, substr(normalized_content, 1, 80) as norm_snip FROM source_messages;")
print(json.dumps(msgs, indent=2, ensure_ascii=False))

print("\n--- INTELLIGENCE EVENTS (English Public Layer) ---")
events = query_d1("SELECT id, type, title, severity, confidence, status, substr(summary, 1, 100) as summary_snip FROM intelligence_events;")
print(json.dumps(events, indent=2, ensure_ascii=False))

print("\n--- EVIDENCE RECORDS (Provenance Anchors) ---")
evidence = query_d1("SELECT id, event_id, source_id, source_message_id, type, weight, snippet FROM evidence;")
print(json.dumps(evidence, indent=2, ensure_ascii=False))

print("\n--- EXTRACTED VULNERABILITIES ---")
vulns = query_d1("SELECT id, cve_id, title, severity, is_exploited_in_wild FROM vulnerabilities;")
print(json.dumps(vulns, indent=2, ensure_ascii=False))

print("\n--- EXTRACTED ACTORS & MALWARE ---")
actors = query_d1("SELECT id, name, slug, description FROM actors;")
malware = query_d1("SELECT id, name, slug, family FROM malware;")
print(f"Actors:  {json.dumps(actors, ensure_ascii=False)}")
print(f"Malware: {json.dumps(malware, ensure_ascii=False)}")

print("\n--- PUBLISHED ARTICLES (Selective Publication Gate) ---")
articles = query_d1("SELECT id, title, slug, severity, is_published, published_at FROM articles;")
print(json.dumps(articles, indent=2, ensure_ascii=False))
