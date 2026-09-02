import Link from "next/link";
import { notFound } from "next/navigation";
import { getReportById } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await getReportById(id);
  if (!response?.data) notFound();
  const report = response.data;
  return <main className="min-h-screen bg-[#F7F7F4] text-[#050505]"><div className="mx-auto max-w-[1280px] px-6 py-10 lg:py-16"><nav className="mb-10 text-[10px] font-mono uppercase tracking-[.12em] text-[#56606B]"><Link href="/reports" className="hover:text-[#C94F00]">Research Archive</Link><span className="mx-2">/</span><span>Report</span></nav><header className="grid gap-8 border-b border-[#D9D7D0] pb-12 lg:grid-cols-[1fr_280px]"><div><div className="mb-4 font-mono text-sm font-bold text-[#C94F00]">REPORT RECORD</div><h1 className="font-editorial text-5xl font-bold uppercase leading-[.95] tracking-[-.035em] md:text-7xl">{report.title || "UNKNOWN"}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#56606B]">{report.abstract || "UNKNOWN"}</p></div><aside className="border-l-2 border-[#C94F00] bg-white p-5"><dl className="space-y-4 font-mono text-xs"><div><dt className="text-[#8C8F98]">ACCESS</dt><dd className="font-bold">{report.tier_required || "UNKNOWN"}</dd></div><div><dt className="text-[#8C8F98]">PUBLISHED</dt><dd>{report.published_at || "UNKNOWN"}</dd></div><div><dt className="text-[#8C8F98]">UPDATED</dt><dd>{report.updated_at || "UNKNOWN"}</dd></div></dl></aside></header><div className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]"><section><p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#C94F00]">01 / Executive summary</p><h2 className="font-editorial text-3xl font-bold uppercase">Publication abstract</h2><p className="mt-5 max-w-3xl leading-relaxed text-[#56606B]">{report.abstract || "UNKNOWN"}</p></section><aside className="bg-[#050505] p-6 text-white"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#C94F00]">Evidence boundary</p><p className="mt-4 text-sm leading-relaxed text-white/70">Evidence, related entities, author, classification, findings, and assessment are not returned by the current report endpoint.</p><p className="mt-5 font-mono text-xs text-[#C94F00]">STATUS: UNKNOWN</p></aside></div></div></main>;
}
