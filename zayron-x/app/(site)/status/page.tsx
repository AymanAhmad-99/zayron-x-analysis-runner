'use client';

import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Cloud,
  Database,
  HelpCircle,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// ZAYRON-X — Platform Status Page
//
// Displays real-time health of every critical dependency:
//   Worker  ·  Supabase  ·  Redis  ·  KV  ·  Gemini
//
// Auto-refreshes every 60 seconds.  Green / Yellow / Red
// indicators match military-grade monitoring standards.
// ═══════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

interface HealthCheck {
  status: HealthStatus;
  latencyMs: number;
  message?: string;
}

interface HealthResponse {
  timestamp: string;
  overall: HealthStatus;
  uptime_seconds: number;
  checks: {
    worker: HealthCheck;
    supabase: HealthCheck;
    redis: HealthCheck;
    kv: HealthCheck;
    gemini: HealthCheck;
  };
}

// ── Constants ────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 60_000; // 60 seconds
const API_ENDPOINT = '/api/status';

const SERVICE_DEFS: {
  key: keyof HealthResponse['checks'];
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    key: 'worker',
    label: 'Worker',
    icon: Server,
    description: 'Cloudflare Workers edge runtime — request handler',
  },
  {
    key: 'supabase',
    label: 'Supabase',
    icon: Database,
    description: 'PostgreSQL database + auth + storage',
  },
  {
    key: 'redis',
    label: 'Redis',
    icon: Activity,
    description: 'Upstash Redis — rate limiting + read-through cache',
  },
  {
    key: 'kv',
    label: 'KV Store',
    icon: Cloud,
    description: 'Cloudflare KV — incremental static cache (ISR)',
  },
  {
    key: 'gemini',
    label: 'Gemini AI',
    icon: Brain,
    description: 'Google Gemini API — LLM intelligence pipeline',
  },
];

// ── Helpers ──────────────────────────────────────────────────

function statusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-emerald-400';
    case 'degraded':
      return 'text-amber-400';
    case 'unhealthy':
      return 'text-red-500';
    default:
      return 'text-slate-400';
  }
}

function statusBg(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500/10 border-emerald-500/30';
    case 'degraded':
      return 'bg-amber-500/10 border-amber-500/30';
    case 'unhealthy':
      return 'bg-red-500/10 border-red-500/30';
    default:
      return 'bg-slate-500/10 border-slate-500/30';
  }
}

function StatusIcon({ status }: { status: HealthStatus }) {
  const cn = 'w-5 h-5';
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className={`${cn} text-emerald-400`} />;
    case 'degraded':
      return <AlertTriangle className={`${cn} text-amber-400`} />;
    case 'unhealthy':
      return <XCircle className={`${cn} text-red-500`} />;
    default:
      return <HelpCircle className={`${cn} text-slate-400`} />;
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ── Component ────────────────────────────────────────────────

export default function StatusPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINT, { cache: 'no-store' });
      if (!res.ok && res.status !== 503) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json: HealthResponse = await res.json();
      setData(json);
      setError(null);
      setLastFetch(new Date());
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 60 s
  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-black/80 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← ZAYRON-X HOME
            </Link>
            <h1 className="text-2xl font-bold text-white mt-2 tracking-tight">Platform Status</h1>
          </div>

          <div className="flex items-center gap-4">
            {lastFetch && (
              <span className="text-[0.65rem] text-slate-500 font-mono">
                Updated {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void fetchStatus();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-800
                         text-xs text-slate-400 hover:text-white hover:border-slate-500
                         transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-12">
        {/* ── Overall Status Banner ────────────────────────── */}
        {data && (
          <div
            className={`mb-10 p-6 rounded-xl border ${statusBg(data.overall)} flex items-center gap-4`}
          >
            <StatusIcon status={data.overall} />
            <div className="flex-1">
              <p className="text-white font-semibold text-lg">
                {data.overall === 'healthy'
                  ? 'All Systems Operational'
                  : data.overall === 'degraded'
                    ? 'Degraded Performance'
                    : data.overall === 'unhealthy'
                      ? 'Service Disruption Detected'
                      : 'Status Unknown'}
              </p>
              <p className="text-slate-400 text-sm mt-0.5">
                {data.overall === 'healthy'
                  ? 'All critical services are responding normally.'
                  : data.overall === 'degraded'
                    ? 'One or more services are experiencing elevated latency or partial failures.'
                    : 'One or more services are unreachable. Engineering has been alerted.'}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-mono">{formatUptime(data.uptime_seconds)}</span>
              </div>
              <p className="text-[0.6rem] text-slate-500 mt-1">Worker Uptime</p>
            </div>
          </div>
        )}

        {/* ── Loading State ────────────────────────────────── */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-slate-600 animate-spin" />
          </div>
        )}

        {/* ── Error State ──────────────────────────────────── */}
        {error && !data && (
          <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-semibold">Failed to load status</p>
            <p className="text-red-400/60 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* ── Service Grid ─────────────────────────────────── */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICE_DEFS.map((svc) => {
              const check = data.checks[svc.key];
              const Icon = svc.icon;

              return (
                <div
                  key={svc.key}
                  className={`p-5 rounded-xl border ${statusBg(check.status)} transition-colors`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${statusColor(check.status)}`} />
                      <div>
                        <h3 className="text-white font-semibold text-sm">{svc.label}</h3>
                        <p className="text-[0.65rem] text-slate-500 mt-0.5">{svc.description}</p>
                      </div>
                    </div>
                    <StatusIcon status={check.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {check.status === 'healthy' && 'Operational'}
                      {check.status === 'degraded' && 'Degraded'}
                      {check.status === 'unhealthy' && 'Unreachable'}
                      {check.status === 'unknown' && 'Not Configured'}
                    </span>
                    {check.latencyMs > 0 && (
                      <span
                        className={`font-mono ${check.latencyMs < 200 ? 'text-emerald-400' : check.latencyMs < 1000 ? 'text-amber-400' : 'text-red-400'}`}
                      >
                        {check.latencyMs.toFixed(0)}ms
                      </span>
                    )}
                  </div>

                  {check.message && (
                    <p className="mt-3 text-[0.65rem] text-slate-500 font-mono leading-relaxed border-t border-slate-800 pt-3">
                      {check.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Incident History Placeholder ──────────────────── */}
        <div className="mt-12 p-6 rounded-xl border border-slate-800 bg-black">
          <h2 className="text-white font-semibold text-sm mb-4">Recent Incidents</h2>
          <p className="text-slate-500 text-xs">
            No incidents in the last 7 days. Incident history is tracked in{' '}
            <a
              href="https://zayron-x.statuspage.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ZAYRON-X Status Page
            </a>{' '}
            (external).
          </p>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
          <span className="text-[0.65rem] text-slate-600 font-mono">
            Auto-refreshes every 60s · API: <code className="text-slate-500">GET /api/status</code>
          </span>
          <Link
            href="/"
            className="text-[0.65rem] text-slate-600 hover:text-slate-400 transition-colors font-mono"
          >
            ZAYRON-X
          </Link>
        </div>
      </footer>
    </div>
  );
}
