import type { Metadata } from "next";
import { RouteShell } from "../../components/RouteShell";
import { getRegions, regionHref } from "../../lib/hubs";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/** PHASE 9B — regional threat posture index from live Radar + MITRE telemetry. */

export const revalidate = 300;

export function generateMetadata(): Metadata {
  const description =
    "Regional cyber threat posture computed from live Radar-enriched C2 infrastructure and the MITRE target regions documented for threat actors and campaigns.";
  return {
    title: "Regional Threat Posture Hubs | ZAYRON-X",
    description,
    alternates: { canonical: "/intelligence/regions" },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({ title: "Regional Threat Posture | ZAYRON-X", description, path: "/intelligence/regions", type: "website" }),
  };
}

export default async function RegionsPage() {
  const result = await getRegions();
  const items = result.data?.items ?? [];
  const graph = buildLinkedJsonLdGraph({
    siteUrl: getSiteUrl(),
    path: "/intelligence/regions",
    primary: {
      "@type": "CollectionPage",
      name: "Regional Threat Posture",
      description: "Live C2 hosting geography plus documented adversary target regions.",
      numberOfItems: items.length,
    },
  });

  return (
    <RouteShell
      title="Regional Threat Posture"
      eyebrow="INTELLIGENCE / REGIONS"
      activeHref="/intelligence/iocs"
      description="Posture per region, derived from live active C2 infrastructure geography and the target regions MITRE documents for actors and campaigns."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />
      {result.state === "error" ? (
        <div className="workspace-state">
          <strong>REGIONAL POSTURE TEMPORARILY UNAVAILABLE</strong>
          <span>The regional index could not be read. This is a transient failure, not an empty map.</span>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {items.map((region) => (
            <a key={region.code} className="ioc-telemetry-card" href={regionHref(region.code)}>
              <span>{region.code.toUpperCase()}</span>
              <strong>{region.active_c2}</strong>
              <small>
                {region.name} · {region.actors} actors · {region.campaigns} campaigns · active C2
              </small>
            </a>
          ))}
        </div>
      )}
    </RouteShell>
  );
}
