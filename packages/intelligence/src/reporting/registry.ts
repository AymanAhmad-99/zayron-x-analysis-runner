/**
 * ZAYRON-X Report Template Registry
 * Defines all canonical domain templates and analytical constraints.
 */

import type {
  IntelligenceDomain,
  CanonicalIntelligenceReport,
  AudienceType,
  QualityGateIssue,
} from './types';

export interface DomainTemplateDefinition {
  id: string;
  version: string;
  domain: IntelligenceDomain;
  name: string;
  description: string;
  analyticalQuestions: string[];
  requiredSections: string[];
  optionalSections: string[];
  requiredEvidenceTypes: string[];
  allowedAudiences: AudienceType[];
  validateDomainInvariants: (report: CanonicalIntelligenceReport) => QualityGateIssue[];
}

class ReportTemplateRegistryImpl {
  private templates: Map<IntelligenceDomain, DomainTemplateDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(template: DomainTemplateDefinition): void {
    this.templates.set(template.domain, template);
  }

  public get(domain: IntelligenceDomain): DomainTemplateDefinition {
    const tmpl = this.templates.get(domain);
    if (!tmpl) {
      throw new Error(`[ReportTemplateRegistry] No template registered for domain: ${domain}`);
    }
    return tmpl;
  }

  public list(): DomainTemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  private registerDefaults(): void {
    // 1. Vulnerability Intelligence
    this.register({
      id: 'template_vulnerability_v1',
      version: '1.0.0',
      domain: 'VULNERABILITY',
      name: 'Vulnerability Intelligence Report',
      description: 'Defensible analysis of software vulnerability, exploitability, weaponization, and KEV status.',
      analyticalQuestions: [
        'What is the affected product and attack surface?',
        'What is the severity and priority score?',
        'What is the verified exploit maturity state?',
        'Is active exploitation observed in the wild?',
        'What malware or threat actors leverage this vulnerability?',
        'What specific mitigations or patches exist?',
      ],
      requiredSections: [
        'executive_summary',
        'vulnerability_overview',
        'affected_products',
        'severity',
        'exploit_maturity',
        'active_exploitation',
        'mitigation',
        'timeline',
        'evidence',
        'confidence',
        'intelligence_gaps',
        'analyst_assessment',
        'actions',
      ],
      optionalSections: ['related_malware', 'related_actors', 'attack_techniques'],
      requiredEvidenceTypes: ['ADVISORY', 'EXPLOIT_STATUS', 'CVSS'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        const maturity = report.domainDetails?.exploitMaturity;
        const isKev = report.domainDetails?.isKev;

        if (maturity === 'OBSERVED_EXPLOITATION' && !isKev) {
          // Check if there is explicit telemetry evidence in evidence store
          const hasTelemetryEvidence = Object.values(report.evidenceStore).some((e) =>
            e.statement.toLowerCase().includes('in the wild') || e.sourceId === 'cisa_kev'
          );
          if (!hasTelemetryEvidence) {
            issues.push({
              ruleId: 'RULE_5_EXPLOIT_MATURITY_INVARIANT',
              severity: 'FATAL',
              path: 'domainDetails.exploitMaturity',
              message: 'Claim of OBSERVED_EXPLOITATION requires CISA KEV or explicit telemetry evidence.',
            });
          }
        }
        return issues;
      },
    });

    // 2. Exploit Intelligence
    this.register({
      id: 'template_exploit_v1',
      version: '1.0.0',
      domain: 'EXPLOIT',
      name: 'Exploit Intelligence Report',
      description: 'Technical evaluation of exploit maturity, preconditions, and weaponization.',
      analyticalQuestions: [
        'What vulnerability does this exploit target?',
        'What is the exploit type and functional capability?',
        'Is source code public, weaponized, or privately held?',
        'What preconditions are required for execution?',
      ],
      requiredSections: [
        'executive_summary',
        'vulnerability_target',
        'exploit_type',
        'exploit_maturity',
        'weaponization',
        'preconditions',
        'mitigation',
        'evidence',
        'confidence',
        'unknowns',
        'analyst_assessment',
      ],
      optionalSections: ['execution_flow', 'detection_opportunities'],
      requiredEvidenceTypes: ['EXPLOIT_PAYLOAD', 'ADVISORY'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        const maturity = report.domainDetails?.exploitMaturity;
        if (maturity === 'POC' && report.executiveSummary.whatHappened.toLowerCase().includes('weaponized')) {
          issues.push({
            ruleId: 'RULE_5_EXPLOIT_MATURITY_INVARIANT',
            severity: 'FATAL',
            path: 'executiveSummary.whatHappened',
            message: 'Exploit maturity is POC; cannot be characterized as weaponized.',
          });
        }
        return issues;
      },
    });

    // 3. Malware Intelligence
    this.register({
      id: 'template_malware_v1',
      version: '1.0.0',
      domain: 'MALWARE',
      name: 'Malware Intelligence Report',
      description: 'Defensible analysis of malware samples, capabilities, C2 infrastructure, and family signatures.',
      analyticalQuestions: [
        'What is the verified malware family or classification?',
        'What cryptographic hashes and file artifacts exist?',
        'What evasion and persistence capabilities are present?',
        'What C2 infrastructure and IOCs are operationalized?',
      ],
      requiredSections: [
        'executive_summary',
        'malware_overview',
        'family_classification',
        'sample_evidence',
        'hashes',
        'capabilities',
        'iocs',
        'timeline',
        'confidence',
        'evidence',
        'intelligence_gaps',
        'analyst_assessment',
        'defensive_actions',
      ],
      optionalSections: ['command_and_control', 'attack_techniques'],
      requiredEvidenceTypes: ['SAMPLE_TELEMETRY', 'HASH_INDICATOR'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        const hasActorEdge = report.relationships.some(
          (r) => r.relationshipType === 'ATTRIBUTED_TO' && r.targetEntityType === 'threat_actor'
        );
        // If actor edge exists, ensure it has direct evidence
        if (hasActorEdge) {
          const actorRel = report.relationships.find((r) => r.relationshipType === 'ATTRIBUTED_TO');
          if (!actorRel || actorRel.evidenceRefs.length === 0) {
            issues.push({
              ruleId: 'RULE_6_MALWARE_FAMILY_ATTRIBUTION_ISOLATION',
              severity: 'FATAL',
              path: 'relationships',
              message: 'Malware family cannot be attributed to threat actor without dedicated evidence references.',
            });
          }
        }
        return issues;
      },
    });

    // 4. Threat Actor Intelligence
    this.register({
      id: 'template_threat_actor_v1',
      version: '1.0.0',
      domain: 'THREAT_ACTOR',
      name: 'Threat Actor Intelligence Report',
      description: 'Adversary profiling, tracked aliases, motivations, targeting, and corroborated attribution.',
      analyticalQuestions: [
        'What are the primary aliases and tracked identities?',
        'What are the suspected motivations and targeted sectors?',
        'What campaigns, malware, and infrastructure are attributed?',
        'What is the evidentiary confidence of attribution?',
      ],
      requiredSections: [
        'executive_summary',
        'actor_identity',
        'aliases',
        'motivations',
        'targeting',
        'attributed_tooling',
        'attribution_evidence',
        'confidence',
        'intelligence_gaps',
        'analyst_assessment',
        'defensive_implications',
      ],
      optionalSections: ['campaigns', 'infrastructure', 'competing_attribution'],
      requiredEvidenceTypes: ['ATTRIBUTION_ASSESSMENT', 'CAMPAIGN_TELEMETRY'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        if (report.intelligenceAssessment.confidence.level === 'HIGH' && report.contradictions.length > 0) {
          const unresolved = report.contradictions.some((c) => c.status === 'UNRESOLVED');
          if (unresolved) {
            issues.push({
              ruleId: 'RULE_3_ATTRIBUTION_CONFIDENCE_GROUNDING',
              severity: 'FATAL',
              path: 'intelligenceAssessment.confidence',
              message: 'High confidence attribution is invalid when active, unresolved contradictions exist.',
            });
          }
        }
        return issues;
      },
    });

    // 5. Campaign Intelligence
    this.register({
      id: 'template_campaign_v1',
      version: '1.0.0',
      domain: 'CAMPAIGN',
      name: 'Campaign Intelligence Report',
      description: 'Coordinated malicious operational clusters, objectives, timeline, and victims.',
      analyticalQuestions: [
        'What is the strategic objective of the campaign?',
        'What is the operational timeline and target geography?',
        'What infrastructure, exploits, and malware are coordinated?',
      ],
      requiredSections: [
        'executive_summary',
        'campaign_identity',
        'objective',
        'timeline',
        'targeting',
        'iocs',
        'evidence',
        'confidence',
        'intelligence_gaps',
        'analyst_assessment',
        'defensive_actions',
      ],
      optionalSections: ['infrastructure', 'malware', 'exploits', 'threat_actors'],
      requiredEvidenceTypes: ['CAMPAIGN_REPORT', 'TELEMETRY'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        if (report.timeline.length === 0) {
          issues.push({
            ruleId: 'RULE_8_TIMELINE_GROUNDING',
            severity: 'FATAL',
            path: 'timeline',
            message: 'Campaign report requires at least one verifiable chronological timeline entry.',
          });
        }
        return issues;
      },
    });

    // 6. Ransomware Intelligence
    this.register({
      id: 'template_ransomware_v1',
      version: '1.0.0',
      domain: 'RANSOMWARE',
      name: 'Ransomware Intelligence Report',
      description: 'Extortion tactics, affiliate operations, leak site analysis, and recovery mitigation.',
      analyticalQuestions: [
        'What is the ransomware family and affiliate operator structure?',
        'What initial access vectors and lateral movement techniques are used?',
        'What is the status of extortion and data exfiltration claims?',
      ],
      requiredSections: [
        'executive_summary',
        'ransomware_family',
        'victimology',
        'initial_access',
        'encryption_extortion',
        'timeline',
        'evidence',
        'confidence',
        'intelligence_gaps',
        'analyst_assessment',
        'mitigation',
      ],
      optionalSections: ['affiliates', 'iocs', 'infrastructure'],
      requiredEvidenceTypes: ['EXTORTION_RECORD', 'SAMPLE_ANALYSIS'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        // Leak site claims must not be asserted as confirmed breach without evidence
        const leakSiteReported = report.domainDetails?.ransomwareLeakSiteReported;
        const whatHappened = report.executiveSummary.whatHappened.toLowerCase();
        if (leakSiteReported && (whatHappened.includes('confirmed compromised') || whatHappened.includes('breached verified'))) {
          const hasBreachEvidence = Object.values(report.evidenceStore).some(
            (e) => e.evidenceType === 'INCIDENT_TELEMETRY' || e.evidenceType === 'VICTIM_CONFIRMATION'
          );
          if (!hasBreachEvidence) {
            issues.push({
              ruleId: 'RULE_1_EVIDENCE_GROUNDING',
              severity: 'FATAL',
              path: 'executiveSummary.whatHappened',
              message: 'Leak-site listing cannot be equated with confirmed compromise without telemetry or victim verification.',
            });
          }
        }
        return issues;
      },
    });

    // 7. Indicator Intelligence
    this.register({
      id: 'template_indicator_v1',
      version: '1.0.0',
      domain: 'INDICATOR',
      name: 'Indicator Intelligence Report',
      description: 'Atomic IOC intelligence, sightings, active windows, warninglists, and corroboration.',
      analyticalQuestions: [
        'What is the observable type and value?',
        'When was it first and last seen active?',
        'Does it match authoritative warninglists?',
        'What malware or threat context is linked?',
      ],
      requiredSections: [
        'executive_summary',
        'indicator_details',
        'type',
        'first_seen',
        'last_seen',
        'warninglist_context',
        'confidence',
        'evidence',
        'recommended_actions',
      ],
      optionalSections: ['related_malware', 'sightings'],
      requiredEvidenceTypes: ['OBSERVED_IOC'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        const hasWarninglist = report.iocs.some((i) => i.warninglistMatch);
        if (hasWarninglist) {
          const isAssertedBenign = report.whatWeKnow.some((k) =>
            k.text.toLowerCase().includes('completely benign and safe')
          );
          if (isAssertedBenign) {
            issues.push({
              ruleId: 'RULE_4_NO_UNKNOWN_AS_FALSE',
              severity: 'FATAL',
              path: 'whatWeKnow',
              message: 'Warninglist match establishes contextual caution; it does NOT prove the indicator is universally benign.',
            });
          }
        }
        return issues;
      },
    });

    // 8. Infrastructure Intelligence
    this.register({
      id: 'template_infrastructure_v1',
      version: '1.0.0',
      domain: 'INFRASTRUCTURE',
      name: 'Infrastructure Intelligence Report',
      description: 'Adversary C2 hosting, ASN clusters, dynamic DNS, and staging infrastructure.',
      analyticalQuestions: [
        'What IP, domain, or ASN infrastructure is operated?',
        'What is the hosting provider and passive DNS history?',
        'What malicious campaigns or tools resolve to this host?',
      ],
      requiredSections: [
        'executive_summary',
        'infrastructure_identity',
        'hosting_context',
        'confidence',
        'evidence',
        'intelligence_gaps',
        'recommended_actions',
      ],
      optionalSections: ['associated_actors', 'passive_dns'],
      requiredEvidenceTypes: ['INFRASTRUCTURE_RECORD', 'PASSIVE_DNS'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: () => [],
    });

    // 9. ATT&CK Technique Intelligence
    this.register({
      id: 'template_attack_technique_v1',
      version: '1.0.0',
      domain: 'ATTACK_TECHNIQUE',
      name: 'ATT&CK Technique Intelligence Report',
      description: 'Adversary TTP analysis, detection telemetry opportunities, and hunting rules.',
      analyticalQuestions: [
        'What is the ATT&CK Technique ID and tactic classification?',
        'In what verified malware or campaigns has this been observed?',
        'What telemetry and detection opportunities exist?',
        'What mitigations neutralize execution?',
      ],
      requiredSections: [
        'executive_summary',
        'technique_overview',
        'observed_use',
        'detection_opportunities',
        'mitigation',
        'evidence',
        'confidence',
        'analyst_assessment',
      ],
      optionalSections: ['hunting_hypotheses', 'actors', 'malware'],
      requiredEvidenceTypes: ['ATTACK_SPECIFICATION', 'OBSERVED_TTP'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: (report) => {
        const issues: QualityGateIssue[] = [];
        if (report.attackTechniques.length === 0) {
          issues.push({
            ruleId: 'RULE_12_SECTION_COMPLETENESS',
            severity: 'FATAL',
            path: 'attackTechniques',
            message: 'ATT&CK technique report requires at least one mapped technique.',
          });
        }
        return issues;
      },
    });

    // 10. Incident Intelligence
    this.register({
      id: 'template_incident_v1',
      version: '1.0.0',
      domain: 'INCIDENT',
      name: 'Incident Intelligence Report',
      description: 'Scoped organizational breach chronology, blast radius, containment, and root cause.',
      analyticalQuestions: [
        'What initial access vector was exploited?',
        'What systems, data, and users were impacted?',
        'What active containment and eradication steps have occurred?',
      ],
      requiredSections: [
        'executive_summary',
        'incident_overview',
        'blast_radius',
        'timeline',
        'iocs',
        'actions',
        'evidence',
        'confidence',
      ],
      optionalSections: ['root_cause', 'containment_status'],
      requiredEvidenceTypes: ['INCIDENT_TELEMETRY'],
      allowedAudiences: ['EXECUTIVE', 'ANALYST', 'SOC_DETECTION', 'INCIDENT_RESPONSE'],
      validateDomainInvariants: () => [],
    });
  }
}

export const ReportTemplateRegistry = new ReportTemplateRegistryImpl();
