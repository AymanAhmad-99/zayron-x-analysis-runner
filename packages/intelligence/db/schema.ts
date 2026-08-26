import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// ── TIMESTAMPS HELPER ─────────────────────────────────────────
const timestamps = {
  createdAt: text('created_at').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(),
  updatedAt: text('updated_at').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(),
};

// ── 1. USERS & ORGANIZATIONS ──────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  role: text('role').default('free_user').notNull(), // 'free_user', 'pro_user', 'researcher', 'admin', 'editor'
  avatarUrl: text('avatar_url'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_users_email').on(table.email),
]);

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  domain: text('domain'),
  verified: integer('verified', { mode: 'boolean' }).default(false).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_organizations_slug').on(table.slug),
]);

// ── 2. SUBSCRIPTIONS & PAYMENTS ──────────────────────────────
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull(), // 'free', 'pro', 'researcher', 'team'
  status: text('status').default('active').notNull(), // 'active', 'past_due', 'canceled', 'trialing'
  currentPeriodStart: text('current_period_start').notNull(),
  currentPeriodEnd: text('current_period_end').notNull(),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).default(false).notNull(),
  ...timestamps,
}, (table) => [
  index('idx_subscriptions_user_status').on(table.userId, table.status),
]);

export const paymentSessions = sqliteTable('payment_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  provider: text('provider').notNull(), // 'stripe', etc.
  providerSessionId: text('provider_session_id'),
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').default('USD').notNull(),
  status: text('status').default('NEW').notNull(), // 'NEW', 'CREATED', 'CHECKOUT_READY', 'PAID', 'FAILED', 'EXPIRED'
  metadata: text('metadata', { mode: 'json' }),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_payment_sessions_idempotency').on(table.idempotencyKey),
  index('idx_payment_sessions_status').on(table.status),
]);

// ── 3. SOURCES & INGESTION ────────────────────────────────────
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(), // e.g. 'tg_src_0042'
  displayName: text('display_name').notNull(),
  url: text('url'),
  type: text('source_type').notNull(), // 'telegram', 'rss', 'api', 'cert', 'vendor'
  language: text('language').default('en').notNull(),
  region: text('region'),
  trustScore: real('trust_score').default(0.5).notNull(), // 0.0 - 1.0
  priority: text('priority').default('B').notNull(), // 'A', 'B', 'C'
  status: text('status').default('ENABLED').notNull(), // 'DISCOVERED', 'REVIEWED', 'ENABLED', 'MONITORED', 'DEGRADED', 'QUARANTINED', 'DISABLED'
  enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
  lastSeenAt: text('last_seen_at'),
  ...timestamps,
}, (table) => [
  index('idx_sources_status').on(table.status),
  index('idx_sources_type').on(table.type),
]);

export const sourceMessages = sqliteTable('source_messages', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  externalMessageId: text('external_message_id').notNull(),
  contentHash: text('content_hash').notNull(),
  rawContent: text('raw_content').notNull(),
  normalizedContent: text('normalized_content'),
  originalLanguage: text('original_language'),
  parsedEntities: text('parsed_entities', { mode: 'json' }),
  status: text('status').default('PENDING').notNull(), // 'PENDING', 'PROCESSING', 'SUCCEEDED', 'DUPLICATE', 'FAILED', 'QUARANTINED'
  publishedAt: text('published_at'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_source_messages_source_external').on(table.sourceId, table.externalMessageId),
  index('idx_source_messages_content_hash').on(table.contentHash),
  index('idx_source_messages_status').on(table.status),
]);

// ── 4. INTELLIGENCE EVENTS & EVIDENCE ─────────────────────────
export const intelligenceEvents = sqliteTable('intelligence_events', {
  id: text('id').primaryKey(), // 'evt_...'
  type: text('type').notNull(), // 'vulnerability_exploitation', 'ransomware', 'apt_campaign', 'data_breach', 'tool_release'
  title: text('title').notNull(),
  summary: text('summary'),
  severity: text('severity').notNull(), // 'critical', 'high', 'medium', 'low', 'unknown'
  confidence: real('confidence').default(0.5).notNull(), // 0.0 - 1.0
  status: text('status').default('UNASSESSED').notNull(), // 'UNASSESSED', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'CONFIRMED', 'DISPUTED'
  contentHash: text('content_hash').notNull(),
  firstSeenAt: text('first_seen_at').notNull(),
  lastUpdatedAt: text('last_updated_at').notNull(),
  entitiesJson: text('entities_json', { mode: 'json' }),
  mitreMatrix: text('mitre_matrix', { mode: 'json' }),
  ...timestamps,
}, (table) => [
  index('idx_intel_events_content_hash').on(table.contentHash),
  index('idx_intel_events_timeline').on(table.firstSeenAt, table.lastUpdatedAt),
  index('idx_intel_events_severity').on(table.severity),
  index('idx_intel_events_status').on(table.status),
]);

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => intelligenceEvents.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').references(() => sources.id),
  sourceMessageId: text('source_message_id').references(() => sourceMessages.id),
  type: text('type').notNull(), // 'vendor_report', 'independent_research', 'pcap', 'sigma_rule', 'telemetry'
  url: text('url'),
  weight: real('weight').default(1.0).notNull(),
  snippet: text('snippet'),
  reviewerState: text('reviewer_state').default('UNREVIEWED'),
  ...timestamps,
}, (table) => [
  index('idx_evidence_event_id').on(table.eventId),
  index('idx_evidence_source_id').on(table.sourceId),
]);

export const relations = sqliteTable('relations', {
  id: text('id').primaryKey(),
  sourceEntityType: text('source_entity_type').notNull(), // 'event', 'actor', 'campaign', 'cve', 'malware'
  sourceEntityId: text('source_entity_id').notNull(),
  targetEntityType: text('target_entity_type').notNull(),
  targetEntityId: text('target_entity_id').notNull(),
  relationType: text('relation_type').notNull(), // 'exploits', 'targets', 'attributed_to', 'uses_malware', 'associated_with'
  confidence: real('confidence').default(1.0).notNull(),
  ...timestamps,
}, (table) => [
  index('idx_relations_source').on(table.sourceEntityType, table.sourceEntityId),
  index('idx_relations_target').on(table.targetEntityType, table.targetEntityId),
]);

// ── 5. ENTITY DIRECTORIES: ACTORS, CAMPAIGNS, MALWARE, CVES ───
export const actors = sqliteTable('actors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  aliases: text('aliases', { mode: 'json' }), // array of strings
  country: text('country'),
  motivation: text('motivation'), // 'financial', 'espionage', 'sabotage', 'hacktivism'
  description: text('description'),
  firstSeen: text('first_seen'),
  lastActive: text('last_active'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_actors_slug').on(table.slug),
]);

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  actorId: text('actor_id').references(() => actors.id),
  targetSectors: text('target_sectors', { mode: 'json' }),
  targetRegions: text('target_regions', { mode: 'json' }),
  description: text('description'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_campaigns_slug').on(table.slug),
]);

export const malware = sqliteTable('malware', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  type: text('type'), // 'ransomware', 'stealer', 'rat', 'loader', 'wiper'
  family: text('family'),
  description: text('description'),
  yaraRule: text('yara_rule'),
  sigmaRule: text('sigma_rule'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_malware_slug').on(table.slug),
]);

export const vulnerabilities = sqliteTable('vulnerabilities', {
  id: text('id').primaryKey(),
  cveId: text('cve_id').unique().notNull(), // e.g. 'CVE-2026-1234'
  title: text('title').notNull(),
  description: text('description'),
  severity: text('severity').notNull(), // 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
  cvssScore: real('cvss_score'),
  cvssVector: text('cvss_vector'),
  epssScore: real('epss_score'),
  isExploitedInWild: integer('is_exploited_in_wild', { mode: 'boolean' }).default(false).notNull(),
  affectedVendor: text('affected_vendor'),
  affectedProduct: text('affected_product'),
  patchUrl: text('patch_url'),
  publishedAt: text('published_at'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_vulnerabilities_cve_id').on(table.cveId),
  index('idx_vulnerabilities_severity').on(table.severity),
  index('idx_vulnerabilities_wild_exploit').on(table.isExploitedInWild),
]);

export const iocs = sqliteTable('iocs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'ipv4', 'ipv6', 'domain', 'url', 'sha256', 'md5'
  normalizedValue: text('normalized_value').notNull(),
  eventId: text('event_id').references(() => intelligenceEvents.id),
  malwareId: text('malware_id').references(() => malware.id),
  threatActorId: text('threat_actor_id').references(() => actors.id),
  confidence: real('confidence').default(0.8).notNull(),
  ...timestamps,
}, (table) => [
  index('idx_iocs_type_val').on(table.type, table.normalizedValue),
]);

export const ttpMappings = sqliteTable('ttp_mappings', {
  id: text('id').primaryKey(),
  mitreTtpId: text('mitre_ttp_id').notNull(), // e.g. 'T1059.001'
  techniqueName: text('technique_name').notNull(),
  tactic: text('tactic').notNull(), // e.g. 'execution', 'persistence'
  eventId: text('event_id').references(() => intelligenceEvents.id),
  ...timestamps,
}, (table) => [
  index('idx_ttp_mappings_ttp').on(table.mitreTtpId),
]);

// ── 6. EDITORIAL ARTICLES & REPORTS ───────────────────────────
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  dek: text('dek'),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  author: text('author').default('ZAYRON-X Intelligence Crew').notNull(),
  category: text('category').notNull(), // 'threat_intel', 'vulnerabilities', 'tools', 'apt', 'research'
  tags: text('tags', { mode: 'json' }),
  severity: text('severity'),
  confidence: real('confidence'),
  heroMediaUrl: text('hero_media_url'),
  aiSummary: text('ai_summary'),
  fbrScore: real('fbr_score'),
  readTime: integer('read_time'),
  views: integer('views').default(0).notNull(),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false).notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false).notNull(),
  isBreaking: integer('is_breaking', { mode: 'boolean' }).default(false).notNull(),
  canonicalIntelligenceEventId: text('canonical_intel_event_id').references(() => intelligenceEvents.id),
  publishedAt: text('published_at'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_articles_slug').on(table.slug),
  index('idx_articles_category_published').on(table.category, table.isPublished),
  index('idx_articles_published_at').on(table.publishedAt),
]);

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  abstract: text('abstract').notNull(),
  pdfR2Key: text('pdf_r2_key'),
  tierRequired: text('tier_required').default('pro').notNull(), // 'free', 'pro', 'researcher'
  publishedAt: text('published_at'),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_reports_slug').on(table.slug),
]);

// ── 7. JOBS MARKETPLACE ───────────────────────────────────────
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').references(() => organizations.id),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  companyName: text('company_name').notNull(),
  companyLogoUrl: text('company_logo_url'),
  employmentType: text('employment_type').notNull(), // 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'REMOTE'
  locationType: text('location_type').notNull(), // 'REMOTE', 'HYBRID', 'ONSITE'
  locationCity: text('location_city'),
  locationCountry: text('location_country'),
  minSalary: integer('min_salary'),
  maxSalary: integer('max_salary'),
  currency: text('currency').default('USD').notNull(),
  description: text('description').notNull(),
  applyUrl: text('apply_url').notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false).notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  status: text('status').default('PENDING_REVIEW').notNull(), // 'PENDING_REVIEW', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'
  expiresAt: text('expires_at').notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_jobs_slug').on(table.slug),
  index('idx_jobs_status_expires').on(table.status, table.expiresAt),
  index('idx_jobs_location').on(table.locationType, table.locationCountry),
]);

// ── 8. SOCIAL DISTRIBUTION ENGINE ─────────────────────────────
export const socialAssets = sqliteTable('social_assets', {
  id: text('id').primaryKey(),
  eventId: text('event_id').references(() => intelligenceEvents.id),
  articleId: text('article_id').references(() => articles.id),
  platform: text('platform').notNull(), // 'x', 'linkedin', 'tiktok', 'telegram', 'facebook', 'instagram'
  format: text('format').notNull(), // 'post', 'thread', 'carousel', 'story_script', 'alert'
  status: text('status').default('DRAFT').notNull(), // 'DRAFT', 'APPROVED', 'QUEUED', 'PUBLISHED', 'FAILED', 'RETRYING'
  body: text('body').notNull(),
  mediaUrls: text('media_urls', { mode: 'json' }),
  scheduledAt: text('scheduled_at'),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_social_assets_idempotency').on(table.idempotencyKey),
  index('idx_social_assets_platform_status').on(table.platform, table.status),
]);

export const socialPublications = sqliteTable('social_publications', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull().references(() => socialAssets.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  externalPostId: text('external_post_id'),
  status: text('status').notNull(), // 'QUEUED', 'PUBLISHED', 'FAILED_RETRYABLE', 'FAILED_PERMANENT'
  attempts: integer('attempts').default(0).notNull(),
  nextAttemptAt: text('next_attempt_at'),
  errorMessage: text('error_message'),
  publishedAt: text('published_at'),
  ...timestamps,
}, (table) => [
  index('idx_social_pub_status_next').on(table.status, table.nextAttemptAt),
]);

// ── 9. ALERTS & WATCHLISTS ────────────────────────────────────
export const watchlists = sqliteTable('watchlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rulesJson: text('rules_json', { mode: 'json' }).notNull(), // criteria: { actors, cves, sectors, severityThreshold }
  ...timestamps,
}, (table) => [
  index('idx_watchlists_user_id').on(table.userId),
]);

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  watchlistId: text('watchlist_id').references(() => watchlists.id),
  eventId: text('event_id').references(() => intelligenceEvents.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  severity: text('severity').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  ...timestamps,
}, (table) => [
  index('idx_alerts_user_read').on(table.userId, table.isRead),
]);

// ── 10. AUDIT, AI RUNS & USAGE ────────────────────────────────
export const auditEvents = sqliteTable('audit_events', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'), // userId or 'agent:system'
  action: text('action').notNull(), // 'publish_article', 'moderate_job', 'update_subscription', 'apply_migration'
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  correlationId: text('correlation_id'),
  details: text('details', { mode: 'json' }),
  createdAt: text('created_at').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(),
}, (table) => [
  index('idx_audit_events_created_at').on(table.createdAt),
  index('idx_audit_events_actor').on(table.actorId),
]);

export const knowledgeDocuments = sqliteTable('knowledge_documents', {
  id: text('id').primaryKey(), // 'doc_...'
  title: text('title').notNull(),
  author: text('author'),
  publisher: text('publisher'),
  publicationDate: text('publication_date'),
  version: text('version'),
  license: text('license'),
  sourceUrl: text('source_url'),
  documentType: text('document_type').notNull(), // 'book', 'standard', 'framework', 'spec', 'advisory', 'research_paper'
  topic: text('topic'),
  authorityTier: integer('authority_tier').notNull(), // 0=Primary/Authoritative, 1=Trusted Research, 2=Zayron Obs, 3=Secondary, 4=Unverified
  contentHash: text('content_hash').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  ...timestamps,
}, (table) => [
  index('idx_kdocs_authority').on(table.authorityTier),
  index('idx_kdocs_type').on(table.documentType),
  uniqueIndex('idx_kdocs_hash').on(table.contentHash),
]);

export const knowledgeChunks = sqliteTable('knowledge_chunks', {
  id: text('id').primaryKey(), // 'chk_...'
  documentId: text('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  section: text('section'),
  page: integer('page'),
  text: text('text').notNull(),
  embeddingId: text('embedding_id'), // Vectorize vector id
  authorityTier: integer('authority_tier').notNull(),
  tokenCount: integer('token_count'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(),
}, (table) => [
  index('idx_kchunks_doc_id').on(table.documentId),
  index('idx_kchunks_embedding_id').on(table.embeddingId),
  index('idx_kchunks_authority').on(table.authorityTier),
]);

export const aiRuns = sqliteTable('ai_runs', {
  id: text('id').primaryKey(),
  workflow: text('workflow').notNull(), // 'entity_extraction', 'incident_brief', 'copilot_query', 'rag_synthesis', 'intelligence_analyst'
  modelId: text('model_id').notNull(),
  promptVersion: text('prompt_version'),
  inputHash: text('input_hash'),
  outputHash: text('output_hash'),
  retrievedDocumentIds: text('retrieved_document_ids', { mode: 'json' }),
  retrievedChunkIds: text('retrieved_chunk_ids', { mode: 'json' }),
  retrievedEventIds: text('retrieved_event_ids', { mode: 'json' }),
  retrievedEvidenceIds: text('retrieved_evidence_ids', { mode: 'json' }),
  confidence: real('confidence'),
  durationMs: integer('duration_ms'),
  status: text('status').notNull(), // 'SUCCESS', 'FAILED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTION_DETECTED'
  errorCode: text('error_code'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  costEstimatedUsd: real('cost_estimated_usd'),
  createdAt: text('created_at').default(sql`(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`).notNull(),
}, (table) => [
  index('idx_ai_runs_workflow_status').on(table.workflow, table.status),
  index('idx_ai_runs_created_at').on(table.createdAt),
]);


export const featureUsage = sqliteTable('feature_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  feature: text('feature').notNull(), // 'ai_copilot_query', 'export_pdf', 'custom_alert'
  usageCount: integer('usage_count').default(1).notNull(),
  period: text('period').notNull(), // 'YYYY-MM'
  ...timestamps,
}, (table) => [
  uniqueIndex('idx_feature_usage_user_feat_period').on(table.userId, table.feature, table.period),
]);

// ── 11. SUPPLEMENTARY DIRECTORIES (ANALYSTS, TOOLS, RAW FEEDS) ──
export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  ...timestamps,
});

export const analysts = sqliteTable('analysts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title'),
  bio: text('bio'),
  nationality: text('nationality'),
  specializations: text('specializations', { mode: 'json' }),
  articleCount: integer('article_count').default(0),
  ...timestamps,
});

export const cves = sqliteTable('cves', {
  id: text('id').primaryKey(),
  cveId: text('cve_id').unique().notNull(),
  title: text('title'),
  description: text('description'),
  severity: text('severity'),
  cvssScore: real('cvss_score'),
  cvssVector: text('cvss_vector'),
  affectedProduct: text('affected_product'),
  vendor: text('vendor'),
  status: text('status'),
  publishedDate: text('published_date'),
  ...timestamps,
});

export const rawFeeds = sqliteTable('raw_feeds', {
  id: integer('id').primaryKey(),
  sourceChannel: text('source_channel'),
  rawContent: text('raw_content'),
  originalLanguage: text('original_language'),
  category: text('category'),
  status: text('status'),
  translatedTitle: text('translated_title'),
  translatedContent: text('translated_content'),
  analysis: text('analysis'),
  aiGeneratedFlag: integer('ai_generated_flag', { mode: 'boolean' }),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  timestamp: text('timestamp'),
  createdAt: text('created_at'),
  promotedAt: text('promoted_at'),
  metaData: text('meta_data', { mode: 'json' }),
});

export const tools = sqliteTable('tools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  category: text('category'),
  description: text('description'),
  rating: real('rating'),
  githubUrl: text('github_url'),
  stars: integer('stars').default(0),
  tags: text('tags', { mode: 'json' }),
  ...timestamps,
});

export const programmingLangs = sqliteTable('programming_langs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  description: text('description'),
  paradigm: text('paradigm'),
  useCase: text('use_case'),
  codeSnippet: text('code_snippet'),
  securityFeatures: text('security_features', { mode: 'json' }),
  articleCount: integer('article_count').default(0),
  ...timestamps,
});

