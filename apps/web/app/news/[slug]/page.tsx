import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RouteShell } from "../../components/RouteShell";
import { CodeTabs } from "../../components/CodeTabs";
import { CopyBriefButton } from "../../components/CopyBriefButton";
import { getNewsArticle, formatNewsDate, newsHref, severityAccent } from "../../lib/news";
import { getSiteUrl, isPreviewDeployment } from "../../lib/siteConfig";
import { buildLinkedJsonLdGraph, buildOpenGraph, resolvePageRobots } from "../../lib/seo";

/**
 * PHASE 9B — `/news/:slug`.
 *
 * A GEO-first briefing: the Direct Intelligence Verdict is the first block, the
 * entity pills only link to catalog-verified routes, and the FAQ is rendered
 * 1:1 with the `FAQPage` JSON-LD node. The loader keeps the F4 contract — only a
 * real upstream 404 becomes `notFound()`.
 */

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

const ENTITY_LABEL: Record<string, string> = {
  cve: "CVE",
  actor: "Actor",
  campaign: "Campaign",
  malware_family: "Malware",
  technique: "Technique",
  vendor: "Vendor",
  malware_advisory: "Advisory",
};

function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getNewsArticle(decodeURIComponent(slug));
  if (result.state !== "ok" || !result.data) {
    return {
      title: "Briefing not found | ZAYRON-X",
      robots: { index: false, follow: false },
      alternates: { canonical: `/news/${encodeURIComponent(slug)}` },
    };
  }
  const article = result.data;
  const canonical = `/news/${article.slug}`;
  const image = `/api/og/news/${encodeURIComponent(article.slug)}`;
  const openGraph = buildOpenGraph({
    title: article.title,
    description: article.verdict,
    path: canonical,
    image,
    type: "article",
  });
  return {
    title: `${article.title} | ZAYRON-X Newsroom`,
    description: article.verdict,
    alternates: { canonical },
    robots: resolvePageRobots({ preview: isPreviewDeployment(), indexable: true }),
    openGraph: { ...openGraph, publishedTime: article.published_at, section: article.category },
    twitter: { card: "summary_large_image", title: article.title, description: article.verdict, images: [image] },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const result = await getNewsArticle(decodeURIComponent(slug));
  if (result.state === "not_found") notFound();
  if (result.state === "error" || !result.data) throw new Error("Briefing temporarily unavailable");
  const article = result.data;
  const site = getSiteUrl();
  const path = `/news/${article.slug}`;
  const enrichment = article.graph_enrichment ?? {};

  const jsonLd = buildLinkedJsonLdGraph({
    siteUrl: site,
    path,
    primary: {
      "@type": "NewsArticle",
      headline: article.title,
      description: article.verdict,
      datePublished: article.published_at,
      dateModified: article.ingested_at,
      articleSection: article.category,
      isAccessibleForFree: true,
      keywords: [article.category, article.severity, article.source_name].join(", "),
      about: article.mentions
        .filter((mention) => mention.in_catalog === 1)
        .slice(0, 10)
        .map((mention) => ({ "@type": "Thing", name: mention.entity_label })),
    },
    faq: article.faq,
  });

  const copyText = [
    article.title,
    "",
    article.verdict,
    "",
    ...article.body_sections.flatMap((section) => [
      section.heading.toUpperCase(),
      ...section.paragraphs,
      "",
    ]),
    `Source: ${article.source_name} — ${article.source_url}`,
    `${site}${path}`,
  ].join("\n");

  return (
    <RouteShell
      title={article.title}
      eyebrow={`INTELLIGENCE / NEWSROOM / ${article.category}`}
      activeHref="/news"
      identifier={article.severity}
      description={article.summary}
      contextNotice="This briefing states what the named publisher reported, then attaches only catalog-verified telemetry. Absence of a KEV listing is not evidence of safety."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <section
        className="ioc-table-section"
        aria-label="Direct intelligence verdict"
        style={{ borderLeft: `3px solid ${severityAccent(article.severity)}`, paddingLeft: 16 }}
      >
        <span className="ioc-note">DIRECT INTELLIGENCE VERDICT</span>
        <p style={{ fontSize: 18, lineHeight: 1.6 }}>{article.verdict}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span className="ioc-note">
            {article.source_name} · {formatNewsDate(article.published_at)}
          </span>
          <CopyBriefButton text={copyText} />
        </div>
      </section>

      {article.mentions.length > 0 ? (
        <section className="ioc-table-section" aria-label="Linked entities">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Linked entities</h2>
            <span className="ioc-note">Only catalog-verified entities are linked</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {article.mentions.map((mention) =>
              mention.href ? (
                <a key={`${mention.entity_type}:${mention.entity_slug}`} className="ioc-cta" href={mention.href}>
                  {ENTITY_LABEL[mention.entity_type] ?? mention.entity_type}: {mention.entity_label}
                </a>
              ) : (
                <span key={`${mention.entity_type}:${mention.entity_slug}`} className="ioc-note">
                  {ENTITY_LABEL[mention.entity_type] ?? mention.entity_type}: {mention.entity_label} (uncatalogued)
                </span>
              ),
            )}
          </div>
        </section>
      ) : null}

      {(enrichment.cves?.length ?? 0) > 0 ? (
        <section className="ioc-table-section" aria-label="Live graph telemetry">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">ZAYRON-X live graph telemetry</h2>
          </div>
          <div className="ioc-telemetry">
            {enrichment.cves?.map((cve) => (
              <div className="ioc-telemetry-card" key={cve.cve_id}>
                <span>{cve.cve_id}</span>
                <strong>
                  {cve.cisa_kev ? "KEV" : cve.cvss_score !== null ? `CVSS ${Number(cve.cvss_score).toFixed(1)}` : "TRACKED"}
                </strong>
                <small>
                  EPSS {cve.epss_score !== null ? `${(Number(cve.epss_score) * 100).toFixed(1)}%` : "N/A"} · PoC {cve.poc_count ?? 0}
                  {cve.kev_due_date ? ` · due ${cve.kev_due_date}` : ""}
                </small>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {article.body_sections.map((section) => (
        <section className="ioc-table-section" key={section.heading} aria-label={section.heading}>
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">{section.heading}</h2>
          </div>
          {section.paragraphs.map((paragraph, index) => (
            <p key={`${section.heading}-${index}`}>{paragraph}</p>
          ))}
        </section>
      ))}

      {enrichment.hunting ? (
        <section className="ioc-table-section" aria-label="Hunting starters">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Hunting starter</h2>
            <span className="ioc-note">Deterministic template — tune before alerting</span>
          </div>
          <CodeTabs
            title={`${article.title} hunting starters`}
            note="Generated from the entities this briefing names. No indicator is hyperlinked."
            tabs={[
              { label: "Microsoft Sentinel (KQL)", code: enrichment.hunting.kql },
              { label: "Splunk (SPL)", code: enrichment.hunting.spl },
            ]}
          />
        </section>
      ) : null}

      {article.faq.length > 0 ? (
        <section className="ioc-table-section" aria-label="Frequently asked questions">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Frequently asked questions</h2>
          </div>
          {article.faq.map((item) => (
            <details key={item.question} style={{ marginBottom: 12 }}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
      ) : null}

      {article.related_briefings.length > 0 ? (
        <section className="ioc-table-section" aria-label="Related intelligence briefings">
          <div className="ioc-table-head">
            <h2 className="ioc-section-title">Related intelligence briefings</h2>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {article.related_briefings.map((briefing) => (
              <a key={briefing.slug} className="ioc-cta" href={newsHref(briefing.slug)}>
                {briefing.title}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ioc-table-section" aria-label="Official source">
        <div className="ioc-table-head">
          <h2 className="ioc-section-title">Official source</h2>
        </div>
        <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow">
          {article.source_name} — original publication ↗
        </a>
      </section>
    </RouteShell>
  );
}
