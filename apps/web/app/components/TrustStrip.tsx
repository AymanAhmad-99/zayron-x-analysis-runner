const sources: Array<{ name: string; icon: React.ReactNode }> = [
  {
    name: "MITRE ATT&CK",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="3" y="4" width="18" height="14" rx="1.5" />
        <path d="M3 9h18M9 9v9" />
      </svg>
    ),
  },
  {
    name: "CISA",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: "NIST",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9L12 3z" />
        <path d="M12 8v8M8.5 10l7 4M15.5 10l-7 4" />
      </svg>
    ),
  },
  {
    name: "MISP",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="5" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" />
        <path d="M7 11l10-4M7 13l10 4" />
      </svg>
    ),
  },
  {
    name: "FIRST",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2.5 2.2 4 5 4 8s-1.5 5.8-4 8c-2.5-2.2-4-5-4-8s1.5-5.8 4-8z" />
      </svg>
    ),
  },
  {
    name: "MalwareBazaar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <ellipse cx="12" cy="13" rx="5.5" ry="7" />
        <path d="M12 6V3M8.5 7.5L6 5M15.5 7.5L18 5M7 12H4M20 12h-3M8 16.5L5.5 19M16 16.5l2.5 2.5" />
      </svg>
    ),
  },
  {
    name: "ThreatFox",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="6" cy="6" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="9" cy="18" r="2" />
        <path d="M8 7l8 1M7.5 8l1 8M16.5 9.5l-6 7" />
      </svg>
    ),
  },
  {
    name: "Exploit-DB",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M14 3l-5 9h4l-3 9 9-12h-5l3-6h-3z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    name: "Cloudflare",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M7 16a4 4 0 01-.6-7.95A5.5 5.5 0 0117 9.5 3.5 3.5 0 0116.5 16H7z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function TrustStrip() {
  return (
    <section className="trust-strip shell" aria-labelledby="trust-strip-heading">
      <p className="trust-strip-eyebrow" id="trust-strip-heading">DATA SOURCES &amp; SECURITY ECOSYSTEM</p>
      <p className="trust-strip-note">Sources and standards referenced by our intelligence pipeline. Inclusion does not imply endorsement, sponsorship, partnership, or affiliation.</p>
      <ul className="trust-strip-logos">
        {sources.map(({ name, icon }) => (
          <li className="trust-logo" key={name}>
            <span className="trust-logo-icon">{icon}</span>
            <span className="trust-logo-name">{name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
