import type { Metadata } from "next";
import { IntelligenceShell } from "../components/IntelligenceShell";
import { buildOpenGraph } from "../lib/seo";

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

export default function IntelligencePage() { return <IntelligenceShell />; }
