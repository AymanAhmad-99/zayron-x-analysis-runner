import crypto from "node:crypto";
import { spawn } from "node:child_process";

const PREVIEW_BASE = "https://zayron-x-api-preview.aabusabih.workers.dev";
const OLD_TOKEN = process.env.OLD_ADMIN_API_TOKEN || "revoked-phase-g-preview-admin-token";

async function rotateSecret() {
  console.log("=== PREVIEW ADMIN TOKEN ROTATION ===");
  console.log("Target Worker: zayron-x-api-preview");

  // Generate cryptographically secure token (32 bytes hex)
  const newToken = crypto.randomBytes(32).toString("hex");

  console.log("1. Dispatching secret update to Cloudflare via Wrangler...");
  const wrangler = spawn("npx", ["wrangler", "secret", "put", "ADMIN_API_TOKEN", "--name", "zayron-x-api-preview"], {
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  });

  wrangler.stdin.write(newToken + "\n");
  wrangler.stdin.end();

  const exitCode = await new Promise((resolve) => {
    wrangler.on("close", resolve);
  });

  if (exitCode !== 0) {
    console.error("FAIL: Wrangler secret put failed with exit code:", exitCode);
    process.exit(1);
  }

  console.log("2. Secret put completed. Waiting 5s for Cloudflare edge propagation...");
  await new Promise((r) => setTimeout(r, 5000));

  console.log("3. Verifying credential invalidation (old token must return 401)...");
  const resOld = await fetch(`${PREVIEW_BASE}/api/v1/admin/ai-budget`, {
    headers: { "X-Admin-Token": OLD_TOKEN },
  });
  console.log("   Old token response status:", resOld.status, "(Expected 401)");

  console.log("4. Verifying credential activation (new token must return 200)...");
  const resNew = await fetch(`${PREVIEW_BASE}/api/v1/admin/ai-budget`, {
    headers: { "X-Admin-Token": newToken },
  });
  console.log("   New token response status:", resNew.status, "(Expected 200)");

  console.log("5. Verifying unauthenticated access (must return 401)...");
  const resNoAuth = await fetch(`${PREVIEW_BASE}/api/v1/admin/ai-budget`);
  console.log("   No-auth response status:", resNoAuth.status, "(Expected 401)");

  if (resOld.status === 401 && resNew.status === 200 && resNoAuth.status === 401) {
    console.log("\nSUCCESS: SECRET_EXPOSURE_ROTATED_AND_VERIFIED!");
    console.log("Old token is REVOKED. New token is ACTIVE on preview. Zero secret values printed.");
  } else {
    console.error("FAIL: Secret rotation verification failed!");
    process.exit(1);
  }
}

rotateSecret().catch((err) => {
  console.error("Rotation error:", err);
  process.exit(1);
});
