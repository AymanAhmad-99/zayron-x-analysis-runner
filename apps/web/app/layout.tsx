import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://zayron-x.co'),
  title: "ZAYRON-X — Evidence-Driven Cyber Threat Intelligence",
  description: "Understand what changed. Know why it matters. Evidence-driven cyber intelligence analyzing vulnerabilities, adversaries, malware, and infrastructure.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ZAYRON-X — Evidence-Driven Cyber Threat Intelligence',
    description: 'Understand what changed. Know why it matters. Evidence-driven cyber intelligence analyzing vulnerabilities, adversaries, malware, and infrastructure.',
    url: 'https://zayron-x.co',
    siteName: 'ZAYRON-X',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZAYRON-X — Evidence-Driven Cyber Threat Intelligence',
    description: 'Understand what changed. Know why it matters. Evidence-driven cyber intelligence.',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} antialiased h-full`}>
      <body className="min-h-full flex flex-col bg-[#F7F7F5] text-[#111111] font-sans selection:bg-[#FF6A00] selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "ZAYRON-X",
              "url": "https://zayron-x.co",
              "description": "Evidence-driven cyber threat intelligence and vulnerability radar."
            })
          }}
        />
        {/* Global Restrained Header */}
        <header className="sticky top-0 z-50 w-full border-b border-[#252B33]/10 bg-[#F7F7F5]/95">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Link href="/" className="text-xl font-bold tracking-tight text-[#111111] hover:text-[#FF6A00] transition-colors">
                ZAYRON-X
              </Link>
              <nav className="hidden md:flex gap-8 text-sm font-medium text-[#56606B]">
                <Link href="/threats" className="hover:text-[#111111] transition-colors">Intelligence</Link>
                <Link href="/intelligence/today" className="hover:text-[#111111] transition-colors">Daily Brief</Link>
                <Link href="/vulnerabilities" className="hover:text-[#111111] transition-colors">Vulnerabilities</Link>
                <Link href="/actors" className="hover:text-[#111111] transition-colors">Actors</Link>
                <Link href="/knowledge" className="hover:text-[#111111] transition-colors">Knowledge</Link>
                <Link href="/sources" className="hover:text-[#111111] transition-colors">Sources</Link>
                <Link href="/regulations" className="hover:text-[#111111] transition-colors">Regulations</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/search"
                className="hidden sm:inline-flex items-center text-xs font-mono text-[#56606B] bg-[#FFFFFF] border border-[#252B33]/15 px-3 py-1.5 rounded hover:border-[#111111] transition-colors"
              >
                Search CVE, Actor...
              </Link>
              <Link
                href="/threats"
                className="text-xs font-bold uppercase tracking-wider bg-[#111111] text-white px-4 py-2 rounded hover:bg-[#FF6A00] transition-colors"
              >
                Explore Intelligence
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Global Institutional Footer */}
        <footer className="border-t border-[#252B33]/10 bg-[#FFFFFF] py-16 text-sm text-[#56606B]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
              <div className="col-span-2">
                <Link href="/" className="text-xl font-bold tracking-tight text-[#111111] block mb-3">
                  ZAYRON-X
                </Link>
                <p className="text-xs text-[#56606B] leading-relaxed max-w-sm mb-4">
                  Evidence-driven cyber threat intelligence. Understand emerging threats, vulnerabilities, adversaries, malware, and infrastructure with precision.
                </p>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F7F7F5] border border-[#252B33]/10 text-[11px] font-mono text-[#111111]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-pulse"></span>
                  <span>Autonomous Ingestion Engine Active</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Intelligence</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/threats" className="hover:text-[#111111]">Live Wire</Link></li>
                  <li><Link href="/intelligence/today" className="hover:text-[#111111]">Daily Briefing</Link></li>
                  <li><Link href="/vulnerabilities" className="hover:text-[#111111]">Vulnerabilities (KEV)</Link></li>
                  <li><Link href="/actors" className="hover:text-[#111111]">Threat Actors</Link></li>
                  <li><Link href="/malware" className="hover:text-[#111111]">Malware Families</Link></li>
                  <li><Link href="/campaigns" className="hover:text-[#111111]">Campaigns</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Knowledge</h4>
                <ul className="space-y-2 text-xs">
                  <li><Link href="/knowledge" className="hover:text-[#111111]">Global Knowledge Center</Link></li>
                  <li><Link href="/sources" className="hover:text-[#111111]">Verified Source Directory</Link></li>
                  <li><Link href="/regulations" className="hover:text-[#111111]">Regulatory Intelligence</Link></li>
                  <li><Link href="/reports" className="hover:text-[#111111]">Strategic Reports</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111] mb-4">Institutional</h4>
                <ul className="space-y-2 text-xs">
                  <li><span className="text-[#7A838D]">Platform Architecture</span></li>
                  <li><span className="text-[#7A838D]">Evidence Methodology</span></li>
                  <li><span className="text-[#7A838D]">STIX / TAXII API</span></li>
                  <li><span className="text-[#7A838D]">Security & Verification</span></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-[#252B33]/10 flex flex-col sm:flex-row justify-between items-center text-xs text-[#7A838D] gap-4">
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
      </body>
    </html>
  );
}
