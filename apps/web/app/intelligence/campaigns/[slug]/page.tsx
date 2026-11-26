import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CampaignDossierView } from "../../../components/CampaignDossierView";
import { getCampaign } from "../../../lib/threatGraph";
import { getSiteUrl, isPreviewDeployment } from "../../../lib/siteConfig";
import { resolvePageRobots } from "../../../lib/seo";

/**
 * PHASE 8C — campaign dossier (`/intelligence/campaigns/:slug`). Server-rendered;
 * an unknown slug is a real 404.
 */

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCampaign(decodeURIComponent(slug));
  const campaign = result.data?.campaign;
  if (!campaign) {
    return { title: "Campaign not found | ZAYRON-X", robots: { index: false, follow: false } };
  }
  const canonical = `/intelligence/campaigns/${campaign.slug}`;
  const description = `${campaign.name}${campaign.mitre_id ? ` (${campaign.mitre_id})` : ""} — ${campaign.technique_count} documented MITRE ATT&CK techniques${campaign.actors.length ? `, attributed to ${campaign.actors.map((actor) => actor.name).join(", ")}` : ""}.`;
  return {
    title: `${campaign.name} — Campaign Dossier | ZAYRON-X`,
    description,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: { title: `${campaign.name} — Campaign Dossier`, description, url: canonical, type: "article" },
    twitter: { card: "summary_large_image", title: `${campaign.name} — Campaign Dossier`, description },
  };
}

export default async function CampaignDossierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getCampaign(decodeURIComponent(slug));
  const dossier = result.data;
  if (!dossier) notFound();

  const site = getSiteUrl();
  const { campaign } = dossier;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${campaign.name}${campaign.mitre_id ? ` (${campaign.mitre_id})` : ""} — Campaign Dossier`,
    description: campaign.summary,
    url: `${site}/intelligence/campaigns/${campaign.slug}`,
    datePublished: campaign.first_seen ?? undefined,
    dateModified: campaign.last_seen ?? undefined,
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: "ZAYRON-X", url: site },
    about: { "@type": "Thing", name: campaign.name, sameAs: campaign.mitre_url ?? undefined },
    keywords: ["MITRE ATT&CK", campaign.mitre_id ?? "", ...campaign.actors.map((actor) => actor.name)]
      .filter(Boolean)
      .join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <CampaignDossierView dossier={dossier} />
    </>
  );
}
