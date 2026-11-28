import type { Metadata } from "next";
import { IocWorkbench } from "../../components/IocWorkbench";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildWebPageJsonLd, resolvePageRobots } from "../../lib/seo";

type SearchParams = Record<string, string | string[] | undefined>;

function readQuery(searchParams?: SearchParams): string {
  const raw = searchParams?.q;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.slice(0, 512) : "";
}

/**
 * PHASE 7C — SAFE 3-TIER IOC SEO.
 *
 * Tier 1 (this page) is indexable: it is a stable live-intelligence workspace.
 * A transient single-indicator lookup (`?q=…`) is an unbounded, per-value URL
 * surface, so those states are `noindex, follow` — that is what keeps the page
 * out of Google's Scaled Content Abuse pattern while still letting a shared
 * lookup URL pass link equity.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}): Promise<Metadata> {
  const resolved = searchParams ? await searchParams : undefined;
  const query = readQuery(resolved);
  const transientState = query.length > 0;
  return {
    title: transientState ? "Indicator lookup" : "Live IOC intelligence",
    description:
      "Live, defanged indicators of compromise from OpenSSF/OSV, Feodo Tracker, Spamhaus DROP and OpenPhish — with confidence, decay TTL and firewall-ready EDL counts.",
    alternates: { canonical: "/intelligence/iocs" },
    robots: transientState
      ? { index: false, follow: true }
      : resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: {
      title: "Live IOC intelligence | ZAYRON-X",
      url: "/intelligence/iocs",
      // PHASE 7D — one card for the whole workbench, shared by every post.
      images: [{ url: "/api/og/ioc-pulse", width: 1200, height: 630, alt: "ZAYRON-X live IOC pulse" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Live IOC intelligence | ZAYRON-X",
      images: ["/api/og/ioc-pulse"],
    },
  };
}

export default async function IocsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  // PHASE 9C — the workspace had no primary node of its own. A transient
  // `?q=` lookup is `noindex` at the metadata level, so the node is emitted only
  // for the stable, indexable tier-1 URL.
  const query = readQuery(resolved);
  if (query.length > 0) return <IocWorkbench initialQuery={query} />;
  const jsonLd = buildWebPageJsonLd({
    siteUrl: getSiteUrl(),
    path: "/intelligence/iocs",
    name: "Live IOC intelligence",
    description:
      "Live, defanged indicators of compromise with confidence, decay TTL and firewall-ready EDL counts.",
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <IocWorkbench initialQuery={query} />
    </>
  );
}
