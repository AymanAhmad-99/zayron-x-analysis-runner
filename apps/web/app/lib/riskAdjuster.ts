/**
 * PHASE 8A — client-side Environment Risk Adjuster.
 *
 * Pure, deterministic and $0 server cost: the adjusted priority and the SLA
 * window are computed in the browser from the CVE's own triage band plus the
 * three operator answers. No network request, no stored state.
 */

export type BasePriority = 'P0' | 'P1' | 'P2' | 'P3';
export type Controls = 'none' | 'partial' | 'strict';
export type Criticality = 'standard' | 'high' | 'mission-critical';

export interface RiskEnvironment {
  internetFacing: boolean;
  controls: Controls;
  criticality: Criticality;
}

export interface AdjustedRisk {
  base: BasePriority;
  priority: BasePriority;
  sla: string;
  exposure: number;
  rationale: string[];
}

const ORDER: BasePriority[] = ['P0', 'P1', 'P2', 'P3'];

/** Canonical priority from a stored severity/priority label. */
export function normalizeBasePriority(raw: unknown): BasePriority {
  const value = String(raw ?? '').trim().toUpperCase();
  if (value === 'P0' || value === 'CRITICAL') return 'P0';
  if (value === 'P1' || value === 'HIGH') return 'P1';
  if (value === 'P2' || value === 'MEDIUM') return 'P2';
  return 'P3';
}

const SLA: Record<BasePriority, string> = {
  P0: '24h',
  P1: '72h',
  P2: '7d',
  P3: '30d',
};

const RANK: Record<BasePriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

/**
 * Exposure score → priority shift.
 *   internet-facing  +2   (the only factor that can reach P0 on its own)
 *   mission-critical +1
 *   high             +1
 *   WAF partial      -1
 *   WAF strict       -2
 */
export function adjustedRisk(baseRaw: unknown, env: RiskEnvironment): AdjustedRisk {
  const base = normalizeBasePriority(baseRaw);
  const rationale: string[] = [];
  let score = 0;
  if (env.internetFacing) {
    score += 2;
    rationale.push('Internet-facing asset (+2)');
  }
  if (env.criticality === 'mission-critical') {
    score += 1;
    rationale.push('Mission-critical asset (+1)');
  } else if (env.criticality === 'high') {
    score += 1;
    rationale.push('High-criticality asset (+1)');
  }
  if (env.controls === 'partial') {
    score -= 1;
    rationale.push('Partial compensating controls (−1)');
  } else if (env.controls === 'strict') {
    score -= 2;
    rationale.push('Strict compensating controls (−2)');
  }
  if (rationale.length === 0) rationale.push('No adjustment applied');

  const shifted = Math.max(0, Math.min(3, RANK[base] - score));
  const priority = ORDER[shifted];
  return { base, priority, sla: SLA[priority], exposure: score, rationale };
}
