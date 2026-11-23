// Probe reachability and health of all ZAYRON-X intelligence sources
async function probeSources() {
  console.log("=== ZAYRON-X INTELLIGENCE SOURCE PROBE ===");

  const sources = [
    {
      name: "CISA KEV",
      url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      check: (data) => Array.isArray(data.vulnerabilities) && data.vulnerabilities.length > 0,
      extractCount: (data) => data.vulnerabilities.length,
    },
    {
      name: "CISA RSS Advisories",
      url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
      isXml: true,
      check: (text) => text.includes("<item>") && text.includes("<title>"),
      extractCount: (text) => (text.match(/<item>/g) || []).length,
    },
    {
      name: "NIST NVD API 2.0",
      url: "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=5",
      check: (data) => Array.isArray(data.vulnerabilities) && data.vulnerabilities.length > 0,
      extractCount: (data) => data.vulnerabilities.length,
    },
    {
      name: "Microsoft MSRC RSS",
      url: "https://api.msrc.microsoft.com/update-guide/rss",
      isXml: true,
      check: (text) => text.includes("<item>") || text.includes("<channel>"),
      extractCount: (text) => (text.match(/<item>/g) || []).length,
    },
    {
      name: "GitHub Advisory Database",
      url: "https://api.github.com/advisories?per_page=5",
      headers: { "User-Agent": "ZayronX-Intelligence-Worker/2.0" },
      check: (data) => Array.isArray(data) && data.length > 0,
      extractCount: (data) => data.length,
    },
    {
      name: "OSV.dev API",
      url: "https://api.osv.dev/v1/vulns/GHSA-77rv-6dm4-4p52",
      check: (data) => data.id === "GHSA-77rv-6dm4-4p52",
      extractCount: () => 1,
    },
    {
      name: "FIRST EPSS API",
      url: "https://api.first.org/data/v1/epss?cve=CVE-2024-3400",
      check: (data) => Array.isArray(data.data) && data.data.length > 0,
      extractCount: (data) => data.data.length,
    },
    {
      name: "MalwareBazaar Recent Feed",
      url: "https://mb-api.abuse.ch/api/v1/",
      method: "POST",
      body: "query=get_recent&selector=10",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      check: (data) => data.query_status === "ok" && Array.isArray(data.data),
      extractCount: (data) => data.data?.length ?? 0,
    },
  ];

  const results = [];
  for (const s of sources) {
    const t0 = Date.now();
    try {
      const res = await fetch(s.url, {
        method: s.method || "GET",
        headers: {
          Accept: s.isXml ? "application/rss+xml, application/xml" : "application/json",
          ...(s.headers || {}),
        },
        body: s.body,
      });
      const latency = Date.now() - t0;
      if (!res.ok) {
        results.push({
          name: s.name,
          state: "SOURCE_ERROR",
          status: res.status,
          latency,
          error: `HTTP ${res.status}: ${res.statusText}`,
        });
        console.log(`[-] ${s.name}: HTTP ${res.status} (${latency}ms)`);
        continue;
      }

      let valid = false;
      let count = 0;
      if (s.isXml) {
        const text = await res.text();
        valid = s.check(text);
        count = s.extractCount(text);
      } else {
        const json = await res.json();
        valid = s.check(json);
        count = s.extractCount(json);
      }

      const state = valid ? (count > 0 ? "SOURCE_AVAILABLE" : "SOURCE_EMPTY") : "SOURCE_ERROR";
      results.push({
        name: s.name,
        state,
        status: res.status,
        latency,
        records: count,
      });
      console.log(`[+] ${s.name}: ${state} (HTTP ${res.status}, ${count} records, ${latency}ms)`);
    } catch (err) {
      const latency = Date.now() - t0;
      results.push({
        name: s.name,
        state: "SOURCE_UNAVAILABLE",
        latency,
        error: err.message,
      });
      console.log(`[!] ${s.name}: SOURCE_UNAVAILABLE (${err.message})`);
    }
  }

  console.log("\nSummary of Source Health:");
  console.table(results);
}

probeSources().catch(console.error);
