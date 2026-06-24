export const revalidate = 60;

import { getCached } from '@/lib/cache/redis';
import { getAnalysts } from '@/lib/supabase/queries/analysts';
import { getArticles, getCategoriesWithCounts } from '@/lib/supabase/queries/articles';
import { getCVECount, getRecentCVEs } from '@/lib/supabase/queries/cves';
import type { Analyst, Article, CVE } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { cache } from 'react';

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

export default async function HomePage() {
  const { articles, cves, analysts, cveCount, categories } = await getHomeData();

  const topCVEs = cves.slice(0, 5);
  const feedArticles = articles.slice(0, 5);
  const latestExecutiveInsight = articles[0] ?? null;

  const summaryCards = [
    {
      label: 'CVEs Indexed',
      value: cveCount.toLocaleString(),
      detail: 'Current CVE coverage',
      icon: Shield,
    },
    {
      label: 'Published Briefings',
      value: articles.length.toLocaleString(),
      detail: 'Latest loaded briefings',
      icon: AlertTriangle,
    },
    {
      label: 'Analyst Context',
      value: analysts.length.toLocaleString(),
      detail: 'Analyst profiles available',
      icon: Bug,
    },
    {
      label: 'Category Coverage',
      value: categories.length.toLocaleString(),
      detail: 'Current indexed data',
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
      label: 'CVEs indexed',
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
      label: 'Current indexed data',
      icon: Layers,
    },
  ];

  const sectorCards = [
    {
      title: 'Small IT Teams',
      text: 'Get enterprise-grade visibility without the enterprise complexity.',
      icon: Users,
    },
    {
      title: 'Healthcare Clinics',
      text: 'Review published intelligence and CVE coverage relevant to patient-facing systems.',
      icon: Shield,
    },
    {
      title: 'Financial Organizations',
      text: 'Stay ahead of financial threats and regulatory exposure.',
      icon: Building2,
    },
    {
      title: 'Security Analysts',
      text: 'Accelerate investigations with actionable context and clear priorities.',
      icon: ShieldCheck,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-[var(--color-text)] font-sans">
      <section className="border-b border-[var(--color-border)] bg-white px-6 pb-12 pt-12 lg:px-10 lg:pt-16">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:gap-14">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)]" />
              Latest indexed intelligence
            </div>

            <div className="space-y-5">
              <h1 className="max-w-[620px] text-[3rem] font-serif font-normal leading-[0.96] tracking-[-0.04em] text-[var(--color-text)] sm:text-[4.8rem]">
                INTELLIGENCE
                <br />
                THAT SEES
                <br />
                <span className="text-[var(--color-accent-intelligence)]">WHAT OTHERS</span>
                <br />
                <span className="text-[var(--color-accent-intelligence)]">DON&apos;T.</span>
              </h1>

              <p className="max-w-[500px] text-[15px] leading-8 text-[var(--color-text-muted)]">
                ZAYRON-X brings published intelligence briefings, CVE coverage, analyst context, and
                executive-ready reporting into one refined platform experience.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dark-web-recon"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#050505] px-7 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[var(--color-accent-intelligence)]"
              >
                Go to Dashboard
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/intelligence/threat-intelligence"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white px-7 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--color-text)] shadow-[0_12px_30px_rgba(17,17,17,0.06)] transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-soft)]"
              >
                Explore Threats
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="pt-3">
              <LiveFeedTicker articles={articles} cves={cves} />
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-1/2 hidden h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(243,107,33,0.18)] lg:block" />
            <div className="absolute left-[18%] top-[18%] hidden h-2 w-2 rounded-full bg-[var(--color-accent-intelligence)] lg:block" />
            <div className="absolute left-[74%] top-[58%] hidden h-2 w-2 rounded-full bg-[var(--color-accent-intelligence)] lg:block" />

            <div className="relative aspect-[1.12/1] overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-bg-soft)] shadow-[0_40px_90px_rgba(17,17,17,0.08)]">
              <Image
                src="/hero_architecture_x.png"
                alt="ZAYRON-X luxury homepage hero"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 720px"
                className="object-cover"
              />
              <div className="absolute bottom-10 right-8 rounded-2xl bg-white/82 px-6 py-5 text-right backdrop-blur">
                <div className="text-[42px] font-serif tracking-[-0.03em] text-[var(--color-text)]">
                  ZAYRON-X
                </div>
                <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                  See. Analyze. Protect.
                </div>
                <div className="ml-auto mt-4 h-0.5 w-12 rounded-full bg-[var(--color-accent-intelligence)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-8 lg:px-10 lg:py-10">
        <div className="mx-auto grid max-w-[1400px] gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-[1.6rem] border border-[var(--color-border)] bg-white px-7 py-6 shadow-[0_18px_45px_rgba(17,17,17,0.04)]"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {card.label}
                    </div>
                  </div>
                </div>
                <div className="text-[2.65rem] font-semibold tracking-[-0.04em] text-[var(--color-text)]">
                  {card.value}
                </div>
                <div className="mt-2 text-[14px] text-[var(--color-text-muted)]">{card.detail}</div>
                <div className="mt-5 h-0.5 w-10 rounded-full bg-[var(--color-accent-intelligence)]" />
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-6 pb-12 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <GlobalThreatMap articles={articles} cves={cves} categories={categories} />
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-6 py-16 lg:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[1fr_1fr_0.92fr]">
          <div className="rounded-[1.7rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_20px_45px_rgba(17,17,17,0.04)]">
            <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
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
                  return (
                    <div
                      key={cve.id}
                      className="flex items-start gap-4 border-b border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0"
                    >
                      <span
                        className={`mt-0.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold ${
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
              Explore All CVEs
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-[1.7rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_20px_45px_rgba(17,17,17,0.04)]">
            <div className="mb-5 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
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
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg-soft)] text-[var(--color-text)]">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`}
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
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  No briefings available.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="overflow-hidden rounded-[1.7rem] border border-[#1b1b1b] bg-[#0A0A0A] p-7 text-white shadow-[0_24px_50px_rgba(0,0,0,0.22)]">
              <div className="mb-5 flex items-center gap-2 border-b border-white/10 pb-4">
                <span className="text-[30px] leading-none text-[var(--color-accent-intelligence)]">
                  &ldquo;
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
                  Executive Insight
                </span>
              </div>

              {latestExecutiveInsight ? (
                <>
                  <h3 className="text-[15px] font-medium leading-7 text-white">
                    {latestExecutiveInsight.title}
                  </h3>
                  <p className="mt-4 text-[13px] leading-7 text-white/70">
                    {latestExecutiveInsight.excerpt ||
                      latestExecutiveInsight.subtitle ||
                      'Summary excerpt for the latest published intelligence briefing.'}
                  </p>
                  <Link
                    href={`/intelligence/${(latestExecutiveInsight.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${latestExecutiveInsight.slug}`}
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
              value={articles.length}
              title="Current Indexed Data"
              subtitle="Published intelligence briefings"
              footer={`${cveCount.toLocaleString()} CVEs currently indexed`}
            />
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-12 lg:px-10">
        <div className="mx-auto max-w-[1400px] text-center">
          <span className="inline-flex items-center gap-4 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span>Coverage across key sectors</span>
            <span className="h-0.5 w-10 rounded-full bg-[var(--color-accent-intelligence)]" />
          </span>
          <div className="mt-8 grid gap-6 md:grid-cols-3 xl:grid-cols-5">
            {[
              { label: 'Financial Institutions', icon: Building2 },
              { label: 'Government Agencies', icon: Lock },
              { label: 'Healthcare Organizations', icon: ShieldCheck },
              { label: 'Technology Companies', icon: Server },
              { label: 'Enterprise Businesses', icon: Users },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-center gap-3 text-left">
                  <Icon className="h-6 w-6 text-[var(--color-text-muted)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-white px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-[3rem] font-serif font-normal leading-[1.02] tracking-[-0.04em] text-[var(--color-text)] sm:text-[4rem]">
              WHAT ZAYRON-X
              <br />
              <span className="text-[var(--color-accent-intelligence)]">MONITORS</span>
            </h2>
            <div className="flex max-w-[520px] items-start gap-8">
              <div className="hidden h-20 w-px bg-[var(--color-border)] lg:block" />
              <p className="pt-2 text-[15px] leading-8 text-[var(--color-text-muted)]">
                Continuous monitoring of global threats, vulnerabilities, and attacker behavior so
                you can act with confidence.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {monitorCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-[1.6rem] border border-[var(--color-border)] bg-white px-7 py-6 shadow-[0_18px_45px_rgba(17,17,17,0.04)]"
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {card.label}
                    </div>
                  </div>
                  <div className="text-[2.7rem] font-semibold tracking-[-0.04em] text-[var(--color-text)]">
                    {card.title}
                  </div>
                  <div className="mt-5 h-0.5 w-10 rounded-full bg-[var(--color-accent-intelligence)]" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-bg-soft)] px-6 py-20 lg:px-10">
        <div className="absolute bottom-0 right-0 hidden h-[420px] w-[340px] opacity-40 lg:block">
          <Image
            src="/hero_architecture_x.png"
            alt=""
            fill
            sizes="340px"
            className="object-cover object-right-bottom opacity-20"
          />
        </div>
        <div className="relative mx-auto max-w-[1400px]">
          <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <h2 className="text-[3rem] font-serif font-normal leading-[1.02] tracking-[-0.04em] text-[var(--color-text)] sm:text-[4rem]">
              BUILT FOR
              <br />
              LEAN SECURITY TEAMS
            </h2>
            <div className="flex max-w-[520px] items-start gap-8">
              <div className="hidden h-20 w-px bg-[var(--color-border)] lg:block" />
              <p className="pt-2 text-[15px] leading-8 text-[var(--color-text-muted)]">
                Purpose-built intelligence for teams that need clarity, speed, and impact.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {sectorCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-[1.6rem] border border-[var(--color-border)] bg-white p-7 shadow-[0_18px_45px_rgba(17,17,17,0.04)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-8 text-[26px] font-serif font-normal tracking-[-0.03em] text-[var(--color-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-[14px] leading-8 text-[var(--color-text-muted)]">
                    {item.text}
                  </p>
                  <span className="mt-8 inline-flex text-[24px] text-[var(--color-accent-intelligence)]">
                    →
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PricingTiers />

      <section className="border-b border-[var(--color-border)] bg-white px-6 py-20 lg:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start">
              <h2 className="text-[3rem] font-serif font-normal leading-[1.02] tracking-[-0.04em] text-[var(--color-text)] sm:text-[4rem]">
                COVERAGE AT SCALE
              </h2>
              <div className="hidden h-20 w-px bg-[var(--color-border)] lg:block" />
              <p className="max-w-[280px] pt-2 text-[15px] leading-8 text-[var(--color-text-muted)]">
                Global intelligence with local relevance.
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_18px_45px_rgba(17,17,17,0.04)]">
              <div className="relative aspect-[16/9] overflow-hidden rounded-[1.2rem] bg-[radial-gradient(circle_at_30%_30%,rgba(243,107,33,0.14),transparent_26%),linear-gradient(180deg,#fff,#faf9f6)]">
                <svg className="h-full w-full" viewBox="0 0 780 430" fill="none">
                  <pattern
                    id="coverageDots"
                    x="0"
                    y="0"
                    width="10"
                    height="10"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="1.5" cy="1.5" r="1.3" fill="#d4cec5" />
                  </pattern>
                  <rect width="780" height="430" fill="url(#coverageDots)" opacity="0.85" />
                  <circle cx="150" cy="170" r="10" fill="#F36B21" />
                  <circle cx="365" cy="190" r="10" fill="#F36B21" />
                  <circle cx="570" cy="195" r="10" fill="#F36B21" />
                  <path
                    d="M150 170C220 150 305 160 365 190"
                    stroke="#F36B21"
                    strokeOpacity="0.45"
                    strokeWidth="2"
                  />
                  <path
                    d="M365 190C430 175 515 180 570 195"
                    stroke="#F36B21"
                    strokeOpacity="0.45"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="mt-6 flex flex-wrap gap-6 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent-intelligence)]" />
                  High Coverage
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#D6CEC1]" />
                  Medium Coverage
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#E7E2D8]" />
                  Expanding Coverage
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Globe,
                label: 'Coverage overview',
                value: categories.length.toLocaleString(),
                detail: 'Current indexed categories available across the homepage dataset.',
              },
              {
                icon: Building2,
                label: 'Published briefings',
                value: articles.length.toLocaleString(),
                detail: 'Published intelligence briefings currently loaded for the homepage.',
              },
              {
                icon: TrendingUp,
                label: 'Current indexed data',
                value: cveCount.toLocaleString(),
                detail: 'Current CVE coverage available in the indexed platform dataset.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-start gap-5 rounded-[1.5rem] border border-[var(--color-border)] bg-white px-6 py-5 shadow-[0_14px_35px_rgba(17,17,17,0.04)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {item.label}
                    </div>
                    <div className="mt-2 text-[2.1rem] font-semibold tracking-[-0.04em] text-[var(--color-accent-intelligence)]">
                      {item.value}
                    </div>
                  </div>
                  <p className="max-w-[250px] text-[14px] leading-7 text-[var(--color-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-14 lg:px-10 lg:pb-16">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[1.9rem] border border-[#151515] bg-[#050505] shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
          <div className="grid gap-10 px-8 py-10 md:px-12 md:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-[var(--color-accent-intelligence)]">
                Stay ahead. Stay protected.
              </span>
              <h2 className="max-w-[620px] text-[3rem] font-serif font-normal leading-[0.98] tracking-[-0.04em] text-white sm:text-[4rem]">
                ENTERPRISE-GRADE
                <br />
                INTELLIGENCE,
                <br />
                <span className="text-[var(--color-accent-intelligence)]">REIMAGINED FOR</span>
                <br />
                <span className="text-[var(--color-accent-intelligence)]">SMALL TEAMS.</span>
              </h2>
              <div className="flex flex-wrap gap-4 pt-3">
                <Link
                  href="/register"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[var(--color-accent-intelligence)] px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[var(--color-accent-intelligence-hover)]"
                >
                  Start Monitoring
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

            <div className="relative min-h-[280px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),radial-gradient(circle_at_top_right,rgba(243,107,33,0.16),transparent_28%)]">
              <Image
                src="/cta_royal_crest.png"
                alt="ZAYRON-X luxury crest"
                fill
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
