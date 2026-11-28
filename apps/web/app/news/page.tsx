import type { Metadata } from "next";
import { RouteShell } from "../components/RouteShell";
import { IntelAlertStrip } from "../components/IntelAlertStrip";
import { EditorialNewsArtwork } from "../components/EditorialNewsArtwork";
import { GlobalWire } from "../components/GlobalWire";
import {
  getNewsIndex,
  getNewsTelemetry,
  NEWS_CATEGORIES,
  categoryLabel,
  formatNewsDate,
  newsHref,
} from "../lib/news";
import { newsArtEntity } from "../lib/newsArt";
import { getWireFeed } from "../lib/wire";
import { getSiteUrl, getTurnstileSiteKey, isPreviewDeployment } from "../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../lib/seo";

/**
 * PHASE 10A-POLISH — `/news`, the editorial newsroom.
 *
 * Every briefing carries its own retina-sharp vector cover, seeded from its slug
 * and composed by category. The lead story is a 52/48 split, the grid is a
 * three-up card wall, and the only masthead metric is the real published count —
 * there is no empty KPI bar and no zero on the page.
 */

type Props = {
  searchParams: Promise<{ category?: string; q?: string; view?: string; region?: string; tier?: string }>;
};

export const revalidate = 300;

/** 200-channel owner import lands here; raw wire rows are never indexed. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const wireView = params.view === "wire";
  const description =
    "Source-verified cybersecurity briefings with the ZAYRON-X connected threat graph attached: CVSS, EPSS, CISA KEV state, linked actors, malware families and ATT&CK techniques.";
  return {
    title: "Neural Newsroom — Verified Cybersecurity Briefings",
    description,
    alternates: { canonical: "/news" },
    // SEO PROTECTION GATE: the Global Wire tab is a provenance-labelled raw feed,
    // so it is `noindex, follow` even though it lives inside `/news`.
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: !wireView }),
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
  const view = params.view === "wire" ? "wire" : "briefings";
  const region = String(params.region ?? "").trim().toUpperCase();
  const tier = String(params.tier ?? "").trim().toUpperCase();
  const [telemetry, index] = await Promise.all([
    getNewsTelemetry(),
    getNewsIndex({ category, q: query, limit: 30 }),
  ]);
  const wire = view === "wire" ? await getWireFeed({ region, tier, limit: 30 }) : null;

  const items = index.state === "ok" ? index.data?.items ?? [] : [];
  const [lead, ...rest] = items;
  const published = telemetry.data?.published_briefings ?? index.data?.total ?? items.length;
  const sources = telemetry.data?.sources_tracked ?? 0;

  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: getSiteUrl(),
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
      title={view === "wire" ? "Global Wire" : "Neural Newsroom"}
      eyebrow={view === "wire" ? "INTELLIGENCE / OSINT WIRE" : "INTELLIGENCE / NEWSROOM"}
      activeHref="/news"
      description={
        view === "wire"
          ? "Live multilingual OSINT signals from public Telegram channels, GitHub security radars and open regional feeds — provenance-labelled and separated from verified briefings."
          : "Source-verified briefings synthesized against the live ZAYRON-X catalog. Every briefing names its publisher and attaches only catalog-backed telemetry."
      }
      contextNotice="A briefing is a ZAYRON-X synthesis of a publisher's report plus stored catalog facts. It never republishes a third-party article body and never asserts an exploitation state the catalog does not hold."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav className="ns-switch" aria-label="Newsroom view">
        <a className={`ns-switch-tab${view === "briefings" ? " active" : ""}`} href="/news" aria-current={view === "briefings" ? "page" : undefined}>
          Editorial Briefings
        </a>
        <a
          className={`ns-switch-tab${view === "wire" ? " active" : ""}`}
          href="/news?view=wire"
          aria-current={view === "wire" ? "page" : undefined}
        >
          Global Wire
        </a>
      </nav>

      {view === "wire" ? (
        <GlobalWire
          feed={wire && wire.state === "ok" ? wire.data ?? null : null}
          error={Boolean(wire && wire.state === "error")}
          region={region}
          tier={tier}
        />
      ) : (
        <>
      <p className="ns-subhead">
        <strong>{published > 0 ? `${published} Verified Briefings` : "Verified briefings"}</strong>
        <span className="dot" aria-hidden="true">
          ·
        </span>
        <span>Updated continuously</span>
        {sources > 0 ? (
          <>
            <span className="dot" aria-hidden="true">
              ·
            </span>
            <span>{sources} sources tracked</span>
          </>
        ) : null}
      </p>

      <section className="ns-filters" aria-label="Newsroom filters">
        <div className="ns-filter-row">
          {NEWS_CATEGORIES.map((entry) => {
            const active = entry.value === category || (entry.value === "" && category === "");
            const href = entry.value ? `/news?category=${encodeURIComponent(entry.value)}` : "/news";
            return (
              <a
                key={entry.label}
                className={`ns-filter${active ? " active" : ""}`}
                href={href}
                aria-current={active ? "page" : undefined}
              >
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
            placeholder="Search briefings"
            aria-label="Search briefings by title, verdict or summary"
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
              <a className="ns-lead-media" href={newsHref(lead.slug)} tabIndex={-1}>
                <EditorialNewsArtwork slug={lead.slug} category={lead.category} entity={newsArtEntity(lead)} />
              </a>
              <div className="ns-lead-body">
                <span className="ns-kicker">
                  Featured briefing · {lead.source_name}
                </span>
                <h2>
                  <a href={newsHref(lead.slug)}>{lead.title}</a>
                </h2>
                <p>{lead.verdict}</p>
                <div className="ns-meta-line">
                  <span>{categoryLabel(lead.category)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{lead.severity}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatNewsDate(lead.published_at)}</span>
                </div>
                <a className="ns-cta" href={newsHref(lead.slug)}>
                  Read full briefing <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          ) : null}

          {rest.length > 0 ? (
            <div className="ns-grid">
              {rest.map((item) => (
                <article key={item.slug} className="ns-card">
                  <a className="ns-card-media" href={newsHref(item.slug)} tabIndex={-1}>
                    <EditorialNewsArtwork slug={item.slug} category={item.category} entity={newsArtEntity(item)} />
                  </a>
                  <div className="ns-card-body">
                    <span className="ns-card-eyebrow">
                      {categoryLabel(item.category)} · {item.severity}
                    </span>
                    <h3>
                      <a href={newsHref(item.slug)}>{item.title}</a>
                    </h3>
                    <p>{item.verdict}</p>
                    <div className="ns-card-foot">
                      <span>
                        {item.source_name} · {formatNewsDate(item.published_at)}
                      </span>
                      <span className="ns-card-arrow" aria-hidden="true">
                        →
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
        </>
      )}

      <IntelAlertStrip turnstileSiteKey={getTurnstileSiteKey()} />
    </RouteShell>
  );
}
