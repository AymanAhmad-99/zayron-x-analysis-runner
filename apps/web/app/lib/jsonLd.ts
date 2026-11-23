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

export function organizationJsonLd(siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZAYRON-X",
    url: siteUrl,
    description: "Evidence-driven cyber threat intelligence.",
  };
}

/** WebSite node with a SearchAction pointing at the real search route. */
export function webSiteJsonLd(siteUrl: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ZAYRON-X",
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
}

/**
 * TechArticle/Report node for a detail page. Every optional property is
 * conditional: a withheld/absent field simply does not appear in the graph.
 */
export function articleJsonLd(input: ArticleJsonLdInput): JsonLd {
  const node: JsonLd = compactJsonLd({
    "@context": "https://schema.org",
    "@type": input.type ?? "TechArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    url: input.url,
    identifier: input.identifier ?? undefined,
    headline: input.headline ?? undefined,
    description: input.description ?? undefined,
    datePublished: input.datePublished ?? undefined,
    dateModified: input.dateModified ?? undefined,
    isPartOf: { "@type": "WebSite", name: "ZAYRON-X", url: input.siteUrl },
    publisher: { "@type": "Organization", name: "ZAYRON-X", url: input.siteUrl },
  });
  if (input.additionalProperty && input.additionalProperty.length) {
    node.additionalProperty = input.additionalProperty.map((property) => ({
      "@type": "PropertyValue",
      name: property.name,
      value: property.value,
    }));
  }
  return node;
}
