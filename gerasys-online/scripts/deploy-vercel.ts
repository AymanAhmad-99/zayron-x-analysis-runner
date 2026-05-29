#!/usr/bin/env bun
/**
 * ZAYRON-X — Vercel Deploy Script
 *
 * Deploys the Next.js application to Vercel staging/production.
 *
 * Prerequisites:
 *   1. Vercel CLI installed (bunx vercel)
 *   2. Vercel account linked — run `bunx vercel link` first
 *   3. .env.local file with all environment variables
 *
 * Usage:
 *   bun run scripts/deploy-vercel.ts          # Deploy to staging (preview)
 *   bun run scripts/deploy-vercel.ts --prod    # Deploy to production
 */

import { execSync } from "child_process";

const isProd = process.argv.includes("--prod");
const phase = isProd ? "PRODUCTION" : "STAGING (preview)";

console.log("=".repeat(60));
console.log(`  ZAYRON-X — Vercel ${phase} Deployment`);
console.log("=".repeat(60));

// Step 1: Verify environment
console.log("\n[1/4] Checking environment...");
try {
  execSync("bunx vercel --version", { stdio: "pipe" });
  console.log("  ✓ Vercel CLI available");
} catch {
  console.error("  ✗ Vercel CLI not found. Install: npm i -g vercel");
  process.exit(1);
}

// Step 2: Verify .env.local exists
if (!require("fs").existsSync(".env.local")) {
  console.error("  ✗ .env.local not found. Create from .env.example");
  process.exit(1);
}
console.log("  ✓ .env.local found");

// Step 3: Link project if not linked
console.log("\n[2/4] Linking Vercel project...");
try {
  execSync("bunx vercel link --yes", { stdio: "pipe" });
  console.log("  ✓ Project linked to Vercel");
} catch {
  console.warn("  ⚠ Project may already be linked or link failed");
}

// Step 4: Pull remote env vars, then push local env vars
console.log("\n[3/4] Syncing environment variables...");
try {
  execSync("bunx vercel env pull .env.vercel", { stdio: "pipe" });
  console.log("  ✓ Remote env pulled");
} catch {
  console.warn("  ⚠ Could not pull remote env (first deploy?)");
}

// Step 5: Deploy
console.log("\n[4/4] Deploying...");
const deployCmd = isProd ? "bunx vercel deploy --prod --yes" : "bunx vercel deploy --yes";
try {
  const output = execSync(deployCmd, { stdio: "pipe" }).toString().trim();
  const url = output.split("\n").pop()?.trim() ?? output;
  console.log(`  ✓ Deployed to: ${url}`);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ZAYRON-X live at:`);
  console.log(`  ${url}`);
  if (!isProd) {
    console.log(`  Promote to production: bunx vercel promote`);
  }
  console.log(`${"=".repeat(60)}`);
} catch (err: any) {
  console.error(`  ✗ Deploy failed: ${err.message}`);
  process.exit(1);
}
