/**
 * PHASE 9C — Daily Email Intelligence Digest (`09:40 UTC`).
 *
 * Secret-gated (`RESEND_API_KEY`) & fail-closed: exits with 0 subrequests if
 * key is absent or there are 0 active subscribers. Batches up to 100 emails per
 * Resend API POST, capped at <= 5 subrequests/run.
 */
import { isEmailDigestSlot, SITE_ORIGIN } from './socialDispatch';

export const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';
export const DEFAULT_BRIEFING_FROM = 'ZAYRON-X Intelligence <intel@zayron-x.co>';
export const EMAIL_DIGEST_MAX_SUBREQUESTS = 5;

export interface EmailDigestEnv {
  DB: any;
  RESEND_API_KEY?: string;
  BRIEFING_FROM_EMAIL?: string;
  [key: string]: unknown;
}

export interface EmailDigestContent {
  dateLabel: string;
  news: Array<{ slug: string; title: string; severity: string; source_name: string; verdict: string }>;
  kevs: Array<{ cve_id: string; severity: string; affected_vendor: string | null; affected_product: string | null; cvss_score: number | null }>;
  malware: Array<{ id: string; title: string; severity: string }>;
}

export interface EmailDigestResult {
  status: 'SENT' | 'SKIPPED_NO_CREDS' | 'NO_SUBSCRIBERS' | 'NO_CONTENT' | 'SLOT_ONLY' | 'FAILED';
  subscribers_targeted: number;
  emails_sent: number;
  subrequestsUsed: number;
  errors: string[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildUnsubscribeUrl(token: string): string {
  return `https://api.zayron-x.co/api/v1/briefings/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildEmailDigestHtml(content: EmailDigestContent, unsubscribeUrl: string): string {
  const newsItems = content.news
    .map(
      (n) =>
        `<li style="margin-bottom:10px;"><strong style="color:#ff5500;">[${escapeHtml(n.severity)}]</strong> <a href="${SITE_ORIGIN}/news/${encodeURIComponent(n.slug)}" style="color:#f4f4f6;text-decoration:underline;">${escapeHtml(n.title)}</a><br><span style="color:#a1a1aa;font-size:13px;">${escapeHtml(n.source_name)} — ${escapeHtml(n.verdict)}</span></li>`,
    )
    .join('');

  const kevItems = content.kevs
    .map((k) => {
      const target = [k.affected_vendor, k.affected_product].filter(Boolean).join(' ');
      const cvss = k.cvss_score !== null ? ` · CVSS ${k.cvss_score.toFixed(1)}` : '';
      return `<li style="margin-bottom:8px;"><a href="${SITE_ORIGIN}/intelligence/vulnerabilities/${encodeURIComponent(k.cve_id)}" style="color:#f4f4f6;text-decoration:underline;"><strong>${escapeHtml(k.cve_id)}</strong></a> <span style="color:#a1a1aa;">(${escapeHtml(k.severity)}${cvss}${target ? ` · ${escapeHtml(target)}` : ''})</span></li>`;
    })
    .join('');

  const malItems = content.malware
    .map(
      (m) =>
        `<li style="margin-bottom:8px;"><a href="${SITE_ORIGIN}/intelligence/malware/advisories/${encodeURIComponent(m.id)}" style="color:#f4f4f6;text-decoration:underline;"><strong>${escapeHtml(m.id)}</strong></a> — ${escapeHtml(m.title)}</li>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#050505;color:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#0d0d10;border:1px solid #222228;padding:24px;">
    <div style="font-size:11px;letter-spacing:0.12em;color:#ff5500;text-transform:uppercase;">ZAYRON-X DAILY THREAT BRIEFING · ${escapeHtml(content.dateLabel)}</div>
    <h1 style="font-size:20px;margin:8px 0 16px;color:#ffffff;">Verified Intelligence Summary (24h)</h1>
    ${newsItems ? `<h2 style="font-size:14px;color:#d4d4d8;border-bottom:1px solid #222228;padding-bottom:6px;">Neural Newsroom</h2><ul style="padding-left:18px;">${newsItems}</ul>` : ''}
    ${kevItems ? `<h2 style="font-size:14px;color:#d4d4d8;border-bottom:1px solid #222228;padding-bottom:6px;">CISA KEV Additions</h2><ul style="padding-left:18px;">${kevItems}</ul>` : ''}
    ${malItems ? `<h2 style="font-size:14px;color:#d4d4d8;border-bottom:1px solid #222228;padding-bottom:6px;">Supply-Chain Advisories (MAL-*)</h2><ul style="padding-left:18px;">${malItems}</ul>` : ''}
    <div style="margin-top:24px;padding-top:14px;border-top:1px solid #222228;font-size:12px;color:#8a8a96;">
      Live alerts: <a href="https://t.me/zayronxai" style="color:#ff5500;">t.me/zayronxai</a> ·
      RSS: <a href="${SITE_ORIGIN}/news/rss.xml" style="color:#a1a1aa;">${SITE_ORIGIN}/news/rss.xml</a> ·
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#a1a1aa;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}

export function buildEmailDigestText(content: EmailDigestContent, unsubscribeUrl: string): string {
  const lines: string[] = [
    `ZAYRON-X DAILY THREAT BRIEFING (${content.dateLabel})`,
    '================================================',
    '',
  ];
  if (content.news.length > 0) {
    lines.push('NEURAL NEWSROOM');
    for (const n of content.news) {
      lines.push(`- [${n.severity}] ${n.title} (${n.source_name})`);
      lines.push(`  ${SITE_ORIGIN}/news/${encodeURIComponent(n.slug)}`);
    }
    lines.push('');
  }
  if (content.kevs.length > 0) {
    lines.push('CISA KEV ADDITIONS');
    for (const k of content.kevs) {
      lines.push(`- ${k.cve_id} (${k.severity}) — ${SITE_ORIGIN}/intelligence/vulnerabilities/${encodeURIComponent(k.cve_id)}`);
    }
    lines.push('');
  }
  if (content.malware.length > 0) {
    lines.push('SUPPLY-CHAIN ADVISORIES');
    for (const m of content.malware) {
      lines.push(`- ${m.id}: ${m.title} — ${SITE_ORIGIN}/intelligence/malware/advisories/${encodeURIComponent(m.id)}`);
    }
    lines.push('');
  }
  lines.push(`Live wire: https://t.me/zayronxai`);
  lines.push(`Unsubscribe: ${unsubscribeUrl}`);
  return lines.join('\n');
}

export async function runEmailDigestPass(
  env: EmailDigestEnv,
  options: { when?: Date; force?: boolean; fetchFn?: typeof fetch } = {},
): Promise<EmailDigestResult> {
  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;

  if (!options.force && !isEmailDigestSlot(when)) {
    return {
      status: 'SLOT_ONLY',
      subscribers_targeted: 0,
      emails_sent: 0,
      subrequestsUsed: 0,
      errors: ['OUTSIDE_EMAIL_DIGEST_SLOT'],
    };
  }

  const resendKey = String(env?.RESEND_API_KEY ?? '').trim();
  if (!resendKey) {
    return {
      status: 'SKIPPED_NO_CREDS',
      subscribers_targeted: 0,
      emails_sent: 0,
      subrequestsUsed: 0,
      errors: [],
    };
  }

  const subRows = await env.DB.prepare(
    `SELECT id, email, frequency, focus, unsubscribe_token
       FROM email_subscribers
      WHERE status = 'ACTIVE'
      ORDER BY subscribed_at ASC
      LIMIT 500`,
  )
    .all<{ id: string; email: string; frequency: string; focus: string; unsubscribe_token: string }>()
    .catch(() => ({ results: [] as any[] }));

  const subscribers = subRows.results ?? [];
  if (subscribers.length === 0) {
    return {
      status: 'NO_SUBSCRIBERS',
      subscribers_targeted: 0,
      emails_sent: 0,
      subrequestsUsed: 0,
      errors: [],
    };
  }

  const sinceIso = new Date(when.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [newsRes, kevRes, malRes] = await Promise.all([
    env.DB.prepare(
      `SELECT slug, title, severity, source_name, verdict
         FROM news_articles
        WHERE status = 'PUBLISHED' AND published_at >= ?
        ORDER BY published_at DESC LIMIT 6`,
    )
      .bind(sinceIso)
      .all()
      .catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT cve_id, severity, affected_vendor, affected_product, cvss_score
         FROM vulnerabilities
        WHERE provenance_state = 'AUTHORITATIVE_VERIFIED'
          AND is_exploited_in_wild = 1
          AND COALESCE(updated_at, created_at) >= ?
        ORDER BY COALESCE(cvss_score, 0) DESC LIMIT 6`,
    )
      .bind(sinceIso)
      .all()
      .catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT id, title, severity
         FROM malware_reports
        WHERE id LIKE 'MAL-%' AND COALESCE(published_at, created_at) >= ?
        ORDER BY COALESCE(published_at, created_at) DESC LIMIT 5`,
    )
      .bind(sinceIso)
      .all()
      .catch(() => ({ results: [] })),
  ]);

  const content: EmailDigestContent = {
    dateLabel: when.toISOString().slice(0, 10),
    news: (newsRes.results ?? []) as EmailDigestContent['news'],
    kevs: (kevRes.results ?? []) as EmailDigestContent['kevs'],
    malware: (malRes.results ?? []) as EmailDigestContent['malware'],
  };

  if (content.news.length === 0 && content.kevs.length === 0 && content.malware.length === 0) {
    return {
      status: 'NO_CONTENT',
      subscribers_targeted: subscribers.length,
      emails_sent: 0,
      subrequestsUsed: 0,
      errors: [],
    };
  }

  const from = String(env?.BRIEFING_FROM_EMAIL ?? '').trim() || DEFAULT_BRIEFING_FROM;
  let subrequestsUsed = 0;
  let emailsSent = 0;
  const errors: string[] = [];
  const deliveredIds: string[] = [];

  for (let i = 0; i < subscribers.length; i += 100) {
    if (subrequestsUsed >= EMAIL_DIGEST_MAX_SUBREQUESTS) break;
    const chunk = subscribers.slice(i, i + 100);
    const messages = chunk.map((sub) => {
      const unsubUrl = buildUnsubscribeUrl(sub.unsubscribe_token);
      return {
        from,
        to: [sub.email],
        subject: `ZAYRON-X Daily Threat Briefing — ${content.dateLabel}`,
        html: buildEmailDigestHtml(content, unsubUrl),
        text: buildEmailDigestText(content, unsubUrl),
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    subrequestsUsed += 1;
    try {
      const res = await fetchFn(RESEND_BATCH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        errors.push(`RESEND_HTTP_${res.status}`);
        continue;
      }
      emailsSent += chunk.length;
      for (const sub of chunk) deliveredIds.push(sub.id);
    } catch (error) {
      errors.push(`RESEND_ERROR:${String((error as Error)?.message || error).slice(0, 80)}`);
    }
  }

  if (deliveredIds.length > 0) {
    const sentAt = when.toISOString();
    const stmts = deliveredIds.map((id) =>
      env.DB.prepare(`UPDATE email_subscribers SET last_sent_at = ? WHERE id = ?`).bind(sentAt, id),
    );
    for (let i = 0; i < stmts.length; i += 50) {
      await env.DB.batch(stmts.slice(i, i + 50)).catch(() => undefined);
    }
  }

  return {
    status: emailsSent > 0 ? 'SENT' : 'FAILED',
    subscribers_targeted: subscribers.length,
    emails_sent: emailsSent,
    subrequestsUsed,
    errors,
  };
}
