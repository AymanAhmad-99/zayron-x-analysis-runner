import {
  normalizeIntelligenceSignal,
  validateEnglishQuality,
  resolveActor,
  resolveMalware,
  resolveVulnerability,
  extractGraphRelations,
  lookupTTP,
  detectCampaignCandidate,
  generatePlatformDerivatives,
  formatEvidenceGroundedDossier,
  EvidencePack,
  matchCanonicalEvent,
  detectSourceConflicts,
  evaluateCorroboration,
  ExistingCanonicalEvent,
  IncomingSignalObservation,
  CVESourceAdapter,
  mapCisaKevRecord,
  validateStructuredCVERecord,
} from '@zayron/intelligence';
import {
  dispatchVulnerabilityAnalysis as dispatchAnalysis,
  isVulnerabilityAnalysisEligible,
  reportIsValid,
} from './analysisDispatch';
import { checkAIAvailability } from './aiAvailability';
import { assessExploitationEvidence } from './exploitationEvidence';
import { filterSaneHashes } from './hashSanity';
import { runAuthoritativeVulnIngest } from './authoritativeVulnIngest';
import { authoritativeCronEnabled, runAuthoritativePulse } from './authoritativePulse';
import { runStrategicPass } from './strategicCveAnalysis';
import { WorkerEntrypoint } from 'cloudflare:workers';

export interface Env {
  DB: D1Database;
  INGEST_QUEUE?: Queue;
  STORAGE?: R2Bucket;
  AI?: any;
  VECTORIZE?: any;
  PUBLISH_QUEUE?: Queue;
  TELEGRAM_COLLECTOR_SERVICE?: Fetcher;
  TELEGRAM_TARGET_CHANNEL?: string;
  LEGACY_FREEZE?: string;
  /** Phase 4A — opens ONLY the authoritative NVD/KEV/EPSS pulse while the legacy
   *  surface stays frozen. Any other value (including absent) keeps it closed. */
  AUTHORITATIVE_CVE_CRON_ENABLED?: string;
  /** Optional NVD API key — raises the public rate limit, never required. */
  NVD_API_KEY?: string;
  /** Phase 4A — strategic brief generation. Absent means a clean skip. */
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  /** Preview-only RPC into the API worker's strategic engine (owns the key). */
  STRATEGIC_ANALYST?: { analyze(input: { limit?: number }): Promise<any> };
  RESEARCH_WORKFLOW?: any;
  KNOWLEDGE_PROCESSOR?: any;
  KNOWLEDGE_BUCKET?: R2Bucket;
  KNOWLEDGE_CORPUS_WORKFLOW?: any;
  /** Preview-only internal RPC to the existing analyst-grade CVE pipeline (API worker).
   *  Bound via a service binding to zayron-x-api-preview entrypoint VulnerabilityAnalyst.
   *  Absent in production, so continuous ingestion dispatch is inert there. */
  VULNERABILITY_ANALYST?: {
    analyzeVulnerability(input: { cveId: string }): Promise<{
      status: number;
      ok: boolean;
      cveId: string;
      reportPresent?: boolean;
      /** What the analysis boundary actually decided — transport success says nothing. */
      publication?: string | null;
      analysis_status?: string | null;
      failure_class?: string | null;
      error_code?: string | null;
      publication_write?: string | null;
      error?: string;
      latency_ms?: number;
    }>;
  };
  ENVIRONMENT: string;
}

interface IngestionMessagePayload {
  job_type?: 'CVE_PROCESS' | string;
  cve_id?: string;
  source_reference?: string;
  pipeline_version?: string;
  eventId?: string;
  sourceId: string;
  sourceName?: string;
  sourceTrustScore?: number;
  externalMessageId: string;
  externalChannelId?: string;
  contentHash: string;
  rawText: string;
  sourceUrl?: string;
  publishedAt?: string;
  receivedAt?: string;
  mediaFileId?: string;
  metadata?: Record<string, unknown>;
  testRun?: boolean;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function validSourceTimestamp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 5 * 60 * 1000) return undefined;
  return date.toISOString();
}

function feedSourceType(sourceId: string): string {
  if (sourceId === 'nvd-api') return 'api';
  if (sourceId === 'msrc-advisory') return 'vendor';
  if (sourceId === 'cisa-rss' || sourceId === 'cisa-kev') return 'rss';
  return 'telegram';
}

async function ensureFeedSource(env: Env, sourceId: string, sourceName?: string): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO sources (
      id, display_name, source_type, language, region, trust_score, priority, status, enabled, created_at, updated_at
    ) VALUES (?, ?, ?, 'en', 'global', 0.5, 'B', 'ENABLED', 1, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      source_type = excluded.source_type,
      display_name = excluded.display_name,
      updated_at = datetime('now')`
  )
    .bind(sourceId, sourceName || sourceId, feedSourceType(sourceId))
    .run();
}

async function enqueueExternalSignal(env: Env, payload: Omit<IngestionMessagePayload, 'contentHash'> & { contentHash?: string }) {
  if (!env.INGEST_QUEUE) throw new Error('INGEST_QUEUE is not configured');
  await ensureFeedSource(env, payload.sourceId, payload.sourceName);
  const contentHash = payload.contentHash || await sha256Hex(payload.rawText);
  await env.INGEST_QUEUE.send({ ...payload, contentHash });
}

/** Idempotency guard: a valid structured report already exists for this CVE.
 *  Reuses the existing report identity (intelligence_id / deduplication_key). */
async function hasValidStructuredReport(env: Env, cveId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT status, publication_status, structured_report_json
     FROM intelligence_reports
     WHERE intelligence_id = ? OR UPPER(intelligence_id) = ?
        OR deduplication_key = ? OR deduplication_key = ?
     ORDER BY updated_at DESC LIMIT 1`
  )
    .bind(cveId, cveId, `cisa-kev:${cveId}`, `nvd-api:${cveId}`)
    .first<any>();
  return reportIsValid(row);
}

/**
 * Dispatch one canonical vulnerability to the EXISTING analyst-grade AI pipeline.
 *
 * Failure isolation + idempotency are enforced by the shared dispatch contract
 * (see analysisDispatch.ts). This adapter only wires it to D1 + the service binding.
 */
function dispatchVulnerabilityAnalysis(env: Env, cveId: string, traceId: string, eligible: boolean) {
  return dispatchAnalysis({
    cveId,
    eligible,
    analyst: env.VULNERABILITY_ANALYST,
    hasValidReport: (id) => hasValidStructuredReport(env, id),
    onTrace: async (stage, status) => {
      await recordTrace(env, traceId, `analysis_${cveId}`, stage, status, 1, Date.now(), cveId);
    },
    onError: (error) => console.error('[INGEST] Vulnerability AI analysis dispatch failed (non-fatal):', error),
    // A dispatch that did not publish is now a NAMED outcome rather than a silent
    // `COMPLETED` trace: withheld, provider failure, circuit rejection and gate-blocked
    // content are distinguishable at the dispatch layer for the first time.
    onUnpublished: (outcome) => {
      console.warn(JSON.stringify({ type: 'AI_ANALYSIS_NOT_PUBLISHED', cve_id: cveId, outcome }));
    },
  });
}

async function recordTrace(env: Env, traceId: string, eventId: string, stage: string, status: string, attempt: number, startedAt: number, resourceId?: string, error?: unknown) {
  await env.DB.prepare(
    `INSERT INTO event_trace (trace_id,event_id,stage,status,attempt,started_at,completed_at,duration_ms,resource_id,error_code,error_message)
     VALUES (?,?,?,?,?,datetime(? / 1000,'unixepoch'),datetime('now'),?,?,?,?)`,
  ).bind(traceId, eventId, stage, status, attempt, startedAt, Date.now() - startedAt, resourceId || null,
    error ? 'STAGE_ERROR' : null, error ? String(error).slice(0, 500) : null).run();
}

async function recordKnowledgeMarker(env: Env, traceId: string, requestId: string, stage: string, startedAt: number, error?: unknown) {
  await recordTrace(env, traceId, requestId, stage, error ? 'FAILED' : 'COMPLETED', 1, startedAt, requestId, error);
}

async function persistEvidence(env: Env, input: {
  id: string; eventId: string; sourceId: string; sourceMessageId: string; type: string;
  url?: string; weight: number; snippet?: string;
}): Promise<string> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO evidence (
      id, event_id, source_id, source_message_id, type, url, weight, snippet, reviewer_state, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UNREVIEWED', datetime('now'), datetime('now'))`
  ).bind(input.id, input.eventId, input.sourceId, input.sourceMessageId, input.type, input.url || null, input.weight, input.snippet || null).run();
  const row = await env.DB.prepare(
    `SELECT id FROM evidence
     WHERE event_id = ? AND source_message_id = ? AND type = ?
       AND COALESCE(url, '') = COALESCE(?, '') AND COALESCE(snippet, '') = COALESCE(?, '')
     ORDER BY created_at ASC LIMIT 1`
  ).bind(input.eventId, input.sourceMessageId, input.type, input.url || null, input.snippet || null).first<{ id: string }>();
  if (!row?.id) throw new Error('Evidence persistence returned no canonical row');
  return row.id;
}

const ingestHandlers = {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    // ── Phase 4A: SELECTIVE UNFREEZE ─────────────────────────────────────────
    // The freeze stays authoritative for the LEGACY surface. It no longer also
    // disables authoritative facts: with AUTHORITATIVE_CVE_CRON_ENABLED="true"
    // this pass runs the NVD + CISA KEV + FIRST EPSS pipeline (and the bounded
    // strategic layer) and returns BEFORE any legacy path below — no RSS/KEV/
    // MSRC queue enqueue, no AI smoke test, no outbound publication.
    if (env.LEGACY_FREEZE === 'true') {
      if (!authoritativeCronEnabled(env)) {
        console.log(JSON.stringify({ type: 'AUTHORITATIVE_CVE_PULSE_DISABLED', reason: 'FLAG_ABSENT' }));
        return;
      }
      try {
        const pulse = await runAuthoritativePulse(env as any, { trigger: _controller?.cron || 'scheduled' });
        console.log(JSON.stringify({ type: 'AUTHORITATIVE_CVE_PULSE', ...pulse }));
      } catch (error) {
        console.error(JSON.stringify({
          type: 'AUTHORITATIVE_CVE_PULSE_FAILED',
          error: String((error as Error)?.message || error).slice(0, 300),
        }));
      }
      return;
    }
    const smokeTraceId = `trace_${crypto.randomUUID().slice(0, 12)}`;
    const smokeTelemetry = await checkAIAvailability(
      env.KNOWLEDGE_PROCESSOR ? () => env.KNOWLEDGE_PROCESSOR!.smokeTest({ trace_id: smokeTraceId }) : undefined,
      async (telemetry) => {
        if (telemetry.ok) {
          console.log(JSON.stringify({ type: 'KNOWLEDGE_AI_SMOKE_TEST', trace_id: smokeTraceId, ...telemetry }));
          await recordTrace(env, smokeTraceId, 'scheduled_ai_smoke_test', 'AI_SMOKE_TEST', 'COMPLETED', 1, Date.now() - telemetry.duration_ms);
        } else {
          console.error(JSON.stringify({ type: 'KNOWLEDGE_AI_SMOKE_TEST_FAILED', trace_id: smokeTraceId, error: telemetry.error }));
          await recordTrace(env, smokeTraceId, 'scheduled_ai_smoke_test', 'AI_SMOKE_TEST', 'FAILED', 1, Date.now() - telemetry.duration_ms, undefined, telemetry.error);
        }
      },
    );
    if (!smokeTelemetry.ok) {
      console.warn(JSON.stringify({ type: 'SOURCE_INGESTION_CONTINUES_WITH_AI_UNAVAILABLE', trace_id: smokeTraceId }));
    }
    const rssResponse = await fetch('https://www.cisa.gov/cybersecurity-advisories/all.xml', { headers: { accept: 'application/rss+xml, application/xml' } });
    if (rssResponse.ok) {
      const xml = await rssResponse.text();
      const item = xml.match(/<item>[\s\S]*?<\/item>/i)?.[0];
      if (item) {
        const readTag = (tag: string) => item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const title = readTag('title') || 'CISA advisory';
        const link = readTag('link') || 'https://www.cisa.gov/cybersecurity-advisories/all.xml';
        const publishedAt = validSourceTimestamp(readTag('pubDate') || readTag('published'));
        const rawText = `${title}\n${readTag('description') || ''}`.slice(0, 12000);
        await enqueueExternalSignal(env, { sourceId: 'cisa-rss', sourceName: 'CISA Advisories RSS', externalMessageId: link, rawText, sourceUrl: link, publishedAt, receivedAt: new Date().toISOString() });
      }
    }

    const nvdStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const nvdResponse = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${encodeURIComponent(nvdStart)}&resultsPerPage=20`, { headers: { accept: 'application/json' } });
    if (nvdResponse.ok) {
      const data = await nvdResponse.json() as any;
      for (const item of (data.vulnerabilities || []).slice(0, 5)) {
        const cve = item.cve;
        const cveId = cve?.id;
        if (!cveId) continue;
        const description = cve.descriptions?.find((entry: any) => entry.lang === 'en')?.value || '';
        const publishedAt = validSourceTimestamp(cve.published);
        await enqueueExternalSignal(env, { sourceId: 'nvd-api', sourceName: 'NIST National Vulnerability Database', externalMessageId: cveId, rawText: `${cveId}: ${description}`.slice(0, 12000), sourceUrl: `https://nvd.nist.gov/vuln/detail/${cveId}`, publishedAt, receivedAt: new Date().toISOString(), metadata: { authoritative: true, cvss: cve.metrics } });
      }
    }

    // Batch A: CISA KEV and one official vendor feed use the same queue contract.
    try {
      const kevResponse = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { headers: { accept: 'application/json' } });
      if (kevResponse.ok) {
        const kev = await kevResponse.json() as any;
        const persistedRows = await env.DB.prepare('SELECT cve_id FROM vulnerabilities').all<{ cve_id: string }>().catch(() => ({ results: [] }));
        const persistedSet = new Set((persistedRows.results || []).map(r => r.cve_id));
        const unpersisted = (kev.vulnerabilities || []).filter((item: any) => item?.cveID && !persistedSet.has(item.cveID));
        for (const item of unpersisted.slice(0, 50)) {
          if (!item?.cveID) continue;
          const cveHash = await sha256Hex(`CISA_KEV:${item.cveID}:${kev.dateReleased || 'unknown'}`);
          await enqueueExternalSignal(env, {
            sourceId: 'cisa-kev', sourceName: 'CISA Known Exploited Vulnerabilities',
            externalMessageId: item.cveID, contentHash: cveHash,
            job_type: 'CVE_PROCESS', cve_id: item.cveID,
            source_reference: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
            pipeline_version: 'cve-core-v1',
            rawText: `${item.cveID}: ${item.vulnerabilityName || ''}. ${item.shortDescription || ''}`.slice(0, 12000),
            sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
            publishedAt: validSourceTimestamp(item.dateAdded), receivedAt: new Date().toISOString(),
            metadata: { authoritative: true, authority_tier: 1, catalog: 'CISA KEV', version: kev.dateReleased, cve_item: item },
          });
        }
      }
    } catch (kevErr) {
      console.warn('[INGEST] CISA KEV scheduled feed check error:', kevErr);
    }

    // Gate 3A.3 — authoritative CVE ingestion (NVD + CISA KEV + FIRST EPSS) into
    // the operational corpus. Runs from the existing schedule; a failure is
    // reported in the log/trace and never takes down the rest of the pass.
    try {
      const authoritative = await runAuthoritativeVulnIngest(env, { limit: 25, days: 30 });
      console.log(JSON.stringify({ type: 'AUTHORITATIVE_CVE_INGEST', ...authoritative }));
    } catch (authoritativeError) {
      console.error('[INGEST] authoritative CVE ingestion failed:', authoritativeError);
    }

    // Phase 4A — budgeted strategic briefs for high-impact authoritative CVEs.
    // Background only; a missing credential is a clean skip, never a failure.
    try {
      const strategic = await runStrategicPass(env as any);
      console.log(JSON.stringify({ type: 'STRATEGIC_CVE_ANALYSIS', ...strategic }));
    } catch (strategicError) {
      console.error('[INGEST] strategic CVE analysis failed:', strategicError);
    }

    const msrcResponse = await fetch('https://api.msrc.microsoft.com/update-guide/rss', { headers: { accept: 'application/rss+xml, application/xml' } });
    if (msrcResponse.ok) {
      const xml = await msrcResponse.text();
      const item = xml.match(/<item>[\s\S]*?<\/item>/i)?.[0];
      if (item) {
        const readTag = (tag: string) => item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const link = readTag('link');
        const title = readTag('title');
        if (link && title) await enqueueExternalSignal(env, {
          sourceId: 'msrc-advisory', sourceName: 'Microsoft Security Response Center', externalMessageId: link,
          rawText: title, sourceUrl: link, publishedAt: validSourceTimestamp(readTag('pubDate')), receivedAt: new Date().toISOString(),
          metadata: { authoritative: true, authority_tier: 1, parser_version: 'rss-v1' },
        });
      }
    }
  },
  async queue(batch: MessageBatch<IngestionMessagePayload>, env: Env, ctx?: ExecutionContext): Promise<void> {
    const isFrozen = env.LEGACY_FREEZE === 'true';
    const messages = batch.messages.slice(0, 20);
    const activeMessages = isFrozen
      ? messages.filter((msg) => {
          const rawBody = msg.body as any;
          const payload = rawBody?.body && typeof rawBody.body === 'object' ? rawBody.body : rawBody;
          return payload?.testRun === true;
        })
      : messages;

    if (isFrozen) {
      for (const msg of messages) {
        if (!activeMessages.includes(msg)) {
          msg.ack();
        }
      }
    }

    if (activeMessages.length === 0) return;
    // Batch-level memoized recent events lookup (avoids N+1 full scans across messages)
    let batchRecentEventsCache: ExistingCanonicalEvent[] | null = null;
    const getRecentEvents = async (): Promise<ExistingCanonicalEvent[]> => {
      if (batchRecentEventsCache) return batchRecentEventsCache;
      const recentEventsRaw = await env.DB.prepare(
        "SELECT id, type, title, summary, severity, confidence, status, content_hash, first_seen_at, last_updated_at, entities_json FROM intelligence_events WHERE first_seen_at >= datetime('now', '-3 days') ORDER BY first_seen_at DESC LIMIT 50"
      ).all();
      batchRecentEventsCache = (recentEventsRaw.results || []).map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        summary: row.summary,
        severity: row.severity,
        confidence: row.confidence,
        status: row.status,
        contentHash: row.content_hash,
        firstSeenAt: row.first_seen_at,
        lastUpdatedAt: row.last_updated_at,
        entitiesJson: row.entities_json,
      }));
      return batchRecentEventsCache;
    };

    for (const msg of activeMessages) {
      const rawBody = msg.body as any;
      const payload = rawBody?.body && typeof rawBody.body === 'object' ? rawBody.body : rawBody;
      if ((payload as any)?.operation === 'SMOKE_TEST') {
        const requestId = String((payload as any).request_id || crypto.randomUUID());
        const traceId = String((payload as any).trace_id || `trace_${crypto.randomUUID().slice(0, 12)}`);
        const started = Date.now();
        try {
          await recordKnowledgeMarker(env, traceId, requestId, 'KNOWLEDGE_TRIGGER_RECEIVED', started);
          if (!env.KNOWLEDGE_PROCESSOR || !env.KNOWLEDGE_BUCKET) throw new Error('Knowledge internal bindings unavailable');
          await recordKnowledgeMarker(env, traceId, requestId, 'KNOWLEDGE_RPC_STARTED', started);
          const result = await env.KNOWLEDGE_PROCESSOR.smokeTest({ request_id: requestId, trace_id: traceId });
          await recordKnowledgeMarker(env, traceId, requestId, 'KNOWLEDGE_RPC_COMPLETED', started);
          console.log(JSON.stringify({ type: 'KNOWLEDGE_SMOKE_COMPLETED', request_id: requestId, trace_id: traceId, ...result }));
          msg.ack();
        } catch (error) {
          await recordKnowledgeMarker(env, traceId, requestId, 'KNOWLEDGE_RPC_FAILED', started, error);
          console.error(JSON.stringify({ type: 'KNOWLEDGE_CORE_BATCH_FAILED', error: String(error) }));
          msg.retry();
        }
        continue;
      }
      if ((payload as any)?.operation === 'START_KNOWLEDGE_JOB') {
        try {
          if (!env.KNOWLEDGE_CORPUS_WORKFLOW) throw new Error('Knowledge corpus workflow binding unavailable');
          const jobId = String((payload as any).knowledge_job_id || 'knowledge-physical-15-v1');
          const instance = await env.KNOWLEDGE_CORPUS_WORKFLOW.create({ id: jobId, params: { knowledge_job_id: jobId, corpus_version: 'physical-15-v1', processing_version: 'physical-15-v1', source_object: 'physical-15/derived/physical-15-chunks.ndjson' } });
          console.log(JSON.stringify({ type: 'KNOWLEDGE_JOB_STARTED', knowledge_job_id: jobId, workflow_instance_id: instance.id }));
          msg.ack();
        } catch (error) { console.error(JSON.stringify({ type: 'KNOWLEDGE_JOB_START_FAILED', error: String(error) })); msg.retry(); }
        continue;
      }
      const traceId = String(payload?.metadata?.trace_id || `trace_${crypto.randomUUID().slice(0, 12)}`);
      const traceEventId = String(payload?.metadata?.lifecycle_event_id || payload.eventId || `ingest_${msg.id}`);
      const consumerStarted = Date.now();
      await recordTrace(env, traceId, traceEventId, 'CONSUMER', 'STARTED', msg.attempts || 1, consumerStarted, msg.id);

      try {
        // ── 0. Anti-Recursion Gate: Prohibit Ingesting Outbound ZAYRON-X Channel ──
        const isFromOutbound =
          payload.sourceId === 'tg_zayronxai' ||
          payload.sourceId === 'tg_zayron_x' ||
          payload.sourceUrl?.includes('t.me/zayronxai') ||
          payload.sourceName?.toLowerCase().includes('zayronxai');

        if (isFromOutbound) {
          console.warn(`[INGEST] Anti-recursion guard: Dropping signal originating from outbound publication channel @zayronxai`);
          await recordTrace(env, traceId, traceEventId, 'CONSUMER', 'COMPLETED', msg.attempts || 1, consumerStarted, msg.id);
          msg.ack();
          continue;
        }

        // Canonical CVE boundary for scheduled KEV jobs. The authoritative
        // source is resolved by identity; raw source JSON never enters the
        // generic normalizer directly.
        if (payload.job_type === 'CVE_PROCESS' && payload.sourceId === 'cisa-kev' && payload.cve_id) {
          let sourceItem = (payload.metadata as any)?.cve_item;
          if (!sourceItem) {
            try {
              const sourceResponse = await fetch(payload.source_reference || 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { headers: { accept: 'application/json' } });
              if (sourceResponse.ok) {
                const sourceData = await sourceResponse.json() as any;
                sourceItem = (sourceData.vulnerabilities || []).find((item: any) => item.cveID === payload.cve_id);
              } else {
                console.warn(`[INGEST] Upstream CISA KEV fetch HTTP ${sourceResponse.status}, falling back to payload data`);
              }
            } catch (fetchErr) {
              console.warn('[INGEST] Upstream CISA KEV fetch failed:', fetchErr);
            }
          }
          if (sourceItem) {
            const canonical = mapCisaKevRecord(sourceItem);
            const schema = validateStructuredCVERecord(canonical);
            if (schema.valid) {
              const canonicalEvent = new CVESourceAdapter('cisa-kev', 'CISA Known Exploited Vulnerabilities').normalize(canonical);
              payload.rawText = canonicalEvent.content;
              payload.sourceUrl = canonicalEvent.external_url;
              payload.publishedAt = canonicalEvent.published_at;
              payload.externalMessageId = canonical.cve_id;
              payload.contentHash = canonicalEvent.content_hash;
              payload.metadata = { ...(payload.metadata || {}), cve_data: canonical, canonical_mapping: 'CISA_KEV_TO_STRUCTURED_CVE' };
              await recordTrace(env, traceId, traceEventId, 'CANONICAL_MAPPING', 'COMPLETED', msg.attempts || 1, consumerStarted, 'cisa-kev');
            }
          }
        }

        // ── 1. Idempotency Check: (source_id + external_message_id) OR content_hash ──
        const existing = await env.DB.prepare(
          'SELECT id FROM source_messages WHERE (source_id = ? AND external_message_id = ?) OR content_hash = ? LIMIT 1'
        )
          .bind(payload.sourceId, payload.externalMessageId, payload.contentHash)
          .first<{ id: string }>();

        let existingEvidence: { id: string; event_id: string } | null = null;
        let existingEvent: { id: string } | null = null;

        if (existing && !payload.testRun) {
          existingEvidence = await env.DB.prepare(
            'SELECT id, event_id FROM evidence WHERE source_message_id = ? LIMIT 1'
          ).bind(existing.id).first<{ id: string; event_id: string }>();

          if (existingEvidence?.event_id) {
            existingEvent = await env.DB.prepare(
              'SELECT id FROM intelligence_events WHERE id = ? LIMIT 1'
            ).bind(existingEvidence.event_id).first<{ id: string }>();
          } else {
            existingEvent = await env.DB.prepare(
              'SELECT id FROM intelligence_events WHERE content_hash = ? OR title LIKE ? LIMIT 1'
            ).bind(payload.contentHash, `%${payload.externalMessageId}%`).first<{ id: string }>();
          }

          const isCveMessage = payload.sourceId === 'cisa-kev' ||
                               payload.job_type === 'CVE_PROCESS' ||
                               /^CVE-\d{4}-\d{4,}$/i.test(payload.externalMessageId) ||
                               (payload.cve_id && /^CVE-\d{4}-\d{4,}$/i.test(payload.cve_id));

          let existingVuln: { id: string } | null = null;
          if (isCveMessage) {
            const targetCveId = (payload.cve_id || payload.externalMessageId).toUpperCase();
            existingVuln = await env.DB.prepare(
              'SELECT id FROM vulnerabilities WHERE cve_id = ? LIMIT 1'
            ).bind(targetCveId).first<{ id: string }>();
          }

          const isFullyProcessed = existingEvidence && existingEvent && (!isCveMessage || existingVuln);

          if (isFullyProcessed) {
            console.log(`[INGEST] Skipping fully processed message: source=${payload.sourceId}, id=${payload.externalMessageId}`);
            await recordTrace(env, traceId, traceEventId, 'CONSUMER', 'COMPLETED', msg.attempts || 1, consumerStarted, msg.id);
            msg.ack();
            continue;
          }

          console.warn(`[INGEST] Message partially processed (evidence=${!!existingEvidence}, event=${!!existingEvent}, vuln=${!isCveMessage || !!existingVuln}): continuing downstream persistence for source=${payload.sourceId}, id=${payload.externalMessageId}`);
        }

        // ── 2. Source Metadata Lookup & Auto-Registration ─────────────────────
        let sourceRecord = await env.DB.prepare(
          'SELECT display_name, trust_score, status, enabled FROM sources WHERE id = ? LIMIT 1'
        )
          .bind(payload.sourceId)
          .first<{ display_name: string; trust_score: number; status: string; enabled: number }>();

        if (!sourceRecord) {
          const defaultName = payload.sourceName || payload.sourceId.replace('tg_', '@');
          const defaultUrl = payload.sourceUrl || `https://t.me/${payload.sourceId.replace('tg_', '')}`;
          await env.DB.prepare(
            `INSERT INTO sources (
              id, display_name, url, source_type, language, region, trust_score, priority, status, enabled, created_at, updated_at
            ) VALUES (?, ?, ?, 'telegram', 'en', 'global', 0.85, 'B', 'ENABLED', 1, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO NOTHING`
          )
            .bind(payload.sourceId, defaultName, defaultUrl)
            .run();

          sourceRecord = { display_name: defaultName, trust_score: 0.85, status: 'ENABLED', enabled: 1 };
        }

        if (!sourceRecord.enabled || sourceRecord.status === 'DISABLED') {
          console.warn(`[INGEST] Source ${payload.sourceId} is disabled. Skipping.`);
          msg.ack();
          continue;
        }

        const sourceName = sourceRecord.display_name;
        const sourceTrust = sourceRecord.trust_score ?? payload.sourceTrustScore ?? 0.85;

        // ── 3. Normalization, Entity Extraction & Initial English Synthesis ───
        let result = await normalizeIntelligenceSignal({
          sourceId: payload.sourceId,
          sourceName,
          sourceTrustScore: sourceTrust,
          externalMessageId: payload.externalMessageId,
          rawText: payload.rawText,
          sourceUrl: payload.sourceUrl,
          publishedAt: payload.publishedAt,
        });

        const messageId = (existing?.id as string) || `msg_${crypto.randomUUID().slice(0, 12)}`;

        // Quarantine spam / low-value signals
        if (result.isSpam) {
          await env.DB.prepare(
            `INSERT INTO source_messages (
              id, source_id, external_message_id, content_hash, raw_content,
              original_language, status, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'QUARANTINED', ?, datetime('now'), datetime('now'))`
          )
            .bind(
              messageId,
              payload.sourceId,
              payload.externalMessageId,
              payload.contentHash,
              payload.rawText,
              result.originalLanguage,
              payload.publishedAt || new Date().toISOString()
            )
            .run();

          msg.ack();
          continue;
        }

        // ── 4. AI English Translation & Synthesis Gate for Non-English Signals ─
        let finalTitle = result.normalizedTitle;
        let finalSummary = result.normalizedSummary;
        let isEnglishVerified = result.isEnglishValid;

        if (result.requiresAITranslation && env.AI) {
          try {
            const aiPrompt = `You are ZAYRON-X CTI Translation & Normalization Engine.
Convert this non-English cyber threat intelligence message into an authoritative, professional English technical threat advisory.
CRITICAL RULES:
1. Output MUST be 100% English. DO NOT output Russian, Persian, Arabic, Chinese, or other non-English text.
2. DO NOT translate technical identifiers: Keep CVE IDs (${result.entities.cves.join(', ') || 'none'}), IP addresses (${result.entities.ipv4s.join(', ') || 'none'}), Hashes, Domains, and MITRE TTPs (${result.entities.ttps.join(', ') || 'none'}) EXACTLY as they are.
3. Return ONLY valid JSON:
{
  "title": "string (Concise technical English title max 100 chars)",
  "summary": "string (Objective analyst-grade technical English summary 2-4 sentences)"
}`;

            const userContent = `Source Language: ${result.originalLanguage.toUpperCase()}\nRaw Content:\n${payload.rawText.slice(0, 1500)}`;

            const aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              messages: [
                { role: 'system', content: aiPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.1,
              max_tokens: 400,
            });

            const textResp = aiResp?.response || '';
            const match = textResp.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed.title && parsed.summary) {
                const titleVal = validateEnglishQuality(parsed.title);
                const summaryVal = validateEnglishQuality(parsed.summary);
                if (titleVal.isValid && summaryVal.isValid) {
                  finalTitle = parsed.title.trim();
                  finalSummary = parsed.summary.trim();
                  isEnglishVerified = true;
                }
              }
            }
          } catch (aiErr) {
            console.warn('[INGEST] AI English synthesis error (falling back to structured synthesis):', aiErr);
          }
        }

        // Final verification check
        const qualityCheck = validateEnglishQuality(finalTitle);
        if (!qualityCheck.isValid) {
          console.warn(`[INGEST] Signal failed English gate: ${qualityCheck.reason}. Flagging as NEEDS_TRANSLATION.`);
          isEnglishVerified = false;
        }

        const messageStatus = isEnglishVerified ? 'SUCCEEDED' : 'NEEDS_TRANSLATION';

        // ── 5. Insert Verified Source Message (Raw Foreign Text Preserved) ─────
        await env.DB.prepare(
          `INSERT INTO source_messages (
            id, source_id, external_message_id, content_hash, raw_content,
            normalized_content, original_language, parsed_entities, status,
            published_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(source_id, external_message_id) DO UPDATE SET
            normalized_content = excluded.normalized_content,
            parsed_entities = excluded.parsed_entities,
            status = excluded.status,
            updated_at = datetime('now')`
        )
          .bind(
            messageId,
            payload.sourceId,
            payload.externalMessageId,
            result.contentHash,
            payload.rawText, // Raw source language preserved internally
            finalSummary,    // English normalized content
            result.originalLanguage,
            JSON.stringify(result.entities),
            messageStatus,
            payload.publishedAt || new Date().toISOString()
          )
          .run();

        // If translation completely failed and English is invalid, stop before public event creation
        if (!isEnglishVerified) {
          console.log(`[INGEST] Message ${messageId} held for translation. Not promoting to public intelligence.`);
          continue;
        }

        // ── 6. Check for Multi-Source Corroboration with Existing Canonical Event ──
        const incomingObservation: IncomingSignalObservation = {
          sourceId: payload.sourceId,
          sourceName,
          sourceTrustScore: sourceTrust,
          sourceAuthorityTier: (sourceRecord as any)?.authority_tier ?? 3,
          externalMessageId: payload.externalMessageId,
          contentHash: result.contentHash,
          normalizedTitle: finalTitle,
          normalizedSummary: finalSummary,
          severity: result.severity,
          entities: result.entities,
          sourceUrl: payload.sourceUrl,
          publishedAt: payload.publishedAt || new Date().toISOString(),
        };

        const recentEvents = await getRecentEvents();

        const matchResult = matchCanonicalEvent(incomingObservation, recentEvents);
        let eventId: string;
        let evidenceId: string;
        let isExistingCorroboration = false;

        if (existingEvent?.id) {
          eventId = existingEvent.id;
          evidenceId = existingEvidence?.id || `evi_${crypto.randomUUID().slice(0, 12)}`;
          evidenceId = await persistEvidence(env, {
            id: evidenceId, eventId, sourceId: payload.sourceId, sourceMessageId: messageId,
            type: payload.sourceId === 'nvd-api' ? 'authoritative_nvd' : result.provenance.evidenceType,
            url: result.provenance.sourceUrl, weight: result.provenance.weight, snippet: finalSummary.slice(0, 250),
          });
        } else if (matchResult.matchedEvent) {
          // CORROBORATION CASE: Multiple sources reporting on the same event
          isExistingCorroboration = true;
          const matched = matchResult.matchedEvent;
          eventId = matched.id;
          evidenceId = 'evi_' + crypto.randomUUID().slice(0, 12);
          console.log(`[INGEST] Multi-source corroboration: Signal from ${sourceName} matches existing canonical event ${eventId} (${matchResult.matchReason})`);

          // Fetch prior source tiers
          const priorSources = await env.DB.prepare(
            "SELECT DISTINCT s.priority FROM evidence e LEFT JOIN sources s ON e.source_id = s.id WHERE e.event_id = ?"
          ).bind(eventId).all();
          const priorTiers = (priorSources.results || []).map((r: any) => (r.priority === 'A' ? 1 : r.priority === 'B' ? 2 : 3));

          const corroboration = evaluateCorroboration(matched, incomingObservation, priorTiers);

          // Update canonical event with elevated confidence and updated timeline
          await env.DB.prepare(
            `UPDATE intelligence_events SET
               confidence = ?,
               status = ?,
               severity = ?,
               last_updated_at = datetime('now'),
               updated_at = datetime('now')
             WHERE id = ?`
          )
            .bind(
              corroboration.newConfidenceScore,
              corroboration.newConfidenceState,
              corroboration.updatedSeverity,
              eventId
            )
            .run();

          // Attach new Evidence Record linked to existing canonical event
          evidenceId = await persistEvidence(env, {
            id: evidenceId, eventId, sourceId: payload.sourceId, sourceMessageId: messageId,
            type: payload.sourceId === 'nvd-api' ? 'authoritative_nvd' : result.provenance.evidenceType,
            url: result.provenance.sourceUrl, weight: result.provenance.weight, snippet: finalSummary.slice(0, 250),
          });

          // Check if article exists to update confidence
          const existingArticle = await env.DB.prepare(
            'SELECT id, title, content FROM articles WHERE canonical_intel_event_id = ? LIMIT 1'
          ).bind(eventId).first<{ id: string; title: string; content: string }>();

          if (existingArticle) {
            await env.DB.prepare(
              `UPDATE articles SET
                 confidence = ?,
                 updated_at = datetime('now')
               WHERE id = ?`
            )
              .bind(corroboration.newConfidenceScore, existingArticle.id)
              .run();

            console.log(`[INGEST] Updated existing article ${existingArticle.id} with corroborating evidence.`);
          }
        } else {
          // NEW CANONICAL EVENT CASE
          eventId = payload.eventId || `evt_${crypto.randomUUID().slice(0, 16)}`;
          evidenceId = `evi_${crypto.randomUUID().slice(0, 12)}`;
          const eventType = result.entities.cves.length > 0
            ? 'vulnerability_exploitation'
            : result.entities.malware.length > 0
            ? 'malware_campaign'
            : result.entities.actors.length > 0
            ? 'threat_actor_activity'
            : 'threat_intelligence';

          await env.DB.prepare(
            `INSERT INTO intelligence_events (
              id, type, title, summary, severity, confidence, status, content_hash,
              first_seen_at, last_updated_at, entities_json, mitre_matrix, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              summary = excluded.summary,
              entities_json = excluded.entities_json,
              updated_at = datetime('now')`
          )
            .bind(
              eventId,
              eventType,
              finalTitle,
              finalSummary,
              result.severity,
              result.confidenceScore,
              result.confidenceState,
              result.contentHash,
              payload.publishedAt || new Date().toISOString(),
              new Date().toISOString(),
              JSON.stringify(result.entities),
              JSON.stringify(result.entities.ttps)
            )
            .run();

          // Attach initial Evidence Record
          evidenceId = await persistEvidence(env, {
            id: evidenceId, eventId, sourceId: payload.sourceId, sourceMessageId: messageId,
            type: payload.sourceId === 'nvd-api' ? 'authoritative_nvd' : result.provenance.evidenceType,
            url: result.provenance.sourceUrl, weight: result.provenance.weight, snippet: finalSummary.slice(0, 250),
          });
        }

        if (payload.eventId && env.RESEARCH_WORKFLOW) {
          await env.DB.prepare("UPDATE canary_events SET status = 'EVIDENCE_READY', updated_at = datetime('now') WHERE event_id = ?").bind(eventId).run();
          try {
            await env.RESEARCH_WORKFLOW.create({ id: eventId, params: { eventId, traceId: String(payload.metadata?.trace_id || `trace_${crypto.randomUUID().slice(0, 12)}`), query: `${result.entities.cves[0] || 'NVD vulnerability'} ${finalTitle}`, sourceId: payload.sourceId, evidenceIds: [evidenceId] } });
          } catch (workflowError) {
            console.error('[INGEST] Research Workflow start failed:', workflowError);
          }
        }

        await recordTrace(env, traceId, traceEventId, 'EVENT_PERSISTENCE', 'COMPLETED', msg.attempts || 1, consumerStarted, eventId);

        // ── 8. Persist Extracted CVEs into vulnerabilities table ───────────────
        const targetCves = new Set<string>(result.entities.cves);
        if (payload.cve_id && /^CVE-\d{4}-\d{4,}$/i.test(payload.cve_id)) {
          targetCves.add(payload.cve_id.toUpperCase());
        }
        if (payload.externalMessageId && /^CVE-\d{4}-\d{4,}$/i.test(payload.externalMessageId)) {
          targetCves.add(payload.externalMessageId.toUpperCase());
        }

        for (const cve of targetCves) {
          const resolvedCve = resolveVulnerability(cve) || cve;
          const cveDbId = `vuln_${resolvedCve.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          // Exploitation EVIDENCE, not severity. `severity === 'critical'` used
          // to set this flag for any critical advisory; see exploitationEvidence.ts.
          const exploitation = assessExploitationEvidence({
            sourceId: payload.sourceId,
            catalog: payload.metadata?.catalog as string | undefined,
            kevCatalogItem: payload.metadata?.cve_item as { cveID?: string; dateAdded?: string } | undefined,
            assertedExploitationStatus: (payload.metadata as Record<string, unknown> | undefined)?.exploitation_status as string | undefined,
          });
          await env.DB.prepare(
            `INSERT INTO vulnerabilities (
              id, cve_id, title, description, severity, is_exploited_in_wild, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(cve_id) DO UPDATE SET
              -- Gate 3A.3 — a verified row is owned by its authority: unverified
              -- prose can neither raise its exploitation flag nor replace its facts.
              is_exploited_in_wild = CASE
                WHEN vulnerabilities.provenance_state = 'AUTHORITATIVE_VERIFIED' THEN vulnerabilities.is_exploited_in_wild
                WHEN ? = -1 THEN vulnerabilities.is_exploited_in_wild
                ELSE ? END,
              -- The sticky CRITICAL ratchet is DELETED. Severity is a CVSS band,
              -- written by the authoritative path; an ingestion narrative may not
              -- promote an existing severity at all.
              description = CASE
                WHEN vulnerabilities.provenance_state = 'AUTHORITATIVE_VERIFIED' THEN vulnerabilities.description
                WHEN vulnerabilities.description IS NOT NULL AND vulnerabilities.description <> ''
                  AND vulnerabilities.description NOT LIKE 'CRITICAL ADVISORY%'
                  AND excluded.description LIKE 'CRITICAL ADVISORY%'
                THEN vulnerabilities.description
                ELSE excluded.description END,
              updated_at = datetime('now')`
          )
            .bind(
              cveDbId,
              resolvedCve,
              `${resolvedCve} Security Advisory`,
              finalSummary,
              result.severity.toUpperCase(),
              exploitation.flag,
              exploitation.signal,
              exploitation.signal,
              payload.publishedAt || new Date().toISOString()
            )
            .run();
        }

        // ── 8B. Dispatch Vulnerability AI Analysis (existing analyst-grade pipeline) ──
        // Runs AFTER canonical vulnerability persistence succeeds. Asynchronous and
        // failure-isolated: the vulnerability above is already durable, so a dispatch
        // or analysis failure must never roll it back or block ingestion.
        if (targetCves.size > 0 && env.VULNERABILITY_ANALYST) {
          for (const cve of targetCves) {
            const eligible = isVulnerabilityAnalysisEligible({
              sourceId: payload.sourceId,
              catalog: payload.metadata?.catalog as string | undefined,
              severity: result.severity,
            });
            if (!eligible) continue;
            const resolvedCve = resolveVulnerability(cve) || cve;
            const dispatch = dispatchVulnerabilityAnalysis(env, resolvedCve, traceId, eligible);
            if (ctx && typeof ctx.waitUntil === 'function') {
              ctx.waitUntil(dispatch);
            } else {
              await dispatch;
            }
          }
        }

        // ── 9. Persist Extracted IOCs (IPs & Hashes) ───────────────────────────
        for (const ip of result.entities.ipv4s.slice(0, 5)) {
          const iocId = `ioc_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO iocs (id, type, normalized_value, event_id, confidence, created_at, updated_at)
             VALUES (?, 'ipv4', ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(iocId, ip, eventId, result.confidenceScore)
            .run();
        }

        // IOC/HASH SANITY GATE — a degenerate digest is not an indicator.
        for (const sha of filterSaneHashes(result.entities.sha256s).slice(0, 5)) {
          const iocId = `ioc_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO iocs (id, type, normalized_value, event_id, confidence, created_at, updated_at)
             VALUES (?, 'sha256', ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(iocId, sha, eventId, result.confidenceScore)
            .run();
        }

        // ── 10. Upsert Threat Actors with Canonical Resolution ─────────────────
        for (const rawActor of result.entities.actors) {
          const canonical = resolveActor(rawActor);
          const actorName = canonical ? canonical.name : rawActor;
          const actorSlug = canonical ? canonical.slug : rawActor.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const actorId = canonical ? canonical.id : `act_${actorSlug}`;
          const aliases = canonical ? canonical.aliases.join(', ') : null;
          const country = canonical?.country || null;
          const motivation = canonical?.motivation || null;

          await env.DB.prepare(
            `INSERT INTO actors (id, name, slug, aliases, country, motivation, description, first_seen, last_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))
             ON CONFLICT(slug) DO UPDATE SET last_active = datetime('now'), updated_at = datetime('now')`
          )
            .bind(actorId, actorName, actorSlug, aliases, country, motivation, `Identified threat actor: ${actorName}`)
            .run();
        }

        // ── 11. Upsert Malware Families with Canonical Resolution ──────────────
        for (const rawMw of result.entities.malware) {
          const canonical = resolveMalware(rawMw);
          const mwName = canonical ? canonical.name : rawMw;
          const mwSlug = canonical ? canonical.slug : rawMw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const mwId = canonical ? canonical.id : `mw_${mwSlug}`;
          const family = canonical?.family || 'Malware Payload';

          await env.DB.prepare(
            `INSERT INTO malware (id, name, slug, family, description, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
             ON CONFLICT(slug) DO UPDATE SET updated_at = datetime('now')`
          )
            .bind(mwId, mwName, mwSlug, family, `Identified malware payload: ${mwName}`)
            .run();
        }

        // ── 12. Extract and Persist Graph Relationships ────────────────────────
        const relations = extractGraphRelations({
          eventId,
          evidenceId,
          actors: result.entities.actors,
          malware: result.entities.malware,
          cves: result.entities.cves,
          ipv4s: result.entities.ipv4s,
          sha256s: result.entities.sha256s,
          ttps: result.entities.ttps,
          confidence: result.confidenceScore,
        });

        for (const rel of relations) {
          await env.DB.prepare(
            `INSERT INTO relations (
              id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, relation_type, confidence, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(
              rel.id,
              rel.source_entity_type,
              rel.source_entity_id,
              rel.target_entity_type,
              rel.target_entity_id,
              rel.relation_type,
              rel.confidence
            )
            .run();
        }

        // ── 13. Persist MITRE ATT&CK TTP Mappings ─────────────────────────────
        for (const ttpId of result.entities.ttps) {
          const ttpMeta = lookupTTP(ttpId);
          const mappingId = `ttp_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO ttp_mappings (
              id, mitre_ttp_id, technique_name, tactic, event_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(mappingId, ttpMeta.id, ttpMeta.name, ttpMeta.tactic, eventId)
            .run();
        }

        // ── 14. Form Campaign Candidates ──────────────────────────────────────
        const campaignCandidate = detectCampaignCandidate({
          id: eventId,
          title: finalTitle,
          summary: finalSummary,
          actors: result.entities.actors,
          malware: result.entities.malware,
          cves: result.entities.cves,
        });

        if (campaignCandidate) {
          await env.DB.prepare(
            `INSERT INTO campaigns (
              id, name, slug, actor_id, target_sectors, target_regions, description, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(slug) DO UPDATE SET updated_at = datetime('now')`
          )
            .bind(
              campaignCandidate.id,
              campaignCandidate.name,
              campaignCandidate.slug,
              campaignCandidate.actorId || null,
              campaignCandidate.targetSectors.join(', '),
              campaignCandidate.targetRegions.join(', '),
              campaignCandidate.description
            )
            .run();

          if (campaignCandidate.actorId) {
            await env.DB.prepare(
              `INSERT INTO relations (
                id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, relation_type, confidence, created_at, updated_at
              ) VALUES (?, 'actor', ?, 'campaign', ?, 'ACTOR_CONDUCTS_CAMPAIGN', 0.9, datetime('now'), datetime('now'))`
            )
              .bind(`rel_${crypto.randomUUID().slice(0, 12)}`, campaignCandidate.actorId, campaignCandidate.id)
              .run();
          }
        }

        // ── 15. Vectorize Embeddings ──────────────────────────────────────────
        if (env.AI && env.VECTORIZE) {
          try {
            const embedText = `${finalTitle}. ${finalSummary}`;
            const embeddingResponse = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
              text: [embedText],
            });
            const vector = embeddingResponse?.data?.[0];

            if (vector && Array.isArray(vector)) {
              await env.VECTORIZE.upsert([
                {
                  id: eventId,
                  values: vector,
                  metadata: {
                    type: 'intelligence_event',
                    title: finalTitle,
                    severity: result.severity,
                    actors: result.entities.actors.join(','),
                    malware: result.entities.malware.join(','),
                    cves: result.entities.cves.join(','),
                    source_id: payload.sourceId,
                  },
                },
              ]);
            }
          } catch (vecErr) {
            console.warn('[INGEST] Vectorize embedding error (non-fatal):', vecErr);
          }
        }

        // ── 16. PUBLICATION GATE & DEEP AI GENERATION ──────────────────────────
        // Only high-value signals meeting publication criteria become public articles (and not already corroborated).
        if (!isExistingCorroboration && result.isEligibleForArticle && result.publicationStatus === 'PUBLISHED') {
          let articleContent = finalSummary;
          let articleDek = finalSummary.slice(0, 140);
          let articleExcerpt = finalSummary.slice(0, 180);
          let articleAiSummary = finalSummary;
          let isDeepAiSuccessful = false;

          if (env.AI) {
            try {
              // 1. Budget Guard: Limit deep AI runs per day
              const todayRuns = await env.DB.prepare(
                "SELECT count(*) as count FROM ai_runs WHERE created_at >= date('now') AND created_at < date('now', '+1 day')"
              ).first<{ count: number }>();

              if ((todayRuns?.count || 0) < 150) {
                const aiPrompt = `You are the ZAYRON-X Principal Intelligence Analyst.
Analyze this cyber threat event and output a structured JSON report.
CRITICAL RULES:
1. Output ONLY valid JSON, no markdown formatting outside of the JSON values.
2. Be highly technical, objective, and evidence-based. No fluff.
3. Ensure the JSON conforms exactly to this structure:
{
  "executive_assessment": "1-2 sentences of high-level strategic impact",
  "what_happened": "Detailed paragraph of the event/vulnerability/attack",
  "why_it_matters": "Paragraph explaining the systemic risk or operational impact",
  "defensive_implications": "1-2 actionable defensive recommendations"
}`;
                const userContent = `Event: ${finalTitle}\nSummary: ${finalSummary}\nEntities: ${JSON.stringify(result.entities)}`;

                const startTime = Date.now();
                const aiResp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                  messages: [
                    { role: 'system', content: aiPrompt },
                    { role: 'user', content: userContent },
                  ],
                  temperature: 0.2,
                  max_tokens: 800,
                });
                const duration = Date.now() - startTime;

                // Track AI run for budget guard
                await env.DB.prepare(
                  `INSERT INTO ai_runs (id, workflow, model_id, duration_ms, status, created_at)
                   VALUES (?, 'deep_article_generation', '@cf/meta/llama-3.1-8b-instruct', ?, 'SUCCEEDED', datetime('now'))`
                )
                  .bind(`airun_${crypto.randomUUID().slice(0, 12)}`, duration)
                  .run();

                const textResp = aiResp?.response || '';
                const match = textResp.match(/\{[\s\S]*\}/);

                if (match) {
                  const parsed = JSON.parse(match[0]);

                  if (parsed.executive_assessment && parsed.what_happened && parsed.why_it_matters && parsed.defensive_implications) {
                    articleDek = parsed.executive_assessment;
                    articleExcerpt = parsed.executive_assessment;
                    articleAiSummary = parsed.what_happened;
                    isDeepAiSuccessful = true;
                  }
                }
              } else {
                console.warn(`[INGEST] AI Budget Guard triggered (Runs: ${todayRuns?.count}). Falling back to deterministic generation.`);
              }
            } catch (err) {
              console.error('[INGEST] Deep AI generation failed:', err);
            }
          }

          // ── Assemble Comprehensive Evidence Pack ────────────────────────────
          const eventType = result.entities.cves.length > 0
            ? 'vulnerability_exploitation'
            : result.entities.malware.length > 0
            ? 'malware_campaign'
            : result.entities.actors.length > 0
            ? 'threat_actor_activity'
            : 'threat_intelligence';

          const evidencePack: EvidencePack = {
            eventId,
            sourceId: payload.sourceId,
            sourceName,
            sourceTrustScore: (payload as any).sourceTrustScore || 0.85,
            rawText: payload.rawText,
            normalizedTitle: finalTitle,
            normalizedSummary: finalSummary,
            contentHash: result.contentHash,
            originalLanguage: result.originalLanguage,
            publishedAt: payload.publishedAt || new Date().toISOString(),
            receivedAt: payload.receivedAt || new Date().toISOString(),
            sourceUrl: payload.sourceUrl,
            severity: result.severity,
            confidenceScore: result.confidenceScore,
            confidenceState: result.confidenceState,
            entities: result.entities,
            evidenceRecords: [{
              id: evidenceId,
              type: payload.sourceId === 'nvd-api' ? 'authoritative_nvd' : result.provenance.evidenceType,
              weight: result.provenance.weight,
              snippet: finalSummary.slice(0, 250),
              url: result.provenance.sourceUrl,
            }],
          };

          // ── Format Upgraded 18-Part Evidence-Grounded Dossier ───────────────
          articleContent = formatEvidenceGroundedDossier({
            pack: evidencePack,
            assessmentSummary: articleDek,
            technicalAnalysis: articleAiSummary || finalSummary,
            whyItMatters: articleExcerpt || finalSummary,
            defensiveImplications: isDeepAiSuccessful ? undefined : 'Audit external attack surfaces, inspect perimeter firewalls, and apply latest security patches.',
          });

          const articleSlug = finalTitle
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) + `-${eventId.slice(4, 10)}`;

          const articleId = `art_${crypto.randomUUID().slice(0, 12)}`;
          await env.DB.prepare(
            `INSERT INTO articles (
              id, title, slug, dek, content, excerpt, author, category, tags,
              severity, confidence, ai_summary, is_published, is_featured, is_breaking,
              canonical_intel_event_id, published_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'ZAYRON-X Intelligence Crew', ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, datetime('now'), datetime('now'))`
          )
            .bind(
              articleId,
              finalTitle,
              articleSlug,
              articleDek,
              articleContent,
              articleExcerpt,
              eventType,
              JSON.stringify([...result.entities.actors, ...result.entities.malware, ...result.entities.cves]),
              result.severity,
              result.confidenceScore,
              articleAiSummary,
              0,
              eventId,
              payload.publishedAt || new Date().toISOString()
            )
            .run();
          console.log(`[INGEST] Public article created: ${articleSlug} (${articleId})`);

          // ── Update Intelligence Event Status for Downstream Publication Gate ──
          await env.DB.prepare(
            `UPDATE intelligence_events SET status = 'QUARANTINED', quarantine_reason = 'INGEST_TRUST_GATE_NOT_PROVEN', updated_at = datetime('now') WHERE id = ?`
          )
            .bind(eventId)
            .run();

          // ── 16B. Outbound Social Publication to Official Channel "Zeron X" (@zayronxai) ──
          // Containment: this ingestion path has not proven the canonical Trust gate.
          const trustGateProven = false;
          if (trustGateProven && env.PUBLISH_QUEUE) {
            const canonicalUrl = `https://zayron-x.co/threats/${articleSlug}`;
            const reportForDerivatives = {
              assessment: { headline: finalTitle, executive_summary: articleDek, threat_level: result.severity.toUpperCase(), confidence_state: result.confidenceState, confidence_score: result.confidenceScore },
              what_happened: articleAiSummary || finalSummary,
              why_it_matters: articleExcerpt || finalSummary,
              vulnerabilities: result.entities.cves.map(c => ({ cveId: c, isExploitedInWild: assessExploitationEvidence({ sourceId: payload.sourceId, catalog: payload.metadata?.catalog as string | undefined }).flag === 1, severity: result.severity.toUpperCase() })),
              actors: result.entities.actors.map(a => ({ name: a })), malware: result.entities.malware.map(a => ({ name: a })),
              iocs: [...result.entities.ipv4s.map(ip => ({ type: 'ipv4' as const, value: ip, confidence: result.confidenceScore })), ...result.entities.sha256s.map(h => ({ type: 'sha256' as const, value: h, confidence: result.confidenceScore }))], depth: 'STANDARD' as const,
            };
            const derivatives = generatePlatformDerivatives(reportForDerivatives as any, canonicalUrl);
            await env.PUBLISH_QUEUE.send({
              type: 'PUBLISH_INTELLIGENCE',
              eventId,
              articleId,
              telegramMessage: derivatives.telegram,
              idempotencyKey: `idem_tg_${articleId}`
            });
            console.log(`[INGEST] Dispatched approved intelligence ${articleId} to PUBLISH_QUEUE with ~50-60 word derivative`);
          }
        } else {
          console.log(`[INGEST] Signal retained as internal intelligence event ${eventId} (Status: ${result.publicationStatus})`);
        }

        // ── 17. Update Source last_seen_at timestamp ───────────────────────────
        await env.DB.prepare(
          `UPDATE sources SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        )
          .bind(payload.sourceId)
          .run();

        // Acknowledge queue message
        await recordTrace(env, traceId, traceEventId, 'CONSUMER', 'COMPLETED', msg.attempts || 1, consumerStarted, msg.id);
        msg.ack();
      } catch (error) {
        await recordTrace(env, traceId, traceEventId, 'CONSUMER', 'FAILED', msg.attempts || 1, consumerStarted, msg.id, error);
        console.error('Ingestion queue worker processing failure:', error);
        if (msg.attempts < 2) {
          msg.retry();
        } else {
          console.error(`[INGEST] Max retries reached (${msg.attempts}) for message ${msg.id}. Dropping safely.`);
          msg.ack();
        }
      }
    }
  },
};

/** Capability-scoped internal API exposed only through a Worker service binding. */
export default class IngestWorker extends WorkerEntrypoint<Env> {
  async replaySourceMessage(input: { sourceMessageId: string }): Promise<any> {
    if (this.env.ENVIRONMENT !== 'preview') throw new Error('Replay is available only in Preview');
    const sourceMessageId = String(input?.sourceMessageId || '').trim();
    if (!/^msg_[A-Za-z0-9-]+$/.test(sourceMessageId)) throw new Error('Invalid source message identifier');

    const sourceMessage = await this.env.DB.prepare(
      'SELECT id, source_id, external_message_id, raw_content, normalized_content, content_hash, published_at FROM source_messages WHERE id = ? LIMIT 1'
    ).bind(sourceMessageId).first<any>();
    if (!sourceMessage) throw new Error('Source message not found');

    let event = await this.env.DB.prepare(
      `SELECT id, type, title, summary, severity, confidence, entities_json
       FROM intelligence_events
       WHERE content_hash = ? OR title LIKE ?
       ORDER BY created_at ASC LIMIT 1`
    ).bind(sourceMessage.content_hash, `%${sourceMessage.external_message_id}%`).first<any>();

    if (!event) {
      const eventId = `evt_${crypto.randomUUID().slice(0, 16)}`;
      const title = `Vulnerability Identifier: ${sourceMessage.external_message_id}`;
      const summary = sourceMessage.normalized_content || sourceMessage.raw_content || `${sourceMessage.external_message_id} Security Advisory`;
      const entities = {
        cves: [sourceMessage.external_message_id],
        ipv4s: [], sha256s: [], md5s: [], domains: [], ttps: [], actors: [], malware: []
      };
      await this.env.DB.prepare(
        `INSERT INTO intelligence_events (
          id, type, title, summary, severity, confidence, status, content_hash,
          first_seen_at, last_updated_at, entities_json, mitre_matrix, created_at, updated_at
        ) VALUES (?, 'vulnerability_exploitation', ?, ?, 'CRITICAL', 0.9, 'VERIFIED', ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))
        ON CONFLICT(id) DO NOTHING`
      ).bind(
        eventId, title, summary, sourceMessage.content_hash,
        sourceMessage.published_at || new Date().toISOString(),
        new Date().toISOString(),
        JSON.stringify(entities)
      ).run();

      event = {
        id: eventId,
        type: 'vulnerability_exploitation',
        title,
        summary,
        severity: 'CRITICAL',
        confidence: 0.9,
        entities_json: JSON.stringify(entities)
      };
    }

    let evidence = await this.env.DB.prepare(
      'SELECT id FROM evidence WHERE event_id = ? AND source_message_id = ? ORDER BY created_at ASC LIMIT 1'
    ).bind(event.id, sourceMessageId).first<{ id: string }>();

    if (!evidence) {
      const evidenceId = `evi_${crypto.randomUUID().slice(0, 12)}`;
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO evidence (
          id, event_id, source_id, source_message_id, type, snippet, reviewer_state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'cisa_kev', ?, 'UNREVIEWED', datetime('now'), datetime('now'))`
      ).bind(evidenceId, event.id, sourceMessage.source_id, sourceMessageId, (event.summary || '').slice(0, 250)).run();
      evidence = { id: evidenceId };
    }

    const traceId = `trace_${crypto.randomUUID().slice(0, 12)}`;
    const traceEventId = `replay_${crypto.randomUUID().slice(0, 16)}`;
    const startedAt = Date.now();
    const previousAttempts = await this.env.DB.prepare(
      "SELECT COUNT(*) AS attempts FROM event_trace WHERE stage = 'REPLAY' AND resource_id = ? AND status = 'COMPLETED'"
    ).bind(sourceMessageId).first<{ attempts: number }>();
    const attempt = Number(previousAttempts?.attempts || 0) + 1;
    if (attempt > 6) throw new Error('Replay attempt limit exhausted');
    await recordTrace(this.env, traceId, traceEventId, 'REPLAY', 'STARTED', attempt, startedAt, sourceMessageId);

    try {
      const entities = JSON.parse(event.entities_json || '{}') as {
        cves?: string[]; ipv4s?: string[]; sha256s?: string[]; ttps?: string[]; actors?: string[]; malware?: string[];
      };
      const cvesSet = new Set<string>(Array.isArray(entities.cves) ? entities.cves : []);
      if (/^CVE-\d{4}-\d{4,}$/i.test(sourceMessage.external_message_id)) {
        cvesSet.add(sourceMessage.external_message_id.toUpperCase());
      }
      const cves = Array.from(cvesSet);
      const actors = Array.isArray(entities.actors) ? entities.actors : [];
      const malware = Array.isArray(entities.malware) ? entities.malware : [];
      const ipv4s = Array.isArray(entities.ipv4s) ? entities.ipv4s : [];
      const sha256s = Array.isArray(entities.sha256s) ? entities.sha256s : [];
      const ttps = Array.isArray(entities.ttps) ? entities.ttps : [];

      for (const cve of cves) {
        const resolvedCve = resolveVulnerability(cve) || cve;
        const cveDbId = `vuln_${resolvedCve.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        // A replayed canonical event carries an exploitation NARRATIVE, not
        // exploitation EVIDENCE, so this path may never raise the flag: it derives
        // the same assessment contract as every other write and PRESERVES an
        // existing value instead of overwriting it. Previously this statement
        // hardcoded `1` for every CVE associated with the event.
        const replayExploitation = assessExploitationEvidence({ sourceId: sourceMessage.source_id });
        await this.env.DB.prepare(
          `INSERT INTO vulnerabilities (id, cve_id, title, description, severity, is_exploited_in_wild, published_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
           ON CONFLICT(cve_id) DO UPDATE SET is_exploited_in_wild = CASE WHEN ? = -1 THEN vulnerabilities.is_exploited_in_wild ELSE ? END, updated_at = datetime('now')`
        ).bind(cveDbId, resolvedCve, `${resolvedCve} Security Advisory`, event.summary, event.severity.toUpperCase(), replayExploitation.flag, sourceMessage.published_at || new Date().toISOString(), replayExploitation.signal, replayExploitation.signal).run();
      }

      const relations = extractGraphRelations({ eventId: event.id, evidenceId: evidence.id, actors, malware, cves, ipv4s, sha256s, ttps, confidence: Number(event.confidence || 0.5) });
      let persisted = 0;
      for (const rel of relations) {
        const existing = await this.env.DB.prepare(
          `SELECT id FROM relations WHERE source_entity_type = ? AND source_entity_id = ? AND target_entity_type = ? AND target_entity_id = ? AND relation_type = ? LIMIT 1`
        ).bind(rel.source_entity_type, rel.source_entity_id, rel.target_entity_type, rel.target_entity_id, rel.relation_type).first<{ id: string }>();
        if (existing) continue;
        await this.env.DB.prepare(
          `INSERT INTO relations (id, source_entity_type, source_entity_id, target_entity_type, target_entity_id, relation_type, confidence, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(rel.id, rel.source_entity_type, rel.source_entity_id, rel.target_entity_type, rel.target_entity_id, rel.relation_type, rel.confidence).run();
        persisted += 1;
      }
      await recordTrace(this.env, traceId, traceEventId, 'REPLAY', 'COMPLETED', attempt, startedAt, sourceMessageId);
      return { replayed: true, sourceMessageId, eventId: event.id, evidenceId: evidence.id, vulnerabilityRecords: cves.length, relationsGenerated: relations.length, relationsPersisted: persisted, traceId };
    } catch (error) {
      await recordTrace(this.env, traceId, traceEventId, 'REPLAY', 'FAILED', attempt, startedAt, sourceMessageId, error);
      throw error;
    }
  }

  async processKnowledgeBatch(input: { chunks: any[] }): Promise<any> {
    if (!this.env.KNOWLEDGE_PROCESSOR) throw new Error('Knowledge processor binding unavailable');
    return this.env.KNOWLEDGE_PROCESSOR.processBatch(input);
  }

  async triggerControlledKevTest(limit?: number): Promise<{ success: boolean; cveId: string; vulnerabilityName: string; enqueued: boolean }> {
    const traceId = `trace_${crypto.randomUUID().slice(0, 12)}`;
    const lifecycleEventId = `ingest_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
    const fetchStartedAt = Date.now();
    const kevResponse = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      headers: { accept: 'application/json' },
    });
    if (!kevResponse.ok) {
      throw new Error(`Failed to fetch CISA KEV catalog: HTTP ${kevResponse.status}`);
    }
    const kev = (await kevResponse.json()) as {
      dateReleased?: string;
      vulnerabilities?: Array<{
        cveID: string;
        vulnerabilityName?: string;
        shortDescription?: string;
        dateAdded?: string;
      }>;
    };
    await recordTrace(this.env, traceId, lifecycleEventId, 'SOURCE_FETCH', 'COMPLETED', 1, fetchStartedAt, 'cisa-kev');
    const item = kev.vulnerabilities?.[0];
    if (!item?.cveID) {
      throw new Error('No vulnerabilities found in CISA KEV catalog');
    }

    const sourceId = 'cisa-kev';
    const sourceName = 'CISA Known Exploited Vulnerabilities';
    await ensureFeedSource(this.env, sourceId, sourceName);

    const rawText = `${item.cveID}: ${item.vulnerabilityName || ''}. ${item.shortDescription || ''}`.slice(0, 12000);
    const contentHash = await sha256Hex(rawText);

    if (!this.env.INGEST_QUEUE) {
      throw new Error('INGEST_QUEUE is not configured');
    }

    const enqueueStartedAt = Date.now();
    await this.env.INGEST_QUEUE.send({
      sourceId,
      sourceName,
      externalMessageId: item.cveID,
      rawText,
      contentHash,
      sourceUrl: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
      publishedAt: validSourceTimestamp(item.dateAdded),
      receivedAt: new Date().toISOString(),
      metadata: { authoritative: true, authority_tier: 1, catalog: 'CISA KEV', version: kev.dateReleased, trace_id: traceId, lifecycle_event_id: lifecycleEventId },
      testRun: true,
    });
    await recordTrace(this.env, traceId, lifecycleEventId, 'ENQUEUE', 'COMPLETED', 1, enqueueStartedAt, 'zayron-ingest-queue-preview');

    return {
      success: true,
      cveId: item.cveID,
      vulnerabilityName: item.vulnerabilityName || 'Unknown',
      enqueued: true,
    };
  }

  async submitNvdCanary(input: { cve_id: string; source: string; raw_record: unknown }): Promise<{ event_id: string; status: string }> {
    if (this.env.LEGACY_FREEZE === 'true') throw new Error('Legacy production mutation surface is frozen');
    if (!/^CVE-\d{4}-\d{4,19}$/.test(input?.cve_id || '') || !input?.source || !input?.raw_record) {
      throw new Error('Invalid NVD canary payload');
    }
    const rawText = JSON.stringify(input.raw_record).slice(0, 12000);
    const traceId = `trace_${crypto.randomUUID().slice(0, 12)}`;
    const externalMessageId = input.cve_id;
    const contentHash = await sha256Hex(JSON.stringify(input.raw_record));
    // CVE identity is stable; the content hash tracks a new NVD version.
    const dedupKey = `nvd-api:${input.cve_id}`;
    const existing = await this.env.DB.prepare(
      "SELECT event_id, status FROM canary_events WHERE dedup_key = ? OR dedup_key LIKE ? ORDER BY (dedup_key = ?) DESC, created_at ASC LIMIT 1",
    ).bind(dedupKey, `${dedupKey}:%`, dedupKey).first<{ event_id: string; status: string }>();
    if (existing?.event_id) {
      // A prior DB insert may have outlived a failed queue handoff. Re-drive
      // only non-terminal events; terminal events remain idempotent duplicates.
      const terminal = new Set(['EVIDENCE_READY', 'ANALYZED', 'TRUSTED', 'READY_TO_PUBLISH', 'PUBLISHED', 'DUPLICATE']);
      if (!terminal.has(existing.status)) {
        const retrievedAt = new Date().toISOString();
        const rawText = JSON.stringify(input.raw_record).slice(0, 12000);
        await enqueueExternalSignal(this.env, {
          eventId: existing.event_id, sourceId: 'nvd-api', sourceName: 'NIST National Vulnerability Database',
          externalMessageId: input.cve_id, contentHash, rawText,
          sourceUrl: `https://nvd.nist.gov/vuln/detail/${input.cve_id}`,
          publishedAt: retrievedAt, receivedAt: retrievedAt,
          metadata: { authoritative: true, source: input.source, raw_record_hash: contentHash, trace_id: traceId },
        });
        await this.env.DB.prepare("UPDATE canary_events SET status = 'QUEUED', updated_at = datetime('now') WHERE event_id = ?")
          .bind(existing.event_id).run();
        return { event_id: existing.event_id, status: 'QUEUED_RETRY' };
      }
      return { event_id: existing.event_id, status: 'DUPLICATE' };
    }

    const eventId = `evt_nvd_${crypto.randomUUID().slice(0, 12)}`;
    const sourceUrl = `https://nvd.nist.gov/vuln/detail/${input.cve_id}`;
    const retrievedAt = new Date().toISOString();
    await this.env.DB.prepare(
      `INSERT INTO canary_events (event_id, source_id, event_type, source_url, published_at, retrieved_at, ingested_at, content_hash, dedup_key, status, created_at, updated_at)
       VALUES (?, 'nvd-api', 'vulnerability', ?, ?, ?, datetime('now'), ?, ?, 'RECEIVED', datetime('now'), datetime('now'))`,
    ).bind(eventId, sourceUrl, retrievedAt, retrievedAt, contentHash, dedupKey).run();
    await enqueueExternalSignal(this.env, {
      eventId, sourceId: 'nvd-api', sourceName: 'NIST National Vulnerability Database',
      externalMessageId, contentHash, rawText, sourceUrl, publishedAt: retrievedAt,
      receivedAt: retrievedAt, metadata: { authoritative: true, source: input.source, raw_record_hash: contentHash, trace_id: traceId },
    });
    await this.env.DB.prepare("UPDATE canary_events SET status = 'QUEUED', updated_at = datetime('now') WHERE event_id = ?").bind(eventId).run();
    return { event_id: eventId, status: 'QUEUED' };
  }

  async scheduled(controller: ScheduledController): Promise<void> {
    return ingestHandlers.scheduled(controller, this.env);
  }

  /**
   * Operator trigger for the authoritative ingestion pass.
   *
   * PREVIEW ONLY. Production runs the identical work from its schedule; exposing
   * a public write trigger there would be a new attack surface. The freeze check
   * keeps the production kill-switch authoritative in every environment.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/internal/authoritative-cve-ingest' && url.pathname !== '/internal/strategic-cve-analysis') {
      return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    if (this.env.ENVIRONMENT === 'production') {
      return new Response(JSON.stringify({ error: 'NOT_AVAILABLE_IN_PRODUCTION' }), { status: 403, headers: { 'content-type': 'application/json' } });
    }
    if (this.env.LEGACY_FREEZE === 'true') {
      return new Response(JSON.stringify({ error: 'LEGACY_FREEZE_ACTIVE' }), { status: 409, headers: { 'content-type': 'application/json' } });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { status: 405, headers: { 'content-type': 'application/json', allow: 'POST' } });
    }
    const requested = Number(url.searchParams.get('limit'));
    // Phase 4A operator hook: run the budgeted strategic pass alone. Preview
    // only, same freeze guard, and never reachable in production.
    if (url.pathname === '/internal/strategic-cve-analysis') {
      try {
        const summary = await runStrategicPass(this.env as any, {
          limit: Number.isFinite(requested) && requested > 0 ? requested : 1,
        });
        return new Response(JSON.stringify(summary), {
          status: summary.generated > 0 ? 200 : 202,
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String((error as Error)?.message || error).slice(0, 300) }), {
          status: 502,
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        });
      }
    }
    try {
      const summary = await runAuthoritativeVulnIngest(this.env, {
        limit: Number.isFinite(requested) && requested > 0 ? requested : 5,
        days: 30,
      });
      return new Response(JSON.stringify(summary), {
        status: summary.persisted > 0 ? 200 : 502,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String((error as Error)?.message || error).slice(0, 300) }), {
        status: 502,
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }
  }

  async queue(batch: MessageBatch<IngestionMessagePayload>, _env?: Env, ctx?: ExecutionContext): Promise<void> {
    return ingestHandlers.queue(batch, this.env, ctx);
  }
}

export { ingestHandlers };
