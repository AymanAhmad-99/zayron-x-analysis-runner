'use client';

import { Activity, ChevronRight } from '@/lib/icons';
import type { Article, CVE } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface LiveFeedTickerProps {
  articles: Article[];
  cves: CVE[];
}

export function LiveFeedTicker({ articles, cves }: LiveFeedTickerProps) {
  const items = useMemo(() => {
    const articleItems = articles.slice(0, 5).map((article) => ({
      id: `article-${article.id}`,
      text: article.title,
      meta: article.category || 'Briefing',
      href: `/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`,
    }));

    const cveItems = cves.slice(0, 5).map((cve) => ({
      id: `cve-${cve.id}`,
      text: cve.cveId || cve.title || 'Latest CVE',
      meta: cve.severity || 'CVE',
      href: `/cve/${cve.cveId}`,
    }));

    return [...articleItems, ...cveItems];
  }, [articles, cves]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [items]);

  if (items.length === 0) return null;

  const currentItem = items[index] ?? items[0] ?? null;

  if (!currentItem) return null;

  return (
    <div className="flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-[var(--color-border)] bg-white px-5 py-2 shadow-[0_14px_28px_rgba(17,17,17,0.045)]">
      <span className="shrink-0 rounded-full bg-[var(--color-accent-intelligence-soft)] px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-accent-intelligence)]">
        Latest indexed
      </span>
      <span className="hidden text-[var(--color-accent-intelligence)] sm:inline">+</span>
      <Link
        href={currentItem.href}
        className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-accent-intelligence)]"
      >
        {currentItem.text}
      </Link>
      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
        {currentItem.meta}
      </span>
    </div>
  );
}

interface GlobalThreatMapProps {
  articles: Article[];
  cves: CVE[];
  categories: { category: string; count: number }[];
}

export function GlobalThreatMap({ articles, cves, categories }: GlobalThreatMapProps) {
  const topCategories = useMemo(() => {
    return [...categories]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5)
      .map((category) => ({
        name: category.category || 'Other',
        count: category.count || 0,
      }));
  }, [categories]);

  const donutData = useMemo(() => {
    const total = topCategories.reduce((sum, item) => sum + item.count, 0) || 1;
    const colors = ['#F36B21', '#F79B4B', '#C8B59A', '#8F7B63', '#5B5147'];
    let currentOffset = 0;

    return topCategories.map((item, index) => {
      const percent = Math.max(4, Math.round((item.count / total) * 100));
      const value = {
        ...item,
        percent,
        color: colors[index] ?? colors[0],
        offset: currentOffset,
      };
      currentOffset += percent;
      return value;
    });
  }, [topCategories]);

  const strokeFor = (percent: number, offset: number) => {
    const circumference = 2 * Math.PI * 36;
    const filled = (percent / 100) * circumference;
    return {
      strokeDasharray: `${filled} ${circumference - filled}`,
      strokeDashoffset: circumference - (offset / 100) * circumference,
    };
  };

  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-[#161616] bg-[#060606] p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,0.24)] lg:p-6">
      <div className="relative mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[2rem] font-semibold uppercase text-white">
            Global Intelligence View
          </h2>
          <p className="mt-1 text-[14px] text-[var(--color-accent-intelligence)]">
            Observed signals across the current dataset
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] text-white/70">
          <span>Briefings {articles.length}</span>
          <span className="text-white/25">/</span>
          <span>CVEs {cves.length}</span>
        </div>
      </div>

      <div className="relative grid gap-5 lg:grid-cols-[1.48fr_0.52fr]">
        <div className="relative min-h-[450px] overflow-hidden rounded-[1.15rem] border border-white/10 bg-black lg:min-h-[520px]">
          <Image
            src="/brand/homepage-map-panel.png"
            alt="Dark dotted world intelligence map with orange connection arcs"
            fill
            sizes="(min-width: 1024px) 68vw, 100vw"
            className="object-cover"
          />
          <div className="absolute left-5 top-5 rounded-[0.9rem] border border-white/10 bg-black/55 px-4 py-3 backdrop-blur">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[var(--color-accent-intelligence)]">
              Indexed platform data
            </div>
            <div className="mt-1 text-[12px] text-white/72">
              Briefings, CVEs, and category coverage
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-white/66">
                Category coverage
              </h3>
              <Link
                href="/news"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-intelligence)]"
              >
                View Briefings
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {topCategories.length > 0 ? (
                topCategories.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-white/36">0{index + 1}</span>
                      <span className="text-[13px] text-white/84">{item.name}</span>
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--color-accent-intelligence)]">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[13px] text-white/60">No categories loaded.</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-white/66">
              Coverage composition
            </div>
            <div className="flex items-center gap-5">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="8"
                    fill="none"
                  />
                  {donutData.map((slice) => (
                    <circle
                      key={slice.name}
                      cx="40"
                      cy="40"
                      r="36"
                      stroke={slice.color}
                      strokeWidth="8"
                      fill="none"
                      style={strokeFor(slice.percent, slice.offset)}
                    />
                  ))}
                </svg>
                <div className="absolute text-center">
                  <div className="text-[24px] font-semibold text-white">{categories.length}</div>
                  <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/45">
                    Total
                  </div>
                </div>
              </div>

              <div className="grid flex-1 gap-2">
                {donutData.map((slice) => (
                  <div key={slice.name} className="flex items-center gap-2 text-[11px] font-mono">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="flex-1 truncate text-white/72">{slice.name}</span>
                    <span className="text-white/45">{slice.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface SecurityScoreGaugeProps {
  value: number;
  title: string;
  subtitle: string;
  footer: string;
}

export function SecurityScoreGauge({ value, title, subtitle, footer }: SecurityScoreGaugeProps) {
  const gaugeValue = Math.min(Math.max(value, 0), 100);
  const radius = 50;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (gaugeValue / 100) * circumference;

  return (
    <div className="rounded-[1.35rem] border border-[var(--color-border)] bg-white p-6 shadow-[0_16px_36px_rgba(17,17,17,0.045)]">
      <div className="border-b border-[var(--color-border)] pb-4">
        <div className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-text)]">
          {title}
        </div>
        <div className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">{subtitle}</div>
      </div>

      <div className="relative mt-8 flex h-32 items-end justify-center overflow-hidden">
        <svg className="absolute bottom-0 h-36 w-36" viewBox="0 0 120 120" aria-hidden="true">
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            stroke="#ECE7DE"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            stroke="#F36B21"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="relative text-center">
          <div className="text-[3rem] font-semibold text-[var(--color-text)]">{value}</div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-accent-intelligence)]">
            Indexed
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] px-4 py-2.5 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Activity className="h-3.5 w-3.5 text-[var(--color-accent-intelligence)]" />
        <span>{footer}</span>
      </div>
    </div>
  );
}
