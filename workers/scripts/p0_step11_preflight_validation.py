"""
P0 Step 11 — Pre-flight validation of the fix against all 201 Heuer KOs.

This script:
1. Applies the EXACT same pipeline as the fixed generateEmbedding() would use
2. Verifies all 201 objects produce a payload that fits within BGE_SAFE_WORD_LIMIT
3. Verifies canonical_text and content_hash are unchanged
4. Does NOT call the Workers AI API (that requires production credentials)
5. Reports the exact distribution that will be sent to the API

After this passes, the actual 201/201 production run must be done via the
deployed Workers API endpoint, not locally.
"""
from __future__ import annotations
import hashlib, json, pathlib, re, unicodedata

OBJECTS_PATH = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/doc-01-heuer-psychology.objects.jsonl')
BGE_SAFE_WORD_LIMIT = 300
EMBEDDING_NORMALIZATION_VERSION = 'embedding-boundary-v2'
HEUER_EMBEDDING_VERSION = 'knowledge-v3-embedding-v1'

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def normalize_for_embedding(canonical_text: str) -> str:
    """Mirror of packages/intelligence/src/knowledge/v3/unicode.ts normalizeForEmbedding"""
    out = []
    i = 0
    s = canonical_text
    while i < len(s):
        u = ord(s[i])
        if 0xD800 <= u <= 0xDBFF:
            if i + 1 < len(s):
                lo = ord(s[i+1])
                if 0xDC00 <= lo <= 0xDFFF:
                    out.append(s[i])
                    out.append(s[i+1])
                    i += 2
                    continue
            out.append('\uFFFD')
            i += 1
            continue
        elif 0xDC00 <= u <= 0xDFFF:
            out.append('\uFFFD')
            i += 1
            continue
        else:
            out.append(s[i])
            i += 1
    result = ''.join(out)
    result = unicodedata.normalize('NFKC', result)
    result = result.replace('\r\n', '\n').replace('\r', '\n')
    result = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFEFF\u200B\u200C\u200D\u202A-\u202E]', '', result)
    return result

def truncate_for_embedding(normalized_text: str, word_limit: int = BGE_SAFE_WORD_LIMIT) -> dict:
    """Mirror of packages/intelligence/src/knowledge/v3/unicode.ts truncateForEmbedding"""
    words = normalized_text.split()  # split() handles all whitespace
    words = [w for w in words if w]  # filter empty
    original_word_count = len(words)
    if original_word_count <= word_limit:
        return {'truncated': normalized_text, 'was_truncated': False, 'original_word_count': original_word_count}
    clipped = ' '.join(words[:word_limit])
    return {'truncated': clipped, 'was_truncated': True, 'original_word_count': original_word_count}

def process_object(obj: dict) -> dict:
    canonical = obj['canonical_text']
    original_hash = obj['integrity']['content_hash']
    
    # Step 1: hash canonical (before any transformation)
    computed_hash = sha256(canonical)
    hash_matches = computed_hash == original_hash
    
    # Step 2: normalize
    normalized = normalize_for_embedding(canonical)
    
    # Step 3: truncate
    trunc = truncate_for_embedding(normalized)
    embedding_text = trunc['truncated']
    was_truncated = trunc['was_truncated']
    original_word_count = trunc['original_word_count']
    
    # Step 4: verify payload is JSON-valid
    payload = json.dumps({'text': [embedding_text]}, ensure_ascii=False)
    try:
        json.loads(payload)
        json_valid = True
    except json.JSONDecodeError as e:
        json_valid = False
    
    # Step 5: verify word count is within limit
    word_count_after_trunc = len(embedding_text.split())
    within_limit = word_count_after_trunc <= BGE_SAFE_WORD_LIMIT
    
    # Step 6: verify canonical was not mutated (it's Python, so it can't be; but check
    # that the canonical we read equals the canonical we hashed)
    canonical_intact = obj['canonical_text'] == canonical
    
    # This object would succeed in production if:
    would_succeed = (
        json_valid and
        within_limit and
        hash_matches and
        canonical_intact and
        len(embedding_text.strip()) > 0
    )
    
    return {
        'object_id': obj['object_id'],
        'hash_matches': hash_matches,
        'json_valid': json_valid,
        'within_limit': within_limit,
        'canonical_intact': canonical_intact,
        'would_succeed': would_succeed,
        'was_truncated': was_truncated,
        'original_word_count': original_word_count,
        'word_count_after_trunc': word_count_after_trunc,
        'payload_bytes': len(payload.encode('utf-8')),
    }

def main():
    lines = OBJECTS_PATH.read_text(encoding='utf-8').strip().splitlines()
    objects = [json.loads(l) for l in lines]
    print(f"=== P0 STEP 11: PRE-FLIGHT PRODUCTION VALIDATION ===")
    print(f"Total objects: {len(objects)}")
    print(f"BGE_SAFE_WORD_LIMIT: {BGE_SAFE_WORD_LIMIT}")
    print(f"EMBEDDING_NORMALIZATION_VERSION: {EMBEDDING_NORMALIZATION_VERSION}")
    print()
    
    results = []
    for obj in objects:
        results.append(process_object(obj))
    
    # Summary stats
    total = len(results)
    would_succeed = sum(1 for r in results if r['would_succeed'])
    would_fail = total - would_succeed
    truncated = sum(1 for r in results if r['was_truncated'])
    json_all_valid = all(r['json_valid'] for r in results)
    hashes_all_match = all(r['hash_matches'] for r in results)
    canonical_all_intact = all(r['canonical_intact'] for r in results)
    within_limit_all = all(r['within_limit'] for r in results)
    
    print(f"RESULTS:")
    print(f"  would_succeed:           {would_succeed}/{total}")
    print(f"  would_fail:              {would_fail}")
    print(f"  objects_truncated:       {truncated} (embedding_text clipped, canonical unchanged)")
    print(f"  json_payload_valid:      {json_all_valid}")
    print(f"  content_hash_matches:    {hashes_all_match}")
    print(f"  canonical_text_intact:   {canonical_all_intact}")
    print(f"  all_within_word_limit:   {within_limit_all}")
    print()
    
    # Distribution of word counts
    wc_orig = sorted([r['original_word_count'] for r in results])
    wc_after = sorted([r['word_count_after_trunc'] for r in results])
    print(f"Original word count distribution:")
    print(f"  min={min(wc_orig)}  max={max(wc_orig)}  mean={sum(wc_orig)/len(wc_orig):.1f}")
    print(f"After truncation word count distribution:")
    print(f"  min={min(wc_after)}  max={max(wc_after)}  mean={sum(wc_after)/len(wc_after):.1f}")
    
    print()
    print(f"Payload size distribution (bytes):")
    payload_sizes = sorted([r['payload_bytes'] for r in results])
    print(f"  min={payload_sizes[0]}  max={payload_sizes[-1]}  mean={sum(payload_sizes)/len(payload_sizes):.1f}")
    
    # Show any failures
    failures = [r for r in results if not r['would_succeed']]
    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for f in failures:
            print(f"  {f}")
    else:
        print(f"\nNo failures — all {total} objects would succeed in production.")
    
    # Save
    out_path = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/p0_step11_preflight_validation.json')
    out_path.write_text(json.dumps({
        'summary': {
            'total': total,
            'would_succeed': would_succeed,
            'would_fail': would_fail,
            'truncated': truncated,
            'json_all_valid': json_all_valid,
            'hashes_all_match': hashes_all_match,
            'canonical_all_intact': canonical_all_intact,
            'within_limit_all': within_limit_all,
            'normalization_version': EMBEDDING_NORMALIZATION_VERSION,
        },
        'results': results,
    }, indent=2), encoding='utf-8')
    print(f"\nFull preflight report saved to: {out_path}")
    
    # Final verdict
    if would_succeed == total:
        print(f"\n[PASS] PRE-FLIGHT PASS: {total}/{total} objects would produce valid embedding requests.")
        print(f"  Ready for production 201/201 embedding run via Workers API.")
    else:
        print(f"\n[FAIL] PRE-FLIGHT FAIL: {would_fail} objects would still fail. STOP — do not proceed.")

if __name__ == '__main__':
    main()
