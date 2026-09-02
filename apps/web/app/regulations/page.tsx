export const metadata = {
  title: 'Cyber Regulatory Intelligence — ZAYRON-X',
  description: 'Public educational context for cybersecurity governance and regulatory monitoring.',
};

export default function RegulatoryIntelligencePage() {
  return (
    <main className="flex flex-col w-full bg-[#F5F4F0] text-[#111214]">
      <section className="w-full border-b border-[#E1DFD7] bg-[#FFFFFF] py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C8F98] mb-4">Jurisdictional Intelligence</div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 uppercase">Cyber Regulatory Intelligence</h1>
          <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed max-w-2xl">Public educational context only. ZAYRON-X does not expose its private research corpus, internal retrieval traces, or legal-document artifacts through this route.</p>
        </div>
      </section>
      <section className="w-full py-12">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ['Governance', 'Track applicable obligations, reporting requirements, and supervisory expectations.'],
            ['Version awareness', 'Regulatory and standards references must retain release and retrieval dates.'],
            ['Evidence boundary', 'Compliance context is separate from current threat evidence and is not legal advice.'],
          ].map(([title, body]) => (
            <article key={title} className="bg-[#FFFFFF] border border-[#E1DFD7] p-6 rounded-[6px] shadow-sm">
              <h2 className="font-editorial text-xl font-bold mb-2">{title}</h2>
              <p className="text-xs text-[#5A5D65] leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
