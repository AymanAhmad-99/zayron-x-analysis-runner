/**
 * Phase 4A — the single source of truth for the PRODUCTION web identity.
 *
 * THE FOOTGUN THIS CLOSES (Gate 3B)
 * `apps/web/build` ends with `scripts/prepare-preview.js`, which rewrites
 * `dist/server/wrangler.json` to the PREVIEW identity (`zayron-x-web-preview`,
 * `workers_dev = true`, preview API binding, preview URLs). `wrangler deploy
 * --env production` then silently deployed that file, because
 * `apps/web/.wrangler/deploy/config.json` redirects Wrangler to the generated
 * config and the `--env` flag never reaches the user config.
 *
 * So the production deploy MUST NOT depend on `--env`. It materialises an
 * explicit production config from the built artifact and refuses to deploy
 * unless every identity field is production and no preview marker survives.
 *
 * Pure (no fs/network) so it is unit-testable.
 */

export const PRODUCTION_WEB_IDENTITY = {
  name: 'zayron-x-web',
  routes: [
    { pattern: 'zayron-x.co/*', zone_name: 'zayron-x.co' },
    { pattern: 'www.zayron-x.co/*', zone_name: 'zayron-x.co' },
  ],
  vars: {
    ENVIRONMENT: 'production',
    NEXT_PUBLIC_ENVIRONMENT: 'production',
    NEXT_PUBLIC_SITE_URL: 'https://zayron-x.co',
    NEXT_PUBLIC_API_BASE_URL: 'https://zayron-x.co/api/v1',
    API_BASE_URL: 'https://api.zayron-x.co/api/v1',
    SITEMAP_MAX_SHARDS: '10',
  },
  apiService: 'zayron-x-api',
};

/** Any occurrence of these in identity fields means the build is PREVIEW-shaped. */
export const PREVIEW_MARKERS = ['preview', 'workers.dev', 'noindex'];

/** Wrangler writes these machine-local pointers; they must not ship. */
const LOCAL_ONLY_KEYS = ['configPath', 'userConfigPath', 'env', 'dev'];

export function buildProductionWebConfig(baseConfig) {
  const source = JSON.parse(JSON.stringify(baseConfig || {}));
  for (const key of LOCAL_ONLY_KEYS) delete source[key];

  source.name = PRODUCTION_WEB_IDENTITY.name;
  source.workers_dev = false;
  // A preview route array ([]) or a stale preview pattern is REPLACED, never merged.
  source.routes = PRODUCTION_WEB_IDENTITY.routes.map((route) => ({ ...route }));
  // Vars are replaced wholesale: a partial merge keeps NEXT_PUBLIC_PREVIEW_MODE alive.
  source.vars = { ...PRODUCTION_WEB_IDENTITY.vars };
  source.services = [{ binding: 'API', service: PRODUCTION_WEB_IDENTITY.apiService }];
  source.triggers = source.triggers || {};
  return source;
}

/**
 * Hard identity assertion. Returns a list of human-readable violations; an
 * empty list means the config is safe to deploy to production.
 */
export function assertProductionWebConfig(config) {
  const errors = [];
  if (!config || typeof config !== 'object') return ['CONFIG_MISSING'];

  if (config.name !== PRODUCTION_WEB_IDENTITY.name) {
    errors.push(`NAME_NOT_PRODUCTION:${config.name ?? 'MISSING'}`);
  }
  if (config.workers_dev !== false) errors.push('WORKERS_DEV_ENABLED');

  const patterns = Array.isArray(config.routes) ? config.routes.map((r) => r?.pattern) : [];
  for (const expected of PRODUCTION_WEB_IDENTITY.routes.map((r) => r.pattern)) {
    if (!patterns.includes(expected)) errors.push(`ROUTE_MISSING:${expected}`);
  }
  for (const pattern of patterns) {
    const allowed = PRODUCTION_WEB_IDENTITY.routes.some((r) => r.pattern === pattern);
    if (!allowed) errors.push(`ROUTE_NOT_PRODUCTION:${pattern}`);
  }

  const services = Array.isArray(config.services) ? config.services : [];
  const api = services.find((s) => s?.binding === 'API');
  if (!api) errors.push('API_BINDING_MISSING');
  else if (api.service !== PRODUCTION_WEB_IDENTITY.apiService) errors.push(`API_BINDING_NOT_PRODUCTION:${api.service}`);

  const vars = config.vars || {};
  if (vars.ENVIRONMENT !== 'production') errors.push(`ENVIRONMENT_NOT_PRODUCTION:${vars.ENVIRONMENT ?? 'MISSING'}`);
  if (vars.NEXT_PUBLIC_SITE_URL !== PRODUCTION_WEB_IDENTITY.vars.NEXT_PUBLIC_SITE_URL) {
    errors.push(`SITE_URL_NOT_PRODUCTION:${vars.NEXT_PUBLIC_SITE_URL ?? 'MISSING'}`);
  }
  if (vars.API_BASE_URL !== PRODUCTION_WEB_IDENTITY.vars.API_BASE_URL) {
    errors.push(`API_BASE_URL_NOT_PRODUCTION:${vars.API_BASE_URL ?? 'MISSING'}`);
  }
  if (vars.SITEMAP_MAX_SHARDS !== PRODUCTION_WEB_IDENTITY.vars.SITEMAP_MAX_SHARDS) {
    errors.push(`SITEMAP_SHARDS_NOT_PINNED:${vars.SITEMAP_MAX_SHARDS ?? 'MISSING'}`);
  }
  if (vars.NEXT_PUBLIC_PREVIEW_MODE !== undefined) errors.push('PREVIEW_MODE_FLAG_PRESENT');

  // Belt and braces: scan every identity field for a preview marker.
  const identity = JSON.stringify({
    name: config.name,
    workers_dev: config.workers_dev,
    routes: patterns,
    services: services.map((s) => s?.service),
    vars,
  }).toLowerCase();
  for (const marker of PREVIEW_MARKERS) {
    if (identity.includes(marker)) errors.push(`PREVIEW_MARKER:${marker}`);
  }

  if (config.env !== undefined) errors.push('NESTED_ENV_PRESENT');
  if (config.configPath !== undefined || config.userConfigPath !== undefined) errors.push('WRANGLER_POINTER_PRESENT');
  if (!config.assets || typeof config.assets.directory !== 'string' || !config.assets.directory) {
    errors.push('ASSETS_DIRECTORY_MISSING');
  }
  if (typeof config.main !== 'string' || !config.main) errors.push('MAIN_MISSING');

  return [...new Set(errors)];
}
