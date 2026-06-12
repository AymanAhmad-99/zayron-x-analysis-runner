import { SeverityBadge } from '@/components/cve/SeverityBadge';
import type { CVE } from '@/lib/types';
import { formatDateShort } from '@/lib/utils/formatDate';

interface CveTrackerProps {
  cves: CVE[];
}

export function CveTracker({ cves }: CveTrackerProps) {
  if (!cves.length) return null;

  return (
    <section className="bg-white border-y border-neutral-100 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <p className="section-label">CVE Tracker</p>
          <h2 className="font-display text-2xl font-bold text-[#0F172A] mt-1">
            Vulnerability Database
          </h2>
          <p className="section-subheading mt-2">
            Latest CVEs tracked and analyzed by the ZAYRON-X intelligence desk.
          </p>
        </div>
        <div className="overflow-x-auto bg-white border border-neutral-200 rounded-xl shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold">
                  CVE ID
                </th>
                <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold">
                  Severity
                </th>
                <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold">
                  CVSS
                </th>
                <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold hidden md:table-cell">
                  Product
                </th>
                <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold hidden lg:table-cell">
                  Published
                </th>
              </tr>
            </thead>
            <tbody>
              {cves.slice(0, 10).map((cve) => (
                <tr
                  key={cve.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40 transition-colors"
                >
                  <td className="py-5 px-6">
                    <a
                      href={`/cve/${cve.cveId}`}
                      className="font-mono text-sm text-[#733DD9] hover:text-[#5B21B6] transition-colors font-semibold"
                    >
                      {cve.cveId}
                    </a>
                  </td>
                  <td className="py-5 px-6">
                    <SeverityBadge severity={cve.severity} />
                  </td>
                  <td className="py-5 px-6 font-mono text-[#0F172A] font-semibold">
                    {cve.cvssScore ?? '—'}
                  </td>
                  <td className="py-5 px-6 text-[#475569] text-xs hidden md:table-cell font-ui">
                    {cve.affectedProduct ?? cve.vendor ?? '—'}
                  </td>
                  <td className="py-5 px-6 text-[#94A3B8] text-xs hidden lg:table-cell font-ui">
                    {cve.publishedDate ? formatDateShort(cve.publishedDate) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
