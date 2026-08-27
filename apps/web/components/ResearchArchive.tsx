import Link from "next/link";

export function ResearchArchive() {
  const sections = [
    {
      title: "Threat Landscape Reports",
      desc: "Quarterly and active tactical SITREPs assessing geopolitical cyber operations.",
      link: "/threats",
      meta: "INSTITUTIONAL DOSSIERS"
    },
    {
      title: "Vulnerability Disclosures",
      desc: "Deep technical dissections of zero-day exploits and perimeter defense bypasses.",
      link: "/vulnerabilities",
      meta: "DISCLOSURE ARCHIVE"
    },
    {
      title: "Malware Dossiers",
      desc: "Behavioral execution traces, decompilation notes, and malleable C2 profiles.",
      link: "/malware",
      meta: "PAYLOAD ANALYSIS"
    },
    {
      title: "Knowledge Base",
      desc: "MITRE ATT&CK TTP indexing, NIST standards, and cryptographic provenance mapping.",
      link: "/knowledge",
      meta: "SEMANTIC GROUNDING"
    },
    {
      title: "Regulatory Frameworks",
      desc: "EU NIS2, DORA, and US CIRCIA mandatory technical reporting compliance.",
      link: "/regulations",
      meta: "JURISDICTIONAL RULES"
    }
  ];

  return (
    <section className="w-full border-b border-[#E1DFD7] py-14 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-2">
        CHAPTER 07 — RESEARCH
      </div>
      <h2 className="font-editorial text-3xl md:text-4xl font-semibold tracking-tight text-[#111214] mb-2 uppercase">
        RESEARCH &amp; KNOWLEDGE
      </h2>
      <p className="text-xs md:text-sm text-[#5A5D65] mb-8 max-w-xl">
        Curated institutional threat archive providing authoritative analysis and regulatory intelligence.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((sec, idx) => (
          <Link
            key={idx}
            href={sec.link}
            className="bg-[#FFFFFF] border border-[#E1DFD7] p-6 rounded-[6px] hover:border-[#111214] transition-colors flex flex-col justify-between group shadow-sm"
          >
            <div>
              <span className="text-[9px] font-mono text-[#8C8F98] uppercase tracking-wider block mb-2">
                {sec.meta}
              </span>
              <h4 className="font-editorial text-lg font-bold text-[#111214] group-hover:text-[#D9531E] transition-colors mb-2">
                {sec.title}
              </h4>
              <p className="text-xs text-[#5A5D65] leading-relaxed">
                {sec.desc}
              </p>
            </div>
            <div className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#111214] flex items-center gap-1">
              Access Index &rarr;
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
