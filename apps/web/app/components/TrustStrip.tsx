import type { ReactNode } from "react";

/**
 * Upstream telemetry strip.
 *
 * Only sources genuinely wired into the platform are named, and they are named as
 * data dependencies — never as partners, customers or endorsements. Each mark is a
 * monochrome vector emblem at a uniform height; no fabricated client logo appears
 * here, and no inactive feed is presented as live.
 */
const sources: Array<{ name: string; mark: ReactNode }> = [
  {
    name: "NVD / NIST",
    mark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2.8l8 4.2v10L12 21.2 4 17V7l8-4.2z" strokeLinejoin="round" />
        <path d="M12 7.4v9.2M8 9.6l8 4.8M16 9.6l-8 4.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "CVE.org",
    mark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3.2" y="4.6" width="17.6" height="14.8" rx="1.4" />
        <path d="M3.2 9.2h17.6M7.4 13.4h4.2M7.4 16h6.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "CISA KEV & ADP",
    mark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 2.8l7.4 3.2v5.4c0 4.5-3 8.3-7.4 9.8-4.4-1.5-7.4-5.3-7.4-9.8V6l7.4-3.2z" strokeLinejoin="round" />
        <path d="M8.6 12.1l2.4 2.4 4.4-4.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "FIRST EPSS",
    mark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3.4 17.6l5.2-6.2 3.6 3.4 5-6.4 3.4 2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.4 20.4h17.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "OSV.dev",
    mark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" />
        <path d="M12 7.6v4.6l3 1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "abuse.ch / MalwareBazaar",
    mark: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <ellipse cx="12" cy="13.2" rx="5.4" ry="6.6" />
        <path d="M12 6.6V3.4M8.6 8.2L6.2 5.8M15.4 8.2l2.4-2.4M6.8 12.4H3.6M20.4 12.4h-3.2M8.2 17l-2.2 2.2M15.8 17l2.2 2.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <section className="sources-strip shell" aria-labelledby="sources-strip-heading">
      <div className="sources-strip-head">
        <h2 className="sources-strip-title" id="sources-strip-heading">
          Upstream Telemetry &amp; Authoritative Sources
        </h2>
        <p className="sources-strip-note">
          Primary public feeds ingested and cross-verified by the ZAYRON-X pipeline.
        </p>
      </div>
      <ul className="sources-strip-list">
        {sources.map(({ name, mark }) => (
          <li className="sources-strip-item" key={name}>
            {mark}
            <span className="sources-strip-name">{name}</span>
          </li>
        ))}
      </ul>
      <p className="sources-strip-foot">
        ZAYRON-X ingests and cross-verifies primary public authoritative feeds. All trademarks and names belong to their
        respective owners and do not imply endorsement.
      </p>
    </section>
  );
}
