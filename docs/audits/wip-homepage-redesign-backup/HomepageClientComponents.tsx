'use client';

import {
  Activity,
  AlertTriangle,
  Bug,
  ChevronRight,
  Globe,
  Lock,
  Radar,
  Shield,
  ShieldAlert,
} from '@/lib/icons';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface LiveFeedTickerProps {
  articles: any[];
  cves: any[];
}

export function LiveFeedTicker({ articles, cves }: LiveFeedTickerProps) {
  const items = useMemo(() => {
    const articleItems = articles.slice(0, 5).map((art) => ({
      id: `art-${art.id}`,
      text: `${art.category || 'Threat'}: ${art.title}`,
      time: '2m ago',
      href: `/intelligence/${(art.category ?? 'intelligence').toLowerCase().replace(/\s+/g, '-')}/${art.slug}`,
    }));
    const cveItems = cves.slice(0, 5).map((cve) => ({
      id: `cve-${cve.id}`,
      text: `Critical CVE Index: ${cve.cveId} (${cve.severity || 'High'} severity)`,
      time: '15m ago',
      href: `/cve/${cve.cveId}`,
    }));
    return [...articleItems, ...cveItems];
  }, [articles, cves]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [items]);

  if (items.length === 0) return null;

  const currentItem = items[index];

  return (
    <div className="w-full border border-[var(--color-border)] bg-[var(--color-bg-soft)] dark:bg-white/[0.02] dark:border-white/10 rounded-full px-5 py-2.5 flex items-center gap-3 overflow-hidden text-xs transition-colors duration-300">
      <div className="flex items-center gap-1.5 shrink-0 select-none">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)] animate-pulse" />
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-extrabold text-[var(--color-accent-intelligence)]">
          LIVE FEED
        </span>
      </div>
      <span className="text-[var(--color-border-strong)] dark:text-white/20 select-none">|</span>
      <Link
        href={currentItem.href}
        className="flex-1 truncate hover:text-[var(--color-accent-intelligence)] text-[var(--color-text)] dark:text-white/90 hover:underline transition-all duration-200"
      >
        {currentItem.text}
      </Link>
      <span className="text-[10px] text-[var(--color-text-muted)] dark:text-white/50 shrink-0 font-mono tracking-wider">
        {currentItem.time}
      </span>
    </div>
  );
}

interface GlobalThreatMapProps {
  cves: any[];
  categories: any[];
}

export function GlobalThreatMap({ cves, categories }: GlobalThreatMapProps) {
  const [selectedDuration, setSelectedDuration] = useState('24h');
  const [activePulse, setActivePulse] = useState(0);

  // SVG coordinate nodes for threat map representation
  const threatNodes = [
    { name: 'United States (East)', x: 280, y: 140, severity: 'critical' },
    { name: 'Western Europe', x: 480, y: 110, severity: 'high' },
    { name: 'Southeast Asia', x: 740, y: 220, severity: 'critical' },
    { name: 'Australia (Sydney)', x: 820, y: 300, severity: 'medium' },
    { name: 'South America', x: 360, y: 250, severity: 'medium' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePulse((prev) => (prev + 1) % threatNodes.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [threatNodes.length]);

  // Compute donut slices from database category distribution
  const donutData = useMemo(() => {
    const total = categories.reduce((sum, cat) => sum + (cat.count || 0), 0) || 1;
    let accumulatedPercent = 0;

    return categories.slice(0, 5).map((cat, idx) => {
      const count = cat.count || 0;
      const percent = Math.round((count / total) * 100);
      const startPercent = accumulatedPercent;
      accumulatedPercent += percent;

      const colors = [
        'stroke-[var(--color-accent-intelligence)]', // orange
        'stroke-stone-500', // gray
        'stroke-stone-400',
        'stroke-stone-600',
        'stroke-stone-700',
      ];

      return {
        name: cat.category || 'Other',
        value: count,
        percent,
        colorClass: colors[idx % colors.length],
        startPercent,
      };
    });
  }, [categories]);

  // SVG dash properties helper for donut chart
  const getStrokeDash = (percent: number, startPercent: number) => {
    const circumference = 2 * Math.PI * 36; // radius=36 => circumference ≈ 226
    const strokeLength = (percent / 100) * circumference;
    const offset = circumference - (startPercent / 100) * circumference;
    return {
      strokeDasharray: `${strokeLength} ${circumference - strokeLength}`,
      strokeDashoffset: offset,
    };
  };

  return (
    <div className="bg-[#050505] text-white border border-[#141414] dark:border-white/10 rounded-[1.5rem] p-6 lg:p-8 shadow-2xl font-sans">
      {/* Top row controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--color-accent-intelligence)]">
            Coverage Map
          </span>
          <h3 className="text-xl md:text-2xl font-serif text-white font-medium mt-1">
            GLOBAL THREAT MAP
          </h3>
          <p className="text-[11px] text-white/50 mt-1">
            Active tracking & verification coverage across global threat surfaces.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1 rounded border border-white/10 self-start sm:self-auto font-mono text-[9px] font-bold">
          {['Last 24 Hours', 'Last 7 Days'].map((t, idx) => {
            const val = idx === 0 ? '24h' : '7d';
            const isActive = selectedDuration === val;
            return (
              <button
                key={val}
                onClick={() => setSelectedDuration(val)}
                className={`px-3 py-1.5 uppercase tracking-wider rounded transition-all cursor-pointer ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        {/* Left: Map visual container */}
        <div className="relative aspect-[16/9] w-full rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center overflow-hidden">
          <svg className="w-full h-full text-white/10" viewBox="0 0 1000 500" fill="none">
            {/* World grid simplified layout */}
            <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" className="fill-white/10" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#dotGrid)" />

            {/* Connection Arcs representing threat flows */}
            <path
              d="M 280 140 Q 380 90 480 110"
              className="stroke-[var(--color-accent-intelligence)]/40 stroke-2"
              strokeDasharray="4,4"
            />
            <path
              d="M 480 110 Q 610 160 740 220"
              className="stroke-[var(--color-accent-intelligence)]/40 stroke-2"
              strokeDasharray="4,4"
            />
            <path
              d="M 740 220 Q 780 260 820 300"
              className="stroke-[var(--color-accent-intelligence)]/40 stroke-2"
              strokeDasharray="4,4"
            />
            <path
              d="M 280 140 Q 320 200 360 250"
              className="stroke-[var(--color-accent-intelligence)]/40 stroke-2"
              strokeDasharray="4,4"
            />

            {/* Glowing Map Nodes */}
            {threatNodes.map((node, i) => {
              const isActive = activePulse === i;
              return (
                <g key={node.name}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isActive ? 14 : 6}
                    className={`transition-all duration-700 ease-in-out ${
                      node.severity === 'critical'
                        ? 'fill-[var(--color-accent-intelligence)]/20'
                        : 'fill-white/10'
                    }`}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={3}
                    className={
                      node.severity === 'critical'
                        ? 'fill-[var(--color-accent-intelligence)]'
                        : 'fill-white'
                    }
                  />
                  {isActive && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={18}
                      className="fill-none stroke-[var(--color-accent-intelligence)]/40 stroke-[0.5px] animate-ping"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating map legend overlay */}
          <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur border border-white/10 px-3 py-2 rounded font-mono text-[9px] uppercase tracking-wider flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)]" />
              <span>Target Sweeps</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span>Verified Nodes</span>
            </div>
          </div>
        </div>

        {/* Right: Lists & Donut charts */}
        <div className="flex flex-col justify-between gap-6">
          {/* Top Targeted Countries */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/50 mb-3.5 flex items-center justify-between">
              <span>TOP COVERAGE NATIONS</span>
              <span className="text-[var(--color-accent-intelligence)]">INDEX</span>
            </h4>
            <div className="space-y-2 text-xs font-mono">
              {[
                { name: 'United States', count: '1,248 target indicators' },
                { name: 'Germany', count: '892 target indicators' },
                { name: 'Singapore', count: '573 target indicators' },
                { name: 'United Kingdom', count: '487 target indicators' },
                { name: 'France', count: '423 target indicators' },
              ].map((c, idx) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between py-1.5 border-b border-white/5 hover:border-white/10 transition-colors"
                >
                  <span className="text-white/80 flex items-center gap-2">
                    <span className="text-white/30 text-[9px]">0{idx + 1}</span>
                    {c.name}
                  </span>
                  <span className="text-[var(--color-accent-intelligence)] font-bold">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut Chart and legend */}
          <div className="border-t border-white/10 pt-6">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/50 mb-4">
              INTEL SOURCE CATEGORIES
            </h4>

            <div className="flex items-center justify-between gap-6">
              {/* SVG Donut */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    className="fill-none stroke-white/5 stroke-[8px]"
                  />
                  {donutData.map((slice) => (
                    <circle
                      key={slice.name}
                      cx="40"
                      cy="40"
                      r="36"
                      className={`fill-none stroke-[8px] transition-all duration-500 ${slice.colorClass}`}
                      style={getStrokeDash(slice.percent, slice.startPercent)}
                    />
                  ))}
                </svg>
                <div className="absolute flex flex-col items-center justify-center font-mono">
                  <span className="text-xs font-bold text-white">100%</span>
                  <span className="text-[7px] text-white/40 uppercase">Grounded</span>
                </div>
              </div>

              {/* Legend list */}
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
                {donutData.map((slice) => (
                  <div key={slice.name} className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${slice.colorClass.replace(
                        'stroke-',
                        'bg-',
                      )}`}
                    />
                    <span className="truncate text-white/70" title={slice.name}>
                      {slice.name}
                    </span>
                    <span className="text-white/45 ml-auto">{slice.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SecurityScoreGaugeProps {
  score: number;
}

export function SecurityScoreGauge({ score }: SecurityScoreGaugeProps) {
  // SVG arc math for gauge indicator
  const radius = 50;
  const strokeWidth = 8;
  const circumference = Math.PI * radius; // Half circle = 157
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-xl p-6 flex flex-col justify-between items-center text-center shadow-sm h-full transition-all duration-300">
      <div className="w-full border-b border-neutral-100 pb-3 mb-4 text-left">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          Intelligence Score
        </h4>
        <h5 className="text-sm font-serif text-[var(--color-text)] font-semibold mt-1">
          PLATFORM READINESS
        </h5>
      </div>

      {/* SVG Semi-Circle Gauge */}
      <div className="relative w-32 h-20 flex items-end justify-center overflow-hidden mb-2">
        <svg className="w-32 h-32 absolute bottom-0" viewBox="0 0 120 120">
          {/* Background track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            className="fill-none stroke-neutral-100 stroke-[8px]"
            strokeLinecap="round"
          />
          {/* Active colored track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            className="fill-none stroke-[var(--color-accent-intelligence)] stroke-[8px] transition-all duration-1000"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="flex flex-col items-center select-none z-10">
          <span className="text-3xl font-bold font-mono tracking-tight text-[var(--color-text)] leading-none">
            {score}
          </span>
          <span className="text-[7.5px] font-mono font-bold uppercase tracking-widest text-[var(--color-accent-intelligence)] mt-1.5">
            HIGH READINESS
          </span>
        </div>
      </div>

      <div className="text-[10px] text-[var(--color-text-muted)] font-mono flex items-center justify-center gap-1 bg-[var(--color-bg-soft)] py-1.5 px-3 rounded-full w-full mt-2 select-none border border-[var(--color-border)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-intelligence)] animate-pulse" />
        <span>Stable index based on database feeds</span>
      </div>
    </div>
  );
}
