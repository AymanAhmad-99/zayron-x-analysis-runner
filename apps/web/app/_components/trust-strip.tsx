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
    <section className="w-full bg-[#F6F4EE] border-t border-black/[0.08]">
      <div className="max-w-[1380px] mx-auto px-8 py-8 flex flex-col items-center">
        {/* Label */}
        <p
          className="uppercase text-[10px] font-bold tracking-[0.14em] text-[#0A0A0A] text-center mb-5"
          style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
        >
          BUILT FOR SECURITY TEAMS THAT REQUIRE EVIDENCE.
        </p>

        {/* Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {pills.map((pill) => (
            <div
              key={pill}
              className="border border-black/[0.12] px-4 py-[7px] rounded-[2px]"
            >
              <span
                className="uppercase text-[10.5px] font-bold tracking-[0.1em] text-[#0A0A0A]"
                style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}
              >
                {pill}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
