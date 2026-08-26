import React from 'react';
import { MASTER_KNOWLEDGE_ENTITIES_115 } from '@zayron/intelligence';

export const metadata = {
  title: 'ZAYRON-X Cyber Regulatory Intelligence — International Obligations & Incident Timelines',
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
    <div className="flex flex-col w-full bg-[#F7F7F5] text-[#111111]">

      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#D9DDE2] bg-[#FFFFFF] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#7A838D] mb-6">
            <span className="w-4 h-px bg-[#D9DDE2]" />
            Jurisdictional Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111] mb-4 leading-tight">
            Cyber Regulatory<br />Intelligence
          </h1>
          <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl mb-8">
            Technical and operational compliance context for global cybersecurity regulations.
            Incident reporting deadlines, risk management mandates, and supervisory authorities.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F7F7F5] border border-[#D9DDE2] rounded-sm">
            <span className="text-[11px] text-[#7A838D]">
              Informational context only — this does not constitute legal advice
            </span>
          </div>
        </div>
      </section>

      {/* ── REGULATIONS BY JURISDICTION ── */}
      {Object.entries(grouped).map(([jurisdiction, items]) => (
        <section key={jurisdiction} className="w-full py-14 border-b border-[#D9DDE2]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-[#D9DDE2]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#56606B] whitespace-nowrap px-4">
                {jurisdiction}
              </h2>
              <div className="flex-1 h-px bg-[#D9DDE2]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {items.map((reg) => (
                <div key={reg.id} className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 rounded-sm hover:border-[#252B33] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#2F6BFF]/8 text-[#2F6BFF] border border-[#2F6BFF]/15 rounded-sm flex-shrink-0">
                      {reg.jurisdiction}
                    </span>
                    <span className="text-[11px] text-[#7A838D] text-right">
                      {reg.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#111111] mb-2 leading-snug">{reg.title}</h3>
                  <p className="text-xs text-[#56606B] leading-relaxed mb-4">{reg.summary}</p>
                  {reg.why_it_matters?.ciso && (
                    <div className="bg-[#F7F7F5] border border-[#D9DDE2] p-3 rounded-sm mb-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A838D] mb-1">
                        CISO Relevance
                      </div>
                      <p className="text-xs text-[#56606B] leading-relaxed">{reg.why_it_matters.ciso}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-[#D9DDE2]">
                    <span className="text-[11px] text-[#7A838D]">
                      Verified: {reg.last_verified}
                    </span>
                    {reg.source_url && (
                      <a
                        href={reg.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#2F6BFF] hover:underline"
                      >
                        Official Legal Text →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ── DISCLAIMER ── */}
      <div className="w-full py-12 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-[#7A838D] leading-relaxed max-w-2xl mx-auto">
            ZAYRON-X Regulatory Intelligence provides operational context for cybersecurity professionals.
            Content is informational only and does not constitute formal legal counsel.
            Always consult qualified legal advisors for jurisdictional compliance obligations.
          </p>
        </div>
      </div>
    </div>
  );
}
