/**
 * PHASE 9C — Public Email Briefing Subscription & One-Click Unsubscribe.
 *
 * - Idempotent upsert on `email_subscribers` (never leaks whether an email already existed).
 * - Strict email validation + frequency (`daily` | `weekly`) + focus (`all` | `critical_kev` | `supply_chain`).
 * - 32-byte random hex `unsubscribe_token` for RFC 8058 / CAN-SPAM 1-click unsubscribe.
 */

import {
  ZX_FROM,
  brevoApiKey,
  buildUnsubscribeUrl,
  buildWelcomeBriefingEmail,
  sendBrevoTransactional,
  setBrevoEmailBlacklisted,
  upsertBrevoContact,
} from '@zayron/intelligence';

export type BriefingFrequency = 'daily' | 'weekly';
export type BriefingFocus = 'all' | 'critical_kev' | 'supply_chain';

export class BriefingError extends Error {
  constructor(
    public readonly status: 400 | 403 | 503,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'BriefingError';
  }
}

const EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:\"]+@[^\s@<>()[\]\\,;:\"]+\.[^\s@<>()[\]\\,;:\"]{2,}$/;

export function normalizeSubscriberEmail(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value || value.length > 254 || /[\r\n\0]/.test(value) || !EMAIL_PATTERN.test(value)) {
    throw new BriefingError(400, 'INVALID_EMAIL', 'A valid email address is required');
  }
  return value;
}

export function normalizeFrequency(raw: unknown): BriefingFrequency {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) return 'daily';
  if (value === 'daily' || value === 'weekly') return value;
  throw new BriefingError(400, 'INVALID_FREQUENCY', "frequency must be 'daily' or 'weekly'");
}

export function normalizeFocus(raw: unknown): BriefingFocus {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) return 'all';
  if (value === 'all' || value === 'critical_kev' || value === 'supply_chain') return value;
  throw new BriefingError(400, 'INVALID_FOCUS', "focus must be 'all', 'critical_kev', or 'supply_chain'");
}

export function generateUnsubscribeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function subscribeBriefing(input: {
  db: any;
  email: unknown;
  frequency?: unknown;
  focus?: unknown;
  now?: string;
}): Promise<{ ok: true; status: 'ACTIVE'; frequency: BriefingFrequency; focus: BriefingFocus }> {
  const email = normalizeSubscriberEmail(input.email);
  const frequency = normalizeFrequency(input.frequency);
  const focus = normalizeFocus(input.focus);
  const now = input.now ?? new Date().toISOString();
  const id = `sub_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const token = generateUnsubscribeToken();

  await input.db
    .prepare(
      `INSERT INTO email_subscribers (
         id, email, frequency, focus, status, unsubscribe_token, subscribed_at, unsubscribed_at
       ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, NULL)
       ON CONFLICT(email) DO UPDATE SET
         frequency = excluded.frequency,
         focus = excluded.focus,
         status = 'ACTIVE',
         unsubscribed_at = NULL`,
    )
    .bind(id, email, frequency, focus, token, now)
    .run();

  return { ok: true, status: 'ACTIVE', frequency, focus };
}

export async function unsubscribeBriefing(input: {
  db: any;
  token: unknown;
  now?: string;
}): Promise<{ ok: true; status: 'UNSUBSCRIBED'; updated: boolean }> {
  const token = typeof input.token === 'string' ? input.token.trim().toLowerCase() : '';
  if (!/^[a-f0-9]{32,128}$/.test(token)) {
    throw new BriefingError(400, 'INVALID_TOKEN', 'A valid unsubscribe token is required');
  }
  const now = input.now ?? new Date().toISOString();
  const res = await input.db
    .prepare(
      `UPDATE email_subscribers
          SET status = 'UNSUBSCRIBED',
              unsubscribed_at = ?
        WHERE unsubscribe_token = ?`,
    )
    .bind(now, token)
    .run();

  const changes = Number((res as any)?.meta?.changes ?? 0);
  return { ok: true, status: 'UNSUBSCRIBED', updated: changes > 0 };
}

/* ────────────────────────────────────────────────────────────────────────────
 * PHASE 9C-MAIL-PRO — Brevo contact sync + Welcome Briefing dispatch.
 *
 * Both effects are side-channel: they run through `ctx.waitUntil` AFTER the
 * subscriber row is durable, and every failure is swallowed into a structured
 * log line. The HTTP response never depends on Brevo being reachable.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Attributes mirrored into Brevo so segmentation never needs our database. */
export function briefingContactAttributes(
  frequency: BriefingFrequency,
  focus: BriefingFocus,
): Record<string, string> {
  return {
    SOURCE: 'website_signup',
    FREQUENCY: frequency.toUpperCase(),
    FOCUS: focus.toUpperCase(),
  };
}

/** Read the stored 1-click token for an address (never exposed over HTTP). */
export async function loadUnsubscribeToken(db: any, email: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT unsubscribe_token FROM email_subscribers WHERE email = ?`)
    .bind(email)
    .first?.();
  const token = (row as { unsubscribe_token?: string } | null)?.unsubscribe_token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/** Resolve the subscriber behind an unsubscribe token (for Brevo blacklisting). */
export async function loadEmailByUnsubscribeToken(db: any, token: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT email FROM email_subscribers WHERE unsubscribe_token = ?`)
    .bind(token)
    .first?.();
  const email = (row as { email?: string } | null)?.email;
  return typeof email === 'string' && email.length > 0 ? email : null;
}

export interface WelcomeDispatchResult {
  contact: 'SYNCED' | 'SKIPPED_NO_CREDS' | 'FAILED';
  welcome: 'SENT' | 'SKIPPED_NO_CREDS' | 'FAILED' | 'SKIPPED_NO_TOKEN';
  errors: string[];
}

/**
 * Sync the contact into Brevo AND send the flagship Welcome Briefing.
 * Fail-closed: without `BREVO_API_KEY` this performs ZERO network calls.
 */
export async function dispatchWelcomeBriefing(input: {
  db: any;
  email: string;
  frequency: BriefingFrequency;
  focus: BriefingFocus;
  brevoApiKey?: string;
  fetchFn?: typeof fetch;
}): Promise<WelcomeDispatchResult> {
  const key = brevoApiKey(input.brevoApiKey);
  if (!key) return { contact: 'SKIPPED_NO_CREDS', welcome: 'SKIPPED_NO_CREDS', errors: [] };

  const errors: string[] = [];
  const contact = await upsertBrevoContact({
    apiKey: key,
    email: input.email,
    attributes: briefingContactAttributes(input.frequency, input.focus),
    fetchFn: input.fetchFn,
  });
  if (!contact.ok) errors.push(contact.error ?? 'CONTACT_SYNC_FAILED');

  const token = await loadUnsubscribeToken(input.db, input.email).catch(() => null);
  if (!token) {
    return {
      contact: contact.ok ? 'SYNCED' : 'FAILED',
      welcome: 'SKIPPED_NO_TOKEN',
      errors: [...errors, 'MISSING_UNSUBSCRIBE_TOKEN'],
    };
  }

  const email = buildWelcomeBriefingEmail({ unsubscribeUrl: buildUnsubscribeUrl(token) });
  const sent = await sendBrevoTransactional({
    apiKey: key,
    sender: ZX_FROM.intel,
    to: [{ email: input.email }],
    replyTo: ZX_FROM.intel,
    subject: email.subject,
    htmlContent: email.html,
    textContent: email.text,
    headers: {
      'List-Unsubscribe': `<${buildUnsubscribeUrl(token)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    fetchFn: input.fetchFn,
  });
  if (!sent.ok) errors.push(sent.error ?? 'WELCOME_SEND_FAILED');

  return {
    contact: contact.ok ? 'SYNCED' : 'FAILED',
    welcome: sent.ok ? 'SENT' : 'FAILED',
    errors,
  };
}

/** Mirror a 1-click unsubscribe into Brevo (`emailBlacklisted: true`). */
export async function syncBrevoUnsubscribe(input: {
  email: string | null;
  brevoApiKey?: string;
  fetchFn?: typeof fetch;
}): Promise<{ ok: boolean; error?: string }> {
  const key = brevoApiKey(input.brevoApiKey);
  if (!key || !input.email) return { ok: false, error: 'SKIPPED' };
  const res = await setBrevoEmailBlacklisted({
    apiKey: key,
    email: input.email,
    blacklisted: true,
    fetchFn: input.fetchFn,
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
