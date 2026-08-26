import subprocess
import json
import statistics
import sys

sys.stdout.reconfigure(encoding='utf-8')

cmd = 'npx wrangler d1 execute zayron-x-db --remote --json --command "SELECT id, workflow, model_id, prompt_version, prompt_tokens, completion_tokens, duration_ms, confidence, status, created_at FROM ai_runs ORDER BY created_at DESC LIMIT 100;"'

print("Fetching ai_runs from D1 remote...")
res = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')

try:
    data = json.loads(res.stdout)
    rows = data[0]['results']
    print(f"Retrieved {len(rows)} recent AI runs.")

    prompt_tokens = [r['prompt_tokens'] for r in rows if r.get('prompt_tokens') is not None]
    completion_tokens = [r['completion_tokens'] for r in rows if r.get('completion_tokens') is not None]
    durations = [r['duration_ms'] for r in rows if r.get('duration_ms') is not None]
    confidences = [r['confidence'] for r in rows if r.get('confidence') is not None]
    models = set(r['model_id'] for r in rows if r.get('model_id'))
    workflows = set(r['workflow'] for r in rows if r.get('workflow'))

    print("\n=== RECENT AI RUNS METRICS ===")
    print(f"Total Runs Analyzed: {len(rows)}")
    print(f"Models Observed:     {list(models)}")
    print(f"Workflows Observed:  {list(workflows)}")

    if prompt_tokens:
        print(f"\n--- PROMPT (INPUT) TOKENS ---")
        print(f"Mean:   {statistics.mean(prompt_tokens):.1f}")
        print(f"Median (p50): {statistics.median(prompt_tokens):.1f}")
        print(f"p95:    {sorted(prompt_tokens)[int(len(prompt_tokens)*0.95)]:.1f}")
        print(f"Min:    {min(prompt_tokens)}")
        print(f"Max:    {max(prompt_tokens)}")

    if completion_tokens:
        print(f"\n--- COMPLETION (OUTPUT) TOKENS ---")
        print(f"Mean:   {statistics.mean(completion_tokens):.1f}")
        print(f"Median (p50): {statistics.median(completion_tokens):.1f}")
        print(f"p95:    {sorted(completion_tokens)[int(len(completion_tokens)*0.95)]:.1f}")
        print(f"Min:    {min(completion_tokens)}")
        print(f"Max:    {max(completion_tokens)}")

    if durations:
        print(f"\n--- LATENCY (DURATION MS) ---")
        print(f"Mean:   {statistics.mean(durations):.1f} ms")
        print(f"Median (p50): {statistics.median(durations):.1f} ms")
        print(f"p95:    {sorted(durations)[int(len(durations)*0.95)]:.1f} ms")
        print(f"Min:    {min(durations)} ms")
        print(f"Max:    {max(durations)} ms")

except Exception as e:
    print(f"Error: {e}\nSTDOUT: {res.stdout}\nSTDERR: {res.stderr}")
