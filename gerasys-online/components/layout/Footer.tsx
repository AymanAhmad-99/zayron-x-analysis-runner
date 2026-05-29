import Link from "next/link";

const currentYear = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16">

        {/* 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-14">

          {/* Column 1 — Corporate Identity */}
          <div>
            <h4 className="text-[0.72rem] font-semibold text-slate-900 uppercase tracking-[0.12em] mb-5">
              Corporate
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-[0.78rem] font-semibold text-slate-700">
                  ZAYRON-X Intelligence Corp.
                </span>
              </li>
              <li className="text-[0.72rem] text-slate-500 leading-relaxed">
                Global Headquarters<br />
                Silicon Valley, California, USA
              </li>
              <li className="text-[0.72rem] text-slate-500 leading-relaxed">
                North American Threat Ops<br />
                Toronto, Canada
              </li>
              <li className="text-[0.72rem] text-slate-500 leading-relaxed">
                EU Data Node<br />
                Frankfurt, Germany
              </li>
            </ul>
          </div>

          {/* Column 2 — Compliance & Certifications */}
          <div>
            <h4 className="text-[0.72rem] font-semibold text-slate-900 uppercase tracking-[0.12em] mb-5">
              Compliance
            </h4>
            <ul className="space-y-2.5">
              <li className="text-[0.72rem] text-slate-500">
                ISO/IEC 27001:2022 Certified
              </li>
              <li className="text-[0.72rem] text-slate-500">
                SOC 2 Type II Audited
              </li>
              <li className="text-[0.72rem] text-slate-500">
                GDPR &amp; CCPA Compliant Framework
              </li>
              <li className="text-[0.72rem] text-slate-500">
                NIST CSF Aligned
              </li>
            </ul>
          </div>

          {/* Column 3 — Tactical Operations */}
          <div>
            <h4 className="text-[0.72rem] font-semibold text-slate-900 uppercase tracking-[0.12em] mb-5">
              Operations
            </h4>
            <ul className="space-y-2.5">
              <li className="text-[0.72rem] text-slate-500">
                24/7 Incident Response Team
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[0.72rem] text-slate-500 hover:text-[#2563EB] transition-colors duration-300"
                >
                  Request CISO Executive Briefing
                </Link>
              </li>
              <li className="text-[0.72rem] text-slate-500 font-mono">
                Secure Comms (PGP Public Key)
              </li>
            </ul>
          </div>

          {/* Column 4 — Legal & Policies */}
          <div>
            <h4 className="text-[0.72rem] font-semibold text-slate-900 uppercase tracking-[0.12em] mb-5">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/terms"
                  className="text-[0.72rem] text-slate-500 hover:text-[#2563EB] transition-colors duration-300"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[0.72rem] text-slate-500 hover:text-[#2563EB] transition-colors duration-300"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/vdp"
                  className="text-[0.72rem] text-slate-500 hover:text-[#2563EB] transition-colors duration-300"
                >
                  Vulnerability Disclosure Policy
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-[0.68rem] text-slate-400 font-medium tracking-wide">
            &copy; 2026–{currentYear} ZAYRON-X Intelligence Corp. All rights reserved.
          </span>
          <span className="text-[0.65rem] text-slate-400 font-mono uppercase tracking-[0.1em]">
            TLP:AMBER — CLASSIFIED INTELLIGENCE PLATFORM
          </span>
        </div>

      </div>
    </footer>
  );
}
