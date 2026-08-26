import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#D9DDE2] bg-[#FFFFFF] py-16 text-sm text-[#56606B]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2">
            <Link href="/" className="text-xl font-bold tracking-tight text-[#111111] block mb-3">
              ZAYRON-X
            </Link>
            <p className="text-xs text-[#56606B] leading-relaxed max-w-sm mb-4">
              Evidence-driven cyber threat intelligence. Understand emerging threats, vulnerabilities, adversaries, malware, and infrastructure with precision.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Intelligence</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/threats" className="hover:text-[#111111]">Live Wire</Link></li>
              <li><Link href="/intelligence/today" className="hover:text-[#111111]">Daily Briefing</Link></li>
              <li><Link href="/vulnerabilities" className="hover:text-[#111111]">Vulnerabilities</Link></li>
              <li><Link href="/actors" className="hover:text-[#111111]">Threat Actors</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Knowledge</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/knowledge" className="hover:text-[#111111]">Knowledge Center</Link></li>
              <li><Link href="/sources" className="hover:text-[#111111]">Verified Sources</Link></li>
              <li><Link href="/regulations" className="hover:text-[#111111]">Regulations</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Institutional</h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-[#7A838D]">Platform Architecture</span></li>
              <li><span className="text-[#7A838D]">Evidence Methodology</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#D9DDE2] flex flex-col sm:flex-row justify-between items-center text-xs text-[#7A838D] gap-4">
          <div>
            &copy; {new Date().getFullYear()} ZAYRON-X Inc. Evidence-based intelligence.
          </div>
          <div className="flex gap-6">
            <span>Terms</span>
            <span>Privacy</span>
            <span>Security</span>
            <span>Status: Production LIVE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
