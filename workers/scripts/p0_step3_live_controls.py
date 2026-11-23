"""
P0 Step 3 — Live Runtime Control Matrix against Cloudflare Workers AI.

Matrix:
- Control A: Known short text (16 words)
- Control B: Previously failing Heuer KO (348 words)
- Control C: Near-limit Heuer KO (~340 words)
- Control D: Longest Heuer KO (489 words)
"""
from __future__ import annotations
import json, pathlib, time, urllib.request

TOKEN = pathlib.Path('.pilot-token.tmp').read_text().strip()
ENDPOINT = 'https://zayron-x-source-fabric.aabusabih.workers.dev/internal/controlled-embedding-test'
OBJECTS_FILE = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/doc-01-heuer-psychology.objects.jsonl')

def main():
    objects = [json.loads(line) for line in OBJECTS_FILE.read_text(encoding='utf-8').splitlines() if line]
    
    # Identify objects for Control A, B, C, D
    sorted_by_wc = sorted(objects, key=lambda o: len(o['canonical_text'].split()))
    
    # Control A: Shortest (< 50 words)
    ctrl_a = sorted_by_wc[0]
    
    # Control C: Near limit (~340 words)
    ctrl_c = [o for o in sorted_by_wc if 335 <= len(o['canonical_text'].split()) <= 342][0]
    
    # Control B: Previously failing (> 347 words, e.g. 348 words)
    ctrl_b = [o for o in sorted_by_wc if len(o['canonical_text'].split()) == 348][0]
    
    # Control D: Longest (489 words)
    ctrl_d = sorted_by_wc[-1]
    
    controls = [
        ('Control A (Short)', ctrl_a),
        ('Control B (Previously failing)', ctrl_b),
        ('Control C (Near-limit)', ctrl_c),
        ('Control D (Longest)', ctrl_d),
    ]
    
    results = []
    print("=== P0 STEP 3: LIVE RUNTIME CONTROL MATRIX ===")
    print(f"Endpoint: {ENDPOINT}\n")
    
    for label, obj in controls:
        orig_wc = len(obj['canonical_text'].split())
        payload = {
            'object_id': obj['object_id'],
            'canonical_text': obj['canonical_text'],
            'content_hash': obj['integrity']['content_hash'],
        }
        
        req = urllib.request.Request(
            f"{ENDPOINT}?return_vector=true",
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {TOKEN}',
                'User-Agent': 'Mozilla/5.0'
            }
        )
        
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                elapsed_ms = int((time.time() - t0) * 1000)
                
                vector = data.get('vector')
                dim = len(vector) if isinstance(vector, list) else data.get('dimension')
                
                rec = {
                    'label': label,
                    'object_id': obj['object_id'],
                    'original_word_count': orig_wc,
                    'embedding_word_count': data.get('embedding_word_count'),
                    'was_truncated': data.get('was_truncated'),
                    'canonical_content_hash': obj['integrity']['content_hash'],
                    'embedding_model': data.get('model'),
                    'embedding_normalization_version': data.get('embedding_version'),
                    'vector_dimension': dim,
                    'status': data.get('status'),
                    'success': data.get('status') == 'EMBEDDING_VALIDATED' and dim == 768,
                    'latency_ms': data.get('latency_ms', elapsed_ms),
                    'exact_provider_error': None,
                }
        except Exception as e:
            elapsed_ms = int((time.time() - t0) * 1000)
            err_body = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            rec = {
                'label': label,
                'object_id': obj['object_id'],
                'original_word_count': orig_wc,
                'embedding_word_count': None,
                'was_truncated': None,
                'canonical_content_hash': obj['integrity']['content_hash'],
                'embedding_model': '@cf/baai/bge-base-en-v1.5',
                'embedding_normalization_version': None,
                'vector_dimension': None,
                'status': 'FAILED',
                'success': False,
                'latency_ms': elapsed_ms,
                'exact_provider_error': err_body,
            }
            
        results.append(rec)
        print(f"[{'PASS' if rec['success'] else 'FAIL'}] {label}:")
        print(f"  object_id:           {rec['object_id']}")
        print(f"  original_word_count: {rec['original_word_count']}")
        print(f"  embedding_word_count:{rec['embedding_word_count']}")
        print(f"  was_truncated:       {rec['was_truncated']}")
        print(f"  content_hash:        {rec['canonical_content_hash']}")
        print(f"  embedding_model:     {rec['embedding_model']}")
        print(f"  vector_dimension:    {rec['vector_dimension']}")
        print(f"  version:             {rec['embedding_normalization_version']}")
        print(f"  latency_ms:          {rec['latency_ms']}")
        print(f"  error:               {rec['exact_provider_error']}\n")
        time.sleep(0.5)
        
    out_file = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/p0_step3_live_controls.json')
    out_file.write_text(json.dumps(results, indent=2), encoding='utf-8')
    print(f"Results saved to: {out_file}")
    
    all_passed = all(r['success'] for r in results)
    if all_passed:
        print("\n>>> ALL 4 CONTROLS PASSED LIVE WORKERS AI RUNTIME <<<")
    else:
        print("\n>>> ONE OR MORE CONTROLS FAILED <<<")

if __name__ == '__main__':
    main()
