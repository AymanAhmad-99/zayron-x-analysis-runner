import Link from "next/link";

export function ThreatNetworkGraph() {
  const nodes = [
    { label: "CVE-2027-1492", type: "Vuln", relation: "Exploit", position: "top" },
    { label: "Trickbot", type: "Malware", relation: "Command to", position: "top-right" },
    { label: "192.168.1.100", type: "IOC", relation: "Attributed to", position: "right" },
    { label: "T1055", type: "Technique", relation: "Command to", position: "bottom-right" },
    { label: "Operation Silent Grid", type: "Campaign", relation: "Attributed to", position: "bottom" },
    { label: "ReconVault", type: "Source", relation: "Confidence", position: "left" },
  ];

  return (
    <section className="w-full border-b border-[#E1DFD7] py-20 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-4">
        CHAPTER 05 — GRAPH
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 mb-8">
        <div>
          <h3 className="font-editorial text-2xl md:text-3xl font-semibold tracking-tight text-[#111214] mb-1.5">
            AUTONOMOUS ENTITY CORRELATION GRAPH
          </h3>
          <p className="text-xs md:text-sm text-[#5A5D65] max-w-xl">
            Real-time radial multi-hop correlation linking adversary infrastructure, techniques, exploits, and campaigns.
          </p>
        </div>
        <Link
          href="/actors"
          className="text-xs font-bold uppercase tracking-[0.06em] bg-[#FFFFFF] border border-[#E1DFD7] px-4 py-2 rounded-[4px] hover:border-[#111214] text-[#111214] transition-colors"
        >
          Explore Full Entity Graph &rarr;
        </Link>
      </div>

      {/* Network Graph Visual Canvas */}
      <div className="w-full bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-8 md:p-12 relative overflow-hidden flex items-center justify-center min-h-[380px]">
        {/* Central Radial Target Node */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#D9531E] text-[#FFFFFF] flex flex-col items-center justify-center shadow-md border-4 border-[#FFFFFF] transition-transform hover:scale-105">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#FFFFFF]/80">ACTOR</span>
            <span className="font-bold text-sm md:text-base tracking-tight">APT41</span>
          </div>
          <span className="mt-2 text-[10px] font-mono text-[#5A5D65] font-semibold bg-[#F5F4F0] px-2 py-0.5 border border-[#E1DFD7] rounded-[3px]">
            Target Entity
          </span>
        </div>

        {/* Orbiting Correlated Leaf Nodes */}
        <div className="absolute inset-0 p-6 flex flex-wrap items-center justify-around pointer-events-none">
          {nodes.map((node, idx) => (
            <div
              key={idx}
              className="pointer-events-auto bg-[#F5F4F0] border border-[#E1DFD7] px-3 py-2 rounded-[4px] shadow-sm flex flex-col items-center hover:border-[#111214] transition-colors my-2 mx-3"
            >
              <span className="text-[8px] font-mono text-[#D9531E] font-bold uppercase tracking-wider mb-0.5">
                • {node.relation}
              </span>
              <span className="font-bold text-xs text-[#111214]">{node.label}</span>
              <span className="text-[9px] text-[#8C8F98] uppercase font-mono">{node.type}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
