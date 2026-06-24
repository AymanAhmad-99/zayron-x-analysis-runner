export const revalidate = 60;

import {
  GlobalThreatMap,
  LiveFeedTicker,
  SecurityScoreGauge,
} from '@/components/platform/HomepageClientComponents';
import { getCached } from '@/lib/cache/redis';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bug,
  ChevronRight,
  Radar,
  Shield,
} from '@/lib/icons';
import { getAnalysts } from '@/lib/supabase/queries/analysts';
import { getArticles, getCategoriesWithCounts } from '@/lib/supabase/queries/articles';
import { getCVECount, getRecentCVEs } from '@/lib/supabase/queries/cves';
import type { Analyst, Article, CVE } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { cache } from 'react';
import type { ComponentType, ReactNode } from 'react';

const HOME_DATA_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${HOME_DATA_TIMEOUT_MS}ms`));
    }, HOME_DATA_TIMEOUT_MS);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function loadHomeResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await withTimeout(getCached(process.env, key, fetcher, 300), key);
  } catch (error) {
    console.error(`[HOME PAGE] Failed to load ${key}; rendering fallback content instead.`, error);
    return fallback;
  }
}

const getHomeData = cache(async () => {
  const [articles, cves, analysts, cveCount, categories] = await Promise.all([
    loadHomeResource('home:articles', () => getArticles(1, 20), [] as Article[]),
    loadHomeResource('home:cves', () => getRecentCVEs(20), [] as CVE[]),
    loadHomeResource('home:analysts', () => getAnalysts(), [] as Analyst[]),
    loadHomeResource('home:cve_count', () => getCVECount(), 0),
    loadHomeResource(
      'home:categories',
      () => getCategoriesWithCounts(),
      [] as { category: string; count: number }[],
    ),
  ]);

  return { articles, cves, analysts, cveCount, categories };
});

function formatSignalDate(date: string | Date | null | undefined) {
  if (!date) return 'Latest';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function categorySlug(value: string | null | undefined) {
  return (value ?? 'intelligence').toLowerCase().replace(/\s+/g, '-');
}

function articleHref(article: Article) {
  return `/intelligence/${categorySlug(article.category)}/${article.slug}`;
}

function SectionEyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-[10px] font-mono font-bold uppercase tracking-[0.22em] ${
        dark ? 'text-white/68' : 'text-[var(--color-text-muted)]'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)]" />
      {children}
    </span>
  );
}

function HeroSection() {
  return (
    <section className="px-6 pb-7 pt-8 lg:px-10 lg:pb-8 lg:pt-10">
      <div className="mx-auto grid max-w-[1480px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="space-y-7 lg:pl-8">
          <SectionEyebrow>Latest indexed intelligence</SectionEyebrow>
          <div className="space-y-5">
            <h1 className="max-w-[720px] text-[3.45rem] font-serif font-normal leading-[0.94] text-[#111] sm:text-[4.35rem] xl:text-[4.9rem]">
              INTELLIGENCE
              <br />
              THAT SEES
              <br />
              <span className="text-[var(--color-accent-intelligence)]">
                WHAT OTHERS
                <br />
                DON'T.
              </span>
            </h1>
            <p className="max-w-[520px] text-[16px] leading-8 text-[var(--color-text-muted)]">
              ZAYRON-X delivers current threat intelligence, indexed vulnerability coverage,
              attacker context, and executive-ready briefings in one premium platform experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1rem] bg-[#050505] px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_16px_30px_rgba(17,17,17,0.12)] transition-colors hover:bg-[var(--color-accent-intelligence)]"
            >
              Go to Dashboard
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/intelligence/threat-intelligence"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1rem] border border-[var(--color-border)] bg-white px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text)] shadow-[0_12px_26px_rgba(17,17,17,0.05)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-soft)]"
            >
              Explore Threats
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative aspect-[16/9] min-h-[420px] overflow-hidden bg-white shadow-[0_35px_90px_rgba(17,17,17,0.08)] lg:min-h-0">
          <Image
            src="/brand/homepage-hero-marble-x.png"
            alt="ZAYRON-X marble institutional columns with a black and orange X mark"
            fill
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}

function MetricCards({
  cards,
}: {
  cards: {
    label: string;
    value: string;
    detail: string;
    accent: string;
    accentTone: 'orange' | 'green';
    icon: ComponentType<{ className?: string }>;
  }[];
}) {
  return (
    <section className="px-6 py-6 lg:px-10 lg:py-8">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const accentClass =
            card.accentTone === 'green'
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-[var(--color-accent-intelligence)] bg-[var(--color-accent-intelligence-soft)]';

          return (
            <div
              key={card.label}
              className="rounded-[1.35rem] border border-[var(--color-border)] bg-white px-6 py-6 shadow-[0_16px_36px_rgba(17,17,17,0.045)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-accent-intelligence)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.16em] ${accentClass}`}
                >
                  {card.accent}
                </span>
              </div>
              <div className="mt-5 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {card.label}
              </div>
              <div className="mt-3 text-[3rem] font-semibold leading-none text-[var(--color-text)]">
                {card.value}
              </div>
              <p className="mt-3 text-[13px] leading-6 text-[var(--color-text-muted)]">
                {card.detail}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CVEAndFeedGrid({
  topCVEs,
  feedArticles,
  latestExecutiveInsight,
  scoreValue,
}: {
  topCVEs: CVE[];
  feedArticles: Article[];
  latestExecutiveInsight: Article | null;
  scoreValue: number;
}) {
  return (
    <section className="px-6 py-7 lg:px-10 lg:py-8">
      <div className="mx-auto grid max-w-[1480px] gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
        <div className="rounded-[1.35rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_16px_36px_rgba(17,17,17,0.045)]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text)]">
              Top CVEs
            </h3>
            <Link
              href="/cve"
              className="text-[11px] font-semibold text-[var(--color-accent-intelligence)]"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {topCVEs.length > 0 ? (
              topCVEs.map((cve) => {
                const score = Number(cve.cvssScore || 0);
                const badgeClass =
                  score >= 9
                    ? 'bg-red-50 text-red-600'
                    : score >= 7
                      ? 'bg-orange-50 text-orange-600'
                      : 'bg-amber-50 text-amber-700';

                return (
                  <div
                    key={cve.id}
                    className="flex items-start gap-4 border-b border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0"
                  >
                    <span
                      className={`inline-flex min-w-11 justify-center rounded-[0.7rem] px-2.5 py-1 text-[11px] font-mono font-bold ${badgeClass}`}
                    >
                      {score > 0 ? score.toFixed(1) : 'N/A'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/cve/${cve.cveId}`}
                        className="block text-[15px] font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent-intelligence)]"
                      >
                        {cve.cveId || 'Latest CVE'}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-6 text-[var(--color-text-muted)]">
                        {cve.title || cve.description || 'Indexed CVE summary unavailable.'}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {formatSignalDate(cve.publishedDate || cve.createdAt)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">No indexed CVEs loaded.</p>
            )}
          </div>
          <Link
            href="/cve"
            className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-text)]"
          >
            Explore All CVEs
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[1.35rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_16px_36px_rgba(17,17,17,0.045)]">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text)]">
              Threat Intelligence Feed
            </h3>
            <Link
              href="/news"
              className="text-[11px] font-semibold text-[var(--color-accent-intelligence)]"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {feedArticles.length > 0 ? (
              feedArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start gap-4 border-b border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={articleHref(article)}
                      className="block text-[15px] font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent-intelligence)]"
                    >
                      {article.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-[var(--color-bg-soft)] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        {article.category || 'Briefing'}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {formatSignalDate(article.publishedAt || article.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No intelligence briefings loaded.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="overflow-hidden rounded-[1.35rem] border border-[#171717] bg-[linear-gradient(180deg,#0d0d0d_0%,#050505_100%)] p-6 text-white shadow-[0_20px_48px_rgba(0,0,0,0.24)]">
            <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="text-[28px] leading-none text-[var(--color-accent-intelligence)]">
                "
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                Executive Insight
              </span>
            </div>
            <p className="text-[16px] leading-8 text-white/82">
              {latestExecutiveInsight?.excerpt ||
                latestExecutiveInsight?.title ||
                'Current homepage intelligence is rendered from indexed briefings and vulnerability coverage.'}
            </p>
            <Link
              href={latestExecutiveInsight ? articleHref(latestExecutiveInsight) : '/news'}
              className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-accent-intelligence)]"
            >
              Read Full Insight
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <SecurityScoreGauge
            value={scoreValue}
            title="Indexed platform summary"
            subtitle="Visual summary derived from available homepage counts."
            footer="Published briefings, CVEs, and categories"
          />
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ articlesCount, cveCount }: { articlesCount: number; cveCount: number }) {
  return (
    <section className="px-6 pb-12 pt-7 lg:px-10 lg:pb-16 lg:pt-8">
      <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[1.35rem] border border-[#161616] bg-[#050505] shadow-[0_30px_80px_rgba(0,0,0,0.24)]">
        <div className="relative grid gap-8 px-7 py-8 md:px-10 md:py-10 lg:grid-cols-[0.68fr_1fr_0.5fr] lg:items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_24%,rgba(243,107,33,0.1),transparent_20%),linear-gradient(140deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />

          <div className="relative flex justify-center lg:justify-start">
            <div className="relative aspect-square w-full max-w-[300px] overflow-hidden rounded-[1.1rem]">
              <Image
                src="/brand/homepage-cta-crest.png"
                alt="ZAYRON-X black and gold crest"
                fill
                sizes="(min-width: 1024px) 320px, 80vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="relative space-y-4 text-white">
            <SectionEyebrow dark>Stay ahead. Stay protected.</SectionEyebrow>
            <h2 className="max-w-[680px] text-[3rem] font-serif font-normal leading-[0.96] sm:text-[3.9rem]">
              TURN INTELLIGENCE
              <br />
              INTO <span className="text-[var(--color-accent-intelligence)]">ADVANTAGE.</span>
            </h2>
            <p className="max-w-[480px] text-[15px] leading-8 text-white/72">
              Empower your security team with actionable briefings, indexed CVE coverage, and
              sharper executive context before threats become incidents.
            </p>
            <div className="flex flex-wrap gap-4 text-[11px] font-mono uppercase tracking-[0.16em] text-white/55">
              <span>{articlesCount.toLocaleString()} published briefings</span>
              <span>{cveCount.toLocaleString()} indexed CVEs</span>
            </div>
          </div>

          <div className="relative flex flex-col items-start gap-4 lg:items-end">
            <Link
              href="/register"
              className="inline-flex min-h-16 items-center justify-center gap-2 rounded-[1rem] bg-[var(--color-accent-intelligence)] px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[var(--color-accent-intelligence-hover)]"
            >
              Get Started Now
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <span className="text-[11px] text-white/55">No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { articles, cves, analysts, cveCount, categories } = await getHomeData();

  const topCVEs = cves.slice(0, 5);
  const feedArticles = articles.slice(0, 4);
  const latestExecutiveInsight = articles[0] ?? null;
  const scoreValue = Math.min(
    96,
    Math.max(42, Math.round(categories.length * 9 + analysts.length * 5 + feedArticles.length * 4)),
  );

  const summaryCards = [
    {
      label: 'Indexed CVEs',
      value: cveCount.toLocaleString(),
      detail: 'Current vulnerability coverage available in the platform dataset.',
      accent: 'Current',
      accentTone: 'orange' as const,
      icon: Shield,
    },
    {
      label: 'Published Briefings',
      value: articles.length.toLocaleString(),
      detail: 'Published intelligence briefings currently loaded for the homepage.',
      accent: 'Available',
      accentTone: 'orange' as const,
      icon: AlertTriangle,
    },
    {
      label: 'Analyst Context',
      value: analysts.length.toLocaleString(),
      detail: 'Analyst profiles available to support the intelligence experience.',
      accent: 'Indexed',
      accentTone: 'green' as const,
      icon: Bug,
    },
    {
      label: 'Category Coverage',
      value: categories.length.toLocaleString(),
      detail: 'Current coverage grouped by the categories available in the dataset.',
      accent: 'Observed',
      accentTone: 'orange' as const,
      icon: Radar,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-[var(--color-text)] font-sans">
      <HeroSection />
      <section className="px-6 pb-2 lg:px-10">
        <div className="mx-auto max-w-[1480px]">
          <LiveFeedTicker articles={articles} cves={cves} />
        </div>
      </section>
      <MetricCards cards={summaryCards} />
      <section className="px-6 py-4 lg:px-10 lg:py-5">
        <div className="mx-auto max-w-[1480px]">
          <GlobalThreatMap articles={articles} cves={cves} categories={categories} />
        </div>
      </section>
      <CVEAndFeedGrid
        topCVEs={topCVEs}
        feedArticles={feedArticles}
        latestExecutiveInsight={latestExecutiveInsight}
        scoreValue={scoreValue}
      />
      <FinalCTA articlesCount={articles.length} cveCount={cveCount} />
    </main>
  );
}
