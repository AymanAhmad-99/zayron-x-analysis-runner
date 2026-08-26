import React from 'react';
import { ThreatBadge, ThreatSeverity } from './ThreatBadge';
import { SourceChip } from './SourceChip';
import { EntityPill } from './EntityPill';

export type CardState = 'default' | 'critical' | 'selected' | 'loading' | 'stale';

export interface IntelligenceCardProps {
  id: string;
  title: string;
  summary?: string;
  severity: ThreatSeverity;
  confidence: number;
  firstSeenAt: string;
  sourceName?: string;
  cves?: string[];
  actors?: string[];
  state?: CardState;
  onClick?: () => void;
  className?: string;
}

export const IntelligenceCard: React.FC<IntelligenceCardProps> = ({
  title,
  summary,
  severity,
  confidence,
  firstSeenAt,
  sourceName,
  cves = [],
  actors = [],
  state = 'default',
  onClick,
  className = '',
}) => {
  if (state === 'loading') {
    return (
      <article className="p-6 bg-[#FFFFFF] border border-[#111111]/10 rounded-none animate-pulse space-y-4">
        <div className="h-4 bg-[#F7F7F5] border border-[#111111]/5 w-1/3" />
        <div className="h-6 bg-[#F7F7F5] border border-[#111111]/5 w-4/5" />
        <div className="h-4 bg-[#F7F7F5] border border-[#111111]/5 w-full" />
      </article>
    );
  }

  const borderClass =
    state === 'critical' || severity === 'critical'
      ? 'border-l-4 border-l-[#D92D20] border-[#111111]/10'
      : state === 'selected'
      ? 'border-[#FF6B00]'
      : 'border-[#111111]/10 hover:border-[#111111]';

  return (
    <article
      onClick={onClick}
      className={`p-6 bg-[#FFFFFF] border rounded-none transition-colors cursor-pointer flex flex-col h-full ${borderClass} ${className}`}
    >
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ThreatBadge severity={severity} />
          <span className="text-xs font-mono font-bold text-[#111111]">
            CONF: {(confidence * 100).toFixed(0)}%
          </span>
        </div>
        <time className="text-[10px] font-mono font-bold text-[#2D2D2D] uppercase tracking-wider">
          {new Date(firstSeenAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </time>
      </header>

      <div className="flex-1 mb-8">
        <h3 className="text-xl font-bold font-sans text-[#111111] leading-snug mb-3">
          {title}
        </h3>
        {summary && (
          <p className="text-sm font-sans text-[#2D2D2D] line-clamp-3 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-[#111111]/10 mt-auto">
        <div className="flex flex-wrap items-center gap-2">
          {cves.slice(0, 2).map((cve) => (
            <EntityPill key={cve} type="cve" value={cve} />
          ))}
          {actors.slice(0, 1).map((actor) => (
            <EntityPill key={actor} type="actor" value={actor} />
          ))}
        </div>

        {sourceName && (
          <SourceChip sourceName={sourceName} trustType="trusted" />
        )}
      </footer>
    </article>
  );
};
