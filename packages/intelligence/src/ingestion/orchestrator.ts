import { computeSha256Hex } from './cisaKevAdapter';
import {
  SourceSnapshot,
  IngestionRun,
  AdapterNormalizationResult,
  IngestionAdapter,
} from './contracts';

export interface StorageAdapter {
  getLatestSnapshot(sourceId: string): Promise<SourceSnapshot | null>;
  saveSnapshot(snapshot: SourceSnapshot, rawBytes: Uint8Array): Promise<void>;
  saveIngestionRun(run: IngestionRun): Promise<void>;
  commitCanonicalSlice(
    snapshot: SourceSnapshot,
    data: AdapterNormalizationResult,
    runId: string
  ): Promise<{ createdCount: number; updatedCount: number }>;
}

export interface IngestionExecutionResult {
  run: IngestionRun;
  snapshot: SourceSnapshot;
  data?: AdapterNormalizationResult;
  status: 'SUCCESS' | 'UNCHANGED' | 'FAILED';
}

/**
 * Universal Ingestion Orchestrator for ZAYRON-X
 * Coordinates: Acquisition -> Snapshot -> Parse -> Normalize -> Validate -> Store
 */
export class IngestionOrchestrator {
  constructor(
    private readonly storage: StorageAdapter,
    private readonly validator?: (data: AdapterNormalizationResult) => Promise<boolean>
  ) {}

  /**
   * Executes ingestion for a raw payload buffer
   */
  public async ingestPayload(
    adapter: IngestionAdapter,
    rawBytes: Uint8Array,
    triggerType: string = 'MANUAL'
  ): Promise<IngestionExecutionResult> {
    const startedAt = new Date().toISOString();
    const runId = `run_${await computeSha256Hex(`${adapter.sourceId}:${startedAt}:${Math.random()}`)}`;
    const contentHash = await computeSha256Hex(rawBytes);

    const run: IngestionRun = {
      run_id: runId,
      source_id: adapter.sourceId,
      trigger_type: triggerType,
      started_at: startedAt,
      status: 'FETCHING',
      records_seen: 0,
      records_created: 0,
      records_updated: 0,
      records_rejected: 0,
      evidence_extracted: 0,
      claims_constructed: 0,
      contradictions_raised: 0,
      errors: [],
      parser_version: adapter.parserVersion,
      normalizer_version: '1.0.0',
    };

    // 1. License Check
    const licenseStatus = adapter.evaluateLicense();
    if (licenseStatus === 'REJECT') {
      run.status = 'FAILED_ABORTED';
      run.errors.push({ stage: 'LICENSE_GATE', error_code: 'LICENSE_BLOCKED', message: 'License rejected' });
      run.completed_at = new Date().toISOString();
      await this.storage.saveIngestionRun(run);
      throw new Error('LICENSE_BLOCKED: Ingestion rejected by license gate');
    }

    // 2. Snapshot & Idempotency Evaluation
    const latestSnapshot = await this.storage.getLatestSnapshot(adapter.sourceId);
    if (latestSnapshot && latestSnapshot.content_hash === contentHash) {
      run.status = 'COMPLETED_SUCCESS';
      run.source_snapshot_id = latestSnapshot.snapshot_id;
      run.completed_at = new Date().toISOString();
      run.duration_ms = Date.now() - new Date(startedAt).getTime();
      await this.storage.saveIngestionRun(run);
      return {
        run,
        snapshot: latestSnapshot,
        status: 'UNCHANGED',
      };
    }

    const snapshotId = `snp_${contentHash}`;
    const snapshot: SourceSnapshot = {
      snapshot_id: snapshotId,
      source_id: adapter.sourceId,
      retrieved_at: startedAt,
      content_hash: contentHash,
      content_type: 'application/json',
      object_count: 0,
      parser_version: adapter.parserVersion,
      raw_storage_reference: `snapshots/${adapter.sourceId}/${contentHash}.bin`,
      acquisition_status: 'NEW',
    };

    try {
      // 3. Parsing
      run.status = 'PARSING';
      const parsed = adapter.parse(rawBytes);
      const parsedCount = Array.isArray(parsed?.objects)
        ? parsed.objects.length
        : parsed?.count || parsed?.vulnerabilities?.length || 0;
      snapshot.object_count = parsedCount;
      run.records_seen = parsedCount;

      // 4. Normalization & Evidence Extraction
      run.status = 'NORMALIZING';
      const normalizedData = await adapter.normalize(parsed, snapshot);
      run.evidence_extracted = normalizedData.evidence.length;
      run.claims_constructed = normalizedData.claims.length;
      if (normalizedData.objects_rejected) {
        run.records_rejected = normalizedData.objects_rejected;
      }

      // 5. Validation Gate
      run.status = 'VALIDATING';
      if (this.validator) {
        const passed = await this.validator(normalizedData);
        if (!passed) {
          throw new Error('VALIDATION_FAILED: Deterministic kernel rejected candidate claim bundle');
        }
      }

      // 6. Transactional Storage Commit
      run.status = 'COMMITTING';
      await this.storage.saveSnapshot(snapshot, rawBytes);
      const { createdCount, updatedCount } = await this.storage.commitCanonicalSlice(
        snapshot,
        normalizedData,
        runId
      );

      run.records_created = createdCount;
      run.records_updated = updatedCount;
      run.status = 'COMPLETED_SUCCESS';
      run.source_snapshot_id = snapshotId;
      run.completed_at = new Date().toISOString();
      run.duration_ms = Date.now() - new Date(startedAt).getTime();

      await this.storage.saveIngestionRun(run);

      return {
        run,
        snapshot,
        data: normalizedData,
        status: 'SUCCESS',
      };
    } catch (err: any) {
      run.status = 'FAILED_ABORTED';
      run.errors.push({
        stage: run.status,
        error_code: 'TRANSFORMATION_FAILED',
        message: err.message,
      });
      run.completed_at = new Date().toISOString();
      run.duration_ms = Date.now() - new Date(startedAt).getTime();
      await this.storage.saveIngestionRun(run);
      throw err;
    }
  }
}
