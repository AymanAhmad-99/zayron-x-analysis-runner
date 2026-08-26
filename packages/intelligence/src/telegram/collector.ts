import { computeContentHash } from '../normalization/pipeline';

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
