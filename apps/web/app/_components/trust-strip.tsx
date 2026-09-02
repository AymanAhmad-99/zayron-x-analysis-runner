import React from "react";

export function TrustStrip() {
  const pills = [
    "THREAT INTELLIGENCE",
    "EVIDENCE-LED ANALYSIS",
    "CONTINUOUS RESEARCH",
    "SOURCE TRANSPARENCY",
    "SECURITY-FIRST ARCHITECTURE",
  ];

  return (
    <section className="w-full bg-[#F6F4EE] py-10">
      <div className="max-w-[1380px] mx-auto px-8 flex flex-col items-center">
        {/* Eyebrow Title */}
        <p className="uppercase text-[10.5px] font-bold tracking-[0.08em] text-[#1A1A1A] text-center mb-6">
          BUILT FOR SECURITY TEAMS THAT REQUIRE EVIDENCE.
        </p>

        {/* Pills Layout */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {pills.map((pill) => (
            <div
              key={pill}
              className="bg-[#FFFFFF] border border-black/[0.08] px-4 py-2 rounded-[2px]"
            >
              <span className="uppercase text-[11px] font-bold tracking-wider text-[#0A0A0A]">
                {pill}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
