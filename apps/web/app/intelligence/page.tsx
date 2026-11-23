import type { Metadata } from "next";
import { IntelligenceShell } from "../components/IntelligenceShell";

export const metadata: Metadata = {
  title: "Threat intelligence",
  description:
    "Evidence-grounded vulnerability, malware, exploit, actor and campaign intelligence with explicit truth states for every claim.",
  alternates: { canonical: "/intelligence" },
  openGraph: { title: "Threat intelligence | ZAYRON-X", url: "/intelligence" },
};

export default function IntelligencePage() { return <IntelligenceShell />; }
