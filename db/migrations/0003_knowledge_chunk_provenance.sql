ALTER TABLE knowledge_chunks ADD COLUMN source_id TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN version TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN chapter TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN subsection TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN content_hash TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN processing_version TEXT;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_id);
