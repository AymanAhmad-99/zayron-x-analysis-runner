import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { SiteFooter } from "./SiteFooter";

const REVISION = "Rev. 2.0";
const EFFECTIVE = "November 2026";
const JURISDICTION = "United States (Montana) · Global Coverage";

export interface DocSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Shared shell for every institutional surface (company, governance, legal).
 *
 * One header grammar, one typographic scale, one sticky table of contents. The
 * pages supply only their sections, so a governance document and a legal
 * document cannot drift into different layouts or different metadata.
 */
export function InstitutionalDocLayout({
  category,
  title,
  summary,
  sections,
  contact = "contact@zayron-x.co",
}: {
  /** Document category badge, e.g. `GOVERNANCE`, `LEGAL`, `COMPANY`. */
  category: string;
  title: string;
  summary: string;
  sections: DocSection[];
  contact?: string;
}) {
  return (
    <main className="site-atmosphere">
      <div className="page-content">
        <Navbar />
        <article className="doc-shell shell" aria-labelledby="doc-title">
          <header className="doc-header">
            <p className="doc-badge">{category}</p>
            <h1 id="doc-title">{title}</h1>
            <p className="doc-summary">{summary}</p>
            <dl className="doc-meta">
              <div>
                <dt>Document</dt>
                <dd>{REVISION}</dd>
              </div>
              <div>
                <dt>Effective</dt>
                <dd>{EFFECTIVE}</dd>
              </div>
              <div>
                <dt>Jurisdiction</dt>
                <dd>{JURISDICTION}</dd>
              </div>
            </dl>
          </header>

          <div className="doc-grid">
            <aside className="doc-toc" aria-label="Table of contents">
              <p>Contents</p>
              <ol>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.title}</a>
                  </li>
                ))}
              </ol>
            </aside>
            <div className="doc-body">
              {sections.map((section) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
                  <h2 id={`${section.id}-heading`}>{section.title}</h2>
                  {section.body}
                </section>
              ))}
            </div>
          </div>

          <p className="doc-contact">
            Institutional contact: <a href={`mailto:${contact}`}>{contact}</a> · Security and disclosure:{" "}
            <a href="mailto:security@zayron-x.co">security@zayron-x.co</a> · Legal:{" "}
            <a href="mailto:legal@zayron-x.co">legal@zayron-x.co</a>
          </p>
        </article>
        <SiteFooter />
      </div>
    </main>
  );
}

/** Shared table primitive for institutional documents. */
export function DocTable({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: ReactNode[][];
  caption?: string;
}) {
  return (
    <div className="doc-table-wrap" tabIndex={0} role="region" aria-label={caption ?? "Document table"}>
      <table className="doc-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {head.map((cell) => (
              <th scope="col" key={cell}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
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
}
