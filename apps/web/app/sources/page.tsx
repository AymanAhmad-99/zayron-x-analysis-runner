import React from 'react';
import { MASTER_KNOWLEDGE_ENTITIES_115 } from '@zayron/intelligence';

export const metadata = {
  title: 'ZAYRON-X Verified CTI Source Directory — Ingestion Channels & Trust Ratings',
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
    <div className="flex flex-col w-full bg-[#F7F7F5] text-[#111111]">

      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#D9DDE2] bg-[#FFFFFF] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#7A838D] mb-6">
            <span className="w-4 h-px bg-[#D9DDE2]" />
            Collection Map & Provenance
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111] mb-4 leading-tight">
            Verified CTI<br />Source Directory
          </h1>
          <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl mb-8">
            Transparent registry of monitored threat channels, government CERTs,
            vulnerability databases, and frontline incident response feeds.
          </p>
          <div className="flex flex-wrap gap-8 pt-8 border-t border-[#D9DDE2]">
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">{sources.length}</div>
              <div className="zx-micro text-[#7A838D] mt-0.5">Verified Sources</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#FF6A00] font-mono">
                {sources.filter(s => s.authority_tier === 0 || s.authority_tier === 1).length}
              </div>
              <div className="zx-micro text-[#7A838D] mt-0.5">Tier 0–1 Authoritative</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST MATRIX ── */}
      <section className="w-full py-10 border-b border-[#D9DDE2] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="zx-micro text-[#7A838D] mb-6">Source Authority Framework</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {tiers.map(t => (
              <div key={t} className="bg-[#F7F7F5] border border-[#D9DDE2] p-4 rounded-sm">
                <div className="text-lg font-bold text-[#111111] font-mono mb-1">Tier {t}</div>
                <div className="text-xs text-[#56606B] leading-relaxed">{TIER_LABELS[t]}</div>
                <div className="text-[11px] text-[#7A838D] mt-2">{grouped[t]?.length ?? 0} sources</div>
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
          <section key={t} className={`w-full py-14 border-b border-[#D9DDE2] ${t % 2 === 0 ? '' : 'bg-[#FFFFFF]'}`}>
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-[#D9DDE2]" />
                <div className="text-center px-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#56606B]">
                    Tier {t} — {TIER_LABELS[t]}
                  </div>
                </div>
                <div className="flex-1 h-px bg-[#D9DDE2]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((src) => (
                  <div key={src.id} className="bg-[#FFFFFF] border border-[#D9DDE2] p-5 rounded-sm hover:border-[#111111] transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6A00]">
                          {src.topic}
                        </span>
                        <span className="text-[10px] text-[#7A838D]">{src.update_frequency}</span>
                      </div>
                      <h3 className="text-sm font-bold text-[#111111] mb-2 leading-snug">{src.title}</h3>
                      <p className="text-xs text-[#56606B] leading-relaxed line-clamp-3 mb-4">{src.summary}</p>
                    </div>
                    <div className="pt-3 border-t border-[#D9DDE2] flex items-center justify-between">
                      <span className="text-[11px] text-[#7A838D]">{src.publisher}</span>
                      {src.source_url && (
                        <a
                          href={src.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#111111] hover:text-[#FF6A00] transition-colors"
                        >
                          Open Source →
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
