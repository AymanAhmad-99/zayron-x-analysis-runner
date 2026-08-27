import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E1DFD7] bg-[#F5F4F0] pt-12 pb-16 text-sm text-[#5A5D65]">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-[10px] font-bold tracking-[0.1em] text-[#8C8F98] uppercase mb-8">
          CHAPTER 11 — ENTRY
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          <div className="col-span-2">
            <Link href="/" className="text-xl font-bold tracking-tight text-[#111214] block mb-1">
              ZAYRON-X
            </Link>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8C8F98] mb-4">
              Cyber Threat Intelligence &amp; Research
            </div>
            <p className="text-xs text-[#5A5D65] leading-relaxed max-w-sm">
              Evidence-driven cyber threat intelligence. Understand what changed, know why it matters, and analyze global telemetry with mathematical certainty.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#111214] mb-3">Intelligence</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/threats" className="hover:text-[#111214]">Threats</Link></li>
              <li><Link href="/vulnerabilities" className="hover:text-[#111214]">Vulnerabilities</Link></li>
              <li><Link href="/actors" className="hover:text-[#111214]">Actors</Link></li>
              <li><Link href="/malware" className="hover:text-[#111214]">Malware</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#111214] mb-3">Knowledge</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/knowledge" className="hover:text-[#111214]">Frameworks</Link></li>
              <li><Link href="/regulations" className="hover:text-[#111214]">Regulations</Link></li>
              <li><Link href="/sources" className="hover:text-[#111214]">Sources</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#111214] mb-3">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/pricing" className="hover:text-[#111214]">Pricing</Link></li>
              <li><Link href="/about" className="hover:text-[#111214]">About</Link></li>
              <li><Link href="/contact" className="hover:text-[#111214]">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#E1DFD7] flex flex-col sm:flex-row justify-between items-center text-xs text-[#8C8F98] gap-4">
          <div>
            &copy; {new Date().getFullYear()} ZAYRON-X. Sovereign Intelligence Standard.
          </div>
          <div className="flex gap-6 text-[11px]">
            <Link href="/privacy" className="hover:text-[#111214]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111214]">Terms</Link>
            <span className="font-mono text-[#D9531E] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9531E]"></span>
              LIVE PRODUCTION
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
