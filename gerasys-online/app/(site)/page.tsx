export const revalidate = 60;

import { getCached } from '@/lib/cache/redis';
import { getAnalysts } from '@/lib/supabase/queries/analysts';
import { getArticles, getCategoriesWithCounts } from '@/lib/supabase/queries/articles';
import { getCVECount, getRecentCVEs } from '@/lib/supabase/queries/cves';
import type { Analyst, Article, CVE } from '@/lib/types';
import Link from 'next/link';
import { cache } from 'react';
import type { ComponentType, ReactNode } from 'react';

import {
  GlobalThreatMap,
  LiveFeedTicker,
  SecurityScoreGauge,
} from '@/components/platform/HomepageClientComponents';
import { PricingTiers } from '@/components/platform/PricingTiers';

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bug,
  Building2,
  ChevronRight,
  Globe,
  Layers,
  Lock,
  Radar,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from '@/lib/icons';

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

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)] shadow-[0_0_0_6px_rgba(243,107,33,0.08)]" />
      {children}
    </span>
  );
}

function PremiumVisualPanel({
  mode,
  accentLabel,
  title,
  detail,
  statLabel,
  statValue,
  secondaryLabel,
  secondaryValue,
}: {
  mode: 'hero' | 'cta';
  accentLabel: string;
  title: string;
  detail: string;
  statLabel: string;
  statValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}) {
  const isHero = mode === 'hero';

  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-[rgba(214,206,193,0.8)] ${
        isHero
          ? 'min-h-[520px] bg-[linear-gradient(145deg,#fff_0%,#faf7f1_28%,#f3ede4_54%,#ffffff_100%)]'
          : 'min-h-[320px] bg-[linear-gradient(145deg,#131313_0%,#050505_46%,#0a0a0a_100%)]'
      } shadow-[0_35px_90px_rgba(17,17,17,0.12)]`}
    >
      <div
        className={`absolute inset-0 ${
          isHero
            ? 'bg-[radial-gradient(circle_at_18%_24%,rgba(243,107,33,0.16),transparent_26%),radial-gradient(circle_at_82%_14%,rgba(17,17,17,0.08),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0))]'
            : 'bg-[radial-gradient(circle_at_18%_24%,rgba(243,107,33,0.18),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]'
        }`}
      />
      <div
        className={`absolute inset-0 opacity-70 ${
          isHero
            ? 'bg-[linear-gradient(transparent_96%,rgba(17,17,17,0.08)_96%),linear-gradient(90deg,transparent_96%,rgba(17,17,17,0.08)_96%)] bg-[size:34px_34px]'
            : 'bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.08)_96%),linear-gradient(90deg,transparent_96%,rgba(255,255,255,0.08)_96%)] bg-[size:34px_34px]'
        }`}
      />

      <div
        className={`absolute left-[10%] top-[12%] h-[72%] w-[72%] rounded-full border ${
          isHero ? 'border-[rgba(17,17,17,0.08)]' : 'border-[rgba(255,255,255,0.1)]'
        }`}
      />
      <div
        className={`absolute right-[8%] top-[8%] h-[64%] w-[64%] rounded-full border ${
          isHero ? 'border-[rgba(243,107,33,0.26)]' : 'border-[rgba(243,107,33,0.2)]'
        }`}
      />
      <div
        className={`absolute left-[16%] top-[20%] h-[44%] w-[44%] rotate-45 rounded-[2rem] border ${
          isHero ? 'border-[rgba(17,17,17,0.08)]' : 'border-[rgba(255,255,255,0.08)]'
        }`}
      />
      <div
        className={`absolute right-[10%] bottom-[12%] h-[34%] w-[34%] rotate-45 rounded-[1.6rem] border ${
          isHero ? 'border-[rgba(243,107,33,0.35)]' : 'border-[rgba(243,107,33,0.28)]'
        }`}
      />
      <div
        className={`absolute left-[18%] top-[28%] h-[2px] w-[52%] rotate-[34deg] ${
          isHero ? 'bg-[rgba(17,17,17,0.16)]' : 'bg-[rgba(255,255,255,0.18)]'
        }`}
      />
      <div
        className={`absolute left-[18%] top-[28%] h-[2px] w-[52%] -rotate-[34deg] ${
          isHero ? 'bg-[rgba(243,107,33,0.32)]' : 'bg-[rgba(243,107,33,0.42)]'
        }`}
      />
      <div
        className={`absolute right-[16%] top-[18%] h-3 w-3 rounded-full ${
          isHero ? 'bg-[var(--color-accent-intelligence)]' : 'bg-white'
        } shadow-[0_0_0_10px_rgba(243,107,33,0.1)]`}
      />
      <div
        className={`absolute bottom-[18%] left-[12%] h-2.5 w-2.5 rounded-full ${
          isHero ? 'bg-[#161616]' : 'bg-[var(--color-accent-intelligence)]'
        } shadow-[0_0_0_8px_rgba(255,255,255,0.06)]`}
      />

      <div className="relative flex h-full min-h-[inherit] flex-col justify-between p-6 sm:p-8">
        <div className="flex items-start justify-between gap-6">
          <div
            className={`rounded-full border px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] ${
              isHero
                ? 'border-[rgba(17,17,17,0.08)] bg-white/72 text-[var(--color-text)] backdrop-blur'
                : 'border-white/10 bg-white/5 text-white/74 backdrop-blur'
            }`}
          >
            {accentLabel}
          </div>
          <div
            className={`rounded-[1.35rem] border px-4 py-3 backdrop-blur ${
              isHero
                ? 'border-[rgba(17,17,17,0.08)] bg-white/74 text-[var(--color-text)]'
                : 'border-white/10 bg-white/6 text-white'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] opacity-60">
              {statLabel}
            </div>
            <div className="mt-1 text-[1.75rem] font-semibold tracking-[-0.05em]">{statValue}</div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div
            className={`rounded-[1.7rem] border p-6 backdrop-blur ${
              isHero
                ? 'border-[rgba(17,17,17,0.08)] bg-white/76 text-[var(--color-text)]'
                : 'border-white/10 bg-white/[0.06] text-white'
            }`}
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] opacity-60">
              {title}
            </div>
            <div className="mt-3 max-w-[24rem] text-[1.8rem] font-serif leading-[1.04] tracking-[-0.04em]">
              {detail}
            </div>
          </div>

          <div
            className={`rounded-[1.7rem] border p-6 backdrop-blur ${
              isHero
                ? 'border-[rgba(17,17,17,0.08)] bg-[#0d0d0d] text-white'
                : 'border-white/10 bg-[rgba(243,107,33,0.08)] text-white'
            }`}
          >
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-accent-intelligence)]">
              {secondaryLabel}
            </div>
            <div className="mt-3 text-[2.5rem] font-semibold tracking-[-0.05em]">
              {secondaryValue}
            </div>
            <div className="mt-2 text-[12px] leading-6 text-white/70">
              Current homepage data rendered through the live application.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection({
  articles,
  cves,
  cveCount,
  analystsCount,
  categoriesCount,
}: {
  articles: Article[];
  cves: CVE[];
  cveCount: number;
  analystsCount: number;
  categoriesCount: number;
}) {
  const latestArticle = articles[0] ?? null;

  return (
    <section className="border-b border-[var(--color-border)] bg-[linear-gradient(180deg,#fff_0%,#fcfbf8_100%)] px-6 pb-14 pt-10 lg:px-10 lg:pb-18 lg:pt-14">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-[minmax(0,0.84fr)_minmax(560px,1.16fr)] lg:gap-12">
        <div className="space-y-8">
          <SectionEyebrow>Latest indexed intelligence</SectionEyebrow>

          <div className="space-y-6">
            <h1 className="max-w-[720px] text-[3.25rem] font-serif font-normal leading-[0.9] tracking-[-0.055em] text-[var(--color-text)] sm:text-[4.65rem] xl:text-[5.45rem]">
              Intelligence
              <br />
              built for the
              <br />
              <span className="text-[var(--color-accent-intelligence)]">moments that matter.</span>
            </h1>

            <p className="max-w-[540px] text-[15px] leading-8 text-[var(--color-text-muted)] sm:text-[16px]">
              ZAYRON-X renders current CVE coverage, published briefings, analyst context, and
              category visibility into a refined intelligence surface designed for lean security
              teams.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[auto_auto] sm:items-center">
            <Link
              href="/dark-web-recon"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.2rem] bg-[#050505] px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_24px_50px_rgba(17,17,17,0.12)] transition-colors hover:bg-[var(--color-accent-intelligence)]"
            >
              Open Intelligence Surface
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/intelligence/threat-intelligence"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text)] shadow-[0_18px_42px_rgba(17,17,17,0.05)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-soft)]"
            >
              Review Published Briefings
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
            <LiveFeedTicker articles={articles} cves={cves} />
            <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white px-5 py-4 shadow-[0_18px_40px_rgba(17,17,17,0.05)]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                Analyst Context
              </div>
              <div className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-[var(--color-text)]">
                {analystsCount}
              </div>
              <div className="text-[12px] leading-6 text-[var(--color-text-muted)]">
                Profiles available for the homepage intelligence layer.
              </div>
            </div>
          </div>
        </div>

        <PremiumVisualPanel
          mode="hero"
          accentLabel="Institutional intelligence"
          title={latestArticle ? 'Latest executive insight' : 'Homepage intelligence'}
          detail={
            latestArticle?.title ??
            'Premium editorial presentation backed by current homepage briefings and CVE data.'
          }
          statLabel="Current indexed CVEs"
          statValue={cveCount.toLocaleString()}
          secondaryLabel="Category coverage"
          secondaryValue={categoriesCount.toLocaleString()}
        />
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
    icon: ComponentType<{ className?: string }>;
  }[];
}) {
  return (
    <section className="bg-white px-6 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto grid max-w-[1400px] gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`group rounded-[1.65rem] border px-7 py-7 shadow-[0_18px_44px_rgba(17,17,17,0.045)] transition-all duration-300 ${
                index === 0
                  ? 'border-[rgba(243,107,33,0.28)] bg-[linear-gradient(180deg,#fff_0%,#fff7f0_100%)]'
                  : 'border-[var(--color-border)] bg-white'
              }`}
            >
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-[0_8px_18px_rgba(17,17,17,0.04)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {card.label}
                </div>
              </div>
              <div className="text-[2.9rem] font-semibold leading-none tracking-[-0.06em] text-[var(--color-text)]">
                {card.value}
              </div>
              <div className="mt-3 max-w-[20rem] text-[14px] leading-7 text-[var(--color-text-muted)]">
                {card.detail}
              </div>
              <div className="mt-6 h-0.5 w-12 rounded-full bg-[var(--color-accent-intelligence)]" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GlobalIntelligencePanel({
  articles,
  cves,
  categories,
}: {
  articles: Article[];
  cves: CVE[];
  categories: { category: string; count: number }[];
}) {
  return (
    <section className="bg-white px-6 pb-14 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <GlobalThreatMap articles={articles} cves={cves} categories={categories} />
      </div>
    </section>
  );
}

function CVEAndFeedGrid({
  topCVEs,
  feedArticles,
  latestExecutiveInsight,
  cveCount,
  articlesCount,
}: {
  topCVEs: CVE[];
  feedArticles: Article[];
  latestExecutiveInsight: Article | null;
  cveCount: number;
  articlesCount: number;
}) {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-6 py-16 lg:px-10">
      <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[1fr_1fr_0.94fr]">
        <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_20px_48px_rgba(17,17,17,0.05)]">
          <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text)]">
              Latest indexed CVEs
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
                return (
                  <div
                    key={cve.id}
                    className="flex items-start gap-4 border-b border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0"
                  >
                    <span
                      className={`mt-0.5 rounded-[0.8rem] px-2.5 py-1 text-[11px] font-mono font-bold ${
                        score >= 9
                          ? 'bg-red-50 text-red-600'
                          : score >= 7
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      {score > 0 ? score.toFixed(1) : 'N/A'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/cve/${cve.cveId}`}
                        className="block text-[14px] font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent-intelligence)]"
                      >
                        {cve.cveId || 'Latest CVE'}
                      </Link>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-6 text-[var(--color-text-muted)]">
                        {cve.title || cve.description || 'Latest CVE summary not available.'}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {formatSignalDate(cve.publishedDate || cve.createdAt)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">No CVEs loaded.</p>
            )}
          </div>
          <Link
            href="/cve"
            className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-text)]"
          >
            Explore Current Indexed CVEs
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_20px_48px_rgba(17,17,17,0.05)]">
          <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
            <h3 className="text-[12px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text)]">
              Published briefings
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text)]">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={articleHref(article)}
                      className="block text-[14px] font-semibold leading-6 text-[var(--color-text)] transition-colors hover:text-[var(--color-accent-intelligence)]"
                    >
                      {article.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      <span>{article.category || 'Intelligence'}</span>
                      <span className="text-[var(--color-border-strong)]">/</span>
                      <span>{formatSignalDate(article.publishedAt || article.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">No briefings available.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="overflow-hidden rounded-[1.8rem] border border-[#1b1b1b] bg-[#0A0A0A] p-7 text-white shadow-[0_24px_56px_rgba(0,0,0,0.24)]">
            <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="text-[30px] leading-none text-[var(--color-accent-intelligence)]">
                “
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                Executive insight
              </span>
            </div>

            {latestExecutiveInsight ? (
              <>
                <h3 className="text-[18px] font-serif font-normal leading-8 text-white">
                  {latestExecutiveInsight.title}
                </h3>
                <p className="mt-4 text-[13px] leading-7 text-white/70">
                  {latestExecutiveInsight.excerpt ||
                    latestExecutiveInsight.subtitle ||
                    'Summary excerpt for the latest published intelligence briefing.'}
                </p>
                <Link
                  href={articleHref(latestExecutiveInsight)}
                  className="mt-8 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--color-accent-intelligence)]"
                >
                  Read Full Insight
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <p className="text-[13px] text-white/70">No published intelligence briefings.</p>
            )}
          </div>

          <SecurityScoreGauge
            value={Math.min(articlesCount, 100)}
            title="Current Indexed Data"
            subtitle="Published intelligence briefings"
            footer={`${cveCount.toLocaleString()} CVEs currently indexed`}
          />
        </div>
      </div>
    </section>
  );
}

function MonitorsSection({
  cards,
}: {
  cards: { title: string; label: string; icon: ComponentType<{ className?: string }> }[];
}) {
  return (
    <section className="border-b border-[var(--color-border)] bg-white px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <SectionEyebrow>Observed signals</SectionEyebrow>
            <h2 className="text-[3rem] font-serif font-normal leading-[1.02] tracking-[-0.05em] text-[var(--color-text)] sm:text-[4.2rem]">
              WHAT THE
              <br />
              PLATFORM SURFACES
            </h2>
          </div>
          <div className="flex max-w-[520px] items-start gap-8">
            <div className="hidden h-20 w-px bg-[var(--color-border)] lg:block" />
            <p className="pt-2 text-[15px] leading-8 text-[var(--color-text-muted)]">
              Homepage intelligence cards reflect current indexed briefings, CVE volume, analyst
              context, and category visibility without unsupported monitoring claims.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-[1.65rem] border px-7 py-7 shadow-[0_18px_45px_rgba(17,17,17,0.045)] ${
                  index === 0
                    ? 'border-[#161616] bg-[#050505] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'
                }`}
              >
                <div className="mb-6 flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[1rem] border ${
                      index === 0
                        ? 'border-white/10 bg-white/5 text-white'
                        : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div
                    className={`text-[11px] font-mono uppercase tracking-[0.18em] ${
                      index === 0 ? 'text-white/60' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {card.label}
                  </div>
                </div>
                <div className="text-[2.85rem] font-semibold leading-none tracking-[-0.05em]">
                  {card.title}
                </div>
                <div className="mt-6 h-0.5 w-10 rounded-full bg-[var(--color-accent-intelligence)]" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LeanTeamsSection({
  cards,
}: {
  cards: { title: string; text: string; icon: ComponentType<{ className?: string }> }[];
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(180deg,#faf7f1_0%,#f6f1e8_100%)] px-6 py-20 lg:px-10">
      <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_center,rgba(243,107,33,0.12),transparent_30%),linear-gradient(90deg,transparent,rgba(255,255,255,0.4))] lg:block" />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <SectionEyebrow>Lean team fit</SectionEyebrow>
            <h2 className="text-[3rem] font-serif font-normal leading-[1.02] tracking-[-0.05em] text-[var(--color-text)] sm:text-[4.2rem]">
              BUILT FOR
              <br />
              DECISIVE TEAMS
            </h2>
          </div>
          <div className="flex max-w-[520px] items-start gap-8">
            <div className="hidden h-20 w-px bg-[var(--color-border)] lg:block" />
            <p className="pt-2 text-[15px] leading-8 text-[var(--color-text-muted)]">
              A premium intelligence interface for organizations that need editorial clarity,
              stronger triage context, and an enterprise visual language without inflated claims.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {cards.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`rounded-[1.75rem] border p-7 shadow-[0_18px_45px_rgba(17,17,17,0.05)] ${
                  index === 2
                    ? 'border-[#131313] bg-[#050505] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-[1rem] border ${
                    index === 2
                      ? 'border-white/10 bg-white/6 text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-8 text-[28px] font-serif font-normal tracking-[-0.04em]">
                  {item.title}
                </h3>
                <p
                  className={`mt-4 text-[14px] leading-8 ${
                    index === 2 ? 'text-white/72' : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {item.text}
                </p>
                <div className="mt-7 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--color-accent-intelligence)]">
                  Available briefings
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return <PricingTiers />;
}

function CoverageSection({
  categories,
  articlesCount,
  cveCount,
}: {
  categories: { category: string; count: number }[];
  articlesCount: number;
  cveCount: number;
}) {
  const topCategories = [...categories].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 4);

  return (
    <section className="border-b border-[var(--color-border)] bg-white px-6 py-20 lg:px-10">
      <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="space-y-4">
              <SectionEyebrow>Indexed coverage</SectionEyebrow>
              <h2 className="text-[3rem] font-serif font-normal leading-[1.02] tracking-[-0.05em] text-[var(--color-text)] sm:text-[4rem]">
                COVERAGE
                <br />
                WITH CLARITY
              </h2>
            </div>
            <div className="hidden h-20 w-px bg-[var(--color-border)] lg:block" />
            <p className="max-w-[280px] pt-2 text-[15px] leading-8 text-[var(--color-text-muted)]">
              A premium overview of what the current homepage dataset actually contains.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,#fff_0%,#faf8f3_100%)] p-6 shadow-[0_18px_45px_rgba(17,17,17,0.05)]">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[1.35rem] border border-[rgba(214,206,193,0.8)] bg-[linear-gradient(145deg,#fff_0%,#f8f4ed_100%)]">
              <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(17,17,17,0.08)_95%),linear-gradient(90deg,transparent_95%,rgba(17,17,17,0.08)_95%)] bg-[size:36px_36px] opacity-70" />
              <div className="absolute left-[16%] top-[18%] h-[44%] w-[44%] rotate-45 rounded-[2rem] border border-[rgba(243,107,33,0.24)]" />
              <div className="absolute right-[12%] top-[24%] h-[38%] w-[38%] rotate-45 rounded-[1.6rem] border border-[rgba(17,17,17,0.08)]" />
              <div className="absolute left-[22%] top-[32%] h-[2px] w-[46%] rotate-[34deg] bg-[rgba(243,107,33,0.34)]" />
              <div className="absolute left-[22%] top-[32%] h-[2px] w-[46%] -rotate-[34deg] bg-[rgba(17,17,17,0.14)]" />
              <div className="absolute left-[12%] top-[14%] rounded-[1rem] border border-[rgba(17,17,17,0.08)] bg-white/80 px-4 py-3 backdrop-blur">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Category coverage
                </div>
                <div className="mt-1 text-[1.8rem] font-semibold tracking-[-0.05em] text-[var(--color-text)]">
                  {categories.length}
                </div>
              </div>
              <div className="absolute bottom-[12%] right-[12%] rounded-[1rem] border border-[rgba(17,17,17,0.08)] bg-[#050505] px-4 py-3 text-white shadow-[0_18px_35px_rgba(17,17,17,0.18)]">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-accent-intelligence)]">
                  Published briefings
                </div>
                <div className="mt-1 text-[1.8rem] font-semibold tracking-[-0.05em]">
                  {articlesCount}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {topCategories.length > 0 ? (
                topCategories.map((item) => (
                  <div
                    key={item.category}
                    className="rounded-[1.2rem] border border-[var(--color-border)] bg-white px-4 py-4"
                  >
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {item.category || 'Other'}
                    </div>
                    <div className="mt-2 text-[1.9rem] font-semibold tracking-[-0.05em] text-[var(--color-text)]">
                      {(item.count || 0).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.2rem] border border-[var(--color-border)] bg-white px-4 py-4 text-[13px] text-[var(--color-text-muted)]">
                  No category coverage loaded.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: Globe,
              label: 'Category coverage',
              value: categories.length.toLocaleString(),
              detail: 'Current indexed categories available in the homepage dataset.',
            },
            {
              icon: Building2,
              label: 'Published briefings',
              value: articlesCount.toLocaleString(),
              detail: 'Published intelligence briefings currently loaded for the homepage.',
            },
            {
              icon: TrendingUp,
              label: 'Current indexed CVEs',
              value: cveCount.toLocaleString(),
              detail: 'Current CVE coverage available in the indexed platform dataset.',
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex items-start gap-5 rounded-[1.6rem] border px-6 py-5 shadow-[0_14px_35px_rgba(17,17,17,0.045)] ${
                  index === 1
                    ? 'border-[#141414] bg-[#050505] text-white'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-[1rem] border ${
                    index === 1
                      ? 'border-white/10 bg-white/6 text-white'
                      : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div
                    className={`text-[11px] font-mono font-bold uppercase tracking-[0.18em] ${
                      index === 1 ? 'text-white/60' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="mt-2 text-[2.15rem] font-semibold tracking-[-0.05em] text-[var(--color-accent-intelligence)]">
                    {item.value}
                  </div>
                  <p
                    className={`mt-2 max-w-[290px] text-[14px] leading-7 ${
                      index === 1 ? 'text-white/72' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    {item.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({
  articlesCount,
  cveCount,
  analystsCount,
}: {
  articlesCount: number;
  cveCount: number;
  analystsCount: number;
}) {
  return (
    <section className="bg-white px-6 py-14 lg:px-10 lg:pb-16">
      <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] border border-[#151515] bg-[#050505] shadow-[0_30px_80px_rgba(0,0,0,0.24)]">
        <div className="grid gap-10 px-8 py-10 md:px-12 md:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-[var(--color-accent-intelligence)]">
              Premium intelligence surface
            </span>
            <h2 className="max-w-[640px] text-[3rem] font-serif font-normal leading-[0.96] tracking-[-0.05em] text-white sm:text-[4.1rem]">
              Published briefings,
              <br />
              current CVE coverage,
              <br />
              <span className="text-[var(--color-accent-intelligence)]">and analyst context</span>
              <br />
              in one experience.
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Published briefings', value: articlesCount.toLocaleString() },
                { label: 'Current indexed CVEs', value: cveCount.toLocaleString() },
                { label: 'Analyst context', value: analystsCount.toLocaleString() },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4"
                >
                  <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/55">
                    {item.label}
                  </div>
                  <div className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 pt-3">
              <Link
                href="/register"
                className="inline-flex min-h-14 items-center justify-center rounded-[1.2rem] bg-[var(--color-accent-intelligence)] px-8 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[var(--color-accent-intelligence-hover)]"
              >
                Start with ZAYRON-X
              </Link>
              <Link
                href="/dark-web-recon"
                className="inline-flex min-h-14 items-center justify-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/78"
              >
                Explore Platform
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <PremiumVisualPanel
            mode="cta"
            accentLabel="Institutional visual"
            title="Current homepage data"
            detail="Luxury visual treatment grounded in the real App Router homepage instead of a static mockup."
            statLabel="Current indexed CVEs"
            statValue={cveCount.toLocaleString()}
            secondaryLabel="Published briefings"
            secondaryValue={articlesCount.toLocaleString()}
          />
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { articles, cves, analysts, cveCount, categories } = await getHomeData();

  const topCVEs = cves.slice(0, 5);
  const feedArticles = articles.slice(0, 5);
  const latestExecutiveInsight = articles[0] ?? null;

  const summaryCards = [
    {
      label: 'Current Indexed CVEs',
      value: cveCount.toLocaleString(),
      detail: 'Current CVE coverage available in the platform dataset.',
      icon: Shield,
    },
    {
      label: 'Published Briefings',
      value: articles.length.toLocaleString(),
      detail: 'Published intelligence briefings currently loaded for the homepage.',
      icon: AlertTriangle,
    },
    {
      label: 'Analyst Context',
      value: analysts.length.toLocaleString(),
      detail: 'Analyst profiles available for the homepage experience.',
      icon: Bug,
    },
    {
      label: 'Category Coverage',
      value: categories.length.toLocaleString(),
      detail: 'Current indexed data grouped by available intelligence categories.',
      icon: Radar,
    },
  ];

  const monitorCards = [
    {
      title: articles.length.toLocaleString(),
      label: 'Latest indexed intelligence',
      icon: Radar,
    },
    {
      title: cveCount.toLocaleString(),
      label: 'Current indexed CVEs',
      icon: ShieldAlert,
    },
    {
      title: analysts.length.toLocaleString(),
      label: 'Analyst context',
      icon: Bug,
    },
    {
      title: categories.length.toLocaleString(),
      label: 'Category coverage',
      icon: Globe,
    },
    {
      title: topCVEs.length.toLocaleString(),
      label: 'Latest CVEs',
      icon: Lock,
    },
    {
      title: feedArticles.length.toLocaleString(),
      label: 'Available briefings',
      icon: Layers,
    },
  ];

  const sectorCards = [
    {
      title: 'Small IT Teams',
      text: 'Get stronger editorial visibility and cleaner triage context without enterprise sprawl.',
      icon: Users,
    },
    {
      title: 'Healthcare Clinics',
      text: 'Review published intelligence and CVE coverage relevant to patient-facing systems.',
      icon: Shield,
    },
    {
      title: 'Financial Organizations',
      text: 'Use available briefings and indexed CVEs to sharpen risk review and executive reporting.',
      icon: Building2,
    },
    {
      title: 'Security Analysts',
      text: 'Move from scattered signals to a more coherent intelligence and briefing experience.',
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-[var(--color-text)] font-sans">
      <HeroSection
        articles={articles}
        cves={cves}
        cveCount={cveCount}
        analystsCount={analysts.length}
        categoriesCount={categories.length}
      />
      <MetricCards cards={summaryCards} />
      <GlobalIntelligencePanel articles={articles} cves={cves} categories={categories} />
      <CVEAndFeedGrid
        topCVEs={topCVEs}
        feedArticles={feedArticles}
        latestExecutiveInsight={latestExecutiveInsight}
        cveCount={cveCount}
        articlesCount={articles.length}
      />
      <MonitorsSection cards={monitorCards} />
      <LeanTeamsSection cards={sectorCards} />
      <PricingSection />
      <CoverageSection
        categories={categories}
        articlesCount={articles.length}
        cveCount={cveCount}
      />
      <FinalCTA
        articlesCount={articles.length}
        cveCount={cveCount}
        analystsCount={analysts.length}
      />
    </main>
  );
}
