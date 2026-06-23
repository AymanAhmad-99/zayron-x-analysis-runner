'use client';

import { Download, FileText } from '@/lib/icons';
import type { Article } from '@/lib/types';

interface SitrepExporterProps {
  articles: Article[];
}

function formatArticleDate(article: Article) {
  const date = article.publishedAt || article.createdAt;
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function SitrepExporter({ articles }: SitrepExporterProps) {
  const handleExport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const doc = printWindow.document;
    doc.title = 'ZAYRON-X Intelligence Briefing Export';

    const style = doc.createElement('style');
    style.textContent = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #050505;
        padding: 45px;
        margin: 0;
        line-height: 1.5;
      }
      .header {
        border-bottom: 2px solid #C96A2B;
        padding-bottom: 20px;
        margin-bottom: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .logo {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.05em;
        color: #050505;
      }
      .logo span {
        color: #C96A2B;
      }
      .eyebrow {
        font-family: monospace;
        font-size: 11px;
        color: #C96A2B;
        background: rgba(201, 106, 43, 0.08);
        border: 1px solid rgba(201, 106, 43, 0.2);
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: bold;
        letter-spacing: 0.05em;
      }
      .title {
        font-size: 28px;
        font-weight: 800;
        margin: 0 0 10px 0;
        letter-spacing: -0.02em;
      }
      .subtitle {
        color: #404040;
        font-size: 14px;
        margin-top: 0;
        margin-bottom: 35px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-bottom: 40px;
      }
      .meta-card {
        background: #FAFAFA;
        border: 1px solid rgba(5, 5, 5, 0.08);
        padding: 18px;
        border-radius: 8px;
      }
      .meta-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #C96A2B;
        font-weight: 700;
      }
      .meta-value {
        font-size: 20px;
        font-weight: 800;
        margin-top: 6px;
      }
      .section-title {
        font-size: 16px;
        font-weight: 700;
        border-bottom: 1px solid rgba(5, 5, 5, 0.08);
        padding-bottom: 8px;
        margin-top: 35px;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }
      th {
        text-align: left;
        background: #FAFAFA;
        padding: 10px;
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        color: #050505;
      }
      td {
        padding: 12px 10px;
        border-bottom: 1px solid rgba(5, 5, 5, 0.04);
        font-size: 13px;
        vertical-align: top;
      }
      .badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
        font-family: monospace;
      }
      .badge-critical {
        background: #050505;
        color: #FFFFFF;
        border: 1px solid #050505;
      }
      .badge-standard {
        background: rgba(201, 106, 43, 0.1);
        color: #C96A2B;
        border: 1px solid rgba(201, 106, 43, 0.2);
      }
      .footer {
        margin-top: 65px;
        border-top: 1px solid rgba(5, 5, 5, 0.08);
        padding-top: 20px;
        font-size: 10px;
        color: #A3A3A3;
        text-align: center;
        font-family: monospace;
        letter-spacing: 0.05em;
      }
    `;
    doc.head.appendChild(style);

    const body = doc.body;

    const header = doc.createElement('div');
    header.className = 'header';
    const logo = doc.createElement('div');
    logo.className = 'logo';
    logo.textContent = 'ZAYRON';
    const logoSpan = doc.createElement('span');
    logoSpan.textContent = '-X';
    logo.appendChild(logoSpan);
    header.appendChild(logo);

    const eyebrow = doc.createElement('div');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'INTELLIGENCE BRIEFING EXPORT';
    header.appendChild(eyebrow);
    body.appendChild(header);

    const h1 = doc.createElement('h1');
    h1.className = 'title';
    h1.textContent = 'Executive Briefing Export';
    body.appendChild(h1);

    const subtitle = doc.createElement('p');
    subtitle.className = 'subtitle';
    subtitle.textContent = 'Preview generated from latest published intelligence briefings.';
    body.appendChild(subtitle);

    const metaGrid = doc.createElement('div');
    metaGrid.className = 'meta-grid';

    const createMetaCard = (label: string, value: string) => {
      const card = doc.createElement('div');
      card.className = 'meta-card';
      const l = doc.createElement('div');
      l.className = 'meta-label';
      l.textContent = label;
      const v = doc.createElement('div');
      v.className = 'meta-value';
      v.textContent = value;
      card.appendChild(l);
      card.appendChild(v);
      return card;
    };

    metaGrid.appendChild(createMetaCard('Briefings Included', articles.length.toLocaleString()));
    metaGrid.appendChild(createMetaCard('Primary Category', articles[0]?.category || 'Intelligence'));
    metaGrid.appendChild(
      createMetaCard('Latest Published', formatArticleDate(articles[0]) || 'Not available'),
    );
    body.appendChild(metaGrid);

    const sectionTitle = doc.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.textContent = 'Published Briefings';
    body.appendChild(sectionTitle);

    if (articles.length === 0) {
      const emptyState = doc.createElement('p');
      emptyState.className = 'subtitle';
      emptyState.textContent = 'No briefings available for export yet.';
      body.appendChild(emptyState);
    } else {
      const table = doc.createElement('table');
      const thead = doc.createElement('thead');
      const trHead = doc.createElement('tr');
      ['Briefing', 'Risk', 'Published', 'Context'].forEach((text) => {
        const th = doc.createElement('th');
        th.textContent = text;
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = doc.createElement('tbody');
      articles.slice(0, 5).forEach((article) => {
        const tr = doc.createElement('tr');

        const td1 = doc.createElement('td');
        const strong = doc.createElement('strong');
        strong.textContent = article.title;
        td1.appendChild(strong);
        const category = doc.createElement('div');
        category.style.fontSize = '11px';
        category.style.color = '#C96A2B';
        category.style.marginTop = '4px';
        category.textContent = article.category || 'Intelligence';
        td1.appendChild(category);
        if (article.excerpt || article.subtitle) {
          const summary = doc.createElement('div');
          summary.style.fontSize = '11px';
          summary.style.color = '#525252';
          summary.style.marginTop = '6px';
          summary.textContent = article.excerpt || article.subtitle || '';
          td1.appendChild(summary);
        }
        tr.appendChild(td1);

        const td2 = doc.createElement('td');
        const risk = article.regulatoryRisk?.trim();
        if (risk) {
          const badge = doc.createElement('span');
          badge.className = `badge ${risk.toLowerCase().includes('critical') ? 'badge-critical' : 'badge-standard'}`;
          badge.textContent = risk;
          td2.appendChild(badge);
        } else {
          td2.textContent = 'Risk not classified';
        }
        tr.appendChild(td2);

        const td3 = doc.createElement('td');
        td3.textContent = formatArticleDate(article) || 'Not available';
        tr.appendChild(td3);

        const td4 = doc.createElement('td');
        const contextParts = [article.sourceChannel?.trim(), article.financialExposure?.trim()].filter(
          Boolean,
        );
        td4.textContent = contextParts.join(' | ') || 'No additional context';
        tr.appendChild(td4);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(table);
    }

    const footer = doc.createElement('div');
    footer.className = 'footer';
    footer.textContent = 'Generated from published ZAYRON-X intelligence briefings.';
    body.appendChild(footer);

    const script = doc.createElement('script');
    script.textContent = `
      window.onload = function() {
        window.print();
        setTimeout(function() { window.close(); }, 600);
      };
    `;
    doc.body.appendChild(script);

    doc.close();
  };

  const latestArticle = articles[0];

  return (
    <div className="bg-white border border-neutral-200 rounded-none p-6 shadow-none hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between text-left h-full min-h-[350px] font-sans">
      <div>
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3.5 mb-5">
          <FileText className="w-4 h-4 text-[var(--color-accent-intelligence)]" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-[var(--color-accent-intelligence)]">
            Executive Briefing Export
          </span>
        </div>

        <div className="relative border border-neutral-200 rounded-none p-5 bg-neutral-50 font-mono text-[9px] text-neutral-500 select-none overflow-hidden h-[160px]">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <span className="text-4xl font-extrabold uppercase tracking-widest text-[#050505] rotate-45 select-none">
              ZAYRON-X
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-neutral-200 pb-2 mb-3">
            <span className="font-extrabold text-[#050505] text-[10px]">INTELLIGENCE BRIEFING</span>
            <span className="text-[8px] text-[var(--color-accent-intelligence)] font-bold px-1.5 py-0.5 rounded-none bg-[var(--color-accent-intelligence-soft)] border border-[var(--color-accent-intelligence)]/20">
              PREVIEW
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-neutral-400">
              <span>BRIEFINGS:</span>
              <span className="text-[#050505] font-semibold">{articles.length.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>PRIMARY CATEGORY:</span>
              <span className="text-[var(--color-accent-intelligence)] font-bold">
                {latestArticle?.category || 'Intelligence'}
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-400">
              <span>LATEST PUBLISHED:</span>
              <span className="text-[#050505] font-semibold">
                {latestArticle ? formatArticleDate(latestArticle) || 'Not available' : 'Not available'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-col gap-1 text-neutral-400 text-[8px]">
            <span>Preview generated from latest published intelligence briefings.</span>
            <span>{latestArticle?.title || 'No briefings available for export yet.'}</span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-none bg-[var(--color-accent-intelligence)] hover:bg-[var(--color-accent-intelligence-hover)] text-white border border-transparent font-mono font-bold text-xs tracking-wider transition-colors shadow-none cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export Briefing
        </button>
        <p className="text-[8px] font-mono text-center text-neutral-400 mt-2 leading-relaxed uppercase tracking-wider">
          Includes only published article details currently available in the platform.
        </p>
      </div>
    </div>
  );
}
