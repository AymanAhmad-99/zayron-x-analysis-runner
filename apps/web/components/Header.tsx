import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#D9DDE2] bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#111111] hover:text-[#FF6A00] transition-colors">
            ZAYRON-X
          </Link>
          <Navigation />
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="hidden sm:inline-flex items-center text-xs font-mono text-[#56606B] bg-[#FFFFFF] border border-[#D9DDE2] px-3 py-1.5 hover:border-[#111111] transition-colors"
          >
            Search CVE, Actor...
          </Link>
          <Link
            href="/threats"
            className="text-xs font-bold uppercase tracking-wider bg-[#111111] text-[#FFFFFF] px-4 py-2 hover:bg-[#FF6A00] transition-colors"
          >
            Explore Intelligence
          </Link>
        </div>
      </div>
    </header>
  );
}

function Navigation() {
  return (
    <nav className="hidden md:flex gap-8 text-sm font-medium text-[#56606B]">
      <Link href="/threats" className="hover:text-[#111111] transition-colors">Intelligence</Link>
      <Link href="/intelligence/today" className="hover:text-[#111111] transition-colors">Daily Brief</Link>
      <Link href="/vulnerabilities" className="hover:text-[#111111] transition-colors">Vulnerabilities</Link>
      <Link href="/actors" className="hover:text-[#111111] transition-colors">Actors</Link>
      <Link href="/knowledge" className="hover:text-[#111111] transition-colors">Knowledge</Link>
      <Link href="/sources" className="hover:text-[#111111] transition-colors">Sources</Link>
      <Link href="/regulations" className="hover:text-[#111111] transition-colors">Regulations</Link>
    </nav>
  );
}
