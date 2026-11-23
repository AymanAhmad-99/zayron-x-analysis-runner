"""
P0 Step 7/8 — Token count analysis and the 512-token limit hypothesis.

The Cloudflare BGE model docs state:
  Maximum Input Tokens: 512

BGE models typically tokenize with a WordPiece tokenizer.
A rough approximation: 1 word ≈ 1.3-1.5 tokens for English text.

If 71 objects SUCCEED and 130 FAIL, and the 71 that succeed might be
the shorter objects... let's check:
- Objects sorted by word count
- How many have > 341 words (approx 512 tokens at 1.5 tok/word)?
- How many have > 512 tokens?

But wait: the data showed only 4 objects with <= 400 chars, yet 71 succeed.
So it's NOT purely about token count either — the mean is 343 WORDS, not chars.

ALSO: The error is "position 311" — this is a JSON parsing error.
If the provider has an internal buffer of 512 characters for the JSON
request body, then it might fail at a DIFFERENT position for each request.

But the error always says POSITION 311, not a variable position.
This is the key: POSITION 311 IS CONSTANT.

HYPOTHESIS: The error is NOT "the text content at position 311 is bad."
The error is "the JSON request body itself is invalid JSON at position 311."
And "position 311" refers to position 311 in the ENTIRE REQUEST BODY.

But ALL 201 objects produce locally valid JSON. So it's not the JSON.

WAIT — let me reconsider completely:

What if the error is not from the JSON body AT ALL?
What if "Expected ',' or '}' after property value at position 311" is
the error from a DIFFERENT JSON parser — specifically the one parsing
the RESPONSE body that Cloudflare returns when it hits an input limit?

In other words:
1. Large input sent to Workers AI REST API
2. Cloudflare API rejects with an error response body
3. Our code tries to parse the ERROR response as JSON
4. The error response contains the message "Expected ',' or '}' at position 311"
5. We reported that as the error message

OR: even simpler — the error IS the provider's message, but it refers
to an internal buffer. Cloudflare tokenizes the input text to tokens,
and position 311 is the 311th TOKEN, not byte.

If the embedding model has a 512-token MAX, objects with >311 real tokens
might hit a parsing error in the tokenizer.

Let's check: do objects with <= ~311 word-tokens succeed?
"""
from __future__ import annotations
import json, pathlib, unicodedata, re

OBJECTS_PATH = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/doc-01-heuer-psychology.objects.jsonl')

def normalize_for_embedding(canonical_text: str) -> str:
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

def word_count(text: str) -> int:
    return len(text.split())

def approx_token_count(text: str) -> int:
    """Rough approximation: split on whitespace and punctuation boundaries."""
    # Very rough: ~1.3 tokens per word for English
    words = text.split()
    return int(len(words) * 1.3)

def main():
    lines = OBJECTS_PATH.read_text(encoding='utf-8').strip().splitlines()
    objects = [json.loads(l) for l in lines]
    
    print(f"=== P0 STEP 7/8: TOKEN LIMIT ANALYSIS ===")
    print(f"Total objects: {len(objects)}")
    print()
    
    data = []
    for idx, obj in enumerate(objects):
        canonical = obj.get('canonical_text', '')
        embed = normalize_for_embedding(canonical)
        words = word_count(embed)
        approx_tokens = approx_token_count(embed)
        embed_bytes = len(embed.encode('utf-8'))
        
        data.append({
            'index': idx,
            'object_id': obj['object_id'],
            'word_count': words,
            'approx_tokens': approx_tokens,
            'embed_char_len': len(embed),
            'embed_byte_len': embed_bytes,
        })
    
    # Sort by word count
    data_sorted = sorted(data, key=lambda x: x['word_count'])
    
    print("Word count distribution:")
    wcs = [d['word_count'] for d in data]
    print(f"  min:    {min(wcs)}")
    print(f"  max:    {max(wcs)}")
    print(f"  mean:   {sum(wcs)/len(wcs):.1f}")
    
    print()
    print("Count below various word count thresholds:")
    for t in [50, 71, 100, 150, 200, 250, 300, 350, 394, 400, 450, 512]:
        count = sum(1 for d in data if d['word_count'] <= t)
        print(f"  <= {t:4d} words:  {count:3d} objects")
    
    print()
    print("Count below approx token thresholds:")
    for t in [256, 300, 350, 400, 450, 512, 600, 700]:
        count = sum(1 for d in data if d['approx_tokens'] <= t)
        print(f"  <= {t:4d} tokens: {count:3d} objects")
    
    print()
    print("The 71 shortest objects (by word count):")
    for d in data_sorted[:75]:
        print(f"  [{d['index']:3d}] words={d['word_count']:4d}  approx_tokens={d['approx_tokens']:4d}  chars={d['embed_char_len']:5d}")
    
    print()
    print(f"\n71st object (threshold): words={data_sorted[70]['word_count']}, approx_tokens={data_sorted[70]['approx_tokens']}")
    print(f"72nd object:              words={data_sorted[71]['word_count']}, approx_tokens={data_sorted[71]['approx_tokens']}")
    
    # CRITICAL CHECK: what is the char length of the 71st smallest object?
    # If there's a sharp cutoff at ~300 chars or ~512 tokens, that explains the 71/130 split
    print()
    print("By char length distribution:")
    for t in [200, 300, 400, 500, 600, 700, 800, 900, 1000]:
        count = sum(1 for d in data if d['embed_char_len'] <= t)
        print(f"  <= {t:5d} chars: {count:3d} objects")
    
    # Save full sorted list
    out_path = pathlib.Path('.zayron/knowledge/corpus-v3/pilot/p0_step7_token_analysis.json')
    out_path.write_text(json.dumps(data_sorted, indent=2), encoding='utf-8')
    print(f"\nFull sorted list saved to: {out_path}")

if __name__ == '__main__':
    main()
