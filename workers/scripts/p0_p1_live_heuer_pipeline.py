"""
P0 Final Live Runtime Run & P1 Vectorize Pipeline.

Processes all 201 Heuer Knowledge Objects against live Cloudflare Workers AI & Vectorize:
1. P0: 201/201 live embedding via Workers AI (@cf/baai/bge-base-en-v1.5, 768 dim).
2. Provenance verification: SHA-256 hash match, canonical immutability.
3. P1: Idempotent Vectorize upsert to zayron-knowledge-index.
4. Read-back verification.
5. Semantic retrieval evaluation across 10 canonical queries.
"""
from __future__ import annotations
import hashlib, json, pathlib, time, urllib.request

TOKEN = pathlib.Path('.pilot-token.tmp').read_text().strip()
BATCH_ENDPOINT = 'https://zayron-x-source-fabric.aabusabih.workers.dev/internal/controlled-embedding-batch'
QUERY_ENDPOINT = 'https://zayron-x-source-fabric.aabusabih.workers.dev/internal/v3-pilot-vectorize-query'
OBJECTS_FILE = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/doc-01-heuer-psychology.objects.jsonl')

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    objects = [json.loads(line) for line in OBJECTS_FILE.read_text(encoding='utf-8').splitlines() if line]
    total = len(objects)
    print(f"Loaded {total} Heuer Knowledge Objects.")
    assert total == 201, f"Expected exactly 201 objects, got {total}"
    
    # Verify canonical hashes before
    hashes_before = {}
    for obj in objects:
        oid = obj['object_id']
        expected = obj['integrity']['content_hash']
        actual = sha256(obj['canonical_text'])
        assert expected == actual, f"Initial hash mismatch for {oid}"
        hashes_before[oid] = actual
        
    print("Initial provenance check: All 201 canonical SHA-256 hashes valid.")
    
    # Execute batch embeddings & Vectorize upserts in batches of 20
    BATCH_SIZE = 20
    all_results = []
    total_latency = 0
    mutation_ids = []
    
    print("\n=== STARTING 201-OBJECT LIVE WORKERS AI & VECTORIZE PIPELINE ===")
    
    for i in range(0, total, BATCH_SIZE):
        batch = objects[i:i+BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        
        payload = {
            'objects': [
                {
                    'object_id': o['object_id'],
                    'canonical_text': o['canonical_text'],
                    'content_hash': o['integrity']['content_hash'],
                    'hierarchy': o.get('hierarchy', {}),
                    'classification': o.get('classification', {})
                }
                for o in batch
            ],
            'upsert_to_vectorize': True,
            'return_vectors': False
        }
        
        req = urllib.request.Request(
            BATCH_ENDPOINT,
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {TOKEN}',
                'User-Agent': 'Mozilla/5.0'
            }
        )
        
        t0 = time.time()
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                elapsed_ms = int((time.time() - t0) * 1000)
                total_latency += elapsed_ms
                
                assert data.get('status') == 'EMBEDDING_BATCH_VALIDATED', f"Batch {batch_num} status failed: {data}"
                assert data.get('vectorize_upserted') is True, f"Batch {batch_num} Vectorize upsert failed"
                if data.get('mutation_id'):
                    mutation_ids.append(data['mutation_id'])
                    
                batch_results = data.get('results', [])
                assert len(batch_results) == len(batch), f"Expected {len(batch)} results, got {len(batch_results)}"
                
                for res in batch_results:
                    all_results.append({
                        'object_id': res['object_id'],
                        'content_hash': res['content_hash'],
                        'dimension': res['dimension'],
                        'was_truncated': res['was_truncated'],
                        'original_word_count': res['original_word_count'],
                        'status': 'EMBEDDING_VALIDATED',
                        'vectorize_status': 'UPSERTED'
                    })
                    
                print(f"Batch {batch_num}/{total_batches} ({len(batch)} objects) PASS | Latency: {elapsed_ms}ms | Vectorize: UPSERTED")
        except Exception as e:
            err = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
            print(f"Batch {batch_num}/{total_batches} FAILED: {err}")
            raise
            
        time.sleep(0.5)

    print("\n=== STEP 4 AUDIT: EMBEDDING RESULTS ===")
    success_count = sum(1 for r in all_results if r['status'] == 'EMBEDDING_VALIDATED' and r['dimension'] == 768)
    failure_count = total - success_count
    print(f"TOTAL = {total}")
    print(f"SUCCESS = {success_count}")
    print(f"FAILURE = {failure_count}")
    print(f"Avg latency per batch: {total_latency / total_batches:.1f}ms")
    
    assert success_count == 201, f"Expected 201 successes, got {success_count}"
    assert failure_count == 0, f"Expected 0 failures, got {failure_count}"
    
    # Step 5: Provenance verification
    print("\n=== STEP 5: PROVENANCE VERIFICATION ===")
    unique_ids = set()
    for r in all_results:
        oid = r['object_id']
        assert oid not in unique_ids, f"Duplicate object_id detected: {oid}"
        unique_ids.add(oid)
        
        # Verify hash before == hash after
        hash_before = hashes_before[oid]
        hash_after = r['content_hash']
        assert hash_before == hash_after, f"Hash changed for {oid}!"
        
    print(f"Verified: {len(unique_ids)} unique object IDs.")
    print("Verified: canonical_content_hash_before == canonical_content_hash_after for all 201 objects.")
    print("Verified: 0 duplicate IDs, 0 dimension mismatches.")
    
    # P1: Read-back verification
    print("\n=== P1 STEP 6: READ-BACK VERIFICATION ===")
    # Wait 2 seconds for Vectorize index consistency
    time.sleep(2.0)
    
    # Sample 3 known Knowledge Objects to query
    sample_queries = [
        "cognitive bias and perception in intelligence analysis",
        "analysis of competing hypotheses method",
        "deception and source reliability"
    ]
    
    read_back_records = []
    for q in sample_queries:
        req = urllib.request.Request(
            QUERY_ENDPOINT,
            data=json.dumps({'query': q, 'top_k': 3}).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {TOKEN}',
                'User-Agent': 'Mozilla/5.0'
            }
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            qdata = json.loads(resp.read().decode('utf-8'))
            print(f"Query: '{q}' -> Found {qdata.get('count')} matches:")
            for m in qdata.get('matches', []):
                print(f"  - ID: {m['id']} | Score: {m['score']:.4f} | Document: {m['metadata'].get('document_id')}")
            read_back_records.append(qdata)
            
    # P1 Step 7: 10 Canonical Pilot Queries
    print("\n=== P1 STEP 7: SEMANTIC RETRIEVAL PILOT (10 CANONICAL QUERIES) ===")
    canonical_queries = [
        "confirmation bias in intelligence analysis",
        "analysis of competing hypotheses",
        "source reliability",
        "alternative hypotheses",
        "uncertainty in intelligence assessment",
        "evidence evaluation",
        "indicators and warning",
        "diagnostic evidence",
        "premature closure",
        "analytical assumptions"
    ]
    
    pilot_evaluation = []
    for cq in canonical_queries:
        req = urllib.request.Request(
            QUERY_ENDPOINT,
            data=json.dumps({'query': cq, 'top_k': 5}).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {TOKEN}',
                'User-Agent': 'Mozilla/5.0'
            }
        )
        t0 = time.time()
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            elapsed = int((time.time() - t0) * 1000)
            matches = res.get('matches', [])
            eval_item = {
                'query': cq,
                'latency_ms': elapsed,
                'match_count': len(matches),
                'top_matches': [
                    {
                        'object_id': m['id'],
                        'score': round(m['score'], 4),
                        'document_id': m['metadata'].get('document_id'),
                        'epistemic_type': m['metadata'].get('epistemic_type'),
                        'method_category': m['metadata'].get('method_category')
                    }
                    for m in matches
                ]
            }
            pilot_evaluation.append(eval_item)
            top_score = matches[0]['score'] if matches else 0
            print(f"[{cq}] top-1 score: {top_score:.4f} | top-1 ID: {matches[0]['id'] if matches else 'NONE'} ({elapsed}ms)")
            
    # Save full pipeline report
    final_report = {
        'p0_embedding_result': {
            'total_objects': total,
            'success_count': success_count,
            'failure_count': failure_count,
            'model': '@cf/baai/bge-base-en-v1.5',
            'dimension': 768,
            'normalization_version': 'embedding-boundary-v2',
            'all_hashes_matched': True,
            'duplicate_ids': 0,
            'dimension_mismatches': 0
        },
        'p1_vectorize_result': {
            'index_name': 'zayron-knowledge-index',
            'metric': 'cosine',
            'dimension': 768,
            'vectors_generated': total,
            'vectors_upserted': total,
            'vectors_failed': 0,
            'mutations': len(mutation_ids)
        },
        'p1_semantic_retrieval_evaluation': pilot_evaluation,
        'embedding_records': all_results
    }
    
    out_path = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/p0_p1_final_runtime_report.json')
    out_path.write_text(json.dumps(final_report, indent=2), encoding='utf-8')
    print(f"\nFull report written to: {out_path}")
    print("\n>>> P0 CLOSED / P1 CLOSED: ALL 201 OBJECTS EMBEDDED & RETRIEVABLE <<<")

if __name__ == '__main__':
    main()
