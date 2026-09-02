export const metadata = {
  title: 'CTI Source Methodology — ZAYRON-X',
  description: 'How ZAYRON-X evaluates and cites cyber intelligence sources.',
};

export default function SourceDirectoryPage() {
  return (
    <main className="flex flex-col w-full bg-[#F5F4F0] text-[#111214]">
      <section className="w-full border-b border-[#E1DFD7] bg-[#FFFFFF] py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8C8F98] mb-4">Collection Map &amp; Provenance</div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 uppercase">CTI Source Methodology</h1>
          <p className="text-xs sm:text-sm text-[#5A5D65] leading-relaxed max-w-2xl">ZAYRON-X evaluates primary authority, technical specificity, independence, recency, and corroboration before a source can support a public assessment.</p>
        </div>
      </section>
      <section className="w-full py-12">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ['Tier 0', 'Government, standards bodies, official vendor advisories, and original specifications.'],
            ['Tier 1', 'Recognized security research, established vendors, and peer-reviewed technical work.'],
            ['Tier 2–4', 'Professional media, community sources, and unverified claims requiring corroboration.'],
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
