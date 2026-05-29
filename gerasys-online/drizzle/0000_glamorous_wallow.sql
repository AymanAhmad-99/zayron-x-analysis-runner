CREATE TYPE "public"."category" AS ENUM('vulnerabilities', 'threat_intel', 'osint', 'cyber_news');--> statement-breakpoint
CREATE TYPE "public"."patch_status" AS ENUM('Unpatched', 'Mitigated', 'Patched');--> statement-breakpoint
CREATE TABLE "analysts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"bio" text,
	"nationality" text,
	"specializations" text[] DEFAULT '{}',
	"article_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"url_hash" text,
	"subtitle" text,
	"analyst_id" uuid,
	"author" text DEFAULT 'Zayron Intel' NOT NULL,
	"category" "category" NOT NULL,
	"tags" text[] DEFAULT '{}',
	"security_score" numeric(3, 1),
	"content" text NOT NULL,
	"excerpt" text,
	"image_url" text,
	"read_time" integer DEFAULT 8,
	"views" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"is_breaking" boolean DEFAULT false,
	"financial_exposure" text,
	"regulatory_risk" text,
	"mitigation_impact" text,
	"yara_rule" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_url_hash_unique" UNIQUE("url_hash")
);
--> statement-breakpoint
CREATE TABLE "cves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cve_id" text NOT NULL,
	"title" text,
	"description" text,
	"severity" text NOT NULL,
	"cvss_score" numeric(3, 1),
	"cvss_vector" text,
	"affected_product" text,
	"vendor" text,
	"status" text DEFAULT 'Active',
	"exploitability_score" numeric(3, 1),
	"impact_score" numeric(3, 1),
	"patch_status" "patch_status" DEFAULT 'Unpatched',
	"mitre_tactics" jsonb,
	"cisa_kev" boolean DEFAULT false,
	"published_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "cves_cve_id_unique" UNIQUE("cve_id")
);
--> statement-breakpoint
CREATE TABLE "programming_langs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"paradigm" text,
	"use_case" text,
	"code_snippet" text,
	"security_features" text[] DEFAULT '{}',
	"article_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "programming_langs_name_unique" UNIQUE("name"),
	CONSTRAINT "programming_langs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "raw_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_channel" text NOT NULL,
	"raw_content" text NOT NULL,
	"original_language" text DEFAULT 'ru' NOT NULL,
	"category" "category",
	"status" text DEFAULT 'pending' NOT NULL,
	"translated_title" text,
	"translated_content" text,
	"analysis" text,
	"ai_generated_flag" boolean DEFAULT false,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"promoted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"rating" numeric(2, 1),
	"github_url" text,
	"stars" integer DEFAULT 0,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "trending" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"rank" integer DEFAULT 0,
	"engagement_score" integer DEFAULT 0,
	"article_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_analyst_id_analysts_id_fk" FOREIGN KEY ("analyst_id") REFERENCES "public"."analysts"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "trending" ADD CONSTRAINT "trending_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;