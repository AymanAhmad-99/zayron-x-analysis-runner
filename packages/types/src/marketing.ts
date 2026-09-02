// ── MARKETING DESIGN TOKENS & TYPESCRIPT CONTRACTS ──────────────

export interface HeroSectionProps {
  title: string;
  dek: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  previewCardData?: Record<string, unknown>;
}

export interface EvidenceRecord {
  source: string;
  observedDate: string;
  confidenceLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'CONFIRMED' | string;
  indicatorsCount: number;
  relatedEntities: string[];
}

export interface ResearchReportPreview {
  id: string;
  title: string;
  slug: string;
  summary: string;
  readTime: number;
  publishedAt: string;
  category: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string | number;
  period: string;
  isPopular?: boolean;
  features: string[];
  ctaLabel: string;
}

export interface JobPreview {
  id: string;
  title: string;
  company: string;
  locationType: 'REMOTE' | 'HYBRID' | 'ONSITE' | string;
  isVerified: boolean;
  expiresAt: string;
}
