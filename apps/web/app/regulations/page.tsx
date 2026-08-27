import React from 'react';
import { MASTER_KNOWLEDGE_ENTITIES_115 } from '@zayron/intelligence';

export const metadata = {
  title: 'Cyber Regulatory Intelligence — ZAYRON-X',
  description: 'Global cybersecurity regulations: NIS2, DORA, GDPR, CIRCIA, incident reporting deadlines, and operational compliance context for security teams.',
};

const jurisdictionOrder = [
  'European Union', 'United States', 'United Kingdom',
  'Singapore', 'Australia', 'Middle East', 'Global',
];

export default function RegulatoryIntelligencePage() {
  const regulations = MASTER_KNOWLEDGE_ENTITIES_115.filter(e => e.document_type === 'regulation');

  // Group by jurisdiction
  const grouped = jurisdictionOrder.reduce<Record<string, typeof regulations>>((acc, jur) => {
    const items = regulations.filter(r => r.jurisdiction === jur || r.jurisdiction?.startsWith(jur));
    if (items.length > 0) acc[jur] = items;
    return acc;
  }, {});
  const ungrouped = regulations.filter(r => !jurisdictionOrder.some(j => r.jurisdiction === j || r.jurisdiction?.startsWith(j)));
  if (ungrouped.length > 0) grouped['Other'] = ungrouped;

  return (
    <div className="flex flex-col w-full bg-[#F5F4F0] text-[#111214]">
      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#E1DFD7] bg-[#FFFFFF] py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8C8F98] mb-4">
            <span className="w-4 h-px bg-[#E1DFD7]" />
            Jurisdictional Intelligence
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-4 leading-tight uppercase">
            Cyber Regulatory Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed max-w-2xl mb-8">
            Technical and operational compliance context for global cybersecurity regulations.
            Incident reporting deadlines, risk management mandates, and supervisory authorities.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F4F0] border border-[#E1DFD7] rounded-[4px]">
            <span className="text-[11px] text-[#8C8F98] font-mono">
              Informational context only — this does not constitute legal advice
            </span>
          </div>
        </div>
      </section>

      {/* ── REGULATIONS BY JURISDICTION ── */}
      {Object.entries(grouped).map(([jurisdiction, items]) => (
        <section key={jurisdiction} className="w-full py-12 border-b border-[#E1DFD7]">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-[#E1DFD7]" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#111214] whitespace-nowrap px-4 font-mono">
                {jurisdiction}
              </h2>
              <div className="flex-1 h-px bg-[#E1DFD7]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {items.map((reg) => (
                <div key={reg.id} className="bg-[#FFFFFF] border border-[#E1DFD7] p-6 rounded-[6px] hover:border-[#111214] transition-colors shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#111214] text-[#FFFFFF] rounded-[3px]">
                      {reg.jurisdiction}
                    </span>
                    <span className="text-[11px] text-[#8C8F98] text-right font-mono">
                      {reg.status}
                    </span>
                  </div>
                  <h3 className="font-editorial text-base font-bold text-[#111214] mb-2 leading-snug">{reg.title}</h3>
                  <p className="text-xs text-[#5A5D65] leading-relaxed mb-4">{reg.summary}</p>
                  {reg.why_it_matters?.ciso && (
                    <div className="bg-[#F5F4F0] border border-[#E1DFD7] p-3 rounded-[4px] mb-4">
                      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#111214] mb-1">
                        CISO Relevance
                      </div>
                      <p className="text-xs text-[#5A5D65] leading-relaxed">{reg.why_it_matters.ciso}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-[#E1DFD7] text-xs font-mono">
                    <span className="text-[#8C8F98]">
                      Verified: {reg.last_verified}
                    </span>
                    {reg.source_url && (
                      <a
                        href={reg.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold uppercase tracking-wider text-[#111214] hover:text-[#D9531E]"
                      >
                        Official Legal Text &rarr;
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
