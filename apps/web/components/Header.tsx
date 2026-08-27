import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E1DFD7] bg-[#F5F4F0]/95 backdrop-blur-none">
      <div className="max-w-[1280px] mx-auto px-6 h-15 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-2.5 group">
            <span className="text-lg font-bold tracking-tight text-[#111214] group-hover:text-[#D9531E] transition-colors">
              ZAYRON-X
            </span>
            <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-[0.12em] text-[#8C8F98]">
              Cyber Threat Intelligence &amp; Research
            </span>
          </Link>
        </div>

        <nav className="hidden xl:flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5A5D65]">
          <Link href="/threats" className="hover:text-[#111214] transition-colors">Intelligence</Link>
          <Link href="/threats" className="hover:text-[#111214] transition-colors">Threats</Link>
          <Link href="/vulnerabilities" className="hover:text-[#111214] transition-colors">Vulnerabilities</Link>
          <Link href="/actors" className="hover:text-[#111214] transition-colors">Actors</Link>
          <Link href="/malware" className="hover:text-[#111214] transition-colors">Malware</Link>
          <Link href="/knowledge" className="hover:text-[#111214] transition-colors">Knowledge</Link>
          <Link href="/regulations" className="hover:text-[#111214] transition-colors">Regulations</Link>
          <Link href="/search" className="hover:text-[#111214] transition-colors">Search</Link>
          <Link href="/pricing" className="hover:text-[#111214] transition-colors">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="hidden sm:inline-flex xl:hidden items-center text-[11px] font-mono text-[#5A5D65] bg-[#FFFFFF] border border-[#E1DFD7] px-2.5 py-1.5 rounded-[4px] hover:border-[#111214] transition-colors"
          >
            Search...
          </Link>
          <Link
            href="/threats"
            className="text-[11px] font-bold uppercase tracking-[0.06em] bg-[#111214] text-[#FFFFFF] px-4 py-2 rounded-[4px] hover:bg-[#28292E] transition-colors shadow-none"
          >
            Explore Intelligence
          </Link>
        </div>
      </div>
    </header>
  );
}
