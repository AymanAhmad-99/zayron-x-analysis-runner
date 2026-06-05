import { type CVE } from "@/lib/types";

interface ThreatTickerProps {
  cves: CVE[];
}

export function ThreatTicker({ cves }: ThreatTickerProps) {
  if (!cves.length) return null;

  const doubled = [...cves, ...cves];

  return (
    <section className="bg-white border-y border-[#E2E8F0] overflow-hidden h-10">
      <div className="flex h-full">
        <div className="shrink-0 bg-[#D2B48C] px-4 flex items-center">
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-white font-mono">
            THREAT MONITOR
          </span>
        </div>
        <div className="overflow-hidden flex-1 relative">
          <div className="animate-ticker flex gap-16 whitespace-nowrap absolute h-full items-center">
            {doubled.map((cve, i) => (
              <span
                key={`${cve.cveId}-${i}`}
                className="text-xs text-[#475569] font-mono"
              >
                <span className="text-[#D2B48C] font-bold">{cve.cveId}</span>
                {" — "}
                {cve.affectedProduct ?? cve.vendor ?? "Unknown"}
                <span className="text-[#C6A664] ml-2">
                  | CVSS {cve.cvssScore}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
