#!/usr/bin/env bun
/**
 * ZAYRON-X — Telegram OSINT Ingestion Daemon
 *
 * Reads from Telegram channels via MTProto/Telegram API and inserts
 * raw messages into the `raw_feeds` table for triage in the admin panel.
 *
 * Usage:
 *   bun run scripts/telegram-ingestion.ts
 *
 * Environment variables (via .env.local):
 *   DATABASE_URL            — Supabase postgres connection string
 *   TELEGRAM_API_ID         — Telegram API app ID (my.telegram.org)
 *   TELEGRAM_API_HASH       — Telegram API app hash
 *   TELEGRAM_SESSION_STRING — Optional: saved session to avoid re-login
 *
 * Channels to monitor (edit the CHANNELS array below):
 *   Add Telegram channel @usernames or invite links.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { rawFeeds } from '../lib/db/schema';
import { INTELLIGENCE_CHANNELS } from '../lib/ingestion/channels';

// Run with: bun --env-file=.env.local scripts/telegram-ingestion.ts

/* ============================================================
 * Configuration — 30 Elite Intelligence Channels
 * ============================================================ */
const CHANNELS = INTELLIGENCE_CHANNELS.map((ch) => ({
  name: ch.name,
  identifier: ch.url.replace('https://t.me/', ''),
  lang: ch.lang,
  category: ch.category,
}));

const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds
const MAX_MESSAGES_PER_POLL = 50;

/* ============================================================
 * Database setup
 * ============================================================ */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('FATAL: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 5 });
const db = drizzle(sql, { schema: { rawFeeds } });

/* ============================================================
 * Telegram API client (MTProto via gramjs)
 * ============================================================ */
async function initTelegramClient() {
  try {
    const { TelegramClient } = await import('telegram');
    const { StringSession } = await import('telegram/sessions');

    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;

    if (!apiId || !apiHash) {
      console.warn(
        'WARN: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set for live Telegram ingestion.',
      );
      console.warn('Falling back to simulation mode.');
      return null;
    }

    const sessionStr = process.env.TELEGRAM_SESSION_STRING ?? '';
    const session = new StringSession(sessionStr);

    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      baseHash: Math.random().toString(36).slice(2, 10),
    });

    await client.start({
      phoneNumber: async () => process.env.TELEGRAM_PHONE ?? (await prompt('Enter phone: ')),
      password: async () => process.env.TELEGRAM_PASSWORD ?? (await prompt('Enter 2FA password: ')),
      phoneCode: async () => await prompt('Enter verification code: '),
      onError: (err) => console.error('Telegram auth error:', err),
    });

    console.log(`[telegram] Connected as ${client.session?.userId ?? 'unknown'}`);
    return client;
  } catch (err) {
    console.error('[telegram] Failed to initialize client:', err);
    return null;
  }
}

/* ============================================================
 * Simulated ingestion (for demo/staging without Telegram API creds)
 * Produces realistic threat intel messages so the pipeline can be tested.
 * ============================================================ */
function generateMockMessages(channel: (typeof CHANNELS)[number]): Array<{
  text: string;
  timestamp: Date;
}> {
  const now = new Date();
  const messages: Record<string, Array<{ text: string; lang: string }>> = {
    threat_intel_ru: [
      {
        text: '⚠️ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: В Microsoft Exchange Server 2025 обнаружена уязвимость CVE-2026-28471, позволяющая удаленно выполнить код. Затронуты все версии до 15.3.0. Выпущен срочный патч.',
        lang: 'ru',
      },
      {
        text: "Группа APT-28 (Fancy Bear) проводит фишинговые кампании против европейских дипломатических миссий. Используются темы приглашений на саммит НАТО. Вредоносные вложения содержат обновленный вариант бэкдора 'GooseStep'. Обнаружено более 200 целей.",
        lang: 'ru',
      },
      {
        text: 'НОВОСТИ: В даркнете обнаружена база данных 1.2 млн учетных записей пользователей популярного сервиса электронной почты. Данные включают адреса электронной почты, хеши паролей и API-ключи. Предположительно источник - утечка 2025 года.',
        lang: 'ru',
      },
      {
        text: "Обнаружен новый вариант вымогателя 'BlackCat 3.0' с функциями уклонения от EDR. Использует технику прямой системного вызова (syscall) для обхода мониторинга API. Целевые сектора: здравоохранение, энергетика.",
        lang: 'ru',
      },
      {
        text: 'СРОЧНО: Критическая уязвимость в Apache Tomcat (CVE-2026-28512) позволяет удаленно выполнить код через отправку специально созданных запросов. Затронуты версии 10.1.x до 10.1.34 и 11.0.x до 11.0.2.',
        lang: 'ru',
      },
    ],
    ransomware_feed: [
      {
        text: 'RansomHub ransomware group has claimed responsibility for attacking a major logistics provider in Germany. The group encrypted 1,500 servers and exfiltrated 3TB of sensitive corporate data. Ransom demand: $8M in Monero. Deadline: 72 hours.',
        lang: 'en',
      },
      {
        text: 'New Play ransomware variant v4.1 spotted in the wild. Key improvements: (1) Multi-threaded encryption for faster throughput, (2) Improved privilege escalation via PrintNightmare (CVE-2021-34527), (3) Exfiltration to Mega.nz and Telegram. Detected in 12 incidents this week.',
        lang: 'en',
      },
      {
        text: "ALERT: 'BrainCipher' ransomware group shifts focus to cloud infrastructure. This week's attacks targeted AWS S3 buckets with misconfigured IAM roles. Uses 'S3勒索' tool for automated encryption of cloud storage. Recommendations: enable MFA, audit bucket policies, enable versioning.",
        lang: 'en',
      },
    ],
    apt_watch_telegram: [
      {
        text: 'LATAM UPDATE: APT-C-36 (Blind Eagle) has expanded operations beyond Colombia. New targets in Peru and Chile observed. Latest campaign uses lures themed around Chilean tax authority (SII) and Peruvian customs (SUNAT). Delivers updated Blind Eagle implant with keylogging and screen capture. Observed C2: 185.234.72.x range.',
        lang: 'en',
      },
      {
        text: "NORTH KOREA: Lazarus Group shifts tactics — new campaign targets blockchain developers via fake job interviews on LinkedIn. Malicious npm packages disguised as coding challenges deliver 'VSingle' malware. Connected to $45M in crypto heists this quarter.",
        lang: 'en',
      },
      {
        text: 'CHINA-DRIVEN: Volt Typhoon (Bronze Silhouette) maintains persistent access to US critical infrastructure. New Cobalt Strike profiles using AWS CloudFront for domain fronting. Sectors targeted: energy, water treatment, transportation. TA444 activity correlated with Chinese state-sponsored espionage objectives.',
        lang: 'en',
      },
    ],
  };

  const pool = messages[channel.name] ?? [
    {
      text: `[${channel.name}] Intelligence report from ${channel.identifier}`,
      lang: 'en',
    },
  ];

  // Generate 1-3 messages per poll
  const count = Math.min(Math.floor(Math.random() * 3) + 1, pool.length);
  const selected = pool.sort(() => Math.random() - 0.5).slice(0, count);

  return selected.map((m) => ({
    text: m.text,
    timestamp: new Date(now.getTime() - Math.floor(Math.random() * 3600000)),
  }));
}

/* ============================================================
 * Check for duplicate messages before inserting
 * ============================================================ */
async function isDuplicate(rawContent: string): Promise<boolean> {
  const result = await db
    .select({ id: rawFeeds.id })
    .from(rawFeeds)
    .where(eq(rawFeeds.rawContent, rawContent))
    .limit(1);
  return result.length > 0;
}

/* ============================================================
 * Main ingestion loop
 * ============================================================ */
async function ingestMessages(channel: (typeof CHANNELS)[number], client: any | null) {
  let messages: Array<{ text: string; timestamp: Date }> = [];

  if (client) {
    // Live Telegram mode
    try {
      const entity = await client.getEntity(channel.identifier);
      const result = await client.getMessages(entity, {
        limit: MAX_MESSAGES_PER_POLL,
      });
      messages = result
        .filter((m: any) => m.message && m.message.length > 20)
        .map((m: any) => ({
          text: m.message,
          timestamp: new Date(m.date * 1000),
        }));
    } catch (err) {
      console.error(`[${channel.name}] Live fetch failed:`, err);
      return 0;
    }
  } else {
    // Simulation mode
    messages = generateMockMessages(channel);
  }

  let inserted = 0;
  for (const msg of messages) {
    const dup = await isDuplicate(msg.text);
    if (dup) continue;

    try {
      await db.insert(rawFeeds).values({
        sourceChannel: channel.name,
        rawContent: msg.text,
        originalLanguage: channel.lang,
        status: 'pending',
        timestamp: msg.timestamp,
      });
      inserted++;
      console.log(`  [+] Inserted [${channel.name}]: ${msg.text.substring(0, 80)}...`);
    } catch (err: any) {
      console.error(`  [!] Insert failed for [${channel.name}]: ${err.message}`);
    }
  }

  return inserted;
}

/* ============================================================
 * Graceful shutdown
 * ============================================================ */
let running = true;
process.on('SIGINT', () => {
  console.log('\n[!] Shutting down ingestion daemon...');
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

/* ============================================================
 * Entry point
 * ============================================================ */
async function main() {
  console.log('='.repeat(60));
  console.log('  ZAYRON-X — Telegram OSINT Ingestion Daemon');
  console.log('='.repeat(60));
  console.log(`  Channels: ${CHANNELS.map((c) => c.name).join(', ')}`);
  console.log(`  Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`  Mode: ${process.env.TELEGRAM_API_ID ? 'LIVE' : 'SIMULATION'}`);
  console.log(`  DB: ${connectionString!.substring(0, 40)}...`);
  console.log('='.repeat(60));

  const client = await initTelegramClient();

  while (running) {
    console.log(`\n[${new Date().toISOString()}] Polling ${CHANNELS.length} channels...`);

    let totalInserted = 0;
    for (const channel of CHANNELS) {
      const count = await ingestMessages(channel, client);
      totalInserted += count;
    }

    console.log(
      `[${new Date().toISOString()}] Done — ${totalInserted} new messages ingested. Raw feeds pending in admin panel: /admin/feeds`,
    );

    if (running) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  await sql.end();
  console.log('Ingestion daemon stopped.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
