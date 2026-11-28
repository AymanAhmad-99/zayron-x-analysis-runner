/**
 * Wave 4B — schema.org JSON-LD builders.
 *
 * Zero-fabrication contract: a builder only emits a property when the caller
 * supplied a real, non-empty value. No `datePublished` is invented, no score is
 * estimated, no description is written when the API returned none. `undefined`
 * / `null` / `""` fields are dropped instead of being emitted as placeholders.
 *
 * `serializeJsonLd` escapes `<` so a payload containing `</script>` cannot
 * break out of the inline `<script type="application/ld+json">` element.
 */

type JsonLd = Record<string, unknown>;

function present(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Drops absent/empty properties so no fabricated placeholder reaches the page. */
export function compactJsonLd(data: JsonLd): JsonLd {
  const out: JsonLd = {};
  for (const [key, value] of Object.entries(data)) {
    if (present(value)) out[key] = value;
  }
  return out;
}

/** `</script>`-safe serialization for inline JSON-LD. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Brand disambiguation.
 *
 * "Zayron X" is also an unrelated music artist, so a bare `Organization` node
 * loses the entity to the recording artist. The node therefore carries the
 * platform's own logo URL, the exact product description (what the entity IS,
 * in the words the site itself uses) and the one verified `sameAs` profile, so
 * Google builds a knowledge node for the CTI platform rather than merging the
 * two entities.
 */
export const BRAND_DESCRIPTION =
  "Independent cyber threat intelligence research practice publishing source-verified CVE advisories (NVD, CVE.org, CISA ADP, CISA KEV, FIRST EPSS, OSV.dev) and static malware dossiers. Truth Is the Perimeter.";

export const BRAND_ALTERNATE_NAMES = ["Zayron-X", "zayron-x.co", "ZAYRON-X Cyber Threat Intelligence"];

/** Verified public channels only. No placeholder profile is ever emitted. */
export const BRAND_SAME_AS = ["https://t.me/zayronxai", "https://www.linkedin.com/company/zayron-x", "https://x.com/zayron_x"];

/** Absolute brand mark (every icon path is served from the apex origin). */
export function brandLogoUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/icon-512x512.png`;
}

export function organizationJsonLd(siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZAYRON-X",
    alternateName: [...BRAND_ALTERNATE_NAMES],
    url: siteUrl,
    logo: brandLogoUrl(siteUrl),
    description: BRAND_DESCRIPTION,
    sameAs: [...BRAND_SAME_AS],
    address: {
      "@type": "PostalAddress",
      addressRegion: "Montana",
      addressCountry: "US",
    },
    areaServed: "Global",
  };
}

/** WebSite node with a SearchAction pointing at the real search route. */
export function webSiteJsonLd(siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ZAYRON-X",
    alternateName: [...BRAND_ALTERNATE_NAMES],
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface ArticleJsonLdInput {
  url: string;
  /** Real identifier only (CVE id / report id). Never synthesized. */
  identifier?: string | null;
  headline?: string | null;
  description?: string | null;
  /** Must be a real API timestamp; omitted when absent. */
  datePublished?: string | null;
  dateModified?: string | null;
  siteUrl: string;
  type?: "TechArticle" | "Report";
  /** Extra optional facts (e.g. severity) — emitted verbatim, never derived. */
  additionalProperty?: Array<{ name: string; value: string }>;
  breadcrumbs?: Array<{ name: string; path: string }>;
}

/**
 * TechArticle/Report node for a detail page. Every optional property is
 * conditional: a withheld/absent field simply does not appear in the graph.
 */
export function articleJsonLd(input: ArticleJsonLdInput): JsonLd {
  const site = input.siteUrl.replace(/\/+$/, "");
  const node: JsonLd = compactJsonLd({
    "@type": input.type ?? "TechArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    url: input.url,
    identifier: input.identifier ?? undefined,
    headline: input.headline ?? undefined,
    description: input.description ?? undefined,
    datePublished: input.datePublished ?? undefined,
    dateModified: input.dateModified ?? undefined,
    isPartOf: { "@id": `${site}/#website` },
    publisher: { "@id": `${site}/#organization` },
  });
  if (input.additionalProperty && input.additionalProperty.length) {
    node.additionalProperty = input.additionalProperty.map((property) => ({
      "@type": "PropertyValue",
      name: property.name,
      value: property.value,
    }));
  }
  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    const breadcrumbId = `${input.url}#breadcrumb`;
    node.breadcrumb = { "@id": breadcrumbId };
    return {
      "@context": "https://schema.org",
      "@graph": [
        node,
        {
          "@type": "BreadcrumbList",
          "@id": breadcrumbId,
          itemListElement: input.breadcrumbs.map((item, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: item.name,
            item: `${site}${item.path}`,
          })),
        },
      ],
    };
  }
  return {
    "@context": "https://schema.org",
    ...node,
  };
}
