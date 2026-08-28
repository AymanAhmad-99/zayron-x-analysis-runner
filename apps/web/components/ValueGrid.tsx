import Link from "next/link";

export function ValueGrid() {
  return (
    <section className="w-full border-b border-[#E1DFD7] py-20 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-6">
        CHAPTER 02 — VALUE
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Prominent Dark Card: Threat Intelligence */}
        <Link
          href="/threats"
          className="md:col-span-2 bg-[#111215] text-[#FFFFFF] p-8 rounded-[6px] border border-[#28292E] hover:border-[#D9531E] transition-colors flex flex-col justify-between group"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8C8F98] block mb-2">Core Telemetry</span>
            <h3 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#FFFFFF] group-hover:text-[#D9531E] transition-colors mb-2">
              THREAT INTELLIGENCE
            </h3>
            <p className="text-xs md:text-sm text-[#8C8F98] max-w-md">
              Strategic, Operational, and Tactical Intel synthesized through autonomous multi-source correlation.
            </p>
          </div>
          <div className="mt-8 text-[11px] font-bold uppercase tracking-[0.06em] text-[#D9531E] flex items-center gap-1">
            Access Stream &rarr;
          </div>
        </Link>

        {/* Vulnerability Intelligence */}
        <Link
          href="/vulnerabilities"
          className="bg-[#FFFFFF] border border-[#E1DFD7] p-6 rounded-[6px] hover:border-[#111214] transition-colors flex flex-col justify-between group"
        >
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98] block mb-1">CVE &amp; KEV</span>
            <h4 className="font-bold text-sm text-[#111214] group-hover:text-[#D9531E] transition-colors mb-2">
              VULNERABILITY INTELLIGENCE
            </h4>
            <p className="text-xs text-[#5A5D65] leading-relaxed">
              Exploit telemetry, EPSS probability, and CISA KEV catalog tracking.
            </p>
          </div>
          <div className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#111214]">
            Inspect &rarr;
          </div>
        </Link>

        {/* Threat Actor Intelligence */}
        <Link
          href="/actors"
          className="bg-[#FFFFFF] border border-[#E1DFD7] p-6 rounded-[6px] hover:border-[#111214] transition-colors flex flex-col justify-between group"
        >
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98] block mb-1">Adversary Profiling</span>
            <h4 className="font-bold text-sm text-[#111214] group-hover:text-[#D9531E] transition-colors mb-2">
              THREAT ACTOR INTELLIGENCE
            </h4>
            <p className="text-xs text-[#5A5D65] leading-relaxed">
              Nation-state and cybercrime syndicate infrastructure dossiers.
            </p>
          </div>
          <div className="mt-6 text-[10px] font-bold uppercase tracking-wider text-[#111214]">
            Inspect &rarr;
          </div>
        </Link>

        {/* Malware */}
        <Link
          href="/malware"
          className="bg-[#EBEAE5] border border-[#E1DFD7] p-5 rounded-[6px] hover:border-[#111214] transition-colors group"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98] block mb-1">Payloads</span>
          <h4 className="font-bold text-xs text-[#111214] group-hover:text-[#D9531E] transition-colors">
            MALWARE
          </h4>
          <p className="text-[11px] text-[#5A5D65] mt-1">C2 beacons and infostealer signatures.</p>
        </Link>

        {/* IOC */}
        <Link
          href="/threats"
          className="bg-[#EBEAE5] border border-[#E1DFD7] p-5 rounded-[6px] hover:border-[#111214] transition-colors group"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98] block mb-1">Indicators</span>
          <h4 className="font-bold text-xs text-[#111214] group-hover:text-[#D9531E] transition-colors">
            IOC MATRIX
          </h4>
          <p className="text-[11px] text-[#5A5D65] mt-1">Verified SHA256, IPv4, and C2 domains.</p>
        </Link>

        {/* Campaigns */}
        <Link
          href="/threats"
          className="bg-[#EBEAE5] border border-[#E1DFD7] p-5 rounded-[6px] hover:border-[#111214] transition-colors group"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98] block mb-1">Operations</span>
          <h4 className="font-bold text-xs text-[#111214] group-hover:text-[#D9531E] transition-colors">
            CAMPAIGNS
          </h4>
          <p className="text-[11px] text-[#5A5D65] mt-1">Cross-sector espionage and ransomware waves.</p>
        </Link>

        {/* Research */}
        <Link
          href="/knowledge"
          className="bg-[#EBEAE5] border border-[#E1DFD7] p-5 rounded-[6px] hover:border-[#111214] transition-colors group"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8C8F98] block mb-1">Archive</span>
          <h4 className="font-bold text-xs text-[#111214] group-hover:text-[#D9531E] transition-colors">
            RESEARCH
          </h4>
          <p className="text-[11px] text-[#5A5D65] mt-1">Institutional standards and analytical briefs.</p>
        </Link>
      </div>
    </section>
  );
}
