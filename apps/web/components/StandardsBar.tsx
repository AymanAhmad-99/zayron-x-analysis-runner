export function StandardsBar() {
  const standards = [
    { name: "MITRE ATT&CK", code: "TTPs / MATRIX" },
    { name: "NIST CSF 2.0", code: "SP 800-53" },
    { name: "CVE / NVD", code: "CVSS v3.1 / v4" },
    { name: "STIX 2.1", code: "STRUCTURED INTEL" },
    { name: "TAXII", code: "AUTOMATED FEED" },
    { name: "FIRST EPSS", code: "PROBABILITY MODEL" }
  ];

  return (
    <section className="w-full border-b border-[#E1DFD7] py-10 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-4">
        CHAPTER 03 — PROOF
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#111214] block">
            Built Around Established Security Intelligence Knowledge
          </span>
          <p className="text-xs text-[#5A5D65] mt-0.5">
            Cryptographic evidence and taxonomical grounding across Tier-0 global frameworks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {standards.map((s, idx) => (
            <div
              key={idx}
              className="bg-[#FFFFFF] border border-[#E1DFD7] px-3.5 py-1.5 rounded-[4px] flex items-center gap-2"
            >
              <span className="text-xs font-bold tracking-tight text-[#111214]">{s.name}</span>
              <span className="text-[9px] font-mono text-[#8C8F98]">{s.code}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
