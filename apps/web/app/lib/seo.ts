/**
 * Gate 3A.5 — one place where a page's `robots` verdict is decided.
 *
 * The rule is deliberately one-directional: a preview deployment is ALWAYS
 * `noindex, nofollow, nocache`, no matter what the content-level indexability
 * rule (malware `isMalwareReportIndexable`, CVE verification state) says.
 * Production may only ever emit `index, follow` — never `nofollow`.
 *
 * Sitemaps keep their own content filter so preview can still be used to test
 * what production WOULD advertise.
 */

/**
 * PHASE 9A (F2) — one OpenGraph builder so a page-level `openGraph` object can
 * never wipe out `images`. Next.js REPLACES `openGraph` wholesale rather than
 * merging it with the root layout, which silently dropped `og:image` on 9 of 14
 * key pages. Every page must build its OpenGraph here.
 */
export const DEFAULT_OG_IMAGE = "/og-image.png";

export interface OpenGraphInput {
  title: string;
  description: string;
  path: string;
  /** Entity card path such as `/api/og/cve/CVE-2026-1`. */
  image?: string | null;
  type?: "website" | "article";
  siteName?: string;
}

export interface OpenGraphOutput {
  title: string;
  description: string;
  url: string;
  type: "website" | "article";
  siteName: string;
  images: Array<{ url: string; width: number; height: number; alt: string }>;
}

/** Non-empty, absolute-path image. Never returns `undefined`. */
export function openGraphImage(image?: string | null): string {
  const value = typeof image === "string" ? image.trim() : "";
  if (value && (value.startsWith("/") || /^https?:\/\//.test(value))) return value;
  return DEFAULT_OG_IMAGE;
}

export function buildOpenGraph(input: OpenGraphInput): OpenGraphOutput {
  const url = openGraphImage(input.image);
  return {
    title: input.title,
    description: input.description,
    url: input.path,
    type: input.type ?? "article",
    siteName: input.siteName ?? "ZAYRON-X",
    images: [{ url, width: 1200, height: 630, alt: input.title }],
  };
}

/* ─────────────────── PHASE 9B — linked JSON-LD @graph ──────────────────── */

/** Stable @id URIs: one entity, one identifier, on every page. */
export const ORGANIZATION_ID = "https://zayron-x.co/#organization";
export const WEBSITE_ID = "https://zayron-x.co/#website";

/** Kept in sync with the canonical site URL; callers may override. */
export const CANONICAL_SITE_URL = "https://zayron-x.co";

/**
 * Verified social profiles only. A configured-but-wrong URL is worse than no
 * `sameAs` at all, so an unset variable contributes nothing.
 */
export function socialProfiles(env: Record<string, string | undefined> = typeof process === "undefined" || !process.env ? {} : (process.env as Record<string, string | undefined>)): string[] {
  const profiles = ["https://t.me/zayronxai"];
  for (const key of [
    "NEXT_PUBLIC_SOCIAL_X_URL",
    "NEXT_PUBLIC_SOCIAL_LINKEDIN_URL",
    "NEXT_PUBLIC_SOCIAL_GITHUB_URL",
  ]) {
    const value = String(env[key] ?? "").trim();
    if (/^https:\/\/\S+$/i.test(value)) profiles.push(value);
  }
  return [...new Set(profiles)];
}

export function organizationNode(siteUrl: string, social: string[]): Record<string, unknown> {
  const site = siteUrl.replace(/\/+$/, "");
  return {
    "@type": "Organization",
    "@id": `${site}/#organization`,
    name: "ZAYRON-X",
    url: site,
    description:
      "Source-verified vulnerability, malware and threat-actor intelligence with explicit provenance, confidence and decay.",
    sameAs: social,
  };
}

export function websiteNode(siteUrl: string): Record<string, unknown> {
  const site = siteUrl.replace(/\/+$/, "");
  return {
    "@type": "WebSite",
    "@id": `${site}/#website`,
    url: site,
    name: "ZAYRON-X",
    publisher: { "@id": `${site}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${site}/search?q={search_term_string}`,
      "input": "required name=search_term_string",
    },
  };
}

/** The site-wide graph every page inherits from the root layout. */
export function buildSiteJsonLdGraph(input: { siteUrl?: string; social?: string[] } = {}): Record<string, unknown> {
  const site = (input.siteUrl || CANONICAL_SITE_URL).replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(site, input.social ?? socialProfiles()), websiteNode(site)],
  };
}

export interface JsonLdGraphInput {
  siteUrl?: string;
  path: string;
  /** The page's primary entity (`NewsArticle`, `TechArticle`, `CollectionPage`, …). */
  primary: Record<string, unknown> & { "@type": string };
  faq?: Array<{ question: string; answer: string }>;
  social?: string[];
}

/**
 * ONE cohesive `@graph` per page: Organization, WebSite with SearchAction, the
 * primary entity linked to both, and an optional FAQPage. Emitting separate
 * unlinked blocks is what makes answer engines treat the facts as unrelated.
 */
export function buildLinkedJsonLdGraph(input: JsonLdGraphInput): Record<string, unknown> {
  const site = (input.siteUrl || CANONICAL_SITE_URL).replace(/\/+$/, "");
  const orgId = `${site}/#organization`;
  const websiteId = `${site}/#website`;
  const primaryId = `${site}${input.path}#primary`;

  const graph: Array<Record<string, unknown>> = [
    organizationNode(site, input.social ?? socialProfiles()),
    websiteNode(site),
    {
      ...input.primary,
      "@id": primaryId,
      url: `${site}${input.path}`,
      publisher: { "@id": orgId },
      isPartOf: { "@id": websiteId },
    },
  ];

  if (input.faq && input.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${site}${input.path}#faq`,
      mainEntity: input.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export interface RobotsDirective {
  index: boolean;
  follow: boolean;
  nocache?: boolean;
}

export const PREVIEW_ROBOTS: RobotsDirective = { index: false, follow: false, nocache: true };

/**
 * Pure precedence rule. `preview` wins unconditionally; only then does the
 * content verdict decide between `index, follow` and `noindex, follow`.
 */
export function resolvePageRobots(input: { preview: boolean; indexable: boolean }): RobotsDirective {
  if (input.preview) return { ...PREVIEW_ROBOTS };
  if (input.indexable) return { index: true, follow: true };
  return { index: false, follow: true };
}

/** Non-indexable placeholder surfaces stay closed in every environment. */
export function closedRobots(preview: boolean): RobotsDirective {
  return preview ? { ...PREVIEW_ROBOTS } : { index: false, follow: false };
}

/* ───────────────────────── entity-rich CVE titles ─────────────────────────── */

const DISPLAY_NAMES: Record<string, string> = {
  imagemagick: "ImageMagick",
  openssl: "OpenSSL",
  microsoft: "Microsoft",
  apache: "Apache",
  oracle: "Oracle",
  cisco: "Cisco",
  vmware: "VMware",
  citrix: "Citrix",
  ivanti: "Ivanti",
  fortinet: "Fortinet",
  atlassian: "Atlassian",
  wordpress: "WordPress",
  drupal: "Drupal",
  linux: "Linux",
  google: "Google",
  apple: "Apple",
  mozilla: "Mozilla",
  sap: "SAP",
  ibm: "IBM",
};

/** Provider placeholders that mean "no vendor recorded", never a subject. */
const VENDOR_PLACEHOLDERS = new Set(["n/a", "na", "none", "null", "unknown", "not applicable", "not_established", "-", "—"]);

function realSubject(raw: string | null | undefined): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || VENDOR_PLACEHOLDERS.has(value.toLowerCase())) return "";
  return value;
}

/** `imagemagick` → `ImageMagick`; unknown vendors get simple title casing. */
export function displayVendor(vendor: string | null | undefined): string | null {
  const raw = realSubject(vendor);
  if (!raw) return null;
  const known = DISPLAY_NAMES[raw.toLowerCase()];
  if (known) return known;
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function displayProduct(product: string | null | undefined): string | null {
  const raw = realSubject(product);
  if (!raw) return null;
  const known = DISPLAY_NAMES[raw.toLowerCase()];
  if (known) return known;
  if (/[A-Z]/.test(raw)) return raw;
  return raw
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface CveTitleInput {
  cveId: string;
  vendor?: string | null;
  product?: string | null;
  cvss?: number | null;
}

/**
 * The one vendor/product subject used by H1, `<title>`, OG/Twitter and list views.
 *
 * A provider frequently names the product after the vendor ("Red Hat" +
 * "Red Hat Enterprise Linux 10"). Concatenating both produces the visible defect
 * `Red Hat Red Hat Enterprise Linux 10`, so a product that already leads with the
 * vendor — or a vendor that already leads with the product — wins outright and
 * the other field is never repeated.
 */
export function advisorySubject(vendor: string | null | undefined, product: string | null | undefined): string | null {
  const v = displayVendor(vendor);
  const p = displayProduct(product);
  if (!v) return p;
  if (!p) return v;
  const vLower = v.toLowerCase();
  const pLower = p.toLowerCase();
  if (vLower === pLower) return p;
  // Compare on a word boundary so "Red Hat" matches "Red Hat Enterprise Linux 10"
  // but "Red" never swallows "Redshift".
  if (pLower === vLower || pLower.startsWith(`${vLower} `)) return p;
  if (vLower.startsWith(`${pLower} `)) return v;
  return `${v} ${p}`;
}

/**
 * Strict shared advisory title: `CVE-2026-129830 — Red Hat Enterprise Linux 10 Vulnerability`.
 * Never renders the vendor twice.
 */
export function formatAdvisoryTitle(cveId: string, vendor?: string | null, product?: string | null): string {
  const cve = (cveId || "").trim() || "CVE";
  const subject = advisorySubject(vendor, product);
  return subject ? `${cve} — ${subject} Vulnerability` : `${cve} — Vulnerability advisory`;
}

/**
 * Visible H1: short enough to scan in one or two lines. The long,
 * entity-dense variant stays in `<title>` / metadata only.
 * `CVE-2026-116160 — ImageMagick Vulnerability`
 */
export function vulnerabilityDisplayHeading(input: CveTitleInput): string {
  return formatAdvisoryTitle(input.cveId, input.vendor, input.product);
}

/**
 * `CVE-2026-116156: ImageMagick Vulnerability (CVSS 3.3) — Affected & Fixed
 * Versions`. Degrades field by field; the CVE id is always first for entity
 * density, and the brand suffix is added by the root title template.
 */
export function vulnerabilitySeoTitle(input: CveTitleInput): string {
  const cve = (input.cveId || "").trim() || "CVE";
  const subject = advisorySubject(input.vendor, input.product) ?? "";
  const cvss = typeof input.cvss === "number" && Number.isFinite(input.cvss) ? input.cvss.toFixed(1) : null;
  const head = `${cve}: ${subject ? `${subject} ` : ""}Vulnerability${cvss ? ` (CVSS ${cvss})` : ""}`;
  const tail = subject || cvss ? " — Affected & Fixed Versions" : " — Technical Advisory";
  return `${head}${tail}`;
}
