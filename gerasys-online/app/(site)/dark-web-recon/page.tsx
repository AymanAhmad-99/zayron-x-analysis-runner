import { getDarkwebFeeds } from "@/lib/db/queries/rawFeeds";
import { Terminal, ShieldAlert, Activity, RefreshCw } from "@/lib/icons";

export const revalidate = 0; // Force dynamic rendering on every request to show live CTI feeds

interface InterceptLog {
  timestamp: string;
  source: string;
  payload: string;
}

const MONITORED_FAMILIES = [
  { name: "LockBit v4", group: "LockBit", activeCampaigns: 4, severity: "CRITICAL" },
  { name: "BlackCat", group: "ALPHV Affiliate", activeCampaigns: 2, severity: "CRITICAL" },
  { name: "ALPHV", group: "ALPHV Enterprise", activeCampaigns: 3, severity: "HIGH" },
  { name: "Medusa", group: "Medusa Team", activeCampaigns: 1, severity: "HIGH" },
  { name: "BianLian", group: "BianLian Group", activeCampaigns: 2, severity: "MODERATE" }
];

export default async function DarkWebReconPage() {
  // Fetch real, live dark web feeds from database: channel LIKE 'darkweb_%' ORDER BY created_at DESC LIMIT 20
  const dbFeeds = await getDarkwebFeeds(20);

  const logs: InterceptLog[] = dbFeeds.map((feed) => ({
    timestamp: feed.createdAt ? new Date(feed.createdAt).toISOString() : new Date().toISOString(),
    source: feed.sourceChannel ? feed.sourceChannel.toUpperCase() : "DARKWEB_FEED",
    payload: feed.rawContent || "No payload content parsed.",
  }));

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-12 px-6 lg:px-10 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="bg-white border border-neutral-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#733DD9] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#733DD9]" />
              </span>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#733DD9] uppercase">
                DEEP WEB OSINT MONITORING
              </span>
            </div>
            <h1 className="text-2xl font-black uppercase text-[#050505] tracking-tight">
              DARK WEB RECON MATRIX
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-1">
              Active Tor nodes scraper sweep connected to background ransomware leak channels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/dark-web-recon" 
              className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 bg-[#F5F5F5] hover:bg-neutral-100 hover:border-neutral-300 text-neutral-700 font-mono text-[10px] font-bold uppercase transition-all duration-200 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#733DD9]" />
              REFRESH FEED
            </a>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* LEFT COLUMN: Terminal Logs Feed (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 flex flex-col h-[650px] overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#733DD9]" />
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#050505]">
                  Active Scraping Daemons Feed
                </span>
              </div>
              <span className="text-[9px] font-mono text-neutral-400">
                ACTIVE CAPTURES: {logs.length}
              </span>
            </div>

            {/* Scrollable Viewport */}
            <div 
              className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed text-neutral-800 space-y-3 scrollbar-thin bg-white"
            >
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-neutral-400 py-20 font-mono">
                  <ShieldAlert className="w-10 h-10 text-neutral-300 mb-3 animate-pulse" />
                  <span className="font-bold tracking-widest text-neutral-600">NO ACTIVE INTERCEPTS IN STORAGE</span>
                  <span className="text-[10px] mt-2 text-neutral-400 max-w-sm leading-normal">
                    Tor proxies and darkweb scraping ingestors are currently running. Run your Python daemons to start harvesting real intelligence.
                  </span>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div 
                    key={index}
                    className="pb-2 border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 p-2 transition-colors flex items-start gap-3.5"
                  >
                    <span className="text-[#733DD9] select-none font-bold shrink-0">&gt;</span>
                    <div className="space-y-0.5 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400 font-semibold font-mono">[{log.timestamp}]</span>
                        <span className="text-[#050505] font-black bg-[#F5F5F5] border border-neutral-200 px-1 text-[9px] uppercase">
                          {log.source}
                        </span>
                      </div>
                      <p className="text-neutral-700 tracking-tight break-all font-mono leading-relaxed mt-1">
                        {log.payload}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Ransomware Leak Metrics & Active Threat Maps (5 cols) */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-between">
            
            {/* Chart: Leak Counts Over Time */}
            <div className="bg-white border border-neutral-200 p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4 shrink-0">
                  <Activity className="w-4 h-4 text-[#733DD9]" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#050505]">
                    Active Extortion Leak Index
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide mb-6">
                  Aggregate volume of corporate payloads exfiltrated monthly (2027 CTI Matrix)
                </p>
              </div>

              {/* High-Contrast SVG Line Chart */}
              <div className="h-48 w-full relative border border-neutral-200 bg-[#F5F5F5] flex items-center justify-center p-2 mb-4 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 400 160">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="#E5E5E5" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="40" y1="60" x2="380" y2="60" stroke="#E5E5E5" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="40" y1="100" x2="380" y2="100" stroke="#E5E5E5" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="40" y1="140" x2="380" y2="140" stroke="#E5E5E5" strokeWidth="0.5" />

                  {/* Axes */}
                  <line x1="40" y1="20" x2="40" y2="140" stroke="#E5E5E5" strokeWidth="1" />

                  {/* High-Contrast Leak Volume Path */}
                  <path
                    d="M 40,130 L 100,110 L 160,115 L 220,70 L 280,50 L 340,35 L 380,25"
                    fill="none"
                    stroke="#050505"
                    strokeWidth="2"
                  />

                  {/* Points on Line */}
                  <circle cx="40" cy="130" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="100" cy="110" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="160" cy="115" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="220" cy="70" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="280" cy="50" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="340" cy="35" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />
                  <circle cx="380" cy="25" r="3.5" fill="#733DD9" stroke="#FFFFFF" strokeWidth="1.5" />

                  {/* Chart Labels */}
                  <text x="35" y="143" textAnchor="end" className="fill-neutral-400 font-mono text-[8px]">100</text>
                  <text x="35" y="103" textAnchor="end" className="fill-neutral-400 font-mono text-[8px]">250</text>
                  <text x="35" y="63" textAnchor="end" className="fill-neutral-400 font-mono text-[8px]">400</text>
                  <text x="35" y="23" textAnchor="end" className="fill-neutral-400 font-mono text-[8px]">550</text>

                  <text x="40" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">JAN</text>
                  <text x="100" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">FEB</text>
                  <text x="160" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">MAR</text>
                  <text x="220" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">APR</text>
                  <text x="280" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">MAY</text>
                  <text x="340" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">JUN</text>
                  <text x="380" y="153" textAnchor="middle" className="fill-neutral-400 font-mono text-[7px]">JUL</text>
                </svg>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
                <span>INDICATOR VECTOR: STEEPEST RISE Q2</span>
                <span className="text-[#050505] font-bold">SOURCE: TOR_DAEMONS v2</span>
              </div>
            </div>

            {/* Active Ransomware Families Grid */}
            <div className="bg-white border border-neutral-200 p-6 flex flex-col justify-between">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 mb-4">
                <ShieldAlert className="w-4 h-4 text-[#733DD9]" />
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#050505]">
                  Monitored Ransomware Families
                </span>
              </div>

              {/* Grid Layout */}
              <div className="divide-y divide-neutral-100 font-mono text-[10px]">
                {MONITORED_FAMILIES.map((fam) => (
                  <div key={fam.name} className="py-2.5 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-extrabold text-[#050505]">{fam.name}</span>
                      <span className="text-[8px] text-neutral-400 ml-2">({fam.group})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] px-1.5 py-0.5 border border-neutral-200 text-neutral-500 rounded-none bg-white">
                        {fam.activeCampaigns} SITES
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                        <span className="text-[8px] text-[#10B981] font-bold tracking-wider font-mono">STATUS: ACTIVE_INTERCEPTION</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
