import React from 'react';
import Link from 'next/link';
import { MASTER_KNOWLEDGE_ENTITIES_115 } from '@zayron/intelligence';

export const metadata = {
  title: 'Knowledge Center — ZAYRON-X',
  description: 'Global Cyber Threat Intelligence Reference Library. Authoritative standards, regulatory intelligence, methodologies, and verified CTI source registry.',
};

export default function KnowledgeCenterPage() {
  const frameworks = MASTER_KNOWLEDGE_ENTITIES_115.filter(
    e => e.document_type === 'framework' || e.document_type === 'standard'
  );
  const regulations = MASTER_KNOWLEDGE_ENTITIES_115.filter(
    e => e.document_type === 'regulation'
  );
  const sources = MASTER_KNOWLEDGE_ENTITIES_115.filter(
    e => e.document_type === 'source_channel'
  );
  const researchOrgs = MASTER_KNOWLEDGE_ENTITIES_115.filter(
    e => e.document_type === 'research_org' || e.document_type === 'vendor_advisory'
  );

  return (
    <div className="flex flex-col w-full bg-[#F5F4F0] text-[#111214]">
      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#E1DFD7] bg-[#FFFFFF] py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#8C8F98] mb-4">
            <span className="w-4 h-px bg-[#E1DFD7]" />
            Global Cyber Knowledge
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#111214] mb-4 leading-tight uppercase">
            Knowledge Center
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed max-w-2xl mb-8">
            Authoritative reference library for understanding the cyber threat landscape.
            Frameworks, standards, regulatory obligations, and verified source intelligence.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 pt-6 border-t border-[#E1DFD7]">
            <div>
              <div className="text-2xl font-bold text-[#111214] font-mono">{MASTER_KNOWLEDGE_ENTITIES_115.length}</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Knowledge Objects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#D9531E] font-mono">{frameworks.length}</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Authoritative Standards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111214] font-mono">{regulations.length}</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Active Regulations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111214] font-mono">{sources.length}</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Verified Sources</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: FRAMEWORKS & STANDARDS ── */}
      <section className="w-full py-12 border-b border-[#E1DFD7]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-[10px] font-mono text-[#D9531E] font-bold uppercase mb-1">Tier 0 — Primary Sources</div>
              <h2 className="font-editorial text-2xl font-semibold text-[#111214] uppercase">Authoritative Frameworks &amp; Standards</h2>
            </div>
            <span className="text-xs font-mono text-[#8C8F98] hidden sm:block">{frameworks.length} entries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {frameworks.map((fw) => (
              <div
                key={fw.id}
                className="bg-[#FFFFFF] border border-[#E1DFD7] p-6 rounded-[6px] hover:border-[#111214] transition-colors flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F5F4F0] text-[#5A5D65] border border-[#E1DFD7] rounded-[3px]">
                      Tier {fw.authority_tier}
                    </span>
                    {fw.version && (
                      <span className="text-[11px] text-[#8C8F98] font-mono">{fw.version}</span>
                    )}
                  </div>
                  <h3 className="font-editorial text-base font-bold text-[#111214] mb-2 leading-snug">{fw.title}</h3>
                  <p className="text-xs text-[#5A5D65] leading-relaxed line-clamp-3 mb-4">
                    {fw.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-[#E1DFD7] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8C8F98]">{fw.publisher}</span>
                  {fw.source_url && (
                    <a
                      href={fw.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold uppercase tracking-wider text-[#111214] hover:text-[#D9531E] transition-colors"
                    >
                      Official Source &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: REGULATORY INTELLIGENCE ── */}
      <section className="w-full py-12 border-b border-[#E1DFD7] bg-[#FFFFFF]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-[10px] font-mono text-[#D9531E] font-bold uppercase mb-1">Jurisdictional Compliance</div>
              <h2 className="font-editorial text-2xl font-semibold text-[#111214] uppercase">Global Cyber Regulatory Intelligence</h2>
            </div>
            <p className="text-xs text-[#8C8F98] hidden sm:block max-w-xs text-right leading-relaxed font-mono">
              Informational context only
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {regulations.map((reg) => (
              <div key={reg.id} className="bg-[#F5F4F0] border border-[#E1DFD7] p-6 rounded-[6px] shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-[#111214] text-[#FFFFFF] rounded-[3px]">
                    {reg.jurisdiction}
                  </span>
                  <span className="text-[11px] text-[#8C8F98] font-mono">
                    Status: <span className="font-semibold text-[#111214]">{reg.status}</span>
                  </span>
                </div>
                <h3 className="font-editorial text-lg font-bold text-[#111214] mb-2 leading-snug">{reg.title}</h3>
                <p className="text-xs text-[#5A5D65] leading-relaxed mb-4">
                  {reg.summary}
                </p>
                {reg.why_it_matters?.ciso && (
                  <div className="bg-[#FFFFFF] p-3.5 rounded-[4px] border border-[#E1DFD7] mb-4 text-xs">
                    <span className="font-bold text-[#111214] block mb-1">CISO Relevance:</span>
                    <span className="text-[#5A5D65]">{reg.why_it_matters.ciso}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-[#E1DFD7]">
                  <span className="text-[#8C8F98] font-mono">Verified: {reg.last_verified}</span>
                  {reg.source_url && (
                    <a
                      href={reg.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#111214] hover:text-[#D9531E] transition-colors"
                    >
                      Official Source &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
