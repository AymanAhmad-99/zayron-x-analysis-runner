// Live rate-limit verification on Preview Worker
const PREVIEW_URL = "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1/search?q=test";

async function verifyLiveRateLimit() {
  console.log("=== ZAYRON-X PREVIEW LIVE RATE LIMIT VERIFICATION ===");
  console.log("Target: " + PREVIEW_URL);
  console.log("Endpoint class: search (capacity 60, refill 1/s)");

  const results = [];
  const start = Date.now();

  const batchSize = 15;
  const totalRequests = 75;
  let reqCount = 0;

  console.log(`Sending ${totalRequests} requests in concurrent bursts of ${batchSize}...`);

  for (let b = 0; b < totalRequests / batchSize; b++) {
    const batch = Array.from({ length: batchSize }, async () => {
      const idx = ++reqCount;
      const t0 = Date.now();
      const res = await fetch(PREVIEW_URL);
      const latency = Date.now() - t0;
      const retryAfter = res.headers.get("retry-after");
      let body = null;
      if (res.status === 429) {
        body = await res.json();
      }
      return { i: idx, status: res.status, latency, retryAfter, body };
    });

    const batchResults = await Promise.all(batch);
    for (const r of batchResults) {
      results.push(r);
      if (r.status === 429 && results.filter(x => x.status === 429).length === 1) {
        console.log(`FIRST 429 at request #${r.i}: status=${r.status}, latency=${r.latency}ms, retryAfter=${r.retryAfter}`);
        console.log("Response body:", JSON.stringify(r.body));
      }
    }
  }

  const duration = Date.now() - start;
  const statusCounts = {};
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }
  console.log(`Sent 65 requests in ${duration}ms`);
  console.log("Summary of status codes:", statusCounts);

  const first429 = results.find(r => r.status === 429);
  if (!first429) {
    console.error("FAIL: Zero 429 responses received!");
    process.exit(1);
  }

  console.log("\nTesting reset / refill behavior...");
  console.log("Sleeping 3000ms (refill rate: 1 token/sec)...");
  await new Promise(r => setTimeout(r, 3000));

  const postReset = await fetch(PREVIEW_URL);
  console.log(`Post-reset probe status: ${postReset.status} (Expected 200)`);
  if (postReset.status !== 200) {
    console.error(`FAIL: Expected 200 after reset, got ${postReset.status}`);
    process.exit(1);
  }

  console.log("SUCCESS: Rate limit live verification PASSED!");
}

verifyLiveRateLimit().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
