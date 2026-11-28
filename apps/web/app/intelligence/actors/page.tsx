import type { Metadata } from "next";
import { ThreatActorGraph } from "../../components/ThreatActorGraph";
import { getThreatActors } from "../../lib/threatGraph";
import { isPreviewDeployment } from "../../lib/siteConfig";
import { resolvePageRobots } from "../../lib/seo";

/**
 * PHASE 8C — legacy `/intelligence/actors` alias.
 *
 * The canonical surface is `/intelligence/threat-actors`. This route keeps the old
 * URL working for inbound links while pointing its canonical tag at the new one,
 * so the two pages never compete in the index.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Connected Threat Graph — MITRE ATT&CK Groups",
    description:
      "The complete MITRE ATT&CK Enterprise threat-group catalog with live ZAYRON-X correlation.",
    alternates: { canonical: "/intelligence/threat-actors" },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: false }),
  };
}

export default async function ActorsPage() {
  const initial = await getThreatActors({ limit: 200 });
  return <ThreatActorGraph initial={initial} />;
}
