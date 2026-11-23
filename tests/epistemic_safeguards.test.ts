import { describe, it, expect } from 'vitest';
import { executeDeepIntelligenceAnalysisV2 } from '../packages/intelligence/src/engine_v2/index';
import { evaluateDeepQualityGateV2 } from '../packages/intelligence/src/engine_v2/quality_gate';

describe('Epistemic Safeguards Targeted Regression Test Suite', () => {

  // Base raw telemetry for testing
  const baseAdvisory = `Red Hat Security Advisory: Critical flaw in package.
CVE-2024-0553: A flaw was found where memory corruption occurs.
CVSS Base Score: 9.8 (CRITICAL) CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Advisory URL: https://access.redhat.com/security/cve/CVE-2024-0553`;

  // CASE 1: High CVSS Only -> EXPLOITATION_IN_THE_WILD must be rejected
  it('CASE 1 — HIGH CVSS ONLY: rejects EXPLOITATION_IN_THE_WILD when no KEV or exploitation telemetry exists', () => {
    const res = executeDeepIntelligenceAnalysisV2({
      rawText: baseAdvisory,
      sourceId: 'src_test_01',
      sourceTrust: 0.95,
      channelTitle: 'Vendor Advisory',
    });

    // Manually force an overstated exploit status on report to verify safeguard
    const taintedReport = {
      ...res.report,
      enrichment: {
        ...res.report.enrichment,
        exploit_status: 'EXPLOITATION_IN_THE_WILD' as const,
        cisa_kev: { is_in_kev: false },
      },
    };

    const gate = evaluateDeepQualityGateV2(taintedReport, baseAdvisory);
    expect(gate.passed).toBe(false);
    expect(gate.violations.some(v => v.includes('EPISTEMIC SAFETY VIOLATION: Active in-the-wild exploitation asserted'))).toBe(true);
  });

  // CASE 2: Real Exploitation Evidence -> EXPLOITATION_IN_THE_WILD is permitted to pass
  it('CASE 2 — REAL EXPLOITATION EVIDENCE: permits EXPLOITATION_IN_THE_WILD when empirical telemetry or KEV exists', () => {
    const wildTelemetry = `${baseAdvisory}\nActive exploitation in the wild confirmed with C2 beaconing observed on multiple hosts.`;
    const res = executeDeepIntelligenceAnalysisV2({
      rawText: wildTelemetry,
      sourceId: 'src_test_02',
      sourceTrust: 0.95,
      channelTitle: 'Threat Research',
    });

    const legitimateWildReport = {
      ...res.report,
      enrichment: {
        ...res.report.enrichment,
        exploit_status: 'EXPLOITATION_IN_THE_WILD' as const,
      },
    };

    const gate = evaluateDeepQualityGateV2(legitimateWildReport, wildTelemetry);
    const hasExploitViolation = gate.violations.some(v => v.includes('Active in-the-wild exploitation asserted'));
    expect(hasExploitViolation).toBe(false);
  });

  // CASE 3: Actor Name in Non-Attribution Context -> No factual actor attribution triggered
  it('CASE 3 — ACTOR NAME IN NON-ATTRIBUTION CONTEXT: distinguishes non-attribution mentions from affirmative attribution', () => {
    const contextualTelemetry = `${baseAdvisory}\nNote: Source mentions LockBit but does not attribute this event to LockBit. Threat actor attribution is unknown.`;
    const res = executeDeepIntelligenceAnalysisV2({
      rawText: contextualTelemetry,
      sourceId: 'src_test_03',
      sourceTrust: 0.95,
      channelTitle: 'Vendor Advisory',
    });

    // Legitimate report reflecting the non-attribution mention as UNKNOWN
    const validReport = {
      ...res.report,
      claims: [
        ...res.report.claims,
        {
          claim_id: 'clm_actor_unk',
          claim_type: 'UNKNOWN' as const,
          statement: 'Threat actor attribution is unknown; source mentions LockBit without attributing activity.',
          evidence_ids: ['evi_test_01'],
          book_citations: [],
          confidence: 0.95,
          rationale: 'Non-attribution context acknowledged',
        }
      ]
    };

    const gateValid = evaluateDeepQualityGateV2(validReport, contextualTelemetry);
    const hasAttributionViolation = gateValid.violations.some(v => v.includes('Threat actor attribution asserted as factual'));
    expect(hasAttributionViolation).toBe(false);

    // If an analyst artificially forces a factual attribution claim despite negative context, safeguard MUST catch it
    const taintedReport = {
      ...res.report,
      claims: [
        ...res.report.claims,
        {
          claim_id: 'clm_actor_fake',
          claim_type: 'CONFIRMED_FACT' as const,
          statement: 'Activity is attributed to LockBit.',
          evidence_ids: ['evi_test_01'],
          book_citations: [],
          confidence: 0.95,
          rationale: 'Fabricated attribution',
        }
      ]
    };

    const gateTainted = evaluateDeepQualityGateV2(taintedReport, contextualTelemetry);
    expect(gateTainted.passed).toBe(false);
    expect(gateTainted.violations.some(v => v.includes('EPISTEMIC SAFETY VIOLATION: Threat actor attribution asserted as factual'))).toBe(true);
  });

  // CASE 4: Verified Actor Evidence -> Affirmative attribution may pass when supported
  it('CASE 4 — VERIFIED ACTOR EVIDENCE: permits factual attribution claim when affirmative evidence is present', () => {
    const affirmativeTelemetry = `${baseAdvisory}\nIncident response confirmed intrusion was perpetrated by Sandworm targeting energy control systems.`;
    const res = executeDeepIntelligenceAnalysisV2({
      rawText: affirmativeTelemetry,
      sourceId: 'src_test_04',
      sourceTrust: 0.95,
      channelTitle: 'IR Advisory',
    });

    const supportedReport = {
      ...res.report,
      claims: [
        ...res.report.claims,
        {
          claim_id: 'clm_actor_sandworm',
          claim_type: 'CONFIRMED_FACT' as const,
          statement: 'Intrusion executed by Sandworm threat actor.',
          evidence_ids: ['evi_test_01'],
          book_citations: [],
          confidence: 0.95,
          rationale: 'Affirmative forensic attribution in primary report',
        }
      ]
    };

    const gate = evaluateDeepQualityGateV2(supportedReport, affirmativeTelemetry);
    const hasAttributionViolation = gate.violations.some(v => v.includes('Threat actor attribution asserted as factual'));
    expect(hasAttributionViolation).toBe(false);
  });
});
