import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';

export interface Env {
  TELEGRAM_COLLECTOR_DO: DurableObjectNamespace;
  INGEST_QUEUE: Queue;
  DB: D1Database;
  ENVIRONMENT: string;
  API_ID: number;
  API_HASH: string;
}

export interface CollectorTelemetry {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'FLOOD_WAIT' | 'DRAINING';
  session_active: boolean;
  messages_received: number;
  messages_dispatched: number;
  duplicates_dropped: number;
  errors_count: number;
  flood_wait_seconds_remaining: number;
  reconnect_attempts: number;
  last_received_at: string | null;
  last_success_at: string | null;
  last_error_message: string | null;
  uptime_seconds: number;
  monitored_channels: string[];
}

export class TelegramCollectorDO {
  private ctx: DurableObjectState;
  private env: Env;
  private client: TelegramClient | null = null;
  private status: CollectorTelemetry['status'] = 'DISCONNECTED';
  private startTime: number = Date.now();
  private messagesReceived: number = 0;
  private messagesDispatched: number = 0;
  private duplicatesDropped: number = 0;
  private errorsCount: number = 0;
  private floodWaitRemaining: number = 0;
  private reconnectAttempts: number = 0;
  private lastReceivedAt: string | null = null;
  private lastSuccessAt: string | null = null;
  private lastErrorMessage: string | null = null;
  private monitoredChannels: string[] = [
    'cveNotify', 'PentestingNews', 'blueteamalerts', 'aptreports', 'xakep_ru',
    'thehackernews', 'vxunderground', 'seclabnews', 'anti_malware', 'iran_cyber'
  ];
  private knownHashes: Set<string> = new Set();
  private isConnecting: boolean = false;

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;

    // Restore state from persistent storage
    this.ctx.blockConcurrencyWhile(async () => {
      await this.restoreState();
    });
  }

  private async restoreState(): Promise<void> {
    try {
      const stored = await this.ctx.storage.get<{
        messagesReceived?: number;
        messagesDispatched?: number;
        duplicatesDropped?: number;
        errorsCount?: number;
        monitoredChannels?: string[];
      }>('telemetry_state');

      if (stored) {
        this.messagesReceived = stored.messagesReceived || 0;
        this.messagesDispatched = stored.messagesDispatched || 0;
        this.duplicatesDropped = stored.duplicatesDropped || 0;
        this.errorsCount = stored.errorsCount || 0;
        if (stored.monitoredChannels && stored.monitoredChannels.length > 0) {
          this.monitoredChannels = stored.monitoredChannels;
        }
      }
    } catch (err: any) {
      console.error('[TelegramCollectorDO] State restore error:', err);
    }
  }

  private async persistState(): Promise<void> {
    try {
      await this.ctx.storage.put('telemetry_state', {
        messagesReceived: this.messagesReceived,
        messagesDispatched: this.messagesDispatched,
        duplicatesDropped: this.duplicatesDropped,
        errorsCount: this.errorsCount,
        monitoredChannels: this.monitoredChannels,
      });
    } catch (err: any) {
      console.error('[TelegramCollectorDO] State persist error:', err);
    }
  }

  /**
   * Periodic DO Alarm for keepalive, health check, and dynamic source refresh.
   */
  async alarm(): Promise<void> {
    console.log('[TelegramCollectorDO] Alarm fired: verifying connectivity & syncing sources.');
    try {
      await this.syncSourcesFromD1();
      
      // If disconnected and session exists, attempt reconnect
      if (this.status !== 'CONNECTED' && !this.isConnecting) {
        const sessionStr = await this.ctx.storage.get<string>('telegram_session');
        if (sessionStr) {
          await this.connect(sessionStr);
        }
      }
    } catch (err: any) {
      console.error('[TelegramCollectorDO] Alarm execution error:', err);
    } finally {
      // Schedule next alarm in 60s
      await this.ctx.storage.setAlarm(Date.now() + 60000);
    }
  }

  /**
   * Synchronizes monitored threat channels dynamically from D1 sources table.
   */
  async syncSourcesFromD1(): Promise<string[]> {
    try {
      const { results } = await this.env.DB.prepare(
        'SELECT id, display_name, url FROM sources WHERE enabled = 1'
      ).all();

      const newChannels: string[] = [];
      for (const row of results as any[]) {
        const url = row.url || '';
        const display = row.display_name || '';
        if (url.includes('t.me/')) {
          const uname = url.split('t.me/')[1]?.split('/')[0]?.replace('@', '');
          if (uname && !newChannels.includes(uname)) newChannels.push(uname);
        } else if (display.startsWith('@')) {
          const uname = display.replace('@', '');
          if (uname && !newChannels.includes(uname)) newChannels.push(uname);
        }
      }

      if (newChannels.length > 0) {
        this.monitoredChannels = newChannels;
        await this.persistState();
      }
      return this.monitoredChannels;
    } catch (err: any) {
      console.warn('[TelegramCollectorDO] D1 source sync error:', err);
      return this.monitoredChannels;
    }
  }

  /**
   * Connects to Telegram MTProto using persistent StringSession.
   */
  async connect(providedSessionStr?: string): Promise<{ success: boolean; message: string }> {
    if (this.isConnecting) {
      return { success: false, message: 'Connection attempt already in progress' };
    }

    this.isConnecting = true;
    let sessionStr = providedSessionStr || await this.ctx.storage.get<string>('telegram_session');

    if (!sessionStr) {
      this.status = 'DISCONNECTED';
      this.isConnecting = false;
      return { success: false, message: 'No session found. Please initialize session first.' };
    }

    try {
      this.status = 'CONNECTING';
      const apiId = Number(this.env.API_ID) || 37585861;
      const apiHash = this.env.API_HASH || 'e38c7289b2050a99557bcc0d1813cfac';

      const session = new StringSession(sessionStr);
      this.client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
        useWSS: true, // Use WebSocket MTProto transport for Cloudflare V8 compatibility
      });

      await this.client.connect();

      const isAuth = await this.client.checkAuthorization();
      if (!isAuth) {
        this.status = 'DISCONNECTED';
        this.lastErrorMessage = 'Session string is not authorized';
        this.isConnecting = false;
        return { success: false, message: 'Session is not authorized' };
      }

      // Persist verified session
      await this.ctx.storage.put('telegram_session', sessionStr);

      this.status = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.isConnecting = false;

      // Register live message handler
      this.client.addEventHandler(async (event: NewMessageEvent) => {
        await this.handleIncomingMessage(event);
      }, new NewMessage({}));

      // Ensure alarm is scheduled for lifecycle keepalive
      await this.ctx.storage.setAlarm(Date.now() + 60000);

      console.log(`[TelegramCollectorDO] Connected to Telegram MTProto. Monitoring ${this.monitoredChannels.length} channels.`);
      return { success: true, message: 'Connected to Telegram MTProto successfully' };
    } catch (err: any) {
      this.isConnecting = false;
      this.status = 'RECONNECTING';
      this.reconnectAttempts++;
      this.errorsCount++;
      this.lastErrorMessage = err.message || 'Connection error';
      console.error('[TelegramCollectorDO] MTProto Connection failed:', err);
      return { success: false, message: `Connection error: ${err.message}` };
    }
  }

  /**
   * Processes live message from Telegram and enqueues to zayron-ingest-queue.
   */
  async handleIncomingMessage(event: NewMessageEvent): Promise<void> {
    try {
      const message = event.message;
      const text = message.text || message.message || '';
      if (!text || text.trim().length < 10) return;

      this.messagesReceived++;
      this.lastReceivedAt = new Date().toISOString();

      // Compute SHA-256 content hash
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(text.trim()));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (this.knownHashes.has(contentHash)) {
        this.duplicatesDropped++;
        return;
      }
      this.knownHashes.add(contentHash);
      if (this.knownHashes.size > 10000) {
        const first = this.knownHashes.values().next().value;
        if (first) this.knownHashes.delete(first);
      }

      const chat: any = await event.getChat();
      const channelTitle = chat?.title || 'Telegram Channel';
      const channelUsername = chat?.username || null;
      const channelId = chat?.id ? Number(chat.id) : 0;
      const messageId = Number(message.id);
      const timestamp = message.date ? Number(message.date) : Math.floor(Date.now() / 1000);

      const sourceId = channelUsername ? `tg_${channelUsername}` : `tg_${Math.abs(channelId)}`;

      // Construct canonical ingestion payload
      const payload = {
        sourceId,
        sourceName: channelTitle,
        externalMessageId: String(messageId),
        externalChannelId: String(channelId),
        contentHash,
        rawText: text,
        sourceUrl: channelUsername ? `https://t.me/${channelUsername}/${messageId}` : undefined,
        publishedAt: new Date(timestamp * 1000).toISOString(),
        receivedAt: new Date().toISOString(),
      };

      // Dispatch directly to Cloudflare Queue
      await this.env.INGEST_QUEUE.send(payload);

      this.messagesDispatched++;
      this.lastSuccessAt = new Date().toISOString();
      await this.persistState();

      console.log(`[TelegramCollectorDO] Dispatched signal from ${channelTitle} [MsgID: ${messageId}] to INGEST_QUEUE`);
    } catch (err: any) {
      this.errorsCount++;
      this.lastErrorMessage = err.message || 'Message processing error';
      console.error('[TelegramCollectorDO] Message handler error:', err);
    }
  }

  /**
   * Fetches recent messages from a channel (for backfill / test verification).
   */
  async fetchChannelRecent(channelUsername: string, limit: number = 3): Promise<any[]> {
    if (!this.client || this.status !== 'CONNECTED') {
      throw new Error('Telegram client is not connected');
    }

    try {
      const entity = await this.client.getEntity(channelUsername);
      const messages = await this.client.getMessages(entity, { limit });
      const results = [];

      for (const m of messages) {
        if (m.text && m.text.trim().length > 10) {
          results.push({
            id: m.id,
            date: m.date,
            text: m.text.slice(0, 200),
          });
        }
      }
      return results;
    } catch (err: any) {
      console.error(`[TelegramCollectorDO] Fetch error for @${channelUsername}:`, err);
      throw err;
    }
  }

  /**
   * Returns live telemetry state.
   */
  getHealthState(): CollectorTelemetry {
    return {
      status: this.status,
      session_active: this.status === 'CONNECTED',
      messages_received: this.messagesReceived,
      messages_dispatched: this.messagesDispatched,
      duplicates_dropped: this.duplicatesDropped,
      errors_count: this.errorsCount,
      flood_wait_seconds_remaining: this.floodWaitRemaining,
      reconnect_attempts: this.reconnectAttempts,
      last_received_at: this.lastReceivedAt,
      last_success_at: this.lastSuccessAt,
      last_error_message: this.lastErrorMessage,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      monitored_channels: this.monitoredChannels,
    };
  }

  /**
   * HTTP request handler for the Durable Object instance.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health' || path === '/status') {
      return new Response(JSON.stringify({
        status: 'SUCCESS',
        collector: this.getHealthState(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/connect' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const result = await this.connect(body?.session);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/session' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      if (!body?.session) {
        return new Response(JSON.stringify({ error: 'Missing session string' }), { status: 400 });
      }
      await this.ctx.storage.put('telegram_session', body.session);
      return new Response(JSON.stringify({ status: 'SUCCESS', message: 'Session stored in Durable Object SQLite' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/me' && request.method === 'GET') {
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const me = await this.client!.getMe() as any;
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          account: {
            id: me?.id?.toString(),
            firstName: me?.firstName,
            lastName: me?.lastName,
            username: me?.username,
            phone: me?.phone ? `***${me.phone.slice(-4)}` : null,
            bot: me?.bot || false,
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/dialogs' && request.method === 'GET') {
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const dialogs = await this.client!.getDialogs({});
        const list = dialogs.map((d: any) => ({
          id: d.id?.toString(),
          title: d.title || d.name,
          isChannel: d.isChannel,
          isGroup: d.isGroup,
          isUser: d.isUser,
          unreadCount: d.unreadCount,
          entity: {
            id: d.entity?.id?.toString(),
            username: d.entity?.username,
            title: d.entity?.title,
            adminRights: d.entity?.adminRights ? true : false,
            creator: d.entity?.creator ? true : false,
            broadcast: d.entity?.broadcast ? true : false,
            megagroup: d.entity?.megagroup ? true : false,
          }
        }));
        return new Response(JSON.stringify({ status: 'SUCCESS', count: list.length, dialogs: list }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/publish' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as any;
        const target = body?.target || body?.channel;
        const message = body?.message;
        if (!target || !message) {
          return new Response(JSON.stringify({ error: 'Missing target or message' }), { status: 400 });
        }
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const entity = await this.client!.getEntity(target);
        const sent = await this.client!.sendMessage(entity, { message }) as any;
        return new Response(JSON.stringify({
          status: 'SUCCESS',
          message_id: sent.id,
          date: sent.date,
          chat_id: sent.chatId?.toString() || sent.peerId?.channelId?.toString(),
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    if (path === '/sync' && request.method === 'POST') {
      const sources = await this.syncSourcesFromD1();
      return new Response(JSON.stringify({ status: 'SUCCESS', channels: sources }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (path === '/dispatch-signal' && request.method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      const channel = body?.channel || 'cveNotify';
      try {
        if (!this.client || this.status !== 'CONNECTED') {
          await this.connect();
        }
        const entity = await this.client!.getEntity(channel);
        const messages = await this.client!.getMessages(entity, { limit: 1 });
        if (!messages || messages.length === 0 || !messages[0].text) {
          return new Response(JSON.stringify({ error: 'No message found' }), { status: 404 });
        }

        const msg = messages[0];
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(msg.text.trim()));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const payload = {
          sourceId: `tg_${channel}`,
          sourceName: `@${channel}`,
          externalMessageId: String(msg.id),
          contentHash,
          rawText: msg.text,
          sourceUrl: `https://t.me/${channel}/${msg.id}`,
          publishedAt: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
          receivedAt: new Date().toISOString(),
        };

        await this.env.INGEST_QUEUE.send(payload);
        this.messagesReceived++;
        this.messagesDispatched++;
        this.lastReceivedAt = new Date().toISOString();
        this.lastSuccessAt = new Date().toISOString();
        await this.persistState();

        return new Response(JSON.stringify({
          status: 'SUCCESS',
          message: 'Signal dispatched directly from Cloudflare DO to INGEST_QUEUE',
          payload: {
            sourceId: payload.sourceId,
            messageId: payload.externalMessageId,
            contentHash: payload.contentHash,
            preview: msg.text.slice(0, 100),
          }
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}
