/**
 * PHASE 8A — DETECTION-AS-CODE + MITRE ATT&CK, deterministic and pure.
 *
 * Everything here is a string function over data the API already returned. No
 * indicator is ever placed in an `href`: the queries are copyable text, and the
 * only anchors this module can produce point at the three vetted lookup tools
 * and at official `attack.mitre.org` technique pages.
 *
 * INDICATOR SAFETY
 *   The queries are pre-populated with the DEFANGED values the workspace already
 *   renders (`45[.]9[.]168[.]10`, `hxxp://…`), so the defang guarantee survives
 *   the copy box. Each query carries a one-line instruction to refang before
 *   deploying it to a live sensor.
 */

export interface MitreTechnique {
  id: string;
  name: string;
  tactic: string;
}

/** Only documented ATT&CK IDs for families this platform actually tracks. */
export const MITRE_FAMILY_TECHNIQUES: Record<string, MitreTechnique[]> = {
  'cobalt-strike': [
    { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
    { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion' },
    { id: 'T1059.001', name: 'Command and Scripting Interpreter: PowerShell', tactic: 'Execution' },
    { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
  ],
  sliver: [
    { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
    { id: 'T1071.004', name: 'Application Layer Protocol: DNS', tactic: 'Command and Control' },
    { id: 'T1573', name: 'Encrypted Channel', tactic: 'Command and Control' },
    { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
  ],
  qakbot: [
    { id: 'T1566.001', name: 'Phishing: Spearphishing Attachment', tactic: 'Initial Access' },
    { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion' },
    { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
    { id: 'T1547.001', name: 'Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder', tactic: 'Persistence' },
  ],
  emotet: [
    { id: 'T1566.001', name: 'Phishing: Spearphishing Attachment', tactic: 'Initial Access' },
    { id: 'T1059.001', name: 'Command and Scripting Interpreter: PowerShell', tactic: 'Execution' },
    { id: 'T1071.001', name: 'Application Layer Protocol: Web Protocols', tactic: 'Command and Control' },
    { id: 'T1547.001', name: 'Boot or Logon Autostart Execution: Registry Run Keys / Startup Folder', tactic: 'Persistence' },
  ],
};

/** `Cobalt Strike` / `cobalt_strike` / `CobaltStrike` → `cobalt-strike`. */
export function mitreFamilyKey(family: unknown): string {
  return String(family ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mitreTechniquesForFamily(family: unknown): MitreTechnique[] {
  return MITRE_FAMILY_TECHNIQUES[mitreFamilyKey(family)] ?? [];
}

/** `T1071.001` → the official sub-technique page. */
export function mitreTechniqueUrl(id: string): string {
  const [base, sub] = String(id ?? '').split('.');
  return sub
    ? `https://attack.mitre.org/techniques/${base}/${sub}/`
    : `https://attack.mitre.org/techniques/${base}/`;
}

export interface DetectionQueries {
  kql: string;
  spl: string;
  firewall: string;
}

const REFANG_NOTE = 'Values are defanged for safe display — refang (hxxp→http, [.]→.) before deploying.';

function uniqueSorted(values: unknown[], limit: number): string[] {
  const cleaned = values
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length > 0 && value.length <= 512);
  return Array.from(new Set(cleaned)).sort().slice(0, limit);
}

function quoteList(values: string[], quote: '"' | "'"): string {
  return values.map((value) => `${quote}${value.replace(new RegExp(quote, 'g'), '')}${quote}`).join(', ');
}

/**
 * The three 1-click artefacts for a live family. Deterministic: same inputs,
 * same bytes, so the copy box never flickers between renders.
 */
export function familyDetectionQueries(
  family: string,
  indicators: unknown[],
  limit = 8,
): DetectionQueries {
  const name = String(family ?? 'Unattributed family').trim() || 'Unattributed family';
  const values = uniqueSorted(indicators, Math.max(1, Math.min(limit, 40)));
  if (values.length === 0) {
    const empty = `// ${name}: no active indicator is currently tracked.\n// This is a coverage statement, not an all-clear.`;
    return { kql: empty, spl: empty, firewall: empty };
  }
  const kqlList = quoteList(values, '"');
  const splList = quoteList(values, '"');

  const kql = [
    `// ${name} — active C2 indicators (Microsoft Sentinel / Defender XDR)`,
    `// ${REFANG_NOTE}`,
    `let zayron_c2 = dynamic([${kqlList}]);`,
    'DeviceNetworkEvents',
    '| where Timestamp > ago(30d)',
    '| where RemoteIP in (zayron_c2) or RemoteUrl has_any (zayron_c2)',
    '| summarize FirstSeen = min(Timestamp), LastSeen = max(Timestamp), Hits = count()',
    '    by DeviceName, RemoteIP, RemoteUrl, InitiatingProcessFileName',
    '| order by Hits desc',
  ].join('\n');

  const spl = [
    `// ${name} — active C2 indicators (Splunk SPL)`,
    `// ${REFANG_NOTE}`,
    `index=* (dest_ip IN (${splList}) OR url IN (${splList}) OR src_ip IN (${splList}))`,
    '| stats count min(_time) as first_seen max(_time) as last_seen by dest_ip, url, src_ip',
    '| convert ctime(first_seen) ctime(last_seen)',
    '| sort - count',
  ].join('\n');

  const firewall = [
    `# ${name} — firewall / Cloudflare WAF blocklist`,
    `# ${REFANG_NOTE}`,
    ...values.map((value) => value),
    '# Cloudflare custom rule expression (refang first):',
    `# (ip.src in {${values.join(' ')}} or http.host in {${values.join(' ')}})`,
  ].join('\n');

  return { kql, spl, firewall };
}

/** Hunting templates for one CVE. Both are safe-by-construction strings. */
export function cveHuntingQueries(
  cveId: string,
  context: { vendor?: string | null; product?: string | null } = {},
): { kql: string; spl: string } {
  const id = String(cveId ?? '').trim().toUpperCase() || 'UNKNOWN-CVE';
  const product = String(context.product ?? '').trim();
  const vendor = String(context.vendor ?? '').trim();
  const productTerm = product || vendor || id;
  const kql = [
    `// ${id} — exploitation hunting template (Microsoft Sentinel / Defender XDR)`,
    'DeviceProcessEvents',
    '| where Timestamp > ago(30d)',
    `| where ProcessCommandLine has "${id}" or ProcessCommandLine has "${productTerm}"`,
    '| project Timestamp, DeviceName, AccountName, FileName, ProcessCommandLine, InitiatingProcessFileName',
    '| order by Timestamp desc',
    '// Pair with the vendor advisory and the verified Sigma/Nuclei rule for this CVE.',
  ].join('\n');
  const spl = [
    `// ${id} — exploitation hunting template (Splunk SPL)`,
    'index=* (process_command_line="*' + id + '*" OR process_command_line="*' + productTerm + '*")',
    '| stats count min(_time) as first_seen max(_time) as last_seen by host, user, process_name, process_command_line',
    '| convert ctime(first_seen) ctime(last_seen)',
    '| sort - count',
  ].join('\n');
  return { kql, spl };
}

/* ── vetted external pivots ───────────────────────────────────────────────── */

export interface ThreatPivot {
  name: string;
  host: string;
  url: string;
}

/** The ONLY hosts a pivot may ever point at. */
export const VETTED_PIVOT_HOSTS: readonly string[] = ['www.virustotal.com', 'www.shodan.io', 'viz.greynoise.io'];

/**
 * Pivot links for one indicator.
 *
 * The anchor destination is always one of the three vetted lookup services — it
 * is never the indicator itself. The value travels URL-encoded as that service's
 * search term, and nothing about it is rendered as anchor text.
 */
export function threatPivots(value: string): ThreatPivot[] {
  const target = String(value ?? '').trim();
  if (!target || target.length > 512) return [];
  const encoded = encodeURIComponent(target);
  return [
    { name: 'VirusTotal', host: 'www.virustotal.com', url: `https://www.virustotal.com/gui/search/${encoded}` },
    { name: 'Shodan', host: 'www.shodan.io', url: `https://www.shodan.io/search?query=${encoded}` },
    { name: 'GreyNoise', host: 'viz.greynoise.io', url: `https://viz.greynoise.io/query/?gnql=${encoded}` },
  ];
}

export function isVettedPivotUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && VETTED_PIVOT_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
