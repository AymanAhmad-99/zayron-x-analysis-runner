"""
P0 Step 1 — Identify a deterministic failing Heuer KO.

We do NOT know which objects fail. We use a heuristic first:
examine ALL objects, compute their exact serialized payload size,
and identify the ones where position 311 would fall inside
the text content. Then report their metadata without modifying anything.
"""
from __future__ import annotations
import json, pathlib, sys

OBJECTS_PATH = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/doc-01-heuer-psychology.objects.jsonl')

# The Workers AI embedding binding sends roughly:
#   {"text":["<embedding_text>"]}
# The prefix before the text content is: {"text":["  (10 bytes)
# The suffix after is:                   "]}            (3 bytes)
# Each internal char in the text may be escaped.
# We reconstruct the exact serialized payload here.

PREFIX = b'{"text":["'
SUFFIX = b'"]}'

def compute_payload(text: str) -> bytes:
    """Reconstruct the exact JSON payload as JSON.dumps would produce it."""
    payload = json.dumps({"text": [text]}, ensure_ascii=False)
    return payload.encode('utf-8')

def analyze_object(obj: dict) -> dict:
    canonical = obj.get('canonical_text', '')
    # Simulate normalizeForEmbedding (same logic as unicode.ts)
    embedding_text = normalize_for_embedding(canonical)
    
    payload_bytes = compute_payload(embedding_text)
    canonical_bytes = canonical.encode('utf-8')
    embedding_bytes = embedding_text.encode('utf-8')
    
    # Check JSON validity
    try:
        json.loads(payload_bytes.decode('utf-8'))
        json_valid = True
    except json.JSONDecodeError as e:
        json_valid = False
    
    # What is at byte 311 of the payload?
    byte_311 = None
    context_around_311 = None
    if len(payload_bytes) > 311:
        byte_311 = payload_bytes[311]
        lo = max(0, 305)
        hi = min(len(payload_bytes), 320)
        context_around_311 = repr(payload_bytes[lo:hi])
    
    return {
        'object_id': obj['object_id'],
        'document_id': obj['document_id'],
        'content_hash': obj['integrity']['content_hash'],
        'canonical_len_chars': len(canonical),
        'canonical_len_utf8_bytes': len(canonical_bytes),
        'embedding_len_chars': len(embedding_text),
        'embedding_len_utf8_bytes': len(embedding_bytes),
        'payload_utf8_bytes': len(payload_bytes),
        'json_valid_locally': json_valid,
        'byte_311': byte_311,
        'context_around_311': context_around_311,
    }

def normalize_for_embedding(canonical_text: str) -> str:
    """Mirror of packages/intelligence/src/knowledge/v3/unicode.ts normalizeForEmbedding"""
    import unicodedata
    out = []
    i = 0
    s = canonical_text
    while i < len(s):
        u = ord(s[i])
        if 0xD800 <= u <= 0xDBFF:
            # High surrogate
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
    # NFKC normalize
    result = unicodedata.normalize('NFKC', result)
    # Normalize line endings
    result = result.replace('\r\n', '\n').replace('\r', '\n')
    # Strip control chars (same regex as unicode.ts)
    import re
    result = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFEFF\u200B\u200C\u200D\u202A-\u202E]', '', result)
    return result

def main():
    lines = OBJECTS_PATH.read_text(encoding='utf-8').strip().splitlines()
    print(f"Total objects in pilot: {len(lines)}")
    
    results = []
    for line in lines:
        obj = json.loads(line)
        info = analyze_object(obj)
        results.append(info)
    
    # Categorize by payload size relative to position 311
    # Objects where payload < 311 bytes cannot trigger this error at position 311
    short = [r for r in results if r['payload_utf8_bytes'] <= 311]
    long_valid = [r for r in results if r['payload_utf8_bytes'] > 311 and r['json_valid_locally']]
    long_invalid = [r for r in results if r['payload_utf8_bytes'] > 311 and not r['json_valid_locally']]
    
    print(f"\nPayload <= 311 bytes (cannot fail at pos 311): {len(short)}")
    print(f"Payload > 311 bytes, JSON locally VALID:        {len(long_valid)}")
    print(f"Payload > 311 bytes, JSON locally INVALID:      {len(long_invalid)}")
    
    # Print size distribution
    sizes = sorted([r['payload_utf8_bytes'] for r in results])
    print(f"\nPayload size distribution:")
    print(f"  min:    {sizes[0]}")
    print(f"  max:    {sizes[-1]}")
    print(f"  median: {sizes[len(sizes)//2]}")
    
    # Print first 5 short objects (these might be the 71 that succeed)
    print(f"\nFirst 5 SHORT payloads (<= 311 bytes):")
    for r in short[:5]:
        print(f"  {r['object_id']} | payload={r['payload_utf8_bytes']} | json_valid={r['json_valid_locally']}")
    
    # Print first 5 long valid objects
    print(f"\nFirst 5 LONG VALID payloads (> 311 bytes):")
    for r in long_valid[:5]:
        print(f"  {r['object_id']} | payload={r['payload_utf8_bytes']} | byte_311={r['byte_311']} | ctx={r['context_around_311']}")
    
    # The KEY insight: if ALL local JSON is valid, then local serialization is fine.
    # The error is happening at the Workers AI provider level.
    all_locally_valid = all(r['json_valid_locally'] for r in results)
    print(f"\nAll objects produce locally valid JSON: {all_locally_valid}")
    
    # Save full results
    out_path = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/p0_step1_payload_analysis.json')
    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"\nFull analysis saved to: {out_path}")
    
    # Print details of first object for reference
    print(f"\n--- First object detail ---")
    r = results[0]
    for k, v in r.items():
        print(f"  {k}: {v}")

if __name__ == '__main__':
    main()
