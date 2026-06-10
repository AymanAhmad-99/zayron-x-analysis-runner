import { getCached } from "@/lib/cache/redis";
import { createClient } from "@/lib/supabase/server";
import { DarkWebDashboard } from "@/components/platform/DarkWebDashboard";
import { RefreshCw } from "@/lib/icons";

export const revalidate = 0; // Force dynamic rendering to show live CTI feeds

export default async function DarkWebReconPage() {
  // 1. Establish secure client session and authenticate profile
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isSubscriber = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("clearance_level")
      .eq("id", user.id)
      .single();
    
    isSubscriber = profile?.clearance_level === "SUBSCRIBER";
  }

  // 2. Query dynamic, RLS-enforced secure threat view threat_artifacts
  // We cache this query for 10 seconds to maintain high performance with real-time responsiveness
  const dbThreats = await getCached(
    process.env,
    "darkweb:threats_list",
    async () => {
      const { data, error } = await supabase
        .from("threat_artifacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error || !data) return [];
      return data;
    },
    10
  );

  return (
    <div className="bg-[#FAFAFA] min-h-screen py-12 px-6 lg:px-10 font-sans selection:bg-[#733DD9] selection:text-white">
      <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-up">
        
        {/* Header Block (Bloomberg Minimalist Style) */}
        <div className="bg-white border border-neutral-200/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
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
            <h1 className="text-2xl font-black uppercase text-neutral-900 tracking-tight">
              DARK WEB INTEL RECON
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-1">
              Active Tor nodes scraper sweep connected to background ransomware leak channels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a 
              href="/dark-web-recon" 
              className="flex items-center gap-2 px-3 py-1.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-mono text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#733DD9]" />
              REFRESH INTEL
            </a>
          </div>
        </div>

        {/* Live Client Dashboard Component */}
        <DarkWebDashboard threats={dbThreats} isSubscriber={isSubscriber} />

      </div>
    </div>
  );
}
