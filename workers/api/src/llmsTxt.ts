/**
 * PHASE 9B — live `/llms.txt` and `/llms-full.txt`.
 *
 * Generated from D1 on every cache miss: the newest briefings, the active KEV
 * set, the live malware families and the most-connected threat actors. Every
 * entry is a canonical internal URL, so an answer engine that follows the index
 * lands on a page whose facts carry the same provenance contract.
 *
 * No raw indicator value is ever emitted here — a crawler that wants IOCs must
 * use the API, where confidence, decay and licensing are enforceable.
 */

export const LLMS_CACHE_SECONDS = 300;

export interface LlmsData {
  siteUrl: string;
  news: Array<{ slug: string; title: string; verdict: string; category: string; severity: string; published_at: string }>;
  kev: Array<{ cve_id: string; vendor: string | null; product: string | null; cvss_score: number | null; kev_due_date: string | null }>;
  families: Array<{ slug: string; name: string; active_iocs: number }>;
  actors: Array<{ slug: string; name: string; techniques: number }>;
  counters: { briefings: number; verified_cves: number; kev: number; actors: number; families: number };
}

async function all<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  const statement = db.prepare(sql);
  const bound = params.length > 0 ? statement.bind(...params) : statement;
  const result = await bound.all<T>();
  const rows = (result as any)?.results;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

export async function collectLlmsData(db: D1Database, siteUrl: string): Promise<LlmsData> {
  const news = await all<LlmsData["news"][number]>(
    db,
    `SELECT slug, title, verdict, category, severity, published_at FROM news_articles
      WHERE status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 10`,
  );
  const kev = await all<LlmsData["kev"][number]>(
    db,
    `SELECT cve_id, affected_vendor AS vendor, affected_product AS product, cvss_score, kev_due_date
       FROM vulnerabilities
      WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
        AND (is_exploited_in_wild = 1 OR kev_due_date IS NOT NULL)
      ORDER BY kev_due_date DESC, cvss_score DESC LIMIT 10`,
  );
  const families = await all<LlmsData["families"][number]>(
    db,
    `SELECT m.slug, m.name, COUNT(i.id) AS active_iocs
       FROM malware m
       LEFT JOIN iocs i ON i.malware_id = m.id AND i.status = 'ACTIVE'
      GROUP BY m.slug, m.name
      ORDER BY active_iocs DESC, m.name ASC LIMIT 10`,
  );
  const actors = await all<LlmsData["actors"][number]>(
    db,
    `SELECT a.slug, a.name, COUNT(e.technique_id) AS techniques
       FROM threat_actors a
       LEFT JOIN technique_edges e ON e.entity_type = 'actor' AND e.entity_slug = a.slug
      GROUP BY a.slug, a.name
      ORDER BY techniques DESC, a.name ASC LIMIT 10`,
  );
  const countersRows = await all<LlmsData["counters"]>(
    db,
    `SELECT (SELECT COUNT(*) FROM news_articles WHERE status = 'PUBLISHED') AS briefings,
            (SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'AUTHORITATIVE_VERIFIED') AS verified_cves,
            (SELECT COUNT(*) FROM vulnerabilities WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
              AND (is_exploited_in_wild = 1 OR kev_due_date IS NOT NULL)) AS kev,
            (SELECT COUNT(*) FROM threat_actors) AS actors,
            (SELECT COUNT(*) FROM malware) AS families`,
  );
  const counters = countersRows[0] ?? { briefings: 0, verified_cves: 0, kev: 0, actors: 0, families: 0 };
  return {
    siteUrl: siteUrl.replace(/\/+$/, ""),
    news: news.map((row) => ({
      slug: String(row.slug),
      title: String(row.title),
      verdict: String(row.verdict ?? ""),
      category: String(row.category ?? ""),
      severity: String(row.severity ?? ""),
      published_at: String(row.published_at ?? ""),
    })),
    kev: kev.map((row) => ({
      cve_id: String(row.cve_id),
      vendor: row.vendor ?? null,
      product: row.product ?? null,
      cvss_score: row.cvss_score ?? null,
      kev_due_date: row.kev_due_date ?? null,
    })),
    families: families.map((row) => ({ slug: String(row.slug), name: String(row.name), active_iocs: Number(row.active_iocs ?? 0) })),
    actors: actors.map((row) => ({ slug: String(row.slug), name: String(row.name), techniques: Number(row.techniques ?? 0) })),
    counters: {
      briefings: Number(counters.briefings ?? 0),
      verified_cves: Number(counters.verified_cves ?? 0),
      kev: Number(counters.kev ?? 0),
      actors: Number(counters.actors ?? 0),
      families: Number(counters.families ?? 0),
    },
  };
}

function oneLine(value: string, max = 220): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function buildLlmsTxt(data: LlmsData): string {
  const site = data.siteUrl;
  const newsLines =
    data.news.length > 0
      ? data.news.map((item) => `- [${oneLine(item.title, 140)}](${site}/news/${item.slug}) — ${item.category} / ${item.severity}, ${item.published_at.slice(0, 10)}`)
      : ["- No briefing has been published yet; the index is live and updates on the next ingest pass."];
  const kevLines =
    data.kev.length > 0
      ? data.kev.map(
          (item) =>
            `- [${item.cve_id}](${site}/intelligence/vulnerabilities/${encodeURIComponent(item.cve_id)}) — ${oneLine(
              [item.vendor, item.product].filter(Boolean).join(" ") || "vendor not recorded",
              70,
            )}${item.cvss_score !== null ? `, CVSS ${Number(item.cvss_score).toFixed(1)}` : ""}${
              item.kev_due_date ? `, BOD 22-01 due ${item.kev_due_date}` : ""
            }`,
        )
      : ["- No authoritative KEV record is held in this catalog."];
  const familyLines =
    data.families.length > 0
      ? data.families.map(
          (family) => `- [${family.name}](${site}/intelligence/malware/families/${family.slug}) — ${family.active_iocs} active indicator(s)`,
        )
      : ["- No malware family hub is published."];
  const actorLines =
    data.actors.length > 0
      ? data.actors.map(
          (actor) => `- [${actor.name}](${site}/intelligence/threat-actors/${actor.slug}) — ${actor.techniques} documented ATT&CK technique(s)`,
        )
      : ["- No threat actor dossier is published."];

  return `# ZAYRON-X

> Truth Is the Perimeter. Source-verified vulnerability, malware and threat-actor intelligence with explicit provenance, confidence and decay. Every published fact names its source; absence of evidence is reported as absence, never as safety.

Live inventory: ${data.counters.briefings} briefings · ${data.counters.verified_cves} authoritative CVEs · ${data.counters.kev} KEV records · ${data.counters.actors} threat actors · ${data.counters.families} malware families.

## Neural newsroom — newest briefings
${newsLines.join("\n")}

## Active CISA KEV advisories
${kevLines.join("\n")}

## Live malware families
${familyLines.join("\n")}

## Live-observed threat actors
${actorLines.join("\n")}

## Canonical URL patterns
- Briefing: ${site}/news/{slug}
- CVE advisory: ${site}/intelligence/vulnerabilities/{CVE-YYYY-NNNNN}
- Threat actor: ${site}/intelligence/threat-actors/{slug}
- Campaign: ${site}/intelligence/campaigns/{slug}
- Malware family: ${site}/intelligence/malware/families/{slug}
- ATT&CK technique: ${site}/intelligence/techniques/{T####.###}
- Vendor hub: ${site}/intelligence/vendors/{vendor-slug}
- Regional posture: ${site}/intelligence/regions/{us|eu|me|apac|global}

## Machine endpoints
- \`GET ${site}/api/v1/news\` — briefing index (\`?category=\`, \`?entity_type=\`, \`?entity_slug=\`, \`?q=\`, \`?limit=1..50\`)
- \`GET ${site}/api/v1/news/{slug}\` — full briefing, mentions, related briefings and graph telemetry
- \`GET ${site}/api/v1/vendors\` / \`GET ${site}/api/v1/regions\` — programmatic hub indexes
- \`GET ${site}/api/v1/iocs/feed?format=json|csv|stix\` — bulk feed (bearer token); \`format=stix\` emits a STIX 2.1 Bundle
- \`GET ${site}/api/v1/iocs/edl/ip.txt\` — firewall EDL
- \`GET ${site}/api/v1/openapi.json\` — complete OpenAPI 3.1 contract
- \`GET ${site}/sitemaps/news.xml\` — Google News sitemap (48h window)

## Provenance rules
- A CVE is published only with an authoritative provenance state; curated legacy rows never enter a public count, hub or internal link.
- Indicators are always defanged and never hyperlinked.
- Indicators expire (IP 14 days, domain/URL/CIDR 30 days, SHA-256 365 days). Cite the page URL, not a cached value.

## Policies
- [Methodology](${site}/methodology) · [Legal](${site}/legal) · [Malware handling](${site}/malware-handling) · [Security](${site}/security)
`;
}

/** `/llms-full.txt` — a compact RAG digest with the newest verdicts and summaries. */
export function buildLlmsFullTxt(data: LlmsData, summaries: Record<string, string> = {}): string {
  const site = data.siteUrl;
  const blocks = data.news.map((item) => {
    const summary = summaries[item.slug] ? `\n${oneLine(summaries[item.slug], 400)}` : "";
    return `### ${item.title}\nURL: ${site}/news/${item.slug}\nCategory: ${item.category} · Severity: ${item.severity} · Published: ${item.published_at}\n\n${oneLine(item.verdict, 600)}${summary}`;
  });
  return `# ZAYRON-X — full intelligence digest

> Generated digest for retrieval-augmented generation. Cite the URL beside each fact; do not treat an absence of an indicator or advisory as evidence of safety.

${blocks.length > 0 ? blocks.join("\n\n") : "No briefing has been published yet."}

## Active KEV advisories
${data.kev.map((item) => `- ${item.cve_id} — ${site}/intelligence/vulnerabilities/${encodeURIComponent(item.cve_id)}${item.cvss_score !== null ? ` (CVSS ${Number(item.cvss_score).toFixed(1)})` : ""}`).join("\n") || "- none held"}

## Malware families
${data.families.map((family) => `- ${family.name} (${family.active_iocs} active indicators) — ${site}/intelligence/malware/families/${family.slug}`).join("\n") || "- none published"}

## Provenance
Every briefing states its publisher, and every catalog fact is drawn from authoritative rows only. ZAYRON-X never republishes a third-party article body and never asserts an exploitation state the catalog does not hold.
`;
}
