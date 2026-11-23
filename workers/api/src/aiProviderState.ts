/**
 * D1-backed durable implementation of the AI provider state port.
 *
 * WHY D1 AND NOT MEMORY
 * The adapter previously remembered a quota failure in an isolate-local `Map`
 * with a 5-minute cooldown. Worker isolates are short-lived and numerous, so that
 * memory is not shared between instances and cannot hold a decision "for the
 * remainder of the quota period". D1 is the only durable, already-provisioned
 * store this Worker has (`env.DB`), so the provider switch lives there.
 *
 * FAILURE DIRECTION
 * A state read that fails must NOT cause the provider to be skipped: skipping a
 * healthy provider would burn Gemini quota for no reason. Loads therefore degrade
 * to `null` (treat as available) and log; only a *recorded* exhaustion skips.
 * Writes are best-effort but never silent — a failed persist is logged so the
 * switch cannot appear to be durable when it is not.
 */
import type { AIProviderName, AIProviderStatePort, AIProviderStateRecord } from '@zayron/intelligence';

/**
 * ZX-23 — the ONLY tables this module may interpolate into SQL.
 *
 * The table name is a compile-time constant here, not request input, but SQL
 * identifiers cannot be bound as parameters. An explicit allowlist assertion in
 * front of every interpolation means a future refactor that turns the name into
 * configuration cannot silently become SQL injection.
 */
const ALLOWED_PROVIDER_STATE_TABLES = new Set(['ai_provider_state']);

export function assertAllowedProviderStateTable(table: string): string {
  if (!ALLOWED_PROVIDER_STATE_TABLES.has(table)) {
    throw new Error(`AI_PROVIDER_STATE_TABLE_NOT_ALLOWED:${table}`);
  }
  return table;
}

export const AI_PROVIDER_STATE_TABLE = assertAllowedProviderStateTable('ai_provider_state');

export const CREATE_AI_PROVIDER_STATE_SQL = `CREATE TABLE IF NOT EXISTS ${AI_PROVIDER_STATE_TABLE} (
  provider TEXT PRIMARY KEY,
  availability TEXT NOT NULL,
  quota_period TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  evidence TEXT NOT NULL DEFAULT '',
  observed_at TEXT NOT NULL,
  reset_at TEXT NOT NULL
)`;

/** Minimal D1 surface this port needs (keeps the port unit-testable). */
export interface D1LikeStatement {
  bind(...values: unknown[]): D1LikeStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1LikeDatabase {
  prepare(sql: string): D1LikeStatement;
}

interface ProviderStateRow {
  provider?: string | null;
  availability?: string | null;
  quota_period?: string | null;
  reason?: string | null;
  evidence?: string | null;
  observed_at?: string | null;
  reset_at?: string | null;
}

function rowToRecord(row: ProviderStateRow | null): AIProviderStateRecord | null {
  if (!row || !row.provider) return null;
  if (row.availability !== 'AVAILABLE' && row.availability !== 'EXHAUSTED') return null;
  const quotaPeriod = typeof row.quota_period === 'string' ? row.quota_period.trim() : '';
  if (!quotaPeriod) return null;
  return {
    provider: row.provider as AIProviderName,
    availability: row.availability,
    quota_period: quotaPeriod,
    reason: row.reason ?? '',
    evidence: row.evidence ?? '',
    observed_at: row.observed_at ?? '',
    reset_at: row.reset_at ?? '',
  };
}

/**
 * Durable provider state backed by D1.
 *
 * `onDiagnostic` receives a short, bounded message when persistence is
 * unavailable (for example before the migration that creates the table has been
 * applied), so the degraded path is observable rather than invisible.
 */
export function createD1ProviderStatePort(
  db: D1LikeDatabase,
  onDiagnostic?: (message: string) => void,
): AIProviderStatePort {
  const diagnose = (message: string) => {
    try {
      onDiagnostic?.(message);
    } catch {
      /* diagnostics must never change routing */
    }
  };

  const table = assertAllowedProviderStateTable(AI_PROVIDER_STATE_TABLE);

  return {
    async load(provider: AIProviderName): Promise<AIProviderStateRecord | null> {
      try {
        const row = await db
          .prepare(`SELECT provider, availability, quota_period, reason, evidence, observed_at, reset_at FROM ${table} WHERE provider = ?`)
          .bind(provider)
          .first<ProviderStateRow>();
        return rowToRecord(row);
      } catch (error) {
        // Degrade to "no known exhaustion": never skip a possibly-healthy provider.
        diagnose(`AI_PROVIDER_STATE_LOAD_FAILED:${provider}:${String((error as any)?.message ?? error).slice(0, 200)}`);
        return null;
      }
    },

    async save(record: AIProviderStateRecord): Promise<void> {
      try {
        await db
          .prepare(
            `INSERT INTO ${table} (provider, availability, quota_period, reason, evidence, observed_at, reset_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(provider) DO UPDATE SET
               availability = excluded.availability,
               quota_period = excluded.quota_period,
               reason = excluded.reason,
               evidence = excluded.evidence,
               observed_at = excluded.observed_at,
               reset_at = excluded.reset_at`,
          )
          .bind(
            record.provider,
            record.availability,
            record.quota_period,
            record.reason,
            record.evidence,
            record.observed_at,
            record.reset_at,
          )
          .run();
      } catch (error) {
        diagnose(`AI_PROVIDER_STATE_SAVE_FAILED:${record.provider}:${String((error as any)?.message ?? error).slice(0, 200)}`);
      }
    },
  };
}
