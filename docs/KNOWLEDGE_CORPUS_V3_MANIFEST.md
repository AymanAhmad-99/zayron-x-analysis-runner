# Knowledge Corpus v3 — Structural Ingestion Pilot

This manifest is local-only. It is independent of the frozen
`.zayron/knowledge/physical-15/derived/physical-15-chunks.ndjson` corpus.

| document_id | source hash | parser | objects | constraints | vectors | FTS | status |
|---|---|---|---:|---:|---:|---:|---|
| doc-01-heuer-psychology | `bc703f2140e39e14e277c1277a84055a2529161f90db6633136f5457b6c60849` | structural-parser-v1 | 201 | 73 | 0 | 0 | LOCAL_PARSED_VECTORIZE_PENDING_FTS_PENDING |

## Pilot gate

```text
PILOT_DOCUMENT: PASS (source exists, readable, non-zero, hash verified)
STRUCTURE_PARSE: PASS (201 addressable nodes emitted)
SEMANTIC_SEGMENTATION: PASS (paragraph/heading boundaries; no legacy chunks read)
KNOWLEDGE_OBJECTS: PASS (201 deterministic objects, 0 duplicate IDs)
CITATION: PASS (201/201 textual provenance checks)
CONSTRAINTS: PASS (73 source-derived candidate constraints)
VECTORIZE: NOT_RUN
FTS: NOT_RUN
RETRIEVAL: LOCAL LEXICAL PILOT ONLY
OLD_VS_NEW_COMPARISON: NOT_RUN
```

The pilot stops before expansion because the required Vectorize and FTS stages
were not executed. No production index or R2 object was changed.

## Continuation audit

```text
min_words: 16
max_words: 483
mean_words: 343.43283582089555
median_words: 374
p25_words: 318
p75_words: 404
heading_only_objects: 0
tiny_objects: 1
semantic_units: 201
structural_nodes: 201
one_to_one_node_object_ratio: 1.0
retrieval_queries: 10
top_k_per_query: 5
citation_pass_rate: 1.0 (textual provenance only)
legacy_chunks_queried: false
```

The local lexical pilot returned bounded results for all ten queries except
`premature closure`, which returned one result. This is not a semantic accuracy
claim; human relevance review remains required. Embedding generation could not
be run without the approved Cloudflare embedding execution path, so Vectorize,
FTS5, hybrid retrieval, and reranking remain unproven.
