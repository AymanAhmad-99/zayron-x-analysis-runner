import { type CVE } from "@/lib/db/schema";
import { SeverityBadge } from "@/components/cve/SeverityBadge";
import { formatDateShort } from "@/lib/utils/formatDate";

interface CveTableProps {
  cves: CVE[];
}

export function CveTable({ cves }: CveTableProps) {
  if (!cves.length) {
    return (
      <div className="text-center py-12 text-[#475569] font-ui">
        No CVEs found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-neutral-50/50 border-b border-neutral-100">
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
            <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold hidden md:table-cell">
              Vendor
            </th>
            <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold hidden lg:table-cell">
              Published
            </th>
            <th className="text-left py-5 px-6 font-mono text-[10px] uppercase tracking-wider text-[#050505] font-bold">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {cves.map((cve) => (
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
                {cve.cvssScore ?? "—"}
              </td>
              <td className="py-5 px-6 text-xs text-[#0F172A] hidden md:table-cell font-ui">
                {cve.affectedProduct ?? "—"}
              </td>
              <td className="py-5 px-6 text-xs text-[#0F172A] hidden md:table-cell font-ui">
                {cve.vendor ?? "—"}
              </td>
              <td className="py-5 px-6 text-xs text-[#475569] hidden lg:table-cell font-ui">
                {cve.publishedDate ? formatDateShort(cve.publishedDate) : "—"}
              </td>
              <td className="py-5 px-6">
                <span
                  className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded border bg-transparent ${
                    cve.status?.toLowerCase() === "active"
                      ? "text-red-700 border-red-200"
                      : cve.status?.toLowerCase() === "patched"
                      ? "text-green-700 border-green-200"
                      : "text-neutral-500 border-neutral-200"
                  }`}
                >
                  {cve.status ?? "Unknown"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
