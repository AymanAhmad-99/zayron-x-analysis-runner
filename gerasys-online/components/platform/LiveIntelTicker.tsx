'use client';

import type { Article, CVE } from '@/lib/types';
import { useEffect, useMemo, useState } from 'react';

interface LiveIntelTickerProps {
  articles: Article[];
  cves: CVE[];
  categories?: { category: string; count: number }[];
}

function formatTickerDate(date: string | Date | null | undefined) {
  if (!date) return 'Updating';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function LiveIntelTicker({ articles, cves }: LiveIntelTickerProps) {
  const items = useMemo(() => {
    const articleItems = articles.slice(0, 4).map((article) => ({
      key: `article-${article.id}`,
      type: article.category ?? 'Intelligence',
      title: article.title,
      meta: formatTickerDate(article.publishedAt || article.createdAt),
      href: `/intelligence/${(article.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${article.slug}`,
    }));

    const cveItems = cves.slice(0, 4).map((cve) => ({
      key: `cve-${cve.id}`,
      type: cve.severity || 'CVE',
      title: cve.cveId || 'CVE Record',
      meta: formatTickerDate(cve.publishedDate),
      href: `/cve/${cve.cveId}`,
    }));

    return [...articleItems, ...cveItems];
  }, [articles, cves]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="bg-[var(--color-bg-soft)] border-y border-[var(--color-border)] py-3.5 px-6 font-mono text-[10px] uppercase select-none flex items-center gap-6 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 border-r border-[var(--color-border)] pr-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)]" />
          <span className="font-black text-[var(--color-text)] tracking-wider">
            Intelligence Updates
          </span>
        </div>
        <div className="text-[var(--color-text-muted)] font-bold normal-case">
          No intelligence updates available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-soft)] border-y border-[var(--color-border)] py-3.5 px-6 font-mono text-[10px] uppercase select-none flex items-center gap-6 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0 border-r border-[var(--color-border)] pr-6">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)]" />
        <span className="font-black text-[var(--color-text)] tracking-wider">
          Intelligence Updates
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden h-5">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-in-out"
          style={{ transform: `translateY(${-activeIndex * 20}px)` }}
        >
          {items.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="h-5 flex items-center gap-2 text-[var(--color-text-muted)] font-bold normal-case whitespace-nowrap"
            >
              <span className="text-[var(--color-accent-intelligence)] uppercase tracking-[0.16em]">
                {item.type}
              </span>
              <span className="text-neutral-300">/</span>
              <span className="truncate">{item.title}</span>
              <span className="text-neutral-300">/</span>
              <span className="uppercase tracking-[0.12em] text-neutral-400">{item.meta}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
