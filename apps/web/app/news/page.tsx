import type { Metadata } from "next";
import { RouteShell } from "../components/RouteShell";
import { IntelAlertStrip } from "../components/IntelAlertStrip";
import {
  getNewsIndex,
  getNewsTelemetry,
  NEWS_CATEGORIES,
  categoryLabel,
  formatNewsDate,
  newsCoverUrl,
  newsHref,
} from "../lib/news";
import { getSiteUrl, getTurnstileSiteKey, isPreviewDeployment } from "../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../lib/seo";

/**
 * PHASE 10A — `/news`, the editorial newsroom.
 *
 * Every briefing carries its own branded cover, rendered on demand by
 * `/api/news-cover/[slug]` from that briefing's metadata. The lead story uses a
 * 16:9 editorial split, the grid uses the same asset at a fixed aspect ratio so
 * nothing shifts while an image loads, and the subscribe strip stays below.
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
  const [lead, ...rest] = items;
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

      <div className="ns-meta">
        <div>
          <span>PUBLISHED BRIEFINGS</span>
          <strong>{telemetry.data?.published_briefings ?? 0}</strong>
        </div>
        <div>
          <span>LINKED ENTITIES</span>
          <strong>{telemetry.data?.linked_entities ?? 0}</strong>
        </div>
        <div>
          <span>SOURCES TRACKED</span>
          <strong>{telemetry.data?.sources_tracked ?? 0}</strong>
        </div>
        <div>
          <span>LAST INGEST (UTC)</span>
          <strong>{telemetry.data?.last_ingest ? formatNewsDate(telemetry.data.last_ingest) : "—"}</strong>
        </div>
      </div>

      <section className="ns-filters" aria-label="Newsroom filters">
        <div className="ns-filter-row">
          <span className="ns-filter-label">CATEGORY</span>
          {NEWS_CATEGORIES.map((entry) => {
            const active = entry.value === category || (entry.value === "" && category === "");
            const href = entry.value ? `/news?category=${encodeURIComponent(entry.value)}` : "/news";
            return (
              <a key={entry.label} className={`ns-filter${active ? " active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
                {entry.label}
              </a>
            );
          })}
        </div>
        <form method="get" action="/news" role="search" className="ns-search">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search briefings by title, verdict or summary"
            aria-label="Search briefings"
          />
          <button type="submit">Search</button>
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
        <>
          {lead ? (
            <article className="ns-lead">
              <a className="ns-lead-media" href={newsHref(lead.slug)} tabIndex={-1} aria-hidden="true">
                <img
                  src={newsCoverUrl(lead.slug)}
                  alt=""
                  width={1200}
                  height={675}
                  loading="eager"
                  decoding="async"
                />
              </a>
              <div className="ns-lead-body">
                <span className="ns-kicker">
                  LEAD BRIEFING · {categoryLabel(lead.category)} · {lead.severity}
                </span>
                <h2>
                  <a href={newsHref(lead.slug)}>{lead.title}</a>
                </h2>
                <p>{lead.verdict}</p>
                <div className="ns-meta-line">
                  <span>{lead.source_name}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatNewsDate(lead.published_at)}</span>
                </div>
                <a className="ns-cta" href={newsHref(lead.slug)}>
                  Read the briefing <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          ) : null}

          {rest.length > 0 ? (
            <div className="ns-grid">
              {rest.map((item) => (
                <article key={item.slug} className="ns-card">
                  <a className="ns-card-media" href={newsHref(item.slug)} tabIndex={-1} aria-hidden="true">
                    <img
                      src={newsCoverUrl(item.slug)}
                      alt=""
                      width={1200}
                      height={675}
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                  <div className="ns-card-body">
                    <span className="ns-kicker">
                      {categoryLabel(item.category)} · {item.severity}
                    </span>
                    <h3>
                      <a href={newsHref(item.slug)}>{item.title}</a>
                    </h3>
                    <p>{item.verdict}</p>
                    <div className="ns-meta-line">
                      <span>{item.source_name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatNewsDate(item.published_at)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}

      <IntelAlertStrip turnstileSiteKey={getTurnstileSiteKey()} />
    </RouteShell>
  );
}
