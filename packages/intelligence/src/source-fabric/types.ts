export type SourceCategory = 'vulnerability' | 'research' | 'ioc' | 'knowledge' | 'telemetry';
export type ClaimClass = 'CONFIRMED_FACT' | 'SOURCE_DERIVED' | 'KNOWLEDGE_DERIVED' | 'ANALYTIC_INFERENCE' | 'RECOMMENDATION' | 'UNKNOWN';

export interface FabricSource {
  sourceId: string;
  name: string;
  category: SourceCategory;
  authority: 'primary' | 'trusted_research' | 'community' | 'contextual';
  coverage: string;
  accessMethod: 'api' | 'rss' | 'feed' | 'git' | 'web';
  baseEndpoint: string;
  rateLimit: string;
  pollOrEventCharacter: 'scheduled' | 'event_driven' | 'manual_checkpoint';
  freshnessExpectation: string;
  retentionPolicy: string;
  parser: string;
  normalizer: string;
  proves: string;
  doesNotProve: string;
  enabled: boolean;
  healthStatus: 'UNVERIFIED' | 'HEALTHY' | 'DEGRADED' | 'DISABLED';
}

export interface ArtifactEnvelope {
  sourceId: string;
  artifactId: string;
  collectedAt: string;
  contentType: string;
  endpoint: string;
  requestMetadata: Record<string, string>;
  contentHash: string;
  parserVersion: string;
  schemaVersion: string;
  retentionClass: string;
  r2Key: string;
}

export interface SourceAdapter<TDiscovery = unknown, TCollection = unknown, TNormalized = unknown> {
  discover(): Promise<TDiscovery>;
  collect(input: TDiscovery): Promise<TCollection>;
  validate(input: TCollection): Promise<void>;
  hash(input: TCollection): Promise<string>;
  persistRaw(input: TCollection, contentHash: string): Promise<ArtifactEnvelope>;
  normalize(input: TCollection): Promise<TNormalized>;
  emitEvidence(input: TNormalized, artifact: ArtifactEnvelope): Promise<string[]>;
  recordHealth(result: { ok: boolean; latencyMs: number; records: number; error?: string }): Promise<void>;
  advanceCheckpoint(cursor: string): Promise<void>;
}

export function rawArtifactKey(sourceId: string, artifactId: string, collectedAt: string): string {
  const date = new Date(collectedAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `raw/${sourceId}/${year}/${month}/${artifactId}`;
}

export function stableArtifactId(sourceId: string, contentHash: string): string {
  return `${sourceId}-${contentHash.slice(0, 32)}`;
}
