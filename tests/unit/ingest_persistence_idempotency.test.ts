import { describe, it, expect, beforeEach, mock } from 'bun:test';

mock.module('cloudflare:workers', () => ({
  WorkerEntrypoint: class WorkerEntrypoint {
    ctx: any;
    env: any;
    constructor(ctx: any, env: any) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));

const { ingestHandlers } = await import('../../workers/ingest/src/index');
type Env = any;


interface Row {
  [key: string]: any;
}

function createMockDatabase() {
  const sourceMessages = new Map<string, Row>();
  const sources = new Map<string, Row>();
  const intelligenceEvents = new Map<string, Row>();
  const evidence = new Map<string, Row>();
  const vulnerabilities = new Map<string, Row>();
  const iocs = new Map<string, Row>();
  const eventTrace: Row[] = [];

  function makeStatement(sql: string, boundArgs: any[] = []) {
    return {
      bind(...newArgs: any[]) {
        return makeStatement(sql, [...boundArgs, ...newArgs]);
      },

      async first<T = any>(): Promise<T | null> {
        const args = boundArgs;
        // 1. SELECT id FROM source_messages WHERE (source_id = ? AND external_message_id = ?) OR content_hash = ? LIMIT 1
        if (sql.includes('FROM source_messages WHERE (source_id = ? AND external_message_id = ?) OR content_hash = ?')) {
          const [sourceId, externalMessageId, contentHash] = args;
          for (const row of sourceMessages.values()) {
            if ((row.source_id === sourceId && row.external_message_id === externalMessageId) || row.content_hash === contentHash) {
              return { id: row.id } as T;
            }
          }
          return null;
        }

        // 2. SELECT id, event_id FROM evidence WHERE source_message_id = ? LIMIT 1
        if (sql.includes('FROM evidence WHERE source_message_id = ?')) {
          const [sourceMessageId] = args;
          for (const row of evidence.values()) {
            if (row.source_message_id === sourceMessageId) {
              return { id: row.id, event_id: row.event_id } as T;
            }
          }
          return null;
        }

        // 3. SELECT id FROM intelligence_events WHERE id = ? LIMIT 1
        if (sql.includes('FROM intelligence_events WHERE id = ?')) {
          const [id] = args;
          const row = intelligenceEvents.get(id);
          return row ? ({ id: row.id } as T) : null;
        }

        // 4. SELECT id FROM intelligence_events WHERE content_hash = ? OR title LIKE ? LIMIT 1
        if (sql.includes('FROM intelligence_events WHERE content_hash = ? OR title LIKE ?')) {
          const [contentHash, titlePattern] = args;
          const pattern = String(titlePattern).replace(/%/g, '');
          for (const row of intelligenceEvents.values()) {
            if (row.content_hash === contentHash || (pattern && String(row.title).includes(pattern))) {
              return { id: row.id } as T;
            }
          }
          return null;
        }

        // 5. SELECT id FROM vulnerabilities WHERE cve_id = ? LIMIT 1
        if (sql.includes('FROM vulnerabilities WHERE cve_id = ?')) {
          const [cveId] = args;
          for (const row of vulnerabilities.values()) {
            if (String(row.cve_id).toUpperCase() === String(cveId).toUpperCase()) {
              return { id: row.id } as T;
            }
          }
          return null;
        }

        // 6. SELECT display_name, trust_score, status, enabled FROM sources WHERE id = ? LIMIT 1
        if (sql.includes('FROM sources WHERE id = ?')) {
          const [id] = args;
          const row = sources.get(id);
          return row ? (row as T) : null;
        }

        // 7. SELECT id FROM evidence WHERE event_id = ? AND source_message_id = ? ...
        if (sql.includes('FROM evidence') && sql.includes('event_id = ?') && sql.includes('source_message_id = ?')) {
          const [eventId, sourceMessageId] = args;
          for (const row of evidence.values()) {
            if (row.event_id === eventId && row.source_message_id === sourceMessageId) {
              return { id: row.id } as T;
            }
          }
          return null;
        }

        // 8. SELECT id, title, content FROM articles WHERE canonical_intel_event_id = ? LIMIT 1
        if (sql.includes('FROM articles WHERE canonical_intel_event_id = ?')) {
          return null;
        }

        return null;
      },

      async all<T = any>(): Promise<{ results: T[] }> {
        if (sql.includes('FROM intelligence_events WHERE first_seen_at >=')) {
          return { results: Array.from(intelligenceEvents.values()) as T[] };
        }
        if (sql.includes('SELECT DISTINCT s.priority FROM evidence')) {
          return { results: [] as T[] };
        }
        return { results: [] };
      },

      async run(): Promise<any> {
        const args = boundArgs;
        if (sql.includes('INSERT INTO event_trace')) {
          eventTrace.push({ args });
          return { success: true };
        }

        if (sql.includes('INSERT INTO sources')) {
          const [id, displayName] = args;
          if (!sources.has(id)) {
            sources.set(id, { id, display_name: displayName, trust_score: 0.85, status: 'ENABLED', enabled: 1 });
          }
          return { success: true };
        }

        if (sql.includes('INSERT INTO source_messages')) {
          const [id, sourceId, externalMessageId, contentHash, rawContent, normalizedContent, originalLanguage, parsedEntities, status, publishedAt] = args;
          sourceMessages.set(id, {
            id,
            source_id: sourceId,
            external_message_id: externalMessageId,
            content_hash: contentHash,
            raw_content: rawContent,
            normalized_content: normalizedContent,
            original_language: originalLanguage,
            parsed_entities: parsedEntities,
            status,
            published_at: publishedAt,
          });
          return { success: true };
        }

        if (sql.includes('INSERT INTO intelligence_events')) {
          const [id, type, title, summary, severity, confidence, status, contentHash, firstSeenAt, lastUpdatedAt, entitiesJson, mitreMatrix] = args;
          intelligenceEvents.set(id, {
            id,
            type,
            title,
            summary,
            severity,
            confidence,
            status,
            content_hash: contentHash,
            first_seen_at: firstSeenAt,
            last_updated_at: lastUpdatedAt,
            entities_json: entitiesJson,
            mitre_matrix: mitreMatrix,
          });
          return { success: true };
        }

        if (sql.includes('INSERT OR IGNORE INTO evidence')) {
          const [id, eventId, sourceId, sourceMessageId, type, url, weight, snippet] = args;
          if (!evidence.has(id)) {
            evidence.set(id, {
              id,
              event_id: eventId,
              source_id: sourceId,
              source_message_id: sourceMessageId,
              type,
              url,
              weight,
              snippet,
            });
          }
          return { success: true };
        }

        if (sql.includes('INSERT INTO vulnerabilities')) {
          const [id, cveId, title, description, severity, isExploited, publishedAt] = args;
          const key = String(cveId).toUpperCase();
          const existing = vulnerabilities.get(key);
          if (existing) {
            existing.is_exploited_in_wild = Math.max(existing.is_exploited_in_wild, isExploited);
            existing.severity = severity === 'CRITICAL' ? 'CRITICAL' : existing.severity;
          } else {
            vulnerabilities.set(key, {
              id,
              cve_id: key,
              title,
              description,
              severity,
              is_exploited_in_wild: isExploited,
              published_at: publishedAt,
            });
          }
          return { success: true };
        }

        if (sql.includes('INSERT INTO iocs')) {
          const [id, type, normalizedValue, eventId, confidence] = args;
          iocs.set(id, { id, type, normalized_value: normalizedValue, event_id: eventId, confidence });
          return { success: true };
        }

        return { success: true };
      },
    };
  }

  const db = {
    prepare(sql: string) {
      return makeStatement(sql, []);
    },
  };

  return {
    db,
    sourceMessages,
    sources,
    intelligenceEvents,
    evidence,
    vulnerabilities,
    iocs,
    eventTrace,
  };
}

function makeMockBatch(payload: any, ackFn: () => void, retryFn: () => void): any {
  return {
    messages: [
      {
        id: 'queue_msg_1',
        attempts: 1,
        body: payload,
        ack: ackFn,
        retry: retryFn,
      },
    ],
  };
}

describe('Ingest Persistence Hardening & Idempotency Gate', () => {
  let mock: ReturnType<typeof createMockDatabase>;
  let env: Env;

  beforeEach(() => {
    mock = createMockDatabase();
    env = {
      DB: mock.db as any,
      ENVIRONMENT: 'preview',
    };
  });

  const sampleCvePayload = {
    job_type: 'CVE_PROCESS',
    sourceId: 'cisa-kev',
    sourceName: 'CISA Known Exploited Vulnerabilities',
    externalMessageId: 'CVE-2025-22457',
    cve_id: 'CVE-2025-22457',
    contentHash: 'hash_cve_2025_22457',
    rawText: 'Vulnerability Identifier: CVE-2025-22457\nVendor: Ivanti\nProduct: Connect Secure\nDescription: Remote Code Execution flaw in Ivanti Connect Secure.\nExploitation Status: Known Exploited',
    publishedAt: '2025-02-05T00:00:00Z',
    metadata: {
      cve_item: {
        cveID: 'CVE-2025-22457',
        vendorProject: 'Ivanti',
        product: 'Connect Secure',
        vulnerabilityName: 'Ivanti Connect Secure RCE',
        shortDescription: 'Remote Code Execution flaw in Ivanti Connect Secure.',
        dateAdded: '2025-02-05',
      },
    },
  };

  it('CASE 1: source_messages exists, intelligence_event missing -> partial state safely completes all downstream records', async () => {
    // Seed pre-existing source_messages row
    mock.sourceMessages.set('msg_seed_1', {
      id: 'msg_seed_1',
      source_id: 'cisa-kev',
      external_message_id: 'CVE-2025-22457',
      content_hash: 'hash_cve_2025_22457',
      raw_content: sampleCvePayload.rawText,
      normalized_content: 'Remote Code Execution flaw in Ivanti Connect Secure.',
      status: 'SUCCEEDED',
      published_at: sampleCvePayload.publishedAt,
    });

    let acked = false;
    let retried = false;
    const batch = makeMockBatch(sampleCvePayload, () => { acked = true; }, () => { retried = true; });

    await ingestHandlers.queue(batch, env);

    expect(retried).toBe(false);
    expect(mock.intelligenceEvents.size).toBeGreaterThanOrEqual(1);
    expect(mock.evidence.size).toBeGreaterThanOrEqual(1);
    expect(mock.vulnerabilities.has('CVE-2025-22457')).toBe(true);
  });

  it('CASE 2: source_messages exists, intelligence_event exists, evidence missing -> partial state safely creates evidence and vulnerability', async () => {
    const msgId = 'msg_seed_2';
    const eventId = 'evt_seed_2';
    mock.sourceMessages.set(msgId, {
      id: msgId,
      source_id: 'cisa-kev',
      external_message_id: 'CVE-2025-22457',
      content_hash: 'hash_cve_2025_22457',
      raw_content: sampleCvePayload.rawText,
      status: 'SUCCEEDED',
      published_at: sampleCvePayload.publishedAt,
    });
    mock.intelligenceEvents.set(eventId, {
      id: eventId,
      type: 'vulnerability_exploitation',
      title: 'Vulnerability Identifier: CVE-2025-22457',
      summary: 'Remote Code Execution flaw in Ivanti Connect Secure.',
      severity: 'CRITICAL',
      confidence: 0.9,
      status: 'VERIFIED',
      content_hash: 'hash_cve_2025_22457',
      first_seen_at: sampleCvePayload.publishedAt,
      last_updated_at: sampleCvePayload.publishedAt,
      entities_json: JSON.stringify({ cves: ['CVE-2025-22457'], ipv4s: [], sha256s: [] }),
    });

    let acked = false;
    const batch = makeMockBatch(sampleCvePayload, () => { acked = true; }, () => {});

    await ingestHandlers.queue(batch, env);

    expect(mock.evidence.size).toBeGreaterThanOrEqual(1);
    expect(mock.vulnerabilities.has('CVE-2025-22457')).toBe(true);
  });

  it('CASE 3: source_messages exists, event + evidence exist, vulnerability missing -> partial state safely completes vulnerability record', async () => {
    const msgId = 'msg_seed_3';
    const eventId = 'evt_seed_3';
    const eviId = 'evi_seed_3';
    mock.sourceMessages.set(msgId, {
      id: msgId,
      source_id: 'cisa-kev',
      external_message_id: 'CVE-2025-22457',
      content_hash: 'hash_cve_2025_22457',
      raw_content: sampleCvePayload.rawText,
      status: 'SUCCEEDED',
      published_at: sampleCvePayload.publishedAt,
    });
    mock.intelligenceEvents.set(eventId, {
      id: eventId,
      type: 'vulnerability_exploitation',
      title: 'Vulnerability Identifier: CVE-2025-22457',
      summary: 'Remote Code Execution flaw in Ivanti Connect Secure.',
      severity: 'CRITICAL',
      confidence: 0.9,
      status: 'VERIFIED',
      content_hash: 'hash_cve_2025_22457',
      first_seen_at: sampleCvePayload.publishedAt,
      last_updated_at: sampleCvePayload.publishedAt,
      entities_json: JSON.stringify({ cves: ['CVE-2025-22457'], ipv4s: [], sha256s: [] }),
    });
    mock.evidence.set(eviId, {
      id: eviId,
      event_id: eventId,
      source_id: 'cisa-kev',
      source_message_id: msgId,
      type: 'cisa_kev',
    });

    // Vulnerability does not exist yet!
    expect(mock.vulnerabilities.has('CVE-2025-22457')).toBe(false);

    let acked = false;
    const batch = makeMockBatch(sampleCvePayload, () => { acked = true; }, () => {});

    await ingestHandlers.queue(batch, env);

    expect(mock.vulnerabilities.has('CVE-2025-22457')).toBe(true);
  });

  it('CASE 4: all downstream records exist -> fully completed state is safely acknowledged without duplicate records', async () => {
    const msgId = 'msg_seed_4';
    const eventId = 'evt_seed_4';
    const eviId = 'evi_seed_4';
    mock.sourceMessages.set(msgId, {
      id: msgId,
      source_id: 'cisa-kev',
      external_message_id: 'CVE-2025-22457',
      content_hash: 'hash_cve_2025_22457',
      raw_content: sampleCvePayload.rawText,
      status: 'SUCCEEDED',
      published_at: sampleCvePayload.publishedAt,
    });
    mock.intelligenceEvents.set(eventId, {
      id: eventId,
      type: 'vulnerability_exploitation',
      title: 'Vulnerability Identifier: CVE-2025-22457',
      summary: 'Remote Code Execution flaw in Ivanti Connect Secure.',
      severity: 'CRITICAL',
      confidence: 0.9,
      status: 'VERIFIED',
      content_hash: 'hash_cve_2025_22457',
      first_seen_at: sampleCvePayload.publishedAt,
      last_updated_at: sampleCvePayload.publishedAt,
      entities_json: JSON.stringify({ cves: ['CVE-2025-22457'], ipv4s: [], sha256s: [] }),
    });
    mock.evidence.set(eviId, {
      id: eviId,
      event_id: eventId,
      source_id: 'cisa-kev',
      source_message_id: msgId,
      type: 'cisa_kev',
    });
    mock.vulnerabilities.set('CVE-2025-22457', {
      id: 'vuln_cve_2025_22457',
      cve_id: 'CVE-2025-22457',
      title: 'CVE-2025-22457 Security Advisory',
      description: 'Remote Code Execution flaw in Ivanti Connect Secure.',
      severity: 'CRITICAL',
      is_exploited_in_wild: 1,
      published_at: sampleCvePayload.publishedAt,
    });

    const initialEventsCount = mock.intelligenceEvents.size;
    const initialEvidenceCount = mock.evidence.size;
    const initialVulnCount = mock.vulnerabilities.size;

    let acked = false;
    const batch = makeMockBatch(sampleCvePayload, () => { acked = true; }, () => {});

    await ingestHandlers.queue(batch, env);

    expect(acked).toBe(true);
    // Counts must remain identical — no duplicate records!
    expect(mock.intelligenceEvents.size).toBe(initialEventsCount);
    expect(mock.evidence.size).toBe(initialEvidenceCount);
    expect(mock.vulnerabilities.size).toBe(initialVulnCount);
  });

  it('CASE 5: concurrent duplicate delivery -> first completes full persistence, second detects completion and ACKs without duplicates', async () => {
    let ackCount = 0;
    const batch1 = makeMockBatch(sampleCvePayload, () => { ackCount++; }, () => {});
    const batch2 = makeMockBatch(sampleCvePayload, () => { ackCount++; }, () => {});

    // First delivery processes message and persists downstream artifacts
    await ingestHandlers.queue(batch1, env);

    const eventsAfterFirst = mock.intelligenceEvents.size;
    const evidenceAfterFirst = mock.evidence.size;
    const vulnsAfterFirst = mock.vulnerabilities.size;

    expect(eventsAfterFirst).toBe(1);
    expect(evidenceAfterFirst).toBe(1);
    expect(vulnsAfterFirst).toBe(1);

    // Second delivery detects FULLY_PROCESSED and immediately ACKs
    await ingestHandlers.queue(batch2, env);

    expect(ackCount).toBe(2); // both first and second delivery successfully ACK
    expect(mock.intelligenceEvents.size).toBe(eventsAfterFirst);
    expect(mock.evidence.size).toBe(evidenceAfterFirst);
    expect(mock.vulnerabilities.size).toBe(vulnsAfterFirst);
  });
});
