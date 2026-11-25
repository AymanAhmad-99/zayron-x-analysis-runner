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

/** `imagemagick` → `ImageMagick`; unknown vendors get simple title casing. */
export function displayVendor(vendor: string | null | undefined): string | null {
  const raw = typeof vendor === "string" ? vendor.trim() : "";
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
  const raw = typeof product === "string" ? product.trim() : "";
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
