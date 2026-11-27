import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  BREVO_DIGEST_BATCH_SIZE,
  BREVO_MAX_SUBREQUESTS,
  BREVO_SMTP_EMAIL_URL,
  ZX_EMAIL_LOGO_URL,
  ZX_FREE_TIER,
  buildDigestMessageVersions,
  buildEmailDigestHtml,
  buildListUnsubscribeHeaders,
  buildMailDeskReceipt,
  buildUnsubscribeUrl,
  buildWelcomeBriefingEmail,
  buildWelcomeBriefingHtml,
  deskForRecipient,
  escapeHtml,
  formatMailReferenceId,
  parseSenderAddress,
  sendBrevoTransactional,
  setBrevoEmailBlacklisted,
  shouldSuppressAutoReply,
  upsertBrevoContact,
} from '../../packages/intelligence/src/email';
import {
  briefingContactAttributes,
  dispatchWelcomeBriefing,
  loadEmailByUnsubscribeToken,
  loadUnsubscribeToken,
  syncBrevoUnsubscribe,
} from '../../workers/api/src/briefings';
import { runEmailDigestPass, sendDigestPreview } from '../../workers/ingest/src/emailDigest';
import {
  classifyInbound,
  handleInboundEmail,
  hashSender,
  normalizeSender,
} from '../../workers/mail/src/index';

/* ── fixtures ─────────────────────────────────────────────────────────────── */

function fakeSubscriberDb(seed: Array<{ email: string; token: string }> = []) {
  const rows = new Map(seed.map((s) => [s.email.toLowerCase(), s]));
  return {
    rows,
    prepare(sql: string) {
      let args: any[] = [];
      const stmt: any = {
        bind(...values: any[]) {
          args = values;
          return stmt;
        },
        async first() {
          if (sql.includes('FROM email_subscribers')) {
            if (sql.includes('WHERE email = ?')) {
              const row = rows.get(String(args[0]).toLowerCase());
              return row ? { email: row.email, unsubscribe_token: row.token } : null;
            }
            if (sql.includes('WHERE unsubscribe_token = ?')) {
              for (const row of rows.values()) {
                if (row.token === args[0]) return { email: row.email };
              }
              return null;
            }
          }
          return null;
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        },
        async all() {
          return { results: [] };
        },
      };
      return stmt;
    },
    async batch(stmts: any[]) {
      return stmts.map(() => ({ success: true }));
    },
  };
}

function fakeDigestDb() {
  return {
    prepare(sql: string) {
      const stmt: any = {
        bind() {
          return stmt;
        },
        async all() {
          if (sql.includes('FROM news_articles')) {
            return { results: [{ slug: 's1', title: 'Alert', severity: 'CRITICAL', source_name: 'CISA', verdict: 'Patch now.' }] };
          }
          if (sql.includes('FROM vulnerabilities')) {
            return {
              results: [
                { cve_id: 'CVE-2026-1', severity: 'CRITICAL', affected_vendor: 'Acme', affected_product: 'GW', cvss_score: 9.8 },
              ],
            };
          }
          if (sql.includes('FROM malware_reports')) {
            return { results: [{ id: 'MAL-2026-1', title: 'Evil pkg', severity: 'HIGH' }] };
          }
          return { results: [] };
        },
        async run() {
          return { success: true, meta: { changes: 1 } };
        },
      };
      return stmt;
    },
    async batch(stmts: any[]) {
      return stmts.map(() => ({ success: true }));
    },
  };
}

/* ── welcome briefing ─────────────────────────────────────────────────────── */

describe('Phase 9C-Mail-Pro — Welcome Briefing', () => {
  const unsub = buildUnsubscribeUrl('a'.repeat(32));
  const email = buildWelcomeBriefingEmail({ unsubscribeUrl: unsub });

  test('subject and preheader are the exact briefing lines', () => {
    expect(email.subject).toBe('Welcome to ZAYRON-X — Your Neural Threat Graph & Free API Are Live');
    expect(email.preheader).toContain('15-second triage, live KQL/SPL');
    expect(email.preheader).toContain('zero noise, zero paywall.');
  });

  test('uses the hosted PNG wordmark (never inline SVG) with alt fallback', () => {
    expect(ZX_EMAIL_LOGO_URL).toBe('https://zayron-x.co/brand/zayron-email-logo.png');
    expect(email.html).toContain(`src="${ZX_EMAIL_LOGO_URL}"`);
    expect(email.html).toContain('alt="ZAYRON-X"');
    expect(email.html).not.toContain('<svg');
  });

  test('600px table layout with inline CSS and no flexbox/grid', () => {
    expect(email.html).toContain('width="600"');
    expect(email.html).toContain('role="presentation"');
    expect(email.html).toContain('#FF4D00');
    expect(email.html).toContain('#0B0F17');
    expect(email.html).toContain('Truth Is the Perimeter.');
    expect(email.html.toLowerCase()).not.toContain('display:flex');
    expect(email.html.toLowerCase()).not.toContain('display: flex');
    expect(email.html.toLowerCase()).not.toContain('display:grid');
    expect(email.html.toLowerCase()).not.toContain('display: grid');
    expect(email.html).not.toContain('<link');
  });

  test('cites only the live free-tier numbers read from the codebase', () => {
    expect(ZX_FREE_TIER.endpointCount).toBe(27);
    expect(ZX_FREE_TIER.requestsPerMinute).toBe(30);
    expect(ZX_FREE_TIER.dailyQuota).toBe(500);
    expect(ZX_FREE_TIER.bulkIocLimit).toBe(50);
    expect(email.html).toContain('27 endpoints');
    expect(email.html).toContain('30 requests / 60s');
    expect(email.html).toContain('500 records / day');
    expect(email.html).toContain('50 indicators / request');
    expect(email.html).toContain('STIX 2.1');
    expect(email.html).toContain('Palo Alto');
  });

  test('never invents an endpoint count above the live OpenAPI paths', () => {
    const spec = readFileSync('workers/api/src/openapi.ts', 'utf8');
    const paths = spec.match(/^ +"\/[a-z]/gm) ?? [];
    // 29 documented paths minus /openapi.json and /llms.txt = 27 data endpoints.
    expect(paths.length).toBe(29);
    expect(ZX_FREE_TIER.endpointCount).toBe(paths.length - 2);
  });

  test('renders, and escapes, the unsubscribe URL in HTML and text', () => {
    expect(email.html).toContain(escapeHtml(unsub));
    expect(email.text).toContain(unsub);
    const hostile = buildWelcomeBriefingHtml({ unsubscribeUrl: 'https://x.test/?t="><script>alert(1)</script>' });
    expect(hostile).not.toContain('<script>alert(1)</script>');
    expect(hostile).toContain('&quot;&gt;&lt;script&gt;');
  });

  test('text body mirrors the HTML CTAs', () => {
    expect(email.text).toContain('https://zayron-x.co/intelligence');
    expect(email.text).toContain('https://zayron-x.co/developers');
    expect(email.text).toContain('https://t.me/zayronxai');
    expect(email.text).toContain('https://zayron-x.co/news');
    expect(email.text).toContain('intel@zayron-x.co');
  });

  test('List-Unsubscribe headers are RFC 8058 one-click', () => {
    const headers = buildListUnsubscribeHeaders(unsub);
    expect(headers['List-Unsubscribe']).toBe(`<${unsub}>`);
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  test('escapeHtml neutralizes every HTML metacharacter', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});

/* ── Brevo contact sync + dispatch ─────────────────────────────────────────── */

describe('Phase 9C-Mail-Pro — Brevo Contacts & Welcome Dispatch', () => {
  test('contact attributes mirror SOURCE, FREQUENCY and FOCUS', () => {
    expect(briefingContactAttributes('weekly', 'critical_kev')).toEqual({
      SOURCE: 'website_signup',
      FREQUENCY: 'WEEKLY',
      FOCUS: 'CRITICAL_KEV',
    });
  });

  test('load helpers read the stored token and its owner', async () => {
    const db = fakeSubscriberDb([{ email: 'analyst@example.com', token: 'f'.repeat(32) }]);
    expect(await loadUnsubscribeToken(db, 'analyst@example.com')).toBe('f'.repeat(32));
    expect(await loadEmailByUnsubscribeToken(db, 'f'.repeat(32))).toBe('analyst@example.com');
    expect(await loadUnsubscribeToken(db, 'missing@example.com')).toBeNull();
  });

  test('fails closed with ZERO network calls when BREVO_API_KEY is unset', async () => {
    const db = fakeSubscriberDb([{ email: 'analyst@example.com', token: 'a'.repeat(32) }]);
    let fetches = 0;
    const outcome = await dispatchWelcomeBriefing({
      db,
      email: 'analyst@example.com',
      frequency: 'daily',
      focus: 'all',
      brevoApiKey: '   ',
      fetchFn: (async () => {
        fetches += 1;
        return new Response('{}');
      }) as unknown as typeof fetch,
    });
    expect(outcome).toEqual({ contact: 'SKIPPED_NO_CREDS', welcome: 'SKIPPED_NO_CREDS', errors: [] });
    expect(fetches).toBe(0);
  });

  test('syncs the contact and sends the welcome briefing through Brevo', async () => {
    const db = fakeSubscriberDb([{ email: 'analyst@example.com', token: 'b'.repeat(32) }]);
    const calls: Array<{ url: string; body: any; headers: any }> = [];
    const outcome = await dispatchWelcomeBriefing({
      db,
      email: 'analyst@example.com',
      frequency: 'daily',
      focus: 'all',
      brevoApiKey: 'xkeysib-secret',
      fetchFn: (async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')), headers: init?.headers });
        return new Response(JSON.stringify({ messageId: 'msg_1' }), { status: 201 });
      }) as unknown as typeof fetch,
    });

    expect(outcome).toEqual({ contact: 'SYNCED', welcome: 'SENT', errors: [] });
    expect(calls).toHaveLength(2);

    const [contactCall, sendCall] = calls;
    expect(contactCall.url).toBe('https://api.brevo.com/v3/contacts');
    expect(contactCall.body.email).toBe('analyst@example.com');
    expect(contactCall.body.attributes).toEqual({ SOURCE: 'website_signup', FREQUENCY: 'DAILY', FOCUS: 'ALL' });
    expect(contactCall.body.updateEnabled).toBe(true);

    expect(sendCall.url).toBe(BREVO_SMTP_EMAIL_URL);
    expect(sendCall.body.sender.email).toBe('intel@zayron-x.co');
    expect(sendCall.body.subject).toContain('Your Neural Threat Graph');
    expect(sendCall.body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(sendCall.body.htmlContent).toContain(ZX_EMAIL_LOGO_URL);
    expect(String(sendCall.headers['api-key'])).toBe('xkeysib-secret');
  });

  test('a Brevo send failure is reported, never thrown', async () => {
    const db = fakeSubscriberDb([{ email: 'analyst@example.com', token: 'c'.repeat(32) }]);
    const outcome = await dispatchWelcomeBriefing({
      db,
      email: 'analyst@example.com',
      frequency: 'daily',
      focus: 'all',
      brevoApiKey: 'xkeysib-secret',
      fetchFn: (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch,
    });
    expect(outcome.contact).toBe('FAILED');
    expect(outcome.welcome).toBe('FAILED');
    expect(outcome.errors.join(',')).toContain('BREVO_HTTP_401');
  });

  test('unsubscribe mirrors emailBlacklisted=true onto the Brevo contact', async () => {
    const calls: Array<{ url: string; method?: string; body: any }> = [];
    const result = await syncBrevoUnsubscribe({
      email: 'analyst@example.com',
      brevoApiKey: 'xkeysib-secret',
      fetchFn: (async (url: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(url), method: init?.method, body: JSON.parse(String(init?.body ?? '{}')) });
        return new Response(null, { status: 204 });
      }) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    expect(calls[0].url).toBe('https://api.brevo.com/v3/contacts/analyst%40example.com');
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].body.emailBlacklisted).toBe(true);
  });

  test('contact/blacklist helpers fail closed without a key', async () => {
    expect((await upsertBrevoContact({ apiKey: '', email: 'a@b.co', attributes: {} })).error).toBe('MISSING_BREVO_API_KEY');
    expect(
      (await setBrevoEmailBlacklisted({ apiKey: '', email: 'a@b.co', blacklisted: true })).error,
    ).toBe('MISSING_BREVO_API_KEY');
    expect((await sendBrevoTransactional({
      apiKey: '',
      sender: { email: 'intel@zayron-x.co', name: 'ZAYRON-X' },
      to: [{ email: 'a@b.co' }],
      subject: 's',
      htmlContent: 'h',
      textContent: 't',
    })).error).toBe('MISSING_BREVO_API_KEY');
  });

  test('parseSenderAddress accepts both bracketed and bare addresses', () => {
    expect(parseSenderAddress('ZAYRON-X Intelligence <intel@zayron-x.co>')).toEqual({
      name: 'ZAYRON-X Intelligence',
      email: 'intel@zayron-x.co',
    });
    expect(parseSenderAddress('intel@zayron-x.co', 'Fallback')).toEqual({ name: 'Fallback', email: 'intel@zayron-x.co' });
  });
});

/* ── digest batching ──────────────────────────────────────────────────────── */

describe('Phase 9C-Mail-Pro — Brevo Digest Batching', () => {
  const content = {
    dateLabel: '2026-11-27',
    news: [{ slug: 's1', title: 'Alert', severity: 'CRITICAL', source_name: 'CISA', verdict: 'Patch now.' }],
    kevs: [],
    malware: [],
  };

  test('chunks recipients at 50 per messageVersions request', () => {
    const recipients = Array.from({ length: 120 }, (_, i) => ({
      email: `user${i}@example.com`,
      unsubscribe_token: `${String(i).padStart(2, '0')}`.repeat(16),
    }));
    const chunks = buildDigestMessageVersions(recipients, content);
    expect(BREVO_DIGEST_BATCH_SIZE).toBe(50);
    expect(chunks.map((c) => c.length)).toEqual([50, 50, 20]);
    expect(chunks[2][0].headers?.['List-Unsubscribe']).toContain('token=');
    expect(chunks[0][0].htmlContent).toContain('ZAYRON-X');
  });

  test('caps a run at 5 Brevo POSTs (<= 5 subrequests)', async () => {
    const db = fakeDigestDb();
    const recipients = Array.from({ length: 400 }, (_, i) => ({
      id: `sub_${i}`,
      email: `user${i}@example.com`,
      frequency: 'daily',
      focus: 'all',
      unsubscribe_token: `${i}`.padStart(8, '0').repeat(4),
    }));
    const dbWithSubs: any = {
      ...db,
      prepare(sql: string) {
        if (sql.includes('FROM email_subscribers')) {
          const stmt: any = {
            bind: () => stmt,
            all: async () => ({ results: recipients }),
            run: async () => ({ success: true }),
          };
          return stmt;
        }
        return db.prepare(sql);
      },
    };

    let posts = 0;
    const result = await runEmailDigestPass(
      { DB: dbWithSubs, BREVO_API_KEY: 'xkeysib-test' },
      {
        when: new Date(Date.UTC(2026, 10, 27, 9, 40)),
        fetchFn: (async () => {
          posts += 1;
          return new Response(JSON.stringify({ messageId: 'm' }), { status: 201 });
        }) as unknown as typeof fetch,
      },
    );

    expect(BREVO_MAX_SUBREQUESTS).toBe(5);
    expect(posts).toBe(5);
    expect(result.subrequestsUsed).toBe(5);
    expect(result.emails_sent).toBe(250);
  });

  test('slot guard and no-credential paths stay inert', async () => {
    const db = fakeDigestDb();
    const wrongSlot = await runEmailDigestPass({ DB: db, BREVO_API_KEY: 'k' }, { when: new Date(Date.UTC(2026, 10, 27, 3, 0)) });
    expect(wrongSlot.status).toBe('SLOT_ONLY');

    let fetches = 0;
    const noCreds = await runEmailDigestPass(
      { DB: db },
      {
        when: new Date(Date.UTC(2026, 10, 27, 9, 40)),
        fetchFn: (async () => {
          fetches += 1;
          return new Response('{}');
        }) as unknown as typeof fetch,
      },
    );
    expect(noCreds.status).toBe('SKIPPED_NO_CREDS');
    expect(fetches).toBe(0);
  });

  test('preview sends exactly one email to one explicit address', async () => {
    const posts: any[] = [];
    const sent = await sendDigestPreview(
      { DB: fakeDigestDb(), BREVO_API_KEY: 'xkeysib-test' },
      {
        to: 'owner@zayron-x.co',
        when: new Date(Date.UTC(2026, 10, 27, 9, 40)),
        fetchFn: (async (_url: RequestInfo | URL, init?: RequestInit) => {
          posts.push(JSON.parse(String(init?.body ?? '{}')));
          return new Response(JSON.stringify({ messageId: 'preview_1' }), { status: 201 });
        }) as unknown as typeof fetch,
      },
    );
    expect(sent.status).toBe('SENT');
    expect(sent.subrequestsUsed).toBe(1);
    expect(posts).toHaveLength(1);
    expect(posts[0].to).toEqual([{ email: 'owner@zayron-x.co' }]);
    expect(posts[0].subject.startsWith('[TEST]')).toBe(true);
  });

  test('preview rejects a hostile recipient and skips without credentials', async () => {
    expect((await sendDigestPreview({ DB: fakeDigestDb() }, { to: 'a@b.co\r\nBcc: evil@x.co' })).status).toBe(
      'INVALID_RECIPIENT',
    );
    expect((await sendDigestPreview({ DB: fakeDigestDb() }, { to: 'owner@zayron-x.co' })).status).toBe(
      'SKIPPED_NO_CREDS',
    );
  });

  test('digest HTML shares the obsidian masthead and logo', () => {
    const html = buildEmailDigestHtml(content, 'https://x.test/unsub');
    expect(html).toContain('#0B0F17');
    expect(html).toContain('#FF4D00');
    expect(html).toContain(ZX_EMAIL_LOGO_URL);
    expect(html.toLowerCase()).not.toContain('display: fle');
    expect(html).not.toContain('<svg');
  });
});

/* ── inbound desk ─────────────────────────────────────────────────────────── */

describe('Phase 9C-Mail-Pro — Inbound Desk (intel@ / security@)', () => {
  const headers = (values: Record<string, string> = {}) => new Headers(values);

  test('routes by recipient and formats the reference id', () => {
    expect(deskForRecipient('intel@zayron-x.co')).toBe('intel');
    expect(deskForRecipient('security@zayron-x.co')).toBe('security');
    expect(deskForRecipient('support@zayron-x.co')).toBeNull();
    expect(formatMailReferenceId('intel', new Date('2026-11-27T09:00:00Z'), 'ab12')).toBe('ZX-INTEL-20261127-AB12');
    expect(formatMailReferenceId('security', new Date('2026-11-27T09:00:00Z'), 'zz99ff')).toBe('ZX-SEC-20261127-99FF');
  });

  test('suppresses every loop class', () => {
    const base = { desk: 'intel' as const, headers: headers() };
    expect(shouldSuppressAutoReply({ ...base, sender: '' }).reason).toBe('EMPTY_SENDER');
    expect(shouldSuppressAutoReply({ ...base, sender: 'noreply@vendor.com' }).reason).toBe('MACHINE_SENDER');
    expect(shouldSuppressAutoReply({ ...base, sender: 'mailer-daemon@vendor.com' }).reason).toBe('MACHINE_SENDER');
    expect(shouldSuppressAutoReply({ ...base, sender: 'postmaster@vendor.com' }).reason).toBe('MACHINE_SENDER');
    expect(shouldSuppressAutoReply({ ...base, sender: 'intel@zayron-x.co' }).reason).toBe('SELF_MAIL');
    expect(
      shouldSuppressAutoReply({ ...base, sender: 'analyst@acme.com', headers: headers({ 'Auto-Submitted': 'auto-replied' }) }).reason,
    ).toBe('AUTO_SUBMITTED');
    expect(
      shouldSuppressAutoReply({ ...base, sender: 'analyst@acme.com', headers: headers({ Precedence: 'bulk' }) }).reason,
    ).toBe('PRECEDENCE_BULK');
    expect(
      shouldSuppressAutoReply({ ...base, sender: 'analyst@acme.com', headers: headers({ 'List-Id': '<news.acme.com>' }) }).reason,
    ).toBe('LIST_ID');
    expect(
      shouldSuppressAutoReply({ ...base, sender: 'analyst@acme.com', headers: headers({ 'List-Unsubscribe': '<mailto:x@y>' }) }).reason,
    ).toBe('LIST_UNSUBSCRIBE');
  });

  test('allows a human, but only once per 24h', () => {
    const now = new Date('2026-11-27T12:00:00Z');
    expect(
      shouldSuppressAutoReply({ desk: 'security', sender: 'researcher@acme.com', headers: headers(), now }).suppress,
    ).toBe(false);
    expect(
      shouldSuppressAutoReply({
        desk: 'security',
        sender: 'researcher@acme.com',
        headers: headers(),
        now,
        lastAutoReplyAt: '2026-11-27T03:00:00Z',
      }).reason,
    ).toBe('COOLDOWN_24H');
    expect(
      shouldSuppressAutoReply({
        desk: 'security',
        sender: 'researcher@acme.com',
        headers: headers(),
        now,
        lastAutoReplyAt: '2026-11-25T03:00:00Z',
      }).suppress,
    ).toBe(false);
  });

  test('sender hash is desk-scoped and never the raw address', async () => {
    const h1 = await hashSender('intel', 'Researcher@ACME.com');
    const h2 = await hashSender('intel', 'researcher@acme.com');
    const h3 = await hashSender('security', 'researcher@acme.com');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64);
    expect(h1).not.toContain('acme');
    expect(normalizeSender('Name <Person@ACME.com>')).toBe('person@acme.com');
  });

  test('intel and security receipts carry the right IDs, SLAs and warnings', () => {
    const intel = buildMailDeskReceipt({
      desk: 'intel',
      referenceId: 'ZX-INTEL-20261127-AB12',
      subject: 'Query on CVE-2026-1',
      receivedAtUtc: '2026-11-27T09:00:00Z',
      senderEmail: 'analyst@acme.com',
    });
    expect(intel.subject).toContain('ZX-INTEL-20261127-AB12');
    expect(intel.html).toContain('Analyst response within 1 business day');
    expect(intel.html).toContain('Neural Threat Graph');
    expect(intel.text).toContain('Free API');

    const security = buildMailDeskReceipt({
      desk: 'security',
      referenceId: 'ZX-SEC-20261127-CD34',
      subject: '</td><script>alert(1)</script>',
      receivedAtUtc: '2026-11-27T09:00:00Z',
      senderEmail: 'researcher@acme.com',
    });
    expect(security.html).toContain('Initial triage within 4 hours for critical security reports');
    expect(security.html.toLowerCase()).toContain('send raw credentials');
    expect(security.html).not.toContain('<script>alert(1)</script>');
    expect(security.html).toContain('&lt;/td&gt;&lt;script&gt;');
  });

  test('classifyInbound enforces the D1 cooldown and forwarding policy', async () => {
    const db: any = {
      prepare() {
        const stmt: any = {
          bind: () => stmt,
          first: async () => ({ received_at: '2026-11-27T08:00:00Z' }),
        };
        return stmt;
      },
    };
    const decision = await classifyInbound({
      to: 'intel@zayron-x.co',
      from: 'analyst@acme.com',
      headers: headers(),
      db,
      now: new Date('2026-11-27T09:00:00Z'),
    });
    expect(decision.desk).toBe('intel');
    expect(decision.suppress).toBe(true);
    expect(decision.reason).toBe('COOLDOWN_24H');
    expect(decision.shouldForward).toBe(true);
    expect(decision.referenceId).toMatch(/^ZX-INTEL-20261127-[0-9A-F]{4}$/);
  });

  test('handleInboundEmail forwards, then auto-replies exactly once', async () => {
    const forwarded: string[] = [];
    const posts: any[] = [];
    const inserts: any[] = [];
    const db: any = {
      prepare(sql: string) {
        const stmt: any = {
          bind(...args: any[]) {
            stmt.args = args;
            return stmt;
          },
          first: async () => null,
          run: async () => {
            inserts.push({ sql, args: stmt.args });
            return { success: true };
          },
        };
        return stmt;
      },
    };
    const message = {
      from: 'analyst@acme.com',
      to: 'security@zayron-x.co',
      headers: new Headers({ subject: 'Disclosure: gateway RCE', 'message-id': '<abc@acme.com>' }),
      forward: async (to: string) => {
        forwarded.push(to);
      },
    };

    const result = await handleInboundEmail(
      message,
      { DB: db, BREVO_API_KEY: 'xkeysib-test', FOUNDER_FORWARD_EMAIL: 'founder@zayron-x.co' },
      {
        now: new Date('2026-11-27T09:00:00Z'),
        fetchFn: (async (_url: RequestInfo | URL, init?: RequestInit) => {
          posts.push(JSON.parse(String(init?.body ?? '{}')));
          return new Response(JSON.stringify({ messageId: 'm1' }), { status: 201 });
        }) as unknown as typeof fetch,
      },
    );

    expect(forwarded).toEqual(['founder@zayron-x.co']);
    expect(result.autoReplied).toBe(true);
    expect(result.desk).toBe('security');
    expect(posts).toHaveLength(1);
    expect(posts[0].to).toEqual([{ email: 'analyst@acme.com' }]);
    expect(posts[0].headers['Auto-Submitted']).toBe('auto-replied');
    expect(posts[0].headers['X-Auto-Response-Suppress']).toBe('All');
    expect(posts[0].headers['In-Reply-To']).toBe('<abc@acme.com>');
    expect(posts[0].subject).toBe('Re: Disclosure: gateway RCE');
    expect(inserts.some((i) => String(i.args).includes('AUTO_REPLIED'))).toBe(true);
  });

  test('handleInboundEmail never auto-replies to self mail or machines', async () => {
    const db: any = {
      prepare() {
        const stmt: any = {
          bind: () => stmt,
          first: async () => null,
          run: async () => ({ success: true }),
        };
        return stmt;
      },
    };
    let posts = 0;
    const fetchFn = (async () => {
      posts += 1;
      return new Response('{}', { status: 201 });
    }) as unknown as typeof fetch;

    const self = await handleInboundEmail(
      { from: 'intel@zayron-x.co', to: 'security@zayron-x.co', headers: new Headers() },
      { DB: db, BREVO_API_KEY: 'k', FOUNDER_FORWARD_EMAIL: 'f@zayron-x.co' },
      { fetchFn },
    );
    expect(self.reason).toBe('SELF_MAIL');
    expect(self.autoReplied).toBe(false);

    const machine = await handleInboundEmail(
      { from: 'noreply@acme.com', to: 'intel@zayron-x.co', headers: new Headers() },
      { DB: db, BREVO_API_KEY: 'k', FOUNDER_FORWARD_EMAIL: 'f@zayron-x.co' },
      { fetchFn },
    );
    expect(machine.reason).toBe('MACHINE_SENDER');
    expect(machine.autoReplied).toBe(false);
    expect(posts).toBe(0);
  });

  test('migration 0042 is strictly idempotent and adds the cooldown index', () => {
    const sql = readFileSync('db/migrations/0042_inbound_mail_desk_v1.sql', 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS inbound_mail_events');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_inbound_mail_cooldown');
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
  });

  test('security.txt still advertises security@zayron-x.co (RFC 9116)', () => {
    const txt = readFileSync('apps/web/public/.well-known/security.txt', 'utf8');
    expect(txt).toContain('Contact: mailto:security@zayron-x.co');
    expect(txt).toContain('Canonical: https://zayron-x.co/.well-known/security.txt');
  });
});
