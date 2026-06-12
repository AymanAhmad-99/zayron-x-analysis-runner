export const revalidate = 60;

import { getCached } from '@/lib/cache/redis';
import { getAnalysts } from '@/lib/supabase/queries/analysts';
import { getArticles, getCategoriesWithCounts } from '@/lib/supabase/queries/articles';
import { getCVECount, getRecentCVEs } from '@/lib/supabase/queries/cves';
import type { Analyst, Article, CVE } from '@/lib/types';
import { Suspense, cache } from 'react';

import { AnalystPanel } from '@/components/platform/AnalystPanel';
import { CvePanel } from '@/components/platform/CvePanel';
import { IntelCard, IntelEmptyState } from '@/components/platform/IntelCard';
import { SectorWorkspace } from '@/components/platform/SectorWorkspace';

import { ActionableAlerts } from '@/components/platform/ActionableAlerts';
// Phase 2 SaaS Dashboard Core Components
import { InfrastructureRadar } from '@/components/platform/InfrastructureRadar';
import { SitrepExporter } from '@/components/platform/SitrepExporter';

import { AutomatedRoiCalculator } from '@/components/platform/AutomatedRoiCalculator';
import { LiveIntelTicker } from '@/components/platform/LiveIntelTicker';
import { PricingTiers } from '@/components/platform/PricingTiers';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ArrowUpRight, Globe, Layers, Shield } from '@/lib/icons';

// Shared request-level cache to deduplicate parallel fetches
const getHomeData = cache(async () => {
  let articles: Article[] = [];
  let cves: CVE[] = [];
  let analysts: Analyst[] = [];
  let cveCount = 0;
  let categories: { category: string; count: number }[] = [];

  try {
    const results = await Promise.allSettled([
      getCached(process.env, 'home:articles', () => getArticles(1, 20), 300),
      getCached(process.env, 'home:cves', () => getRecentCVEs(20), 300),
      getCached(process.env, 'home:analysts', () => getAnalysts(), 300),
      getCached(process.env, 'home:cve_count', () => getCVECount(), 300),
      getCached(process.env, 'home:categories', () => getCategoriesWithCounts(), 300),
    ]);
    articles = results[0].status === 'fulfilled' ? (results[0].value as Article[]) : [];
    cves = results[1].status === 'fulfilled' ? (results[1].value as CVE[]) : [];
    analysts = results[2].status === 'fulfilled' ? (results[2].value as Analyst[]) : [];
    cveCount = results[3].status === 'fulfilled' ? (results[3].value as number) : 0;
    categories =
      results[4].status === 'fulfilled'
        ? (results[4].value as { category: string; count: number }[])
        : [];
  } catch {}

  return { articles, cves, analysts, cveCount, categories };
});

function StatPillSkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="animate-pulse bg-slate-800 rounded-full w-4 h-4" />
      <div className="space-y-1">
        <div className="animate-pulse bg-slate-800 rounded h-4 w-12" />
        <div className="animate-pulse bg-slate-800 rounded h-3 w-16" />
      </div>
    </div>
  );
}

function StatsFallback() {
  return (
    <div className="flex flex-wrap items-center gap-8 mt-12 pt-8 border-t border-white/5">
      <StatPillSkeleton />
      <StatPillSkeleton />
      <StatPillSkeleton />
      <StatPillSkeleton />
    </div>
  );
}

function SectorWorkspaceFallback() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 space-y-8 animate-pulse">
      <div className="h-10 bg-slate-800 rounded w-1/4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonLoader variant="list" className="h-24 w-full" />
          <SkeletonLoader variant="list" className="h-24 w-full" />
          <SkeletonLoader variant="list" className="h-24 w-full" />
        </div>
        <div className="lg:col-span-1">
          <SkeletonLoader variant="card" className="h-72 w-full" />
        </div>
      </div>
    </div>
  );
}

async function SuspendedStats() {
  const { articles, cveCount, analysts, categories } = await getHomeData();
  const totalCategories = categories.length;

  return (
    <div className="flex flex-wrap items-center gap-8 mt-12 pt-8 border-t border-white/5">
      <StatPill
        icon={<Layers className="w-4 h-4 text-[#733DD9]" />}
        value={articles.length.toLocaleString()}
        label="Briefings"
      />
      <StatPill
        icon={<Shield className="w-4 h-4 text-[#733DD9]" />}
        value={cveCount.toLocaleString()}
        label="CVEs Tracked"
      />
      <StatPill
        icon={<Globe className="w-4 h-4 text-[#733DD9]" />}
        value={analysts.length.toLocaleString()}
        label="Active Nodes"
      />
      <StatPill
        icon={<ArrowUpRight className="w-4 h-4 text-[#733DD9]" />}
        value={totalCategories.toLocaleString()}
        label="Sectors"
      />
    </div>
  );
}

async function SuspendedSectorWorkspace() {
  const { articles, cves, analysts, cveCount } = await getHomeData();

  return (
    <SectorWorkspace
      articleCount={articles.length}
      cveCount={cveCount}
      analystCount={analysts.length}
      briefings={
        articles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Lower-Left: Actionable Alerts Data Table */}
            <div className="lg:col-span-2">
              <ActionableAlerts articles={articles} />
            </div>

            {/* Lower-Right: Sitrep Exporter Visual Card */}
            <div className="lg:col-span-1">
              <SitrepExporter articles={articles} />
            </div>
          </div>
        ) : (
          <IntelEmptyState />
        )
      }
      cveIndex={<CvePanel cves={cves} totalCount={cveCount} />}
      analysts={<AnalystPanel analysts={analysts} />}
    />
  );
}

export default async function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* ═══════════════════════════════════════════════
          HERO — Executive Briefing Strip
          ═══════════════════════════════════════════ */}
      <section className="bg-slate-950/60 backdrop-blur-xl py-24 md:py-36 border-b border-white/5">
        <div className="max-w-[1100px] mx-auto px-6 text-center font-sans">
          {/* Subheading Badge */}
          <div className="inline-flex items-center gap-2 mb-10 px-4 py-1.5 border border-white/5 bg-slate-900/40 rounded-none shadow-none">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#733DD9] animate-pulse" />
            </span>
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-slate-100">
              Sovereign Intelligence Authority
            </span>
          </div>

          <h1 className="text-[2.5rem] sm:text-[4.2rem] font-sans font-black leading-none uppercase select-none mb-12 text-center text-slate-100 tracking-tight max-w-4xl mx-auto">
            SOVEREIGN PERIMETER.
            <br className="hidden sm:inline" /> INSTITUTIONAL CTI DEPLOYED.
          </h1>

          {/* Clean Portal CTA Buttons with Hover Brutalism */}
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/intelligence/threat-intelligence"
              className="bg-[#733DD9] text-white px-8 py-3 text-xs font-bold uppercase tracking-wider rounded hover:bg-white hover:text-[#733DD9] transition-all duration-300 shadow-none cursor-pointer"
            >
              ACCESS DOSSIER BRIEFINGS
            </a>
            <a
              href="/contact"
              className="bg-transparent border border-white/10 text-slate-300 px-8 py-3 text-xs font-bold uppercase tracking-wider rounded hover:bg-white/5 hover:text-white hover:border-[#733DD9] transition-all duration-300 shadow-none cursor-pointer"
            >
              REQUEST ASSESSMENT
            </a>
          </div>
        </div>
      </section>

      {/* Live Ingestion Data Stream (Bloomberg Terminal psychological hook) */}
      <LiveIntelTicker />

      {/* ═══════════════════════════════════════════════
          DASHBOARD TELEMETRY GATEWAY
          ═══════════════════════════════════════════════ */}
      <section className="bg-slate-950/40 backdrop-blur-xl py-16 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row items-stretch justify-between gap-10">
            <div className="max-w-xl flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#733DD9]">
                  Active Sovereign Perimeter
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight uppercase font-mono">
                Autonomous Risk Posture Monitoring
              </h2>
            </div>

            {/* Telemetry Panels: Posture Dial & Infrastructure Radar */}
            <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto shrink-0 items-stretch">
              {/* Sovereign Risk Posture Score Gauge */}
              <div className="bg-slate-950/60 backdrop-blur-xl border border-white/5 rounded p-6 flex flex-col items-center justify-center text-center shadow-none hover:border-[#733DD9]/40 transition-all duration-300 min-w-[280px] shrink-0 font-sans">
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#733DD9] font-black mb-3">
                  Overall Threat Posture
                </span>

                <div className="relative flex items-center justify-center w-36 h-36">
                  {/* SVG Radial Meter */}
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Track */}
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="rgba(255, 255, 255, 0.02)"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {/* Active Indicator */}
                    <circle
                      cx="72"
                      cy="72"
                      r="58"
                      stroke="#733DD9"
                      strokeWidth="8"
                      strokeDasharray="364.4"
                      strokeDashoffset="47.3" /* Represents 87% progress */
                      strokeLinecap="square"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center font-mono">
                    <span className="text-3xl font-extrabold text-slate-100">87%</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#733DD9] font-black mt-0.5 animate-pulse">
                      SECURE
                    </span>
                  </div>
                </div>

                <span className="text-[9px] text-slate-400 mt-4 font-mono font-bold leading-normal max-w-[200px]">
                  SOVEREIGN PERIMETER: ACTIVE
                </span>
              </div>

              {/* Infrastructure Radar Node Monitoring */}
              <InfrastructureRadar />
            </div>
          </div>

          {/* Stat strip wrapped in Suspense */}
          <Suspense fallback={<StatsFallback />}>
            <SuspendedStats />
          </Suspense>
        </div>
      </section>

      {/* Row 2: Automation Risks */}
      <section id="automation-risks" className="border-b border-white/5">
        <AutomatedRoiCalculator />
      </section>

      {/* Row 2 Priority (directly under Automation Risks): Pricing Tiers */}
      <section id="pricing-tiers" className="border-b border-white/5">
        <PricingTiers />
      </section>

      {/* ═══════════════════════════════════════════════
          SECTOR WORKSPACE wrapped in Suspense
          ═══════════════════════════════════════════════ */}
      <Suspense fallback={<SectorWorkspaceFallback />}>
        <SuspendedSectorWorkspace />
      </Suspense>
    </main>
  );
}

/* ─── Stat Pill ─── */
function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-[#94A3B8]">{icon}</div>
      <div>
        <span className="text-[1.1rem] font-bold text-slate-100 font-mono tabular-nums">
          {value}
        </span>
        <span className="text-[0.72rem] text-[#94A3B8] ml-1.5 font-medium">{label}</span>
      </div>
    </div>
  );
}
