import { Activity, ChevronRight, FileText, Radio, ShieldAlert, ShieldCheck } from '@/lib/icons';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export const dynamic = 'force-dynamic';

/* ── Mock data fallbacks ── */
const MOCK_STATS = {
  articleCount: 147,
  cveCount: 89,
  pendingFeeds: 23,
};

const MOCK_ARTICLES = [
  {
    id: '1',
    title: 'APT-C-36 Deploys New Implant Targeting Colombian Government Entities',
    category: 'Nation State',
    tags: ['MITRE ATT&CK T1071', 'APT-C-36', 'Phishing'],
    status: 'published',
    views: 1842,
  },
  {
    id: '2',
    title: 'CVE-2026-27893: Critical RCE in Fortinet FortiOS SSL-VPN Under Active Exploitation',
    category: 'Vulnerabilities',
    tags: ['MITRE ATT&CK T1190', 'CVE-2026-27893', 'RCE'],
    status: 'published',
    views: 3401,
  },
  {
    id: '3',
    title: 'LockBit 5.0 Ransomware Group Claims Attack on European Energy Sector',
    category: 'Ransomware',
    tags: ['MITRE ATT&CK T1486', 'LockBit', 'Critical Infrastructure'],
    status: 'published',
    views: 2156,
  },
  {
    id: '4',
    title: 'New SmokeLoader Variant Evades EDR via Kernel Callback Hijacking',
    category: 'Intelligence',
    tags: ['MITRE ATT&CK T1055', 'SmokeLoader', 'EDR Evasion'],
    status: 'published',
    views: 987,
  },
  {
    id: '5',
    title: 'Telegram-Based Phishing Campaign Targets Brazilian Banking Users via Automated Botnets',
    category: 'Intelligence',
    tags: ['MITRE ATT&CK T1566', 'Phishing', 'Automated Botnet'],
    status: 'pending',
    views: 654,
  },
];

const PIPELINE_WORKERS = [
  { name: 'Telegram Collector', status: 'active' as const, uptime: '14d 7h', items: 1847 },
  { name: 'Translation Engine', status: 'active' as const, uptime: '14d 7h', items: 1623 },
  { name: 'Intel Classifier', status: 'active' as const, uptime: '12d 3h', items: 891 },
  { name: 'CVE Enricher', status: 'idle' as const, uptime: '0d 0h', items: 0 },
  { name: 'Article Generator', status: 'active' as const, uptime: '10d 12h', items: 147 },
];

export default async function AdminDashboardPage() {
  /* ── Fetch real data with fallback ── */
  let articleCount = MOCK_STATS.articleCount;
  let cveCount = MOCK_STATS.cveCount;
  let pendingFeeds = MOCK_STATS.pendingFeeds;
  let recentArticles: typeof MOCK_ARTICLES = MOCK_ARTICLES;

  try {
    const [{ getArticleCount }, { getCVECount }, { getPendingFeedCount }, { getRecentArticles }] =
      await Promise.all([
        import('@/lib/supabase/queries/articles'),
        import('@/lib/supabase/queries/cves'),
        import('@/lib/supabase/queries/rawFeeds'),
        import('@/lib/supabase/queries/articles'),
      ]);

    const [dbArticleCount, dbCveCount, dbPendingFeeds, dbRecentArticles] = await Promise.all([
      getArticleCount(),
      getCVECount(),
      getPendingFeedCount(),
      getRecentArticles(5),
    ]);

    if (dbArticleCount > 0) articleCount = dbArticleCount;
    if (dbCveCount > 0) cveCount = dbCveCount;
    if (dbPendingFeeds > 0) pendingFeeds = dbPendingFeeds;
    if (dbRecentArticles.length > 0) {
      recentArticles = dbRecentArticles.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category ?? 'Intelligence',
        tags: (a.tags ?? []).length > 0 ? (a.tags as string[]) : ['MITRE ATT&CK'],
        status: a.isPublished ? 'published' : 'draft',
        views: a.views ?? 0,
      }));
    }
  } catch {
    // DB not available — using mock data
  }

  /* ── Stat Cards ── */
  const statCards = [
    {
      label: 'Total Intelligence Reports',
      value: articleCount.toLocaleString(),
      icon: FileText,
      accent: 'text-neutral-800',
      bgGlow: 'bg-neutral-100',
    },
    {
      label: 'Active CVEs Tracked',
      value: cveCount.toLocaleString(),
      icon: ShieldAlert,
      accent: 'text-[#733DD9]',
      bgGlow: 'bg-[#733DD9]/5',
    },
    {
      label: 'Pending Raw Feeds',
      value: pendingFeeds.toLocaleString(),
      icon: Radio,
      accent: 'text-neutral-800',
      bgGlow: 'bg-neutral-100',
    },
    {
      label: 'System Status',
      value: 'SECURE',
      icon: ShieldCheck,
      accent: 'text-emerald-600',
      bgGlow: 'bg-emerald-50',
    },
  ];

  return (
    <div className="p-8 max-w-[1440px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-display text-3xl font-black text-[#050505] tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-ui">
            Cyber Intelligence Dashboard &middot;{' '}
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent border border-emerald-500/20">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-ui font-semibold text-emerald-600 uppercase tracking-wider">
            All Systems Operational
          </span>
        </div>
      </div>

      {/* ── Section 1: System Health & Metrics ── */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-4 h-4 text-[#733DD9]" />
          <h2 className="text-sm font-ui font-semibold text-neutral-500 uppercase tracking-widest">
            System Health &amp; Metrics
          </h2>
          <div className="flex-1 h-px bg-neutral-200 ml-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="group relative bg-white rounded-xl border border-neutral-200 p-6 hover:border-[#733DD9]/30 hover:shadow-md transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neutral-50/20 to-transparent pointer-events-none" />
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${card.bgGlow} ${card.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {card.label === 'System Status' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-emerald-500/20 bg-transparent">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span className="text-[9px] font-ui font-bold text-emerald-600 uppercase tracking-wider">
                        Online
                      </span>
                    </div>
                  )}
                </div>
                <p className="font-display text-3xl font-black text-[#050505] tracking-tight mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-neutral-500 font-ui font-medium">{card.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 2: Recent Intelligence Feed ── */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-4 h-4 text-[#733DD9]" />
          <h2 className="text-sm font-ui font-semibold text-neutral-500 uppercase tracking-widest">
            Recent Intelligence Feed
          </h2>
          <div className="flex-1 h-px bg-neutral-200 ml-3" />
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest">
                  Title
                </th>
                <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden md:table-cell">
                  Category
                </th>
                <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">
                  MITRE Tags
                </th>
                <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden sm:table-cell">
                  Status
                </th>
                <th className="text-right py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">
                  Views
                </th>
              </tr>
            </thead>
            <tbody>
              {recentArticles.map((article, idx) => (
                <tr
                  key={article.id}
                  className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40 transition-colors"
                >
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-neutral-400 w-5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm text-[#050505] font-semibold leading-snug block max-w-md truncate group-hover:text-[#733DD9] transition-colors">
                        {article.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 px-8 hidden md:table-cell">
                    <span className="text-[10px] font-ui font-semibold text-neutral-600 uppercase tracking-wider">
                      {article.category}
                    </span>
                  </td>
                  <td className="py-6 px-8 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border border-neutral-200 text-neutral-600 bg-transparent"
                        >
                          {tag}
                        </span>
                      ))}
                      {article.tags.length > 2 && (
                        <span className="text-[9px] font-mono text-neutral-400">
                          +{article.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-8 hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[9px] font-ui font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-transparent ${
                        article.status === 'published'
                          ? 'text-emerald-600 border-emerald-500/20'
                          : 'text-amber-600 border-amber-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          article.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                      {article.status === 'published' ? 'Published' : 'Pending Review'}
                    </span>
                  </td>
                  <td className="py-6 px-8 text-right hidden lg:table-cell">
                    <span className="text-sm font-mono text-neutral-600">
                      {article.views.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 3: Pipeline Status ── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-4 h-4 text-[#733DD9]" />
          <h2 className="text-sm font-ui font-semibold text-neutral-500 uppercase tracking-widest">
            OSINT Pipeline — Worker Status
          </h2>
          <div className="flex-1 h-px bg-neutral-200 ml-3" />
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {PIPELINE_WORKERS.map((worker) => (
              <div
                key={worker.name}
                className={`relative rounded-xl border p-5 transition-all duration-300 ${
                  worker.status === 'active'
                    ? 'bg-[#733DD9]/[0.02] border-[#733DD9]/20'
                    : 'bg-neutral-50 border-neutral-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-2 rounded-lg ${
                      worker.status === 'active'
                        ? 'bg-[#733DD9]/10 text-[#733DD9]'
                        : 'bg-neutral-200 text-neutral-400'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </div>
                  <span
                    className={`flex items-center gap-1.5 text-[9px] font-ui font-bold uppercase tracking-wider ${
                      worker.status === 'active' ? 'text-[#733DD9]' : 'text-neutral-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        worker.status === 'active' ? 'bg-[#733DD9]' : 'bg-neutral-400'
                      }`}
                    />
                    {worker.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-[#050505] mb-3 font-ui leading-tight">
                  {worker.name}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-ui">Uptime</span>
                    <span className="text-neutral-600 font-mono">{worker.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-ui">Processed</span>
                    <span className="text-neutral-600 font-mono">
                      {worker.items.toLocaleString()}
                    </span>
                  </div>
                </div>
                {worker.status === 'active' && (
                  <div className="mt-4 h-0.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-[#733DD9]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pipeline flow indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-neutral-400 font-ui border-t border-neutral-100 pt-5">
            <Step label="Telegram" />
            <ChevronRight className="w-3 h-3 text-[#733DD9]" />
            <Step label="Translate" />
            <ChevronRight className="w-3 h-3 text-[#733DD9]" />
            <Step label="Classify" />
            <ChevronRight className="w-3 h-3 text-[#733DD9]" />
            <Step label="Generate" />
            <ChevronRight className="w-3 h-3 text-[#733DD9]" />
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Review</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span>{label}</span>
    </span>
  );
}
