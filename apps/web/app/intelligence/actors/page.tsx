import type { Metadata } from "next";
import { ThreatActorList } from "../../components/ThreatActorList";

export const metadata: Metadata = {
  title: "Threat actors",
  description: "Tracked threat actors with source-grounded attribution, aliases and assessment status.",
  alternates: { canonical: "/intelligence/actors" },
};

export default function ActorsPage() { return <ThreatActorList />; }
