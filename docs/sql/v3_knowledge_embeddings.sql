-- ============================================================================
-- ZAYRON-X — Knowledge Embeddings & Full-Text Search Storage Schema
-- ============================================================================

BEGIN;

-- 1. Enable pgvector extension (standard in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the knowledge_embeddings table
CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(384), -- Supports all-MiniLM-L6-v2 embeddings (384 dimensions)
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create full-text search GIN index for zero-cost keyword retrieval
CREATE INDEX IF NOT EXISTS knowledge_embeddings_content_fts_idx 
ON public.knowledge_embeddings USING gin (to_tsvector('english', content));

-- 4. Create database RPC for similarity search matching (optional fallback)
CREATE OR REPLACE FUNCTION public.match_knowledge (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_embeddings.id,
    knowledge_embeddings.content,
    knowledge_embeddings.metadata,
    1 - (knowledge_embeddings.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings
  WHERE 1 - (knowledge_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Grant select/insert permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_embeddings TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_knowledge TO anon, authenticated, service_role;

COMMIT;
