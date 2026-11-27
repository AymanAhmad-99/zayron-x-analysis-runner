import type { Metadata } from "next";
import { IntelligenceShell } from "../components/IntelligenceShell";
import { buildOpenGraph, buildWebPageJsonLd } from "../lib/seo";
import { getSiteUrl } from "../lib/siteConfig";

export const metadata: Metadata = {
  title: "Threat intelligence",
  description:
    "Evidence-grounded vulnerability, malware, exploit, actor and campaign intelligence with explicit truth states for every claim.",
  alternates: { canonical: "/intelligence" },
  openGraph: buildOpenGraph({
    title: "Threat intelligence | ZAYRON-X",
    description: "Evidence-grounded vulnerability, malware, exploit, actor and campaign intelligence.",
    path: "/intelligence",
    type: "website",
  }),
};

const DESCRIPTION =
  "Evidence-grounded vulnerability, malware, exploit, actor and campaign intelligence with explicit truth states for every claim.";

/** PHASE 9C — hub pages publish their own primary `WebPage` node. */
export default function IntelligencePage() {
  const jsonLd = buildWebPageJsonLd({
    siteUrl: getSiteUrl(),
    path: "/intelligence",
    name: "Threat intelligence",
    description: DESCRIPTION,
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <IntelligenceShell />
    </>
  );
}
