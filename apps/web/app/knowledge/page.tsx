import React from 'react';

export const metadata = {
  title: 'Knowledge Center — ZAYRON-X',
  description: 'Global Cyber Threat Intelligence Reference Library. Authoritative standards, regulatory intelligence, methodologies, and verified CTI source registry.',
};

export default function KnowledgeCenterPage() {
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
              <div className="text-2xl font-bold text-[#111214] font-mono">PRIVATE</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Research Core</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#D9531E] font-mono">TIER 0</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Source Methodology</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111214] font-mono">LIVE</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Evidence Layer</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#111214] font-mono">TRACEABLE</div>
              <div className="text-[10px] font-mono uppercase text-[#8C8F98] mt-0.5">Public Output</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: FRAMEWORKS & STANDARDS ── */}
      <section className="w-full py-12 border-b border-[#E1DFD7]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-[10px] font-mono text-[#D9531E] font-bold uppercase mb-1">Public boundary</div>
              <h2 className="font-editorial text-2xl font-semibold text-[#111214] uppercase">Methodology, not the private corpus</h2>
            </div>
          </div>

          <div className="max-w-3xl border border-[#E1DFD7] bg-[#FFFFFF] p-6 rounded-[6px] shadow-sm text-sm text-[#5A5D65] leading-relaxed">
            ZAYRON-X uses a private backend research library for analytical methodology, standards, and retrieval. The public product exposes only final intelligence assessments, appropriate evidence, source links, uncertainty, and defensive context. Internal documents, chunks, embeddings, prompts, and storage keys are not public content.
          </div>
        </div>
      </section>

      {/* ── SECTION 2: REGULATORY INTELLIGENCE ── */}
      <section className="w-full py-12 border-b border-[#E1DFD7] bg-[#FFFFFF]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-[10px] font-mono text-[#D9531E] font-bold uppercase mb-1">Public boundary</div>
              <h2 className="font-editorial text-2xl font-semibold text-[#111214] uppercase">How ZAYRON-X evaluates intelligence</h2>
            </div>
            <p className="text-xs text-[#8C8F98] hidden sm:block max-w-xs text-right leading-relaxed font-mono">Informational context only</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              ['Source authority', 'Primary official sources are prioritized over repeated secondary reporting.'],
              ['Evidence lineage', 'Claims remain linked to source records, timestamps, and supporting evidence.'],
              ['Analytic discipline', 'Facts, reported claims, inferences, assessments, and unknowns remain distinct.'],
            ].map(([title, body]) => (
              <div key={title} className="bg-[#F5F4F0] border border-[#E1DFD7] p-6 rounded-[6px] shadow-sm">
                <h3 className="font-editorial text-lg font-bold text-[#111214] mb-2">{title}</h3>
                <p className="text-xs text-[#5A5D65] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
