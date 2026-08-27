import Link from "next/link";
import { SeverityBadge } from "./SeverityBadge";

interface IntelligenceLandscapeProps {
  events?: Record<string, unknown>[];
  article?: Record<string, unknown>;
}

export function IntelligenceLandscape({ events = [], article }: IntelligenceLandscapeProps) {
  // Sample wire items if dynamic events are loading
  const wireItems = events.length > 0 ? events.slice(0, 4) : [
    {
      id: "wire-1",
      timestamp: "21:41",
      severity: "CRITICAL",
      title: "CVE-2027-1492 Active exploitation in telecommunications infrastructure",
      entities: "APT41 • Linux Kernel"
    },
    {
      id: "wire-2",
      timestamp: "21:39",
      severity: "HIGH",
      title: "BlackCat ransomware infrastructure associated with new C2 IP range",
      entities: "BlackCat • 194.26.29.112"
    },
    {
      id: "wire-3",
      timestamp: "21:20",
      severity: "MEDIUM",
      title: "UNC4141 activity correlated with phishing kit distribution",
      entities: "UNC4141 • OAuth Abuse"
    }
  ];

  return (
    <section className="w-full border-b border-[#E1DFD7] py-14 px-6 max-w-[1280px] mx-auto bg-[#F5F4F0]">
      {/* Chapter Indicator & Main Headline */}
      <div className="mb-8">
        <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-2">
          CHAPTER 06 — INTELLIGENCE
        </div>
        <h2 className="font-editorial text-3xl md:text-4xl font-semibold tracking-tight text-[#111214] uppercase">
          INTELLIGENCE, NOT NOISE
        </h2>
        <p className="text-xs md:text-sm text-[#5A5D65] mt-1.5 max-w-xl">
          High-conviction corroborated intelligence dossiers paired with real-time operational telemetry feeds.
        </p>
      </div>

      {/* Split Dossier & Wire Feed View */}
      <div className="grid lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column: One High-Quality Real Intelligence Assessment Dossier Look */}
        <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-6 md:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E1DFD7] mb-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98]">
                Featured Intelligence Assessment
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-[#C82323]/10 text-[#C82323] border border-[#C82323]/20 rounded-[3px]">
                  CRITICAL
                </span>
                <span className="text-xs font-mono text-[#1D8A5E] font-bold">98% (High)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono mb-4 text-[#5A5D65]">
              <div>
                <span className="text-[9px] text-[#8C8F98] uppercase block">Category</span>
                <span className="font-bold text-[#111214]">VULNERABILITY</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8C8F98] uppercase block">Severity</span>
                <span className="font-bold text-[#C82323]">CRITICAL</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8C8F98] uppercase block">Source Count</span>
                <span className="font-bold text-[#111214]">14 Verified</span>
              </div>
              <div>
                <span className="text-[9px] text-[#8C8F98] uppercase block">Entity Count</span>
                <span className="font-bold text-[#111214]">28 Extracted</span>
              </div>
            </div>

            <h3 className="text-lg md:text-xl font-bold text-[#111214] mb-3 leading-snug">
              {(article?.title as string) || "Critical Edge Security Vulnerability Identified: Active Exploitation Observed"}
            </h3>

            <p className="text-xs md:text-sm text-[#5A5D65] leading-relaxed mb-6">
              {(article?.dek as string) || "Multi-source verified telemetry corroborates immediate perimeter vulnerability. Automated defense rules and IOC indicators compiled for active containment."}
            </p>

            <div className="bg-[#F5F4F0] border border-[#E1DFD7] p-3.5 rounded-[4px] text-xs font-mono text-[#5A5D65] space-y-1 mb-6">
              <div>• Defensive Priority: Mitigate immediately, prioritize edge patching.</div>
              <div>• Attributed Actor: UNC3886 / APT41</div>
              <div>• Impact Radius: Sovereign government & enterprise cloud edge</div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E1DFD7] flex items-center justify-between text-xs">
            <span className="text-[#8C8F98] font-mono">ID: SEC-2027-8910</span>
            <Link
              href="/threats"
              className="text-xs font-bold uppercase tracking-wider text-[#111214] hover:text-[#D9531E] transition-colors flex items-center gap-1"
            >
              Read Full Assessment &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Live Intelligence Wire */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-6 shadow-sm flex-1">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1DFD7] mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C8F98]">
                Live Intelligence Wire
              </span>
              <span className="text-[10px] font-mono text-[#D9531E] flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9531E] animate-pulse"></span>
                STREAM ACTIVE
              </span>
            </div>

            <div className="divide-y divide-[#E1DFD7]">
              {wireItems.map((item: any, idx) => (
                <div key={item.id || idx} className="py-3.5 first:pt-0 last:pb-0 hover:bg-[#F5F4F0] px-2 -mx-2 rounded-[3px] transition-colors">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8C8F98] mb-1">
                    <span>{item.timestamp || "21:41"}</span>
                    <span className="font-bold text-[#D9531E]">{item.severity || "HIGH"}</span>
                  </div>
                  <h5 className="font-bold text-xs text-[#111214] leading-snug line-clamp-2">
                    {item.title || item.raw_title || "Emerging Threat Telemetry Event"}
                  </h5>
                  <div className="text-[10px] text-[#8C8F98] font-mono mt-1">
                    {item.entities || "Correlated Signal Ingestion"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Landscape Matrix: Visual Heatmap & Charts */}
      <div className="bg-[#FFFFFF] border border-[#E1DFD7] rounded-[6px] p-6 md:p-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#E1DFD7]">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#111214]">Intelligence Landscape</h4>
            <p className="text-[11px] text-[#8C8F98]">Automated telemetry distribution answering emerging vulnerability, actor, and malware prevalence.</p>
          </div>
          <span className="text-[10px] font-mono text-[#5A5D65]">24H RADAR MATRIX</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Chart 1: Bar distribution with orange highlight */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#8C8F98] uppercase">Severity Distribution</span>
            <div className="h-24 flex items-end gap-2 pt-4 border-b border-[#E1DFD7]">
              <div className="flex-1 bg-[#EBEAE5] h-[35%] rounded-t-[2px]"></div>
              <div className="flex-1 bg-[#EBEAE5] h-[55%] rounded-t-[2px]"></div>
              <div className="flex-1 bg-[#EBEAE5] h-[40%] rounded-t-[2px]"></div>
              <div className="flex-1 bg-[#EBEAE5] h-[70%] rounded-t-[2px]"></div>
              <div className="flex-1 bg-[#D9531E] h-[95%] rounded-t-[2px]"></div>
              <div className="flex-1 bg-[#EBEAE5] h-[50%] rounded-t-[2px]"></div>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#8C8F98]">
              <span>T1</span><span>T2</span><span>T3</span><span>T4</span><span className="text-[#D9531E] font-bold">CRIT</span><span>T6</span>
            </div>
          </div>

          {/* Chart 2: Metric Trend */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#8C8F98] uppercase">Correlation Velocity</span>
            <div className="h-24 flex items-center justify-center border-b border-[#E1DFD7] text-xs font-mono text-[#5A5D65]">
              <div className="w-full h-12 flex items-center justify-between px-2 text-[10px]">
                <span className="text-[#1D8A5E] font-bold">+18.4% Signals</span>
                <span className="text-[#111214] font-bold">0.4s Ingest Latency</span>
              </div>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#8C8F98]">
              <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span>
            </div>
          </div>

          {/* Chart 3: Analytical Heatmap Grid */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#8C8F98] uppercase">Sector Heatmap Density</span>
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              <div className="h-4 bg-[#F5F4F0] rounded-[2px]"></div>
              <div className="h-4 bg-[#EBEAE5] rounded-[2px]"></div>
              <div className="h-4 bg-[#D9821E]/40 rounded-[2px]"></div>
              <div className="h-4 bg-[#D9531E]/80 rounded-[2px]"></div>
              <div className="h-4 bg-[#C82323] rounded-[2px]"></div>

              <div className="h-4 bg-[#EBEAE5] rounded-[2px]"></div>
              <div className="h-4 bg-[#D9821E]/30 rounded-[2px]"></div>
              <div className="h-4 bg-[#D9531E]/60 rounded-[2px]"></div>
              <div className="h-4 bg-[#C82323] rounded-[2px]"></div>
              <div className="h-4 bg-[#C82323]/90 rounded-[2px]"></div>

              <div className="h-4 bg-[#F5F4F0] rounded-[2px]"></div>
              <div className="h-4 bg-[#F5F4F0] rounded-[2px]"></div>
              <div className="h-4 bg-[#EBEAE5] rounded-[2px]"></div>
              <div className="h-4 bg-[#D9821E]/50 rounded-[2px]"></div>
              <div className="h-4 bg-[#D9531E] rounded-[2px]"></div>
            </div>
            <div className="flex justify-between text-[8px] font-mono text-[#8C8F98] pt-1">
              <span>Low Density</span>
              <span className="text-[#C82323] font-bold">Critical Saturation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
