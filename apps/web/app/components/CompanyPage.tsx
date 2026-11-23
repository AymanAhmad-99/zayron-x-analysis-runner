import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { SiteFooter } from "./SiteFooter";

export function CompanyPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="site-atmosphere">
      <div className="page-content">
        <Navbar />
        <article className="legal-shell shell" aria-labelledby="company-title">
          <header className="legal-header">
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="company-title">{title}</h1>
            <p className="legal-purpose">{intro}</p>
          </header>
          <div className="legal-body">{children}</div>
        </article>
        <SiteFooter />
      </div>
    </main>
  );
}
