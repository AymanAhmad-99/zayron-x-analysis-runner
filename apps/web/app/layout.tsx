import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";

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
              "alternateName": ["ZAYRON", "ZERONX", "zayron-x.co"],
              "url": "https://zayron-x.co",
              "description": "Evidence-driven cyber threat intelligence and vulnerability radar.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://zayron-x.co/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "ZAYRON-X",
              "alternateName": ["ZAYRON", "ZERONX", "ZAYRON-X Intelligence"],
              "url": "https://zayron-x.co",
              "logo": "https://zayron-x.co/favicon.ico",
              "description": "Evidence-driven cyber threat intelligence and technical research.",
              "sameAs": [
                "https://t.me/zayronxai",
                "https://twitter.com/zayronx"
              ]
            })
          }}
        />
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
