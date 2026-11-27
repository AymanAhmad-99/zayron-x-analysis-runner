import type { Metadata } from "next";
import { RouteShell } from "../components/RouteShell";
import { IntelAlertStrip } from "../components/IntelAlertStrip";
import { getNewsIndex, getNewsTelemetry, NEWS_CATEGORIES, categoryLabel, formatNewsDate, newsHref, severityAccent } from "../lib/news";
import { getSiteUrl, getTurnstileSiteKey, isPreviewDeployment } from "../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../lib/seo";

/**
 * PHASE 9B — `/news`, the graph-enriched neural newsroom.
 *
 * Every card is a published ZAYRON-X briefing, never a syndicated article body.
 * The telemetry strip reads the live API so a "briefings" count can never be a
 * hardcoded number.
 */

type Props = { searchParams: Promise<{ category?: string; q?: string }> };

export const revalidate = 300;

export function generateMetadata(): Metadata {
  const description =
    "Source-verified cybersecurity briefings with the ZAYRON-X connected threat graph attached: CVSS, EPSS, CISA KEV state, linked actors, malware families and ATT&CK techniques.";
  return {
    title: "Neural Newsroom — Verified Cybersecurity Briefings | ZAYRON-X",
    description,
    alternates: { canonical: "/news" },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: "Neural Newsroom | ZAYRON-X",
      description,
      path: "/news",
      type: "website",
    }),
    twitter: { card: "summary_large_image", title: "Neural Newsroom | ZAYRON-X", description },
  };
}

export default async function NewsPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = String(params.category ?? "").trim().toUpperCase();
  const query = String(params.q ?? "").trim();
  const [telemetry, index] = await Promise.all([
    getNewsTelemetry(),
    getNewsIndex({ category, q: query, limit: 30 }),
  ]);

  const items = index.state === "ok" ? index.data?.items ?? [] : [];
  const site = getSiteUrl();
  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: "/news",
    primary: {
      "@type": "CollectionPage",
      name: "ZAYRON-X Neural Newsroom",
      description:
        "Source-verified cybersecurity briefings with catalog-backed CVSS, EPSS, KEV, actor, malware and ATT&CK telemetry attached.",
      numberOfItems: index.data?.total ?? 0,
    },
  });

  return (
    <RouteShell
      title="Neural Newsroom"
      eyebrow="INTELLIGENCE / NEWSROOM"
      activeHref="/news"
      description="Source-verified briefings synthesized against the live ZAYRON-X catalog. Every briefing names its publisher and attaches only catalog-backed telemetry."
      contextNotice="A briefing is a ZAYRON-X synthesis of a publisher's report plus stored catalog facts. It never republishes a third-party article body and never asserts an exploitation state the catalog does not hold."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="ioc-telemetry" aria-label="Newsroom telemetry">
        <div className="ioc-telemetry-card">
          <span>PUBLISHED BRIEFINGS</span>
          <strong>{telemetry.data?.published_briefings ?? 0}</strong>
          <small>verified briefings</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>LINKED ENTITIES</span>
          <strong>{telemetry.data?.linked_entities ?? 0}</strong>
          <small>neural mention edges</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>SOURCES TRACKED</span>
          <strong>{telemetry.data?.sources_tracked ?? 0}</strong>
          <small>official publishers</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>LAST INGEST</span>
          <strong style={{ fontSize: 16 }}>
            {telemetry.data?.last_ingest ? formatNewsDate(telemetry.data.last_ingest) : "—"}
          </strong>
          <small>UTC</small>
        </div>
      </div>

      <section className="ioc-table-section" aria-label="Newsroom filters">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Filter the newsroom</h2>
          <span className="ioc-note">{index.state === "ok" ? `${index.data?.total ?? 0} briefing(s)` : "index unavailable"}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {NEWS_CATEGORIES.map((entry) => {
            const active = entry.value === category || (entry.value === "" && category === "");
            const href = entry.value ? `/news?category=${encodeURIComponent(entry.value)}` : "/news";
            return (
              <a
                key={entry.label}
                className="ioc-cta"
                href={href}
                aria-current={active ? "page" : undefined}
                style={active ? { borderColor: "var(--color-accent)", color: "var(--color-accent)" } : undefined}
              >
                {entry.label}
              </a>
            );
          })}
        </div>
        <form method="get" action="/news" role="search" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search briefings by title, verdict or summary"
            aria-label="Search briefings"
            style={{ flex: "1 1 280px", padding: "10px 12px" }}
          />
          <button type="submit" className="ioc-cta">
            SEARCH
          </button>
        </form>
      </section>

      {index.state === "error" ? (
        <div className="workspace-state">
          <strong>NEWSROOM TEMPORARILY UNAVAILABLE</strong>
          <span>The briefing index could not be read. This is a transient failure, not an empty newsroom.</span>
        </div>
      ) : items.length === 0 ? (
        <div className="workspace-state">
          <strong>NO BRIEFINGS MATCH</strong>
          <span>No published briefing matches this filter yet. The newsroom fills on the next scheduled ingest pass.</span>
        </div>
      ) : (
        <div className="ioc-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {items.map((item) => (
            <article key={item.slug} className="ioc-telemetry-card" style={{ borderLeft: `2px solid ${severityAccent(item.severity)}` }}>
              <span className="ioc-note">
                {categoryLabel(item.category)} · {item.severity} · {item.source_name} · {formatNewsDate(item.published_at)}
              </span>
              <h3 className="ioc-section-title" style={{ margin: "8px 0" }}>
                <a href={newsHref(item.slug)}>{item.title}</a>
              </h3>
              <p>{item.verdict}</p>
              <a className="ioc-cta" href={newsHref(item.slug)}>
                OPEN BRIEFING →
              </a>
            </article>
          ))}
        </div>
      )}
      <IntelAlertStrip turnstileSiteKey={getTurnstileSiteKey()} />
    </RouteShell>
  );
}
