export * from './types';

// Legacy compatibility exports
export type ReportState = 'NEW' | 'PROCESSING' | 'HOLD' | 'ENRICH' | 'READY_FOR_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REVISED' | 'RETIRED';
export type ExploitStatus = 'NO_PUBLIC_EXPLOIT_EVIDENCE' | 'PUBLIC_POC' | 'PUBLIC_EXPLOIT' | 'KNOWN_EXPLOITED' | 'OBSERVED_EXPLOITATION' | 'HIGH_RISK_SIGNAL' | 'UNKNOWN';
export type EpistemicClass = 'CONFIRMED_FACT' | 'SOURCE_DERIVED' | 'KNOWLEDGE_DERIVED' | 'ANALYTIC_INFERENCE' | 'RECOMMENDATION' | 'UNKNOWN';
export interface LegacyReportCitation { citationId: string; evidenceId: string; artifactId: string; sourceId: string; textReference: string; }
export interface ConfidenceDimensions { evidence: number; impact: number; attribution: number; aggregate: number; basis: string[]; }
export interface CanonicalReport {
  reportId: string;
  revision: number;
  state: ReportState;
  identity: { entityId: string; title: string; identifiers: string[] };
  whatHappened: string;
  affected: { vendor: string; product: string; version: string; package: string; platform: string; state: 'VERIFIED' | 'UNKNOWN' };
  exploitStatus: ExploitStatus;
  risk: { cvss: number | 'UNKNOWN'; epss: number | 'UNKNOWN'; kev: boolean | 'UNKNOWN'; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'; inputs: string[] };
  whatChanged: string;
  action: string;
  unknowns: string[];
  confidence: ConfidenceDimensions;
  citations: LegacyReportCitation[];
  knowledge: Array<{ refId: string; retrieved: boolean; relevant: boolean; applied: boolean; analyticalEffect: string }>;
  conflicts: string[];
  publicationReadiness: 'HOLD' | 'READY_FOR_REVIEW' | 'REJECT';
}
