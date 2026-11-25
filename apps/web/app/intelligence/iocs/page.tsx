import type { Metadata } from "next";
import { IocWorkbench } from "../../components/IocWorkbench";
import { isPreviewDeployment } from "../../lib/siteConfig";
import { resolvePageRobots } from "../../lib/seo";

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
    title: transientState ? "Indicator lookup — ZAYRON-X" : "Live IOC intelligence — ZAYRON-X",
    description:
      "Live, defanged indicators of compromise from OpenSSF/OSV, Feodo Tracker, Spamhaus DROP and OpenPhish — with confidence, decay TTL and firewall-ready EDL counts.",
    alternates: { canonical: "/intelligence/iocs" },
    robots: transientState
      ? { index: false, follow: true }
      : resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: { title: "Live IOC intelligence | ZAYRON-X", url: "/intelligence/iocs" },
  };
}

export default async function IocsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  return <IocWorkbench initialQuery={readQuery(resolved)} />;
}
