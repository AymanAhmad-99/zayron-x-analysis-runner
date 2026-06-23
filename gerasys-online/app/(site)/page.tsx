export const revalidate = 60;

import { getCached } from '@/lib/cache/redis';
import { getAnalysts } from '@/lib/supabase/queries/analysts';
import { getArticles, getCategoriesWithCounts } from '@/lib/supabase/queries/articles';
import { getCVECount, getRecentCVEs } from '@/lib/supabase/queries/cves';
import type { Analyst, Article, CVE } from '@/lib/types';
import { Suspense, cache } from 'react';

import { AnalystPanel } from '@/components/platform/AnalystPanel';
import { CvePanel } from '@/components/platform/CvePanel';
import { IntelEmptyState } from '@/components/platform/IntelCard';
import { SectorWorkspace } from '@/components/platform/SectorWorkspace';

import { ActionableAlerts } from '@/components/platform/ActionableAlerts';
import { SitrepExporter } from '@/components/platform/SitrepExporter';

import { AutomatedRoiCalculator } from '@/components/platform/AutomatedRoiCalculator';
import { LiveIntelTicker } from '@/components/platform/LiveIntelTicker';
import { PricingTiers } from '@/components/platform/PricingTiers';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ArrowUpRight, Globe, Layers, Shield } from '@/lib/icons';

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

function formatSignalDate(date: string | Date | null | undefined) {
  if (!date) return 'Updating';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatPillSkeleton() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="animate-pulse bg-neutral-200 rounded-full w-4 h-4" />
      <div className="space-y-1">
        <div className="animate-pulse bg-neutral-200 rounded h-4 w-12" />
        <div className="animate-pulse bg-neutral-200 rounded h-3 w-16" />
      </div>
    </div>
  );
}

function StatsFallback() {
  return (
    <div className="flex flex-wrap items-center gap-8">
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
    <div className="flex flex-wrap items-center gap-8">
      <StatPill
        icon={<Layers className="w-4 h-4 text-[var(--color-accent-intelligence)]" />}
        value={articles.length.toLocaleString()}
        label="Briefings"
      />
      <StatPill
        icon={<Shield className="w-4 h-4 text-[var(--color-accent-intelligence)]" />}
        value={cveCount.toLocaleString()}
        label="CVEs Tracked"
      />
      <StatPill
        icon={<Globe className="w-4 h-4 text-[var(--color-accent-intelligence)]" />}
        value={analysts.length.toLocaleString()}
        label="Analysts"
      />
      <StatPill
        icon={<ArrowUpRight className="w-4 h-4 text-[var(--color-accent-intelligence)]" />}
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
            <div className="lg:col-span-2">
              <ActionableAlerts articles={articles} />
            </div>
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
  const { articles, cves, analysts, cveCount, categories } = await getHomeData();
  const nationsRepresented = new Set(analysts.map((analyst) => analyst.nationality).filter(Boolean))
    .size;
  const latestArticles = articles.slice(0, 3);
  const latestCVEs = cves.slice(0, 3);
  const heroMetrics = [
    { label: 'CVEs Tracked', value: cveCount.toLocaleString() },
    { label: 'Sectors Covered', value: categories.length.toLocaleString() },
    { label: 'Analysts', value: analysts.length.toLocaleString() },
    { label: 'Nations Represented', value: nationsRepresented.toLocaleString() },
  ];

  return (
    <main className="min-h-screen bg-white text-[var(--color-text)]">
      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] gap-10 lg:gap-14 items-start">
            <div className="font-sans">
              <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 border border-[var(--color-border)] bg-[var(--color-bg-soft)] rounded-full shadow-none">
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent-intelligence)]" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[var(--color-text)]">
                  Executive CTI Platform
                </span>
              </div>

              <h1 className="max-w-4xl text-[2.7rem] sm:text-[4.4rem] font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--color-text)]">
                Cyber intelligence for teams that move before threats do.
              </h1>

              <p className="max-w-2xl mt-6 text-[1rem] sm:text-[1.1rem] leading-7 text-[var(--color-text-muted)]">
                Monitor vulnerabilities, threat signals, and executive risk in one calm
                intelligence platform.
              </p>

              <div className="flex flex-wrap gap-4 mt-10">
                <a
                  href="/intelligence/threat-intelligence"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-[var(--color-accent-intelligence)] text-white text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:bg-[var(--color-accent-intelligence-hover)]"
                >
                  Explore Intelligence
                </a>
                <a
                  href="/news"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-[var(--color-border-strong)] text-[var(--color-text)] text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:border-[var(--color-accent-intelligence)] hover:text-[var(--color-accent-intelligence)]"
                >
                  View Live Threats
                </a>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-[var(--color-border)] bg-white p-4"
                  >
                    <div className="text-[1.5rem] font-semibold tracking-tight text-[var(--color-text)]">
                      {metric.value}
                    </div>
                    <div className="mt-1 text-[0.72rem] font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[var(--color-section-royal)] text-white border border-black/10 p-6 md:p-7 shadow-[0_20px_60px_rgba(10,10,10,0.16)]">
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--color-accent-intelligence)]">
                    Coverage Snapshot
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                    Live intelligence, grounded in current platform data.
                  </h2>
                </div>
                <div className="h-10 w-10 rounded-full border border-[var(--color-accent-intelligence)]/30 bg-[var(--color-accent-intelligence)]/10 flex items-center justify-center text-[var(--color-accent-intelligence)]">
                  <span className="h-2 w-2 rounded-full bg-current" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                {heroMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="text-lg font-semibold text-white">{metric.value}</div>
                    <div className="mt-1 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-white/60">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-7">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/60">
                      Latest Intelligence
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--color-accent-intelligence)]">
                      {latestArticles.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {latestArticles.length > 0 ? (
                      latestArticles.map((article) => (
                        <a
                          key={article.id}
                          href={`/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`}
                          className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-[var(--color-accent-intelligence)]/40"
                        >
                          <div className="text-sm font-medium leading-5 text-white">
                            {article.title}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/55">
                            <span>{article.category ?? 'Intelligence'}</span>
                            <span className="text-white/25">/</span>
                            <span>{formatSignalDate(article.publishedAt || article.createdAt)}</span>
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
                        No published intelligence briefings available.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/60">
                      Latest CVEs
                    </h3>
                    <span className="text-[11px] font-mono text-[var(--color-accent-intelligence)]">
                      {latestCVEs.length.toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {latestCVEs.length > 0 ? (
                      latestCVEs.map((cve) => (
                        <a
                          key={cve.id}
                          href={`/cve/${cve.cveId}`}
                          className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-[var(--color-accent-intelligence)]/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium leading-5 text-white">
                                {cve.cveId}
                              </div>
                              <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/55">
                                {formatSignalDate(cve.publishedDate)}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full border border-[var(--color-accent-intelligence)]/30 bg-[var(--color-accent-intelligence)]/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--color-accent-intelligence)]">
                              {cve.severity || 'Unknown'}
                            </span>
                          </div>
                          <div className="mt-2 text-sm leading-5 text-white/72 line-clamp-2">
                            {cve.title || cve.description || 'No CVE summary available.'}
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
                        No CVE records available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LiveIntelTicker />

      <section className="bg-white border-b border-[var(--color-border)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
          <Suspense fallback={<StatsFallback />}>
            <SuspendedStats />
          </Suspense>
        </div>
      </section>

      <section id="automation-risks" className="border-b border-white/5">
        <AutomatedRoiCalculator />
      </section>

      <section id="pricing-tiers" className="border-b border-white/5">
        <PricingTiers />
      </section>

      <Suspense fallback={<SectorWorkspaceFallback />}>
        <SuspendedSectorWorkspace />
      </Suspense>
    </main>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-[var(--color-text-muted)]">{icon}</div>
      <div>
        <span className="text-[1.1rem] font-bold text-[var(--color-text)] font-mono tabular-nums">
          {value}
        </span>
        <span className="text-[0.72rem] text-[var(--color-text-muted)] ml-1.5 font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}
