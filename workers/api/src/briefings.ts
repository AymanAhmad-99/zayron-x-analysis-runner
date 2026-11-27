/**
 * PHASE 9C — Public Email Briefing Subscription & One-Click Unsubscribe.
 *
 * - Idempotent upsert on `email_subscribers` (never leaks whether an email already existed).
 * - Strict email validation + frequency (`daily` | `weekly`) + focus (`all` | `critical_kev` | `supply_chain`).
 * - 32-byte random hex `unsubscribe_token` for RFC 8058 / CAN-SPAM 1-click unsubscribe.
 */

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
