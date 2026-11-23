import type { ExploitationStatus, PublicTimelineEventType } from '@zayron/types';

/**
 * ZAYRON-X Governance Engine
 * 
 * Rules for:
 * 1. Source Governance (accurate label-to-URL matching, deduplication)
 * 2. Timeline Governance (filtering internal pipeline events)
 * 3. IOC Governance (rejecting benign domain placeholders, enforcing verified fields)
 * 4. Exploitation Semantics (strictly governed exploitation states)
 */

export interface PublicSource {
  label: string;
  url: string;
  note?: string;
  isAuthoritative?: boolean;
}

export interface PublicTimelineEvent {
  date: string;
  eventType: PublicTimelineEventType;
  title: string;
  description: string;
  sourceLabel?: string;
}

export interface PublicIoc {
  type: 'IPv4' | 'IPv6' | 'SHA-256' | 'MD5' | 'Domain' | 'URL';
  value: string;
  context: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * SOURCE GOVERNANCE:
 * Prevents label/URL mismatch (e.g. CISA label with NVD URL) and deduplicates.
 */
export function governSources(sources: Array<{ label?: string; url?: string; note?: string }>): PublicSource[] {
  const result: PublicSource[] = [];
  const seenUrls = new Set<string>();

  for (const s of sources) {
    if (!s.url || !s.url.startsWith('http')) continue;

    const normalizedUrl = s.url.trim().replace(/\/+$/, '');
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    let label = (s.label || '').trim();

    // Reconcile label against authoritative destination domain
    const lowerUrl = normalizedUrl.toLowerCase();
    let note = (s.note || '').trim();

    if (lowerUrl.includes('nvd.nist.gov')) {
      const cveMatch = normalizedUrl.match(/CVE-\d{4}-\d+/i);
      const cveSuffix = cveMatch ? ` — ${cveMatch[0].toUpperCase()} Record` : ' — CVE Record';
      label = `NVD${cveSuffix}`;
      const humanUrl = cveMatch ? `https://nvd.nist.gov/vuln/detail/${cveMatch[0].toUpperCase()}` : normalizedUrl;
      result.push({
        label,
        url: humanUrl,
        note: 'Standardized vulnerability record and classification.',
        isAuthoritative: true,
      });
      continue;
    } else if (lowerUrl.includes('cveawg.mitre.org') || lowerUrl.includes('cve.org')) {
      const cveMatch = normalizedUrl.match(/CVE-\d{4}-\d+/i);
      label = cveMatch ? `CVE Program — ${cveMatch[0].toUpperCase()}` : 'CVE Program';
      const humanUrl = cveMatch ? `https://www.cve.org/CVERecord?id=${cveMatch[0].toUpperCase()}` : normalizedUrl;
      result.push({
        label,
        url: humanUrl,
        note: 'Canonical CVE Program vulnerability identification.',
        isAuthoritative: true,
      });
      continue;
    } else if (lowerUrl.includes('cisa.gov/known-exploited-vulnerabilities-catalog') || lowerUrl.includes('cisa.gov')) {
      label = 'CISA — Known Exploited Vulnerabilities';
      result.push({
        label,
        url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
        note: 'Confirms known exploitation status.',
        isAuthoritative: true,
      });
      continue;
    } else if (lowerUrl.includes('about.gitlab.com') || lowerUrl.includes('gitlab.com')) {
      label = 'GitLab Security Advisory';
      if (!note) {
        note = 'Vendor disclosure, affected versions, impact, and fixed releases.';
      }
    } else if (lowerUrl.includes('paloaltonetworks.com')) {
      label = 'Palo Alto Networks Security Advisory';
      if (!note) {
        note = 'Vendor security advisory, affected PAN-OS versions, and remediation.';
      }
    } else if (lowerUrl.includes('mikrotik.com')) {
      label = 'MikroTik Security Bulletin';
      if (!note) {
        note = 'Vendor disclosure, affected RouterOS versions, and remediation.';
      }
    } else if (lowerUrl.includes('patchstack.com')) {
      label = 'Patchstack Security Advisory';
      if (!note) {
        note = 'Security research disclosure and vulnerability validation.';
      }
    } else if (lowerUrl.includes('github.com') && lowerUrl.includes('/security/advisories')) {
      label = 'GitHub Security Advisory (GHSA)';
      if (!note) {
        note = 'Authoritative repository security bulletin and fixed releases.';
      }
    } else if (lowerUrl.includes('first.org/data/v1/epss') || lowerUrl.includes('first.org/epss')) {
      const cveMatch = normalizedUrl.match(/CVE-\d{4}-\d+/i);
      label = cveMatch ? `FIRST EPSS — ${cveMatch[0].toUpperCase()}` : 'FIRST EPSS';
      result.push({
        label,
        url: cveMatch ? `https://www.first.org/epss/data?cve=${cveMatch[0].toUpperCase()}` : 'https://www.first.org/epss',
        note: 'Empirical Exploit Prediction Scoring System probability assessment.',
        isAuthoritative: false,
      });
      continue;
    } else if (!label) {
      try {
        const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, '');
        label = `Vendor Advisory (${hostname})`;
      } catch {
        label = 'Authoritative Reference';
      }
    }

    result.push({
      label,
      url: normalizedUrl,
      note: note || undefined,
      isAuthoritative: lowerUrl.includes('paloaltonetworks.com') || lowerUrl.includes('nvd.nist.gov') || lowerUrl.includes('cisa.gov') || lowerUrl.includes('gitlab.com'),
    });
  }

  return result;
}

/**
 * TIMELINE GOVERNANCE:
 * Enforces ontology of public intelligence milestones.
 * Purges internal pipeline operations (INGESTION, DEDUPLICATION, NORMALIZATION, VECTOR_STORAGE).
 */
export function governTimeline(
  events: Array<{ date?: string; event?: string; context?: string; title?: string; description?: string }>
): PublicTimelineEvent[] {
  const publicEvents: PublicTimelineEvent[] = [];

  const FORBIDDEN_TIMELINE_TERMS = [
    'ingest',
    'deduplicat',
    'normaliz',
    'vector',
    'database update',
    'ledger',
    'pipeline',
    'telemetry',
  ];

  for (const ev of events) {
    const title = (ev.title || ev.event || '').trim();
    const desc = (ev.description || ev.context || '').trim();
    const combined = `${title} ${desc}`.toLowerCase();

    // Check if it's an internal pipeline event
    const isInternal = FORBIDDEN_TIMELINE_TERMS.some(term => combined.includes(term));
    if (isInternal) {
      continue; // Purge internal pipeline operations
    }

    // Classify event type (prioritize specific event milestones like patch or KEV)
    let eventType: PublicTimelineEventType = 'UPDATE';
    if (combined.includes('cisa kev') || combined.includes('known exploited')) eventType = 'KEV';
    else if (combined.includes('patch') || combined.includes('fixed') || combined.includes('release')) eventType = 'PATCH';
    else if (combined.includes('exploit') || combined.includes('in-the-wild') || combined.includes('active attack')) eventType = 'EXPLOITATION';
    else if (combined.includes('disclos') || combined.includes('advisory')) eventType = 'DISCLOSURE';
    else if (combined.includes('observ') || combined.includes('sensor')) eventType = 'OBSERVATION';
    else if (combined.includes('campaign')) eventType = 'CAMPAIGN';

    publicEvents.push({
      date: ev.date || 'Undisclosed Date',
      eventType,
      title: title || 'Intelligence Milestone',
      description: desc,
    });
  }

  return publicEvents;
}

/**
 * IOC GOVERNANCE:
 * Rejects benign vendor domains or generic company URLs as campaign IOCs.
 */
export function governIocs(rawIocs: Array<{ type?: string; value?: string; context?: string; confidence?: string }>): PublicIoc[] {
  const result: PublicIoc[] = [];
  const BENIGN_DOMAINS = new Set([
    'gitlab.com',
    'github.com',
    'google.com',
    'mikrotik.com',
    'microsoft.com',
    'cisa.gov',
    'nist.gov',
    'kernel.org',
  ]);

  for (const ioc of rawIocs) {
    const val = (ioc.value || '').trim();
    if (!val) continue;

    // Check if generic vendor domain
    if (BENIGN_DOMAINS.has(val.toLowerCase()) || BENIGN_DOMAINS.has(val.toLowerCase().replace(/^www\./, ''))) {
      continue; // Filter out benign company infrastructure
    }

    // Map type
    let type: PublicIoc['type'] = 'Domain';
    const upperType = (ioc.type || '').toUpperCase();
    if (upperType.includes('IPV4') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val)) type = 'IPv4';
    else if (upperType.includes('SHA256') || /^[a-fA-F0-9]{64}$/.test(val)) type = 'SHA-256';
    else if (upperType.includes('MD5') || /^[a-fA-F0-9]{32}$/.test(val)) type = 'MD5';
    else if (val.startsWith('http://') || val.startsWith('https://')) type = 'URL';

    result.push({
      type,
      value: val,
      context: ioc.context || 'Observed Threat Artifact',
      confidence: ioc.confidence?.toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM',
    });
  }

  return result;
}

/**
 * EXPLOITATION STATUS SEMANTICS:
 * Prevents overclaiming (e.g. CISA KEV inclusion becoming "Active Campaign Confirmed by ZAYRON-X").
 */
export function deriveExploitationStatus(
  cisaKev: boolean,
  inTheWildReported: boolean,
  independentlyObserved: boolean
): ExploitationStatus {
  if (independentlyObserved) {
    return 'INDEPENDENTLY_OBSERVED';
  }
  if (cisaKev) {
    return 'KNOWN_EXPLOITED_EXTERNAL';
  }
  if (inTheWildReported) {
    return 'REPORTED';
  }
  return 'NO_EVIDENCE';
}

export function formatExploitationStatusLabel(status: ExploitationStatus): string {
  switch (status) {
    case 'KNOWN_EXPLOITED_EXTERNAL':
      return 'Known Exploited — CISA KEV';
    case 'INDEPENDENTLY_OBSERVED':
      return 'Exploitation Independently Observed';
    case 'ACTIVE_CAMPAIGN_CONFIRMED':
      return 'Active Campaign Confirmed';
    case 'REPORTED':
      return 'Exploitation Reported In-the-Wild';
    case 'SUSPECTED':
      return 'Exploitation Suspected';
    case 'NO_EVIDENCE':
      return 'No In-the-Wild Exploitation Evidence';
    default:
      return 'Exploitation Status Unconfirmed';
  }
}
