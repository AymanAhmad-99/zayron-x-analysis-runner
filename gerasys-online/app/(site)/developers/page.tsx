"use client";

import { useState } from "react";
import { Code, Database, Globe, RefreshCw, Shield, Network, Zap } from "@/lib/icons";

interface EndpointInfo {
  method: "GET" | "POST";
  path: string;
  description: string;
  parameters: { name: string; type: string; req: boolean; desc: string }[];
  response: string;
}

const ENDPOINTS: Record<"briefings" | "cves" | "radar", EndpointInfo> = {
  briefings: {
    method: "GET",
    path: "/api/v1/briefings",
    description: "Stream high-fidelity, processed active B2B security briefings parsed by ZAYRON-X AI.",
    parameters: [
      { name: "limit", type: "integer", req: false, desc: "Number of briefings to fetch (default: 10, max: 100)" },
      { name: "category", type: "string", req: false, desc: "Filter by threat sector category (e.g. cybersecurity)" },
      { name: "severity", type: "string", req: false, desc: "Filter by risk level (CRITICAL, HIGH, MEDIUM)" },
    ],
    response: JSON.stringify(
      {
        status: "success",
        timestamp: "2026-05-21T14:55:34Z",
        results: 1,
        data: [
          {
            id: "art_90bf39a1c890",
            title: "Zero-Day Authentication Bypass in Enterprise SaaS Gateways",
            slug: "zeroday-auth-bypass-enterprise-saas",
            category: "cybersecurity",
            severity: "CRITICAL",
            financialExposure: "$5.8M",
            mitigationImpact: "HIGH YIELD",
            iocs: ["185.220.101.4", "auth-bypass-exploit.py", "SHA-256: 4a2d8b..."],
            publishedAt: "2026-05-21T11:20:00Z"
          }
        ]
      },
      null,
      2
    )
  },
  cves: {
    method: "GET",
    path: "/api/v1/cves",
    description: "Retrieve real-time vulnerability tracking records synchronized with global CVE indices.",
    parameters: [
      { name: "cveId", type: "string", req: false, desc: "Exact CVE code (e.g., CVE-2026-0144)" },
      { name: "score", type: "float", req: false, desc: "Minimum CVSS threshold score (e.g., 9.0)" },
    ],
    response: JSON.stringify(
      {
        status: "success",
        timestamp: "2026-05-21T14:55:34Z",
        cveIndexCount: 12480,
        results: [
          {
            cveId: "CVE-2026-0144",
            cvssScore: 9.8,
            vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
            description: "Remote Code Execution vulnerability in core SSL handshake decryption buffers.",
            remediation: "Deploy Cloudflare WAF buffer-check rule 88401 immediately."
          }
        ]
      },
      null,
      2
    )
  },
  radar: {
    method: "GET",
    path: "/api/v1/radar",
    description: "Fetch live infrastructure diagnostic records and node connectivity metrics.",
    parameters: [
      { name: "nodeId", type: "string", req: false, desc: "Target infrastructure asset key (e.g., corp-dns)" }
    ],
    response: JSON.stringify(
      {
        status: "success",
        nodesCount: 4,
        nodes: [
          { name: "Office 365 Tenant", type: "SaaS Connection", status: "SECURE", telemetry: "Active session monitoring" },
          { name: "Corporate DNS", type: "Domain MX/TXT", status: "WARNING", telemetry: "Missing SPF hard-fail policy flag" }
        ]
      },
      null,
      2
    )
  }
};

export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState<"briefings" | "cves" | "radar">("briefings");
  const [isLoading, setIsLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState(ENDPOINTS.briefings.response);
  const [statusCode, setStatusCode] = useState<number | null>(200);

  const activeEndpoint = ENDPOINTS[activeTab];

  const triggerRequest = () => {
    setIsLoading(true);
    setStatusCode(null);
    setTimeout(() => {
      setIsLoading(false);
      setStatusCode(200);
      setResponseOutput(activeEndpoint.response);
    }, 800);
  };

  const handleTabChange = (tab: "briefings" | "cves" | "radar") => {
    setActiveTab(tab);
    setResponseOutput(ENDPOINTS[tab].response);
  };

  return (
    <main className="min-h-screen bg-[#06090F] text-white">
      {/* Hero Section */}
      <section className="relative py-24 px-6 lg:px-10 border-b border-slate-900 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[1200px] mx-auto relative z-10 text-center lg:text-left">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold tracking-widest uppercase mb-6">
                <Code className="w-3.5 h-3.5" />
                Developer Portal & Hub
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
                Enterprise Ingestion Protocols & <span className="text-blue-500">API Gates</span>
              </h1>
              <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl font-sans mb-8">
                Automate machine-to-machine threat intelligence integration. Stream real-time CVE indices and OSINT briefings directly into your security stack via standard STIX/TAXII protocols or our secure JSON API gateway.
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded font-mono text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  API v1.0.0 (STABLE)
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded font-mono text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SIEM INTEGRATION READY
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded font-mono text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  TAXII 2.1 COMPLIANT
                </span>
              </div>
            </div>

            {/* Code Watermark Detail */}
            <div className="hidden lg:block shrink-0 bg-[#0F172A] border border-slate-800 rounded-xl p-6 font-mono text-[10px] text-slate-500 shadow-2xl min-w-[340px] select-none opacity-80">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
                <span>STIX/TAXII Feed Sync</span>
                <span className="text-blue-400">ONLINE</span>
              </div>
              <p className="leading-relaxed">
                $ taxii2-client fetch-feed --id zayron-x-intel<br/>
                [INFO] Telemetry sync initialized.<br/>
                [INFO] Handshake complete: TLP:AMBER approved<br/>
                [INFO] Indexed 1,480 IOC parameters.<br/>
                [SUCCESS] Stream connected to Splunk collector...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive API Sandbox */}
      <section className="py-20 px-6 lg:px-10 max-w-[1200px] mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold block mb-2">Sandbox Console</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">Interactive Endpoint Explorer</h2>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center border-b border-slate-850 mb-10">
          <div className="flex gap-2 p-1 bg-slate-950 border border-slate-850 rounded-lg">
            {(["briefings", "cves", "radar"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-2.5 rounded-md font-mono text-xs font-bold transition-all uppercase cursor-pointer ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "briefings" ? "GET briefings" : tab === "cves" ? "GET cves" : "GET radar"}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive EndpointPreviewCard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Endpoint documentation (5 cols) */}
          <div className="lg:col-span-5 bg-[#0B0F19] border border-slate-800 rounded-xl p-6 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 font-mono text-[9px] font-bold rounded uppercase tracking-wider">
                  {activeEndpoint.method}
                </span>
                <span className="font-mono text-xs font-bold text-white tracking-wide">
                  {activeEndpoint.path}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-6 font-sans">
                {activeEndpoint.description}
              </p>

              {/* Params list */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold mb-3 border-b border-slate-850 pb-1.5">
                  Query Parameters
                </h4>
                <div className="space-y-4">
                  {activeEndpoint.parameters.map((param) => (
                    <div key={param.name} className="flex justify-between items-start text-[11px] font-mono leading-normal">
                      <div>
                        <span className="text-white font-bold">{param.name}</span>
                        {param.req && (
                          <span className="text-red-400 text-[8px] uppercase font-bold ml-1.5">Required</span>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1 font-sans">
                          {param.desc}
                        </p>
                      </div>
                      <span className="text-slate-500 text-[10px] font-semibold">({param.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulated Request Trigger */}
            <div className="mt-8 pt-6 border-t border-slate-850">
              <button
                onClick={triggerRequest}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs tracking-wider transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    DISPATCHING PAYLOAD...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    SEND SIMULATED REQUEST
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Output Terminal (7 cols) */}
          <div className="lg:col-span-7 bg-[#03060E] border border-slate-850 rounded-xl overflow-hidden flex flex-col justify-between shadow-lg font-mono">
            {/* Terminal Header */}
            <div className="bg-slate-950/80 border-b border-slate-850 px-5 py-3 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                <span className="ml-2 font-bold tracking-wide">RESPONSE TERMINAL</span>
              </div>
              <div className="flex items-center gap-2">
                <span>STATUS:</span>
                {isLoading ? (
                  <span className="text-amber-400 font-bold animate-pulse">PENDING...</span>
                ) : statusCode === 200 ? (
                  <span className="text-emerald-400 font-bold">200 OK</span>
                ) : (
                  <span className="text-slate-400 font-bold">DISPATCH WAITING</span>
                )}
              </div>
            </div>

            {/* Terminal Screen */}
            <div className="p-5 overflow-auto max-h-[360px] text-[11px] text-[#A0AEC0] relative">
              {isLoading && (
                <div className="absolute inset-0 bg-[#03060E]/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="text-[10px] tracking-widest text-slate-400 font-bold uppercase animate-pulse">QUERYING APEX FEED...</span>
                  </div>
                </div>
              )}
              <pre className="leading-relaxed text-blue-300 font-mono whitespace-pre-wrap select-all">
                {responseOutput}
              </pre>
            </div>

            {/* Terminal Footer */}
            <div className="bg-slate-950/40 border-t border-slate-850 px-5 py-2.5 text-[9px] text-slate-500 flex justify-between select-none">
              <span>HOST: api.zayron-x.io</span>
              <span>SECURED OVER SSL/TLS</span>
            </div>
          </div>
        </div>
      </section>

      {/* SIEM & TAXII Schematic */}
      <section className="py-20 px-6 lg:px-10 border-t border-slate-900 bg-[#03060E]">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Diagram details */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold tracking-widest uppercase mb-6">
                <Network className="w-3.5 h-3.5" />
                Integration Architecture
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6">
                Secure STIX/TAXII SIEM Integration
              </h2>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-6 font-sans">
                ZAYRON-X acts as a secure transit broker. Once threat vectors or Indicators of Compromise (IoCs) are verified by the Autonomous CISO, they are compiled into standard **STIX 2.1 Object packages** and pushed to our secure TAXII Server.
              </p>
              
              <div className="space-y-4 font-sans text-xs">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-blue-600/10 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] font-bold text-blue-400 shrink-0">1</span>
                  <div>
                    <strong className="text-white block mb-1">OSINT & Telemetry Ingestion</strong>
                    <span className="text-slate-400">60+ security feeds monitored 24/7/365 to verify real-world active threats.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-blue-600/10 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] font-bold text-blue-400 shrink-0">2</span>
                  <div>
                    <strong className="text-white block mb-1">Autonomous CISO Audit</strong>
                    <span className="text-slate-400">Verifies indicators, calculates financial blast radius impact, and auto-generates playbooks.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-blue-600/10 border border-blue-500/30 flex items-center justify-center font-mono text-[10px] font-bold text-blue-400 shrink-0">3</span>
                  <div>
                    <strong className="text-white block mb-1">Automated SIEM Sync</strong>
                    <span className="text-slate-400">Pushes STIX objects cleanly into your Splunk, Microsoft Sentinel, or Datadog environment.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Beautiful CSS Schematic Visual representation */}
            <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden font-mono text-[10px] text-slate-400 select-none min-h-[350px] justify-between">
              
              {/* Grid backgrounds */}
              <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />

              <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                <span className="font-extrabold text-white text-[11px]">ZAYRON-X DATA TRANSMISSION PATHWAY</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Node 1 */}
              <div className="flex items-center justify-between p-3.5 bg-[#03060E] border border-slate-850 rounded-lg relative z-10">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-white font-bold block">OSINT Ingestion Stack</span>
                    <span className="text-[8px] text-slate-500">60+ Telemetry Feeds</span>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold">1480 IOPS</span>
              </div>

              {/* Connector line 1 */}
              <div className="flex flex-col items-center select-none py-1">
                <div className="w-[1px] h-6 bg-gradient-to-b from-blue-500 to-emerald-500 relative">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute -bottom-1 -left-[2px]" />
                </div>
              </div>

              {/* Node 2 */}
              <div className="flex items-center justify-between p-3.5 bg-[#03060E] border border-slate-850 rounded-lg relative z-10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <div>
                    <span className="text-white font-bold block">Autonomous CISO Engine</span>
                    <span className="text-[8px] text-slate-500">AI Vulnerability Triage & Scoring</span>
                  </div>
                </div>
                <span className="text-emerald-400 font-bold">98.4% CONF</span>
              </div>

              {/* Connector line 2 */}
              <div className="flex flex-col items-center select-none py-1">
                <div className="w-[1px] h-6 bg-gradient-to-b from-emerald-500 to-blue-500 relative">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping absolute -bottom-1 -left-[2px]" />
                </div>
              </div>

              {/* Node 3 */}
              <div className="flex items-center justify-between p-3.5 bg-[#03060E] border border-slate-850 rounded-lg relative z-10">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-white font-bold block">Corporate SIEM Gateway</span>
                    <span className="text-[8px] text-slate-500">Splunk / Microsoft Sentinel / Datadog</span>
                  </div>
                </div>
                <span className="text-blue-400 font-bold">Active Sync</span>
              </div>

            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
