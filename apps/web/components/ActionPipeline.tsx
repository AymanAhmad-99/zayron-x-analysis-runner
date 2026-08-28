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
    <section className="w-full border-b border-[#E1DFD7] py-20 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="flex flex-col md:flex-row gap-12 md:gap-8 justify-between items-start mb-12">
        <div className="max-w-md">
          <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-4">
            CHAPTER 08 — ACTION
          </div>
          <h3 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#111214] mb-4">
            FROM INTELLIGENCE TO ACTION
          </h3>
          <p className="text-sm text-[#5A5D65] leading-relaxed">
            Showing integrated platform capabilities from continuous telemetry ingestion to automated defense signature compilation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {capabilities.map((cap, idx) => (
          <div
            key={idx}
            className="bg-[#111215] border border-[#28292E] p-5 rounded-[4px] flex flex-col justify-between hover:border-[#D9531E] transition-colors group"
          >
            <div className="text-xs font-bold font-mono tracking-wider text-[#FFFFFF] mb-3 pb-3 border-b border-[#28292E] opacity-90 group-hover:opacity-100">
              {cap.name}
            </div>
            <div className="text-[11px] font-mono text-[#8C8F98] group-hover:text-[#D9531E] transition-colors mt-2">
              {cap.action}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
