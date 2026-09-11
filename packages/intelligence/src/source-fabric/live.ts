import type { R2Bucket } from '@cloudflare/workers-types';
import type { ArtifactEnvelope, FabricSource } from './types';
import { rawArtifactKey, stableArtifactId } from './types';

export interface CollectionPolicy { timeoutMs: number; maxBytes: number; maxAttempts: number; backoffMs: number; }
export interface CollectionResult { ok: boolean; status: number; attempts: number; latencyMs: number; contentHash?: string; bytes: number; body?: string; error?: string; retryable: boolean; }
export interface CollectionEvent { type: 'ARTIFACT_COLLECTED'; sourceId: string; artifactId: string; collectionRunId: string; schemaVersion: string; hash: string; r2Key?: string; }

const DEFAULT_POLICY: CollectionPolicy = { timeoutMs: 15_000, maxBytes: 2_000_000, maxAttempts: 2, backoffMs: 250 };
const digest = async (body: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function collectLive(source: FabricSource, url = source.baseEndpoint, fetcher: typeof fetch = fetch, policy = DEFAULT_POLICY): Promise<CollectionResult> {
  const started = Date.now(); let attempts = 0; let lastError = 'UNKNOWN';
  while (attempts < policy.maxAttempts) {
    attempts++;
    try {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), policy.timeoutMs);
      const response = await fetcher(url, { headers: { accept: 'application/json, application/xml, text/csv, text/plain' }, signal: controller.signal }); clearTimeout(timer);
      if (!response.ok) { lastError = `HTTP_${response.status}`; if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) return { ok: false, status: response.status, attempts, latencyMs: Date.now() - started, bytes: 0, error: lastError, retryable: false }; if (attempts < policy.maxAttempts) await sleep(policy.backoffMs * attempts); continue; }
      const length = Number(response.headers.get('content-length') || 0); if (length > policy.maxBytes) return { ok: false, status: response.status, attempts, latencyMs: Date.now() - started, bytes: length, error: 'PAYLOAD_TOO_LARGE', retryable: false };
      const body = await response.text(); const bytes = new TextEncoder().encode(body).byteLength; if (bytes > policy.maxBytes) return { ok: false, status: response.status, attempts, latencyMs: Date.now() - started, bytes, error: 'PAYLOAD_TOO_LARGE', retryable: false };
      return { ok: true, status: response.status, attempts, latencyMs: Date.now() - started, contentHash: await digest(body), bytes, body, retryable: false };
    } catch (error) { lastError = error instanceof Error ? error.name : 'NETWORK_ERROR'; if (attempts < policy.maxAttempts) await sleep(policy.backoffMs * attempts); }
  }
  return { ok: false, status: 0, attempts, latencyMs: Date.now() - started, bytes: 0, error: lastError, retryable: true };
}

export async function persistArtifact(source: FabricSource, result: CollectionResult, r2: Pick<R2Bucket, 'put'>, collectedAt = new Date().toISOString()): Promise<{ artifact: ArtifactEnvelope; event: CollectionEvent }> {
  if (!result.ok || !result.body || !result.contentHash) throw new Error('ARTIFACT_REQUIRES_SUCCESSFUL_COLLECTION');
  const artifactId = stableArtifactId(source.sourceId, result.contentHash); const r2Key = rawArtifactKey(source.sourceId, artifactId, collectedAt);
  await r2.put(r2Key, result.body, { httpMetadata: { contentType: 'application/octet-stream' }, customMetadata: { source_id: source.sourceId, content_hash: result.contentHash, parser_version: source.parser } });
  const artifact: ArtifactEnvelope = { sourceId: source.sourceId, artifactId, collectedAt, contentType: 'application/octet-stream', endpoint: source.baseEndpoint, requestMetadata: {}, contentHash: result.contentHash, parserVersion: source.parser, schemaVersion: 'source-artifact-v1', retentionClass: source.retentionPolicy, r2Key };
  return { artifact, event: { type: 'ARTIFACT_COLLECTED', sourceId: source.sourceId, artifactId, collectionRunId: `${source.sourceId}-${result.contentHash.slice(0, 16)}`, schemaVersion: 'collection-event-v1', hash: result.contentHash, r2Key } };
}
