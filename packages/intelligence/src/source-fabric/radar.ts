import type { ArtifactEnvelope, SourceAdapter } from './types';

export interface RadarObservation { dataset: string; endpoint: string; timeWindow: string; measurement: string; value: number | string; limitations: string; }

export class CloudflareRadarAdapter implements SourceAdapter<string, { observations: RadarObservation[]; raw: string }, RadarObservation[]> {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async discover(): Promise<string> { return 'radar-dataset-discovery-v1'; }
  async collect(dataset: string) { return { observations: [{ dataset, endpoint: 'configured-at-runtime', timeWindow: 'source-defined', measurement: 'unavailable', value: 'UNKNOWN', limitations: 'Radar telemetry is contextual and does not prove exploitation of a specific vulnerability.' }], raw: JSON.stringify({ dataset }) }; }
  async validate(input: { observations: RadarObservation[]; raw: string }) { if (!input.raw) throw new Error('RADAR_EMPTY_PAYLOAD'); }
  async hash(input: { observations: RadarObservation[]; raw: string }) { const bytes = new TextEncoder().encode(input.raw); const digest = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
  async persistRaw(input: { observations: RadarObservation[]; raw: string }, contentHash: string): Promise<ArtifactEnvelope> { return { sourceId: 'cloudflare-radar', artifactId: `radar-${contentHash.slice(0, 32)}`, collectedAt: new Date().toISOString(), contentType: 'application/json', endpoint: 'https://api.cloudflare.com/client/v4/radar', requestMetadata: {}, contentHash, parserVersion: 'radar-parser-v1', schemaVersion: 'radar-observation-v1', retentionClass: 'raw-source', r2Key: `raw/cloudflare-radar/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, '0')}/radar-${contentHash.slice(0, 32)}` }; }
  async normalize(input: { observations: RadarObservation[]; raw: string }) { return input.observations; }
  async emitEvidence(input: RadarObservation[], artifact: ArtifactEnvelope) { return input.map((observation) => `${artifact.artifactId}:${observation.dataset}:${observation.timeWindow}`); }
  async recordHealth(result: { ok: boolean; latencyMs: number; records: number; error?: string }) { void result; }
  async advanceCheckpoint(cursor: string) { void cursor; }
}
