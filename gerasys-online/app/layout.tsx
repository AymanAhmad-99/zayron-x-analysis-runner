export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/app/providers';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

/* ── Typography ── */
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'ZAYRON-X — Cyber Threat Intelligence',
    template: '%s | ZAYRON-X',
  },
  description:
    'ZAYRON-X: Nation-state grade cyber threat intelligence platform. Real-time CVE tracking, APT analysis, and cybersecurity research from 60+ global sources.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zayron-x.com'),
  openGraph: { type: 'website', locale: 'en_US', siteName: 'ZAYRON-X' },
  twitter: { card: 'summary_large_image', site: '@zayronx' },
  robots: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ZAYRON-X',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

import { SecurityGatingProvider } from '@/components/platform/SecurityGatingContext';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <meta name="theme-color" content="#0A0A0A" />
      </head>
      <body
        className={`min-h-screen bg-white dark:bg-[var(--color-section-royal)] text-[var(--color-text)] dark:text-white antialiased flex flex-col ${playfair.variable} ${inter.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      >
        <Providers>
          <SecurityGatingProvider>
            {/* Skip to content link */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200]
                         focus:px-4 focus:py-2 focus:bg-[var(--color-accent-intelligence)] focus:text-white focus:rounded-md
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-accent-intelligence)]
                         dark:focus:ring-offset-slate-950 focus:text-sm focus:font-semibold"
            >
              Skip to content
            </a>
            <Header />
            <div id="main-content" className="flex-1" tabIndex={-1}>
              {children}
            </div>
            <Footer />
            <ScrollToTop />
            <PwaInstallPrompt />
          </SecurityGatingProvider>
        </Providers>
      </body>
    </html>
  );
}
