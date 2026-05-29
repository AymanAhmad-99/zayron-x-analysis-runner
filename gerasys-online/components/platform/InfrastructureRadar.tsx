"use client";

import { useEffect, useState } from "react";
import { Server, Activity } from "@/lib/icons";

interface AssetNode {
  name: string;
  type: string;
  status: "SECURE" | "WARNING";
  telemetry: string;
}

const NODES: AssetNode[] = [
  { name: "Office 365 Tenant", type: "SaaS Connection", status: "SECURE", telemetry: "Active session monitoring, OAuth validated" },
  { name: "Corporate DNS", type: "Domain MX/TXT", status: "WARNING", telemetry: "Missing SPF hard-fail policy flag" },
  { name: "Public IP Range", type: "Network Node", status: "SECURE", telemetry: "0 open management ports exposed" },
  { name: "Google Workspace", type: "SaaS API", status: "SECURE", telemetry: "MFA enforcement check active" },
];

export function InfrastructureRadar() {
  const [logs, setLogs] = useState<string[]>([
    "Initial sovereign perimeter scan initiated...",
    "Scanning MX/TXT records for corporate SPF security...",
    "Perimeter sweep active on node US-EAST-01",
  ]);
 
  useEffect(() => {
    const intervals = [3000, 5000, 7500];
    const logPool = [
      "Office 365 token refresh check: SUCCESS",
      "Network Scan: Checked 24 external IP interfaces, 0 threat exposure",
      "Perimeter Sync: Checked threat vector matching database, matching complete",
      "Active scan check complete for employee target list",
      "Audit logs synced securely to Supabase PostgreSQL database",
    ];

    const timer = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] ${randomLog}`,
        ...prev.slice(0, 4),
      ]);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full lg:w-auto shrink-0 bg-white border border-neutral-200 rounded-none p-6 flex flex-col justify-between text-left shadow-none transition-all duration-300 hover:border-neutral-300 font-mono text-xs text-[#050505] min-w-[320px]">
      <div>
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#733DD9]" />
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#733DD9] font-bold font-mono">Infrastructure Radar</span>
          </div>
          <div className="flex items-center gap-1.5 border border-neutral-200 text-[#733DD9] px-2 py-0.5 rounded-none text-[8px] font-bold">
            <span className="w-1 h-1 rounded-full bg-[#733DD9]" />
            4 ACTIVE NODES
          </div>
        </div>

        {/* Nodes list */}
        <div className="space-y-3.5 mb-4">
          {NODES.map((node) => {
            const isSecure = node.status === "SECURE";
            return (
              <div key={node.name} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-[#050505] leading-none">{node.name}</span>
                    <span className="text-[8px] text-neutral-400 font-mono tracking-normal">({node.type})</span>
                  </div>
                  <p className="text-[9px] text-neutral-500 mt-1 leading-normal truncate max-w-[200px]">
                    {node.telemetry}
                  </p>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-200 text-[8px] font-bold tracking-wider shrink-0 ${
                  isSecure ? "text-[#733DD9]" : "text-neutral-500"
                }`}>
                  <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                  {node.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Telemetry Feed */}
      <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded-none p-3 text-[9px] text-neutral-800">
        <div className="flex items-center gap-1 border-b border-neutral-200 pb-1.5 mb-1.5 text-neutral-500 text-[8px] font-bold">
          <Activity className="w-3 h-3 text-[#733DD9]" />
          <span>RADAR PERIMETER FEED</span>
        </div>
        <div className="space-y-1 max-h-[60px] overflow-y-hidden text-neutral-600">
          {logs.map((log, i) => (
            <div key={i} className="truncate select-none font-mono">
              <span className="text-[#733DD9] font-bold">&gt;</span> {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
