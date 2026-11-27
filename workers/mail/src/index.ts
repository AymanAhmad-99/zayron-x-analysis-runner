/**
 * PHASE 9C-MAIL-PRO — `zayron-x-mail` inbound desk.
 *
 * Cloudflare Email Routing delivers intel@zayron-x.co and security@zayron-x.co
 * here. Responsibilities, in order:
 *
 *   1. ALWAYS forward legitimate non-self mail to `FOUNDER_FORWARD_EMAIL`.
 *   2. Send ONE branded auto-acknowledgement per sender per desk per 24 hours.
 *   3. Never answer a machine, a list, or ourselves (see `shouldSuppressAutoReply`).
 *
 * The ledger (`inbound_mail_events`) stores only a SHA-256 sender hash, so the
 * cooldown guard holds no PII and the table stays small.
 */
import {
  DESK_LABEL,
  MAIL_COOLDOWN_HOURS,
  ZX_FROM,
  brevoApiKey,
  buildMailDeskReceipt,
  deskForRecipient,
  formatMailReferenceId,
  generateReferenceHex,
  sendBrevoTransactional,
  shouldSuppressAutoReply,
  type MailDesk,
} from '@zayron/intelligence';

export interface MailEnv {
  DB: D1Database;
  BREVO_API_KEY?: string;
  FOUNDER_FORWARD_EMAIL?: string;
  ENVIRONMENT?: string;
  MAIL_DESK_ENABLED?: string;
}

/** Structural subset of `ForwardableEmailMessage` the desk actually uses. */
export interface InboundMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  forward?(to: string): Promise<void>;
}

export function normalizeSender(address: string): string {
  return (address || '').trim().toLowerCase().replace(/^.*<([^>]+)>.*$/, '$1');
}

export async function hashSender(desk: MailDesk, sender: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${desk}:${normalizeSender(sender)}`),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface InboundDecision {
  desk: MailDesk | null;
  sender: string;
  senderHash: string | null;
  suppress: boolean;
  reason: string;
  shouldForward: boolean;
  referenceId: string | null;
}

/** Resolve desk, cooldown and anti-loop verdict for one inbound message. */
export async function classifyInbound(input: {
  to: string;
  from: string;
  headers: Headers | Record<string, string | undefined>;
  db?: D1Database;
  now?: Date;
}): Promise<InboundDecision> {
  const now = input.now ?? new Date();
  const desk = deskForRecipient(input.to);
  const sender = normalizeSender(input.from);
  if (!desk) {
    return { desk: null, sender, senderHash: null, suppress: true, reason: 'NO_DESK', shouldForward: false, referenceId: null };
  }

  const senderHash = await hashSender(desk, sender);

  let lastAutoReplyAt: string | null = null;
  if (input.db) {
    const row = await input.db
      .prepare(
        `SELECT received_at FROM inbound_mail_events
          WHERE desk = ? AND sender_hash = ? AND action = 'AUTO_REPLIED'
          ORDER BY received_at DESC LIMIT 1`,
      )
      .bind(desk, senderHash)
      .first<{ received_at: string }>()
      .catch(() => null);
    lastAutoReplyAt = row?.received_at ?? null;
  }

  const guard = shouldSuppressAutoReply({
    sender,
    desk,
    headers: input.headers,
    lastAutoReplyAt,
    now,
  });

  return {
    desk,
    sender,
    senderHash,
    suppress: guard.suppress,
    reason: guard.reason,
    // Forward everything human-authored that is not our own mail.
    shouldForward: guard.reason !== 'EMPTY_SENDER' && guard.reason !== 'INVALID_SENDER' && guard.reason !== 'SELF_MAIL',
    referenceId: formatMailReferenceId(desk, now, generateReferenceHex()),
  };
}

async function recordEvent(
  env: MailEnv,
  row: { desk: MailDesk; senderHash: string; referenceId: string; action: 'AUTO_REPLIED' | 'SUPPRESSED' | 'FORWARDED'; reason: string; now: Date },
): Promise<void> {
  if (!env?.DB) return;
  await env.DB.prepare(
    `INSERT INTO inbound_mail_events (id, desk, sender_hash, reference_id, action, reason, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      `mail_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
      row.desk,
      row.senderHash,
      row.referenceId,
      row.action,
      row.reason,
      row.now.toISOString(),
    )
    .run()
    .catch(() => undefined);
}

/**
 * Send the desk auto-acknowledgement. Threads correctly (`In-Reply-To` /
 * `References`) and suppresses every auto-responder on the far side.
 */
export async function sendDeskAutoReply(input: {
  desk: MailDesk;
  sender: string;
  subject: string;
  messageId?: string;
  referenceId: string;
  receivedAtUtc: string;
  env: MailEnv;
  fetchFn?: typeof fetch;
}): Promise<{ ok: boolean; error?: string }> {
  const key = brevoApiKey(input.env?.BREVO_API_KEY);
  if (!key) return { ok: false, error: 'MISSING_BREVO_API_KEY' };

  const receipt = buildMailDeskReceipt({
    desk: input.desk,
    referenceId: input.referenceId,
    subject: input.subject,
    receivedAtUtc: input.receivedAtUtc,
    senderEmail: input.sender,
  });

  const headers: Record<string, string> = {
    'Auto-Submitted': 'auto-replied',
    'X-Auto-Response-Suppress': 'All',
    Precedence: 'auto_reply',
  };
  if (input.messageId) {
    headers['In-Reply-To'] = input.messageId;
    headers['References'] = input.messageId;
  }

  const result = await sendBrevoTransactional({
    apiKey: key,
    sender: ZX_FROM[input.desk],
    to: [{ email: input.sender }],
    replyTo: ZX_FROM[input.desk],
    subject: input.subject ? `Re: ${input.subject}` : receipt.subject,
    htmlContent: receipt.html,
    textContent: receipt.text,
    headers,
    fetchFn: input.fetchFn,
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error ?? `BREVO_HTTP_${result.status}` };
}

/**
 * The Email Routing entrypoint. Exported separately from the default handler so
 * the decision path is directly unit-testable without a live message object.
 */
export async function handleInboundEmail(
  message: InboundMessage,
  env: MailEnv,
  options: { now?: Date; fetchFn?: typeof fetch } = {},
): Promise<{ forwarded: boolean; autoReplied: boolean; reason: string; referenceId: string | null; desk: MailDesk | null }> {
  const now = options.now ?? new Date();
  const enabled = String(env?.MAIL_DESK_ENABLED ?? 'true') !== 'false';
  const decision = await classifyInbound({
    to: message.to,
    from: message.from,
    headers: message.headers,
    db: enabled ? env.DB : undefined,
    now,
  });

  if (!decision.desk) {
    return { forwarded: false, autoReplied: false, reason: 'NO_DESK', referenceId: null, desk: null };
  }

  const subject = message.headers.get('subject') ?? '';
  const messageId = message.headers.get('message-id') ?? undefined;
  const forwardTo = String(env?.FOUNDER_FORWARD_EMAIL ?? '').trim();

  let forwarded = false;
  if (decision.shouldForward && forwardTo && typeof message.forward === 'function') {
    try {
      await message.forward(forwardTo);
      forwarded = true;
    } catch (error) {
      console.error('[MAIL] forward failed', {
        site: 'mail.forward',
        desk: decision.desk,
        error: String((error as Error)?.message || error).slice(0, 200),
      });
    }
  }

  if (decision.suppress || !enabled) {
    await recordEvent(env, {
      desk: decision.desk,
      senderHash: decision.senderHash!,
      referenceId: decision.referenceId!,
      action: 'SUPPRESSED',
      reason: enabled ? decision.reason : 'DESK_DISABLED',
      now,
    });
    return {
      forwarded,
      autoReplied: false,
      reason: decision.reason,
      referenceId: decision.referenceId,
      desk: decision.desk,
    };
  }

  const reply = await sendDeskAutoReply({
    desk: decision.desk,
    sender: decision.sender,
    subject,
    messageId,
    referenceId: decision.referenceId!,
    receivedAtUtc: now.toISOString().replace('.000Z', 'Z'),
    env,
    fetchFn: options.fetchFn,
  });

  await recordEvent(env, {
    desk: decision.desk,
    senderHash: decision.senderHash!,
    referenceId: decision.referenceId!,
    action: reply.ok ? 'AUTO_REPLIED' : 'SUPPRESSED',
    reason: reply.ok ? 'AUTO_REPLIED' : reply.error ?? 'SEND_FAILED',
    now,
  });

  return {
    forwarded,
    autoReplied: reply.ok,
    reason: reply.ok ? 'AUTO_REPLIED' : reply.error ?? 'SEND_FAILED',
    referenceId: decision.referenceId,
    desk: decision.desk,
  };
}

export default {
  async email(message: InboundMessage, env: MailEnv, ctx: ExecutionContext): Promise<void> {
    const result = await handleInboundEmail(message, env);
    console.log(
      JSON.stringify({
        type: 'INBOUND_MAIL',
        desk: result.desk,
        reference_id: result.referenceId,
        forwarded: result.forwarded,
        auto_replied: result.autoReplied,
        reason: result.reason,
      }),
    );
    ctx.waitUntil(Promise.resolve());
  },

  async fetch(): Promise<Response> {
    // The desk has no HTTP surface; a fetch hit is a misroute, not a feature.
    return new Response(JSON.stringify({ worker: 'zayron-x-mail', surfaces: ['email'], desks: Object.keys(DESK_LABEL) }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  },
};

export { MAIL_COOLDOWN_HOURS };
