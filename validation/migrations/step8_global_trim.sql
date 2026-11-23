UPDATE knowledge_chunks SET text = SUBSTR(text, 1, 3500) WHERE LENGTH(text) > 3500;
DELETE FROM knowledge_chunks WHERE document_id IN ('physical-doc-09-mitre-attack', 'physical-doc-04-nist-sp-800-86') AND LENGTH(text) > 3500;
