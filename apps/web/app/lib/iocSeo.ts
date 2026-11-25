/**
 * PHASE 7C — the small amount of IOC SEO vocabulary the site shares between the
 * sitemap, the hub page and the tests.
 *
 * Kept in its own module so no import of the page component (or of `next`) is
 * needed to assert the URL shape in the unit gate.
 */

/** Canonical family hub path. The slug is already normalized by the API. */
export function familyHubPath(slug: string): string {
  const safe = String(slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
  return `/intelligence/malware/families/${safe}`;
}

/**
 * Tier 1 and Tier 2 are indexable; a transient per-value lookup is `noindex,
 * follow` so it can be shared without becoming an indexable scaled-content
 * surface.
 */
export function iocRobots(query: string | null | undefined): { index: boolean; follow: boolean } {
  return { index: !String(query || "").trim(), follow: true };
}
