import type { Metadata } from "next";
import Link from "next/link";
import { SeverityBadge } from "@/components/cve/SeverityBadge";
import { formatDateShort } from "@/lib/utils/formatDate";

export const metadata: Metadata = {
  title: "CVEs",
};

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminCVEsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;
  let cves: any[] = [];
  let total = 0;

  try {
    const { getCVEs, getCVECount } = await import("@/lib/db/queries/cves");
    [cves, total] = await Promise.all([getCVEs(page, 50), getCVECount()]);
  } catch {
    // DB not available
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-black text-[#050505] tracking-tight">
            CVE Monitor
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-ui">
            Tracked vulnerabilities and severity distribution
          </p>
        </div>
        <span className="text-xs font-ui font-semibold text-neutral-600 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-sm">
          {total.toLocaleString()} total
        </span>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/30">
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest">
                CVE ID
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest">
                Severity
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest">
                CVSS
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden md:table-cell">
                Product
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden md:table-cell">
                Status
              </th>
              <th className="text-left py-6 px-8 text-[10px] font-ui font-semibold text-neutral-500 uppercase tracking-widest hidden lg:table-cell">
                Published
              </th>
            </tr>
          </thead>
          <tbody>
            {cves.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-neutral-400 font-ui">
                  No CVEs tracked yet. The CVE ingestion pipeline will populate this table.
                </td>
              </tr>
            ) : (
              cves.map((cve, idx) => (
                <tr
                  key={cve.id}
                  className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50/40 transition-colors"
                >
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-neutral-400 w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-mono font-semibold text-[#050505] group-hover:text-[#733DD9] transition-colors">
                        {cve.cveId}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <SeverityBadge severity={cve.severity} />
                  </td>
                  <td className="py-6 px-8 font-mono text-sm text-neutral-700 font-semibold">
                    {cve.cvssScore ?? "—"}
                  </td>
                  <td className="py-6 px-8 text-xs text-neutral-600 hidden md:table-cell font-ui">
                    {cve.affectedProduct ?? "—"}
                  </td>
                  <td className="py-6 px-8 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[9px] font-ui font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-transparent ${
                        cve.status?.toLowerCase() === "active"
                          ? "text-red-600 border-red-500/20"
                          : "text-emerald-600 border-emerald-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          cve.status?.toLowerCase() === "active" ? "bg-red-500" : "bg-emerald-500"
                        }`}
                      />
                      {cve.status ?? "Unknown"}
                    </span>
                  </td>
                  <td className="py-6 px-8 hidden lg:table-cell">
                    <span className="text-xs font-mono text-neutral-500">
                      {cve.publishedDate ? formatDateShort(cve.publishedDate) : "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cves.length > 0 && (
        <div className="flex justify-center gap-3 mt-8">
          {page > 1 && (
            <Link
              href={`/admin/cves?page=${page - 1}`}
              className="px-4 py-2 text-xs font-ui font-medium text-neutral-600 hover:text-[#733DD9] bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 transition-all duration-200 shadow-sm"
            >
              Previous
            </Link>
          )}
          <Link
            href={`/admin/cves?page=${page + 1}`}
            className="px-4 py-2 text-xs font-ui font-semibold text-white bg-[#733DD9] border border-[#733DD9] rounded-lg hover:bg-[#5B21B6] transition-all duration-200 shadow-sm"
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
