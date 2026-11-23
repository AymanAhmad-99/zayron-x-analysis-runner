import type { LegalBlock, LegalDocument as LegalDoc, LegalStatus } from "../lib/legal/types";
import { legalDocumentBySlug } from "../lib/legal/documents";
import { Navbar } from "./Navbar";
import { SiteFooter } from "./SiteFooter";

const STATUS_LABEL: Record<LegalStatus, string> = {
  DRAFT: "Draft",
  PENDING_COUNSEL_REVIEW: "Pending counsel review",
  APPROVED_FOR_PUBLICATION: "Approved for publication",
  CURRENT: "Current",
  SUPERSEDED: "Superseded",
  PLANNED: "Planned",
};

function Block({ block }: { block: LegalBlock }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="legal-table-wrap" tabIndex={0} role="region">
          <table className="legal-table">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th scope="col" key={cell}>
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "note":
      return <p className="legal-note">{block.text}</p>;
    default:
      return null;
  }
}

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  const related = doc.related
    .map((slug) => legalDocumentBySlug[slug])
    .filter((d): d is LegalDoc => Boolean(d));

  return (
    <main className="site-atmosphere">
      <div className="page-content">
        <Navbar />
        <article className="legal-shell shell" aria-labelledby="legal-title">
          <header className="legal-header">
            <p className="eyebrow">LEGAL / {doc.title.toUpperCase()}</p>
            <h1 id="legal-title">{doc.title}</h1>
            <p className="legal-purpose">{doc.purpose}</p>
            <dl className="legal-meta">
              <div>
                <dt>Version</dt>
                <dd>{doc.version}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`legal-status legal-status-${doc.status.toLowerCase()}`}>{STATUS_LABEL[doc.status]}</span>
                </dd>
              </div>
              <div>
                <dt>Effective date</dt>
                <dd>{doc.effectiveDate}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{doc.lastUpdated}</dd>
              </div>
              <div>
                <dt>Applies to</dt>
                <dd>{doc.appliesTo}</dd>
              </div>
            </dl>
            <p className="legal-review-note" role="note">
              This document is a draft pending legal counsel review. It is not legal advice and is not
              approved for production publication until reviewed and its status is updated.
            </p>
          </header>

          {doc.sections.length > 3 && (
            <nav className="legal-toc" aria-label="Table of contents">
              <h2>On this page</h2>
              <ol>
                {doc.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="legal-body">
            {doc.sections.map((section) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
                <h2 id={`${section.id}-heading`}>{section.heading}</h2>
                {section.blocks.map((block, i) => (
                  <Block block={block} key={i} />
                ))}
              </section>
            ))}
          </div>

          {related.length > 0 && (
            <aside className="legal-related" aria-label="Related policies">
              <h2>Related policies</h2>
              <ul>
                {related.map((d) => (
                  <li key={d.slug}>
                    <a href={`/legal/${d.slug}`}>{d.title}</a>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <p className="legal-contact-line">
            Support and privacy requests: <a href="mailto:support@zayron-x.co">support@zayron-x.co</a> · Enterprise and
            procurement: <a href="mailto:enterprise@zayron-x.co">enterprise@zayron-x.co</a>
          </p>
        </article>
        <SiteFooter />
      </div>
    </main>
  );
}
