import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="site-atmosphere">
      <div className="page-content" style={{ maxWidth: 720, margin: "0 auto", padding: "96px 24px" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>HTTP 404 / NOT FOUND</div>
        <h1 style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", marginBottom: 16 }}>
          Intelligence Record Not Found
        </h1>
        <p style={{ color: "var(--color-muted, #9aa4b2)", lineHeight: 1.65, marginBottom: 28 }}>
          The requested resource does not exist on ZAYRON-X or has been permanently retired.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a className="ioc-cta" href="/">
            Return Home
          </a>
          <a className="ioc-cta" href="/intelligence">
            Intelligence Hub
          </a>
          <a className="ioc-cta" href="/news">
            Neural Newsroom
          </a>
        </div>
      </div>
    </main>
  );
}

