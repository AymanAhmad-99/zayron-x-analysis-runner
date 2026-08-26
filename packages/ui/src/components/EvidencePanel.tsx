'use client';

import React, { useState } from 'react';

export interface EvidenceItem {
  id: string;
  sourceName: string;
  type: string;
  url?: string;
  snippet?: string;
  weight: number;
  capturedAt: string;
}

interface EvidencePanelProps {
  evidence: EvidenceItem[];
  defaultExpanded?: boolean;
  className?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className={`border border-[#111111]/20 bg-[#F7F7F5] overflow-hidden rounded-none ${className}`}>
      <header className="px-4 py-3 flex items-center justify-between border-b border-[#111111]/10 bg-[#FFFFFF]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-none bg-[#00A8FF]" />
          <h3 className="text-xs font-sans font-bold tracking-widest text-[#111111] uppercase">
            Evidence & Provenance ({evidence.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#2D2D2D] hover:text-[#FF6B00] transition-colors"
        >
          [{isExpanded ? 'COLLAPSE' : 'EXPAND'}]
        </button>
      </header>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {evidence.length === 0 ? (
            <p className="text-xs text-[#2D2D2D] font-sans">No raw provenance records attached.</p>
          ) : (
            evidence.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#FFFFFF] border border-[#111111]/10 space-y-2 rounded-none"
              >
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-bold text-[#111111]">{item.sourceName}</span>
                  <span className="text-[#2D2D2D] text-[10px] uppercase font-bold tracking-wider">
                    Weight: {(item.weight * 100).toFixed(0)}% | Type: {item.type}
                  </span>
                </div>
                {item.snippet && (
                  <blockquote className="text-sm text-[#111111] font-serif border-l-2 border-[#FF6B00] pl-3 py-1 bg-[#F7F7F5] italic">
                    "{item.snippet}"
                  </blockquote>
                )}
                <div className="flex items-center justify-between text-[10px] font-sans text-[#2D2D2D] pt-2 mt-2 border-t border-[#111111]/10">
                  <span className="uppercase tracking-wider">Captured: {new Date(item.capturedAt).toISOString()}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF6B00] hover:underline font-bold uppercase tracking-wider"
                    >
                      Inspect Reference &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};
