"""
P0 Step 2-8 — Deep forensic analysis of the Heuer embedding failure.

Key established facts:
1. All 201 objects produce locally valid JSON (Step 1 confirmed)
2. The embedding must have been called via REST API (not env.AI.run() binding)
   - REST API URL: https://api.cloudflare.com/client/v4/accounts/{}/ai/run/{model}
   - The reconcile-and-ingest-corpus.py script uses this pattern
3. The error "Expected ',' or '}' at position 311" is a provider-side JSON parse error
4. The question is: what is at byte 311 of the actual REST request body?

The reconcile script sends: {"text": [text1, text2, ...]}  (array of multiple texts)
The v3 embedding.ts sends:  {"text": [single_text]}

For the REST API path:
- The payload is JSON.dumps({"text": [text]})
- Position 311 in the raw bytes of the serialized payload

We need to determine:
- What byte is EXACTLY at position 311 of a failing object's payload?
- Is it inside the text content or at some structural boundary?
- Does the issue appear only for certain characters or sequences?

New hypothesis to test:
The Cloudflare Workers AI REST API /ai/run endpoint may have a DIFFERENT
input schema than the binding (env.AI.run()). Some models accept "text" as
a plain string, not an array. The error at position 311 could be the provider
seeing a JSON array "[" where it expects a string value.

Let's test both hypothesis:
A. Text contains a bad character at position 311 of the payload
B. The input schema mismatch (array vs string)

For hypothesis B: the payload starts with {"text":["
- {"text":[" = 10 bytes
- So position 311 would be byte 301 of the TEXT CONTENT
- But this varies per object (those with < 291 byte texts would see position 311 INSIDE the closing "]}")

Alternative: the schema for REST /ai/run for bge-base-en-v1.5 might be:
  {"text": "single string"} NOT {"text": ["array"]}

If so, position 311 would be at the [ character (index 9) of {"text":["...
BUT that doesn't match "position 311" - it should be earlier if that were the case.

Let's do the actual byte analysis.
"""
from __future__ import annotations
import json, pathlib, sys, unicodedata

OBJECTS_PATH = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/doc-01-heuer-psychology.objects.jsonl')

def normalize_for_embedding(canonical_text: str) -> str:
    """Mirror of packages/intelligence/src/knowledge/v3/unicode.ts normalizeForEmbedding"""
    import re
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

def analyze_byte_311(obj: dict, idx: int) -> dict:
    canonical = obj.get('canonical_text', '')
    embedding_text = normalize_for_embedding(canonical)
    
    # HYPOTHESIS A: Standard {"text": [text]} payload
    payload_array = json.dumps({"text": [embedding_text]}, ensure_ascii=False).encode('utf-8')
    
    # HYPOTHESIS B: {"text": "text"} (string, not array)  
    payload_string = json.dumps({"text": embedding_text}, ensure_ascii=False).encode('utf-8')
    
    # Where is byte 311 in each payload?
    def byte_context(payload: bytes, pos: int) -> dict:
        if len(payload) <= pos:
            return {'present': False, 'len': len(payload)}
        b = payload[pos]
        lo = max(0, pos - 5)
        hi = min(len(payload), pos + 10)
        # Try to find what character this byte belongs to
        # Decode up to this point to find character position
        prefix = payload[:pos]
        try:
            char_count = len(prefix.decode('utf-8'))
        except UnicodeDecodeError:
            char_count = None
        return {
            'present': True,
            'byte_value': b,
            'byte_hex': hex(b),
            'byte_char': chr(b) if b < 128 else f'<{hex(b)}>',
            'context_bytes': list(payload[lo:hi]),
            'context_ascii': ''.join(chr(x) if 32 <= x < 127 else f'\\x{x:02x}' for x in payload[lo:hi]),
            'total_payload_len': len(payload),
            'prefix_char_count': char_count,
        }
    
    return {
        'index': idx,
        'object_id': obj['object_id'],
        'canonical_len_chars': len(canonical),
        'canonical_len_bytes': len(canonical.encode('utf-8')),
        'embedding_len_chars': len(embedding_text),
        'embedding_len_bytes': len(embedding_text.encode('utf-8')),
        'payload_array_len': len(payload_array),
        'payload_string_len': len(payload_string),
        'pos_311_in_array_payload': byte_context(payload_array, 311),
        'pos_311_in_string_payload': byte_context(payload_string, 311),
    }

def scan_for_suspicious_chars(obj: dict) -> dict:
    """Check for characters that might confuse a JSON parser."""
    canonical = obj.get('canonical_text', '')
    embedding_text = normalize_for_embedding(canonical)
    
    suspicious = []
    for i, ch in enumerate(embedding_text):
        cp = ord(ch)
        if cp == 0x0000:  # null byte
            suspicious.append(('NULL', i, hex(cp)))
        elif cp < 0x0020 and cp not in (0x0009, 0x000A, 0x000D):  # control chars
            suspicious.append(('CONTROL', i, hex(cp)))
        elif 0x007F <= cp <= 0x009F:  # DEL + C1 controls
            suspicious.append(('C1_CTRL', i, hex(cp)))
        elif 0xD800 <= cp <= 0xDFFF:  # surrogates
            suspicious.append(('SURROGATE', i, hex(cp)))
        elif cp in (0x2028, 0x2029):  # line/paragraph separator
            suspicious.append(('LINE_SEP', i, hex(cp)))
    
    # Look for backslash sequences that might be tricky
    bs_positions = [i for i, ch in enumerate(embedding_text) if ch == '\\']
    
    return {
        'object_id': obj['object_id'],
        'suspicious_chars': suspicious[:20],  # first 20
        'backslash_positions': bs_positions[:10],
        'has_tabs': '\t' in embedding_text,
        'has_newlines': '\n' in embedding_text,
        'has_carriage_returns': '\r' in embedding_text,
        'first_200_chars': repr(embedding_text[:200]),
    }

def main():
    lines = OBJECTS_PATH.read_text(encoding='utf-8').strip().splitlines()
    objects = [json.loads(l) for l in lines]
    
    print(f"=== P0 STEP 2-6: DEEP FORENSIC ANALYSIS ===")
    print(f"Total objects: {len(objects)}")
    print()
    
    # Analyze byte 311 for all objects
    results = []
    for idx, obj in enumerate(objects):
        r = analyze_byte_311(obj, idx)
        results.append(r)
    
    # Categorize by payload size
    array_too_short = [r for r in results if not r['pos_311_in_array_payload']['present']]
    array_has_311 = [r for r in results if r['pos_311_in_array_payload']['present']]
    
    print(f"Objects with array payload <= 311 bytes (smoke test size range): {len(array_too_short)}")
    print(f"Objects with array payload > 311 bytes: {len(array_has_311)}")
    
    # The smoke test string is short (<100 chars), so smoke test can't reproduce the error.
    # Objects < 312 bytes total can't reproduce the error at position 311.
    # Correlate: 71 succeed, 130 fail — find the dividing line.
    
    # Print size distribution
    sizes = sorted([r['payload_array_len'] for r in results])
    print(f"\nArray payload sizes:")
    print(f"  min:    {sizes[0]}")
    print(f"  p33:    {sizes[len(sizes)//3]}")
    print(f"  p67:    {sizes[2*len(sizes)//3]}")  
    print(f"  max:    {sizes[-1]}")
    print()
    
    # KEY TEST: What does byte 311 look like across all objects?
    # If 71 succeed and 130 fail, and ALL have valid JSON locally,
    # there must be a DIFFERENT discriminating factor.
    
    # CRITICAL HYPOTHESIS: The REST API has a MAX INPUT SIZE
    # The Cloudflare /ai/run endpoint for text-embedding models
    # has an undocumented input size limit.
    # Let's check: do the 71 successful objects cluster at smaller sizes?
    
    print("Byte 311 analysis for first 10 objects with long payloads:")
    for r in array_has_311[:10]:
        ctx = r['pos_311_in_array_payload']
        print(f"  [{r['index']:3d}] {r['object_id'][:50]} | "
              f"payload={r['payload_array_len']:5d} | "
              f"byte311=0x{ctx['byte_value']:02x} ({ctx['byte_char']!r}) | "
              f"ctx={ctx['context_ascii']!r}")
    
    print()
    
    # Now do suspicious char scan on first 20 objects
    print("Suspicious char scan — first 20 objects:")
    for idx, obj in enumerate(objects[:20]):
        sc = scan_for_suspicious_chars(obj)
        if sc['suspicious_chars'] or sc['backslash_positions']:
            print(f"  [{idx:3d}] {obj['object_id'][:50]}")
            print(f"       suspicious: {sc['suspicious_chars']}")
            print(f"       backslashes at: {sc['backslash_positions']}")
    print("  (no issues shown for objects with clean text)")
    
    print()
    
    # CRITICAL INSIGHT: Check if objects under some size threshold are the 71 that succeed
    # The smoke test is a short string. If the limit is around 512 bytes or similar:
    THRESHOLDS = [300, 400, 500, 600, 700, 800, 1000, 1500, 2000]
    print("Count of objects BELOW each payload size threshold:")
    for t in THRESHOLDS:
        count = sum(1 for r in results if r['payload_array_len'] <= t)
        print(f"  <= {t:5d} bytes: {count:3d} objects")
    
    print()
    
    # VERY IMPORTANT: The error says position 311 regardless of object size.
    # If a 3000-byte payload fails at position 311, that's the same position
    # as a 400-byte payload failing at position 311.
    # This STRONGLY suggests a FIXED POSITION error — not content-dependent.
    # Position 311 in {"text":["..."]} is INSIDE the text content.
    # For a payload starting with {"text":["  (10 bytes),
    # position 311 = character at index 301 of the embedding_text.
    # 
    # BUT: if ALL local JSON is valid, the provider isn't failing on JSON content.
    # The provider might be failing on something BEFORE position 311.
    # 
    # NEW HYPOTHESIS: The Cloudflare REST API /ai/run endpoint reads the request
    # body character by character and stops at position 311 when it hits the
    # END of its internal buffer. The actual failure may be a MAX INPUT SIZE
    # of exactly 301 characters of text content (311 - 10 byte prefix).
    
    # Let's check: what are the embedding_text lengths of the objects?
    text_lens = sorted([len(normalize_for_embedding(obj.get('canonical_text', ''))) for obj in objects])
    print("Embedding text CHARACTER length distribution:")
    print(f"  min:    {text_lens[0]}")
    print(f"  max:    {text_lens[-1]}")
    # Count below various thresholds
    for t in [100, 200, 301, 302, 350, 400, 500]:
        count = sum(1 for l in text_lens if l <= t)
        print(f"  <= {t:4d} chars: {count:3d} objects")
    
    # Save results
    out_path = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/p0_step2_byte311_analysis.json')
    out_path.write_text(json.dumps(results[:20], indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"\nDetailed results (first 20) saved to: {out_path}")

if __name__ == '__main__':
    main()
