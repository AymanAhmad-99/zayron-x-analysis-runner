const API_BASE = "https://zayron-x-api-preview.aabusabih.workers.dev";
const WEB_BASE = "https://zayron-x-web-preview.aabusabih.workers.dev";

async function runSmokeTests() {
  console.log("=== PHASE 6: POST-DEPLOYMENT PREVIEW SMOKE TESTS ===");

  // 1. API Endpoints
  console.log("\n--- Testing Preview API Endpoints ---");
  const apiEndpoints = [
    { url: "/api/v1/health", validator: (d) => d.status === "HEALTHY" || d.status === "ok" },
    { url: "/api/v1/intelligence?limit=5", validator: (d) => d.status === "SUCCESS" && Array.isArray(d.reports) },
    { url: "/api/v1/vulnerabilities?limit=5", validator: (d) => Array.isArray(d.data) || Array.isArray(d) },
    { url: "/api/v1/malware", validator: (d) => Array.isArray(d.data) || Array.isArray(d) },
    { url: "/api/v1/malware/intelligence/reports", validator: (d) => Array.isArray(d.reports) || Array.isArray(d.data) },
    { url: "/api/v1/search?q=cve", validator: (d) => d !== null },
    { url: "/api/v1/sources/directory", validator: (d) => Array.isArray(d.sources) || Array.isArray(d.data) || d !== null },
  ];

  let apiPassed = 0;
  for (const ep of apiEndpoints) {
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE}${ep.url}`);
      const duration = Date.now() - start;
      const text = await res.text();
      let valid = false;
      let parsed = null;
      try {
        parsed = JSON.parse(text);
        valid = ep.validator(parsed);
      } catch {
        valid = false;
      }
      const noProdHost = !text.includes("https://zayron-x.co/api");
      const ok = res.status === 200 && valid && noProdHost;
      console.log(`[${ok ? "PASS" : "FAIL"}] API ${ep.url} -> Status ${res.status}, Latency ${duration}ms, Valid=${valid}, NoProdHost=${noProdHost}`);
      if (ok) apiPassed++;
      else console.error(`       Response sample: ${text.slice(0, 150)}`);
    } catch (err) {
      console.error(`[FAIL] API ${ep.url} -> Exception:`, err.message);
    }
  }

  // 2. Web Endpoints
  console.log("\n--- Testing Preview Web Endpoints ---");
  const webPaths = [
    "/",
    "/legal/terms",
    "/legal/privacy",
    "/legal/security",
    "/legal/subprocessors",
    "/company/trust",
    "/intelligence",
    "/intelligence/vulnerabilities",
    "/intelligence/malware",
    "/intelligence/malware/mir_66cd231d1563b12f",
  ];

  let webPassed = 0;
  for (const p of webPaths) {
    const start = Date.now();
    try {
      const res = await fetch(`${WEB_BASE}${p}`, { redirect: "follow" });
      const duration = Date.now() - start;
      const text = await res.text();
      const statusOk = res.status === 200;
      const hasContent = text.length > 500;
      // Check for unexpected production API references
      const noProdApi = !text.includes("https://zayron-x.co/api/");
      // Special check: must not say NO MALWARE AVAILABLE
      const noFalseEmpty = !text.includes("NO MALWARE AVAILABLE");
      const ok = statusOk && hasContent && noProdApi && noFalseEmpty;
      console.log(`[${ok ? "PASS" : "FAIL"}] WEB ${p} -> Status ${res.status}, Latency ${duration}ms, Size ${text.length}B, NoProdApi=${noProdApi}, NoFalseEmpty=${noFalseEmpty}`);
      if (ok) webPassed++;
      else console.error(`       Failure reason: status=${statusOk}, length=${text.length}, noProdApi=${noProdApi}, noFalseEmpty=${noFalseEmpty}`);
    } catch (err) {
      console.error(`[FAIL] WEB ${p} -> Exception:`, err.message);
    }
  }

  console.log("\n--- Smoke Test Summary ---");
  console.log(`API Endpoints: ${apiPassed}/${apiEndpoints.length} passed`);
  console.log(`Web Endpoints: ${webPassed}/${webPaths.length} passed`);

  if (apiPassed === apiEndpoints.length && webPassed === webPaths.length) {
    console.log("\nALL PREVIEW SMOKE TESTS PASSED!");
  } else {
    console.error("\nSMOKE TESTS FAILED!");
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
