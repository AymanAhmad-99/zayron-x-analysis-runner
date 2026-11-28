import type { Metadata } from "next";
import { CampaignGraph } from "../../components/CampaignGraph";
import { getCampaigns } from "../../lib/threatGraph";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/**
 * PHASE 8C — `/intelligence/campaigns`.
 *
 * Canonical MITRE ATT&CK campaigns, server-rendered with attribution and
 * activity tier already resolved by `/api/v1/campaigns` (edge-cached 300s).
 */

const DESCRIPTION =
  "Canonical MITRE ATT&CK campaigns attributed bidirectionally to threat groups, documented tooling, targeted sectors and linked CVEs, with live ZAYRON-X observation state.";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = "/intelligence/campaigns";
  return {
    title: "Campaign Intelligence — MITRE ATT&CK",
    description: DESCRIPTION,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: "Campaign Intelligence | ZAYRON-X",
      description: DESCRIPTION,
      path: canonical,
      type: "website",
    }),
    twitter: { card: "summary_large_image", title: "Campaign Intelligence | ZAYRON-X", description: DESCRIPTION },
  };
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default async function CampaignsPage() {
  // PHASE 9C — SSR payload budget. The Worker renders the first page only; the
  // full 56-campaign catalog stays reachable through the API and the client
  // filter. Rendering every row (with its 1,600-character narrative) on the
  // first byte was the dominant `Error 1102` cost on this route.
  const initial = await getCampaigns({ limit: 40 });
  const site = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Campaign Intelligence — MITRE ATT&CK",
    description: DESCRIPTION,
    url: `${site}/intelligence/campaigns`,
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: "ZAYRON-X", url: site },
    mainEntity: {
      "@type": "Dataset",
      name: "ZAYRON-X campaign index",
      description: "MITRE ATT&CK Enterprise campaigns with bidirectional group attribution and documented technique coverage.",
      ...(initial.data ? { size: initial.data.items.length } : {}),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <CampaignGraph initial={initial} />
    </>
  );
}
