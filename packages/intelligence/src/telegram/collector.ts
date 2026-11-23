import { computeContentHash } from '../normalization/pipeline';

export const BANNED_OUTBOUND_CHANNELS = new Set(['zayronxai', 'zayron_x', 'zayronx', 'zayron_app']);
export function computeShardForSource(key: string, shardCount = 6): string { const norm = (key || 'unassigned').trim().toLowerCase().replace(/^@+/, ''); let hash = 0; for (let i = 0; i < norm.length; i++) { hash = (hash << 5) - hash + norm.charCodeAt(i); hash |= 0; } const n = Math.max(1, shardCount); const shard = (Math.abs(hash) % n) + 1; return shard < 10 ? `shard_0${shard}` : `shard_${shard}`; }
export function computeShardForHandle(handle: string): string { return computeShardForSource(handle, 6); }
export interface TelegramSourceSubmission { handle?: string | null; displayName?: string; category?: string; topic?: string; language?: string; region?: string | null; authorityTier?: number | string | null; initialTrustScore?: number; }
export function normalizeTelegramHandle(handle?: string | null): string { return (handle || '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?t\.me\//, '').replace(/^@+/, '').replace(/\/.*/, ''); }
export function validateNewSourceSubmission(input: TelegramSourceSubmission): { isValid: boolean; normalizedHandle?: string; error?: string } { const normalizedHandle = normalizeTelegramHandle(input.handle); if (!normalizedHandle) return { isValid: false, error: 'HANDLE_REQUIRED' }; if (BANNED_OUTBOUND_CHANNELS.has(normalizedHandle)) return { isValid: false, normalizedHandle, error: 'CRITICAL FIREWALL REJECTION: outbound channel is not collectable' }; if (!/^[a-z0-9_]{3,64}$/.test(normalizedHandle)) return { isValid: false, normalizedHandle, error: 'INVALID_TELEGRAM_HANDLE' }; return { isValid: true, normalizedHandle }; }
export function buildCanonicalTelegramSource(input: TelegramSourceSubmission): any { const validation = validateNewSourceSubmission(input); if (!validation.isValid) throw new Error(validation.error); const handle = validation.normalizedHandle!; // Authority tier 4 = unverified: an operator-submitted public channel carries no
  // established authority until it is assessed.
  return { id: `tg_${handle}`, handle, title: input.displayName || handle, channelId: null, displayName: input.displayName || handle, url: `https://t.me/${handle}`, type: 'telegram', collectorId: null, category: input.category || 'GENERAL', topic: input.topic || null, language: input.language || 'en', region: input.region ?? null, authorityTier: input.authorityTier ?? 4, verificationStatus: 'NEW', monitoringStatus: 'MONITORED', eligibilityStatus: 'UNSUPPORTED', enabled: true, status: 'ENABLED', trustScore: input.initialTrustScore ?? 0.5, shardId: computeShardForHandle(handle) }; }
export function classifyTelegramSource(title = '', handle = ''): { category: string; subcategories: string[] } { const text = `${title} ${handle}`.toLowerCase(); if (/cve|vuln|exploit|security advisory/.test(text)) return { category: 'VULNERABILITIES', subcategories: ['EXPLOITS', 'ADVISORIES'] }; if (/malware|ransom/.test(text)) return { category: 'MALWARE', subcategories: ['THREAT_INTEL'] }; return { category: 'THREAT_INTEL', subcategories: [] }; }
// `telegram_id` is accepted for entity-shape symmetry with discovery callers; eligibility itself
// is decided from the handle and entity_type.
export function evaluateSourceEligibility(entity: { telegram_id?: string; handle?: string | null; title?: string; entity_type?: string }): { eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'BLOCKED'; reason: string } { const handle = normalizeTelegramHandle(entity.handle); if (BANNED_OUTBOUND_CHANNELS.has(handle)) return { eligibility: 'BLOCKED', reason: 'ANTI_RECURSION_FIREWALL' }; if (!handle || entity.entity_type === 'chat' && !entity.handle) return { eligibility: 'INELIGIBLE', reason: 'PERSONAL_OR_DIRECT_CHAT' }; return { eligibility: 'ELIGIBLE', reason: 'PUBLIC_CHANNEL_WITH_HANDLE' }; }
export function buildAutoDiscoveredSource(entity: { telegram_id?: string; handle?: string | null; title?: string; entity_type?: string }, shardCount = 6): any { const eligibility = evaluateSourceEligibility(entity); const handle = normalizeTelegramHandle(entity.handle); const classification = classifyTelegramSource(entity.title, handle); const blocked = eligibility.eligibility !== 'ELIGIBLE'; return { id: `tg_${handle || entity.telegram_id || 'unknown'}`, handle: handle || null, title: entity.title || handle, category: classification.category, subcategories: classification.subcategories, status: blocked ? eligibility.eligibility : 'ENABLED', enabled: !blocked, monitoringStatus: blocked ? eligibility.eligibility : 'MONITORED', verificationStatus: 'NEW', trustScore: blocked ? 0 : 0.5, shardId: computeShardForSource(handle || entity.telegram_id || 'unassigned', shardCount), eligibilityStatus: eligibility.eligibility }; }

export interface TelegramRawMessageEnvelope {
  sourceId: string;
  externalMessageId: string;
  externalChannelId?: string;
  rawText: string;
  caption?: string;
  sourceUrl?: string;
  publishedAt?: string;
  receivedAt?: string;
  mediaFileId?: string;
  mediaType?: 'photo' | 'document' | 'video';
  authorSignature?: string;
  forwardFrom?: string;
  rawMetadata?: Record<string, unknown>;
}

export interface IngestQueuePayload {
  sourceId: string;
  externalMessageId: string;
  externalChannelId?: string;
  contentHash: string;
  rawText: string;
  sourceUrl?: string;
  publishedAt: string;
  receivedAt: string;
  mediaFileId?: string;
  metadata?: Record<string, unknown>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_message?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: {
    id: number;
    title?: string;
    username?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
  };
  text?: string;
  caption?: string;
  author_signature?: string;
  forward_from_chat?: {
    id: number;
    title?: string;
    username?: string;
  };
  photo?: Array<{ file_id: string }>;
  document?: { file_id: string; file_name?: string };
  video?: { file_id: string };
}

/**
 * Parses raw Telegram Bot API Update payload into a canonical TelegramRawMessageEnvelope.
 */
export function parseTelegramBotUpdate(
  update: TelegramUpdate,
  knownSourceMap?: Record<string, string>
): TelegramRawMessageEnvelope | null {
  const msg = update.channel_post || update.message || update.edited_channel_post || update.edited_message;
  if (!msg) {
    return null;
  }

  const rawText = (msg.text || msg.caption || '').trim();
  if (!rawText) {
    return null;
  }

  const username = msg.chat.username ? msg.chat.username.toLowerCase() : '';
  const chatId = String(msg.chat.id);
  
  // Resolve sourceId using known mappings or default formatting
  let sourceId = `tg_${username || chatId}`;
  if (knownSourceMap) {
    if (username && knownSourceMap[username]) {
      sourceId = knownSourceMap[username];
    } else if (knownSourceMap[chatId]) {
      sourceId = knownSourceMap[chatId];
    }
  }

  const externalMessageId = String(msg.message_id);
  const sourceUrl = username 
    ? `https://t.me/${username}/${externalMessageId}` 
    : undefined;

  let mediaType: 'photo' | 'document' | 'video' | undefined;
  let mediaFileId: string | undefined;

  if (msg.photo && msg.photo.length > 0) {
    mediaType = 'photo';
    mediaFileId = msg.photo[msg.photo.length - 1].file_id;
  } else if (msg.document) {
    mediaType = 'document';
    mediaFileId = msg.document.file_id;
  } else if (msg.video) {
    mediaType = 'video';
    mediaFileId = msg.video.file_id;
  }

  const publishedAt = new Date(msg.date * 1000).toISOString();
  const receivedAt = new Date().toISOString();

  return {
    sourceId,
    externalMessageId,
    externalChannelId: chatId,
    rawText,
    caption: msg.caption,
    sourceUrl,
    publishedAt,
    receivedAt,
    mediaFileId,
    mediaType,
    authorSignature: msg.author_signature,
    forwardFrom: msg.forward_from_chat?.username || (msg.forward_from_chat ? String(msg.forward_from_chat.id) : undefined),
    rawMetadata: {
      update_id: update.update_id,
      chat_title: msg.chat.title,
      chat_type: msg.chat.type,
    },
  };
}

/**
 * Builds standard Ingest Queue payloads with SHA-256 idempotency hash.
 */
export async function buildTelegramIngestPayload(
  envelope: TelegramRawMessageEnvelope
): Promise<IngestQueuePayload> {
  const contentHash = await computeContentHash(envelope.rawText);

  return {
    sourceId: envelope.sourceId,
    externalMessageId: envelope.externalMessageId,
    externalChannelId: envelope.externalChannelId,
    contentHash,
    rawText: envelope.rawText,
    sourceUrl: envelope.sourceUrl || `https://t.me/${envelope.sourceId.replace('tg_', '')}/${envelope.externalMessageId}`,
    publishedAt: envelope.publishedAt || new Date().toISOString(),
    receivedAt: envelope.receivedAt || new Date().toISOString(),
    mediaFileId: envelope.mediaFileId,
    metadata: {
      caption: envelope.caption,
      mediaType: envelope.mediaType,
      authorSignature: envelope.authorSignature,
      forwardFrom: envelope.forwardFrom,
      rawMetadata: envelope.rawMetadata,
    },
  };
}
