import React from "react";

export function EvidencePricing() {
  return (
    <section className="w-full bg-[#F6F4EE] pb-16 lg:pb-20">
      <div className="max-w-[1380px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        
        {/* Left Column (Evidence-First Block) */}
        <div className="bg-[#0A0A0A] p-10 lg:p-12 rounded-[2px] relative">
          <span className="uppercase text-[10px] tracking-[0.15em] text-zinc-400 font-bold mb-2 block">
            EVIDENCE-FIRST
          </span>
          <h2 
            className="uppercase text-[28px] lg:text-[32px] font-extrabold text-white tracking-tight leading-tight mb-10 max-w-[80%]"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            INTELLIGENCE YOU CAN TRACE.
          </h2>

          {/* Floating Mockup Card */}
          <div className="bg-[#FFFFFF] rounded-[4px] p-6 shadow-xl relative z-10 border border-black/10">
            <h3 className="text-[11px] font-bold tracking-widest text-[#0A0A0A] border-b border-zinc-200 pb-3 mb-4 uppercase">
              EVIDENCE
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              {/* Row 1 */}
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                  SOURCE
                </span>
                <span className="text-[12px] font-medium text-[#0A0A0A] mt-1 block">
                  Security Research
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                  OBSERVED
                </span>
                <span className="text-[12px] font-medium text-[#0A0A0A] mt-1 block">
                  24 AUG 2026
                </span>
              </div>
              
              {/* Row 2 */}
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                  CONFIDENCE
                </span>
                <span className="text-[12px] font-medium text-[#0A0A0A] mt-1 block">
                  HIGH
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                  INDICATORS
                </span>
                <span className="text-[12px] font-medium text-[#0A0A0A] mt-1 block">
                  7
                </span>
              </div>
              
              {/* Row 3 (Trigger spans full width) */}
              <div className="sm:col-span-2">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">
                  TRIGGER
                </span>
                <span className="text-[12px] font-medium text-[#0A0A0A] mt-1 block">
                  Threat Actor / Malware / Campaign
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (3-Tier Pricing Block) */}
        <div className="bg-[#0A0A0A] p-10 lg:p-12 rounded-[2px] flex flex-col">
          <span className="text-center uppercase text-[10px] tracking-[0.15em] text-zinc-400 font-bold mb-2 block">
            SIMPLE, TRANSPARENT PRICING
          </span>
          <h2 
            className="text-center uppercase text-[24px] lg:text-[28px] font-extrabold text-white tracking-tight leading-tight mb-10 max-w-[90%] mx-auto"
            style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
          >
            START WITH WHAT YOU NEED. SCALE WHEN YOU'RE READY.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            {/* Free Tier */}
            <div className="bg-[#111111] border border-white/10 p-5 rounded-[2px] flex flex-col justify-between">
              <div>
                <h3 className="text-[11px] font-bold tracking-widest uppercase mb-2 text-zinc-400">
                  FREE
                </h3>
                <div 
                  className="text-[24px] font-extrabold mb-4 text-white"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  $0 <span className="text-[11px] font-normal text-zinc-500">/ month</span>
                </div>
              </div>
              <button className="w-full py-2.5 mt-6 text-[11px] font-bold tracking-widest uppercase rounded-[2px] text-center transition-all bg-transparent border border-white text-white hover:bg-white hover:text-black">
                GET STARTED
              </button>
            </div>

            {/* Pro Tier (Highlight) */}
            <div className="bg-[#FFFFFF] border-t-2 border-[#FF5500] p-5 rounded-[2px] relative transform md:-translate-y-2 shadow-2xl z-10 flex flex-col justify-between">
              <div>
                <h3 className="text-[11px] font-bold tracking-widest uppercase mb-2 text-[#0A0A0A]">
                  PRO
                </h3>
                <div 
                  className="text-[24px] font-extrabold mb-4 text-[#0A0A0A]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  $20 <span className="text-[11px] font-normal text-zinc-500">/ month</span>
                </div>
              </div>
              <button className="w-full py-2.5 mt-6 text-[11px] font-bold tracking-widest uppercase rounded-[2px] text-center transition-all bg-[#0A0A0A] text-white hover:bg-black/90">
                UPGRADE TO PRO
              </button>
            </div>

            {/* Intelligence Tier */}
            <div className="bg-[#111111] border border-white/10 p-5 rounded-[2px] flex flex-col justify-between">
              <div>
                <h3 className="text-[11px] font-bold tracking-widest uppercase mb-2 text-zinc-400">
                  INTELLIGENCE
                </h3>
                <div 
                  className="text-[24px] font-extrabold mb-4 text-white"
                  style={{ fontFamily: "'Space Grotesk', 'Inter Tight', sans-serif" }}
                >
                  $50 <span className="text-[11px] font-normal text-zinc-500">/ month</span>
                </div>
              </div>
              <button className="w-full py-2.5 mt-6 text-[11px] font-bold tracking-widest uppercase rounded-[2px] text-center transition-all bg-transparent border border-white text-white hover:bg-white hover:text-black">
                UNLOCK ALL
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
