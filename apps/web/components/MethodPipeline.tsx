export function MethodPipeline() {
  const steps = [
    { num: "01", name: "SIGNAL", desc: "Multi-channel raw telemetry ingestion" },
    { num: "02", name: "EVIDENCE", desc: "SHA-256 cryptographic provenance" },
    { num: "03", name: "CORRELATION", desc: "Entity resolution & graph linking" },
    { num: "04", name: "ANALYSIS", desc: "Workers AI RAG framework grounding" },
    { num: "05", name: "ASSESSMENT", desc: "Structured threat scoring & triage" },
    { num: "06", name: "ACTION", desc: "Autonomous distribution & defensive rules" }
  ];

  return (
    <section className="w-full border-b border-[#E1DFD7] bg-[#F5F4F0] py-20 px-6 max-w-[1280px] mx-auto">
      <div className="flex flex-col md:flex-row gap-12 md:gap-8 justify-between items-start mb-12">
        <div className="max-w-md">
          <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-4">
            CHAPTER 04 — METHOD
          </div>
          <h3 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#111214] mb-4">
            HOW ZAYRON-X BUILDS INTELLIGENCE
          </h3>
          <p className="text-sm text-[#5A5D65] leading-relaxed">
            A clean, deterministic visual pipeline operating autonomously at the edge. Connecting verifiable facts to actionable defensive priority without black-box logic.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 relative">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-[#111215] border border-[#28292E] p-5 rounded-[4px] flex flex-col justify-between hover:border-[#D9531E] transition-colors group"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#D9531E] font-bold mb-3 opacity-90 group-hover:opacity-100">
                <span>{step.num}</span>
                {idx < steps.length - 1 && <span className="hidden lg:inline text-[#28292E] group-hover:text-[#D9531E] transition-colors">&rarr;</span>}
              </div>
              <h4 className="font-bold text-xs tracking-wider uppercase text-[#FFFFFF] mb-2">
                {step.name}
              </h4>
            </div>
            <p className="text-[11px] text-[#8C8F98] leading-relaxed group-hover:text-[#EBEAE5] transition-colors mt-4">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
