import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  urlHash: text("url_hash").unique(),
  subtitle: text("subtitle"),
  author: text("author").notNull().default("Zayron Intel"),
  category: text("category").notNull(),
  tags: text("tags").array().default([]).$type<string[]>(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  imageUrl: text("image_url"),
  readTime: integer("read_time").default(8),
  views: integer("views").default(0),
  isPublished: boolean("is_published").default(true),
  isFeatured: boolean("is_featured").default(false),
  isBreaking: boolean("is_breaking").default(false),
  financialExposure: text("financial_exposure"),
  regulatoryRisk: text("regulatory_risk"),
  mitigationImpact: text("mitigation_impact"),
  yaraRule: text("yara_rule"),
  imageTag: text("image_tag"),
  fbrScore: decimal("fbr_score", { precision: 8, scale: 2 }),
  mitreTtps: text("mitre_ttps").array().default([]).$type<string[]>(),
  iocsJson: text("iocs_json"),
  sourceChannel: text("source_channel"),
  cvssV4Score: decimal("cvss_v4_score", { precision: 3, scale: 1 }),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cves = pgTable("cves", {
  id: uuid("id").primaryKey().defaultRandom(),
  cveId: text("cve_id").notNull().unique(),
  title: text("title"),
  description: text("description"),
  severity: text("severity").notNull(),
  cvssScore: decimal("cvss_score", { precision: 3, scale: 1 }),
  cvssVector: text("cvss_vector"),
  affectedProduct: text("affected_product"),
  vendor: text("vendor"),
  status: text("status").default("Active"),
  publishedDate: timestamp("published_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const programmingLangs = pgTable("programming_langs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  paradigm: text("paradigm"),
  useCase: text("use_case"),
  codeSnippet: text("code_snippet"),
  securityFeatures: text("security_features").array().default([]).$type<string[]>(),
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  description: text("description"),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  githubUrl: text("github_url"),
  stars: integer("stars").default(0),
  tags: text("tags").array().default([]).$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analysts = pgTable("analysts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  title: text("title"),
  bio: text("bio"),
  nationality: text("nationality"),
  specializations: text("specializations").array().default([]).$type<string[]>(),
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trending = pgTable("trending", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  rank: integer("rank").default(0),
  engagementScore: integer("engagement_score").default(0),
  articleId: uuid("article_id").references(() => articles.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type CategoryType = string;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type CVE = typeof cves.$inferSelect;
export type NewCVE = typeof cves.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type Analyst = typeof analysts.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export const rawFeeds = pgTable("raw_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceChannel: text("source_channel").notNull(),
  rawContent: text("raw_content").notNull(),
  originalLanguage: text("original_language").notNull().default("ru"),
  category: text("category"),
  status: text("status").notNull().default("pending"),
  translatedTitle: text("translated_title"),
  translatedContent: text("translated_content"),
  analysis: text("analysis"),
  aiGeneratedFlag: boolean("ai_generated_flag").default(false),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  promotedAt: timestamp("promoted_at"),
});

export type RawFeed = typeof rawFeeds.$inferSelect;
export type NewRawFeed = typeof rawFeeds.$inferInsert;

export type ProgrammingLang = typeof programmingLangs.$inferSelect;
export type TrendingItem = typeof trending.$inferSelect;

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  clearanceLevel: text("clearance_level").notNull().default("FREE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const threatArtifacts = pgTable("threat_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  severity: text("severity").notNull(),
  cvssScore: decimal("cvss_score", { precision: 3, scale: 1 }).notNull(),
  fbrTotal: decimal("fbr_total", { precision: 12, scale: 2 }).notNull(),
  sector: text("sector").notNull(),
  yaraRules: text("yara_rules"),
  sigmaRules: text("sigma_rules"),
  rawIocs: text("raw_iocs"),
  unmaskedTargetEntities: text("unmasked_target_entities"),
  sitrepPdfUrl: text("sitrep_pdf_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ThreatArtifact = typeof threatArtifacts.$inferSelect;
export type NewThreatArtifact = typeof threatArtifacts.$inferInsert;

