import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://zayron-x-api.aabusabih.workers.dev/api/v1/admin/benchmark-models"

models_to_test = [
    "@cf/meta/llama-3.1-8b-instruct",
    "@cf/meta/llama-3.2-3b-instruct",
    "@cf/meta/llama-3.2-1b-instruct",
    "@cf/meta/llama-3-8b-instruct",
    "@cf/google/gemma-7b-it",
    "@cf/mistral/mistral-7b-instruct-v0.1",
    "@cf/qwen/qwen1.5-7b-chat-awq"
]

print("=" * 72)
print("  CLOUDFLARE WORKERS AI MODEL BENCHMARK & EVALUATION")
print("=" * 72)

results = []

for m in models_to_test:
    req = urllib.request.Request(
        API_URL,
        data=json.dumps({"model": m}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronBenchmark/3.0'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            bench = data.get('benchmark', [{}])[0]
            status = bench.get('status')
            latency = bench.get('latency_ms', 0)
            valid_json = bench.get('json_valid', False)
            raw = bench.get('raw_preview', '')
            results.append({"model": m, "status": status, "latency": latency, "valid_json": valid_json, "raw": raw})
            print(f"[{status:<11}] {m:<36} | {latency:>4}ms | JSON Valid: {str(valid_json):<5} | Preview: {raw[:50]}")
    except Exception as e:
        print(f"[FAILED     ] {m:<36} | Error: {e}")
        results.append({"model": m, "status": "FAILED", "error": str(e)})

print("=" * 72)
