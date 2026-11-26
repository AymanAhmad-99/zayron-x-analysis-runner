import { newsHref, formatNewsDate } from "../lib/news";

/**
 * PHASE 9B — the reverse neural feed card.
 *
 * Rendered on actor, malware-family, technique and CVE dossiers: the newest
 * ZAYRON-X briefings that mention the entity being read. Nothing renders when the
 * feed is empty, so an entity with no news never grows an empty module.
 */

export interface RelatedBriefingItem {
  slug: string;
  title: string;
  category?: string;
  severity?: string;
  published_at?: string;
}

export function RelatedBriefings({ items }: { items?: RelatedBriefingItem[] | null }) {
  const list = (Array.isArray(items) ? items : []).filter((item) => item && typeof item.slug === "string");
  if (list.length === 0) return null;
  return (
    <section className="ioc-table-section" aria-label="Related intelligence briefings">
      <div className="ioc-table-head">
        <h2 className="ioc-section-title">Related intelligence briefings</h2>
        <span className="ioc-note">Newest briefings citing this entity</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {list.slice(0, 5).map((item) => (
          <a key={item.slug} className="ioc-cta" href={newsHref(item.slug)}>
            {item.title}
            {item.published_at ? (
              <span className="ioc-note" style={{ display: "block" }}>
                {item.category ?? "BRIEFING"} · {formatNewsDate(item.published_at)}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
