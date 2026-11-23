import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const baseUrl = process.env.HERO_URL ?? "http://127.0.0.1:8787";
const server = process.env.HERO_URL ? null : spawn("bunx", ["wrangler", "dev", "--local", "--port", "8787"], { cwd: process.cwd(), windowsHide: true, stdio: "ignore" });
if (server) await new Promise((resolve) => setTimeout(resolve, 10000));

const output = process.env.SCREENSHOT_OUTPUT ?? "D:/Temp/zayron-hero-verification";
const prefix = process.env.SCREENSHOT_PREFIX ?? "";
await mkdir(output, { recursive: true });
const metrics = [];
const browser = await chromium.launch({ headless: true });
console.log("BROWSER_STARTED");
for (const [name, width, height] of [["desktop", 1440, 1000], ["tablet", 768, 1000], ["mobile", 375, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  console.log(`OPENING_${name}`);
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${output}/${prefix}${name}-${width}x${height}.png`, fullPage: true });
  const viewportMetrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyHeight: document.body.scrollHeight }));
  metrics.push({ name, width, height, ...viewportMetrics });
  await page.close();
}
await browser.close();
server?.kill();
await writeFile(`${output}/metrics.json`, JSON.stringify(metrics, null, 2));
