export function ActionPipeline() {
  const capabilities = [
    { name: "DETECT", action: "Create alert rule" },
    { name: "HUNT", action: "Query IOC matrix" },
    { name: "ASSESS", action: "Investigate Graph" },
    { name: "PRIORITIZE", action: "Calculate blast radius" },
    { name: "MITIGATE", action: "Generate Sigma rules" },
    { name: "RESPOND", action: "Export STIX/YARA" }
  ];

  return (
    <section className="w-full border-b border-[#E1DFD7] py-14 px-6 max-w-[1280px] mx-auto">
      <div className="bg-[#111215] text-[#FFFFFF] border border-[#28292E] rounded-[6px] p-8 md:p-10">
        <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-2">
          CHAPTER 08 — ACTION
        </div>
        <h3 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#FFFFFF] mb-1.5">
          FROM INTELLIGENCE TO ACTION
        </h3>
        <p className="text-xs text-[#8C8F98] mb-8 max-w-xl">
          Showing integrated platform capabilities from continuous telemetry ingestion to automated defense signature compilation.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {capabilities.map((cap, idx) => (
            <div
              key={idx}
              className="bg-[#1A1B1F] border border-[#28292E] p-4 rounded-[4px] flex flex-col justify-between"
            >
              <div className="text-xs font-bold font-mono tracking-wider text-[#FFFFFF] mb-2 pb-2 border-b border-[#28292E]">
                {cap.name}
              </div>
              <div className="text-[11px] font-mono text-[#D9531E]">
                {cap.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
