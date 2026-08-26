import {
  ArrowUpRight,
  Bot,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  MessageSquare,
  Radio,
  Search,
  Trash2,
  XCircle,
} from '@/lib/icons';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Raw Feeds',
};

export const dynamic = 'force-dynamic';

/* ── Server Actions ── */
async function discardFeed(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;
  try {
    const { updateRawFeed } = await import('@/lib/db/queries/rawFeeds');
    await updateRawFeed(Number(id), { status: 'discarded' });
  } catch {
    // silently fail
  }
}

/* ── Types ── */
interface FeedItem {
  id: number;
  sourceChannel: string;
  rawContent: string;
  translatedContent: string | null;
  translatedTitle: string | null;
  originalLanguage: string;
  status: string;
  aiGeneratedFlag: boolean | null;
  analysis: string | null;
  timestamp: Date | null;
}

const MOCK_FEEDS: FeedItem[] = [
  {
    id: 1,
    sourceChannel: 'threat_intel_ru',
    rawContent:
      '⚠️ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: В Fortinet FortiOS обнаружена критическая уязвимость CVE-2026-27893, позволяющая удаленно выполнить код без аутентификации. Затронуты версии 7.0.x до 7.0.16. Немедленно обновите системы.',
    translatedContent:
      'CRITICAL VULNERABILITY: A critical vulnerability CVE-2026-27893 has been discovered in Fortinet FortiOS, allowing unauthenticated remote code execution. Affected versions 7.0.x through 7.0.16. Update systems immediately.',
    translatedTitle: 'Critical RCE in Fortinet FortiOS — CVE-2026-27893',
    originalLanguage: 'ru',
    status: 'pending',
    aiGeneratedFlag: false,
    analysis:
      'High-priority vulnerability with active exploitation reports in the wild. Recommend immediate publication.',
    timestamp: new Date('2026-05-10T08:23:00Z'),
  },
  {
    id: 2,
    sourceChannel: 'ransomware_feed',
    rawContent:
      'LockBit 5.0 has claimed responsibility for the attack on a major European energy distributor. They threaten to release 80GB of stolen data if ransom is not paid within 72 hours. Samples of the data have been posted on their leak site.',
    translatedContent: null,
    translatedTitle: null,
    originalLanguage: 'en',
    status: 'pending',
    aiGeneratedFlag: false,
    analysis: null,
    timestamp: new Date('2026-05-10T06:45:00Z'),
  },
  {
    id: 3,
    sourceChannel: 'apt_watch_telegram',
    rawContent:
      "LATAM: APT-C-36 campaigns targeting Colombian government entities have intensified. New phishing lures using themed documents related to tax authority. Delivers updated version of the 'Blind Eagle' implant with enhanced evasion capabilities.",
    translatedContent:
      'A new phishing campaign targeting Colombian government entities uses tax-themed lures to deliver an updated Blind Eagle implant with enhanced evasion.',
    translatedTitle: 'APT-C-36 Intensifies Operations Against Colombian Government',
    originalLanguage: 'en',
    status: 'translated',
    aiGeneratedFlag: false,
    analysis:
      'Consistent with ongoing APT-C-36 activity. The tax-themed lures align with the current filing season in Colombia.',
    timestamp: new Date('2026-05-10T04:12:00Z'),
  },
  {
    id: 4,
    sourceChannel: 'dark_web_broker_channel',
    rawContent:
      'SELLING: Zero-day exploit for Microsoft Exchange Server 2025. Price: 2.5 BTC. Proof available upon request. No LE, no journalists. Serious buyers only. Contact: @dark_0day_broker',
    translatedContent: null,
    translatedTitle: null,
    originalLanguage: 'en',
    status: 'pending',
    aiGeneratedFlag: true,
    analysis:
      'AI-generated flag triggered. Content resembles common scam patterns on dark web markets. Verify before processing.',
    timestamp: new Date('2026-05-09T23:55:00Z'),
  },
  {
    id: 5,
    sourceChannel: 'osint_brazil',
    rawContent:
      'Nova campanha de phishing visa clientes do Banco do Brasil e Nubank. Os golpistas estão usando mensagens SMS и Telegram com links maliciosos que imitam as páginas de login legítimas. Mais de 500 vítimas relatadas nas últimas 48 horas.',
    translatedContent:
      'New phishing campaign targets Banco do Brasil and Nubank customers. Scammers use SMS and Telegram messages with malicious links mimicking legitimate login pages. Over 500 victims reported in the last 48 hours.',
    translatedTitle: 'Large-Scale Phishing Campaign Targets Brazilian Banks',
    originalLanguage: 'pt',
    status: 'translated',
    aiGeneratedFlag: false,
    analysis:
      'Automated botnet infrastructure detected. Campaign uses Telegram bots for C2 communication.',
    timestamp: new Date('2026-05-09T21:30:00Z'),
  },
  {
    id: 6,
    sourceChannel: 'vuln_disclosure',
    rawContent:
      'New SmokeLoader variant (v4.3) detected in the wild. Key changes: uses kernel callback hijacking for EDR evasion, adds AES-256 encryption for C2 traffic, drops Amadey loader as secondary payload. Sample hash: a3f8c9d1e2b4...',
    translatedContent: null,
    translatedTitle: null,
    originalLanguage: 'en',
    status: 'pending',
    aiGeneratedFlag: false,
    analysis: null,
    timestamp: new Date('2026-05-09T19:15:00Z'),
  },
  {
    id: 7,
    sourceChannel: 'threat_intel_ru',
    rawContent:
      "Хакерская группа 'Sandworm' (APT-44) атакует украинские энергетические компании через новую вредоносную программу 'PolarBear'. Используется фишинг с темами восстановления инфраструктуры.",
    translatedContent:
      "Sandworm APT-44 is attacking Ukrainian energy companies via new malware 'PolarBear'. Uses infrastructure restoration-themed phishing.",
    translatedTitle: 'Sandworm APT-44 Targets Ukrainian Energy Sector with PolarBear Malware',
    originalLanguage: 'ru',
    status: 'translated',
    aiGeneratedFlag: false,
    analysis:
      'Geopolitical context aligns with ongoing conflict. Sandworm activity historically peaks during infrastructure rebuilding periods.',
    timestamp: new Date('2026-05-09T14:00:00Z'),
  },
];

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function AdminFeedsPage({ searchParams }: Props) {
  const { id: selectedId } = await searchParams;

  let feeds: FeedItem[] = MOCK_FEEDS;
  let pendingCount = MOCK_FEEDS.filter((f) => f.status === 'pending').length;

  try {
    const { getRawFeeds, getPendingFeedCount } = await import('@/lib/db/queries/rawFeeds');
    const [dbFeeds, dbPendingCount] = await Promise.all([
      getRawFeeds(1, 50),
      getPendingFeedCount(),
    ]);

    if (dbFeeds.length > 0) {
      feeds = dbFeeds.map((f) => ({
        id: f.id,
        sourceChannel: f.sourceChannel,
        rawContent: f.rawContent,
        translatedContent: f.translatedContent ?? null,
        translatedTitle: f.translatedTitle ?? null,
        originalLanguage: f.originalLanguage,
        status: f.status,
        aiGeneratedFlag: f.aiGeneratedFlag ?? null,
        analysis: f.analysis ?? null,
        timestamp: f.timestamp ? new Date(f.timestamp) : null,
      }));
    }
    if (dbPendingCount >= 0) pendingCount = dbPendingCount;
  } catch {
    // DB not available — using mock data
  }

  const selectedFeed = selectedId
    ? (feeds.find((f) => String(f.id) === selectedId) ?? feeds[0])
    : feeds[0];

  const statusStyles: Record<string, string> = {
    pending: 'text-amber-600 border-amber-500/20 bg-transparent',
    translated: 'text-blue-600 border-blue-500/20 bg-transparent',
    promoted: 'text-emerald-600 border-emerald-500/20 bg-transparent',
    discarded: 'text-red-600 border-red-500/20 bg-transparent',
  };

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col font-sans">
      <div className="shrink-0 px-8 pt-8 pb-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-black text-[#050505] tracking-tight">
              Raw Feeds Triage
            </h1>
            <p className="text-sm text-neutral-500 mt-1 font-ui">
              Telegram intelligence pipeline &middot; Incoming messages awaiting analysis
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-transparent border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-xs font-ui font-semibold text-amber-600">
              {pendingCount} pending
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-0 overflow-hidden px-8 pb-8">
        {/* ── Left Panel: Feed List ── */}
        <div className="w-[420px] shrink-0 bg-white rounded-xl border border-neutral-200 flex flex-col overflow-hidden shadow-sm">
          <div className="shrink-0 px-4 pt-4 pb-3 border-b border-neutral-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Filter feeds..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-2 text-sm text-[#050505] placeholder-neutral-400 font-ui focus:outline-none focus:border-[#733DD9]/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {feeds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <Radio className="w-8 h-8 text-neutral-300 mb-3" />
                <p className="text-sm text-neutral-400 font-ui">
                  No raw feeds yet. The Telegram ingestion pipeline will populate this table.
                </p>
              </div>
            ) : (
              feeds.map((feed) => {
                const isSelected = feed.id === selectedFeed?.id;
                return (
                  <Link
                    key={feed.id}
                    href={`/admin/feeds?id=${feed.id}`}
                    className={`block px-4 py-4 transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#733DD9]/[0.04] border-l-2 border-[#733DD9]'
                        : 'border-l-2 border-transparent hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="text-xs font-mono font-semibold text-[#050505] truncate">
                          {feed.sourceChannel}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] font-ui font-bold uppercase px-2 py-0.5 rounded-full border ${
                          statusStyles[feed.status] ?? statusStyles.pending
                        }`}
                      >
                        {feed.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 font-ui ml-6">
                      {feed.translatedContent ?? feed.rawContent}
                    </p>
                    <div className="flex items-center gap-3 mt-2 ml-6">
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                        <Globe className="w-3 h-3" />
                        {feed.originalLanguage.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                        <Clock className="w-3 h-3" />
                        {feed.timestamp
                          ? new Intl.DateTimeFormat('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(feed.timestamp))
                          : '—'}
                      </span>
                      {feed.aiGeneratedFlag && (
                        <span className="flex items-center gap-1 text-[10px] text-red-600 font-ui font-semibold">
                          <Bot className="w-3 h-3" />
                          AI
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Feed Detail ── */}
        <div className="flex-1 ml-5 bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col shadow-sm">
          {selectedFeed ? (
            <>
              <div className="shrink-0 px-6 py-5 border-b border-neutral-200 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-[#733DD9]" />
                      <span className="text-xs font-mono font-semibold text-[#733DD9]">
                        {selectedFeed.sourceChannel}
                      </span>
                      <span
                        className={`text-[9px] font-ui font-bold uppercase px-2 py-0.5 rounded-full border ${
                          statusStyles[selectedFeed.status] ?? statusStyles.pending
                        }`}
                      >
                        {selectedFeed.status}
                      </span>
                      {selectedFeed.aiGeneratedFlag && (
                        <span className="flex items-center gap-1 text-[9px] text-red-600 bg-transparent border border-red-500/20 px-2 py-0.5 rounded-full font-ui font-bold uppercase">
                          <Bot className="w-3 h-3" />
                          AI Flagged
                        </span>
                      )}
                    </div>
                    {selectedFeed.translatedTitle && (
                      <h2 className="text-lg font-display font-black text-[#050505] leading-snug">
                        {selectedFeed.translatedTitle}
                      </h2>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-ui">
                        <Globe className="w-3.5 h-3.5" />
                        {selectedFeed.originalLanguage.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-ui">
                        <Clock className="w-3.5 h-3.5" />
                        {selectedFeed.timestamp
                          ? new Intl.DateTimeFormat('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }).format(new Date(selectedFeed.timestamp))
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-neutral-400" />
                    <h3 className="text-[10px] font-ui font-semibold text-neutral-400 uppercase tracking-widest">
                      Raw Content
                    </h3>
                  </div>
                  <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-neutral-600 bg-neutral-50 p-4 rounded-lg border border-neutral-200 max-h-[200px] overflow-y-auto">
                    {selectedFeed.rawContent}
                  </pre>
                </div>

                {selectedFeed.translatedContent && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-3.5 h-3.5 text-[#733DD9]" />
                      <h3 className="text-[10px] font-ui font-semibold text-[#733DD9] uppercase tracking-widest">
                        Translation
                      </h3>
                    </div>
                    <div className="text-sm leading-relaxed text-[#050505] bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                      {selectedFeed.translatedContent}
                    </div>
                  </div>
                )}

                {selectedFeed.analysis && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="w-3.5 h-3.5 text-[#733DD9]" />
                      <h3 className="text-[10px] font-ui font-semibold text-[#733DD9] uppercase tracking-widest">
                        Analyst Notes
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-800 bg-[#733DD9]/[0.02] p-4 rounded-lg border border-[#733DD9]/10">
                      {selectedFeed.analysis}
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-neutral-200 bg-neutral-50">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/feeds/${selectedFeed.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-ui font-medium text-neutral-600 hover:text-[#733DD9] bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 transition-all duration-200 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Full Details
                  </Link>
                  <div className="flex items-center gap-3">
                    {(selectedFeed.status === 'pending' ||
                      selectedFeed.status === 'translated') && (
                      <form action={discardFeed}>
                        <input type="hidden" name="id" value={selectedFeed.id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-ui font-semibold text-red-600 hover:text-red-700 bg-transparent border border-red-500/20 rounded-lg transition-all duration-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Discard
                        </button>
                      </form>
                    )}
                    {(selectedFeed.status === 'pending' ||
                      selectedFeed.status === 'translated') && (
                      <Link
                        href={`/admin/feeds/${selectedFeed.id}?action=promote`}
                        className="flex items-center gap-1.5 px-5 py-2 text-xs font-ui font-semibold text-white bg-[#733DD9] hover:bg-[#5B21B6] rounded-lg transition-all duration-200 shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve &amp; Promote
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    )}
                    {selectedFeed.status === 'promoted' && (
                      <span className="flex items-center gap-1.5 text-xs font-ui font-semibold text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        Promoted to Article
                      </span>
                    )}
                    {selectedFeed.status === 'discarded' && (
                      <span className="flex items-center gap-1.5 text-xs font-ui font-semibold text-red-600">
                        <XCircle className="w-4 h-4" />
                        Discarded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Radio className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                <p className="text-sm text-neutral-400 font-ui">
                  Select a feed from the left panel to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
