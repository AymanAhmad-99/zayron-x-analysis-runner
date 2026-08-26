import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, real } from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
};

// Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  role: text('role').default('free_user').notNull(),
  ...timestamps,
});

// Subscribers
export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  ...timestamps,
});

// Sources
export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  url: text('url'),
  type: text('source_type').notNull(),
  trustScore: real('trust_score').default(0.5),
  ...timestamps,
});

// Intelligence Events
export const intelligenceEvents = sqliteTable('intelligence_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  severity: text('severity').notNull(),
  confidence: real('confidence').notNull(),
  status: text('status').default('pending').notNull(),
  summary: text('summary'),
  firstSeenAt: text('first_seen_at').notNull(),
  lastUpdatedAt: text('last_updated_at').notNull(),
  ...timestamps,
});

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => intelligenceEvents.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').references(() => sources.id),
  type: text('type').notNull(),
  weight: real('weight').notNull(),
  ...timestamps,
});

// Articles matching Supabase exactly
export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').unique().notNull(),
  urlHash: text('url_hash'),
  subtitle: text('subtitle'),
  author: text('author'),
  category: text('category'),
  tags: text('tags', { mode: 'json' }), // Stored as JSON string
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  imageUrl: text('image_url'),
  readTime: integer('read_time'),
  views: integer('views').default(0),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  isBreaking: integer('is_breaking', { mode: 'boolean' }).default(false),
  financialExposure: text('financial_exposure'),
  regulatoryRisk: text('regulatory_risk'),
  mitigationImpact: text('mitigation_impact'),
  yaraRule: text('yara_rule'),
  imageTag: text('image_tag'),
  fbrScore: real('fbr_score'),
  mitreTtps: text('mitre_ttps', { mode: 'json' }), // Stored as JSON array
  iocsJson: text('iocs_json', { mode: 'json' }),
  sourceChannel: text('source_channel'),
  cvssV4Score: real('cvss_v4_score'),
  publishedAt: text('published_at'),
  ...timestamps,
});

// Jobs
export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  title: text('title').notNull(),
  employmentType: text('employment_type').notNull(),
  locationType: text('location_type'),
  minSalary: integer('min_salary'),
  maxSalary: integer('max_salary'),
  status: text('status').default('pending').notNull(),
  expiresAt: text('expires_at'),
  ...timestamps,
});

// Analysts (Based on analysts query)
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

// CVES (Based on cves query)
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

// Raw Feeds
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

// Tools
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

// Programming Languages
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
