/**
 * Canonical Intelligence Store & Ingestion Storage Adapter
 * Provides transactional persistence for Canonical Entities, Evidence,
 * Claims, Relationships, and Source Snapshots.
 */

import type {
  SourceSnapshot,
  IngestionRun,
  AdapterNormalizationResult,
  CandidateEntity,
  CandidateEvidence,
  CandidateRelationship,
  CandidateClaim,
} from './contracts';
import type { StorageAdapter } from './orchestrator';

export class CanonicalIntelligenceStore implements StorageAdapter {
  private snapshots: Map<string, SourceSnapshot> = new Map();
  private rawPayloads: Map<string, Uint8Array> = new Map();
  private runs: Map<string, IngestionRun> = new Map();
  private entities: Map<string, CandidateEntity> = new Map();
  private relationships: Map<string, CandidateRelationship> = new Map();
  private evidence: Map<string, CandidateEvidence> = new Map();
  private claims: Map<string, CandidateClaim> = new Map();

  public async getLatestSnapshot(sourceId: string): Promise<SourceSnapshot | null> {
    const matching = Array.from(this.snapshots.values()).filter((s) => s.source_id === sourceId);
    if (matching.length === 0) return null;
    return matching[matching.length - 1];
  }

  public async getSnapshot(snapshotId: string): Promise<SourceSnapshot | null> {
    return this.snapshots.get(snapshotId) || null;
  }

  public async getRawPayload(snapshotId: string): Promise<Uint8Array | null> {
    return this.rawPayloads.get(snapshotId) || null;
  }

  public async saveSnapshot(snapshot: SourceSnapshot, rawBytes: Uint8Array): Promise<void> {
    this.snapshots.set(snapshot.snapshot_id, snapshot);
    this.rawPayloads.set(snapshot.snapshot_id, rawBytes);
  }

  public async saveIngestionRun(run: IngestionRun): Promise<void> {
    this.runs.set(run.run_id, run);
  }

  public async getIngestionRun(runId: string): Promise<IngestionRun | null> {
    return this.runs.get(runId) || null;
  }

  public async commitCanonicalSlice(
    snapshot: SourceSnapshot,
    data: AdapterNormalizationResult,
    _runId: string
  ): Promise<{ createdCount: number; updatedCount: number }> {
    let createdCount = 0;
    let updatedCount = 0;

    for (const ent of data.entities) {
      if (this.entities.has(ent.canonical_id)) {
        updatedCount++;
      } else {
        createdCount++;
      }
      this.entities.set(ent.canonical_id, ent);
    }

    for (const rel of data.relationships) {
      this.relationships.set(rel.relationship_id, rel);
    }

    for (const ev of data.evidence) {
      this.evidence.set(ev.evidence_id, ev);
    }

    for (const cl of data.claims) {
      this.claims.set(cl.claim_id, cl);
    }

    return { createdCount, updatedCount };
  }

  // Canonical Query Methods
  public getEntity(canonicalId: string): CandidateEntity | null {
    return this.entities.get(canonicalId) || null;
  }

  public getArtifact(sha256Hex: string): CandidateEntity | null {
    const id = sha256Hex.startsWith('art_') ? sha256Hex : `art_${sha256Hex}`;
    return this.entities.get(id) || null;
  }

  public getMalware(malwareId: string): CandidateEntity | null {
    return this.entities.get(malwareId) || null;
  }

  public getExploit(exploitId: string): CandidateEntity | null {
    const id = exploitId.startsWith('exp_') ? exploitId : `exp_${exploitId}`;
    return this.entities.get(id) || this.entities.get(exploitId) || null;
  }

  public getVulnerability(cveOrId: string): CandidateEntity | null {
    const id = cveOrId.toLowerCase().startsWith('vuln_') ? cveOrId.toLowerCase() : `vuln_${cveOrId.toLowerCase().replace(/-/g, '_')}`;
    return this.entities.get(id) || this.entities.get(cveOrId) || null;
  }

  public getEvidence(evidenceId: string): CandidateEvidence | null {
    return this.evidence.get(evidenceId) || null;
  }

  public getEvidenceForEntity(entityId: string): CandidateEvidence[] {
    return Array.from(this.evidence.values()).filter((ev) =>
      ev.entity_scope && ev.entity_scope.includes(entityId)
    );
  }

  public getRelationshipsForEntity(entityId: string): CandidateRelationship[] {
    return Array.from(this.relationships.values()).filter(
      (r) => r.source_entity_id === entityId || r.target_entity_id === entityId
    );
  }

  public getClaimsForEntity(entityId: string): CandidateClaim[] {
    return Array.from(this.claims.values()).filter((c) => c.subject_id === entityId);
  }

  public getAllEntities(): CandidateEntity[] {
    return Array.from(this.entities.values());
  }

  public getAllEvidence(): CandidateEvidence[] {
    return Array.from(this.evidence.values());
  }

  public getAllRelationships(): CandidateRelationship[] {
    return Array.from(this.relationships.values());
  }

  public getAllClaims(): CandidateClaim[] {
    return Array.from(this.claims.values());
  }

  public clear(): void {
    this.snapshots.clear();
    this.rawPayloads.clear();
    this.runs.clear();
    this.entities.clear();
    this.relationships.clear();
    this.evidence.clear();
    this.claims.clear();
  }
}

export const GlobalCanonicalStore = new CanonicalIntelligenceStore();
