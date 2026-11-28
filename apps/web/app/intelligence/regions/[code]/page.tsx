import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteShell } from "../../../components/RouteShell";
import { getRegion } from "../../../lib/hubs";
import { newsHref } from "../../../lib/news";
import { getSiteUrl, isPreviewDeployment } from "../../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../../lib/seo";

/** PHASE 9B — one regional posture hub. */

type Props = { params: Promise<{ code: string }> };
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const result = await getRegion(decodeURIComponent(code));
  if (result.state !== "ok" || !result.data) {
    return {
      title: "Region not found",
      robots: { index: false, follow: false },
      alternates: { canonical: `/intelligence/regions/${encodeURIComponent(code)}` },
    };
  }
  const region = result.data;
  const description = `${region.name} threat posture: ${region.active_c2} active C2 indicators hosted in region, ${region.actors} documented actors and ${region.campaigns} campaigns targeting it.`;
  return {
    title: `${region.name} Threat Posture`,
    description,
    alternates: { canonical: `/intelligence/regions/${region.code}` },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: `${region.name} Threat Posture | ZAYRON-X`,
      description,
      path: `/intelligence/regions/${region.code}`,
      type: "website",
    }),
  };
}

export default async function RegionPage({ params }: Props) {
  const { code } = await params;
  const result = await getRegion(decodeURIComponent(code));
  if (result.state === "not_found") notFound();
  if (result.state === "error" || !result.data) throw new Error("Regional hub temporarily unavailable");
  const region = result.data;
  const graph = buildLinkedJsonLdGraph({
    siteUrl: getSiteUrl(),
    path: `/intelligence/regions/${region.code}`,
    primary: {
      "@type": "CollectionPage",
      name: `${region.name} Threat Posture`,
      description: `Live infrastructure geography and documented adversary activity for ${region.name}.`,
      numberOfItems: region.actor_list.length + region.campaign_list.length,
    },
  });

  return (
    <RouteShell
      title={`${region.name} Threat Posture`}
      eyebrow={`INTELLIGENCE / REGIONS / ${region.code.toUpperCase()}`}
      activeHref="/intelligence/iocs"
      description={`${region.active_c2} active C2 indicator(s) hosted in region, ${region.actors} actor(s) and ${region.campaigns} campaign(s) documented targeting it.`}
      contextNotice="Geography is the hosting location of active infrastructure or the region MITRE documents as targeted. It is not an attribution of a state actor."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />

      <div className="ioc-telemetry">
        <div className="ioc-telemetry-card">
          <span>ACTIVE C2</span>
          <strong>{region.active_c2}</strong>
          <small>indicators hosted in region</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>THREAT ACTORS</span>
          <strong>{region.actors}</strong>
          <small>documented targeting</small>
        </div>
        <div className="ioc-telemetry-card">
          <span>CAMPAIGNS</span>
          <strong>{region.campaigns}</strong>
          <small>documented operations</small>
        </div>
      </div>

      {region.top_countries.length > 0 ? (
        <section className="ioc-table-section" aria-label="Hosting countries">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Active C2 by country</h2>
          </div>
          <table className="ioc-table">
            <thead>
              <tr>
                <th>Country</th>
                <th>Active indicators</th>
              </tr>
            </thead>
            <tbody>
              {region.top_countries.map((row) => (
                <tr key={row.country}>
                  <td>{row.country}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {region.actor_list.length > 0 ? (
        <section className="ioc-table-section" aria-label="Actors targeting the region">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Actors documented targeting {region.name}</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {region.actor_list.map((actor) => (
              <a key={actor.slug} className="ioc-cta" href={`/intelligence/threat-actors/${encodeURIComponent(actor.slug)}`}>
                {actor.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {region.campaign_list.length > 0 ? (
        <section className="ioc-table-section" aria-label="Campaigns targeting the region">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Campaigns targeting {region.name}</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {region.campaign_list.map((campaign) => (
              <a key={campaign.slug} className="ioc-cta" href={`/intelligence/campaigns/${encodeURIComponent(campaign.slug)}`}>
                {campaign.name}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {region.related_news.length > 0 ? (
        <section className="ioc-table-section" aria-label="Related intelligence briefings">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Related intelligence briefings</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {region.related_news.map((briefing) => (
              <a key={briefing.slug} className="ioc-cta" href={newsHref(briefing.slug)}>
                {briefing.title}
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </RouteShell>
  );
}
