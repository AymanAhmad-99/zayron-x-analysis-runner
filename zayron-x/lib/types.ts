export type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  author: string;
  subtitle: string | null;
  excerpt: string | null;
  tags: string[] | null;
  views: number | null;

  // Snake_case (Database direct columns)
  featured_image?: string | null;
  image_url?: string | null;
  image_tag?: string | null;
  is_published?: boolean;
  is_featured?: boolean;
  is_breaking?: boolean;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  read_time?: number | null;
  cvss_v4_score?: number | null;
  fbr_score?: number | null;
  financial_exposure?: string | null;
  mitigation_impact?: string | null;
  regulatory_risk?: string | null;
  mitre_ttps?: string[] | null;
  mitre_attack_ttps?: any | null;
  iocs_json?: any | null;
  yara_rule?: string | null;
  source_channel?: string | null;
  url_hash?: string | null;

  // CamelCase (Mapped application properties)
  urlHash?: string | null;
  imageUrl?: string | null;
  readTime?: number | null;
  isPublished?: boolean;
  isFeatured?: boolean;
  isBreaking?: boolean;
  financialExposure?: string | null;
  regulatoryRisk?: string | null;
  mitigationImpact?: string | null;
  yaraRule?: string | null;
  imageTag?: string | null;
  fbrScore?: string | number | null;
  mitreTtps?: string[] | null;
  iocsJson?: any | null;
  sourceChannel?: string | null;
  cvssV4Score?: string | number | null;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CVE = {
  id: string;
  severity: string;
  title: string | null;
  description: string | null;
  status: string | null;

  // Snake_case (Database direct columns)
  cve_id?: string;
  cvss_score?: number | null;
  cvss_vector?: string | null;
  affected_product?: string | null;
  affected_systems?: string | null;
  vendor?: string | null;
  product?: string | null;
  published_date?: string | null;
  created_at?: string | null;
  featured_image?: string | null;

  // CamelCase (Mapped application properties)
  cveId?: string;
  cvssScore?: string | number | null;
  cvssVector?: string | null;
  affectedProduct?: string | null;
  publishedDate?: string | Date | null;
  createdAt?: string | Date | null;
};

export type Analyst = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  nationality: string | null;
  specializations: string[] | null;

  // Snake_case (Database direct columns)
  article_count?: number | null;
  created_at?: string | null;

  // CamelCase (Mapped application properties)
  articleCount?: number | null;
  createdAt?: string | null;
};

export type Tool = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  rating: string | number | null;
  stars: number | null;
  tags: string[] | null;

  // Snake_case (Database direct columns)
  author?: string | null;
  url?: string | null;
  github_url?: string | null;
  featured_image?: string | null;
  created_at?: string | null;

  // CamelCase (Mapped application properties)
  githubUrl?: string | null;
  createdAt?: string | null;
};

export type RawFeed = {
  id: number;
  sourceChannel: string;
  rawContent: string;
  originalLanguage: string;
  status: string;
  category: string | null;
  analysis: string | null;
  intel_comparison?: string;
  intelComparison?: string;
  researcher_note?: string;
  researcherNote?: string;

  // Snake_case (Database direct columns)
  source_channel?: string;
  raw_content?: string;
  translated_content?: string | null;
  translated_title?: string | null;
  original_language?: string | null;
  ai_generated_flag?: boolean | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  promoted_at?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  meta_data?: any | null;

  // CamelCase (Mapped application properties)
  translatedContent?: string | null;
  translatedTitle?: string | null;
  aiGeneratedFlag?: boolean | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  promotedAt?: string | null;
  createdAt?: string | null;
  metaData?: any | null;
};

export type ProgrammingLang = {
  id: string;
  name: string;
  slug: string;
  description: string | null;

  // Snake_case (Database direct columns)
  icon?: string | null;
  color?: string | null;
  created_at?: string | null;

  // CamelCase (Mapped application properties)
  paradigm?: string | null;
  useCase?: string | null;
  codeSnippet?: string | null;
  securityFeatures?: string[] | null;
  articleCount?: number | null;
  createdAt?: string | null;
};

export type CategoryType = string;
