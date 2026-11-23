-- Z.X.INTELLIGENCE Canonical Intelligence Pipeline Migration
-- Migration: 0010_canonical_intelligence.sql

-- 1. Canonical Intelligence Reports Table (Schema Version 1.0.0)
CREATE TABLE IF NOT EXISTS `intelligence_reports` (
	`intelligence_id` text PRIMARY KEY NOT NULL,
	`schema_version` text DEFAULT '1.0.0' NOT NULL,
	`source_id` text NOT NULL,
	`telegram_source_id` text,
	`source_handle` text,
	`source_title` text NOT NULL,
	`source_category` text,
	`source_language` text DEFAULT 'en',
	`source_region` text DEFAULT 'GLOBAL',
	`message_id` text NOT NULL,
	`message_timestamp` text NOT NULL,
	`ingested_at` text NOT NULL,
	`processed_at` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`body` text NOT NULL,
	`intelligence_type` text NOT NULL,
	`categories_json` text NOT NULL,
	`subcategories_json` text,
	`severity` text NOT NULL,
	`priority` text NOT NULL,
	`confidence_score` real NOT NULL,
	`confidence_rating` text NOT NULL,
	`confidence_vector_json` text NOT NULL,
	`entities_json` text NOT NULL,
	`indicators_json` text,
	`evidence_json` text NOT NULL,
	`citations_json` text,
	`source_references_json` text NOT NULL,
	`ai_analysis_json` text,
	`ai_model` text,
	`ai_model_version` text,
	`ai_prompt_version` text,
	`deduplication_key` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text DEFAULT 'INGESTED' NOT NULL,
	`publication_status` text DEFAULT 'PUBLISHED' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_intel_reports_dedup` ON `intelligence_reports` (`deduplication_key`);
CREATE INDEX IF NOT EXISTS `idx_intel_reports_content_hash` ON `intelligence_reports` (`content_hash`);
CREATE INDEX IF NOT EXISTS `idx_intel_reports_publication` ON `intelligence_reports` (`publication_status`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_intel_reports_severity` ON `intelligence_reports` (`severity`);
CREATE INDEX IF NOT EXISTS `idx_intel_reports_source` ON `intelligence_reports` (`source_id`);

-- 2. Granular Evidence Table (Claim -> Quoted Excerpt -> Telegram Source)
CREATE TABLE IF NOT EXISTS `intelligence_evidence` (
	`evidence_id` text PRIMARY KEY NOT NULL,
	`intelligence_id` text NOT NULL,
	`claim` text NOT NULL,
	`evidence_type` text NOT NULL,
	`source_message_id` text NOT NULL,
	`source_id` text NOT NULL,
	`quoted_excerpt` text NOT NULL,
	`source_timestamp` text NOT NULL,
	`source_url` text,
	`confidence` real NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`intelligence_id`) REFERENCES `intelligence_reports`(`intelligence_id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `idx_intel_evidence_report` ON `intelligence_evidence` (`intelligence_id`);
CREATE INDEX IF NOT EXISTS `idx_intel_evidence_source` ON `intelligence_evidence` (`source_id`);

-- 3. Pipeline Message Processing & Observability Ledger
CREATE TABLE IF NOT EXISTS `message_processing` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`message_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`signal_grade` text,
	`is_spam` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer,
	`error_message` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_msg_proc_source_msg` ON `message_processing` (`source_id`, `message_id`);
CREATE INDEX IF NOT EXISTS `idx_msg_proc_stage_status` ON `message_processing` (`stage`, `status`);
