import type { CanonicalReport } from './schema';
import { canReview } from './validation';
export function compileChannels(report: CanonicalReport) {
  const short = `WHAT HAPPENED: ${report.whatHappened}\nAFFECTED: ${report.affected.product} ${report.affected.version}\nEXPLOIT STATUS: ${report.exploitStatus}\nRISK: ${report.risk.priority}\nWHAT CHANGED: ${report.whatChanged}\nACTION: ${report.action}\nUNKNOWN: ${report.unknowns.join('; ')}`;
  return { web: report, api: report, telegram: `${short}\nMore: ${report.reportId}`, x: short, linkedin: `${report.identity.title}\n\n${report.whatHappened}\n\nAction: ${report.action}`, reddit: `${report.identity.title}\n\n${report.whatHappened}\n\nUnknowns: ${report.unknowns.join('; ')}`, reviewable: canReview(report) };
}
