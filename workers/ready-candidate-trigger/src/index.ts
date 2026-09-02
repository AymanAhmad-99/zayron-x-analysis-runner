export interface Env { INGEST: { submitNvdCanary(input: { cve_id: string; source: string; raw_record: unknown }): Promise<unknown> } }
export default { async scheduled(_c: ScheduledController, env: Env) {
  const cve = 'CVE-2026-76038';
  const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cve}`);
  if (!response.ok) throw new Error(`NVD ${response.status}`);
  await env.INGEST.submitNvdCanary({ cve_id: cve, source: 'nvd-api', raw_record: await response.json() });
} };
