/** Shared types for the isolated Phase 14 syndication worker. */

export type PlatformName = "bluesky" | "x" | "linkedin";

export type SyndicationItemType = "news" | "kev" | "cve";

export interface SyndicationItem {
  itemId: string;
  itemType: SyndicationItemType;
  title: string;
  summary: string;
  url: string;
  imageUrl: string | null;
  tags: string[];
  severity: string;
  cvssScore: number | null;
  epssScore: number | null;
  isKev: boolean;
  publishedAt: string;
  detectionHint: string | null;
}

export interface SyndicateEnv {
  DB?: D1Database;
  ENVIRONMENT?: string;
  SYNDICATE_SITE_URL?: string;
  SYNDICATE_ADMIN_TOKEN?: string;
  BLUESKY_IDENTIFIER?: string;
  BLUESKY_APP_PASSWORD?: string;
  X_API_KEY?: string;
  X_API_SECRET?: string;
  X_ACCESS_TOKEN?: string;
  X_ACCESS_SECRET?: string;
  X_ACCESS_TOKEN_SECRET?: string;
  LINKEDIN_ACCESS_TOKEN?: string;
  LINKEDIN_ORG_URN?: string;
  LINKEDIN_AUTHOR_URN?: string;
}

export type PlatformResultStatus =
  | "posted"
  | "dry_run"
  | "skipped_no_creds"
  | "skipped_cap"
  | "skipped_cooldown"
  | "no_candidate"
  | "failed";

export interface PlatformPublishResult {
  platform: PlatformName;
  configured: boolean;
  status: PlatformResultStatus;
  itemId: string | null;
  externalUri: string | null;
  externalUrl: string | null;
  payload?: unknown;
  error: string | null;
}
