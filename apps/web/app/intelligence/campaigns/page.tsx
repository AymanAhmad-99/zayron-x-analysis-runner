import type { Metadata } from "next";
import { CampaignGraph } from "../../components/CampaignGraph";
import { getCampaigns } from "../../lib/threatGraph";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { resolvePageRobots } from "../../lib/seo";

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
    title: "Campaign Intelligence — MITRE ATT&CK | ZAYRON-X",
    description: DESCRIPTION,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: { title: "Campaign Intelligence | ZAYRON-X", description: DESCRIPTION, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title: "Campaign Intelligence | ZAYRON-X", description: DESCRIPTION },
  };
}

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export default async function CampaignsPage() {
  const initial = await getCampaigns({ limit: 100 });
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
