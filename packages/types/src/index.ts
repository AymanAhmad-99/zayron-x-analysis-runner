export type ContentType =
  | 'vulnerability'
  | 'malware'
  | 'threat-intelligence'
  | 'threat-actor'
  | 'campaign'
  | 'ioc'
  | 'news'
  | 'research'
  | 'brief'
  | 'standards';

export type ExploitationStatus =
  | 'NO_EVIDENCE'
  | 'SUSPECTED'
  | 'REPORTED'
  | 'KNOWN_EXPLOITED_EXTERNAL'
  | 'INDEPENDENTLY_OBSERVED'
  | 'ACTIVE_CAMPAIGN_CONFIRMED'
  | 'UNKNOWN';

export type ClaimType =
  | 'FACT'
  | 'ASSESSMENT'
  | 'INFERENCE'
  | 'UNCONFIRMED'
  | 'UNKNOWN';

export type PublicTimelineEventType =
  | 'DISCLOSURE'
  | 'PATCH'
  | 'KEV'
  | 'EXPLOITATION'
  | 'OBSERVATION'
  | 'CAMPAIGN'
  | 'ATTRIBUTION'
  | 'DEVELOPMENT'
  | 'UPDATE';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export type ConfidenceState = 
  | 'UNASSESSED' 
  | 'LOW' 
  | 'MODERATE' 
  | 'HIGH' 
  | 'VERY_HIGH' 
  | 'CONFIRMED' 
  | 'DISPUTED';

export type SourceType = 'telegram' | 'rss' | 'api' | 'cert' | 'vendor';
export type SourceTrustLevel = 'trusted' | 'secondary' | 'claim' | 'unverified';
export type EntityType = 'actor' | 'cve' | 'malware' | 'ioc' | 'campaign';

export interface ProvenanceRecord {
  sourceId: string;
  sourceMessageId?: string;
  sourceUrl?: string;
  capturedAt: string;
  publishedAt?: string;
  evidenceType: string;
  excerptReference?: string;
  hash: string;
  weight: number;
}

export interface IntelligenceEventModel {
  id: string;
  type: string;
  title: string;
  summary?: string;
  severity: SeverityLevel;
  confidence: number;
  status: ConfidenceState;
  firstSeenAt: string;
  lastUpdatedAt: string;
  entities?: {
    cves?: string[];
    actors?: string[];
    malware?: string[];
    campaigns?: string[];
  };
  evidence?: ProvenanceRecord[];
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  urlHash?: string;
  subtitle?: string;
  author: string;
  category: string;
  tags: string[];
  content: string;
  excerpt?: string;
  imageUrl?: string;
  image_url?: string;
  readTime?: number;
  views: number;
  isPublished: boolean;
  isFeatured: boolean;
  isBreaking: boolean;
  financialExposure?: string;
  regulatoryRisk?: string;
  mitigationImpact?: string;
  yaraRule?: string;
  imageTag?: string;
  fbrScore?: number;
  mitreTtps?: string[];
  iocsJson?: any;
  sourceChannel?: string;
  cvssV4Score?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleRenderModel {
  id: string;
  title: string;
  slug: string;
  dek?: string;
  content: string;
  excerpt?: string;
  author: string;
  category: string;
  tags?: string[];
  severity?: SeverityLevel;
  confidence?: number;
  heroMediaUrl?: string;
  aiSummary?: string;
  publishedAt?: string;
  readTime?: number;
}

export interface JobListingModel {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companyLogoUrl?: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'REMOTE';
  locationType: 'REMOTE' | 'HYBRID' | 'ONSITE';
  locationCountry?: string;
  minSalary?: number;
  maxSalary?: number;
  currency: string;
  description: string;
  applyUrl: string;
  isFeatured: boolean;
  isVerified: boolean;
  expiresAt: string;
}

export interface UIStateMachineState {
  status: 'IDLE' | 'LOADING' | 'READY' | 'REFRESHING' | 'ERROR' | 'STALE' | 'EMPTY';
  lastUpdated?: string;
  error?: string;
}

export interface CVE {
  id: string;
  cveId: string;
  title?: string;
  description?: string;
  severity: string;
  cvssScore?: number;
  cvssVector?: string;
  affectedProduct?: string;
  vendor?: string;
  status?: string;
  publishedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Analyst {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  nationality?: string;
  specializations?: string[];
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  category?: string;
  description?: string;
  rating?: number;
  githubUrl?: string;
  stars?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgrammingLanguage {
  id: string;
  name: string;
  slug: string;
  description?: string;
  paradigm?: string;
  useCase?: string;
  codeSnippet?: string;
  securityFeatures?: string[];
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ProgrammingLang = ProgrammingLanguage;


export interface RawFeed {
  id: number;
  sourceChannel?: string;
  rawContent?: string;
  originalLanguage?: string;
  category?: string;
  status?: string;
  translatedTitle?: string;
  translatedContent?: string;
  analysis?: string;
  aiGeneratedFlag?: boolean;
  promptTokens?: number;
  completionTokens?: number;
  metaData?: any;
}

export * from './marketing';
