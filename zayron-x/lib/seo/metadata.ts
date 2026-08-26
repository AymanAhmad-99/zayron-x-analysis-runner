import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zayron-x.co';
const SITE_NAME = 'ZAYRON-X';

export function createMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: overrides?.title ?? 'ZAYRON-X — Elite Cyber Threat Intelligence',
    description:
      overrides?.description ??
      'Premium cyber threat intelligence platform. Real-time CVE tracking, APT analysis, and cybersecurity research.',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: SITE_NAME,
      url: SITE_URL,
      ...overrides?.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      site: '@zayronx',
      ...overrides?.twitter,
    },
    alternates: {
      canonical: SITE_URL,
      ...overrides?.alternates,
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  };
}

export function getCategoryNavigationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      { '@type': 'SiteNavigationElement', position: 1, name: 'HOME', url: `${SITE_URL}/` },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: 'MALWARE',
        url: `${SITE_URL}/intelligence/malware`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: 'THREAT ACTORS',
        url: `${SITE_URL}/intelligence/threat-actors`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 4,
        name: 'VULNERABILITIES',
        url: `${SITE_URL}/intelligence/vulnerabilities`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 5,
        name: 'EXPLOITS',
        url: `${SITE_URL}/intelligence/exploits`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 6,
        name: 'DARK WEB',
        url: `${SITE_URL}/intelligence/dark-web`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 7,
        name: 'OSINT',
        url: `${SITE_URL}/intelligence/osint`,
      },
    ],
  };
}

export function getCategoryPageMetadata(category: string): Metadata {
  const friendlyNames: Record<string, string> = {
    malware: 'Malware',
    'threat-actors': 'Threat Actors',
    'threat-actor': 'Threat Actors',
    vulnerabilities: 'Vulnerabilities',
    vulnerability: 'Vulnerabilities',
    exploits: 'Exploits',
    exploit: 'Exploits',
    'dark-web': 'Dark Web',
    dark_web: 'Dark Web',
    osint: 'OSINT',
  };
  const label = friendlyNames[category.toLowerCase()] ?? category;
  return createMetadata({
    title: `${label} Intelligence Reports — ZAYRON-X`,
    description: `Latest security advisories, TTPs, and tactical analysis regarding ${label}.`,
    alternates: {
      canonical: `${SITE_URL}/intelligence/${category.toLowerCase()}`,
    },
  });
}
