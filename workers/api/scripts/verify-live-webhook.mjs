// Live webhook replay verification on Preview Worker
const PREVIEW_WEBHOOK_URL = "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1/webhook/telegram";
const SECRET = "zx-preview-webhook-token-phase-g";

async function verifyLiveWebhook() {
  console.log("=== ZAYRON-X PREVIEW LIVE WEBHOOK REPLAY VERIFICATION ===");
  console.log("Target: " + PREVIEW_WEBHOOK_URL);

  // 1. Missing secret
  const resMissing = await fetch(PREVIEW_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ update_id: 10001, message: { message_id: 1, chat: { id: 1 }, text: "test" } }),
  });
  console.log("1. Missing Secret -> Status:", resMissing.status, "(Expected 401)");
  if (resMissing.status !== 401) throw new Error("Expected 401 for missing secret");

  // 2. Wrong secret
  const resWrong = await fetch(PREVIEW_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": "completely-invalid-secret",
    },
    body: JSON.stringify({ update_id: 10002, message: { message_id: 2, chat: { id: 1 }, text: "test" } }),
  });
  console.log("2. Wrong Secret -> Status:", resWrong.status, "(Expected 401)");
  if (resWrong.status !== 401) throw new Error("Expected 401 for wrong secret");

  // 3. Missing event identity
  const resNoId = await fetch(PREVIEW_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": SECRET,
    },
    body: JSON.stringify({ unparseable: true }),
  });
  console.log("3. Missing Event Identity -> Status:", resNoId.status, "(Expected 400)");
  const noIdBody = await resNoId.json();
  console.log("   Body:", JSON.stringify(noIdBody));
  if (resNoId.status !== 400) throw new Error("Expected 400 for missing event identity");

  // 4. Valid secret + First event
  const uniqueUpdateId = Date.now();
  const firstEventPayload = {
    update_id: uniqueUpdateId,
    message: {
      message_id: 101,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 99999, type: "private" },
      text: "synthetic-audit-event",
    },
  };

  const resFirst = await fetch(PREVIEW_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": SECRET,
    },
    body: JSON.stringify(firstEventPayload),
  });
  console.log("4. Valid Secret + First Event -> Status:", resFirst.status);
  const firstBody = await resFirst.json();
  console.log("   Body:", JSON.stringify(firstBody));
  if (resFirst.status !== 200 || firstBody.duplicate !== false) {
    throw new Error(`Expected first event to be accepted without duplicate, got: ${JSON.stringify(firstBody)}`);
  }

  // 5. Replay of same event
  const resReplay = await fetch(PREVIEW_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": SECRET,
    },
    body: JSON.stringify(firstEventPayload),
  });
  console.log("5. Replay of Same Event -> Status:", resReplay.status);
  const replayBody = await resReplay.json();
  console.log("   Body:", JSON.stringify(replayBody));
  if (resReplay.status !== 200 || replayBody.duplicate !== true || replayBody.queued !== false) {
    throw new Error(`Expected duplicate to be rejected/deduplicated, got: ${JSON.stringify(replayBody)}`);
  }

  // 6. Fresh new event
  const freshUpdateId = uniqueUpdateId + 1;
  const resFresh = await fetch(PREVIEW_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": SECRET,
    },
    body: JSON.stringify({
      update_id: freshUpdateId,
      message: {
        message_id: 102,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 99999, type: "private" },
        text: "fresh-audit-event",
      },
    }),
  });
  console.log("6. Fresh New Event -> Status:", resFresh.status);
  const freshBody = await resFresh.json();
  console.log("   Body:", JSON.stringify(freshBody));
  if (resFresh.status !== 200 || freshBody.duplicate !== false) {
    throw new Error(`Expected fresh event to be accepted, got: ${JSON.stringify(freshBody)}`);
  }

  // 7. Concurrent duplicate submission
  console.log("\n7. Concurrency Test: 5 concurrent requests with identical update_id...");
  const concurrentUpdateId = uniqueUpdateId + 2;
  const concurrentPayload = JSON.stringify({
    update_id: concurrentUpdateId,
    message: {
      message_id: 103,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 99999, type: "private" },
      text: "concurrent-audit-event",
    },
  });

  const concurrentPromises = Array.from({ length: 5 }, async (_, idx) => {
    const t0 = Date.now();
    const res = await fetch(PREVIEW_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": SECRET,
      },
      body: concurrentPayload,
    });
    const body = await res.json();
    return { idx, status: res.status, latency: Date.now() - t0, body };
  });

  const concurrentResults = await Promise.all(concurrentPromises);
  const accepted = concurrentResults.filter(r => r.body.duplicate === false);
  const deduplicated = concurrentResults.filter(r => r.body.duplicate === true);

  console.log(`   Accepted (duplicate=false): ${accepted.length}`);
  console.log(`   Deduplicated (duplicate=true): ${deduplicated.length}`);
  for (const r of concurrentResults) {
    console.log(`   [Req #${r.idx}] Status: ${r.status}, duplicate: ${r.body.duplicate}, queued: ${r.body.queued}`);
  }

  if (accepted.length !== 1) {
    throw new Error(`Concurrency violation! Expected exactly 1 accepted event, got ${accepted.length}`);
  }
  if (deduplicated.length !== 4) {
    throw new Error(`Concurrency violation! Expected exactly 4 deduplicated events, got ${deduplicated.length}`);
  }

  console.log("\nSUCCESS: All live webhook authentication and replay tests PASSED!");
}

verifyLiveWebhook().catch(err => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
