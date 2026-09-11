import { NextRequest } from 'next/server';
import { CANONICAL_PUBLISHED_REPORTS } from '@zayron/intelligence';
import { cleanHeadline, sanitizeReportContent } from '@/lib/sanitizer';

export const dynamic = 'force-dynamic';

const CANONICAL_ACTORS = [
  { id: 'act_sandworm', name: 'Sandworm', slug: 'sandworm', country: 'Russia', description: 'State-sponsored threat group attributed to the Russian GRU Unit 74455.' },
  { id: 'act_volt_typhoon', name: 'Volt Typhoon', slug: 'volt-typhoon', country: 'China', description: 'State-sponsored adversary pre-positioning across critical infrastructure networks.' },
  { id: 'act_apt29', name: 'APT29 (Cozy Bear)', slug: 'apt29', country: 'Russia', description: 'Foreign intelligence cyber espionage group conducting strategic intelligence collection.' },
  { id: 'act_lockbit', name: 'LockBit', slug: 'lockbit', country: 'Global', description: 'Prolific Ransomware-as-a-Service (RaaS) cybercrime syndicate.' },
];

const CANONICAL_MALWARE = [
  { id: 'mal_lockbit_3', name: 'LockBit 3.0', slug: 'lockbit-3', family: 'LockBit', description: 'Modular double-extortion ransomware with anti-analysis capabilities.' },
  { id: 'mal_cobalt_strike', name: 'Cobalt Strike', slug: 'cobalt-strike', family: 'Beacon C2', description: 'Adversary emulation platform extensively weaponized in post-compromise operations.' },
  { id: 'mal_blackcat', name: 'ALPHV / BlackCat', slug: 'blackcat', family: 'BlackCat', description: 'Rust-compiled ransomware payload operating cross-platform capabilities targeting Windows and VMware ESXi.' },
  { id: 'mal_darkside', name: 'DarkSide', slug: 'darkside', family: 'DarkSide', description: 'Targeted enterprise ransomware known for critical infrastructure extortion incidents.' },
];

const CANONICAL_CAMPAIGNS = [
  { id: 'cmp_volt_01', name: 'Critical Infrastructure Pre-Positioning', slug: 'volt-typhoon-infrastructure-prepositioning', description: 'Volt Typhoon living-off-the-land persistence targeting communications and maritime facilities.' },
  { id: 'cmp_sandworm_01', name: 'Substation Grid Disruption', slug: 'sandworm-substation-grid-disruption', description: 'Sandworm coordinated operations targeting regional electric distribution substations.' },
  { id: 'cmp_triangulation', name: 'Operation Triangulation', slug: 'operation-triangulation', description: 'Targeted zero-click mobile espionage campaign exploiting iOS kernel vulnerabilities.' },
];

const CANONICAL_IOCS = [
  { id: 'ioc_cve_2024_3400_ip', normalized_value: '185.156.73.44', type: 'IP', event_id: 'cve-2024-3400' },
  { id: 'ioc_cve_2024_3400_domain', normalized_value: 'graph-api-proxy.azureedge.net', type: 'DOMAIN', event_id: 'cve-2024-3400' },
  { id: 'ioc_lb_hash', normalized_value: 'd67c5cbf560ddbed314e3a808175e2f47403f47f96ced3b1d774228112ecd259', type: 'SHA256', event_id: 'lockbit-3' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);

  if (!q || q.length < 2) {
    return Response.json(
      { data: { actors: [], vulnerabilities: [], malware: [], campaigns: [], iocs: [], events: [], articles: [] }, meta: { query: q, total_matches: 0 } },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }

  const qLower = q.toLowerCase();

  // Search actors
  const matchedActors = CANONICAL_ACTORS.filter(
    (a) => a.name.toLowerCase().includes(qLower) || a.description.toLowerCase().includes(qLower) || a.slug.toLowerCase().includes(qLower)
  ).slice(0, limit);

  // Search malware
  const matchedMalware = CANONICAL_MALWARE.filter(
    (m) => m.name.toLowerCase().includes(qLower) || m.description.toLowerCase().includes(qLower) || m.family.toLowerCase().includes(qLower) || m.slug.toLowerCase().includes(qLower)
  ).slice(0, limit);

  // Search campaigns
  const matchedCampaigns = CANONICAL_CAMPAIGNS.filter(
    (c) => c.name.toLowerCase().includes(qLower) || c.description.toLowerCase().includes(qLower) || c.slug.toLowerCase().includes(qLower)
  ).slice(0, limit);

  // Search IOCs
  const matchedIocs = CANONICAL_IOCS.filter(
    (i) => i.normalized_value.toLowerCase().includes(qLower) || i.type.toLowerCase().includes(qLower)
  ).slice(0, limit);

  // Search Canonical Reports & CVEs
  const matchedReports = CANONICAL_PUBLISHED_REPORTS.filter((r) => {
    return (
      r.title.toLowerCase().includes(qLower) ||
      (r.slug && r.slug.toLowerCase().includes(qLower)) ||
      (r.cve_id && r.cve_id.toLowerCase().includes(qLower)) ||
      (r.summary && r.summary.toLowerCase().includes(qLower))
    );
  });

  const matchedEvents = matchedReports.slice(0, limit).map((r) => ({
    id: r.slug || r.cve_id || r.intelligence_id,
    title: cleanHeadline(r.title, r.cve_id),
    summary: sanitizeReportContent(r.summary),
    severity: r.severity || 'HIGH',
    confidence: r.confidence_score || 0.88,
  }));

  const matchedVulns = matchedReports
    .filter((r) => r.cve_id)
    .slice(0, limit)
    .map((r) => ({
      id: r.cve_id,
      cve_id: r.cve_id,
      title: cleanHeadline(r.title, r.cve_id),
      description: sanitizeReportContent(r.summary),
      severity: r.severity || 'HIGH',
      cvss_score: 7.5,
    }));

  const totalMatches =
    matchedActors.length +
    matchedMalware.length +
    matchedIocs.length +
    matchedEvents.length +
    matchedVulns.length;

  return Response.json(
    {
      data: {
        actors: matchedActors,
        vulnerabilities: matchedVulns,
        malware: matchedMalware,
        campaigns: matchedCampaigns,
        iocs: matchedIocs,
        events: matchedEvents,
        articles: [],
      },
      meta: {
        query: q,
        total_matches: totalMatches,
      },
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  );
}
