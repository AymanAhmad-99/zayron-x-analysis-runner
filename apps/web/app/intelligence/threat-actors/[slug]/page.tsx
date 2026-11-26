import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreatActorDossierView } from "../../../components/ThreatActorDossierView";
import { getThreatActor } from "../../../lib/threatGraph";
import { RelatedBriefings } from "../../../components/RelatedBriefings";
import { getSiteUrl, isPreviewDeployment } from "../../../lib/siteConfig";
import { buildOpenGraph, resolvePageRobots } from "../../../lib/seo";

/**
 * PHASE 8C — flagship adversary dossier (`/intelligence/threat-actors/:slug`).
 *
 * Server-rendered: the Diamond Model, live correlation, campaigns, the full
 * ATT&CK matrix and the hunting queries are all in the first HTML. A slug the
 * canonical catalog does not contain is a real 404 — never an empty profile.
 */

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getThreatActor(decodeURIComponent(slug));
  const actor = result.data?.actor;
  if (!actor) {
    return {
      title: "Threat actor not found | ZAYRON-X",
      robots: { index: false, follow: false },
    };
  }
  const canonical = `/intelligence/threat-actors/${actor.slug}`;
  const description = `${actor.name}${actor.mitre_id ? ` (${actor.mitre_id})` : ""} — ${actor.motivation}. ${actor.technique_count} documented MITRE ATT&CK techniques, ${actor.live_c2_count} active indicators in the ZAYRON-X live graph.`;
  return {
    title: `${actor.name} — Threat Actor Dossier | ZAYRON-X`,
    description,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: buildOpenGraph({
      title: `${actor.name} — Threat Actor Dossier`,
      description,
      path: canonical,
      type: "article",
    }),
    twitter: { card: "summary_large_image", title: `${actor.name} — Threat Actor Dossier`, description },
  };
}

export default async function ThreatActorDossierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getThreatActor(decodeURIComponent(slug));
  // PHASE 9A (F4) — only a confirmed upstream 404 is a 404. A transport failure
  // throws, so neither Googlebot nor the edge cache can persist a false 404.
  if (result.state === "not_found") notFound();
  if (result.state === "error") throw new Error("Threat actor dossier temporarily unavailable");
  const dossier = result.data;
  if (!dossier) throw new Error("Threat actor dossier temporarily unavailable");

  const site = getSiteUrl();
  const { actor } = dossier;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${actor.name}${actor.mitre_id ? ` (${actor.mitre_id})` : ""} — Adversary Dossier`,
    description: actor.summary,
    url: `${site}/intelligence/threat-actors/${actor.slug}`,
    datePublished: actor.first_seen ?? undefined,
    dateModified: actor.last_seen ?? undefined,
    isAccessibleForFree: true,
    publisher: { "@type": "Organization", name: "ZAYRON-X", url: site },
    about: {
      "@type": "Thing",
      name: actor.name,
      sameAs: actor.mitre_url ?? undefined,
      alternateName: actor.aliases,
    },
    keywords: [
      ...actor.aliases,
      "MITRE ATT&CK",
      actor.mitre_id ?? "",
      ...actor.target_sectors,
    ]
      .filter(Boolean)
      .join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <ThreatActorDossierView dossier={dossier} />
      <RelatedBriefings items={(dossier as any).related_news} />
    </>
  );
}
