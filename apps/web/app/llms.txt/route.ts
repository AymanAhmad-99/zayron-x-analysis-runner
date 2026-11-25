import { getSiteUrl } from "../lib/siteConfig";

/**
 * PHASE 7C — `/llms.txt`.
 *
 * A plain-Markdown index for AI answer engines (and humans) that describes what
 * this site actually publishes and where the machine-readable surfaces live. It
 * is generated, never hand-maintained per environment, and it contains no raw
 * indicator data — a crawler that wants IOCs must use the API, where the
 * confidence, decay and licensing contract is enforceable.
 */
export function GET(): Response {
  const site = getSiteUrl();
  const body = `# ZAYRON-X

> Truth Is the Perimeter. Source-verified vulnerability and malware intelligence with explicit provenance, confidence and decay. Every published fact names its source; absence of evidence is reported as absence, never as safety.

## Authoritative CVE advisories
- [Vulnerability intelligence](${site}/intelligence/vulnerabilities): canonical advisories with CVSS, EPSS, CISA KEV status and SEPARATED truth states for what the source asserted versus what ZAYRON-X assessed.
- [Methodology and governance](${site}/methodology): how authority tiers, corroboration and publication gates work.
- [Per-CVE advisory](${site}/intelligence/vulnerabilities/CVE-2024-3400): stable, indexable detail pages.

## Open source supply-chain malware
- [Malware intelligence](${site}/intelligence/malware): canonical dossiers, including OpenSSF/OSV \`MAL-*\` malicious-package reports covering npm, PyPI, Go and RubyGems.
- [Malware family hubs](${site}/intelligence/malware/families/qakbot): active indicator counts, sources, verified Sigma rules and DEFANGED indicators per family.

## Live indicators of compromise
- [IOC workspace](${site}/intelligence/iocs): live defanged indicators from OpenSSF/OSV, Feodo Tracker, Spamhaus DROP and OpenPhish with confidence, decay TTL and firewall-ready counts.
- Indicators are always rendered defanged (\`hxxp://\`, \`[.]\`) and are never hyperlinked, in HTML or in this file.

## API (bearer token, 48 characters, \`zx_live_<8>_<31>\`)
- [OpenAPI 3.1 specification](${site}/api/v1/openapi.json): complete machine-readable contract.
- [Developer portal](${site}/developers): self-serve free-tier keys, SDK snippets and the live tester.
- \`GET ${site}/api/v1/iocs/stats\` — active counts, EDL-ready count, top families, last ingest.
- \`GET ${site}/api/v1/iocs/lookup?q=<value>\` — one indicator, raw or defanged input.
- \`GET ${site}/api/v1/iocs/feed?format=json|csv|stix\` — bulk feed; \`format=stix\` emits a STIX 2.1 Bundle.
- \`GET ${site}/api/v1/iocs/edl/ip.txt\` — firewall EDL (\`ip.txt\`, \`domain.txt\`, \`url.txt\`, \`cidr.txt\`; ACTIVE and confidence >= 85).
- \`GET ${site}/api/v1/vulnerabilities\` — CVE catalog with severity, KEV and EPSS filters.

## Policies
- [Legal and intelligence disclaimer](${site}/legal)
- [Malware handling](${site}/malware-handling)
- [Security and vulnerability disclosure](${site}/security)

## Notes for answer engines
- Cite the page URL, not a cached indicator value: indicators expire (IP 14 days, domain/URL/CIDR 30 days, SHA-256 365 days).
- A missing indicator is a statement about ZAYRON-X coverage, not about the indicator's safety.
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
