export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { CveTable } from "@/components/cve/CveTable";
import { getCVEs, getCVECount } from "@/lib/supabase/queries/cves";

export const metadata: Metadata = {
  title: "CVE Tracker",
  description: "Live Common Vulnerabilities and Exposures (CVE) database. Track, filter, and analyze security vulnerabilities.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/cve`,
  },
};

interface Props {
  searchParams: Promise<{ page?: string; severity?: string }>;
}

export default async function CVEPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr) || 1;

  const [cves, totalCount] = await Promise.all([
    getCVEs(page, 25),
    getCVECount(),
  ]);

  const totalPages = Math.ceil(totalCount / 25);

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="section-label">Vulnerability Database</p>
          <h1 className="font-display text-3xl font-bold text-[#0F172A] mt-2">
            CVE Tracker
          </h1>
          <p className="text-[#475569] mt-2 font-ui">
            Tracking {totalCount.toLocaleString()} vulnerabilities in real-time.
          </p>
        </div>

        <CveTable cves={cves} />

        {/* Pagination */}
        <div className="flex justify-center gap-3 mt-10">
          {page > 1 && (
            <a
              href={`/cve?page=${page - 1}`}
              className="px-5 py-2.5 text-sm font-medium border border-[#E2E8F0] rounded-lg hover:border-[#D2B48C] hover:text-[#D2B48C] transition-colors font-ui bg-white"
            >
              Previous
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/cve?page=${page + 1}`}
              className="px-5 py-2.5 text-sm font-medium bg-[#D2B48C] text-white rounded-lg hover:bg-[#C4A47A] transition-colors font-ui shadow-sm"
            >
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
