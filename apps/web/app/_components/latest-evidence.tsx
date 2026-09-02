import React from "react";
import Link from "next/link";
import { 
  Bug, 
  Hash, 
  Target, 
  UserX, 
  Flag, 
  ChevronRight 
} from "lucide-react";

export function LatestEvidence() {
  const records = [
    {
      type: "Malware",
      icon: Bug,
      desc: "New AsyncRAT campaign targeting financial institutions",
      tags: "#AsyncRAT #Campaign #Finance",
      source: "Telegram",
      confidence: "High",
      time: "2m ago",
    },
    {
      type: "IOC",
      icon: Hash,
      desc: "192.168.1.100 associated with C2 infrastructure",
      tags: "#IP #C2 #Infrastructure",
      source: "Dark Web",
      confidence: "Medium",
      time: "5m ago",
    },
    {
      type: "Vulnerability",
      icon: Target,
      desc: "Critical RCE vulnerability in popular VPN software",
      tags: "#CVE-2024-1234 #RCE #VPN",
      source: "OSINT",
      confidence: "High",
      time: "12m ago",
    },
    {
      type: "Threat Actor",
      icon: UserX,
      desc: "APT29 activity observed in Eastern Europe",
      tags: "#APT29 #Russia #Espionage",
      source: "Multiple",
      confidence: "High",
      time: "18m ago",
    },
    {
      type: "Campaign",
      icon: Flag,
      desc: "New phishing campaign impersonating major banks",
      tags: "#Phishing #Campaign #Banking",
      source: "Telegram",
      confidence: "Medium",
      time: "25m ago",
    },
  ];

  return (
    <section className="w-full border-b border-[#1F2428] bg-[#07090C] py-16 lg:py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Latest Evidence<span className="text-[#FF6B00]">.</span>
            </h2>
            <p className="mt-2 max-w-xl text-xs sm:text-sm text-zinc-400">
              Recent high-confidence intelligence collected from our global monitoring network.
            </p>
          </div>

          <Link
            href="/intelligence"
            className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#FF6B00] hover:text-[#FFA040] transition-colors self-start sm:self-auto"
          >
            <span>View all evidence</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 2-Column Split: Table (8 cols) + Summary Donut Widget (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Evidence Table (8 cols) */}
          <div className="lg:col-span-8 overflow-hidden rounded-xl border border-[#1F2428] bg-[#0E1216]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="border-b border-[#1F2428] bg-[#141920] font-mono text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">TYPE</th>
                    <th className="py-3 px-4">DESCRIPTION</th>
                    <th className="py-3 px-4">SOURCE</th>
                    <th className="py-3 px-4">CONFIDENCE</th>
                    <th className="py-3 px-4">TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2428]">
                  {records.map((r) => {
                    const Icon = r.icon;
                    return (
                      <tr key={r.desc} className="hover:bg-[#141920]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-[#FF6B00]" />
                            <span>{r.type}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <span className="block font-medium text-white text-xs">
                            {r.desc}
                          </span>
                          <span className="block font-mono text-[10px] text-[#FF6B00]/90 mt-0.5">
                            {r.tags}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300">
                          {r.source}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                              r.confidence === "High"
                                ? "bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {r.confidence}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                          {r.time}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Intelligence Summary Donut Card (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-xl border border-[#1F2428] bg-[#0E1216] p-6 text-center">
            
            <div>
              <h3 className="font-sans text-sm font-bold text-white">
                Intelligence Summary
              </h3>
              <span className="block font-mono text-[10px] text-zinc-400 mt-0.5">
                Last 24 Hours
              </span>

              {/* Donut Chart Graphic */}
              <div className="relative my-6 flex items-center justify-center">
                <svg className="h-36 w-36 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1F2428" strokeWidth="8" fill="none" />
                  {/* High (36%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#FF6B00"
                    strokeWidth="8"
                    strokeDasharray="90 251.2"
                    strokeDashoffset="0"
                    fill="none"
                  />
                  {/* Medium (45%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeDasharray="113 251.2"
                    strokeDashoffset="-90"
                    fill="none"
                  />
                  {/* Low (19%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#6B7280"
                    strokeWidth="8"
                    strokeDasharray="48 251.2"
                    strokeDashoffset="-203"
                    fill="none"
                  />
                </svg>

                {/* Donut Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-mono text-2xl font-bold text-white">248</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400">Total Items</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2 font-mono text-xs text-left px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#FF6B00]" />
                    <span className="text-zinc-300">High Confidence</span>
                  </div>
                  <span className="font-bold text-white">89 (36%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                    <span className="text-zinc-300">Medium Confidence</span>
                  </div>
                  <span className="font-bold text-white">112 (45%)</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#6B7280]" />
                    <span className="text-zinc-300">Low Confidence</span>
                  </div>
                  <span className="font-bold text-white">47 (19%)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1F2428]">
              <Link
                href="/intelligence"
                className="flex h-9 w-full items-center justify-center rounded border border-[#333333] font-sans text-xs font-semibold text-zinc-200 hover:border-zinc-400 hover:text-white transition-colors"
              >
                View Full Summary
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
