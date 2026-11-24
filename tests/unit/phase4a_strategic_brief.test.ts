/**
 * Phase 4A — `ai_analyst_assessment.v3` contract.
 *
 * These tests pin the four things that make the strategic layer safe:
 *   - the eligibility/budget policy (high-impact only, 150 paid calls per day);
 *   - the strict schema (a malformed brief is rejected, never repaired);
 *   - the semantic isolation gate (KEV / exploit-code / CVE / version fidelity);
 *   - the clean skip when the model credential is absent.
 */
import { describe, expect, it } from 'bun:test';
import {
  AI_STRATEGIC_PROMPT_VERSION,
  MAX_DAILY_AI_CVE_ANALYSES,
  buildStrategicBriefPrompt,
  isHighImpactCve,
  parseStrategicBrief,
  remainingDailyBudget,
  strategicFactsFromRow,
  supportedExploitationState,
  validateStrategicBriefGrounding,
  validateStrategicBriefShape,
  type StrategicBrief,
  type StrategicCveFacts,
} from '../../packages/intelligence/src/vulnerability/strategicAssessment';
import {
  CLOUDFLARE_STRATEGIC_FALLBACK_MODEL,
  CLOUDFLARE_STRATEGIC_MODEL,
  STRATEGIC_WORKFLOW,
  extractWorkersAIText,
  runStrategicCveAnalysis,
} from '../../packages/intelligence/src/vulnerability/strategicRunner';
import { readFileSync } from 'node:fs';

/** Models retired upstream or explicitly superseded; the strategic path may not use them. */
const DEPRECATED_STRATEGIC_MODEL_IDS = [
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fp8',
  '@cf/meta/infire-llama-3.1-8b-instruct',
] as const;

const facts = (overrides: Partial<StrategicCveFacts> = {}): StrategicCveFacts => ({
  cve_id: 'CVE-2026-90001',
  description: 'An unauthenticated remote code execution flaw in the request parser allows an attacker to execute arbitrary code.',
  severity: 'CRITICAL',
  cvss_score: 9.8,
  cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  epss_score: 0.42,
  epss_percentile: 0.97,
  known_exploited: true,
  kev_due_date: '2026-12-01',
  vendor: 'Acme',
  product: 'Gateway',
  cwe_ids: ['CWE-787'],
  affected_versions: ['< 4.2.9'],
  fixed_versions: ['4.2.9'],
  references: ['https://example.test/advisory'],
  ...overrides,
});

const brief = (overrides: Partial<StrategicBrief> = {}): StrategicBrief => ({
  executive_bluf:
    'CVE-2026-90001 is a remotely reachable, unauthenticated code execution flaw in Acme Gateway. Because CISA KEV records active exploitation, internet-exposed gateways are an immediate enterprise risk.',
  exploitation_mechanics: {
    attack_path:
      'An unauthenticated attacker sends a crafted request body that overflows the parser buffer, yielding code execution in the gateway process.',
    preconditions: ['Network reachability to the gateway management interface'],
    blast_radius: 'Full compromise of the gateway and every downstream trust relationship it terminates.',
    public_exploitation: 'CONFIRMED_KEV',
  },
  operational_prioritization: {
    rationale:
      'CVSS 9.8 with an EPSS percentile above the 97th makes this a top-decile exploitation candidate, and KEV membership confirms live abuse.',
    remediation_sla: '72 hours for internet-exposed instances',
    priority: 'P0',
  },
  defender_playbook: {
    immediate_actions: ['Restrict management interface access to trusted administration networks'],
    upgrade_targets: [{ branch: '4.x', target: '4.2.9' }],
    detection_focus: ['Parser crash loops and unexpected child processes on gateway hosts'],
  },
  ...overrides,
});

describe('1 — high-impact eligibility', () => {
  it('admits CVSS >= 7.0, KEV membership, or EPSS >= 0.05 on any one criterion', () => {
    expect(isHighImpactCve({ cvss_score: 7.0, epss_score: null, known_exploited: false })).toBe(true);
    expect(isHighImpactCve({ cvss_score: 6.9, epss_score: null, known_exploited: false })).toBe(false);
    expect(isHighImpactCve({ cvss_score: 4.0, epss_score: 0.05, known_exploited: false })).toBe(true);
    expect(isHighImpactCve({ cvss_score: 4.0, epss_score: 0.049, known_exploited: false })).toBe(false);
    expect(isHighImpactCve({ cvss_score: 1.0, epss_score: 0.0001, known_exploited: true })).toBe(true);
    expect(isHighImpactCve({ cvss_score: null, epss_score: null, known_exploited: false })).toBe(false);
  });

  it('the daily cap is 150 and can never go negative or be exceeded', () => {
    expect(MAX_DAILY_AI_CVE_ANALYSES).toBe(150);
    expect(remainingDailyBudget(0)).toBe(150);
    expect(remainingDailyBudget(149)).toBe(1);
    expect(remainingDailyBudget(150)).toBe(0);
    expect(remainingDailyBudget(500)).toBe(0);
    expect(remainingDailyBudget(-4)).toBe(150);
    expect(remainingDailyBudget(Number.NaN)).toBe(150);
  });

  it('prompt version is pinned to v4', () => {
    expect(AI_STRATEGIC_PROMPT_VERSION).toBe('ai_analyst_assessment.v4');
  });
});

describe('2 — grounded prompt', () => {
  it('carries every verified fact and the four pillars', () => {
    const { systemPrompt, userContent } = buildStrategicBriefPrompt(facts());
    for (const pillar of ['executive_bluf', 'exploitation_mechanics', 'operational_prioritization', 'defender_playbook']) {
      expect(systemPrompt).toContain(pillar);
    }
    expect(userContent).toContain('CVE-2026-90001');
    expect(userContent).toContain('9.8');
    expect(userContent).toContain('4.2.9');
    expect(userContent).toContain('CISA_KEV_LISTED: YES');
    expect(systemPrompt).toContain('Never claim exploitation');
    expect(systemPrompt).toContain('Every upgrade target must be a version listed in FIXED_VERSIONS');
  });

  it('marks an absent source fact as NOT_AVAILABLE instead of guessing', () => {
    const { userContent } = buildStrategicBriefPrompt(facts({ fixed_versions: [], cvss_score: null, known_exploited: false }));
    expect(userContent).toContain('CVSS_SCORE: NOT_AVAILABLE');
    expect(userContent).toContain('FIXED_VERSIONS: NOT_AVAILABLE');
    expect(userContent).toContain('CISA_KEV_LISTED: NO');
  });
});

describe('3 — strict schema', () => {
  it('accepts the four-pillar shape', () => {
    expect(validateStrategicBriefShape(brief())).toBeNull();
  });

  it('rejects each missing or malformed pillar with a machine-readable code', () => {
    const missingBluf = { ...brief(), executive_bluf: 'too short' };
    expect(validateStrategicBriefShape(missingBluf)).toBe('SCHEMA_INVALID:executive_bluf');

    const missingMechanics = { ...brief(), exploitation_mechanics: undefined };
    expect(validateStrategicBriefShape(missingMechanics)).toBe('SCHEMA_INVALID:exploitation_mechanics');

    const badState = brief();
    (badState.exploitation_mechanics as any).public_exploitation = 'DEFINITELY_EXPLOITED';
    expect(validateStrategicBriefShape(badState)).toBe('SCHEMA_INVALID:public_exploitation');

    const badPriority = brief();
    (badPriority.operational_prioritization as any).priority = 'URGENT';
    expect(validateStrategicBriefShape(badPriority)).toBe('SCHEMA_INVALID:priority');

    // Phase 5A — an EMPTY list is the correct answer when no fix exists; a
    // placeholder branch is what the contract now rejects.
    const noTargets = brief();
    (noTargets.defender_playbook as any).upgrade_targets = [];
    expect(validateStrategicBriefShape(noTargets)).toBeNull();

    const placeholderBranch = brief();
    (placeholderBranch.defender_playbook as any).upgrade_targets = [{ branch: 'NOT_ESTABLISHED', target: 'NOT_ESTABLISHED' }];
    expect(validateStrategicBriefShape(placeholderBranch)).toBe('SCHEMA_INVALID:upgrade_targets_branch');
  });

  it('parses a clean, fenced completion and rejects prose-only output', () => {
    const fenced = '```json\n' + JSON.stringify(brief()) + '\n```';
    expect(parseStrategicBrief(fenced).value).not.toBeNull();
    expect(parseStrategicBrief('Here is my analysis: the CVE is bad.').error).toBe('JSON_OBJECT_NOT_FOUND');
    expect(parseStrategicBrief('').error).toBe('EMPTY_MODEL_OUTPUT');
    expect(parseStrategicBrief('{not json}').error).toBe('JSON_PARSE_ERROR');
  });
});

describe('4 — semantic isolation gate (VER-006)', () => {
  it('passes a brief that stays inside the supplied facts', () => {
    expect(validateStrategicBriefGrounding(brief(), facts())).toEqual([]);
  });

  it('rejects a foreign CVE identifier', () => {
    const hostile = brief({ executive_bluf: 'CVE-2025-11111 is the real issue here and CVE-2026-90001 is a decoy, treat it as urgent now.' });
    expect(validateStrategicBriefGrounding(hostile, facts())).toContain('UNVERIFIED_CVE_REFERENCE:CVE-2025-11111');
  });

  it('rejects a fabricated KEV claim for a CVE that is not in the catalog', () => {
    const hostile = brief({
      exploitation_mechanics: {
        ...brief().exploitation_mechanics,
        public_exploitation: 'NOT_CONFIRMED',
        attack_path: 'The flaw is listed in CISA KEV, so attackers are already using it against exposed gateways today.',
      },
    });
    const violations = validateStrategicBriefGrounding(hostile, facts({ known_exploited: false }));
    expect(violations).toContain('FABRICATED_KEV_CLAIM');
  });

  it('does NOT treat a denial as a fabrication ("no public exploit is established")', () => {
    const honest = brief({
      exploitation_mechanics: {
        ...brief().exploitation_mechanics,
        public_exploitation: 'NOT_CONFIRMED',
        attack_path: 'The flaw is remotely reachable, but no public exploit code is established and no CISA KEV listing exists.',
      },
      defender_playbook: {
        ...brief().defender_playbook,
        immediate_actions: ['Treat management interfaces as untrusted: there is not a public PoC at this time.'],
      },
    });
    expect(validateStrategicBriefGrounding(honest, facts({ known_exploited: false, exploit_code_public: false }))).toEqual([]);
  });

  it('still rejects an affirmative claim after a negated clause', () => {
    const hostile = brief({
      exploitation_mechanics: {
        ...brief().exploitation_mechanics,
        public_exploitation: 'NOT_CONFIRMED',
        attack_path: 'No vendor advisory exists. A working exploit is publicly available and used against exposed gateways.',
      },
    });
    expect(validateStrategicBriefGrounding(hostile, facts({ known_exploited: false, exploit_code_public: false })))
      .toContain('FABRICATED_EXPLOIT_CODE_CLAIM');
  });

  it('rejects an exploitation state above what the facts support', () => {
    const violations = validateStrategicBriefGrounding(brief(), facts({ known_exploited: false }));
    expect(violations).toContain('UNSUPPORTED_EXPLOITATION_STATE:CONFIRMED_KEV');
    expect(supportedExploitationState(facts({ known_exploited: false }))).toBe('NOT_CONFIRMED');
  });

  it('rejects fabricated public exploit code', () => {
    const hostile = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        immediate_actions: ['Assume compromise: a public proof-of-concept exploit is available for this flaw.'],
      },
    });
    expect(validateStrategicBriefGrounding(hostile, facts({ exploit_code_public: false })))
      .toContain('FABRICATED_EXPLOIT_CODE_CLAIM');
  });

  it('rejects an upgrade target that is not a stored fixed version', () => {
    const hostile = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        upgrade_targets: [{ branch: '4.x', target: '4.9.99' }],
      },
    });
    expect(validateStrategicBriefGrounding(hostile, facts())).toContain('INVENTED_UPGRADE_TARGET:4.9.99');
  });

  it('accepts a target that names several STORED fixed versions', () => {
    const multi = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        upgrade_targets: [{ branch: '6.9.x / 7.x', target: '6.9.13-58 or 7.1.2-33' }],
      },
    });
    expect(validateStrategicBriefGrounding(multi, facts({ fixed_versions: ['6.9.13-58', '7.1.2-33'] }))).toEqual([]);
  });

  it('rejects a composite target that smuggles in an unlisted version', () => {
    const hostile = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        upgrade_targets: [{ branch: '6.9.x / 7.x', target: '6.9.13-58 or 7.1.2-99' }],
      },
    });
    expect(validateStrategicBriefGrounding(hostile, facts({ fixed_versions: ['6.9.13-58', '7.1.2-33'] })))
      .toContain('INVENTED_UPGRADE_TARGET:6.9.13-58 or 7.1.2-99');
  });

  it('rejects an invented target when the source never established a fixed version', () => {
    const hostile = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        upgrade_targets: [{ branch: '4.x', target: '4.2.9' }],
      },
    });
    expect(validateStrategicBriefGrounding(hostile, facts({ fixed_versions: [] })))
      .toContain('INVENTED_UPGRADE_TARGET:4.2.9');
  });

  it('enforces version fidelity in prose upgrade instructions', () => {
    const hostile = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        immediate_actions: ['Upgrade to 4.3.1 immediately on all exposed instances.'],
      },
    });
    expect(validateStrategicBriefGrounding(hostile, facts())).toContain('VERSION_FIDELITY_VIOLATION:4.3.1');
  });
});

describe('5 — the runner is bounded and skips cleanly', () => {
  function fakeDb(options: { rows?: any[]; runsToday?: number } = {}) {
    const statements: string[] = [];
    const db = {
      prepare(sql: string) {
        statements.push(sql);
        const api = {
          bind: () => api,
          run: async () => ({ success: true }),
          all: async () => ({ results: options.rows || [] }),
          first: async () => ({ total: options.runsToday ?? 0 }),
        };
        return api;
      },
    };
    return { db, statements };
  }

  const eligibleRow = {
    cve_id: 'CVE-2026-90001',
    description: 'Remote code execution in the request parser.',
    severity: 'CRITICAL',
    cvss_score: 9.8,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    epss_score: 0.42,
    epss_percentile: 0.97,
    is_exploited_in_wild: 1,
    affected_vendor: 'Acme',
    affected_product: 'Gateway',
    kev_due_date: '2026-12-01',
    affected_versions_json: JSON.stringify(['< 4.2.9']),
    fixed_versions_json: JSON.stringify(['4.2.9']),
  };

  /** Workers AI fake that records the model it was asked to run. */
  function fakeAI(handler: (model: string, call: number) => any) {
    const models: string[] = [];
    return {
      models,
      ai: {
        run: async (model: string) => {
          models.push(model);
          return handler(model, models.length);
        },
      },
    };
  }

  it('uses the authorised primary model @cf/google/gemma-4-26b-a4b-it', async () => {
    expect(CLOUDFLARE_STRATEGIC_MODEL).toBe('@cf/google/gemma-4-26b-a4b-it');
    expect(CLOUDFLARE_STRATEGIC_FALLBACK_MODEL).toBe('@cf/ibm-granite/granite-4.0-h-micro');

    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const { ai, models } = fakeAI(() => ({ response: JSON.stringify(brief()), usage: { prompt_tokens: 900, completion_tokens: 620 } }));
    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, { limit: 1 });

    expect(result.generated).toBe(1);
    expect(models).toEqual(['@cf/google/gemma-4-26b-a4b-it']);
    expect(result.providers[0]).toBe('CVE-2026-90001:@cf/google/gemma-4-26b-a4b-it');
    const ledgerInsert = statements.find((sql) => sql.includes('INSERT INTO ai_runs')) || '';
    expect(ledgerInsert).toContain('prompt_version');
  });

  it('never consults Gemini while Workers AI answers — no key exists in the engine path', async () => {
    const { db } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const { ai } = fakeAI(() => ({ response: JSON.stringify(brief()) }));
    let fetchCalls = 0;
    const fetchFn = (async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runStrategicCveAnalysis(
      { DB: db, AI: ai, GEMINI_API_KEY: 'present-but-not-authorised', GEMINI_STRATEGIC_FALLBACK: 'true' },
      { fetchFn, limit: 1 },
    );
    expect(result.generated).toBe(1);
    expect(fetchCalls).toBe(0);
    expect(result.providers[0]).toContain('gemma-4-26b-a4b-it');
  });

  it('falls back to @cf/ibm-granite/granite-4.0-h-micro only after a primary failure', async () => {
    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const { ai, models } = fakeAI((model) => {
      if (model === '@cf/google/gemma-4-26b-a4b-it') throw new Error('5006: capacity temporarily exceeded');
      return { response: JSON.stringify(brief()), usage: { prompt_tokens: 10, completion_tokens: 20 } };
    });

    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, { limit: 1 });
    expect(models).toEqual(['@cf/google/gemma-4-26b-a4b-it', '@cf/ibm-granite/granite-4.0-h-micro']);
    expect(result.generated).toBe(1);
    expect(result.providers[0]).toBe('CVE-2026-90001:@cf/ibm-granite/granite-4.0-h-micro');
    expect(statements.some((sql) => sql.includes('UPDATE vulnerabilities'))).toBe(true);
  });

  it('MISSING_CREDENTIAL is a clean skip: no provider call, no ai_runs row, no budget use', async () => {
    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const result = await runStrategicCveAnalysis({ DB: db }, {});
    expect(result.generated).toBe(0);
    expect(result.skipped.MISSING_CREDENTIAL).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.budget_used_today).toBe(0);
    expect(statements.some((sql) => sql.includes('ai_runs'))).toBe(true); // the budget READ
    expect(statements.some((sql) => sql.includes('INSERT INTO ai_runs'))).toBe(false);
    expect(statements.some((sql) => sql.includes('UPDATE vulnerabilities'))).toBe(false);
  });

  it('a Gemini credential alone is NOT a provider unless explicitly enabled', async () => {
    const { db } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    let fetchCalls = 0;
    const fetchFn = (async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    const result = await runStrategicCveAnalysis(
      { DB: db, GEMINI_API_KEY: 'key-without-opt-in' },
      { fetchFn, limit: 1 },
    );
    expect(result.generated).toBe(0);
    expect(result.skipped.MISSING_CREDENTIAL).toBe(1);
    expect(fetchCalls).toBe(0);
  });

  it('uses Gemini only when explicitly enabled and Workers AI is absent', async () => {
    const { db } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const fetchFn = (async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(brief()) }] } }],
      usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 500 },
    }), { status: 200 })) as unknown as typeof fetch;

    const result = await runStrategicCveAnalysis(
      { DB: db, GEMINI_API_KEY: 'explicit-opt-in-key', GEMINI_STRATEGIC_FALLBACK: 'true' },
      { fetchFn, limit: 1 },
    );
    expect(result.generated).toBe(1);
    expect(result.providers[0]).toContain('gemini');
  });

  it('stops entirely once the daily budget is spent', async () => {
    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: MAX_DAILY_AI_CVE_ANALYSES });
    const { ai, models } = fakeAI(() => ({ response: JSON.stringify(brief()) }));
    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, {});
    expect(result.generated).toBe(0);
    expect(result.skipped.BUDGET_EXHAUSTED).toBe(1);
    expect(result.budget_remaining).toBe(0);
    expect(models).toEqual([]);
    expect(statements.some((sql) => sql.includes('FROM vulnerabilities'))).toBe(false);
  });

  it('uses the bounded selection SQL: authoritative rows only, no already-analyzed rows', async () => {
    const { db, statements } = fakeDb({ rows: [], runsToday: 0 });
    const { ai } = fakeAI(() => ({ response: '{}' }));
    await runStrategicCveAnalysis({ DB: db, AI: ai }, {});
    const selection = statements.find((sql) => sql.includes('FROM vulnerabilities')) || '';
    expect(selection).toContain("provenance_state = 'AUTHORITATIVE_VERIFIED'");
    expect(selection).toContain("COALESCE(strategic_brief_json, '') = ''");
    expect(selection).toContain('COALESCE(cvss_score, 0) >= 7.0');
    expect(selection).toContain('COALESCE(epss_score, 0) >= 0.05');
    expect(selection).toContain('COALESCE(epss_score, 0) DESC');
  });

  it('persists a validated brief and records one paid ai_runs attempt', async () => {
    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const { ai } = fakeAI(() => ({
      response: JSON.stringify(brief()),
      usage: { prompt_tokens: 900, completion_tokens: 500 },
    }));

    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, { limit: 1 });
    expect(result.generated).toBe(1);
    expect(result.cves).toEqual(['CVE-2026-90001']);
    expect(statements.some((sql) => sql.includes('UPDATE vulnerabilities'))).toBe(true);
    expect(statements.some((sql) => sql.includes('INSERT INTO ai_runs'))).toBe(true);
    expect(STRATEGIC_WORKFLOW).toBe('ai_strategic_cve');
  });

  it('performs EXACTLY ONE structured repair retry on a malformed completion', async () => {
    const { db } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const { ai, models } = fakeAI((_model, call) => ({
      response: call === 1 ? 'Here is the brief: not json at all' : JSON.stringify(brief()),
    }));

    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, { limit: 1 });
    expect(result.generated).toBe(1);
    expect(models).toHaveLength(2);
    expect(result.budget_used_today).toBe(2);
  });

  it('gives up after the single repair retry instead of looping', async () => {
    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const { ai, models } = fakeAI(() => ({ response: 'still not json' }));
    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, { limit: 1 });
    expect(result.generated).toBe(0);
    expect(models).toHaveLength(2);
    expect(result.errors.join(' ')).toContain('REPAIR_FAILED');
    expect(statements.some((sql) => sql.includes('UPDATE vulnerabilities'))).toBe(false);
  });

  it('drops a semantically hostile brief instead of persisting it', async () => {
    const { db, statements } = fakeDb({ rows: [eligibleRow], runsToday: 0 });
    const hostile = brief({
      defender_playbook: {
        ...brief().defender_playbook,
        upgrade_targets: [{ branch: '4.x', target: '9.9.9' }],
      },
    });
    const { ai } = fakeAI(() => ({ response: JSON.stringify(hostile) }));

    const result = await runStrategicCveAnalysis({ DB: db, AI: ai }, { limit: 1 });
    expect(result.generated).toBe(0);
    expect(result.errors.join(' ')).toContain('SEMANTIC_GATE');
    expect(statements.some((sql) => sql.includes('UPDATE vulnerabilities'))).toBe(false);
  });
});

describe('7 — Workers AI completion shapes', () => {
  it('extracts text from every served shape and refuses an unknown one', () => {
    expect(extractWorkersAIText({ response: '{"a":1}' })).toBe('{"a":1}');
    expect(extractWorkersAIText({ response: { a: 1 } })).toBe('{"a":1}');
    expect(extractWorkersAIText({ choices: [{ message: { content: 'x' } }] })).toBe('x');
    expect(extractWorkersAIText({ choices: [{ message: { content: [{ text: 'a' }, { text: 'b' }] } }] })).toBe('ab');
    expect(extractWorkersAIText({ output_text: 'y' })).toBe('y');
    expect(extractWorkersAIText({})).toBe('');
    expect(extractWorkersAIText(null)).toBe('');
  });
});

describe('8 — no deprecated model ids remain in the strategic path', () => {
  const files = [
    'packages/intelligence/src/vulnerability/strategicRunner.ts',
    'packages/intelligence/src/vulnerability/strategicAssessment.ts',
  ];

  it('pins the deprecated ids so reintroducing one is a test failure', () => {
    for (const id of DEPRECATED_STRATEGIC_MODEL_IDS) {
      expect(CLOUDFLARE_STRATEGIC_MODEL).not.toBe(id);
      expect(CLOUDFLARE_STRATEGIC_FALLBACK_MODEL).not.toBe(id);
    }
  });

  it('contains zero deprecated or throttled-default model ids', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const id of DEPRECATED_STRATEGIC_MODEL_IDS) {
        expect(source.includes(id)).toBe(false);
      }
      expect(source.includes('infire-llama')).toBe(false);
      expect(source.includes('gemini-3.8-flash')).toBe(false);
    }
  });
});

describe('6 — row projection', () => {
  it('never projects a non-CVE row', () => {
    expect(strategicFactsFromRow({ cve_id: 'NOT-A-CVE' })).toBeNull();
    expect(strategicFactsFromRow(null)).toBeNull();
  });

  it('reads JSON columns defensively', () => {
    const projected = strategicFactsFromRow({
      cve_id: 'cve-2026-90001',
      affected_versions_json: '["< 4.2.9"]',
      fixed_versions_json: 'not json',
      is_exploited_in_wild: 1,
    });
    expect(projected?.cve_id).toBe('CVE-2026-90001');
    expect(projected?.affected_versions).toEqual(['< 4.2.9']);
    expect(projected?.fixed_versions).toEqual([]);
    expect(projected?.known_exploited).toBe(true);
  });
});
