import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./design-tokens.css";
import "./v4.css";
import "./search.css";
import "./intelligence-shell.css";
import "./vulnerability-list.css";
import "./vulnerability-overrides.css";
import "./vulnerability-detail.css";
import "./hero-rebuild.css";
import "./malware-report.css";
import "./legal.css";
import { getSiteUrl, isPreviewDeployment } from "./lib/siteConfig";
import { organizationJsonLd, serializeJsonLd, webSiteJsonLd } from "./lib/jsonLd";

const SITE_NAME = "ZAYRON-X";
const SITE_DESCRIPTION = "See the threat. Understand the evidence. Act with confidence.";
const DEFAULT_TITLE = "ZAYRON-X — Evidence-driven cyber threat intelligence";

/**
 * Wave 4B — root metadata. `metadataBase` makes every relative canonical/OG URL
 * absolute, and the title template keeps page titles consistent without each
 * page repeating the brand.
 *
 * Preview deployments are globally non-indexable: a preview host must never
 * compete with (or outrank) the production origin.
 */
/**
 * Wave 4B audit — `generateMetadata()` instead of a frozen `metadata` const.
 *
 * The preview `noindex` decision and `metadataBase` depend on the environment
 * AND the request host. A module-level export is evaluated once per isolate,
 * so it could not react to a host/env signal. Evaluating per render keeps the
 * decision correct for every request.
 */
export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const isPreview = isPreviewDeployment();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    alternates: { canonical: "/" },
    robots: isPreview
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    icons: {
      icon: [
        { url: "/favicon.ico", type: "image/x-icon" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: siteUrl,
      title: DEFAULT_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: DEFAULT_TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: SITE_DESCRIPTION,
      images: ["/og-image.png"],
    },
  };
}

export const viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* Site-wide entity graph. Inline JSON-LD is permitted by the CSP
            (`script-src 'self' 'unsafe-inline'`) and serialized so a `<` can
            never terminate the script element. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd(getSiteUrl())) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webSiteJsonLd(getSiteUrl())) }}
        />
      </body>
    </html>
  );
}
