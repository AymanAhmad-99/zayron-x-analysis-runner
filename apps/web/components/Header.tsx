import Link from "next/link";
import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E1DFD7] bg-[#F5F4F0]/95 backdrop-blur-none">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline group" aria-label="ZAYRON-X Home">
            <div className="flex items-center text-lg font-bold tracking-tight text-[#111214] transition-colors whitespace-nowrap">
              <span>ZAYRON-</span>
              <span className="text-[#D9531E]">X</span>
            </div>
            <span className="hidden lg:inline text-[9px] font-bold uppercase tracking-[0.12em] text-[#8C8F98] ml-2.5">
              Cyber Threat Intelligence &amp; Research
            </span>
          </Link>
        </div>

        <nav className="hidden xl:flex items-center gap-5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#5A5D65]">
          <Link href="/threats" className="hover:text-[#111214] transition-colors">Intelligence</Link>
          <Link href="/threats" className="hover:text-[#111214] transition-colors">Threats</Link>
          <Link href="/vulnerabilities" className="hover:text-[#111214] transition-colors">Vulnerabilities</Link>
          <Link href="/actors" className="hover:text-[#111214] transition-colors">Actors</Link>
          <Link href="/malware" className="hover:text-[#111214] transition-colors">Malware</Link>
          <Link href="/knowledge" className="hover:text-[#111214] transition-colors">Knowledge</Link>
          <Link href="/regulations" className="hover:text-[#111214] transition-colors">Regulations</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="flex items-center justify-center w-8 h-8 text-[#5A5D65] hover:text-[#111214] transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Link>
          <Link
            href="/threats"
            className="text-[10px] font-bold uppercase tracking-[0.06em] bg-[#111214] text-[#FFFFFF] px-3.5 py-1.5 rounded-[3px] hover:bg-[#28292E] transition-colors shadow-none"
          >
            Explore Intelligence
          </Link>
        </div>
      </div>
    </header>
  );
}
