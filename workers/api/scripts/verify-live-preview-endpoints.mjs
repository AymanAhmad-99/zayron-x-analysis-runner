const API_PREVIEW = 'https://zayron-x-api-preview.aabusabih.workers.dev';
const WEB_PREVIEW = 'https://zayron-x-web-preview.aabusabih.workers.dev';

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { accept: 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

async function run() {
  console.log('=== LIVE PREVIEW VERIFICATION ===');
  console.log(`API Base: ${API_PREVIEW}`);
  console.log(`Web Base: ${WEB_PREVIEW}\n`);

  // 1. Verify Vulnerabilities API List
  console.log('1. Checking GET /api/v1/vulnerabilities?limit=25...');
  const vulnsData = await fetchJson(`${API_PREVIEW}/api/v1/vulnerabilities?limit=25`);
  const total = vulnsData?.meta?.total;
  const count = (vulnsData?.data || []).length;
  console.log(`Status: OK, meta.total=${total}, returned=${count}`);
  console.log('First 3 records:');
  for (const item of (vulnsData?.data || []).slice(0, 3)) {
    console.log(`  - ${item.cve_id} | ${item.severity} | wild_exploited=${item.is_exploited_in_wild} | published=${item.published_at}`);
  }

  // 2. Check the 5 remediated CVEs in the vulnerabilities API
  const fiveCves = ['CVE-2017-1000353', 'CVE-2020-29574', 'CVE-2021-26828', 'CVE-2025-22457', 'CVE-2025-43529'];
  console.log('\n2. Verifying 5 remediated CVEs in API...');
  for (const cve of fiveCves) {
    const detail = await fetchJson(`${API_PREVIEW}/api/v1/vulnerabilities?q=${cve}`);
    const match = (detail?.data || []).find((v) => v.cve_id === cve);
    if (match) {
      console.log(`  ✓ ${cve}: FOUND (id=${match.id}, severity=${match.severity}, exploited=${match.is_exploited_in_wild})`);
    } else {
      console.error(`  ✗ ${cve}: NOT FOUND in API query`);
    }
  }

  // 3. Verify Preview Web Vulnerabilities Page
  console.log('\n3. Checking Preview Web GET /intelligence/vulnerabilities...');
  const webHtml = await fetchText(`${WEB_PREVIEW}/intelligence/vulnerabilities`);
  console.log(`HTML received: ${webHtml.length} bytes`);
  const hasZayronXCo = webHtml.includes('https://zayron-x.co');
  console.log(`Production domain 'https://zayron-x.co' present in Web HTML: ${hasZayronXCo ? 'FAIL (LEAK)' : 'PASS (NONE)'}`);
  
  // Check if Web HTML references the preview API base
  const hasPreviewApi = webHtml.includes('zayron-x-api-preview.aabusabih.workers.dev');
  console.log(`Preview API configured in HTML: ${hasPreviewApi ? 'YES' : 'NO'}`);

  // 4. Verify Malware API remains unchanged (Workstream B)
  console.log('\n4. Checking Malware API GET /api/v1/malware/intelligence/reports...');
  const malwareData = await fetchJson(`${API_PREVIEW}/api/v1/malware/intelligence/reports`);
  const malwareReports = malwareData?.data || malwareData?.reports || [];
  console.log(`Malware servable reports count: ${malwareReports.length}`);
  if (malwareReports.length > 0) {
    const rep = malwareReports[0];
    console.log(`Sample report: ID=${rep.report_id || rep.id}, Sha256=${rep.sha256}, Family=${rep.malware_family || rep.classification?.family || 'N/A'}`);
  }

  // 5. Verify Preview Web Malware Page
  console.log('\n5. Checking Preview Web GET /intelligence/malware...');
  const malwareHtml = await fetchText(`${WEB_PREVIEW}/intelligence/malware`);
  console.log(`Malware Web HTML received: ${malwareHtml.length} bytes`);
  const malwareHasProd = malwareHtml.includes('https://zayron-x.co');
  console.log(`Production domain in Malware HTML: ${malwareHasProd ? 'FAIL (LEAK)' : 'PASS (NONE)'}`);

  console.log('\n=== ALL LIVE CHECKS COMPLETED ===');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
