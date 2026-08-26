-- Migration: 0002_knowledge_base_and_rag.sql
-- Description: Adds knowledge_documents and knowledge_chunks tables, and enhances ai_runs with full observability fields.

CREATE TABLE IF NOT EXISTS `knowledge_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `author` text,
  `publisher` text,
  `publication_date` text,
  `version` text,
  `license` text,
  `source_url` text,
  `document_type` text NOT NULL,
  `topic` text,
  `authority_tier` integer NOT NULL,
  `content_hash` text NOT NULL,
  `metadata` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
  `updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_kdocs_authority` ON `knowledge_documents` (`authority_tier`);
CREATE INDEX IF NOT EXISTS `idx_kdocs_type` ON `knowledge_documents` (`document_type`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_kdocs_hash` ON `knowledge_documents` (`content_hash`);

CREATE TABLE IF NOT EXISTS `knowledge_chunks` (
  `id` text PRIMARY KEY NOT NULL,
  `document_id` text NOT NULL REFERENCES `knowledge_documents`(`id`) ON DELETE CASCADE,
  `section` text,
  `page` integer,
  `text` text NOT NULL,
  `embedding_id` text,
  `authority_tier` integer NOT NULL,
  `token_count` integer,
  `metadata` text,
  `created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_kchunks_doc_id` ON `knowledge_chunks` (`document_id`);
CREATE INDEX IF NOT EXISTS `idx_kchunks_embedding_id` ON `knowledge_chunks` (`embedding_id`);
CREATE INDEX IF NOT EXISTS `idx_kchunks_authority` ON `knowledge_chunks` (`authority_tier`);
