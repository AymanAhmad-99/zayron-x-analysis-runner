import { SeverityBadge } from '@/components/cve/SeverityBadge';
import { ArrowUpRight } from '@/lib/icons';
import type { CVE } from '@/lib/types';
import Link from 'next/link';

interface CvePanelProps {
  cves: CVE[];
  totalCount: number;
}

export function CvePanel({ cves, totalCount }: CvePanelProps) {
  if (cves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-black border dark:border-slate-800 flex items-center justify-center mb-5">
          <span className="text-lg font-bold text-[var(--color-accent-intelligence)]">CVE</span>
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A] dark:text-white mb-2">
          No CVE records available yet
        </h3>
        <p className="text-[0.85rem] text-[#94A3B8] max-w-md leading-relaxed">
          CVE records will appear here when indexed vulnerability data is available.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[1.1rem] font-semibold text-[#0F172A] dark:text-white">
            Vulnerability Index
          </h2>
          <p className="text-[0.78rem] text-[#94A3B8] mt-0.5">
            {totalCount.toLocaleString()} indexed vulnerability records
          </p>
        </div>
        <Link
          href="/cve"
          className="text-[0.75rem] font-medium text-[var(--color-accent-intelligence)] hover:text-[var(--color-accent-intelligence-hover)] transition-colors duration-300 flex items-center gap-1"
        >
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-black rounded-xl border border-neutral-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-black text-[9px] uppercase tracking-wider text-[#050505] dark:text-white font-bold font-mono">
                <th className="py-5 px-6">CVE ID</th>
                <th className="py-5 px-6 hidden md:table-cell">Description</th>
                <th className="py-5 px-6">Severity</th>
                <th className="py-5 px-6 text-right hidden sm:table-cell">CVSS</th>
                <th className="py-5 px-6 hidden lg:table-cell">Vendor</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {cves.map((cve) => (
                <tr
                  key={cve.id}
                  className="border-b border-neutral-100 dark:border-slate-800 last:border-0 hover:bg-neutral-50/30 dark:hover:bg-neutral-900/30 transition-colors duration-200 group"
                >
                  <td className="py-5 px-6">
                    <Link
                      href={`/cve/${cve.cveId}`}
                      className="text-[0.82rem] font-mono font-semibold text-[#0F172A] dark:text-slate-200 group-hover:text-[var(--color-accent-intelligence)] dark:group-hover:text-[var(--color-accent-intelligence)] transition-colors duration-300"
                    >
                      {cve.cveId}
                    </Link>
                  </td>
                  <td className="py-5 px-6 hidden md:table-cell">
                    <p className="text-[0.8rem] text-[#64748B] dark:text-slate-400 line-clamp-1 max-w-md">
                      {cve.title || cve.description || '—'}
                    </p>
                  </td>
                  <td className="py-5 px-6">
                    <SeverityBadge severity={cve.severity} />
                  </td>
                  <td className="py-5 px-6 text-right hidden sm:table-cell">
                    <span className="text-[0.82rem] font-mono font-medium text-[#334155] dark:text-slate-300">
                      {cve.cvssScore ? Number(cve.cvssScore).toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="py-5 px-6 hidden lg:table-cell">
                    <span className="text-[0.78rem] text-[#94A3B8]">{cve.vendor || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
