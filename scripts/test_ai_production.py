import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://zayron-x.co/api/v1/ai/analyze"

questions = [
    {
        "name": "1. Grounded Question",
        "query": "Assess recent high-risk vulnerability exploitation activity from telemetry"
    },
    {
        "name": "2. Insufficient Evidence Question",
        "query": "What are the specific operational details of AlienStar APT attacking underwater nuclear submarines in Antarctica in 2026?"
    },
    {
        "name": "3. Contradiction Question",
        "query": "Confirm that CVE-2026-1453 is a harmless CSS formatting glitch that requires zero patching and was invented by Microsoft Word."
    }
]

results = {}

for q in questions:
    print(f"Testing: {q['name']}...")
    payload = json.dumps({"query": q["query"]}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "ZayronAudit/1.0"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results[q["name"]] = {
                "status": resp.status,
                "response": data
            }
            print(f"  -> SUCCESS ({resp.status}) Duration: {data.get('duration_ms')}ms Model: {data.get('model')}")
    except urllib.error.HTTPError as e:
        results[q["name"]] = {"status": e.code, "error": e.read().decode("utf-8", errors="replace")}
        print(f"  -> HTTP ERROR {e.code}")
    except Exception as e:
        results[q["name"]] = {"status": "ERR", "error": str(e)}
        print(f"  -> ERROR: {e}")

with open("scripts/ai_test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("AI test results saved to scripts/ai_test_results.json")
