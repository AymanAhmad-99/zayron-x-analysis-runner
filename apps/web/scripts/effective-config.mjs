/**
 * Effective-config resolver for the web worker (read-only, no network).
 *
 * vinext/Wrangler redirect: `<project>/.wrangler/deploy/config.json` holds
 * `{ "configPath": "<relative to that file>", "auxiliaryWorkers": [] }`. When
 * present, `wrangler deploy` consumes THAT file instead of `wrangler.jsonc`.
 * The guard must validate the same file, so we resolve the redirect
 * dynamically instead of assuming `dist/server/wrangler.json`.
 *
 * Every failure to resolve throws EffectiveConfigError → callers exit 1.
 */
import fs from "node:fs";
import path from "node:path";

export class EffectiveConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const isInside = (parent, child) => {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

/**
 * @param {string} projectDir absolute path of apps/web (or a fixture)
 * @returns {{configPath: string, redirectFile: string, config: unknown}}
 */
export function resolveEffectiveWebConfig(projectDir) {
  const root = path.resolve(projectDir);
  const redirectFile = path.join(root, ".wrangler", "deploy", "config.json");
  if (!fs.existsSync(redirectFile)) {
    throw new EffectiveConfigError(
      "REDIRECT_NOT_FOUND",
      `no redirect at ${redirectFile}; without it Wrangler would use the production top-level wrangler.jsonc`,
    );
  }

  let redirect;
  try {
    redirect = JSON.parse(fs.readFileSync(redirectFile, "utf8"));
  } catch (error) {
    throw new EffectiveConfigError("REDIRECT_MALFORMED", `cannot parse redirect file: ${error instanceof Error ? error.message : error}`);
  }
  if (!redirect || typeof redirect.configPath !== "string" || redirect.configPath.trim() === "") {
    throw new EffectiveConfigError("REDIRECT_MALFORMED", "redirect file has no configPath");
  }
  if (redirect.auxiliaryWorkers !== undefined && !(Array.isArray(redirect.auxiliaryWorkers) && redirect.auxiliaryWorkers.length === 0)) {
    throw new EffectiveConfigError("AUXILIARY_WORKERS", "redirect declares auxiliary workers; they would also be deployed and are unvalidated");
  }

  const configPath = path.resolve(path.dirname(redirectFile), redirect.configPath);
  if (!isInside(root, configPath)) {
    throw new EffectiveConfigError("REDIRECT_ESCAPES_PROJECT", `redirect target ${configPath} is outside ${root}`);
  }
  if (!fs.existsSync(configPath)) {
    throw new EffectiveConfigError("REDIRECT_TARGET_MISSING", `redirect target not found: ${configPath}`);
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    throw new EffectiveConfigError("CONFIG_MALFORMED", `cannot parse ${configPath}: ${error instanceof Error ? error.message : error}`);
  }
  return { configPath, redirectFile, config };
}
