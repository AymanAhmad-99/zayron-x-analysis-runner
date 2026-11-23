import type { CanonicalReport } from './schema';
export interface ValidationIssue { path: string; code: string; message: string; }
export function validateReport(report: CanonicalReport): ValidationIssue[] {
  const issues: ValidationIssue[] = []; const add = (path: string, code: string, message: string) => issues.push({ path, code, message });
  if (!report.reportId || !report.identity.entityId) add('identity', 'REQUIRED', 'Identity is required');
  if (!report.whatHappened || report.whatHappened === 'UNKNOWN') add('whatHappened', 'UNSUPPORTED', 'What happened requires evidence-backed content');
  if (report.exploitStatus === 'KNOWN_EXPLOITED' && report.risk.kev !== true) add('exploitStatus', 'INCONSISTENT', 'Known exploitation requires KEV or equivalent evidence');
  if (report.confidence.aggregate < 0 || report.confidence.aggregate > 1) add('confidence.aggregate', 'RANGE', 'Confidence must be between 0 and 1');
  if (report.publicationReadiness === 'READY_FOR_REVIEW' && (report.citations.length === 0 || report.unknowns.length === 0 || report.action === 'UNKNOWN' || report.knowledge.some((k) => k.retrieved && k.applied && !k.analyticalEffect))) add('publicationReadiness', 'QUALITY_GATE', 'Citations, unknowns, action, and applied knowledge must be complete');
  for (const citation of report.citations) if (!citation.evidenceId || !citation.artifactId || !citation.sourceId) add('citations', 'PROVENANCE', 'Citation is incomplete');
  return issues;
}
export function canReview(report: CanonicalReport): boolean { return validateReport(report).length === 0 && report.publicationReadiness === 'READY_FOR_REVIEW'; }
