CREATE TABLE `actors` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`aliases` text,
	`country` text,
	`motivation` text,
	`description` text,
	`first_seen` text,
	`last_active` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actors_slug_unique` ON `actors` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_actors_slug` ON `actors` (`slug`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow` text NOT NULL,
	`model_id` text NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`cost_estimated_usd` real,
	`duration_ms` integer,
	`status` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_runs_workflow_status` ON `ai_runs` (`workflow`,`status`);--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`watchlist_id` text,
	`event_id` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`severity` text NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`watchlist_id`) REFERENCES `watchlists`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_alerts_user_read` ON `alerts` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`dek` text,
	`content` text NOT NULL,
	`excerpt` text,
	`author` text DEFAULT 'ZAYRON-X Intelligence Crew' NOT NULL,
	`category` text NOT NULL,
	`tags` text,
	`severity` text,
	`confidence` real,
	`hero_media_url` text,
	`ai_summary` text,
	`fbr_score` real,
	`read_time` integer,
	`views` integer DEFAULT 0 NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_breaking` integer DEFAULT false NOT NULL,
	`canonical_intel_event_id` text,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`canonical_intel_event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_slug_unique` ON `articles` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_articles_slug` ON `articles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_articles_category_published` ON `articles` (`category`,`is_published`);--> statement-breakpoint
CREATE INDEX `idx_articles_published_at` ON `articles` (`published_at`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`correlation_id` text,
	`details` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_events_created_at` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_events_actor` ON `audit_events` (`actor_id`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`actor_id` text,
	`target_sectors` text,
	`target_regions` text,
	`description` text,
	`start_date` text,
	`end_date` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_unique` ON `campaigns` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_campaigns_slug` ON `campaigns` (`slug`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`source_id` text,
	`source_message_id` text,
	`type` text NOT NULL,
	`url` text,
	`weight` real DEFAULT 1 NOT NULL,
	`snippet` text,
	`reviewer_state` text DEFAULT 'UNREVIEWED',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_message_id`) REFERENCES `source_messages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_evidence_event_id` ON `evidence` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_evidence_source_id` ON `evidence` (`source_id`);--> statement-breakpoint
CREATE TABLE `feature_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`feature` text NOT NULL,
	`usage_count` integer DEFAULT 1 NOT NULL,
	`period` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_feature_usage_user_feat_period` ON `feature_usage` (`user_id`,`feature`,`period`);--> statement-breakpoint
CREATE TABLE `intelligence_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`severity` text NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`status` text DEFAULT 'UNASSESSED' NOT NULL,
	`content_hash` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_updated_at` text NOT NULL,
	`entities_json` text,
	`mitre_matrix` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_intel_events_content_hash` ON `intelligence_events` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_intel_events_timeline` ON `intelligence_events` (`first_seen_at`,`last_updated_at`);--> statement-breakpoint
CREATE INDEX `idx_intel_events_severity` ON `intelligence_events` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_intel_events_status` ON `intelligence_events` (`status`);--> statement-breakpoint
CREATE TABLE `iocs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`normalized_value` text NOT NULL,
	`event_id` text,
	`malware_id` text,
	`threat_actor_id` text,
	`confidence` real DEFAULT 0.8 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`malware_id`) REFERENCES `malware`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`threat_actor_id`) REFERENCES `actors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_iocs_type_val` ON `iocs` (`type`,`normalized_value`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`company_name` text NOT NULL,
	`company_logo_url` text,
	`employment_type` text NOT NULL,
	`location_type` text NOT NULL,
	`location_city` text,
	`location_country` text,
	`min_salary` integer,
	`max_salary` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`description` text NOT NULL,
	`apply_url` text NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_verified` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'PENDING_REVIEW' NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_slug_unique` ON `jobs` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_slug` ON `jobs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_jobs_status_expires` ON `jobs` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_jobs_location` ON `jobs` (`location_type`,`location_country`);--> statement-breakpoint
CREATE TABLE `malware` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`type` text,
	`family` text,
	`description` text,
	`yara_rule` text,
	`sigma_rule` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `malware_slug_unique` ON `malware` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_malware_slug` ON `malware` (`slug`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`domain` text,
	`verified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organizations_slug` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `payment_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`idempotency_key` text NOT NULL,
	`provider` text NOT NULL,
	`provider_session_id` text,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_sessions_idempotency_key_unique` ON `payment_sessions` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payment_sessions_idempotency` ON `payment_sessions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_payment_sessions_status` ON `payment_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `relations` (
	`id` text PRIMARY KEY NOT NULL,
	`source_entity_type` text NOT NULL,
	`source_entity_id` text NOT NULL,
	`target_entity_type` text NOT NULL,
	`target_entity_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_relations_source` ON `relations` (`source_entity_type`,`source_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_relations_target` ON `relations` (`target_entity_type`,`target_entity_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`abstract` text NOT NULL,
	`pdf_r2_key` text,
	`tier_required` text DEFAULT 'pro' NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_slug_unique` ON `reports` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_slug` ON `reports` (`slug`);--> statement-breakpoint
CREATE TABLE `social_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`article_id` text,
	`platform` text NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`body` text NOT NULL,
	`media_urls` text,
	`scheduled_at` text,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_assets_idempotency_key_unique` ON `social_assets` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_social_assets_idempotency` ON `social_assets` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_social_assets_platform_status` ON `social_assets` (`platform`,`status`);--> statement-breakpoint
CREATE TABLE `social_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`platform` text NOT NULL,
	`external_post_id` text,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text,
	`error_message` text,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `social_assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_social_pub_status_next` ON `social_publications` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `source_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_message_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`raw_content` text NOT NULL,
	`normalized_content` text,
	`original_language` text,
	`parsed_entities` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_messages_source_external` ON `source_messages` (`source_id`,`external_message_id`);--> statement-breakpoint
CREATE INDEX `idx_source_messages_content_hash` ON `source_messages` (`content_hash`);--> statement-breakpoint
CREATE INDEX `idx_source_messages_status` ON `source_messages` (`status`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`url` text,
	`source_type` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`region` text,
	`trust_score` real DEFAULT 0.5 NOT NULL,
	`priority` text DEFAULT 'B' NOT NULL,
	`status` text DEFAULT 'ENABLED' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_seen_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sources_status` ON `sources` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sources_type` ON `sources` (`source_type`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_period_start` text NOT NULL,
	`current_period_end` text NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user_status` ON `subscriptions` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `ttp_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`mitre_ttp_id` text NOT NULL,
	`technique_name` text NOT NULL,
	`tactic` text NOT NULL,
	`event_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `intelligence_events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ttp_mappings_ttp` ON `ttp_mappings` (`mitre_ttp_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'free_user' NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vulnerabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`cve_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`severity` text NOT NULL,
	`cvss_score` real,
	`cvss_vector` text,
	`epss_score` real,
	`is_exploited_in_wild` integer DEFAULT false NOT NULL,
	`affected_vendor` text,
	`affected_product` text,
	`patch_url` text,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vulnerabilities_cve_id_unique` ON `vulnerabilities` (`cve_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vulnerabilities_cve_id` ON `vulnerabilities` (`cve_id`);--> statement-breakpoint
CREATE INDEX `idx_vulnerabilities_severity` ON `vulnerabilities` (`severity`);--> statement-breakpoint
CREATE INDEX `idx_vulnerabilities_wild_exploit` ON `vulnerabilities` (`is_exploited_in_wild`);--> statement-breakpoint
CREATE TABLE `watchlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`rules_json` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_watchlists_user_id` ON `watchlists` (`user_id`);