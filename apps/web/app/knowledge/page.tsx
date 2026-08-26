import React from 'react';
import Link from 'next/link';
import { MASTER_KNOWLEDGE_ENTITIES_115 } from '@zayron/intelligence';

export const metadata = {
  title: 'ZAYRON-X Knowledge Center — Authoritative Cyber Threat Intelligence Standards & Regulations',
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
    <div className="flex flex-col w-full bg-[#F7F7F5] text-[#111111]">

      {/* ── PAGE HEADER ── */}
      <section className="w-full border-b border-[#D9DDE2] bg-[#FFFFFF] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#7A838D] mb-6">
            <span className="w-4 h-px bg-[#D9DDE2]" />
            Global Cyber Knowledge
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#111111] mb-4 leading-tight">
            ZAYRON-X<br />Knowledge Center
          </h1>
          <p className="text-lg text-[#56606B] leading-relaxed max-w-2xl mb-8">
            Authoritative reference library for understanding the cyber threat landscape.
            Frameworks, standards, regulatory obligations, and verified source intelligence.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 pt-8 border-t border-[#D9DDE2]">
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">{MASTER_KNOWLEDGE_ENTITIES_115.length}</div>
              <div className="zx-micro text-[#7A838D] mt-0.5">Knowledge Objects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#FF6A00] font-mono">{frameworks.length}</div>
              <div className="zx-micro text-[#7A838D] mt-0.5">Authoritative Standards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#2F6BFF] font-mono">{regulations.length}</div>
              <div className="zx-micro text-[#7A838D] mt-0.5">Active Regulations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111111] font-mono">{sources.length}</div>
              <div className="zx-micro text-[#7A838D] mt-0.5">Verified Sources</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: FRAMEWORKS & STANDARDS ── */}
      <section className="w-full py-16 border-b border-[#D9DDE2]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="zx-micro text-[#FF6A00] mb-2">Tier 0 — Primary Sources</div>
              <h2 className="text-2xl font-bold text-[#111111]">Authoritative Frameworks & Standards</h2>
            </div>
            <span className="text-xs text-[#7A838D] hidden sm:block">{frameworks.length} entries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {frameworks.map((fw) => (
              <div
                key={fw.id}
                className="bg-[#FFFFFF] border border-[#D9DDE2] p-6 rounded-sm hover:border-[#111111] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#F7F7F5] text-[#56606B] border border-[#D9DDE2] rounded-sm">
                      Tier {fw.authority_tier}
                    </span>
                    {fw.version && (
                      <span className="text-[11px] text-[#7A838D] font-mono">{fw.version}</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#111111] mb-2 leading-snug">{fw.title}</h3>
                  <p className="text-xs text-[#56606B] leading-relaxed line-clamp-3 mb-4">
                    {fw.summary}
                  </p>
                </div>
                <div className="pt-4 border-t border-[#D9DDE2] flex items-center justify-between">
                  <span className="text-[11px] text-[#7A838D]">{fw.publisher}</span>
                  {fw.source_url && (
                    <a
                      href={fw.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#FF6A00] hover:underline"
                    >
                      Official Source →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: REGULATORY INTELLIGENCE ── */}
      <section className="w-full py-16 border-b border-[#D9DDE2] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="zx-micro text-[#2F6BFF] mb-2">Jurisdictional Compliance</div>
              <h2 className="text-2xl font-bold text-[#111111]">Global Cyber Regulatory Intelligence</h2>
            </div>
            <p className="text-xs text-[#7A838D] hidden sm:block max-w-xs text-right leading-relaxed">
              Informational context only — not legal advice
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {regulations.map((reg) => (
              <div key={reg.id} className="bg-[#F7F7F5] border border-[#D9DDE2] p-6 rounded-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#2F6BFF]/8 text-[#2F6BFF] border border-[#2F6BFF]/15 rounded-sm">
                    {reg.jurisdiction}
                  </span>
                  <span className="text-[11px] text-[#7A838D]">
                    Status: <span className="font-semibold text-[#111111]">{reg.status}</span>
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#111111] mb-2 leading-snug">{reg.title}</h3>
                <p className="text-xs text-[#56606B] leading-relaxed mb-4">
                  {reg.summary}
                </p>
                {reg.why_it_matters?.ciso && (
                  <div className="bg-[#FFFFFF] p-3 rounded-sm border border-[#D9DDE2] mb-4 text-xs">
                    <span className="font-bold text-[#111111] block mb-1">CISO Relevance:</span>
                    <span className="text-[#56606B]">{reg.why_it_matters.ciso}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-[#D9DDE2]">
                  <span className="text-[#7A838D]">Verified: {reg.last_verified}</span>
                  {reg.source_url && (
                    <a
                      href={reg.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#2F6BFF] hover:underline"
                    >
                      Official Source →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: VERIFIED CTI SOURCES ── */}
      <section className="w-full py-16 border-b border-[#D9DDE2]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="zx-micro text-[#7A838D] mb-2">Monitored Telemetry Channels</div>
              <h2 className="text-2xl font-bold text-[#111111]">Verified CTI Source Directory</h2>
            </div>
            <span className="text-xs text-[#7A838D] hidden sm:block">{sources.length} active feeds</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((src) => (
              <div key={src.id} className="bg-[#FFFFFF] border border-[#D9DDE2] p-5 rounded-sm hover:border-[#111111] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A838D]">{src.topic}</span>
                  {src.jurisdiction && (
                    <span className="text-[10px] text-[#7A838D]">{src.jurisdiction}</span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[#111111] mb-1.5 leading-snug">{src.title}</h3>
                <p className="text-xs text-[#56606B] mb-4 line-clamp-2 leading-relaxed">{src.summary}</p>
                <div className="pt-3 border-t border-[#D9DDE2] flex items-center justify-between">
                  <span className="text-[11px] text-[#7A838D]">{src.update_frequency}</span>
                  {src.source_url && (
                    <a
                      href={src.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#111111] hover:text-[#FF6A00] transition-colors"
                    >
                      Open →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: RESEARCH ORGANIZATIONS ── */}
      {researchOrgs.length > 0 && (
        <section className="w-full py-16 bg-[#FFFFFF]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-10">
              <div className="zx-micro text-[#7A838D] mb-2">Research & Advisory</div>
              <h2 className="text-2xl font-bold text-[#111111]">Research Organizations & Advisories</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {researchOrgs.slice(0, 12).map((org) => (
                <div key={org.id} className="bg-[#F7F7F5] border border-[#D9DDE2] p-5 rounded-sm hover:border-[#111111] transition-colors">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7A838D] mb-2">{org.publisher}</div>
                  <h3 className="text-sm font-bold text-[#111111] mb-2 leading-snug">{org.title}</h3>
                  <p className="text-xs text-[#56606B] line-clamp-2 leading-relaxed mb-3">{org.summary}</p>
                  {org.source_url && (
                    <a
                      href={org.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#FF6A00] hover:underline"
                    >
                      View Resource →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DISCLAIMER ── */}
      <div className="w-full border-t border-[#D9DDE2] py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs text-[#7A838D] leading-relaxed max-w-2xl mx-auto">
            ZAYRON-X Knowledge Center provides technical intelligence context for cybersecurity professionals.
            Regulatory information is informational only and does not constitute formal legal counsel.
          </p>
        </div>
      </div>
    </div>
  );
}
