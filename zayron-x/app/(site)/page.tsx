export const revalidate = 60;

import {
  GlobalThreatMap,
  LiveFeedTicker,
  SecurityScoreGauge,
} from '@/components/platform/HomepageClientComponents';
import { TelegramSignalDesk } from '@/components/homepage/TelegramSignalDesk';
import { getCached } from '@/lib/cache/redis';
import { getLatestPosts } from '@/lib/d1/posts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bug,
  Building2,
  CheckCircle,
  ChevronRight,
  Database,
  Radar,
  Server,
  Shield,
  ShieldCheck,
  Users,
} from '@/lib/icons';
import { getAnalysts } from '@/lib/db/queries/analysts';
import { getArticles, getCategoriesWithCounts } from '@/lib/db/queries/articles';
import { getCVECount, getRecentCVEs } from '@/lib/db/queries/cves';
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
  const [articles, cves, analysts, cveCount, categories, posts] = await Promise.all([
    loadHomeResource('home:articles', () => getArticles(1, 20), [] as Article[]),
    loadHomeResource('home:cves', () => getRecentCVEs(20), [] as CVE[]),
    loadHomeResource('home:analysts', () => getAnalysts(), [] as Analyst[]),
    loadHomeResource('home:cve_count', () => getCVECount(), 0),
    loadHomeResource(
      'home:categories',
      () => getCategoriesWithCounts(),
      [] as { category: string; count: number }[],
    ),
    loadHomeResource('home:telegram-posts', () => getLatestPosts(6), []),
  ]);

  return { articles, cves, analysts, cveCount, categories, posts };
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
    <section className="w-full pt-32 pb-20 px-6 border-b border-[#252B33]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF6A00] mb-4 block">Strategic Intelligence Platform</span>
          <h1 className="text-5xl lg:text-7xl font-serif font-normal leading-[1.05] text-[#111111] mb-6">
            Understand what changed.
            <br />
            <span className="text-[#56606B]">Know why it matters.</span>
          </h1>
          <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl mb-8 font-sans">
            ZAYRON-X analyzes global cyber signals, vulnerabilities, adversary activity, malware, and infrastructure with cryptographic evidence at the center.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            <Link
              href="/threats"
              className="inline-flex justify-center items-center gap-2 bg-[#111111] text-white px-7 py-3.5 text-sm font-semibold tracking-wide rounded hover:bg-[#FF6A00] transition-colors"
            >
              Explore Intelligence
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/intelligence/today"
              className="inline-flex justify-center items-center gap-2 bg-[#FFFFFF] text-[#111111] border border-[#252B33]/20 px-7 py-3.5 text-sm font-semibold tracking-wide rounded hover:border-[#111111] transition-colors"
            >
              Read Today's Briefing
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#252B33]/10 max-w-xl text-left">
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">25</div>
              <div className="text-xs text-[#7A838D]">Monitored Feeds</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">100%</div>
              <div className="text-xs text-[#7A838D]">Evidence Grounding</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#FF6A00] font-mono">LIVE</div>
              <div className="text-xs text-[#7A838D]">Edge Ingestion</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-[#FFFFFF] border border-[#252B33]/15 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#252B33]/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-red-500/10 text-red-600 border border-red-500/20 rounded">CRITICAL</span>
                <span className="text-xs text-[#7A838D] font-mono">CONFIDENCE: 98%</span>
              </div>
              <span className="text-xs text-[#7A838D]">Today</span>
            </div>
            <h3 className="text-lg font-bold text-[#111111] mb-2 leading-snug">APT29 Active Exploitation of CVE-2026-1453 with Cobalt Strike</h3>
            <p className="text-xs text-[#56606B] leading-relaxed mb-4">
              Verified multi-source telemetry corroborates active exploitation targeting critical infrastructure and cloud identity providers.
            </p>
            <div className="bg-[#F7F7F5] p-3 rounded border border-[#252B33]/10 mb-4 text-xs font-mono text-[#56606B]">
              [NER] -&#62; EXTRACT_CVE: CVE-2026-1453<br />
              [GRAPH] -&#62; LINK_ACTOR: APT29<br />
              [CONFIDENCE] -&#62; 98.4%
            </div>
            <Link href="/intelligence" className="text-xs text-[#FF6A00] font-bold uppercase tracking-wider hover:underline flex items-center gap-1">
              Read Full Intelligence Report <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
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
    <section className="px-6 pb-6 pt-4 lg:px-10 lg:pb-8 lg:pt-5">
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

function MonitorsSection({
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
    <section className="border-t border-[var(--color-border)] bg-white px-6 py-18 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.62fr_0.38fr] lg:items-start">
          <h2 className="max-w-[560px] text-[3rem] font-serif font-normal leading-[1.02] text-[var(--color-text)] sm:text-[4rem]">
            WHAT ZAYRON-X
            <br />
            <span className="text-[var(--color-accent-intelligence)]">MONITORS</span>
          </h2>
          <div className="border-l border-[var(--color-border)] pl-8 text-[15px] leading-8 text-[var(--color-text-muted)]">
            Indexed vulnerability coverage, published intelligence, analyst context, and category
            visibility from the current homepage dataset.
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-[1.2rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_16px_36px_rgba(17,17,17,0.045)]"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-[2.35rem] font-semibold leading-none text-[var(--color-text)]">
                      {card.value}
                    </div>
                    <div className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                      {card.label}
                    </div>
                  </div>
                </div>
                <div className="ml-[76px] mt-4 h-px w-10 bg-[var(--color-accent-intelligence)]" />
                <p className="ml-[76px] mt-3 text-[12px] leading-6 text-[var(--color-text-muted)]">
                  {card.detail}
                </p>
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
  cards: {
    title: string;
    text: string;
    icon: ComponentType<{ className?: string }>;
  }[];
}) {
  return (
    <section className="relative overflow-hidden border-t border-[var(--color-border)] bg-[linear-gradient(90deg,#fff_0%,#fff_58%,#f7f3ec_100%)] px-6 py-18 lg:px-10 lg:py-20">
      <div className="absolute right-0 top-0 hidden h-full w-[34%] opacity-35 lg:block">
        <Image
          src="/brand/homepage-hero-marble-x.png"
          alt=""
          fill
          sizes="34vw"
          className="object-cover object-right"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,0.72)_45%,rgba(255,255,255,0.18)_100%)]" />
      </div>
      <div className="relative mx-auto max-w-[1360px]">
        <div className="mb-10 grid gap-8 lg:grid-cols-[0.48fr_0.52fr] lg:items-center">
          <h2 className="text-[2.6rem] font-serif font-normal leading-[1.05] text-[var(--color-text)] sm:text-[3.6rem]">
            BUILT FOR
            <br />
            LEAN SECURITY TEAMS
          </h2>
          <div className="max-w-[430px] border-l border-[var(--color-border)] pl-8 text-[15px] leading-8 text-[var(--color-text-muted)]">
            Purpose-built intelligence for teams that need clarity, speed, and sharper context
            without unnecessary complexity.
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-[1.2rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_16px_36px_rgba(17,17,17,0.045)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-8 text-[20px] font-semibold text-[var(--color-text)]">
                  {card.title}
                </h3>
                <p className="mt-4 min-h-[96px] text-[14px] leading-7 text-[var(--color-text-muted)]">
                  {card.text}
                </p>
                <Link
                  href="/intelligence/threat-intelligence"
                  className="mt-6 inline-flex text-[var(--color-accent-intelligence)]"
                  aria-label={`Explore ${card.title}`}
                >
                  <ArrowUpRight className="h-5 w-5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const tiers = [
    {
      name: 'FREE',
      price: '$0',
      period: 'Forever',
      features: ['Threat feed access', 'Limited CVE tracker access', 'Public briefing view'],
      featured: false,
      href: '/register',
    },
    {
      name: 'PRO',
      price: '$25',
      period: '/ month',
      features: [
        'Indexed intelligence view',
        'CVE tracker access',
        'Briefing export workflow',
        'Category coverage view',
        'Latest loaded intelligence items',
      ],
      featured: true,
      href: '/register',
    },
    {
      name: 'FOUNDER',
      price: '$49',
      period: '/ 6 months',
      features: [
        'Pro access period',
        'Early module access',
        'Founder badge',
        'Briefing export workflow',
      ],
      featured: false,
      href: '/register',
    },
  ];

  return (
    <section className="border-t border-[var(--color-border)] bg-white px-6 py-18 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1360px]">
        <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--color-text)]">
              Simple. Transparent. Focused.
            </div>
            <h2 className="mt-2 text-[3rem] font-serif font-normal leading-none text-[var(--color-text)]">
              PRICING
            </h2>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-muted)]">
            <span>Monthly</span>
            <span className="h-7 w-12 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)]" />
            <span>6 Months</span>
            <span className="rounded-[0.5rem] bg-[var(--color-accent-intelligence)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              Save 15%
            </span>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-[1rem] border p-8 shadow-[0_16px_36px_rgba(17,17,17,0.045)] ${
                tier.featured
                  ? 'border-[#111] bg-[#050505] text-white'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text)]'
              }`}
            >
              {tier.featured && (
                <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[rgba(243,107,33,0.65)] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-intelligence)]">
                  Most popular
                </div>
              )}
              <div className="pt-6 text-center">
                <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                  {tier.name}
                </div>
                <div className="mt-6 flex items-end justify-center gap-2">
                  <span className="text-[3.5rem] font-semibold leading-none">{tier.price}</span>
                  <span
                    className={
                      tier.featured ? 'pb-2 text-white/58' : 'pb-2 text-[var(--color-text-muted)]'
                    }
                  >
                    {tier.period}
                  </span>
                </div>
              </div>
              <ul className="mt-9 space-y-4">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className={`flex items-center gap-3 text-[13px] ${
                      tier.featured ? 'text-white/82' : 'text-[var(--color-text-muted)]'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4 text-[var(--color-accent-intelligence)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-10 flex min-h-13 items-center justify-center rounded-[0.7rem] border text-[11px] font-bold uppercase tracking-[0.14em] ${
                  tier.featured
                    ? 'border-[var(--color-accent-intelligence)] bg-[var(--color-accent-intelligence)] text-white'
                    : 'border-[var(--color-border-strong)] bg-white text-[var(--color-text)]'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoverageSection({
  cveCount,
  articlesCount,
  analystsCount,
  categoriesCount,
  loadedCVEs,
}: {
  cveCount: number;
  articlesCount: number;
  analystsCount: number;
  categoriesCount: number;
  loadedCVEs: number;
}) {
  const rows = [
    {
      label: 'Indexed CVEs',
      value: cveCount.toLocaleString(),
      detail: 'Current CVE coverage available in the indexed platform dataset.',
      icon: Shield,
    },
    {
      label: 'Published Briefings',
      value: articlesCount.toLocaleString(),
      detail: 'Briefings currently loaded for the homepage intelligence layer.',
      icon: Activity,
    },
    {
      label: 'Categories',
      value: categoriesCount.toLocaleString(),
      detail: 'Available intelligence categories grouped in the current dataset.',
      icon: Database,
    },
    {
      label: 'Analyst Context',
      value: analystsCount.toLocaleString(),
      detail: 'Analyst profiles available to support richer interpretation.',
      icon: Users,
    },
    {
      label: 'Loaded CVEs',
      value: loadedCVEs.toLocaleString(),
      detail: 'Recent CVE samples loaded for the homepage view.',
      icon: Bug,
    },
  ];

  return (
    <section className="border-t border-[var(--color-border)] bg-white px-6 py-18 lg:px-10 lg:py-20">
      <div className="mx-auto grid max-w-[1360px] gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <h2 className="text-[3rem] font-serif font-normal leading-[1.02] text-[var(--color-text)] sm:text-[3.7rem]">
            COVERAGE AT SCALE
          </h2>
          <div className="relative mt-8 aspect-[16/8] overflow-hidden rounded-[1rem] bg-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_38%,rgba(243,107,33,0.2),transparent_9%),radial-gradient(circle_at_48%_36%,rgba(243,107,33,0.18),transparent_8%),radial-gradient(circle_at_72%_42%,rgba(243,107,33,0.2),transparent_9%)]" />
            <svg
              className="absolute inset-0 h-full w-full opacity-70"
              viewBox="0 0 900 450"
              fill="none"
            >
              <pattern
                id="coverageDots"
                x="0"
                y="0"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="2" r="1.4" fill="rgba(17,17,17,0.35)" />
              </pattern>
              <rect width="900" height="450" fill="url(#coverageDots)" />
              <path
                d="M80 196C180 110 268 118 380 196C492 274 612 286 794 176"
                stroke="#F36B21"
                strokeOpacity="0.35"
              />
              <path d="M214 298C356 210 510 198 706 302" stroke="#F36B21" strokeOpacity="0.25" />
            </svg>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.15)_45%,rgba(255,255,255,0.55)_100%)]" />
          </div>
          <div className="mt-5 flex flex-wrap gap-5 text-[11px] text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--color-accent-intelligence)]" />
              Indexed coverage
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#D6B56D]" />
              Dataset categories
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E8D9B0]" />
              Loaded samples
            </span>
          </div>
        </div>

        <div>
          <div className="mb-8 border-l border-[var(--color-border)] pl-8 text-[15px] leading-8 text-[var(--color-text-muted)]">
            Dataset coverage presented with local relevance and transparent counts from the current
            homepage resources.
          </div>
          <div className="space-y-4">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[auto_0.38fr_1fr_auto] items-center gap-4 rounded-[1rem] border border-[var(--color-border)] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(17,17,17,0.035)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                    <Icon className="h-5 w-5 text-[var(--color-text)]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      {row.label}
                    </div>
                    <div className="mt-1 text-[1.75rem] font-semibold text-[var(--color-accent-intelligence)]">
                      {row.value}
                    </div>
                  </div>
                  <div className="text-[12px] leading-6 text-[var(--color-text-muted)]">
                    {row.detail}
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ articlesCount, cveCount }: { articlesCount: number; cveCount: number }) {
  return (
    <section className="px-6 pb-12 pt-7 lg:px-10 lg:pb-16 lg:pt-8">
      <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[1.35rem] border border-[#161616] bg-[#050505] shadow-[0_30px_80px_rgba(0,0,0,0.24)]">
        <div className="relative grid gap-8 px-7 py-9 md:px-10 md:py-10 lg:grid-cols-[0.64fr_1.04fr_0.52fr] lg:items-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_21%_50%,rgba(243,107,33,0.12),transparent_22%),linear-gradient(140deg,rgba(255,255,255,0.04),rgba(255,255,255,0))]" />

          <div className="relative flex justify-center lg:justify-start">
            <div className="relative aspect-square w-full max-w-[310px] overflow-hidden rounded-[1rem]">
              <Image
                src="/brand/homepage-cta-crest.png"
                alt="ZAYRON-X black and gold crest"
                fill
                sizes="(min-width: 1024px) 320px, 80vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="relative space-y-4 text-white lg:pl-2">
            <SectionEyebrow dark>Stay ahead. Stay protected.</SectionEyebrow>
            <h2 className="max-w-[700px] text-[3rem] font-serif font-normal leading-[0.95] sm:text-[3.85rem]">
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

          <div className="relative flex flex-col items-start gap-4 lg:items-end lg:justify-center">
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
  const { articles, cves, analysts, cveCount, categories, posts } = await getHomeData();

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

  const monitorCards = [
    {
      label: 'Indexed CVEs',
      value: cveCount.toLocaleString(),
      detail: 'Current vulnerability coverage available in the platform dataset.',
      icon: Shield,
    },
    {
      label: 'Published Briefings',
      value: articles.length.toLocaleString(),
      detail: 'Briefings currently loaded for this homepage experience.',
      icon: Activity,
    },
    {
      label: 'Analyst Context',
      value: analysts.length.toLocaleString(),
      detail: 'Analyst profiles available to support interpretation.',
      icon: Users,
    },
    {
      label: 'Category Coverage',
      value: categories.length.toLocaleString(),
      detail: 'Current indexed data grouped by available categories.',
      icon: Radar,
    },
    {
      label: 'Loaded CVE Samples',
      value: cves.length.toLocaleString(),
      detail: 'Recent CVE records loaded into the homepage view.',
      icon: AlertTriangle,
    },
    {
      label: 'Loaded Intelligence Items',
      value: articles.length.toLocaleString(),
      detail: 'Article records loaded from the current homepage query.',
      icon: Database,
    },
  ];

  const teamCards = [
    {
      title: 'Small IT Teams',
      text: 'Helps organize indexed CVEs and published briefings into a calmer review surface.',
      icon: Users,
    },
    {
      title: 'Healthcare Clinics',
      text: 'Supports risk review for teams watching patient-facing systems and vendor exposure.',
      icon: ShieldCheck,
    },
    {
      title: 'Financial Organizations',
      text: 'Helps teams connect vulnerability context with published intelligence briefings.',
      icon: Building2,
    },
    {
      title: 'Security Analysts',
      text: 'Organizes current CVEs, categories, and briefings into a clearer investigation flow.',
      icon: Server,
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
      <TelegramSignalDesk posts={posts} />
      <MonitorsSection cards={monitorCards} />
      <LeanTeamsSection cards={teamCards} />
      <PricingSection />
      <CoverageSection
        cveCount={cveCount}
        articlesCount={articles.length}
        analystsCount={analysts.length}
        categoriesCount={categories.length}
        loadedCVEs={cves.length}
      />
      <FinalCTA articlesCount={articles.length} cveCount={cveCount} />
    </main>
  );
}
