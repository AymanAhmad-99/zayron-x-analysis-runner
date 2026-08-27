import React from 'react';
import { MASTER_KNOWLEDGE_ENTITIES_115 } from '@zayron/intelligence';

export const metadata = {
  title: 'CTI Source Directory — ZAYRON-X',
  description: 'Transparent collection registry of monitored threat channels, government CERTs, vulnerability registries, and frontline incident response feeds.',
};

const TIER_LABELS: Record<number, string> = {
  0: 'Primary Authoritative',
  1: 'Professional Research',
  2: 'ZAYRON-X Telemetry',
  3: 'Secondary Reporting',
  4: 'Community',
};

export default function SourceDirectoryPage() {
  const sources = MASTER_KNOWLEDGE_ENTITIES_115.filter(
    e => e.document_type === 'source_channel' ||
         e.document_type === 'vendor_advisory' ||
         e.document_type === 'research_org'
  );

  // Group by authority tier
  const tiers = [0, 1, 2, 3, 4];
  const grouped = tiers.reduce<Record<number, typeof sources>>((acc, t) => {
    const items = sources.filter(s => s.authority_tier === t);
    if (items.length > 0) acc[t] = items;
    return acc;
  }, {});

  return (
    <div className="flex flex-col w-full bg-[#F5F4F0] text-[#111214]">
      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#E1DFD7] bg-[#FFFFFF] py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8C8F98] mb-4">
            <span className="w-4 h-px bg-[#E1DFD7]" />
            Collection Map &amp; Provenance
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-4 leading-tight uppercase">
            Verified CTI Source Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed max-w-2xl mb-8">
            Transparent registry of monitored threat channels, government CERTs,
            vulnerability databases, and frontline incident response feeds.
          </p>
          <div className="flex flex-wrap gap-8 pt-6 border-t border-[#E1DFD7]">
            <div>
              <div className="text-2xl font-bold text-[#111214] font-mono">{sources.length}</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Verified Sources</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#D9531E] font-mono">
                {sources.filter(s => s.authority_tier === 0 || s.authority_tier === 1).length}
              </div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Tier 0–1 Authoritative</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST MATRIX ── */}
      <section className="w-full py-8 border-b border-[#E1DFD7] bg-[#FFFFFF]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-[10px] font-mono text-[#8C8F98] uppercase mb-4">Source Authority Framework</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {tiers.map(t => (
              <div key={t} className="bg-[#F5F4F0] border border-[#E1DFD7] p-4 rounded-[4px]">
                <div className="text-base font-bold text-[#111214] font-mono mb-1">Tier {t}</div>
                <div className="text-[11px] text-[#5A5D65] leading-tight">{TIER_LABELS[t]}</div>
                <div className="text-[10px] font-mono text-[#8C8F98] mt-2">{grouped[t]?.length ?? 0} sources</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOURCES BY TIER ── */}
      {tiers.map(t => {
        const items = grouped[t];
        if (!items || items.length === 0) return null;
        return (
          <section key={t} className="w-full py-12 border-b border-[#E1DFD7]">
            <div className="max-w-[1280px] mx-auto px-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-[#E1DFD7]" />
                <div className="text-center px-4">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#111214] font-mono">
                    Tier {t} — {TIER_LABELS[t]}
                  </div>
                </div>
                <div className="flex-1 h-px bg-[#E1DFD7]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((src) => (
                  <div key={src.id} className="bg-[#FFFFFF] border border-[#E1DFD7] p-5 rounded-[6px] hover:border-[#111214] transition-colors flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#D9531E]">
                          {src.topic}
                        </span>
                        <span className="text-[10px] font-mono text-[#8C8F98]">{src.update_frequency}</span>
                      </div>
                      <h3 className="font-editorial text-sm font-bold text-[#111214] mb-2 leading-snug">{src.title}</h3>
                      <p className="text-xs text-[#5A5D65] leading-relaxed line-clamp-3 mb-4">{src.summary}</p>
                    </div>
                    <div className="pt-3 border-t border-[#E1DFD7] flex items-center justify-between text-xs">
                      <span className="text-[11px] text-[#8C8F98]">{src.publisher}</span>
                      {src.source_url && (
                        <a
                          href={src.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold uppercase tracking-wider text-[#111214] hover:text-[#D9531E] transition-colors"
                        >
                          Open Source &rarr;
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
