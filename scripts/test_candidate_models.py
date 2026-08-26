import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

API_URL = "https://zayron-x-api.aabusabih.workers.dev/api/v1/admin/benchmark-models"

candidate_models = [
    "@cf/meta/llama-3.1-8b-instruct-fast",
    "@cf/meta/llama-3.1-8b-instruct-awq",
    "@cf/meta/llama-3.1-8b-instruct-fp8",
    "@cf/meta/llama-3.2-1b-instruct",
    "@cf/meta/llama-3.2-3b-instruct",
    "@cf/google/gemma-2-9b-it",
    "@cf/google/gemma-2-27b-it",
    "@cf/mistral/mistral-7b-instruct-v0.2",
    "@cf/qwen/qwen2.5-7b-instruct",
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b"
]

print("=" * 80)
print("  TESTING CURRENT 2026 WORKERS AI MODEL ALTERNATIVES")
print("=" * 80)

for m in candidate_models:
    req = urllib.request.Request(
        API_URL,
        data=json.dumps({"model": m}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'ZayronBenchmark/3.0'}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            b = data.get('benchmark', [{}])[0]
            status = b.get('status')
            latency = b.get('latency_ms', 0)
            valid = b.get('json_valid', False)
            err = b.get('error', '')
            if status == 'AVAILABLE':
                print(f"✅ [AVAILABLE]   {m:<45} | Latency: {latency:>4}ms | JSON: {valid}")
            else:
                print(f"❌ [UNAVAILABLE] {m:<45} | Err: {err[:60]}")
    except Exception as e:
        print(f"❌ [FAILED]      {m:<45} | Err: {e}")
print("=" * 80)
