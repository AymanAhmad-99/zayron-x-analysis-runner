import React from 'react';

export type SourceTrustType = 'trusted' | 'secondary' | 'claim' | 'unverified';

interface SourceChipProps {
  sourceName: string;
  sourceType?: string;
  trustType?: SourceTrustType;
  trustScore?: number;
  onClickProvenance?: () => void;
  className?: string;
}

const trustStyles: Record<SourceTrustType, { badge: string; text: string }> = {
  trusted: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-700/20', text: 'VERIFIED' },
  secondary: { badge: 'bg-sky-50 text-sky-700 border-sky-700/20', text: 'CORROBORATED' },
  claim: { badge: 'bg-amber-50 text-amber-700 border-amber-700/20', text: 'CLAIM' },
  unverified: { badge: 'bg-[#F7F7F5] text-[#111111] border-[#111111]/10', text: 'UNVERIFIED' },
};

export const SourceChip: React.FC<SourceChipProps> = ({
  sourceName,
  sourceType,
  trustType = 'unverified',
  trustScore,
  onClickProvenance,
  className = '',
}) => {
  const style = trustStyles[trustType] || trustStyles.unverified;

  return (
    <button
      type="button"
      onClick={onClickProvenance}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-none text-xs font-sans border bg-white border-[#111111]/20 hover:border-[#111111] transition-colors group ${className}`}
      title="Click to view source evidence and provenance"
    >
      <span className="font-bold text-[#111111] group-hover:text-[#FF6B00] transition-colors">
        {sourceName}
      </span>
      {sourceType && (
        <span className="text-[#2D2D2D] text-[10px] uppercase font-bold tracking-widest">
          [{sourceType}]
        </span>
      )}
      <span className={`px-1.5 py-0.5 rounded-none text-[10px] font-sans font-bold tracking-wider uppercase border ${style.badge}`}>
        {style.text}
        {trustScore !== undefined && ` ${(trustScore * 100).toFixed(0)}%`}
      </span>
    </button>
  );
};
