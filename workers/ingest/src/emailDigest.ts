/**
 * PHASE 9C — Daily Email Intelligence Digest (`09:40 UTC`).
 *
 * PHASE 9C-MAIL-PRO migration: Brevo Transactional API
 * (`POST https://api.brevo.com/v3/smtp/email`) replaces Resend.
 *
 * - Secret-gated (`BREVO_API_KEY`) & fail-closed: zero subrequests if the key is
 *   absent or there are no active subscribers.
 * - Batches recipients into Brevo `messageVersions` chunks of <= 50 and caps the
 *   run at <= 5 POSTs (`EMAIL_DIGEST_MAX_SUBREQUESTS`).
 * - HTML/text come from the shared institutional templates, so the digest uses
 *   the same obsidian masthead, orange accent and hosted PNG wordmark as the
 *   Welcome Briefing.
 */
import {
  BREVO_DIGEST_BATCH_SIZE,
  BREVO_SMTP_EMAIL_URL,
  ZX_FROM,
  brevoApiKey,
  buildDigestMessageVersions,
  buildEmailDigestHtml,
  buildEmailDigestText,
  buildListUnsubscribeHeaders,
  buildWelcomeBriefingEmail,
  parseSenderAddress,
  sendBrevoTransactional,
  type EmailDigestContent,
} from '@zayron/intelligence';
import { isEmailDigestSlot } from './socialDispatch';

export { BREVO_SMTP_EMAIL_URL, buildEmailDigestHtml, buildEmailDigestText };
export type { EmailDigestContent };

/** Reserved for callers that still import the old symbol name. */
export const RESEND_BATCH_URL = BREVO_SMTP_EMAIL_URL;
export const DEFAULT_BRIEFING_FROM = 'ZAYRON-X <intel@zayron-x.co>';
export const EMAIL_DIGEST_MAX_SUBREQUESTS = 5;
export const EMAIL_DIGEST_BATCH_SIZE = BREVO_DIGEST_BATCH_SIZE;

export interface EmailDigestEnv {
  DB: any;
  BREVO_API_KEY?: string;
  BRIEFING_FROM_EMAIL?: string;
  [key: string]: unknown;
}

export interface EmailDigestResult {
  status: 'SENT' | 'SKIPPED_NO_CREDS' | 'NO_SUBSCRIBERS' | 'NO_CONTENT' | 'SLOT_ONLY' | 'FAILED';
  subscribers_targeted: number;
  emails_sent: number;
  subrequestsUsed: number;
  errors: string[];
}

/**
 * Operator-only preview: send ONE digest email to an explicit address.
 * Never touches the subscriber list and never marks anyone as sent.
 */
export async function sendDigestPreview(
  env: EmailDigestEnv,
  options: { to: string; when?: Date; template?: 'digest' | 'welcome'; fetchFn?: typeof fetch },
): Promise<{ status: 'SENT' | 'SKIPPED_NO_CREDS' | 'INVALID_RECIPIENT' | 'NO_CONTENT' | 'FAILED'; subrequestsUsed: number; errors: string[]; messageId?: string }> {
  const to = String(options.to ?? '').trim().toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(to) || /[\r\n]/.test(to)) {
    return { status: 'INVALID_RECIPIENT', subrequestsUsed: 0, errors: ['INVALID_RECIPIENT'] };
  }
  const apiKey = brevoApiKey(env?.BREVO_API_KEY);
  if (!apiKey) return { status: 'SKIPPED_NO_CREDS', subrequestsUsed: 0, errors: [] };

  const when = options.when ?? new Date();
  const fetchFn = options.fetchFn ?? fetch;

  if (options.template === 'welcome') {
    const unsubscribeUrl = 'https://zayron-x.co/developers';
    const welcome = buildWelcomeBriefingEmail({ unsubscribeUrl });
    const sender = parseSenderAddress(
      String(env?.BRIEFING_FROM_EMAIL ?? '').trim() || DEFAULT_BRIEFING_FROM,
      ZX_FROM.intel.name,
    );
    const result = await sendBrevoTransactional({
      apiKey,
      sender,
      to: [{ email: to }],
      replyTo: sender,
      subject: welcome.subject,
      htmlContent: welcome.html,
      textContent: welcome.text,
      headers: buildListUnsubscribeHeaders(unsubscribeUrl),
      fetchFn,
    });
    return {
      status: result.ok ? 'SENT' : 'FAILED',
      subrequestsUsed: 1,
      errors: result.ok ? [] : [result.error ?? 'BREVO_SEND_FAILED'],
      messageId: result.messageId,
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
    dateLabel: `${when.toISOString().slice(0, 10)} (TEST)`,
    news: (newsRes.results ?? []) as EmailDigestContent['news'],
    kevs: (kevRes.results ?? []) as EmailDigestContent['kevs'],
    malware: (malRes.results ?? []) as EmailDigestContent['malware'],
  };
  if (content.news.length === 0 && content.kevs.length === 0 && content.malware.length === 0) {
    return { status: 'NO_CONTENT', subrequestsUsed: 0, errors: [] };
  }

  const unsubscribeUrl = 'https://zayron-x.co/developers';
  const sender = parseSenderAddress(
    String(env?.BRIEFING_FROM_EMAIL ?? '').trim() || DEFAULT_BRIEFING_FROM,
    ZX_FROM.intel.name,
  );
  const result = await sendBrevoTransactional({
    apiKey,
    sender,
    to: [{ email: to }],
    replyTo: sender,
    subject: `[TEST] ZAYRON-X Daily Threat Briefing — ${content.dateLabel}`,
    htmlContent: buildEmailDigestHtml(content, unsubscribeUrl),
    textContent: buildEmailDigestText(content, unsubscribeUrl),
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    fetchFn,
  });

  return {
    status: result.ok ? 'SENT' : 'FAILED',
    subrequestsUsed: 1,
    errors: result.ok ? [] : [result.error ?? 'BREVO_SEND_FAILED'],
    messageId: result.messageId,
  };
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

  const apiKey = brevoApiKey(env?.BREVO_API_KEY);
  if (!apiKey) {
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
    .all()
    .catch(() => ({ results: [] as any[] }));

  const subscribers = ((subRows as any)?.results ?? []) as Array<{
    id: string;
    email: string;
    frequency: string;
    focus: string;
    unsubscribe_token: string;
  }>;
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

  const sender = parseSenderAddress(
    String(env?.BRIEFING_FROM_EMAIL ?? '').trim() || DEFAULT_BRIEFING_FROM,
    ZX_FROM.intel.name,
  );
  const subject = `ZAYRON-X Daily Threat Briefing — ${content.dateLabel}`;

  let subrequestsUsed = 0;
  let emailsSent = 0;
  const errors: string[] = [];
  const deliveredIds: string[] = [];

  const versions = buildDigestMessageVersions(subscribers, content);
  for (const chunk of versions) {
    if (subrequestsUsed >= EMAIL_DIGEST_MAX_SUBREQUESTS) break;
    const unsubscribeUrl = `https://api.zayron-x.co/api/v1/briefings/unsubscribe?token=${encodeURIComponent(
      subscribers[Math.min(subrequestsUsed * EMAIL_DIGEST_BATCH_SIZE, subscribers.length - 1)]?.unsubscribe_token ?? '',
    )}`;

    subrequestsUsed += 1;
    const result = await sendBrevoTransactional({
      apiKey,
      sender,
      subject,
      // Base content is overridden per recipient by messageVersions, but Brevo
      // requires the top-level fields, and they keep non-version-aware clients
      // from receiving an empty body.
      htmlContent: buildEmailDigestHtml(content, unsubscribeUrl),
      textContent: buildEmailDigestText(content, unsubscribeUrl),
      replyTo: sender,
      messageVersions: chunk,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      fetchFn,
    });

    if (!result.ok) {
      errors.push(result.error ?? `BREVO_HTTP_${result.status}`);
      continue;
    }
    emailsSent += chunk.length;
    for (const version of chunk) {
      const recipient = version.to?.[0]?.email;
      const sub = subscribers.find((s: { id: string; email: string }) => s.email === recipient);
      if (sub) deliveredIds.push(sub.id);
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
