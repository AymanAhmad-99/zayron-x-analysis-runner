// Live regressions verification on Preview Worker
const PREVIEW_BASE = "https://zayron-x-api-preview.aabusabih.workers.dev";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || "";

async function verifyRegressions() {
  console.log("=== ZAYRON-X PREVIEW REGRESSION VERIFICATION ===");
  console.log("Target Base:", PREVIEW_BASE);

  const tests = [
    // Public read endpoints
    { name: "Public Health", url: "/api/v1/health", method: "GET", expectedStatus: 200 },
    { name: "Public Intelligence", url: "/api/v1/intelligence?limit=1", method: "GET", expectedStatus: 200 },
    { name: "Public Malware Reports", url: "/api/v1/malware/intelligence/reports", method: "GET", expectedStatus: 200 },
    { name: "Public Sources Directory", url: "/api/v1/sources/directory", method: "GET", expectedStatus: 200 },
    { name: "Public Search", url: "/api/v1/search?q=cve", method: "GET", expectedStatus: 200 },

    // Admin & Mutation endpoints (unauthenticated -> 401)
    { name: "Admin AI-Budget (No Auth)", url: "/api/v1/admin/ai-budget", method: "GET", expectedStatus: 401 },
    { name: "Admin AI-Budget (Wrong Token)", url: "/api/v1/admin/ai-budget", method: "GET", headers: { "X-Admin-Token": "bad-token" }, expectedStatus: 401 },
    ...(ADMIN_TOKEN ? [{ name: "Admin AI-Budget (Valid Token)", url: "/api/v1/admin/ai-budget", method: "GET", headers: { "X-Admin-Token": ADMIN_TOKEN }, expectedStatus: 200 }] : []),
    { name: "Mutation Publish (No Auth)", url: "/api/v1/publish", method: "POST", body: "{}", expectedStatus: 401 },
    { name: "Mutation Ingest-Event (No Auth)", url: "/api/v1/intelligence/ingest-event", method: "POST", body: "{}", expectedStatus: 401 },
    { name: "Internal RAG Retrieve (No Auth)", url: "/api/v1/rag/retrieve", method: "POST", body: "{}", expectedStatus: 401 },
  ];

  let passed = 0;
  for (const t of tests) {
    const res = await fetch(PREVIEW_BASE + t.url, {
      method: t.method,
      headers: { "Content-Type": "application/json", ...(t.headers || {}) },
      body: t.body,
    });
    const ok = res.status === t.expectedStatus;
    console.log(`[${ok ? "PASS" : "FAIL"}] ${t.name}: Status=${res.status} (Expected ${t.expectedStatus})`);
    if (!ok) {
      console.error(`   Failure details: URL=${t.url}, Response=${await res.text()}`);
    } else {
      passed++;
    }
  }

  // CORS verification
  console.log("\n--- CORS Checks ---");
  const previewOrigin = "https://zayron-x-web-preview.aabusabih.workers.dev";
  const corsPreflight = await fetch(PREVIEW_BASE + "/api/v1/search?q=test", {
    method: "OPTIONS",
    headers: {
      Origin: previewOrigin,
      "Access-Control-Request-Method": "GET",
    },
  });
  const preflightAcao = corsPreflight.headers.get("access-control-allow-origin");
  const preflightOk = corsPreflight.status === 204 && preflightAcao === previewOrigin;
  console.log(`[${preflightOk ? "PASS" : "FAIL"}] OPTIONS Preflight Allowed Origin: Status=${corsPreflight.status}, ACAO=${preflightAcao}`);

  const disallowedOrigin = "https://evil.example.com";
  const corsDisallowed = await fetch(PREVIEW_BASE + "/api/v1/health", {
    headers: { Origin: disallowedOrigin },
  });
  const disallowedAcao = corsDisallowed.headers.get("access-control-allow-origin");
  const disallowedOk = !disallowedAcao || disallowedAcao !== disallowedOrigin;
  console.log(`[${disallowedOk ? "PASS" : "FAIL"}] Disallowed Origin Denied: ACAO=${disallowedAcao || "(none, correctly omitted)"}`);

  const wildcardCheck = preflightAcao !== "*" && disallowedAcao !== "*";
  console.log(`[${wildcardCheck ? "PASS" : "FAIL"}] No wildcard ACAO present: ${wildcardCheck}`);

  if (passed === tests.length && preflightOk && disallowedOk && wildcardCheck) {
    console.log("\nSUCCESS: All public read, admin auth, mutation auth, and CORS regression checks PASSED!");
  } else {
    throw new Error("Regression test suite failed");
  }
}

verifyRegressions().catch(err => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
