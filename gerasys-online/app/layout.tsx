import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/* ── Typography ── */
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#FFFFFF",
};

export const metadata: Metadata = {
  title: {
    default: "ZAYRON-X — Cyber Threat Intelligence",
    template: "%s | ZAYRON-X",
  },
  description:
    "ZAYRON-X: Nation-state grade cyber threat intelligence platform. Real-time CVE tracking, APT analysis, and cybersecurity research from 60+ global sources.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://zayron-x.com"),
  openGraph: { type: "website", locale: "en_US", siteName: "ZAYRON-X" },
  twitter: { card: "summary_large_image", site: "@zayronx" },
  robots: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
};

import { SecurityGatingProvider } from "@/components/platform/SecurityGatingContext";
 
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </head>
      <body
        className={`min-h-screen bg-white text-[#0F172A] antialiased flex flex-col ${playfair.variable} ${inter.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <SecurityGatingProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </SecurityGatingProvider>
      </body>
    </html>
  );
}
