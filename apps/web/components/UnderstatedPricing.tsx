import Link from "next/link";

export function UnderstatedPricing() {
  return (
    <section className="w-full border-b border-[#E1DFD7] py-20 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-2">
        CHAPTER 09 — PRICE
      </div>
      <h2 className="font-editorial text-3xl md:text-4xl font-semibold tracking-tight text-[#111214] mb-2 uppercase">
        TRANSPARENT ACCESS
      </h2>
      <p className="text-xs md:text-sm text-[#5A5D65] mb-8 max-w-xl">
        Intel value first. Real implemented capabilities with zero enterprise friction.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Tier 1: Free */}
        <div className="bg-[#FFFFFF] border border-[#E1DFD7] p-8 rounded-[6px] flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E1DFD7]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111214]">COMMUNITY TIER</span>
              <span className="text-2xl font-bold font-mono text-[#111214]">$0</span>
            </div>
            <p className="text-xs text-[#5A5D65] leading-relaxed mb-6">
              Full access to public threat wire feeds, standard CVE disclosures, and knowledge base frameworks.
            </p>
            <ul className="space-y-2 text-xs font-mono text-[#5A5D65] mb-6">
              <li>• Live Intelligence Stream (Web)</li>
              <li>• Public CVE &amp; KEV Tracking</li>
              <li>• MITRE ATT&amp;CK Matrix Access</li>
            </ul>
          </div>
          <Link
            href="/threats"
            className="w-full text-center text-xs font-bold uppercase tracking-wider bg-[#F5F4F0] border border-[#E1DFD7] text-[#111214] py-2.5 rounded-[4px] hover:border-[#111214] transition-colors"
          >
            Access Community Intel
          </Link>
        </div>

        {/* Tier 2: Pro */}
        <div className="bg-[#FFFFFF] border-2 border-[#111214] p-8 rounded-[6px] flex flex-col justify-between shadow-sm relative">
          <div className="absolute -top-3 right-6 bg-[#D9531E] text-[#FFFFFF] text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-[2px]">
            SOVEREIGN PRO
          </div>
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E1DFD7]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111214]">ANALYST PRO</span>
              <span className="text-2xl font-bold font-mono text-[#111214]">$10 <span className="text-xs font-normal text-[#8C8F98]">/ MO</span></span>
            </div>
            <p className="text-xs text-[#5A5D65] leading-relaxed mb-6">
              Expanded REST API, full radial threat entity graphs, raw IOC export desks, and custom alert rules.
            </p>
            <ul className="space-y-2 text-xs font-mono text-[#111214] mb-6">
              <li>• 10,000 API Requests / Day</li>
              <li>• Interactive Entity Correlation Graphs</li>
              <li>• YARA / Sigma Rule Compilation</li>
              <li>• Private Threat Wire Webhooks</li>
            </ul>
          </div>
          <Link
            href="/pricing"
            className="w-full text-center text-xs font-bold uppercase tracking-wider bg-[#111214] text-[#FFFFFF] py-2.5 rounded-[4px] hover:bg-[#28292E] transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </section>
  );
}
