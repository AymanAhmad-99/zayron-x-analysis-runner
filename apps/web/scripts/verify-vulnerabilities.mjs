import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.VULN_URL ?? "http://127.0.0.1:8787/intelligence/vulnerabilities";
const output = "D:/Temp/zayron-vulnerabilities-verification";
const cases = [["desktop", 1440, 1000], ["tablet", 768, 1000], ["mobile", 375, 900]];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, timeout: 15000, executablePath: process.env.BROWSER_EXECUTABLE ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", args: ["--disable-gpu"] });
const results = [];

try {
  for (const [name, width, height] of cases) {
    const page = await browser.newPage({ viewport: { width, height } });
    const requests = [];
    const consoleErrors = [];
    page.on("request", (request) => { if (request.url().includes("/api/v1/intelligence") && request.url().includes("category=vulnerability")) requests.push(request.url()); });
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    const response = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.locator("table").waitFor({ state: "visible", timeout: 15000 });
    const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    const headerButtons = await page.locator("thead button").count();
    const before = await page.locator("tbody tr").allTextContents();
    if (headerButtons) await page.locator("thead button").nth(1).click();
    const after = await page.locator("tbody tr").allTextContents();
    await page.screenshot({ path: `${output}/vulnerabilities-${name}-${width}x${height}.png`, fullPage: true });
    results.push({ name, width, http: response?.status(), table: true, api: requests.length > 0, sorting: headerButtons > 0 && JSON.stringify(before) !== JSON.stringify(after), headerButtons, consoleErrors, ...metrics });
    await page.close();
  }
} finally { await browser.close(); }

console.log(JSON.stringify(results, null, 2));
if (results.some((item) => item.http !== 200 || !item.table || !item.api || !item.headerButtons || item.scrollWidth !== item.clientWidth || item.consoleErrors.length)) process.exit(1);
