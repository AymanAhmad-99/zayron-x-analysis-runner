import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distWranglerPath = path.resolve(__dirname, "../dist/server/wrangler.json");

if (fs.existsSync(distWranglerPath)) {
  const cfg = JSON.parse(fs.readFileSync(distWranglerPath, "utf8"));
  delete cfg.env;
  cfg.name = "zayron-x-web-preview";
  cfg.workers_dev = true;
  cfg.routes = [];
  // Gate 3A.2 — the preview web Worker reads the preview API over a Service
  // Binding (a `*.workers.dev` subrequest in the same zone is Error 1042).
  cfg.services = [{ binding: "API", service: "zayron-x-api-preview" }];
  cfg.vars = {
    ENVIRONMENT: "preview",
    NEXT_PUBLIC_ENVIRONMENT: "preview",
    NEXT_PUBLIC_PREVIEW_MODE: "true",
    NEXT_PUBLIC_SITE_URL: "https://zayron-x-web-preview.aabusabih.workers.dev",
    NEXT_PUBLIC_API_BASE_URL: "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1",
  };
  fs.writeFileSync(distWranglerPath, JSON.stringify(cfg, null, 2));
  console.log("Successfully prepared dist/server/wrangler.json for zayron-x-web-preview deployment.");
} else {
  console.error("dist/server/wrangler.json not found. Run npm run build first.");
  process.exit(1);
}
