import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const url = process.env.SHELL_URL ?? "http://127.0.0.1:8787/intelligence";
const output = "D:/Temp/zayron-intelligence-shell-verification";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
for (const [name, width, height] of [["desktop", 1440, 1000], ["tablet", 768, 1000], ["mobile", 375, 900]]) {
  const page = await browser.newPage({ viewport: { width, height } }); const requests = [];
  page.on("request", (request) => { if (request.url().includes("/api/v1/intelligence")) requests.push(request.url()); });
  await page.goto(url, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  const shell = await page.locator(".intelligence-app").isVisible(); const search = await page.getByRole("button", { name: /SEARCH/ }).count();
  let drawer = true; if (width <= 900) { drawer = false; await page.getByRole("button", { name: /Open intelligence navigation/ }).click(); drawer = await page.locator(".intelligence-sidebar.open").isVisible(); }
  await page.screenshot({ path: `${output}/intelligence-shell-${name}-${width}x${height}.png`, fullPage: true }); results.push({ name, width, height, shell, search: search > 0, drawer, api: requests.length > 0, ...metrics }); await page.close();
}
await browser.close(); console.log(JSON.stringify(results, null, 2));
if (results.some((item) => !item.shell || !item.search || !item.api || item.scrollWidth !== item.clientWidth || !item.drawer)) process.exit(1);
