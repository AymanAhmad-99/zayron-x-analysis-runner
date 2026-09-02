export interface Env { INGEST: { submitNvdCanary(input: { cve_id: string; source: string; raw_record: unknown }): Promise<unknown> } }
export default { async fetch(request: Request, env: Env) {
  const cve = new URL(request.url).searchParams.get('cve') || 'CVE-2026-76038';
  if (!/^CVE-\d{4}-\d{4,19}$/.test(cve)) return new Response('Invalid CVE', { status: 400 });
  const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cve}`);
  if (!response.ok) return new Response(`NVD ${response.status}`, { status: 502 });
  const result = await env.INGEST.submitNvdCanary({ cve_id: cve, source: 'nvd-api', raw_record: await response.json() });
  return Response.json(result);
} };
