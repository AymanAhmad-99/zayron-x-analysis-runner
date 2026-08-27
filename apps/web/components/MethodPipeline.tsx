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
    <section className="w-full border-b border-[#E1DFD7] py-14 px-6 max-w-[1280px] mx-auto">
      <div className="bg-[#111215] text-[#FFFFFF] border border-[#28292E] rounded-[6px] p-8 md:p-10">
        <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-2">
          CHAPTER 04 — METHOD
        </div>
        <h3 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#FFFFFF] mb-2">
          HOW ZAYRON-X BUILDS INTELLIGENCE
        </h3>
        <p className="text-xs text-[#8C8F98] max-w-xl mb-8">
          A clean, deterministic visual pipeline operating autonomously at the edge. Connecting verifiable facts to actionable defensive priority.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-[#1A1B1F] border border-[#28292E] p-4 rounded-[4px] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[#D9531E] font-bold mb-2">
                  <span>{step.num}</span>
                  {idx < steps.length - 1 && <span className="hidden lg:inline text-[#8C8F98]">&rarr;</span>}
                </div>
                <h4 className="font-bold text-xs tracking-wider uppercase text-[#FFFFFF] mb-1.5">
                  {step.name}
                </h4>
              </div>
              <p className="text-[11px] text-[#8C8F98] leading-normal">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
