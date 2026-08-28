import { Hero } from "@/components/Hero";
import { ValueGrid } from "@/components/ValueGrid";
import { StandardsRail } from "@/components/StandardsRail";
import { MethodPipeline } from "@/components/MethodPipeline";
import { ThreatNetworkGraph } from "@/components/ThreatNetworkGraph";
import { IntelligenceLandscape } from "@/components/IntelligenceLandscape";
import { ResearchArchive } from "@/components/ResearchArchive";
import { ActionPipeline } from "@/components/ActionPipeline";
import { UnderstatedPricing } from "@/components/UnderstatedPricing";
import { TrustMatrix } from "@/components/TrustMatrix";

export const revalidate = 10;

export default async function Home() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://zayron-x-api.aabusabih.workers.dev';
  let articles: Record<string, unknown>[] = [];
  let events: Record<string, unknown>[] = [];

  try {
    const [artRes, feedRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/articles?limit=6`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/v1/feed?limit=6`, { next: { revalidate: 30 } }),
    ]);
    if (artRes.ok) articles = (await artRes.json())?.data || [];
    if (feedRes.ok) events = (await feedRes.json())?.data || [];
  } catch (err) {
    console.error('Failed to fetch homepage live data', err);
  }

  const featuredArticle = articles[0];

  return (
    <div className="flex flex-col w-full bg-[#F5F4F0] text-[#111214]">
      {/* Chapter 01 — Identity */}
      <Hero />

      {/* Chapter 02 — Proof / Standards Identity */}
      <StandardsRail />

      {/* Chapter 03 — Value */}
      <ValueGrid />

      {/* Chapter 04 — Method */}
      <MethodPipeline />

      {/* Chapter 05 — Graph */}
      <ThreatNetworkGraph />

      {/* Chapter 06 — Intelligence */}
      <IntelligenceLandscape events={events} article={featuredArticle} />

      {/* Chapter 07 — Research */}
      <ResearchArchive />

      {/* Chapter 08 — Action */}
      <ActionPipeline />

      {/* Chapter 09 — Price */}
      <UnderstatedPricing />

      {/* Chapter 10 — Trust */}
      <TrustMatrix />
    </div>
  );
}
