-- ZAYRON-X Dynamic Telegram Source Registry and Report Revisions Migration
-- Migration: 0009_dynamic_source_registry.sql

-- 1. Ensure report_revisions table exists
CREATE TABLE IF NOT EXISTS `report_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`event_id` text NOT NULL,
	`version` integer NOT NULL,
	`previous_confidence` real,
	`new_confidence` real NOT NULL,
	`evidence_added_count` integer DEFAULT 1 NOT NULL,
	`reason` text NOT NULL,
	`content_snapshot` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX IF NOT EXISTS `idx_revisions_article_id` ON `report_revisions` (`article_id`);
CREATE INDEX IF NOT EXISTS `idx_revisions_event_id` ON `report_revisions` (`event_id`);

-- 2. Indices for dynamic sources registry
CREATE INDEX IF NOT EXISTS `idx_sources_status` ON `sources` (`status`);
CREATE INDEX IF NOT EXISTS `idx_sources_type` ON `sources` (`source_type`);
