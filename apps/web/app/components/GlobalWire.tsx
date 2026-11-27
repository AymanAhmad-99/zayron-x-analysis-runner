import {
  WIRE_REGIONS,
  WIRE_TIERS,
  cveHref,
  wireHref,
  wireRegionLabel,
  wireRelativeTime,
  wireTierLabel,
  type WireFeed,
} from "../lib/wire";

/**
 * PHASE 10B-1 — the `Global Wire` surface inside `/news`.
 *
 * Server-rendered, URL-driven and deliberately austere: a mono region tag, one
 * English headline, the trust tier, defanged CVE chips into the neural dossiers
 * and a relative timestamp. Nothing here is presented as verified intelligence,
 * and every row names the public source it came from.
 */

interface Props {
  feed: WireFeed | null;
  error: boolean;
  region: string;
  tier: string;
}

function ConvergenceStrip({ feed }: { feed: WireFeed }) {
  if (feed.clusters.length === 0) return null;
  return (
    <section className="wire-convergence" aria-label="Cross-lingual convergence">
      <div className="wire-convergence-head">
        <span className="wire-eyebrow">Cross-lingual convergence</span>
        <span className="wire-convergence-note">72h window · independent sources only</span>
      </div>
      <ul className="wire-clusters">
        {feed.clusters.map((cluster) => {
          const regions = cluster.regions.length > 0 ? cluster.regions.join(" + ") : "GLOBAL";
          const linked = cluster.linked_cves[0] ? cveHref(cluster.linked_cves[0]) : null;
          return (
            <li key={cluster.id} className="wire-cluster">
              <span className="wire-cluster-regions">{regions}</span>
              <span aria-hidden="true" className="wire-cluster-dot">
                ·
              </span>
              <span>{cluster.source_count} sources</span>
              <span aria-hidden="true" className="wire-cluster-dot">
                ·
              </span>
              <span
                className={`wire-tier${cluster.trust_tier === "CORROBORATED_OSINT" ? " is-corroborated" : ""}`}
              >
                {wireTierLabel(cluster.trust_tier)}
              </span>
              <span className="wire-cluster-headline">
                {linked ? <a href={linked}>{cluster.headline}</a> : cluster.headline}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WireRow({ item }: { item: WireFeed["items"][number] }) {
  const corroborated = item.trust_tier === "CORROBORATED_OSINT";
  return (
    <article className="wire-row">
      <div className="wire-row-head">
        <span className="wire-region">[{wireRegionLabel(item.region)}]</span>
        <span className={`wire-tier${corroborated ? " is-corroborated" : ""}`}>{wireTierLabel(item.trust_tier)}</span>
        <span className="wire-row-time">{wireRelativeTime(item.published_at || item.ingested_at)}</span>
      </div>
      <h3 className="wire-row-title">
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      <p className="wire-row-summary">{item.summary}</p>
      {(item.cves.length > 0 || item.iocs.length > 0) && (
        <div className="wire-tags">
          {item.cves.slice(0, 4).map((cve) => {
            const href = cveHref(cve);
            return href ? (
              <a key={cve} className="wire-chip" href={href}>
                {cve}
              </a>
            ) : (
              <span key={cve} className="wire-chip is-static">
                {cve}
              </span>
            );
          })}
          {item.iocs.slice(0, 3).map((ioc) => (
            <span key={ioc} className="wire-ioc">
              {ioc}
            </span>
          ))}
        </div>
      )}
      <div className="wire-row-foot">
        <span>{item.source_title || item.source_handle}</span>
        <span aria-hidden="true">·</span>
        <span>{item.language.toUpperCase()}</span>
        <span aria-hidden="true">·</span>
        <span>score {item.signal_score}</span>
      </div>
    </article>
  );
}

export function GlobalWire({ feed, error, region, tier }: Props) {
  const activeRegion = region ? region.toUpperCase() : "";
  const activeTier = tier ? tier.toUpperCase() : "";

  return (
    <section className="wire" aria-label="Global wire — multilingual OSINT">
      <div className="wire-banner">
        <span className="wire-eyebrow">Provenance firewall</span>
        <p>
          Global Wire carries <strong>public multilingual OSINT signals</strong> — Telegram channels, GitHub security
          radars and open regional feeds — held in a store that is physically separate from{" "}
          <strong>AUTHORITATIVE_VERIFIED</strong> briefings. A signal is a claim by its publisher, not a ZAYRON-X
          verdict. Only clusters corroborated by three or more independent sources are eligible for promotion into the
          editorial newsroom, and raw single-source posts are never submitted to search engines.
        </p>
        {feed?.translation === "DETERMINISTIC" ? (
          <p className="wire-banner-note">
            Translation layer: deterministic extraction. No translation credential is bound, so non-English signals are
            shown as identifier-first English summaries with the original excerpt retained.
          </p>
        ) : null}
      </div>

      <div className="wire-filters">
        <div className="wire-filter-row" role="group" aria-label="Filter wire by region">
          {WIRE_REGIONS.map((entry) => {
            const active = entry.value === activeRegion || (entry.value === "" && activeRegion === "");
            return (
              <a
                key={entry.label}
                className={`wire-filter${active ? " active" : ""}`}
                href={wireHref({ region: entry.value, tier: activeTier })}
                aria-current={active ? "true" : undefined}
              >
                {entry.label}
              </a>
            );
          })}
        </div>
        <div className="wire-filter-row" role="group" aria-label="Filter wire by trust tier">
          {WIRE_TIERS.map((entry) => {
            const active = entry.value === activeTier || (entry.value === "" && activeTier === "");
            return (
              <a
                key={entry.label}
                className={`wire-filter${active ? " active" : ""}`}
                href={wireHref({ region: activeRegion, tier: entry.value })}
                aria-current={active ? "true" : undefined}
              >
                {entry.label}
              </a>
            );
          })}
        </div>
      </div>

      {feed && feed.region_counts.length > 0 ? (
        <p className="wire-counts">
          {feed.region_counts.map((entry) => `${wireRegionLabel(entry.region)} ${entry.count}`).join("  ·  ")}
        </p>
      ) : null}

      {error ? (
        <div className="workspace-state">
          <strong>WIRE TEMPORARILY UNAVAILABLE</strong>
          <span>The OSINT feed could not be read. This is a transient failure, not an empty wire.</span>
        </div>
      ) : !feed || feed.items.length === 0 ? (
        <div className="workspace-state">
          <strong>NO WIRE SIGNALS MATCH</strong>
          <span>
            No public signal has been ingested for this filter yet. The wire fills on the next scheduled OSINT cycle.
          </span>
        </div>
      ) : (
        <>
          <ConvergenceStrip feed={feed} />
          <div className="wire-feed">
            <div className="wire-feed-head">
              <span className="wire-eyebrow">Signal stream</span>
              <span className="wire-feed-meta">
                {feed.items.length} of {feed.total} signals · newest first
              </span>
            </div>
            {feed.items.map((item) => (
              <WireRow key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
