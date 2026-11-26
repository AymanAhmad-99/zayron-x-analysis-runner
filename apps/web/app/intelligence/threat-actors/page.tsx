import type { Metadata } from "next";
import { ThreatActorGraph } from "../../components/ThreatActorGraph";
import { getThreatActors } from "../../lib/threatGraph";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/**
 * PHASE 8C — `/intelligence/threat-actors`.
 *
 * Server-rendered so the crawler receives the canonical MITRE ATT&CK catalog and
 * the live-correlation verdicts in the first HTML. The underlying
 * `/api/v1/threat-actors` read is edge-cached for 300s.
 */

const DESCRIPTION =
  "The complete MITRE ATT&CK Enterprise threat-group catalog, correlated per read against live ZAYRON-X C2 infrastructure, CISA KEV membership and verified public proof-of-concept repositories.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = "/intelligence/threat-actors";
  return {
    title: "Connected Threat Graph — MITRE ATT&CK Groups | ZAYRON-X",
    description: DESCRIPTION,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: "Connected Threat Graph | ZAYRON-X",
      description: DESCRIPTION,
      path: canonical,
      type: "website",
    }),
    twitter: { card: "summary_large_image", title: "Connected Threat Graph | ZAYRON-X", description: DESCRIPTION },
  };
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default async function ThreatActorsPage() {
  const initial = await getThreatActors({ limit: 200 });
  const site = getSiteUrl();
  const summary = initial.data?.summary;
  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path: "/intelligence/threat-actors",
    primary: {
      "@type": "CollectionPage",
      name: "Connected Threat Graph — MITRE ATT&CK Groups",
      description: DESCRIPTION,
      isAccessibleForFree: true,
      mainEntity: {
      "@type": "Dataset",
      name: "ZAYRON-X connected threat graph",
      description:
        "Canonical MITRE ATT&CK Enterprise intrusion sets joined to live malware-family indicators, CISA KEV membership and verified public proof-of-concept repositories.",
      variableMeasured: ["Documented ATT&CK techniques", "Active indicators per documented family", "KEV-linked CVEs", "Attributed campaigns"],
      ...(summary
        ? {
            size: summary.total_actors,
            measurementTechnique: `LIVE_OBSERVED=${summary.live_observed}; CANONICAL_PROFILE=${summary.canonical_profiles}; CAMPAIGNS=${summary.total_campaigns}`,
          }
          : {}),
      },
    },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <ThreatActorGraph initial={initial} />
    </>
  );
}
