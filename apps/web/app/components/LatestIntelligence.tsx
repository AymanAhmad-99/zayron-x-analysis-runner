import { getCanonicalMalwareReports, getVulnerabilities, type IntelligenceRecord } from "../lib/api";
import { getNewsIndex } from "../lib/news";
import { formatAdvisoryTitle } from "../lib/seo";

function formatTimestamp(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  const normalized =
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? `${trimmed}T00:00:00Z`
      : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed)
        ? `${trimmed.replace(" ", "T")}Z`
        : trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
}

interface FeedRow extends IntelligenceRecord {
  href: string;
}

function RecordRow({ item }: { item: FeedRow }) {
  const severity = item.severity?.toUpperCase();
  const assessment = item.status?.toUpperCase();
  const timestamp = formatTimestamp(item.updatedAt);
  return (
    <article className="latest-intelligence-row">
      <div className="latest-record-type">
        <span>{item.type}</span>
        <small>{item.id}</small>
      </div>
      <div className="latest-record-main">
        <h3>
          <a href={item.href} style={{ color: "inherit", textDecoration: "none" }}>
            {item.title || item.id}
          </a>
        </h3>
        {item.summary && <p>{item.summary}</p>}
      </div>
      <div className="latest-record-meta">
        {severity && (
          <span className={`latest-severity severity-${severity.toLowerCase()}`}>
            <i aria-hidden="true" />
            {severity}
          </span>
        )}
        {assessment && (
          <span className={`latest-assessment assessment-${assessment.toLowerCase()}`}>
            <i aria-hidden="true" />
            {assessment}
          </span>
        )}
        {item.confidence !== undefined && <span className="latest-confidence">CONFIDENCE {item.confidence}</span>}
        {timestamp && <time dateTime={item.updatedAt}>{timestamp}</time>}
      </div>
    </article>
  );
}

/**
 * PHASE 12-EXECUTE — Depth-0 SSR Live Intelligence feed.
 *
 * Renders breaking Neural Newsroom briefings, authoritative KEV/high-signal
 * CVE advisories, and canonical malware dossiers directly into initial HTML
 * so crawlers and users receive fresh, internally linked intelligence at Depth 0.
 */
async function loadLiveFeedSsr(): Promise<{ state: "success" | "empty" | "error"; items: FeedRow[] }> {
  const [newsResult, vulnResult, malwareResult] = await Promise.all([
    getNewsIndex({ limit: 4 }).catch(() => ({ state: "error" as const, data: null, status: 500 })),
    getVulnerabilities({ limit: 6 }).catch(() => ({ state: "error" as const, data: null, error: "unavailable" })),
    getCanonicalMalwareReports().catch(() => ({ state: "error" as const, data: null, error: "unavailable" })),
  ]);

  const newsRows: FeedRow[] = (newsResult.state === "ok" ? newsResult.data?.items ?? [] : [])
    .slice(0, 3)
    .map((briefing) => ({
      id: briefing.category || "NEWSROOM",
      type: "Briefing",
      title: briefing.title,
      summary: briefing.verdict || briefing.summary,
      severity: briefing.severity,
      status: "PUBLISHED",
      updatedAt: briefing.published_at,
      href: `/news/${encodeURIComponent(briefing.slug)}`,
    }));

  const vulnRows: FeedRow[] = (vulnResult.data?.items ?? [])
    .filter((item) => Boolean(item.intelligence_id || item.id))
    .slice(0, 4)
    .map((item) => {
      const cveId = (item.intelligence_id || item.id) as string;
      return {
        id: cveId,
        type: "Vulnerability",
        title: formatAdvisoryTitle(cveId, item.affected_vendor, item.affected_product),
        summary: item.summary,
        severity: item.severity,
        status: item.status,
        updatedAt: item.updated_at || item.created_at,
        href: `/intelligence/vulnerabilities/${encodeURIComponent(cveId)}`,
      };
    });

  const malwareRows: FeedRow[] = (malwareResult.data?.items ?? [])
    .slice(0, 2)
    .map((item) => ({
      id: item.report_id,
      type: "Malware",
      title: item.title,
      summary: item.family ? `Static dossier · family ${item.family}` : "Static analysis malware dossier",
      severity: item.severity ?? undefined,
      status: "PUBLISHED",
      updatedAt: item.published_at,
      href: `/malware/intelligence/reports/${encodeURIComponent(item.report_id)}`,
    }));

  const combined = [...newsRows, ...vulnRows, ...malwareRows].slice(0, 8);
  if (combined.length > 0) return { state: "success", items: combined };
  const allErrored = newsResult.state === "error" && vulnResult.state === "error" && malwareResult.state === "error";
  return { state: allErrored ? "error" : "empty", items: [] };
}

export async function LatestIntelligence() {
  const { state, items } = await loadLiveFeedSsr();

  return (
    <section
      className="latest-intelligence-section shell"
      id="latest-intelligence"
      aria-labelledby="latest-intelligence-heading"
    >
      <div className="latest-intelligence-intro">
        <div>
          <div className="eyebrow">04 / SIGNAL INDEX</div>
          <h2 id="latest-intelligence-heading">LATEST INTELLIGENCE</h2>
        </div>
        <p>Recent intelligence across briefings, vulnerabilities, malware, exploits, actors and connected evidence.</p>
      </div>
      {state === "error" && (
        <div className="latest-intelligence-state error">
          <strong>INTELLIGENCE CURRENTLY UNAVAILABLE</strong>
          <span>The connected intelligence service did not return a usable response.</span>
        </div>
      )}
      {state === "empty" && (
        <div className="latest-intelligence-state">
          <strong>NO CURRENT INTELLIGENCE</strong>
          <span>The connected intelligence service has no published records at this time.</span>
        </div>
      )}
      {state === "success" && (
        <div className="latest-intelligence-list" role="list">
          {items.map((item) => (
            <RecordRow item={item} key={`${item.type}:${item.id}:${item.href}`} />
          ))}
        </div>
      )}
      <div className="home-source-strip" aria-label="Live intelligence sources">
        <span className="home-source-label">LIVE FEEDS</span>
        {["OpenSSF / OSV", "Feodo Tracker", "Spamhaus DROP", "OpenPhish", "Cloudflare Radar"].map((source) => (
          <span key={source}>{source}</span>
        ))}
      </div>
      <div className="latest-intelligence-actions">
        <a className="latest-intelligence-cta" href="/intelligence">
          VIEW ALL INTELLIGENCE <span aria-hidden="true">→</span>
        </a>
        <a className="latest-intelligence-cta" href="/news">
          NEURAL NEWSROOM <span aria-hidden="true">→</span>
        </a>
        <a className="latest-intelligence-cta" href="/intelligence/vulnerabilities">
          VULNERABILITY CATALOG <span aria-hidden="true">→</span>
        </a>
        <a className="latest-intelligence-cta" href="/intelligence/iocs">
          LIVE IOC WORKSPACE <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
