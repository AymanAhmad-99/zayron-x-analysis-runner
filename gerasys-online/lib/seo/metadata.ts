import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zayron-x.com";
const SITE_NAME = "ZAYRON-X";

export function createMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: overrides?.title ?? "ZAYRON-X — Elite Cyber Threat Intelligence",
    description:
      overrides?.description ??
      "Premium cyber threat intelligence platform. Real-time CVE tracking, APT analysis, and cybersecurity research.",
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: SITE_NAME,
      url: SITE_URL,
      ...overrides?.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      site: "@zayronx",
      ...overrides?.twitter,
    },
    alternates: {
      canonical: SITE_URL,
      ...overrides?.alternates,
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  };
}
