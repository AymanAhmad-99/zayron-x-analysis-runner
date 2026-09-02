import Link from "next/link";
import { notFound } from "next/navigation";
import { getVulnerabilityById } from "@/lib/api";
import { SeverityBadge } from "@/components/SeverityBadge";
import { EvidenceBlock } from "@/components/EvidenceBlock";

const unknown = "UNKNOWN";
const date = (value?: string) => value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : unknown;

export default async function VulnerabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await getVulnerabilityById(id);
  const vulnerability = response?.data;
  if (!vulnerability) notFound();

  const exploited = vulnerability.is_exploited_in_wild === undefined || vulnerability.is_exploited_in_wild === null
    ? unknown
    : vulnerability.is_exploited_in_wild ? "EXPLOITED IN WILD" : "NOT OBSERVED";

  return (
    <main className="min-h-screen bg-[#F7F7F4] text-[#050505]">
      <div className="mx-auto max-w-[1280px] px-6 py-10 lg:py-16">
        <nav className="mb-10 text-[10px] font-mono uppercase tracking-[.12em] text-[#56606B]" aria-label="Breadcrumb"><Link href="/vulnerabilities" className="hover:text-[#C94F00]">Vulnerability Intelligence</Link><span className="mx-2">/</span><span>{vulnerability.cve_id}</span></nav>
        <header className="grid gap-8 border-b border-[#D9D7D0] pb-12 lg:grid-cols-[1fr_280px]">
          <div><div className="mb-4 flex flex-wrap items-center gap-3"><span className="font-mono text-sm font-bold text-[#C94F00]">{vulnerability.cve_id}</span><SeverityBadge severity={vulnerability.severity} /></div><h1 className="max-w-4xl font-editorial text-4xl font-bold uppercase leading-[.95] tracking-[-.035em] md:text-6xl">{vulnerability.title || "Vulnerability record"}</h1><p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#56606B]">{vulnerability.description || unknown}</p></div>
          <aside className="border-l-2 border-[#C94F00] bg-white p-5"><div className="mb-5 text-[10px] font-bold uppercase tracking-[.12em] text-[#56606B]">Source data</div><dl className="space-y-4 font-mono text-xs"><div><dt className="text-[#8C8F98]">CVSS SCORE</dt><dd className="text-xl font-bold">{vulnerability.cvss_score ?? unknown}</dd></div><div><dt className="text-[#8C8F98]">EXPLOITATION</dt><dd className="font-bold text-[#C94F00]">{exploited}</dd></div><div><dt className="text-[#8C8F98]">PUBLISHED</dt><dd>{date(vulnerability.published_at)}</dd></div></dl></aside>
        </header>

        <div className="grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
          <div className="space-y-12">
            <section><p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#C94F00]">01 / Executive summary</p><h2 className="font-editorial text-3xl font-bold uppercase">What is verified</h2><p className="mt-4 max-w-3xl leading-relaxed text-[#56606B]">{vulnerability.description || unknown}</p></section>
            <section className="border-t border-[#D9D7D0] pt-8"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#C94F00]">02 / Technical details</p><h2 className="font-editorial text-3xl font-bold uppercase">Affected surface</h2><dl className="mt-6 grid gap-px border border-[#D9D7D0] bg-[#D9D7D0] sm:grid-cols-2">{[["Vendor", vulnerability.affected_vendor], ["Product", vulnerability.affected_product], ["EPSS", vulnerability.epss_score], ["Patch reference", vulnerability.patch_url]].map(([label, value]) => <div key={label} className="bg-white p-5"><dt className="text-[10px] font-mono uppercase tracking-[.12em] text-[#8C8F98]">{label}</dt><dd className="mt-2 break-words text-sm font-semibold">{value || unknown}</dd></div>)}</dl></section>
            <section className="border-t border-[#D9D7D0] pt-8"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#C94F00]">03 / Evidence</p><h2 className="font-editorial text-3xl font-bold uppercase">Source-backed material</h2>{vulnerability.related_evidence?.length ? vulnerability.related_evidence.map((item) => <EvidenceBlock key={item.id} source={item.source_name || unknown} authority={item.type || unknown} timestamp={date(item.created_at)}><p className="text-sm leading-relaxed text-[#56606B]">{item.snippet || unknown}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-[#C94F00]">Open source reference →</a>}</EvidenceBlock>) : <p className="mt-4 border border-[#D9D7D0] bg-white p-5 font-mono text-xs text-[#56606B]">No related evidence is available for this record. {unknown}.</p>}</section>
          </div>
          <aside className="space-y-8"><section className="bg-[#050505] p-6 text-white"><p className="text-[10px] font-mono uppercase tracking-[.12em] text-[#C94F00]">ZAYRON-X analysis</p><h2 className="mt-3 font-editorial text-2xl font-bold uppercase">Assessment</h2><p className="mt-4 text-sm leading-relaxed text-white/70">No separate verified ZAYRON-X assessment is attached to this vulnerability record.</p><p className="mt-5 font-mono text-xs text-[#C94F00]">STATUS: {unknown}</p></section><section><h2 className="mb-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#56606B]">Related intelligence</h2><div className="space-y-2">{vulnerability.linked_events?.length ? vulnerability.linked_events.map((event) => <Link key={event.id} href={`/threats/${event.id}`} className="block border border-[#D9D7D0] bg-white p-4 hover:border-[#C94F00]"><span className="font-mono text-[10px] text-[#C94F00]">{event.severity} · {event.confidence}%</span><span className="mt-2 block text-sm font-bold">{event.title}</span></Link>) : <p className="border border-[#D9D7D0] p-4 font-mono text-xs text-[#56606B]">No linked events. {unknown}.</p>}</div></section><section><h2 className="mb-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#56606B]">Related IOCs</h2>{vulnerability.related_iocs?.length ? <div className="flex flex-wrap gap-2">{vulnerability.related_iocs.map((ioc) => <Link key={ioc.id} href={`/iocs/${encodeURIComponent(ioc.normalized_value)}`} className="rounded-full border border-[#D9D7D0] bg-white px-3 py-1 font-mono text-[10px] hover:border-[#C94F00]">{ioc.normalized_value}</Link>)}</div> : <p className="font-mono text-xs text-[#56606B]">No linked indicators. {unknown}.</p>}</section></aside>
        </div>
      </div>
    </main>
  );
}
