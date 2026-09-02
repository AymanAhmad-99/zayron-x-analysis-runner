import React from "react";

export function DualGrid() {
  const articles = [
    {
      title: "THE EVOLUTION OF INITIAL ACCESS BROKERS",
      excerpt: "Deep analysis into how access brokers have professionalized operations, utilizing automated exploitation and tiered pricing models for network access.",
    },
    {
      title: "UNDERSTANDING MODERN RANSOMWARE CODE BASES",
      excerpt: "Technical breakdown of Rust-based ransomware strains, focusing on multi-threading encryption techniques and evasion methods.",
    },
    {
      title: "HOW THREAT ACTORS ADAPT TO DEFENSIVE PRESSURE",
      excerpt: "Strategic overview of shifting infrastructure and C2 mechanisms used by APT groups in response to law enforcement takedowns.",
    }
  ];

  const tags = [
    "THREAT ACTORS", "MALWARE", "EXPLOITS", "CAMPAIGNS", 
    "VULNERABILITIES", "DARK WEB INTEL", "RESEARCH", "INSIGHTS"
  ];

  return (
    <section className="w-full bg-[#F6F4EE] py-16 lg:py-20">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Left Column (Dark Intelligence Platform) */}
        <div className="bg-[#050505] p-8 lg:p-12 rounded-[2px] flex flex-col justify-between">
          <div className="flex flex-col items-center">
            <span className="uppercase text-[10.5px] tracking-[0.12em] text-zinc-400 font-bold text-center mb-3">
              INTELLIGENCE PLATFORM
            </span>
            <h2 
              className="uppercase text-[24px] lg:text-[28px] font-extrabold text-white tracking-tight text-center mb-8"
              style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
            >
              ZAYRON-X INTELLIGENCE PLATFORM
            </h2>

            {/* Mockup Screen */}
            <div className="w-full bg-[#0E0E10] border border-white/10 rounded-[4px] p-4 h-[300px] flex flex-col">
              {/* Header bar */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-mono">
                  ZAYRON OS // Threat Intelligence Engine
                </span>
              </div>
              
              {/* Content: 3 distinct data columns */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                {/* Column 1: Critical */}
                <div className="flex flex-col gap-2">
                  <div className="bg-white/5 border border-white/10 p-2 rounded-[2px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#FF5500] text-[8px] font-bold uppercase tracking-widest">CRITICAL</span>
                      <span className="text-[8px] font-mono text-zinc-500">CVE-2026-X1</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div className="h-full w-[85%] bg-[#FF5500]"></div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-2 rounded-[2px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[#FF5500] text-[8px] font-bold uppercase tracking-widest">CRITICAL</span>
                      <span className="text-[8px] font-mono text-zinc-500">CVE-2026-X2</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div className="h-full w-[92%] bg-[#FF5500]"></div>
                    </div>
                  </div>
                </div>

                {/* Column 2: High */}
                <div className="flex flex-col gap-2">
                  <div className="bg-white/5 border border-white/10 p-2 rounded-[2px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-300 text-[8px] font-bold uppercase tracking-widest">HIGH</span>
                      <span className="text-[8px] font-mono text-zinc-500">CVE-2026-X3</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div className="h-full w-[70%] bg-zinc-400"></div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Elevated */}
                <div className="flex flex-col gap-2">
                  <div className="bg-white/5 border border-white/10 p-2 rounded-[2px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-zinc-400 text-[8px] font-bold uppercase tracking-widest">ELEVATED</span>
                      <span className="text-[8px] font-mono text-zinc-500">CVE-2026-X4</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div className="h-full w-[45%] bg-zinc-600"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Bottom Bar */}
          <div className="border-t border-white/10 pt-6 mt-8">
            <div className="grid grid-cols-6 gap-2">
              {[
                { step: "DISCOVER", text: "Scan global telemetry" },
                { step: "VERIFY", text: "Validate technical IOCs" },
                { step: "CORRELATE", text: "Link campaigns & actors" },
                { step: "ANALYZE", text: "Assess impact & severity" },
                { step: "UNDERSTAND", text: "Contextualize motive" },
                { step: "ACT", text: "Deploy defensive measure" }
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center">
                  <span className="uppercase text-[10px] font-bold text-zinc-300 text-center tracking-wider block">
                    {item.step}
                  </span>
                  <span className="text-[8.5px] text-zinc-500 leading-tight text-center mt-2">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Light Research Grid & Threat Coverage) */}
        <div className="bg-transparent flex flex-col justify-between">
          
          {/* Header Row */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[#FF5500] text-[11px] font-bold tracking-wider mb-1 block uppercase">
                  ZAYRON RESEARCH
                </span>
                <h2 
                  className="uppercase text-[24px] lg:text-[28px] font-extrabold text-[#0A0A0A] leading-tight"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  DEEPER ANALYSIS.<br/>CLEARER INTELLIGENCE.
                </h2>
              </div>
              <div className="w-20 h-16 rounded-[2px] bg-zinc-800 shrink-0 hidden sm:flex items-center justify-center">
                {/* Cyber optic / network grid placeholder */}
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>

            {/* 3-Article Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              {articles.map((article) => (
                <div key={article.title} className="flex flex-col">
                  <div className="h-24 w-full bg-zinc-200 mb-3 rounded-[2px]"></div>
                  <h3 className="uppercase text-[11px] font-bold leading-snug text-[#0A0A0A] mb-2">
                    {article.title}
                  </h3>
                  <p className="text-[10px] text-zinc-600 line-clamp-3">
                    {article.excerpt}
                  </p>
                  <div className="border-t border-black/[0.08] my-2.5"></div>
                  <span className="text-[8.5px] font-mono text-zinc-500 uppercase">
                    READ TIME : 7 MIN | Aug 2026
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Threat Coverage Card */}
          <div className="bg-[#0A0A0A] p-6 rounded-[2px] mt-4">
            <h3 className="uppercase text-[12px] font-bold text-white tracking-widest text-center mb-4">
              THREAT INTELLIGENCE COVERAGE
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {tags.map((tag) => (
                <span 
                  key={tag} 
                  className="border border-white/20 text-white text-[9.5px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
