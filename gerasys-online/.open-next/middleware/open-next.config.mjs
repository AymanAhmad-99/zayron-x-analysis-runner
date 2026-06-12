var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js
var cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
function getCloudflareContext(options = { async: false }) {
  return options.async ? getCloudflareContextAsync() : getCloudflareContextSync();
}
function getCloudflareContextFromGlobalScope() {
  const global = globalThis;
  return global[cloudflareContextSymbol];
}
function inSSG() {
  const global = globalThis;
  return global.__NEXT_DATA__?.nextExport === true;
}
function getCloudflareContextSync() {
  const cloudflareContext = getCloudflareContextFromGlobalScope();
  if (cloudflareContext) {
    return cloudflareContext;
  }
  if (inSSG()) {
    throw new Error(`

ERROR: \`getCloudflareContext\` has been called in sync mode in either a static route or at the top level of a non-static one, both cases are not allowed but can be solved by either:
  - make sure that the call is not at the top level and that the route is not static
  - call \`getCloudflareContext({async: true})\` to use the \`async\` mode
  - avoid calling \`getCloudflareContext\` in the route
`);
  }
  throw new Error(initOpenNextCloudflareForDevErrorMsg);
}
async function getCloudflareContextAsync() {
  const cloudflareContext = getCloudflareContextFromGlobalScope();
  if (cloudflareContext) {
    return cloudflareContext;
  }
  const inNodejsRuntime = process.env.NEXT_RUNTIME === "nodejs";
  if (inNodejsRuntime || inSSG()) {
    const cloudflareContext2 = await getCloudflareContextFromWrangler();
    addCloudflareContextToNodejsGlobal(cloudflareContext2);
    return cloudflareContext2;
  }
  throw new Error(initOpenNextCloudflareForDevErrorMsg);
}
function addCloudflareContextToNodejsGlobal(cloudflareContext) {
  const global = globalThis;
  global[cloudflareContextSymbol] = cloudflareContext;
}
async function getCloudflareContextFromWrangler(options) {
  const { getPlatformProxy } = await import(
    /* webpackIgnore: true */
    `${"__wrangler".replaceAll("_", "")}`
  );
  const environment = options?.environment ?? process.env.NEXT_DEV_WRANGLER_ENV;
  const { env, cf, ctx } = await getPlatformProxy({
    ...options,
    // The `env` passed to the fetch handler does not contain variables from `.env*` files.
    // because we invoke wrangler with `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV`=`"false"`.
    // Initializing `envFiles` with an empty list is the equivalent for this API call.
    envFiles: [],
    environment
  });
  return {
    env,
    cf,
    ctx
  };
}
var initOpenNextCloudflareForDevErrorMsg = `

ERROR: \`getCloudflareContext\` has been called without having called \`initOpenNextCloudflareForDev\` from the Next.js config file.
You should update your Next.js config file as shown below:

   \`\`\`
   // next.config.mjs

   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

   initOpenNextCloudflareForDev();

   const nextConfig = { ... };
   export default nextConfig;
   \`\`\`

`;

// node_modules/@opennextjs/cloudflare/dist/api/overrides/asset-resolver/index.js
var resolver = {
  name: "cloudflare-asset-resolver",
  async maybeGetAssetResult(event) {
    const { ASSETS } = getCloudflareContext().env;
    if (!ASSETS || !isUserWorkerFirst(globalThis.__ASSETS_RUN_WORKER_FIRST__, event.rawPath)) {
      return void 0;
    }
    const { method, headers } = event;
    if (method !== "GET" && method != "HEAD") {
      return void 0;
    }
    const url = new URL(event.rawPath, "https://assets.local");
    const response = await ASSETS.fetch(url, {
      headers,
      method
    });
    if (response.status === 404) {
      await response.body?.cancel();
      return void 0;
    }
    return {
      type: "core",
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: getResponseBody(method, response),
      isBase64Encoded: false
    };
  }
};
function getResponseBody(method, response) {
  if (method === "HEAD") {
    return null;
  }
  return response.body || new ReadableStream();
}
function isUserWorkerFirst(runWorkerFirst, pathname) {
  if (!Array.isArray(runWorkerFirst)) {
    return runWorkerFirst ?? false;
  }
  let hasPositiveMatch = false;
  for (let rule of runWorkerFirst) {
    let isPositiveRule = true;
    if (rule.startsWith("!")) {
      rule = rule.slice(1);
      isPositiveRule = false;
    } else if (hasPositiveMatch) {
      continue;
    }
    const match = new RegExp(`^${rule.replace(/([[\]().*+?^$|{}\\])/g, "\\$1").replace("\\*", ".*")}$`).test(pathname);
    if (match) {
      if (isPositiveRule) {
        hasPositiveMatch = true;
      } else {
        return false;
      }
    }
  }
  return hasPositiveMatch;
}
var asset_resolver_default = resolver;

// node_modules/@opennextjs/cloudflare/dist/api/config.js
function defineCloudflareConfig(config = {}) {
  const { incrementalCache, tagCache, queue, cachePurge, enableCacheInterception = false, routePreloadingBehavior = "none" } = config;
  return {
    default: {
      override: {
        wrapper: "cloudflare-node",
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue),
        cdnInvalidation: resolveCdnInvalidation(cachePurge)
      },
      routePreloadingBehavior
    },
    // node:crypto is used to compute cache keys
    edgeExternals: ["node:crypto"],
    cloudflare: {
      useWorkerdCondition: true
    },
    dangerous: {
      enableCacheInterception
    },
    middleware: {
      external: true,
      override: {
        wrapper: "cloudflare-edge",
        converter: "edge",
        proxyExternalRequest: "fetch",
        incrementalCache: resolveIncrementalCache(incrementalCache),
        tagCache: resolveTagCache(tagCache),
        queue: resolveQueue(queue)
      },
      assetResolver: () => asset_resolver_default
    }
  };
}
function resolveIncrementalCache(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveTagCache(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveQueue(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}
function resolveCdnInvalidation(value = "dummy") {
  if (typeof value === "string") {
    return value;
  }
  return typeof value === "function" ? value : () => value;
}

// node_modules/@opennextjs/aws/dist/utils/error.js
var IgnorableError = class extends Error {
  constructor(message) {
    super(message);
    __publicField(this, "__openNextInternal", true);
    __publicField(this, "canIgnore", true);
    __publicField(this, "logLevel", 0);
    this.name = "IgnorableError";
  }
};
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
var DOWNPLAYED_ERROR_LOGS = [
  {
    clientName: "S3Client",
    commandName: "GetObjectCommand",
    errorName: "NoSuchKey"
  }
];
var isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
function error(...args) {
  if (args.some((arg) => isDownplayedErrorLog(arg))) {
    return debug(...args);
  }
  if (args.some((arg) => isOpenNextError(arg))) {
    const error2 = args.find((arg) => isOpenNextError(arg));
    if (error2.logLevel < getOpenNextErrorLogLevel()) {
      return;
    }
    if (error2.logLevel === 0) {
      return console.log(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    if (error2.logLevel === 1) {
      return warn(...args.map((arg) => isOpenNextError(arg) ? `${arg.name}: ${arg.message}` : arg));
    }
    return console.error(...args);
  }
  console.error(...args);
}
function getOpenNextErrorLogLevel() {
  const strLevel = process.env.OPEN_NEXT_ERROR_LOG_LEVEL ?? "1";
  switch (strLevel.toLowerCase()) {
    case "debug":
    case "0":
      return 0;
    case "error":
    case "2":
      return 2;
    default:
      return 1;
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/internal.js
import { createHash } from "node:crypto";
var debugCache = (name, ...args) => {
  if (process.env.NEXT_PRIVATE_DEBUG_CACHE) {
    console.log(`[${name}] `, ...args);
  }
};
var FALLBACK_BUILD_ID = "no-build-id";
var DEFAULT_PREFIX = "incremental-cache";
function computeCacheKey(key, options) {
  const { cacheType = "cache", prefix = DEFAULT_PREFIX, buildId = FALLBACK_BUILD_ID } = options;
  const hash = createHash("sha256").update(key).digest("hex");
  return `${prefix}/${buildId}/${hash}.${cacheType}`.replace(/\/+/g, "/");
}
function isPurgeCacheEnabled() {
  const cdnInvalidation = globalThis.openNextConfig?.default?.override?.cdnInvalidation;
  return cdnInvalidation !== void 0 && cdnInvalidation !== "dummy";
}
async function purgeCacheByTags(tags) {
  const { env } = getCloudflareContext();
  if (env.NEXT_CACHE_DO_PURGE) {
    const durableObject = env.NEXT_CACHE_DO_PURGE;
    const id = durableObject.idFromName("cache-purge");
    const obj = durableObject.get(id);
    await obj.purgeCacheByTags(tags);
  } else {
    await internalPurgeCacheByTags(env, tags);
  }
}
async function internalPurgeCacheByTags(env, tags) {
  if (!env.CACHE_PURGE_ZONE_ID || !env.CACHE_PURGE_API_TOKEN) {
    error("No cache zone ID or API token provided. Skipping cache purge.");
    return "missing-credentials";
  }
  let response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CACHE_PURGE_ZONE_ID}/purge_cache`, {
      headers: {
        Authorization: `Bearer ${env.CACHE_PURGE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({
        tags
      })
    });
    if (response.status === 429) {
      error("purgeCacheByTags: Rate limit exceeded. Skipping cache purge.");
      return "rate-limit-exceeded";
    }
    const bodyResponse = await response.json();
    if (!bodyResponse.success) {
      error("purgeCacheByTags: Cache purge failed. Errors:", bodyResponse.errors.map((error2) => `${error2.code}: ${error2.message}`));
      return "purge-failed";
    }
    debugCache("purgeCacheByTags", "Cache purged successfully for tags:", tags);
    return "purge-success";
  } catch (error2) {
    console.error("Error purging cache by tags:", error2);
    return "purge-failed";
  } finally {
    try {
      await response?.body?.cancel();
    } catch {
    }
  }
}

// node_modules/@opennextjs/cloudflare/dist/api/overrides/incremental-cache/kv-incremental-cache.js
var NAME = "cf-kv-incremental-cache";
var BINDING_NAME = "NEXT_INC_CACHE_KV";
var PREFIX_ENV_NAME = "NEXT_INC_CACHE_KV_PREFIX";
var KVIncrementalCache = class {
  constructor() {
    __publicField(this, "name", NAME);
  }
  async get(key, cacheType) {
    const kv = getCloudflareContext().env[BINDING_NAME];
    if (!kv)
      throw new IgnorableError("No KV Namespace");
    debugCache("KVIncrementalCache", `get ${key}`);
    try {
      const entry = await kv.get(this.getKVKey(key, cacheType), "json");
      if (!entry)
        return null;
      if ("lastModified" in entry) {
        return entry;
      }
      return {
        value: entry,
        lastModified: globalThis.__BUILD_TIMESTAMP_MS__
      };
    } catch (e) {
      error("Failed to get from cache", e);
      return null;
    }
  }
  async set(key, value, cacheType) {
    const kv = getCloudflareContext().env[BINDING_NAME];
    if (!kv)
      throw new IgnorableError("No KV Namespace");
    debugCache("KVIncrementalCache", `set ${key}`);
    try {
      await kv.put(
        this.getKVKey(key, cacheType),
        JSON.stringify({
          value,
          // Note: `Date.now()` returns the time of the last IO rather than the actual time.
          //       See https://developers.cloudflare.com/workers/reference/security-model/
          lastModified: Date.now()
        })
        // TODO: Figure out how to best leverage KV's TTL.
        // NOTE: Ideally, the cache should operate in an SWR-like manner.
      );
    } catch (e) {
      error("Failed to set to cache", e);
    }
  }
  async delete(key) {
    const kv = getCloudflareContext().env[BINDING_NAME];
    if (!kv)
      throw new IgnorableError("No KV Namespace");
    debugCache("KVIncrementalCache", `delete ${key}`);
    try {
      await kv.delete(this.getKVKey(key, "cache"));
    } catch (e) {
      error("Failed to delete from cache", e);
    }
  }
  getKVKey(key, cacheType) {
    return computeCacheKey(key, {
      prefix: getCloudflareContext().env[PREFIX_ENV_NAME],
      buildId: process.env.OPEN_NEXT_BUILD_ID,
      cacheType
    });
  }
};
var kv_incremental_cache_default = new KVIncrementalCache();

// node_modules/@opennextjs/cloudflare/dist/api/overrides/tag-cache/kv-next-tag-cache.js
var NAME2 = "kv-next-mode-tag-cache";
var BINDING_NAME2 = "NEXT_TAG_CACHE_KV";
function getRevalidatedAt(value) {
  return typeof value === "number" ? value : value.revalidatedAt ?? 0;
}
function getStale(value) {
  return typeof value === "number" ? value : value.stale ?? null;
}
function getExpire(value) {
  return typeof value === "number" ? null : value.expire ?? null;
}
var _KVNextModeTagCache_instances, getLastRevalidated_fn, resolveTagValues_fn;
var KVNextModeTagCache = class {
  constructor() {
    __privateAdd(this, _KVNextModeTagCache_instances);
    __publicField(this, "mode", "nextMode");
    __publicField(this, "name", NAME2);
  }
  async getLastRevalidated(tags) {
    const timeMs = await __privateMethod(this, _KVNextModeTagCache_instances, getLastRevalidated_fn).call(this, tags);
    debugCache("KVNextModeTagCache", `getLastRevalidated tags=${tags} -> time=${timeMs}`);
    return timeMs;
  }
  async hasBeenRevalidated(tags, lastModified) {
    const kv = this.getKv();
    if (!kv || tags.length === 0) {
      return false;
    }
    try {
      const now = Date.now();
      const result = await __privateMethod(this, _KVNextModeTagCache_instances, resolveTagValues_fn).call(this, tags, kv);
      const revalidated = [...result.values()].some((v) => {
        if (v == null)
          return false;
        const expire = getExpire(v);
        if (expire != null)
          return expire <= now && expire > (lastModified ?? 0);
        return getRevalidatedAt(v) > (lastModified ?? now);
      });
      debugCache("KVNextModeTagCache", `hasBeenRevalidated tags=${tags} lastModified=${lastModified} -> ${revalidated}`);
      return revalidated;
    } catch (e) {
      error(e);
      return false;
    }
  }
  async writeTags(tags) {
    const kv = this.getKv();
    if (!kv || tags.length === 0) {
      return Promise.resolve();
    }
    const nowMs = Date.now();
    await Promise.all(tags.map(async (tag) => {
      if (typeof tag === "string") {
        await kv.put(this.getCacheKey(tag), String(nowMs));
      } else {
        const stale = tag.stale ?? nowMs;
        const value = { revalidatedAt: stale, stale, expire: tag.expire ?? null };
        await kv.put(this.getCacheKey(tag.tag), JSON.stringify(value));
      }
    }));
    const tagStrings = tags.map((t) => typeof t === "string" ? t : t.tag);
    debugCache("KVNextModeTagCache", `writeTags tags=${tagStrings} time=${nowMs}`);
    if (isPurgeCacheEnabled()) {
      await purgeCacheByTags(tagStrings);
    }
  }
  async isStale(tags, lastModified) {
    const kv = this.getKv();
    if (!kv || tags.length === 0)
      return false;
    try {
      const now = Date.now();
      const result = await __privateMethod(this, _KVNextModeTagCache_instances, resolveTagValues_fn).call(this, tags, kv);
      const isStale = [...result.values()].some((v) => {
        if (v == null)
          return false;
        const stale = getStale(v);
        const expire = getExpire(v);
        const lastModifiedOrNow = lastModified ?? now;
        const isInStaleWindow = stale != null && getRevalidatedAt(v) > lastModifiedOrNow && lastModifiedOrNow <= stale;
        if (!isInStaleWindow)
          return false;
        return expire == null || expire > now;
      });
      debugCache("KVNextModeTagCache", `isStale tags=${tags} lastModified=${lastModified} -> ${isStale}`);
      return isStale;
    } catch (e) {
      error(e);
      return false;
    }
  }
  /**
   * Returns the KV namespace when it exists and tag cache is not disabled.
   *
   * @returns KV namespace or undefined
   */
  getKv() {
    const kv = getCloudflareContext().env[BINDING_NAME2];
    if (!kv) {
      error(`No KV binding ${BINDING_NAME2} found`);
      return void 0;
    }
    const isDisabled = Boolean(globalThis.openNextConfig.dangerous?.disableTagCache);
    return isDisabled ? void 0 : kv;
  }
  getCacheKey(key) {
    return `${this.getBuildId()}/${key}`.replaceAll("//", "/");
  }
  getBuildId() {
    return process.env.OPEN_NEXT_BUILD_ID ?? FALLBACK_BUILD_ID;
  }
  /**
   * @returns request scoped in-memory cache for tag values, or undefined if ALS is not available.
   */
  getItemsCache() {
    const store = globalThis.__openNextAls?.getStore();
    return store?.requestCache.getOrCreate("kv-nextMode:tagItems");
  }
};
_KVNextModeTagCache_instances = new WeakSet();
getLastRevalidated_fn = async function(tags) {
  const kv = this.getKv();
  if (!kv || tags.length === 0) {
    return 0;
  }
  try {
    const result = await __privateMethod(this, _KVNextModeTagCache_instances, resolveTagValues_fn).call(this, tags, kv);
    const revalidations = [...result.values()].filter((v) => v != null).map(getRevalidatedAt);
    return revalidations.length === 0 ? 0 : Math.max(...revalidations);
  } catch (e) {
    error(e);
    return 0;
  }
};
resolveTagValues_fn = async function(tags, kv) {
  const result = /* @__PURE__ */ new Map();
  const uncachedTags = [];
  const itemsCache = this.getItemsCache();
  for (const tag of tags) {
    if (itemsCache?.has(tag)) {
      result.set(tag, itemsCache.get(tag) ?? null);
    } else {
      uncachedTags.push(tag);
    }
  }
  if (uncachedTags.length > 0) {
    const kvKeys = uncachedTags.map((tag) => this.getCacheKey(tag));
    const fetched = await kv.get(kvKeys, { type: "json" });
    for (const tag of uncachedTags) {
      const value = fetched.get(this.getCacheKey(tag)) ?? null;
      itemsCache?.set(tag, value);
      result.set(tag, value);
    }
  }
  return result;
};
var kv_next_tag_cache_default = new KVNextModeTagCache();

// open-next.config.ts
var open_next_config_default = defineCloudflareConfig({
  incrementalCache: kv_incremental_cache_default,
  tagCache: kv_next_tag_cache_default
});
export {
  open_next_config_default as default
};
