import React from 'react';

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

interface ThreatBadgeProps {
  severity: ThreatSeverity;
  score?: number;
  className?: string;
}

const severityConfig: Record<ThreatSeverity, { label: string; bg: string; text: string; border: string; dot: string }> = {
  critical: {
    label: 'CRITICAL',
    bg: 'bg-white',
    text: 'text-[#D92D20]',
    border: 'border-[#D92D20]',
    dot: 'bg-[#D92D20]',
  },
  high: {
    label: 'HIGH',
    bg: 'bg-white',
    text: 'text-[#FF6B00]',
    border: 'border-[#FF6B00]',
    dot: 'bg-[#FF6B00]',
  },
  medium: {
    label: 'MEDIUM',
    bg: 'bg-white',
    text: 'text-amber-600',
    border: 'border-amber-600',
    dot: 'bg-amber-600',
  },
  low: {
    label: 'LOW',
    bg: 'bg-white',
    text: 'text-emerald-700',
    border: 'border-emerald-700',
    dot: 'bg-emerald-700',
  },
  unknown: {
    label: 'UNASSESSED',
    bg: 'bg-[#F7F7F5]',
    text: 'text-[#2D2D2D]',
    border: 'border-[#111111]/20',
    dot: 'bg-[#2D2D2D]',
  },
};

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({ severity, score, className = '' }) => {
  const config = severityConfig[severity] || severityConfig.unknown;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[10px] font-sans font-bold tracking-widest uppercase border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-none ${config.dot}`} aria-hidden="true" />
      <span>{config.label}</span>
      {score !== undefined && <span className="opacity-80">({score.toFixed(1)})</span>}
    </span>
  );
};
