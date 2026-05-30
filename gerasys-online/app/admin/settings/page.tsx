import type { Metadata } from "next";
import { Settings as SettingsIcon, Key, Database, Globe, Cpu, Bell } from "@/lib/icons";

export const metadata: Metadata = { title: "Settings" };

const ENV_GROUPS = [
  {
    label: "Database",
    icon: Database,
    color: "#00CCCC",
    vars: ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"],
  },
  {
    label: "Redis / Cache",
    icon: Cpu,
    color: "#D97706",
    vars: ["REDIS_URL", "REDIS_TOKEN"],
  },
  {
    label: "Site",
    icon: Globe,
    color: "#16A34A",
    vars: ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SITE_NAME", "REVALIDATION_SECRET"],
  },
  {
    label: "AI Pipeline",
    icon: Key,
    color: "#7C3AED",
    vars: ["DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "NVD_API_KEY"],
  },
  {
    label: "Email",
    icon: Bell,
    color: "#D2B48C",
    vars: ["RESEND_API_KEY"],
  },
];

function StatusDot({ set }: { set: boolean }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ background: set ? "#16A34A" : "#DC2626" }}
    />
  );
}

export default function AdminSettingsPage() {
  const envSnapshot = ENV_GROUPS.map((group) => ({
    ...group,
    items: group.vars.map((key) => ({
      key,
      set: !!(process.env[key] && !process.env[key]?.includes("YOUR_") && !process.env[key]?.includes("_HERE")),
    })),
  }));

  const totalSet   = envSnapshot.flatMap((g) => g.items).filter((i) => i.set).length;
  const totalCount = envSnapshot.flatMap((g) => g.items).length;
  const readyPct   = Math.round((totalSet / totalCount) * 100);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <SettingsIcon className="w-5 h-5 text-[#94A3B8]" />
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              System Settings
            </h1>
          </div>
          <p className="text-sm text-[#64748B] font-ui">
            Environment configuration and system health
          </p>
        </div>
        {/* Readiness badge */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span
            className="text-xl font-extrabold font-display"
            style={{ color: readyPct === 100 ? "#16A34A" : readyPct >= 60 ? "#D97706" : "#DC2626" }}
          >
            {readyPct}%
          </span>
          <span className="text-xs text-[#64748B] font-ui">ready</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8 bg-white/[0.04] rounded-full h-2 overflow-hidden border border-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${readyPct}%`,
            background: readyPct === 100 ? "#16A34A" : readyPct >= 60 ? "#D97706" : "#DC2626",
          }}
        />
      </div>

      {/* ENV groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {envSnapshot.map((group) => {
          const GroupIcon = group.icon;
          const groupSet  = group.items.filter((i) => i.set).length;
          return (
            <div
              key={group.label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${group.color}15`, border: `0.5px solid ${group.color}30` }}
                >
                  <GroupIcon size={14} style={{ color: group.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white font-ui">{group.label}</p>
                  <p className="text-[10px] text-[#475569] font-mono">
                    {groupSet}/{group.items.length} configured
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold font-mono px-2 py-0.5 rounded"
                  style={{
                    color:       groupSet === group.items.length ? "#16A34A" : "#DC2626",
                    background:  groupSet === group.items.length ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
                  }}
                >
                  {groupSet === group.items.length ? "READY" : "INCOMPLETE"}
                </span>
              </div>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.key} className="flex items-center gap-2.5">
                    <StatusDot set={item.set} />
                    <span className="text-[12px] font-mono text-[#94A3B8]">{item.key}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <p className="text-[11px] text-[#475569] font-mono uppercase tracking-wider mb-3">
          Configuration Instructions
        </p>
        <ol className="space-y-1.5 text-[13px] text-[#64748B] font-ui list-decimal list-inside">
          <li>Copy <code className="text-[#00CCCC] font-mono text-[12px]">.env.example</code> → <code className="text-[#00CCCC] font-mono text-[12px]">.env.local</code></li>
          <li>Fill in all <code className="text-[#D97706] font-mono text-[12px]">YOUR_*_HERE</code> placeholders with real credentials</li>
          <li>Restart the server — this page will reflect the updated status</li>
          <li>Never commit <code className="text-[#DC2626] font-mono text-[12px]">.env.local</code> to version control</li>
        </ol>
      </div>
    </div>
  );
}
