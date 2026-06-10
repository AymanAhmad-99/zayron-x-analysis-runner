"use client";

import { useState, useEffect } from "react";
import { Terminal, ShieldAlert, Activity, RefreshCw, Shield, Lock, Eye, Download, Code } from "@/lib/icons";
import { getSmartFallbackImage } from "@/lib/utils/fallbackImages";

interface ThreatArtifact {
  id: string;
  title: string;
  severity: string;
  cvss_score: number;
  fbr_total: number;
  sector: string;
  is_public_teaser: boolean;
  teaser_text: string | null;
  yara_rules: string | null;
  sigma_rules: string | null;
  raw_iocs: string | null;
  unmasked_target_entities: string | null;
  sitrep_pdf_url: string | null;
  created_at: string;
}

interface DarkWebDashboardProps {
  threats: ThreatArtifact[];
  isSubscriber: boolean;
}

export function DarkWebDashboard({ threats, isSubscriber }: DarkWebDashboardProps) {
  const [filter, setFilter] = useState<string>("ALL");
  const [liveCount, setLiveCount] = useState<number>(14873);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Live count generator incrementing every few seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveCount((prev) => prev + Math.floor(Math.random() * 2) + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const filteredThreats = threats.filter((t) => {
    if (filter === "ALL") return true;
    return t.severity.toUpperCase() === filter;
  });

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8">
      {/* SaaS Live Status Bar & Counter */}
      <div className="bg-white border border-neutral-200/80 p-6 rounded-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#733DD9] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#733DD9]" />
            </span>
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#733DD9] uppercase">
              LIVE GLOBAL THREAT ACTIVITY
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-mono font-black text-neutral-900 tracking-tight">
              {liveCount.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              active anomalous vectors cataloged
            </span>
          </div>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1 text-[10px] font-mono font-bold transition-all border uppercase ${
                filter === level
                  ? "bg-[#733DD9] text-white border-[#733DD9]"
                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Threat Dossiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredThreats.length === 0 ? (
          <div className="col-span-full bg-white border border-neutral-200 p-16 text-center rounded-none">
            <ShieldAlert className="w-12 h-12 text-neutral-300 mx-auto mb-4 animate-pulse" />
            <h3 className="font-mono text-sm font-bold text-neutral-900 uppercase tracking-wider">
              No matching threat vectors
            </h3>
            <p className="text-xs text-neutral-500 mt-2 font-mono">
              Scrapers are active. Refine filters or check back later.
            </p>
          </div>
        ) : (
          filteredThreats.map((threat) => {
            const isExpanded = expandedId === threat.id;
            const smartFallbackImage = getSmartFallbackImage({
              category: "threat_intel",
            });

            return (
              <div
                key={threat.id}
                className="bg-white border border-neutral-200/80 overflow-hidden hover:border-[#733DD9]/40 transition-all duration-300 flex flex-col justify-between shadow-sm group"
              >
                {/* Header & Badges */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[9px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 border border-neutral-200/60 uppercase font-bold tracking-wider">
                      {threat.sector}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-extrabold px-2 py-0.5 border ${
                        threat.severity.toUpperCase() === "CRITICAL"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : threat.severity.toUpperCase() === "HIGH"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {threat.severity.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-neutral-900 group-hover:text-[#733DD9] transition-colors leading-snug uppercase tracking-tight">
                    {threat.title}
                  </h3>

                  {/* Fallback wireframe abstract image */}
                  <div className="aspect-[16/8] w-full overflow-hidden bg-neutral-50 border border-neutral-100 flex items-center justify-center relative select-none">
                    <img
                      src={smartFallbackImage}
                      alt={threat.title}
                      className="object-cover w-full h-full opacity-90 group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-neutral-900/5 mix-blend-multiply" />
                  </div>

                  {/* Teaser 40-word summary */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                      Executive Teaser Summary
                    </span>
                    <p className="text-sm text-neutral-700 leading-relaxed font-ui">
                      {threat.teaser_text ||
                        "No public summary compiled yet. Complete deep-web payload decryption and relational threat routing are fully cataloged."}
                    </p>
                  </div>
                </div>

                {/* Footer and Premium Toggle */}
                <div className="border-t border-neutral-100 bg-neutral-50/50 p-6 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                    <div>
                      <span>FBR: </span>
                      <span className="font-extrabold text-neutral-900">
                        {formatUSD(threat.fbr_total)}
                      </span>
                    </div>
                    <div>
                      <span>CVSS: </span>
                      <span className="font-bold text-neutral-900">
                        {threat.cvss_score}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : threat.id)}
                    className="w-full py-2 bg-[#733DD9] hover:bg-[#5f2ebd] active:scale-98 transition-all text-white font-mono text-[10px] font-bold uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isExpanded ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Hide Intelligence Analysis
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5" />
                        View Telemetry & Analysis
                      </>
                    )}
                  </button>

                  {/* Expanded Section with Premium Paywall */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-neutral-200/80 relative space-y-4">
                      {isSubscriber ? (
                        /* Authenticated Premium Subscriber Payload */
                        <div className="space-y-4 text-xs font-mono text-neutral-800">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#733DD9] tracking-wider block mb-1">
                              Target Entities (Unmasked)
                            </span>
                            <div className="bg-white border border-neutral-200 p-2.5 rounded text-neutral-700">
                              {threat.unmasked_target_entities || "None cataloged"}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#733DD9] tracking-wider block mb-1">
                              Indicators of Compromise (IoCs)
                            </span>
                            <pre className="bg-neutral-950 text-neutral-300 p-3 overflow-x-auto rounded leading-normal max-h-40 text-[10px] scrollbar-thin">
                              <code>
                                {threat.raw_iocs
                                  ? JSON.stringify(JSON.parse(threat.raw_iocs), null, 2)
                                  : "[]"}
                              </code>
                            </pre>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#733DD9] tracking-wider block mb-1">
                              YARA Rules Signature
                            </span>
                            <pre className="bg-[#0B0F19] text-[#A9B2C3] p-3 overflow-x-auto rounded leading-normal max-h-40 text-[10px] scrollbar-thin">
                              <code>{threat.yara_rules || "// No YARA rules mapped."}</code>
                            </pre>
                          </div>

                          <div>
                            <span className="text-[9px] uppercase font-bold text-[#733DD9] tracking-wider block mb-1">
                              Sigma Detection Rules
                            </span>
                            <pre className="bg-[#0B0F19] text-[#A9B2C3] p-3 overflow-x-auto rounded leading-normal max-h-40 text-[10px] scrollbar-thin">
                              <code>{threat.sigma_rules || "# No Sigma rules mapped."}</code>
                            </pre>
                          </div>

                          {threat.sitrep_pdf_url && (
                            <a
                              href={threat.sitrep_pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[9px] font-bold uppercase flex items-center justify-center gap-2 rounded"
                            >
                              <Download className="w-3 h-3" />
                              Download Executive SITREP PDF
                            </a>
                          )}
                        </div>
                      ) : (
                        /* Gated Paywall / Blur Overlay */
                        <div className="relative overflow-hidden h-72 border border-dashed border-neutral-300 rounded p-4 flex flex-col justify-between bg-neutral-50/20">
                          {/* Blurred mockup items representing the locked payload */}
                          <div className="space-y-3 blur-md select-none pointer-events-none opacity-40 text-left">
                            <div className="space-y-1">
                              <div className="h-2 w-24 bg-neutral-800 rounded" />
                              <div className="h-8 w-full bg-neutral-200 rounded" />
                            </div>
                            <div className="space-y-1">
                              <div className="h-2 w-32 bg-neutral-800 rounded" />
                              <div className="h-16 w-full bg-neutral-200 rounded" />
                            </div>
                            <div className="space-y-1">
                              <div className="h-2 w-28 bg-neutral-800 rounded" />
                              <div className="h-12 w-full bg-neutral-200 rounded" />
                            </div>
                          </div>

                          {/* paywall card */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/70 backdrop-blur-sm">
                            <div className="bg-white border border-neutral-200 p-6 text-center max-w-sm shadow-md flex flex-col items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center text-[#733DD9]">
                                <Lock className="w-4 h-4" />
                              </div>
                              <h4 className="font-mono text-xs font-black uppercase text-neutral-900 tracking-wider">
                                Restricted intelligence dossier
                              </h4>
                              <p className="text-[10px] text-neutral-500 font-mono leading-normal">
                                Active targets, YARA rules, threat vectors mapping, and raw exfiltrated payloads require clearance authorization.
                              </p>
                              <a
                                href="/pricing"
                                className="mt-2 px-4 py-2 bg-[#733DD9] hover:bg-[#5f2ebd] text-white font-mono text-[9px] font-bold uppercase transition-all duration-200 active:scale-95 flex items-center gap-1.5"
                              >
                                Read Full Analysis ──▶ Upgrade to Premium
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
