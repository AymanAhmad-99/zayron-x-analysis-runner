
import {Buffer} from "node:buffer";
globalThis.Buffer = Buffer;

import {AsyncLocalStorage} from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;


const defaultDefineProperty = Object.defineProperty;
Object.defineProperty = function(o, p, a) {
  if(p=== '__import_unsupported' && Boolean(globalThis.__import_unsupported)) {
    return;
  }
  return defaultDefineProperty(o, p, a);
};

  
  
  globalThis.openNextDebug = false;globalThis.openNextVersion = "4.0.2";globalThis.nextVersion = "16.2.7";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/@opennextjs/aws/dist/utils/error.js
function isOpenNextError(e) {
  try {
    return "__openNextInternal" in e;
  } catch {
    return false;
  }
}
var init_error = __esm({
  "node_modules/@opennextjs/aws/dist/utils/error.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/adapters/logger.js
function debug(...args) {
  if (globalThis.openNextDebug) {
    console.log(...args);
  }
}
function warn(...args) {
  console.warn(...args);
}
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
var DOWNPLAYED_ERROR_LOGS, isDownplayedErrorLog;
var init_logger = __esm({
  "node_modules/@opennextjs/aws/dist/adapters/logger.js"() {
    init_error();
    DOWNPLAYED_ERROR_LOGS = [
      {
        clientName: "S3Client",
        commandName: "GetObjectCommand",
        errorName: "NoSuchKey"
      }
    ];
    isDownplayedErrorLog = (errorLog) => DOWNPLAYED_ERROR_LOGS.some((downplayedInput) => downplayedInput.clientName === errorLog?.clientName && downplayedInput.commandName === errorLog?.commandName && (downplayedInput.errorName === errorLog?.error?.name || downplayedInput.errorName === errorLog?.error?.Code));
  }
});

// node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie;
    exports.parse = parseCookie;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = function() {
      };
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date = new Date(val);
            if (Number.isFinite(date.valueOf()))
              setCookie.expires = date;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
  }
});

// node_modules/@opennextjs/aws/dist/http/util.js
function parseSetCookieHeader(cookies) {
  if (!cookies) {
    return [];
  }
  if (typeof cookies === "string") {
    return cookies.split(/(?<!Expires=\w+),/i).map((c) => c.trim());
  }
  return cookies;
}
function getQueryFromIterator(it) {
  const query = {};
  for (const [key, value] of it) {
    if (key in query) {
      if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    } else {
      query[key] = value;
    }
  }
  return query;
}
var init_util = __esm({
  "node_modules/@opennextjs/aws/dist/http/util.js"() {
    init_logger();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/utils.js
function getQueryFromSearchParams(searchParams) {
  return getQueryFromIterator(searchParams.entries());
}
var init_utils = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/utils.js"() {
    init_util();
  }
});

// node_modules/@opennextjs/aws/dist/overrides/converters/edge.js
var edge_exports = {};
__export(edge_exports, {
  default: () => edge_default
});
import { Buffer as Buffer2 } from "node:buffer";
var import_cookie, NULL_BODY_STATUSES, converter, edge_default;
var init_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/converters/edge.js"() {
    import_cookie = __toESM(require_dist(), 1);
    init_util();
    init_utils();
    NULL_BODY_STATUSES = /* @__PURE__ */ new Set([101, 103, 204, 205, 304]);
    converter = {
      convertFrom: async (event) => {
        const url = new URL(event.url);
        const searchParams = url.searchParams;
        const query = getQueryFromSearchParams(searchParams);
        const headers = {};
        event.headers.forEach((value, key) => {
          headers[key] = value;
        });
        const rawPath = url.pathname;
        const method = event.method;
        const shouldHaveBody = method !== "GET" && method !== "HEAD";
        const body = shouldHaveBody ? Buffer2.from(await event.arrayBuffer()) : void 0;
        const cookieHeader = event.headers.get("cookie");
        const cookies = cookieHeader ? import_cookie.default.parse(cookieHeader) : {};
        return {
          type: "core",
          method,
          rawPath,
          url: event.url,
          body,
          headers,
          remoteAddress: event.headers.get("x-forwarded-for") ?? "::1",
          query,
          cookies
        };
      },
      convertTo: async (result) => {
        if ("internalEvent" in result) {
          const request = new Request(result.internalEvent.url, {
            body: result.internalEvent.body,
            method: result.internalEvent.method,
            headers: {
              ...result.internalEvent.headers,
              "x-forwarded-host": result.internalEvent.headers.host
            }
          });
          if (globalThis.__dangerous_ON_edge_converter_returns_request === true) {
            return request;
          }
          const cfCache = (result.isISR || result.internalEvent.rawPath.startsWith("/_next/image")) && process.env.DISABLE_CACHE !== "true" ? { cacheEverything: true } : {};
          return fetch(request, {
            // This is a hack to make sure that the response is cached by Cloudflare
            // See https://developers.cloudflare.com/workers/examples/cache-using-fetch/#caching-html-resources
            // @ts-expect-error - This is a Cloudflare specific option
            cf: cfCache
          });
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(result.headers)) {
          if (key === "set-cookie" && typeof value === "string") {
            const cookies = parseSetCookieHeader(value);
            for (const cookie of cookies) {
              headers.append(key, cookie);
            }
            continue;
          }
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }
        const body = NULL_BODY_STATUSES.has(result.statusCode) ? null : result.body;
        return new Response(body, {
          status: result.statusCode,
          headers
        });
      },
      name: "edge"
    };
    edge_default = converter;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js
var cloudflare_edge_exports = {};
__export(cloudflare_edge_exports, {
  default: () => cloudflare_edge_default
});
var cfPropNameMapping, handler, cloudflare_edge_default;
var init_cloudflare_edge = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/wrappers/cloudflare-edge.js"() {
    cfPropNameMapping = {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: [encodeURIComponent, "x-open-next-city"],
      country: "x-open-next-country",
      regionCode: "x-open-next-region",
      latitude: "x-open-next-latitude",
      longitude: "x-open-next-longitude"
    };
    handler = async (handler3, converter2) => async (request, env, ctx) => {
      globalThis.process = process;
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
      const internalEvent = await converter2.convertFrom(request);
      const cfProperties = request.cf;
      for (const [propName, mapping] of Object.entries(cfPropNameMapping)) {
        const propValue = cfProperties?.[propName];
        if (propValue != null) {
          const [encode, headerName] = Array.isArray(mapping) ? mapping : [null, mapping];
          internalEvent.headers[headerName] = encode ? encode(propValue) : propValue;
        }
      }
      const response = await handler3(internalEvent, {
        waitUntil: ctx.waitUntil.bind(ctx)
      });
      const result = await converter2.convertTo(response);
      return result;
    };
    cloudflare_edge_default = {
      wrapper: handler,
      name: "cloudflare-edge",
      supportStreaming: true,
      edgeRuntime: true
    };
  }
});

// node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js
var pattern_env_exports = {};
__export(pattern_env_exports, {
  default: () => pattern_env_default
});
function initializeOnce() {
  if (initialized)
    return;
  cachedOrigins = JSON.parse(process.env.OPEN_NEXT_ORIGIN ?? "{}");
  const functions = globalThis.openNextConfig.functions ?? {};
  for (const key in functions) {
    if (key !== "default") {
      const value = functions[key];
      const regexes = [];
      for (const pattern of value.patterns) {
        const regexPattern = `/${pattern.replace(/\*\*/g, "(.*)").replace(/\*/g, "([^/]*)").replace(/\//g, "\\/").replace(/\?/g, ".")}`;
        regexes.push(new RegExp(regexPattern));
      }
      cachedPatterns.push({
        key,
        patterns: value.patterns,
        regexes
      });
    }
  }
  initialized = true;
}
var cachedOrigins, cachedPatterns, initialized, envLoader, pattern_env_default;
var init_pattern_env = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/originResolver/pattern-env.js"() {
    init_logger();
    cachedPatterns = [];
    initialized = false;
    envLoader = {
      name: "env",
      resolve: async (_path) => {
        try {
          initializeOnce();
          for (const { key, patterns, regexes } of cachedPatterns) {
            for (const regex of regexes) {
              if (regex.test(_path)) {
                debug("Using origin", key, patterns);
                return cachedOrigins[key];
              }
            }
          }
          if (_path.startsWith("/_next/image") && cachedOrigins.imageOptimizer) {
            debug("Using origin", "imageOptimizer", _path);
            return cachedOrigins.imageOptimizer;
          }
          if (cachedOrigins.default) {
            debug("Using default origin", cachedOrigins.default, _path);
            return cachedOrigins.default;
          }
          return false;
        } catch (e) {
          error("Error while resolving origin", e);
          return false;
        }
      }
    };
    pattern_env_default = envLoader;
  }
});

// node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js
var dummy_exports = {};
__export(dummy_exports, {
  default: () => dummy_default
});
var resolver, dummy_default;
var init_dummy = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/assetResolver/dummy.js"() {
    resolver = {
      name: "dummy"
    };
    dummy_default = resolver;
  }
});

// node_modules/@opennextjs/aws/dist/utils/stream.js
import { ReadableStream as ReadableStream2 } from "node:stream/web";
function toReadableStream(value, isBase64) {
  return new ReadableStream2({
    pull(controller) {
      controller.enqueue(Buffer.from(value, isBase64 ? "base64" : "utf8"));
      controller.close();
    }
  }, { highWaterMark: 0 });
}
function emptyReadableStream() {
  if (process.env.OPEN_NEXT_FORCE_NON_EMPTY_RESPONSE === "true") {
    return new ReadableStream2({
      pull(controller) {
        maybeSomethingBuffer ??= Buffer.from("SOMETHING");
        controller.enqueue(maybeSomethingBuffer);
        controller.close();
      }
    }, { highWaterMark: 0 });
  }
  return new ReadableStream2({
    start(controller) {
      controller.close();
    }
  });
}
var maybeSomethingBuffer;
var init_stream = __esm({
  "node_modules/@opennextjs/aws/dist/utils/stream.js"() {
  }
});

// node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js
var fetch_exports = {};
__export(fetch_exports, {
  default: () => fetch_default
});
var fetchProxy, fetch_default;
var init_fetch = __esm({
  "node_modules/@opennextjs/aws/dist/overrides/proxyExternalRequest/fetch.js"() {
    init_stream();
    fetchProxy = {
      name: "fetch-proxy",
      // @ts-ignore
      proxy: async (internalEvent) => {
        const { url, headers: eventHeaders, method, body } = internalEvent;
        const headers = Object.fromEntries(Object.entries(eventHeaders).filter(([key]) => key.toLowerCase() !== "cf-connecting-ip"));
        const response = await fetch(url, {
          method,
          headers,
          body
        });
        const responseHeaders = {};
        response.headers.forEach((value, key) => {
          const cur = responseHeaders[key];
          if (cur === void 0) {
            responseHeaders[key] = value;
          } else if (Array.isArray(cur)) {
            cur.push(value);
          } else {
            responseHeaders[key] = [cur, value];
          }
        });
        return {
          type: "core",
          headers: responseHeaders,
          statusCode: response.status,
          isBase64Encoded: true,
          body: response.body ?? emptyReadableStream()
        };
      }
    };
    fetch_default = fetchProxy;
  }
});

// .next/server/edge-instrumentation.js
var require_edge_instrumentation = __commonJS({
  ".next/server/edge-instrumentation.js"() {
    "use strict";
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[183], { 490: (a, b, c) => {
      "use strict";
      function d() {
      }
      c.r(b), c.d(b, { register: () => d }), globalThis._sentryRewritesTunnelPath = "/api/monitoring", globalThis.SENTRY_RELEASE = { id: "6HgLtW9DnlLryF6RjMYSe" }, globalThis._sentryBasePath = void 0, globalThis._sentryRewriteFramesDistDir = ".next";
    } }, (a) => {
      var b = a(a.s = 490);
      (_ENTRIES = "u" < typeof _ENTRIES ? {} : _ENTRIES).middleware_instrumentation = b;
    }]);
  }
});

// .next/server/edge-runtime-webpack.js
var require_edge_runtime_webpack = __commonJS({
  ".next/server/edge-runtime-webpack.js"() {
    "use strict";
    (() => {
      "use strict";
      var a, b, c, d, e = {}, f = {};
      function g(a2) {
        var b2 = f[a2];
        if (void 0 !== b2) return b2.exports;
        var c2 = f[a2] = { exports: {} }, d2 = true;
        try {
          e[a2].call(c2.exports, c2, c2.exports, g), d2 = false;
        } finally {
          d2 && delete f[a2];
        }
        return c2.exports;
      }
      g.m = e, g.amdO = {}, a = [], g.O = (b2, c2, d2, e2) => {
        if (c2) {
          e2 = e2 || 0;
          for (var f2 = a.length; f2 > 0 && a[f2 - 1][2] > e2; f2--) a[f2] = a[f2 - 1];
          a[f2] = [c2, d2, e2];
          return;
        }
        for (var h = 1 / 0, f2 = 0; f2 < a.length; f2++) {
          for (var [c2, d2, e2] = a[f2], i = true, j = 0; j < c2.length; j++) (false & e2 || h >= e2) && Object.keys(g.O).every((a2) => g.O[a2](c2[j])) ? c2.splice(j--, 1) : (i = false, e2 < h && (h = e2));
          if (i) {
            a.splice(f2--, 1);
            var k = d2();
            void 0 !== k && (b2 = k);
          }
        }
        return b2;
      }, g.n = (a2) => {
        var b2 = a2 && a2.__esModule ? () => a2.default : () => a2;
        return g.d(b2, { a: b2 }), b2;
      }, g.d = (a2, b2) => {
        for (var c2 in b2) g.o(b2, c2) && !g.o(a2, c2) && Object.defineProperty(a2, c2, { enumerable: true, get: b2[c2] });
      }, g.g = function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
          return this || Function("return this")();
        } catch (a2) {
          if ("object" == typeof window) return window;
        }
      }(), g.o = (a2, b2) => Object.prototype.hasOwnProperty.call(a2, b2), g.r = (a2) => {
        "u" > typeof Symbol && Symbol.toStringTag && Object.defineProperty(a2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(a2, "__esModule", { value: true });
      }, b = { 149: 0 }, g.O.j = (a2) => 0 === b[a2], c = (a2, c2) => {
        var d2, e2, [f2, h, i] = c2, j = 0;
        if (f2.some((a3) => 0 !== b[a3])) {
          for (d2 in h) g.o(h, d2) && (g.m[d2] = h[d2]);
          if (i) var k = i(g);
        }
        for (a2 && a2(c2); j < f2.length; j++) e2 = f2[j], g.o(b, e2) && b[e2] && b[e2][0](), b[e2] = 0;
        return g.O(k);
      }, (d = self.webpackChunk_N_E = self.webpackChunk_N_E || []).forEach(c.bind(null, 0)), d.push = c.bind(null, d.push.bind(d));
    })();
  }
});

// node-built-in-modules:node:buffer
var node_buffer_exports = {};
import * as node_buffer_star from "node:buffer";
var init_node_buffer = __esm({
  "node-built-in-modules:node:buffer"() {
    __reExport(node_buffer_exports, node_buffer_star);
  }
});

// node-built-in-modules:node:async_hooks
var node_async_hooks_exports = {};
import * as node_async_hooks_star from "node:async_hooks";
var init_node_async_hooks = __esm({
  "node-built-in-modules:node:async_hooks"() {
    __reExport(node_async_hooks_exports, node_async_hooks_star);
  }
});

// node_modules/@opentelemetry/api/build/esm/version.js
var VERSION;
var init_version = __esm({
  "node_modules/@opentelemetry/api/build/esm/version.js"() {
    VERSION = "1.9.1";
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/semver.js
function _makeCompatibilityCheck(ownVersion) {
  const acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  const rejectedVersions = /* @__PURE__ */ new Set();
  const myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return () => false;
  }
  const ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    const globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    const globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var re, isCompatible;
var init_semver = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/semver.js"() {
    init_version();
    re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
    isCompatible = _makeCompatibilityCheck(VERSION);
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
function registerGlobal(type, instance, diag3, allowOverride = false) {
  var _a;
  const api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    const err = new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
    diag3.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    const err = new Error(`@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${VERSION}`);
    diag3.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag3.debug(`@opentelemetry/api: Registered a global for ${type} v${VERSION}.`);
  return true;
}
function getGlobal(type) {
  var _a, _b;
  const globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag3) {
  diag3.debug(`@opentelemetry/api: Unregistering a global for ${type} v${VERSION}.`);
  const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var major, GLOBAL_OPENTELEMETRY_API_KEY, _global;
var init_global_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/global-utils.js"() {
    init_version();
    init_semver();
    major = VERSION.split(".")[0];
    GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for(`opentelemetry.js.api.${major}`);
    _global = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
function logProxy(funcName, namespace, args) {
  const logger = getGlobal("diag");
  if (!logger) {
    return;
  }
  return logger[funcName](namespace, ...args);
}
var DiagComponentLogger;
var init_ComponentLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js"() {
    init_global_utils();
    DiagComponentLogger = class {
      constructor(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      debug(...args) {
        return logProxy("debug", this._namespace, args);
      }
      error(...args) {
        return logProxy("error", this._namespace, args);
      }
      info(...args) {
        return logProxy("info", this._namespace, args);
      }
      warn(...args) {
        return logProxy("warn", this._namespace, args);
      }
      verbose(...args) {
        return logProxy("verbose", this._namespace, args);
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
var init_types = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/types.js"() {
    (function(DiagLogLevel2) {
      DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
      DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
      DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
      DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
      DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
    })(DiagLogLevel || (DiagLogLevel = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger = logger || {};
  function _filterFunc(funcName, theLevel) {
    const theFunc = logger[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var init_logLevelLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js"() {
    init_types();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/diag.js
var API_NAME, DiagAPI;
var init_diag = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/diag.js"() {
    init_ComponentLogger();
    init_logLevelLogger();
    init_types();
    init_global_utils();
    API_NAME = "diag";
    DiagAPI = class _DiagAPI {
      /** Get the singleton instance of the DiagAPI API */
      static instance() {
        if (!this._instance) {
          this._instance = new _DiagAPI();
        }
        return this._instance;
      }
      /**
       * Private internal constructor
       * @private
       */
      constructor() {
        function _logProxy(funcName) {
          return function(...args) {
            const logger = getGlobal("diag");
            if (!logger)
              return;
            return logger[funcName](...args);
          };
        }
        const self2 = this;
        const setLogger = (logger, optionsOrLogLevel = { logLevel: DiagLogLevel.INFO }) => {
          var _a, _b, _c;
          if (logger === self2) {
            const err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self2.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          const oldLogger = getGlobal("diag");
          const newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            const stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn(`Current logger will be overwritten from ${stack}`);
            newLogger.warn(`Current logger will overwrite one already registered from ${stack}`);
          }
          return registerGlobal("diag", newLogger, self2, true);
        };
        self2.setLogger = setLogger;
        self2.disable = () => {
          unregisterGlobal(API_NAME, self2);
        };
        self2.createComponentLogger = (options) => {
          return new DiagComponentLogger(options);
        };
        self2.verbose = _logProxy("verbose");
        self2.debug = _logProxy("debug");
        self2.info = _logProxy("info");
        self2.warn = _logProxy("warn");
        self2.error = _logProxy("error");
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var BaggageImpl;
var init_baggage_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js"() {
    BaggageImpl = class _BaggageImpl {
      constructor(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      getEntry(key) {
        const entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      }
      getAllEntries() {
        return Array.from(this._entries.entries());
      }
      setEntry(key, entry) {
        const newBaggage = new _BaggageImpl(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      }
      removeEntry(key) {
        const newBaggage = new _BaggageImpl(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      }
      removeEntries(...keys) {
        const newBaggage = new _BaggageImpl(this._entries);
        for (const key of keys) {
          newBaggage._entries.delete(key);
        }
        return newBaggage;
      }
      clear() {
        return new _BaggageImpl();
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
var baggageEntryMetadataSymbol;
var init_symbol = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js"() {
    baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/utils.js
function createBaggage(entries = {}) {
  return new BaggageImpl(new Map(Object.entries(entries)));
}
function baggageEntryMetadataFromString(str) {
  if (typeof str !== "string") {
    diag.error(`Cannot create baggage metadata from unknown type: ${typeof str}`);
    str = "";
  }
  return {
    __TYPE__: baggageEntryMetadataSymbol,
    toString() {
      return str;
    }
  };
}
var diag;
var init_utils2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/utils.js"() {
    init_diag();
    init_baggage_impl();
    init_symbol();
    diag = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext, ROOT_CONTEXT;
var init_context = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/context.js"() {
    BaseContext = class _BaseContext {
      /**
       * Construct a new context which inherits values from an optional parent context.
       *
       * @param parentContext a context from which to inherit values
       */
      constructor(parentContext) {
        const self2 = this;
        self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self2.getValue = (key) => self2._currentContext.get(key);
        self2.setValue = (key, value) => {
          const context2 = new _BaseContext(self2._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self2.deleteValue = (key) => {
          const context2 = new _BaseContext(self2._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
    };
    ROOT_CONTEXT = new BaseContext();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
var consoleMap, _originalConsoleMethods, DiagConsoleLogger;
var init_consoleLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js"() {
    consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    _originalConsoleMethods = {};
    if (typeof console !== "undefined") {
      const keys = [
        "error",
        "warn",
        "info",
        "debug",
        "trace",
        "log"
      ];
      for (const key of keys) {
        if (typeof console[key] === "function") {
          _originalConsoleMethods[key] = console[key];
        }
      }
    }
    DiagConsoleLogger = class {
      constructor() {
        function _consoleFunc(funcName) {
          return function(...args) {
            let theFunc = _originalConsoleMethods[funcName];
            if (typeof theFunc !== "function") {
              theFunc = _originalConsoleMethods["log"];
            }
            if (typeof theFunc !== "function" && console) {
              theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
            }
            if (typeof theFunc === "function") {
              return theFunc.apply(console, args);
            }
          };
        }
        for (let i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
function createNoopMeter() {
  return NOOP_METER;
}
var NoopMeter, NoopMetric, NoopCounterMetric, NoopUpDownCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopObservableMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableUpDownCounterMetric, NOOP_METER, NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
var init_NoopMeter = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js"() {
    NoopMeter = class {
      constructor() {
      }
      /**
       * @see {@link Meter.createGauge}
       */
      createGauge(_name, _options) {
        return NOOP_GAUGE_METRIC;
      }
      /**
       * @see {@link Meter.createHistogram}
       */
      createHistogram(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      }
      /**
       * @see {@link Meter.createCounter}
       */
      createCounter(_name, _options) {
        return NOOP_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createUpDownCounter}
       */
      createUpDownCounter(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createObservableGauge}
       */
      createObservableGauge(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      }
      /**
       * @see {@link Meter.createObservableCounter}
       */
      createObservableCounter(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.createObservableUpDownCounter}
       */
      createObservableUpDownCounter(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      }
      /**
       * @see {@link Meter.addBatchObservableCallback}
       */
      addBatchObservableCallback(_callback, _observables) {
      }
      /**
       * @see {@link Meter.removeBatchObservableCallback}
       */
      removeBatchObservableCallback(_callback) {
      }
    };
    NoopMetric = class {
    };
    NoopCounterMetric = class extends NoopMetric {
      add(_value, _attributes) {
      }
    };
    NoopUpDownCounterMetric = class extends NoopMetric {
      add(_value, _attributes) {
      }
    };
    NoopGaugeMetric = class extends NoopMetric {
      record(_value, _attributes) {
      }
    };
    NoopHistogramMetric = class extends NoopMetric {
      record(_value, _attributes) {
      }
    };
    NoopObservableMetric = class {
      addCallback(_callback) {
      }
      removeCallback(_callback) {
      }
    };
    NoopObservableCounterMetric = class extends NoopObservableMetric {
    };
    NoopObservableGaugeMetric = class extends NoopObservableMetric {
    };
    NoopObservableUpDownCounterMetric = class extends NoopObservableMetric {
    };
    NOOP_METER = new NoopMeter();
    NOOP_COUNTER_METRIC = new NoopCounterMetric();
    NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
var ValueType;
var init_Metric = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/Metric.js"() {
    (function(ValueType2) {
      ValueType2[ValueType2["INT"] = 0] = "INT";
      ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
    })(ValueType || (ValueType = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter, defaultTextMapSetter;
var init_TextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js"() {
    defaultTextMapGetter = {
      get(carrier, key) {
        if (carrier == null) {
          return void 0;
        }
        return carrier[key];
      },
      keys(carrier) {
        if (carrier == null) {
          return [];
        }
        return Object.keys(carrier);
      }
    };
    defaultTextMapSetter = {
      set(carrier, key, value) {
        if (carrier == null) {
          return;
        }
        carrier[key] = value;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var NoopContextManager;
var init_NoopContextManager = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js"() {
    init_context();
    NoopContextManager = class {
      active() {
        return ROOT_CONTEXT;
      }
      with(_context, fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      bind(_context, target) {
        return target;
      }
      enable() {
        return this;
      }
      disable() {
        return this;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/api/context.js
var API_NAME2, NOOP_CONTEXT_MANAGER, ContextAPI;
var init_context2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/context.js"() {
    init_NoopContextManager();
    init_global_utils();
    init_diag();
    API_NAME2 = "context";
    NOOP_CONTEXT_MANAGER = new NoopContextManager();
    ContextAPI = class _ContextAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
      }
      /** Get the singleton instance of the Context API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _ContextAPI();
        }
        return this._instance;
      }
      /**
       * Set the current context manager.
       *
       * @returns true if the context manager was successfully registered, else false
       */
      setGlobalContextManager(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      }
      /**
       * Get the currently active context
       */
      active() {
        return this._getContextManager().active();
      }
      /**
       * Execute a function with an active context
       *
       * @param context context to be active during function execution
       * @param fn function to execute in a context
       * @param thisArg optional receiver to be used for calling fn
       * @param args optional arguments forwarded to fn
       */
      with(context2, fn, thisArg, ...args) {
        return this._getContextManager().with(context2, fn, thisArg, ...args);
      }
      /**
       * Bind a context to a target function or event emitter
       *
       * @param context context to bind to the event emitter or function. Defaults to the currently active context
       * @param target function or event emitter to bind
       */
      bind(context2, target) {
        return this._getContextManager().bind(context2, target);
      }
      _getContextManager() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      }
      /** Disable and remove the global context manager */
      disable() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
var init_trace_flags = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js"() {
    (function(TraceFlags2) {
      TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
      TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    })(TraceFlags || (TraceFlags = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT;
var init_invalid_span_constants = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js"() {
    init_trace_flags();
    INVALID_SPANID = "0000000000000000";
    INVALID_TRACEID = "00000000000000000000000000000000";
    INVALID_SPAN_CONTEXT = {
      traceId: INVALID_TRACEID,
      spanId: INVALID_SPANID,
      traceFlags: TraceFlags.NONE
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan;
var init_NonRecordingSpan = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js"() {
    init_invalid_span_constants();
    NonRecordingSpan = class {
      constructor(spanContext = INVALID_SPAN_CONTEXT) {
        this._spanContext = spanContext;
      }
      // Returns a SpanContext.
      spanContext() {
        return this._spanContext;
      }
      // By default does nothing
      setAttribute(_key, _value) {
        return this;
      }
      // By default does nothing
      setAttributes(_attributes) {
        return this;
      }
      // By default does nothing
      addEvent(_name, _attributes) {
        return this;
      }
      addLink(_link) {
        return this;
      }
      addLinks(_links) {
        return this;
      }
      // By default does nothing
      setStatus(_status) {
        return this;
      }
      // By default does nothing
      updateName(_name) {
        return this;
      }
      // By default does nothing
      end(_endTime) {
      }
      // isRecording always returns false for NonRecordingSpan.
      isRecording() {
        return false;
      }
      // By default does nothing
      recordException(_exception, _time) {
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
var SPAN_KEY;
var init_context_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/context-utils.js"() {
    init_context();
    init_NonRecordingSpan();
    init_context2();
    SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
function isValidHex(id, length) {
  if (typeof id !== "string" || id.length !== length)
    return false;
  let r = 0;
  for (let i = 0; i < id.length; i += 4) {
    r += (isHex[id.charCodeAt(i)] | 0) + (isHex[id.charCodeAt(i + 1)] | 0) + (isHex[id.charCodeAt(i + 2)] | 0) + (isHex[id.charCodeAt(i + 3)] | 0);
  }
  return r === length;
}
function isValidTraceId(traceId) {
  return isValidHex(traceId, 32) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return isValidHex(spanId, 16) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var isHex;
var init_spancontext_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js"() {
    init_invalid_span_constants();
    init_NonRecordingSpan();
    isHex = new Uint8Array([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1
    ]);
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
function isSpanContext(spanContext) {
  return spanContext !== null && typeof spanContext === "object" && "spanId" in spanContext && typeof spanContext["spanId"] === "string" && "traceId" in spanContext && typeof spanContext["traceId"] === "string" && "traceFlags" in spanContext && typeof spanContext["traceFlags"] === "number";
}
var contextApi, NoopTracer;
var init_NoopTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js"() {
    init_context2();
    init_context_utils();
    init_NonRecordingSpan();
    init_spancontext_utils();
    contextApi = ContextAPI.getInstance();
    NoopTracer = class {
      // startSpan starts a noop span.
      startSpan(name, options, context2 = contextApi.active()) {
        const root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        const parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      }
      startActiveSpan(name, arg2, arg3, arg4) {
        let opts;
        let ctx;
        let fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        const parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        const span = this.startSpan(name, opts, parentContext);
        const contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER, ProxyTracer;
var init_ProxyTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js"() {
    init_NoopTracer();
    NOOP_TRACER = new NoopTracer();
    ProxyTracer = class {
      constructor(provider, name, version, options) {
        this._provider = provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      startSpan(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      }
      startActiveSpan(_name, _options, _context, _fn) {
        const tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      }
      /**
       * Try to get a tracer from the proxy tracer provider.
       * If the proxy tracer provider has no delegate, return a noop tracer.
       */
      _getTracer() {
        if (this._delegate) {
          return this._delegate;
        }
        const tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider;
var init_NoopTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js"() {
    init_NoopTracer();
    NoopTracerProvider = class {
      getTracer(_name, _version, _options) {
        return new NoopTracer();
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER, ProxyTracerProvider;
var init_ProxyTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js"() {
    init_ProxyTracer();
    init_NoopTracerProvider();
    NOOP_TRACER_PROVIDER = new NoopTracerProvider();
    ProxyTracerProvider = class {
      /**
       * Get a {@link ProxyTracer}
       */
      getTracer(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      }
      getDelegate() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      }
      /**
       * Set the delegate tracer provider
       */
      setDelegate(delegate) {
        this._delegate = delegate;
      }
      getDelegateTracer(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
var SamplingDecision;
var init_SamplingResult = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js"() {
    (function(SamplingDecision2) {
      SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
      SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision || (SamplingDecision = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
var init_span_kind = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/span_kind.js"() {
    (function(SpanKind2) {
      SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
      SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
      SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
      SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
      SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    })(SpanKind || (SpanKind = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
var init_status = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/status.js"() {
    (function(SpanStatusCode2) {
      SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
      SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
      SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    })(SpanStatusCode || (SpanStatusCode = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js
function validateKey(key) {
  return VALID_KEY_REGEX.test(key);
}
function validateValue(value) {
  return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
}
var VALID_KEY_CHAR_RANGE, VALID_KEY, VALID_VENDOR_KEY, VALID_KEY_REGEX, VALID_VALUE_BASE_REGEX, INVALID_VALUE_COMMA_EQUAL_REGEX;
var init_tracestate_validators = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js"() {
    VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
    VALID_KEY = `[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`;
    VALID_VENDOR_KEY = `[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`;
    VALID_KEY_REGEX = new RegExp(`^(?:${VALID_KEY}|${VALID_VENDOR_KEY})$`);
    VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
    INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js
var MAX_TRACE_STATE_ITEMS, MAX_TRACE_STATE_LEN, LIST_MEMBERS_SEPARATOR, LIST_MEMBER_KEY_VALUE_SPLITTER, TraceStateImpl;
var init_tracestate_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js"() {
    init_tracestate_validators();
    MAX_TRACE_STATE_ITEMS = 32;
    MAX_TRACE_STATE_LEN = 512;
    LIST_MEMBERS_SEPARATOR = ",";
    LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
    TraceStateImpl = class _TraceStateImpl {
      constructor(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      set(key, value) {
        const traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      }
      unset(key) {
        const traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      }
      get(key) {
        return this._internalState.get(key);
      }
      serialize() {
        return Array.from(this._internalState.keys()).reduceRight((agg, key) => {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      }
      _parse(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reduceRight((agg, part) => {
          const listMember = part.trim();
          const i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            const key = listMember.slice(0, i);
            const value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      }
      // @ts-expect-error TS6133 Accessed in tests only.
      _keys() {
        return Array.from(this._internalState.keys()).reverse();
      }
      _clone() {
        const traceState = new _TraceStateImpl();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js
function createTraceState(rawTraceState) {
  return new TraceStateImpl(rawTraceState);
}
var init_utils3 = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js"() {
    init_tracestate_impl();
  }
});

// node_modules/@opentelemetry/api/build/esm/context-api.js
var context;
var init_context_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/context-api.js"() {
    init_context2();
    context = ContextAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag-api.js
var diag2;
var init_diag_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag-api.js"() {
    init_diag();
    diag2 = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
var NoopMeterProvider, NOOP_METER_PROVIDER;
var init_NoopMeterProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js"() {
    init_NoopMeter();
    NoopMeterProvider = class {
      getMeter(_name, _version, _options) {
        return NOOP_METER;
      }
    };
    NOOP_METER_PROVIDER = new NoopMeterProvider();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/metrics.js
var API_NAME3, MetricsAPI;
var init_metrics = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/metrics.js"() {
    init_NoopMeterProvider();
    init_global_utils();
    init_diag();
    API_NAME3 = "metrics";
    MetricsAPI = class _MetricsAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
      }
      /** Get the singleton instance of the Metrics API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _MetricsAPI();
        }
        return this._instance;
      }
      /**
       * Set the current global meter provider.
       * Returns true if the meter provider was successfully registered, else false.
       */
      setGlobalMeterProvider(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      }
      /**
       * Returns the global meter provider.
       */
      getMeterProvider() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      }
      /**
       * Returns a meter from the global meter provider.
       */
      getMeter(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      }
      /** Remove the global meter provider */
      disable() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics-api.js
var metrics;
var init_metrics_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics-api.js"() {
    init_metrics();
    metrics = MetricsAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator;
var init_NoopTextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js"() {
    NoopTextMapPropagator = class {
      /** Noop inject function does nothing */
      inject(_context, _carrier) {
      }
      /** Noop extract function does nothing and returns the input context */
      extract(context2, _carrier) {
        return context2;
      }
      fields() {
        return [];
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var BAGGAGE_KEY;
var init_context_helpers = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js"() {
    init_context2();
    init_context();
    BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  }
});

// node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME4, NOOP_TEXT_MAP_PROPAGATOR, PropagationAPI;
var init_propagation = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/propagation.js"() {
    init_global_utils();
    init_NoopTextMapPropagator();
    init_TextMapPropagator();
    init_context_helpers();
    init_utils2();
    init_diag();
    API_NAME4 = "propagation";
    NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
    PropagationAPI = class _PropagationAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      /** Get the singleton instance of the Propagator API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _PropagationAPI();
        }
        return this._instance;
      }
      /**
       * Set the current propagator.
       *
       * @returns true if the propagator was successfully registered, else false
       */
      setGlobalPropagator(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      }
      /**
       * Inject context into a carrier to be propagated inter-process
       *
       * @param context Context carrying tracing data to inject
       * @param carrier carrier to inject context into
       * @param setter Function used to set values on the carrier
       */
      inject(context2, carrier, setter = defaultTextMapSetter) {
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      }
      /**
       * Extract context from a carrier
       *
       * @param context Context which the newly created context will inherit from
       * @param carrier Carrier to extract context from
       * @param getter Function used to extract keys from a carrier
       */
      extract(context2, carrier, getter = defaultTextMapGetter) {
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      }
      /**
       * Return a list of all fields which may be used by the propagator.
       */
      fields() {
        return this._getGlobalPropagator().fields();
      }
      /** Remove the global propagator */
      disable() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      }
      _getGlobalPropagator() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation;
var init_propagation_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation-api.js"() {
    init_propagation();
    propagation = PropagationAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME5, TraceAPI;
var init_trace = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/trace.js"() {
    init_global_utils();
    init_ProxyTracerProvider();
    init_spancontext_utils();
    init_context_utils();
    init_diag();
    API_NAME5 = "trace";
    TraceAPI = class _TraceAPI {
      /** Empty private constructor prevents end users from constructing a new instance of the API */
      constructor() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      /** Get the singleton instance of the Trace API */
      static getInstance() {
        if (!this._instance) {
          this._instance = new _TraceAPI();
        }
        return this._instance;
      }
      /**
       * Set the current global tracer.
       *
       * @returns true if the tracer provider was successfully registered, else false
       */
      setGlobalTracerProvider(provider) {
        const success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      }
      /**
       * Returns the global tracer provider.
       */
      getTracerProvider() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      }
      /**
       * Returns a tracer from the global tracer provider.
       */
      getTracer(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      }
      /** Remove the global tracer provider */
      disable() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace;
var init_trace_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace-api.js"() {
    init_trace();
    trace = TraceAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  DiagConsoleLogger: () => DiagConsoleLogger,
  DiagLogLevel: () => DiagLogLevel,
  INVALID_SPANID: () => INVALID_SPANID,
  INVALID_SPAN_CONTEXT: () => INVALID_SPAN_CONTEXT,
  INVALID_TRACEID: () => INVALID_TRACEID,
  ProxyTracer: () => ProxyTracer,
  ProxyTracerProvider: () => ProxyTracerProvider,
  ROOT_CONTEXT: () => ROOT_CONTEXT,
  SamplingDecision: () => SamplingDecision,
  SpanKind: () => SpanKind,
  SpanStatusCode: () => SpanStatusCode,
  TraceFlags: () => TraceFlags,
  ValueType: () => ValueType,
  baggageEntryMetadataFromString: () => baggageEntryMetadataFromString,
  context: () => context,
  createContextKey: () => createContextKey,
  createNoopMeter: () => createNoopMeter,
  createTraceState: () => createTraceState,
  default: () => esm_default,
  defaultTextMapGetter: () => defaultTextMapGetter,
  defaultTextMapSetter: () => defaultTextMapSetter,
  diag: () => diag2,
  isSpanContextValid: () => isSpanContextValid,
  isValidSpanId: () => isValidSpanId,
  isValidTraceId: () => isValidTraceId,
  metrics: () => metrics,
  propagation: () => propagation,
  trace: () => trace
});
var esm_default;
var init_esm = __esm({
  "node_modules/@opentelemetry/api/build/esm/index.js"() {
    init_utils2();
    init_context();
    init_consoleLogger();
    init_types();
    init_NoopMeter();
    init_Metric();
    init_TextMapPropagator();
    init_ProxyTracer();
    init_ProxyTracerProvider();
    init_SamplingResult();
    init_span_kind();
    init_status();
    init_trace_flags();
    init_utils3();
    init_spancontext_utils();
    init_invalid_span_constants();
    init_context_api();
    init_diag_api();
    init_metrics_api();
    init_propagation_api();
    init_trace_api();
    esm_default = {
      context,
      diag: diag2,
      metrics,
      propagation,
      trace
    };
  }
});

// .next/server/middleware.js
var require_middleware = __commonJS({
  ".next/server/middleware.js"() {
    "use strict";
    (self.webpackChunk_N_E = self.webpackChunk_N_E || []).push([[751], { 86: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
      var d = { getTestReqInfo: function() {
        return i;
      }, withRequest: function() {
        return h;
      } };
      for (var e in d) Object.defineProperty(b, e, { enumerable: true, get: d[e] });
      let f = new (c(521)).AsyncLocalStorage();
      function g(a2, b2) {
        let c2 = b2.header(a2, "next-test-proxy-port");
        if (!c2) return;
        let d2 = b2.url(a2);
        return { url: d2, proxyPort: Number(c2), testData: b2.header(a2, "next-test-data") || "" };
      }
      function h(a2, b2, c2) {
        let d2 = g(a2, b2);
        return d2 ? f.run(d2, c2) : c2();
      }
      function i(a2, b2) {
        let c2 = f.getStore();
        return c2 || (a2 && b2 ? g(a2, b2) : void 0);
      }
    }, 102: (a, b, c) => {
      "use strict";
      Object.defineProperty(b, "__esModule", { value: true });
      var d = { interceptTestApis: function() {
        return h;
      }, wrapRequestHandler: function() {
        return i;
      } };
      for (var e in d) Object.defineProperty(b, e, { enumerable: true, get: d[e] });
      let f = c(86), g = c(111);
      function h() {
        return (0, g.interceptFetch)(c.g.fetch);
      }
      function i(a2) {
        return (b2, c2) => (0, f.withRequest)(b2, g.reader, () => a2(b2, c2));
      }
    }, 103: (a, b, c) => {
      "use strict";
      var d = Object.defineProperty, e = Object.getOwnPropertyDescriptor, f = Object.getOwnPropertyNames, g = Object.prototype.hasOwnProperty, h = (a2, b2) => {
        for (var c2 in b2) d(a2, c2, { get: b2[c2], enumerable: true });
      }, i = {};
      h(i, { Analytics: () => k, IpDenyList: () => v, MultiRegionRatelimit: () => E, Ratelimit: () => F }), a.exports = ((a2, b2, c2, h2) => {
        if (b2 && "object" == typeof b2 || "function" == typeof b2) for (let i2 of f(b2)) g.call(a2, i2) || i2 === c2 || d(a2, i2, { get: () => b2[i2], enumerable: !(h2 = e(b2, i2)) || h2.enumerable });
        return a2;
      })(d({}, "__esModule", { value: true }), i);
      var j = c(326), k = class {
        analytics;
        table = "events";
        constructor(a2) {
          this.analytics = new j.Analytics({ redis: a2.redis, window: "1h", prefix: a2.prefix ?? "@upstash/ratelimit", retention: "90d" });
        }
        extractGeo(a2) {
          return void 0 !== a2.geo ? a2.geo : void 0 !== a2.cf ? a2.cf : {};
        }
        async record(a2) {
          await this.analytics.ingest(this.table, a2);
        }
        async series(a2, b2) {
          let c2 = Math.min((this.analytics.getBucket(Date.now()) - this.analytics.getBucket(b2)) / 36e5, 256);
          return this.analytics.aggregateBucketsWithPipeline(this.table, a2, c2);
        }
        async getUsage(a2 = 0) {
          let b2 = Math.min((this.analytics.getBucket(Date.now()) - this.analytics.getBucket(a2)) / 36e5, 256);
          return await this.analytics.getAllowedBlocked(this.table, b2);
        }
        async getUsageOverTime(a2, b2) {
          return await this.analytics.aggregateBucketsWithPipeline(this.table, b2, a2);
        }
        async getMostAllowedBlocked(a2, b2, c2) {
          return b2 = b2 ?? 5, this.analytics.getMostAllowedBlocked(this.table, a2, b2, void 0, c2);
        }
      }, l = class {
        cache;
        constructor(a2) {
          this.cache = a2;
        }
        isBlocked(a2) {
          if (!this.cache.has(a2)) return { blocked: false, reset: 0 };
          let b2 = this.cache.get(a2);
          return b2 < Date.now() ? (this.cache.delete(a2), { blocked: false, reset: 0 }) : { blocked: true, reset: b2 };
        }
        blockUntil(a2, b2) {
          this.cache.set(a2, b2);
        }
        set(a2, b2) {
          this.cache.set(a2, b2);
        }
        get(a2) {
          return this.cache.get(a2) || null;
        }
        incr(a2) {
          let b2 = this.cache.get(a2) ?? 0;
          return b2 += 1, this.cache.set(a2, b2), b2;
        }
        pop(a2) {
          this.cache.delete(a2);
        }
        empty() {
          this.cache.clear();
        }
        size() {
          return this.cache.size;
        }
      };
      function m(a2) {
        let b2 = a2.match(/^(\d+)\s?(ms|s|m|h|d)$/);
        if (!b2) throw Error(`Unable to parse window size: ${a2}`);
        let c2 = Number.parseInt(b2[1]);
        switch (b2[2]) {
          case "ms":
            return c2;
          case "s":
            return 1e3 * c2;
          case "m":
            return 1e3 * c2 * 60;
          case "h":
            return 1e3 * c2 * 3600;
          case "d":
            return 1e3 * c2 * 86400;
          default:
            throw Error(`Unable to parse window size: ${a2}`);
        }
      }
      var n = async (a2, b2, c2, d2) => {
        try {
          return await a2.redis.evalsha(b2.hash, c2, d2);
        } catch (e2) {
          if (`${e2}`.includes("NOSCRIPT")) {
            let e3 = await a2.redis.scriptLoad(b2.script);
            return e3 !== b2.hash && console.warn("Upstash Ratelimit: Expected hash and the hash received from Redis are different. Ratelimit will work as usual but performance will be reduced."), await a2.redis.evalsha(e3, c2, d2);
          }
          throw e2;
        }
      }, o = { fixedWindow: { limit: { script: `
  local key           = KEYS[1]
  local window        = ARGV[1]
  local incrementBy   = ARGV[2] -- increment rate per request at a given value, default is 1

  local r = redis.call("INCRBY", key, incrementBy)
  if r == tonumber(incrementBy) then
  -- The first time this key is set, the value will be equal to incrementBy.
  -- So we only need the expire command once
  redis.call("PEXPIRE", key, window)
  end

  return r
`, hash: "b13943e359636db027ad280f1def143f02158c13" }, getRemaining: { script: `
      local key = KEYS[1]
      local tokens = 0

      local value = redis.call('GET', key)
      if value then
          tokens = value
      end
      return tokens
    `, hash: "8c4c341934502aee132643ffbe58ead3450e5208" } }, slidingWindow: { limit: { script: `
  local currentKey  = KEYS[1]           -- identifier including prefixes
  local previousKey = KEYS[2]           -- key of the previous bucket
  local tokens      = tonumber(ARGV[1]) -- tokens per window
  local now         = ARGV[2]           -- current timestamp in milliseconds
  local window      = ARGV[3]           -- interval in milliseconds
  local incrementBy = ARGV[4]           -- increment rate per request at a given value, default is 1

  local requestsInCurrentWindow = redis.call("GET", currentKey)
  if requestsInCurrentWindow == false then
    requestsInCurrentWindow = 0
  end

  local requestsInPreviousWindow = redis.call("GET", previousKey)
  if requestsInPreviousWindow == false then
    requestsInPreviousWindow = 0
  end
  local percentageInCurrent = ( now % window ) / window
  -- weighted requests to consider from the previous window
  requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)
  if requestsInPreviousWindow + requestsInCurrentWindow >= tokens then
    return -1
  end

  local newValue = redis.call("INCRBY", currentKey, incrementBy)
  if newValue == tonumber(incrementBy) then
    -- The first time this key is set, the value will be equal to incrementBy.
    -- So we only need the expire command once
    redis.call("PEXPIRE", currentKey, window * 2 + 1000) -- Enough time to overlap with a new window + 1 second
  end
  return tokens - ( newValue + requestsInPreviousWindow )
`, hash: "e1391e429b699c780eb0480350cd5b7280fd9213" }, getRemaining: { script: `
  local currentKey  = KEYS[1]           -- identifier including prefixes
  local previousKey = KEYS[2]           -- key of the previous bucket
  local now         = ARGV[1]           -- current timestamp in milliseconds
  local window      = ARGV[2]           -- interval in milliseconds

  local requestsInCurrentWindow = redis.call("GET", currentKey)
  if requestsInCurrentWindow == false then
    requestsInCurrentWindow = 0
  end

  local requestsInPreviousWindow = redis.call("GET", previousKey)
  if requestsInPreviousWindow == false then
    requestsInPreviousWindow = 0
  end

  local percentageInCurrent = ( now % window ) / window
  -- weighted requests to consider from the previous window
  requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)

  return requestsInPreviousWindow + requestsInCurrentWindow
`, hash: "65a73ac5a05bf9712903bc304b77268980c1c417" } }, tokenBucket: { limit: { script: `
  local key         = KEYS[1]           -- identifier including prefixes
  local maxTokens   = tonumber(ARGV[1]) -- maximum number of tokens
  local interval    = tonumber(ARGV[2]) -- size of the window in milliseconds
  local refillRate  = tonumber(ARGV[3]) -- how many tokens are refilled after each interval
  local now         = tonumber(ARGV[4]) -- current timestamp in milliseconds
  local incrementBy = tonumber(ARGV[5]) -- how many tokens to consume, default is 1
        
  local bucket = redis.call("HMGET", key, "refilledAt", "tokens")
        
  local refilledAt
  local tokens

  if bucket[1] == false then
    refilledAt = now
    tokens = maxTokens
  else
    refilledAt = tonumber(bucket[1])
    tokens = tonumber(bucket[2])
  end
        
  if now >= refilledAt + interval then
    local numRefills = math.floor((now - refilledAt) / interval)
    tokens = math.min(maxTokens, tokens + numRefills * refillRate)

    refilledAt = refilledAt + numRefills * interval
  end

  if tokens == 0 then
    return {-1, refilledAt + interval}
  end

  local remaining = tokens - incrementBy
  local expireAt = math.ceil(((maxTokens - remaining) / refillRate)) * interval
        
  redis.call("HSET", key, "refilledAt", refilledAt, "tokens", remaining)
  redis.call("PEXPIRE", key, expireAt)
  return {remaining, refilledAt + interval}
`, hash: "5bece90aeef8189a8cfd28995b479529e270b3c6" }, getRemaining: { script: `
  local key         = KEYS[1]
  local maxTokens   = tonumber(ARGV[1])
        
  local bucket = redis.call("HMGET", key, "refilledAt", "tokens")

  if bucket[1] == false then
    return {maxTokens, -1}
  end
        
  return {tonumber(bucket[2]), tonumber(bucket[1])}
`, hash: "a15be2bb1db2a15f7c82db06146f9d08983900d0" } }, cachedFixedWindow: { limit: { script: `
  local key     = KEYS[1]
  local window  = ARGV[1]
  local incrementBy   = ARGV[2] -- increment rate per request at a given value, default is 1

  local r = redis.call("INCRBY", key, incrementBy)
  if r == incrementBy then
  -- The first time this key is set, the value will be equal to incrementBy.
  -- So we only need the expire command once
  redis.call("PEXPIRE", key, window)
  end
      
  return r
`, hash: "c26b12703dd137939b9a69a3a9b18e906a2d940f" }, getRemaining: { script: `
  local key = KEYS[1]
  local tokens = 0

  local value = redis.call('GET', key)
  if value then
      tokens = value
  end
  return tokens
`, hash: "8e8f222ccae68b595ee6e3f3bf2199629a62b91a" } } }, p = { fixedWindow: { limit: { script: `
	local key           = KEYS[1]
	local id            = ARGV[1]
	local window        = ARGV[2]
	local incrementBy   = tonumber(ARGV[3])

	redis.call("HSET", key, id, incrementBy)
	local fields = redis.call("HGETALL", key)
	if #fields == 2 and tonumber(fields[2])==incrementBy then
	-- The first time this key is set, and the value will be equal to incrementBy.
	-- So we only need the expire command once
	  redis.call("PEXPIRE", key, window)
	end

	return fields
`, hash: "a8c14f3835aa87bd70e5e2116081b81664abcf5c" }, getRemaining: { script: `
      local key = KEYS[1]
      local tokens = 0

      local fields = redis.call("HGETALL", key)

      return fields
    `, hash: "8ab8322d0ed5fe5ac8eb08f0c2e4557f1b4816fd" } }, slidingWindow: { limit: { script: `
	local currentKey    = KEYS[1]           -- identifier including prefixes
	local previousKey   = KEYS[2]           -- key of the previous bucket
	local tokens        = tonumber(ARGV[1]) -- tokens per window
	local now           = ARGV[2]           -- current timestamp in milliseconds
	local window        = ARGV[3]           -- interval in milliseconds
	local requestId     = ARGV[4]           -- uuid for this request
	local incrementBy   = tonumber(ARGV[5]) -- custom rate, default is  1

	local currentFields = redis.call("HGETALL", currentKey)
	local requestsInCurrentWindow = 0
	for i = 2, #currentFields, 2 do
	requestsInCurrentWindow = requestsInCurrentWindow + tonumber(currentFields[i])
	end

	local previousFields = redis.call("HGETALL", previousKey)
	local requestsInPreviousWindow = 0
	for i = 2, #previousFields, 2 do
	requestsInPreviousWindow = requestsInPreviousWindow + tonumber(previousFields[i])
	end

	local percentageInCurrent = ( now % window) / window
	if requestsInPreviousWindow * (1 - percentageInCurrent ) + requestsInCurrentWindow >= tokens then
	  return {currentFields, previousFields, false}
	end

	redis.call("HSET", currentKey, requestId, incrementBy)

	if requestsInCurrentWindow == 0 then 
	  -- The first time this key is set, the value will be equal to incrementBy.
	  -- So we only need the expire command once
	  redis.call("PEXPIRE", currentKey, window * 2 + 1000) -- Enough time to overlap with a new window + 1 second
	end
	return {currentFields, previousFields, true}
`, hash: "cb4fdc2575056df7c6d422764df0de3a08d6753b" }, getRemaining: { script: `
	local currentKey    = KEYS[1]           -- identifier including prefixes
	local previousKey   = KEYS[2]           -- key of the previous bucket
	local now         	= ARGV[1]           -- current timestamp in milliseconds
  	local window      	= ARGV[2]           -- interval in milliseconds

	local currentFields = redis.call("HGETALL", currentKey)
	local requestsInCurrentWindow = 0
	for i = 2, #currentFields, 2 do
	requestsInCurrentWindow = requestsInCurrentWindow + tonumber(currentFields[i])
	end

	local previousFields = redis.call("HGETALL", previousKey)
	local requestsInPreviousWindow = 0
	for i = 2, #previousFields, 2 do
	requestsInPreviousWindow = requestsInPreviousWindow + tonumber(previousFields[i])
	end

	local percentageInCurrent = ( now % window) / window
  	requestsInPreviousWindow = math.floor(( 1 - percentageInCurrent ) * requestsInPreviousWindow)
	
	return requestsInCurrentWindow + requestsInPreviousWindow
`, hash: "558c9306b7ec54abb50747fe0b17e5d44bd24868" } } }, q = { script: `
      local pattern = KEYS[1]

      -- Initialize cursor to start from 0
      local cursor = "0"

      repeat
          -- Scan for keys matching the pattern
          local scan_result = redis.call('SCAN', cursor, 'MATCH', pattern)

          -- Extract cursor for the next iteration
          cursor = scan_result[1]

          -- Extract keys from the scan result
          local keys = scan_result[2]

          for i=1, #keys do
          redis.call('DEL', keys[i])
          end

      -- Continue scanning until cursor is 0 (end of keyspace)
      until cursor == "0"
    `, hash: "54bd274ddc59fb3be0f42deee2f64322a10e2b50" }, r = "denyList", s = "ipDenyList", t = "ipDenyListStatus", u = `
  -- Checks if values provideed in ARGV are present in the deny lists.
  -- This is done using the allDenyListsKey below.

  -- Additionally, checks the status of the ip deny list using the
  -- ipDenyListStatusKey below. Here are the possible states of the
  -- ipDenyListStatusKey key:
  -- * status == -1: set to "disabled" with no TTL
  -- * status == -2: not set, meaning that is was set before but expired
  -- * status  >  0: set to "valid", with a TTL
  --
  -- In the case of status == -2, we set the status to "pending" with
  -- 30 second ttl. During this time, the process which got status == -2
  -- will update the ip deny list.

  local allDenyListsKey     = KEYS[1]
  local ipDenyListStatusKey = KEYS[2]

  local results = redis.call('SMISMEMBER', allDenyListsKey, unpack(ARGV))
  local status  = redis.call('TTL', ipDenyListStatusKey)
  if status == -2 then
    redis.call('SETEX', ipDenyListStatusKey, 30, "pending")
  end

  return { results, status }
`, v = {};
      h(v, { ThresholdError: () => w, disableIpDenyList: () => z, updateIpDenyList: () => y });
      var w = class extends Error {
        constructor(a2) {
          super(`Allowed threshold values are from 1 to 8, 1 and 8 included. Received: ${a2}`), this.name = "ThresholdError";
        }
      }, x = async (a2) => {
        if ("number" != typeof a2 || a2 < 1 || a2 > 8) throw new w(a2);
        try {
          let b2 = await fetch(`https://raw.githubusercontent.com/stamparm/ipsum/master/levels/${a2}.txt`);
          if (!b2.ok) throw Error(`Error fetching data: ${b2.statusText}`);
          return (await b2.text()).split("\n").filter((a3) => a3.length > 0);
        } catch (a3) {
          throw Error(`Failed to fetch ip deny list: ${a3}`);
        }
      }, y = async (a2, b2, c2, d2) => {
        var e2;
        let f2 = await x(c2), g2 = [b2, r, "all"].join(":"), h2 = [b2, r, s].join(":"), i2 = [b2, t].join(":"), j2 = a2.multi();
        return j2.sdiffstore(g2, g2, h2), j2.del(h2), j2.sadd(h2, f2.at(0), ...f2.slice(1)), j2.sdiffstore(h2, h2, g2), j2.sunionstore(g2, g2, h2), j2.set(i2, "valid", { px: d2 ?? 864e5 - ((e2 || Date.now()) - 72e5) % 864e5 }), await j2.exec();
      }, z = async (a2, b2) => {
        let c2 = [b2, r, "all"].join(":"), d2 = [b2, r, s].join(":"), e2 = [b2, t].join(":"), f2 = a2.multi();
        return f2.sdiffstore(c2, c2, d2), f2.del(d2), f2.set(e2, "disabled"), await f2.exec();
      }, A = new l(/* @__PURE__ */ new Map()), B = async (a2, b2, c2) => {
        let d2, [e2, f2] = await a2.eval(u, [[b2, r, "all"].join(":"), [b2, t].join(":")], c2);
        return e2.map((a3, b3) => {
          if (a3) {
            var e3;
            e3 = c2[b3], A.size() > 1e3 && A.empty(), A.blockUntil(e3, Date.now() + 6e4), d2 = c2[b3];
          }
        }), { deniedValue: d2, invalidIpDenyList: -2 === f2 };
      }, C = class {
        limiter;
        ctx;
        prefix;
        timeout;
        primaryRedis;
        analytics;
        enableProtection;
        denyListThreshold;
        constructor(a2) {
          this.ctx = a2.ctx, this.limiter = a2.limiter, this.timeout = a2.timeout ?? 5e3, this.prefix = a2.prefix ?? "@upstash/ratelimit", this.enableProtection = a2.enableProtection ?? false, this.denyListThreshold = a2.denyListThreshold ?? 6, this.primaryRedis = "redis" in this.ctx ? this.ctx.redis : this.ctx.regionContexts[0].redis, this.analytics = a2.analytics ? new k({ redis: this.primaryRedis, prefix: this.prefix }) : void 0, a2.ephemeralCache instanceof Map ? this.ctx.cache = new l(a2.ephemeralCache) : void 0 === a2.ephemeralCache && (this.ctx.cache = new l(/* @__PURE__ */ new Map()));
        }
        limit = async (a2, b2) => {
          let c2 = null;
          try {
            let d2 = this.getRatelimitResponse(a2, b2), { responseArray: e2, newTimeoutId: f2 } = this.applyTimeout(d2);
            c2 = f2;
            let g2 = await Promise.race(e2);
            return this.submitAnalytics(g2, a2, b2);
          } finally {
            c2 && clearTimeout(c2);
          }
        };
        blockUntilReady = async (a2, b2) => {
          let c2;
          if (b2 <= 0) throw Error("timeout must be positive");
          let d2 = Date.now() + b2;
          for (; !(c2 = await this.limit(a2)).success; ) {
            if (0 === c2.reset) throw Error("This should not happen");
            let a3 = Math.min(c2.reset, d2) - Date.now();
            if (await new Promise((b3) => setTimeout(b3, a3)), Date.now() > d2) break;
          }
          return c2;
        };
        resetUsedTokens = async (a2) => {
          let b2 = [this.prefix, a2].join(":");
          await this.limiter().resetTokens(this.ctx, b2);
        };
        getRemaining = async (a2) => {
          let b2 = [this.prefix, a2].join(":");
          return await this.limiter().getRemaining(this.ctx, b2);
        };
        getRatelimitResponse = async (a2, b2) => {
          let c2 = this.getKey(a2), d2 = this.getDefinedMembers(a2, b2), e2 = d2.find((a3) => A.isBlocked(a3).blocked), f2 = e2 ? [{ success: false, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve(), reason: "denyList", deniedValue: e2 }, { deniedValue: e2, invalidIpDenyList: false }] : await Promise.all([this.limiter().limit(this.ctx, c2, b2?.rate), this.enableProtection ? B(this.primaryRedis, this.prefix, d2) : { deniedValue: void 0, invalidIpDenyList: false }]);
          return ((a3, b3, [c3, d3], e3) => {
            if (d3.deniedValue && (c3.success = false, c3.remaining = 0, c3.reason = "denyList", c3.deniedValue = d3.deniedValue), d3.invalidIpDenyList) {
              let d4 = y(a3, b3, e3);
              c3.pending = Promise.all([c3.pending, d4]);
            }
            return c3;
          })(this.primaryRedis, this.prefix, f2, this.denyListThreshold);
        };
        applyTimeout = (a2) => {
          let b2 = null, c2 = [a2];
          if (this.timeout > 0) {
            let a3 = new Promise((a4) => {
              b2 = setTimeout(() => {
                a4({ success: true, limit: 0, remaining: 0, reset: 0, pending: Promise.resolve(), reason: "timeout" });
              }, this.timeout);
            });
            c2.push(a3);
          }
          return { responseArray: c2, newTimeoutId: b2 };
        };
        submitAnalytics = (a2, b2, c2) => {
          if (this.analytics) try {
            let d2 = c2 ? this.analytics.extractGeo(c2) : void 0, e2 = this.analytics.record({ identifier: "denyList" === a2.reason ? a2.deniedValue : b2, time: Date.now(), success: "denyList" === a2.reason ? "denied" : a2.success, ...d2 }).catch((a3) => {
              let b3 = "Failed to record analytics";
              `${a3}`.includes("WRONGTYPE") && (b3 = `
    Failed to record analytics. See the information below:

    This can occur when you uprade to Ratelimit version 1.1.2
    or later from an earlier version.

    This occurs simply because the way we store analytics data
    has changed. To avoid getting this error, disable analytics
    for *an hour*, then simply enable it back.

    `), console.warn(b3, a3);
            });
            a2.pending = Promise.all([a2.pending, e2]);
          } catch (a3) {
            console.warn("Failed to record analytics", a3);
          }
          return a2;
        };
        getKey = (a2) => [this.prefix, a2].join(":");
        getDefinedMembers = (a2, b2) => [a2, b2?.ip, b2?.userAgent, b2?.country].filter(Boolean);
      };
      function D() {
        let a2 = "", b2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", c2 = b2.length;
        for (let d2 = 0; d2 < 16; d2++) a2 += b2.charAt(Math.floor(Math.random() * c2));
        return a2;
      }
      var E = class extends C {
        constructor(a2) {
          super({ prefix: a2.prefix, limiter: a2.limiter, timeout: a2.timeout, analytics: a2.analytics, ctx: { regionContexts: a2.redis.map((a3) => ({ redis: a3 })), cache: a2.ephemeralCache ? new l(a2.ephemeralCache) : void 0 } });
        }
        static fixedWindow(a2, b2) {
          let c2 = m(b2);
          return () => ({ async limit(b3, d2, e2) {
            if (b3.cache) {
              let { blocked: c3, reset: e3 } = b3.cache.isBlocked(d2);
              if (c3) return { success: false, limit: a2, remaining: 0, reset: e3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let f2 = D(), g2 = Math.floor(Date.now() / c2), h2 = [d2, g2].join(":"), i2 = e2 ? Math.max(1, e2) : 1, j2 = b3.regionContexts.map((a3) => ({ redis: a3.redis, request: n(a3, p.fixedWindow.limit, [h2], [f2, c2, i2]) })), k2 = a2 - (await Promise.any(j2.map((a3) => a3.request))).reduce((a3, b4, c3) => {
              let d3 = 0;
              return c3 % 2 && (d3 = Number.parseInt(b4)), a3 + d3;
            }, 0);
            async function l2() {
              let b4 = [...new Set((await Promise.all(j2.map((a3) => a3.request))).flat().reduce((a3, b5, c3) => (c3 % 2 == 0 && a3.push(b5), a3), [])).values()];
              for (let c3 of j2) {
                let d3 = (await c3.request).reduce((a3, b5, c4) => {
                  let d4 = 0;
                  return c4 % 2 && (d4 = Number.parseInt(b5)), a3 + d4;
                }, 0), e3 = (await c3.request).reduce((a3, b5, c4) => (c4 % 2 == 0 && a3.push(b5), a3), []);
                if (d3 >= a2) continue;
                let f3 = b4.filter((a3) => !e3.includes(a3));
                if (0 !== f3.length) for (let a3 of f3) await c3.redis.hset(h2, { [a3]: i2 });
              }
            }
            let m2 = k2 > 0, o2 = (g2 + 1) * c2;
            return b3.cache && !m2 && b3.cache.blockUntil(d2, o2), { success: m2, limit: a2, remaining: k2, reset: o2, pending: l2() };
          }, async getRemaining(b3, d2) {
            let e2 = Math.floor(Date.now() / c2), f2 = [d2, e2].join(":"), g2 = b3.regionContexts.map((a3) => ({ redis: a3.redis, request: n(a3, p.fixedWindow.getRemaining, [f2], [null]) }));
            return { remaining: Math.max(0, a2 - (await Promise.any(g2.map((a3) => a3.request))).reduce((a3, b4, c3) => {
              let d3 = 0;
              return c3 % 2 && (d3 = Number.parseInt(b4)), a3 + d3;
            }, 0)), reset: (e2 + 1) * c2 };
          }, async resetTokens(a3, b3) {
            let c3 = [b3, "*"].join(":");
            a3.cache && a3.cache.pop(b3), await Promise.all(a3.regionContexts.map((a4) => {
              n(a4, q, [c3], [null]);
            }));
          } });
        }
        static slidingWindow(a2, b2) {
          let c2 = m(b2), d2 = m(b2);
          return () => ({ async limit(b3, e2, f2) {
            if (b3.cache) {
              let { blocked: c3, reset: d3 } = b3.cache.isBlocked(e2);
              if (c3) return { success: false, limit: a2, remaining: 0, reset: d3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let g2 = D(), h2 = Date.now(), i2 = Math.floor(h2 / c2), j2 = [e2, i2].join(":"), k2 = [e2, i2 - 1].join(":"), l2 = f2 ? Math.max(1, f2) : 1, m2 = b3.regionContexts.map((b4) => ({ redis: b4.redis, request: n(b4, p.slidingWindow.limit, [j2, k2], [a2, h2, d2, g2, l2]) })), o2 = h2 % d2 / d2, [q2, r2, s2] = await Promise.any(m2.map((a3) => a3.request));
            s2 && q2.push(g2, l2.toString());
            let t2 = a2 - (Math.ceil(r2.reduce((a3, b4, c3) => {
              let d3 = 0;
              return c3 % 2 && (d3 = Number.parseInt(b4)), a3 + d3;
            }, 0) * (1 - o2)) + q2.reduce((a3, b4, c3) => {
              let d3 = 0;
              return c3 % 2 && (d3 = Number.parseInt(b4)), a3 + d3;
            }, 0));
            async function u2() {
              let b4 = [...new Set((await Promise.all(m2.map((a3) => a3.request))).flatMap(([a3]) => a3).reduce((a3, b5, c3) => (c3 % 2 == 0 && a3.push(b5), a3), [])).values()];
              for (let c3 of m2) {
                let [d3, e3, f3] = await c3.request, g3 = d3.reduce((a3, b5, c4) => (c4 % 2 == 0 && a3.push(b5), a3), []);
                if (d3.reduce((a3, b5, c4) => {
                  let d4 = 0;
                  return c4 % 2 && (d4 = Number.parseInt(b5)), a3 + d4;
                }, 0) >= a2) continue;
                let h3 = b4.filter((a3) => !g3.includes(a3));
                if (0 !== h3.length) for (let a3 of h3) await c3.redis.hset(j2, { [a3]: l2 });
              }
            }
            let v2 = (i2 + 1) * d2;
            return b3.cache && !s2 && b3.cache.blockUntil(e2, v2), { success: !!s2, limit: a2, remaining: Math.max(0, t2), reset: v2, pending: u2() };
          }, async getRemaining(b3, d3) {
            let e2 = Date.now(), f2 = Math.floor(e2 / c2), g2 = [d3, f2].join(":"), h2 = [d3, f2 - 1].join(":"), i2 = b3.regionContexts.map((a3) => ({ redis: a3.redis, request: n(a3, p.slidingWindow.getRemaining, [g2, h2], [e2, c2]) }));
            return { remaining: Math.max(0, a2 - await Promise.any(i2.map((a3) => a3.request))), reset: (f2 + 1) * c2 };
          }, async resetTokens(a3, b3) {
            let c3 = [b3, "*"].join(":");
            a3.cache && a3.cache.pop(b3), await Promise.all(a3.regionContexts.map((a4) => {
              n(a4, q, [c3], [null]);
            }));
          } });
        }
      }, F = class extends C {
        constructor(a2) {
          super({ prefix: a2.prefix, limiter: a2.limiter, timeout: a2.timeout, analytics: a2.analytics, ctx: { redis: a2.redis }, ephemeralCache: a2.ephemeralCache, enableProtection: a2.enableProtection, denyListThreshold: a2.denyListThreshold });
        }
        static fixedWindow(a2, b2) {
          let c2 = m(b2);
          return () => ({ async limit(b3, d2, e2) {
            let f2 = Math.floor(Date.now() / c2), g2 = [d2, f2].join(":");
            if (b3.cache) {
              let { blocked: c3, reset: e3 } = b3.cache.isBlocked(d2);
              if (c3) return { success: false, limit: a2, remaining: 0, reset: e3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let h2 = e2 ? Math.max(1, e2) : 1, i2 = await n(b3, o.fixedWindow.limit, [g2], [c2, h2]), j2 = i2 <= a2, k2 = Math.max(0, a2 - i2), l2 = (f2 + 1) * c2;
            return b3.cache && !j2 && b3.cache.blockUntil(d2, l2), { success: j2, limit: a2, remaining: k2, reset: l2, pending: Promise.resolve() };
          }, async getRemaining(b3, d2) {
            let e2 = Math.floor(Date.now() / c2), f2 = [d2, e2].join(":");
            return { remaining: Math.max(0, a2 - await n(b3, o.fixedWindow.getRemaining, [f2], [null])), reset: (e2 + 1) * c2 };
          }, async resetTokens(a3, b3) {
            let c3 = [b3, "*"].join(":");
            a3.cache && a3.cache.pop(b3), await n(a3, q, [c3], [null]);
          } });
        }
        static slidingWindow(a2, b2) {
          let c2 = m(b2);
          return () => ({ async limit(b3, d2, e2) {
            let f2 = Date.now(), g2 = Math.floor(f2 / c2), h2 = [d2, g2].join(":"), i2 = [d2, g2 - 1].join(":");
            if (b3.cache) {
              let { blocked: c3, reset: e3 } = b3.cache.isBlocked(d2);
              if (c3) return { success: false, limit: a2, remaining: 0, reset: e3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let j2 = e2 ? Math.max(1, e2) : 1, k2 = await n(b3, o.slidingWindow.limit, [h2, i2], [a2, f2, c2, j2]), l2 = k2 >= 0, m2 = (g2 + 1) * c2;
            return b3.cache && !l2 && b3.cache.blockUntil(d2, m2), { success: l2, limit: a2, remaining: Math.max(0, k2), reset: m2, pending: Promise.resolve() };
          }, async getRemaining(b3, d2) {
            let e2 = Date.now(), f2 = Math.floor(e2 / c2), g2 = [d2, f2].join(":"), h2 = [d2, f2 - 1].join(":");
            return { remaining: Math.max(0, a2 - await n(b3, o.slidingWindow.getRemaining, [g2, h2], [e2, c2])), reset: (f2 + 1) * c2 };
          }, async resetTokens(a3, b3) {
            let c3 = [b3, "*"].join(":");
            a3.cache && a3.cache.pop(b3), await n(a3, q, [c3], [null]);
          } });
        }
        static tokenBucket(a2, b2, c2) {
          let d2 = m(b2);
          return () => ({ async limit(b3, e2, f2) {
            if (b3.cache) {
              let { blocked: a3, reset: d3 } = b3.cache.isBlocked(e2);
              if (a3) return { success: false, limit: c2, remaining: 0, reset: d3, pending: Promise.resolve(), reason: "cacheBlock" };
            }
            let g2 = Date.now(), h2 = f2 ? Math.max(1, f2) : 1, [i2, j2] = await n(b3, o.tokenBucket.limit, [e2], [c2, d2, a2, g2, h2]), k2 = i2 >= 0;
            return b3.cache && !k2 && b3.cache.blockUntil(e2, j2), { success: k2, limit: c2, remaining: i2, reset: j2, pending: Promise.resolve() };
          }, async getRemaining(a3, b3) {
            let [e2, f2] = await n(a3, o.tokenBucket.getRemaining, [b3], [c2]), g2 = Date.now() + d2, h2 = f2 + d2;
            return { remaining: e2, reset: -1 === f2 ? g2 : h2 };
          }, async resetTokens(a3, b3) {
            a3.cache && a3.cache.pop(b3), await n(a3, q, [b3], [null]);
          } });
        }
        static cachedFixedWindow(a2, b2) {
          let c2 = m(b2);
          return () => ({ async limit(b3, d2, e2) {
            if (!b3.cache) throw Error("This algorithm requires a cache");
            let f2 = Math.floor(Date.now() / c2), g2 = [d2, f2].join(":"), h2 = (f2 + 1) * c2, i2 = e2 ? Math.max(1, e2) : 1;
            if ("number" == typeof b3.cache.get(g2)) {
              let d3 = b3.cache.incr(g2), e3 = d3 < a2, f3 = e3 ? n(b3, o.cachedFixedWindow.limit, [g2], [c2, i2]) : Promise.resolve();
              return { success: e3, limit: a2, remaining: a2 - d3, reset: h2, pending: f3 };
            }
            let j2 = await n(b3, o.cachedFixedWindow.limit, [g2], [c2, i2]);
            b3.cache.set(g2, j2);
            let k2 = a2 - j2;
            return { success: k2 >= 0, limit: a2, remaining: k2, reset: h2, pending: Promise.resolve() };
          }, async getRemaining(b3, d2) {
            if (!b3.cache) throw Error("This algorithm requires a cache");
            let e2 = Math.floor(Date.now() / c2), f2 = [d2, e2].join(":");
            return "number" == typeof b3.cache.get(f2) ? { remaining: Math.max(0, a2 - (b3.cache.get(f2) ?? 0)), reset: (e2 + 1) * c2 } : { remaining: Math.max(0, a2 - await n(b3, o.cachedFixedWindow.getRemaining, [f2], [null])), reset: (e2 + 1) * c2 };
          }, async resetTokens(a3, b3) {
            if (!a3.cache) throw Error("This algorithm requires a cache");
            let d2 = [b3, Math.floor(Date.now() / c2)].join(":");
            a3.cache.pop(d2);
            let e2 = [b3, "*"].join(":");
            await n(a3, q, [e2], [null]);
          } });
        }
      };
    }, 111: (a, b, c) => {
      "use strict";
      var d = c(356).Buffer;
      Object.defineProperty(b, "__esModule", { value: true });
      var e = { handleFetch: function() {
        return j;
      }, interceptFetch: function() {
        return k;
      }, reader: function() {
        return h;
      } };
      for (var f in e) Object.defineProperty(b, f, { enumerable: true, get: e[f] });
      let g = c(86), h = { url: (a2) => a2.url, header: (a2, b2) => a2.headers.get(b2) };
      async function i(a2, b2) {
        let { url: c2, method: e2, headers: f2, body: g2, cache: h2, credentials: i2, integrity: j2, mode: k2, redirect: l, referrer: m, referrerPolicy: n } = b2;
        return { testData: a2, api: "fetch", request: { url: c2, method: e2, headers: [...Array.from(f2), ["next-test-stack", function() {
          let a3 = (Error().stack ?? "").split("\n");
          for (let b3 = 1; b3 < a3.length; b3++) if (a3[b3].length > 0) {
            a3 = a3.slice(b3);
            break;
          }
          return (a3 = (a3 = (a3 = a3.filter((a4) => !a4.includes("/next/dist/"))).slice(0, 5)).map((a4) => a4.replace("webpack-internal:///(rsc)/", "").trim())).join("    ");
        }()]], body: g2 ? d.from(await b2.arrayBuffer()).toString("base64") : null, cache: h2, credentials: i2, integrity: j2, mode: k2, redirect: l, referrer: m, referrerPolicy: n } };
      }
      async function j(a2, b2) {
        let c2 = (0, g.getTestReqInfo)(b2, h);
        if (!c2) return a2(b2);
        let { testData: e2, proxyPort: f2 } = c2, j2 = await i(e2, b2), k2 = await a2(`http://localhost:${f2}`, { method: "POST", body: JSON.stringify(j2), next: { internal: true } });
        if (!k2.ok) throw Object.defineProperty(Error(`Proxy request failed: ${k2.status}`), "__NEXT_ERROR_CODE", { value: "E146", enumerable: false, configurable: true });
        let l = await k2.json(), { api: m } = l;
        switch (m) {
          case "continue":
            return a2(b2);
          case "abort":
          case "unhandled":
            throw Object.defineProperty(Error(`Proxy request aborted [${b2.method} ${b2.url}]`), "__NEXT_ERROR_CODE", { value: "E145", enumerable: false, configurable: true });
          case "fetch":
            return function(a3) {
              let { status: b3, headers: c3, body: e3 } = a3.response;
              return new Response(e3 ? d.from(e3, "base64") : null, { status: b3, headers: new Headers(c3) });
            }(l);
          default:
            return m;
        }
      }
      function k(a2) {
        return c.g.fetch = function(b2, c2) {
          var d2;
          return (null == c2 || null == (d2 = c2.next) ? void 0 : d2.internal) ? a2(b2, c2) : j(a2, new Request(b2, c2));
        }, () => {
          c.g.fetch = a2;
        };
      }
    }, 183: (a) => {
      (() => {
        "use strict";
        var b = { 993: (a2) => {
          var b2 = Object.prototype.hasOwnProperty, c2 = "~";
          function d2() {
          }
          function e2(a3, b3, c3) {
            this.fn = a3, this.context = b3, this.once = c3 || false;
          }
          function f(a3, b3, d3, f2, g2) {
            if ("function" != typeof d3) throw TypeError("The listener must be a function");
            var h2 = new e2(d3, f2 || a3, g2), i = c2 ? c2 + b3 : b3;
            return a3._events[i] ? a3._events[i].fn ? a3._events[i] = [a3._events[i], h2] : a3._events[i].push(h2) : (a3._events[i] = h2, a3._eventsCount++), a3;
          }
          function g(a3, b3) {
            0 == --a3._eventsCount ? a3._events = new d2() : delete a3._events[b3];
          }
          function h() {
            this._events = new d2(), this._eventsCount = 0;
          }
          Object.create && (d2.prototype = /* @__PURE__ */ Object.create(null), new d2().__proto__ || (c2 = false)), h.prototype.eventNames = function() {
            var a3, d3, e3 = [];
            if (0 === this._eventsCount) return e3;
            for (d3 in a3 = this._events) b2.call(a3, d3) && e3.push(c2 ? d3.slice(1) : d3);
            return Object.getOwnPropertySymbols ? e3.concat(Object.getOwnPropertySymbols(a3)) : e3;
          }, h.prototype.listeners = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            if (!d3) return [];
            if (d3.fn) return [d3.fn];
            for (var e3 = 0, f2 = d3.length, g2 = Array(f2); e3 < f2; e3++) g2[e3] = d3[e3].fn;
            return g2;
          }, h.prototype.listenerCount = function(a3) {
            var b3 = c2 ? c2 + a3 : a3, d3 = this._events[b3];
            return d3 ? d3.fn ? 1 : d3.length : 0;
          }, h.prototype.emit = function(a3, b3, d3, e3, f2, g2) {
            var h2 = c2 ? c2 + a3 : a3;
            if (!this._events[h2]) return false;
            var i, j, k = this._events[h2], l = arguments.length;
            if (k.fn) {
              switch (k.once && this.removeListener(a3, k.fn, void 0, true), l) {
                case 1:
                  return k.fn.call(k.context), true;
                case 2:
                  return k.fn.call(k.context, b3), true;
                case 3:
                  return k.fn.call(k.context, b3, d3), true;
                case 4:
                  return k.fn.call(k.context, b3, d3, e3), true;
                case 5:
                  return k.fn.call(k.context, b3, d3, e3, f2), true;
                case 6:
                  return k.fn.call(k.context, b3, d3, e3, f2, g2), true;
              }
              for (j = 1, i = Array(l - 1); j < l; j++) i[j - 1] = arguments[j];
              k.fn.apply(k.context, i);
            } else {
              var m, n = k.length;
              for (j = 0; j < n; j++) switch (k[j].once && this.removeListener(a3, k[j].fn, void 0, true), l) {
                case 1:
                  k[j].fn.call(k[j].context);
                  break;
                case 2:
                  k[j].fn.call(k[j].context, b3);
                  break;
                case 3:
                  k[j].fn.call(k[j].context, b3, d3);
                  break;
                case 4:
                  k[j].fn.call(k[j].context, b3, d3, e3);
                  break;
                default:
                  if (!i) for (m = 1, i = Array(l - 1); m < l; m++) i[m - 1] = arguments[m];
                  k[j].fn.apply(k[j].context, i);
              }
            }
            return true;
          }, h.prototype.on = function(a3, b3, c3) {
            return f(this, a3, b3, c3, false);
          }, h.prototype.once = function(a3, b3, c3) {
            return f(this, a3, b3, c3, true);
          }, h.prototype.removeListener = function(a3, b3, d3, e3) {
            var f2 = c2 ? c2 + a3 : a3;
            if (!this._events[f2]) return this;
            if (!b3) return g(this, f2), this;
            var h2 = this._events[f2];
            if (h2.fn) h2.fn !== b3 || e3 && !h2.once || d3 && h2.context !== d3 || g(this, f2);
            else {
              for (var i = 0, j = [], k = h2.length; i < k; i++) (h2[i].fn !== b3 || e3 && !h2[i].once || d3 && h2[i].context !== d3) && j.push(h2[i]);
              j.length ? this._events[f2] = 1 === j.length ? j[0] : j : g(this, f2);
            }
            return this;
          }, h.prototype.removeAllListeners = function(a3) {
            var b3;
            return a3 ? (b3 = c2 ? c2 + a3 : a3, this._events[b3] && g(this, b3)) : (this._events = new d2(), this._eventsCount = 0), this;
          }, h.prototype.off = h.prototype.removeListener, h.prototype.addListener = h.prototype.on, h.prefixed = c2, h.EventEmitter = h, a2.exports = h;
        }, 213: (a2) => {
          a2.exports = (a3, b2) => (b2 = b2 || (() => {
          }), a3.then((a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => a4), (a4) => new Promise((a5) => {
            a5(b2());
          }).then(() => {
            throw a4;
          })));
        }, 574: (a2, b2) => {
          Object.defineProperty(b2, "__esModule", { value: true }), b2.default = function(a3, b3, c2) {
            let d2 = 0, e2 = a3.length;
            for (; e2 > 0; ) {
              let f = e2 / 2 | 0, g = d2 + f;
              0 >= c2(a3[g], b3) ? (d2 = ++g, e2 -= f + 1) : e2 = f;
            }
            return d2;
          };
        }, 821: (a2, b2, c2) => {
          Object.defineProperty(b2, "__esModule", { value: true });
          let d2 = c2(574);
          class e2 {
            constructor() {
              this._queue = [];
            }
            enqueue(a3, b3) {
              let c3 = { priority: (b3 = Object.assign({ priority: 0 }, b3)).priority, run: a3 };
              if (this.size && this._queue[this.size - 1].priority >= b3.priority) return void this._queue.push(c3);
              let e3 = d2.default(this._queue, c3, (a4, b4) => b4.priority - a4.priority);
              this._queue.splice(e3, 0, c3);
            }
            dequeue() {
              let a3 = this._queue.shift();
              return null == a3 ? void 0 : a3.run;
            }
            filter(a3) {
              return this._queue.filter((b3) => b3.priority === a3.priority).map((a4) => a4.run);
            }
            get size() {
              return this._queue.length;
            }
          }
          b2.default = e2;
        }, 816: (a2, b2, c2) => {
          let d2 = c2(213);
          class e2 extends Error {
            constructor(a3) {
              super(a3), this.name = "TimeoutError";
            }
          }
          let f = (a3, b3, c3) => new Promise((f2, g) => {
            if ("number" != typeof b3 || b3 < 0) throw TypeError("Expected `milliseconds` to be a positive number");
            if (b3 === 1 / 0) return void f2(a3);
            let h = setTimeout(() => {
              if ("function" == typeof c3) {
                try {
                  f2(c3());
                } catch (a4) {
                  g(a4);
                }
                return;
              }
              let d3 = "string" == typeof c3 ? c3 : `Promise timed out after ${b3} milliseconds`, h2 = c3 instanceof Error ? c3 : new e2(d3);
              "function" == typeof a3.cancel && a3.cancel(), g(h2);
            }, b3);
            d2(a3.then(f2, g), () => {
              clearTimeout(h);
            });
          });
          a2.exports = f, a2.exports.default = f, a2.exports.TimeoutError = e2;
        } }, c = {};
        function d(a2) {
          var e2 = c[a2];
          if (void 0 !== e2) return e2.exports;
          var f = c[a2] = { exports: {} }, g = true;
          try {
            b[a2](f, f.exports, d), g = false;
          } finally {
            g && delete c[a2];
          }
          return f.exports;
        }
        d.ab = "//";
        var e = {};
        (() => {
          Object.defineProperty(e, "__esModule", { value: true });
          let a2 = d(993), b2 = d(816), c2 = d(821), f = () => {
          }, g = new b2.TimeoutError();
          class h extends a2 {
            constructor(a3) {
              var b3, d2, e2, g2;
              if (super(), this._intervalCount = 0, this._intervalEnd = 0, this._pendingCount = 0, this._resolveEmpty = f, this._resolveIdle = f, !("number" == typeof (a3 = Object.assign({ carryoverConcurrencyCount: false, intervalCap: 1 / 0, interval: 0, concurrency: 1 / 0, autoStart: true, queueClass: c2.default }, a3)).intervalCap && a3.intervalCap >= 1)) throw TypeError(`Expected \`intervalCap\` to be a number from 1 and up, got \`${null != (d2 = null == (b3 = a3.intervalCap) ? void 0 : b3.toString()) ? d2 : ""}\` (${typeof a3.intervalCap})`);
              if (void 0 === a3.interval || !(Number.isFinite(a3.interval) && a3.interval >= 0)) throw TypeError(`Expected \`interval\` to be a finite number >= 0, got \`${null != (g2 = null == (e2 = a3.interval) ? void 0 : e2.toString()) ? g2 : ""}\` (${typeof a3.interval})`);
              this._carryoverConcurrencyCount = a3.carryoverConcurrencyCount, this._isIntervalIgnored = a3.intervalCap === 1 / 0 || 0 === a3.interval, this._intervalCap = a3.intervalCap, this._interval = a3.interval, this._queue = new a3.queueClass(), this._queueClass = a3.queueClass, this.concurrency = a3.concurrency, this._timeout = a3.timeout, this._throwOnTimeout = true === a3.throwOnTimeout, this._isPaused = false === a3.autoStart;
            }
            get _doesIntervalAllowAnother() {
              return this._isIntervalIgnored || this._intervalCount < this._intervalCap;
            }
            get _doesConcurrentAllowAnother() {
              return this._pendingCount < this._concurrency;
            }
            _next() {
              this._pendingCount--, this._tryToStartAnother(), this.emit("next");
            }
            _resolvePromises() {
              this._resolveEmpty(), this._resolveEmpty = f, 0 === this._pendingCount && (this._resolveIdle(), this._resolveIdle = f, this.emit("idle"));
            }
            _onResumeInterval() {
              this._onInterval(), this._initializeIntervalIfNeeded(), this._timeoutId = void 0;
            }
            _isIntervalPaused() {
              let a3 = Date.now();
              if (void 0 === this._intervalId) {
                let b3 = this._intervalEnd - a3;
                if (!(b3 < 0)) return void 0 === this._timeoutId && (this._timeoutId = setTimeout(() => {
                  this._onResumeInterval();
                }, b3)), true;
                this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0;
              }
              return false;
            }
            _tryToStartAnother() {
              if (0 === this._queue.size) return this._intervalId && clearInterval(this._intervalId), this._intervalId = void 0, this._resolvePromises(), false;
              if (!this._isPaused) {
                let a3 = !this._isIntervalPaused();
                if (this._doesIntervalAllowAnother && this._doesConcurrentAllowAnother) {
                  let b3 = this._queue.dequeue();
                  return !!b3 && (this.emit("active"), b3(), a3 && this._initializeIntervalIfNeeded(), true);
                }
              }
              return false;
            }
            _initializeIntervalIfNeeded() {
              this._isIntervalIgnored || void 0 !== this._intervalId || (this._intervalId = setInterval(() => {
                this._onInterval();
              }, this._interval), this._intervalEnd = Date.now() + this._interval);
            }
            _onInterval() {
              0 === this._intervalCount && 0 === this._pendingCount && this._intervalId && (clearInterval(this._intervalId), this._intervalId = void 0), this._intervalCount = this._carryoverConcurrencyCount ? this._pendingCount : 0, this._processQueue();
            }
            _processQueue() {
              for (; this._tryToStartAnother(); ) ;
            }
            get concurrency() {
              return this._concurrency;
            }
            set concurrency(a3) {
              if (!("number" == typeof a3 && a3 >= 1)) throw TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${a3}\` (${typeof a3})`);
              this._concurrency = a3, this._processQueue();
            }
            async add(a3, c3 = {}) {
              return new Promise((d2, e2) => {
                let f2 = async () => {
                  this._pendingCount++, this._intervalCount++;
                  try {
                    let f3 = void 0 === this._timeout && void 0 === c3.timeout ? a3() : b2.default(Promise.resolve(a3()), void 0 === c3.timeout ? this._timeout : c3.timeout, () => {
                      (void 0 === c3.throwOnTimeout ? this._throwOnTimeout : c3.throwOnTimeout) && e2(g);
                    });
                    d2(await f3);
                  } catch (a4) {
                    e2(a4);
                  }
                  this._next();
                };
                this._queue.enqueue(f2, c3), this._tryToStartAnother(), this.emit("add");
              });
            }
            async addAll(a3, b3) {
              return Promise.all(a3.map(async (a4) => this.add(a4, b3)));
            }
            start() {
              return this._isPaused && (this._isPaused = false, this._processQueue()), this;
            }
            pause() {
              this._isPaused = true;
            }
            clear() {
              this._queue = new this._queueClass();
            }
            async onEmpty() {
              if (0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveEmpty;
                this._resolveEmpty = () => {
                  b3(), a3();
                };
              });
            }
            async onIdle() {
              if (0 !== this._pendingCount || 0 !== this._queue.size) return new Promise((a3) => {
                let b3 = this._resolveIdle;
                this._resolveIdle = () => {
                  b3(), a3();
                };
              });
            }
            get size() {
              return this._queue.size;
            }
            sizeBy(a3) {
              return this._queue.filter(a3).length;
            }
            get pending() {
              return this._pendingCount;
            }
            get isPaused() {
              return this._isPaused;
            }
            get timeout() {
              return this._timeout;
            }
            set timeout(a3) {
              this._timeout = a3;
            }
          }
          e.default = h;
        })(), a.exports = e;
      })();
    }, 289: (a) => {
      !function() {
        "use strict";
        var b = { 114: function(a2) {
          function b2(a3) {
            if ("string" != typeof a3) throw TypeError("Path must be a string. Received " + JSON.stringify(a3));
          }
          function c2(a3, b3) {
            for (var c3, d3 = "", e = 0, f = -1, g = 0, h = 0; h <= a3.length; ++h) {
              if (h < a3.length) c3 = a3.charCodeAt(h);
              else if (47 === c3) break;
              else c3 = 47;
              if (47 === c3) {
                if (f === h - 1 || 1 === g) ;
                else if (f !== h - 1 && 2 === g) {
                  if (d3.length < 2 || 2 !== e || 46 !== d3.charCodeAt(d3.length - 1) || 46 !== d3.charCodeAt(d3.length - 2)) {
                    if (d3.length > 2) {
                      var i = d3.lastIndexOf("/");
                      if (i !== d3.length - 1) {
                        -1 === i ? (d3 = "", e = 0) : e = (d3 = d3.slice(0, i)).length - 1 - d3.lastIndexOf("/"), f = h, g = 0;
                        continue;
                      }
                    } else if (2 === d3.length || 1 === d3.length) {
                      d3 = "", e = 0, f = h, g = 0;
                      continue;
                    }
                  }
                  b3 && (d3.length > 0 ? d3 += "/.." : d3 = "..", e = 2);
                } else d3.length > 0 ? d3 += "/" + a3.slice(f + 1, h) : d3 = a3.slice(f + 1, h), e = h - f - 1;
                f = h, g = 0;
              } else 46 === c3 && -1 !== g ? ++g : g = -1;
            }
            return d3;
          }
          var d2 = { resolve: function() {
            for (var a3, d3, e = "", f = false, g = arguments.length - 1; g >= -1 && !f; g--) g >= 0 ? d3 = arguments[g] : (void 0 === a3 && (a3 = ""), d3 = a3), b2(d3), 0 !== d3.length && (e = d3 + "/" + e, f = 47 === d3.charCodeAt(0));
            if (e = c2(e, !f), f) if (e.length > 0) return "/" + e;
            else return "/";
            return e.length > 0 ? e : ".";
          }, normalize: function(a3) {
            if (b2(a3), 0 === a3.length) return ".";
            var d3 = 47 === a3.charCodeAt(0), e = 47 === a3.charCodeAt(a3.length - 1);
            return (0 !== (a3 = c2(a3, !d3)).length || d3 || (a3 = "."), a3.length > 0 && e && (a3 += "/"), d3) ? "/" + a3 : a3;
          }, isAbsolute: function(a3) {
            return b2(a3), a3.length > 0 && 47 === a3.charCodeAt(0);
          }, join: function() {
            if (0 == arguments.length) return ".";
            for (var a3, c3 = 0; c3 < arguments.length; ++c3) {
              var e = arguments[c3];
              b2(e), e.length > 0 && (void 0 === a3 ? a3 = e : a3 += "/" + e);
            }
            return void 0 === a3 ? "." : d2.normalize(a3);
          }, relative: function(a3, c3) {
            if (b2(a3), b2(c3), a3 === c3 || (a3 = d2.resolve(a3)) === (c3 = d2.resolve(c3))) return "";
            for (var e = 1; e < a3.length && 47 === a3.charCodeAt(e); ++e) ;
            for (var f = a3.length, g = f - e, h = 1; h < c3.length && 47 === c3.charCodeAt(h); ++h) ;
            for (var i = c3.length - h, j = g < i ? g : i, k = -1, l = 0; l <= j; ++l) {
              if (l === j) {
                if (i > j) {
                  if (47 === c3.charCodeAt(h + l)) return c3.slice(h + l + 1);
                  else if (0 === l) return c3.slice(h + l);
                } else g > j && (47 === a3.charCodeAt(e + l) ? k = l : 0 === l && (k = 0));
                break;
              }
              var m = a3.charCodeAt(e + l);
              if (m !== c3.charCodeAt(h + l)) break;
              47 === m && (k = l);
            }
            var n = "";
            for (l = e + k + 1; l <= f; ++l) (l === f || 47 === a3.charCodeAt(l)) && (0 === n.length ? n += ".." : n += "/..");
            return n.length > 0 ? n + c3.slice(h + k) : (h += k, 47 === c3.charCodeAt(h) && ++h, c3.slice(h));
          }, _makeLong: function(a3) {
            return a3;
          }, dirname: function(a3) {
            if (b2(a3), 0 === a3.length) return ".";
            for (var c3 = a3.charCodeAt(0), d3 = 47 === c3, e = -1, f = true, g = a3.length - 1; g >= 1; --g) if (47 === (c3 = a3.charCodeAt(g))) {
              if (!f) {
                e = g;
                break;
              }
            } else f = false;
            return -1 === e ? d3 ? "/" : "." : d3 && 1 === e ? "//" : a3.slice(0, e);
          }, basename: function(a3, c3) {
            if (void 0 !== c3 && "string" != typeof c3) throw TypeError('"ext" argument must be a string');
            b2(a3);
            var d3, e = 0, f = -1, g = true;
            if (void 0 !== c3 && c3.length > 0 && c3.length <= a3.length) {
              if (c3.length === a3.length && c3 === a3) return "";
              var h = c3.length - 1, i = -1;
              for (d3 = a3.length - 1; d3 >= 0; --d3) {
                var j = a3.charCodeAt(d3);
                if (47 === j) {
                  if (!g) {
                    e = d3 + 1;
                    break;
                  }
                } else -1 === i && (g = false, i = d3 + 1), h >= 0 && (j === c3.charCodeAt(h) ? -1 == --h && (f = d3) : (h = -1, f = i));
              }
              return e === f ? f = i : -1 === f && (f = a3.length), a3.slice(e, f);
            }
            for (d3 = a3.length - 1; d3 >= 0; --d3) if (47 === a3.charCodeAt(d3)) {
              if (!g) {
                e = d3 + 1;
                break;
              }
            } else -1 === f && (g = false, f = d3 + 1);
            return -1 === f ? "" : a3.slice(e, f);
          }, extname: function(a3) {
            b2(a3);
            for (var c3 = -1, d3 = 0, e = -1, f = true, g = 0, h = a3.length - 1; h >= 0; --h) {
              var i = a3.charCodeAt(h);
              if (47 === i) {
                if (!f) {
                  d3 = h + 1;
                  break;
                }
                continue;
              }
              -1 === e && (f = false, e = h + 1), 46 === i ? -1 === c3 ? c3 = h : 1 !== g && (g = 1) : -1 !== c3 && (g = -1);
            }
            return -1 === c3 || -1 === e || 0 === g || 1 === g && c3 === e - 1 && c3 === d3 + 1 ? "" : a3.slice(c3, e);
          }, format: function(a3) {
            var b3, c3;
            if (null === a3 || "object" != typeof a3) throw TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof a3);
            return b3 = a3.dir || a3.root, c3 = a3.base || (a3.name || "") + (a3.ext || ""), b3 ? b3 === a3.root ? b3 + c3 : b3 + "/" + c3 : c3;
          }, parse: function(a3) {
            b2(a3);
            var c3, d3 = { root: "", dir: "", base: "", ext: "", name: "" };
            if (0 === a3.length) return d3;
            var e = a3.charCodeAt(0), f = 47 === e;
            f ? (d3.root = "/", c3 = 1) : c3 = 0;
            for (var g = -1, h = 0, i = -1, j = true, k = a3.length - 1, l = 0; k >= c3; --k) {
              if (47 === (e = a3.charCodeAt(k))) {
                if (!j) {
                  h = k + 1;
                  break;
                }
                continue;
              }
              -1 === i && (j = false, i = k + 1), 46 === e ? -1 === g ? g = k : 1 !== l && (l = 1) : -1 !== g && (l = -1);
            }
            return -1 === g || -1 === i || 0 === l || 1 === l && g === i - 1 && g === h + 1 ? -1 !== i && (0 === h && f ? d3.base = d3.name = a3.slice(1, i) : d3.base = d3.name = a3.slice(h, i)) : (0 === h && f ? (d3.name = a3.slice(1, g), d3.base = a3.slice(1, i)) : (d3.name = a3.slice(h, g), d3.base = a3.slice(h, i)), d3.ext = a3.slice(g, i)), h > 0 ? d3.dir = a3.slice(0, h - 1) : f && (d3.dir = "/"), d3;
          }, sep: "/", delimiter: ":", win32: null, posix: null };
          d2.posix = d2, a2.exports = d2;
        } }, c = {};
        function d(a2) {
          var e = c[a2];
          if (void 0 !== e) return e.exports;
          var f = c[a2] = { exports: {} }, g = true;
          try {
            b[a2](f, f.exports, d), g = false;
          } finally {
            g && delete c[a2];
          }
          return f.exports;
        }
        d.ab = "//", a.exports = d(114);
      }();
    }, 326: (a) => {
      "use strict";
      var b = Object.defineProperty, c = Object.getOwnPropertyDescriptor, d = Object.getOwnPropertyNames, e = Object.prototype.hasOwnProperty, f = {}, g = { Analytics: () => l };
      for (var h in g) b(f, h, { get: g[h], enumerable: true });
      a.exports = ((a2, f2, g2, h2) => {
        if (f2 && "object" == typeof f2 || "function" == typeof f2) for (let i2 of d(f2)) e.call(a2, i2) || i2 === g2 || b(a2, i2, { get: () => f2[i2], enumerable: !(h2 = c(f2, i2)) || h2.enumerable });
        return a2;
      })(b({}, "__esModule", { value: true }), f);
      var i = `
local key = KEYS[1]
local field = ARGV[1]

local data = redis.call("ZRANGE", key, 0, -1, "WITHSCORES")
local count = {}

for i = 1, #data, 2 do
  local json_str = data[i]
  local score = tonumber(data[i + 1])
  local obj = cjson.decode(json_str)

  local fieldValue = obj[field]

  if count[fieldValue] == nil then
    count[fieldValue] = score
  else
    count[fieldValue] = count[fieldValue] + score
  end
end

local result = {}
for k, v in pairs(count) do
  table.insert(result, {k, v})
end

return result
`, j = `
local prefix = KEYS[1]
local first_timestamp = tonumber(ARGV[1]) -- First timestamp to check
local increment = tonumber(ARGV[2])       -- Increment between each timestamp
local num_timestamps = tonumber(ARGV[3])  -- Number of timestampts to check (24 for a day and 24 * 7 for a week)
local num_elements = tonumber(ARGV[4])    -- Number of elements to fetch in each category
local check_at_most = tonumber(ARGV[5])   -- Number of elements to check at most.

local keys = {}
for i = 1, num_timestamps do
  local timestamp = first_timestamp - (i - 1) * increment
  table.insert(keys, prefix .. ":" .. timestamp)
end

-- get the union of the groups
local zunion_params = {"ZUNION", num_timestamps, unpack(keys)}
table.insert(zunion_params, "WITHSCORES")
local result = redis.call(unpack(zunion_params))

-- select num_elements many items
local true_group = {}
local false_group = {}
local denied_group = {}
local true_count = 0
local false_count = 0
local denied_count = 0
local i = #result - 1

-- index to stop at after going through "checkAtMost" many items:
local cutoff_index = #result - 2 * check_at_most

-- iterate over the results
while (true_count + false_count + denied_count) < (num_elements * 3) and 1 <= i and i >= cutoff_index do
  local score = tonumber(result[i + 1])
  if score > 0 then
    local element = result[i]
    if string.find(element, "success\\":true") and true_count < num_elements then
      table.insert(true_group, {score, element})
      true_count = true_count + 1
    elseif string.find(element, "success\\":false") and false_count < num_elements then
      table.insert(false_group, {score, element})
      false_count = false_count + 1
    elseif string.find(element, "success\\":\\"denied") and denied_count < num_elements then
      table.insert(denied_group, {score, element})
      denied_count = denied_count + 1
    end
  end
  i = i - 2
end

return {true_group, false_group, denied_group}
`, k = `
local prefix = KEYS[1]
local first_timestamp = tonumber(ARGV[1])
local increment = tonumber(ARGV[2])
local num_timestamps = tonumber(ARGV[3])

local keys = {}
for i = 1, num_timestamps do
  local timestamp = first_timestamp - (i - 1) * increment
  table.insert(keys, prefix .. ":" .. timestamp)
end

-- get the union of the groups
local zunion_params = {"ZUNION", num_timestamps, unpack(keys)}
table.insert(zunion_params, "WITHSCORES")
local result = redis.call(unpack(zunion_params))

return result
`, l = class {
        redis;
        prefix;
        bucketSize;
        constructor(a2) {
          this.redis = a2.redis, this.prefix = a2.prefix ?? "@upstash/analytics", this.bucketSize = this.parseWindow(a2.window);
        }
        validateTableName(a2) {
          if (!/^[a-zA-Z0-9_-]+$/.test(a2)) throw Error(`Invalid table name: ${a2}. Table names can only contain letters, numbers, dashes and underscores.`);
        }
        parseWindow(a2) {
          if ("number" == typeof a2) {
            if (a2 <= 0) throw Error(`Invalid window: ${a2}`);
            return a2;
          }
          let b2 = /^(\d+)([smhd])$/;
          if (!b2.test(a2)) throw Error(`Invalid window: ${a2}`);
          let [, c2, d2] = a2.match(b2), e2 = parseInt(c2);
          switch (d2) {
            case "s":
              return 1e3 * e2;
            case "m":
              return 1e3 * e2 * 60;
            case "h":
              return 1e3 * e2 * 3600;
            case "d":
              return 1e3 * e2 * 86400;
            default:
              throw Error(`Invalid window unit: ${d2}`);
          }
        }
        getBucket(a2) {
          return Math.floor((a2 ?? Date.now()) / this.bucketSize) * this.bucketSize;
        }
        async ingest(a2, ...b2) {
          this.validateTableName(a2), await Promise.all(b2.map(async (b3) => {
            let c2 = this.getBucket(b3.time), d2 = [this.prefix, a2, c2].join(":");
            await this.redis.zincrby(d2, 1, JSON.stringify({ ...b3, time: void 0 }));
          }));
        }
        formatBucketAggregate(a2, b2, c2) {
          let d2 = {};
          return a2.forEach(([a3, c3]) => {
            "success" == b2 && (a3 = 1 === a3 ? "true" : null === a3 ? "false" : a3), d2[b2] = d2[b2] || {}, d2[b2][(a3 ?? "null").toString()] = c3;
          }), { time: c2, ...d2 };
        }
        async aggregateBucket(a2, b2, c2) {
          this.validateTableName(a2);
          let d2 = this.getBucket(c2), e2 = [this.prefix, a2, d2].join(":"), f2 = await this.redis.eval(i, [e2], [b2]);
          return this.formatBucketAggregate(f2, b2, d2);
        }
        async aggregateBuckets(a2, b2, c2, d2) {
          this.validateTableName(a2);
          let e2 = this.getBucket(d2), f2 = [];
          for (let d3 = 0; d3 < c2; d3 += 1) f2.push(this.aggregateBucket(a2, b2, e2)), e2 -= this.bucketSize;
          return Promise.all(f2);
        }
        async aggregateBucketsWithPipeline(a2, b2, c2, d2, e2) {
          this.validateTableName(a2), e2 = e2 ?? 48;
          let f2 = this.getBucket(d2), g2 = [], h2 = this.redis.pipeline(), j2 = [];
          for (let d3 = 1; d3 <= c2; d3 += 1) {
            let k2 = [this.prefix, a2, f2].join(":");
            h2.eval(i, [k2], [b2]), g2.push(f2), f2 -= this.bucketSize, (d3 % e2 == 0 || d3 == c2) && (j2.push(h2.exec()), h2 = this.redis.pipeline());
          }
          return (await Promise.all(j2)).flat().map((a3, c3) => this.formatBucketAggregate(a3, b2, g2[c3]));
        }
        async getAllowedBlocked(a2, b2, c2) {
          this.validateTableName(a2);
          let d2 = [this.prefix, a2].join(":"), e2 = this.getBucket(c2), f2 = await this.redis.eval(k, [d2], [e2, this.bucketSize, b2]), g2 = {};
          for (let a3 = 0; a3 < f2.length; a3 += 2) {
            let b3 = f2[a3], c3 = b3.identifier, d3 = +f2[a3 + 1];
            g2[c3] || (g2[c3] = { success: 0, blocked: 0 }), g2[c3][b3.success ? "success" : "blocked"] = d3;
          }
          return g2;
        }
        async getMostAllowedBlocked(a2, b2, c2, d2, e2) {
          this.validateTableName(a2);
          let f2 = [this.prefix, a2].join(":"), g2 = this.getBucket(d2), [h2, i2, k2] = await this.redis.eval(j, [f2], [g2, this.bucketSize, b2, c2, e2 ?? 5 * c2]);
          return { allowed: this.toDicts(h2), ratelimited: this.toDicts(i2), denied: this.toDicts(k2) };
        }
        toDicts(a2) {
          let b2 = [];
          for (let c2 = 0; c2 < a2.length; c2 += 1) {
            let d2 = +a2[c2][0], e2 = a2[c2][1];
            b2.push({ identifier: e2.identifier, count: d2 });
          }
          return b2;
        }
      };
    }, 356: (a) => {
      "use strict";
      a.exports = (init_node_buffer(), __toCommonJS(node_buffer_exports));
    }, 477: () => {
    }, 514: (a, b) => {
      "use strict";
      Symbol.for("react.transitional.element"), Symbol.for("react.portal"), Symbol.for("react.fragment"), Symbol.for("react.strict_mode"), Symbol.for("react.profiler"), Symbol.for("react.forward_ref"), Symbol.for("react.suspense"), Symbol.for("react.memo"), Symbol.for("react.lazy"), Symbol.for("react.activity"), Symbol.for("react.view_transition"), Symbol.iterator;
      Object.prototype.hasOwnProperty;
    }, 521: (a) => {
      "use strict";
      a.exports = (init_node_async_hooks(), __toCommonJS(node_async_hooks_exports));
    }, 569: (a) => {
      "use strict";
      var b = Object.defineProperty, c = Object.getOwnPropertyDescriptor, d = Object.getOwnPropertyNames, e = Object.prototype.hasOwnProperty, f = {}, g = { RequestCookies: () => n, ResponseCookies: () => o, parseCookie: () => j, parseSetCookie: () => k, stringifyCookie: () => i };
      for (var h in g) b(f, h, { get: g[h], enumerable: true });
      function i(a2) {
        var b2;
        let c2 = ["path" in a2 && a2.path && `Path=${a2.path}`, "expires" in a2 && (a2.expires || 0 === a2.expires) && `Expires=${("number" == typeof a2.expires ? new Date(a2.expires) : a2.expires).toUTCString()}`, "maxAge" in a2 && "number" == typeof a2.maxAge && `Max-Age=${a2.maxAge}`, "domain" in a2 && a2.domain && `Domain=${a2.domain}`, "secure" in a2 && a2.secure && "Secure", "httpOnly" in a2 && a2.httpOnly && "HttpOnly", "sameSite" in a2 && a2.sameSite && `SameSite=${a2.sameSite}`, "partitioned" in a2 && a2.partitioned && "Partitioned", "priority" in a2 && a2.priority && `Priority=${a2.priority}`].filter(Boolean), d2 = `${a2.name}=${encodeURIComponent(null != (b2 = a2.value) ? b2 : "")}`;
        return 0 === c2.length ? d2 : `${d2}; ${c2.join("; ")}`;
      }
      function j(a2) {
        let b2 = /* @__PURE__ */ new Map();
        for (let c2 of a2.split(/; */)) {
          if (!c2) continue;
          let a3 = c2.indexOf("=");
          if (-1 === a3) {
            b2.set(c2, "true");
            continue;
          }
          let [d2, e2] = [c2.slice(0, a3), c2.slice(a3 + 1)];
          try {
            b2.set(d2, decodeURIComponent(null != e2 ? e2 : "true"));
          } catch {
          }
        }
        return b2;
      }
      function k(a2) {
        if (!a2) return;
        let [[b2, c2], ...d2] = j(a2), { domain: e2, expires: f2, httponly: g2, maxage: h2, path: i2, samesite: k2, secure: n2, partitioned: o2, priority: p } = Object.fromEntries(d2.map(([a3, b3]) => [a3.toLowerCase().replace(/-/g, ""), b3]));
        {
          var q, r, s = { name: b2, value: decodeURIComponent(c2), domain: e2, ...f2 && { expires: new Date(f2) }, ...g2 && { httpOnly: true }, ..."string" == typeof h2 && { maxAge: Number(h2) }, path: i2, ...k2 && { sameSite: l.includes(q = (q = k2).toLowerCase()) ? q : void 0 }, ...n2 && { secure: true }, ...p && { priority: m.includes(r = (r = p).toLowerCase()) ? r : void 0 }, ...o2 && { partitioned: true } };
          let a3 = {};
          for (let b3 in s) s[b3] && (a3[b3] = s[b3]);
          return a3;
        }
      }
      a.exports = ((a2, f2, g2, h2) => {
        if (f2 && "object" == typeof f2 || "function" == typeof f2) for (let i2 of d(f2)) e.call(a2, i2) || i2 === g2 || b(a2, i2, { get: () => f2[i2], enumerable: !(h2 = c(f2, i2)) || h2.enumerable });
        return a2;
      })(b({}, "__esModule", { value: true }), f);
      var l = ["strict", "lax", "none"], m = ["low", "medium", "high"], n = class {
        constructor(a2) {
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          const b2 = a2.get("cookie");
          if (b2) for (const [a3, c2] of j(b2)) this._parsed.set(a3, { name: a3, value: c2 });
        }
        [Symbol.iterator]() {
          return this._parsed[Symbol.iterator]();
        }
        get size() {
          return this._parsed.size;
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed);
          if (!a2.length) return c2.map(([a3, b3]) => b3);
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter(([a3]) => a3 === d2).map(([a3, b3]) => b3);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2] = 1 === a2.length ? [a2[0].name, a2[0].value] : a2, d2 = this._parsed;
          return d2.set(b2, { name: b2, value: c2 }), this._headers.set("cookie", Array.from(d2).map(([a3, b3]) => i(b3)).join("; ")), this;
        }
        delete(a2) {
          let b2 = this._parsed, c2 = Array.isArray(a2) ? a2.map((a3) => b2.delete(a3)) : b2.delete(a2);
          return this._headers.set("cookie", Array.from(b2).map(([a3, b3]) => i(b3)).join("; ")), c2;
        }
        clear() {
          return this.delete(Array.from(this._parsed.keys())), this;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map((a2) => `${a2.name}=${encodeURIComponent(a2.value)}`).join("; ");
        }
      }, o = class {
        constructor(a2) {
          var b2, c2, d2;
          this._parsed = /* @__PURE__ */ new Map(), this._headers = a2;
          const e2 = null != (d2 = null != (c2 = null == (b2 = a2.getSetCookie) ? void 0 : b2.call(a2)) ? c2 : a2.get("set-cookie")) ? d2 : [];
          for (const a3 of Array.isArray(e2) ? e2 : function(a4) {
            if (!a4) return [];
            var b3, c3, d3, e3, f2, g2 = [], h2 = 0;
            function i2() {
              for (; h2 < a4.length && /\s/.test(a4.charAt(h2)); ) h2 += 1;
              return h2 < a4.length;
            }
            for (; h2 < a4.length; ) {
              for (b3 = h2, f2 = false; i2(); ) if ("," === (c3 = a4.charAt(h2))) {
                for (d3 = h2, h2 += 1, i2(), e3 = h2; h2 < a4.length && "=" !== (c3 = a4.charAt(h2)) && ";" !== c3 && "," !== c3; ) h2 += 1;
                h2 < a4.length && "=" === a4.charAt(h2) ? (f2 = true, h2 = e3, g2.push(a4.substring(b3, d3)), b3 = h2) : h2 = d3 + 1;
              } else h2 += 1;
              (!f2 || h2 >= a4.length) && g2.push(a4.substring(b3, a4.length));
            }
            return g2;
          }(e2)) {
            const b3 = k(a3);
            b3 && this._parsed.set(b3.name, b3);
          }
        }
        get(...a2) {
          let b2 = "string" == typeof a2[0] ? a2[0] : a2[0].name;
          return this._parsed.get(b2);
        }
        getAll(...a2) {
          var b2;
          let c2 = Array.from(this._parsed.values());
          if (!a2.length) return c2;
          let d2 = "string" == typeof a2[0] ? a2[0] : null == (b2 = a2[0]) ? void 0 : b2.name;
          return c2.filter((a3) => a3.name === d2);
        }
        has(a2) {
          return this._parsed.has(a2);
        }
        set(...a2) {
          let [b2, c2, d2] = 1 === a2.length ? [a2[0].name, a2[0].value, a2[0]] : a2, e2 = this._parsed;
          return e2.set(b2, function(a3 = { name: "", value: "" }) {
            return "number" == typeof a3.expires && (a3.expires = new Date(a3.expires)), a3.maxAge && (a3.expires = new Date(Date.now() + 1e3 * a3.maxAge)), (null === a3.path || void 0 === a3.path) && (a3.path = "/"), a3;
          }({ name: b2, value: c2, ...d2 })), function(a3, b3) {
            for (let [, c3] of (b3.delete("set-cookie"), a3)) {
              let a4 = i(c3);
              b3.append("set-cookie", a4);
            }
          }(e2, this._headers), this;
        }
        delete(...a2) {
          let [b2, c2] = "string" == typeof a2[0] ? [a2[0]] : [a2[0].name, a2[0]];
          return this.set({ ...c2, name: b2, value: "", expires: /* @__PURE__ */ new Date(0) });
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return `ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`;
        }
        toString() {
          return [...this._parsed.values()].map(i).join("; ");
        }
      };
    }, 590: (a) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "//");
        var b = {};
        (() => {
          function a2(a3, b2) {
            void 0 === b2 && (b2 = {});
            for (var c2 = function(a4) {
              for (var b3 = [], c3 = 0; c3 < a4.length; ) {
                var d3 = a4[c3];
                if ("*" === d3 || "+" === d3 || "?" === d3) {
                  b3.push({ type: "MODIFIER", index: c3, value: a4[c3++] });
                  continue;
                }
                if ("\\" === d3) {
                  b3.push({ type: "ESCAPED_CHAR", index: c3++, value: a4[c3++] });
                  continue;
                }
                if ("{" === d3) {
                  b3.push({ type: "OPEN", index: c3, value: a4[c3++] });
                  continue;
                }
                if ("}" === d3) {
                  b3.push({ type: "CLOSE", index: c3, value: a4[c3++] });
                  continue;
                }
                if (":" === d3) {
                  for (var e2 = "", f3 = c3 + 1; f3 < a4.length; ) {
                    var g3 = a4.charCodeAt(f3);
                    if (g3 >= 48 && g3 <= 57 || g3 >= 65 && g3 <= 90 || g3 >= 97 && g3 <= 122 || 95 === g3) {
                      e2 += a4[f3++];
                      continue;
                    }
                    break;
                  }
                  if (!e2) throw TypeError("Missing parameter name at ".concat(c3));
                  b3.push({ type: "NAME", index: c3, value: e2 }), c3 = f3;
                  continue;
                }
                if ("(" === d3) {
                  var h3 = 1, i2 = "", f3 = c3 + 1;
                  if ("?" === a4[f3]) throw TypeError('Pattern cannot start with "?" at '.concat(f3));
                  for (; f3 < a4.length; ) {
                    if ("\\" === a4[f3]) {
                      i2 += a4[f3++] + a4[f3++];
                      continue;
                    }
                    if (")" === a4[f3]) {
                      if (0 == --h3) {
                        f3++;
                        break;
                      }
                    } else if ("(" === a4[f3] && (h3++, "?" !== a4[f3 + 1])) throw TypeError("Capturing groups are not allowed at ".concat(f3));
                    i2 += a4[f3++];
                  }
                  if (h3) throw TypeError("Unbalanced pattern at ".concat(c3));
                  if (!i2) throw TypeError("Missing pattern at ".concat(c3));
                  b3.push({ type: "PATTERN", index: c3, value: i2 }), c3 = f3;
                  continue;
                }
                b3.push({ type: "CHAR", index: c3, value: a4[c3++] });
              }
              return b3.push({ type: "END", index: c3, value: "" }), b3;
            }(a3), d2 = b2.prefixes, f2 = void 0 === d2 ? "./" : d2, g2 = b2.delimiter, h2 = void 0 === g2 ? "/#?" : g2, i = [], j = 0, k = 0, l = "", m = function(a4) {
              if (k < c2.length && c2[k].type === a4) return c2[k++].value;
            }, n = function(a4) {
              var b3 = m(a4);
              if (void 0 !== b3) return b3;
              var d3 = c2[k], e2 = d3.type, f3 = d3.index;
              throw TypeError("Unexpected ".concat(e2, " at ").concat(f3, ", expected ").concat(a4));
            }, o = function() {
              for (var a4, b3 = ""; a4 = m("CHAR") || m("ESCAPED_CHAR"); ) b3 += a4;
              return b3;
            }, p = function(a4) {
              for (var b3 = 0; b3 < h2.length; b3++) {
                var c3 = h2[b3];
                if (a4.indexOf(c3) > -1) return true;
              }
              return false;
            }, q = function(a4) {
              var b3 = i[i.length - 1], c3 = a4 || (b3 && "string" == typeof b3 ? b3 : "");
              if (b3 && !c3) throw TypeError('Must have text between two parameters, missing text after "'.concat(b3.name, '"'));
              return !c3 || p(c3) ? "[^".concat(e(h2), "]+?") : "(?:(?!".concat(e(c3), ")[^").concat(e(h2), "])+?");
            }; k < c2.length; ) {
              var r = m("CHAR"), s = m("NAME"), t = m("PATTERN");
              if (s || t) {
                var u = r || "";
                -1 === f2.indexOf(u) && (l += u, u = ""), l && (i.push(l), l = ""), i.push({ name: s || j++, prefix: u, suffix: "", pattern: t || q(u), modifier: m("MODIFIER") || "" });
                continue;
              }
              var v = r || m("ESCAPED_CHAR");
              if (v) {
                l += v;
                continue;
              }
              if (l && (i.push(l), l = ""), m("OPEN")) {
                var u = o(), w = m("NAME") || "", x = m("PATTERN") || "", y = o();
                n("CLOSE"), i.push({ name: w || (x ? j++ : ""), pattern: w && !x ? q(u) : x, prefix: u, suffix: y, modifier: m("MODIFIER") || "" });
                continue;
              }
              n("END");
            }
            return i;
          }
          function c(a3, b2) {
            void 0 === b2 && (b2 = {});
            var c2 = f(b2), d2 = b2.encode, e2 = void 0 === d2 ? function(a4) {
              return a4;
            } : d2, g2 = b2.validate, h2 = void 0 === g2 || g2, i = a3.map(function(a4) {
              if ("object" == typeof a4) return new RegExp("^(?:".concat(a4.pattern, ")$"), c2);
            });
            return function(b3) {
              for (var c3 = "", d3 = 0; d3 < a3.length; d3++) {
                var f2 = a3[d3];
                if ("string" == typeof f2) {
                  c3 += f2;
                  continue;
                }
                var g3 = b3 ? b3[f2.name] : void 0, j = "?" === f2.modifier || "*" === f2.modifier, k = "*" === f2.modifier || "+" === f2.modifier;
                if (Array.isArray(g3)) {
                  if (!k) throw TypeError('Expected "'.concat(f2.name, '" to not repeat, but got an array'));
                  if (0 === g3.length) {
                    if (j) continue;
                    throw TypeError('Expected "'.concat(f2.name, '" to not be empty'));
                  }
                  for (var l = 0; l < g3.length; l++) {
                    var m = e2(g3[l], f2);
                    if (h2 && !i[d3].test(m)) throw TypeError('Expected all "'.concat(f2.name, '" to match "').concat(f2.pattern, '", but got "').concat(m, '"'));
                    c3 += f2.prefix + m + f2.suffix;
                  }
                  continue;
                }
                if ("string" == typeof g3 || "number" == typeof g3) {
                  var m = e2(String(g3), f2);
                  if (h2 && !i[d3].test(m)) throw TypeError('Expected "'.concat(f2.name, '" to match "').concat(f2.pattern, '", but got "').concat(m, '"'));
                  c3 += f2.prefix + m + f2.suffix;
                  continue;
                }
                if (!j) {
                  var n = k ? "an array" : "a string";
                  throw TypeError('Expected "'.concat(f2.name, '" to be ').concat(n));
                }
              }
              return c3;
            };
          }
          function d(a3, b2, c2) {
            void 0 === c2 && (c2 = {});
            var d2 = c2.decode, e2 = void 0 === d2 ? function(a4) {
              return a4;
            } : d2;
            return function(c3) {
              var d3 = a3.exec(c3);
              if (!d3) return false;
              for (var f2 = d3[0], g2 = d3.index, h2 = /* @__PURE__ */ Object.create(null), i = 1; i < d3.length; i++) !function(a4) {
                if (void 0 !== d3[a4]) {
                  var c4 = b2[a4 - 1];
                  "*" === c4.modifier || "+" === c4.modifier ? h2[c4.name] = d3[a4].split(c4.prefix + c4.suffix).map(function(a5) {
                    return e2(a5, c4);
                  }) : h2[c4.name] = e2(d3[a4], c4);
                }
              }(i);
              return { path: f2, index: g2, params: h2 };
            };
          }
          function e(a3) {
            return a3.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
          }
          function f(a3) {
            return a3 && a3.sensitive ? "" : "i";
          }
          function g(a3, b2, c2) {
            void 0 === c2 && (c2 = {});
            for (var d2 = c2.strict, g2 = void 0 !== d2 && d2, h2 = c2.start, i = c2.end, j = c2.encode, k = void 0 === j ? function(a4) {
              return a4;
            } : j, l = c2.delimiter, m = c2.endsWith, n = "[".concat(e(void 0 === m ? "" : m), "]|$"), o = "[".concat(e(void 0 === l ? "/#?" : l), "]"), p = void 0 === h2 || h2 ? "^" : "", q = 0; q < a3.length; q++) {
              var r = a3[q];
              if ("string" == typeof r) p += e(k(r));
              else {
                var s = e(k(r.prefix)), t = e(k(r.suffix));
                if (r.pattern) if (b2 && b2.push(r), s || t) if ("+" === r.modifier || "*" === r.modifier) {
                  var u = "*" === r.modifier ? "?" : "";
                  p += "(?:".concat(s, "((?:").concat(r.pattern, ")(?:").concat(t).concat(s, "(?:").concat(r.pattern, "))*)").concat(t, ")").concat(u);
                } else p += "(?:".concat(s, "(").concat(r.pattern, ")").concat(t, ")").concat(r.modifier);
                else {
                  if ("+" === r.modifier || "*" === r.modifier) throw TypeError('Can not repeat "'.concat(r.name, '" without a prefix and suffix'));
                  p += "(".concat(r.pattern, ")").concat(r.modifier);
                }
                else p += "(?:".concat(s).concat(t, ")").concat(r.modifier);
              }
            }
            if (void 0 === i || i) g2 || (p += "".concat(o, "?")), p += c2.endsWith ? "(?=".concat(n, ")") : "$";
            else {
              var v = a3[a3.length - 1], w = "string" == typeof v ? o.indexOf(v[v.length - 1]) > -1 : void 0 === v;
              g2 || (p += "(?:".concat(o, "(?=").concat(n, "))?")), w || (p += "(?=".concat(o, "|").concat(n, ")"));
            }
            return new RegExp(p, f(c2));
          }
          function h(b2, c2, d2) {
            if (b2 instanceof RegExp) {
              var e2;
              if (!c2) return b2;
              for (var i = /\((?:\?<(.*?)>)?(?!\?)/g, j = 0, k = i.exec(b2.source); k; ) c2.push({ name: k[1] || j++, prefix: "", suffix: "", modifier: "", pattern: "" }), k = i.exec(b2.source);
              return b2;
            }
            return Array.isArray(b2) ? (e2 = b2.map(function(a3) {
              return h(a3, c2, d2).source;
            }), new RegExp("(?:".concat(e2.join("|"), ")"), f(d2))) : g(a2(b2, d2), c2, d2);
          }
          Object.defineProperty(b, "__esModule", { value: true }), b.pathToRegexp = b.tokensToRegexp = b.regexpToFunction = b.match = b.tokensToFunction = b.compile = b.parse = void 0, b.parse = a2, b.compile = function(b2, d2) {
            return c(a2(b2, d2), d2);
          }, b.tokensToFunction = c, b.match = function(a3, b2) {
            var c2 = [];
            return d(h(a3, c2, b2), c2, b2);
          }, b.regexpToFunction = d, b.tokensToRegexp = g, b.pathToRegexp = h;
        })(), a.exports = b;
      })();
    }, 621: (a) => {
      (() => {
        "use strict";
        "u" > typeof __nccwpck_require__ && (__nccwpck_require__.ab = "//");
        var b, c, d, e, f = {};
        f.parse = function(a2, c2) {
          if ("string" != typeof a2) throw TypeError("argument str must be a string");
          for (var e2 = {}, f2 = a2.split(d), g = (c2 || {}).decode || b, h = 0; h < f2.length; h++) {
            var i = f2[h], j = i.indexOf("=");
            if (!(j < 0)) {
              var k = i.substr(0, j).trim(), l = i.substr(++j, i.length).trim();
              '"' == l[0] && (l = l.slice(1, -1)), void 0 == e2[k] && (e2[k] = function(a3, b2) {
                try {
                  return b2(a3);
                } catch (b3) {
                  return a3;
                }
              }(l, g));
            }
          }
          return e2;
        }, f.serialize = function(a2, b2, d2) {
          var f2 = d2 || {}, g = f2.encode || c;
          if ("function" != typeof g) throw TypeError("option encode is invalid");
          if (!e.test(a2)) throw TypeError("argument name is invalid");
          var h = g(b2);
          if (h && !e.test(h)) throw TypeError("argument val is invalid");
          var i = a2 + "=" + h;
          if (null != f2.maxAge) {
            var j = f2.maxAge - 0;
            if (isNaN(j) || !isFinite(j)) throw TypeError("option maxAge is invalid");
            i += "; Max-Age=" + Math.floor(j);
          }
          if (f2.domain) {
            if (!e.test(f2.domain)) throw TypeError("option domain is invalid");
            i += "; Domain=" + f2.domain;
          }
          if (f2.path) {
            if (!e.test(f2.path)) throw TypeError("option path is invalid");
            i += "; Path=" + f2.path;
          }
          if (f2.expires) {
            if ("function" != typeof f2.expires.toUTCString) throw TypeError("option expires is invalid");
            i += "; Expires=" + f2.expires.toUTCString();
          }
          if (f2.httpOnly && (i += "; HttpOnly"), f2.secure && (i += "; Secure"), f2.sameSite) switch ("string" == typeof f2.sameSite ? f2.sameSite.toLowerCase() : f2.sameSite) {
            case true:
            case "strict":
              i += "; SameSite=Strict";
              break;
            case "lax":
              i += "; SameSite=Lax";
              break;
            case "none":
              i += "; SameSite=None";
              break;
            default:
              throw TypeError("option sameSite is invalid");
          }
          return i;
        }, b = decodeURIComponent, c = encodeURIComponent, d = /; */, e = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/, a.exports = f;
      })();
    }, 673: (a, b, c) => {
      "use strict";
      a.exports = c(289);
    }, 732: (a, b, c) => {
      "use strict";
      a.exports = c(514);
    }, 776: function(a, b, c) {
      var d;
      a.exports = d || function(a2, b2) {
        if ("u" > typeof window && window.crypto && (d2 = window.crypto), "u" > typeof self && self.crypto && (d2 = self.crypto), "u" > typeof globalThis && globalThis.crypto && (d2 = globalThis.crypto), !d2 && "u" > typeof window && window.msCrypto && (d2 = window.msCrypto), !d2 && void 0 !== c.g && c.g.crypto && (d2 = c.g.crypto), !d2) try {
          d2 = c(477);
        } catch (a3) {
        }
        var d2, e = function() {
          if (d2) {
            if ("function" == typeof d2.getRandomValues) try {
              return d2.getRandomValues(new Uint32Array(1))[0];
            } catch (a3) {
            }
            if ("function" == typeof d2.randomBytes) try {
              return d2.randomBytes(4).readInt32LE();
            } catch (a3) {
            }
          }
          throw Error("Native crypto module could not be used to get secure random number.");
        }, f = Object.create || /* @__PURE__ */ function() {
          function a3() {
          }
          return function(b3) {
            var c2;
            return a3.prototype = b3, c2 = new a3(), a3.prototype = null, c2;
          };
        }(), g = {}, h = g.lib = {}, i = h.Base = { extend: function(a3) {
          var b3 = f(this);
          return a3 && b3.mixIn(a3), b3.hasOwnProperty("init") && this.init !== b3.init || (b3.init = function() {
            b3.$super.init.apply(this, arguments);
          }), b3.init.prototype = b3, b3.$super = this, b3;
        }, create: function() {
          var a3 = this.extend();
          return a3.init.apply(a3, arguments), a3;
        }, init: function() {
        }, mixIn: function(a3) {
          for (var b3 in a3) a3.hasOwnProperty(b3) && (this[b3] = a3[b3]);
          a3.hasOwnProperty("toString") && (this.toString = a3.toString);
        }, clone: function() {
          return this.init.prototype.extend(this);
        } }, j = h.WordArray = i.extend({ init: function(a3, c2) {
          a3 = this.words = a3 || [], b2 != c2 ? this.sigBytes = c2 : this.sigBytes = 4 * a3.length;
        }, toString: function(a3) {
          return (a3 || l).stringify(this);
        }, concat: function(a3) {
          var b3 = this.words, c2 = a3.words, d3 = this.sigBytes, e2 = a3.sigBytes;
          if (this.clamp(), d3 % 4) for (var f2 = 0; f2 < e2; f2++) {
            var g2 = c2[f2 >>> 2] >>> 24 - f2 % 4 * 8 & 255;
            b3[d3 + f2 >>> 2] |= g2 << 24 - (d3 + f2) % 4 * 8;
          }
          else for (var h2 = 0; h2 < e2; h2 += 4) b3[d3 + h2 >>> 2] = c2[h2 >>> 2];
          return this.sigBytes += e2, this;
        }, clamp: function() {
          var b3 = this.words, c2 = this.sigBytes;
          b3[c2 >>> 2] &= 4294967295 << 32 - c2 % 4 * 8, b3.length = a2.ceil(c2 / 4);
        }, clone: function() {
          var a3 = i.clone.call(this);
          return a3.words = this.words.slice(0), a3;
        }, random: function(a3) {
          for (var b3 = [], c2 = 0; c2 < a3; c2 += 4) b3.push(e());
          return new j.init(b3, a3);
        } }), k = g.enc = {}, l = k.Hex = { stringify: function(a3) {
          for (var b3 = a3.words, c2 = a3.sigBytes, d3 = [], e2 = 0; e2 < c2; e2++) {
            var f2 = b3[e2 >>> 2] >>> 24 - e2 % 4 * 8 & 255;
            d3.push((f2 >>> 4).toString(16)), d3.push((15 & f2).toString(16));
          }
          return d3.join("");
        }, parse: function(a3) {
          for (var b3 = a3.length, c2 = [], d3 = 0; d3 < b3; d3 += 2) c2[d3 >>> 3] |= parseInt(a3.substr(d3, 2), 16) << 24 - d3 % 8 * 4;
          return new j.init(c2, b3 / 2);
        } }, m = k.Latin1 = { stringify: function(a3) {
          for (var b3 = a3.words, c2 = a3.sigBytes, d3 = [], e2 = 0; e2 < c2; e2++) {
            var f2 = b3[e2 >>> 2] >>> 24 - e2 % 4 * 8 & 255;
            d3.push(String.fromCharCode(f2));
          }
          return d3.join("");
        }, parse: function(a3) {
          for (var b3 = a3.length, c2 = [], d3 = 0; d3 < b3; d3++) c2[d3 >>> 2] |= (255 & a3.charCodeAt(d3)) << 24 - d3 % 4 * 8;
          return new j.init(c2, b3);
        } }, n = k.Utf8 = { stringify: function(a3) {
          try {
            return decodeURIComponent(escape(m.stringify(a3)));
          } catch (a4) {
            throw Error("Malformed UTF-8 data");
          }
        }, parse: function(a3) {
          return m.parse(unescape(encodeURIComponent(a3)));
        } }, o = h.BufferedBlockAlgorithm = i.extend({ reset: function() {
          this._data = new j.init(), this._nDataBytes = 0;
        }, _append: function(a3) {
          "string" == typeof a3 && (a3 = n.parse(a3)), this._data.concat(a3), this._nDataBytes += a3.sigBytes;
        }, _process: function(b3) {
          var c2, d3 = this._data, e2 = d3.words, f2 = d3.sigBytes, g2 = this.blockSize, h2 = f2 / (4 * g2), i2 = (h2 = b3 ? a2.ceil(h2) : a2.max((0 | h2) - this._minBufferSize, 0)) * g2, k2 = a2.min(4 * i2, f2);
          if (i2) {
            for (var l2 = 0; l2 < i2; l2 += g2) this._doProcessBlock(e2, l2);
            c2 = e2.splice(0, i2), d3.sigBytes -= k2;
          }
          return new j.init(c2, k2);
        }, clone: function() {
          var a3 = i.clone.call(this);
          return a3._data = this._data.clone(), a3;
        }, _minBufferSize: 0 });
        h.Hasher = o.extend({ cfg: i.extend(), init: function(a3) {
          this.cfg = this.cfg.extend(a3), this.reset();
        }, reset: function() {
          o.reset.call(this), this._doReset();
        }, update: function(a3) {
          return this._append(a3), this._process(), this;
        }, finalize: function(a3) {
          return a3 && this._append(a3), this._doFinalize();
        }, blockSize: 16, _createHelper: function(a3) {
          return function(b3, c2) {
            return new a3.init(c2).finalize(b3);
          };
        }, _createHmacHelper: function(a3) {
          return function(b3, c2) {
            return new p.HMAC.init(a3, c2).finalize(b3);
          };
        } });
        var p = g.algo = {};
        return g;
      }(Math);
    }, 778: (a, b, c) => {
      "use strict";
      var d, e, f, g, h, i, j, k, l, m, n, o;
      c.r(b), c.d(b, { DiagConsoleLogger: () => L, DiagLogLevel: () => d, INVALID_SPANID: () => aj, INVALID_SPAN_CONTEXT: () => al, INVALID_TRACEID: () => ak, ProxyTracer: () => aD, ProxyTracerProvider: () => aG, ROOT_CONTEXT: () => I, SamplingDecision: () => g, SpanKind: () => h, SpanStatusCode: () => i, TraceFlags: () => f, ValueType: () => e, baggageEntryMetadataFromString: () => F, context: () => aP, createContextKey: () => G, createNoopMeter: () => ac, createTraceState: () => aO, default: () => a7, defaultTextMapGetter: () => ad, defaultTextMapSetter: () => ae, diag: () => aQ, isSpanContextValid: () => ay, isValidSpanId: () => ax, isValidTraceId: () => aw, metrics: () => aV, propagation: () => a3, trace: () => a6 });
      let p = "1.9.1", q = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/, r = function(a8) {
        let b2 = /* @__PURE__ */ new Set([a8]), c2 = /* @__PURE__ */ new Set(), d2 = a8.match(q);
        if (!d2) return () => false;
        let e2 = { major: +d2[1], minor: +d2[2], patch: +d2[3], prerelease: d2[4] };
        if (null != e2.prerelease) return function(b3) {
          return b3 === a8;
        };
        function f2(a9) {
          return c2.add(a9), false;
        }
        return function(a9) {
          if (b2.has(a9)) return true;
          if (c2.has(a9)) return false;
          let d3 = a9.match(q);
          if (!d3) return f2(a9);
          let g2 = { major: +d3[1], minor: +d3[2], patch: +d3[3], prerelease: d3[4] };
          if (null != g2.prerelease || e2.major !== g2.major) return f2(a9);
          if (0 === e2.major) return e2.minor === g2.minor && e2.patch <= g2.patch ? (b2.add(a9), true) : f2(a9);
          return e2.minor <= g2.minor ? (b2.add(a9), true) : f2(a9);
        };
      }(p), s = p.split(".")[0], t = Symbol.for(`opentelemetry.js.api.${s}`), u = "object" == typeof globalThis ? globalThis : "object" == typeof self ? self : "object" == typeof window ? window : "object" == typeof c.g ? c.g : {};
      function v(a8, b2, c2, d2 = false) {
        var e2;
        let f2 = u[t] = null != (e2 = u[t]) ? e2 : { version: p };
        if (!d2 && f2[a8]) {
          let b3 = Error(`@opentelemetry/api: Attempted duplicate registration of API: ${a8}`);
          return c2.error(b3.stack || b3.message), false;
        }
        if (f2.version !== p) {
          let b3 = Error(`@opentelemetry/api: Registration of version v${f2.version} for ${a8} does not match previously registered API v${p}`);
          return c2.error(b3.stack || b3.message), false;
        }
        return f2[a8] = b2, c2.debug(`@opentelemetry/api: Registered a global for ${a8} v${p}.`), true;
      }
      function w(a8) {
        var b2, c2;
        let d2 = null == (b2 = u[t]) ? void 0 : b2.version;
        if (d2 && r(d2)) return null == (c2 = u[t]) ? void 0 : c2[a8];
      }
      function x(a8, b2) {
        b2.debug(`@opentelemetry/api: Unregistering a global for ${a8} v${p}.`);
        let c2 = u[t];
        c2 && delete c2[a8];
      }
      class y {
        constructor(a8) {
          this._namespace = a8.namespace || "DiagComponentLogger";
        }
        debug(...a8) {
          return z("debug", this._namespace, a8);
        }
        error(...a8) {
          return z("error", this._namespace, a8);
        }
        info(...a8) {
          return z("info", this._namespace, a8);
        }
        warn(...a8) {
          return z("warn", this._namespace, a8);
        }
        verbose(...a8) {
          return z("verbose", this._namespace, a8);
        }
      }
      function z(a8, b2, c2) {
        let d2 = w("diag");
        if (d2) return d2[a8](b2, ...c2);
      }
      (j = d || (d = {}))[j.NONE = 0] = "NONE", j[j.ERROR = 30] = "ERROR", j[j.WARN = 50] = "WARN", j[j.INFO = 60] = "INFO", j[j.DEBUG = 70] = "DEBUG", j[j.VERBOSE = 80] = "VERBOSE", j[j.ALL = 9999] = "ALL";
      class A {
        static instance() {
          return this._instance || (this._instance = new A()), this._instance;
        }
        constructor() {
          function a8(a9) {
            return function(...b3) {
              let c3 = w("diag");
              if (c3) return c3[a9](...b3);
            };
          }
          const b2 = this, c2 = (a9, c3 = { logLevel: d.INFO }) => {
            var e2, f2, g2;
            if (a9 === b2) {
              let a10 = Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
              return b2.error(null != (e2 = a10.stack) ? e2 : a10.message), false;
            }
            "number" == typeof c3 && (c3 = { logLevel: c3 });
            let h2 = w("diag"), i2 = function(a10, b3) {
              function c4(c5, d2) {
                let e3 = b3[c5];
                return "function" == typeof e3 && a10 >= d2 ? e3.bind(b3) : function() {
                };
              }
              return a10 < d.NONE ? a10 = d.NONE : a10 > d.ALL && (a10 = d.ALL), b3 = b3 || {}, { error: c4("error", d.ERROR), warn: c4("warn", d.WARN), info: c4("info", d.INFO), debug: c4("debug", d.DEBUG), verbose: c4("verbose", d.VERBOSE) };
            }(null != (f2 = c3.logLevel) ? f2 : d.INFO, a9);
            if (h2 && !c3.suppressOverrideMessage) {
              let a10 = null != (g2 = Error().stack) ? g2 : "<failed to generate stacktrace>";
              h2.warn(`Current logger will be overwritten from ${a10}`), i2.warn(`Current logger will overwrite one already registered from ${a10}`);
            }
            return v("diag", i2, b2, true);
          };
          b2.setLogger = c2, b2.disable = () => {
            x("diag", b2);
          }, b2.createComponentLogger = (a9) => new y(a9), b2.verbose = a8("verbose"), b2.debug = a8("debug"), b2.info = a8("info"), b2.warn = a8("warn"), b2.error = a8("error");
        }
      }
      class B {
        constructor(a8) {
          this._entries = a8 ? new Map(a8) : /* @__PURE__ */ new Map();
        }
        getEntry(a8) {
          let b2 = this._entries.get(a8);
          if (b2) return Object.assign({}, b2);
        }
        getAllEntries() {
          return Array.from(this._entries.entries());
        }
        setEntry(a8, b2) {
          let c2 = new B(this._entries);
          return c2._entries.set(a8, b2), c2;
        }
        removeEntry(a8) {
          let b2 = new B(this._entries);
          return b2._entries.delete(a8), b2;
        }
        removeEntries(...a8) {
          let b2 = new B(this._entries);
          for (let c2 of a8) b2._entries.delete(c2);
          return b2;
        }
        clear() {
          return new B();
        }
      }
      let C = Symbol("BaggageEntryMetadata"), D = A.instance();
      function E(a8 = {}) {
        return new B(new Map(Object.entries(a8)));
      }
      function F(a8) {
        return "string" != typeof a8 && (D.error(`Cannot create baggage metadata from unknown type: ${typeof a8}`), a8 = ""), { __TYPE__: C, toString: () => a8 };
      }
      function G(a8) {
        return Symbol.for(a8);
      }
      class H {
        constructor(a8) {
          const b2 = this;
          b2._currentContext = a8 ? new Map(a8) : /* @__PURE__ */ new Map(), b2.getValue = (a9) => b2._currentContext.get(a9), b2.setValue = (a9, c2) => {
            let d2 = new H(b2._currentContext);
            return d2._currentContext.set(a9, c2), d2;
          }, b2.deleteValue = (a9) => {
            let c2 = new H(b2._currentContext);
            return c2._currentContext.delete(a9), c2;
          };
        }
      }
      let I = new H(), J = [{ n: "error", c: "error" }, { n: "warn", c: "warn" }, { n: "info", c: "info" }, { n: "debug", c: "debug" }, { n: "verbose", c: "trace" }], K = {};
      if ("u" > typeof console) for (let a8 of ["error", "warn", "info", "debug", "trace", "log"]) "function" == typeof console[a8] && (K[a8] = console[a8]);
      class L {
        constructor() {
          for (let a8 = 0; a8 < J.length; a8++) this[J[a8].n] = /* @__PURE__ */ function(a9) {
            return function(...b2) {
              let c2 = K[a9];
              if ("function" != typeof c2 && (c2 = K.log), "function" != typeof c2 && console && "function" != typeof (c2 = console[a9]) && (c2 = console.log), "function" == typeof c2) return c2.apply(console, b2);
            };
          }(J[a8].c);
        }
      }
      class M {
        createGauge(a8, b2) {
          return Y;
        }
        createHistogram(a8, b2) {
          return Z;
        }
        createCounter(a8, b2) {
          return X;
        }
        createUpDownCounter(a8, b2) {
          return $;
        }
        createObservableGauge(a8, b2) {
          return aa;
        }
        createObservableCounter(a8, b2) {
          return _;
        }
        createObservableUpDownCounter(a8, b2) {
          return ab;
        }
        addBatchObservableCallback(a8, b2) {
        }
        removeBatchObservableCallback(a8) {
        }
      }
      class N {
      }
      class O extends N {
        add(a8, b2) {
        }
      }
      class P extends N {
        add(a8, b2) {
        }
      }
      class Q extends N {
        record(a8, b2) {
        }
      }
      class R extends N {
        record(a8, b2) {
        }
      }
      class S {
        addCallback(a8) {
        }
        removeCallback(a8) {
        }
      }
      class T extends S {
      }
      class U extends S {
      }
      class V extends S {
      }
      let W = new M(), X = new O(), Y = new Q(), Z = new R(), $ = new P(), _ = new T(), aa = new U(), ab = new V();
      function ac() {
        return W;
      }
      (k = e || (e = {}))[k.INT = 0] = "INT", k[k.DOUBLE = 1] = "DOUBLE";
      let ad = { get(a8, b2) {
        if (null != a8) return a8[b2];
      }, keys: (a8) => null == a8 ? [] : Object.keys(a8) }, ae = { set(a8, b2, c2) {
        null != a8 && (a8[b2] = c2);
      } };
      class af {
        active() {
          return I;
        }
        with(a8, b2, c2, ...d2) {
          return b2.call(c2, ...d2);
        }
        bind(a8, b2) {
          return b2;
        }
        enable() {
          return this;
        }
        disable() {
          return this;
        }
      }
      let ag = "context", ah = new af();
      class ai {
        static getInstance() {
          return this._instance || (this._instance = new ai()), this._instance;
        }
        setGlobalContextManager(a8) {
          return v(ag, a8, A.instance());
        }
        active() {
          return this._getContextManager().active();
        }
        with(a8, b2, c2, ...d2) {
          return this._getContextManager().with(a8, b2, c2, ...d2);
        }
        bind(a8, b2) {
          return this._getContextManager().bind(a8, b2);
        }
        _getContextManager() {
          return w(ag) || ah;
        }
        disable() {
          this._getContextManager().disable(), x(ag, A.instance());
        }
      }
      (l = f || (f = {}))[l.NONE = 0] = "NONE", l[l.SAMPLED = 1] = "SAMPLED";
      let aj = "0000000000000000", ak = "00000000000000000000000000000000", al = { traceId: ak, spanId: aj, traceFlags: f.NONE };
      class am {
        constructor(a8 = al) {
          this._spanContext = a8;
        }
        spanContext() {
          return this._spanContext;
        }
        setAttribute(a8, b2) {
          return this;
        }
        setAttributes(a8) {
          return this;
        }
        addEvent(a8, b2) {
          return this;
        }
        addLink(a8) {
          return this;
        }
        addLinks(a8) {
          return this;
        }
        setStatus(a8) {
          return this;
        }
        updateName(a8) {
          return this;
        }
        end(a8) {
        }
        isRecording() {
          return false;
        }
        recordException(a8, b2) {
        }
      }
      let an = G("OpenTelemetry Context Key SPAN");
      function ao(a8) {
        return a8.getValue(an) || void 0;
      }
      function ap() {
        return ao(ai.getInstance().active());
      }
      function aq(a8, b2) {
        return a8.setValue(an, b2);
      }
      function ar(a8) {
        return a8.deleteValue(an);
      }
      function as(a8, b2) {
        return aq(a8, new am(b2));
      }
      function at(a8) {
        var b2;
        return null == (b2 = ao(a8)) ? void 0 : b2.spanContext();
      }
      let au = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]);
      function av(a8, b2) {
        if ("string" != typeof a8 || a8.length !== b2) return false;
        let c2 = 0;
        for (let b3 = 0; b3 < a8.length; b3 += 4) c2 += (0 | au[a8.charCodeAt(b3)]) + (0 | au[a8.charCodeAt(b3 + 1)]) + (0 | au[a8.charCodeAt(b3 + 2)]) + (0 | au[a8.charCodeAt(b3 + 3)]);
        return c2 === b2;
      }
      function aw(a8) {
        return av(a8, 32) && a8 !== ak;
      }
      function ax(a8) {
        return av(a8, 16) && a8 !== aj;
      }
      function ay(a8) {
        return aw(a8.traceId) && ax(a8.spanId);
      }
      function az(a8) {
        return new am(a8);
      }
      let aA = ai.getInstance();
      class aB {
        startSpan(a8, b2, c2 = aA.active()) {
          var d2;
          if (null == b2 ? void 0 : b2.root) return new am();
          let e2 = c2 && at(c2);
          return null !== (d2 = e2) && "object" == typeof d2 && "spanId" in d2 && "string" == typeof d2.spanId && "traceId" in d2 && "string" == typeof d2.traceId && "traceFlags" in d2 && "number" == typeof d2.traceFlags && ay(e2) ? new am(e2) : new am();
        }
        startActiveSpan(a8, b2, c2, d2) {
          let e2, f2, g2;
          if (arguments.length < 2) return;
          2 == arguments.length ? g2 = b2 : 3 == arguments.length ? (e2 = b2, g2 = c2) : (e2 = b2, f2 = c2, g2 = d2);
          let h2 = null != f2 ? f2 : aA.active(), i2 = this.startSpan(a8, e2, h2), j2 = aq(h2, i2);
          return aA.with(j2, g2, void 0, i2);
        }
      }
      let aC = new aB();
      class aD {
        constructor(a8, b2, c2, d2) {
          this._provider = a8, this.name = b2, this.version = c2, this.options = d2;
        }
        startSpan(a8, b2, c2) {
          return this._getTracer().startSpan(a8, b2, c2);
        }
        startActiveSpan(a8, b2, c2, d2) {
          let e2 = this._getTracer();
          return Reflect.apply(e2.startActiveSpan, e2, arguments);
        }
        _getTracer() {
          if (this._delegate) return this._delegate;
          let a8 = this._provider.getDelegateTracer(this.name, this.version, this.options);
          return a8 ? (this._delegate = a8, this._delegate) : aC;
        }
      }
      class aE {
        getTracer(a8, b2, c2) {
          return new aB();
        }
      }
      let aF = new aE();
      class aG {
        getTracer(a8, b2, c2) {
          var d2;
          return null != (d2 = this.getDelegateTracer(a8, b2, c2)) ? d2 : new aD(this, a8, b2, c2);
        }
        getDelegate() {
          var a8;
          return null != (a8 = this._delegate) ? a8 : aF;
        }
        setDelegate(a8) {
          this._delegate = a8;
        }
        getDelegateTracer(a8, b2, c2) {
          var d2;
          return null == (d2 = this._delegate) ? void 0 : d2.getTracer(a8, b2, c2);
        }
      }
      (m = g || (g = {}))[m.NOT_RECORD = 0] = "NOT_RECORD", m[m.RECORD = 1] = "RECORD", m[m.RECORD_AND_SAMPLED = 2] = "RECORD_AND_SAMPLED", (n = h || (h = {}))[n.INTERNAL = 0] = "INTERNAL", n[n.SERVER = 1] = "SERVER", n[n.CLIENT = 2] = "CLIENT", n[n.PRODUCER = 3] = "PRODUCER", n[n.CONSUMER = 4] = "CONSUMER", (o = i || (i = {}))[o.UNSET = 0] = "UNSET", o[o.OK = 1] = "OK", o[o.ERROR = 2] = "ERROR";
      let aH = "[_0-9a-z-*/]", aI = `[a-z]${aH}{0,255}`, aJ = `[a-z0-9]${aH}{0,240}@[a-z]${aH}{0,13}`, aK = RegExp(`^(?:${aI}|${aJ})$`), aL = /^[ -~]{0,255}[!-~]$/, aM = /,|=/;
      class aN {
        constructor(a8) {
          this._internalState = /* @__PURE__ */ new Map(), a8 && this._parse(a8);
        }
        set(a8, b2) {
          let c2 = this._clone();
          return c2._internalState.has(a8) && c2._internalState.delete(a8), c2._internalState.set(a8, b2), c2;
        }
        unset(a8) {
          let b2 = this._clone();
          return b2._internalState.delete(a8), b2;
        }
        get(a8) {
          return this._internalState.get(a8);
        }
        serialize() {
          return Array.from(this._internalState.keys()).reduceRight((a8, b2) => (a8.push(b2 + "=" + this.get(b2)), a8), []).join(",");
        }
        _parse(a8) {
          !(a8.length > 512) && (this._internalState = a8.split(",").reduceRight((a9, b2) => {
            let c2 = b2.trim(), d2 = c2.indexOf("=");
            if (-1 !== d2) {
              let e2 = c2.slice(0, d2), f2 = c2.slice(d2 + 1, b2.length);
              aK.test(e2) && aL.test(f2) && !aM.test(f2) && a9.set(e2, f2);
            }
            return a9;
          }, /* @__PURE__ */ new Map()), this._internalState.size > 32 && (this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, 32))));
        }
        _keys() {
          return Array.from(this._internalState.keys()).reverse();
        }
        _clone() {
          let a8 = new aN();
          return a8._internalState = new Map(this._internalState), a8;
        }
      }
      function aO(a8) {
        return new aN(a8);
      }
      let aP = ai.getInstance(), aQ = A.instance();
      class aR {
        getMeter(a8, b2, c2) {
          return W;
        }
      }
      let aS = new aR(), aT = "metrics";
      class aU {
        static getInstance() {
          return this._instance || (this._instance = new aU()), this._instance;
        }
        setGlobalMeterProvider(a8) {
          return v(aT, a8, A.instance());
        }
        getMeterProvider() {
          return w(aT) || aS;
        }
        getMeter(a8, b2, c2) {
          return this.getMeterProvider().getMeter(a8, b2, c2);
        }
        disable() {
          x(aT, A.instance());
        }
      }
      let aV = aU.getInstance();
      class aW {
        inject(a8, b2) {
        }
        extract(a8, b2) {
          return a8;
        }
        fields() {
          return [];
        }
      }
      let aX = G("OpenTelemetry Baggage Key");
      function aY(a8) {
        return a8.getValue(aX) || void 0;
      }
      function aZ() {
        return aY(ai.getInstance().active());
      }
      function a$(a8, b2) {
        return a8.setValue(aX, b2);
      }
      function a_(a8) {
        return a8.deleteValue(aX);
      }
      let a0 = "propagation", a1 = new aW();
      class a2 {
        constructor() {
          this.createBaggage = E, this.getBaggage = aY, this.getActiveBaggage = aZ, this.setBaggage = a$, this.deleteBaggage = a_;
        }
        static getInstance() {
          return this._instance || (this._instance = new a2()), this._instance;
        }
        setGlobalPropagator(a8) {
          return v(a0, a8, A.instance());
        }
        inject(a8, b2, c2 = ae) {
          return this._getGlobalPropagator().inject(a8, b2, c2);
        }
        extract(a8, b2, c2 = ad) {
          return this._getGlobalPropagator().extract(a8, b2, c2);
        }
        fields() {
          return this._getGlobalPropagator().fields();
        }
        disable() {
          x(a0, A.instance());
        }
        _getGlobalPropagator() {
          return w(a0) || a1;
        }
      }
      let a3 = a2.getInstance(), a4 = "trace";
      class a5 {
        constructor() {
          this._proxyTracerProvider = new aG(), this.wrapSpanContext = az, this.isSpanContextValid = ay, this.deleteSpan = ar, this.getSpan = ao, this.getActiveSpan = ap, this.getSpanContext = at, this.setSpan = aq, this.setSpanContext = as;
        }
        static getInstance() {
          return this._instance || (this._instance = new a5()), this._instance;
        }
        setGlobalTracerProvider(a8) {
          let b2 = v(a4, this._proxyTracerProvider, A.instance());
          return b2 && this._proxyTracerProvider.setDelegate(a8), b2;
        }
        getTracerProvider() {
          return w(a4) || this._proxyTracerProvider;
        }
        getTracer(a8, b2) {
          return this.getTracerProvider().getTracer(a8, b2);
        }
        disable() {
          x(a4, A.instance()), this._proxyTracerProvider = new aG();
        }
      }
      let a6 = a5.getInstance(), a7 = { context: aP, diag: aQ, metrics: aV, propagation: a3, trace: a6 };
    }, 821: (a, b) => {
      "use strict";
      let c;
      b.qg = function(a2, b2) {
        let c2 = new i(), d2 = a2.length;
        if (d2 < 2) return c2;
        let e2 = b2?.decode || l, f2 = 0;
        do {
          let b3 = function(a3, b4, c3) {
            let d3 = a3.indexOf("=", b4);
            return d3 < c3 ? d3 : -1;
          }(a2, f2, d2);
          if (-1 === b3) break;
          let g2 = function(a3, b4, c3) {
            let d3 = a3.indexOf(";", b4);
            return -1 === d3 ? c3 : d3;
          }(a2, f2, d2);
          if (b3 > g2) {
            f2 = a2.lastIndexOf(";", b3 - 1) + 1;
            continue;
          }
          let h2 = k(a2, f2, b3);
          void 0 === c2[h2] && (c2[h2] = e2(k(a2, b3 + 1, g2))), f2 = g2 + 1;
        } while (f2 < d2);
        return c2;
      }, b.lK = j, b.lK = j;
      let d = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/, e = /^[\u0021-\u003A\u003C-\u007E]*$/, f = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, g = /^[\u0020-\u003A\u003D-\u007E]*$/, h = Object.prototype.toString, i = ((c = function() {
      }).prototype = /* @__PURE__ */ Object.create(null), c);
      function j(a2, b2, c2) {
        let i2 = "object" == typeof a2 ? a2 : { ...c2, name: a2, value: String(b2) }, j2 = ("object" == typeof b2 ? b2 : c2)?.encode || encodeURIComponent;
        if (!d.test(i2.name)) throw TypeError(`argument name is invalid: ${i2.name}`);
        let k2 = i2.value ? j2(i2.value) : "";
        if (!e.test(k2)) throw TypeError(`argument val is invalid: ${i2.value}`);
        let l2 = i2.name + "=" + k2;
        if (void 0 !== i2.maxAge) {
          if (!Number.isInteger(i2.maxAge)) throw TypeError(`option maxAge is invalid: ${i2.maxAge}`);
          l2 += "; Max-Age=" + i2.maxAge;
        }
        if (i2.domain) {
          if (!f.test(i2.domain)) throw TypeError(`option domain is invalid: ${i2.domain}`);
          l2 += "; Domain=" + i2.domain;
        }
        if (i2.path) {
          if (!g.test(i2.path)) throw TypeError(`option path is invalid: ${i2.path}`);
          l2 += "; Path=" + i2.path;
        }
        if (i2.expires) {
          var m;
          if (m = i2.expires, "[object Date]" !== h.call(m) || !Number.isFinite(i2.expires.valueOf())) throw TypeError(`option expires is invalid: ${i2.expires}`);
          l2 += "; Expires=" + i2.expires.toUTCString();
        }
        if (i2.httpOnly && (l2 += "; HttpOnly"), i2.secure && (l2 += "; Secure"), i2.partitioned && (l2 += "; Partitioned"), i2.priority) switch ("string" == typeof i2.priority ? i2.priority.toLowerCase() : void 0) {
          case "low":
            l2 += "; Priority=Low";
            break;
          case "medium":
            l2 += "; Priority=Medium";
            break;
          case "high":
            l2 += "; Priority=High";
            break;
          default:
            throw TypeError(`option priority is invalid: ${i2.priority}`);
        }
        if (i2.sameSite) switch ("string" == typeof i2.sameSite ? i2.sameSite.toLowerCase() : i2.sameSite) {
          case true:
          case "strict":
            l2 += "; SameSite=Strict";
            break;
          case "lax":
            l2 += "; SameSite=Lax";
            break;
          case "none":
            l2 += "; SameSite=None";
            break;
          default:
            throw TypeError(`option sameSite is invalid: ${i2.sameSite}`);
        }
        return l2;
      }
      function k(a2, b2, c2) {
        let d2 = b2, e2 = c2;
        do {
          let b3 = a2.charCodeAt(d2);
          if (32 !== b3 && 9 !== b3) break;
        } while (++d2 < e2);
        for (; e2 > d2; ) {
          let b3 = a2.charCodeAt(e2 - 1);
          if (32 !== b3 && 9 !== b3) break;
          e2--;
        }
        return a2.slice(d2, e2);
      }
      function l(a2) {
        if (-1 === a2.indexOf("%")) return a2;
        try {
          return decodeURIComponent(a2);
        } catch (b2) {
          return a2;
        }
      }
    }, 846: function(a, b, c) {
      var d, e, f, g, h, i, j;
      f = (e = (d = c(776)).lib).WordArray, g = e.Hasher, h = d.algo, i = [], j = h.SHA1 = g.extend({ _doReset: function() {
        this._hash = new f.init([1732584193, 4023233417, 2562383102, 271733878, 3285377520]);
      }, _doProcessBlock: function(a2, b2) {
        for (var c2 = this._hash.words, d2 = c2[0], e2 = c2[1], f2 = c2[2], g2 = c2[3], h2 = c2[4], j2 = 0; j2 < 80; j2++) {
          if (j2 < 16) i[j2] = 0 | a2[b2 + j2];
          else {
            var k = i[j2 - 3] ^ i[j2 - 8] ^ i[j2 - 14] ^ i[j2 - 16];
            i[j2] = k << 1 | k >>> 31;
          }
          var l = (d2 << 5 | d2 >>> 27) + h2 + i[j2];
          j2 < 20 ? l += (e2 & f2 | ~e2 & g2) + 1518500249 : j2 < 40 ? l += (e2 ^ f2 ^ g2) + 1859775393 : j2 < 60 ? l += (e2 & f2 | e2 & g2 | f2 & g2) - 1894007588 : l += (e2 ^ f2 ^ g2) - 899497514, h2 = g2, g2 = f2, f2 = e2 << 30 | e2 >>> 2, e2 = d2, d2 = l;
        }
        c2[0] = c2[0] + d2 | 0, c2[1] = c2[1] + e2 | 0, c2[2] = c2[2] + f2 | 0, c2[3] = c2[3] + g2 | 0, c2[4] = c2[4] + h2 | 0;
      }, _doFinalize: function() {
        var a2 = this._data, b2 = a2.words, c2 = 8 * this._nDataBytes, d2 = 8 * a2.sigBytes;
        return b2[d2 >>> 5] |= 128 << 24 - d2 % 32, b2[(d2 + 64 >>> 9 << 4) + 14] = Math.floor(c2 / 4294967296), b2[(d2 + 64 >>> 9 << 4) + 15] = c2, a2.sigBytes = 4 * b2.length, this._process(), this._hash;
      }, clone: function() {
        var a2 = g.clone.call(this);
        return a2._hash = this._hash.clone(), a2;
      } }), d.SHA1 = g._createHelper(j), d.HmacSHA1 = g._createHmacHelper(j), a.exports = d.SHA1;
    }, 891: (a, b, c) => {
      var d, e = { 226: function(e2, f2) {
        !function(g2) {
          "use strict";
          var h = "function", i = "undefined", j = "object", k = "string", l = "major", m = "model", n = "name", o = "type", p = "vendor", q = "version", r = "architecture", s = "console", t = "mobile", u = "tablet", v = "smarttv", w = "wearable", x = "embedded", y = "Amazon", z = "Apple", A = "ASUS", B = "BlackBerry", C = "Browser", D = "Chrome", E = "Firefox", F = "Google", G = "Huawei", H = "Microsoft", I = "Motorola", J = "Opera", K = "Samsung", L = "Sharp", M = "Sony", N = "Xiaomi", O = "Zebra", P = "Facebook", Q = "Chromium OS", R = "Mac OS", S = function(a2, b2) {
            var c2 = {};
            for (var d2 in a2) b2[d2] && b2[d2].length % 2 == 0 ? c2[d2] = b2[d2].concat(a2[d2]) : c2[d2] = a2[d2];
            return c2;
          }, T = function(a2) {
            for (var b2 = {}, c2 = 0; c2 < a2.length; c2++) b2[a2[c2].toUpperCase()] = a2[c2];
            return b2;
          }, U = function(a2, b2) {
            return typeof a2 === k && -1 !== V(b2).indexOf(V(a2));
          }, V = function(a2) {
            return a2.toLowerCase();
          }, W = function(a2, b2) {
            if (typeof a2 === k) return a2 = a2.replace(/^\s\s*/, ""), typeof b2 === i ? a2 : a2.substring(0, 350);
          }, X = function(a2, b2) {
            for (var c2, d2, e3, f3, g3, i2, k2 = 0; k2 < b2.length && !g3; ) {
              var l2 = b2[k2], m2 = b2[k2 + 1];
              for (c2 = d2 = 0; c2 < l2.length && !g3 && l2[c2]; ) if (g3 = l2[c2++].exec(a2)) for (e3 = 0; e3 < m2.length; e3++) i2 = g3[++d2], typeof (f3 = m2[e3]) === j && f3.length > 0 ? 2 === f3.length ? typeof f3[1] == h ? this[f3[0]] = f3[1].call(this, i2) : this[f3[0]] = f3[1] : 3 === f3.length ? typeof f3[1] !== h || f3[1].exec && f3[1].test ? this[f3[0]] = i2 ? i2.replace(f3[1], f3[2]) : void 0 : this[f3[0]] = i2 ? f3[1].call(this, i2, f3[2]) : void 0 : 4 === f3.length && (this[f3[0]] = i2 ? f3[3].call(this, i2.replace(f3[1], f3[2])) : void 0) : this[f3] = i2 || void 0;
              k2 += 2;
            }
          }, Y = function(a2, b2) {
            for (var c2 in b2) if (typeof b2[c2] === j && b2[c2].length > 0) {
              for (var d2 = 0; d2 < b2[c2].length; d2++) if (U(b2[c2][d2], a2)) return "?" === c2 ? void 0 : c2;
            } else if (U(b2[c2], a2)) return "?" === c2 ? void 0 : c2;
            return a2;
          }, Z = { ME: "4.90", "NT 3.11": "NT3.51", "NT 4.0": "NT4.0", 2e3: "NT 5.0", XP: ["NT 5.1", "NT 5.2"], Vista: "NT 6.0", 7: "NT 6.1", 8: "NT 6.2", 8.1: "NT 6.3", 10: ["NT 6.4", "NT 10.0"], RT: "ARM" }, $ = { browser: [[/\b(?:crmo|crios)\/([\w\.]+)/i], [q, [n, "Chrome"]], [/edg(?:e|ios|a)?\/([\w\.]+)/i], [q, [n, "Edge"]], [/(opera mini)\/([-\w\.]+)/i, /(opera [mobiletab]{3,6})\b.+version\/([-\w\.]+)/i, /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i], [n, q], [/opios[\/ ]+([\w\.]+)/i], [q, [n, J + " Mini"]], [/\bopr\/([\w\.]+)/i], [q, [n, J]], [/(kindle)\/([\w\.]+)/i, /(lunascape|maxthon|netfront|jasmine|blazer)[\/ ]?([\w\.]*)/i, /(avant |iemobile|slim)(?:browser)?[\/ ]?([\w\.]*)/i, /(ba?idubrowser)[\/ ]?([\w\.]+)/i, /(?:ms|\()(ie) ([\w\.]+)/i, /(flock|rockmelt|midori|epiphany|silk|skyfire|bolt|iron|vivaldi|iridium|phantomjs|bowser|quark|qupzilla|falkon|rekonq|puffin|brave|whale(?!.+naver)|qqbrowserlite|qq|duckduckgo)\/([-\w\.]+)/i, /(heytap|ovi)browser\/([\d\.]+)/i, /(weibo)__([\d\.]+)/i], [n, q], [/(?:\buc? ?browser|(?:juc.+)ucweb)[\/ ]?([\w\.]+)/i], [q, [n, "UC" + C]], [/microm.+\bqbcore\/([\w\.]+)/i, /\bqbcore\/([\w\.]+).+microm/i], [q, [n, "WeChat(Win) Desktop"]], [/micromessenger\/([\w\.]+)/i], [q, [n, "WeChat"]], [/konqueror\/([\w\.]+)/i], [q, [n, "Konqueror"]], [/trident.+rv[: ]([\w\.]{1,9})\b.+like gecko/i], [q, [n, "IE"]], [/ya(?:search)?browser\/([\w\.]+)/i], [q, [n, "Yandex"]], [/(avast|avg)\/([\w\.]+)/i], [[n, /(.+)/, "$1 Secure " + C], q], [/\bfocus\/([\w\.]+)/i], [q, [n, E + " Focus"]], [/\bopt\/([\w\.]+)/i], [q, [n, J + " Touch"]], [/coc_coc\w+\/([\w\.]+)/i], [q, [n, "Coc Coc"]], [/dolfin\/([\w\.]+)/i], [q, [n, "Dolphin"]], [/coast\/([\w\.]+)/i], [q, [n, J + " Coast"]], [/miuibrowser\/([\w\.]+)/i], [q, [n, "MIUI " + C]], [/fxios\/([-\w\.]+)/i], [q, [n, E]], [/\bqihu|(qi?ho?o?|360)browser/i], [[n, "360 " + C]], [/(oculus|samsung|sailfish|huawei)browser\/([\w\.]+)/i], [[n, /(.+)/, "$1 " + C], q], [/(comodo_dragon)\/([\w\.]+)/i], [[n, /_/g, " "], q], [/(electron)\/([\w\.]+) safari/i, /(tesla)(?: qtcarbrowser|\/(20\d\d\.[-\w\.]+))/i, /m?(qqbrowser|baiduboxapp|2345Explorer)[\/ ]?([\w\.]+)/i], [n, q], [/(metasr)[\/ ]?([\w\.]+)/i, /(lbbrowser)/i, /\[(linkedin)app\]/i], [n], [/((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i], [[n, P], q], [/(kakao(?:talk|story))[\/ ]([\w\.]+)/i, /(naver)\(.*?(\d+\.[\w\.]+).*\)/i, /safari (line)\/([\w\.]+)/i, /\b(line)\/([\w\.]+)\/iab/i, /(chromium|instagram)[\/ ]([-\w\.]+)/i], [n, q], [/\bgsa\/([\w\.]+) .*safari\//i], [q, [n, "GSA"]], [/musical_ly(?:.+app_?version\/|_)([\w\.]+)/i], [q, [n, "TikTok"]], [/headlesschrome(?:\/([\w\.]+)| )/i], [q, [n, D + " Headless"]], [/ wv\).+(chrome)\/([\w\.]+)/i], [[n, D + " WebView"], q], [/droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i], [q, [n, "Android " + C]], [/(chrome|omniweb|arora|[tizenoka]{5} ?browser)\/v?([\w\.]+)/i], [n, q], [/version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i], [q, [n, "Mobile Safari"]], [/version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i], [q, n], [/webkit.+?(mobile ?safari|safari)(\/[\w\.]+)/i], [n, [q, Y, { "1.0": "/8", 1.2: "/1", 1.3: "/3", "2.0": "/412", "2.0.2": "/416", "2.0.3": "/417", "2.0.4": "/419", "?": "/" }]], [/(webkit|khtml)\/([\w\.]+)/i], [n, q], [/(navigator|netscape\d?)\/([-\w\.]+)/i], [[n, "Netscape"], q], [/mobile vr; rv:([\w\.]+)\).+firefox/i], [q, [n, E + " Reality"]], [/ekiohf.+(flow)\/([\w\.]+)/i, /(swiftfox)/i, /(icedragon|iceweasel|camino|chimera|fennec|maemo browser|minimo|conkeror|klar)[\/ ]?([\w\.\+]+)/i, /(seamonkey|k-meleon|icecat|iceape|firebird|phoenix|palemoon|basilisk|waterfox)\/([-\w\.]+)$/i, /(firefox)\/([\w\.]+)/i, /(mozilla)\/([\w\.]+) .+rv\:.+gecko\/\d+/i, /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir|obigo|mosaic|(?:go|ice|up)[\. ]?browser)[-\/ ]?v?([\w\.]+)/i, /(links) \(([\w\.]+)/i, /panasonic;(viera)/i], [n, q], [/(cobalt)\/([\w\.]+)/i], [n, [q, /master.|lts./, ""]]], cpu: [[/(?:(amd|x(?:(?:86|64)[-_])?|wow|win)64)[;\)]/i], [[r, "amd64"]], [/(ia32(?=;))/i], [[r, V]], [/((?:i[346]|x)86)[;\)]/i], [[r, "ia32"]], [/\b(aarch64|arm(v?8e?l?|_?64))\b/i], [[r, "arm64"]], [/\b(arm(?:v[67])?ht?n?[fl]p?)\b/i], [[r, "armhf"]], [/windows (ce|mobile); ppc;/i], [[r, "arm"]], [/((?:ppc|powerpc)(?:64)?)(?: mac|;|\))/i], [[r, /ower/, "", V]], [/(sun4\w)[;\)]/i], [[r, "sparc"]], [/((?:avr32|ia64(?=;))|68k(?=\))|\barm(?=v(?:[1-7]|[5-7]1)l?|;|eabi)|(?=atmel )avr|(?:irix|mips|sparc)(?:64)?\b|pa-risc)/i], [[r, V]]], device: [[/\b(sch-i[89]0\d|shw-m380s|sm-[ptx]\w{2,4}|gt-[pn]\d{2,4}|sgh-t8[56]9|nexus 10)/i], [m, [p, K], [o, u]], [/\b((?:s[cgp]h|gt|sm)-\w+|sc[g-]?[\d]+a?|galaxy nexus)/i, /samsung[- ]([-\w]+)/i, /sec-(sgh\w+)/i], [m, [p, K], [o, t]], [/(?:\/|\()(ip(?:hone|od)[\w, ]*)(?:\/|;)/i], [m, [p, z], [o, t]], [/\((ipad);[-\w\),; ]+apple/i, /applecoremedia\/[\w\.]+ \((ipad)/i, /\b(ipad)\d\d?,\d\d?[;\]].+ios/i], [m, [p, z], [o, u]], [/(macintosh);/i], [m, [p, z]], [/\b(sh-?[altvz]?\d\d[a-ekm]?)/i], [m, [p, L], [o, t]], [/\b((?:ag[rs][23]?|bah2?|sht?|btv)-a?[lw]\d{2})\b(?!.+d\/s)/i], [m, [p, G], [o, u]], [/(?:huawei|honor)([-\w ]+)[;\)]/i, /\b(nexus 6p|\w{2,4}e?-[atu]?[ln][\dx][012359c][adn]?)\b(?!.+d\/s)/i], [m, [p, G], [o, t]], [/\b(poco[\w ]+)(?: bui|\))/i, /\b; (\w+) build\/hm\1/i, /\b(hm[-_ ]?note?[_ ]?(?:\d\w)?) bui/i, /\b(redmi[\-_ ]?(?:note|k)?[\w_ ]+)(?: bui|\))/i, /\b(mi[-_ ]?(?:a\d|one|one[_ ]plus|note lte|max|cc)?[_ ]?(?:\d?\w?)[_ ]?(?:plus|se|lite)?)(?: bui|\))/i], [[m, /_/g, " "], [p, N], [o, t]], [/\b(mi[-_ ]?(?:pad)(?:[\w_ ]+))(?: bui|\))/i], [[m, /_/g, " "], [p, N], [o, u]], [/; (\w+) bui.+ oppo/i, /\b(cph[12]\d{3}|p(?:af|c[al]|d\w|e[ar])[mt]\d0|x9007|a101op)\b/i], [m, [p, "OPPO"], [o, t]], [/vivo (\w+)(?: bui|\))/i, /\b(v[12]\d{3}\w?[at])(?: bui|;)/i], [m, [p, "Vivo"], [o, t]], [/\b(rmx[12]\d{3})(?: bui|;|\))/i], [m, [p, "Realme"], [o, t]], [/\b(milestone|droid(?:[2-4x]| (?:bionic|x2|pro|razr))?:?( 4g)?)\b[\w ]+build\//i, /\bmot(?:orola)?[- ](\w*)/i, /((?:moto[\w\(\) ]+|xt\d{3,4}|nexus 6)(?= bui|\)))/i], [m, [p, I], [o, t]], [/\b(mz60\d|xoom[2 ]{0,2}) build\//i], [m, [p, I], [o, u]], [/((?=lg)?[vl]k\-?\d{3}) bui| 3\.[-\w; ]{10}lg?-([06cv9]{3,4})/i], [m, [p, "LG"], [o, u]], [/(lm(?:-?f100[nv]?|-[\w\.]+)(?= bui|\))|nexus [45])/i, /\blg[-e;\/ ]+((?!browser|netcast|android tv)\w+)/i, /\blg-?([\d\w]+) bui/i], [m, [p, "LG"], [o, t]], [/(ideatab[-\w ]+)/i, /lenovo ?(s[56]000[-\w]+|tab(?:[\w ]+)|yt[-\d\w]{6}|tb[-\d\w]{6})/i], [m, [p, "Lenovo"], [o, u]], [/(?:maemo|nokia).*(n900|lumia \d+)/i, /nokia[-_ ]?([-\w\.]*)/i], [[m, /_/g, " "], [p, "Nokia"], [o, t]], [/(pixel c)\b/i], [m, [p, F], [o, u]], [/droid.+; (pixel[\daxl ]{0,6})(?: bui|\))/i], [m, [p, F], [o, t]], [/droid.+ (a?\d[0-2]{2}so|[c-g]\d{4}|so[-gl]\w+|xq-a\w[4-7][12])(?= bui|\).+chrome\/(?![1-6]{0,1}\d\.))/i], [m, [p, M], [o, t]], [/sony tablet [ps]/i, /\b(?:sony)?sgp\w+(?: bui|\))/i], [[m, "Xperia Tablet"], [p, M], [o, u]], [/ (kb2005|in20[12]5|be20[12][59])\b/i, /(?:one)?(?:plus)? (a\d0\d\d)(?: b|\))/i], [m, [p, "OnePlus"], [o, t]], [/(alexa)webm/i, /(kf[a-z]{2}wi|aeo[c-r]{2})( bui|\))/i, /(kf[a-z]+)( bui|\)).+silk\//i], [m, [p, y], [o, u]], [/((?:sd|kf)[0349hijorstuw]+)( bui|\)).+silk\//i], [[m, /(.+)/g, "Fire Phone $1"], [p, y], [o, t]], [/(playbook);[-\w\),; ]+(rim)/i], [m, p, [o, u]], [/\b((?:bb[a-f]|st[hv])100-\d)/i, /\(bb10; (\w+)/i], [m, [p, B], [o, t]], [/(?:\b|asus_)(transfo[prime ]{4,10} \w+|eeepc|slider \w+|nexus 7|padfone|p00[cj])/i], [m, [p, A], [o, u]], [/ (z[bes]6[027][012][km][ls]|zenfone \d\w?)\b/i], [m, [p, A], [o, t]], [/(nexus 9)/i], [m, [p, "HTC"], [o, u]], [/(htc)[-;_ ]{1,2}([\w ]+(?=\)| bui)|\w+)/i, /(zte)[- ]([\w ]+?)(?: bui|\/|\))/i, /(alcatel|geeksphone|nexian|panasonic(?!(?:;|\.))|sony(?!-bra))[-_ ]?([-\w]*)/i], [p, [m, /_/g, " "], [o, t]], [/droid.+; ([ab][1-7]-?[0178a]\d\d?)/i], [m, [p, "Acer"], [o, u]], [/droid.+; (m[1-5] note) bui/i, /\bmz-([-\w]{2,})/i], [m, [p, "Meizu"], [o, t]], [/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[-_ ]?([-\w]*)/i, /(hp) ([\w ]+\w)/i, /(asus)-?(\w+)/i, /(microsoft); (lumia[\w ]+)/i, /(lenovo)[-_ ]?([-\w]+)/i, /(jolla)/i, /(oppo) ?([\w ]+) bui/i], [p, m, [o, t]], [/(kobo)\s(ereader|touch)/i, /(archos) (gamepad2?)/i, /(hp).+(touchpad(?!.+tablet)|tablet)/i, /(kindle)\/([\w\.]+)/i, /(nook)[\w ]+build\/(\w+)/i, /(dell) (strea[kpr\d ]*[\dko])/i, /(le[- ]+pan)[- ]+(\w{1,9}) bui/i, /(trinity)[- ]*(t\d{3}) bui/i, /(gigaset)[- ]+(q\w{1,9}) bui/i, /(vodafone) ([\w ]+)(?:\)| bui)/i], [p, m, [o, u]], [/(surface duo)/i], [m, [p, H], [o, u]], [/droid [\d\.]+; (fp\du?)(?: b|\))/i], [m, [p, "Fairphone"], [o, t]], [/(u304aa)/i], [m, [p, "AT&T"], [o, t]], [/\bsie-(\w*)/i], [m, [p, "Siemens"], [o, t]], [/\b(rct\w+) b/i], [m, [p, "RCA"], [o, u]], [/\b(venue[\d ]{2,7}) b/i], [m, [p, "Dell"], [o, u]], [/\b(q(?:mv|ta)\w+) b/i], [m, [p, "Verizon"], [o, u]], [/\b(?:barnes[& ]+noble |bn[rt])([\w\+ ]*) b/i], [m, [p, "Barnes & Noble"], [o, u]], [/\b(tm\d{3}\w+) b/i], [m, [p, "NuVision"], [o, u]], [/\b(k88) b/i], [m, [p, "ZTE"], [o, u]], [/\b(nx\d{3}j) b/i], [m, [p, "ZTE"], [o, t]], [/\b(gen\d{3}) b.+49h/i], [m, [p, "Swiss"], [o, t]], [/\b(zur\d{3}) b/i], [m, [p, "Swiss"], [o, u]], [/\b((zeki)?tb.*\b) b/i], [m, [p, "Zeki"], [o, u]], [/\b([yr]\d{2}) b/i, /\b(dragon[- ]+touch |dt)(\w{5}) b/i], [[p, "Dragon Touch"], m, [o, u]], [/\b(ns-?\w{0,9}) b/i], [m, [p, "Insignia"], [o, u]], [/\b((nxa|next)-?\w{0,9}) b/i], [m, [p, "NextBook"], [o, u]], [/\b(xtreme\_)?(v(1[045]|2[015]|[3469]0|7[05])) b/i], [[p, "Voice"], m, [o, t]], [/\b(lvtel\-)?(v1[12]) b/i], [[p, "LvTel"], m, [o, t]], [/\b(ph-1) /i], [m, [p, "Essential"], [o, t]], [/\b(v(100md|700na|7011|917g).*\b) b/i], [m, [p, "Envizen"], [o, u]], [/\b(trio[-\w\. ]+) b/i], [m, [p, "MachSpeed"], [o, u]], [/\btu_(1491) b/i], [m, [p, "Rotor"], [o, u]], [/(shield[\w ]+) b/i], [m, [p, "Nvidia"], [o, u]], [/(sprint) (\w+)/i], [p, m, [o, t]], [/(kin\.[onetw]{3})/i], [[m, /\./g, " "], [p, H], [o, t]], [/droid.+; (cc6666?|et5[16]|mc[239][23]x?|vc8[03]x?)\)/i], [m, [p, O], [o, u]], [/droid.+; (ec30|ps20|tc[2-8]\d[kx])\)/i], [m, [p, O], [o, t]], [/smart-tv.+(samsung)/i], [p, [o, v]], [/hbbtv.+maple;(\d+)/i], [[m, /^/, "SmartTV"], [p, K], [o, v]], [/(nux; netcast.+smarttv|lg (netcast\.tv-201\d|android tv))/i], [[p, "LG"], [o, v]], [/(apple) ?tv/i], [p, [m, z + " TV"], [o, v]], [/crkey/i], [[m, D + "cast"], [p, F], [o, v]], [/droid.+aft(\w)( bui|\))/i], [m, [p, y], [o, v]], [/\(dtv[\);].+(aquos)/i, /(aquos-tv[\w ]+)\)/i], [m, [p, L], [o, v]], [/(bravia[\w ]+)( bui|\))/i], [m, [p, M], [o, v]], [/(mitv-\w{5}) bui/i], [m, [p, N], [o, v]], [/Hbbtv.*(technisat) (.*);/i], [p, m, [o, v]], [/\b(roku)[\dx]*[\)\/]((?:dvp-)?[\d\.]*)/i, /hbbtv\/\d+\.\d+\.\d+ +\([\w\+ ]*; *([\w\d][^;]*);([^;]*)/i], [[p, W], [m, W], [o, v]], [/\b(android tv|smart[- ]?tv|opera tv|tv; rv:)\b/i], [[o, v]], [/(ouya)/i, /(nintendo) ([wids3utch]+)/i], [p, m, [o, s]], [/droid.+; (shield) bui/i], [m, [p, "Nvidia"], [o, s]], [/(playstation [345portablevi]+)/i], [m, [p, M], [o, s]], [/\b(xbox(?: one)?(?!; xbox))[\); ]/i], [m, [p, H], [o, s]], [/((pebble))app/i], [p, m, [o, w]], [/(watch)(?: ?os[,\/]|\d,\d\/)[\d\.]+/i], [m, [p, z], [o, w]], [/droid.+; (glass) \d/i], [m, [p, F], [o, w]], [/droid.+; (wt63?0{2,3})\)/i], [m, [p, O], [o, w]], [/(quest( 2| pro)?)/i], [m, [p, P], [o, w]], [/(tesla)(?: qtcarbrowser|\/[-\w\.]+)/i], [p, [o, x]], [/(aeobc)\b/i], [m, [p, y], [o, x]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+? mobile safari/i], [m, [o, t]], [/droid .+?; ([^;]+?)(?: bui|\) applew).+?(?! mobile) safari/i], [m, [o, u]], [/\b((tablet|tab)[;\/]|focus\/\d(?!.+mobile))/i], [[o, u]], [/(phone|mobile(?:[;\/]| [ \w\/\.]*safari)|pda(?=.+windows ce))/i], [[o, t]], [/(android[-\w\. ]{0,9});.+buil/i], [m, [p, "Generic"]]], engine: [[/windows.+ edge\/([\w\.]+)/i], [q, [n, "EdgeHTML"]], [/webkit\/537\.36.+chrome\/(?!27)([\w\.]+)/i], [q, [n, "Blink"]], [/(presto)\/([\w\.]+)/i, /(webkit|trident|netfront|netsurf|amaya|lynx|w3m|goanna)\/([\w\.]+)/i, /ekioh(flow)\/([\w\.]+)/i, /(khtml|tasman|links)[\/ ]\(?([\w\.]+)/i, /(icab)[\/ ]([23]\.[\d\.]+)/i, /\b(libweb)/i], [n, q], [/rv\:([\w\.]{1,9})\b.+(gecko)/i], [q, n]], os: [[/microsoft (windows) (vista|xp)/i], [n, q], [/(windows) nt 6\.2; (arm)/i, /(windows (?:phone(?: os)?|mobile))[\/ ]?([\d\.\w ]*)/i, /(windows)[\/ ]?([ntce\d\. ]+\w)(?!.+xbox)/i], [n, [q, Y, Z]], [/(win(?=3|9|n)|win 9x )([nt\d\.]+)/i], [[n, "Windows"], [q, Y, Z]], [/ip[honead]{2,4}\b(?:.*os ([\w]+) like mac|; opera)/i, /ios;fbsv\/([\d\.]+)/i, /cfnetwork\/.+darwin/i], [[q, /_/g, "."], [n, "iOS"]], [/(mac os x) ?([\w\. ]*)/i, /(macintosh|mac_powerpc\b)(?!.+haiku)/i], [[n, R], [q, /_/g, "."]], [/droid ([\w\.]+)\b.+(android[- ]x86|harmonyos)/i], [q, n], [/(android|webos|qnx|bada|rim tablet os|maemo|meego|sailfish)[-\/ ]?([\w\.]*)/i, /(blackberry)\w*\/([\w\.]*)/i, /(tizen|kaios)[\/ ]([\w\.]+)/i, /\((series40);/i], [n, q], [/\(bb(10);/i], [q, [n, B]], [/(?:symbian ?os|symbos|s60(?=;)|series60)[-\/ ]?([\w\.]*)/i], [q, [n, "Symbian"]], [/mozilla\/[\d\.]+ \((?:mobile|tablet|tv|mobile; [\w ]+); rv:.+ gecko\/([\w\.]+)/i], [q, [n, E + " OS"]], [/web0s;.+rt(tv)/i, /\b(?:hp)?wos(?:browser)?\/([\w\.]+)/i], [q, [n, "webOS"]], [/watch(?: ?os[,\/]|\d,\d\/)([\d\.]+)/i], [q, [n, "watchOS"]], [/crkey\/([\d\.]+)/i], [q, [n, D + "cast"]], [/(cros) [\w]+(?:\)| ([\w\.]+)\b)/i], [[n, Q], q], [/panasonic;(viera)/i, /(netrange)mmh/i, /(nettv)\/(\d+\.[\w\.]+)/i, /(nintendo|playstation) ([wids345portablevuch]+)/i, /(xbox); +xbox ([^\);]+)/i, /\b(joli|palm)\b ?(?:os)?\/?([\w\.]*)/i, /(mint)[\/\(\) ]?(\w*)/i, /(mageia|vectorlinux)[; ]/i, /([kxln]?ubuntu|debian|suse|opensuse|gentoo|arch(?= linux)|slackware|fedora|mandriva|centos|pclinuxos|red ?hat|zenwalk|linpus|raspbian|plan 9|minix|risc os|contiki|deepin|manjaro|elementary os|sabayon|linspire)(?: gnu\/linux)?(?: enterprise)?(?:[- ]linux)?(?:-gnu)?[-\/ ]?(?!chrom|package)([-\w\.]*)/i, /(hurd|linux) ?([\w\.]*)/i, /(gnu) ?([\w\.]*)/i, /\b([-frentopcghs]{0,5}bsd|dragonfly)[\/ ]?(?!amd|[ix346]{1,2}86)([\w\.]*)/i, /(haiku) (\w+)/i], [n, q], [/(sunos) ?([\w\.\d]*)/i], [[n, "Solaris"], q], [/((?:open)?solaris)[-\/ ]?([\w\.]*)/i, /(aix) ((\d)(?=\.|\)| )[\w\.])*/i, /\b(beos|os\/2|amigaos|morphos|openvms|fuchsia|hp-ux|serenityos)/i, /(unix) ?([\w\.]*)/i], [n, q]] }, _ = function(a2, b2) {
            if (typeof a2 === j && (b2 = a2, a2 = void 0), !(this instanceof _)) return new _(a2, b2).getResult();
            var c2 = typeof g2 !== i && g2.navigator ? g2.navigator : void 0, d2 = a2 || (c2 && c2.userAgent ? c2.userAgent : ""), e3 = c2 && c2.userAgentData ? c2.userAgentData : void 0, f3 = b2 ? S($, b2) : $, s2 = c2 && c2.userAgent == d2;
            return this.getBrowser = function() {
              var a3, b3 = {};
              return b3[n] = void 0, b3[q] = void 0, X.call(b3, d2, f3.browser), b3[l] = typeof (a3 = b3[q]) === k ? a3.replace(/[^\d\.]/g, "").split(".")[0] : void 0, s2 && c2 && c2.brave && typeof c2.brave.isBrave == h && (b3[n] = "Brave"), b3;
            }, this.getCPU = function() {
              var a3 = {};
              return a3[r] = void 0, X.call(a3, d2, f3.cpu), a3;
            }, this.getDevice = function() {
              var a3 = {};
              return a3[p] = void 0, a3[m] = void 0, a3[o] = void 0, X.call(a3, d2, f3.device), s2 && !a3[o] && e3 && e3.mobile && (a3[o] = t), s2 && "Macintosh" == a3[m] && c2 && typeof c2.standalone !== i && c2.maxTouchPoints && c2.maxTouchPoints > 2 && (a3[m] = "iPad", a3[o] = u), a3;
            }, this.getEngine = function() {
              var a3 = {};
              return a3[n] = void 0, a3[q] = void 0, X.call(a3, d2, f3.engine), a3;
            }, this.getOS = function() {
              var a3 = {};
              return a3[n] = void 0, a3[q] = void 0, X.call(a3, d2, f3.os), s2 && !a3[n] && e3 && "Unknown" != e3.platform && (a3[n] = e3.platform.replace(/chrome os/i, Q).replace(/macos/i, R)), a3;
            }, this.getResult = function() {
              return { ua: this.getUA(), browser: this.getBrowser(), engine: this.getEngine(), os: this.getOS(), device: this.getDevice(), cpu: this.getCPU() };
            }, this.getUA = function() {
              return d2;
            }, this.setUA = function(a3) {
              return d2 = typeof a3 === k && a3.length > 350 ? W(a3, 350) : a3, this;
            }, this.setUA(d2), this;
          };
          _.VERSION = "1.0.35", _.BROWSER = T([n, q, l]), _.CPU = T([r]), _.DEVICE = T([m, p, o, s, t, v, u, w, x]), _.ENGINE = _.OS = T([n, q]), typeof f2 !== i ? (e2.exports && (f2 = e2.exports = _), f2.UAParser = _) : c.amdO ? void 0 === (d = function() {
            return _;
          }.call(b, c, b, a)) || (a.exports = d) : typeof g2 !== i && (g2.UAParser = _);
          var aa = typeof g2 !== i && (g2.jQuery || g2.Zepto);
          if (aa && !aa.ua) {
            var ab = new _();
            aa.ua = ab.getResult(), aa.ua.get = function() {
              return ab.getUA();
            }, aa.ua.set = function(a2) {
              ab.setUA(a2);
              var b2 = ab.getResult();
              for (var c2 in b2) aa.ua[c2] = b2[c2];
            };
          }
        }("object" == typeof window ? window : this);
      } }, f = {};
      function g(a2) {
        var b2 = f[a2];
        if (void 0 !== b2) return b2.exports;
        var c2 = f[a2] = { exports: {} }, d2 = true;
        try {
          e[a2].call(c2.exports, c2, c2.exports, g), d2 = false;
        } finally {
          d2 && delete f[a2];
        }
        return c2.exports;
      }
      g.ab = "//", a.exports = g(226);
    }, 897: function(a, b, c) {
      a.exports = c(776).enc.Hex;
    }, 898: (a, b, c) => {
      "use strict";
      let d, e, f, g, h, i, j, k;
      c.r(b), c.d(b, { default: () => kO, handler: () => kN });
      var l, m, n, o, p, q, r, s, t, u, v, w, x, y, z, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O = {};
      async function P() {
        return "_ENTRIES" in globalThis && _ENTRIES.middleware_instrumentation && await _ENTRIES.middleware_instrumentation;
      }
      c.r(O), c.d(O, { config: () => kE, default: () => kH, middleware: () => kG, runtime: () => kC });
      let Q = null;
      async function R() {
        if ("phase-production-build" === process.env.NEXT_PHASE) return;
        Q || (Q = P());
        let a10 = await Q;
        if (null == a10 ? void 0 : a10.register) try {
          await a10.register();
        } catch (a11) {
          throw a11.message = `An error occurred while loading instrumentation hook: ${a11.message}`, a11;
        }
      }
      async function S(...a10) {
        let b10 = await P();
        try {
          var c10;
          await (null == b10 || null == (c10 = b10.onRequestError) ? void 0 : c10.call(b10, ...a10));
        } catch (a11) {
          console.error("Error in instrumentation.onRequestError:", a11);
        }
      }
      let T = null;
      function U() {
        return T || (T = R()), T;
      }
      function V(a10) {
        return `The edge runtime does not support Node.js '${a10}' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime`;
      }
      process !== c.g.process && (process.env = c.g.process.env, c.g.process = process);
      try {
        Object.defineProperty(globalThis, "__import_unsupported", { value: function(a10) {
          let b10 = new Proxy(function() {
          }, { get(b11, c10) {
            if ("then" === c10) return {};
            throw Object.defineProperty(Error(V(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, construct() {
            throw Object.defineProperty(Error(V(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          }, apply(c10, d10, e10) {
            if ("function" == typeof e10[0]) return e10[0](b10);
            throw Object.defineProperty(Error(V(a10)), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
          } });
          return new Proxy({}, { get: () => b10 });
        }, enumerable: false, configurable: false });
      } catch {
      }
      U();
      class W extends Error {
        constructor({ page: a10 }) {
          super(`The middleware "${a10}" accepts an async API directly with the form:
  
  export function middleware(request, event) {
    return NextResponse.redirect('/new-location')
  }
  
  Read more: https://nextjs.org/docs/messages/middleware-new-signature
  `);
        }
      }
      class X extends Error {
        constructor() {
          super("The request.page has been deprecated in favour of `URLPattern`.\n  Read more: https://nextjs.org/docs/messages/middleware-request-page\n  ");
        }
      }
      class Y extends Error {
        constructor() {
          super("The request.ua has been removed in favour of `userAgent` function.\n  Read more: https://nextjs.org/docs/messages/middleware-parse-user-agent\n  ");
        }
      }
      let Z = "x-prerender-revalidate", $ = ".meta", _ = "x-next-cache-tags", aa = "x-next-revalidated-tags", ab = "_N_T_", ac = { shared: "shared", reactServerComponents: "rsc", serverSideRendering: "ssr", actionBrowser: "action-browser", apiNode: "api-node", apiEdge: "api-edge", middleware: "middleware", instrument: "instrument", edgeAsset: "edge-asset", appPagesBrowser: "app-pages-browser", pagesDirBrowser: "pages-dir-browser", pagesDirEdge: "pages-dir-edge", pagesDirNode: "pages-dir-node" };
      function ad(a10) {
        var b10, c10, d10, e10, f10, g10 = [], h10 = 0;
        function i10() {
          for (; h10 < a10.length && /\s/.test(a10.charAt(h10)); ) h10 += 1;
          return h10 < a10.length;
        }
        for (; h10 < a10.length; ) {
          for (b10 = h10, f10 = false; i10(); ) if ("," === (c10 = a10.charAt(h10))) {
            for (d10 = h10, h10 += 1, i10(), e10 = h10; h10 < a10.length && "=" !== (c10 = a10.charAt(h10)) && ";" !== c10 && "," !== c10; ) h10 += 1;
            h10 < a10.length && "=" === a10.charAt(h10) ? (f10 = true, h10 = e10, g10.push(a10.substring(b10, d10)), b10 = h10) : h10 = d10 + 1;
          } else h10 += 1;
          (!f10 || h10 >= a10.length) && g10.push(a10.substring(b10, a10.length));
        }
        return g10;
      }
      function ae(a10) {
        let b10 = {}, c10 = [];
        if (a10) for (let [d10, e10] of a10.entries()) "set-cookie" === d10.toLowerCase() ? (c10.push(...ad(e10)), b10[d10] = 1 === c10.length ? c10[0] : c10) : b10[d10] = e10;
        return b10;
      }
      function af(a10) {
        try {
          return String(new URL(String(a10)));
        } catch (b10) {
          throw Object.defineProperty(Error(`URL is malformed "${String(a10)}". Please use only absolute URLs - https://nextjs.org/docs/messages/middleware-relative-urls`, { cause: b10 }), "__NEXT_ERROR_CODE", { value: "E61", enumerable: false, configurable: true });
        }
      }
      ({ ...ac, GROUP: { builtinReact: [ac.reactServerComponents, ac.actionBrowser], serverOnly: [ac.reactServerComponents, ac.actionBrowser, ac.instrument, ac.middleware], neutralTarget: [ac.apiNode, ac.apiEdge], clientOnly: [ac.serverSideRendering, ac.appPagesBrowser], bundled: [ac.reactServerComponents, ac.actionBrowser, ac.serverSideRendering, ac.appPagesBrowser, ac.shared, ac.instrument, ac.middleware], appPages: [ac.reactServerComponents, ac.serverSideRendering, ac.appPagesBrowser, ac.actionBrowser] } });
      let ag = Symbol("response"), ah = Symbol("passThrough"), ai = Symbol("waitUntil");
      class aj {
        constructor(a10, b10) {
          this[ah] = false, this[ai] = b10 ? { kind: "external", function: b10 } : { kind: "internal", promises: [] };
        }
        respondWith(a10) {
          this[ag] || (this[ag] = Promise.resolve(a10));
        }
        passThroughOnException() {
          this[ah] = true;
        }
        waitUntil(a10) {
          if ("external" === this[ai].kind) return (0, this[ai].function)(a10);
          this[ai].promises.push(a10);
        }
      }
      class ak extends aj {
        constructor(a10) {
          var b10;
          super(a10.request, null == (b10 = a10.context) ? void 0 : b10.waitUntil), this.sourcePage = a10.page;
        }
        get request() {
          throw Object.defineProperty(new W({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new W({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      function al(a10) {
        return a10.replace(/\/$/, "") || "/";
      }
      function am(a10) {
        let b10 = a10.indexOf("#"), c10 = a10.indexOf("?"), d10 = c10 > -1 && (b10 < 0 || c10 < b10);
        return d10 || b10 > -1 ? { pathname: a10.substring(0, d10 ? c10 : b10), query: d10 ? a10.substring(c10, b10 > -1 ? b10 : void 0) : "", hash: b10 > -1 ? a10.slice(b10) : "" } : { pathname: a10, query: "", hash: "" };
      }
      function an(a10, b10) {
        if (!a10.startsWith("/") || !b10) return a10;
        let { pathname: c10, query: d10, hash: e10 } = am(a10);
        return `${b10}${c10}${d10}${e10}`;
      }
      function ao(a10, b10) {
        if (!a10.startsWith("/") || !b10) return a10;
        let { pathname: c10, query: d10, hash: e10 } = am(a10);
        return `${c10}${b10}${d10}${e10}`;
      }
      function ap(a10, b10) {
        if ("string" != typeof a10) return false;
        let { pathname: c10 } = am(a10);
        return c10 === b10 || c10.startsWith(b10 + "/");
      }
      let aq = /* @__PURE__ */ new WeakMap();
      function ar(a10, b10) {
        let c10;
        if (!b10) return { pathname: a10 };
        let d10 = aq.get(b10);
        d10 || (d10 = b10.map((a11) => a11.toLowerCase()), aq.set(b10, d10));
        let e10 = a10.split("/", 2);
        if (!e10[1]) return { pathname: a10 };
        let f10 = e10[1].toLowerCase(), g10 = d10.indexOf(f10);
        return g10 < 0 ? { pathname: a10 } : (c10 = b10[g10], { pathname: a10 = a10.slice(c10.length + 1) || "/", detectedLocale: c10 });
      }
      let as = /^(?:127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\]|localhost)$/;
      function at(a10, b10) {
        let c10 = new URL(String(a10), b10 && String(b10));
        return as.test(c10.hostname) && (c10.hostname = "localhost"), c10;
      }
      let au = Symbol("NextURLInternal");
      class av {
        constructor(a10, b10, c10) {
          let d10, e10;
          "object" == typeof b10 && "pathname" in b10 || "string" == typeof b10 ? (d10 = b10, e10 = c10 || {}) : e10 = c10 || b10 || {}, this[au] = { url: at(a10, d10 ?? e10.base), options: e10, basePath: "" }, this.analyze();
        }
        analyze() {
          var a10, b10, c10, d10, e10;
          let f10 = function(a11, b11) {
            let { basePath: c11, i18n: d11, trailingSlash: e11 } = b11.nextConfig ?? {}, f11 = { pathname: a11, trailingSlash: "/" !== a11 ? a11.endsWith("/") : e11 };
            c11 && ap(f11.pathname, c11) && (f11.pathname = function(a12, b12) {
              if (!ap(a12, b12)) return a12;
              let c12 = a12.slice(b12.length);
              return c12.startsWith("/") ? c12 : `/${c12}`;
            }(f11.pathname, c11), f11.basePath = c11);
            let g11 = f11.pathname;
            if (f11.pathname.startsWith("/_next/data/") && f11.pathname.endsWith(".json")) {
              let a12 = f11.pathname.replace(/^\/_next\/data\//, "").replace(/\.json$/, "").split("/");
              f11.buildId = a12[0], g11 = "index" !== a12[1] ? `/${a12.slice(1).join("/")}` : "/", true === b11.parseData && (f11.pathname = g11);
            }
            if (d11) {
              let a12 = b11.i18nProvider ? b11.i18nProvider.analyze(f11.pathname) : ar(f11.pathname, d11.locales);
              f11.locale = a12.detectedLocale, f11.pathname = a12.pathname ?? f11.pathname, !a12.detectedLocale && f11.buildId && (a12 = b11.i18nProvider ? b11.i18nProvider.analyze(g11) : ar(g11, d11.locales)).detectedLocale && (f11.locale = a12.detectedLocale);
            }
            return f11;
          }(this[au].url.pathname, { nextConfig: this[au].options.nextConfig, parseData: true, i18nProvider: this[au].options.i18nProvider }), g10 = function(a11, b11) {
            let c11;
            if (b11?.host && !Array.isArray(b11.host)) c11 = b11.host.toString().split(":", 1)[0];
            else {
              if (!a11.hostname) return;
              c11 = a11.hostname;
            }
            return c11.toLowerCase();
          }(this[au].url, this[au].options.headers);
          this[au].domainLocale = this[au].options.i18nProvider ? this[au].options.i18nProvider.detectDomainLocale(g10) : function(a11, b11, c11) {
            if (a11) {
              for (let d11 of (c11 && (c11 = c11.toLowerCase()), a11)) if (b11 === d11.domain?.split(":", 1)[0].toLowerCase() || c11 === d11.defaultLocale.toLowerCase() || d11.locales?.some((a12) => a12.toLowerCase() === c11)) return d11;
            }
          }(null == (b10 = this[au].options.nextConfig) || null == (a10 = b10.i18n) ? void 0 : a10.domains, g10);
          let h10 = (null == (c10 = this[au].domainLocale) ? void 0 : c10.defaultLocale) || (null == (e10 = this[au].options.nextConfig) || null == (d10 = e10.i18n) ? void 0 : d10.defaultLocale);
          this[au].url.pathname = f10.pathname, this[au].defaultLocale = h10, this[au].basePath = f10.basePath ?? "", this[au].buildId = f10.buildId, this[au].locale = f10.locale ?? h10, this[au].trailingSlash = f10.trailingSlash;
        }
        formatPathname() {
          var a10;
          let b10;
          return b10 = function(a11, b11, c10, d10) {
            if (!b11 || b11 === c10) return a11;
            let e10 = a11.toLowerCase();
            return !d10 && (ap(e10, "/api") || ap(e10, `/${b11.toLowerCase()}`)) ? a11 : an(a11, `/${b11}`);
          }((a10 = { basePath: this[au].basePath, buildId: this[au].buildId, defaultLocale: this[au].options.forceLocale ? void 0 : this[au].defaultLocale, locale: this[au].locale, pathname: this[au].url.pathname, trailingSlash: this[au].trailingSlash }).pathname, a10.locale, a10.buildId ? void 0 : a10.defaultLocale, a10.ignorePrefix), (a10.buildId || !a10.trailingSlash) && (b10 = al(b10)), a10.buildId && (b10 = ao(an(b10, `/_next/data/${a10.buildId}`), "/" === a10.pathname ? "index.json" : ".json")), b10 = an(b10, a10.basePath), !a10.buildId && a10.trailingSlash ? b10.endsWith("/") ? b10 : ao(b10, "/") : al(b10);
        }
        formatSearch() {
          return this[au].url.search;
        }
        get buildId() {
          return this[au].buildId;
        }
        set buildId(a10) {
          this[au].buildId = a10;
        }
        get locale() {
          return this[au].locale ?? "";
        }
        set locale(a10) {
          var b10, c10;
          if (!this[au].locale || !(null == (c10 = this[au].options.nextConfig) || null == (b10 = c10.i18n) ? void 0 : b10.locales.includes(a10))) throw Object.defineProperty(TypeError(`The NextURL configuration includes no locale "${a10}"`), "__NEXT_ERROR_CODE", { value: "E597", enumerable: false, configurable: true });
          this[au].locale = a10;
        }
        get defaultLocale() {
          return this[au].defaultLocale;
        }
        get domainLocale() {
          return this[au].domainLocale;
        }
        get searchParams() {
          return this[au].url.searchParams;
        }
        get host() {
          return this[au].url.host;
        }
        set host(a10) {
          this[au].url.host = a10;
        }
        get hostname() {
          return this[au].url.hostname;
        }
        set hostname(a10) {
          this[au].url.hostname = a10;
        }
        get port() {
          return this[au].url.port;
        }
        set port(a10) {
          this[au].url.port = a10;
        }
        get protocol() {
          return this[au].url.protocol;
        }
        set protocol(a10) {
          this[au].url.protocol = a10;
        }
        get href() {
          let a10 = this.formatPathname(), b10 = this.formatSearch();
          return `${this.protocol}//${this.host}${a10}${b10}${this.hash}`;
        }
        set href(a10) {
          this[au].url = at(a10), this.analyze();
        }
        get origin() {
          return this[au].url.origin;
        }
        get pathname() {
          return this[au].url.pathname;
        }
        set pathname(a10) {
          this[au].url.pathname = a10;
        }
        get hash() {
          return this[au].url.hash;
        }
        set hash(a10) {
          this[au].url.hash = a10;
        }
        get search() {
          return this[au].url.search;
        }
        set search(a10) {
          this[au].url.search = a10;
        }
        get password() {
          return this[au].url.password;
        }
        set password(a10) {
          this[au].url.password = a10;
        }
        get username() {
          return this[au].url.username;
        }
        set username(a10) {
          this[au].url.username = a10;
        }
        get basePath() {
          return this[au].basePath;
        }
        set basePath(a10) {
          this[au].basePath = a10.startsWith("/") ? a10 : `/${a10}`;
        }
        toString() {
          return this.href;
        }
        toJSON() {
          return this.href;
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { href: this.href, origin: this.origin, protocol: this.protocol, username: this.username, password: this.password, host: this.host, hostname: this.hostname, port: this.port, pathname: this.pathname, search: this.search, searchParams: this.searchParams, hash: this.hash };
        }
        clone() {
          return new av(String(this), this[au].options);
        }
      }
      var aw = c(569);
      let ax = Symbol("internal request");
      class ay extends Request {
        constructor(a10, b10 = {}) {
          const c10 = "string" != typeof a10 && "url" in a10 ? a10.url : String(a10);
          af(c10), a10 instanceof Request ? super(a10, b10) : super(c10, b10);
          const d10 = new av(c10, { headers: ae(this.headers), nextConfig: b10.nextConfig });
          this[ax] = { cookies: new aw.RequestCookies(this.headers), nextUrl: d10, url: d10.toString() };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, nextUrl: this.nextUrl, url: this.url, bodyUsed: this.bodyUsed, cache: this.cache, credentials: this.credentials, destination: this.destination, headers: Object.fromEntries(this.headers), integrity: this.integrity, keepalive: this.keepalive, method: this.method, mode: this.mode, redirect: this.redirect, referrer: this.referrer, referrerPolicy: this.referrerPolicy, signal: this.signal };
        }
        get cookies() {
          return this[ax].cookies;
        }
        get nextUrl() {
          return this[ax].nextUrl;
        }
        get page() {
          throw new X();
        }
        get ua() {
          throw new Y();
        }
        get url() {
          return this[ax].url;
        }
      }
      class az {
        static get(a10, b10, c10) {
          let d10 = Reflect.get(a10, b10, c10);
          return "function" == typeof d10 ? d10.bind(a10) : d10;
        }
        static set(a10, b10, c10, d10) {
          return Reflect.set(a10, b10, c10, d10);
        }
        static has(a10, b10) {
          return Reflect.has(a10, b10);
        }
        static deleteProperty(a10, b10) {
          return Reflect.deleteProperty(a10, b10);
        }
      }
      let aA = Symbol("internal response"), aB = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
      function aC(a10, b10) {
        var c10;
        if (null == a10 || null == (c10 = a10.request) ? void 0 : c10.headers) {
          if (!(a10.request.headers instanceof Headers)) throw Object.defineProperty(Error("request.headers must be an instance of Headers"), "__NEXT_ERROR_CODE", { value: "E119", enumerable: false, configurable: true });
          let c11 = [];
          for (let [d10, e10] of a10.request.headers) b10.set("x-middleware-request-" + d10, e10), c11.push(d10);
          b10.set("x-middleware-override-headers", c11.join(","));
        }
      }
      class aD extends Response {
        constructor(a10, b10 = {}) {
          super(a10, b10);
          const c10 = this.headers, d10 = new Proxy(new aw.ResponseCookies(c10), { get(a11, d11, e10) {
            switch (d11) {
              case "delete":
              case "set":
                return (...e11) => {
                  let f10 = Reflect.apply(a11[d11], a11, e11), g10 = new Headers(c10);
                  return f10 instanceof aw.ResponseCookies && c10.set("x-middleware-set-cookie", f10.getAll().map((a12) => (0, aw.stringifyCookie)(a12)).join(",")), aC(b10, g10), f10;
                };
              default:
                return az.get(a11, d11, e10);
            }
          } });
          this[aA] = { cookies: d10, url: b10.url ? new av(b10.url, { headers: ae(c10), nextConfig: b10.nextConfig }) : void 0 };
        }
        [Symbol.for("edge-runtime.inspect.custom")]() {
          return { cookies: this.cookies, url: this.url, body: this.body, bodyUsed: this.bodyUsed, headers: Object.fromEntries(this.headers), ok: this.ok, redirected: this.redirected, status: this.status, statusText: this.statusText, type: this.type };
        }
        get cookies() {
          return this[aA].cookies;
        }
        static json(a10, b10) {
          let c10 = Response.json(a10, b10);
          return new aD(c10.body, c10);
        }
        static redirect(a10, b10) {
          let c10 = "number" == typeof b10 ? b10 : (null == b10 ? void 0 : b10.status) ?? 307;
          if (!aB.has(c10)) throw Object.defineProperty(RangeError('Failed to execute "redirect" on "response": Invalid status code'), "__NEXT_ERROR_CODE", { value: "E529", enumerable: false, configurable: true });
          let d10 = "object" == typeof b10 ? b10 : {}, e10 = new Headers(null == d10 ? void 0 : d10.headers);
          return e10.set("Location", af(a10)), new aD(null, { ...d10, headers: e10, status: c10 });
        }
        static rewrite(a10, b10) {
          let c10 = new Headers(null == b10 ? void 0 : b10.headers);
          return c10.set("x-middleware-rewrite", af(a10)), aC(b10, c10), new aD(null, { ...b10, headers: c10 });
        }
        static next(a10) {
          let b10 = new Headers(null == a10 ? void 0 : a10.headers);
          return b10.set("x-middleware-next", "1"), aC(a10, b10), new aD(null, { ...a10, headers: b10 });
        }
      }
      function aE(a10, b10) {
        let c10 = "string" == typeof b10 ? new URL(b10) : b10, d10 = new URL(a10, b10), e10 = d10.origin === c10.origin;
        return { url: e10 ? d10.toString().slice(c10.origin.length) : d10.toString(), isRelative: e10 };
      }
      let aF = "next-router-prefetch", aG = ["rsc", "next-router-state-tree", aF, "next-hmr-refresh", "next-router-segment-prefetch"], aH = "_rsc";
      function aI(a10) {
        return a10.startsWith("/") ? a10 : `/${a10}`;
      }
      function aJ(a10) {
        return aI(a10.split("/").reduce((a11, b10, c10, d10) => b10 ? "(" === b10[0] && b10.endsWith(")") || "@" === b10[0] || ("page" === b10 || "route" === b10) && c10 === d10.length - 1 ? a11 : `${a11}/${b10}` : a11, ""));
      }
      class aK extends Error {
        constructor() {
          super("Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers");
        }
        static callable() {
          throw new aK();
        }
      }
      class aL extends Headers {
        constructor(a10) {
          super(), this.headers = new Proxy(a10, { get(b10, c10, d10) {
            if ("symbol" == typeof c10) return az.get(b10, c10, d10);
            let e10 = c10.toLowerCase(), f10 = Object.keys(a10).find((a11) => a11.toLowerCase() === e10);
            if (void 0 !== f10) return az.get(b10, f10, d10);
          }, set(b10, c10, d10, e10) {
            if ("symbol" == typeof c10) return az.set(b10, c10, d10, e10);
            let f10 = c10.toLowerCase(), g10 = Object.keys(a10).find((a11) => a11.toLowerCase() === f10);
            return az.set(b10, g10 ?? c10, d10, e10);
          }, has(b10, c10) {
            if ("symbol" == typeof c10) return az.has(b10, c10);
            let d10 = c10.toLowerCase(), e10 = Object.keys(a10).find((a11) => a11.toLowerCase() === d10);
            return void 0 !== e10 && az.has(b10, e10);
          }, deleteProperty(b10, c10) {
            if ("symbol" == typeof c10) return az.deleteProperty(b10, c10);
            let d10 = c10.toLowerCase(), e10 = Object.keys(a10).find((a11) => a11.toLowerCase() === d10);
            return void 0 === e10 || az.deleteProperty(b10, e10);
          } });
        }
        static seal(a10) {
          return new Proxy(a10, { get(a11, b10, c10) {
            switch (b10) {
              case "append":
              case "delete":
              case "set":
                return aK.callable;
              default:
                return az.get(a11, b10, c10);
            }
          } });
        }
        merge(a10) {
          return Array.isArray(a10) ? a10.join(", ") : a10;
        }
        static from(a10) {
          return a10 instanceof Headers ? a10 : new aL(a10);
        }
        append(a10, b10) {
          let c10 = this.headers[a10];
          "string" == typeof c10 ? this.headers[a10] = [c10, b10] : Array.isArray(c10) ? c10.push(b10) : this.headers[a10] = b10;
        }
        delete(a10) {
          delete this.headers[a10];
        }
        get(a10) {
          let b10 = this.headers[a10];
          return void 0 !== b10 ? this.merge(b10) : null;
        }
        has(a10) {
          return void 0 !== this.headers[a10];
        }
        set(a10, b10) {
          this.headers[a10] = b10;
        }
        forEach(a10, b10) {
          for (let [c10, d10] of this.entries()) a10.call(b10, d10, c10, this);
        }
        *entries() {
          for (let a10 of Object.keys(this.headers)) {
            let b10 = a10.toLowerCase(), c10 = this.get(b10);
            yield [b10, c10];
          }
        }
        *keys() {
          for (let a10 of Object.keys(this.headers)) {
            let b10 = a10.toLowerCase();
            yield b10;
          }
        }
        *values() {
          for (let a10 of Object.keys(this.headers)) {
            let b10 = this.get(a10);
            yield b10;
          }
        }
        [Symbol.iterator]() {
          return this.entries();
        }
      }
      let aM = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class aN {
        disable() {
          throw aM;
        }
        getStore() {
        }
        run() {
          throw aM;
        }
        exit() {
          throw aM;
        }
        enterWith() {
          throw aM;
        }
        static bind(a10) {
          return a10;
        }
      }
      let aO = "u" > typeof globalThis && globalThis.AsyncLocalStorage;
      function aP() {
        return aO ? new aO() : new aN();
      }
      let aQ = aP();
      class aR extends Error {
        constructor() {
          super("Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options");
        }
        static callable() {
          throw new aR();
        }
      }
      class aS {
        static seal(a10) {
          return new Proxy(a10, { get(a11, b10, c10) {
            switch (b10) {
              case "clear":
              case "delete":
              case "set":
                return aR.callable;
              default:
                return az.get(a11, b10, c10);
            }
          } });
        }
      }
      let aT = Symbol.for("next.mutated.cookies");
      class aU {
        static wrap(a10, b10) {
          let c10 = new aw.ResponseCookies(new Headers());
          for (let b11 of a10.getAll()) c10.set(b11);
          let d10 = [], e10 = /* @__PURE__ */ new Set(), f10 = () => {
            let a11 = aQ.getStore();
            if (a11 && (a11.pathWasRevalidated = 1), d10 = c10.getAll().filter((a12) => e10.has(a12.name)), b10) {
              let a12 = [];
              for (let b11 of d10) {
                let c11 = new aw.ResponseCookies(new Headers());
                c11.set(b11), a12.push(c11.toString());
              }
              b10(a12);
            }
          }, g10 = new Proxy(c10, { get(a11, b11, c11) {
            switch (b11) {
              case aT:
                return d10;
              case "delete":
                return function(...b12) {
                  e10.add("string" == typeof b12[0] ? b12[0] : b12[0].name);
                  try {
                    return a11.delete(...b12), g10;
                  } finally {
                    f10();
                  }
                };
              case "set":
                return function(...b12) {
                  e10.add("string" == typeof b12[0] ? b12[0] : b12[0].name);
                  try {
                    return a11.set(...b12), g10;
                  } finally {
                    f10();
                  }
                };
              default:
                return az.get(a11, b11, c11);
            }
          } });
          return g10;
        }
      }
      function aV(a10, b10) {
        if ("action" !== a10.phase) throw new aR();
      }
      var aW = ((l = aW || {}).handleRequest = "BaseServer.handleRequest", l.run = "BaseServer.run", l.pipe = "BaseServer.pipe", l.getStaticHTML = "BaseServer.getStaticHTML", l.render = "BaseServer.render", l.renderToResponseWithComponents = "BaseServer.renderToResponseWithComponents", l.renderToResponse = "BaseServer.renderToResponse", l.renderToHTML = "BaseServer.renderToHTML", l.renderError = "BaseServer.renderError", l.renderErrorToResponse = "BaseServer.renderErrorToResponse", l.renderErrorToHTML = "BaseServer.renderErrorToHTML", l.render404 = "BaseServer.render404", l), aX = ((m = aX || {}).loadDefaultErrorComponents = "LoadComponents.loadDefaultErrorComponents", m.loadComponents = "LoadComponents.loadComponents", m), aY = ((n = aY || {}).getRequestHandler = "NextServer.getRequestHandler", n.getRequestHandlerWithMetadata = "NextServer.getRequestHandlerWithMetadata", n.getServer = "NextServer.getServer", n.getServerRequestHandler = "NextServer.getServerRequestHandler", n.createServer = "createServer.createServer", n), aZ = ((o = aZ || {}).compression = "NextNodeServer.compression", o.getBuildId = "NextNodeServer.getBuildId", o.createComponentTree = "NextNodeServer.createComponentTree", o.clientComponentLoading = "NextNodeServer.clientComponentLoading", o.getLayoutOrPageModule = "NextNodeServer.getLayoutOrPageModule", o.generateStaticRoutes = "NextNodeServer.generateStaticRoutes", o.generateFsStaticRoutes = "NextNodeServer.generateFsStaticRoutes", o.generatePublicRoutes = "NextNodeServer.generatePublicRoutes", o.generateImageRoutes = "NextNodeServer.generateImageRoutes.route", o.sendRenderResult = "NextNodeServer.sendRenderResult", o.proxyRequest = "NextNodeServer.proxyRequest", o.runApi = "NextNodeServer.runApi", o.render = "NextNodeServer.render", o.renderHTML = "NextNodeServer.renderHTML", o.imageOptimizer = "NextNodeServer.imageOptimizer", o.getPagePath = "NextNodeServer.getPagePath", o.getRoutesManifest = "NextNodeServer.getRoutesManifest", o.findPageComponents = "NextNodeServer.findPageComponents", o.getFontManifest = "NextNodeServer.getFontManifest", o.getServerComponentManifest = "NextNodeServer.getServerComponentManifest", o.getRequestHandler = "NextNodeServer.getRequestHandler", o.renderToHTML = "NextNodeServer.renderToHTML", o.renderError = "NextNodeServer.renderError", o.renderErrorToHTML = "NextNodeServer.renderErrorToHTML", o.render404 = "NextNodeServer.render404", o.startResponse = "NextNodeServer.startResponse", o.route = "route", o.onProxyReq = "onProxyReq", o.apiResolver = "apiResolver", o.internalFetch = "internalFetch", o), a$ = ((p = a$ || {}).startServer = "startServer.startServer", p), a_ = ((q = a_ || {}).getServerSideProps = "Render.getServerSideProps", q.getStaticProps = "Render.getStaticProps", q.renderToString = "Render.renderToString", q.renderDocument = "Render.renderDocument", q.createBodyResult = "Render.createBodyResult", q), a0 = ((r = a0 || {}).renderToString = "AppRender.renderToString", r.renderToReadableStream = "AppRender.renderToReadableStream", r.getBodyResult = "AppRender.getBodyResult", r.fetch = "AppRender.fetch", r), a1 = ((s = a1 || {}).executeRoute = "Router.executeRoute", s), a2 = ((t = a2 || {}).runHandler = "Node.runHandler", t), a3 = ((u = a3 || {}).runHandler = "AppRouteRouteHandlers.runHandler", u), a4 = ((v = a4 || {}).generateMetadata = "ResolveMetadata.generateMetadata", v.generateViewport = "ResolveMetadata.generateViewport", v), a5 = ((w = a5 || {}).execute = "Middleware.execute", w);
      let a6 = /* @__PURE__ */ new Set(["Middleware.execute", "BaseServer.handleRequest", "Render.getServerSideProps", "Render.getStaticProps", "AppRender.fetch", "AppRender.getBodyResult", "Render.renderDocument", "Node.runHandler", "AppRouteRouteHandlers.runHandler", "ResolveMetadata.generateMetadata", "ResolveMetadata.generateViewport", "NextNodeServer.createComponentTree", "NextNodeServer.findPageComponents", "NextNodeServer.getLayoutOrPageModule", "NextNodeServer.startResponse", "NextNodeServer.clientComponentLoading"]), a7 = /* @__PURE__ */ new Set(["NextNodeServer.findPageComponents", "NextNodeServer.createComponentTree", "NextNodeServer.clientComponentLoading"]);
      function a8(a10) {
        return null !== a10 && "object" == typeof a10 && "then" in a10 && "function" == typeof a10.then;
      }
      let a9 = process.env.NEXT_OTEL_PERFORMANCE_PREFIX, { context: ba, propagation: bb, trace: bc, SpanStatusCode: bd, SpanKind: be, ROOT_CONTEXT: bf } = d = c(778);
      class bg extends Error {
        constructor(a10, b10) {
          super(), this.bubble = a10, this.result = b10;
        }
      }
      let bh = (a10, b10) => {
        "object" == typeof b10 && null !== b10 && b10 instanceof bg && b10.bubble ? a10.setAttribute("next.bubble", true) : (b10 && (a10.recordException(b10), a10.setAttribute("error.type", b10.name)), a10.setStatus({ code: bd.ERROR, message: null == b10 ? void 0 : b10.message })), a10.end();
      }, bi = /* @__PURE__ */ new Map(), bj = d.createContextKey("next.rootSpanId"), bk = 0, bl = { set(a10, b10, c10) {
        a10.push({ key: b10, value: c10 });
      } };
      class bm {
        getTracerInstance() {
          return bc.getTracer("next.js", "0.0.1");
        }
        getContext() {
          return ba;
        }
        getTracePropagationData() {
          let a10 = ba.active(), b10 = [];
          return bb.inject(a10, b10, bl), b10;
        }
        getActiveScopeSpan() {
          return bc.getSpan(null == ba ? void 0 : ba.active());
        }
        withPropagatedContext(a10, b10, c10, d10 = false) {
          let e10 = ba.active();
          if (d10) {
            let d11 = bb.extract(bf, a10, c10);
            if (bc.getSpanContext(d11)) return ba.with(d11, b10);
            let f11 = bb.extract(e10, a10, c10);
            return ba.with(f11, b10);
          }
          if (bc.getSpanContext(e10)) return b10();
          let f10 = bb.extract(e10, a10, c10);
          return ba.with(f10, b10);
        }
        trace(...a10) {
          let [b10, c10, d10] = a10, { fn: e10, options: f10 } = "function" == typeof c10 ? { fn: c10, options: {} } : { fn: d10, options: { ...c10 } }, g10 = f10.spanName ?? b10;
          if (!a6.has(b10) && "1" !== process.env.NEXT_OTEL_VERBOSE || f10.hideSpan) return e10();
          let h10 = this.getSpanContext((null == f10 ? void 0 : f10.parentSpan) ?? this.getActiveScopeSpan());
          h10 || (h10 = (null == ba ? void 0 : ba.active()) ?? bf);
          let i10 = h10.getValue(bj), j10 = "number" != typeof i10 || !bi.has(i10), k2 = bk++;
          return f10.attributes = { "next.span_name": g10, "next.span_type": b10, ...f10.attributes }, ba.with(h10.setValue(bj, k2), () => this.getTracerInstance().startActiveSpan(g10, f10, (a11) => {
            let c11;
            a9 && b10 && a7.has(b10) && (c11 = "performance" in globalThis && "measure" in performance ? globalThis.performance.now() : void 0);
            let d11 = false, g11 = () => {
              !d11 && (d11 = true, bi.delete(k2), c11 && performance.measure(`${a9}:next-${(b10.split(".").pop() || "").replace(/[A-Z]/g, (a12) => "-" + a12.toLowerCase())}`, { start: c11, end: performance.now() }));
            };
            if (j10 && bi.set(k2, new Map(Object.entries(f10.attributes ?? {}))), e10.length > 1) try {
              return e10(a11, (b11) => bh(a11, b11));
            } catch (b11) {
              throw bh(a11, b11), b11;
            } finally {
              g11();
            }
            try {
              let b11 = e10(a11);
              if (a8(b11)) return b11.then((b12) => (a11.end(), b12)).catch((b12) => {
                throw bh(a11, b12), b12;
              }).finally(g11);
              return a11.end(), g11(), b11;
            } catch (b11) {
              throw bh(a11, b11), g11(), b11;
            }
          }));
        }
        wrap(...a10) {
          let b10 = this, [c10, d10, e10] = 3 === a10.length ? a10 : [a10[0], {}, a10[1]];
          return a6.has(c10) || "1" === process.env.NEXT_OTEL_VERBOSE ? function() {
            let a11 = d10;
            "function" == typeof a11 && "function" == typeof e10 && (a11 = a11.apply(this, arguments));
            let f10 = arguments.length - 1, g10 = arguments[f10];
            if ("function" != typeof g10) return b10.trace(c10, a11, () => e10.apply(this, arguments));
            {
              let d11 = b10.getContext().bind(ba.active(), g10);
              return b10.trace(c10, a11, (a12, b11) => (arguments[f10] = function(a13) {
                return null == b11 || b11(a13), d11.apply(this, arguments);
              }, e10.apply(this, arguments)));
            }
          } : e10;
        }
        startSpan(...a10) {
          let [b10, c10] = a10, d10 = this.getSpanContext((null == c10 ? void 0 : c10.parentSpan) ?? this.getActiveScopeSpan());
          return this.getTracerInstance().startSpan(b10, c10, d10);
        }
        getSpanContext(a10) {
          return a10 ? bc.setSpan(ba.active(), a10) : void 0;
        }
        getRootSpanAttributes() {
          let a10 = ba.active().getValue(bj);
          return bi.get(a10);
        }
        setRootSpanAttribute(a10, b10) {
          let c10 = ba.active().getValue(bj), d10 = bi.get(c10);
          d10 && !d10.has(a10) && d10.set(a10, b10);
        }
        withSpan(a10, b10) {
          let c10 = bc.setSpan(ba.active(), a10);
          return ba.with(c10, b10);
        }
      }
      let bn = (i = new bm(), () => i), bo = "__prerender_bypass";
      Symbol("__next_preview_data"), Symbol(bo);
      class bp {
        constructor(a10, b10, c10, d10) {
          var e10;
          const f10 = a10 && function(a11, b11) {
            let c11 = aL.from(a11.headers);
            return { isOnDemandRevalidate: c11.get(Z) === b11.previewModeId, revalidateOnlyGenerated: c11.has("x-prerender-revalidate-if-generated") };
          }(b10, a10).isOnDemandRevalidate, g10 = null == (e10 = c10.get(bo)) ? void 0 : e10.value;
          this._isEnabled = !!(!f10 && g10 && a10 && g10 === a10.previewModeId), this._previewModeId = null == a10 ? void 0 : a10.previewModeId, this._mutableCookies = d10;
        }
        get isEnabled() {
          return this._isEnabled;
        }
        enable() {
          if (!this._previewModeId) throw Object.defineProperty(Error("Invariant: previewProps missing previewModeId this should never happen"), "__NEXT_ERROR_CODE", { value: "E93", enumerable: false, configurable: true });
          this._mutableCookies.set({ name: bo, value: this._previewModeId, httpOnly: true, sameSite: "none", secure: true, path: "/" }), this._isEnabled = true;
        }
        disable() {
          this._mutableCookies.set({ name: bo, value: "", httpOnly: true, sameSite: "none", secure: true, path: "/", expires: /* @__PURE__ */ new Date(0) }), this._isEnabled = false;
        }
      }
      function bq(a10, b10) {
        if ("x-middleware-set-cookie" in a10.headers && "string" == typeof a10.headers["x-middleware-set-cookie"]) {
          let c10 = a10.headers["x-middleware-set-cookie"], d10 = new Headers();
          for (let a11 of ad(c10)) d10.append("set-cookie", a11);
          for (let a11 of new aw.ResponseCookies(d10).getAll()) b10.set(a11);
        }
      }
      let br = aP();
      function bs(a10) {
        switch (a10.type) {
          case "prerender":
          case "prerender-runtime":
          case "prerender-ppr":
          case "prerender-client":
          case "validation-client":
            return a10.prerenderResumeDataCache;
          case "request":
            if (a10.prerenderResumeDataCache) return a10.prerenderResumeDataCache;
          case "prerender-legacy":
          case "cache":
          case "private-cache":
          case "unstable-cache":
          case "generate-static-params":
            return null;
          default:
            return a10;
        }
      }
      var bt = c(183), bu = c.n(bt);
      class bv extends Error {
        constructor(a10, b10) {
          super(`Invariant: ${a10.endsWith(".") ? a10 : a10 + "."} This is a bug in Next.js.`, b10), this.name = "InvariantError";
        }
      }
      class bw {
        constructor(a10, b10, c10) {
          this.prev = null, this.next = null, this.key = a10, this.data = b10, this.size = c10;
        }
      }
      class bx {
        constructor() {
          this.prev = null, this.next = null;
        }
      }
      class by {
        constructor(a10, b10, c10) {
          this.cache = /* @__PURE__ */ new Map(), this.totalSize = 0, this.maxSize = a10, this.calculateSize = b10, this.onEvict = c10, this.head = new bx(), this.tail = new bx(), this.head.next = this.tail, this.tail.prev = this.head;
        }
        addToHead(a10) {
          a10.prev = this.head, a10.next = this.head.next, this.head.next.prev = a10, this.head.next = a10;
        }
        removeNode(a10) {
          a10.prev.next = a10.next, a10.next.prev = a10.prev;
        }
        moveToHead(a10) {
          this.removeNode(a10), this.addToHead(a10);
        }
        removeTail() {
          let a10 = this.tail.prev;
          return this.removeNode(a10), a10;
        }
        set(a10, b10) {
          let c10 = (null == this.calculateSize ? void 0 : this.calculateSize.call(this, b10)) ?? 1;
          if (c10 <= 0) throw Object.defineProperty(Error(`LRUCache: calculateSize returned ${c10}, but size must be > 0. Items with size 0 would never be evicted, causing unbounded cache growth.`), "__NEXT_ERROR_CODE", { value: "E1045", enumerable: false, configurable: true });
          if (c10 > this.maxSize) return console.warn("Single item size exceeds maxSize"), false;
          let d10 = this.cache.get(a10);
          if (d10) d10.data = b10, this.totalSize = this.totalSize - d10.size + c10, d10.size = c10, this.moveToHead(d10);
          else {
            let d11 = new bw(a10, b10, c10);
            this.cache.set(a10, d11), this.addToHead(d11), this.totalSize += c10;
          }
          for (; this.totalSize > this.maxSize && this.cache.size > 0; ) {
            let a11 = this.removeTail();
            this.cache.delete(a11.key), this.totalSize -= a11.size, null == this.onEvict || this.onEvict.call(this, a11.key, a11.data);
          }
          return true;
        }
        has(a10) {
          return this.cache.has(a10);
        }
        get(a10) {
          let b10 = this.cache.get(a10);
          if (b10) return this.moveToHead(b10), b10.data;
        }
        *[Symbol.iterator]() {
          let a10 = this.head.next;
          for (; a10 && a10 !== this.tail; ) {
            let b10 = a10;
            yield [b10.key, b10.data], a10 = a10.next;
          }
        }
        remove(a10) {
          let b10 = this.cache.get(a10);
          b10 && (this.removeNode(b10), this.cache.delete(a10), this.totalSize -= b10.size);
        }
        get size() {
          return this.cache.size;
        }
        get currentSize() {
          return this.totalSize;
        }
      }
      let bz = /* @__PURE__ */ new Map(), bA = (a10, b10) => {
        for (let c10 of a10) {
          let a11 = bz.get(c10), d10 = null == a11 ? void 0 : a11.expired;
          if ("number" == typeof d10 && d10 <= Date.now() && d10 > b10) return true;
        }
        return false;
      }, bB = (a10, b10) => {
        for (let c10 of a10) {
          let a11 = bz.get(c10), d10 = (null == a11 ? void 0 : a11.stale) ?? 0;
          if ("number" == typeof d10 && d10 > b10) return true;
        }
        return false;
      };
      c(356).Buffer, process.env.NEXT_PRIVATE_DEBUG_CACHE, Symbol.for("@next/cache-handlers");
      let bC = Symbol.for("@next/cache-handlers-map"), bD = Symbol.for("@next/cache-handlers-set"), bE = globalThis;
      function bF() {
        if (bE[bC]) return bE[bC].entries();
      }
      async function bG(a10, b10) {
        if (!a10) return b10();
        let c10 = bH(a10);
        try {
          return await b10();
        } finally {
          var d10, e10, f10, g10;
          let b11, h10, i10, j10, k2 = (d10 = c10, e10 = bH(a10), b11 = new Set(d10.pendingRevalidatedTags.map((a11) => {
            let b12 = "object" == typeof a11.profile ? JSON.stringify(a11.profile) : a11.profile || "";
            return `${a11.tag}:${b12}`;
          })), h10 = new Set(d10.pendingRevalidateWrites), { pendingRevalidatedTags: e10.pendingRevalidatedTags.filter((a11) => {
            let c11 = "object" == typeof a11.profile ? JSON.stringify(a11.profile) : a11.profile || "";
            return !b11.has(`${a11.tag}:${c11}`);
          }), pendingRevalidates: Object.fromEntries(Object.entries(e10.pendingRevalidates).filter(([a11]) => !(a11 in d10.pendingRevalidates))), pendingRevalidateWrites: e10.pendingRevalidateWrites.filter((a11) => !h10.has(a11)) });
          await (f10 = a10, i10 = [], (j10 = (null == (g10 = k2) ? void 0 : g10.pendingRevalidatedTags) ?? f10.pendingRevalidatedTags ?? []).length > 0 && i10.push(bI(j10, f10.incrementalCache, f10)), i10.push(...Object.values((null == g10 ? void 0 : g10.pendingRevalidates) ?? f10.pendingRevalidates ?? {})), i10.push(...(null == g10 ? void 0 : g10.pendingRevalidateWrites) ?? f10.pendingRevalidateWrites ?? []), 0 !== i10.length && Promise.all(i10).then(() => void 0));
        }
      }
      function bH(a10) {
        return { pendingRevalidatedTags: a10.pendingRevalidatedTags ? [...a10.pendingRevalidatedTags] : [], pendingRevalidates: { ...a10.pendingRevalidates }, pendingRevalidateWrites: a10.pendingRevalidateWrites ? [...a10.pendingRevalidateWrites] : [] };
      }
      async function bI(a10, b10, c10) {
        if (0 === a10.length) return;
        let d10 = function() {
          if (bE[bD]) return bE[bD].values();
        }(), e10 = [], f10 = /* @__PURE__ */ new Map();
        for (let b11 of a10) {
          let a11, c11 = b11.profile;
          for (let [b12] of f10) if ("string" == typeof b12 && "string" == typeof c11 && b12 === c11 || "object" == typeof b12 && "object" == typeof c11 && JSON.stringify(b12) === JSON.stringify(c11) || b12 === c11) {
            a11 = b12;
            break;
          }
          let d11 = a11 || c11;
          f10.has(d11) || f10.set(d11, []), f10.get(d11).push(b11.tag);
        }
        for (let [a11, h10] of f10) {
          let f11;
          if (a11) {
            let b11;
            if ("object" == typeof a11) b11 = a11;
            else if ("string" == typeof a11) {
              var g10;
              if (!(b11 = null == c10 || null == (g10 = c10.cacheLifeProfiles) ? void 0 : g10[a11])) throw Object.defineProperty(Error(`Invalid profile provided "${a11}" must be configured under cacheLife in next.config or be "max"`), "__NEXT_ERROR_CODE", { value: "E873", enumerable: false, configurable: true });
            }
            b11 && (f11 = { expire: b11.expire });
          }
          for (let b11 of d10 || []) a11 ? e10.push(null == b11.updateTags ? void 0 : b11.updateTags.call(b11, h10, f11)) : e10.push(null == b11.updateTags ? void 0 : b11.updateTags.call(b11, h10));
          b10 && e10.push(b10.revalidateTag(h10, f11));
        }
        await Promise.all(e10);
      }
      let bJ = Object.defineProperty(Error("Invariant: AsyncLocalStorage accessed in runtime where it is not available"), "__NEXT_ERROR_CODE", { value: "E504", enumerable: false, configurable: true });
      class bK {
        disable() {
          throw bJ;
        }
        getStore() {
        }
        run() {
          throw bJ;
        }
        exit() {
          throw bJ;
        }
        enterWith() {
          throw bJ;
        }
        static bind(a10) {
          return a10;
        }
      }
      let bL = "u" > typeof globalThis && globalThis.AsyncLocalStorage, bM = bL ? new bL() : new bK();
      class bN {
        constructor({ waitUntil: a10, onClose: b10, onTaskError: c10 }) {
          this.workUnitStores = /* @__PURE__ */ new Set(), this.waitUntil = a10, this.onClose = b10, this.onTaskError = c10, this.callbackQueue = new (bu())(), this.callbackQueue.pause();
        }
        after(a10) {
          if (a8(a10)) this.waitUntil || bO(), this.waitUntil(a10.catch((a11) => this.reportTaskError("promise", a11)));
          else if ("function" == typeof a10) this.addCallback(a10);
          else throw Object.defineProperty(Error("`after()`: Argument must be a promise or a function"), "__NEXT_ERROR_CODE", { value: "E50", enumerable: false, configurable: true });
        }
        addCallback(a10) {
          var b10;
          this.waitUntil || bO();
          let c10 = br.getStore();
          c10 && this.workUnitStores.add(c10);
          let d10 = bM.getStore(), e10 = d10 ? d10.rootTaskSpawnPhase : null == c10 ? void 0 : c10.phase;
          this.runCallbacksOnClosePromise || (this.runCallbacksOnClosePromise = this.runCallbacksOnClose(), this.waitUntil(this.runCallbacksOnClosePromise));
          let f10 = (b10 = async () => {
            try {
              await bM.run({ rootTaskSpawnPhase: e10 }, () => a10());
            } catch (a11) {
              this.reportTaskError("function", a11);
            }
          }, bL ? bL.bind(b10) : bK.bind(b10));
          this.callbackQueue.add(f10);
        }
        async runCallbacksOnClose() {
          return await new Promise((a10) => this.onClose(a10)), this.runCallbacks();
        }
        async runCallbacks() {
          if (0 === this.callbackQueue.size) return;
          for (let a11 of this.workUnitStores) a11.phase = "after";
          let a10 = aQ.getStore();
          if (!a10) throw Object.defineProperty(new bv("Missing workStore in AfterContext.runCallbacks"), "__NEXT_ERROR_CODE", { value: "E547", enumerable: false, configurable: true });
          return bG(a10, () => (this.callbackQueue.start(), this.callbackQueue.onIdle()));
        }
        reportTaskError(a10, b10) {
          if (console.error("promise" === a10 ? "A promise passed to `after()` rejected:" : "An error occurred in a function passed to `after()`:", b10), this.onTaskError) try {
            null == this.onTaskError || this.onTaskError.call(this, b10);
          } catch (a11) {
            console.error(Object.defineProperty(new bv("`onTaskError` threw while handling an error thrown from an `after` task", { cause: a11 }), "__NEXT_ERROR_CODE", { value: "E569", enumerable: false, configurable: true }));
          }
        }
      }
      function bO() {
        throw Object.defineProperty(Error("`after()` will not work correctly, because `waitUntil` is not available in the current environment."), "__NEXT_ERROR_CODE", { value: "E91", enumerable: false, configurable: true });
      }
      function bP(a10) {
        let b10, c10 = { then: (d10, e10) => (b10 || (b10 = Promise.resolve(a10())), b10.then((a11) => {
          c10.value = a11;
        }).catch(() => {
        }), b10.then(d10, e10)) };
        return c10;
      }
      class bQ {
        onClose(a10) {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot subscribe to a closed CloseController"), "__NEXT_ERROR_CODE", { value: "E365", enumerable: false, configurable: true });
          this.target.addEventListener("close", a10), this.listeners++;
        }
        dispatchClose() {
          if (this.isClosed) throw Object.defineProperty(Error("Cannot close a CloseController multiple times"), "__NEXT_ERROR_CODE", { value: "E229", enumerable: false, configurable: true });
          this.listeners > 0 && this.target.dispatchEvent(new Event("close")), this.isClosed = true;
        }
        constructor() {
          this.target = new EventTarget(), this.listeners = 0, this.isClosed = false;
        }
      }
      function bR() {
        return { previewModeId: process.env.__NEXT_PREVIEW_MODE_ID || "", previewModeSigningKey: process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY || "", previewModeEncryptionKey: process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY || "" };
      }
      let bS = Symbol.for("@next/request-context"), bT = /[^\t\x20-\x7e]/, bU = /[^\t\x20-\x7e]+/g;
      function bV(a10) {
        return bT.test(a10) ? a10.replace(bU, (a11) => encodeURIComponent(a11)) : a10;
      }
      async function bW(a10, b10, c10) {
        let d10 = /* @__PURE__ */ new Set();
        for (let b11 of ((a11) => {
          let b12 = ["/layout"];
          if (a11.startsWith("/")) {
            let c11 = a11.split("/");
            for (let a12 = 1; a12 < c11.length + 1; a12++) {
              let d11 = c11.slice(0, a12).join("/");
              d11 && (d11.endsWith("/page") || d11.endsWith("/route") || (d11 = `${d11}${!d11.endsWith("/") ? "/" : ""}layout`), b12.push(d11));
            }
          }
          return b12;
        })(a10)) b11 = bV(`${ab}${b11}`), d10.add(b11);
        if (b10 && (!c10 || 0 === c10.size)) {
          let a11 = bV(`${ab}${b10}`);
          d10.add(a11);
        }
        d10.has(`${ab}/`) && d10.add(`${ab}/index`), d10.has(`${ab}/index`) && d10.add(`${ab}/`);
        let e10 = Array.from(d10);
        return { tags: e10, expirationsByCacheKind: function(a11) {
          let b11 = /* @__PURE__ */ new Map(), c11 = bF();
          if (c11) for (let [d11, e11] of c11) "getExpiration" in e11 && b11.set(d11, bP(async () => e11.getExpiration(a11)));
          return b11;
        }(e10) };
      }
      let bX = Symbol.for("NextInternalRequestMeta");
      class bY extends ay {
        constructor(a10) {
          super(a10.input, a10.init), this.sourcePage = a10.page;
        }
        get request() {
          throw Object.defineProperty(new W({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        respondWith() {
          throw Object.defineProperty(new W({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
        waitUntil() {
          throw Object.defineProperty(new W({ page: this.sourcePage }), "__NEXT_ERROR_CODE", { value: "E394", enumerable: false, configurable: true });
        }
      }
      let bZ = { keys: (a10) => Array.from(a10.keys()), get: (a10, b10) => a10.get(b10) ?? void 0 }, b$ = (a10, b10) => bn().withPropagatedContext(a10.headers, b10, bZ), b_ = false;
      async function b0(a10) {
        var b10, d10, e10, f10, g10;
        let h10, i10, j10, k2, l2;
        !function() {
          if (!b_ && (b_ = true, "true" === process.env.NEXT_PRIVATE_TEST_PROXY)) {
            let { interceptTestApis: a11, wrapRequestHandler: b11 } = c(102);
            a11(), b$ = b11(b$);
          }
        }(), await U();
        let m2 = void 0 !== globalThis.__BUILD_MANIFEST;
        a10.request.url = a10.request.url.replace(/\.rsc($|\?)/, "$1");
        let n2 = a10.bypassNextUrl ? new URL(a10.request.url) : new av(a10.request.url, { headers: a10.request.headers, nextConfig: a10.request.nextConfig });
        for (let a11 of [...n2.searchParams.keys()]) {
          let b11 = n2.searchParams.getAll(a11), c10 = function(a12) {
            for (let b12 of ["nxtP", "nxtI"]) if (a12 !== b12 && a12.startsWith(b12)) return a12.substring(b12.length);
            return null;
          }(a11);
          if (c10) {
            for (let a12 of (n2.searchParams.delete(c10), b11)) n2.searchParams.append(c10, a12);
            n2.searchParams.delete(a11);
          }
        }
        let o2 = process.env.__NEXT_BUILD_ID || "";
        "buildId" in n2 && (o2 = n2.buildId || "", n2.buildId = "");
        let p2 = function(a11) {
          let b11 = new Headers();
          for (let [c10, d11] of Object.entries(a11)) for (let a12 of Array.isArray(d11) ? d11 : [d11]) void 0 !== a12 && ("number" == typeof a12 && (a12 = a12.toString()), b11.append(c10, a12));
          return b11;
        }(a10.request.headers), q2 = p2.has("x-nextjs-data"), r2 = "1" === p2.get("rsc");
        q2 && "/index" === n2.pathname && (n2.pathname = "/");
        let s2 = /* @__PURE__ */ new Map();
        if (!m2) for (let a11 of aG) {
          let b11 = p2.get(a11);
          null !== b11 && (s2.set(a11, b11), p2.delete(a11));
        }
        let t2 = n2.searchParams.get(aH), u2 = new bY({ page: a10.page, input: ((k2 = (j10 = "string" == typeof n2) ? new URL(n2) : n2).searchParams.delete(aH), j10 ? k2.toString() : k2).toString(), init: { body: a10.request.body, headers: p2, method: a10.request.method, nextConfig: a10.request.nextConfig, signal: a10.request.signal } });
        a10.request.requestMeta && (g10 = a10.request.requestMeta, u2[bX] = g10), q2 && Object.defineProperty(u2, "__isData", { enumerable: false, value: true }), !globalThis.__incrementalCacheShared && a10.IncrementalCache && (globalThis.__incrementalCache = new a10.IncrementalCache({ CurCacheHandler: a10.incrementalCacheHandler, minimalMode: true, fetchCacheKeyPrefix: "", dev: false, requestHeaders: a10.request.headers, getPrerenderManifest: () => ({ version: -1, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: bR() }) }));
        let v2 = a10.request.waitUntil ?? (null == (b10 = null == (l2 = globalThis[bS]) ? void 0 : l2.get()) ? void 0 : b10.waitUntil), w2 = new ak({ request: u2, page: a10.page, context: v2 ? { waitUntil: v2 } : void 0 });
        if ((h10 = await b$(u2, () => {
          if ("/middleware" === a10.page || "/src/middleware" === a10.page || "/proxy" === a10.page || "/src/proxy" === a10.page) {
            let b11 = w2.waitUntil.bind(w2), c10 = new bQ();
            return bn().trace(a5.execute, { spanName: `middleware ${u2.method}`, attributes: { "http.target": u2.nextUrl.pathname, "http.method": u2.method } }, async () => {
              try {
                var d11, e11, f11, g11, h11, j11;
                let k3 = bR(), l3 = await bW("/", u2.nextUrl.pathname, null), m3 = (h11 = u2.nextUrl, j11 = (a11) => {
                  i10 = a11;
                }, function(a11, b12, c11, d12, e12, f12, g12, h12, i11, j12) {
                  function k4(a12) {
                    c11 && c11.setHeader("Set-Cookie", a12);
                  }
                  let l4 = {};
                  return { type: "request", phase: a11, implicitTags: f12, url: { pathname: d12.pathname, search: d12.search ?? "" }, rootParams: e12, get headers() {
                    return l4.headers || (l4.headers = function(a12) {
                      let b13 = aL.from(a12);
                      for (let a13 of aG) b13.delete(a13);
                      return aL.seal(b13);
                    }(b12.headers)), l4.headers;
                  }, get cookies() {
                    if (!l4.cookies) {
                      let a12 = new aw.RequestCookies(aL.from(b12.headers));
                      bq(b12, a12), l4.cookies = aS.seal(a12);
                    }
                    return l4.cookies;
                  }, set cookies(value) {
                    l4.cookies = value;
                  }, get mutableCookies() {
                    if (!l4.mutableCookies) {
                      var m4, n4;
                      let a12, d13 = (m4 = b12.headers, n4 = g12 || (c11 ? k4 : void 0), a12 = new aw.RequestCookies(aL.from(m4)), aU.wrap(a12, n4));
                      bq(b12, d13), l4.mutableCookies = d13;
                    }
                    return l4.mutableCookies;
                  }, get userspaceMutableCookies() {
                    if (!l4.userspaceMutableCookies) {
                      var o3;
                      let a12;
                      o3 = this, l4.userspaceMutableCookies = a12 = new Proxy(o3.mutableCookies, { get(b13, c12, d13) {
                        switch (c12) {
                          case "delete":
                            return function(...c13) {
                              return aV(o3, "cookies().delete"), b13.delete(...c13), a12;
                            };
                          case "set":
                            return function(...c13) {
                              return aV(o3, "cookies().set"), b13.set(...c13), a12;
                            };
                          default:
                            return az.get(b13, c12, d13);
                        }
                      } });
                    }
                    return l4.userspaceMutableCookies;
                  }, get draftMode() {
                    return l4.draftMode || (l4.draftMode = new bp(h12, b12, this.cookies, this.mutableCookies)), l4.draftMode;
                  }, renderResumeDataCache: null, isHmrRefresh: i11, serverComponentsHmrCache: j12 || globalThis.__serverComponentsHmrCache, fallbackParams: null };
                }("action", u2, void 0, h11, {}, l3, j11, k3, false, void 0)), n3 = function({ page: a11, renderOpts: b12, isPrefetchRequest: c11, buildId: d12, deploymentId: e12, previouslyRevalidatedTags: f12, nonce: g12 }) {
                  let h12 = !b12.shouldWaitOnAllReady && !b12.supportsDynamicResponse && !b12.isDraftMode && !b12.isPossibleServerAction, i11 = h12 && (!!process.env.NEXT_DEBUG_BUILD || "1" === process.env.NEXT_SSG_FETCH_METRICS), j12 = { isStaticGeneration: h12, page: a11, route: aJ(a11), incrementalCache: b12.incrementalCache || globalThis.__incrementalCache, cacheLifeProfiles: b12.cacheLifeProfiles, isBuildTimePrerendering: b12.isBuildTimePrerendering, fetchCache: b12.fetchCache, isOnDemandRevalidate: b12.isOnDemandRevalidate, isDraftMode: b12.isDraftMode, isPrefetchRequest: c11, buildId: d12, deploymentId: e12, reactLoadableManifest: (null == b12 ? void 0 : b12.reactLoadableManifest) || {}, assetPrefix: (null == b12 ? void 0 : b12.assetPrefix) || "", nonce: g12, afterContext: function(a12) {
                    let { waitUntil: b13, onClose: c12, onAfterTaskError: d13 } = a12;
                    return new bN({ waitUntil: b13, onClose: c12, onTaskError: d13 });
                  }(b12), cacheComponentsEnabled: b12.cacheComponents, previouslyRevalidatedTags: f12, refreshTagsByCacheKind: function() {
                    let a12 = /* @__PURE__ */ new Map(), b13 = bF();
                    if (b13) for (let [c12, d13] of b13) "refreshTags" in d13 && a12.set(c12, bP(async () => d13.refreshTags()));
                    return a12;
                  }(), runInCleanSnapshot: bL ? bL.snapshot() : function(a12, ...b13) {
                    return a12(...b13);
                  }, shouldTrackFetchMetrics: i11, reactServerErrorsByDigest: /* @__PURE__ */ new Map() };
                  return b12.store = j12, j12;
                }({ page: "/", renderOpts: { cacheLifeProfiles: null == (e11 = a10.request.nextConfig) || null == (d11 = e11.experimental) ? void 0 : d11.cacheLife, cacheComponents: false, experimental: { isRoutePPREnabled: false, authInterrupts: !!(null == (g11 = a10.request.nextConfig) || null == (f11 = g11.experimental) ? void 0 : f11.authInterrupts) }, supportsDynamicResponse: true, waitUntil: b11, onClose: c10.onClose.bind(c10), onAfterTaskError: void 0 }, isPrefetchRequest: "1" === u2.headers.get(aF), buildId: o2 ?? "", deploymentId: false, previouslyRevalidatedTags: [] });
                return await aQ.run(n3, () => br.run(m3, a10.handler, u2, w2));
              } finally {
                setTimeout(() => {
                  c10.dispatchClose();
                }, 0);
              }
            });
          }
          return a10.handler(u2, w2);
        })) && !(h10 instanceof Response)) throw Object.defineProperty(TypeError("Expected an instance of Response to be returned"), "__NEXT_ERROR_CODE", { value: "E567", enumerable: false, configurable: true });
        h10 && i10 && h10.headers.set("set-cookie", i10);
        let x2 = null == h10 ? void 0 : h10.headers.get("x-middleware-rewrite");
        if (h10 && x2 && (r2 || !m2)) {
          let b11 = new av(x2, { forceLocale: true, headers: a10.request.headers, nextConfig: a10.request.nextConfig });
          m2 || b11.host !== u2.nextUrl.host || (b11.buildId = o2 || b11.buildId, h10.headers.set("x-middleware-rewrite", String(b11)));
          let { url: c10, isRelative: g11 } = aE(b11.toString(), n2.toString());
          !m2 && q2 && h10.headers.set("x-nextjs-rewrite", c10);
          let i11 = !g11 && (null == (f10 = a10.request.nextConfig) || null == (e10 = f10.experimental) || null == (d10 = e10.clientParamParsingOrigins) ? void 0 : d10.some((a11) => new RegExp(a11).test(b11.origin)));
          r2 && (g11 || i11) && (n2.pathname !== b11.pathname && h10.headers.set("x-nextjs-rewritten-path", b11.pathname), n2.search !== b11.search && h10.headers.set("x-nextjs-rewritten-query", b11.search.slice(1)));
        }
        if (h10 && x2 && r2 && t2) {
          let a11 = new URL(x2);
          a11.searchParams.has(aH) || (a11.searchParams.set(aH, t2), h10.headers.set("x-middleware-rewrite", a11.toString()));
        }
        let y2 = null == h10 ? void 0 : h10.headers.get("Location");
        if (h10 && y2 && !m2) {
          let b11 = new av(y2, { forceLocale: false, headers: a10.request.headers, nextConfig: a10.request.nextConfig });
          h10 = new Response(h10.body, h10), b11.host === n2.host && (b11.buildId = o2 || b11.buildId, h10.headers.set("Location", aE(b11, n2).url)), q2 && (h10.headers.delete("Location"), h10.headers.set("x-nextjs-redirect", aE(b11.toString(), n2.toString()).url));
        }
        let z2 = h10 || aD.next(), A2 = z2.headers.get("x-middleware-override-headers"), B2 = [];
        if (A2) {
          for (let [a11, b11] of s2) z2.headers.set(`x-middleware-request-${a11}`, b11), B2.push(a11);
          B2.length > 0 && z2.headers.set("x-middleware-override-headers", A2 + "," + B2.join(","));
        }
        return { response: z2, waitUntil: ("internal" === w2[ai].kind ? Promise.all(w2[ai].promises).then(() => {
        }) : void 0) ?? Promise.resolve(), fetchMetrics: u2.fetchMetrics };
      }
      let { env: b1, stdout: b2 } = (null == (F = globalThis) ? void 0 : F.process) ?? {}, b3 = b1 && !b1.NO_COLOR && (b1.FORCE_COLOR || (null == b2 ? void 0 : b2.isTTY) && !b1.CI && "dumb" !== b1.TERM), b4 = (a10, b10, c10, d10) => {
        let e10 = a10.substring(0, d10) + c10, f10 = a10.substring(d10 + b10.length), g10 = f10.indexOf(b10);
        return ~g10 ? e10 + b4(f10, b10, c10, g10) : e10 + f10;
      }, b5 = (a10, b10, c10 = a10) => b3 ? (d10) => {
        let e10 = "" + d10, f10 = e10.indexOf(b10, a10.length);
        return ~f10 ? a10 + b4(e10, b10, c10, f10) + b10 : a10 + e10 + b10;
      } : String, b6 = b5("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m");
      b5("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"), b5("\x1B[3m", "\x1B[23m"), b5("\x1B[4m", "\x1B[24m"), b5("\x1B[7m", "\x1B[27m"), b5("\x1B[8m", "\x1B[28m"), b5("\x1B[9m", "\x1B[29m"), b5("\x1B[30m", "\x1B[39m");
      let b7 = b5("\x1B[31m", "\x1B[39m"), b8 = b5("\x1B[32m", "\x1B[39m"), b9 = b5("\x1B[33m", "\x1B[39m");
      b5("\x1B[34m", "\x1B[39m");
      let ca = b5("\x1B[35m", "\x1B[39m");
      b5("\x1B[38;2;173;127;168m", "\x1B[39m"), b5("\x1B[36m", "\x1B[39m");
      let cb = b5("\x1B[37m", "\x1B[39m");
      b5("\x1B[90m", "\x1B[39m"), b5("\x1B[40m", "\x1B[49m"), b5("\x1B[41m", "\x1B[49m"), b5("\x1B[42m", "\x1B[49m"), b5("\x1B[43m", "\x1B[49m"), b5("\x1B[44m", "\x1B[49m"), b5("\x1B[45m", "\x1B[49m"), b5("\x1B[46m", "\x1B[49m"), b5("\x1B[47m", "\x1B[49m"), cb(b6("\u25CB")), b7(b6("\u2A2F")), b9(b6("\u26A0")), cb(b6(" ")), b8(b6("\u2713")), ca(b6("\xBB")), new by(1e4, (a10) => a10.length), new by(1e4, (a10) => a10.length);
      var cc = ((x = {}).APP_PAGE = "APP_PAGE", x.APP_ROUTE = "APP_ROUTE", x.PAGES = "PAGES", x.FETCH = "FETCH", x.REDIRECT = "REDIRECT", x.IMAGE = "IMAGE", x), cd = ((y = {}).APP_PAGE = "APP_PAGE", y.APP_ROUTE = "APP_ROUTE", y.PAGES = "PAGES", y.FETCH = "FETCH", y.IMAGE = "IMAGE", y);
      function ce() {
      }
      new Uint8Array([60, 104, 116, 109, 108]), new Uint8Array([60, 104, 101, 97, 100]), new Uint8Array([60, 98, 111, 100, 121]), new Uint8Array([60, 47, 104, 101, 97, 100, 62]), new Uint8Array([60, 47, 98, 111, 100, 121, 62]), new Uint8Array([60, 47, 104, 116, 109, 108, 62]), new Uint8Array([60, 47, 98, 111, 100, 121, 62, 60, 47, 104, 116, 109, 108, 62]), new Uint8Array([60, 109, 101, 116, 97, 32, 110, 97, 109, 101, 61, 34, 194, 171, 110, 120, 116, 45, 105, 99, 111, 110, 194, 187, 34]), c(356).Buffer, new TextEncoder(), c(356).Buffer;
      let cf = new TextEncoder();
      function cg(a10) {
        return new ReadableStream({ start(b10) {
          b10.enqueue(cf.encode(a10)), b10.close();
        } });
      }
      function ch(a10) {
        return new ReadableStream({ start(b10) {
          b10.enqueue(a10), b10.close();
        } });
      }
      async function ci(a10, b10) {
        let c10 = new TextDecoder("utf-8", { fatal: true }), d10 = "";
        for await (let e10 of a10) {
          if (null == b10 ? void 0 : b10.aborted) return d10;
          d10 += c10.decode(e10, { stream: true });
        }
        return d10 + c10.decode();
      }
      let cj = "ResponseAborted";
      class ck extends Error {
        constructor(...a10) {
          super(...a10), this.name = cj;
        }
      }
      class cl {
        constructor() {
          let a10, b10;
          this.promise = new Promise((c10, d10) => {
            a10 = c10, b10 = d10;
          }), this.resolve = a10, this.reject = b10;
        }
      }
      let cm = 0, cn = 0, co = 0;
      function cp(a10) {
        return (null == a10 ? void 0 : a10.name) === "AbortError" || (null == a10 ? void 0 : a10.name) === cj;
      }
      async function cq(a10, b10, c10) {
        try {
          let d10, { errored: e10, destroyed: f10 } = b10;
          if (e10 || f10) return;
          let g10 = (d10 = new AbortController(), b10.once("close", () => {
            b10.writableFinished || d10.abort(new ck());
          }), d10), h10 = function(a11, b11) {
            let c11 = false, d11 = new cl();
            function e11() {
              d11.resolve();
            }
            a11.on("drain", e11), a11.once("close", () => {
              a11.off("drain", e11), d11.resolve();
            });
            let f11 = new cl();
            return a11.once("finish", () => {
              f11.resolve();
            }), new WritableStream({ write: async (b12) => {
              if (!c11) {
                if (c11 = true, "performance" in globalThis && process.env.NEXT_OTEL_PERFORMANCE_PREFIX) {
                  let a12 = function(a13 = {}) {
                    let b13 = 0 === cm ? void 0 : { clientComponentLoadStart: cm, clientComponentLoadTimes: cn, clientComponentLoadCount: co };
                    return a13.reset && (cm = 0, cn = 0, co = 0), b13;
                  }();
                  a12 && performance.measure(`${process.env.NEXT_OTEL_PERFORMANCE_PREFIX}:next-client-component-loading`, { start: a12.clientComponentLoadStart, end: a12.clientComponentLoadStart + a12.clientComponentLoadTimes });
                }
                a11.flushHeaders(), bn().trace(aZ.startResponse, { spanName: "start response" }, () => void 0);
              }
              try {
                let c12 = a11.write(b12);
                "flush" in a11 && "function" == typeof a11.flush && a11.flush(), c12 || (await d11.promise, d11 = new cl());
              } catch (b13) {
                throw a11.end(), Object.defineProperty(Error("failed to write chunk to response", { cause: b13 }), "__NEXT_ERROR_CODE", { value: "E321", enumerable: false, configurable: true });
              }
            }, abort: (b12) => {
              a11.writableFinished || a11.destroy(b12);
            }, close: async () => {
              if (b11 && await b11, !a11.writableFinished) return a11.end(), f11.promise;
            } });
          }(b10, c10);
          await a10.pipeTo(h10, { signal: g10.signal });
        } catch (a11) {
          if (cp(a11)) return;
          throw Object.defineProperty(Error("failed to pipe response", { cause: a11 }), "__NEXT_ERROR_CODE", { value: "E180", enumerable: false, configurable: true });
        }
      }
      var cr = c(356).Buffer;
      class cs {
        static #a = this.EMPTY = new cs(null, { metadata: {}, contentType: null });
        static fromStatic(a10, b10) {
          return new cs(a10, { metadata: {}, contentType: b10 });
        }
        constructor(a10, { contentType: b10, waitUntil: c10, metadata: d10 }) {
          this.response = a10, this.contentType = b10, this.metadata = d10, this.waitUntil = c10;
        }
        assignMetadata(a10) {
          Object.assign(this.metadata, a10);
        }
        get isNull() {
          return null === this.response;
        }
        get isDynamic() {
          return "string" != typeof this.response;
        }
        toUnchunkedString(a10 = false) {
          if (null === this.response) return "";
          if ("string" != typeof this.response) {
            if (!a10) throw Object.defineProperty(new bv("dynamic responses cannot be unchunked. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E732", enumerable: false, configurable: true });
            return ci(this.readable);
          }
          return this.response;
        }
        get readable() {
          return null === this.response ? new ReadableStream({ start(a10) {
            a10.close();
          } }) : "string" == typeof this.response ? cg(this.response) : cr.isBuffer(this.response) ? ch(this.response) : Array.isArray(this.response) ? function(...a10) {
            if (0 === a10.length) return new ReadableStream({ start(a11) {
              a11.close();
            } });
            if (1 === a10.length) return a10[0];
            let { readable: b10, writable: c10 } = new TransformStream(), d10 = a10[0].pipeTo(c10, { preventClose: true }), e10 = 1;
            for (; e10 < a10.length - 1; e10++) {
              let b11 = a10[e10];
              d10 = d10.then(() => b11.pipeTo(c10, { preventClose: true }));
            }
            let f10 = a10[e10];
            return (d10 = d10.then(() => f10.pipeTo(c10))).catch(ce), b10;
          }(...this.response) : this.response;
        }
        coerce() {
          return null === this.response ? [] : "string" == typeof this.response ? [cg(this.response)] : Array.isArray(this.response) ? this.response : cr.isBuffer(this.response) ? [ch(this.response)] : [this.response];
        }
        pipeThrough(a10) {
          this.response = this.readable.pipeThrough(a10);
        }
        unshift(a10) {
          this.response = this.coerce(), this.response.unshift(a10);
        }
        push(a10) {
          this.response = this.coerce(), this.response.push(a10);
        }
        async pipeTo(a10) {
          try {
            await this.readable.pipeTo(a10, { preventClose: true }), this.waitUntil && await this.waitUntil, await a10.close();
          } catch (b10) {
            if (cp(b10)) return void await a10.abort(b10);
            throw b10;
          }
        }
        async pipeToNodeResponse(a10) {
          await cq(this.readable, a10, this.waitUntil);
        }
      }
      function ct(a10, b10) {
        if (!a10) return b10;
        let c10 = parseInt(a10, 10);
        return Number.isFinite(c10) && c10 > 0 ? c10 : b10;
      }
      ct(process.env.NEXT_PRIVATE_RESPONSE_CACHE_TTL, 1e4), ct(process.env.NEXT_PRIVATE_RESPONSE_CACHE_MAX_SIZE, 150);
      var cu = c(673), cv = c.n(cu);
      class cw {
        constructor(a10) {
          this.fs = a10, this.tasks = [];
        }
        findOrCreateTask(a10) {
          for (let b11 of this.tasks) if (b11[0] === a10) return b11;
          let b10 = this.fs.mkdir(a10);
          b10.catch(() => {
          });
          let c10 = [a10, b10, []];
          return this.tasks.push(c10), c10;
        }
        append(a10, b10) {
          let c10 = this.findOrCreateTask(cv().dirname(a10)), d10 = c10[1].then(() => this.fs.writeFile(a10, b10));
          d10.catch(() => {
          }), c10[2].push(d10);
        }
        wait() {
          return Promise.all(this.tasks.flatMap((a10) => a10[2]));
        }
      }
      function cx(a10) {
        return (null == a10 ? void 0 : a10.length) || 0;
      }
      class cy {
        static #a = this.debug = !!process.env.NEXT_PRIVATE_DEBUG_CACHE;
        constructor(a10) {
          this.fs = a10.fs, this.flushToDisk = a10.flushToDisk, this.serverDistDir = a10.serverDistDir, this.revalidatedTags = a10.revalidatedTags, a10.maxMemoryCacheSize ? cy.memoryCache ? cy.debug && console.log("FileSystemCache: memory store already initialized") : (cy.debug && console.log("FileSystemCache: using memory store for fetch cache"), cy.memoryCache = function(a11) {
            return e || (e = new by(a11, function({ value: a12 }) {
              var b10, c10;
              if (!a12) return 25;
              if (a12.kind === cc.REDIRECT) return JSON.stringify(a12.props).length;
              if (a12.kind === cc.IMAGE) throw Object.defineProperty(Error("invariant image should not be incremental-cache"), "__NEXT_ERROR_CODE", { value: "E501", enumerable: false, configurable: true });
              if (a12.kind === cc.FETCH) return JSON.stringify(a12.data || "").length;
              if (a12.kind === cc.APP_ROUTE) return a12.body.length;
              return a12.kind === cc.APP_PAGE ? Math.max(1, a12.html.length + cx(a12.rscData) + ((null == (c10 = a12.postponed) ? void 0 : c10.length) || 0) + function(a13) {
                if (!a13) return 0;
                let b11 = 0;
                for (let [c11, d10] of a13) b11 += c11.length + cx(d10);
                return b11;
              }(a12.segmentData)) : a12.html.length + ((null == (b10 = JSON.stringify(a12.pageData)) ? void 0 : b10.length) || 0);
            })), e;
          }(a10.maxMemoryCacheSize)) : cy.debug && console.log("FileSystemCache: not using memory store for fetch cache");
        }
        resetRequestCache() {
        }
        async revalidateTag(a10, b10) {
          if (a10 = "string" == typeof a10 ? [a10] : a10, cy.debug && console.log("FileSystemCache: revalidateTag", a10, b10), 0 === a10.length) return;
          let c10 = Date.now();
          for (let d10 of a10) {
            let a11 = bz.get(d10) || {};
            if (b10) {
              let e10 = { ...a11 };
              e10.stale = c10, void 0 !== b10.expire && (e10.expired = c10 + 1e3 * b10.expire), bz.set(d10, e10);
            } else bz.set(d10, { ...a11, expired: c10 });
          }
        }
        async get(...a10) {
          var b10, c10, d10, e10, f10, g10;
          let [h10, i10] = a10, { kind: j10 } = i10, k2 = null == (b10 = cy.memoryCache) ? void 0 : b10.get(h10);
          if (cy.debug && (j10 === cd.FETCH ? console.log("FileSystemCache: get", h10, i10.tags, j10, !!k2) : console.log("FileSystemCache: get", h10, j10, !!k2)), (null == k2 || null == (c10 = k2.value) ? void 0 : c10.kind) === cc.APP_PAGE || (null == k2 || null == (d10 = k2.value) ? void 0 : d10.kind) === cc.APP_ROUTE || (null == k2 || null == (e10 = k2.value) ? void 0 : e10.kind) === cc.PAGES) {
            let a11 = null == (g10 = k2.value.headers) ? void 0 : g10[_];
            if ("string" == typeof a11) {
              let b11 = a11.split(",");
              if (b11.length > 0 && bA(b11, k2.lastModified)) return cy.debug && console.log("FileSystemCache: expired tags", b11), null;
            }
          } else if ((null == k2 || null == (f10 = k2.value) ? void 0 : f10.kind) === cc.FETCH) {
            let a11 = i10.kind === cd.FETCH ? [...i10.tags || [], ...i10.softTags || []] : [];
            if (a11.some((a12) => this.revalidatedTags.includes(a12))) return cy.debug && console.log("FileSystemCache: was revalidated", a11), null;
            if (bA(a11, k2.lastModified)) return cy.debug && console.log("FileSystemCache: expired tags", a11), null;
          }
          return k2 ?? null;
        }
        async set(a10, b10, c10) {
          var d10;
          if (null == (d10 = cy.memoryCache) || d10.set(a10, { value: b10, lastModified: Date.now() }), cy.debug && console.log("FileSystemCache: set", a10), !this.flushToDisk || !b10) return;
          let e10 = new cw(this.fs);
          if (b10.kind === cc.APP_ROUTE) {
            let c11 = this.getFilePath(`${a10}.body`, cd.APP_ROUTE);
            e10.append(c11, b10.body);
            let d11 = { headers: b10.headers, status: b10.status, postponed: void 0, segmentPaths: void 0, prefetchHints: void 0 };
            e10.append(c11.replace(/\.body$/, $), JSON.stringify(d11, null, 2));
          } else if (b10.kind === cc.PAGES || b10.kind === cc.APP_PAGE) {
            let d11 = b10.kind === cc.APP_PAGE, f10 = this.getFilePath(`${a10}.html`, d11 ? cd.APP_PAGE : cd.PAGES);
            if (e10.append(f10, b10.html), c10.fetchCache || c10.isFallback || c10.isRoutePPREnabled || e10.append(this.getFilePath(`${a10}${d11 ? ".rsc" : ".json"}`, d11 ? cd.APP_PAGE : cd.PAGES), d11 ? b10.rscData : JSON.stringify(b10.pageData)), (null == b10 ? void 0 : b10.kind) === cc.APP_PAGE) {
              let a11;
              if (b10.segmentData) {
                a11 = [];
                let c12 = f10.replace(/\.html$/, ".segments");
                for (let [d12, f11] of b10.segmentData) {
                  a11.push(d12);
                  let b11 = c12 + d12 + ".segment.rsc";
                  e10.append(b11, f11);
                }
              }
              let c11 = { headers: b10.headers, status: b10.status, postponed: b10.postponed, segmentPaths: a11, prefetchHints: void 0 };
              e10.append(f10.replace(/\.html$/, $), JSON.stringify(c11));
            }
          } else if (b10.kind === cc.FETCH) {
            let d11 = this.getFilePath(a10, cd.FETCH);
            e10.append(d11, JSON.stringify({ ...b10, tags: c10.fetchCache ? c10.tags : [] }));
          }
          await e10.wait();
        }
        getFilePath(a10, b10) {
          switch (b10) {
            case cd.FETCH:
              return cv().join(this.serverDistDir, "..", "cache", "fetch-cache", a10);
            case cd.PAGES:
              return cv().join(this.serverDistDir, "pages", a10);
            case cd.IMAGE:
            case cd.APP_PAGE:
            case cd.APP_ROUTE:
              return cv().join(this.serverDistDir, "app", a10);
            default:
              throw Object.defineProperty(Error(`Unexpected file path kind: ${b10}`), "__NEXT_ERROR_CODE", { value: "E479", enumerable: false, configurable: true });
          }
        }
      }
      let cz = ["(..)(..)", "(.)", "(..)", "(...)"], cA = /\/[^/]*\[[^/]+\][^/]*(?=\/|$)/, cB = /\/\[[^/]+\](?=\/|$)/;
      function cC(a10) {
        return a10.replace(/(?:\/index)?\/?$/, "") || "/";
      }
      "u" > typeof performance && ["mark", "measure", "getEntriesByName"].every((a10) => "function" == typeof performance[a10]);
      class cD {
        static #a = this.cacheControls = /* @__PURE__ */ new Map();
        constructor(a10) {
          this.prerenderManifest = a10;
        }
        get(a10) {
          let b10 = cD.cacheControls.get(a10);
          if (b10) return b10;
          let c10 = this.prerenderManifest.routes[a10];
          if (c10) {
            let { initialRevalidateSeconds: a11, initialExpireSeconds: b11 } = c10;
            if (void 0 !== a11) return { revalidate: a11, expire: b11 };
          }
          let d10 = this.prerenderManifest.dynamicRoutes[a10];
          if (d10) {
            let { fallbackRevalidate: a11, fallbackExpire: b11 } = d10;
            if (void 0 !== a11) return { revalidate: a11, expire: b11 };
          }
        }
        set(a10, b10) {
          cD.cacheControls.set(a10, b10);
        }
        clear() {
          cD.cacheControls.clear();
        }
      }
      c(590);
      class cE {
        static #a = this.debug = !!process.env.NEXT_PRIVATE_DEBUG_CACHE;
        constructor({ fs: a10, dev: b10, flushToDisk: c10, minimalMode: d10, serverDistDir: e10, requestHeaders: f10, maxMemoryCacheSize: g10, getPrerenderManifest: h10, fetchCacheKeyPrefix: i10, CurCacheHandler: j10, allowedRevalidateHeaderKeys: k2 }) {
          var l2, m2, n2, o2;
          this.locks = /* @__PURE__ */ new Map(), this.hasCustomCacheHandler = !!j10;
          const p2 = Symbol.for("@next/cache-handlers"), q2 = globalThis;
          if (j10) cE.debug && console.log("IncrementalCache: using custom cache handler", j10.name);
          else {
            const b11 = q2[p2];
            (null == b11 ? void 0 : b11.FetchCache) ? (j10 = b11.FetchCache, cE.debug && console.log("IncrementalCache: using global FetchCache cache handler")) : a10 && e10 && (cE.debug && console.log("IncrementalCache: using filesystem cache handler"), j10 = cy);
          }
          process.env.__NEXT_TEST_MAX_ISR_CACHE && (g10 = parseInt(process.env.__NEXT_TEST_MAX_ISR_CACHE, 10)), this.dev = b10, this.disableForTestmode = "true" === process.env.NEXT_PRIVATE_TEST_PROXY, this.minimalMode = d10, this.requestHeaders = f10, this.allowedRevalidateHeaderKeys = k2, this.prerenderManifest = h10(), this.cacheControls = new cD(this.prerenderManifest), this.fetchCacheKeyPrefix = i10;
          let r2 = [];
          f10[Z] === (null == (m2 = this.prerenderManifest) || null == (l2 = m2.preview) ? void 0 : l2.previewModeId) && (this.isOnDemandRevalidate = true), d10 && (r2 = this.revalidatedTags = function(a11, b11) {
            return "string" == typeof a11[aa] && a11["x-next-revalidate-tag-token"] === b11 ? a11[aa].split(",") : [];
          }(f10, null == (o2 = this.prerenderManifest) || null == (n2 = o2.preview) ? void 0 : n2.previewModeId)), j10 && (this.cacheHandler = new j10({ dev: b10, fs: a10, flushToDisk: c10, serverDistDir: e10, revalidatedTags: r2, maxMemoryCacheSize: g10, _requestHeaders: f10, fetchCacheKeyPrefix: i10 }));
        }
        calculateRevalidate(a10, b10, c10, d10) {
          if (c10) return Math.floor(performance.timeOrigin + performance.now() - 1e3);
          let e10 = this.cacheControls.get(cC(a10)), f10 = e10 ? e10.revalidate : !d10 && 1;
          return "number" == typeof f10 ? 1e3 * f10 + b10 : f10;
        }
        _getPathname(a10, b10) {
          return b10 ? a10 : /^\/index(\/|$)/.test(a10) && !function(a11, b11 = true) {
            return (void 0 !== a11.split("/").find((a12) => cz.find((b12) => a12.startsWith(b12))) && (a11 = function(a12) {
              let b12, c10, d10;
              for (let e10 of a12.split("/")) if (c10 = cz.find((a13) => e10.startsWith(a13))) {
                [b12, d10] = a12.split(c10, 2);
                break;
              }
              if (!b12 || !c10 || !d10) throw Object.defineProperty(Error(`Invalid interception route: ${a12}. Must be in the format /<intercepting route>/(..|...|..)(..)/<intercepted route>`), "__NEXT_ERROR_CODE", { value: "E269", enumerable: false, configurable: true });
              switch (b12 = aJ(b12), c10) {
                case "(.)":
                  d10 = "/" === b12 ? `/${d10}` : b12 + "/" + d10;
                  break;
                case "(..)":
                  if ("/" === b12) throw Object.defineProperty(Error(`Invalid interception route: ${a12}. Cannot use (..) marker at the root level, use (.) instead.`), "__NEXT_ERROR_CODE", { value: "E207", enumerable: false, configurable: true });
                  d10 = b12.split("/").slice(0, -1).concat(d10).join("/");
                  break;
                case "(...)":
                  d10 = "/" + d10;
                  break;
                case "(..)(..)":
                  let e10 = b12.split("/");
                  if (e10.length <= 2) throw Object.defineProperty(Error(`Invalid interception route: ${a12}. Cannot use (..)(..) marker at the root level or one level up.`), "__NEXT_ERROR_CODE", { value: "E486", enumerable: false, configurable: true });
                  d10 = e10.slice(0, -2).concat(d10).join("/");
                  break;
                default:
                  throw Object.defineProperty(Error("Invariant: unexpected marker"), "__NEXT_ERROR_CODE", { value: "E112", enumerable: false, configurable: true });
              }
              return { interceptingRoute: b12, interceptedRoute: d10 };
            }(a11).interceptedRoute), b11) ? cB.test(a11) : cA.test(a11);
          }(a10) ? `/index${a10}` : "/" === a10 ? "/index" : aI(a10);
        }
        resetRequestCache() {
          var a10, b10;
          null == (b10 = this.cacheHandler) || null == (a10 = b10.resetRequestCache) || a10.call(b10);
        }
        async lock(a10) {
          for (; ; ) {
            let b11 = this.locks.get(a10);
            if (cE.debug && console.log("IncrementalCache: lock get", a10, !!b11), !b11) break;
            await b11;
          }
          let { resolve: b10, promise: c10 } = new cl();
          return cE.debug && console.log("IncrementalCache: successfully locked", a10), this.locks.set(a10, c10), () => {
            b10(), this.locks.delete(a10);
          };
        }
        async revalidateTag(a10, b10) {
          var c10;
          return null == (c10 = this.cacheHandler) ? void 0 : c10.revalidateTag(a10, b10);
        }
        async generateCacheKey(a10, b10 = {}) {
          let c10 = [], d10 = new TextEncoder(), e10 = new TextDecoder();
          if (b10.body) if (b10.body instanceof Uint8Array) c10.push(e10.decode(b10.body)), b10._ogBody = b10.body;
          else if ("function" == typeof b10.body.getReader) {
            let a11 = b10.body, f11 = [];
            try {
              await a11.pipeTo(new WritableStream({ write(a12) {
                "string" == typeof a12 ? (f11.push(d10.encode(a12)), c10.push(a12)) : (f11.push(a12), c10.push(e10.decode(a12, { stream: true })));
              } })), c10.push(e10.decode());
              let g11 = f11.reduce((a12, b11) => a12 + b11.length, 0), h11 = new Uint8Array(g11), i10 = 0;
              for (let a12 of f11) h11.set(a12, i10), i10 += a12.length;
              b10._ogBody = h11;
            } catch (a12) {
              console.error("Problem reading body", a12);
            }
          } else if ("function" == typeof b10.body.keys) {
            let a11 = b10.body;
            for (let d11 of (b10._ogBody = b10.body, /* @__PURE__ */ new Set([...a11.keys()]))) {
              let b11 = a11.getAll(d11);
              c10.push(`${d11}=${(await Promise.all(b11.map(async (a12) => "string" == typeof a12 ? a12 : await a12.text()))).join(",")}`);
            }
          } else if ("function" == typeof b10.body.arrayBuffer) {
            let a11 = b10.body, d11 = await a11.arrayBuffer();
            c10.push(await a11.text()), b10._ogBody = new Blob([d11], { type: a11.type });
          } else "string" == typeof b10.body && (c10.push(b10.body), b10._ogBody = b10.body);
          let f10 = "function" == typeof (b10.headers || {}).keys ? Object.fromEntries(b10.headers) : Object.assign({}, b10.headers);
          "traceparent" in f10 && delete f10.traceparent, "tracestate" in f10 && delete f10.tracestate;
          let g10 = JSON.stringify(["v3", this.fetchCacheKeyPrefix || "", a10, b10.method, f10, b10.mode, b10.redirect, b10.credentials, b10.referrer, b10.referrerPolicy, b10.integrity, b10.cache, c10]);
          {
            var h10;
            let a11 = d10.encode(g10);
            return h10 = await crypto.subtle.digest("SHA-256", a11), Array.prototype.map.call(new Uint8Array(h10), (a12) => a12.toString(16).padStart(2, "0")).join("");
          }
        }
        async get(a10, b10) {
          var c10, d10, e10, f10, g10, h10, i10;
          let j10, k2;
          if (b10.kind === cd.FETCH) {
            let c11 = br.getStore(), d11 = c11 ? function(a11) {
              switch (a11.type) {
                case "request":
                case "prerender":
                case "prerender-runtime":
                case "prerender-client":
                case "validation-client":
                  if (a11.renderResumeDataCache) return a11.renderResumeDataCache;
                case "prerender-ppr":
                  return a11.prerenderResumeDataCache ?? null;
                case "cache":
                case "private-cache":
                case "unstable-cache":
                case "prerender-legacy":
                case "generate-static-params":
                  return null;
                default:
                  return a11;
              }
            }(c11) : null;
            if (d11) {
              let c12 = d11.fetch.get(a10);
              if ((null == c12 ? void 0 : c12.kind) === cc.FETCH) {
                let d12 = aQ.getStore();
                if (![...b10.tags || [], ...b10.softTags || []].some((a11) => {
                  var b11, c13;
                  return (null == (b11 = this.revalidatedTags) ? void 0 : b11.includes(a11)) || (null == d12 || null == (c13 = d12.pendingRevalidatedTags) ? void 0 : c13.some((b12) => b12.tag === a11));
                })) return cE.debug && console.log("IncrementalCache: rdc:hit", a10), { isStale: false, value: c12 };
                cE.debug && console.log("IncrementalCache: rdc:revalidated-tag", a10);
              } else cE.debug && console.log("IncrementalCache: rdc:miss", a10);
            } else cE.debug && console.log("IncrementalCache: rdc:no-resume-data");
          }
          if (this.disableForTestmode || this.dev && (b10.kind !== cd.FETCH || "no-cache" === this.requestHeaders["cache-control"])) return null;
          a10 = this._getPathname(a10, b10.kind === cd.FETCH);
          let l2 = await (null == (c10 = this.cacheHandler) ? void 0 : c10.get(a10, b10));
          if (b10.kind === cd.FETCH) {
            if (!l2) return null;
            if ((null == (e10 = l2.value) ? void 0 : e10.kind) !== cc.FETCH) throw Object.defineProperty(new bv(`Expected cached value for cache key ${JSON.stringify(a10)} to be a "FETCH" kind, got ${JSON.stringify(null == (f10 = l2.value) ? void 0 : f10.kind)} instead.`), "__NEXT_ERROR_CODE", { value: "E653", enumerable: false, configurable: true });
            let c11 = aQ.getStore(), d11 = [...b10.tags || [], ...b10.softTags || []];
            if (d11.some((a11) => {
              var b11, d12;
              return (null == (b11 = this.revalidatedTags) ? void 0 : b11.includes(a11)) || (null == c11 || null == (d12 = c11.pendingRevalidatedTags) ? void 0 : d12.some((b12) => b12.tag === a11));
            })) return cE.debug && console.log("IncrementalCache: expired tag", a10), null;
            let g11 = br.getStore();
            if (g11) {
              let b11 = bs(g11);
              b11 && (cE.debug && console.log("IncrementalCache: rdc:set", a10), b11.fetch.set(a10, l2.value));
            }
            let h11 = b10.revalidate || l2.value.revalidate, i11 = (performance.timeOrigin + performance.now() - (l2.lastModified || 0)) / 1e3 > h11, j11 = l2.value.data;
            return bA(d11, l2.lastModified) ? null : (bB(d11, l2.lastModified) && (i11 = true), { isStale: i11, value: { kind: cc.FETCH, data: j11, revalidate: h11 } });
          }
          if ((null == l2 || null == (d10 = l2.value) ? void 0 : d10.kind) === cc.FETCH) throw Object.defineProperty(new bv(`Expected cached value for cache key ${JSON.stringify(a10)} not to be a ${JSON.stringify(b10.kind)} kind, got "FETCH" instead.`), "__NEXT_ERROR_CODE", { value: "E652", enumerable: false, configurable: true });
          let m2 = null, { isFallback: n2 } = b10, o2 = this.cacheControls.get(cC(a10));
          if ((null == l2 ? void 0 : l2.lastModified) === -1) j10 = -1, k2 = -31536e6;
          else {
            let c11 = performance.timeOrigin + performance.now(), d11 = (null == l2 ? void 0 : l2.lastModified) || c11;
            if (void 0 === (j10 = false !== (k2 = this.calculateRevalidate(a10, d11, this.dev ?? false, b10.isFallback)) && k2 < c11 || void 0) && ((null == l2 || null == (g10 = l2.value) ? void 0 : g10.kind) === cc.APP_PAGE || (null == l2 || null == (h10 = l2.value) ? void 0 : h10.kind) === cc.APP_ROUTE)) {
              let a11 = null == (i10 = l2.value.headers) ? void 0 : i10[_];
              if ("string" == typeof a11) {
                let b11 = a11.split(",");
                b11.length > 0 && (bA(b11, d11) ? j10 = -1 : bB(b11, d11) && (j10 = true));
              }
            }
          }
          return l2 && (m2 = { isStale: j10, cacheControl: o2, revalidateAfter: k2, value: l2.value, isFallback: n2 }), !l2 && this.prerenderManifest.notFoundRoutes.includes(a10) && (m2 = { isStale: j10, value: null, cacheControl: o2, revalidateAfter: k2, isFallback: n2 }, this.set(a10, m2.value, { ...b10, cacheControl: o2 })), m2;
        }
        async set(a10, b10, c10) {
          if ((null == b10 ? void 0 : b10.kind) === cc.FETCH) {
            let c11 = br.getStore(), d11 = c11 ? bs(c11) : null;
            d11 && (cE.debug && console.log("IncrementalCache: rdc:set", a10), d11.fetch.set(a10, b10));
          }
          if (this.disableForTestmode || this.dev && !c10.fetchCache) return;
          a10 = this._getPathname(a10, c10.fetchCache);
          let d10 = JSON.stringify(b10).length;
          if (c10.fetchCache && d10 > 2097152 && !this.hasCustomCacheHandler && !c10.isImplicitBuildTimeCache) {
            let b11 = `Failed to set Next.js data cache for ${c10.fetchUrl || a10}, items over 2MB can not be cached (${d10} bytes)`;
            if (this.dev) throw Object.defineProperty(Error(b11), "__NEXT_ERROR_CODE", { value: "E1003", enumerable: false, configurable: true });
            console.warn(b11);
            return;
          }
          try {
            var e10;
            !c10.fetchCache && c10.cacheControl && this.cacheControls.set(cC(a10), c10.cacheControl), await (null == (e10 = this.cacheHandler) ? void 0 : e10.set(a10, b10, c10));
          } catch (b11) {
            console.warn("Failed to update prerender cache for", a10, b11);
          }
        }
      }
      let cF = "8.55.2", cG = globalThis;
      function cH(a10, b10, c10) {
        let d10 = c10 || cG, e10 = d10.__SENTRY__ = d10.__SENTRY__ || {}, f10 = e10[cF] = e10[cF] || {};
        return f10[a10] || (f10[a10] = b10());
      }
      function cI() {
        return cJ(cG), cG;
      }
      function cJ(a10) {
        let b10 = a10.__SENTRY__ = a10.__SENTRY__ || {};
        return b10.version = b10.version || cF, b10[cF] = b10[cF] || {};
      }
      function cK() {
        return Date.now() / 1e3;
      }
      let cL = function() {
        let { performance: a10 } = cG;
        if (!a10 || !a10.now) return cK;
        let b10 = Date.now() - a10.now(), c10 = void 0 == a10.timeOrigin ? b10 : a10.timeOrigin;
        return () => (c10 + a10.now()) / 1e3;
      }();
      function cM() {
        let a10 = cG.crypto || cG.msCrypto, b10 = () => 16 * Math.random();
        try {
          if (a10 && a10.randomUUID) return a10.randomUUID().replace(/-/g, "");
          a10 && a10.getRandomValues && (b10 = () => {
            let b11 = new Uint8Array(1);
            return a10.getRandomValues(b11), b11[0];
          });
        } catch (a11) {
        }
        return "10000000100040008000100000000000".replace(/[018]/g, (a11) => (a11 ^ (15 & b10()) >> a11 / 4).toString(16));
      }
      (() => {
        let { performance: a10 } = cG;
        if (!a10 || !a10.now) return;
        let b10 = a10.now(), c10 = Date.now(), d10 = a10.timeOrigin ? Math.abs(a10.timeOrigin + b10 - c10) : 36e5, e10 = a10.timing && a10.timing.navigationStart, f10 = "number" == typeof e10 ? Math.abs(e10 + b10 - c10) : 36e5;
        if ((d10 < 36e5 || f10 < 36e5) && d10 <= f10) return a10.timeOrigin;
      })();
      let cN = Object.prototype.toString;
      function cO(a10, b10) {
        return cN.call(a10) === `[object ${b10}]`;
      }
      function cP(a10) {
        return cO(a10, "Object");
      }
      function cQ(a10) {
        return !!(a10 && a10.then && "function" == typeof a10.then);
      }
      let cR = ["debug", "info", "warn", "error", "log", "assert", "trace"], cS = {}, cT = cH("logger", function() {
        let a10 = false, b10 = { enable: () => {
          a10 = true;
        }, disable: () => {
          a10 = false;
        }, isEnabled: () => a10 };
        return cR.forEach((a11) => {
          b10[a11] = () => void 0;
        }), b10;
      });
      function cU() {
        return cM().substring(16);
      }
      function cV(a10, b10, c10) {
        try {
          Object.defineProperty(a10, b10, { value: c10, writable: true, configurable: true });
        } catch (a11) {
        }
      }
      function cW(a10) {
        return function a11(b10, c10) {
          if (function(a12) {
            if (!cP(a12)) return false;
            try {
              let b11 = Object.getPrototypeOf(a12).constructor.name;
              return !b11 || "Object" === b11;
            } catch (a13) {
              return true;
            }
          }(b10)) {
            let d10 = c10.get(b10);
            if (void 0 !== d10) return d10;
            let e10 = {};
            for (let d11 of (c10.set(b10, e10), Object.getOwnPropertyNames(b10))) void 0 !== b10[d11] && (e10[d11] = a11(b10[d11], c10));
            return e10;
          }
          if (Array.isArray(b10)) {
            let d10 = c10.get(b10);
            if (void 0 !== d10) return d10;
            let e10 = [];
            return c10.set(b10, e10), b10.forEach((b11) => {
              e10.push(a11(b11, c10));
            }), e10;
          }
          return b10;
        }(a10, /* @__PURE__ */ new Map());
      }
      let cX = "_sentrySpan";
      function cY(a10, b10) {
        b10 ? cV(a10, cX, b10) : delete a10[cX];
      }
      class cZ {
        constructor() {
          this._notifyingListeners = false, this._scopeListeners = [], this._eventProcessors = [], this._breadcrumbs = [], this._attachments = [], this._user = {}, this._tags = {}, this._extra = {}, this._contexts = {}, this._sdkProcessingMetadata = {}, this._propagationContext = { traceId: cM(), spanId: cU() };
        }
        clone() {
          let a10 = new cZ();
          return a10._breadcrumbs = [...this._breadcrumbs], a10._tags = { ...this._tags }, a10._extra = { ...this._extra }, a10._contexts = { ...this._contexts }, this._contexts.flags && (a10._contexts.flags = { values: [...this._contexts.flags.values] }), a10._user = this._user, a10._level = this._level, a10._session = this._session, a10._transactionName = this._transactionName, a10._fingerprint = this._fingerprint, a10._eventProcessors = [...this._eventProcessors], a10._requestSession = this._requestSession, a10._attachments = [...this._attachments], a10._sdkProcessingMetadata = { ...this._sdkProcessingMetadata }, a10._propagationContext = { ...this._propagationContext }, a10._client = this._client, a10._lastEventId = this._lastEventId, cY(a10, this[cX]), a10;
        }
        setClient(a10) {
          this._client = a10;
        }
        setLastEventId(a10) {
          this._lastEventId = a10;
        }
        getClient() {
          return this._client;
        }
        lastEventId() {
          return this._lastEventId;
        }
        addScopeListener(a10) {
          this._scopeListeners.push(a10);
        }
        addEventProcessor(a10) {
          return this._eventProcessors.push(a10), this;
        }
        setUser(a10) {
          return this._user = a10 || { email: void 0, id: void 0, ip_address: void 0, username: void 0 }, this._session && function(a11, b10 = {}) {
            if (b10.user && (!a11.ipAddress && b10.user.ip_address && (a11.ipAddress = b10.user.ip_address), a11.did || b10.did || (a11.did = b10.user.id || b10.user.email || b10.user.username)), a11.timestamp = b10.timestamp || cL(), b10.abnormal_mechanism && (a11.abnormal_mechanism = b10.abnormal_mechanism), b10.ignoreDuration && (a11.ignoreDuration = b10.ignoreDuration), b10.sid && (a11.sid = 32 === b10.sid.length ? b10.sid : cM()), void 0 !== b10.init && (a11.init = b10.init), !a11.did && b10.did && (a11.did = `${b10.did}`), "number" == typeof b10.started && (a11.started = b10.started), a11.ignoreDuration) a11.duration = void 0;
            else if ("number" == typeof b10.duration) a11.duration = b10.duration;
            else {
              let b11 = a11.timestamp - a11.started;
              a11.duration = b11 >= 0 ? b11 : 0;
            }
            b10.release && (a11.release = b10.release), b10.environment && (a11.environment = b10.environment), !a11.ipAddress && b10.ipAddress && (a11.ipAddress = b10.ipAddress), !a11.userAgent && b10.userAgent && (a11.userAgent = b10.userAgent), "number" == typeof b10.errors && (a11.errors = b10.errors), b10.status && (a11.status = b10.status);
          }(this._session, { user: a10 }), this._notifyScopeListeners(), this;
        }
        getUser() {
          return this._user;
        }
        getRequestSession() {
          return this._requestSession;
        }
        setRequestSession(a10) {
          return this._requestSession = a10, this;
        }
        setTags(a10) {
          return this._tags = { ...this._tags, ...a10 }, this._notifyScopeListeners(), this;
        }
        setTag(a10, b10) {
          return this._tags = { ...this._tags, [a10]: b10 }, this._notifyScopeListeners(), this;
        }
        setExtras(a10) {
          return this._extra = { ...this._extra, ...a10 }, this._notifyScopeListeners(), this;
        }
        setExtra(a10, b10) {
          return this._extra = { ...this._extra, [a10]: b10 }, this._notifyScopeListeners(), this;
        }
        setFingerprint(a10) {
          return this._fingerprint = a10, this._notifyScopeListeners(), this;
        }
        setLevel(a10) {
          return this._level = a10, this._notifyScopeListeners(), this;
        }
        setTransactionName(a10) {
          return this._transactionName = a10, this._notifyScopeListeners(), this;
        }
        setContext(a10, b10) {
          return null === b10 ? delete this._contexts[a10] : this._contexts[a10] = b10, this._notifyScopeListeners(), this;
        }
        setSession(a10) {
          return a10 ? this._session = a10 : delete this._session, this._notifyScopeListeners(), this;
        }
        getSession() {
          return this._session;
        }
        update(a10) {
          if (!a10) return this;
          let b10 = "function" == typeof a10 ? a10(this) : a10, [c10, d10] = b10 instanceof c$ ? [b10.getScopeData(), b10.getRequestSession()] : cP(b10) ? [a10, a10.requestSession] : [], { tags: e10, extra: f10, user: g10, contexts: h10, level: i10, fingerprint: j10 = [], propagationContext: k2 } = c10 || {};
          return this._tags = { ...this._tags, ...e10 }, this._extra = { ...this._extra, ...f10 }, this._contexts = { ...this._contexts, ...h10 }, g10 && Object.keys(g10).length && (this._user = g10), i10 && (this._level = i10), j10.length && (this._fingerprint = j10), k2 && (this._propagationContext = k2), d10 && (this._requestSession = d10), this;
        }
        clear() {
          return this._breadcrumbs = [], this._tags = {}, this._extra = {}, this._user = {}, this._contexts = {}, this._level = void 0, this._transactionName = void 0, this._fingerprint = void 0, this._requestSession = void 0, this._session = void 0, cY(this, void 0), this._attachments = [], this.setPropagationContext({ traceId: cM() }), this._notifyScopeListeners(), this;
        }
        addBreadcrumb(a10, b10) {
          let c10 = "number" == typeof b10 ? b10 : 100;
          if (c10 <= 0) return this;
          let d10 = { timestamp: cK(), ...a10 };
          return this._breadcrumbs.push(d10), this._breadcrumbs.length > c10 && (this._breadcrumbs = this._breadcrumbs.slice(-c10), this._client && this._client.recordDroppedEvent("buffer_overflow", "log_item")), this._notifyScopeListeners(), this;
        }
        getLastBreadcrumb() {
          return this._breadcrumbs[this._breadcrumbs.length - 1];
        }
        clearBreadcrumbs() {
          return this._breadcrumbs = [], this._notifyScopeListeners(), this;
        }
        addAttachment(a10) {
          return this._attachments.push(a10), this;
        }
        clearAttachments() {
          return this._attachments = [], this;
        }
        getScopeData() {
          return { breadcrumbs: this._breadcrumbs, attachments: this._attachments, contexts: this._contexts, tags: this._tags, extra: this._extra, user: this._user, level: this._level, fingerprint: this._fingerprint || [], eventProcessors: this._eventProcessors, propagationContext: this._propagationContext, sdkProcessingMetadata: this._sdkProcessingMetadata, transactionName: this._transactionName, span: this[cX] };
        }
        setSDKProcessingMetadata(a10) {
          return this._sdkProcessingMetadata = function a11(b10, c10, d10 = 2) {
            if (!c10 || "object" != typeof c10 || d10 <= 0) return c10;
            if (b10 && c10 && 0 === Object.keys(c10).length) return b10;
            let e10 = { ...b10 };
            for (let b11 in c10) Object.prototype.hasOwnProperty.call(c10, b11) && (e10[b11] = a11(e10[b11], c10[b11], d10 - 1));
            return e10;
          }(this._sdkProcessingMetadata, a10, 2), this;
        }
        setPropagationContext(a10) {
          return this._propagationContext = { spanId: cU(), ...a10 }, this;
        }
        getPropagationContext() {
          return this._propagationContext;
        }
        captureException(a10, b10) {
          let c10 = b10 && b10.event_id ? b10.event_id : cM();
          if (!this._client) return cT.warn("No client configured on scope - will not capture exception!"), c10;
          let d10 = Error("Sentry syntheticException");
          return this._client.captureException(a10, { originalException: a10, syntheticException: d10, ...b10, event_id: c10 }, this), c10;
        }
        captureMessage(a10, b10, c10) {
          let d10 = c10 && c10.event_id ? c10.event_id : cM();
          if (!this._client) return cT.warn("No client configured on scope - will not capture message!"), d10;
          let e10 = Error(a10);
          return this._client.captureMessage(a10, b10, { originalException: a10, syntheticException: e10, ...c10, event_id: d10 }, this), d10;
        }
        captureEvent(a10, b10) {
          let c10 = b10 && b10.event_id ? b10.event_id : cM();
          return this._client ? this._client.captureEvent(a10, { ...b10, event_id: c10 }, this) : cT.warn("No client configured on scope - will not capture event!"), c10;
        }
        _notifyScopeListeners() {
          this._notifyingListeners || (this._notifyingListeners = true, this._scopeListeners.forEach((a10) => {
            a10(this);
          }), this._notifyingListeners = false);
        }
      }
      let c$ = cZ;
      class c_ {
        constructor(a10, b10) {
          let c10, d10;
          c10 = a10 || new c$(), d10 = b10 || new c$(), this._stack = [{ scope: c10 }], this._isolationScope = d10;
        }
        withScope(a10) {
          let b10, c10 = this._pushScope();
          try {
            b10 = a10(c10);
          } catch (a11) {
            throw this._popScope(), a11;
          }
          return cQ(b10) ? b10.then((a11) => (this._popScope(), a11), (a11) => {
            throw this._popScope(), a11;
          }) : (this._popScope(), b10);
        }
        getClient() {
          return this.getStackTop().client;
        }
        getScope() {
          return this.getStackTop().scope;
        }
        getIsolationScope() {
          return this._isolationScope;
        }
        getStackTop() {
          return this._stack[this._stack.length - 1];
        }
        _pushScope() {
          let a10 = this.getScope().clone();
          return this._stack.push({ client: this.getClient(), scope: a10 }), a10;
        }
        _popScope() {
          return !(this._stack.length <= 1) && !!this._stack.pop();
        }
      }
      function c0() {
        let a10 = cJ(cI());
        return a10.stack = a10.stack || new c_(cH("defaultCurrentScope", () => new c$()), cH("defaultIsolationScope", () => new c$()));
      }
      function c1(a10) {
        return c0().withScope(a10);
      }
      function c2(a10, b10) {
        let c10 = c0();
        return c10.withScope(() => (c10.getStackTop().scope = a10, b10(a10)));
      }
      function c3(a10) {
        return c0().withScope(() => a10(c0().getIsolationScope()));
      }
      function c4(a10) {
        let b10 = cJ(a10);
        return b10.acs ? b10.acs : { withIsolationScope: c3, withScope: c1, withSetScope: c2, withSetIsolationScope: (a11, b11) => c3(b11), getCurrentScope: () => c0().getScope(), getIsolationScope: () => c0().getIsolationScope() };
      }
      function c5() {
        return c4(cI()).getCurrentScope();
      }
      function c6() {
        return c4(cI()).getIsolationScope();
      }
      function c7(...a10) {
        let b10 = c4(cI());
        if (2 === a10.length) {
          let [c10, d10] = a10;
          return c10 ? b10.withSetScope(c10, d10) : b10.withScope(d10);
        }
        return b10.withScope(a10[0]);
      }
      function c8() {
        return c5().getClient();
      }
      function c9(a10) {
        let b10 = a10._sentryMetrics;
        if (!b10) return;
        let c10 = {};
        for (let [, [a11, d10]] of b10) (c10[a11] || (c10[a11] = [])).push(cW(d10));
        return c10;
      }
      let da = "sentry.source", db = "sentry.sample_rate", dc = "sentry.op", dd = "sentry.origin", de = "sentry.custom_span_name", df = false;
      function dg(a10) {
        return "number" == typeof a10 ? dh(a10) : Array.isArray(a10) ? a10[0] + a10[1] / 1e9 : a10 instanceof Date ? dh(a10.getTime()) : cL();
      }
      function dh(a10) {
        return a10 > 9999999999 ? a10 / 1e3 : a10;
      }
      function di(a10) {
        if ("function" == typeof a10.getSpanJSON) return a10.getSpanJSON();
        try {
          var b10;
          let { spanId: c10, traceId: d10 } = a10.spanContext();
          if ((b10 = a10).attributes && b10.startTime && b10.name && b10.endTime && b10.status) {
            let { attributes: b11, startTime: e10, name: f10, endTime: g10, parentSpanId: h10, status: i10 } = a10;
            return cW({ span_id: c10, trace_id: d10, data: b11, description: f10, parent_span_id: h10, start_timestamp: dg(e10), timestamp: dg(g10) || void 0, status: dk(i10), op: b11[dc], origin: b11[dd], _metrics_summary: c9(a10) });
          }
          return { span_id: c10, trace_id: d10 };
        } catch (a11) {
          return {};
        }
      }
      function dj(a10) {
        let { traceFlags: b10 } = a10.spanContext();
        return 1 === b10;
      }
      function dk(a10) {
        if (a10 && 0 !== a10.code) return 1 === a10.code ? "ok" : a10.message || "unknown_error";
      }
      let dl = "_sentryChildSpans", dm = "_sentryRootSpan";
      function dn(a10, b10) {
        let c10 = a10[dm] || a10;
        cV(b10, dm, c10), a10[dl] ? a10[dl].add(b10) : cV(a10, dl, /* @__PURE__ */ new Set([b10]));
      }
      function dp(a10) {
        return a10[dm] || a10;
      }
      let dq = "_sentryScope", dr = "_sentryIsolationScope";
      function ds(a10, b10, c10) {
        a10 && (cV(a10, dr, c10), cV(a10, dq, b10));
      }
      function dt(a10) {
        return { scope: a10[dq], isolationScope: a10[dr] };
      }
      function du(a10, b10, c10 = () => {
      }) {
        var d10, e10, f10;
        let g10;
        try {
          g10 = a10();
        } catch (a11) {
          throw b10(a11), c10(), a11;
        }
        return d10 = g10, e10 = b10, f10 = c10, cQ(d10) ? d10.then((a11) => (f10(), a11), (a11) => {
          throw e10(a11), f10(), a11;
        }) : (f10(), d10);
      }
      function dv(a10) {
        if ("boolean" == typeof __SENTRY_TRACING__ && !__SENTRY_TRACING__) return false;
        let b10 = c8(), c10 = a10 || b10 && b10.getOptions();
        return !!c10 && (c10.enableTracing || "tracesSampleRate" in c10 || "tracesSampler" in c10);
      }
      let dw = /^sentry-/;
      function dx(a10) {
        return a10.split(",").map((a11) => a11.split("=").map((a12) => decodeURIComponent(a12.trim()))).reduce((a11, [b10, c10]) => (b10 && c10 && (a11[b10] = c10), a11), {});
      }
      let dy = "_frozenDsc";
      function dz(a10) {
        let b10 = c8();
        if (!b10) return {};
        let c10 = dp(a10), d10 = c10[dy];
        if (d10) return d10;
        let e10 = c10.spanContext().traceState, f10 = e10 && e10.get("sentry.dsc"), g10 = f10 && function(a11) {
          let b11 = function(a12) {
            if (a12 && (cO(a12, "String") || Array.isArray(a12))) return Array.isArray(a12) ? a12.reduce((a13, b12) => (Object.entries(dx(b12)).forEach(([b13, c12]) => {
              a13[b13] = c12;
            }), a13), {}) : dx(a12);
          }(a11);
          if (!b11) return;
          let c11 = Object.entries(b11).reduce((a12, [b12, c12]) => (b12.match(dw) && (a12[b12.slice(7)] = c12), a12), {});
          return Object.keys(c11).length > 0 ? c11 : void 0;
        }(f10);
        if (g10) return g10;
        let h10 = function(a11, b11) {
          let c11 = b11.getOptions(), { publicKey: d11 } = b11.getDsn() || {}, e11 = cW({ environment: c11.environment || "production", release: c11.release, public_key: d11, trace_id: a11 });
          return b11.emit("createDsc", e11), e11;
        }(a10.spanContext().traceId, b10), i10 = di(c10), j10 = i10.data || {}, k2 = j10[db];
        null != k2 && (h10.sample_rate = `${k2}`);
        let l2 = j10[da], m2 = i10.description;
        return "url" !== l2 && m2 && (h10.transaction = m2), dv() && (h10.sampled = String(dj(c10))), b10.emit("createDsc", h10, c10), h10;
      }
      class dA {
        constructor(a10 = {}) {
          this._traceId = a10.traceId || cM(), this._spanId = a10.spanId || cU();
        }
        spanContext() {
          return { spanId: this._spanId, traceId: this._traceId, traceFlags: 0 };
        }
        end(a10) {
        }
        setAttribute(a10, b10) {
          return this;
        }
        setAttributes(a10) {
          return this;
        }
        setStatus(a10) {
          return this;
        }
        updateName(a10) {
          return this;
        }
        isRecording() {
          return false;
        }
        addEvent(a10, b10, c10) {
          return this;
        }
        addLink(a10) {
          return this;
        }
        addLinks(a10) {
          return this;
        }
        recordException(a10, b10) {
        }
      }
      function dB(a10) {
        if (!a10 || 0 === a10.length) return;
        let b10 = {};
        return a10.forEach((a11) => {
          let c10 = a11.attributes || {}, d10 = c10["sentry.measurement_unit"], e10 = c10["sentry.measurement_value"];
          "string" == typeof d10 && "number" == typeof e10 && (b10[a11.name] = { value: e10, unit: d10 });
        }), b10;
      }
      class dC {
        constructor(a10 = {}) {
          this._traceId = a10.traceId || cM(), this._spanId = a10.spanId || cU(), this._startTime = a10.startTimestamp || cL(), this._attributes = {}, this.setAttributes({ [dd]: "manual", [dc]: a10.op, ...a10.attributes }), this._name = a10.name, a10.parentSpanId && (this._parentSpanId = a10.parentSpanId), "sampled" in a10 && (this._sampled = a10.sampled), a10.endTimestamp && (this._endTime = a10.endTimestamp), this._events = [], this._isStandaloneSpan = a10.isStandalone, this._endTime && this._onSpanEnded();
        }
        addLink(a10) {
          return this;
        }
        addLinks(a10) {
          return this;
        }
        recordException(a10, b10) {
        }
        spanContext() {
          let { _spanId: a10, _traceId: b10, _sampled: c10 } = this;
          return { spanId: a10, traceId: b10, traceFlags: +!!c10 };
        }
        setAttribute(a10, b10) {
          return void 0 === b10 ? delete this._attributes[a10] : this._attributes[a10] = b10, this;
        }
        setAttributes(a10) {
          return Object.keys(a10).forEach((b10) => this.setAttribute(b10, a10[b10])), this;
        }
        updateStartTime(a10) {
          this._startTime = dg(a10);
        }
        setStatus(a10) {
          return this._status = a10, this;
        }
        updateName(a10) {
          return this._name = a10, this.setAttribute(da, "custom"), this;
        }
        end(a10) {
          this._endTime || (this._endTime = dg(a10), this._onSpanEnded());
        }
        getSpanJSON() {
          return cW({ data: this._attributes, description: this._name, op: this._attributes[dc], parent_span_id: this._parentSpanId, span_id: this._spanId, start_timestamp: this._startTime, status: dk(this._status), timestamp: this._endTime, trace_id: this._traceId, origin: this._attributes[dd], _metrics_summary: c9(this), profile_id: this._attributes["sentry.profile_id"], exclusive_time: this._attributes["sentry.exclusive_time"], measurements: dB(this._events), is_segment: this._isStandaloneSpan && dp(this) === this || void 0, segment_id: this._isStandaloneSpan ? dp(this).spanContext().spanId : void 0 });
        }
        isRecording() {
          return !this._endTime && !!this._sampled;
        }
        addEvent(a10, b10, c10) {
          let d10 = dD(b10) ? b10 : c10 || cL(), e10 = dD(b10) ? {} : b10 || {}, f10 = { name: a10, time: dg(d10), attributes: e10 };
          return this._events.push(f10), this;
        }
        isStandaloneSpan() {
          return !!this._isStandaloneSpan;
        }
        _onSpanEnded() {
          let a10 = c8();
          if (a10 && a10.emit("spanEnd", this), !(this._isStandaloneSpan || this === dp(this))) return;
          if (this._isStandaloneSpan) return void (this._sampled ? function(a11) {
            let b11 = c8();
            if (!b11) return;
            let c10 = a11[1];
            c10 && 0 !== c10.length ? b11.sendEnvelope(a11) : b11.recordDroppedEvent("before_send", "span");
          }(function(a11, b11) {
            let c10 = dz(a11[0]), d10 = b11 && b11.getDsn(), e10 = b11 && b11.getOptions().tunnel, f10 = { sent_at: (/* @__PURE__ */ new Date()).toISOString(), ...!!c10.trace_id && !!c10.public_key && { trace: c10 }, ...!!e10 && d10 && { dsn: function(a12, b12 = false) {
              let { host: c11, path: d11, pass: e11, port: f11, projectId: g11, protocol: h11, publicKey: i11 } = a12;
              return `${h11}://${i11}${b12 && e11 ? `:${e11}` : ""}@${c11}${f11 ? `:${f11}` : ""}/${d11 ? `${d11}/` : d11}${g11}`;
            }(d10) } }, g10 = b11 && b11.getOptions().beforeSendSpan, h10 = g10 ? (a12) => {
              let b12 = g10(di(a12));
              return !b12 && (df || (function(a13) {
                if (!("console" in cG)) return a13();
                let b13 = cG.console, c11 = {}, d11 = Object.keys(cS);
                d11.forEach((a14) => {
                  let d12 = cS[a14];
                  c11[a14] = b13[a14], b13[a14] = d12;
                });
                try {
                  return a13();
                } finally {
                  d11.forEach((a14) => {
                    b13[a14] = c11[a14];
                  });
                }
              }(() => {
                console.warn("[Sentry] Deprecation warning: Returning null from `beforeSendSpan` will be disallowed from SDK version 9.0.0 onwards. The callback will only support mutating spans. To drop certain spans, configure the respective integrations directly.");
              }), df = true)), b12;
            } : (a12) => di(a12), i10 = [];
            for (let b12 of a11) {
              let a12 = h10(b12);
              a12 && i10.push([{ type: "span" }, a12]);
            }
            return /* @__PURE__ */ function(a12, b12 = []) {
              return [a12, b12];
            }(f10, i10);
          }([this], a10)) : a10 && a10.recordDroppedEvent("sample_rate", "span"));
          let b10 = this._convertSpanToTransaction();
          b10 && (dt(this).scope || c5()).captureEvent(b10);
        }
        _convertSpanToTransaction() {
          let a10;
          if (!dE(di(this))) return;
          this._name || (this._name = "<unlabeled transaction>");
          let { scope: b10, isolationScope: c10 } = dt(this), d10 = (b10 || c5()).getClient() || c8();
          if (true !== this._sampled) {
            d10 && d10.recordDroppedEvent("sample_rate", "transaction");
            return;
          }
          let e10 = (a10 = /* @__PURE__ */ new Set(), !function b11(c11) {
            if (!a10.has(c11) && dj(c11)) for (let d11 of (a10.add(c11), c11[dl] ? Array.from(c11[dl]) : [])) b11(d11);
          }(this), Array.from(a10)).filter((a11) => {
            var b11;
            return a11 !== this && !((b11 = a11) instanceof dC && b11.isStandaloneSpan());
          }).map((a11) => di(a11)).filter(dE), f10 = this._attributes[da];
          delete this._attributes[de], e10.forEach((a11) => {
            a11.data && delete a11.data[de];
          });
          let g10 = { contexts: { trace: function(a11) {
            let { spanId: b11, traceId: c11 } = a11.spanContext(), { data: d11, op: e11, parent_span_id: f11, status: g11, origin: h11 } = di(a11);
            return cW({ parent_span_id: f11, span_id: b11, trace_id: c11, data: d11, op: e11, status: g11, origin: h11 });
          }(this) }, spans: e10.length > 1e3 ? e10.sort((a11, b11) => a11.start_timestamp - b11.start_timestamp).slice(0, 1e3) : e10, start_timestamp: this._startTime, timestamp: this._endTime, transaction: this._name, type: "transaction", sdkProcessingMetadata: { capturedSpanScope: b10, capturedSpanIsolationScope: c10, ...cW({ dynamicSamplingContext: dz(this) }) }, _metrics_summary: c9(this), ...f10 && { transaction_info: { source: f10 } } }, h10 = dB(this._events);
          return h10 && Object.keys(h10).length && (g10.measurements = h10), g10;
        }
      }
      function dD(a10) {
        return a10 && "number" == typeof a10 || a10 instanceof Date || Array.isArray(a10);
      }
      function dE(a10) {
        return !!a10.start_timestamp && !!a10.timestamp && !!a10.span_id && !!a10.trace_id;
      }
      let dF = "__SENTRY_SUPPRESS_TRACING__";
      function dG(a10, b10, c10) {
        let d10 = c8(), e10 = d10 && d10.getOptions() || {}, { name: f10 = "", attributes: g10 } = a10, [h10, i10] = b10.getScopeData().sdkProcessingMetadata[dF] ? [false] : function(a11, b11) {
          if (!dv(a11)) return [false];
          let c11 = c6().getScopeData().sdkProcessingMetadata.normalizedRequest, d11 = { ...b11, normalizedRequest: b11.normalizedRequest || c11 }, e11 = function(a12) {
            if ("boolean" == typeof a12) return Number(a12);
            let b12 = "string" == typeof a12 ? parseFloat(a12) : a12;
            if (!("number" != typeof b12 || isNaN(b12)) && !(b12 < 0) && !(b12 > 1)) return b12;
          }("function" == typeof a11.tracesSampler ? a11.tracesSampler(d11) : void 0 !== d11.parentSampled ? d11.parentSampled : void 0 !== a11.tracesSampleRate ? a11.tracesSampleRate : 1);
          return void 0 === e11 ? [false] : e11 && Math.random() < e11 ? [true, e11] : [false, e11];
        }(e10, { name: f10, parentSampled: c10, attributes: g10, transactionContext: { name: f10, parentSampled: c10 } }), j10 = new dC({ ...a10, attributes: { [da]: "custom", ...a10.attributes }, sampled: h10 });
        return void 0 !== i10 && j10.setAttribute(db, i10), d10 && d10.emit("spanStart", j10), j10;
      }
      let dH = ["user", "level", "extra", "contexts", "tags", "fingerprint", "requestSession", "propagationContext"];
      async function dI(a10) {
        let b10 = c8();
        return b10 ? b10.flush(a10) : Promise.resolve(false);
      }
      async function dJ() {
        try {
          await dI(2e3);
        } catch (a10) {
        }
      }
      function dK(a10) {
        return new Proxy(a10, { apply: async (a11, b10, c10) => function(...a12) {
          let b11 = c4(cI());
          if (2 === a12.length) {
            let [c11, d10] = a12;
            return c11 ? b11.withSetIsolationScope(c11, d10) : b11.withIsolationScope(d10);
          }
          return b11.withIsolationScope(a12[0]);
        }((d10) => {
          let e10, f10, g10, h10 = c10[0], i10 = c5();
          if (h10 instanceof Request) {
            let a12;
            d10.setSDKProcessingMetadata({ normalizedRequest: (a12 = function(a13) {
              let b11 = {};
              try {
                a13.forEach((a14, c11) => {
                  "string" == typeof a14 && (b11[c11] = a14);
                });
              } catch (a14) {
              }
              return b11;
            }(h10.headers), { method: h10.method, url: h10.url, query_string: function(a13) {
              if (a13) try {
                let b11 = new URL(a13, "http://dogs.are.great").search.slice(1);
                return b11.length ? b11 : void 0;
              } catch (a14) {
                return;
              }
            }(h10.url), headers: a12 }) }), f10 = `middleware ${h10.method} ${new URL(h10.url).pathname}`, g10 = "url";
          } else f10 = "middleware", g10 = "component";
          i10.setTransactionName(f10);
          let j10 = (e10 = c4(cI())).getActiveSpan ? e10.getActiveSpan() : c5()[cX];
          if (j10) {
            f10 = "middleware", g10 = "component";
            let a12 = dp(j10);
            a12 && ds(a12, i10, d10);
          }
          return function(a12, b11) {
            let c11 = c4(cI());
            if (c11.startSpan) return c11.startSpan(a12, b11);
            let d11 = function(a13) {
              let b12 = { isStandalone: (a13.experimental || {}).standalone, ...a13 };
              if (a13.startTime) {
                let c12 = { ...b12 };
                return c12.startTimestamp = dg(a13.startTime), delete c12.startTime, c12;
              }
              return b12;
            }(a12), { forceTransaction: e11, parentSpan: f11 } = a12;
            return c7(a12.scope, () => {
              var c12;
              return (void 0 !== (c12 = f11) ? (a13) => {
                let b12;
                return (b12 = c4(cI())).withActiveSpan ? b12.withActiveSpan(c12, a13) : c7((b13) => (cY(b13, c12 || void 0), a13(b13)));
              } : (a13) => a13())(() => {
                let c13 = c5(), f12 = function(a13) {
                  let b12 = a13[cX];
                  if (!b12) return;
                  let c14 = c8();
                  return (c14 ? c14.getOptions() : {}).parentSpanIsAlwaysRootSpan ? dp(b12) : b12;
                }(c13), g11 = a12.onlyIfParent && !f12 ? new dA() : function({ parentSpan: a13, spanArguments: b12, forceTransaction: c14, scope: d12 }) {
                  let e12;
                  if (!dv()) return new dA();
                  let f13 = c6();
                  if (a13 && !c14) e12 = function(a14, b13, c15) {
                    let { spanId: d13, traceId: e13 } = a14.spanContext(), f14 = !b13.getScopeData().sdkProcessingMetadata[dF] && dj(a14), g12 = f14 ? new dC({ ...c15, parentSpanId: d13, traceId: e13, sampled: f14 }) : new dA({ traceId: e13 });
                    dn(a14, g12);
                    let h11 = c8();
                    return h11 && (h11.emit("spanStart", g12), c15.endTimestamp && h11.emit("spanEnd", g12)), g12;
                  }(a13, d12, b12), dn(a13, e12);
                  else if (a13) {
                    let c15 = dz(a13), { traceId: f14, spanId: g12 } = a13.spanContext(), h11 = dj(a13);
                    cV(e12 = dG({ traceId: f14, parentSpanId: g12, ...b12 }, d12, h11), dy, c15);
                  } else {
                    let { traceId: a14, dsc: c15, parentSpanId: g12, sampled: h11 } = { ...f13.getPropagationContext(), ...d12.getPropagationContext() };
                    e12 = dG({ traceId: a14, parentSpanId: g12, ...b12 }, d12, h11), c15 && cV(e12, dy, c15);
                  }
                  return ds(e12, d12, f13), e12;
                }({ parentSpan: f12, spanArguments: d11, forceTransaction: e11, scope: c13 });
                return cY(c13, g11), du(() => b11(g11), () => {
                  let { status: a13 } = di(g11);
                  g11.isRecording() && (!a13 || "ok" === a13) && g11.setStatus({ code: 2, message: "internal_error" });
                }, () => g11.end());
              });
            });
          }({ name: f10, op: "http.server.middleware", attributes: { [da]: g10, [dd]: "auto.function.nextjs.wrapMiddlewareWithSentry" } }, () => du(() => a11.apply(b10, c10), (a12) => {
            c5().captureException(a12, function(a13) {
              if (a13) {
                var b11;
                return (b11 = a13) instanceof c$ || "function" == typeof b11 || Object.keys(a13).some((a14) => dH.includes(a14)) ? { captureContext: a13 } : a13;
              }
            }({ mechanism: { type: "instrument", handled: false } }));
          }, () => {
            var a12;
            let b11, c11;
            a12 = dJ(), (c11 = (b11 = cG[Symbol.for("@vercel/request-context")]) && b11.get && b11.get() ? b11.get() : {}) && c11.waitUntil && c11.waitUntil(a12);
          }));
        }) });
      }
      function dL(a10, b10) {
        var c10 = {};
        for (var d10 in a10) Object.prototype.hasOwnProperty.call(a10, d10) && 0 > b10.indexOf(d10) && (c10[d10] = a10[d10]);
        if (null != a10 && "function" == typeof Object.getOwnPropertySymbols) for (var e10 = 0, d10 = Object.getOwnPropertySymbols(a10); e10 < d10.length; e10++) 0 > b10.indexOf(d10[e10]) && Object.prototype.propertyIsEnumerable.call(a10, d10[e10]) && (c10[d10[e10]] = a10[d10[e10]]);
        return c10;
      }
      "function" == typeof SuppressedError && SuppressedError;
      class dM extends Error {
        constructor(a10, b10 = "FunctionsError", c10) {
          super(a10), this.name = b10, this.context = c10;
        }
        toJSON() {
          return { name: this.name, message: this.message, context: this.context };
        }
      }
      class dN extends dM {
        constructor(a10) {
          super("Failed to send a request to the Edge Function", "FunctionsFetchError", a10);
        }
      }
      class dO extends dM {
        constructor(a10) {
          super("Relay Error invoking the Edge Function", "FunctionsRelayError", a10);
        }
      }
      class dP extends dM {
        constructor(a10) {
          super("Edge Function returned a non-2xx status code", "FunctionsHttpError", a10);
        }
      }
      (z = G || (G = {})).Any = "any", z.ApNortheast1 = "ap-northeast-1", z.ApNortheast2 = "ap-northeast-2", z.ApSouth1 = "ap-south-1", z.ApSoutheast1 = "ap-southeast-1", z.ApSoutheast2 = "ap-southeast-2", z.CaCentral1 = "ca-central-1", z.EuCentral1 = "eu-central-1", z.EuWest1 = "eu-west-1", z.EuWest2 = "eu-west-2", z.EuWest3 = "eu-west-3", z.SaEast1 = "sa-east-1", z.UsEast1 = "us-east-1", z.UsWest1 = "us-west-1", z.UsWest2 = "us-west-2";
      class dQ {
        constructor(a10, { headers: b10 = {}, customFetch: c10, region: d10 = G.Any } = {}) {
          this.url = a10, this.headers = b10, this.region = d10, this.fetch = /* @__PURE__ */ ((a11) => a11 ? (...b11) => a11(...b11) : (...a12) => fetch(...a12))(c10);
        }
        setAuth(a10) {
          this.headers.Authorization = `Bearer ${a10}`;
        }
        invoke(a10) {
          var b10, c10, d10, e10;
          return b10 = this, c10 = arguments, d10 = void 0, e10 = function* (a11, b11 = {}) {
            var c11;
            let d11, e11;
            try {
              let f10, { headers: g10, method: h10, body: i10, signal: j10, timeout: k2 } = b11, l2 = {}, { region: m2 } = b11;
              m2 || (m2 = this.region);
              let n2 = new URL(`${this.url}/${a11}`);
              m2 && "any" !== m2 && (l2["x-region"] = m2, n2.searchParams.set("forceFunctionRegion", m2)), i10 && (g10 && !Object.prototype.hasOwnProperty.call(g10, "Content-Type") || !g10) ? "u" > typeof Blob && i10 instanceof Blob || i10 instanceof ArrayBuffer ? (l2["Content-Type"] = "application/octet-stream", f10 = i10) : "string" == typeof i10 ? (l2["Content-Type"] = "text/plain", f10 = i10) : "u" > typeof FormData && i10 instanceof FormData ? f10 = i10 : (l2["Content-Type"] = "application/json", f10 = JSON.stringify(i10)) : f10 = !i10 || "string" == typeof i10 || "u" > typeof Blob && i10 instanceof Blob || i10 instanceof ArrayBuffer || "u" > typeof FormData && i10 instanceof FormData ? i10 : JSON.stringify(i10);
              let o2 = j10;
              k2 && (e11 = new AbortController(), d11 = setTimeout(() => e11.abort(), k2), j10 ? (o2 = e11.signal, j10.addEventListener("abort", () => e11.abort())) : o2 = e11.signal);
              let p2 = yield this.fetch(n2.toString(), { method: h10 || "POST", headers: Object.assign(Object.assign(Object.assign({}, l2), this.headers), g10), body: f10, signal: o2 }).catch((a12) => {
                throw new dN(a12);
              }), q2 = p2.headers.get("x-relay-error");
              if (q2 && "true" === q2) throw new dO(p2);
              if (!p2.ok) throw new dP(p2);
              let r2 = (null != (c11 = p2.headers.get("Content-Type")) ? c11 : "text/plain").split(";")[0].trim();
              return { data: "application/json" === r2 ? yield p2.json() : "application/octet-stream" === r2 || "application/pdf" === r2 ? yield p2.blob() : "text/event-stream" === r2 ? p2 : "multipart/form-data" === r2 ? yield p2.formData() : yield p2.text(), error: null, response: p2 };
            } catch (a12) {
              return { data: null, error: a12, response: a12 instanceof dP || a12 instanceof dO ? a12.context : void 0 };
            } finally {
              d11 && clearTimeout(d11);
            }
          }, new (d10 || (d10 = Promise))(function(a11, f10) {
            function g10(a12) {
              try {
                i10(e10.next(a12));
              } catch (a13) {
                f10(a13);
              }
            }
            function h10(a12) {
              try {
                i10(e10.throw(a12));
              } catch (a13) {
                f10(a13);
              }
            }
            function i10(b11) {
              var c11;
              b11.done ? a11(b11.value) : ((c11 = b11.value) instanceof d10 ? c11 : new d10(function(a12) {
                a12(c11);
              })).then(g10, h10);
            }
            i10((e10 = e10.apply(b10, c10 || [])).next());
          });
        }
      }
      let dR = (a10) => Math.min(1e3 * 2 ** a10, 3e4), dS = [520, 503], dT = ["GET", "HEAD", "OPTIONS"];
      var dU = class extends Error {
        constructor(a10) {
          super(a10.message), this.name = "PostgrestError", this.details = a10.details, this.hint = a10.hint, this.code = a10.code;
        }
        toJSON() {
          return { name: this.name, message: this.message, details: this.details, hint: this.hint, code: this.code };
        }
      };
      function dV(a10, b10) {
        return new Promise((c10) => {
          if (null == b10 ? void 0 : b10.aborted) return void c10();
          let d10 = setTimeout(() => {
            null == b10 || b10.removeEventListener("abort", e10), c10();
          }, a10);
          function e10() {
            clearTimeout(d10), c10();
          }
          null == b10 || b10.addEventListener("abort", e10);
        });
      }
      var dW = class {
        constructor(a10) {
          var b10, c10, d10, e10, f10;
          this.shouldThrowOnError = false, this.retryEnabled = true, this.method = a10.method, this.url = a10.url, this.headers = new Headers(a10.headers), this.schema = a10.schema, this.body = a10.body, this.shouldThrowOnError = null != (b10 = a10.shouldThrowOnError) && b10, this.signal = a10.signal, this.isMaybeSingle = null != (c10 = a10.isMaybeSingle) && c10, this.shouldStripNulls = null != (d10 = a10.shouldStripNulls) && d10, this.urlLengthLimit = null != (e10 = a10.urlLengthLimit) ? e10 : 8e3, this.retryEnabled = null == (f10 = a10.retry) || f10, a10.fetch ? this.fetch = a10.fetch : this.fetch = fetch;
        }
        throwOnError() {
          return this.shouldThrowOnError = true, this;
        }
        stripNulls() {
          if ("text/csv" === this.headers.get("Accept")) throw Error("stripNulls() cannot be used with csv()");
          return this.shouldStripNulls = true, this;
        }
        setHeader(a10, b10) {
          return this.headers = new Headers(this.headers), this.headers.set(a10, b10), this;
        }
        retry(a10) {
          return this.retryEnabled = a10, this;
        }
        then(a10, b10) {
          var c10 = this;
          if (void 0 === this.schema || (["GET", "HEAD"].includes(this.method) ? this.headers.set("Accept-Profile", this.schema) : this.headers.set("Content-Profile", this.schema)), "GET" !== this.method && "HEAD" !== this.method && this.headers.set("Content-Type", "application/json"), this.shouldStripNulls) {
            let a11 = this.headers.get("Accept");
            "application/vnd.pgrst.object+json" === a11 ? this.headers.set("Accept", "application/vnd.pgrst.object+json;nulls=stripped") : a11 && "application/json" !== a11 || this.headers.set("Accept", "application/vnd.pgrst.array+json;nulls=stripped");
          }
          let d10 = this.fetch, e10 = (async () => {
            let a11 = 0;
            for (; ; ) {
              var b11, e11, f10, g10, h10;
              let i10, j10 = new Headers(c10.headers);
              a11 > 0 && j10.set("X-Retry-Count", String(a11));
              try {
                i10 = await d10(c10.url.toString(), { method: c10.method, headers: j10, body: JSON.stringify(c10.body, (a12, b12) => "bigint" == typeof b12 ? b12.toString() : b12), signal: c10.signal });
              } catch (b12) {
                if ((null == b12 ? void 0 : b12.name) === "AbortError" || (null == b12 ? void 0 : b12.code) === "ABORT_ERR" || !dT.includes(c10.method)) throw b12;
                if (c10.retryEnabled && a11 < 3) {
                  let b13 = dR(a11);
                  a11++, await dV(b13, c10.signal);
                  continue;
                }
                throw b12;
              }
              if (b11 = c10.method, e11 = i10.status, f10 = a11, c10.retryEnabled && !(f10 >= 3) && dT.includes(b11) && dS.includes(e11) && 1) {
                let b12 = null != (g10 = null == (h10 = i10.headers) ? void 0 : h10.get("Retry-After")) ? g10 : null, d11 = null !== b12 ? 1e3 * Math.max(0, parseInt(b12, 10) || 0) : dR(a11);
                await i10.text(), a11++, await dV(d11, c10.signal);
                continue;
              }
              return await c10.processResponse(i10);
            }
          })();
          return this.shouldThrowOnError || (e10 = e10.catch((a11) => {
            var b11, c11, d11, e11, f10, g10;
            let h10 = "", i10 = "", j10 = "", k2 = null == a11 ? void 0 : a11.cause;
            if (k2) {
              let b12 = null != (c11 = null == k2 ? void 0 : k2.message) ? c11 : "", g11 = null != (d11 = null == k2 ? void 0 : k2.code) ? d11 : "";
              h10 = `${null != (e11 = null == a11 ? void 0 : a11.name) ? e11 : "FetchError"}: ${null == a11 ? void 0 : a11.message}

Caused by: ${null != (f10 = null == k2 ? void 0 : k2.name) ? f10 : "Error"}: ${b12}`, g11 && (h10 += ` (${g11})`), (null == k2 ? void 0 : k2.stack) && (h10 += `
${k2.stack}`);
            } else h10 = null != (g10 = null == a11 ? void 0 : a11.stack) ? g10 : "";
            let l2 = this.url.toString().length;
            return (null == a11 ? void 0 : a11.name) === "AbortError" || (null == a11 ? void 0 : a11.code) === "ABORT_ERR" ? (j10 = "", i10 = "Request was aborted (timeout or manual cancellation)", l2 > this.urlLengthLimit && (i10 += `. Note: Your request URL is ${l2} characters, which may exceed server limits. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [many IDs])), consider using an RPC function to pass values server-side.`)) : ((null == k2 ? void 0 : k2.name) === "HeadersOverflowError" || (null == k2 ? void 0 : k2.code) === "UND_ERR_HEADERS_OVERFLOW") && (j10 = "", i10 = "HTTP headers exceeded server limits (typically 16KB)", l2 > this.urlLengthLimit && (i10 += `. Your request URL is ${l2} characters. If selecting many fields, consider using views. If filtering with large arrays (e.g., .in('id', [200+ IDs])), consider using an RPC function instead.`)), { success: false, error: { message: `${null != (b11 = null == a11 ? void 0 : a11.name) ? b11 : "FetchError"}: ${null == a11 ? void 0 : a11.message}`, details: h10, hint: i10, code: j10 }, data: null, count: null, status: 0, statusText: "" };
          })), e10.then(a10, b10);
        }
        async processResponse(a10) {
          var b10, c10, d10;
          let e10 = null, f10 = null, g10 = null, h10 = a10.status, i10 = a10.statusText;
          if (a10.ok) {
            if ("HEAD" !== this.method) {
              let b11 = await a10.text();
              if ("" === b11) ;
              else if ("text/csv" === this.headers.get("Accept")) f10 = b11;
              else if (this.headers.get("Accept") && (null == (d10 = this.headers.get("Accept")) ? void 0 : d10.includes("application/vnd.pgrst.plan+text"))) f10 = b11;
              else try {
                f10 = JSON.parse(b11);
              } catch (a11) {
                if (e10 = { message: b11 }, f10 = null, this.shouldThrowOnError) throw new dU({ message: b11, details: "", hint: "", code: "" });
              }
            }
            let j10 = null == (b10 = this.headers.get("Prefer")) ? void 0 : b10.match(/count=(exact|planned|estimated)/), k2 = null == (c10 = a10.headers.get("content-range")) ? void 0 : c10.split("/");
            j10 && k2 && k2.length > 1 && (g10 = parseInt(k2[1])), this.isMaybeSingle && Array.isArray(f10) && (f10.length > 1 ? (e10 = { code: "PGRST116", details: `Results contain ${f10.length} rows, application/vnd.pgrst.object+json requires 1 row`, hint: null, message: "JSON object requested, multiple (or no) rows returned" }, f10 = null, g10 = null, h10 = 406, i10 = "Not Acceptable") : f10 = 1 === f10.length ? f10[0] : null);
          } else {
            let b11 = await a10.text();
            try {
              e10 = JSON.parse(b11), Array.isArray(e10) && 404 === a10.status && (f10 = [], e10 = null, h10 = 200, i10 = "OK");
            } catch (c11) {
              404 === a10.status && "" === b11 ? (h10 = 204, i10 = "No Content") : e10 = { message: b11 };
            }
            if (e10 && this.shouldThrowOnError) throw new dU(e10);
          }
          return { success: null === e10, error: e10, data: f10, count: g10, status: h10, statusText: i10 };
        }
        returns() {
          return this;
        }
        overrideTypes() {
          return this;
        }
      }, dX = class extends dW {
        select(a10) {
          let b10 = false, c10 = (null != a10 ? a10 : "*").split("").map((a11) => /\s/.test(a11) && !b10 ? "" : ('"' === a11 && (b10 = !b10), a11)).join("");
          return this.url.searchParams.set("select", c10), this.headers.append("Prefer", "return=representation"), this;
        }
        order(a10, { ascending: b10 = true, nullsFirst: c10, foreignTable: d10, referencedTable: e10 = d10 } = {}) {
          let f10 = e10 ? `${e10}.order` : "order", g10 = this.url.searchParams.get(f10);
          return this.url.searchParams.set(f10, `${g10 ? `${g10},` : ""}${a10}.${b10 ? "asc" : "desc"}${void 0 === c10 ? "" : c10 ? ".nullsfirst" : ".nullslast"}`), this;
        }
        limit(a10, { foreignTable: b10, referencedTable: c10 = b10 } = {}) {
          let d10 = void 0 === c10 ? "limit" : `${c10}.limit`;
          return this.url.searchParams.set(d10, `${a10}`), this;
        }
        range(a10, b10, { foreignTable: c10, referencedTable: d10 = c10 } = {}) {
          let e10 = void 0 === d10 ? "offset" : `${d10}.offset`, f10 = void 0 === d10 ? "limit" : `${d10}.limit`;
          return this.url.searchParams.set(e10, `${a10}`), this.url.searchParams.set(f10, `${b10 - a10 + 1}`), this;
        }
        abortSignal(a10) {
          return this.signal = a10, this;
        }
        single() {
          return this.headers.set("Accept", "application/vnd.pgrst.object+json"), this;
        }
        maybeSingle() {
          return this.isMaybeSingle = true, this;
        }
        csv() {
          return this.headers.set("Accept", "text/csv"), this;
        }
        geojson() {
          return this.headers.set("Accept", "application/geo+json"), this;
        }
        explain({ analyze: a10 = false, verbose: b10 = false, settings: c10 = false, buffers: d10 = false, wal: e10 = false, format: f10 = "text" } = {}) {
          var g10;
          let h10 = [a10 ? "analyze" : null, b10 ? "verbose" : null, c10 ? "settings" : null, d10 ? "buffers" : null, e10 ? "wal" : null].filter(Boolean).join("|"), i10 = null != (g10 = this.headers.get("Accept")) ? g10 : "application/json";
          return this.headers.set("Accept", `application/vnd.pgrst.plan+${f10}; for="${i10}"; options=${h10};`), this;
        }
        rollback() {
          return this.headers.append("Prefer", "tx=rollback"), this;
        }
        returns() {
          return this;
        }
        maxAffected(a10) {
          return this.headers.append("Prefer", "handling=strict"), this.headers.append("Prefer", `max-affected=${a10}`), this;
        }
      };
      let dY = RegExp("[,()]");
      var dZ = class extends dX {
        eq(a10, b10) {
          return this.url.searchParams.append(a10, `eq.${b10}`), this;
        }
        neq(a10, b10) {
          return this.url.searchParams.append(a10, `neq.${b10}`), this;
        }
        gt(a10, b10) {
          return this.url.searchParams.append(a10, `gt.${b10}`), this;
        }
        gte(a10, b10) {
          return this.url.searchParams.append(a10, `gte.${b10}`), this;
        }
        lt(a10, b10) {
          return this.url.searchParams.append(a10, `lt.${b10}`), this;
        }
        lte(a10, b10) {
          return this.url.searchParams.append(a10, `lte.${b10}`), this;
        }
        like(a10, b10) {
          return this.url.searchParams.append(a10, `like.${b10}`), this;
        }
        likeAllOf(a10, b10) {
          return this.url.searchParams.append(a10, `like(all).{${b10.join(",")}}`), this;
        }
        likeAnyOf(a10, b10) {
          return this.url.searchParams.append(a10, `like(any).{${b10.join(",")}}`), this;
        }
        ilike(a10, b10) {
          return this.url.searchParams.append(a10, `ilike.${b10}`), this;
        }
        ilikeAllOf(a10, b10) {
          return this.url.searchParams.append(a10, `ilike(all).{${b10.join(",")}}`), this;
        }
        ilikeAnyOf(a10, b10) {
          return this.url.searchParams.append(a10, `ilike(any).{${b10.join(",")}}`), this;
        }
        regexMatch(a10, b10) {
          return this.url.searchParams.append(a10, `match.${b10}`), this;
        }
        regexIMatch(a10, b10) {
          return this.url.searchParams.append(a10, `imatch.${b10}`), this;
        }
        is(a10, b10) {
          return this.url.searchParams.append(a10, `is.${b10}`), this;
        }
        isDistinct(a10, b10) {
          return this.url.searchParams.append(a10, `isdistinct.${b10}`), this;
        }
        in(a10, b10) {
          let c10 = Array.from(new Set(b10)).map((a11) => "string" == typeof a11 && dY.test(a11) ? `"${a11}"` : `${a11}`).join(",");
          return this.url.searchParams.append(a10, `in.(${c10})`), this;
        }
        notIn(a10, b10) {
          let c10 = Array.from(new Set(b10)).map((a11) => "string" == typeof a11 && dY.test(a11) ? `"${a11}"` : `${a11}`).join(",");
          return this.url.searchParams.append(a10, `not.in.(${c10})`), this;
        }
        contains(a10, b10) {
          return "string" == typeof b10 ? this.url.searchParams.append(a10, `cs.${b10}`) : Array.isArray(b10) ? this.url.searchParams.append(a10, `cs.{${b10.join(",")}}`) : this.url.searchParams.append(a10, `cs.${JSON.stringify(b10)}`), this;
        }
        containedBy(a10, b10) {
          return "string" == typeof b10 ? this.url.searchParams.append(a10, `cd.${b10}`) : Array.isArray(b10) ? this.url.searchParams.append(a10, `cd.{${b10.join(",")}}`) : this.url.searchParams.append(a10, `cd.${JSON.stringify(b10)}`), this;
        }
        rangeGt(a10, b10) {
          return this.url.searchParams.append(a10, `sr.${b10}`), this;
        }
        rangeGte(a10, b10) {
          return this.url.searchParams.append(a10, `nxl.${b10}`), this;
        }
        rangeLt(a10, b10) {
          return this.url.searchParams.append(a10, `sl.${b10}`), this;
        }
        rangeLte(a10, b10) {
          return this.url.searchParams.append(a10, `nxr.${b10}`), this;
        }
        rangeAdjacent(a10, b10) {
          return this.url.searchParams.append(a10, `adj.${b10}`), this;
        }
        overlaps(a10, b10) {
          return "string" == typeof b10 ? this.url.searchParams.append(a10, `ov.${b10}`) : this.url.searchParams.append(a10, `ov.{${b10.join(",")}}`), this;
        }
        textSearch(a10, b10, { config: c10, type: d10 } = {}) {
          let e10 = "";
          "plain" === d10 ? e10 = "pl" : "phrase" === d10 ? e10 = "ph" : "websearch" === d10 && (e10 = "w");
          let f10 = void 0 === c10 ? "" : `(${c10})`;
          return this.url.searchParams.append(a10, `${e10}fts${f10}.${b10}`), this;
        }
        match(a10) {
          return Object.entries(a10).filter(([a11, b10]) => void 0 !== b10).forEach(([a11, b10]) => {
            this.url.searchParams.append(a11, `eq.${b10}`);
          }), this;
        }
        not(a10, b10, c10) {
          return this.url.searchParams.append(a10, `not.${b10}.${c10}`), this;
        }
        or(a10, { foreignTable: b10, referencedTable: c10 = b10 } = {}) {
          let d10 = c10 ? `${c10}.or` : "or";
          return this.url.searchParams.append(d10, `(${a10})`), this;
        }
        filter(a10, b10, c10) {
          return this.url.searchParams.append(a10, `${b10}.${c10}`), this;
        }
      }, d$ = class {
        constructor(a10, { headers: b10 = {}, schema: c10, fetch: d10, urlLengthLimit: e10 = 8e3, retry: f10 }) {
          this.url = a10, this.headers = new Headers(b10), this.schema = c10, this.fetch = d10, this.urlLengthLimit = e10, this.retry = f10;
        }
        cloneRequestState() {
          return { url: new URL(this.url.toString()), headers: new Headers(this.headers) };
        }
        select(a10, b10) {
          let { head: c10 = false, count: d10 } = null != b10 ? b10 : {}, e10 = false, f10 = (null != a10 ? a10 : "*").split("").map((a11) => /\s/.test(a11) && !e10 ? "" : ('"' === a11 && (e10 = !e10), a11)).join(""), { url: g10, headers: h10 } = this.cloneRequestState();
          return g10.searchParams.set("select", f10), d10 && h10.append("Prefer", `count=${d10}`), new dZ({ method: c10 ? "HEAD" : "GET", url: g10, headers: h10, schema: this.schema, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        insert(a10, { count: b10, defaultToNull: c10 = true } = {}) {
          var d10;
          let { url: e10, headers: f10 } = this.cloneRequestState();
          if (b10 && f10.append("Prefer", `count=${b10}`), c10 || f10.append("Prefer", "missing=default"), Array.isArray(a10)) {
            let b11 = a10.reduce((a11, b12) => a11.concat(Object.keys(b12)), []);
            if (b11.length > 0) {
              let a11 = [...new Set(b11)].map((a12) => `"${a12}"`);
              e10.searchParams.set("columns", a11.join(","));
            }
          }
          return new dZ({ method: "POST", url: e10, headers: f10, schema: this.schema, body: a10, fetch: null != (d10 = this.fetch) ? d10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        upsert(a10, { onConflict: b10, ignoreDuplicates: c10 = false, count: d10, defaultToNull: e10 = true } = {}) {
          var f10;
          let { url: g10, headers: h10 } = this.cloneRequestState();
          if (h10.append("Prefer", `resolution=${c10 ? "ignore" : "merge"}-duplicates`), void 0 !== b10 && g10.searchParams.set("on_conflict", b10), d10 && h10.append("Prefer", `count=${d10}`), e10 || h10.append("Prefer", "missing=default"), Array.isArray(a10)) {
            let b11 = a10.reduce((a11, b12) => a11.concat(Object.keys(b12)), []);
            if (b11.length > 0) {
              let a11 = [...new Set(b11)].map((a12) => `"${a12}"`);
              g10.searchParams.set("columns", a11.join(","));
            }
          }
          return new dZ({ method: "POST", url: g10, headers: h10, schema: this.schema, body: a10, fetch: null != (f10 = this.fetch) ? f10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        update(a10, { count: b10 } = {}) {
          var c10;
          let { url: d10, headers: e10 } = this.cloneRequestState();
          return b10 && e10.append("Prefer", `count=${b10}`), new dZ({ method: "PATCH", url: d10, headers: e10, schema: this.schema, body: a10, fetch: null != (c10 = this.fetch) ? c10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        delete({ count: a10 } = {}) {
          var b10;
          let { url: c10, headers: d10 } = this.cloneRequestState();
          return a10 && d10.append("Prefer", `count=${a10}`), new dZ({ method: "DELETE", url: c10, headers: d10, schema: this.schema, fetch: null != (b10 = this.fetch) ? b10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
      };
      function d_(a10) {
        return (d_ = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(a11) {
          return typeof a11;
        } : function(a11) {
          return a11 && "function" == typeof Symbol && a11.constructor === Symbol && a11 !== Symbol.prototype ? "symbol" : typeof a11;
        })(a10);
      }
      function d0(a10, b10) {
        var c10 = Object.keys(a10);
        if (Object.getOwnPropertySymbols) {
          var d10 = Object.getOwnPropertySymbols(a10);
          b10 && (d10 = d10.filter(function(b11) {
            return Object.getOwnPropertyDescriptor(a10, b11).enumerable;
          })), c10.push.apply(c10, d10);
        }
        return c10;
      }
      function d1(a10) {
        for (var b10 = 1; b10 < arguments.length; b10++) {
          var c10 = null != arguments[b10] ? arguments[b10] : {};
          b10 % 2 ? d0(Object(c10), true).forEach(function(b11) {
            !function(a11, b12, c11) {
              var d10;
              (d10 = function(a12, b13) {
                if ("object" != d_(a12) || !a12) return a12;
                var c12 = a12[Symbol.toPrimitive];
                if (void 0 !== c12) {
                  var d11 = c12.call(a12, b13 || "default");
                  if ("object" != d_(d11)) return d11;
                  throw TypeError("@@toPrimitive must return a primitive value.");
                }
                return ("string" === b13 ? String : Number)(a12);
              }(b12, "string"), (b12 = "symbol" == d_(d10) ? d10 : d10 + "") in a11) ? Object.defineProperty(a11, b12, { value: c11, enumerable: true, configurable: true, writable: true }) : a11[b12] = c11;
            }(a10, b11, c10[b11]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(a10, Object.getOwnPropertyDescriptors(c10)) : d0(Object(c10)).forEach(function(b11) {
            Object.defineProperty(a10, b11, Object.getOwnPropertyDescriptor(c10, b11));
          });
        }
        return a10;
      }
      var d2 = class a10 {
        constructor(a11, { headers: b10 = {}, schema: c10, fetch: d10, timeout: e10, urlLengthLimit: f10 = 8e3, retry: g10 } = {}) {
          this.url = a11, this.headers = new Headers(b10), this.schemaName = c10, this.urlLengthLimit = f10;
          const h10 = null != d10 ? d10 : globalThis.fetch;
          void 0 !== e10 && e10 > 0 ? this.fetch = (a12, b11) => {
            let c11 = new AbortController(), d11 = setTimeout(() => c11.abort(), e10), f11 = null == b11 ? void 0 : b11.signal;
            if (f11) {
              if (f11.aborted) return clearTimeout(d11), h10(a12, b11);
              let e11 = () => {
                clearTimeout(d11), c11.abort();
              };
              return f11.addEventListener("abort", e11, { once: true }), h10(a12, d1(d1({}, b11), {}, { signal: c11.signal })).finally(() => {
                clearTimeout(d11), f11.removeEventListener("abort", e11);
              });
            }
            return h10(a12, d1(d1({}, b11), {}, { signal: c11.signal })).finally(() => clearTimeout(d11));
          } : this.fetch = h10, this.retry = g10;
        }
        from(a11) {
          if (!a11 || "string" != typeof a11 || "" === a11.trim()) throw Error("Invalid relation name: relation must be a non-empty string.");
          return new d$(new URL(`${this.url}/${a11}`), { headers: new Headers(this.headers), schema: this.schemaName, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        schema(b10) {
          return new a10(this.url, { headers: this.headers, schema: b10, fetch: this.fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
        rpc(a11, b10 = {}, { head: c10 = false, get: d10 = false, count: e10 } = {}) {
          var f10;
          let g10, h10, i10 = new URL(`${this.url}/rpc/${a11}`), j10 = (a12) => null !== a12 && "object" == typeof a12 && (!Array.isArray(a12) || a12.some(j10)), k2 = c10 && Object.values(b10).some(j10);
          k2 ? (g10 = "POST", h10 = b10) : c10 || d10 ? (g10 = c10 ? "HEAD" : "GET", Object.entries(b10).filter(([a12, b11]) => void 0 !== b11).map(([a12, b11]) => [a12, Array.isArray(b11) ? `{${b11.join(",")}}` : `${b11}`]).forEach(([a12, b11]) => {
            i10.searchParams.append(a12, b11);
          })) : (g10 = "POST", h10 = b10);
          let l2 = new Headers(this.headers);
          return k2 ? l2.set("Prefer", e10 ? `count=${e10},return=minimal` : "return=minimal") : e10 && l2.set("Prefer", `count=${e10}`), new dZ({ method: g10, url: i10, headers: l2, schema: this.schemaName, body: h10, fetch: null != (f10 = this.fetch) ? f10 : fetch, urlLengthLimit: this.urlLengthLimit, retry: this.retry });
        }
      };
      class d3 {
        static detectEnvironment() {
          var a10;
          if ("u" > typeof WebSocket) return { type: "native", wsConstructor: WebSocket };
          let b10 = globalThis;
          if ("u" > typeof globalThis && void 0 !== b10.WebSocket) return { type: "native", wsConstructor: b10.WebSocket };
          let d10 = void 0 !== c.g ? c.g : void 0;
          if (d10 && void 0 !== d10.WebSocket) return { type: "native", wsConstructor: d10.WebSocket };
          if ("u" > typeof globalThis && void 0 !== b10.WebSocketPair && void 0 === globalThis.WebSocket) return { type: "cloudflare", error: "Cloudflare Workers detected. WebSocket clients are not supported in Cloudflare Workers.", workaround: "Use Cloudflare Workers WebSocket API for server-side WebSocket handling, or deploy to a different runtime." };
          if ("u" > typeof globalThis && b10.EdgeRuntime || "u" > typeof navigator && (null == (a10 = navigator.userAgent) ? void 0 : a10.includes("Vercel-Edge"))) return { type: "unsupported", error: "Edge runtime detected (Vercel Edge/Netlify Edge). WebSockets are not supported in edge functions.", workaround: "Use serverless functions or a different deployment target for WebSocket functionality." };
          let e10 = globalThis.process;
          if (e10) {
            let a11 = e10.versions;
            if (a11 && a11.node) {
              let b11 = parseInt(a11.node.replace(/^v/, "").split(".")[0]);
              return b11 >= 22 ? void 0 !== globalThis.WebSocket ? { type: "native", wsConstructor: globalThis.WebSocket } : { type: "unsupported", error: `Node.js ${b11} detected but native WebSocket not found.`, workaround: "Provide a WebSocket implementation via the transport option." } : { type: "unsupported", error: `Node.js ${b11} detected without native WebSocket support.`, workaround: 'For Node.js < 22, install "ws" package and provide it via the transport option:\nimport ws from "ws"\nnew RealtimeClient(url, { transport: ws })' };
            }
          }
          return { type: "unsupported", error: "Unknown JavaScript runtime without WebSocket support.", workaround: "Ensure you're running in a supported environment (browser, Node.js, Deno) or provide a custom WebSocket implementation." };
        }
        static getWebSocketConstructor() {
          let a10 = this.detectEnvironment();
          if (a10.wsConstructor) return a10.wsConstructor;
          let b10 = a10.error || "WebSocket not supported in this environment.";
          throw a10.workaround && (b10 += `

Suggested solution: ${a10.workaround}`), Error(b10);
        }
        static isWebSocketSupported() {
          try {
            let a10 = this.detectEnvironment();
            return "native" === a10.type || "ws" === a10.type;
          } catch (a10) {
            return false;
          }
        }
      }
      let d4 = "2.0.0", d5 = "errored", d6 = "joined", d7 = { close: "phx_close", error: "phx_error", join: "phx_join", reply: "phx_reply", leave: "phx_leave", access_token: "access_token" };
      class d8 {
        constructor(a10) {
          this.HEADER_LENGTH = 1, this.USER_BROADCAST_PUSH_META_LENGTH = 6, this.KINDS = { userBroadcastPush: 3, userBroadcast: 4 }, this.BINARY_ENCODING = 0, this.JSON_ENCODING = 1, this.BROADCAST_EVENT = "broadcast", this.allowedMetadataKeys = [], this.allowedMetadataKeys = null != a10 ? a10 : [];
        }
        encode(a10, b10) {
          return a10.event !== this.BROADCAST_EVENT || a10.payload instanceof ArrayBuffer || "string" != typeof a10.payload.event ? b10(JSON.stringify([a10.join_ref, a10.ref, a10.topic, a10.event, a10.payload])) : b10(this._binaryEncodeUserBroadcastPush(a10));
        }
        _binaryEncodeUserBroadcastPush(a10) {
          var b10;
          return this._isArrayBuffer(null == (b10 = a10.payload) ? void 0 : b10.payload) ? this._encodeBinaryUserBroadcastPush(a10) : this._encodeJsonUserBroadcastPush(a10);
        }
        _encodeBinaryUserBroadcastPush(a10) {
          var b10, c10;
          let d10 = null != (c10 = null == (b10 = a10.payload) ? void 0 : b10.payload) ? c10 : new ArrayBuffer(0);
          return this._encodeUserBroadcastPush(a10, this.BINARY_ENCODING, d10);
        }
        _encodeJsonUserBroadcastPush(a10) {
          var b10, c10;
          let d10 = null != (c10 = null == (b10 = a10.payload) ? void 0 : b10.payload) ? c10 : {}, e10 = new TextEncoder().encode(JSON.stringify(d10)).buffer;
          return this._encodeUserBroadcastPush(a10, this.JSON_ENCODING, e10);
        }
        _encodeUserBroadcastPush(a10, b10, c10) {
          let d10 = a10.topic, e10 = null != (n2 = a10.ref) ? n2 : "", f10 = null != (o2 = a10.join_ref) ? o2 : "", g10 = a10.payload.event, h10 = this.allowedMetadataKeys ? this._pick(a10.payload, this.allowedMetadataKeys) : {}, i10 = 0 === Object.keys(h10).length ? "" : JSON.stringify(h10);
          if (f10.length > 255) throw Error(`joinRef length ${f10.length} exceeds maximum of 255`);
          if (e10.length > 255) throw Error(`ref length ${e10.length} exceeds maximum of 255`);
          if (d10.length > 255) throw Error(`topic length ${d10.length} exceeds maximum of 255`);
          if (g10.length > 255) throw Error(`userEvent length ${g10.length} exceeds maximum of 255`);
          if (i10.length > 255) throw Error(`metadata length ${i10.length} exceeds maximum of 255`);
          let j10 = this.USER_BROADCAST_PUSH_META_LENGTH + f10.length + e10.length + d10.length + g10.length + i10.length, k2 = new ArrayBuffer(this.HEADER_LENGTH + j10), l2 = new DataView(k2), m2 = 0;
          l2.setUint8(m2++, this.KINDS.userBroadcastPush), l2.setUint8(m2++, f10.length), l2.setUint8(m2++, e10.length), l2.setUint8(m2++, d10.length), l2.setUint8(m2++, g10.length), l2.setUint8(m2++, i10.length), l2.setUint8(m2++, b10), Array.from(f10, (a11) => l2.setUint8(m2++, a11.charCodeAt(0))), Array.from(e10, (a11) => l2.setUint8(m2++, a11.charCodeAt(0))), Array.from(d10, (a11) => l2.setUint8(m2++, a11.charCodeAt(0))), Array.from(g10, (a11) => l2.setUint8(m2++, a11.charCodeAt(0))), Array.from(i10, (a11) => l2.setUint8(m2++, a11.charCodeAt(0)));
          var n2, o2, p2 = new Uint8Array(k2.byteLength + c10.byteLength);
          return p2.set(new Uint8Array(k2), 0), p2.set(new Uint8Array(c10), k2.byteLength), p2.buffer;
        }
        decode(a10, b10) {
          if (this._isArrayBuffer(a10)) return b10(this._binaryDecode(a10));
          if ("string" == typeof a10) {
            let [c10, d10, e10, f10, g10] = JSON.parse(a10);
            return b10({ join_ref: c10, ref: d10, topic: e10, event: f10, payload: g10 });
          }
          return b10({});
        }
        _binaryDecode(a10) {
          let b10 = new DataView(a10), c10 = b10.getUint8(0), d10 = new TextDecoder();
          if (c10 === this.KINDS.userBroadcast) return this._decodeUserBroadcast(a10, b10, d10);
        }
        _decodeUserBroadcast(a10, b10, c10) {
          let d10 = b10.getUint8(1), e10 = b10.getUint8(2), f10 = b10.getUint8(3), g10 = b10.getUint8(4), h10 = this.HEADER_LENGTH + 4, i10 = c10.decode(a10.slice(h10, h10 + d10));
          h10 += d10;
          let j10 = c10.decode(a10.slice(h10, h10 + e10));
          h10 += e10;
          let k2 = c10.decode(a10.slice(h10, h10 + f10));
          h10 += f10;
          let l2 = a10.slice(h10, a10.byteLength), m2 = g10 === this.JSON_ENCODING ? JSON.parse(c10.decode(l2)) : l2, n2 = { type: this.BROADCAST_EVENT, event: j10, payload: m2 };
          return f10 > 0 && (n2.meta = JSON.parse(k2)), { join_ref: null, ref: null, topic: i10, event: this.BROADCAST_EVENT, payload: n2 };
        }
        _isArrayBuffer(a10) {
          var b10;
          return a10 instanceof ArrayBuffer || (null == (b10 = null == a10 ? void 0 : a10.constructor) ? void 0 : b10.name) === "ArrayBuffer";
        }
        _pick(a10, b10) {
          return a10 && "object" == typeof a10 ? Object.fromEntries(Object.entries(a10).filter(([a11]) => b10.includes(a11))) : {};
        }
      }
      (A = H || (H = {})).abstime = "abstime", A.bool = "bool", A.date = "date", A.daterange = "daterange", A.float4 = "float4", A.float8 = "float8", A.int2 = "int2", A.int4 = "int4", A.int4range = "int4range", A.int8 = "int8", A.int8range = "int8range", A.json = "json", A.jsonb = "jsonb", A.money = "money", A.numeric = "numeric", A.oid = "oid", A.reltime = "reltime", A.text = "text", A.time = "time", A.timestamp = "timestamp", A.timestamptz = "timestamptz", A.timetz = "timetz", A.tsrange = "tsrange", A.tstzrange = "tstzrange";
      let d9 = (a10, b10, c10 = {}) => {
        var d10;
        let e10 = null != (d10 = c10.skipTypes) ? d10 : [];
        return b10 ? Object.keys(b10).reduce((c11, d11) => (c11[d11] = ea(d11, a10, b10, e10), c11), {}) : {};
      }, ea = (a10, b10, c10, d10) => {
        let e10 = b10.find((b11) => b11.name === a10), f10 = null == e10 ? void 0 : e10.type, g10 = c10[a10];
        return f10 && !d10.includes(f10) ? eb(f10, g10) : ec(g10);
      }, eb = (a10, b10) => {
        if ("_" === a10.charAt(0)) return eg(b10, a10.slice(1, a10.length));
        switch (a10) {
          case H.bool:
            return ed(b10);
          case H.float4:
          case H.float8:
          case H.int2:
          case H.int4:
          case H.int8:
          case H.numeric:
          case H.oid:
            return ee(b10);
          case H.json:
          case H.jsonb:
            return ef(b10);
          case H.timestamp:
            return eh(b10);
          case H.abstime:
          case H.date:
          case H.daterange:
          case H.int4range:
          case H.int8range:
          case H.money:
          case H.reltime:
          case H.text:
          case H.time:
          case H.timestamptz:
          case H.timetz:
          case H.tsrange:
          case H.tstzrange:
          default:
            return ec(b10);
        }
      }, ec = (a10) => a10, ed = (a10) => {
        switch (a10) {
          case "t":
            return true;
          case "f":
            return false;
          default:
            return a10;
        }
      }, ee = (a10) => {
        if ("string" == typeof a10) {
          let b10 = parseFloat(a10);
          if (!Number.isNaN(b10)) return b10;
        }
        return a10;
      }, ef = (a10) => {
        if ("string" == typeof a10) try {
          return JSON.parse(a10);
        } catch (a11) {
        }
        return a10;
      }, eg = (a10, b10) => {
        if ("string" != typeof a10) return a10;
        let c10 = a10.length - 1, d10 = a10[c10];
        if ("{" === a10[0] && "}" === d10) {
          let d11, e10 = a10.slice(1, c10);
          try {
            d11 = JSON.parse("[" + e10 + "]");
          } catch (a11) {
            d11 = e10 ? e10.split(",") : [];
          }
          return d11.map((a11) => eb(b10, a11));
        }
        return a10;
      }, eh = (a10) => "string" == typeof a10 ? a10.replace(" ", "T") : a10, ei = (a10) => {
        let b10 = new URL(a10);
        return b10.protocol = b10.protocol.replace(/^ws/i, "http"), b10.pathname = b10.pathname.replace(/\/+$/, "").replace(/\/socket\/websocket$/i, "").replace(/\/socket$/i, "").replace(/\/websocket$/i, ""), "" === b10.pathname || "/" === b10.pathname ? b10.pathname = "/api/broadcast" : b10.pathname = b10.pathname + "/api/broadcast", b10.href;
      };
      var ej = (a10) => "function" == typeof a10 ? a10 : function() {
        return a10;
      }, ek = "u" > typeof window ? window : null, el = ("u" > typeof self ? self : null) || ek || globalThis, em = "closed", en = "errored", eo = "joined", ep = "joining", eq = "leaving", er = "phx_close", es = "phx_error", et = "phx_reply", eu = "phx_leave", ev = "websocket", ew = "base64url.bearer.phx.", ex = class {
        constructor(a10, b10, c10, d10) {
          this.channel = a10, this.event = b10, this.payload = c10 || function() {
            return {};
          }, this.receivedResp = null, this.timeout = d10, this.timeoutTimer = null, this.recHooks = [], this.sent = false, this.ref = void 0;
        }
        resend(a10) {
          this.timeout = a10, this.reset(), this.send();
        }
        send() {
          this.hasReceived("timeout") || (this.startTimeout(), this.sent = true, this.channel.socket.push({ topic: this.channel.topic, event: this.event, payload: this.payload(), ref: this.ref, join_ref: this.channel.joinRef() }));
        }
        receive(a10, b10) {
          return this.hasReceived(a10) && b10(this.receivedResp.response), this.recHooks.push({ status: a10, callback: b10 }), this;
        }
        reset() {
          this.cancelRefEvent(), this.ref = null, this.refEvent = null, this.receivedResp = null, this.sent = false;
        }
        destroy() {
          this.cancelRefEvent(), this.cancelTimeout();
        }
        matchReceive({ status: a10, response: b10, _ref: c10 }) {
          this.recHooks.filter((b11) => b11.status === a10).forEach((a11) => a11.callback(b10));
        }
        cancelRefEvent() {
          this.refEvent && this.channel.off(this.refEvent);
        }
        cancelTimeout() {
          clearTimeout(this.timeoutTimer), this.timeoutTimer = null;
        }
        startTimeout() {
          this.timeoutTimer && this.cancelTimeout(), this.ref = this.channel.socket.makeRef(), this.refEvent = this.channel.replyEventName(this.ref), this.channel.on(this.refEvent, (a10) => {
            this.cancelRefEvent(), this.cancelTimeout(), this.receivedResp = a10, this.matchReceive(a10);
          }), this.timeoutTimer = setTimeout(() => {
            this.trigger("timeout", {});
          }, this.timeout);
        }
        hasReceived(a10) {
          return this.receivedResp && this.receivedResp.status === a10;
        }
        trigger(a10, b10) {
          this.channel.trigger(this.refEvent, { status: a10, response: b10 });
        }
      }, ey = class {
        constructor(a10, b10) {
          this.callback = a10, this.timerCalc = b10, this.timer = void 0, this.tries = 0;
        }
        reset() {
          this.tries = 0, clearTimeout(this.timer);
        }
        scheduleTimeout() {
          clearTimeout(this.timer), this.timer = setTimeout(() => {
            this.tries = this.tries + 1, this.callback();
          }, this.timerCalc(this.tries + 1));
        }
      }, ez = class {
        constructor(a10, b10, c10) {
          this.state = em, this.topic = a10, this.params = ej(b10 || {}), this.socket = c10, this.bindings = [], this.bindingRef = 0, this.timeout = this.socket.timeout, this.joinedOnce = false, this.joinPush = new ex(this, "phx_join", this.params, this.timeout), this.pushBuffer = [], this.stateChangeRefs = [], this.rejoinTimer = new ey(() => {
            this.socket.isConnected() && this.rejoin();
          }, this.socket.rejoinAfterMs), this.stateChangeRefs.push(this.socket.onError(() => this.rejoinTimer.reset())), this.stateChangeRefs.push(this.socket.onOpen(() => {
            this.rejoinTimer.reset(), this.isErrored() && this.rejoin();
          })), this.joinPush.receive("ok", () => {
            this.state = eo, this.rejoinTimer.reset(), this.pushBuffer.forEach((a11) => a11.send()), this.pushBuffer = [];
          }), this.joinPush.receive("error", (a11) => {
            this.state = en, this.socket.hasLogger() && this.socket.log("channel", `error ${this.topic}`, a11), this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
          }), this.onClose(() => {
            this.rejoinTimer.reset(), this.socket.hasLogger() && this.socket.log("channel", `close ${this.topic}`), this.state = em, this.socket.remove(this);
          }), this.onError((a11) => {
            this.socket.hasLogger() && this.socket.log("channel", `error ${this.topic}`, a11), this.isJoining() && this.joinPush.reset(), this.state = en, this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
          }), this.joinPush.receive("timeout", () => {
            this.socket.hasLogger() && this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout), new ex(this, eu, ej({}), this.timeout).send(), this.state = en, this.joinPush.reset(), this.socket.isConnected() && this.rejoinTimer.scheduleTimeout();
          }), this.on(et, (a11, b11) => {
            this.trigger(this.replyEventName(b11), a11);
          });
        }
        join(a10 = this.timeout) {
          if (!this.joinedOnce) return this.timeout = a10, this.joinedOnce = true, this.rejoin(), this.joinPush;
          throw Error("tried to join multiple times. 'join' can only be called a single time per channel instance");
        }
        teardown() {
          this.pushBuffer.forEach((a10) => a10.destroy()), this.pushBuffer = [], this.rejoinTimer.reset(), this.joinPush.destroy(), this.state = em, this.bindings = [];
        }
        onClose(a10) {
          this.on(er, a10);
        }
        onError(a10) {
          return this.on(es, (b10) => a10(b10));
        }
        on(a10, b10) {
          let c10 = this.bindingRef++;
          return this.bindings.push({ event: a10, ref: c10, callback: b10 }), c10;
        }
        off(a10, b10) {
          this.bindings = this.bindings.filter((c10) => c10.event !== a10 || void 0 !== b10 && b10 !== c10.ref);
        }
        canPush() {
          return this.socket.isConnected() && this.isJoined();
        }
        push(a10, b10, c10 = this.timeout) {
          if (b10 = b10 || {}, !this.joinedOnce) throw Error(`tried to push '${a10}' to '${this.topic}' before joining. Use channel.join() before pushing events`);
          let d10 = new ex(this, a10, function() {
            return b10;
          }, c10);
          return this.canPush() ? d10.send() : (d10.startTimeout(), this.pushBuffer.push(d10)), d10;
        }
        leave(a10 = this.timeout) {
          this.rejoinTimer.reset(), this.joinPush.cancelTimeout(), this.state = eq;
          let b10 = () => {
            this.socket.hasLogger() && this.socket.log("channel", `leave ${this.topic}`), this.trigger(er, "leave");
          }, c10 = new ex(this, eu, ej({}), a10);
          return c10.receive("ok", () => b10()).receive("timeout", () => b10()), c10.send(), this.canPush() || c10.trigger("ok", {}), c10;
        }
        onMessage(a10, b10, c10) {
          return b10;
        }
        filterBindings(a10, b10, c10) {
          return true;
        }
        isMember(a10, b10, c10, d10) {
          return this.topic === a10 && (!d10 || d10 === this.joinRef() || (this.socket.hasLogger() && this.socket.log("channel", "dropping outdated message", { topic: a10, event: b10, payload: c10, joinRef: d10 }), false));
        }
        joinRef() {
          return this.joinPush.ref;
        }
        rejoin(a10 = this.timeout) {
          this.isLeaving() || (this.socket.leaveOpenTopic(this.topic), this.state = ep, this.joinPush.resend(a10));
        }
        trigger(a10, b10, c10, d10) {
          let e10 = this.onMessage(a10, b10, c10, d10);
          if (b10 && !e10) throw Error("channel onMessage callbacks must return the payload, modified or unmodified");
          let f10 = this.bindings.filter((d11) => d11.event === a10 && this.filterBindings(d11, b10, c10));
          for (let a11 = 0; a11 < f10.length; a11++) f10[a11].callback(e10, c10, d10 || this.joinRef());
        }
        replyEventName(a10) {
          return `chan_reply_${a10}`;
        }
        isClosed() {
          return this.state === em;
        }
        isErrored() {
          return this.state === en;
        }
        isJoined() {
          return this.state === eo;
        }
        isJoining() {
          return this.state === ep;
        }
        isLeaving() {
          return this.state === eq;
        }
      }, eA = class {
        static request(a10, b10, c10, d10, e10, f10, g10) {
          if (el.XDomainRequest) {
            let c11 = new el.XDomainRequest();
            return this.xdomainRequest(c11, a10, b10, d10, e10, f10, g10);
          }
          if (el.XMLHttpRequest) {
            let h10 = new el.XMLHttpRequest();
            return this.xhrRequest(h10, a10, b10, c10, d10, e10, f10, g10);
          }
          if (el.fetch && el.AbortController) return this.fetchRequest(a10, b10, c10, d10, e10, f10, g10);
          throw Error("No suitable XMLHttpRequest implementation found");
        }
        static fetchRequest(a10, b10, c10, d10, e10, f10, g10) {
          let h10 = { method: a10, headers: c10, body: d10 }, i10 = null;
          return e10 && (i10 = new AbortController(), setTimeout(() => i10.abort(), e10), h10.signal = i10.signal), el.fetch(b10, h10).then((a11) => a11.text()).then((a11) => this.parseJSON(a11)).then((a11) => g10 && g10(a11)).catch((a11) => {
            "AbortError" === a11.name && f10 ? f10() : g10 && g10(null);
          }), i10;
        }
        static xdomainRequest(a10, b10, c10, d10, e10, f10, g10) {
          return a10.timeout = e10, a10.open(b10, c10), a10.onload = () => {
            let b11 = this.parseJSON(a10.responseText);
            g10 && g10(b11);
          }, f10 && (a10.ontimeout = f10), a10.onprogress = () => {
          }, a10.send(d10), a10;
        }
        static xhrRequest(a10, b10, c10, d10, e10, f10, g10, h10) {
          for (let [e11, g11] of (a10.open(b10, c10, true), a10.timeout = f10, Object.entries(d10))) a10.setRequestHeader(e11, g11);
          return a10.onerror = () => h10 && h10(null), a10.onreadystatechange = () => {
            4 === a10.readyState && h10 && h10(this.parseJSON(a10.responseText));
          }, g10 && (a10.ontimeout = g10), a10.send(e10), a10;
        }
        static parseJSON(a10) {
          if (!a10 || "" === a10) return null;
          try {
            return JSON.parse(a10);
          } catch {
            return console && console.log("failed to parse JSON response", a10), null;
          }
        }
        static serialize(a10, b10) {
          let c10 = [];
          for (var d10 in a10) {
            if (!Object.prototype.hasOwnProperty.call(a10, d10)) continue;
            let e10 = b10 ? `${b10}[${d10}]` : d10, f10 = a10[d10];
            "object" == typeof f10 ? c10.push(this.serialize(f10, e10)) : c10.push(encodeURIComponent(e10) + "=" + encodeURIComponent(f10));
          }
          return c10.join("&");
        }
        static appendParams(a10, b10) {
          if (0 === Object.keys(b10).length) return a10;
          let c10 = a10.match(/\?/) ? "&" : "?";
          return `${a10}${c10}${this.serialize(b10)}`;
        }
      }, eB = class {
        constructor(a10, b10) {
          b10 && 2 === b10.length && b10[1].startsWith(ew) && (this.authToken = atob(b10[1].slice(ew.length))), this.endPoint = null, this.token = null, this.skipHeartbeat = true, this.reqs = /* @__PURE__ */ new Set(), this.awaitingBatchAck = false, this.currentBatch = null, this.currentBatchTimer = null, this.batchBuffer = [], this.onopen = function() {
          }, this.onerror = function() {
          }, this.onmessage = function() {
          }, this.onclose = function() {
          }, this.pollEndpoint = this.normalizeEndpoint(a10), this.readyState = 0, setTimeout(() => this.poll(), 0);
        }
        normalizeEndpoint(a10) {
          return a10.replace("ws://", "http://").replace("wss://", "https://").replace(RegExp("(.*)/" + ev), "$1/longpoll");
        }
        endpointURL() {
          return eA.appendParams(this.pollEndpoint, { token: this.token });
        }
        closeAndRetry(a10, b10, c10) {
          this.close(a10, b10, c10), this.readyState = 0;
        }
        ontimeout() {
          this.onerror("timeout"), this.closeAndRetry(1005, "timeout", false);
        }
        isActive() {
          return 1 === this.readyState || 0 === this.readyState;
        }
        poll() {
          let a10 = { Accept: "application/json" };
          this.authToken && (a10["X-Phoenix-AuthToken"] = this.authToken), this.ajax("GET", a10, null, () => this.ontimeout(), (a11) => {
            if (a11) {
              var { status: b10, token: c10, messages: d10 } = a11;
              if (410 === b10 && null !== this.token) {
                this.onerror(410), this.closeAndRetry(3410, "session_gone", false);
                return;
              }
              this.token = c10;
            } else b10 = 0;
            switch (b10) {
              case 200:
                d10.forEach((a12) => {
                  setTimeout(() => this.onmessage({ data: a12 }), 0);
                }), this.poll();
                break;
              case 204:
                this.poll();
                break;
              case 410:
                this.readyState = 1, this.onopen({}), this.poll();
                break;
              case 403:
                this.onerror(403), this.close(1008, "forbidden", false);
                break;
              case 0:
              case 500:
                this.onerror(500), this.closeAndRetry(1011, "internal server error", 500);
                break;
              default:
                throw Error(`unhandled poll status ${b10}`);
            }
          });
        }
        send(a10) {
          "string" != typeof a10 && (a10 = ((a11) => {
            let b10 = "", c10 = new Uint8Array(a11), d10 = c10.byteLength;
            for (let a12 = 0; a12 < d10; a12++) b10 += String.fromCharCode(c10[a12]);
            return btoa(b10);
          })(a10)), this.currentBatch ? this.currentBatch.push(a10) : this.awaitingBatchAck ? this.batchBuffer.push(a10) : (this.currentBatch = [a10], this.currentBatchTimer = setTimeout(() => {
            this.batchSend(this.currentBatch), this.currentBatch = null;
          }, 0));
        }
        batchSend(a10) {
          this.awaitingBatchAck = true, this.ajax("POST", { "Content-Type": "application/x-ndjson" }, a10.join("\n"), () => this.onerror("timeout"), (a11) => {
            this.awaitingBatchAck = false, a11 && 200 === a11.status ? this.batchBuffer.length > 0 && (this.batchSend(this.batchBuffer), this.batchBuffer = []) : (this.onerror(a11 && a11.status), this.closeAndRetry(1011, "internal server error", false));
          });
        }
        close(a10, b10, c10) {
          for (let a11 of this.reqs) a11.abort();
          this.readyState = 3;
          let d10 = Object.assign({ code: 1e3, reason: void 0, wasClean: true }, { code: a10, reason: b10, wasClean: c10 });
          this.batchBuffer = [], clearTimeout(this.currentBatchTimer), this.currentBatchTimer = null, "u" > typeof CloseEvent ? this.onclose(new CloseEvent("close", d10)) : this.onclose(d10);
        }
        ajax(a10, b10, c10, d10, e10) {
          let f10, g10 = () => {
            this.reqs.delete(f10), d10();
          };
          f10 = eA.request(a10, this.endpointURL(), b10, c10, this.timeout, g10, (a11) => {
            this.reqs.delete(f10), this.isActive() && e10(a11);
          }), this.reqs.add(f10);
        }
      }, eC = class a10 {
        constructor(b10, c10 = {}) {
          let d10 = c10.events || { state: "presence_state", diff: "presence_diff" };
          this.state = {}, this.pendingDiffs = [], this.channel = b10, this.joinRef = null, this.caller = { onJoin: function() {
          }, onLeave: function() {
          }, onSync: function() {
          } }, this.channel.on(d10.state, (b11) => {
            let { onJoin: c11, onLeave: d11, onSync: e10 } = this.caller;
            this.joinRef = this.channel.joinRef(), this.state = a10.syncState(this.state, b11, c11, d11), this.pendingDiffs.forEach((b12) => {
              this.state = a10.syncDiff(this.state, b12, c11, d11);
            }), this.pendingDiffs = [], e10();
          }), this.channel.on(d10.diff, (b11) => {
            let { onJoin: c11, onLeave: d11, onSync: e10 } = this.caller;
            this.inPendingSyncState() ? this.pendingDiffs.push(b11) : (this.state = a10.syncDiff(this.state, b11, c11, d11), e10());
          });
        }
        onJoin(a11) {
          this.caller.onJoin = a11;
        }
        onLeave(a11) {
          this.caller.onLeave = a11;
        }
        onSync(a11) {
          this.caller.onSync = a11;
        }
        list(b10) {
          return a10.list(this.state, b10);
        }
        inPendingSyncState() {
          return !this.joinRef || this.joinRef !== this.channel.joinRef();
        }
        static syncState(a11, b10, c10, d10) {
          let e10 = this.clone(a11), f10 = {}, g10 = {};
          return this.map(e10, (a12, c11) => {
            b10[a12] || (g10[a12] = c11);
          }), this.map(b10, (a12, b11) => {
            let c11 = e10[a12];
            if (c11) {
              let d11 = b11.metas.map((a13) => a13.phx_ref), e11 = c11.metas.map((a13) => a13.phx_ref), h10 = b11.metas.filter((a13) => 0 > e11.indexOf(a13.phx_ref)), i10 = c11.metas.filter((a13) => 0 > d11.indexOf(a13.phx_ref));
              h10.length > 0 && (f10[a12] = b11, f10[a12].metas = h10), i10.length > 0 && (g10[a12] = this.clone(c11), g10[a12].metas = i10);
            } else f10[a12] = b11;
          }), this.syncDiff(e10, { joins: f10, leaves: g10 }, c10, d10);
        }
        static syncDiff(a11, b10, c10, d10) {
          let { joins: e10, leaves: f10 } = this.clone(b10);
          return c10 || (c10 = function() {
          }), d10 || (d10 = function() {
          }), this.map(e10, (b11, d11) => {
            let e11 = a11[b11];
            if (a11[b11] = this.clone(d11), e11) {
              let c11 = a11[b11].metas.map((a12) => a12.phx_ref), d12 = e11.metas.filter((a12) => 0 > c11.indexOf(a12.phx_ref));
              a11[b11].metas.unshift(...d12);
            }
            c10(b11, e11, d11);
          }), this.map(f10, (b11, c11) => {
            let e11 = a11[b11];
            if (!e11) return;
            let f11 = c11.metas.map((a12) => a12.phx_ref);
            e11.metas = e11.metas.filter((a12) => 0 > f11.indexOf(a12.phx_ref)), d10(b11, e11, c11), 0 === e11.metas.length && delete a11[b11];
          }), a11;
        }
        static list(a11, b10) {
          return b10 || (b10 = function(a12, b11) {
            return b11;
          }), this.map(a11, (a12, c10) => b10(a12, c10));
        }
        static map(a11, b10) {
          return Object.getOwnPropertyNames(a11).map((c10) => b10(c10, a11[c10]));
        }
        static clone(a11) {
          return JSON.parse(JSON.stringify(a11));
        }
      }, eD = { HEADER_LENGTH: 1, META_LENGTH: 4, KINDS: { push: 0, reply: 1, broadcast: 2 }, encode(a10, b10) {
        return a10.payload.constructor === ArrayBuffer ? b10(this.binaryEncode(a10)) : b10(JSON.stringify([a10.join_ref, a10.ref, a10.topic, a10.event, a10.payload]));
      }, decode(a10, b10) {
        if (a10.constructor === ArrayBuffer) return b10(this.binaryDecode(a10));
        {
          let [c10, d10, e10, f10, g10] = JSON.parse(a10);
          return b10({ join_ref: c10, ref: d10, topic: e10, event: f10, payload: g10 });
        }
      }, binaryEncode(a10) {
        let { join_ref: b10, ref: c10, event: d10, topic: e10, payload: f10 } = a10, g10 = this.META_LENGTH + b10.length + c10.length + e10.length + d10.length, h10 = new ArrayBuffer(this.HEADER_LENGTH + g10), i10 = new DataView(h10), j10 = 0;
        i10.setUint8(j10++, this.KINDS.push), i10.setUint8(j10++, b10.length), i10.setUint8(j10++, c10.length), i10.setUint8(j10++, e10.length), i10.setUint8(j10++, d10.length), Array.from(b10, (a11) => i10.setUint8(j10++, a11.charCodeAt(0))), Array.from(c10, (a11) => i10.setUint8(j10++, a11.charCodeAt(0))), Array.from(e10, (a11) => i10.setUint8(j10++, a11.charCodeAt(0))), Array.from(d10, (a11) => i10.setUint8(j10++, a11.charCodeAt(0)));
        var k2 = new Uint8Array(h10.byteLength + f10.byteLength);
        return k2.set(new Uint8Array(h10), 0), k2.set(new Uint8Array(f10), h10.byteLength), k2.buffer;
      }, binaryDecode(a10) {
        let b10 = new DataView(a10), c10 = b10.getUint8(0), d10 = new TextDecoder();
        switch (c10) {
          case this.KINDS.push:
            return this.decodePush(a10, b10, d10);
          case this.KINDS.reply:
            return this.decodeReply(a10, b10, d10);
          case this.KINDS.broadcast:
            return this.decodeBroadcast(a10, b10, d10);
        }
      }, decodePush(a10, b10, c10) {
        let d10 = b10.getUint8(1), e10 = b10.getUint8(2), f10 = b10.getUint8(3), g10 = this.HEADER_LENGTH + this.META_LENGTH - 1, h10 = c10.decode(a10.slice(g10, g10 + d10));
        g10 += d10;
        let i10 = c10.decode(a10.slice(g10, g10 + e10));
        g10 += e10;
        let j10 = c10.decode(a10.slice(g10, g10 + f10));
        return g10 += f10, { join_ref: h10, ref: null, topic: i10, event: j10, payload: a10.slice(g10, a10.byteLength) };
      }, decodeReply(a10, b10, c10) {
        let d10 = b10.getUint8(1), e10 = b10.getUint8(2), f10 = b10.getUint8(3), g10 = b10.getUint8(4), h10 = this.HEADER_LENGTH + this.META_LENGTH, i10 = c10.decode(a10.slice(h10, h10 + d10));
        h10 += d10;
        let j10 = c10.decode(a10.slice(h10, h10 + e10));
        h10 += e10;
        let k2 = c10.decode(a10.slice(h10, h10 + f10));
        h10 += f10;
        let l2 = c10.decode(a10.slice(h10, h10 + g10));
        return h10 += g10, { join_ref: i10, ref: j10, topic: k2, event: et, payload: { status: l2, response: a10.slice(h10, a10.byteLength) } };
      }, decodeBroadcast(a10, b10, c10) {
        let d10 = b10.getUint8(1), e10 = b10.getUint8(2), f10 = this.HEADER_LENGTH + 2, g10 = c10.decode(a10.slice(f10, f10 + d10));
        f10 += d10;
        let h10 = c10.decode(a10.slice(f10, f10 + e10));
        return f10 += e10, { join_ref: null, ref: null, topic: g10, event: h10, payload: a10.slice(f10, a10.byteLength) };
      } }, eE = class {
        constructor(a10, b10 = {}) {
          this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] }, this.channels = [], this.sendBuffer = [], this.ref = 0, this.fallbackRef = null, this.timeout = b10.timeout || 1e4, this.transport = b10.transport || el.WebSocket || eB, this.conn = void 0, this.primaryPassedHealthCheck = false, this.longPollFallbackMs = b10.longPollFallbackMs, this.fallbackTimer = null;
          let c10 = null;
          try {
            c10 = el && el.sessionStorage;
          } catch {
          }
          this.sessionStore = b10.sessionStorage || c10, this.establishedConnections = 0, this.defaultEncoder = eD.encode.bind(eD), this.defaultDecoder = eD.decode.bind(eD), this.closeWasClean = true, this.disconnecting = false, this.binaryType = b10.binaryType || "arraybuffer", this.connectClock = 1, this.pageHidden = false, this.encode = void 0, this.decode = void 0, this.transport !== eB ? (this.encode = b10.encode || this.defaultEncoder, this.decode = b10.decode || this.defaultDecoder) : (this.encode = this.defaultEncoder, this.decode = this.defaultDecoder);
          let d10 = null;
          ek && ek.addEventListener && (ek.addEventListener("pagehide", (a11) => {
            this.conn && (this.disconnect(), d10 = this.connectClock);
          }), ek.addEventListener("pageshow", (a11) => {
            d10 === this.connectClock && (d10 = null, this.connect());
          }), ek.addEventListener("visibilitychange", () => {
            "hidden" === document.visibilityState ? this.pageHidden = true : (this.pageHidden = false, this.isConnected() || this.closeWasClean || this.teardown(() => this.connect()));
          })), this.heartbeatIntervalMs = b10.heartbeatIntervalMs || 3e4, this.autoSendHeartbeat = b10.autoSendHeartbeat ?? true, this.heartbeatCallback = b10.heartbeatCallback ?? (() => {
          }), this.rejoinAfterMs = (a11) => b10.rejoinAfterMs ? b10.rejoinAfterMs(a11) : [1e3, 2e3, 5e3][a11 - 1] || 1e4, this.reconnectAfterMs = (a11) => b10.reconnectAfterMs ? b10.reconnectAfterMs(a11) : [10, 50, 100, 150, 200, 250, 500, 1e3, 2e3][a11 - 1] || 5e3, this.logger = b10.logger || null, !this.logger && b10.debug && (this.logger = (a11, b11, c11) => {
            console.log(`${a11}: ${b11}`, c11);
          }), this.longpollerTimeout = b10.longpollerTimeout || 2e4, this.params = ej(b10.params || {}), this.endPoint = `${a10}/${ev}`, this.vsn = b10.vsn || "2.0.0", this.heartbeatTimeoutTimer = null, this.heartbeatTimer = null, this.heartbeatSentAt = null, this.pendingHeartbeatRef = null, this.reconnectTimer = new ey(() => {
            if (this.pageHidden) {
              this.log("Not reconnecting as page is hidden!"), this.teardown();
              return;
            }
            this.teardown(async () => {
              b10.beforeReconnect && await b10.beforeReconnect(), this.connect();
            });
          }, this.reconnectAfterMs), this.authToken = b10.authToken;
        }
        getLongPollTransport() {
          return eB;
        }
        replaceTransport(a10) {
          this.connectClock++, this.closeWasClean = true, clearTimeout(this.fallbackTimer), this.reconnectTimer.reset(), this.conn && (this.conn.close(), this.conn = null), this.transport = a10;
        }
        protocol() {
          return location.protocol.match(/^https/) ? "wss" : "ws";
        }
        endPointURL() {
          let a10 = eA.appendParams(eA.appendParams(this.endPoint, this.params()), { vsn: this.vsn });
          return "/" !== a10.charAt(0) ? a10 : "/" === a10.charAt(1) ? `${this.protocol()}:${a10}` : `${this.protocol()}://${location.host}${a10}`;
        }
        disconnect(a10, b10, c10) {
          this.connectClock++, this.disconnecting = true, this.closeWasClean = true, clearTimeout(this.fallbackTimer), this.reconnectTimer.reset(), this.teardown(() => {
            this.disconnecting = false, a10 && a10();
          }, b10, c10);
        }
        connect(a10) {
          a10 && (console && console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor"), this.params = ej(a10)), (!this.conn || this.disconnecting) && (this.longPollFallbackMs && this.transport !== eB ? this.connectWithFallback(eB, this.longPollFallbackMs) : this.transportConnect());
        }
        log(a10, b10, c10) {
          this.logger && this.logger(a10, b10, c10);
        }
        hasLogger() {
          return null !== this.logger;
        }
        onOpen(a10) {
          let b10 = this.makeRef();
          return this.stateChangeCallbacks.open.push([b10, a10]), b10;
        }
        onClose(a10) {
          let b10 = this.makeRef();
          return this.stateChangeCallbacks.close.push([b10, a10]), b10;
        }
        onError(a10) {
          let b10 = this.makeRef();
          return this.stateChangeCallbacks.error.push([b10, a10]), b10;
        }
        onMessage(a10) {
          let b10 = this.makeRef();
          return this.stateChangeCallbacks.message.push([b10, a10]), b10;
        }
        onHeartbeat(a10) {
          this.heartbeatCallback = a10;
        }
        ping(a10) {
          if (!this.isConnected()) return false;
          let b10 = this.makeRef(), c10 = Date.now();
          this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: b10 });
          let d10 = this.onMessage((e10) => {
            e10.ref === b10 && (this.off([d10]), a10(Date.now() - c10));
          });
          return true;
        }
        transportName(a10) {
          return a10 === eB ? "LongPoll" : a10.name;
        }
        transportConnect() {
          let a10;
          this.connectClock++, this.closeWasClean = false, this.authToken && (a10 = ["phoenix", `${ew}${btoa(this.authToken).replace(/=/g, "")}`]), this.conn = new this.transport(this.endPointURL(), a10), this.conn.binaryType = this.binaryType, this.conn.timeout = this.longpollerTimeout, this.conn.onopen = () => this.onConnOpen(), this.conn.onerror = (a11) => this.onConnError(a11), this.conn.onmessage = (a11) => this.onConnMessage(a11), this.conn.onclose = (a11) => this.onConnClose(a11);
        }
        getSession(a10) {
          return this.sessionStore && this.sessionStore.getItem(a10);
        }
        storeSession(a10, b10) {
          this.sessionStore && this.sessionStore.setItem(a10, b10);
        }
        connectWithFallback(a10, b10 = 2500) {
          let c10, d10;
          clearTimeout(this.fallbackTimer);
          let e10 = false, f10 = true, g10 = this.transportName(a10), h10 = (b11) => {
            this.log("transport", `falling back to ${g10}...`, b11), this.off([c10, d10]), f10 = false, this.replaceTransport(a10), this.transportConnect();
          };
          if (this.getSession(`phx:fallback:${g10}`)) return h10("memorized");
          this.fallbackTimer = setTimeout(h10, b10), d10 = this.onError((a11) => {
            this.log("transport", "error", a11), f10 && !e10 && (clearTimeout(this.fallbackTimer), h10(a11));
          }), this.fallbackRef && this.off([this.fallbackRef]), this.fallbackRef = this.onOpen(() => {
            if (e10 = true, !f10) {
              let b11 = this.transportName(a10);
              return this.primaryPassedHealthCheck || this.storeSession(`phx:fallback:${b11}`, "true"), this.log("transport", `established ${b11} fallback`);
            }
            clearTimeout(this.fallbackTimer), this.fallbackTimer = setTimeout(h10, b10), this.ping((a11) => {
              this.log("transport", "connected to primary after", a11), this.primaryPassedHealthCheck = true, clearTimeout(this.fallbackTimer);
            });
          }), this.transportConnect();
        }
        clearHeartbeats() {
          clearTimeout(this.heartbeatTimer), clearTimeout(this.heartbeatTimeoutTimer);
        }
        onConnOpen() {
          this.hasLogger() && this.log("transport", `connected to ${this.endPointURL()}`), this.closeWasClean = false, this.disconnecting = false, this.establishedConnections++, this.flushSendBuffer(), this.reconnectTimer.reset(), this.autoSendHeartbeat && this.resetHeartbeat(), this.triggerStateCallbacks("open");
        }
        heartbeatTimeout() {
          if (this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null, this.heartbeatSentAt = null, this.hasLogger() && this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
            try {
              this.heartbeatCallback("timeout");
            } catch (a10) {
              this.log("error", "error in heartbeat callback", a10);
            }
            this.triggerChanError(Error("heartbeat timeout")), this.closeWasClean = false, this.teardown(() => this.reconnectTimer.scheduleTimeout(), 1e3, "heartbeat timeout");
          }
        }
        resetHeartbeat() {
          this.conn && this.conn.skipHeartbeat || (this.pendingHeartbeatRef = null, this.clearHeartbeats(), this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), this.heartbeatIntervalMs));
        }
        teardown(a10, b10, c10) {
          if (!this.conn) return a10 && a10();
          let d10 = this.conn;
          this.waitForBufferDone(d10, () => {
            b10 ? d10.close(b10, c10 || "") : d10.close(), this.waitForSocketClosed(d10, () => {
              this.conn === d10 && (this.conn.onopen = function() {
              }, this.conn.onerror = function() {
              }, this.conn.onmessage = function() {
              }, this.conn.onclose = function() {
              }, this.conn = null), a10 && a10();
            });
          });
        }
        waitForBufferDone(a10, b10, c10 = 1) {
          5 !== c10 && a10.bufferedAmount ? setTimeout(() => {
            this.waitForBufferDone(a10, b10, c10 + 1);
          }, 150 * c10) : b10();
        }
        waitForSocketClosed(a10, b10, c10 = 1) {
          5 === c10 || 3 === a10.readyState ? b10() : setTimeout(() => {
            this.waitForSocketClosed(a10, b10, c10 + 1);
          }, 150 * c10);
        }
        onConnClose(a10) {
          this.conn && (this.conn.onclose = () => {
          }), this.hasLogger() && this.log("transport", "close", a10), this.triggerChanError(a10), this.clearHeartbeats(), this.closeWasClean || this.reconnectTimer.scheduleTimeout(), this.triggerStateCallbacks("close", a10);
        }
        onConnError(a10) {
          this.hasLogger() && this.log("transport", "error", a10);
          let b10 = this.transport, c10 = this.establishedConnections;
          this.triggerStateCallbacks("error", a10, b10, c10), (b10 === this.transport || c10 > 0) && this.triggerChanError(a10);
        }
        triggerChanError(a10) {
          this.channels.forEach((b10) => {
            b10.isErrored() || b10.isLeaving() || b10.isClosed() || b10.trigger(es, a10);
          });
        }
        connectionState() {
          switch (this.conn && this.conn.readyState) {
            case 0:
              return "connecting";
            case 1:
              return "open";
            case 2:
              return "closing";
            default:
              return "closed";
          }
        }
        isConnected() {
          return "open" === this.connectionState();
        }
        remove(a10) {
          this.off(a10.stateChangeRefs), this.channels = this.channels.filter((b10) => b10 !== a10);
        }
        off(a10) {
          for (let b10 in this.stateChangeCallbacks) this.stateChangeCallbacks[b10] = this.stateChangeCallbacks[b10].filter(([b11]) => -1 === a10.indexOf(b11));
        }
        channel(a10, b10 = {}) {
          let c10 = new ez(a10, b10, this);
          return this.channels.push(c10), c10;
        }
        push(a10) {
          if (this.hasLogger()) {
            let { topic: b10, event: c10, payload: d10, ref: e10, join_ref: f10 } = a10;
            this.log("push", `${b10} ${c10} (${f10}, ${e10})`, d10);
          }
          this.isConnected() ? this.encode(a10, (a11) => this.conn.send(a11)) : this.sendBuffer.push(() => this.encode(a10, (a11) => this.conn.send(a11)));
        }
        makeRef() {
          let a10 = this.ref + 1;
          return a10 === this.ref ? this.ref = 0 : this.ref = a10, this.ref.toString();
        }
        sendHeartbeat() {
          if (!this.isConnected()) {
            try {
              this.heartbeatCallback("disconnected");
            } catch (a10) {
              this.log("error", "error in heartbeat callback", a10);
            }
            return;
          }
          if (this.pendingHeartbeatRef) return void this.heartbeatTimeout();
          this.pendingHeartbeatRef = this.makeRef(), this.heartbeatSentAt = Date.now(), this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.pendingHeartbeatRef });
          try {
            this.heartbeatCallback("sent");
          } catch (a10) {
            this.log("error", "error in heartbeat callback", a10);
          }
          this.heartbeatTimeoutTimer = setTimeout(() => this.heartbeatTimeout(), this.heartbeatIntervalMs);
        }
        flushSendBuffer() {
          this.isConnected() && this.sendBuffer.length > 0 && (this.sendBuffer.forEach((a10) => a10()), this.sendBuffer = []);
        }
        onConnMessage(a10) {
          this.decode(a10.data, (a11) => {
            let { topic: b10, event: c10, payload: d10, ref: e10, join_ref: f10 } = a11;
            if (e10 && e10 === this.pendingHeartbeatRef) {
              let a12 = this.heartbeatSentAt ? Date.now() - this.heartbeatSentAt : void 0;
              this.clearHeartbeats();
              try {
                this.heartbeatCallback("ok" === d10.status ? "ok" : "error", a12);
              } catch (a13) {
                this.log("error", "error in heartbeat callback", a13);
              }
              this.pendingHeartbeatRef = null, this.heartbeatSentAt = null, this.autoSendHeartbeat && (this.heartbeatTimer = setTimeout(() => this.sendHeartbeat(), this.heartbeatIntervalMs));
            }
            this.hasLogger() && this.log("receive", `${d10.status || ""} ${b10} ${c10} ${e10 && "(" + e10 + ")" || ""}`.trim(), d10);
            for (let a12 = 0; a12 < this.channels.length; a12++) {
              let g10 = this.channels[a12];
              g10.isMember(b10, c10, d10, f10) && g10.trigger(c10, d10, e10, f10);
            }
            this.triggerStateCallbacks("message", a11);
          });
        }
        triggerStateCallbacks(a10, ...b10) {
          try {
            this.stateChangeCallbacks[a10].forEach(([c10, d10]) => {
              try {
                d10(...b10);
              } catch (b11) {
                this.log("error", `error in ${a10} callback`, b11);
              }
            });
          } catch (b11) {
            this.log("error", `error triggering ${a10} callbacks`, b11);
          }
        }
        leaveOpenTopic(a10) {
          let b10 = this.channels.find((b11) => b11.topic === a10 && (b11.isJoined() || b11.isJoining()));
          b10 && (this.hasLogger() && this.log("transport", `leaving duplicate topic "${a10}"`), b10.leave());
        }
      };
      class eF {
        constructor(a10, b10) {
          const c10 = function(a11) {
            return (null == a11 ? void 0 : a11.events) && { events: a11.events };
          }(b10);
          this.presence = new eC(a10.getChannel(), c10), this.presence.onJoin((b11, c11, d10) => {
            let e10 = eF.onJoinPayload(b11, c11, d10);
            a10.getChannel().trigger("presence", e10);
          }), this.presence.onLeave((b11, c11, d10) => {
            let e10 = eF.onLeavePayload(b11, c11, d10);
            a10.getChannel().trigger("presence", e10);
          }), this.presence.onSync(() => {
            a10.getChannel().trigger("presence", { event: "sync" });
          });
        }
        get state() {
          return eF.transformState(this.presence.state);
        }
        static transformState(a10) {
          return Object.getOwnPropertyNames(a10 = JSON.parse(JSON.stringify(a10))).reduce((b10, c10) => {
            let d10 = a10[c10];
            return b10[c10] = eG(d10), b10;
          }, {});
        }
        static onJoinPayload(a10, b10, c10) {
          return { event: "join", key: a10, currentPresences: eH(b10), newPresences: eG(c10) };
        }
        static onLeavePayload(a10, b10, c10) {
          return { event: "leave", key: a10, currentPresences: eH(b10), leftPresences: eG(c10) };
        }
      }
      function eG(a10) {
        return a10.metas.map((a11) => (a11.presence_ref = a11.phx_ref, delete a11.phx_ref, delete a11.phx_ref_prev, a11));
      }
      function eH(a10) {
        return (null == a10 ? void 0 : a10.metas) ? eG(a10) : [];
      }
      (B = I || (I = {})).SYNC = "sync", B.JOIN = "join", B.LEAVE = "leave";
      class eI {
        get state() {
          return this.presenceAdapter.state;
        }
        constructor(a10, b10) {
          this.channel = a10, this.presenceAdapter = new eF(this.channel.channelAdapter, b10);
        }
      }
      class eJ {
        constructor(a10, b10, c10) {
          const d10 = function(a11) {
            return { config: Object.assign({ broadcast: { ack: false, self: false }, presence: { key: "", enabled: false }, private: false }, a11.config) };
          }(c10);
          this.channel = a10.getSocket().channel(b10, d10), this.socket = a10;
        }
        get state() {
          return this.channel.state;
        }
        set state(a10) {
          this.channel.state = a10;
        }
        get joinedOnce() {
          return this.channel.joinedOnce;
        }
        get joinPush() {
          return this.channel.joinPush;
        }
        get rejoinTimer() {
          return this.channel.rejoinTimer;
        }
        on(a10, b10) {
          return this.channel.on(a10, b10);
        }
        off(a10, b10) {
          this.channel.off(a10, b10);
        }
        subscribe(a10) {
          return this.channel.join(a10);
        }
        unsubscribe(a10) {
          return this.channel.leave(a10);
        }
        teardown() {
          this.channel.teardown();
        }
        onClose(a10) {
          this.channel.onClose(a10);
        }
        onError(a10) {
          return this.channel.onError(a10);
        }
        push(a10, b10, c10) {
          let d10;
          try {
            d10 = this.channel.push(a10, b10, c10);
          } catch (b11) {
            throw Error(`tried to push '${a10}' to '${this.channel.topic}' before joining. Use channel.subscribe() before pushing events`);
          }
          if (this.channel.pushBuffer.length > 100) {
            let a11 = this.channel.pushBuffer.shift();
            a11.cancelTimeout(), this.socket.log("channel", `discarded push due to buffer overflow: ${a11.event}`, a11.payload());
          }
          return d10;
        }
        updateJoinPayload(a10) {
          let b10 = this.channel.joinPush.payload();
          this.channel.joinPush.payload = () => Object.assign(Object.assign({}, b10), a10);
        }
        canPush() {
          return this.socket.isConnected() && this.state === d6;
        }
        isJoined() {
          return this.state === d6;
        }
        isJoining() {
          return "joining" === this.state;
        }
        isClosed() {
          return "closed" === this.state;
        }
        isLeaving() {
          return "leaving" === this.state;
        }
        updateFilterBindings(a10) {
          this.channel.filterBindings = a10;
        }
        updatePayloadTransform(a10) {
          this.channel.onMessage = a10;
        }
        getChannel() {
          return this.channel;
        }
      }
      (C = J || (J = {})).ALL = "*", C.INSERT = "INSERT", C.UPDATE = "UPDATE", C.DELETE = "DELETE", (D = K || (K = {})).BROADCAST = "broadcast", D.PRESENCE = "presence", D.POSTGRES_CHANGES = "postgres_changes", D.SYSTEM = "system", (E = L || (L = {})).SUBSCRIBED = "SUBSCRIBED", E.TIMED_OUT = "TIMED_OUT", E.CLOSED = "CLOSED", E.CHANNEL_ERROR = "CHANNEL_ERROR";
      class eK {
        get state() {
          return this.channelAdapter.state;
        }
        set state(a10) {
          this.channelAdapter.state = a10;
        }
        get joinedOnce() {
          return this.channelAdapter.joinedOnce;
        }
        get timeout() {
          return this.socket.timeout;
        }
        get joinPush() {
          return this.channelAdapter.joinPush;
        }
        get rejoinTimer() {
          return this.channelAdapter.rejoinTimer;
        }
        constructor(a10, b10 = { config: {} }, c10) {
          var d10, e10;
          if (this.topic = a10, this.params = b10, this.socket = c10, this.bindings = {}, this.subTopic = a10.replace(/^realtime:/i, ""), this.params.config = Object.assign({ broadcast: { ack: false, self: false }, presence: { key: "", enabled: false }, private: false }, b10.config), this.channelAdapter = new eJ(this.socket.socketAdapter, a10, this.params), this.presence = new eI(this), this._onClose(() => {
            this.socket._remove(this);
          }), this._updateFilterTransform(), this.broadcastEndpointURL = ei(this.socket.socketAdapter.endPointURL()), this.private = this.params.config.private || false, !this.private && (null == (e10 = null == (d10 = this.params.config) ? void 0 : d10.broadcast) ? void 0 : e10.replay)) throw Error(`tried to use replay on public channel '${this.topic}'. It must be a private channel.`);
        }
        subscribe(a10, b10 = this.timeout) {
          var c10, d10, e10;
          if (this.socket.isConnected() || this.socket.connect(), this.channelAdapter.isClosed()) {
            let { config: { broadcast: f10, presence: g10, private: h10 } } = this.params, i10 = null != (d10 = null == (c10 = this.bindings.postgres_changes) ? void 0 : c10.map((a11) => a11.filter)) ? d10 : [], j10 = !!this.bindings[K.PRESENCE] && this.bindings[K.PRESENCE].length > 0 || (null == (e10 = this.params.config.presence) ? void 0 : e10.enabled) === true, k2 = {}, l2 = { broadcast: f10, presence: Object.assign(Object.assign({}, g10), { enabled: j10 }), postgres_changes: i10, private: h10 };
            this.socket.accessTokenValue && (k2.access_token = this.socket.accessTokenValue), this._onError((b11) => {
              null == a10 || a10(L.CHANNEL_ERROR, function(a11) {
                if (a11 instanceof Error) return a11;
                if ("string" == typeof a11) return Error(a11);
                if (a11 && "object" == typeof a11) {
                  if ("number" == typeof a11.code) {
                    let b12 = "string" == typeof a11.reason && a11.reason ? ` (${a11.reason})` : "";
                    return Error(`socket closed: ${a11.code}${b12}`, { cause: a11 });
                  }
                  return Error("channel error: transport failure", { cause: a11 });
                }
                return Error("channel error: connection lost");
              }(b11));
            }), this._onClose(() => null == a10 ? void 0 : a10(L.CLOSED)), this.updateJoinPayload(Object.assign({ config: l2 }, k2)), this._updateFilterMessage(), this.channelAdapter.subscribe(b10).receive("ok", async ({ postgres_changes: b11 }) => {
              if (this.socket._isManualToken() || this.socket.setAuth(), void 0 === b11) {
                null == a10 || a10(L.SUBSCRIBED);
                return;
              }
              this._updatePostgresBindings(b11, a10);
            }).receive("error", (b11) => {
              this.state = d5;
              let c11 = Object.values(b11).join(", ") || "error";
              null == a10 || a10(L.CHANNEL_ERROR, Error(c11, { cause: b11 }));
            }).receive("timeout", () => {
              null == a10 || a10(L.TIMED_OUT);
            });
          }
          return this;
        }
        _updatePostgresBindings(a10, b10) {
          var c10;
          let d10 = this.bindings.postgres_changes, e10 = null != (c10 = null == d10 ? void 0 : d10.length) ? c10 : 0, f10 = [];
          for (let c11 = 0; c11 < e10; c11++) {
            let e11 = d10[c11], { filter: { event: g10, schema: h10, table: i10, filter: j10 } } = e11, k2 = a10 && a10[c11];
            if (k2 && k2.event === g10 && eK.isFilterValueEqual(k2.schema, h10) && eK.isFilterValueEqual(k2.table, i10) && eK.isFilterValueEqual(k2.filter, j10)) f10.push(Object.assign(Object.assign({}, e11), { id: k2.id }));
            else {
              this.unsubscribe(), this.state = d5, null == b10 || b10(L.CHANNEL_ERROR, Error("mismatch between server and client bindings for postgres changes"));
              return;
            }
          }
          this.bindings.postgres_changes = f10, this.state != d5 && b10 && b10(L.SUBSCRIBED);
        }
        presenceState() {
          return this.presence.state;
        }
        async track(a10, b10 = {}) {
          return await this.send({ type: "presence", event: "track", payload: a10 }, b10.timeout || this.timeout);
        }
        async untrack(a10 = {}) {
          return await this.send({ type: "presence", event: "untrack" }, a10);
        }
        on(a10, b10, c10) {
          let d10 = this.channelAdapter.isJoined() || this.channelAdapter.isJoining(), e10 = a10 === K.PRESENCE || a10 === K.POSTGRES_CHANGES;
          if (d10 && e10) throw this.socket.log("channel", `cannot add \`${a10}\` callbacks for ${this.topic} after \`subscribe()\`.`), Error(`cannot add \`${a10}\` callbacks for ${this.topic} after \`subscribe()\`.`);
          return this._on(a10, b10, c10);
        }
        async httpSend(a10, b10, c10 = {}) {
          var d10;
          if (null == b10) return Promise.reject(Error("Payload is required for httpSend()"));
          let e10 = b10 instanceof ArrayBuffer || ArrayBuffer.isView(b10), f10 = { apikey: this.socket.apiKey ? this.socket.apiKey : "", "Content-Type": e10 ? "application/octet-stream" : "application/json" };
          this.socket.accessTokenValue && (f10.Authorization = `Bearer ${this.socket.accessTokenValue}`);
          let g10 = new URL(this.broadcastEndpointURL);
          g10.pathname += `/${encodeURIComponent(this.subTopic)}/events/${encodeURIComponent(a10)}`, this.private && g10.searchParams.set("private", "true");
          let h10 = { method: "POST", headers: f10, body: e10 ? b10 : JSON.stringify(b10) }, i10 = await this._fetchWithTimeout(g10.toString(), h10, null != (d10 = c10.timeout) ? d10 : this.timeout);
          if (202 === i10.status) return { success: true };
          let j10 = i10.statusText;
          try {
            let a11 = await i10.json();
            j10 = a11.error || a11.message || j10;
          } catch (a11) {
          }
          return Promise.reject(Error(j10));
        }
        async send(a10, b10 = {}) {
          var c10, d10;
          if (this.channelAdapter.canPush() || "broadcast" !== a10.type) return new Promise((c11) => {
            var d11, e10, f10;
            let g10 = this.channelAdapter.push(a10.type, a10, b10.timeout || this.timeout);
            "broadcast" !== a10.type || (null == (f10 = null == (e10 = null == (d11 = this.params) ? void 0 : d11.config) ? void 0 : e10.broadcast) ? void 0 : f10.ack) || c11("ok"), g10.receive("ok", () => c11("ok")), g10.receive("error", () => c11("error")), g10.receive("timeout", () => c11("timed out"));
          });
          {
            console.warn("Realtime send() is automatically falling back to REST API. This behavior will be deprecated in the future. Please use httpSend() explicitly for REST delivery.");
            let { event: e10, payload: f10 } = a10, g10 = { apikey: this.socket.apiKey ? this.socket.apiKey : "", "Content-Type": "application/json" };
            this.socket.accessTokenValue && (g10.Authorization = `Bearer ${this.socket.accessTokenValue}`);
            let h10 = { method: "POST", headers: g10, body: JSON.stringify({ messages: [{ topic: this.subTopic, event: e10, payload: f10, private: this.private }] }) };
            try {
              let a11 = await this._fetchWithTimeout(this.broadcastEndpointURL, h10, null != (c10 = b10.timeout) ? c10 : this.timeout);
              return await (null == (d10 = a11.body) ? void 0 : d10.cancel()), a11.ok ? "ok" : "error";
            } catch (a11) {
              if (a11 instanceof Error && "AbortError" === a11.name) return "timed out";
              return "error";
            }
          }
        }
        updateJoinPayload(a10) {
          this.channelAdapter.updateJoinPayload(a10);
        }
        async unsubscribe(a10 = this.timeout) {
          return new Promise((b10) => {
            this.channelAdapter.unsubscribe(a10).receive("ok", () => b10("ok")).receive("timeout", () => b10("timed out")).receive("error", () => b10("error"));
          });
        }
        teardown() {
          this.channelAdapter.teardown();
        }
        async _fetchWithTimeout(a10, b10, c10) {
          let d10 = new AbortController(), e10 = setTimeout(() => d10.abort(), c10), f10 = await this.socket.fetch(a10, Object.assign(Object.assign({}, b10), { signal: d10.signal }));
          return clearTimeout(e10), f10;
        }
        _on(a10, b10, c10) {
          let d10 = a10.toLocaleLowerCase(), e10 = this.channelAdapter.on(a10, c10), f10 = { type: d10, filter: b10, callback: c10, ref: e10 };
          return this.bindings[d10] ? this.bindings[d10].push(f10) : this.bindings[d10] = [f10], this._updateFilterMessage(), this;
        }
        _onClose(a10) {
          this.channelAdapter.onClose(a10);
        }
        _onError(a10) {
          this.channelAdapter.onError(a10);
        }
        _updateFilterMessage() {
          this.channelAdapter.updateFilterBindings((a10, b10, c10) => {
            var d10, e10, f10, g10, h10, i10, j10;
            let k2 = a10.event.toLocaleLowerCase();
            if (this._notThisChannelEvent(k2, c10)) return false;
            let l2 = null == (d10 = this.bindings[k2]) ? void 0 : d10.find((b11) => b11.ref === a10.ref);
            if (!l2) return true;
            if (!["broadcast", "presence", "postgres_changes"].includes(k2)) return l2.type.toLocaleLowerCase() === k2;
            if ("id" in l2) {
              let a11 = l2.id, c11 = null == (e10 = l2.filter) ? void 0 : e10.event;
              return a11 && (null == (f10 = b10.ids) ? void 0 : f10.includes(a11)) && ("*" === c11 || (null == c11 ? void 0 : c11.toLocaleLowerCase()) === (null == (g10 = b10.data) ? void 0 : g10.type.toLocaleLowerCase()));
            }
            {
              let a11 = null == (i10 = null == (h10 = null == l2 ? void 0 : l2.filter) ? void 0 : h10.event) ? void 0 : i10.toLocaleLowerCase();
              return "*" === a11 || a11 === (null == (j10 = null == b10 ? void 0 : b10.event) ? void 0 : j10.toLocaleLowerCase());
            }
          });
        }
        _notThisChannelEvent(a10, b10) {
          let { close: c10, error: d10, leave: e10, join: f10 } = d7;
          return b10 && [c10, d10, e10, f10].includes(a10) && b10 !== this.joinPush.ref;
        }
        _updateFilterTransform() {
          this.channelAdapter.updatePayloadTransform((a10, b10, c10) => {
            if ("object" == typeof b10 && "ids" in b10) {
              let a11 = b10.data, { schema: c11, table: d10, commit_timestamp: e10, type: f10, errors: g10 } = a11;
              return Object.assign(Object.assign({}, { schema: c11, table: d10, commit_timestamp: e10, eventType: f10, new: {}, old: {}, errors: g10 }), this._getPayloadRecords(a11));
            }
            return b10;
          });
        }
        copyBindings(a10) {
          if (this.joinedOnce) throw Error("cannot copy bindings into joined channel");
          for (let b10 in a10.bindings) for (let c10 of a10.bindings[b10]) this._on(c10.type, c10.filter, c10.callback);
        }
        static isFilterValueEqual(a10, b10) {
          return (null != a10 ? a10 : void 0) === (null != b10 ? b10 : void 0);
        }
        _getPayloadRecords(a10) {
          let b10 = { new: {}, old: {} };
          return ("INSERT" === a10.type || "UPDATE" === a10.type) && (b10.new = d9(a10.columns, a10.record)), ("UPDATE" === a10.type || "DELETE" === a10.type) && (b10.old = d9(a10.columns, a10.old_record)), b10;
        }
      }
      class eL {
        constructor(a10, b10) {
          this.socket = new eE(a10, b10);
        }
        get timeout() {
          return this.socket.timeout;
        }
        get endPoint() {
          return this.socket.endPoint;
        }
        get transport() {
          return this.socket.transport;
        }
        get heartbeatIntervalMs() {
          return this.socket.heartbeatIntervalMs;
        }
        get heartbeatCallback() {
          return this.socket.heartbeatCallback;
        }
        set heartbeatCallback(a10) {
          this.socket.heartbeatCallback = a10;
        }
        get heartbeatTimer() {
          return this.socket.heartbeatTimer;
        }
        get pendingHeartbeatRef() {
          return this.socket.pendingHeartbeatRef;
        }
        get reconnectTimer() {
          return this.socket.reconnectTimer;
        }
        get vsn() {
          return this.socket.vsn;
        }
        get encode() {
          return this.socket.encode;
        }
        get decode() {
          return this.socket.decode;
        }
        get reconnectAfterMs() {
          return this.socket.reconnectAfterMs;
        }
        get sendBuffer() {
          return this.socket.sendBuffer;
        }
        get stateChangeCallbacks() {
          return this.socket.stateChangeCallbacks;
        }
        connect() {
          this.socket.connect();
        }
        disconnect(a10, b10, c10, d10 = 1e4) {
          return new Promise((e10) => {
            setTimeout(() => e10("timeout"), d10), this.socket.disconnect(() => {
              a10(), e10("ok");
            }, b10, c10);
          });
        }
        push(a10) {
          this.socket.push(a10);
        }
        log(a10, b10, c10) {
          this.socket.log(a10, b10, c10);
        }
        makeRef() {
          return this.socket.makeRef();
        }
        onOpen(a10) {
          this.socket.onOpen(a10);
        }
        onClose(a10) {
          this.socket.onClose(a10);
        }
        onError(a10) {
          this.socket.onError(a10);
        }
        onMessage(a10) {
          this.socket.onMessage(a10);
        }
        isConnected() {
          return this.socket.isConnected();
        }
        isConnecting() {
          return "connecting" == this.socket.connectionState();
        }
        isDisconnecting() {
          return "closing" == this.socket.connectionState();
        }
        connectionState() {
          return this.socket.connectionState();
        }
        endPointURL() {
          return this.socket.endPointURL();
        }
        sendHeartbeat() {
          this.socket.sendHeartbeat();
        }
        getSocket() {
          return this.socket;
        }
      }
      let eM = [1e3, 2e3, 5e3, 1e4], eN = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`;
      class eO {
        get endPoint() {
          return this.socketAdapter.endPoint;
        }
        get timeout() {
          return this.socketAdapter.timeout;
        }
        get transport() {
          return this.socketAdapter.transport;
        }
        get heartbeatCallback() {
          return this.socketAdapter.heartbeatCallback;
        }
        get heartbeatIntervalMs() {
          return this.socketAdapter.heartbeatIntervalMs;
        }
        get heartbeatTimer() {
          return this.worker ? this._workerHeartbeatTimer : this.socketAdapter.heartbeatTimer;
        }
        get pendingHeartbeatRef() {
          return this.worker ? this._pendingWorkerHeartbeatRef : this.socketAdapter.pendingHeartbeatRef;
        }
        get reconnectTimer() {
          return this.socketAdapter.reconnectTimer;
        }
        get vsn() {
          return this.socketAdapter.vsn;
        }
        get encode() {
          return this.socketAdapter.encode;
        }
        get decode() {
          return this.socketAdapter.decode;
        }
        get reconnectAfterMs() {
          return this.socketAdapter.reconnectAfterMs;
        }
        get sendBuffer() {
          return this.socketAdapter.sendBuffer;
        }
        get stateChangeCallbacks() {
          return this.socketAdapter.stateChangeCallbacks;
        }
        constructor(a10, b10) {
          var c10;
          if (this.channels = [], this.accessTokenValue = null, this.accessToken = null, this.apiKey = null, this.httpEndpoint = "", this.headers = {}, this.params = {}, this.ref = 0, this.serializer = new d8(), this._manuallySetToken = false, this._authPromise = null, this._workerHeartbeatTimer = void 0, this._pendingWorkerHeartbeatRef = null, this._pendingDisconnectTimer = null, this._disconnectOnEmptyChannelsAfterMs = 0, this._resolveFetch = (a11) => a11 ? (...b11) => a11(...b11) : (...a12) => fetch(...a12), !(null == (c10 = null == b10 ? void 0 : b10.params) ? void 0 : c10.apikey)) throw Error("API key is required to connect to Realtime");
          this.apiKey = b10.params.apikey;
          const d10 = this._initializeOptions(b10);
          this.socketAdapter = new eL(a10, d10), this.httpEndpoint = ei(a10), this.fetch = this._resolveFetch(null == b10 ? void 0 : b10.fetch);
        }
        connect() {
          if (!(this.isConnecting() || this.isDisconnecting() || this.isConnected())) {
            this.accessToken && !this._authPromise && this._setAuthSafely("connect"), this._setupConnectionHandlers();
            try {
              this.socketAdapter.connect();
            } catch (b10) {
              let a10 = b10.message;
              if (a10.includes("Node.js")) throw Error(`${a10}

To use Realtime in Node.js, you need to provide a WebSocket implementation:

Option 1: Use Node.js 22+ which has native WebSocket support
Option 2: Install and provide the "ws" package:

  npm install ws

  import ws from "ws"
  const client = new RealtimeClient(url, {
    ...options,
    transport: ws
  })`);
              throw Error(`WebSocket not available: ${a10}`);
            }
            this._handleNodeJsRaceCondition();
          }
        }
        endpointURL() {
          return this.socketAdapter.endPointURL();
        }
        async disconnect(a10, b10) {
          return (this._cancelPendingDisconnect(), this.isDisconnecting()) ? "ok" : await this.socketAdapter.disconnect(() => {
            clearInterval(this._workerHeartbeatTimer), this._terminateWorker();
          }, a10, b10);
        }
        getChannels() {
          return this.channels;
        }
        async removeChannel(a10) {
          let b10 = await a10.unsubscribe();
          return "ok" === b10 && a10.teardown(), b10;
        }
        async removeAllChannels() {
          let a10 = this.channels.map(async (a11) => {
            let b11 = await a11.unsubscribe();
            return a11.teardown(), b11;
          }), b10 = await Promise.all(a10);
          return await this.disconnect(), b10;
        }
        log(a10, b10, c10) {
          this.socketAdapter.log(a10, b10, c10);
        }
        connectionState() {
          return this.socketAdapter.connectionState() || "closed";
        }
        isConnected() {
          return this.socketAdapter.isConnected();
        }
        isConnecting() {
          return this.socketAdapter.isConnecting();
        }
        isDisconnecting() {
          return this.socketAdapter.isDisconnecting();
        }
        channel(a10, b10 = { config: {} }) {
          let c10 = `realtime:${a10}`, d10 = this.getChannels().find((a11) => a11.topic === c10);
          if (d10) return d10;
          {
            let c11 = new eK(`realtime:${a10}`, b10, this);
            return this._cancelPendingDisconnect(), this.channels.push(c11), c11;
          }
        }
        push(a10) {
          this.socketAdapter.push(a10);
        }
        async setAuth(a10 = null) {
          this._authPromise = this._performAuth(a10);
          try {
            await this._authPromise;
          } finally {
            this._authPromise = null;
          }
        }
        _isManualToken() {
          return this._manuallySetToken;
        }
        async sendHeartbeat() {
          this.socketAdapter.sendHeartbeat();
        }
        onHeartbeat(a10) {
          this.socketAdapter.heartbeatCallback = this._wrapHeartbeatCallback(a10);
        }
        _makeRef() {
          return this.socketAdapter.makeRef();
        }
        _remove(a10) {
          this.channels = this.channels.filter((b10) => b10.topic !== a10.topic), 0 === this.channels.length && (this.log("transport", "no channels remaining, scheduling disconnect"), this._schedulePendingDisconnect());
        }
        _schedulePendingDisconnect() {
          if (this._cancelPendingDisconnect(), 0 === this._disconnectOnEmptyChannelsAfterMs) {
            this.log("transport", "disconnecting immediately - no channels"), this.disconnect();
            return;
          }
          this._pendingDisconnectTimer = setTimeout(() => {
            this._pendingDisconnectTimer = null, 0 === this.channels.length && (this.log("transport", "deferred disconnect fired - no channels, disconnecting"), this.disconnect());
          }, this._disconnectOnEmptyChannelsAfterMs), this.log("transport", `deferred disconnect scheduled in ${this._disconnectOnEmptyChannelsAfterMs}ms`);
        }
        _cancelPendingDisconnect() {
          null !== this._pendingDisconnectTimer && (this.log("transport", "pending disconnect cancelled - channel activity detected"), clearTimeout(this._pendingDisconnectTimer), this._pendingDisconnectTimer = null);
        }
        async _performAuth(a10 = null) {
          let b10, c10 = false;
          if (a10) b10 = a10, c10 = true;
          else if (this.accessToken) try {
            b10 = await this.accessToken();
          } catch (a11) {
            this.log("error", "Error fetching access token from callback", a11), b10 = this.accessTokenValue;
          }
          else b10 = this.accessTokenValue;
          c10 ? this._manuallySetToken = true : this.accessToken && (this._manuallySetToken = false), this.accessTokenValue != b10 && (this.accessTokenValue = b10, this.channels.forEach((a11) => {
            let c11 = { access_token: b10, version: "realtime-js/2.107.0" };
            b10 && a11.updateJoinPayload(c11), a11.joinedOnce && a11.channelAdapter.isJoined() && a11.channelAdapter.push(d7.access_token, { access_token: b10 });
          }));
        }
        async _waitForAuthIfNeeded() {
          this._authPromise && await this._authPromise;
        }
        _setAuthSafely(a10 = "general") {
          this._isManualToken() || this.setAuth().catch((b10) => {
            this.log("error", `Error setting auth in ${a10}`, b10);
          });
        }
        _setupConnectionHandlers() {
          this.socketAdapter.onOpen(() => {
            (this._authPromise || (this.accessToken && !this.accessTokenValue ? this.setAuth() : Promise.resolve())).catch((a10) => {
              this.log("error", "error waiting for auth on connect", a10);
            }), this.worker && !this.workerRef && this._startWorkerHeartbeat();
          }), this.socketAdapter.onClose(() => {
            this.worker && this.workerRef && this._terminateWorker();
          }), this.socketAdapter.onMessage((a10) => {
            a10.ref && a10.ref === this._pendingWorkerHeartbeatRef && (this._pendingWorkerHeartbeatRef = null);
          });
        }
        _handleNodeJsRaceCondition() {
          this.socketAdapter.isConnected() && this.socketAdapter.getSocket().onConnOpen();
        }
        _wrapHeartbeatCallback(a10) {
          return (b10, c10) => {
            "sent" == b10 && this._setAuthSafely(), a10 && a10(b10, c10);
          };
        }
        _startWorkerHeartbeat() {
          this.workerUrl ? this.log("worker", `starting worker for from ${this.workerUrl}`) : this.log("worker", "starting default worker");
          let a10 = this._workerObjectUrl(this.workerUrl);
          this.workerRef = new Worker(a10), this.workerRef.onerror = (a11) => {
            this.log("worker", "worker error", a11.message), this._terminateWorker(), this.disconnect();
          }, this.workerRef.onmessage = (a11) => {
            "keepAlive" === a11.data.event && this.sendHeartbeat();
          }, this.workerRef.postMessage({ event: "start", interval: this.heartbeatIntervalMs });
        }
        _terminateWorker() {
          this.workerRef && (this.log("worker", "terminating worker"), this.workerRef.terminate(), this.workerRef = void 0);
        }
        _workerObjectUrl(a10) {
          let b10;
          if (a10) b10 = a10;
          else {
            let a11 = new Blob([eN], { type: "application/javascript" });
            b10 = URL.createObjectURL(a11);
          }
          return b10;
        }
        _initializeOptions(a10) {
          var b10, c10, d10, e10, f10, g10, h10, i10, j10, k2, l2, m2;
          let n2, o2;
          this.worker = null != (b10 = null == a10 ? void 0 : a10.worker) && b10, this.accessToken = null != (c10 = null == a10 ? void 0 : a10.accessToken) ? c10 : null;
          let p2 = {};
          p2.timeout = null != (d10 = null == a10 ? void 0 : a10.timeout) ? d10 : 1e4, p2.heartbeatIntervalMs = null != (e10 = null == a10 ? void 0 : a10.heartbeatIntervalMs) ? e10 : 25e3, this._disconnectOnEmptyChannelsAfterMs = null != (f10 = null == a10 ? void 0 : a10.disconnectOnEmptyChannelsAfterMs) ? f10 : 2 * (null != (g10 = null == a10 ? void 0 : a10.heartbeatIntervalMs) ? g10 : 25e3), p2.transport = null != (h10 = null == a10 ? void 0 : a10.transport) ? h10 : d3.getWebSocketConstructor(), p2.params = null == a10 ? void 0 : a10.params, p2.logger = null == a10 ? void 0 : a10.logger, p2.heartbeatCallback = this._wrapHeartbeatCallback(null == a10 ? void 0 : a10.heartbeatCallback), p2.sessionStorage = null != (i10 = null == a10 ? void 0 : a10.sessionStorage) ? i10 : function() {
            let a11;
            try {
              if ("u" > typeof globalThis && globalThis.sessionStorage) return globalThis.sessionStorage;
            } catch (a12) {
            }
            return a11 = /* @__PURE__ */ new Map(), { get length() {
              return a11.size;
            }, clear() {
              a11.clear();
            }, getItem: (b11) => a11.has(b11) ? a11.get(b11) : null, key(b11) {
              var c11;
              return null != (c11 = Array.from(a11.keys())[b11]) ? c11 : null;
            }, removeItem(b11) {
              a11.delete(b11);
            }, setItem(b11, c11) {
              a11.set(b11, String(c11));
            } };
          }(), p2.reconnectAfterMs = null != (j10 = null == a10 ? void 0 : a10.reconnectAfterMs) ? j10 : (a11) => eM[a11 - 1] || 1e4;
          let q2 = null != (k2 = null == a10 ? void 0 : a10.vsn) ? k2 : d4;
          switch (q2) {
            case "1.0.0":
              n2 = (a11, b11) => b11(JSON.stringify(a11)), o2 = (a11, b11) => b11(JSON.parse(a11));
              break;
            case d4:
              n2 = this.serializer.encode.bind(this.serializer), o2 = this.serializer.decode.bind(this.serializer);
              break;
            default:
              throw Error(`Unsupported serializer version: ${p2.vsn}`);
          }
          if (p2.vsn = q2, p2.encode = null != (l2 = null == a10 ? void 0 : a10.encode) ? l2 : n2, p2.decode = null != (m2 = null == a10 ? void 0 : a10.decode) ? m2 : o2, p2.beforeReconnect = this._reconnectAuth.bind(this), ((null == a10 ? void 0 : a10.logLevel) || (null == a10 ? void 0 : a10.log_level)) && (this.logLevel = a10.logLevel || a10.log_level, p2.params = Object.assign(Object.assign({}, p2.params), { log_level: this.logLevel })), this.worker) {
            if ("u" > typeof window && !window.Worker) throw Error("Web Worker is not supported");
            this.workerUrl = null == a10 ? void 0 : a10.workerUrl, p2.autoSendHeartbeat = !this.worker;
          }
          return p2;
        }
        async _reconnectAuth() {
          await this._waitForAuthIfNeeded(), this.isConnected() || this.connect();
        }
      }
      var eP = class extends Error {
        constructor(a10, b10) {
          super(a10), this.name = "IcebergError", this.status = b10.status, this.icebergType = b10.icebergType, this.icebergCode = b10.icebergCode, this.details = b10.details, this.isCommitStateUnknown = "CommitStateUnknownException" === b10.icebergType || [500, 502, 504].includes(b10.status) && b10.icebergType?.includes("CommitState") === true;
        }
        isNotFound() {
          return 404 === this.status;
        }
        isConflict() {
          return 409 === this.status;
        }
        isAuthenticationTimeout() {
          return 419 === this.status;
        }
      };
      async function eQ(a10) {
        return a10 && "none" !== a10.type ? "bearer" === a10.type ? { Authorization: `Bearer ${a10.token}` } : "header" === a10.type ? { [a10.name]: a10.value } : "custom" === a10.type ? await a10.getHeaders() : {} : {};
      }
      function eR(a10) {
        return a10.join("");
      }
      var eS = class {
        constructor(a10, b10 = "") {
          this.client = a10, this.prefix = b10;
        }
        async listNamespaces(a10) {
          let b10 = a10 ? { parent: eR(a10.namespace) } : void 0;
          return (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces`, query: b10 })).data.namespaces.map((a11) => ({ namespace: a11 }));
        }
        async createNamespace(a10, b10) {
          let c10 = { namespace: a10.namespace, properties: b10?.properties };
          return (await this.client.request({ method: "POST", path: `${this.prefix}/namespaces`, body: c10 })).data;
        }
        async dropNamespace(a10) {
          await this.client.request({ method: "DELETE", path: `${this.prefix}/namespaces/${eR(a10.namespace)}` });
        }
        async loadNamespaceMetadata(a10) {
          return { properties: (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces/${eR(a10.namespace)}` })).data.properties };
        }
        async namespaceExists(a10) {
          try {
            return await this.client.request({ method: "HEAD", path: `${this.prefix}/namespaces/${eR(a10.namespace)}` }), true;
          } catch (a11) {
            if (a11 instanceof eP && 404 === a11.status) return false;
            throw a11;
          }
        }
        async createNamespaceIfNotExists(a10, b10) {
          try {
            return await this.createNamespace(a10, b10);
          } catch (a11) {
            if (a11 instanceof eP && 409 === a11.status) return;
            throw a11;
          }
        }
      };
      function eT(a10) {
        return a10.join("");
      }
      var eU = class {
        constructor(a10, b10 = "", c10) {
          this.client = a10, this.prefix = b10, this.accessDelegation = c10;
        }
        async listTables(a10) {
          return (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces/${eT(a10.namespace)}/tables` })).data.identifiers;
        }
        async createTable(a10, b10) {
          let c10 = {};
          return this.accessDelegation && (c10["X-Iceberg-Access-Delegation"] = this.accessDelegation), (await this.client.request({ method: "POST", path: `${this.prefix}/namespaces/${eT(a10.namespace)}/tables`, body: b10, headers: c10 })).data.metadata;
        }
        async updateTable(a10, b10) {
          let c10 = await this.client.request({ method: "POST", path: `${this.prefix}/namespaces/${eT(a10.namespace)}/tables/${a10.name}`, body: b10 });
          return { "metadata-location": c10.data["metadata-location"], metadata: c10.data.metadata };
        }
        async dropTable(a10, b10) {
          await this.client.request({ method: "DELETE", path: `${this.prefix}/namespaces/${eT(a10.namespace)}/tables/${a10.name}`, query: { purgeRequested: String(b10?.purge ?? false) } });
        }
        async loadTable(a10) {
          let b10 = {};
          return this.accessDelegation && (b10["X-Iceberg-Access-Delegation"] = this.accessDelegation), (await this.client.request({ method: "GET", path: `${this.prefix}/namespaces/${eT(a10.namespace)}/tables/${a10.name}`, headers: b10 })).data.metadata;
        }
        async tableExists(a10) {
          let b10 = {};
          this.accessDelegation && (b10["X-Iceberg-Access-Delegation"] = this.accessDelegation);
          try {
            return await this.client.request({ method: "HEAD", path: `${this.prefix}/namespaces/${eT(a10.namespace)}/tables/${a10.name}`, headers: b10 }), true;
          } catch (a11) {
            if (a11 instanceof eP && 404 === a11.status) return false;
            throw a11;
          }
        }
        async createTableIfNotExists(a10, b10) {
          try {
            return await this.createTable(a10, b10);
          } catch (c10) {
            if (c10 instanceof eP && 409 === c10.status) return await this.loadTable({ namespace: a10.namespace, name: b10.name });
            throw c10;
          }
        }
      }, eV = class {
        constructor(a10) {
          let b10 = "v1";
          a10.catalogName && (b10 += `/${a10.catalogName}`);
          const c10 = a10.baseUrl.endsWith("/") ? a10.baseUrl : `${a10.baseUrl}/`;
          this.client = function(a11) {
            let b11 = a11.fetchImpl ?? globalThis.fetch;
            return { async request({ method: c11, path: d10, query: e10, body: f10, headers: g10 }) {
              let h10 = function(a12, b12, c12) {
                let d11 = new URL(b12, a12);
                if (c12) for (let [a13, b13] of Object.entries(c12)) void 0 !== b13 && d11.searchParams.set(a13, b13);
                return d11.toString();
              }(a11.baseUrl, d10, e10), i10 = await eQ(a11.auth), j10 = await b11(h10, { method: c11, headers: { ...f10 ? { "Content-Type": "application/json" } : {}, ...i10, ...g10 }, body: f10 ? JSON.stringify(f10) : void 0 }), k2 = await j10.text(), l2 = (j10.headers.get("content-type") || "").includes("application/json"), m2 = l2 && k2 ? JSON.parse(k2) : k2;
              if (!j10.ok) {
                let a12 = l2 ? m2 : void 0, b12 = a12?.error;
                throw new eP(b12?.message ?? `Request failed with status ${j10.status}`, { status: j10.status, icebergType: b12?.type, icebergCode: b12?.code, details: a12 });
              }
              return { status: j10.status, headers: j10.headers, data: m2 };
            } };
          }({ baseUrl: c10, auth: a10.auth, fetchImpl: a10.fetch }), this.accessDelegation = a10.accessDelegation?.join(","), this.namespaceOps = new eS(this.client, b10), this.tableOps = new eU(this.client, b10, this.accessDelegation);
        }
        async listNamespaces(a10) {
          return this.namespaceOps.listNamespaces(a10);
        }
        async createNamespace(a10, b10) {
          return this.namespaceOps.createNamespace(a10, b10);
        }
        async dropNamespace(a10) {
          await this.namespaceOps.dropNamespace(a10);
        }
        async loadNamespaceMetadata(a10) {
          return this.namespaceOps.loadNamespaceMetadata(a10);
        }
        async listTables(a10) {
          return this.tableOps.listTables(a10);
        }
        async createTable(a10, b10) {
          return this.tableOps.createTable(a10, b10);
        }
        async updateTable(a10, b10) {
          return this.tableOps.updateTable(a10, b10);
        }
        async dropTable(a10, b10) {
          await this.tableOps.dropTable(a10, b10);
        }
        async loadTable(a10) {
          return this.tableOps.loadTable(a10);
        }
        async namespaceExists(a10) {
          return this.namespaceOps.namespaceExists(a10);
        }
        async tableExists(a10) {
          return this.tableOps.tableExists(a10);
        }
        async createNamespaceIfNotExists(a10, b10) {
          return this.namespaceOps.createNamespaceIfNotExists(a10, b10);
        }
        async createTableIfNotExists(a10, b10) {
          return this.tableOps.createTableIfNotExists(a10, b10);
        }
      }, eW = c(356).Buffer;
      function eX(a10) {
        return (eX = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(a11) {
          return typeof a11;
        } : function(a11) {
          return a11 && "function" == typeof Symbol && a11.constructor === Symbol && a11 !== Symbol.prototype ? "symbol" : typeof a11;
        })(a10);
      }
      function eY(a10, b10) {
        var c10 = Object.keys(a10);
        if (Object.getOwnPropertySymbols) {
          var d10 = Object.getOwnPropertySymbols(a10);
          b10 && (d10 = d10.filter(function(b11) {
            return Object.getOwnPropertyDescriptor(a10, b11).enumerable;
          })), c10.push.apply(c10, d10);
        }
        return c10;
      }
      function eZ(a10) {
        for (var b10 = 1; b10 < arguments.length; b10++) {
          var c10 = null != arguments[b10] ? arguments[b10] : {};
          b10 % 2 ? eY(Object(c10), true).forEach(function(b11) {
            !function(a11, b12, c11) {
              var d10;
              (d10 = function(a12, b13) {
                if ("object" != eX(a12) || !a12) return a12;
                var c12 = a12[Symbol.toPrimitive];
                if (void 0 !== c12) {
                  var d11 = c12.call(a12, b13 || "default");
                  if ("object" != eX(d11)) return d11;
                  throw TypeError("@@toPrimitive must return a primitive value.");
                }
                return ("string" === b13 ? String : Number)(a12);
              }(b12, "string"), (b12 = "symbol" == eX(d10) ? d10 : d10 + "") in a11) ? Object.defineProperty(a11, b12, { value: c11, enumerable: true, configurable: true, writable: true }) : a11[b12] = c11;
            }(a10, b11, c10[b11]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(a10, Object.getOwnPropertyDescriptors(c10)) : eY(Object(c10)).forEach(function(b11) {
            Object.defineProperty(a10, b11, Object.getOwnPropertyDescriptor(c10, b11));
          });
        }
        return a10;
      }
      var e$ = class extends Error {
        constructor(a10, b10 = "storage", c10, d10) {
          super(a10), this.__isStorageError = true, this.namespace = b10, this.name = "vectors" === b10 ? "StorageVectorsError" : "StorageError", this.status = c10, this.statusCode = d10;
        }
        toJSON() {
          return { name: this.name, message: this.message, status: this.status, statusCode: this.statusCode };
        }
      };
      function e_(a10) {
        return "object" == typeof a10 && null !== a10 && "__isStorageError" in a10;
      }
      var e0 = class extends e$ {
        constructor(a10, b10, c10, d10 = "storage") {
          super(a10, d10, b10, c10), this.name = "vectors" === d10 ? "StorageVectorsApiError" : "StorageApiError", this.status = b10, this.statusCode = c10;
        }
        toJSON() {
          return eZ({}, super.toJSON());
        }
      }, e1 = class extends e$ {
        constructor(a10, b10, c10 = "storage") {
          super(a10, c10), this.name = "vectors" === c10 ? "StorageVectorsUnknownError" : "StorageUnknownError", this.originalError = b10;
        }
      };
      function e2(a10, b10, c10) {
        let d10 = eZ({}, a10), e10 = b10.toLowerCase();
        for (let a11 of Object.keys(d10)) a11.toLowerCase() === e10 && delete d10[a11];
        return d10[e10] = c10, d10;
      }
      let e3 = (a10) => {
        if (Array.isArray(a10)) return a10.map((a11) => e3(a11));
        if ("function" == typeof a10 || a10 !== Object(a10)) return a10;
        let b10 = {};
        return Object.entries(a10).forEach(([a11, c10]) => {
          b10[a11.replace(/([-_][a-z])/gi, (a12) => a12.toUpperCase().replace(/[-_]/g, ""))] = e3(c10);
        }), b10;
      }, e4 = (a10) => {
        if ("object" == typeof a10 && null !== a10) {
          if ("string" == typeof a10.msg) return a10.msg;
          if ("string" == typeof a10.message) return a10.message;
          if ("string" == typeof a10.error_description) return a10.error_description;
          if ("string" == typeof a10.error) return a10.error;
          if ("object" == typeof a10.error && null !== a10.error) {
            let b10 = a10.error;
            if ("string" == typeof b10.message) return b10.message;
          }
        }
        return JSON.stringify(a10);
      }, e5 = async (a10, b10, c10, d10) => {
        if (null !== a10 && "object" == typeof a10 && "json" in a10 && "function" == typeof a10.json) {
          let c11 = parseInt(String(a10.status), 10);
          Number.isFinite(c11) || (c11 = 500), a10.json().then((a11) => {
            let e10 = (null == a11 ? void 0 : a11.statusCode) || (null == a11 ? void 0 : a11.code) || c11 + "";
            b10(new e0(e4(a11), c11, e10, d10));
          }).catch(() => {
            let e10 = c11 + "";
            b10(new e0(a10.statusText || `HTTP ${c11} error`, c11, e10, d10));
          });
        } else b10(new e1(e4(a10), a10, d10));
      };
      async function e6(a10, b10, c10, d10, e10, f10, g10) {
        return new Promise((h10, i10) => {
          a10(c10, ((a11, b11, c11, d11) => {
            let e11 = { method: a11, headers: (null == b11 ? void 0 : b11.headers) || {} };
            if ("GET" === a11 || "HEAD" === a11 || !d11) return eZ(eZ({}, e11), c11);
            if (((a12) => {
              if ("object" != typeof a12 || null === a12) return false;
              let b12 = Object.getPrototypeOf(a12);
              return (null === b12 || b12 === Object.prototype || null === Object.getPrototypeOf(b12)) && !(Symbol.toStringTag in a12) && !(Symbol.iterator in a12);
            })(d11)) {
              var f11;
              let a12, c12 = (null == b11 ? void 0 : b11.headers) || {};
              for (let [b12, d12] of Object.entries(c12)) "content-type" === b12.toLowerCase() && (a12 = d12);
              e11.headers = e2(c12, "Content-Type", null != (f11 = a12) ? f11 : "application/json"), e11.body = JSON.stringify(d11);
            } else e11.body = d11;
            return (null == b11 ? void 0 : b11.duplex) && (e11.duplex = b11.duplex), eZ(eZ({}, e11), c11);
          })(b10, d10, e10, f10)).then((a11) => {
            if (!a11.ok) throw a11;
            if (null == d10 ? void 0 : d10.noResolveJson) return a11;
            if ("vectors" === g10) {
              let b11 = a11.headers.get("content-type");
              if ("0" === a11.headers.get("content-length") || 204 === a11.status || !b11 || !b11.includes("application/json")) return {};
            }
            return a11.json();
          }).then((a11) => h10(a11)).catch((a11) => e5(a11, i10, d10, g10));
        });
      }
      function e7(a10 = "storage") {
        return { get: async (b10, c10, d10, e10) => e6(b10, "GET", c10, d10, e10, void 0, a10), post: async (b10, c10, d10, e10, f10) => e6(b10, "POST", c10, e10, f10, d10, a10), put: async (b10, c10, d10, e10, f10) => e6(b10, "PUT", c10, e10, f10, d10, a10), head: async (b10, c10, d10, e10) => e6(b10, "HEAD", c10, eZ(eZ({}, d10), {}, { noResolveJson: true }), e10, void 0, a10), remove: async (b10, c10, d10, e10, f10) => e6(b10, "DELETE", c10, e10, f10, d10, a10) };
      }
      let { get: e8, post: e9, put: fa, head: fb, remove: fc } = e7("storage"), fd = e7("vectors");
      var fe = class {
        constructor(a10, b10 = {}, c10, d10 = "storage") {
          this.shouldThrowOnError = false, this.url = a10, this.headers = function(a11) {
            let b11 = {};
            for (let [c11, d11] of Object.entries(a11)) b11[c11.toLowerCase()] = d11;
            return b11;
          }(b10), this.fetch = /* @__PURE__ */ ((a11) => a11 ? (...b11) => a11(...b11) : (...a12) => fetch(...a12))(c10), this.namespace = d10;
        }
        throwOnError() {
          return this.shouldThrowOnError = true, this;
        }
        setHeader(a10, b10) {
          return this.headers = e2(this.headers, a10, b10), this;
        }
        async handleOperation(a10) {
          try {
            return { data: await a10(), error: null };
          } catch (a11) {
            if (this.shouldThrowOnError) throw a11;
            if (e_(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
      };
      f = Symbol.toStringTag;
      var ff = class {
        constructor(a10, b10) {
          this.downloadFn = a10, this.shouldThrowOnError = b10, this[f] = "StreamDownloadBuilder", this.promise = null;
        }
        then(a10, b10) {
          return this.getPromise().then(a10, b10);
        }
        catch(a10) {
          return this.getPromise().catch(a10);
        }
        finally(a10) {
          return this.getPromise().finally(a10);
        }
        getPromise() {
          return this.promise || (this.promise = this.execute()), this.promise;
        }
        async execute() {
          try {
            return { data: (await this.downloadFn()).body, error: null };
          } catch (a10) {
            if (this.shouldThrowOnError) throw a10;
            if (e_(a10)) return { data: null, error: a10 };
            throw a10;
          }
        }
      };
      g = Symbol.toStringTag;
      var fg = class {
        constructor(a10, b10) {
          this.downloadFn = a10, this.shouldThrowOnError = b10, this[g] = "BlobDownloadBuilder", this.promise = null;
        }
        asStream() {
          return new ff(this.downloadFn, this.shouldThrowOnError);
        }
        then(a10, b10) {
          return this.getPromise().then(a10, b10);
        }
        catch(a10) {
          return this.getPromise().catch(a10);
        }
        finally(a10) {
          return this.getPromise().finally(a10);
        }
        getPromise() {
          return this.promise || (this.promise = this.execute()), this.promise;
        }
        async execute() {
          try {
            return { data: await (await this.downloadFn()).blob(), error: null };
          } catch (a10) {
            if (this.shouldThrowOnError) throw a10;
            if (e_(a10)) return { data: null, error: a10 };
            throw a10;
          }
        }
      };
      let fh = { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } }, fi = { cacheControl: "3600", contentType: "text/plain;charset=UTF-8", upsert: false };
      var fj = class extends fe {
        constructor(a10, b10 = {}, c10, d10) {
          super(a10, b10, d10, "storage"), this.bucketId = c10;
        }
        async uploadOrUpdate(a10, b10, c10, d10) {
          var e10 = this;
          return e10.handleOperation(async () => {
            let f10, g10 = eZ(eZ({}, fi), d10), h10 = eZ(eZ({}, e10.headers), "POST" === a10 && { "x-upsert": String(g10.upsert) }), i10 = g10.metadata;
            if ("u" > typeof Blob && c10 instanceof Blob ? ((f10 = new FormData()).append("cacheControl", g10.cacheControl), i10 && f10.append("metadata", e10.encodeMetadata(i10)), f10.append("", c10)) : "u" > typeof FormData && c10 instanceof FormData ? ((f10 = c10).has("cacheControl") || f10.append("cacheControl", g10.cacheControl), i10 && !f10.has("metadata") && f10.append("metadata", e10.encodeMetadata(i10))) : (f10 = c10, h10["cache-control"] = `max-age=${g10.cacheControl}`, h10["content-type"] = g10.contentType, i10 && (h10["x-metadata"] = e10.toBase64(e10.encodeMetadata(i10))), ("u" > typeof ReadableStream && f10 instanceof ReadableStream || f10 && "object" == typeof f10 && "pipe" in f10 && "function" == typeof f10.pipe) && !g10.duplex && (g10.duplex = "half")), null == d10 ? void 0 : d10.headers) for (let [a11, b11] of Object.entries(d10.headers)) h10 = e2(h10, a11, b11);
            let j10 = e10._removeEmptyFolders(b10), k2 = e10._getFinalPath(j10), l2 = await ("PUT" == a10 ? fa : e9)(e10.fetch, `${e10.url}/object/${k2}`, f10, eZ({ headers: h10 }, (null == g10 ? void 0 : g10.duplex) ? { duplex: g10.duplex } : {}));
            return { path: j10, id: l2.Id, fullPath: l2.Key };
          });
        }
        async upload(a10, b10, c10) {
          return this.uploadOrUpdate("POST", a10, b10, c10);
        }
        async uploadToSignedUrl(a10, b10, c10, d10) {
          var e10 = this;
          let f10 = e10._removeEmptyFolders(a10), g10 = e10._getFinalPath(f10), h10 = new URL(e10.url + `/object/upload/sign/${g10}`);
          return h10.searchParams.set("token", b10), e10.handleOperation(async () => {
            let a11, b11 = eZ(eZ({}, fi), d10), g11 = eZ(eZ({}, e10.headers), { "x-upsert": String(b11.upsert) }), i10 = b11.metadata;
            if ("u" > typeof Blob && c10 instanceof Blob ? ((a11 = new FormData()).append("cacheControl", b11.cacheControl), i10 && a11.append("metadata", e10.encodeMetadata(i10)), a11.append("", c10)) : "u" > typeof FormData && c10 instanceof FormData ? ((a11 = c10).has("cacheControl") || a11.append("cacheControl", b11.cacheControl), i10 && !a11.has("metadata") && a11.append("metadata", e10.encodeMetadata(i10))) : (a11 = c10, g11["cache-control"] = `max-age=${b11.cacheControl}`, g11["content-type"] = b11.contentType, i10 && (g11["x-metadata"] = e10.toBase64(e10.encodeMetadata(i10))), ("u" > typeof ReadableStream && a11 instanceof ReadableStream || a11 && "object" == typeof a11 && "pipe" in a11 && "function" == typeof a11.pipe) && !b11.duplex && (b11.duplex = "half")), null == d10 ? void 0 : d10.headers) for (let [a12, b12] of Object.entries(d10.headers)) g11 = e2(g11, a12, b12);
            return { path: f10, fullPath: (await fa(e10.fetch, h10.toString(), a11, eZ({ headers: g11 }, (null == b11 ? void 0 : b11.duplex) ? { duplex: b11.duplex } : {}))).Key };
          });
        }
        async createSignedUploadUrl(a10, b10) {
          var c10 = this;
          return c10.handleOperation(async () => {
            let d10 = c10._getFinalPath(a10), e10 = eZ({}, c10.headers);
            (null == b10 ? void 0 : b10.upsert) && (e10["x-upsert"] = "true");
            let f10 = await e9(c10.fetch, `${c10.url}/object/upload/sign/${d10}`, {}, { headers: e10 }), g10 = new URL(c10.url + f10.url), h10 = g10.searchParams.get("token");
            if (!h10) throw new e$("No token returned by API");
            return { signedUrl: g10.toString(), path: a10, token: h10 };
          });
        }
        async update(a10, b10, c10) {
          return this.uploadOrUpdate("PUT", a10, b10, c10);
        }
        async move(a10, b10, c10) {
          var d10 = this;
          return d10.handleOperation(async () => await e9(d10.fetch, `${d10.url}/object/move`, { bucketId: d10.bucketId, sourceKey: a10, destinationKey: b10, destinationBucket: null == c10 ? void 0 : c10.destinationBucket }, { headers: d10.headers }));
        }
        async copy(a10, b10, c10) {
          var d10 = this;
          return d10.handleOperation(async () => ({ path: (await e9(d10.fetch, `${d10.url}/object/copy`, { bucketId: d10.bucketId, sourceKey: a10, destinationKey: b10, destinationBucket: null == c10 ? void 0 : c10.destinationBucket }, { headers: d10.headers })).Key }));
        }
        async createSignedUrl(a10, b10, c10) {
          var d10 = this;
          return d10.handleOperation(async () => {
            let e10 = d10._getFinalPath(a10), f10 = "object" == typeof (null == c10 ? void 0 : c10.transform) && null !== c10.transform && Object.keys(c10.transform).length > 0, g10 = await e9(d10.fetch, `${d10.url}/object/sign/${e10}`, eZ({ expiresIn: b10 }, f10 ? { transform: c10.transform } : {}), { headers: d10.headers }), h10 = new URLSearchParams();
            (null == c10 ? void 0 : c10.download) && h10.set("download", true === c10.download ? "" : c10.download), (null == c10 ? void 0 : c10.cacheNonce) != null && h10.set("cacheNonce", String(c10.cacheNonce));
            let i10 = h10.toString();
            return { signedUrl: encodeURI(`${d10.url}${g10.signedURL}${i10 ? `&${i10}` : ""}`) };
          });
        }
        async createSignedUrls(a10, b10, c10) {
          var d10 = this;
          return d10.handleOperation(async () => {
            let e10 = await e9(d10.fetch, `${d10.url}/object/sign/${d10.bucketId}`, { expiresIn: b10, paths: a10 }, { headers: d10.headers }), f10 = new URLSearchParams();
            (null == c10 ? void 0 : c10.download) && f10.set("download", true === c10.download ? "" : c10.download), (null == c10 ? void 0 : c10.cacheNonce) != null && f10.set("cacheNonce", String(c10.cacheNonce));
            let g10 = f10.toString();
            return e10.map((a11) => eZ(eZ({}, a11), {}, { signedUrl: a11.signedURL ? encodeURI(`${d10.url}${a11.signedURL}${g10 ? `&${g10}` : ""}`) : null }));
          });
        }
        download(a10, b10, c10) {
          let d10 = "object" == typeof (null == b10 ? void 0 : b10.transform) && null !== b10.transform && Object.keys(b10.transform).length > 0 ? "render/image/authenticated" : "object", e10 = new URLSearchParams();
          (null == b10 ? void 0 : b10.transform) && this.applyTransformOptsToQuery(e10, b10.transform), (null == b10 ? void 0 : b10.cacheNonce) != null && e10.set("cacheNonce", String(b10.cacheNonce));
          let f10 = e10.toString(), g10 = this._getFinalPath(a10);
          return new fg(() => e8(this.fetch, `${this.url}/${d10}/${g10}${f10 ? `?${f10}` : ""}`, { headers: this.headers, noResolveJson: true }, c10), this.shouldThrowOnError);
        }
        async info(a10) {
          var b10 = this;
          let c10 = b10._getFinalPath(a10);
          return b10.handleOperation(async () => e3(await e8(b10.fetch, `${b10.url}/object/info/${c10}`, { headers: b10.headers })));
        }
        async exists(a10) {
          var b10;
          let c10 = this._getFinalPath(a10);
          try {
            return await fb(this.fetch, `${this.url}/object/${c10}`, { headers: this.headers }), { data: true, error: null };
          } catch (a11) {
            if (this.shouldThrowOnError) throw a11;
            if (e_(a11)) {
              let c11 = a11 instanceof e0 ? a11.status : a11 instanceof e1 ? null == (b10 = a11.originalError) ? void 0 : b10.status : void 0;
              if (void 0 !== c11 && [400, 404].includes(c11)) return { data: false, error: a11 };
            }
            throw a11;
          }
        }
        getPublicUrl(a10, b10) {
          let c10 = this._getFinalPath(a10), d10 = new URLSearchParams();
          (null == b10 ? void 0 : b10.download) && d10.set("download", true === b10.download ? "" : b10.download), (null == b10 ? void 0 : b10.transform) && this.applyTransformOptsToQuery(d10, b10.transform), (null == b10 ? void 0 : b10.cacheNonce) != null && d10.set("cacheNonce", String(b10.cacheNonce));
          let e10 = d10.toString(), f10 = "object" == typeof (null == b10 ? void 0 : b10.transform) && null !== b10.transform && Object.keys(b10.transform).length > 0 ? "render/image" : "object";
          return { data: { publicUrl: encodeURI(`${this.url}/${f10}/public/${c10}`) + (e10 ? `?${e10}` : "") } };
        }
        async remove(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fc(b10.fetch, `${b10.url}/object/${b10.bucketId}`, { prefixes: a10 }, { headers: b10.headers }));
        }
        async list(a10, b10, c10) {
          var d10 = this;
          return d10.handleOperation(async () => {
            let e10 = eZ(eZ(eZ({}, fh), b10), {}, { prefix: a10 || "" });
            return await e9(d10.fetch, `${d10.url}/object/list/${d10.bucketId}`, e10, { headers: d10.headers }, c10);
          });
        }
        async listV2(a10, b10) {
          var c10 = this;
          return c10.handleOperation(async () => {
            let d10 = eZ({}, a10);
            return await e9(c10.fetch, `${c10.url}/object/list-v2/${c10.bucketId}`, d10, { headers: c10.headers }, b10);
          });
        }
        encodeMetadata(a10) {
          return JSON.stringify(a10);
        }
        toBase64(a10) {
          return void 0 !== eW ? eW.from(a10).toString("base64") : btoa(a10);
        }
        _getFinalPath(a10) {
          return `${this.bucketId}/${a10.replace(/^\/+/, "")}`;
        }
        _removeEmptyFolders(a10) {
          return a10.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
        }
        applyTransformOptsToQuery(a10, b10) {
          return b10.width && a10.set("width", b10.width.toString()), b10.height && a10.set("height", b10.height.toString()), b10.resize && a10.set("resize", b10.resize), b10.format && a10.set("format", b10.format), b10.quality && a10.set("quality", b10.quality.toString()), a10;
        }
      };
      let fk = { "X-Client-Info": "storage-js/2.107.0" };
      var fl = class extends fe {
        constructor(a10, b10 = {}, c10, d10) {
          const e10 = new URL(a10);
          (null == d10 ? void 0 : d10.useNewHostname) && /supabase\.(co|in|red)$/.test(e10.hostname) && !e10.hostname.includes("storage.supabase.") && (e10.hostname = e10.hostname.replace("supabase.", "storage.supabase.")), super(e10.href.replace(/\/$/, ""), eZ(eZ({}, fk), b10), c10, "storage");
        }
        async listBuckets(a10) {
          var b10 = this;
          return b10.handleOperation(async () => {
            let c10 = b10.listBucketOptionsToQueryString(a10);
            return await e8(b10.fetch, `${b10.url}/bucket${c10}`, { headers: b10.headers });
          });
        }
        async getBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await e8(b10.fetch, `${b10.url}/bucket/${a10}`, { headers: b10.headers }));
        }
        async createBucket(a10, b10 = { public: false }) {
          var c10 = this;
          return c10.handleOperation(async () => await e9(c10.fetch, `${c10.url}/bucket`, { id: a10, name: a10, type: b10.type, public: b10.public, file_size_limit: b10.fileSizeLimit, allowed_mime_types: b10.allowedMimeTypes }, { headers: c10.headers }));
        }
        async updateBucket(a10, b10) {
          var c10 = this;
          return c10.handleOperation(async () => await fa(c10.fetch, `${c10.url}/bucket/${a10}`, { id: a10, name: a10, public: b10.public, file_size_limit: b10.fileSizeLimit, allowed_mime_types: b10.allowedMimeTypes }, { headers: c10.headers }));
        }
        async emptyBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await e9(b10.fetch, `${b10.url}/bucket/${a10}/empty`, {}, { headers: b10.headers }));
        }
        async deleteBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fc(b10.fetch, `${b10.url}/bucket/${a10}`, {}, { headers: b10.headers }));
        }
        listBucketOptionsToQueryString(a10) {
          let b10 = {};
          return a10 && ("limit" in a10 && (b10.limit = String(a10.limit)), "offset" in a10 && (b10.offset = String(a10.offset)), a10.search && (b10.search = a10.search), a10.sortColumn && (b10.sortColumn = a10.sortColumn), a10.sortOrder && (b10.sortOrder = a10.sortOrder)), Object.keys(b10).length > 0 ? "?" + new URLSearchParams(b10).toString() : "";
        }
      }, fm = class extends fe {
        constructor(a10, b10 = {}, c10) {
          super(a10.replace(/\/$/, ""), eZ(eZ({}, fk), b10), c10, "storage");
        }
        async createBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await e9(b10.fetch, `${b10.url}/bucket`, { name: a10 }, { headers: b10.headers }));
        }
        async listBuckets(a10) {
          var b10 = this;
          return b10.handleOperation(async () => {
            let c10 = new URLSearchParams();
            (null == a10 ? void 0 : a10.limit) !== void 0 && c10.set("limit", a10.limit.toString()), (null == a10 ? void 0 : a10.offset) !== void 0 && c10.set("offset", a10.offset.toString()), (null == a10 ? void 0 : a10.sortColumn) && c10.set("sortColumn", a10.sortColumn), (null == a10 ? void 0 : a10.sortOrder) && c10.set("sortOrder", a10.sortOrder), (null == a10 ? void 0 : a10.search) && c10.set("search", a10.search);
            let d10 = c10.toString(), e10 = d10 ? `${b10.url}/bucket?${d10}` : `${b10.url}/bucket`;
            return await e8(b10.fetch, e10, { headers: b10.headers });
          });
        }
        async deleteBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fc(b10.fetch, `${b10.url}/bucket/${a10}`, {}, { headers: b10.headers }));
        }
        from(a10) {
          var b10 = this;
          if (!(!(!a10 || "string" != typeof a10 || 0 === a10.length || a10.length > 100 || a10.trim() !== a10 || a10.includes("/") || a10.includes("\\")) && /^[\w!.\*'() &$@=;:+,?-]+$/.test(a10))) throw new e$("Invalid bucket name: File, folder, and bucket names must follow AWS object key naming guidelines and should avoid the use of any other characters.");
          let c10 = new eV({ baseUrl: this.url, catalogName: a10, auth: { type: "custom", getHeaders: async () => b10.headers }, fetch: this.fetch }), d10 = this.shouldThrowOnError;
          return new Proxy(c10, { get(a11, b11) {
            let c11 = a11[b11];
            return "function" != typeof c11 ? c11 : async (...b12) => {
              try {
                return { data: await c11.apply(a11, b12), error: null };
              } catch (a12) {
                if (d10) throw a12;
                return { data: null, error: a12 };
              }
            };
          } });
        }
      }, fn = class extends fe {
        constructor(a10, b10 = {}, c10) {
          super(a10.replace(/\/$/, ""), eZ(eZ({}, fk), {}, { "Content-Type": "application/json" }, b10), c10, "vectors");
        }
        async createIndex(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/CreateIndex`, a10, { headers: b10.headers }) || {});
        }
        async getIndex(a10, b10) {
          var c10 = this;
          return c10.handleOperation(async () => await fd.post(c10.fetch, `${c10.url}/GetIndex`, { vectorBucketName: a10, indexName: b10 }, { headers: c10.headers }));
        }
        async listIndexes(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/ListIndexes`, a10, { headers: b10.headers }));
        }
        async deleteIndex(a10, b10) {
          var c10 = this;
          return c10.handleOperation(async () => await fd.post(c10.fetch, `${c10.url}/DeleteIndex`, { vectorBucketName: a10, indexName: b10 }, { headers: c10.headers }) || {});
        }
      }, fo = class extends fe {
        constructor(a10, b10 = {}, c10) {
          super(a10.replace(/\/$/, ""), eZ(eZ({}, fk), {}, { "Content-Type": "application/json" }, b10), c10, "vectors");
        }
        async putVectors(a10) {
          var b10 = this;
          if (a10.vectors.length < 1 || a10.vectors.length > 500) throw Error("Vector batch size must be between 1 and 500 items");
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/PutVectors`, a10, { headers: b10.headers }) || {});
        }
        async getVectors(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/GetVectors`, a10, { headers: b10.headers }));
        }
        async listVectors(a10) {
          var b10 = this;
          if (void 0 !== a10.segmentCount) {
            if (a10.segmentCount < 1 || a10.segmentCount > 16) throw Error("segmentCount must be between 1 and 16");
            if (void 0 !== a10.segmentIndex && (a10.segmentIndex < 0 || a10.segmentIndex >= a10.segmentCount)) throw Error(`segmentIndex must be between 0 and ${a10.segmentCount - 1}`);
          }
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/ListVectors`, a10, { headers: b10.headers }));
        }
        async queryVectors(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/QueryVectors`, a10, { headers: b10.headers }));
        }
        async deleteVectors(a10) {
          var b10 = this;
          if (a10.keys.length < 1 || a10.keys.length > 500) throw Error("Keys batch size must be between 1 and 500 items");
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/DeleteVectors`, a10, { headers: b10.headers }) || {});
        }
      }, fp = class extends fe {
        constructor(a10, b10 = {}, c10) {
          super(a10.replace(/\/$/, ""), eZ(eZ({}, fk), {}, { "Content-Type": "application/json" }, b10), c10, "vectors");
        }
        async createBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/CreateVectorBucket`, { vectorBucketName: a10 }, { headers: b10.headers }) || {});
        }
        async getBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/GetVectorBucket`, { vectorBucketName: a10 }, { headers: b10.headers }));
        }
        async listBuckets(a10 = {}) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/ListVectorBuckets`, a10, { headers: b10.headers }));
        }
        async deleteBucket(a10) {
          var b10 = this;
          return b10.handleOperation(async () => await fd.post(b10.fetch, `${b10.url}/DeleteVectorBucket`, { vectorBucketName: a10 }, { headers: b10.headers }) || {});
        }
      }, fq = class extends fp {
        constructor(a10, b10 = {}) {
          super(a10, b10.headers || {}, b10.fetch);
        }
        from(a10) {
          return new fr(this.url, this.headers, a10, this.fetch);
        }
        async createBucket(a10) {
          return super.createBucket.call(this, a10);
        }
        async getBucket(a10) {
          return super.getBucket.call(this, a10);
        }
        async listBuckets(a10 = {}) {
          return super.listBuckets.call(this, a10);
        }
        async deleteBucket(a10) {
          return super.deleteBucket.call(this, a10);
        }
      }, fr = class extends fn {
        constructor(a10, b10, c10, d10) {
          super(a10, b10, d10), this.vectorBucketName = c10;
        }
        async createIndex(a10) {
          return super.createIndex.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName }));
        }
        async listIndexes(a10 = {}) {
          return super.listIndexes.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName }));
        }
        async getIndex(a10) {
          return super.getIndex.call(this, this.vectorBucketName, a10);
        }
        async deleteIndex(a10) {
          return super.deleteIndex.call(this, this.vectorBucketName, a10);
        }
        index(a10) {
          return new fs(this.url, this.headers, this.vectorBucketName, a10, this.fetch);
        }
      }, fs = class extends fo {
        constructor(a10, b10, c10, d10, e10) {
          super(a10, b10, e10), this.vectorBucketName = c10, this.indexName = d10;
        }
        async putVectors(a10) {
          return super.putVectors.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async getVectors(a10) {
          return super.getVectors.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async listVectors(a10 = {}) {
          return super.listVectors.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async queryVectors(a10) {
          return super.queryVectors.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
        async deleteVectors(a10) {
          return super.deleteVectors.call(this, eZ(eZ({}, a10), {}, { vectorBucketName: this.vectorBucketName, indexName: this.indexName }));
        }
      }, ft = class extends fl {
        constructor(a10, b10 = {}, c10, d10) {
          super(a10, b10, c10, d10);
        }
        from(a10) {
          return new fj(this.url, this.headers, a10, this.fetch);
        }
        get vectors() {
          return new fq(this.url + "/vector", { headers: this.headers, fetch: this.fetch });
        }
        get analytics() {
          return new fm(this.url + "/iceberg", this.headers, this.fetch);
        }
      };
      let fu = "2.107.0", fv = { "X-Client-Info": `gotrue-js/${fu}` }, fw = "X-Supabase-Api-Version", fx = { "2024-01-01": { timestamp: Date.parse("2024-01-01T00:00:00.0Z"), name: "2024-01-01" } }, fy = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
      class fz extends Error {
        constructor(a10, b10, c10) {
          super(a10), this.__isAuthError = true, this.name = "AuthError", this.status = b10, this.code = c10;
        }
        toJSON() {
          return { name: this.name, message: this.message, status: this.status, code: this.code };
        }
      }
      function fA(a10) {
        return "object" == typeof a10 && null !== a10 && "__isAuthError" in a10;
      }
      class fB extends fz {
        constructor(a10, b10, c10) {
          super(a10, b10, c10), this.name = "AuthApiError", this.status = b10, this.code = c10;
        }
      }
      class fC extends fz {
        constructor(a10, b10) {
          super(a10), this.name = "AuthUnknownError", this.originalError = b10;
        }
      }
      class fD extends fz {
        constructor(a10, b10, c10, d10) {
          super(a10, c10, d10), this.name = b10, this.status = c10;
        }
      }
      class fE extends fD {
        constructor() {
          super("Auth session missing!", "AuthSessionMissingError", 400, void 0);
        }
      }
      function fF(a10) {
        return fA(a10) && "AuthSessionMissingError" === a10.name;
      }
      class fG extends fD {
        constructor() {
          super("Auth session or user missing", "AuthInvalidTokenResponseError", 500, void 0);
        }
      }
      class fH extends fD {
        constructor(a10) {
          super(a10, "AuthInvalidCredentialsError", 400, void 0);
        }
      }
      class fI extends fD {
        constructor(a10, b10 = null) {
          super(a10, "AuthImplicitGrantRedirectError", 500, void 0), this.details = null, this.details = b10;
        }
        toJSON() {
          return Object.assign(Object.assign({}, super.toJSON()), { details: this.details });
        }
      }
      class fJ extends fD {
        constructor(a10, b10 = null) {
          super(a10, "AuthPKCEGrantCodeExchangeError", 500, void 0), this.details = null, this.details = b10;
        }
        toJSON() {
          return Object.assign(Object.assign({}, super.toJSON()), { details: this.details });
        }
      }
      class fK extends fD {
        constructor() {
          super("PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both the server and client to store the code verifier in cookies.", "AuthPKCECodeVerifierMissingError", 400, "pkce_code_verifier_not_found");
        }
      }
      class fL extends fD {
        constructor(a10, b10) {
          super(a10, "AuthRetryableFetchError", b10, void 0);
        }
      }
      function fM(a10) {
        return fA(a10) && "AuthRetryableFetchError" === a10.name;
      }
      class fN extends fD {
        constructor(a10 = "Refresh result discarded: session state changed mid-flight (e.g., concurrent signOut)") {
          super(a10, "AuthRefreshDiscardedError", 409, void 0);
        }
      }
      class fO extends fD {
        constructor(a10, b10, c10) {
          super(a10, "AuthWeakPasswordError", b10, "weak_password"), this.reasons = c10;
        }
        toJSON() {
          return Object.assign(Object.assign({}, super.toJSON()), { reasons: this.reasons });
        }
      }
      class fP extends fD {
        constructor(a10) {
          super(a10, "AuthInvalidJwtError", 400, "invalid_jwt");
        }
      }
      let fQ = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split(""), fR = " 	\n\r=".split(""), fS = (() => {
        let a10 = Array(128);
        for (let b10 = 0; b10 < a10.length; b10 += 1) a10[b10] = -1;
        for (let b10 = 0; b10 < fR.length; b10 += 1) a10[fR[b10].charCodeAt(0)] = -2;
        for (let b10 = 0; b10 < fQ.length; b10 += 1) a10[fQ[b10].charCodeAt(0)] = b10;
        return a10;
      })();
      function fT(a10, b10, c10) {
        if (null !== a10) for (b10.queue = b10.queue << 8 | a10, b10.queuedBits += 8; b10.queuedBits >= 6; ) c10(fQ[b10.queue >> b10.queuedBits - 6 & 63]), b10.queuedBits -= 6;
        else if (b10.queuedBits > 0) for (b10.queue = b10.queue << 6 - b10.queuedBits, b10.queuedBits = 6; b10.queuedBits >= 6; ) c10(fQ[b10.queue >> b10.queuedBits - 6 & 63]), b10.queuedBits -= 6;
      }
      function fU(a10, b10, c10) {
        let d10 = fS[a10];
        if (d10 > -1) for (b10.queue = b10.queue << 6 | d10, b10.queuedBits += 6; b10.queuedBits >= 8; ) c10(b10.queue >> b10.queuedBits - 8 & 255), b10.queuedBits -= 8;
        else if (-2 === d10) return;
        else throw Error(`Invalid Base64-URL character "${String.fromCharCode(a10)}"`);
      }
      function fV(a10) {
        let b10 = [], c10 = (a11) => {
          b10.push(String.fromCodePoint(a11));
        }, d10 = { utf8seq: 0, codepoint: 0 }, e10 = { queue: 0, queuedBits: 0 }, f10 = (a11) => {
          !function(a12, b11, c11) {
            if (0 === b11.utf8seq) {
              if (a12 <= 127) return c11(a12);
              for (let c12 = 1; c12 < 6; c12 += 1) if ((a12 >> 7 - c12 & 1) == 0) {
                b11.utf8seq = c12;
                break;
              }
              if (2 === b11.utf8seq) b11.codepoint = 31 & a12;
              else if (3 === b11.utf8seq) b11.codepoint = 15 & a12;
              else if (4 === b11.utf8seq) b11.codepoint = 7 & a12;
              else throw Error("Invalid UTF-8 sequence");
              b11.utf8seq -= 1;
            } else if (b11.utf8seq > 0) {
              if (a12 <= 127) throw Error("Invalid UTF-8 sequence");
              b11.codepoint = b11.codepoint << 6 | 63 & a12, b11.utf8seq -= 1, 0 === b11.utf8seq && c11(b11.codepoint);
            }
          }(a11, d10, c10);
        };
        for (let b11 = 0; b11 < a10.length; b11 += 1) fU(a10.charCodeAt(b11), e10, f10);
        return b10.join("");
      }
      function fW(a10) {
        let b10 = [], c10 = { queue: 0, queuedBits: 0 }, d10 = (a11) => {
          b10.push(a11);
        };
        for (let b11 = 0; b11 < a10.length; b11 += 1) fU(a10.charCodeAt(b11), c10, d10);
        return new Uint8Array(b10);
      }
      function fX(a10) {
        let b10 = [], c10 = { queue: 0, queuedBits: 0 }, d10 = (a11) => {
          b10.push(a11);
        };
        return a10.forEach((a11) => fT(a11, c10, d10)), fT(null, c10, d10), b10.join("");
      }
      let fY = () => "u" > typeof window && "u" > typeof document, fZ = { tested: false, writable: false }, f$ = () => {
        if (!fY()) return false;
        try {
          if ("object" != typeof globalThis.localStorage) return false;
        } catch (a11) {
          return false;
        }
        if (fZ.tested) return fZ.writable;
        let a10 = `lswt-${Math.random()}${Math.random()}`;
        try {
          globalThis.localStorage.setItem(a10, a10), globalThis.localStorage.removeItem(a10), fZ.tested = true, fZ.writable = true;
        } catch (a11) {
          fZ.tested = true, fZ.writable = false;
        }
        return fZ.writable;
      }, f_ = (a10) => a10 ? (...b10) => a10(...b10) : (...a11) => fetch(...a11), f0 = async (a10, b10, c10) => {
        await a10.setItem(b10, JSON.stringify(c10));
      }, f1 = async (a10, b10) => {
        let c10 = await a10.getItem(b10);
        if (!c10) return null;
        try {
          return JSON.parse(c10);
        } catch (a11) {
          return null;
        }
      }, f2 = async (a10, b10) => {
        await a10.removeItem(b10);
      };
      class f3 {
        constructor() {
          this.promise = new f3.promiseConstructor((a10, b10) => {
            this.resolve = a10, this.reject = b10;
          });
        }
      }
      function f4(a10) {
        let b10 = a10.split(".");
        if (3 !== b10.length) throw new fP("Invalid JWT structure");
        for (let a11 = 0; a11 < b10.length; a11++) if (!fy.test(b10[a11])) throw new fP("JWT not in base64url format");
        return { header: JSON.parse(fV(b10[0])), payload: JSON.parse(fV(b10[1])), signature: fW(b10[2]), raw: { header: b10[0], payload: b10[1] } };
      }
      async function f5(a10) {
        return await new Promise((b10) => {
          setTimeout(() => b10(null), a10);
        });
      }
      function f6(a10) {
        return ("0" + a10.toString(16)).substr(-2);
      }
      async function f7(a10) {
        let b10 = new TextEncoder().encode(a10);
        return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", b10))).map((a11) => String.fromCharCode(a11)).join("");
      }
      async function f8(a10) {
        return "u" > typeof crypto && void 0 !== crypto.subtle && "u" > typeof TextEncoder ? btoa(await f7(a10)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : (console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256."), a10);
      }
      async function f9(a10, b10, c10 = false) {
        let d10 = function() {
          let a11 = new Uint32Array(56);
          if ("u" < typeof crypto) {
            let a12 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~", b11 = a12.length, c11 = "";
            for (let d11 = 0; d11 < 56; d11++) c11 += a12.charAt(Math.floor(Math.random() * b11));
            return c11;
          }
          return crypto.getRandomValues(a11), Array.from(a11, f6).join("");
        }(), e10 = d10;
        c10 && (e10 += "/recovery"), await f0(a10, `${b10}-code-verifier`, e10);
        let f10 = await f8(d10), g10 = d10 === f10 ? "plain" : "s256";
        return [f10, g10];
      }
      f3.promiseConstructor = Promise;
      let ga = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i, gb = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
      function gc(a10) {
        if (!gb.test(a10)) throw Error("@supabase/auth-js: Expected parameter to be UUID but is not");
      }
      function gd(a10) {
        if (!a10.passkey) throw Error("@supabase/auth-js: the passkey API is experimental and disabled by default. Enable it by passing `auth: { experimental: { passkey: true } }` to createClient (or to the GoTrueClient constructor).");
      }
      function ge() {
        return new Proxy({}, { get: (a10, b10) => {
          if ("__isUserNotAvailableProxy" === b10) return true;
          if ("symbol" == typeof b10) {
            let a11 = b10.toString();
            if ("Symbol(Symbol.toPrimitive)" === a11 || "Symbol(Symbol.toStringTag)" === a11 || "Symbol(util.inspect.custom)" === a11) return;
          }
          throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Accessing the "${b10}" property of the session object is not supported. Please use getUser() instead.`);
        }, set: (a10, b10) => {
          throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Setting the "${b10}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
        }, deleteProperty: (a10, b10) => {
          throw Error(`@supabase/auth-js: client was created with userStorage option and there was no user stored in the user storage. Deleting the "${b10}" property of the session object is not supported. Please use getUser() to fetch a user object you can manipulate.`);
        } });
      }
      function gf(a10) {
        return JSON.parse(JSON.stringify(a10));
      }
      let gg = (a10) => {
        if ("object" == typeof a10 && null !== a10) {
          if ("string" == typeof a10.msg) return a10.msg;
          if ("string" == typeof a10.message) return a10.message;
          if ("string" == typeof a10.error_description) return a10.error_description;
          if ("string" == typeof a10.error) return a10.error;
        }
        return JSON.stringify(a10);
      }, gh = [502, 503, 504, 520, 521, 522, 523, 524, 530];
      async function gi(a10) {
        var b10;
        let c10, d10;
        if (!("object" == typeof a10 && null !== a10 && "status" in a10 && "ok" in a10 && "json" in a10 && "function" == typeof a10.json)) throw new fL(gg(a10), 0);
        if (gh.includes(a10.status)) throw new fL(gg(a10), a10.status);
        try {
          c10 = await a10.json();
        } catch (a11) {
          throw new fC(gg(a11), a11);
        }
        let e10 = function(a11) {
          let b11 = a11.headers.get(fw);
          if (!b11 || !b11.match(ga)) return null;
          try {
            return /* @__PURE__ */ new Date(`${b11}T00:00:00.0Z`);
          } catch (a12) {
            return null;
          }
        }(a10);
        if (e10 && e10.getTime() >= fx["2024-01-01"].timestamp && "object" == typeof c10 && c10 && "string" == typeof c10.code ? d10 = c10.code : "object" == typeof c10 && c10 && "string" == typeof c10.error_code && (d10 = c10.error_code), d10) {
          if ("weak_password" === d10) throw new fO(gg(c10), a10.status, (null == (b10 = c10.weak_password) ? void 0 : b10.reasons) || []);
          else if ("session_not_found" === d10) throw new fE();
        } else if ("object" == typeof c10 && c10 && "object" == typeof c10.weak_password && c10.weak_password && Array.isArray(c10.weak_password.reasons) && c10.weak_password.reasons.length && c10.weak_password.reasons.reduce((a11, b11) => a11 && "string" == typeof b11, true)) throw new fO(gg(c10), a10.status, c10.weak_password.reasons);
        throw new fB(gg(c10), a10.status || 500, d10);
      }
      async function gj(a10, b10, c10, d10) {
        var e10;
        let f10 = Object.assign({}, null == d10 ? void 0 : d10.headers);
        f10[fw] || (f10[fw] = fx["2024-01-01"].name), (null == d10 ? void 0 : d10.jwt) && (f10.Authorization = `Bearer ${d10.jwt}`);
        let g10 = null != (e10 = null == d10 ? void 0 : d10.query) ? e10 : {};
        (null == d10 ? void 0 : d10.redirectTo) && (g10.redirect_to = d10.redirectTo);
        let h10 = Object.keys(g10).length ? "?" + new URLSearchParams(g10).toString() : "", i10 = await gk(a10, b10, c10 + h10, { headers: f10, noResolveJson: null == d10 ? void 0 : d10.noResolveJson }, {}, null == d10 ? void 0 : d10.body);
        return (null == d10 ? void 0 : d10.xform) ? null == d10 ? void 0 : d10.xform(i10) : { data: Object.assign({}, i10), error: null };
      }
      async function gk(a10, b10, c10, d10, e10, f10) {
        let g10, h10, i10 = (h10 = { method: b10, headers: (null == d10 ? void 0 : d10.headers) || {} }, "GET" === b10 ? h10 : (h10.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, null == d10 ? void 0 : d10.headers), h10.body = JSON.stringify(f10), Object.assign(Object.assign({}, h10), e10)));
        try {
          g10 = await a10(c10, Object.assign({}, i10));
        } catch (a11) {
          throw console.error(a11), new fL(gg(a11), 0);
        }
        if (g10.ok || await gi(g10), null == d10 ? void 0 : d10.noResolveJson) return g10;
        try {
          return await g10.json();
        } catch (a11) {
          await gi(a11);
        }
      }
      function gl(a10) {
        var b10, c10, d10;
        let e10 = null;
        (d10 = a10).access_token && d10.refresh_token && d10.expires_in && (e10 = Object.assign({}, a10), a10.expires_at || (e10.expires_at = (c10 = a10.expires_in, Math.round(Date.now() / 1e3) + c10)));
        return { data: { session: e10, user: null != (b10 = a10.user) ? b10 : "string" == typeof (null == a10 ? void 0 : a10.id) ? a10 : null }, error: null };
      }
      function gm(a10) {
        let b10 = gl(a10);
        return !b10.error && a10.weak_password && "object" == typeof a10.weak_password && Array.isArray(a10.weak_password.reasons) && a10.weak_password.reasons.length && a10.weak_password.message && "string" == typeof a10.weak_password.message && a10.weak_password.reasons.reduce((a11, b11) => a11 && "string" == typeof b11, true) && (b10.data.weak_password = a10.weak_password), b10;
      }
      function gn(a10) {
        var b10;
        return { data: { user: null != (b10 = a10.user) ? b10 : a10 }, error: null };
      }
      function go(a10) {
        return { data: a10, error: null };
      }
      function gp(a10) {
        let { action_link: b10, email_otp: c10, hashed_token: d10, redirect_to: e10, verification_type: f10 } = a10;
        return { data: { properties: { action_link: b10, email_otp: c10, hashed_token: d10, redirect_to: e10, verification_type: f10 }, user: Object.assign({}, dL(a10, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"])) }, error: null };
      }
      function gq(a10) {
        return a10;
      }
      let gr = ["global", "local", "others"];
      class gs {
        constructor({ url: a10 = "", headers: b10 = {}, fetch: c10, experimental: d10 }) {
          this.url = a10, this.headers = b10, this.fetch = f_(c10), this.experimental = null != d10 ? d10 : {}, this.mfa = { listFactors: this._listFactors.bind(this), deleteFactor: this._deleteFactor.bind(this) }, this.oauth = { listClients: this._listOAuthClients.bind(this), createClient: this._createOAuthClient.bind(this), getClient: this._getOAuthClient.bind(this), updateClient: this._updateOAuthClient.bind(this), deleteClient: this._deleteOAuthClient.bind(this), regenerateClientSecret: this._regenerateOAuthClientSecret.bind(this) }, this.customProviders = { listProviders: this._listCustomProviders.bind(this), createProvider: this._createCustomProvider.bind(this), getProvider: this._getCustomProvider.bind(this), updateProvider: this._updateCustomProvider.bind(this), deleteProvider: this._deleteCustomProvider.bind(this) }, this.passkey = { listPasskeys: this._adminListPasskeys.bind(this), deletePasskey: this._adminDeletePasskey.bind(this) };
        }
        async signOut(a10, b10 = gr[0]) {
          if (0 > gr.indexOf(b10)) throw Error(`@supabase/auth-js: Parameter scope must be one of ${gr.join(", ")}`);
          try {
            return await gj(this.fetch, "POST", `${this.url}/logout?scope=${b10}`, { headers: this.headers, jwt: a10, noResolveJson: true }), { data: null, error: null };
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async inviteUserByEmail(a10, b10 = {}) {
          try {
            return await gj(this.fetch, "POST", `${this.url}/invite`, { body: { email: a10, data: b10.data }, headers: this.headers, redirectTo: b10.redirectTo, xform: gn });
          } catch (a11) {
            if (fA(a11)) return { data: { user: null }, error: a11 };
            throw a11;
          }
        }
        async generateLink(a10) {
          try {
            let { options: b10 } = a10, c10 = dL(a10, ["options"]), d10 = Object.assign(Object.assign({}, c10), b10);
            return "newEmail" in c10 && (d10.new_email = null == c10 ? void 0 : c10.newEmail, delete d10.newEmail), await gj(this.fetch, "POST", `${this.url}/admin/generate_link`, { body: d10, headers: this.headers, xform: gp, redirectTo: null == b10 ? void 0 : b10.redirectTo });
          } catch (a11) {
            if (fA(a11)) return { data: { properties: null, user: null }, error: a11 };
            throw a11;
          }
        }
        async createUser(a10) {
          try {
            return await gj(this.fetch, "POST", `${this.url}/admin/users`, { body: a10, headers: this.headers, xform: gn });
          } catch (a11) {
            if (fA(a11)) return { data: { user: null }, error: a11 };
            throw a11;
          }
        }
        async listUsers(a10) {
          var b10, c10, d10, e10, f10, g10, h10;
          try {
            let i10 = { nextPage: null, lastPage: 0, total: 0 }, j10 = await gj(this.fetch, "GET", `${this.url}/admin/users`, { headers: this.headers, noResolveJson: true, query: { page: null != (c10 = null == (b10 = null == a10 ? void 0 : a10.page) ? void 0 : b10.toString()) ? c10 : "", per_page: null != (e10 = null == (d10 = null == a10 ? void 0 : a10.perPage) ? void 0 : d10.toString()) ? e10 : "" }, xform: gq });
            if (j10.error) throw j10.error;
            let k2 = await j10.json(), l2 = null != (f10 = j10.headers.get("x-total-count")) ? f10 : 0, m2 = null != (h10 = null == (g10 = j10.headers.get("link")) ? void 0 : g10.split(",")) ? h10 : [];
            return m2.length > 0 && (m2.forEach((a11) => {
              let b11 = parseInt(a11.split(";")[0].split("=")[1].substring(0, 1)), c11 = JSON.parse(a11.split(";")[1].split("=")[1]);
              i10[`${c11}Page`] = b11;
            }), i10.total = parseInt(l2)), { data: Object.assign(Object.assign({}, k2), i10), error: null };
          } catch (a11) {
            if (fA(a11)) return { data: { users: [] }, error: a11 };
            throw a11;
          }
        }
        async getUserById(a10) {
          gc(a10);
          try {
            return await gj(this.fetch, "GET", `${this.url}/admin/users/${a10}`, { headers: this.headers, xform: gn });
          } catch (a11) {
            if (fA(a11)) return { data: { user: null }, error: a11 };
            throw a11;
          }
        }
        async updateUserById(a10, b10) {
          gc(a10);
          try {
            return await gj(this.fetch, "PUT", `${this.url}/admin/users/${a10}`, { body: b10, headers: this.headers, xform: gn });
          } catch (a11) {
            if (fA(a11)) return { data: { user: null }, error: a11 };
            throw a11;
          }
        }
        async deleteUser(a10, b10 = false) {
          gc(a10);
          try {
            return await gj(this.fetch, "DELETE", `${this.url}/admin/users/${a10}`, { headers: this.headers, body: { should_soft_delete: b10 }, xform: gn });
          } catch (a11) {
            if (fA(a11)) return { data: { user: null }, error: a11 };
            throw a11;
          }
        }
        async _listFactors(a10) {
          gc(a10.userId);
          try {
            let { data: b10, error: c10 } = await gj(this.fetch, "GET", `${this.url}/admin/users/${a10.userId}/factors`, { headers: this.headers, xform: (a11) => ({ data: { factors: a11 }, error: null }) });
            return { data: b10, error: c10 };
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _deleteFactor(a10) {
          gc(a10.userId), gc(a10.id);
          try {
            return { data: await gj(this.fetch, "DELETE", `${this.url}/admin/users/${a10.userId}/factors/${a10.id}`, { headers: this.headers }), error: null };
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _listOAuthClients(a10) {
          var b10, c10, d10, e10, f10, g10, h10;
          try {
            let i10 = { nextPage: null, lastPage: 0, total: 0 }, j10 = await gj(this.fetch, "GET", `${this.url}/admin/oauth/clients`, { headers: this.headers, noResolveJson: true, query: { page: null != (c10 = null == (b10 = null == a10 ? void 0 : a10.page) ? void 0 : b10.toString()) ? c10 : "", per_page: null != (e10 = null == (d10 = null == a10 ? void 0 : a10.perPage) ? void 0 : d10.toString()) ? e10 : "" }, xform: gq });
            if (j10.error) throw j10.error;
            let k2 = await j10.json(), l2 = null != (f10 = j10.headers.get("x-total-count")) ? f10 : 0, m2 = null != (h10 = null == (g10 = j10.headers.get("link")) ? void 0 : g10.split(",")) ? h10 : [];
            return m2.length > 0 && (m2.forEach((a11) => {
              let b11 = parseInt(a11.split(";")[0].split("=")[1].substring(0, 1)), c11 = JSON.parse(a11.split(";")[1].split("=")[1]);
              i10[`${c11}Page`] = b11;
            }), i10.total = parseInt(l2)), { data: Object.assign(Object.assign({}, k2), i10), error: null };
          } catch (a11) {
            if (fA(a11)) return { data: { clients: [] }, error: a11 };
            throw a11;
          }
        }
        async _createOAuthClient(a10) {
          try {
            return await gj(this.fetch, "POST", `${this.url}/admin/oauth/clients`, { body: a10, headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _getOAuthClient(a10) {
          try {
            return await gj(this.fetch, "GET", `${this.url}/admin/oauth/clients/${a10}`, { headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _updateOAuthClient(a10, b10) {
          try {
            return await gj(this.fetch, "PUT", `${this.url}/admin/oauth/clients/${a10}`, { body: b10, headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _deleteOAuthClient(a10) {
          try {
            return await gj(this.fetch, "DELETE", `${this.url}/admin/oauth/clients/${a10}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _regenerateOAuthClientSecret(a10) {
          try {
            return await gj(this.fetch, "POST", `${this.url}/admin/oauth/clients/${a10}/regenerate_secret`, { headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _listCustomProviders(a10) {
          try {
            let b10 = {};
            return (null == a10 ? void 0 : a10.type) && (b10.type = a10.type), await gj(this.fetch, "GET", `${this.url}/admin/custom-providers`, { headers: this.headers, query: b10, xform: (a11) => {
              var b11;
              return { data: { providers: null != (b11 = null == a11 ? void 0 : a11.providers) ? b11 : [] }, error: null };
            } });
          } catch (a11) {
            if (fA(a11)) return { data: { providers: [] }, error: a11 };
            throw a11;
          }
        }
        async _createCustomProvider(a10) {
          try {
            return await gj(this.fetch, "POST", `${this.url}/admin/custom-providers`, { body: a10, headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _getCustomProvider(a10) {
          try {
            return await gj(this.fetch, "GET", `${this.url}/admin/custom-providers/${a10}`, { headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _updateCustomProvider(a10, b10) {
          try {
            return await gj(this.fetch, "PUT", `${this.url}/admin/custom-providers/${a10}`, { body: b10, headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _deleteCustomProvider(a10) {
          try {
            return await gj(this.fetch, "DELETE", `${this.url}/admin/custom-providers/${a10}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _adminListPasskeys(a10) {
          gd(this.experimental), gc(a10.userId);
          try {
            return await gj(this.fetch, "GET", `${this.url}/admin/users/${a10.userId}/passkeys`, { headers: this.headers, xform: (a11) => ({ data: a11, error: null }) });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
        async _adminDeletePasskey(a10) {
          gd(this.experimental), gc(a10.userId), gc(a10.passkeyId);
          try {
            return await gj(this.fetch, "DELETE", `${this.url}/admin/users/${a10.userId}/passkeys/${a10.passkeyId}`, { headers: this.headers, noResolveJson: true }), { data: null, error: null };
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            throw a11;
          }
        }
      }
      function gt(a10 = {}) {
        return { getItem: (b10) => a10[b10] || null, setItem: (b10, c10) => {
          a10[b10] = c10;
        }, removeItem: (b10) => {
          delete a10[b10];
        } };
      }
      globalThis && f$() && globalThis.localStorage && globalThis.localStorage.getItem("supabase.gotrue-js.locks.debug");
      class gu extends Error {
        constructor(a10) {
          super(a10), this.isAcquireTimeout = true;
        }
      }
      function gv(a10) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(a10)) throw Error(`@supabase/auth-js: Address "${a10}" is invalid.`);
        return a10.toLowerCase();
      }
      class gw extends Error {
        constructor({ message: a10, code: b10, cause: c10, name: d10 }) {
          var e10;
          super(a10, { cause: c10 }), this.__isWebAuthnError = true, this.name = null != (e10 = null != d10 ? d10 : c10 instanceof Error ? c10.name : void 0) ? e10 : "Unknown Error", this.code = b10;
        }
        toJSON() {
          return { name: this.name, message: this.message, code: this.code };
        }
      }
      class gx extends gw {
        constructor(a10, b10) {
          super({ code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: b10, message: a10 }), this.name = "WebAuthnUnknownError", this.originalError = b10;
        }
      }
      class gy {
        createNewAbortSignal() {
          if (this.controller) {
            let a11 = Error("Cancelling existing WebAuthn API call for new one");
            a11.name = "AbortError", this.controller.abort(a11);
          }
          let a10 = new AbortController();
          return this.controller = a10, a10.signal;
        }
        cancelCeremony() {
          if (this.controller) {
            let a10 = Error("Manually cancelling existing WebAuthn API call");
            a10.name = "AbortError", this.controller.abort(a10), this.controller = void 0;
          }
        }
      }
      let gz = new gy();
      function gA(a10) {
        if (!a10) throw Error("Credential creation options are required");
        if ("u" > typeof PublicKeyCredential && "parseCreationOptionsFromJSON" in PublicKeyCredential && "function" == typeof PublicKeyCredential.parseCreationOptionsFromJSON) return PublicKeyCredential.parseCreationOptionsFromJSON(a10);
        let { challenge: b10, user: c10, excludeCredentials: d10 } = a10, e10 = dL(a10, ["challenge", "user", "excludeCredentials"]), f10 = fW(b10).buffer, g10 = Object.assign(Object.assign({}, c10), { id: fW(c10.id).buffer }), h10 = Object.assign(Object.assign({}, e10), { challenge: f10, user: g10 });
        if (d10 && d10.length > 0) {
          h10.excludeCredentials = Array(d10.length);
          for (let a11 = 0; a11 < d10.length; a11++) {
            let b11 = d10[a11];
            h10.excludeCredentials[a11] = Object.assign(Object.assign({}, b11), { id: fW(b11.id).buffer, type: b11.type || "public-key", transports: b11.transports });
          }
        }
        return h10;
      }
      function gB(a10) {
        if (!a10) throw Error("Credential request options are required");
        if ("u" > typeof PublicKeyCredential && "parseRequestOptionsFromJSON" in PublicKeyCredential && "function" == typeof PublicKeyCredential.parseRequestOptionsFromJSON) return PublicKeyCredential.parseRequestOptionsFromJSON(a10);
        let { challenge: b10, allowCredentials: c10 } = a10, d10 = dL(a10, ["challenge", "allowCredentials"]), e10 = fW(b10).buffer, f10 = Object.assign(Object.assign({}, d10), { challenge: e10 });
        if (c10 && c10.length > 0) {
          f10.allowCredentials = Array(c10.length);
          for (let a11 = 0; a11 < c10.length; a11++) {
            let b11 = c10[a11];
            f10.allowCredentials[a11] = Object.assign(Object.assign({}, b11), { id: fW(b11.id).buffer, type: b11.type || "public-key", transports: b11.transports });
          }
        }
        return f10;
      }
      function gC(a10) {
        var b10;
        return "toJSON" in a10 && "function" == typeof a10.toJSON ? a10.toJSON() : { id: a10.id, rawId: a10.id, response: { attestationObject: fX(new Uint8Array(a10.response.attestationObject)), clientDataJSON: fX(new Uint8Array(a10.response.clientDataJSON)) }, type: "public-key", clientExtensionResults: a10.getClientExtensionResults(), authenticatorAttachment: null != (b10 = a10.authenticatorAttachment) ? b10 : void 0 };
      }
      function gD(a10) {
        var b10;
        if ("toJSON" in a10 && "function" == typeof a10.toJSON) return a10.toJSON();
        let c10 = a10.getClientExtensionResults(), d10 = a10.response;
        return { id: a10.id, rawId: a10.id, response: { authenticatorData: fX(new Uint8Array(d10.authenticatorData)), clientDataJSON: fX(new Uint8Array(d10.clientDataJSON)), signature: fX(new Uint8Array(d10.signature)), userHandle: d10.userHandle ? fX(new Uint8Array(d10.userHandle)) : void 0 }, type: "public-key", clientExtensionResults: c10, authenticatorAttachment: null != (b10 = a10.authenticatorAttachment) ? b10 : void 0 };
      }
      function gE(a10) {
        return "localhost" === a10 || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(a10);
      }
      function gF() {
        var a10, b10;
        return !!(fY() && "PublicKeyCredential" in window && window.PublicKeyCredential && "credentials" in navigator && "function" == typeof (null == (a10 = null == navigator ? void 0 : navigator.credentials) ? void 0 : a10.create) && "function" == typeof (null == (b10 = null == navigator ? void 0 : navigator.credentials) ? void 0 : b10.get));
      }
      async function gG(a10) {
        try {
          let b10 = await navigator.credentials.create(a10);
          if (!b10) return { data: null, error: new gx("Empty credential response", b10) };
          if (!(b10 instanceof PublicKeyCredential)) return { data: null, error: new gx("Browser returned unexpected credential type", b10) };
          return { data: b10, error: null };
        } catch (b10) {
          return { data: null, error: function({ error: a11, options: b11 }) {
            var c10, d10, e10;
            let { publicKey: f10 } = b11;
            if (!f10) throw Error("options was missing required publicKey property");
            if ("AbortError" === a11.name) {
              if (b11.signal instanceof AbortSignal) return new gw({ message: "Registration ceremony was sent an abort signal", code: "ERROR_CEREMONY_ABORTED", cause: a11 });
            } else if ("ConstraintError" === a11.name) {
              if ((null == (c10 = f10.authenticatorSelection) ? void 0 : c10.requireResidentKey) === true) return new gw({ message: "Discoverable credentials were required but no available authenticator supported it", code: "ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT", cause: a11 });
              else if ("conditional" === b11.mediation && (null == (d10 = f10.authenticatorSelection) ? void 0 : d10.userVerification) === "required") return new gw({ message: "User verification was required during automatic registration but it could not be performed", code: "ERROR_AUTO_REGISTER_USER_VERIFICATION_FAILURE", cause: a11 });
              else if ((null == (e10 = f10.authenticatorSelection) ? void 0 : e10.userVerification) === "required") return new gw({ message: "User verification was required but no available authenticator supported it", code: "ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT", cause: a11 });
            } else if ("InvalidStateError" === a11.name) return new gw({ message: "The authenticator was previously registered", code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED", cause: a11 });
            else if ("NotAllowedError" === a11.name) return new gw({ message: a11.message, code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: a11 });
            else if ("NotSupportedError" === a11.name) return new gw(0 === f10.pubKeyCredParams.filter((a12) => "public-key" === a12.type).length ? { message: 'No entry in pubKeyCredParams was of type "public-key"', code: "ERROR_MALFORMED_PUBKEYCREDPARAMS", cause: a11 } : { message: "No available authenticator supported any of the specified pubKeyCredParams algorithms", code: "ERROR_AUTHENTICATOR_NO_SUPPORTED_PUBKEYCREDPARAMS_ALG", cause: a11 });
            else if ("SecurityError" === a11.name) {
              let b12 = window.location.hostname;
              if (!gE(b12)) return new gw({ message: `${window.location.hostname} is an invalid domain`, code: "ERROR_INVALID_DOMAIN", cause: a11 });
              if (f10.rp.id !== b12) return new gw({ message: `The RP ID "${f10.rp.id}" is invalid for this domain`, code: "ERROR_INVALID_RP_ID", cause: a11 });
            } else if ("TypeError" === a11.name) {
              if (f10.user.id.byteLength < 1 || f10.user.id.byteLength > 64) return new gw({ message: "User ID was not between 1 and 64 characters", code: "ERROR_INVALID_USER_ID_LENGTH", cause: a11 });
            } else if ("UnknownError" === a11.name) return new gw({ message: "The authenticator was unable to process the specified options, or could not create a new credential", code: "ERROR_AUTHENTICATOR_GENERAL_ERROR", cause: a11 });
            return new gw({ message: "a Non-Webauthn related error has occurred", code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: a11 });
          }({ error: b10, options: a10 }) };
        }
      }
      async function gH(a10) {
        try {
          let b10 = await navigator.credentials.get(a10);
          if (!b10) return { data: null, error: new gx("Empty credential response", b10) };
          if (!(b10 instanceof PublicKeyCredential)) return { data: null, error: new gx("Browser returned unexpected credential type", b10) };
          return { data: b10, error: null };
        } catch (b10) {
          return { data: null, error: function({ error: a11, options: b11 }) {
            let { publicKey: c10 } = b11;
            if (!c10) throw Error("options was missing required publicKey property");
            if ("AbortError" === a11.name) {
              if (b11.signal instanceof AbortSignal) return new gw({ message: "Authentication ceremony was sent an abort signal", code: "ERROR_CEREMONY_ABORTED", cause: a11 });
            } else if ("NotAllowedError" === a11.name) return new gw({ message: a11.message, code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: a11 });
            else if ("SecurityError" === a11.name) {
              let b12 = window.location.hostname;
              if (!gE(b12)) return new gw({ message: `${window.location.hostname} is an invalid domain`, code: "ERROR_INVALID_DOMAIN", cause: a11 });
              if (c10.rpId !== b12) return new gw({ message: `The RP ID "${c10.rpId}" is invalid for this domain`, code: "ERROR_INVALID_RP_ID", cause: a11 });
            } else if ("UnknownError" === a11.name) return new gw({ message: "The authenticator was unable to process the specified options, or could not create a new assertion signature", code: "ERROR_AUTHENTICATOR_GENERAL_ERROR", cause: a11 });
            return new gw({ message: "a Non-Webauthn related error has occurred", code: "ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY", cause: a11 });
          }({ error: b10, options: a10 }) };
        }
      }
      let gI = { hints: ["security-key"], authenticatorSelection: { authenticatorAttachment: "cross-platform", requireResidentKey: false, userVerification: "preferred", residentKey: "discouraged" }, attestation: "direct" }, gJ = { userVerification: "preferred", hints: ["security-key"], attestation: "direct" };
      function gK(...a10) {
        let b10 = (a11) => null !== a11 && "object" == typeof a11 && !Array.isArray(a11), c10 = (a11) => a11 instanceof ArrayBuffer || ArrayBuffer.isView(a11), d10 = {};
        for (let e10 of a10) if (e10) for (let a11 in e10) {
          let f10 = e10[a11];
          if (void 0 !== f10) if (Array.isArray(f10)) d10[a11] = f10;
          else if (c10(f10)) d10[a11] = f10;
          else if (b10(f10)) {
            let c11 = d10[a11];
            b10(c11) ? d10[a11] = gK(c11, f10) : d10[a11] = gK(f10);
          } else d10[a11] = f10;
        }
        return d10;
      }
      class gL {
        constructor(a10) {
          this.client = a10, this.enroll = this._enroll.bind(this), this.challenge = this._challenge.bind(this), this.verify = this._verify.bind(this), this.authenticate = this._authenticate.bind(this), this.register = this._register.bind(this);
        }
        async _enroll(a10) {
          return this.client.mfa.enroll(Object.assign(Object.assign({}, a10), { factorType: "webauthn" }));
        }
        async _challenge({ factorId: a10, webauthn: b10, friendlyName: c10, signal: d10 }, e10) {
          var f10, g10, h10, i10, j10;
          try {
            let { data: k2, error: l2 } = await this.client.mfa.challenge({ factorId: a10, webauthn: b10 });
            if (!k2) return { data: null, error: l2 };
            let m2 = null != d10 ? d10 : gz.createNewAbortSignal();
            if ("create" === k2.webauthn.type) {
              let { user: a11 } = k2.webauthn.credential_options.publicKey;
              if (!a11.name) if (c10) a11.name = `${a11.id}:${c10}`;
              else {
                let b11 = (await this.client.getUser()).data.user, c11 = (null == (f10 = null == b11 ? void 0 : b11.user_metadata) ? void 0 : f10.name) || (null == b11 ? void 0 : b11.email) || (null == b11 ? void 0 : b11.id) || "User";
                a11.name = `${a11.id}:${c11}`;
              }
              a11.displayName || (a11.displayName = a11.name);
            }
            switch (k2.webauthn.type) {
              case "create": {
                let b11 = (g10 = k2.webauthn.credential_options.publicKey, h10 = null == e10 ? void 0 : e10.create, gK(gI, g10, h10 || {})), { data: c11, error: d11 } = await gG({ publicKey: b11, signal: m2 });
                if (c11) return { data: { factorId: a10, challengeId: k2.id, webauthn: { type: k2.webauthn.type, credential_response: c11 } }, error: null };
                return { data: null, error: d11 };
              }
              case "request": {
                let b11 = (i10 = k2.webauthn.credential_options.publicKey, j10 = null == e10 ? void 0 : e10.request, gK(gJ, i10, j10 || {})), { data: c11, error: d11 } = await gH(Object.assign(Object.assign({}, k2.webauthn.credential_options), { publicKey: b11, signal: m2 }));
                if (c11) return { data: { factorId: a10, challengeId: k2.id, webauthn: { type: k2.webauthn.type, credential_response: c11 } }, error: null };
                return { data: null, error: d11 };
              }
            }
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            return { data: null, error: new fC("Unexpected error in challenge", a11) };
          }
        }
        async _verify({ challengeId: a10, factorId: b10, webauthn: c10 }) {
          return this.client.mfa.verify({ factorId: b10, challengeId: a10, webauthn: c10 });
        }
        async _authenticate({ factorId: a10, webauthn: { rpId: b10 = "u" > typeof window ? window.location.hostname : void 0, rpOrigins: c10 = "u" > typeof window ? [window.location.origin] : void 0, signal: d10 } = {} }, e10) {
          if (!b10) return { data: null, error: new fz("rpId is required for WebAuthn authentication") };
          try {
            if (!gF()) return { data: null, error: new fC("Browser does not support WebAuthn", null) };
            let { data: f10, error: g10 } = await this.challenge({ factorId: a10, webauthn: { rpId: b10, rpOrigins: c10 }, signal: d10 }, { request: e10 });
            if (!f10) return { data: null, error: g10 };
            let { webauthn: h10 } = f10;
            return this._verify({ factorId: a10, challengeId: f10.challengeId, webauthn: { type: h10.type, rpId: b10, rpOrigins: c10, credential_response: h10.credential_response } });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            return { data: null, error: new fC("Unexpected error in authenticate", a11) };
          }
        }
        async _register({ friendlyName: a10, webauthn: { rpId: b10 = "u" > typeof window ? window.location.hostname : void 0, rpOrigins: c10 = "u" > typeof window ? [window.location.origin] : void 0, signal: d10 } = {} }, e10) {
          if (!b10) return { data: null, error: new fz("rpId is required for WebAuthn registration") };
          try {
            if (!gF()) return { data: null, error: new fC("Browser does not support WebAuthn", null) };
            let { data: f10, error: g10 } = await this._enroll({ friendlyName: a10 });
            if (!f10) return await this.client.mfa.listFactors().then((b11) => {
              var c11;
              return null == (c11 = b11.data) ? void 0 : c11.all.find((b12) => "webauthn" === b12.factor_type && b12.friendly_name === a10 && "unverified" !== b12.status);
            }).then((a11) => a11 ? this.client.mfa.unenroll({ factorId: null == a11 ? void 0 : a11.id }) : void 0), { data: null, error: g10 };
            let { data: h10, error: i10 } = await this._challenge({ factorId: f10.id, friendlyName: f10.friendly_name, webauthn: { rpId: b10, rpOrigins: c10 }, signal: d10 }, { create: e10 });
            if (!h10) return { data: null, error: i10 };
            return this._verify({ factorId: f10.id, challengeId: h10.challengeId, webauthn: { rpId: b10, rpOrigins: c10, type: h10.webauthn.type, credential_response: h10.webauthn.credential_response } });
          } catch (a11) {
            if (fA(a11)) return { data: null, error: a11 };
            return { data: null, error: new fC("Unexpected error in register", a11) };
          }
        }
      }
      if ("object" != typeof globalThis) try {
        Object.defineProperty(Object.prototype, "__magic__", { get: function() {
          return this;
        }, configurable: true }), __magic__.globalThis = __magic__, delete Object.prototype.__magic__;
      } catch (a10) {
        "u" > typeof self && (self.globalThis = self);
      }
      let gM = { url: "http://localhost:9999", storageKey: "supabase.auth.token", autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, headers: fv, flowType: "implicit", debug: false, hasCustomAuthorizationHeader: false, throwOnError: false, lockAcquireTimeout: 5e3, skipAutoInitialize: false, experimental: {} }, gN = {};
      class gO {
        get jwks() {
          var a10, b10;
          return null != (b10 = null == (a10 = gN[this.storageKey]) ? void 0 : a10.jwks) ? b10 : { keys: [] };
        }
        set jwks(a10) {
          gN[this.storageKey] = Object.assign(Object.assign({}, gN[this.storageKey]), { jwks: a10 });
        }
        get jwks_cached_at() {
          var a10, b10;
          return null != (b10 = null == (a10 = gN[this.storageKey]) ? void 0 : a10.cachedAt) ? b10 : Number.MIN_SAFE_INTEGER;
        }
        set jwks_cached_at(a10) {
          gN[this.storageKey] = Object.assign(Object.assign({}, gN[this.storageKey]), { cachedAt: a10 });
        }
        constructor(a10) {
          var b10, c10, d10;
          this.userStorage = null, this.memoryStorage = null, this.stateChangeEmitters = /* @__PURE__ */ new Map(), this.autoRefreshTicker = null, this.autoRefreshTickTimeout = null, this.visibilityChangedCallback = null, this.refreshingDeferred = null, this._sessionRemovalEpoch = 0, this.initializePromise = null, this.detectSessionInUrl = true, this.hasCustomAuthorizationHeader = false, this.suppressGetSessionWarning = false, this.lock = null, this.lockAcquired = false, this.pendingInLock = [], this.broadcastChannel = null, this.logger = console.log;
          const e10 = Object.assign(Object.assign({}, gM), a10);
          if (this.storageKey = e10.storageKey, this.instanceID = null != (b10 = gO.nextInstanceID[this.storageKey]) ? b10 : 0, gO.nextInstanceID[this.storageKey] = this.instanceID + 1, this.logDebugMessages = !!e10.debug, "function" == typeof e10.debug && (this.logger = e10.debug), this.instanceID > 0 && fY()) {
            const a11 = `${this._logPrefix()} Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.`;
            console.warn(a11), this.logDebugMessages && console.trace(a11);
          }
          if (this.persistSession = e10.persistSession, this.autoRefreshToken = e10.autoRefreshToken, this.experimental = null != (c10 = e10.experimental) ? c10 : {}, this.admin = new gs({ url: e10.url, headers: e10.headers, fetch: e10.fetch, experimental: this.experimental }), this.url = e10.url, this.headers = e10.headers, this.fetch = f_(e10.fetch), this.detectSessionInUrl = e10.detectSessionInUrl, this.flowType = e10.flowType, this.hasCustomAuthorizationHeader = e10.hasCustomAuthorizationHeader, this.throwOnError = e10.throwOnError, this.lockAcquireTimeout = e10.lockAcquireTimeout, null != e10.lock && (this.lock = e10.lock), this.jwks || (this.jwks = { keys: [] }, this.jwks_cached_at = Number.MIN_SAFE_INTEGER), this.mfa = { verify: this._verify.bind(this), enroll: this._enroll.bind(this), unenroll: this._unenroll.bind(this), challenge: this._challenge.bind(this), listFactors: this._listFactors.bind(this), challengeAndVerify: this._challengeAndVerify.bind(this), getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this), webauthn: new gL(this) }, this.oauth = { getAuthorizationDetails: this._getAuthorizationDetails.bind(this), approveAuthorization: this._approveAuthorization.bind(this), denyAuthorization: this._denyAuthorization.bind(this), listGrants: this._listOAuthGrants.bind(this), revokeGrant: this._revokeOAuthGrant.bind(this) }, this.passkey = { startRegistration: this._startPasskeyRegistration.bind(this), verifyRegistration: this._verifyPasskeyRegistration.bind(this), startAuthentication: this._startPasskeyAuthentication.bind(this), verifyAuthentication: this._verifyPasskeyAuthentication.bind(this), list: this._listPasskeys.bind(this), update: this._updatePasskey.bind(this), delete: this._deletePasskey.bind(this) }, this.persistSession ? (e10.storage ? this.storage = e10.storage : f$() ? this.storage = globalThis.localStorage : (this.memoryStorage = {}, this.storage = gt(this.memoryStorage)), e10.userStorage && (this.userStorage = e10.userStorage)) : (this.memoryStorage = {}, this.storage = gt(this.memoryStorage)), fY() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
            try {
              this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
            } catch (a11) {
              console.error("Failed to create a new BroadcastChannel, multi-tab state changes will not be available", a11);
            }
            null == (d10 = this.broadcastChannel) || d10.addEventListener("message", async (a11) => {
              this._debug("received broadcast notification from other tab or client", a11);
              try {
                await this._notifyAllSubscribers(a11.data.event, a11.data.session, false);
              } catch (a12) {
                this._debug("#broadcastChannel", "error", a12);
              }
            });
          }
          e10.skipAutoInitialize || this.initialize().catch((a11) => {
            this._debug("#initialize()", "error", a11);
          });
        }
        isThrowOnErrorEnabled() {
          return this.throwOnError;
        }
        _returnResult(a10) {
          if (this.throwOnError && a10 && a10.error) throw a10.error;
          return a10;
        }
        _logPrefix() {
          return `GoTrueClient@${this.storageKey}:${this.instanceID} (${fu}) ${(/* @__PURE__ */ new Date()).toISOString()}`;
        }
        _debug(...a10) {
          return this.logDebugMessages && this.logger(this._logPrefix(), ...a10), this;
        }
        async initialize() {
          return this.initializePromise || (this.initializePromise = (async () => null != this.lock ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._initialize()) : await this._initialize())()), await this.initializePromise;
        }
        async _initialize() {
          var a10;
          try {
            let b10 = {}, c10 = "none";
            if (fY() && (b10 = function(a11) {
              let b11 = {}, c11 = new URL(a11);
              if (c11.hash && "#" === c11.hash[0]) try {
                new URLSearchParams(c11.hash.substring(1)).forEach((a12, c12) => {
                  b11[c12] = a12;
                });
              } catch (a12) {
              }
              return c11.searchParams.forEach((a12, c12) => {
                b11[c12] = a12;
              }), b11;
            }(window.location.href), this._isImplicitGrantCallback(b10) ? c10 = "implicit" : await this._isPKCECallback(b10) && (c10 = "pkce")), fY() && this.detectSessionInUrl && "none" !== c10) {
              let { data: d10, error: e10 } = await this._getSessionFromURL(b10, c10);
              if (e10) {
                (this._debug("#_initialize()", "error detecting session from URL", e10), fA(e10) && "AuthImplicitGrantRedirectError" === e10.name) && (null == (a10 = e10.details) || a10.code);
                return { error: e10 };
              }
              let { session: f10, redirectType: g10 } = d10;
              return this._debug("#_initialize()", "detected session in URL", f10, "redirect type", g10), await this._saveSession(f10), setTimeout(async () => {
                "recovery" === g10 ? await this._notifyAllSubscribers("PASSWORD_RECOVERY", f10) : await this._notifyAllSubscribers("SIGNED_IN", f10);
              }, 0), { error: null };
            }
            return await this._recoverAndRefresh(), { error: null };
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ error: a11 });
            return this._returnResult({ error: new fC("Unexpected error during initialization", a11) });
          } finally {
            await this._handleVisibilityChange(), this._debug("#_initialize()", "end");
          }
        }
        async signInAnonymously(a10) {
          var b10, c10, d10;
          try {
            let { data: e10, error: f10 } = await gj(this.fetch, "POST", `${this.url}/signup`, { headers: this.headers, body: { data: null != (c10 = null == (b10 = null == a10 ? void 0 : a10.options) ? void 0 : b10.data) ? c10 : {}, gotrue_meta_security: { captcha_token: null == (d10 = null == a10 ? void 0 : a10.options) ? void 0 : d10.captchaToken } }, xform: gl });
            if (f10 || !e10) return this._returnResult({ data: { user: null, session: null }, error: f10 });
            let g10 = e10.session, h10 = e10.user;
            return e10.session && (await this._saveSession(e10.session), await this._notifyAllSubscribers("SIGNED_IN", g10)), this._returnResult({ data: { user: h10, session: g10 }, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async signUp(a10) {
          var b10, c10, d10;
          try {
            let e10;
            if ("email" in a10) {
              let { email: c11, password: d11, options: f11 } = a10, g11 = null, h11 = null;
              "pkce" === this.flowType && ([g11, h11] = await f9(this.storage, this.storageKey)), e10 = await gj(this.fetch, "POST", `${this.url}/signup`, { headers: this.headers, redirectTo: null == f11 ? void 0 : f11.emailRedirectTo, body: { email: c11, password: d11, data: null != (b10 = null == f11 ? void 0 : f11.data) ? b10 : {}, gotrue_meta_security: { captcha_token: null == f11 ? void 0 : f11.captchaToken }, code_challenge: g11, code_challenge_method: h11 }, xform: gl });
            } else if ("phone" in a10) {
              let { phone: b11, password: f11, options: g11 } = a10;
              e10 = await gj(this.fetch, "POST", `${this.url}/signup`, { headers: this.headers, body: { phone: b11, password: f11, data: null != (c10 = null == g11 ? void 0 : g11.data) ? c10 : {}, channel: null != (d10 = null == g11 ? void 0 : g11.channel) ? d10 : "sms", gotrue_meta_security: { captcha_token: null == g11 ? void 0 : g11.captchaToken } }, xform: gl });
            } else throw new fH("You must provide either an email or phone number and a password");
            let { data: f10, error: g10 } = e10;
            if (g10 || !f10) return await f2(this.storage, `${this.storageKey}-code-verifier`), this._returnResult({ data: { user: null, session: null }, error: g10 });
            let h10 = f10.session, i10 = f10.user;
            return f10.session && (await this._saveSession(f10.session), await this._notifyAllSubscribers("SIGNED_IN", h10)), this._returnResult({ data: { user: i10, session: h10 }, error: null });
          } catch (a11) {
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async signInWithPassword(a10) {
          try {
            let b10;
            if ("email" in a10) {
              let { email: c11, password: d11, options: e10 } = a10;
              b10 = await gj(this.fetch, "POST", `${this.url}/token?grant_type=password`, { headers: this.headers, body: { email: c11, password: d11, gotrue_meta_security: { captcha_token: null == e10 ? void 0 : e10.captchaToken } }, xform: gm });
            } else if ("phone" in a10) {
              let { phone: c11, password: d11, options: e10 } = a10;
              b10 = await gj(this.fetch, "POST", `${this.url}/token?grant_type=password`, { headers: this.headers, body: { phone: c11, password: d11, gotrue_meta_security: { captcha_token: null == e10 ? void 0 : e10.captchaToken } }, xform: gm });
            } else throw new fH("You must provide either an email or phone number and a password");
            let { data: c10, error: d10 } = b10;
            if (d10) return this._returnResult({ data: { user: null, session: null }, error: d10 });
            if (!c10 || !c10.session || !c10.user) {
              let a11 = new fG();
              return this._returnResult({ data: { user: null, session: null }, error: a11 });
            }
            return c10.session && (await this._saveSession(c10.session), await this._notifyAllSubscribers("SIGNED_IN", c10.session)), this._returnResult({ data: Object.assign({ user: c10.user, session: c10.session }, c10.weak_password ? { weakPassword: c10.weak_password } : null), error: d10 });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async signInWithOAuth(a10) {
          var b10, c10, d10, e10;
          return await this._handleProviderSignIn(a10.provider, { redirectTo: null == (b10 = a10.options) ? void 0 : b10.redirectTo, scopes: null == (c10 = a10.options) ? void 0 : c10.scopes, queryParams: null == (d10 = a10.options) ? void 0 : d10.queryParams, skipBrowserRedirect: null == (e10 = a10.options) ? void 0 : e10.skipBrowserRedirect });
        }
        async exchangeCodeForSession(a10) {
          return (await this.initializePromise, null != this.lock) ? this._acquireLock(this.lockAcquireTimeout, async () => this._exchangeCodeForSession(a10)) : this._exchangeCodeForSession(a10);
        }
        async signInWithWeb3(a10) {
          let { chain: b10 } = a10;
          switch (b10) {
            case "ethereum":
              return await this.signInWithEthereum(a10);
            case "solana":
              return await this.signInWithSolana(a10);
            default:
              throw Error(`@supabase/auth-js: Unsupported chain "${b10}"`);
          }
        }
        async signInWithEthereum(a10) {
          var b10, c10, d10, e10, f10, g10, h10, i10, j10, k2, l2, m2;
          let n2, o2;
          if ("message" in a10) n2 = a10.message, o2 = a10.signature;
          else {
            let k3, { chain: l3, wallet: p2, statement: q2, options: r2 } = a10;
            if (fY()) if ("object" == typeof p2) k3 = p2;
            else {
              let a11 = window;
              if ("ethereum" in a11 && "object" == typeof a11.ethereum && "request" in a11.ethereum && "function" == typeof a11.ethereum.request) k3 = a11.ethereum;
              else throw Error("@supabase/auth-js: No compatible Ethereum wallet interface on the window object (window.ethereum) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'ethereum', wallet: resolvedUserWallet }) instead.");
            }
            else {
              if ("object" != typeof p2 || !(null == r2 ? void 0 : r2.url)) throw Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
              k3 = p2;
            }
            let s2 = new URL(null != (b10 = null == r2 ? void 0 : r2.url) ? b10 : window.location.href), t2 = await k3.request({ method: "eth_requestAccounts" }).then((a11) => a11).catch(() => {
              throw Error("@supabase/auth-js: Wallet method eth_requestAccounts is missing or invalid");
            });
            if (!t2 || 0 === t2.length) throw Error("@supabase/auth-js: No accounts available. Please ensure the wallet is connected.");
            let u2 = gv(t2[0]), v2 = null == (c10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : c10.chainId;
            v2 || (v2 = parseInt(await k3.request({ method: "eth_chainId" }), 16)), n2 = function(a11) {
              var b11;
              let { chainId: c11, domain: d11, expirationTime: e11, issuedAt: f11 = /* @__PURE__ */ new Date(), nonce: g11, notBefore: h11, requestId: i11, resources: j11, scheme: k4, uri: l4, version: m3 } = a11;
              if (!Number.isInteger(c11)) throw Error(`@supabase/auth-js: Invalid SIWE message field "chainId". Chain ID must be a EIP-155 chain ID. Provided value: ${c11}`);
              if (!d11) throw Error('@supabase/auth-js: Invalid SIWE message field "domain". Domain must be provided.');
              if (g11 && g11.length < 8) throw Error(`@supabase/auth-js: Invalid SIWE message field "nonce". Nonce must be at least 8 characters. Provided value: ${g11}`);
              if (!l4) throw Error('@supabase/auth-js: Invalid SIWE message field "uri". URI must be provided.');
              if ("1" !== m3) throw Error(`@supabase/auth-js: Invalid SIWE message field "version". Version must be '1'. Provided value: ${m3}`);
              if (null == (b11 = a11.statement) ? void 0 : b11.includes("\n")) throw Error(`@supabase/auth-js: Invalid SIWE message field "statement". Statement must not include '\\n'. Provided value: ${a11.statement}`);
              let n3 = gv(a11.address), o3 = k4 ? `${k4}://${d11}` : d11, p3 = a11.statement ? `${a11.statement}
` : "", q3 = `${o3} wants you to sign in with your Ethereum account:
${n3}

${p3}`, r3 = `URI: ${l4}
Version: ${m3}
Chain ID: ${c11}${g11 ? `
Nonce: ${g11}` : ""}
Issued At: ${f11.toISOString()}`;
              if (e11 && (r3 += `
Expiration Time: ${e11.toISOString()}`), h11 && (r3 += `
Not Before: ${h11.toISOString()}`), i11 && (r3 += `
Request ID: ${i11}`), j11) {
                let a12 = "\nResources:";
                for (let b12 of j11) {
                  if (!b12 || "string" != typeof b12) throw Error(`@supabase/auth-js: Invalid SIWE message field "resources". Every resource must be a valid string. Provided value: ${b12}`);
                  a12 += `
- ${b12}`;
                }
                r3 += a12;
              }
              return `${q3}
${r3}`;
            }({ domain: s2.host, address: u2, statement: q2, uri: s2.href, version: "1", chainId: v2, nonce: null == (d10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : d10.nonce, issuedAt: null != (f10 = null == (e10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : e10.issuedAt) ? f10 : /* @__PURE__ */ new Date(), expirationTime: null == (g10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : g10.expirationTime, notBefore: null == (h10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : h10.notBefore, requestId: null == (i10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : i10.requestId, resources: null == (j10 = null == r2 ? void 0 : r2.signInWithEthereum) ? void 0 : j10.resources }), o2 = await k3.request({ method: "personal_sign", params: [(m2 = n2, "0x" + Array.from(new TextEncoder().encode(m2), (a11) => a11.toString(16).padStart(2, "0")).join("")), u2] });
          }
          try {
            let { data: b11, error: c11 } = await gj(this.fetch, "POST", `${this.url}/token?grant_type=web3`, { headers: this.headers, body: Object.assign({ chain: "ethereum", message: n2, signature: o2 }, (null == (k2 = a10.options) ? void 0 : k2.captchaToken) ? { gotrue_meta_security: { captcha_token: null == (l2 = a10.options) ? void 0 : l2.captchaToken } } : null), xform: gl });
            if (c11) throw c11;
            if (!b11 || !b11.session || !b11.user) {
              let a11 = new fG();
              return this._returnResult({ data: { user: null, session: null }, error: a11 });
            }
            return b11.session && (await this._saveSession(b11.session), await this._notifyAllSubscribers("SIGNED_IN", b11.session)), this._returnResult({ data: Object.assign({}, b11), error: c11 });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async signInWithSolana(a10) {
          var b10, c10, d10, e10, f10, g10, h10, i10, j10, k2, l2, m2;
          let n2, o2;
          if ("message" in a10) n2 = a10.message, o2 = a10.signature;
          else {
            let l3, { chain: m3, wallet: p2, statement: q2, options: r2 } = a10;
            if (fY()) if ("object" == typeof p2) l3 = p2;
            else {
              let a11 = window;
              if ("solana" in a11 && "object" == typeof a11.solana && ("signIn" in a11.solana && "function" == typeof a11.solana.signIn || "signMessage" in a11.solana && "function" == typeof a11.solana.signMessage)) l3 = a11.solana;
              else throw Error("@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.");
            }
            else {
              if ("object" != typeof p2 || !(null == r2 ? void 0 : r2.url)) throw Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
              l3 = p2;
            }
            let s2 = new URL(null != (b10 = null == r2 ? void 0 : r2.url) ? b10 : window.location.href);
            if ("signIn" in l3 && l3.signIn) {
              let a11, b11 = await l3.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, null == r2 ? void 0 : r2.signInWithSolana), { version: "1", domain: s2.host, uri: s2.href }), q2 ? { statement: q2 } : null));
              if (Array.isArray(b11) && b11[0] && "object" == typeof b11[0]) a11 = b11[0];
              else if (b11 && "object" == typeof b11 && "signedMessage" in b11 && "signature" in b11) a11 = b11;
              else throw Error("@supabase/auth-js: Wallet method signIn() returned unrecognized value");
              if ("signedMessage" in a11 && "signature" in a11 && ("string" == typeof a11.signedMessage || a11.signedMessage instanceof Uint8Array) && a11.signature instanceof Uint8Array) n2 = "string" == typeof a11.signedMessage ? a11.signedMessage : new TextDecoder().decode(a11.signedMessage), o2 = a11.signature;
              else throw Error("@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields");
            } else {
              if (!("signMessage" in l3) || "function" != typeof l3.signMessage || !("publicKey" in l3) || "object" != typeof l3 || !l3.publicKey || !("toBase58" in l3.publicKey) || "function" != typeof l3.publicKey.toBase58) throw Error("@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API");
              n2 = [`${s2.host} wants you to sign in with your Solana account:`, l3.publicKey.toBase58(), ...q2 ? ["", q2, ""] : [""], "Version: 1", `URI: ${s2.href}`, `Issued At: ${null != (d10 = null == (c10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : c10.issuedAt) ? d10 : (/* @__PURE__ */ new Date()).toISOString()}`, ...(null == (e10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : e10.notBefore) ? [`Not Before: ${r2.signInWithSolana.notBefore}`] : [], ...(null == (f10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : f10.expirationTime) ? [`Expiration Time: ${r2.signInWithSolana.expirationTime}`] : [], ...(null == (g10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : g10.chainId) ? [`Chain ID: ${r2.signInWithSolana.chainId}`] : [], ...(null == (h10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : h10.nonce) ? [`Nonce: ${r2.signInWithSolana.nonce}`] : [], ...(null == (i10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : i10.requestId) ? [`Request ID: ${r2.signInWithSolana.requestId}`] : [], ...(null == (k2 = null == (j10 = null == r2 ? void 0 : r2.signInWithSolana) ? void 0 : j10.resources) ? void 0 : k2.length) ? ["Resources", ...r2.signInWithSolana.resources.map((a12) => `- ${a12}`)] : []].join("\n");
              let a11 = await l3.signMessage(new TextEncoder().encode(n2), "utf8");
              if (!a11 || !(a11 instanceof Uint8Array)) throw Error("@supabase/auth-js: Wallet signMessage() API returned an recognized value");
              o2 = a11;
            }
          }
          try {
            let { data: b11, error: c11 } = await gj(this.fetch, "POST", `${this.url}/token?grant_type=web3`, { headers: this.headers, body: Object.assign({ chain: "solana", message: n2, signature: fX(o2) }, (null == (l2 = a10.options) ? void 0 : l2.captchaToken) ? { gotrue_meta_security: { captcha_token: null == (m2 = a10.options) ? void 0 : m2.captchaToken } } : null), xform: gl });
            if (c11) throw c11;
            if (!b11 || !b11.session || !b11.user) {
              let a11 = new fG();
              return this._returnResult({ data: { user: null, session: null }, error: a11 });
            }
            return b11.session && (await this._saveSession(b11.session), await this._notifyAllSubscribers("SIGNED_IN", b11.session)), this._returnResult({ data: Object.assign({}, b11), error: c11 });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async _exchangeCodeForSession(a10) {
          let b10 = await f1(this.storage, `${this.storageKey}-code-verifier`), [c10, d10] = (null != b10 ? b10 : "").split("/");
          try {
            if (!c10 && "pkce" === this.flowType) throw new fK();
            let { data: b11, error: e10 } = await gj(this.fetch, "POST", `${this.url}/token?grant_type=pkce`, { headers: this.headers, body: { auth_code: a10, code_verifier: c10 }, xform: gl });
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), e10) throw e10;
            if (!b11 || !b11.session || !b11.user) {
              let a11 = new fG();
              return this._returnResult({ data: { user: null, session: null, redirectType: null }, error: a11 });
            }
            return b11.session && (await this._saveSession(b11.session), await this._notifyAllSubscribers("recovery" === d10 ? "PASSWORD_RECOVERY" : "SIGNED_IN", b11.session)), this._returnResult({ data: Object.assign(Object.assign({}, b11), { redirectType: null != d10 ? d10 : null }), error: e10 });
          } catch (a11) {
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: { user: null, session: null, redirectType: null }, error: a11 });
            throw a11;
          }
        }
        async signInWithIdToken(a10) {
          try {
            let { options: b10, provider: c10, token: d10, access_token: e10, nonce: f10 } = a10, { data: g10, error: h10 } = await gj(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, { headers: this.headers, body: { provider: c10, id_token: d10, access_token: e10, nonce: f10, gotrue_meta_security: { captcha_token: null == b10 ? void 0 : b10.captchaToken } }, xform: gl });
            if (h10) return this._returnResult({ data: { user: null, session: null }, error: h10 });
            if (!g10 || !g10.session || !g10.user) {
              let a11 = new fG();
              return this._returnResult({ data: { user: null, session: null }, error: a11 });
            }
            return g10.session && (await this._saveSession(g10.session), await this._notifyAllSubscribers("SIGNED_IN", g10.session)), this._returnResult({ data: g10, error: h10 });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async signInWithOtp(a10) {
          var b10, c10, d10, e10, f10;
          try {
            if ("email" in a10) {
              let { email: d11, options: e11 } = a10, f11 = null, g10 = null;
              "pkce" === this.flowType && ([f11, g10] = await f9(this.storage, this.storageKey));
              let { error: h10 } = await gj(this.fetch, "POST", `${this.url}/otp`, { headers: this.headers, body: { email: d11, data: null != (b10 = null == e11 ? void 0 : e11.data) ? b10 : {}, create_user: null == (c10 = null == e11 ? void 0 : e11.shouldCreateUser) || c10, gotrue_meta_security: { captcha_token: null == e11 ? void 0 : e11.captchaToken }, code_challenge: f11, code_challenge_method: g10 }, redirectTo: null == e11 ? void 0 : e11.emailRedirectTo });
              return this._returnResult({ data: { user: null, session: null }, error: h10 });
            }
            if ("phone" in a10) {
              let { phone: b11, options: c11 } = a10, { data: g10, error: h10 } = await gj(this.fetch, "POST", `${this.url}/otp`, { headers: this.headers, body: { phone: b11, data: null != (d10 = null == c11 ? void 0 : c11.data) ? d10 : {}, create_user: null == (e10 = null == c11 ? void 0 : c11.shouldCreateUser) || e10, gotrue_meta_security: { captcha_token: null == c11 ? void 0 : c11.captchaToken }, channel: null != (f10 = null == c11 ? void 0 : c11.channel) ? f10 : "sms" } });
              return this._returnResult({ data: { user: null, session: null, messageId: null == g10 ? void 0 : g10.message_id }, error: h10 });
            }
            throw new fH("You must provide either an email or phone number.");
          } catch (a11) {
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async verifyOtp(a10) {
          var b10, c10;
          try {
            let d10, e10;
            "options" in a10 && (d10 = null == (b10 = a10.options) ? void 0 : b10.redirectTo, e10 = null == (c10 = a10.options) ? void 0 : c10.captchaToken);
            let { data: f10, error: g10 } = await gj(this.fetch, "POST", `${this.url}/verify`, { headers: this.headers, body: Object.assign(Object.assign({}, a10), { gotrue_meta_security: { captcha_token: e10 } }), redirectTo: d10, xform: gl });
            if (g10) throw g10;
            if (!f10) throw Error("An error occurred on token verification.");
            let h10 = f10.session, i10 = f10.user;
            return (null == h10 ? void 0 : h10.access_token) && (await this._saveSession(h10), await this._notifyAllSubscribers("recovery" == a10.type ? "PASSWORD_RECOVERY" : "SIGNED_IN", h10)), this._returnResult({ data: { user: i10, session: h10 }, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async signInWithSSO(a10) {
          var b10, c10, d10, e10, f10;
          try {
            let g10 = null, h10 = null;
            "pkce" === this.flowType && ([g10, h10] = await f9(this.storage, this.storageKey));
            let i10 = await gj(this.fetch, "POST", `${this.url}/sso`, { body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in a10 ? { provider_id: a10.providerId } : null), "domain" in a10 ? { domain: a10.domain } : null), { redirect_to: null != (c10 = null == (b10 = a10.options) ? void 0 : b10.redirectTo) ? c10 : void 0 }), (null == (d10 = null == a10 ? void 0 : a10.options) ? void 0 : d10.captchaToken) ? { gotrue_meta_security: { captcha_token: a10.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: g10, code_challenge_method: h10 }), headers: this.headers, xform: go });
            return (null == (e10 = i10.data) ? void 0 : e10.url) && fY() && !(null == (f10 = a10.options) ? void 0 : f10.skipBrowserRedirect) && window.location.assign(i10.data.url), this._returnResult(i10);
          } catch (a11) {
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async reauthenticate() {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._reauthenticate()) : await this._reauthenticate();
        }
        async _reauthenticate() {
          try {
            return await this._useSession(async (a10) => {
              let { data: { session: b10 }, error: c10 } = a10;
              if (c10) throw c10;
              if (!b10) throw new fE();
              let { error: d10 } = await gj(this.fetch, "GET", `${this.url}/reauthenticate`, { headers: this.headers, jwt: b10.access_token });
              return this._returnResult({ data: { user: null, session: null }, error: d10 });
            });
          } catch (a10) {
            if (fA(a10)) return this._returnResult({ data: { user: null, session: null }, error: a10 });
            throw a10;
          }
        }
        async resend(a10) {
          try {
            let b10 = `${this.url}/resend`;
            if ("email" in a10) {
              let { email: c10, type: d10, options: e10 } = a10, { error: f10 } = await gj(this.fetch, "POST", b10, { headers: this.headers, body: { email: c10, type: d10, gotrue_meta_security: { captcha_token: null == e10 ? void 0 : e10.captchaToken } }, redirectTo: null == e10 ? void 0 : e10.emailRedirectTo });
              return this._returnResult({ data: { user: null, session: null }, error: f10 });
            }
            if ("phone" in a10) {
              let { phone: c10, type: d10, options: e10 } = a10, { data: f10, error: g10 } = await gj(this.fetch, "POST", b10, { headers: this.headers, body: { phone: c10, type: d10, gotrue_meta_security: { captcha_token: null == e10 ? void 0 : e10.captchaToken } } });
              return this._returnResult({ data: { user: null, session: null, messageId: null == f10 ? void 0 : f10.message_id }, error: g10 });
            }
            throw new fH("You must provide either an email or phone number and a type");
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async getSession() {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => this._useSession(async (a10) => a10)) : await this._useSession(async (a10) => a10);
        }
        async _acquireLock(a10, b10) {
          this._debug("#_acquireLock", "begin", a10);
          try {
            if (this.lockAcquired) {
              let a11 = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve(), c10 = (async () => (await a11, await b10()))();
              return this.pendingInLock.push((async () => {
                try {
                  await c10;
                } catch (a12) {
                }
              })()), c10;
            }
            return await this.lock(`lock:${this.storageKey}`, a10, async () => {
              this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
              try {
                this.lockAcquired = true;
                let a11 = b10();
                for (this.pendingInLock.push((async () => {
                  try {
                    await a11;
                  } catch (a12) {
                  }
                })()), await a11; this.pendingInLock.length; ) {
                  let a12 = [...this.pendingInLock];
                  await Promise.all(a12), this.pendingInLock.splice(0, a12.length);
                }
                return await a11;
              } finally {
                this._debug("#_acquireLock", "lock released for storage key", this.storageKey), this.lockAcquired = false;
              }
            });
          } finally {
            this._debug("#_acquireLock", "end");
          }
        }
        async _useSession(a10) {
          this._debug("#_useSession", "begin");
          try {
            let b10 = await this.__loadSession();
            return await a10(b10);
          } finally {
            this._debug("#_useSession", "end");
          }
        }
        async __loadSession() {
          this._debug("#__loadSession()", "begin"), null == this.lock || this.lockAcquired || this._debug("#__loadSession()", "used outside of an acquired lock!", Error().stack);
          try {
            let b10 = null, c10 = await f1(this.storage, this.storageKey);
            if (this._debug("#getSession()", "session from storage", c10), null !== c10 && (this._isValidSession(c10) ? b10 = c10 : (this._debug("#getSession()", "session from storage is not valid"), await this._removeSession())), !b10) return { data: { session: null }, error: null };
            let d10 = !!b10.expires_at && 1e3 * b10.expires_at - Date.now() < 9e4;
            if (this._debug("#__loadSession()", `session has${d10 ? "" : " not"} expired`, "expires_at", b10.expires_at), !d10) {
              if (this.userStorage) {
                let a11 = await f1(this.userStorage, this.storageKey + "-user");
                (null == a11 ? void 0 : a11.user) ? b10.user = a11.user : b10.user = ge();
              }
              if (this.storage.isServer && b10.user && !b10.user.__isUserNotAvailableProxy) {
                var a10;
                let c11 = { value: this.suppressGetSessionWarning };
                b10.user = (a10 = b10.user, new Proxy(a10, { get: (a11, b11, d11) => {
                  if ("__isInsecureUserWarningProxy" === b11) return true;
                  if ("symbol" == typeof b11) {
                    let c12 = b11.toString();
                    if ("Symbol(Symbol.toPrimitive)" === c12 || "Symbol(Symbol.toStringTag)" === c12 || "Symbol(util.inspect.custom)" === c12 || "Symbol(nodejs.util.inspect.custom)" === c12) return Reflect.get(a11, b11, d11);
                  }
                  return c11.value || "string" != typeof b11 || (console.warn("Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server."), c11.value = true), Reflect.get(a11, b11, d11);
                } })), c11.value && (this.suppressGetSessionWarning = true);
              }
              return { data: { session: b10 }, error: null };
            }
            let { data: e10, error: f10 } = await this._callRefreshToken(b10.refresh_token);
            if (f10) return this._returnResult({ data: { session: null }, error: f10 });
            return this._returnResult({ data: { session: e10 }, error: null });
          } finally {
            this._debug("#__loadSession()", "end");
          }
        }
        async getUser(a10) {
          let b10;
          return a10 ? await this._getUser(a10) : (await this.initializePromise, (b10 = null != this.lock ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._getUser()) : await this._getUser()).data.user && (this.suppressGetSessionWarning = true), b10);
        }
        async _getUser(a10) {
          try {
            if (a10) return await gj(this.fetch, "GET", `${this.url}/user`, { headers: this.headers, jwt: a10, xform: gn });
            return await this._useSession(async (a11) => {
              var b10, c10, d10;
              let { data: e10, error: f10 } = a11;
              if (f10) throw f10;
              return (null == (b10 = e10.session) ? void 0 : b10.access_token) || this.hasCustomAuthorizationHeader ? await gj(this.fetch, "GET", `${this.url}/user`, { headers: this.headers, jwt: null != (d10 = null == (c10 = e10.session) ? void 0 : c10.access_token) ? d10 : void 0, xform: gn }) : { data: { user: null }, error: new fE() };
            });
          } catch (a11) {
            if (fA(a11)) return fF(a11) && (await this._removeSession(), await f2(this.storage, `${this.storageKey}-code-verifier`)), this._returnResult({ data: { user: null }, error: a11 });
            throw a11;
          }
        }
        async updateUser(a10, b10 = {}) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._updateUser(a10, b10)) : await this._updateUser(a10, b10);
        }
        async _updateUser(a10, b10 = {}) {
          try {
            return await this._useSession(async (c10) => {
              let { data: d10, error: e10 } = c10;
              if (e10) throw e10;
              if (!d10.session) throw new fE();
              let f10 = d10.session, g10 = null, h10 = null;
              "pkce" === this.flowType && null != a10.email && ([g10, h10] = await f9(this.storage, this.storageKey));
              let { data: i10, error: j10 } = await gj(this.fetch, "PUT", `${this.url}/user`, { headers: this.headers, redirectTo: null == b10 ? void 0 : b10.emailRedirectTo, body: Object.assign(Object.assign({}, a10), { code_challenge: g10, code_challenge_method: h10 }), jwt: f10.access_token, xform: gn });
              if (j10) throw j10;
              return f10.user = i10.user, await this._saveSession(f10), await this._notifyAllSubscribers("USER_UPDATED", f10), this._returnResult({ data: { user: f10.user }, error: null });
            });
          } catch (a11) {
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: { user: null }, error: a11 });
            throw a11;
          }
        }
        async setSession(a10) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._setSession(a10)) : await this._setSession(a10);
        }
        async _setSession(a10) {
          try {
            if (!a10.access_token || !a10.refresh_token) throw new fE();
            let b10 = Date.now() / 1e3, c10 = b10, d10 = true, e10 = null, { payload: f10 } = f4(a10.access_token);
            if (f10.exp && (d10 = (c10 = f10.exp) <= b10), d10) {
              let { data: b11, error: c11 } = await this._callRefreshToken(a10.refresh_token);
              if (c11) return this._returnResult({ data: { user: null, session: null }, error: c11 });
              if (!b11) return { data: { user: null, session: null }, error: null };
              e10 = b11;
            } else {
              let { data: d11, error: f11 } = await this._getUser(a10.access_token);
              if (f11) return this._returnResult({ data: { user: null, session: null }, error: f11 });
              e10 = { access_token: a10.access_token, refresh_token: a10.refresh_token, user: d11.user, token_type: "bearer", expires_in: c10 - b10, expires_at: c10 }, await this._saveSession(e10), await this._notifyAllSubscribers("SIGNED_IN", e10);
            }
            return this._returnResult({ data: { user: e10.user, session: e10 }, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { session: null, user: null }, error: a11 });
            throw a11;
          }
        }
        async refreshSession(a10) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._refreshSession(a10)) : await this._refreshSession(a10);
        }
        async _refreshSession(a10) {
          try {
            return await this._useSession(async (b10) => {
              var c10;
              if (!a10) {
                let { data: d11, error: e11 } = b10;
                if (e11) throw e11;
                a10 = null != (c10 = d11.session) ? c10 : void 0;
              }
              if (!(null == a10 ? void 0 : a10.refresh_token)) throw new fE();
              let { data: d10, error: e10 } = await this._callRefreshToken(a10.refresh_token);
              return e10 ? this._returnResult({ data: { user: null, session: null }, error: e10 }) : d10 ? this._returnResult({ data: { user: d10.user, session: d10 }, error: null }) : this._returnResult({ data: { user: null, session: null }, error: null });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
            throw a11;
          }
        }
        async _getSessionFromURL(a10, b10) {
          var c10;
          try {
            if (!fY()) throw new fI("No browser detected.");
            if (a10.error || a10.error_description || a10.error_code) throw new fI(a10.error_description || "Error in URL with unspecified error_description", { error: a10.error || "unspecified_error", code: a10.error_code || "unspecified_code" });
            switch (b10) {
              case "implicit":
                if ("pkce" === this.flowType) throw new fJ("Not a valid PKCE flow url.");
                break;
              case "pkce":
                if ("implicit" === this.flowType) throw new fI("Not a valid implicit grant flow url.");
            }
            if ("pkce" === b10) {
              if (this._debug("#_initialize()", "begin", "is PKCE flow", true), !a10.code) throw new fJ("No code detected.");
              let { data: b11, error: d11 } = await this._exchangeCodeForSession(a10.code);
              if (d11) throw d11;
              let e11 = new URL(window.location.href);
              return e11.searchParams.delete("code"), window.history.replaceState(window.history.state, "", e11.toString()), { data: { session: b11.session, redirectType: null != (c10 = b11.redirectType) ? c10 : null }, error: null };
            }
            let { provider_token: d10, provider_refresh_token: e10, access_token: f10, refresh_token: g10, expires_in: h10, expires_at: i10, token_type: j10 } = a10;
            if (!f10 || !h10 || !g10 || !j10) throw new fI("No session defined in URL");
            let k2 = Math.round(Date.now() / 1e3), l2 = parseInt(h10), m2 = k2 + l2;
            i10 && (m2 = parseInt(i10));
            let n2 = m2 - k2;
            1e3 * n2 <= 3e4 && console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${n2}s, should have been closer to ${l2}s`);
            let o2 = m2 - l2;
            k2 - o2 >= 120 ? console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale", o2, m2, k2) : k2 - o2 < 0 && console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew", o2, m2, k2);
            let { data: p2, error: q2 } = await this._getUser(f10);
            if (q2) throw q2;
            let r2 = { provider_token: d10, provider_refresh_token: e10, access_token: f10, expires_in: l2, expires_at: m2, refresh_token: g10, token_type: j10, user: p2.user };
            return window.location.hash = "", this._debug("#_getSessionFromURL()", "clearing window.location.hash"), this._returnResult({ data: { session: r2, redirectType: a10.type }, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: { session: null, redirectType: null }, error: a11 });
            throw a11;
          }
        }
        _isImplicitGrantCallback(a10) {
          return "function" == typeof this.detectSessionInUrl ? this.detectSessionInUrl(new URL(window.location.href), a10) : !!(a10.access_token || a10.error || a10.error_description || a10.error_code);
        }
        async _isPKCECallback(a10) {
          let b10 = await f1(this.storage, `${this.storageKey}-code-verifier`);
          return !!(a10.code && b10);
        }
        async signOut(a10 = { scope: "global" }) {
          return (await this.initializePromise, null != this.lock) ? await this._acquireLock(this.lockAcquireTimeout, async () => await this._signOut(a10)) : await this._signOut(a10);
        }
        async _signOut({ scope: a10 } = { scope: "global" }) {
          return await this._useSession(async (b10) => {
            var c10;
            let { data: d10, error: e10 } = b10;
            if (e10 && !fF(e10)) return this._returnResult({ error: e10 });
            let f10 = null == (c10 = d10.session) ? void 0 : c10.access_token;
            if (f10) {
              let { error: b11 } = await this.admin.signOut(f10, a10);
              if (b11 && !(fA(b11) && "AuthApiError" === b11.name && (404 === b11.status || 401 === b11.status || 403 === b11.status) || fF(b11))) return this._returnResult({ error: b11 });
            }
            return "others" !== a10 && (await this._removeSession(), await f2(this.storage, `${this.storageKey}-code-verifier`)), this._returnResult({ error: null });
          });
        }
        onAuthStateChange(a10) {
          let b10 = Symbol("auth-callback"), c10 = { id: b10, callback: a10, unsubscribe: () => {
            this._debug("#unsubscribe()", "state change callback with id removed", b10), this.stateChangeEmitters.delete(b10);
          } };
          return this._debug("#onAuthStateChange()", "registered callback with id", b10), this.stateChangeEmitters.set(b10, c10), (async () => {
            await this.initializePromise, null != this.lock ? await this._acquireLock(this.lockAcquireTimeout, async () => {
              this._emitInitialSession(b10);
            }) : await this._emitInitialSession(b10);
          })(), { data: { subscription: c10 } };
        }
        async _emitInitialSession(a10) {
          return await this._useSession(async (b10) => {
            var c10, d10;
            try {
              let { data: { session: d11 }, error: e10 } = b10;
              if (e10) throw e10;
              await (null == (c10 = this.stateChangeEmitters.get(a10)) ? void 0 : c10.callback("INITIAL_SESSION", d11)), this._debug("INITIAL_SESSION", "callback id", a10, "session", d11);
            } catch (b11) {
              await (null == (d10 = this.stateChangeEmitters.get(a10)) ? void 0 : d10.callback("INITIAL_SESSION", null)), this._debug("INITIAL_SESSION", "callback id", a10, "error", b11), fF(b11) ? console.warn(b11) : console.error(b11);
            }
          });
        }
        async resetPasswordForEmail(a10, b10 = {}) {
          let c10 = null, d10 = null;
          "pkce" === this.flowType && ([c10, d10] = await f9(this.storage, this.storageKey, true));
          try {
            return await gj(this.fetch, "POST", `${this.url}/recover`, { body: { email: a10, code_challenge: c10, code_challenge_method: d10, gotrue_meta_security: { captcha_token: b10.captchaToken } }, headers: this.headers, redirectTo: b10.redirectTo });
          } catch (a11) {
            if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async getUserIdentities() {
          var a10;
          try {
            let { data: b10, error: c10 } = await this.getUser();
            if (c10) throw c10;
            return this._returnResult({ data: { identities: null != (a10 = b10.user.identities) ? a10 : [] }, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async linkIdentity(a10) {
          return "token" in a10 ? this.linkIdentityIdToken(a10) : this.linkIdentityOAuth(a10);
        }
        async linkIdentityOAuth(a10) {
          var b10;
          try {
            let { data: c10, error: d10 } = await this._useSession(async (b11) => {
              var c11, d11, e10, f10, g10;
              let { data: h10, error: i10 } = b11;
              if (i10) throw i10;
              let j10 = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, a10.provider, { redirectTo: null == (c11 = a10.options) ? void 0 : c11.redirectTo, scopes: null == (d11 = a10.options) ? void 0 : d11.scopes, queryParams: null == (e10 = a10.options) ? void 0 : e10.queryParams, skipBrowserRedirect: true });
              return await gj(this.fetch, "GET", j10, { headers: this.headers, jwt: null != (g10 = null == (f10 = h10.session) ? void 0 : f10.access_token) ? g10 : void 0 });
            });
            if (d10) throw d10;
            return !fY() || (null == (b10 = a10.options) ? void 0 : b10.skipBrowserRedirect) || window.location.assign(null == c10 ? void 0 : c10.url), this._returnResult({ data: { provider: a10.provider, url: null == c10 ? void 0 : c10.url }, error: null });
          } catch (b11) {
            if (fA(b11)) return this._returnResult({ data: { provider: a10.provider, url: null }, error: b11 });
            throw b11;
          }
        }
        async linkIdentityIdToken(a10) {
          return await this._useSession(async (b10) => {
            var c10;
            try {
              let { error: d10, data: { session: e10 } } = b10;
              if (d10) throw d10;
              let { options: f10, provider: g10, token: h10, access_token: i10, nonce: j10 } = a10, { data: k2, error: l2 } = await gj(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, { headers: this.headers, jwt: null != (c10 = null == e10 ? void 0 : e10.access_token) ? c10 : void 0, body: { provider: g10, id_token: h10, access_token: i10, nonce: j10, link_identity: true, gotrue_meta_security: { captcha_token: null == f10 ? void 0 : f10.captchaToken } }, xform: gl });
              if (l2) return this._returnResult({ data: { user: null, session: null }, error: l2 });
              if (!k2 || !k2.session || !k2.user) return this._returnResult({ data: { user: null, session: null }, error: new fG() });
              return k2.session && (await this._saveSession(k2.session), await this._notifyAllSubscribers("USER_UPDATED", k2.session)), this._returnResult({ data: k2, error: l2 });
            } catch (a11) {
              if (await f2(this.storage, `${this.storageKey}-code-verifier`), fA(a11)) return this._returnResult({ data: { user: null, session: null }, error: a11 });
              throw a11;
            }
          });
        }
        async unlinkIdentity(a10) {
          try {
            return await this._useSession(async (b10) => {
              var c10, d10;
              let { data: e10, error: f10 } = b10;
              if (f10) throw f10;
              return await gj(this.fetch, "DELETE", `${this.url}/user/identities/${a10.identity_id}`, { headers: this.headers, jwt: null != (d10 = null == (c10 = e10.session) ? void 0 : c10.access_token) ? d10 : void 0 });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _refreshAccessToken(a10) {
          let b10 = "#_refreshAccessToken()";
          this._debug(b10, "begin");
          try {
            var c10, d10;
            let e10 = Date.now();
            return await (c10 = async (c11) => (c11 > 0 && await f5(200 * Math.pow(2, c11 - 1)), this._debug(b10, "refreshing attempt", c11), await gj(this.fetch, "POST", `${this.url}/token?grant_type=refresh_token`, { body: { refresh_token: a10 }, headers: this.headers, xform: gl })), d10 = (a11, b11) => {
              let c11 = 200 * Math.pow(2, a11);
              return b11 && fM(b11) && Date.now() + c11 - e10 < 3e4;
            }, new Promise((a11, b11) => {
              (async () => {
                for (let e11 = 0; e11 < 1 / 0; e11++) try {
                  let b12 = await c10(e11);
                  if (!d10(e11, null, b12)) return void a11(b12);
                } catch (a12) {
                  if (!d10(e11, a12)) return void b11(a12);
                }
              })();
            }));
          } catch (a11) {
            if (this._debug(b10, "error", a11), fA(a11)) return this._returnResult({ data: { session: null, user: null }, error: a11 });
            throw a11;
          } finally {
            this._debug(b10, "end");
          }
        }
        _isValidSession(a10) {
          return "object" == typeof a10 && null !== a10 && "access_token" in a10 && "refresh_token" in a10 && "expires_at" in a10;
        }
        async _handleProviderSignIn(a10, b10) {
          let c10 = await this._getUrlForProvider(`${this.url}/authorize`, a10, { redirectTo: b10.redirectTo, scopes: b10.scopes, queryParams: b10.queryParams });
          return this._debug("#_handleProviderSignIn()", "provider", a10, "options", b10, "url", c10), fY() && !b10.skipBrowserRedirect && window.location.assign(c10), { data: { provider: a10, url: c10 }, error: null };
        }
        async _recoverAndRefresh() {
          var a10, b10;
          let c10 = "#_recoverAndRefresh()";
          this._debug(c10, "begin");
          try {
            let d10 = await f1(this.storage, this.storageKey);
            if (d10 && this.userStorage) {
              let b11 = await f1(this.userStorage, this.storageKey + "-user");
              !this.storage.isServer && Object.is(this.storage, this.userStorage) && !b11 && (b11 = { user: d10.user }, await f0(this.userStorage, this.storageKey + "-user", b11)), d10.user = null != (a10 = null == b11 ? void 0 : b11.user) ? a10 : ge();
            } else if (d10 && !d10.user && !d10.user) {
              let a11 = await f1(this.storage, this.storageKey + "-user");
              a11 && (null == a11 ? void 0 : a11.user) ? (d10.user = a11.user, await f2(this.storage, this.storageKey + "-user"), await f0(this.storage, this.storageKey, d10)) : d10.user = ge();
            }
            if (this._debug(c10, "session from storage", d10), !this._isValidSession(d10)) {
              this._debug(c10, "session is not valid"), null !== d10 && await this._removeSession();
              return;
            }
            let e10 = (null != (b10 = d10.expires_at) ? b10 : 1 / 0) * 1e3 - Date.now() < 9e4;
            if (this._debug(c10, `session has${e10 ? "" : " not"} expired with margin of 90000s`), e10) {
              if (this.autoRefreshToken && d10.refresh_token) {
                let { error: a11 } = await this._callRefreshToken(d10.refresh_token);
                a11 && (fA(a11) && "AuthRefreshDiscardedError" === a11.name ? this._debug(c10, "refresh discarded by commit guard", a11) : (console.error(a11), fM(a11) || (this._debug(c10, "refresh failed with a non-retryable error, removing the session", a11), await this._removeSession())));
              }
            } else if (d10.user && true === d10.user.__isUserNotAvailableProxy) try {
              let { data: a11, error: b11 } = await this._getUser(d10.access_token);
              !b11 && (null == a11 ? void 0 : a11.user) ? (d10.user = a11.user, await this._saveSession(d10), await this._notifyAllSubscribers("SIGNED_IN", d10)) : this._debug(c10, "could not get user data, skipping SIGNED_IN notification");
            } catch (a11) {
              console.error("Error getting user data:", a11), this._debug(c10, "error getting user data, skipping SIGNED_IN notification", a11);
            }
            else await this._notifyAllSubscribers("SIGNED_IN", d10);
          } catch (a11) {
            this._debug(c10, "error", a11), console.error(a11);
            return;
          } finally {
            this._debug(c10, "end");
          }
        }
        async _callRefreshToken(a10) {
          var b10, c10;
          if (!a10) throw new fE();
          if (this.refreshingDeferred) return this.refreshingDeferred.promise;
          let d10 = "#_callRefreshToken()";
          this._debug(d10, "begin");
          try {
            this.refreshingDeferred = new f3();
            let b11 = await f1(this.storage, this.storageKey), { data: c11, error: e10 } = await this._refreshAccessToken(a10);
            if (e10) throw e10;
            if (!c11.session) throw new fE();
            let f10 = await f1(this.storage, this.storageKey);
            if (null !== b11 && (null === f10 || f10.refresh_token !== b11.refresh_token)) {
              this._debug(d10, "commit guard: storage changed since refresh started, discarding rotated tokens", { startedWith: "present", nowHolds: f10 ? "replaced" : "cleared" });
              let a11 = { data: null, error: new fN() };
              return this.refreshingDeferred.resolve(a11), a11;
            }
            let g10 = this._sessionRemovalEpoch;
            if (await this._saveSession(c11.session), this._sessionRemovalEpoch !== g10) {
              this._debug(d10, "commit guard (post-save): _removeSession ran during _saveSession, undoing write"), await f2(this.storage, this.storageKey), this.userStorage && await f2(this.userStorage, this.storageKey + "-user");
              let a11 = { data: null, error: new fN() };
              return this.refreshingDeferred.resolve(a11), a11;
            }
            await this._notifyAllSubscribers("TOKEN_REFRESHED", c11.session);
            let h10 = { data: c11.session, error: null };
            return this.refreshingDeferred.resolve(h10), h10;
          } catch (a11) {
            if (this._debug(d10, "error", a11), fA(a11)) {
              let c11 = { data: null, error: a11 };
              return fM(a11) || await this._removeSession(), null == (b10 = this.refreshingDeferred) || b10.resolve(c11), c11;
            }
            throw null == (c10 = this.refreshingDeferred) || c10.reject(a11), a11;
          } finally {
            this.refreshingDeferred = null, this._debug(d10, "end");
          }
        }
        async _notifyAllSubscribers(a10, b10, c10 = true) {
          let d10 = `#_notifyAllSubscribers(${a10})`;
          this._debug(d10, "begin", b10, `broadcast = ${c10}`);
          try {
            this.broadcastChannel && c10 && this.broadcastChannel.postMessage({ event: a10, session: b10 });
            let d11 = [], e10 = Array.from(this.stateChangeEmitters.values()).map(async (c11) => {
              try {
                await c11.callback(a10, b10);
              } catch (a11) {
                d11.push(a11);
              }
            });
            if (await Promise.all(e10), d11.length > 0) {
              for (let a11 = 0; a11 < d11.length; a11 += 1) console.error(d11[a11]);
              throw d11[0];
            }
          } finally {
            this._debug(d10, "end");
          }
        }
        async _saveSession(a10) {
          this._debug("#_saveSession()", a10), this.suppressGetSessionWarning = true, await f2(this.storage, `${this.storageKey}-code-verifier`);
          let b10 = Object.assign({}, a10), c10 = b10.user && true === b10.user.__isUserNotAvailableProxy;
          if (this.userStorage) {
            !c10 && b10.user && await f0(this.userStorage, this.storageKey + "-user", { user: b10.user });
            let a11 = Object.assign({}, b10);
            delete a11.user;
            let d10 = gf(a11);
            await f0(this.storage, this.storageKey, d10);
          } else {
            let a11 = gf(b10);
            await f0(this.storage, this.storageKey, a11);
          }
        }
        async _removeSession() {
          this._sessionRemovalEpoch += 1, this._debug("#_removeSession()"), this.suppressGetSessionWarning = false, await f2(this.storage, this.storageKey), await f2(this.storage, this.storageKey + "-code-verifier"), await f2(this.storage, this.storageKey + "-user"), this.userStorage && await f2(this.userStorage, this.storageKey + "-user"), await this._notifyAllSubscribers("SIGNED_OUT", null);
        }
        _removeVisibilityChangedCallback() {
          this._debug("#_removeVisibilityChangedCallback()");
          let a10 = this.visibilityChangedCallback;
          this.visibilityChangedCallback = null;
          try {
            a10 && fY() && (null == window ? void 0 : window.removeEventListener) && window.removeEventListener("visibilitychange", a10);
          } catch (a11) {
            console.error("removing visibilitychange callback failed", a11);
          }
        }
        async _startAutoRefresh() {
          await this._stopAutoRefresh(), this._debug("#_startAutoRefresh()");
          let a10 = setInterval(() => this._autoRefreshTokenTick(), 3e4);
          this.autoRefreshTicker = a10, a10 && "object" == typeof a10 && "function" == typeof a10.unref ? a10.unref() : "u" > typeof Deno && "function" == typeof Deno.unrefTimer && Deno.unrefTimer(a10);
          let b10 = setTimeout(async () => {
            await this.initializePromise, await this._autoRefreshTokenTick();
          }, 0);
          this.autoRefreshTickTimeout = b10, b10 && "object" == typeof b10 && "function" == typeof b10.unref ? b10.unref() : "u" > typeof Deno && "function" == typeof Deno.unrefTimer && Deno.unrefTimer(b10);
        }
        async _stopAutoRefresh() {
          this._debug("#_stopAutoRefresh()");
          let a10 = this.autoRefreshTicker;
          this.autoRefreshTicker = null, a10 && clearInterval(a10);
          let b10 = this.autoRefreshTickTimeout;
          this.autoRefreshTickTimeout = null, b10 && clearTimeout(b10);
        }
        async startAutoRefresh() {
          this._removeVisibilityChangedCallback(), await this._startAutoRefresh();
        }
        async stopAutoRefresh() {
          this._removeVisibilityChangedCallback(), await this._stopAutoRefresh();
        }
        async dispose() {
          var a10;
          this._removeVisibilityChangedCallback(), await this._stopAutoRefresh(), null == (a10 = this.broadcastChannel) || a10.close(), this.broadcastChannel = null, this.stateChangeEmitters.clear();
        }
        async _autoRefreshTokenTick() {
          if (this._debug("#_autoRefreshTokenTick()", "begin"), null != this.lock) {
            try {
              await this._acquireLock(0, async () => {
                try {
                  let a10 = Date.now();
                  try {
                    return await this._useSession(async (b10) => {
                      let { data: { session: c10 } } = b10;
                      if (!c10 || !c10.refresh_token || !c10.expires_at) return void this._debug("#_autoRefreshTokenTick()", "no session");
                      let d10 = Math.floor((1e3 * c10.expires_at - a10) / 3e4);
                      this._debug("#_autoRefreshTokenTick()", `access token expires in ${d10} ticks, a tick lasts 30000ms, refresh threshold is 3 ticks`), d10 <= 3 && await this._callRefreshToken(c10.refresh_token);
                    });
                  } catch (a11) {
                    console.error("Auto refresh tick failed with error. This is likely a transient error.", a11);
                  }
                } finally {
                  this._debug("#_autoRefreshTokenTick()", "end");
                }
              });
            } catch (a10) {
              if (a10 instanceof gu) this._debug("auto refresh token tick lock not available");
              else throw a10;
            }
            return;
          }
          if (null !== this.refreshingDeferred) return void this._debug("#_autoRefreshTokenTick()", "refresh already in flight, skipping");
          try {
            let a10 = Date.now();
            try {
              await this._useSession(async (b10) => {
                let { data: { session: c10 } } = b10;
                if (!c10 || !c10.refresh_token || !c10.expires_at) return void this._debug("#_autoRefreshTokenTick()", "no session");
                let d10 = Math.floor((1e3 * c10.expires_at - a10) / 3e4);
                this._debug("#_autoRefreshTokenTick()", `access token expires in ${d10} ticks, a tick lasts 30000ms, refresh threshold is 3 ticks`), d10 <= 3 && await this._callRefreshToken(c10.refresh_token);
              });
            } catch (a11) {
              console.error("Auto refresh tick failed with error. This is likely a transient error.", a11);
            }
          } finally {
            this._debug("#_autoRefreshTokenTick()", "end");
          }
        }
        async _handleVisibilityChange() {
          if (this._debug("#_handleVisibilityChange()"), !fY() || !(null == window ? void 0 : window.addEventListener)) return this.autoRefreshToken && this.startAutoRefresh(), false;
          try {
            this.visibilityChangedCallback = async () => {
              try {
                await this._onVisibilityChanged(false);
              } catch (a10) {
                this._debug("#visibilityChangedCallback", "error", a10);
              }
            }, null == window || window.addEventListener("visibilitychange", this.visibilityChangedCallback), await this._onVisibilityChanged(true);
          } catch (a10) {
            console.error("_handleVisibilityChange", a10);
          }
        }
        async _onVisibilityChanged(a10) {
          let b10 = `#_onVisibilityChanged(${a10})`;
          if (this._debug(b10, "visibilityState", document.visibilityState), "visible" === document.visibilityState) {
            if (this.autoRefreshToken && this._startAutoRefresh(), !a10) if (await this.initializePromise, null != this.lock) await this._acquireLock(this.lockAcquireTimeout, async () => {
              "visible" !== document.visibilityState ? this._debug(b10, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting") : await this._recoverAndRefresh();
            });
            else {
              if ("visible" !== document.visibilityState) return void this._debug(b10, "visibilityState is no longer visible, skipping recovery");
              await this._recoverAndRefresh();
            }
          } else "hidden" === document.visibilityState && this.autoRefreshToken && this._stopAutoRefresh();
        }
        async _getUrlForProvider(a10, b10, c10) {
          let d10 = [`provider=${encodeURIComponent(b10)}`];
          if ((null == c10 ? void 0 : c10.redirectTo) && d10.push(`redirect_to=${encodeURIComponent(c10.redirectTo)}`), (null == c10 ? void 0 : c10.scopes) && d10.push(`scopes=${encodeURIComponent(c10.scopes)}`), "pkce" === this.flowType) {
            let [a11, b11] = await f9(this.storage, this.storageKey), c11 = new URLSearchParams({ code_challenge: `${encodeURIComponent(a11)}`, code_challenge_method: `${encodeURIComponent(b11)}` });
            d10.push(c11.toString());
          }
          if (null == c10 ? void 0 : c10.queryParams) {
            let a11 = new URLSearchParams(c10.queryParams);
            d10.push(a11.toString());
          }
          return (null == c10 ? void 0 : c10.skipBrowserRedirect) && d10.push(`skip_http_redirect=${c10.skipBrowserRedirect}`), `${a10}?${d10.join("&")}`;
        }
        async _unenroll(a10) {
          try {
            return await this._useSession(async (b10) => {
              var c10;
              let { data: d10, error: e10 } = b10;
              return e10 ? this._returnResult({ data: null, error: e10 }) : await gj(this.fetch, "DELETE", `${this.url}/factors/${a10.factorId}`, { headers: this.headers, jwt: null == (c10 = null == d10 ? void 0 : d10.session) ? void 0 : c10.access_token });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _enroll(a10) {
          try {
            return await this._useSession(async (b10) => {
              var c10, d10;
              let { data: e10, error: f10 } = b10;
              if (f10) return this._returnResult({ data: null, error: f10 });
              let g10 = Object.assign({ friendly_name: a10.friendlyName, factor_type: a10.factorType }, "phone" === a10.factorType ? { phone: a10.phone } : "totp" === a10.factorType ? { issuer: a10.issuer } : {}), { data: h10, error: i10 } = await gj(this.fetch, "POST", `${this.url}/factors`, { body: g10, headers: this.headers, jwt: null == (c10 = null == e10 ? void 0 : e10.session) ? void 0 : c10.access_token });
              return i10 ? this._returnResult({ data: null, error: i10 }) : ("totp" === a10.factorType && "totp" === h10.type && (null == (d10 = null == h10 ? void 0 : h10.totp) ? void 0 : d10.qr_code) && (h10.totp.qr_code = `data:image/svg+xml;utf-8,${h10.totp.qr_code}`), this._returnResult({ data: h10, error: null }));
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _verify(a10) {
          let b10 = async () => {
            try {
              return await this._useSession(async (b11) => {
                var c10;
                let { data: d10, error: e10 } = b11;
                if (e10) return this._returnResult({ data: null, error: e10 });
                let f10 = Object.assign({ challenge_id: a10.challengeId }, "webauthn" in a10 ? { webauthn: Object.assign(Object.assign({}, a10.webauthn), { credential_response: "create" === a10.webauthn.type ? gC(a10.webauthn.credential_response) : gD(a10.webauthn.credential_response) }) } : { code: a10.code }), { data: g10, error: h10 } = await gj(this.fetch, "POST", `${this.url}/factors/${a10.factorId}/verify`, { body: f10, headers: this.headers, jwt: null == (c10 = null == d10 ? void 0 : d10.session) ? void 0 : c10.access_token });
                return h10 ? this._returnResult({ data: null, error: h10 }) : (await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + g10.expires_in }, g10)), await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", g10), this._returnResult({ data: g10, error: h10 }));
              });
            } catch (a11) {
              if (fA(a11)) return this._returnResult({ data: null, error: a11 });
              throw a11;
            }
          };
          return null != this.lock ? this._acquireLock(this.lockAcquireTimeout, b10) : b10();
        }
        async _challenge(a10) {
          let b10 = async () => {
            try {
              return await this._useSession(async (b11) => {
                var c10;
                let { data: d10, error: e10 } = b11;
                if (e10) return this._returnResult({ data: null, error: e10 });
                let f10 = await gj(this.fetch, "POST", `${this.url}/factors/${a10.factorId}/challenge`, { body: a10, headers: this.headers, jwt: null == (c10 = null == d10 ? void 0 : d10.session) ? void 0 : c10.access_token });
                if (f10.error) return f10;
                let { data: g10 } = f10;
                if ("webauthn" !== g10.type) return { data: g10, error: null };
                switch (g10.webauthn.type) {
                  case "create":
                    return { data: Object.assign(Object.assign({}, g10), { webauthn: Object.assign(Object.assign({}, g10.webauthn), { credential_options: Object.assign(Object.assign({}, g10.webauthn.credential_options), { publicKey: gA(g10.webauthn.credential_options.publicKey) }) }) }), error: null };
                  case "request":
                    return { data: Object.assign(Object.assign({}, g10), { webauthn: Object.assign(Object.assign({}, g10.webauthn), { credential_options: Object.assign(Object.assign({}, g10.webauthn.credential_options), { publicKey: gB(g10.webauthn.credential_options.publicKey) }) }) }), error: null };
                }
              });
            } catch (a11) {
              if (fA(a11)) return this._returnResult({ data: null, error: a11 });
              throw a11;
            }
          };
          return null != this.lock ? this._acquireLock(this.lockAcquireTimeout, b10) : b10();
        }
        async _challengeAndVerify(a10) {
          let { data: b10, error: c10 } = await this._challenge({ factorId: a10.factorId });
          return c10 ? this._returnResult({ data: null, error: c10 }) : await this._verify({ factorId: a10.factorId, challengeId: b10.id, code: a10.code });
        }
        async _listFactors() {
          var a10;
          let { data: { user: b10 }, error: c10 } = await this.getUser();
          if (c10) return { data: null, error: c10 };
          let d10 = { all: [], phone: [], totp: [], webauthn: [] };
          for (let c11 of null != (a10 = null == b10 ? void 0 : b10.factors) ? a10 : []) d10.all.push(c11), "verified" === c11.status && d10[c11.factor_type].push(c11);
          return { data: d10, error: null };
        }
        async _getAuthenticatorAssuranceLevel(a10) {
          var b10, c10, d10, e10;
          if (a10) try {
            let { payload: d11 } = f4(a10), e11 = null;
            d11.aal && (e11 = d11.aal);
            let f11 = e11, { data: { user: g11 }, error: h11 } = await this.getUser(a10);
            if (h11) return this._returnResult({ data: null, error: h11 });
            (null != (c10 = null == (b10 = null == g11 ? void 0 : g11.factors) ? void 0 : b10.filter((a11) => "verified" === a11.status)) ? c10 : []).length > 0 && (f11 = "aal2");
            let i11 = d11.amr || [];
            return { data: { currentLevel: e11, nextLevel: f11, currentAuthenticationMethods: i11 }, error: null };
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
          let { data: { session: f10 }, error: g10 } = await this.getSession();
          if (g10) return this._returnResult({ data: null, error: g10 });
          if (!f10) return { data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] }, error: null };
          let { payload: h10 } = f4(f10.access_token), i10 = null;
          h10.aal && (i10 = h10.aal);
          let j10 = i10;
          return (null != (e10 = null == (d10 = f10.user.factors) ? void 0 : d10.filter((a11) => "verified" === a11.status)) ? e10 : []).length > 0 && (j10 = "aal2"), { data: { currentLevel: i10, nextLevel: j10, currentAuthenticationMethods: h10.amr || [] }, error: null };
        }
        async _getAuthorizationDetails(a10) {
          try {
            return await this._useSession(async (b10) => {
              let { data: { session: c10 }, error: d10 } = b10;
              return d10 ? this._returnResult({ data: null, error: d10 }) : c10 ? await gj(this.fetch, "GET", `${this.url}/oauth/authorizations/${a10}`, { headers: this.headers, jwt: c10.access_token, xform: (a11) => ({ data: a11, error: null }) }) : this._returnResult({ data: null, error: new fE() });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _approveAuthorization(a10, b10) {
          try {
            return await this._useSession(async (c10) => {
              let { data: { session: d10 }, error: e10 } = c10;
              if (e10) return this._returnResult({ data: null, error: e10 });
              if (!d10) return this._returnResult({ data: null, error: new fE() });
              let f10 = await gj(this.fetch, "POST", `${this.url}/oauth/authorizations/${a10}/consent`, { headers: this.headers, jwt: d10.access_token, body: { action: "approve" }, xform: (a11) => ({ data: a11, error: null }) });
              return f10.data && f10.data.redirect_url && fY() && !(null == b10 ? void 0 : b10.skipBrowserRedirect) && window.location.assign(f10.data.redirect_url), f10;
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _denyAuthorization(a10, b10) {
          try {
            return await this._useSession(async (c10) => {
              let { data: { session: d10 }, error: e10 } = c10;
              if (e10) return this._returnResult({ data: null, error: e10 });
              if (!d10) return this._returnResult({ data: null, error: new fE() });
              let f10 = await gj(this.fetch, "POST", `${this.url}/oauth/authorizations/${a10}/consent`, { headers: this.headers, jwt: d10.access_token, body: { action: "deny" }, xform: (a11) => ({ data: a11, error: null }) });
              return f10.data && f10.data.redirect_url && fY() && !(null == b10 ? void 0 : b10.skipBrowserRedirect) && window.location.assign(f10.data.redirect_url), f10;
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _listOAuthGrants() {
          try {
            return await this._useSession(async (a10) => {
              let { data: { session: b10 }, error: c10 } = a10;
              return c10 ? this._returnResult({ data: null, error: c10 }) : b10 ? await gj(this.fetch, "GET", `${this.url}/user/oauth/grants`, { headers: this.headers, jwt: b10.access_token, xform: (a11) => ({ data: a11, error: null }) }) : this._returnResult({ data: null, error: new fE() });
            });
          } catch (a10) {
            if (fA(a10)) return this._returnResult({ data: null, error: a10 });
            throw a10;
          }
        }
        async _revokeOAuthGrant(a10) {
          try {
            return await this._useSession(async (b10) => {
              let { data: { session: c10 }, error: d10 } = b10;
              return d10 ? this._returnResult({ data: null, error: d10 }) : c10 ? (await gj(this.fetch, "DELETE", `${this.url}/user/oauth/grants`, { headers: this.headers, jwt: c10.access_token, query: { client_id: a10.clientId }, noResolveJson: true }), { data: {}, error: null }) : this._returnResult({ data: null, error: new fE() });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async fetchJwk(a10, b10 = { keys: [] }) {
          let c10 = b10.keys.find((b11) => b11.kid === a10);
          if (c10) return c10;
          let d10 = Date.now();
          if ((c10 = this.jwks.keys.find((b11) => b11.kid === a10)) && this.jwks_cached_at + 6e5 > d10) return c10;
          let { data: e10, error: f10 } = await gj(this.fetch, "GET", `${this.url}/.well-known/jwks.json`, { headers: this.headers });
          if (f10) throw f10;
          return e10.keys && 0 !== e10.keys.length && (this.jwks = e10, this.jwks_cached_at = d10, c10 = e10.keys.find((b11) => b11.kid === a10)) ? c10 : null;
        }
        async getClaims(a10, b10 = {}) {
          try {
            let e10, f10 = a10;
            if (!f10) {
              let { data: a11, error: b11 } = await this.getSession();
              if (b11 || !a11.session) return this._returnResult({ data: null, error: b11 });
              f10 = a11.session.access_token;
            }
            let { header: g10, payload: h10, signature: i10, raw: { header: j10, payload: k2 } } = f4(f10);
            if (!(null == b10 ? void 0 : b10.allowExpired)) try {
              var c10, d10 = h10.exp;
              if (!d10) throw Error("Missing exp claim");
              if (d10 <= Math.floor(Date.now() / 1e3)) throw Error("JWT has expired");
            } catch (a11) {
              throw new fP(a11 instanceof Error ? a11.message : "JWT validation failed");
            }
            let l2 = !g10.alg || g10.alg.startsWith("HS") || !g10.kid || !("crypto" in globalThis && "subtle" in globalThis.crypto) ? null : await this.fetchJwk(g10.kid, (null == b10 ? void 0 : b10.keys) ? { keys: b10.keys } : null == b10 ? void 0 : b10.jwks);
            if (!l2) {
              let { error: a11 } = await this.getUser(f10);
              if (a11) throw a11;
              return { data: { claims: h10, header: g10, signature: i10 }, error: null };
            }
            let m2 = function(a11) {
              switch (a11) {
                case "RS256":
                  return { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } };
                case "ES256":
                  return { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } };
                default:
                  throw Error("Invalid alg claim");
              }
            }(g10.alg), n2 = await crypto.subtle.importKey("jwk", l2, m2, true, ["verify"]);
            if (!await crypto.subtle.verify(m2, n2, i10, (c10 = `${j10}.${k2}`, e10 = [], !function(a11, b11) {
              for (let c11 = 0; c11 < a11.length; c11 += 1) {
                let d11 = a11.charCodeAt(c11);
                if (d11 > 55295 && d11 <= 56319) {
                  let b12 = (d11 - 55296) * 1024 & 65535;
                  d11 = (a11.charCodeAt(c11 + 1) - 56320 & 65535 | b12) + 65536, c11 += 1;
                }
                !function(a12, b12) {
                  if (a12 <= 127) return b12(a12);
                  if (a12 <= 2047) {
                    b12(192 | a12 >> 6), b12(128 | 63 & a12);
                    return;
                  }
                  if (a12 <= 65535) {
                    b12(224 | a12 >> 12), b12(128 | a12 >> 6 & 63), b12(128 | 63 & a12);
                    return;
                  }
                  if (a12 <= 1114111) {
                    b12(240 | a12 >> 18), b12(128 | a12 >> 12 & 63), b12(128 | a12 >> 6 & 63), b12(128 | 63 & a12);
                    return;
                  }
                  throw Error(`Unrecognized Unicode codepoint: ${a12.toString(16)}`);
                }(d11, b11);
              }
            }(c10, (a11) => e10.push(a11)), new Uint8Array(e10)))) throw new fP("Invalid JWT signature");
            return { data: { claims: h10, header: g10, signature: i10 }, error: null };
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async signInWithPasskey(a10) {
          var b10, c10, d10;
          gd(this.experimental);
          try {
            if (!gF()) return this._returnResult({ data: null, error: new fC("Browser does not support WebAuthn", null) });
            let { data: e10, error: f10 } = await this._startPasskeyAuthentication({ options: { captchaToken: null == (b10 = null == a10 ? void 0 : a10.options) ? void 0 : b10.captchaToken } });
            if (f10 || !e10) return this._returnResult({ data: null, error: f10 });
            let g10 = gB(e10.options), h10 = null != (d10 = null == (c10 = null == a10 ? void 0 : a10.options) ? void 0 : c10.signal) ? d10 : gz.createNewAbortSignal(), { data: i10, error: j10 } = await gH({ publicKey: g10, signal: h10 });
            if (j10 || !i10) return this._returnResult({ data: null, error: null != j10 ? j10 : new fC("WebAuthn ceremony failed", null) });
            let k2 = gD(i10);
            return this._verifyPasskeyAuthentication({ challengeId: e10.challenge_id, credential: k2 });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async registerPasskey(a10) {
          var b10, c10;
          gd(this.experimental);
          try {
            if (!gF()) return this._returnResult({ data: null, error: new fC("Browser does not support WebAuthn", null) });
            let { data: d10, error: e10 } = await this._startPasskeyRegistration();
            if (e10 || !d10) return this._returnResult({ data: null, error: e10 });
            let f10 = gA(d10.options), g10 = null != (c10 = null == (b10 = null == a10 ? void 0 : a10.options) ? void 0 : b10.signal) ? c10 : gz.createNewAbortSignal(), { data: h10, error: i10 } = await gG({ publicKey: f10, signal: g10 });
            if (i10 || !h10) return this._returnResult({ data: null, error: null != i10 ? i10 : new fC("WebAuthn ceremony failed", null) });
            let j10 = gC(h10);
            return this._verifyPasskeyRegistration({ challengeId: d10.challenge_id, credential: j10 });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _startPasskeyRegistration() {
          gd(this.experimental);
          try {
            return await this._useSession(async (a10) => {
              let { data: { session: b10 }, error: c10 } = a10;
              if (c10) return this._returnResult({ data: null, error: c10 });
              if (!b10) return this._returnResult({ data: null, error: new fE() });
              let { data: d10, error: e10 } = await gj(this.fetch, "POST", `${this.url}/passkeys/registration/options`, { headers: this.headers, jwt: b10.access_token, body: {} });
              return e10 ? this._returnResult({ data: null, error: e10 }) : this._returnResult({ data: d10, error: null });
            });
          } catch (a10) {
            if (fA(a10)) return this._returnResult({ data: null, error: a10 });
            throw a10;
          }
        }
        async _verifyPasskeyRegistration(a10) {
          gd(this.experimental);
          try {
            return await this._useSession(async (b10) => {
              let { data: { session: c10 }, error: d10 } = b10;
              if (d10) return this._returnResult({ data: null, error: d10 });
              if (!c10) return this._returnResult({ data: null, error: new fE() });
              let { data: e10, error: f10 } = await gj(this.fetch, "POST", `${this.url}/passkeys/registration/verify`, { headers: this.headers, jwt: c10.access_token, body: { challenge_id: a10.challengeId, credential: a10.credential } });
              return f10 ? this._returnResult({ data: null, error: f10 }) : this._returnResult({ data: e10, error: null });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _startPasskeyAuthentication(a10) {
          var b10;
          gd(this.experimental);
          try {
            let { data: c10, error: d10 } = await gj(this.fetch, "POST", `${this.url}/passkeys/authentication/options`, { headers: this.headers, body: { gotrue_meta_security: { captcha_token: null == (b10 = null == a10 ? void 0 : a10.options) ? void 0 : b10.captchaToken } } });
            if (d10) return this._returnResult({ data: null, error: d10 });
            return this._returnResult({ data: c10, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _verifyPasskeyAuthentication(a10) {
          gd(this.experimental);
          try {
            let { data: b10, error: c10 } = await gj(this.fetch, "POST", `${this.url}/passkeys/authentication/verify`, { headers: this.headers, body: { challenge_id: a10.challengeId, credential: a10.credential }, xform: gl });
            if (c10) return this._returnResult({ data: null, error: c10 });
            return b10.session && (await this._saveSession(b10.session), await this._notifyAllSubscribers("SIGNED_IN", b10.session)), this._returnResult({ data: b10, error: null });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _listPasskeys() {
          gd(this.experimental);
          try {
            return await this._useSession(async (a10) => {
              let { data: { session: b10 }, error: c10 } = a10;
              if (c10) return this._returnResult({ data: null, error: c10 });
              if (!b10) return this._returnResult({ data: null, error: new fE() });
              let { data: d10, error: e10 } = await gj(this.fetch, "GET", `${this.url}/passkeys`, { headers: this.headers, jwt: b10.access_token, xform: (a11) => ({ data: a11, error: null }) });
              return e10 ? this._returnResult({ data: null, error: e10 }) : this._returnResult({ data: d10, error: null });
            });
          } catch (a10) {
            if (fA(a10)) return this._returnResult({ data: null, error: a10 });
            throw a10;
          }
        }
        async _updatePasskey(a10) {
          gd(this.experimental);
          try {
            return await this._useSession(async (b10) => {
              let { data: { session: c10 }, error: d10 } = b10;
              if (d10) return this._returnResult({ data: null, error: d10 });
              if (!c10) return this._returnResult({ data: null, error: new fE() });
              let { data: e10, error: f10 } = await gj(this.fetch, "PATCH", `${this.url}/passkeys/${a10.passkeyId}`, { headers: this.headers, jwt: c10.access_token, body: { friendly_name: a10.friendlyName } });
              return f10 ? this._returnResult({ data: null, error: f10 }) : this._returnResult({ data: e10, error: null });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
        async _deletePasskey(a10) {
          gd(this.experimental);
          try {
            return await this._useSession(async (b10) => {
              let { data: { session: c10 }, error: d10 } = b10;
              if (d10) return this._returnResult({ data: null, error: d10 });
              if (!c10) return this._returnResult({ data: null, error: new fE() });
              let { error: e10 } = await gj(this.fetch, "DELETE", `${this.url}/passkeys/${a10.passkeyId}`, { headers: this.headers, jwt: c10.access_token, noResolveJson: true });
              return e10 ? this._returnResult({ data: null, error: e10 }) : this._returnResult({ data: null, error: null });
            });
          } catch (a11) {
            if (fA(a11)) return this._returnResult({ data: null, error: a11 });
            throw a11;
          }
        }
      }
      gO.nextInstanceID = {};
      let gP = gO, gQ = "";
      "u" > typeof Deno ? (gQ = "deno", h = null == (M = Deno.version) ? void 0 : M.deno) : "u" > typeof document ? gQ = "web" : "u" > typeof navigator && "ReactNative" === navigator.product ? gQ = "react-native" : (gQ = "node", h = "u" > typeof process ? null == (N = process.version) ? void 0 : N.replace(/^v/, "") : void 0);
      let gR = [`runtime=${gQ}`];
      h && gR.push(`runtime-version=${h}`);
      let gS = { headers: { "X-Client-Info": `supabase-js/2.107.0; ${gR.join("; ")}` } }, gT = { schema: "public" }, gU = { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "implicit" }, gV = {}, gW = { enabled: false, respectSamplingDecision: true }, gX = null;
      function gY(a10) {
        return (gY = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(a11) {
          return typeof a11;
        } : function(a11) {
          return a11 && "function" == typeof Symbol && a11.constructor === Symbol && a11 !== Symbol.prototype ? "symbol" : typeof a11;
        })(a10);
      }
      function gZ(a10, b10) {
        var c10 = Object.keys(a10);
        if (Object.getOwnPropertySymbols) {
          var d10 = Object.getOwnPropertySymbols(a10);
          b10 && (d10 = d10.filter(function(b11) {
            return Object.getOwnPropertyDescriptor(a10, b11).enumerable;
          })), c10.push.apply(c10, d10);
        }
        return c10;
      }
      function g$(a10) {
        for (var b10 = 1; b10 < arguments.length; b10++) {
          var c10 = null != arguments[b10] ? arguments[b10] : {};
          b10 % 2 ? gZ(Object(c10), true).forEach(function(b11) {
            !function(a11, b12, c11) {
              var d10;
              (d10 = function(a12, b13) {
                if ("object" != gY(a12) || !a12) return a12;
                var c12 = a12[Symbol.toPrimitive];
                if (void 0 !== c12) {
                  var d11 = c12.call(a12, b13 || "default");
                  if ("object" != gY(d11)) return d11;
                  throw TypeError("@@toPrimitive must return a primitive value.");
                }
                return ("string" === b13 ? String : Number)(a12);
              }(b12, "string"), (b12 = "symbol" == gY(d10) ? d10 : d10 + "") in a11) ? Object.defineProperty(a11, b12, { value: c11, enumerable: true, configurable: true, writable: true }) : a11[b12] = c11;
            }(a10, b11, c10[b11]);
          }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(a10, Object.getOwnPropertyDescriptors(c10)) : gZ(Object(c10)).forEach(function(b11) {
            Object.defineProperty(a10, b11, Object.getOwnPropertyDescriptor(c10, b11));
          });
        }
        return a10;
      }
      async function g_(a10, b10, c10) {
        if (!function(a11, b11) {
          let c11;
          if (!a11 || !b11 || 0 === b11.length) return false;
          if (a11 instanceof URL) c11 = a11;
          else try {
            c11 = new URL(a11);
          } catch (a12) {
            return false;
          }
          for (let a12 of b11) try {
            if ("string" == typeof a12) {
              if (function(a13, b12) {
                if (b12 === a13) return true;
                if (b12.startsWith("*.")) {
                  let c12 = b12.slice(2);
                  if (a13.endsWith(c12) && (a13 === c12 || a13.endsWith("." + c12))) return true;
                }
                return false;
              }(c11.hostname, a12)) return true;
            } else if (a12 instanceof RegExp) {
              if (a12.test(c11.hostname)) return true;
            } else if ("function" == typeof a12 && a12(c11)) return true;
          } catch (a13) {
            continue;
          }
          return false;
        }("string" == typeof a10 || a10 instanceof URL ? a10 : a10.url, b10)) return null;
        let d10 = await function() {
          var a11, b11, c11, d11;
          return a11 = this, b11 = void 0, c11 = void 0, d11 = function* () {
            try {
              let a12 = yield (null === gX && (gX = Promise.resolve().then(() => (init_esm(), esm_exports)).catch(() => null)), gX);
              if (!a12 || !a12.propagation || !a12.context) return null;
              let b12 = {};
              a12.propagation.inject(a12.context.active(), b12);
              let c12 = b12.traceparent;
              if (!c12) return null;
              return { traceparent: c12, tracestate: b12.tracestate, baggage: b12.baggage };
            } catch (a12) {
              return null;
            }
          }, new (c11 || (c11 = Promise))(function(e10, f10) {
            function g10(a12) {
              try {
                i10(d11.next(a12));
              } catch (a13) {
                f10(a13);
              }
            }
            function h10(a12) {
              try {
                i10(d11.throw(a12));
              } catch (a13) {
                f10(a13);
              }
            }
            function i10(a12) {
              var b12;
              a12.done ? e10(a12.value) : ((b12 = a12.value) instanceof c11 ? b12 : new c11(function(a13) {
                a13(b12);
              })).then(g10, h10);
            }
            i10((d11 = d11.apply(a11, b11 || [])).next());
          });
        }();
        if (!d10 || !d10.traceparent) return null;
        if (c10) {
          let a11 = function(a12) {
            if (!a12 || "string" != typeof a12) return null;
            let b11 = a12.split("-");
            if (4 !== b11.length) return null;
            let [c11, d11, e10, f10] = b11;
            if (2 !== c11.length || 32 !== d11.length || 16 !== e10.length || 2 !== f10.length) return null;
            let g10 = /^[0-9a-f]+$/i;
            return g10.test(c11) && g10.test(d11) && g10.test(e10) && g10.test(f10) && "00000000000000000000000000000000" !== d11 && "0000000000000000" !== e10 ? { version: c11, traceId: d11, parentId: e10, traceFlags: f10, isSampled: (1 & parseInt(f10, 16)) == 1 } : null;
          }(d10.traceparent);
          if (a11 && !a11.isSampled) return null;
        }
        return d10;
      }
      function g0(a10) {
        return "boolean" == typeof a10 ? { enabled: a10 } : a10;
      }
      var g1 = class extends gP {
        constructor(a10) {
          super(a10);
        }
      }, g2 = class {
        constructor(a10, b10, c10) {
          var d10, e10, f10;
          this.supabaseUrl = a10, this.supabaseKey = b10;
          const g10 = function(a11) {
            let b11 = null == a11 ? void 0 : a11.trim();
            if (!b11) throw Error("supabaseUrl is required.");
            if (!b11.match(/^https?:\/\//i)) throw Error("Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.");
            try {
              return new URL(b11.endsWith("/") ? b11 : b11 + "/");
            } catch (a12) {
              throw Error("Invalid supabaseUrl: Provided URL is malformed.");
            }
          }(a10);
          if (!b10) throw Error("supabaseKey is required.");
          this.realtimeUrl = new URL("realtime/v1", g10), this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws"), this.authUrl = new URL("auth/v1", g10), this.storageUrl = new URL("storage/v1", g10), this.functionsUrl = new URL("functions/v1", g10);
          const h10 = `sb-${g10.hostname.split(".")[0]}-auth-token`, i10 = function(a11, b11) {
            var c11, d11, e11, f11, g11, h11;
            let { db: i11, auth: j10, realtime: k2, global: l2 } = a11, { db: m2, auth: n2, realtime: o2, global: p2 } = b11, q2 = g0(a11.tracePropagation), r2 = g0(b11.tracePropagation), s2 = { db: g$(g$({}, m2), i11), auth: g$(g$({}, n2), j10), realtime: g$(g$({}, o2), k2), storage: {}, global: g$(g$(g$({}, p2), l2), {}, { headers: g$(g$({}, null != (c11 = null == p2 ? void 0 : p2.headers) ? c11 : {}), null != (d11 = null == l2 ? void 0 : l2.headers) ? d11 : {}) }), tracePropagation: { enabled: null != (e11 = null != (f11 = null == q2 ? void 0 : q2.enabled) ? f11 : null == r2 ? void 0 : r2.enabled) && e11, respectSamplingDecision: null == (g11 = null != (h11 = null == q2 ? void 0 : q2.respectSamplingDecision) ? h11 : null == r2 ? void 0 : r2.respectSamplingDecision) || g11 }, accessToken: async () => "" };
            return a11.accessToken ? s2.accessToken = a11.accessToken : delete s2.accessToken, s2;
          }(null != c10 ? c10 : {}, { db: gT, realtime: gV, auth: g$(g$({}, gU), {}, { storageKey: h10 }), global: gS, tracePropagation: gW });
          this.settings = i10, this.storageKey = null != (d10 = i10.auth.storageKey) ? d10 : "", this.headers = null != (e10 = i10.global.headers) ? e10 : {}, i10.accessToken ? (this.accessToken = i10.accessToken, this.auth = new Proxy({}, { get: (a11, b11) => {
            throw Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(b11)} is not possible`);
          } })) : this.auth = this._initSupabaseAuthClient(null != (f10 = i10.auth) ? f10 : {}, this.headers, i10.global.fetch), this.fetch = ((a11, b11, c11, d11, e11) => {
            let f11 = d11 ? (...a12) => d11(...a12) : (...a12) => fetch(...a12), g11 = Headers, h11 = (null == e11 ? void 0 : e11.enabled) === true, i11 = (null == e11 ? void 0 : e11.respectSamplingDecision) !== false, j10 = h11 ? function(a12) {
              let b12 = [];
              try {
                let c12 = new URL(a12);
                b12.push(c12.hostname);
              } catch (a13) {
              }
              return b12.push("*.supabase.co", "*.supabase.in"), b12.push("localhost", "127.0.0.1", "[::1]"), b12;
            }(b11) : null;
            return async (b12, d12) => {
              var e12;
              let h12 = null != (e12 = await c11()) ? e12 : a11, k2 = new g11(null == d12 ? void 0 : d12.headers);
              if (k2.has("apikey") || k2.set("apikey", a11), k2.has("Authorization") || k2.set("Authorization", `Bearer ${h12}`), j10) {
                let a12 = await g_(b12, j10, i11);
                a12 && (a12.traceparent && !k2.has("traceparent") && k2.set("traceparent", a12.traceparent), a12.tracestate && !k2.has("tracestate") && k2.set("tracestate", a12.tracestate), a12.baggage && !k2.has("baggage") && k2.set("baggage", a12.baggage));
              }
              return f11(b12, g$(g$({}, d12), {}, { headers: k2 }));
            };
          })(b10, a10, this._getAccessToken.bind(this), i10.global.fetch, i10.tracePropagation), this.realtime = this._initRealtimeClient(g$({ headers: this.headers, accessToken: this._getAccessToken.bind(this), fetch: this.fetch }, i10.realtime)), this.accessToken && Promise.resolve(this.accessToken()).then((a11) => this.realtime.setAuth(a11)).catch((a11) => console.warn("Failed to set initial Realtime auth token:", a11)), this.rest = new d2(new URL("rest/v1", g10).href, { headers: this.headers, schema: i10.db.schema, fetch: this.fetch, timeout: i10.db.timeout, urlLengthLimit: i10.db.urlLengthLimit }), this.storage = new ft(this.storageUrl.href, this.headers, this.fetch, null == c10 ? void 0 : c10.storage), i10.accessToken || this._listenForAuthEvents();
        }
        get functions() {
          return new dQ(this.functionsUrl.href, { headers: this.headers, customFetch: this.fetch });
        }
        from(a10) {
          return this.rest.from(a10);
        }
        schema(a10) {
          return this.rest.schema(a10);
        }
        rpc(a10, b10 = {}, c10 = { head: false, get: false, count: void 0 }) {
          return this.rest.rpc(a10, b10, c10);
        }
        channel(a10, b10 = { config: {} }) {
          return this.realtime.channel(a10, b10);
        }
        getChannels() {
          return this.realtime.getChannels();
        }
        removeChannel(a10) {
          return this.realtime.removeChannel(a10);
        }
        removeAllChannels() {
          return this.realtime.removeAllChannels();
        }
        async _getAccessToken() {
          var a10, b10;
          if (this.accessToken) return await this.accessToken();
          let { data: c10 } = await this.auth.getSession();
          return null != (a10 = null == (b10 = c10.session) ? void 0 : b10.access_token) ? a10 : this.supabaseKey;
        }
        _initSupabaseAuthClient({ autoRefreshToken: a10, persistSession: b10, detectSessionInUrl: c10, storage: d10, userStorage: e10, storageKey: f10, flowType: g10, lock: h10, debug: i10, throwOnError: j10, experimental: k2, lockAcquireTimeout: l2, skipAutoInitialize: m2 }, n2, o2) {
          let p2 = { Authorization: `Bearer ${this.supabaseKey}`, apikey: `${this.supabaseKey}` };
          return new g1({ url: this.authUrl.href, headers: g$(g$({}, p2), n2), storageKey: f10, autoRefreshToken: a10, persistSession: b10, detectSessionInUrl: c10, storage: d10, userStorage: e10, flowType: g10, lock: h10, debug: i10, throwOnError: j10, experimental: k2, fetch: o2, lockAcquireTimeout: l2, skipAutoInitialize: m2, hasCustomAuthorizationHeader: Object.keys(this.headers).some((a11) => "authorization" === a11.toLowerCase()) });
        }
        _initRealtimeClient(a10) {
          return new eO(this.realtimeUrl.href, g$(g$({}, a10), {}, { params: g$(g$({}, { apikey: this.supabaseKey }), null == a10 ? void 0 : a10.params) }));
        }
        _listenForAuthEvents() {
          return this.auth.onAuthStateChange((a10, b10) => {
            this._handleTokenChanged(a10, "CLIENT", null == b10 ? void 0 : b10.access_token);
          });
        }
        _handleTokenChanged(a10, b10, c10) {
          ("TOKEN_REFRESHED" === a10 || "SIGNED_IN" === a10) && this.changedAccessToken !== c10 ? (this.changedAccessToken = c10, this.realtime.setAuth(c10)) : "SIGNED_OUT" === a10 && (this.realtime.setAuth(), "STORAGE" == b10 && this.auth.signOut(), this.changedAccessToken = void 0);
        }
      };
      (function() {
        if ("u" > typeof window) return false;
        let a10 = globalThis.process;
        if (!a10) return false;
        let b10 = a10.version;
        if (null == b10) return false;
        let c10 = b10.match(/^v(\d+)\./);
        return !!c10 && 18 >= parseInt(c10[1], 10);
      })() && console.warn("\u26A0\uFE0F  Node.js 18 and below are deprecated and will no longer be supported in future versions of @supabase/supabase-js. Please upgrade to Node.js 20 or later. For more information, visit: https://github.com/orgs/supabase/discussions/37217");
      var g3 = c(821);
      let g4 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split(""), g5 = " 	\n\r=".split(""), g6 = (() => {
        let a10 = Array(128);
        for (let b10 = 0; b10 < a10.length; b10 += 1) a10[b10] = -1;
        for (let b10 = 0; b10 < g5.length; b10 += 1) a10[g5[b10].charCodeAt(0)] = -2;
        for (let b10 = 0; b10 < g4.length; b10 += 1) a10[g4[b10].charCodeAt(0)] = b10;
        return a10;
      })();
      function g7(a10) {
        let b10 = [], c10 = 0, d10 = 0;
        if (function(a11, b11) {
          for (let c11 = 0; c11 < a11.length; c11 += 1) {
            let d11 = a11.charCodeAt(c11);
            if (d11 > 55295 && d11 <= 56319) {
              let b12 = (d11 - 55296) * 1024 & 65535;
              d11 = (a11.charCodeAt(c11 + 1) - 56320 & 65535 | b12) + 65536, c11 += 1;
            }
            !function(a12, b12) {
              if (a12 <= 127) return b12(a12);
              if (a12 <= 2047) {
                b12(192 | a12 >> 6), b12(128 | 63 & a12);
                return;
              }
              if (a12 <= 65535) {
                b12(224 | a12 >> 12), b12(128 | a12 >> 6 & 63), b12(128 | 63 & a12);
                return;
              }
              if (a12 <= 1114111) {
                b12(240 | a12 >> 18), b12(128 | a12 >> 12 & 63), b12(128 | a12 >> 6 & 63), b12(128 | 63 & a12);
                return;
              }
              throw Error(`Unrecognized Unicode codepoint: ${a12.toString(16)}`);
            }(d11, b11);
          }
        }(a10, (a11) => {
          for (c10 = c10 << 8 | a11, d10 += 8; d10 >= 6; ) {
            let a12 = c10 >> d10 - 6 & 63;
            b10.push(g4[a12]), d10 -= 6;
          }
        }), d10 > 0) for (c10 <<= 6 - d10, d10 = 6; d10 >= 6; ) {
          let a11 = c10 >> d10 - 6 & 63;
          b10.push(g4[a11]), d10 -= 6;
        }
        return b10.join("");
      }
      function g8() {
        return "u" > typeof window && void 0 !== window.document;
      }
      g3.qg, g3.lK;
      let g9 = /^(.*)[.](0|[1-9][0-9]*)$/;
      function ha(a10, b10) {
        if (a10 === b10) return true;
        let c10 = a10.match(g9);
        return !!c10 && c10[1] === b10;
      }
      function hb(a10, b10, c10) {
        let d10 = c10 ?? 3180, e10 = encodeURIComponent(b10);
        if (e10.length <= d10) return [{ name: a10, value: b10 }];
        let f10 = [];
        for (; e10.length > 0; ) {
          let a11 = e10.slice(0, d10), b11 = a11.lastIndexOf("%");
          b11 > d10 - 3 && (a11 = a11.slice(0, b11));
          let c11 = "";
          for (; a11.length > 0; ) try {
            c11 = decodeURIComponent(a11);
            break;
          } catch (b12) {
            if (b12 instanceof URIError && "%" === a11.at(-3) && a11.length > 3) a11 = a11.slice(0, a11.length - 3);
            else throw b12;
          }
          f10.push(c11), e10 = e10.slice(a11.length);
        }
        return f10.map((b11, c11) => ({ name: `${a10}.${c11}`, value: b11 }));
      }
      async function hc(a10, b10) {
        let c10 = await b10(a10);
        if (c10) return c10;
        let d10 = [];
        for (let c11 = 0; ; c11++) {
          let e10 = `${a10}.${c11}`, f10 = await b10(e10);
          if (!f10) break;
          d10.push(f10);
        }
        return d10.length > 0 ? d10.join("") : null;
      }
      let hd = { path: "/", sameSite: "lax", httpOnly: false, maxAge: 3456e4 }, he = "base64-";
      function hf(a10) {
        let b10;
        if (!a10.startsWith(he)) return a10;
        try {
          b10 = function(a11) {
            let b11 = [], c10 = (a12) => {
              b11.push(String.fromCodePoint(a12));
            }, d10 = { utf8seq: 0, codepoint: 0 }, e10 = 0, f10 = 0;
            for (let b12 = 0; b12 < a11.length; b12 += 1) {
              let g10 = g6[a11.charCodeAt(b12)];
              if (g10 > -1) for (e10 = e10 << 6 | g10, f10 += 6; f10 >= 8; ) (function(a12, b13, c11) {
                if (0 === b13.utf8seq) {
                  if (a12 <= 127) return c11(a12);
                  for (let c12 = 1; c12 < 6; c12 += 1) if ((a12 >> 7 - c12 & 1) == 0) {
                    b13.utf8seq = c12;
                    break;
                  }
                  if (2 === b13.utf8seq) b13.codepoint = 31 & a12;
                  else if (3 === b13.utf8seq) b13.codepoint = 15 & a12;
                  else if (4 === b13.utf8seq) b13.codepoint = 7 & a12;
                  else throw Error("Invalid UTF-8 sequence");
                  b13.utf8seq -= 1;
                } else if (b13.utf8seq > 0) {
                  if (a12 <= 127) throw Error("Invalid UTF-8 sequence");
                  b13.codepoint = b13.codepoint << 6 | 63 & a12, b13.utf8seq -= 1, 0 === b13.utf8seq && c11(b13.codepoint);
                }
              })(e10 >> f10 - 8 & 255, d10, c10), f10 -= 8;
              else if (-2 === g10) continue;
              else throw Error(`Invalid Base64-URL character "${a11.at(b12)}" at position ${b12}`);
            }
            return b11.join("");
          }(a10.substring(he.length));
        } catch (a11) {
          return console.warn("@supabase/ssr: could not base64url-decode chunked cookie value, treating as absent. Cookie chunks may have been written partially across responses.", a11), null;
        }
        try {
          JSON.parse(b10);
        } catch {
          return console.warn("@supabase/ssr: chunked cookie decoded to invalid JSON, treating as absent. This usually indicates that cookie chunks from different writes were combined (e.g. response committed before all Set-Cookie headers were sent)."), null;
        }
        return b10;
      }
      async function hg({ getAll: a10, setAll: b10, setItems: c10, removedItems: d10 }, e10) {
        let f10 = e10.cookieEncoding, g10 = e10.cookieOptions ?? null, h10 = await a10([...c10 ? Object.keys(c10) : [], ...d10 ? Object.keys(d10) : []]), i10 = h10?.map(({ name: a11 }) => a11) || [], j10 = Object.keys(d10).flatMap((a11) => i10.filter((b11) => ha(b11, a11))), k2 = Object.keys(c10).flatMap((a11) => {
          let b11 = new Set(i10.filter((b12) => ha(b12, a11))), d11 = c10[a11];
          "base64url" === f10 && (d11 = he + g7(d11));
          let e11 = hb(a11, d11);
          return e11.forEach((a12) => {
            b11.delete(a12.name);
          }), j10.push(...b11), e11;
        }), l2 = { ...hd, ...g10, maxAge: 0 }, m2 = { ...hd, ...g10, maxAge: hd.maxAge };
        delete l2.name, delete m2.name, await b10([...j10.map((a11) => ({ name: a11, value: "", options: l2 })), ...k2.map(({ name: a11, value: b11 }) => ({ name: a11, value: b11, options: m2 }))], { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" });
      }
      let hh = false, hi = ["@supabase/auth-helpers-nextjs", "@supabase/auth-helpers-react", "@supabase/auth-helpers-remix", "@supabase/auth-helpers-sveltekit"];
      function hj(a10, b10, c10) {
        if (!function() {
          if (hh || "u" < typeof process || !process.env?.npm_package_name) return;
          let a11 = process.env.npm_package_name;
          hi.includes(a11) && (hh = true, console.warn(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551 \u26A0\uFE0F  IMPORTANT: Package Consolidation Notice                                \u2551
\u2551                                                                            \u2551
\u2551 The ${a11.padEnd(35)} package name is deprecated.  \u2551
\u2551                                                                            \u2551
\u2551 You are now using @supabase/ssr - a unified solution for all frameworks.  \u2551
\u2551                                                                            \u2551
\u2551 The auth-helpers packages have been consolidated into @supabase/ssr       \u2551
\u2551 to provide better maintenance and consistent APIs across frameworks.      \u2551
\u2551                                                                            \u2551
\u2551 Please update your package.json to use @supabase/ssr directly:            \u2551
\u2551   npm uninstall ${a11.padEnd(42)} \u2551
\u2551   npm install @supabase/ssr                                               \u2551
\u2551                                                                            \u2551
\u2551 For more information, visit:                                              \u2551
\u2551 https://supabase.com/docs/guides/auth/server-side                         \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
    `));
        }(), !a10 || !b10) throw Error(`Your project's URL and Key are required to create a Supabase client!

Check your Supabase project's API settings to find these values

https://supabase.com/dashboard/project/_/settings/api`);
        let { storage: d10, getAll: e10, setAll: f10, setItems: g10, removedItems: h10 } = function(a11, b11) {
          let c11, d11, e11 = a11.cookies ?? null, f11 = a11.cookieEncoding, g11 = {}, h11 = {}, i11 = () => {
            let a12 = (0, g3.qg)(document.cookie);
            return Object.keys(a12).map((b12) => ({ name: b12, value: a12[b12] ?? "" }));
          }, j10 = (a12) => {
            a12.forEach(({ name: a13, value: b12, options: c12 }) => {
              document.cookie = (0, g3.lK)(a13, b12, c12);
            });
          };
          if (e11) if ("get" in e11) {
            let a12 = async (a13) => {
              let b12 = a13.flatMap((a14) => [a14, ...Array.from({ length: 5 }).map((b13, c13) => `${a14}.${c13}`)]), c12 = [];
              for (let a14 = 0; a14 < b12.length; a14 += 1) {
                let d12 = await e11.get(b12[a14]);
                (d12 || "string" == typeof d12) && c12.push({ name: b12[a14], value: d12 });
              }
              return c12;
            };
            if (c11 = async (b12) => await a12(b12), "set" in e11 && "remove" in e11) d11 = async (a13) => {
              for (let b12 = 0; b12 < a13.length; b12 += 1) {
                let { name: c12, value: d12, options: f12 } = a13[b12];
                d12 ? await e11.set(c12, d12, f12) : await e11.remove(c12, f12);
              }
            };
            else if (b11) d11 = async () => {
              console.warn("@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.");
            };
            else throw Error("@supabase/ssr: createBrowserClient requires configuring a getAll and setAll cookie method (deprecated: alternatively both get, set and remove can be used)");
          } else if ("getAll" in e11) if (c11 = async () => await e11.getAll(), "setAll" in e11) d11 = e11.setAll;
          else if (b11) d11 = async () => {
            console.warn("@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.");
          };
          else throw Error("@supabase/ssr: createBrowserClient requires configuring both getAll and setAll cookie methods (deprecated: alternatively both get, set and remove can be used)");
          else if (!b11 && g8()) c11 = () => i11(), d11 = j10;
          else throw Error(`@supabase/ssr: ${b11 ? "createServerClient" : "createBrowserClient"} requires configuring getAll and setAll cookie methods (deprecated: alternatively use get, set and remove).${g8() ? " As this is called in a browser runtime, consider removing the cookies option object to use the document.cookie API automatically." : ""}`);
          else if (!b11 && g8()) c11 = () => i11(), d11 = j10;
          else if (b11) throw Error("@supabase/ssr: createServerClient must be initialized with cookie options that specify getAll and setAll functions (deprecated, not recommended: alternatively use get, set and remove)");
          else c11 = () => [], d11 = () => {
            throw Error("@supabase/ssr: createBrowserClient in non-browser runtimes (including Next.js pre-rendering mode) was not initialized cookie options that specify getAll and setAll functions (deprecated: alternatively use get, set and remove), but they were needed");
          };
          return b11 ? { getAll: c11, setAll: d11, setItems: g11, removedItems: h11, storage: { isServer: true, getItem: async (a12) => {
            if ("string" == typeof g11[a12]) return g11[a12];
            if (h11[a12]) return null;
            let b12 = await c11([a12]), d12 = await hc(a12, async (a13) => {
              let c12 = b12?.find(({ name: b13 }) => b13 === a13) || null;
              return c12 ? c12.value : null;
            });
            return d12 ? "string" != typeof d12 ? d12 : hf(d12) : null;
          }, setItem: async (b12, e12) => {
            b12.endsWith("-code-verifier") && await hg({ getAll: c11, setAll: d11, setItems: { [b12]: e12 }, removedItems: {} }, { cookieOptions: a11?.cookieOptions ?? null, cookieEncoding: f11 }), g11[b12] = e12, delete h11[b12];
          }, removeItem: async (a12) => {
            delete g11[a12], h11[a12] = true;
          } } } : { getAll: c11, setAll: d11, setItems: g11, removedItems: h11, storage: { isServer: false, getItem: async (a12) => {
            let b12 = await c11([a12]), d12 = await hc(a12, async (a13) => {
              let c12 = b12?.find(({ name: b13 }) => b13 === a13) || null;
              return c12 ? c12.value : null;
            });
            return d12 ? hf(d12) : null;
          }, setItem: async (b12, e12) => {
            let g12 = await c11([b12]), h12 = new Set((g12?.map(({ name: a12 }) => a12) || []).filter((a12) => ha(a12, b12))), i12 = e12;
            "base64url" === f11 && (i12 = he + g7(e12));
            let j11 = hb(b12, i12);
            j11.forEach(({ name: a12 }) => {
              h12.delete(a12);
            });
            let k2 = { ...hd, ...a11?.cookieOptions, maxAge: 0 }, l2 = { ...hd, ...a11?.cookieOptions, maxAge: hd.maxAge };
            delete k2.name, delete l2.name;
            let m2 = [...[...h12].map((a12) => ({ name: a12, value: "", options: k2 })), ...j11.map(({ name: a12, value: b13 }) => ({ name: a12, value: b13, options: l2 }))];
            m2.length > 0 && await d11(m2, {});
          }, removeItem: async (b12) => {
            let e12 = await c11([b12]), f12 = (e12?.map(({ name: a12 }) => a12) || []).filter((a12) => ha(a12, b12)), g12 = { ...hd, ...a11?.cookieOptions, maxAge: 0 };
            delete g12.name, f12.length > 0 && await d11(f12.map((a12) => ({ name: a12, value: "", options: g12 })), {});
          } } };
        }({ ...c10, cookieEncoding: c10?.cookieEncoding ?? "base64url" }, true), i10 = new g2(a10, b10, { ...c10, global: { ...c10?.global, headers: { ...c10?.global?.headers, "X-Client-Info": "supabase-ssr/0.10.3 createServerClient" } }, auth: { ...c10?.cookieOptions?.name ? { storageKey: c10.cookieOptions.name } : null, ...c10?.auth, flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false, persistSession: true, skipAutoInitialize: true, storage: d10, ...c10?.cookies && "encode" in c10.cookies && "tokens-only" === c10.cookies.encode ? { userStorage: c10?.auth?.userStorage ?? /* @__PURE__ */ function(a11 = {}) {
          return { getItem: (b11) => a11[b11] || null, setItem: (b11, c11) => {
            a11[b11] = c11;
          }, removeItem: (b11) => {
            delete a11[b11];
          } };
        }() } : null } });
        return i10.auth.onAuthStateChange(async (a11) => {
          (Object.keys(g10).length > 0 || Object.keys(h10).length > 0) && ("SIGNED_IN" === a11 || "TOKEN_REFRESHED" === a11 || "USER_UPDATED" === a11 || "PASSWORD_RECOVERY" === a11 || "SIGNED_OUT" === a11 || "MFA_CHALLENGE_VERIFIED" === a11) && await hg({ getAll: e10, setAll: f10, setItems: g10, removedItems: h10 }, { cookieOptions: c10?.cookieOptions ?? null, cookieEncoding: c10?.cookieEncoding ?? "base64url" });
        }), i10;
      }
      c(891), "u" < typeof URLPattern || URLPattern;
      var hk = c(732);
      if (/* @__PURE__ */ new WeakMap(), hk.unstable_postpone, false === ("Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error".includes("needs to bail out of prerendering at this point because it used") && "Route %%% needs to bail out of prerendering at this point because it used ^^^. React throws this special object to indicate where. It should not be caught by your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error".includes("Learn more: https://nextjs.org/docs/messages/ppr-caught-error"))) throw Object.defineProperty(Error("Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js"), "__NEXT_ERROR_CODE", { value: "E296", enumerable: false, configurable: true });
      async function hl(a10) {
        let b10 = aD.next({ request: a10 }), c10 = a10.cookies.getAll(), d10 = c10.find((a11) => a11.name.endsWith("-refresh-token"))?.value;
        if (d10 && globalThis.sessionRefreshQueue) {
          let c11 = globalThis.sessionRefreshQueue.get(d10);
          if (c11) {
            if (Date.now() < c11.expiry) {
              for (let { name: b11, value: d11 } of c11.cookies) a10.cookies.set(b11, d11);
              for (let { name: d11, value: e11, options: f11 } of (b10 = aD.next({ request: a10 }), c11.cookies)) b10.cookies.set(d11, e11, f11);
              console.warn(JSON.stringify({ event: "QUEUED_SESSION_REFRESH_APPLIED", token: d10 }));
            }
            globalThis.sessionRefreshQueue.delete(d10);
          }
        }
        let e10 = hj(process.env.SUPABASE_URL ?? "https://xdfndojvqazffcjngglr.supabase.co", process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm5kb2p2cWF6ZmZjam5nZ2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDQ0MDQsImV4cCI6MjA5MzgyMDQwNH0.UGitfLsGYqQIATh6qK-uT-ZsTXpf7zFArE3QvR9JEYw", { cookies: { getAll: () => a10.cookies.getAll(), setAll(c11) {
          for (let { name: b11, value: d11 } of c11) a10.cookies.set(b11, d11);
          for (let { name: d11, value: e11, options: f11 } of (b10 = aD.next({ request: a10 }), c11)) b10.cookies.set(d11, e11, f11);
        } } }), { data: { user: f10 } } = await e10.auth.getUser(), g10 = a10.nextUrl.pathname;
        if (g10.startsWith("/admin") && !f10) {
          let b11 = a10.nextUrl.clone();
          return b11.pathname = "/login", b11.searchParams.set("redirect", g10), aD.redirect(b11);
        }
        if (f10 && (g10.startsWith("/login") || g10.startsWith("/register"))) {
          let b11 = a10.nextUrl.clone();
          return b11.pathname = "/admin", aD.redirect(b11);
        }
        return b10;
      }
      RegExp("\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at __next_root_layout_boundary__ \\([^\\n]*\\)"), RegExp("\\n\\s+at __next_metadata_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_viewport_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_outlet_boundary__[\\n\\s]"), RegExp("\\n\\s+at __next_instant_validation_boundary__[\\n\\s]");
      var hm = c(103), hn = c(897), ho = c(846), hp = Object.defineProperty, hq = {}, hr = { UpstashError: () => ht, UrlError: () => hu };
      for (var hs in hr) hp(hq, hs, { get: hr[hs], enumerable: true });
      var ht = class extends Error {
        constructor(a10) {
          super(a10), this.name = "UpstashError";
        }
      }, hu = class extends Error {
        constructor(a10) {
          super(`Upstash Redis client was passed an invalid URL. You should pass a URL starting with https. Received: "${a10}". `), this.name = "UrlError";
        }
      };
      function hv(a10) {
        try {
          return function a11(b10) {
            let c10 = Array.isArray(b10) ? b10.map((b11) => {
              try {
                return a11(b11);
              } catch {
                return b11;
              }
            }) : JSON.parse(b10);
            return "number" == typeof c10 && c10.toString() !== b10 ? b10 : c10;
          }(a10);
        } catch {
          return a10;
        }
      }
      function hw(a10) {
        return [a10[0], ...hv(a10.slice(1))];
      }
      var hx = class {
        baseUrl;
        headers;
        options;
        readYourWrites;
        upstashSyncToken = "";
        hasCredentials;
        retry;
        constructor(a10) {
          if (this.options = { backend: a10.options?.backend, agent: a10.agent, responseEncoding: a10.responseEncoding ?? "base64", cache: a10.cache, signal: a10.signal, keepAlive: a10.keepAlive ?? true }, this.upstashSyncToken = "", this.readYourWrites = a10.readYourWrites ?? true, this.baseUrl = (a10.baseUrl || "").replace(/\/$/, ""), this.baseUrl && !/^https?:\/\/[^\s#$./?].\S*$/.test(this.baseUrl)) throw new hu(this.baseUrl);
          this.headers = { "Content-Type": "application/json", ...a10.headers }, this.hasCredentials = !!(this.baseUrl && this.headers.authorization.split(" ")[1]), "base64" === this.options.responseEncoding && (this.headers["Upstash-Encoding"] = "base64"), this.retry = "boolean" != typeof a10.retry || a10.retry ? { attempts: a10.retry?.retries ?? 5, backoff: a10.retry?.backoff ?? ((a11) => 50 * Math.exp(a11)) } : { attempts: 1, backoff: () => 0 };
        }
        mergeTelemetry(a10) {
          this.headers = hA(this.headers, "Upstash-Telemetry-Runtime", a10.runtime), this.headers = hA(this.headers, "Upstash-Telemetry-Platform", a10.platform), this.headers = hA(this.headers, "Upstash-Telemetry-Sdk", a10.sdk);
        }
        async request(a10) {
          let b10 = function(...a11) {
            let b11 = {};
            for (let c11 of a11) if (c11) for (let [a12, d11] of Object.entries(c11)) null != d11 && (b11[a12] = d11);
            return b11;
          }(this.headers, a10.headers ?? {}), c10 = [this.baseUrl, ...a10.path ?? []].join("/"), d10 = "text/event-stream" === b10.Accept, e10 = { cache: this.options.cache, method: "POST", headers: b10, body: JSON.stringify(a10.body), keepalive: this.options.keepAlive, agent: this.options.agent, signal: a10.signal ?? this.options.signal, backend: this.options.backend };
          if (this.hasCredentials || console.warn("[Upstash Redis] Redis client was initialized without url or token. Failed to execute command."), this.readYourWrites) {
            let a11 = this.upstashSyncToken;
            this.headers["upstash-sync-token"] = a11;
          }
          let f10 = null, g10 = null;
          for (let a11 = 0; a11 <= this.retry.attempts; a11++) try {
            f10 = await fetch(c10, e10);
            break;
          } catch (b11) {
            if (this.options.signal?.aborted) {
              f10 = new Response(new Blob([JSON.stringify({ result: this.options.signal.reason ?? "Aborted" })]), { status: 200, statusText: this.options.signal.reason ?? "Aborted" });
              break;
            }
            g10 = b11, a11 < this.retry.attempts && await new Promise((b12) => setTimeout(b12, this.retry.backoff(a11)));
          }
          if (!f10) throw g10 ?? Error("Exhausted all retries");
          if (!f10.ok) {
            let b11 = await f10.json();
            throw new ht(`${b11.error}, command was: ${JSON.stringify(a10.body)}`);
          }
          if (this.readYourWrites) {
            let a11 = f10.headers;
            this.upstashSyncToken = a11.get("upstash-sync-token") ?? "";
          }
          if (d10 && a10 && a10.onMessage && f10.body) {
            let b11 = f10.body.getReader(), c11 = new TextDecoder();
            return (async () => {
              try {
                for (; ; ) {
                  let { value: d11, done: e11 } = await b11.read();
                  if (e11) break;
                  for (let b12 of c11.decode(d11).split("\n")) if (b12.startsWith("data: ")) {
                    let c12 = b12.slice(6);
                    a10.onMessage?.(c12);
                  }
                }
              } catch (a11) {
                a11 instanceof Error && "AbortError" === a11.name || console.error("Stream reading error:", a11);
              } finally {
                try {
                  await b11.cancel();
                } catch {
                }
              }
            })(), { result: 1 };
          }
          let h10 = await f10.json();
          if (this.readYourWrites) {
            let a11 = f10.headers;
            this.upstashSyncToken = a11.get("upstash-sync-token") ?? "";
          }
          return "base64" === this.options.responseEncoding ? Array.isArray(h10) ? h10.map(({ result: a11, error: b11 }) => ({ result: hz(a11), error: b11 })) : { result: hz(h10.result), error: h10.error } : h10;
        }
      };
      function hy(a10) {
        let b10 = "";
        try {
          let c10 = atob(a10), d10 = c10.length, e10 = new Uint8Array(d10);
          for (let a11 = 0; a11 < d10; a11++) e10[a11] = c10.charCodeAt(a11);
          b10 = new TextDecoder().decode(e10);
        } catch {
          b10 = a10;
        }
        return b10;
      }
      function hz(a10) {
        let b10;
        switch (typeof a10) {
          case "undefined":
            return a10;
          case "number":
            b10 = a10;
            break;
          case "object":
            b10 = Array.isArray(a10) ? a10.map((a11) => "string" == typeof a11 ? hy(a11) : Array.isArray(a11) ? a11.map((a12) => hz(a12)) : a11) : null;
            break;
          case "string":
            b10 = "OK" === a10 ? "OK" : hy(a10);
        }
        return b10;
      }
      function hA(a10, b10, c10) {
        return c10 && (a10[b10] = a10[b10] ? [a10[b10], c10].join(",") : c10), a10;
      }
      var hB = (a10) => {
        switch (typeof a10) {
          case "string":
          case "number":
          case "boolean":
            return a10;
          default:
            return JSON.stringify(a10);
        }
      }, hC = class {
        command;
        serialize;
        deserialize;
        headers;
        path;
        onMessage;
        isStreaming;
        signal;
        constructor(a10, b10) {
          if (this.serialize = hB, this.deserialize = b10?.automaticDeserialization === void 0 || b10.automaticDeserialization ? b10?.deserialize ?? hv : (a11) => a11, this.command = a10.map((a11) => this.serialize(a11)), this.headers = b10?.headers, this.path = b10?.path, this.onMessage = b10?.streamOptions?.onMessage, this.isStreaming = b10?.streamOptions?.isStreaming ?? false, this.signal = b10?.streamOptions?.signal, b10?.latencyLogging) {
            const a11 = this.exec.bind(this);
            this.exec = async (b11) => {
              let c10 = performance.now(), d10 = await a11(b11), e10 = (performance.now() - c10).toFixed(2);
              return console.log(`Latency for \x1B[38;2;19;185;39m${this.command[0].toString().toUpperCase()}\x1B[0m: \x1B[38;2;0;255;255m${e10} ms\x1B[0m`), d10;
            };
          }
        }
        async exec(a10) {
          let { result: b10, error: c10 } = await a10.request({ body: this.command, path: this.path, upstashSyncToken: a10.upstashSyncToken, headers: this.headers, onMessage: this.onMessage, isStreaming: this.isStreaming, signal: this.signal });
          if (c10) throw new ht(c10);
          if (void 0 === b10) throw TypeError("Request did not return a result");
          return this.deserialize(b10);
        }
      }, hD = class extends hC {
        constructor(a10, b10) {
          const c10 = ["hrandfield", a10[0]];
          "number" == typeof a10[1] && c10.push(a10[1]), a10[2] && c10.push("WITHVALUES"), super(c10, { deserialize: a10[2] ? (a11) => function(a12) {
            if (0 === a12.length) return null;
            let b11 = {};
            for (let c11 = 0; c11 < a12.length; c11 += 2) {
              let d10 = a12[c11], e10 = a12[c11 + 1];
              try {
                b11[d10] = JSON.parse(e10);
              } catch {
                b11[d10] = e10;
              }
            }
            return b11;
          }(a11) : b10?.deserialize, ...b10 });
        }
      }, hE = class extends hC {
        constructor(a10, b10) {
          super(["append", ...a10], b10);
        }
      }, hF = class extends hC {
        constructor([a10, b10, c10], d10) {
          const e10 = ["bitcount", a10];
          "number" == typeof b10 && e10.push(b10), "number" == typeof c10 && e10.push(c10), super(e10, d10);
        }
      }, hG = class {
        constructor(a10, b10, c10, d10 = (a11) => a11.exec(this.client)) {
          this.client = b10, this.opts = c10, this.execOperation = d10, this.command = ["bitfield", ...a10];
        }
        command;
        chain(...a10) {
          return this.command.push(...a10), this;
        }
        get(...a10) {
          return this.chain("get", ...a10);
        }
        set(...a10) {
          return this.chain("set", ...a10);
        }
        incrby(...a10) {
          return this.chain("incrby", ...a10);
        }
        overflow(a10) {
          return this.chain("overflow", a10);
        }
        exec() {
          let a10 = new hC(this.command, this.opts);
          return this.execOperation(a10);
        }
      }, hH = class extends hC {
        constructor(a10, b10) {
          super(["bitop", ...a10], b10);
        }
      }, hI = class extends hC {
        constructor(a10, b10) {
          super(["bitpos", ...a10], b10);
        }
      }, hJ = class extends hC {
        constructor([a10, b10, c10], d10) {
          super(["COPY", a10, b10, ...c10?.replace ? ["REPLACE"] : []], { ...d10, deserialize: (a11) => a11 > 0 ? "COPIED" : "NOT_COPIED" });
        }
      }, hK = class extends hC {
        constructor(a10) {
          super(["dbsize"], a10);
        }
      }, hL = class extends hC {
        constructor(a10, b10) {
          super(["decr", ...a10], b10);
        }
      }, hM = class extends hC {
        constructor(a10, b10) {
          super(["decrby", ...a10], b10);
        }
      }, hN = class extends hC {
        constructor(a10, b10) {
          super(["del", ...a10], b10);
        }
      }, hO = class extends hC {
        constructor(a10, b10) {
          super(["echo", ...a10], b10);
        }
      }, hP = class extends hC {
        constructor([a10, b10, c10], d10) {
          super(["eval", a10, b10.length, ...b10, ...c10 ?? []], d10);
        }
      }, hQ = class extends hC {
        constructor([a10, b10, c10], d10) {
          super(["evalsha", a10, b10.length, ...b10, ...c10 ?? []], d10);
        }
      }, hR = class extends hC {
        constructor(a10, b10) {
          super(a10.map((a11) => "string" == typeof a11 ? a11 : String(a11)), b10);
        }
      }, hS = class extends hC {
        constructor(a10, b10) {
          super(["exists", ...a10], b10);
        }
      }, hT = class extends hC {
        constructor(a10, b10) {
          super(["expire", ...a10.filter(Boolean)], b10);
        }
      }, hU = class extends hC {
        constructor(a10, b10) {
          super(["expireat", ...a10], b10);
        }
      }, hV = class extends hC {
        constructor(a10, b10) {
          const c10 = ["flushall"];
          a10 && a10.length > 0 && a10[0].async && c10.push("async"), super(c10, b10);
        }
      }, hW = class extends hC {
        constructor([a10], b10) {
          const c10 = ["flushdb"];
          a10?.async && c10.push("async"), super(c10, b10);
        }
      }, hX = class extends hC {
        constructor([a10, b10, ...c10], d10) {
          const e10 = ["geoadd", a10];
          "nx" in b10 && b10.nx ? e10.push("nx") : "xx" in b10 && b10.xx && e10.push("xx"), "ch" in b10 && b10.ch && e10.push("ch"), "latitude" in b10 && b10.latitude && e10.push(b10.longitude, b10.latitude, b10.member), e10.push(...c10.flatMap(({ latitude: a11, longitude: b11, member: c11 }) => [b11, a11, c11])), super(e10, d10);
        }
      }, hY = class extends hC {
        constructor([a10, b10, c10, d10 = "M"], e10) {
          super(["GEODIST", a10, b10, c10, d10], e10);
        }
      }, hZ = class extends hC {
        constructor(a10, b10) {
          const [c10] = a10;
          super(["GEOHASH", c10, ...Array.isArray(a10[1]) ? a10[1] : a10.slice(1)], b10);
        }
      }, h$ = class extends hC {
        constructor(a10, b10) {
          const [c10] = a10;
          super(["GEOPOS", c10, ...Array.isArray(a10[1]) ? a10[1] : a10.slice(1)], { deserialize: (a11) => function(a12) {
            let b11 = [];
            for (let c11 of a12) c11?.[0] && c11?.[1] && b11.push({ lng: Number.parseFloat(c11[0]), lat: Number.parseFloat(c11[1]) });
            return b11;
          }(a11), ...b10 });
        }
      }, h_ = class extends hC {
        constructor([a10, b10, c10, d10, e10], f10) {
          const g10 = ["GEOSEARCH", a10];
          ("FROMMEMBER" === b10.type || "frommember" === b10.type) && g10.push(b10.type, b10.member), ("FROMLONLAT" === b10.type || "fromlonlat" === b10.type) && g10.push(b10.type, b10.coordinate.lon, b10.coordinate.lat), ("BYRADIUS" === c10.type || "byradius" === c10.type) && g10.push(c10.type, c10.radius, c10.radiusType), ("BYBOX" === c10.type || "bybox" === c10.type) && g10.push(c10.type, c10.rect.width, c10.rect.height, c10.rectType), g10.push(d10), e10?.count && g10.push("COUNT", e10.count.limit, ...e10.count.any ? ["ANY"] : []), super([...g10, ...e10?.withCoord ? ["WITHCOORD"] : [], ...e10?.withDist ? ["WITHDIST"] : [], ...e10?.withHash ? ["WITHHASH"] : []], { deserialize: (a11) => e10?.withCoord || e10?.withDist || e10?.withHash ? a11.map((a12) => {
            let b11 = 1, c11 = {};
            try {
              c11.member = JSON.parse(a12[0]);
            } catch {
              c11.member = a12[0];
            }
            return e10.withDist && (c11.dist = Number.parseFloat(a12[b11++])), e10.withHash && (c11.hash = a12[b11++].toString()), e10.withCoord && (c11.coord = { long: Number.parseFloat(a12[b11][0]), lat: Number.parseFloat(a12[b11][1]) }), c11;
          }) : a11.map((a12) => {
            try {
              return { member: JSON.parse(a12) };
            } catch {
              return { member: a12 };
            }
          }), ...f10 });
        }
      }, h0 = class extends hC {
        constructor([a10, b10, c10, d10, e10, f10], g10) {
          const h10 = ["GEOSEARCHSTORE", a10, b10];
          ("FROMMEMBER" === c10.type || "frommember" === c10.type) && h10.push(c10.type, c10.member), ("FROMLONLAT" === c10.type || "fromlonlat" === c10.type) && h10.push(c10.type, c10.coordinate.lon, c10.coordinate.lat), ("BYRADIUS" === d10.type || "byradius" === d10.type) && h10.push(d10.type, d10.radius, d10.radiusType), ("BYBOX" === d10.type || "bybox" === d10.type) && h10.push(d10.type, d10.rect.width, d10.rect.height, d10.rectType), h10.push(e10), f10?.count && h10.push("COUNT", f10.count.limit, ...f10.count.any ? ["ANY"] : []), super([...h10, ...f10?.storeDist ? ["STOREDIST"] : []], g10);
        }
      }, h1 = class extends hC {
        constructor(a10, b10) {
          super(["get", ...a10], b10);
        }
      }, h2 = class extends hC {
        constructor(a10, b10) {
          super(["getbit", ...a10], b10);
        }
      }, h3 = class extends hC {
        constructor(a10, b10) {
          super(["getdel", ...a10], b10);
        }
      }, h4 = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["getex", a10];
          b10 && ("ex" in b10 && "number" == typeof b10.ex ? d10.push("ex", b10.ex) : "px" in b10 && "number" == typeof b10.px ? d10.push("px", b10.px) : "exat" in b10 && "number" == typeof b10.exat ? d10.push("exat", b10.exat) : "pxat" in b10 && "number" == typeof b10.pxat ? d10.push("pxat", b10.pxat) : "persist" in b10 && b10.persist && d10.push("persist")), super(d10, c10);
        }
      }, h5 = class extends hC {
        constructor(a10, b10) {
          super(["getrange", ...a10], b10);
        }
      }, h6 = class extends hC {
        constructor(a10, b10) {
          super(["getset", ...a10], b10);
        }
      }, h7 = class extends hC {
        constructor(a10, b10) {
          super(["hdel", ...a10], b10);
        }
      }, h8 = class extends hC {
        constructor(a10, b10) {
          super(["hexists", ...a10], b10);
        }
      }, h9 = class extends hC {
        constructor(a10, b10) {
          super(["hget", ...a10], b10);
        }
      }, ia = class extends hC {
        constructor(a10, b10) {
          super(["hgetall", ...a10], { deserialize: (a11) => function(a12) {
            if (0 === a12.length) return null;
            let b11 = {};
            for (let c10 = 0; c10 < a12.length; c10 += 2) {
              let d10 = a12[c10], e10 = a12[c10 + 1];
              try {
                let a13 = !Number.isNaN(Number(e10)) && !Number.isSafeInteger(Number(e10));
                b11[d10] = a13 ? e10 : JSON.parse(e10);
              } catch {
                b11[d10] = e10;
              }
            }
            return b11;
          }(a11), ...b10 });
        }
      }, ib = class extends hC {
        constructor(a10, b10) {
          super(["hincrby", ...a10], b10);
        }
      }, ic = class extends hC {
        constructor(a10, b10) {
          super(["hincrbyfloat", ...a10], b10);
        }
      }, id = class extends hC {
        constructor([a10], b10) {
          super(["hkeys", a10], b10);
        }
      }, ie = class extends hC {
        constructor(a10, b10) {
          super(["hlen", ...a10], b10);
        }
      }, ig = class extends hC {
        constructor([a10, ...b10], c10) {
          super(["hmget", a10, ...b10], { deserialize: (a11) => function(a12, b11) {
            if (b11.every((a13) => null === a13)) return null;
            let c11 = {};
            for (let [d10, e10] of a12.entries()) try {
              c11[e10] = JSON.parse(b11[d10]);
            } catch {
              c11[e10] = b11[d10];
            }
            return c11;
          }(b10, a11), ...c10 });
        }
      }, ih = class extends hC {
        constructor([a10, b10], c10) {
          super(["hmset", a10, ...Object.entries(b10).flatMap(([a11, b11]) => [a11, b11])], c10);
        }
      }, ii = class extends hC {
        constructor([a10, b10, c10], d10) {
          const e10 = ["hscan", a10, b10];
          c10?.match && e10.push("match", c10.match), "number" == typeof c10?.count && e10.push("count", c10.count), super(e10, { deserialize: hw, ...d10 });
        }
      }, ij = class extends hC {
        constructor([a10, b10], c10) {
          super(["hset", a10, ...Object.entries(b10).flatMap(([a11, b11]) => [a11, b11])], c10);
        }
      }, ik = class extends hC {
        constructor(a10, b10) {
          super(["hsetnx", ...a10], b10);
        }
      }, il = class extends hC {
        constructor(a10, b10) {
          super(["hstrlen", ...a10], b10);
        }
      }, im = class extends hC {
        constructor(a10, b10) {
          super(["hvals", ...a10], b10);
        }
      }, io = class extends hC {
        constructor(a10, b10) {
          super(["incr", ...a10], b10);
        }
      }, ip = class extends hC {
        constructor(a10, b10) {
          super(["incrby", ...a10], b10);
        }
      }, iq = class extends hC {
        constructor(a10, b10) {
          super(["incrbyfloat", ...a10], b10);
        }
      }, ir = class extends hC {
        constructor(a10, b10) {
          super(["JSON.ARRAPPEND", ...a10], b10);
        }
      }, is = class extends hC {
        constructor(a10, b10) {
          super(["JSON.ARRINDEX", ...a10], b10);
        }
      }, it = class extends hC {
        constructor(a10, b10) {
          super(["JSON.ARRINSERT", ...a10], b10);
        }
      }, iu = class extends hC {
        constructor(a10, b10) {
          super(["JSON.ARRLEN", a10[0], a10[1] ?? "$"], b10);
        }
      }, iv = class extends hC {
        constructor(a10, b10) {
          super(["JSON.ARRPOP", ...a10], b10);
        }
      }, iw = class extends hC {
        constructor(a10, b10) {
          const c10 = a10[1] ?? "$", d10 = a10[2] ?? 0, e10 = a10[3] ?? 0;
          super(["JSON.ARRTRIM", a10[0], c10, d10, e10], b10);
        }
      }, ix = class extends hC {
        constructor(a10, b10) {
          super(["JSON.CLEAR", ...a10], b10);
        }
      }, iy = class extends hC {
        constructor(a10, b10) {
          super(["JSON.DEL", ...a10], b10);
        }
      }, iz = class extends hC {
        constructor(a10, b10) {
          super(["JSON.FORGET", ...a10], b10);
        }
      }, iA = class extends hC {
        constructor(a10, b10) {
          const c10 = ["JSON.GET"];
          "string" == typeof a10[1] ? c10.push(...a10) : (c10.push(a10[0]), a10[1] && (a10[1].indent && c10.push("INDENT", a10[1].indent), a10[1].newline && c10.push("NEWLINE", a10[1].newline), a10[1].space && c10.push("SPACE", a10[1].space)), c10.push(...a10.slice(2))), super(c10, b10);
        }
      }, iB = class extends hC {
        constructor(a10, b10) {
          super(["JSON.MGET", ...a10[0], a10[1]], b10);
        }
      }, iC = class extends hC {
        constructor(a10, b10) {
          const c10 = ["JSON.MSET"];
          for (const b11 of a10) c10.push(b11.key, b11.path, b11.value);
          super(c10, b10);
        }
      }, iD = class extends hC {
        constructor(a10, b10) {
          super(["JSON.NUMINCRBY", ...a10], b10);
        }
      }, iE = class extends hC {
        constructor(a10, b10) {
          super(["JSON.NUMMULTBY", ...a10], b10);
        }
      }, iF = class extends hC {
        constructor(a10, b10) {
          super(["JSON.OBJKEYS", ...a10], b10);
        }
      }, iG = class extends hC {
        constructor(a10, b10) {
          super(["JSON.OBJLEN", ...a10], b10);
        }
      }, iH = class extends hC {
        constructor(a10, b10) {
          super(["JSON.RESP", ...a10], b10);
        }
      }, iI = class extends hC {
        constructor(a10, b10) {
          const c10 = ["JSON.SET", a10[0], a10[1], a10[2]];
          a10[3] && (a10[3].nx ? c10.push("NX") : a10[3].xx && c10.push("XX")), super(c10, b10);
        }
      }, iJ = class extends hC {
        constructor(a10, b10) {
          super(["JSON.STRAPPEND", ...a10], b10);
        }
      }, iK = class extends hC {
        constructor(a10, b10) {
          super(["JSON.STRLEN", ...a10], b10);
        }
      }, iL = class extends hC {
        constructor(a10, b10) {
          super(["JSON.TOGGLE", ...a10], b10);
        }
      }, iM = class extends hC {
        constructor(a10, b10) {
          super(["JSON.TYPE", ...a10], b10);
        }
      }, iN = class extends hC {
        constructor(a10, b10) {
          super(["keys", ...a10], b10);
        }
      }, iO = class extends hC {
        constructor(a10, b10) {
          super(["lindex", ...a10], b10);
        }
      }, iP = class extends hC {
        constructor(a10, b10) {
          super(["linsert", ...a10], b10);
        }
      }, iQ = class extends hC {
        constructor(a10, b10) {
          super(["llen", ...a10], b10);
        }
      }, iR = class extends hC {
        constructor(a10, b10) {
          super(["lmove", ...a10], b10);
        }
      }, iS = class extends hC {
        constructor(a10, b10) {
          const [c10, d10, e10, f10] = a10;
          super(["LMPOP", c10, ...d10, e10, ...f10 ? ["COUNT", f10] : []], b10);
        }
      }, iT = class extends hC {
        constructor(a10, b10) {
          super(["lpop", ...a10], b10);
        }
      }, iU = class extends hC {
        constructor(a10, b10) {
          const c10 = ["lpos", a10[0], a10[1]];
          "number" == typeof a10[2]?.rank && c10.push("rank", a10[2].rank), "number" == typeof a10[2]?.count && c10.push("count", a10[2].count), "number" == typeof a10[2]?.maxLen && c10.push("maxLen", a10[2].maxLen), super(c10, b10);
        }
      }, iV = class extends hC {
        constructor(a10, b10) {
          super(["lpush", ...a10], b10);
        }
      }, iW = class extends hC {
        constructor(a10, b10) {
          super(["lpushx", ...a10], b10);
        }
      }, iX = class extends hC {
        constructor(a10, b10) {
          super(["lrange", ...a10], b10);
        }
      }, iY = class extends hC {
        constructor(a10, b10) {
          super(["lrem", ...a10], b10);
        }
      }, iZ = class extends hC {
        constructor(a10, b10) {
          super(["lset", ...a10], b10);
        }
      }, i$ = class extends hC {
        constructor(a10, b10) {
          super(["ltrim", ...a10], b10);
        }
      }, i_ = class extends hC {
        constructor(a10, b10) {
          super(["mget", ...Array.isArray(a10[0]) ? a10[0] : a10], b10);
        }
      }, i0 = class extends hC {
        constructor([a10], b10) {
          super(["mset", ...Object.entries(a10).flatMap(([a11, b11]) => [a11, b11])], b10);
        }
      }, i1 = class extends hC {
        constructor([a10], b10) {
          super(["msetnx", ...Object.entries(a10).flat()], b10);
        }
      }, i2 = class extends hC {
        constructor(a10, b10) {
          super(["persist", ...a10], b10);
        }
      }, i3 = class extends hC {
        constructor(a10, b10) {
          super(["pexpire", ...a10], b10);
        }
      }, i4 = class extends hC {
        constructor(a10, b10) {
          super(["pexpireat", ...a10], b10);
        }
      }, i5 = class extends hC {
        constructor(a10, b10) {
          super(["pfadd", ...a10], b10);
        }
      }, i6 = class extends hC {
        constructor(a10, b10) {
          super(["pfcount", ...a10], b10);
        }
      }, i7 = class extends hC {
        constructor(a10, b10) {
          super(["pfmerge", ...a10], b10);
        }
      }, i8 = class extends hC {
        constructor(a10, b10) {
          const c10 = ["ping"];
          a10?.[0] !== void 0 && c10.push(a10[0]), super(c10, b10);
        }
      }, i9 = class extends hC {
        constructor(a10, b10) {
          super(["psetex", ...a10], b10);
        }
      }, ja = class extends hC {
        constructor(a10, b10) {
          super(["pttl", ...a10], b10);
        }
      }, jb = class extends hC {
        constructor(a10, b10) {
          super(["publish", ...a10], b10);
        }
      }, jc = class extends hC {
        constructor(a10) {
          super(["randomkey"], a10);
        }
      }, jd = class extends hC {
        constructor(a10, b10) {
          super(["rename", ...a10], b10);
        }
      }, je = class extends hC {
        constructor(a10, b10) {
          super(["renamenx", ...a10], b10);
        }
      }, jf = class extends hC {
        constructor(a10, b10) {
          super(["rpop", ...a10], b10);
        }
      }, jg = class extends hC {
        constructor(a10, b10) {
          super(["rpush", ...a10], b10);
        }
      }, jh = class extends hC {
        constructor(a10, b10) {
          super(["rpushx", ...a10], b10);
        }
      }, ji = class extends hC {
        constructor(a10, b10) {
          super(["sadd", ...a10], b10);
        }
      }, jj = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["scan", a10];
          b10?.match && d10.push("match", b10.match), "number" == typeof b10?.count && d10.push("count", b10.count), b10?.type && b10.type.length > 0 && d10.push("type", b10.type), super(d10, { deserialize: hw, ...c10 });
        }
      }, jk = class extends hC {
        constructor(a10, b10) {
          super(["scard", ...a10], b10);
        }
      }, jl = class extends hC {
        constructor(a10, b10) {
          super(["script", "exists", ...a10], { deserialize: (a11) => a11, ...b10 });
        }
      }, jm = class extends hC {
        constructor([a10], b10) {
          const c10 = ["script", "flush"];
          a10?.sync ? c10.push("sync") : a10?.async && c10.push("async"), super(c10, b10);
        }
      }, jn = class extends hC {
        constructor(a10, b10) {
          super(["script", "load", ...a10], b10);
        }
      }, jo = class extends hC {
        constructor(a10, b10) {
          super(["sdiff", ...a10], b10);
        }
      }, jp = class extends hC {
        constructor(a10, b10) {
          super(["sdiffstore", ...a10], b10);
        }
      }, jq = class extends hC {
        constructor([a10, b10, c10], d10) {
          const e10 = ["set", a10, b10];
          c10 && ("nx" in c10 && c10.nx ? e10.push("nx") : "xx" in c10 && c10.xx && e10.push("xx"), "get" in c10 && c10.get && e10.push("get"), "ex" in c10 && "number" == typeof c10.ex ? e10.push("ex", c10.ex) : "px" in c10 && "number" == typeof c10.px ? e10.push("px", c10.px) : "exat" in c10 && "number" == typeof c10.exat ? e10.push("exat", c10.exat) : "pxat" in c10 && "number" == typeof c10.pxat ? e10.push("pxat", c10.pxat) : "keepTtl" in c10 && c10.keepTtl && e10.push("keepTtl")), super(e10, d10);
        }
      }, jr = class extends hC {
        constructor(a10, b10) {
          super(["setbit", ...a10], b10);
        }
      }, js = class extends hC {
        constructor(a10, b10) {
          super(["setex", ...a10], b10);
        }
      }, jt = class extends hC {
        constructor(a10, b10) {
          super(["setnx", ...a10], b10);
        }
      }, ju = class extends hC {
        constructor(a10, b10) {
          super(["setrange", ...a10], b10);
        }
      }, jv = class extends hC {
        constructor(a10, b10) {
          super(["sinter", ...a10], b10);
        }
      }, jw = class extends hC {
        constructor(a10, b10) {
          super(["sinterstore", ...a10], b10);
        }
      }, jx = class extends hC {
        constructor(a10, b10) {
          super(["sismember", ...a10], b10);
        }
      }, jy = class extends hC {
        constructor(a10, b10) {
          super(["smembers", ...a10], b10);
        }
      }, jz = class extends hC {
        constructor(a10, b10) {
          super(["smismember", a10[0], ...a10[1]], b10);
        }
      }, jA = class extends hC {
        constructor(a10, b10) {
          super(["smove", ...a10], b10);
        }
      }, jB = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["spop", a10];
          "number" == typeof b10 && d10.push(b10), super(d10, c10);
        }
      }, jC = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["srandmember", a10];
          "number" == typeof b10 && d10.push(b10), super(d10, c10);
        }
      }, jD = class extends hC {
        constructor(a10, b10) {
          super(["srem", ...a10], b10);
        }
      }, jE = class extends hC {
        constructor([a10, b10, c10], d10) {
          const e10 = ["sscan", a10, b10];
          c10?.match && e10.push("match", c10.match), "number" == typeof c10?.count && e10.push("count", c10.count), super(e10, { deserialize: hw, ...d10 });
        }
      }, jF = class extends hC {
        constructor(a10, b10) {
          super(["strlen", ...a10], b10);
        }
      }, jG = class extends hC {
        constructor(a10, b10) {
          super(["sunion", ...a10], b10);
        }
      }, jH = class extends hC {
        constructor(a10, b10) {
          super(["sunionstore", ...a10], b10);
        }
      }, jI = class extends hC {
        constructor(a10) {
          super(["time"], a10);
        }
      }, jJ = class extends hC {
        constructor(a10, b10) {
          super(["touch", ...a10], b10);
        }
      }, jK = class extends hC {
        constructor(a10, b10) {
          super(["ttl", ...a10], b10);
        }
      }, jL = class extends hC {
        constructor(a10, b10) {
          super(["type", ...a10], b10);
        }
      }, jM = class extends hC {
        constructor(a10, b10) {
          super(["unlink", ...a10], b10);
        }
      }, jN = class extends hC {
        constructor([a10, b10, c10], d10) {
          super(["XACK", a10, b10, ...Array.isArray(c10) ? [...c10] : [c10]], d10);
        }
      }, jO = class extends hC {
        constructor([a10, b10, c10, d10], e10) {
          const f10 = ["XADD", a10];
          for (const [a11, e11] of (d10 && (d10.nomkStream && f10.push("NOMKSTREAM"), d10.trim && (f10.push(d10.trim.type, d10.trim.comparison, d10.trim.threshold), void 0 !== d10.trim.limit && f10.push("LIMIT", d10.trim.limit))), f10.push(b10), Object.entries(c10))) f10.push(a11, e11);
          super(f10, e10);
        }
      }, jP = class extends hC {
        constructor([a10, b10, c10, d10, e10, f10], g10) {
          const h10 = [];
          f10?.count && h10.push("COUNT", f10.count), f10?.justId && h10.push("JUSTID"), super(["XAUTOCLAIM", a10, b10, c10, d10, e10, ...h10], g10);
        }
      }, jQ = class extends hC {
        constructor([a10, b10, c10, d10, e10, f10], g10) {
          const h10 = Array.isArray(e10) ? [...e10] : [e10], i10 = [];
          f10?.idleMS && i10.push("IDLE", f10.idleMS), f10?.idleMS && i10.push("TIME", f10.timeMS), f10?.retryCount && i10.push("RETRYCOUNT", f10.retryCount), f10?.force && i10.push("FORCE"), f10?.justId && i10.push("JUSTID"), f10?.lastId && i10.push("LASTID", f10.lastId), super(["XCLAIM", a10, b10, c10, d10, ...h10, ...i10], g10);
        }
      }, jR = class extends hC {
        constructor([a10, b10], c10) {
          super(["XDEL", a10, ...Array.isArray(b10) ? [...b10] : [b10]], c10);
        }
      }, jS = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["XGROUP"];
          switch (b10.type) {
            case "CREATE":
              d10.push("CREATE", a10, b10.group, b10.id), b10.options && (b10.options.MKSTREAM && d10.push("MKSTREAM"), void 0 !== b10.options.ENTRIESREAD && d10.push("ENTRIESREAD", b10.options.ENTRIESREAD.toString()));
              break;
            case "CREATECONSUMER":
              d10.push("CREATECONSUMER", a10, b10.group, b10.consumer);
              break;
            case "DELCONSUMER":
              d10.push("DELCONSUMER", a10, b10.group, b10.consumer);
              break;
            case "DESTROY":
              d10.push("DESTROY", a10, b10.group);
              break;
            case "SETID":
              d10.push("SETID", a10, b10.group, b10.id), b10.options?.ENTRIESREAD !== void 0 && d10.push("ENTRIESREAD", b10.options.ENTRIESREAD.toString());
              break;
            default:
              throw Error("Invalid XGROUP");
          }
          super(d10, c10);
        }
      }, jT = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = [];
          "CONSUMERS" === b10.type ? d10.push("CONSUMERS", a10, b10.group) : d10.push("GROUPS", a10), super(["XINFO", ...d10], c10);
        }
      }, jU = class extends hC {
        constructor(a10, b10) {
          super(["XLEN", ...a10], b10);
        }
      }, jV = class extends hC {
        constructor([a10, b10, c10, d10, e10, f10], g10) {
          const h10 = f10?.consumer === void 0 ? [] : Array.isArray(f10.consumer) ? [...f10.consumer] : [f10.consumer];
          super(["XPENDING", a10, b10, ...f10?.idleTime ? ["IDLE", f10.idleTime] : [], c10, d10, e10, ...h10], g10);
        }
      }, jW = class extends hC {
        constructor([a10, b10, c10, d10], e10) {
          const f10 = ["XRANGE", a10, b10, c10];
          "number" == typeof d10 && f10.push("COUNT", d10), super(f10, { deserialize: (a11) => function(a12) {
            let b11 = {};
            for (let c11 of a12) for (let a13 = 0; a13 < c11.length; a13 += 2) {
              let d11 = c11[a13], e11 = c11[a13 + 1];
              d11 in b11 || (b11[d11] = {});
              for (let a14 = 0; a14 < e11.length; a14 += 2) {
                let c12 = e11[a14], f11 = e11[a14 + 1];
                try {
                  b11[d11][c12] = JSON.parse(f11);
                } catch {
                  b11[d11][c12] = f11;
                }
              }
            }
            return b11;
          }(a11), ...e10 });
        }
      }, jX = class extends hC {
        constructor([a10, b10, c10], d10) {
          if (Array.isArray(a10) && Array.isArray(b10) && a10.length !== b10.length) throw Error("ERR Unbalanced XREAD list of streams: for each stream key an ID or '$' must be specified");
          const e10 = [];
          "number" == typeof c10?.count && e10.push("COUNT", c10.count), "number" == typeof c10?.blockMS && e10.push("BLOCK", c10.blockMS), e10.push("STREAMS", ...Array.isArray(a10) ? [...a10] : [a10], ...Array.isArray(b10) ? [...b10] : [b10]), super(["XREAD", ...e10], d10);
        }
      }, jY = class extends hC {
        constructor([a10, b10, c10, d10, e10], f10) {
          if (Array.isArray(c10) && Array.isArray(d10) && c10.length !== d10.length) throw Error("ERR Unbalanced XREADGROUP list of streams: for each stream key an ID or '$' must be specified");
          const g10 = [];
          "number" == typeof e10?.count && g10.push("COUNT", e10.count), "number" == typeof e10?.blockMS && g10.push("BLOCK", e10.blockMS), "boolean" == typeof e10?.NOACK && e10.NOACK && g10.push("NOACK"), g10.push("STREAMS", ...Array.isArray(c10) ? [...c10] : [c10], ...Array.isArray(d10) ? [...d10] : [d10]), super(["XREADGROUP", "GROUP", a10, b10, ...g10], f10);
        }
      }, jZ = class extends hC {
        constructor([a10, b10, c10, d10], e10) {
          const f10 = ["XREVRANGE", a10, b10, c10];
          "number" == typeof d10 && f10.push("COUNT", d10), super(f10, { deserialize: (a11) => function(a12) {
            let b11 = {};
            for (let c11 of a12) for (let a13 = 0; a13 < c11.length; a13 += 2) {
              let d11 = c11[a13], e11 = c11[a13 + 1];
              d11 in b11 || (b11[d11] = {});
              for (let a14 = 0; a14 < e11.length; a14 += 2) {
                let c12 = e11[a14], f11 = e11[a14 + 1];
                try {
                  b11[d11][c12] = JSON.parse(f11);
                } catch {
                  b11[d11][c12] = f11;
                }
              }
            }
            return b11;
          }(a11), ...e10 });
        }
      }, j$ = class extends hC {
        constructor([a10, b10], c10) {
          const { limit: d10, strategy: e10, threshold: f10, exactness: g10 = "~" } = b10;
          super(["XTRIM", a10, e10, g10, f10, ...d10 ? ["LIMIT", d10] : []], c10);
        }
      }, j_ = class extends hC {
        constructor([a10, b10, ...c10], d10) {
          const e10 = ["zadd", a10];
          "nx" in b10 && b10.nx ? e10.push("nx") : "xx" in b10 && b10.xx && e10.push("xx"), "ch" in b10 && b10.ch && e10.push("ch"), "incr" in b10 && b10.incr && e10.push("incr"), "lt" in b10 && b10.lt ? e10.push("lt") : "gt" in b10 && b10.gt && e10.push("gt"), "score" in b10 && "member" in b10 && e10.push(b10.score, b10.member), e10.push(...c10.flatMap(({ score: a11, member: b11 }) => [a11, b11])), super(e10, d10);
        }
      }, j0 = class extends hC {
        constructor(a10, b10) {
          super(["zcard", ...a10], b10);
        }
      }, j1 = class extends hC {
        constructor(a10, b10) {
          super(["zcount", ...a10], b10);
        }
      }, j2 = class extends hC {
        constructor(a10, b10) {
          super(["zincrby", ...a10], b10);
        }
      }, j3 = class extends hC {
        constructor([a10, b10, c10, d10], e10) {
          const f10 = ["zinterstore", a10, b10];
          Array.isArray(c10) ? f10.push(...c10) : f10.push(c10), d10 && ("weights" in d10 && d10.weights ? f10.push("weights", ...d10.weights) : "weight" in d10 && "number" == typeof d10.weight && f10.push("weights", d10.weight), "aggregate" in d10 && f10.push("aggregate", d10.aggregate)), super(f10, e10);
        }
      }, j4 = class extends hC {
        constructor(a10, b10) {
          super(["zlexcount", ...a10], b10);
        }
      }, j5 = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["zpopmax", a10];
          "number" == typeof b10 && d10.push(b10), super(d10, c10);
        }
      }, j6 = class extends hC {
        constructor([a10, b10], c10) {
          const d10 = ["zpopmin", a10];
          "number" == typeof b10 && d10.push(b10), super(d10, c10);
        }
      }, j7 = class extends hC {
        constructor([a10, b10, c10, d10], e10) {
          const f10 = ["zrange", a10, b10, c10];
          d10?.byScore && f10.push("byscore"), d10?.byLex && f10.push("bylex"), d10?.rev && f10.push("rev"), d10?.count !== void 0 && void 0 !== d10.offset && f10.push("limit", d10.offset, d10.count), d10?.withScores && f10.push("withscores"), super(f10, e10);
        }
      }, j8 = class extends hC {
        constructor(a10, b10) {
          super(["zrank", ...a10], b10);
        }
      }, j9 = class extends hC {
        constructor(a10, b10) {
          super(["zrem", ...a10], b10);
        }
      }, ka = class extends hC {
        constructor(a10, b10) {
          super(["zremrangebylex", ...a10], b10);
        }
      }, kb = class extends hC {
        constructor(a10, b10) {
          super(["zremrangebyrank", ...a10], b10);
        }
      }, kc = class extends hC {
        constructor(a10, b10) {
          super(["zremrangebyscore", ...a10], b10);
        }
      }, kd = class extends hC {
        constructor(a10, b10) {
          super(["zrevrank", ...a10], b10);
        }
      }, ke = class extends hC {
        constructor([a10, b10, c10], d10) {
          const e10 = ["zscan", a10, b10];
          c10?.match && e10.push("match", c10.match), "number" == typeof c10?.count && e10.push("count", c10.count), super(e10, { deserialize: hw, ...d10 });
        }
      }, kf = class extends hC {
        constructor(a10, b10) {
          super(["zscore", ...a10], b10);
        }
      }, kg = class extends hC {
        constructor([a10, b10, c10], d10) {
          const e10 = ["zunion", a10];
          Array.isArray(b10) ? e10.push(...b10) : e10.push(b10), c10 && ("weights" in c10 && c10.weights ? e10.push("weights", ...c10.weights) : "weight" in c10 && "number" == typeof c10.weight && e10.push("weights", c10.weight), "aggregate" in c10 && e10.push("aggregate", c10.aggregate), c10.withScores && e10.push("withscores")), super(e10, d10);
        }
      }, kh = class extends hC {
        constructor([a10, b10, c10, d10], e10) {
          const f10 = ["zunionstore", a10, b10];
          Array.isArray(c10) ? f10.push(...c10) : f10.push(c10), d10 && ("weights" in d10 && d10.weights ? f10.push("weights", ...d10.weights) : "weight" in d10 && "number" == typeof d10.weight && f10.push("weights", d10.weight), "aggregate" in d10 && f10.push("aggregate", d10.aggregate)), super(f10, e10);
        }
      }, ki = class extends hC {
        constructor(a10, b10) {
          super(["zdiffstore", ...a10], b10);
        }
      }, kj = class extends hC {
        constructor(a10, b10) {
          const [c10, d10] = a10;
          super(["zmscore", c10, ...d10], b10);
        }
      }, kk = class {
        client;
        commands;
        commandOptions;
        multiExec;
        constructor(a10) {
          if (this.client = a10.client, this.commands = [], this.commandOptions = a10.commandOptions, this.multiExec = a10.multiExec ?? false, this.commandOptions?.latencyLogging) {
            const a11 = this.exec.bind(this);
            this.exec = async (b10) => {
              let c10 = performance.now(), d10 = await (b10 ? a11(b10) : a11()), e10 = (performance.now() - c10).toFixed(2);
              return console.log(`Latency for \x1B[38;2;19;185;39m${this.multiExec ? ["MULTI-EXEC"] : ["PIPELINE"].toString().toUpperCase()}\x1B[0m: \x1B[38;2;0;255;255m${e10} ms\x1B[0m`), d10;
            };
          }
        }
        exec = async (a10) => {
          if (0 === this.commands.length) throw Error("Pipeline is empty");
          let b10 = this.multiExec ? ["multi-exec"] : ["pipeline"], c10 = await this.client.request({ path: b10, body: Object.values(this.commands).map((a11) => a11.command) });
          return a10?.keepErrors ? c10.map(({ error: a11, result: b11 }, c11) => ({ error: a11, result: this.commands[c11].deserialize(b11) })) : c10.map(({ error: a11, result: b11 }, c11) => {
            if (a11) throw new ht(`Command ${c11 + 1} [ ${this.commands[c11].command[0]} ] failed: ${a11}`);
            return this.commands[c11].deserialize(b11);
          });
        };
        length() {
          return this.commands.length;
        }
        chain(a10) {
          return this.commands.push(a10), this;
        }
        append = (...a10) => this.chain(new hE(a10, this.commandOptions));
        bitcount = (...a10) => this.chain(new hF(a10, this.commandOptions));
        bitfield = (...a10) => new hG(a10, this.client, this.commandOptions, this.chain.bind(this));
        bitop = (a10, b10, c10, ...d10) => this.chain(new hH([a10, b10, c10, ...d10], this.commandOptions));
        bitpos = (...a10) => this.chain(new hI(a10, this.commandOptions));
        copy = (...a10) => this.chain(new hJ(a10, this.commandOptions));
        zdiffstore = (...a10) => this.chain(new ki(a10, this.commandOptions));
        dbsize = () => this.chain(new hK(this.commandOptions));
        decr = (...a10) => this.chain(new hL(a10, this.commandOptions));
        decrby = (...a10) => this.chain(new hM(a10, this.commandOptions));
        del = (...a10) => this.chain(new hN(a10, this.commandOptions));
        echo = (...a10) => this.chain(new hO(a10, this.commandOptions));
        eval = (...a10) => this.chain(new hP(a10, this.commandOptions));
        evalsha = (...a10) => this.chain(new hQ(a10, this.commandOptions));
        exists = (...a10) => this.chain(new hS(a10, this.commandOptions));
        expire = (...a10) => this.chain(new hT(a10, this.commandOptions));
        expireat = (...a10) => this.chain(new hU(a10, this.commandOptions));
        flushall = (a10) => this.chain(new hV(a10, this.commandOptions));
        flushdb = (...a10) => this.chain(new hW(a10, this.commandOptions));
        geoadd = (...a10) => this.chain(new hX(a10, this.commandOptions));
        geodist = (...a10) => this.chain(new hY(a10, this.commandOptions));
        geopos = (...a10) => this.chain(new h$(a10, this.commandOptions));
        geohash = (...a10) => this.chain(new hZ(a10, this.commandOptions));
        geosearch = (...a10) => this.chain(new h_(a10, this.commandOptions));
        geosearchstore = (...a10) => this.chain(new h0(a10, this.commandOptions));
        get = (...a10) => this.chain(new h1(a10, this.commandOptions));
        getbit = (...a10) => this.chain(new h2(a10, this.commandOptions));
        getdel = (...a10) => this.chain(new h3(a10, this.commandOptions));
        getex = (...a10) => this.chain(new h4(a10, this.commandOptions));
        getrange = (...a10) => this.chain(new h5(a10, this.commandOptions));
        getset = (a10, b10) => this.chain(new h6([a10, b10], this.commandOptions));
        hdel = (...a10) => this.chain(new h7(a10, this.commandOptions));
        hexists = (...a10) => this.chain(new h8(a10, this.commandOptions));
        hget = (...a10) => this.chain(new h9(a10, this.commandOptions));
        hgetall = (...a10) => this.chain(new ia(a10, this.commandOptions));
        hincrby = (...a10) => this.chain(new ib(a10, this.commandOptions));
        hincrbyfloat = (...a10) => this.chain(new ic(a10, this.commandOptions));
        hkeys = (...a10) => this.chain(new id(a10, this.commandOptions));
        hlen = (...a10) => this.chain(new ie(a10, this.commandOptions));
        hmget = (...a10) => this.chain(new ig(a10, this.commandOptions));
        hmset = (a10, b10) => this.chain(new ih([a10, b10], this.commandOptions));
        hrandfield = (a10, b10, c10) => this.chain(new hD([a10, b10, c10], this.commandOptions));
        hscan = (...a10) => this.chain(new ii(a10, this.commandOptions));
        hset = (a10, b10) => this.chain(new ij([a10, b10], this.commandOptions));
        hsetnx = (a10, b10, c10) => this.chain(new ik([a10, b10, c10], this.commandOptions));
        hstrlen = (...a10) => this.chain(new il(a10, this.commandOptions));
        hvals = (...a10) => this.chain(new im(a10, this.commandOptions));
        incr = (...a10) => this.chain(new io(a10, this.commandOptions));
        incrby = (...a10) => this.chain(new ip(a10, this.commandOptions));
        incrbyfloat = (...a10) => this.chain(new iq(a10, this.commandOptions));
        keys = (...a10) => this.chain(new iN(a10, this.commandOptions));
        lindex = (...a10) => this.chain(new iO(a10, this.commandOptions));
        linsert = (a10, b10, c10, d10) => this.chain(new iP([a10, b10, c10, d10], this.commandOptions));
        llen = (...a10) => this.chain(new iQ(a10, this.commandOptions));
        lmove = (...a10) => this.chain(new iR(a10, this.commandOptions));
        lpop = (...a10) => this.chain(new iT(a10, this.commandOptions));
        lmpop = (...a10) => this.chain(new iS(a10, this.commandOptions));
        lpos = (...a10) => this.chain(new iU(a10, this.commandOptions));
        lpush = (a10, ...b10) => this.chain(new iV([a10, ...b10], this.commandOptions));
        lpushx = (a10, ...b10) => this.chain(new iW([a10, ...b10], this.commandOptions));
        lrange = (...a10) => this.chain(new iX(a10, this.commandOptions));
        lrem = (a10, b10, c10) => this.chain(new iY([a10, b10, c10], this.commandOptions));
        lset = (a10, b10, c10) => this.chain(new iZ([a10, b10, c10], this.commandOptions));
        ltrim = (...a10) => this.chain(new i$(a10, this.commandOptions));
        mget = (...a10) => this.chain(new i_(a10, this.commandOptions));
        mset = (a10) => this.chain(new i0([a10], this.commandOptions));
        msetnx = (a10) => this.chain(new i1([a10], this.commandOptions));
        persist = (...a10) => this.chain(new i2(a10, this.commandOptions));
        pexpire = (...a10) => this.chain(new i3(a10, this.commandOptions));
        pexpireat = (...a10) => this.chain(new i4(a10, this.commandOptions));
        pfadd = (...a10) => this.chain(new i5(a10, this.commandOptions));
        pfcount = (...a10) => this.chain(new i6(a10, this.commandOptions));
        pfmerge = (...a10) => this.chain(new i7(a10, this.commandOptions));
        ping = (a10) => this.chain(new i8(a10, this.commandOptions));
        psetex = (a10, b10, c10) => this.chain(new i9([a10, b10, c10], this.commandOptions));
        pttl = (...a10) => this.chain(new ja(a10, this.commandOptions));
        publish = (...a10) => this.chain(new jb(a10, this.commandOptions));
        randomkey = () => this.chain(new jc(this.commandOptions));
        rename = (...a10) => this.chain(new jd(a10, this.commandOptions));
        renamenx = (...a10) => this.chain(new je(a10, this.commandOptions));
        rpop = (...a10) => this.chain(new jf(a10, this.commandOptions));
        rpush = (a10, ...b10) => this.chain(new jg([a10, ...b10], this.commandOptions));
        rpushx = (a10, ...b10) => this.chain(new jh([a10, ...b10], this.commandOptions));
        sadd = (a10, b10, ...c10) => this.chain(new ji([a10, b10, ...c10], this.commandOptions));
        scan = (...a10) => this.chain(new jj(a10, this.commandOptions));
        scard = (...a10) => this.chain(new jk(a10, this.commandOptions));
        scriptExists = (...a10) => this.chain(new jl(a10, this.commandOptions));
        scriptFlush = (...a10) => this.chain(new jm(a10, this.commandOptions));
        scriptLoad = (...a10) => this.chain(new jn(a10, this.commandOptions));
        sdiff = (...a10) => this.chain(new jo(a10, this.commandOptions));
        sdiffstore = (...a10) => this.chain(new jp(a10, this.commandOptions));
        set = (a10, b10, c10) => this.chain(new jq([a10, b10, c10], this.commandOptions));
        setbit = (...a10) => this.chain(new jr(a10, this.commandOptions));
        setex = (a10, b10, c10) => this.chain(new js([a10, b10, c10], this.commandOptions));
        setnx = (a10, b10) => this.chain(new jt([a10, b10], this.commandOptions));
        setrange = (...a10) => this.chain(new ju(a10, this.commandOptions));
        sinter = (...a10) => this.chain(new jv(a10, this.commandOptions));
        sinterstore = (...a10) => this.chain(new jw(a10, this.commandOptions));
        sismember = (a10, b10) => this.chain(new jx([a10, b10], this.commandOptions));
        smembers = (...a10) => this.chain(new jy(a10, this.commandOptions));
        smismember = (a10, b10) => this.chain(new jz([a10, b10], this.commandOptions));
        smove = (a10, b10, c10) => this.chain(new jA([a10, b10, c10], this.commandOptions));
        spop = (...a10) => this.chain(new jB(a10, this.commandOptions));
        srandmember = (...a10) => this.chain(new jC(a10, this.commandOptions));
        srem = (a10, ...b10) => this.chain(new jD([a10, ...b10], this.commandOptions));
        sscan = (...a10) => this.chain(new jE(a10, this.commandOptions));
        strlen = (...a10) => this.chain(new jF(a10, this.commandOptions));
        sunion = (...a10) => this.chain(new jG(a10, this.commandOptions));
        sunionstore = (...a10) => this.chain(new jH(a10, this.commandOptions));
        time = () => this.chain(new jI(this.commandOptions));
        touch = (...a10) => this.chain(new jJ(a10, this.commandOptions));
        ttl = (...a10) => this.chain(new jK(a10, this.commandOptions));
        type = (...a10) => this.chain(new jL(a10, this.commandOptions));
        unlink = (...a10) => this.chain(new jM(a10, this.commandOptions));
        zadd = (...a10) => ("score" in a10[1], this.chain(new j_([a10[0], a10[1], ...a10.slice(2)], this.commandOptions)));
        xadd = (...a10) => this.chain(new jO(a10, this.commandOptions));
        xack = (...a10) => this.chain(new jN(a10, this.commandOptions));
        xdel = (...a10) => this.chain(new jR(a10, this.commandOptions));
        xgroup = (...a10) => this.chain(new jS(a10, this.commandOptions));
        xread = (...a10) => this.chain(new jX(a10, this.commandOptions));
        xreadgroup = (...a10) => this.chain(new jY(a10, this.commandOptions));
        xinfo = (...a10) => this.chain(new jT(a10, this.commandOptions));
        xlen = (...a10) => this.chain(new jU(a10, this.commandOptions));
        xpending = (...a10) => this.chain(new jV(a10, this.commandOptions));
        xclaim = (...a10) => this.chain(new jQ(a10, this.commandOptions));
        xautoclaim = (...a10) => this.chain(new jP(a10, this.commandOptions));
        xtrim = (...a10) => this.chain(new j$(a10, this.commandOptions));
        xrange = (...a10) => this.chain(new jW(a10, this.commandOptions));
        xrevrange = (...a10) => this.chain(new jZ(a10, this.commandOptions));
        zcard = (...a10) => this.chain(new j0(a10, this.commandOptions));
        zcount = (...a10) => this.chain(new j1(a10, this.commandOptions));
        zincrby = (a10, b10, c10) => this.chain(new j2([a10, b10, c10], this.commandOptions));
        zinterstore = (...a10) => this.chain(new j3(a10, this.commandOptions));
        zlexcount = (...a10) => this.chain(new j4(a10, this.commandOptions));
        zmscore = (...a10) => this.chain(new kj(a10, this.commandOptions));
        zpopmax = (...a10) => this.chain(new j5(a10, this.commandOptions));
        zpopmin = (...a10) => this.chain(new j6(a10, this.commandOptions));
        zrange = (...a10) => this.chain(new j7(a10, this.commandOptions));
        zrank = (a10, b10) => this.chain(new j8([a10, b10], this.commandOptions));
        zrem = (a10, ...b10) => this.chain(new j9([a10, ...b10], this.commandOptions));
        zremrangebylex = (...a10) => this.chain(new ka(a10, this.commandOptions));
        zremrangebyrank = (...a10) => this.chain(new kb(a10, this.commandOptions));
        zremrangebyscore = (...a10) => this.chain(new kc(a10, this.commandOptions));
        zrevrank = (a10, b10) => this.chain(new kd([a10, b10], this.commandOptions));
        zscan = (...a10) => this.chain(new ke(a10, this.commandOptions));
        zscore = (a10, b10) => this.chain(new kf([a10, b10], this.commandOptions));
        zunionstore = (...a10) => this.chain(new kh(a10, this.commandOptions));
        zunion = (...a10) => this.chain(new kg(a10, this.commandOptions));
        get json() {
          return { arrappend: (...a10) => this.chain(new ir(a10, this.commandOptions)), arrindex: (...a10) => this.chain(new is(a10, this.commandOptions)), arrinsert: (...a10) => this.chain(new it(a10, this.commandOptions)), arrlen: (...a10) => this.chain(new iu(a10, this.commandOptions)), arrpop: (...a10) => this.chain(new iv(a10, this.commandOptions)), arrtrim: (...a10) => this.chain(new iw(a10, this.commandOptions)), clear: (...a10) => this.chain(new ix(a10, this.commandOptions)), del: (...a10) => this.chain(new iy(a10, this.commandOptions)), forget: (...a10) => this.chain(new iz(a10, this.commandOptions)), get: (...a10) => this.chain(new iA(a10, this.commandOptions)), mget: (...a10) => this.chain(new iB(a10, this.commandOptions)), mset: (...a10) => this.chain(new iC(a10, this.commandOptions)), numincrby: (...a10) => this.chain(new iD(a10, this.commandOptions)), nummultby: (...a10) => this.chain(new iE(a10, this.commandOptions)), objkeys: (...a10) => this.chain(new iF(a10, this.commandOptions)), objlen: (...a10) => this.chain(new iG(a10, this.commandOptions)), resp: (...a10) => this.chain(new iH(a10, this.commandOptions)), set: (...a10) => this.chain(new iI(a10, this.commandOptions)), strappend: (...a10) => this.chain(new iJ(a10, this.commandOptions)), strlen: (...a10) => this.chain(new iK(a10, this.commandOptions)), toggle: (...a10) => this.chain(new iL(a10, this.commandOptions)), type: (...a10) => this.chain(new iM(a10, this.commandOptions)) };
        }
      }, kl = class {
        pipelinePromises = /* @__PURE__ */ new WeakMap();
        activePipeline = null;
        indexInCurrentPipeline = 0;
        redis;
        pipeline;
        pipelineCounter = 0;
        constructor(a10) {
          this.redis = a10, this.pipeline = a10.pipeline();
        }
        async withAutoPipeline(a10) {
          let b10 = this.activePipeline ?? this.redis.pipeline();
          this.activePipeline || (this.activePipeline = b10, this.indexInCurrentPipeline = 0);
          let c10 = this.indexInCurrentPipeline++;
          a10(b10);
          let d10 = this.deferExecution().then(() => {
            if (!this.pipelinePromises.has(b10)) {
              let a11 = b10.exec({ keepErrors: true });
              this.pipelineCounter += 1, this.pipelinePromises.set(b10, a11), this.activePipeline = null;
            }
            return this.pipelinePromises.get(b10);
          }), e10 = (await d10)[c10];
          if (e10.error) throw new ht(`Command failed: ${e10.error}`);
          return e10.result;
        }
        async deferExecution() {
          await Promise.resolve(), await Promise.resolve();
        }
      }, km = class extends hC {
        constructor(a10, b10) {
          super([], { ...b10, headers: { Accept: "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }, path: ["psubscribe", ...a10], streamOptions: { isStreaming: true, onMessage: b10?.streamOptions?.onMessage, signal: b10?.streamOptions?.signal } });
        }
      }, kn = class extends EventTarget {
        subscriptions;
        client;
        listeners;
        constructor(a10, b10, c10 = false) {
          for (const d10 of (super(), this.client = a10, this.subscriptions = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Map(), b10)) c10 ? this.subscribeToPattern(d10) : this.subscribeToChannel(d10);
        }
        subscribeToChannel(a10) {
          let b10 = new AbortController(), c10 = new ko([a10], { streamOptions: { signal: b10.signal, onMessage: (a11) => this.handleMessage(a11, false) } });
          c10.exec(this.client).catch((a11) => {
            "AbortError" !== a11.name && this.dispatchToListeners("error", a11);
          }), this.subscriptions.set(a10, { command: c10, controller: b10, isPattern: false });
        }
        subscribeToPattern(a10) {
          let b10 = new AbortController(), c10 = new km([a10], { streamOptions: { signal: b10.signal, onMessage: (a11) => this.handleMessage(a11, true) } });
          c10.exec(this.client).catch((a11) => {
            "AbortError" !== a11.name && this.dispatchToListeners("error", a11);
          }), this.subscriptions.set(a10, { command: c10, controller: b10, isPattern: true });
        }
        handleMessage(a10, b10) {
          let c10 = a10.replace(/^data:\s*/, ""), d10 = c10.indexOf(","), e10 = c10.indexOf(",", d10 + 1), f10 = b10 ? c10.indexOf(",", e10 + 1) : -1;
          if (-1 !== d10 && -1 !== e10) {
            let a11 = c10.slice(0, d10);
            if (b10 && "pmessage" === a11 && -1 !== f10) {
              let a12 = c10.slice(d10 + 1, e10), b11 = c10.slice(e10 + 1, f10), g10 = c10.slice(f10 + 1);
              try {
                let c11 = JSON.parse(g10);
                this.dispatchToListeners("pmessage", { pattern: a12, channel: b11, message: c11 }), this.dispatchToListeners(`pmessage:${a12}`, { pattern: a12, channel: b11, message: c11 });
              } catch (a13) {
                this.dispatchToListeners("error", Error(`Failed to parse message: ${a13}`));
              }
            } else {
              let b11 = c10.slice(d10 + 1, e10), f11 = c10.slice(e10 + 1);
              try {
                if ("subscribe" === a11 || "psubscribe" === a11 || "unsubscribe" === a11 || "punsubscribe" === a11) {
                  let b12 = Number.parseInt(f11);
                  this.dispatchToListeners(a11, b12);
                } else {
                  let c11 = JSON.parse(f11);
                  this.dispatchToListeners(a11, { channel: b11, message: c11 }), this.dispatchToListeners(`${a11}:${b11}`, { channel: b11, message: c11 });
                }
              } catch (a12) {
                this.dispatchToListeners("error", Error(`Failed to parse message: ${a12}`));
              }
            }
          }
        }
        dispatchToListeners(a10, b10) {
          let c10 = this.listeners.get(a10);
          if (c10) for (let a11 of c10) a11(b10);
        }
        on(a10, b10) {
          this.listeners.has(a10) || this.listeners.set(a10, /* @__PURE__ */ new Set()), this.listeners.get(a10)?.add(b10);
        }
        removeAllListeners() {
          this.listeners.clear();
        }
        async unsubscribe(a10) {
          if (a10) for (let b10 of a10) {
            let a11 = this.subscriptions.get(b10);
            if (a11) {
              try {
                a11.controller.abort();
              } catch {
              }
              this.subscriptions.delete(b10);
            }
          }
          else {
            for (let a11 of this.subscriptions.values()) try {
              a11.controller.abort();
            } catch {
            }
            this.subscriptions.clear(), this.removeAllListeners();
          }
        }
        getSubscribedChannels() {
          return [...this.subscriptions.keys()];
        }
      }, ko = class extends hC {
        constructor(a10, b10) {
          super([], { ...b10, headers: { Accept: "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" }, path: ["subscribe", ...a10], streamOptions: { isStreaming: true, onMessage: b10?.streamOptions?.onMessage, signal: b10?.streamOptions?.signal } });
        }
      }, kp = class {
        script;
        sha1;
        redis;
        constructor(a10, b10) {
          this.redis = a10, this.sha1 = this.digest(b10), this.script = b10;
        }
        async eval(a10, b10) {
          return await this.redis.eval(this.script, a10, b10);
        }
        async evalsha(a10, b10) {
          return await this.redis.evalsha(this.sha1, a10, b10);
        }
        async exec(a10, b10) {
          return await this.redis.evalsha(this.sha1, a10, b10).catch(async (c10) => {
            if (c10 instanceof Error && c10.message.toLowerCase().includes("noscript")) return await this.redis.eval(this.script, a10, b10);
            throw c10;
          });
        }
        digest(a10) {
          return hn.stringify(ho(a10));
        }
      }, kq = class {
        client;
        opts;
        enableTelemetry;
        enableAutoPipelining;
        constructor(a10, b10) {
          this.client = a10, this.opts = b10, this.enableTelemetry = b10?.enableTelemetry ?? true, b10?.readYourWrites === false && (this.client.readYourWrites = false), this.enableAutoPipelining = b10?.enableAutoPipelining ?? true;
        }
        get readYourWritesSyncToken() {
          return this.client.upstashSyncToken;
        }
        set readYourWritesSyncToken(a10) {
          this.client.upstashSyncToken = a10;
        }
        get json() {
          return { arrappend: (...a10) => new ir(a10, this.opts).exec(this.client), arrindex: (...a10) => new is(a10, this.opts).exec(this.client), arrinsert: (...a10) => new it(a10, this.opts).exec(this.client), arrlen: (...a10) => new iu(a10, this.opts).exec(this.client), arrpop: (...a10) => new iv(a10, this.opts).exec(this.client), arrtrim: (...a10) => new iw(a10, this.opts).exec(this.client), clear: (...a10) => new ix(a10, this.opts).exec(this.client), del: (...a10) => new iy(a10, this.opts).exec(this.client), forget: (...a10) => new iz(a10, this.opts).exec(this.client), get: (...a10) => new iA(a10, this.opts).exec(this.client), mget: (...a10) => new iB(a10, this.opts).exec(this.client), mset: (...a10) => new iC(a10, this.opts).exec(this.client), numincrby: (...a10) => new iD(a10, this.opts).exec(this.client), nummultby: (...a10) => new iE(a10, this.opts).exec(this.client), objkeys: (...a10) => new iF(a10, this.opts).exec(this.client), objlen: (...a10) => new iG(a10, this.opts).exec(this.client), resp: (...a10) => new iH(a10, this.opts).exec(this.client), set: (...a10) => new iI(a10, this.opts).exec(this.client), strappend: (...a10) => new iJ(a10, this.opts).exec(this.client), strlen: (...a10) => new iK(a10, this.opts).exec(this.client), toggle: (...a10) => new iL(a10, this.opts).exec(this.client), type: (...a10) => new iM(a10, this.opts).exec(this.client) };
        }
        use = (a10) => {
          let b10 = this.client.request.bind(this.client);
          this.client.request = (c10) => a10(c10, b10);
        };
        addTelemetry = (a10) => {
          if (this.enableTelemetry) try {
            this.client.mergeTelemetry(a10);
          } catch {
          }
        };
        createScript(a10) {
          return new kp(this, a10);
        }
        pipeline = () => new kk({ client: this.client, commandOptions: this.opts, multiExec: false });
        autoPipeline = () => function a10(b10, c10) {
          return b10.autoPipelineExecutor || (b10.autoPipelineExecutor = new kl(b10)), new Proxy(b10, { get: (b11, d10) => "pipelineCounter" === d10 ? b11.autoPipelineExecutor.pipelineCounter : "json" === d10 ? a10(b11, true) : d10 in b11 && !(d10 in b11.autoPipelineExecutor.pipeline) ? b11[d10] : (c10 ? "function" == typeof b11.autoPipelineExecutor.pipeline.json[d10] : "function" == typeof b11.autoPipelineExecutor.pipeline[d10]) ? (...a11) => b11.autoPipelineExecutor.withAutoPipeline((b12) => {
            c10 ? b12.json[d10](...a11) : b12[d10](...a11);
          }) : b11.autoPipelineExecutor.pipeline[d10] });
        }(this);
        multi = () => new kk({ client: this.client, commandOptions: this.opts, multiExec: true });
        bitfield = (...a10) => new hG(a10, this.client, this.opts);
        append = (...a10) => new hE(a10, this.opts).exec(this.client);
        bitcount = (...a10) => new hF(a10, this.opts).exec(this.client);
        bitop = (a10, b10, c10, ...d10) => new hH([a10, b10, c10, ...d10], this.opts).exec(this.client);
        bitpos = (...a10) => new hI(a10, this.opts).exec(this.client);
        copy = (...a10) => new hJ(a10, this.opts).exec(this.client);
        dbsize = () => new hK(this.opts).exec(this.client);
        decr = (...a10) => new hL(a10, this.opts).exec(this.client);
        decrby = (...a10) => new hM(a10, this.opts).exec(this.client);
        del = (...a10) => new hN(a10, this.opts).exec(this.client);
        echo = (...a10) => new hO(a10, this.opts).exec(this.client);
        eval = (...a10) => new hP(a10, this.opts).exec(this.client);
        evalsha = (...a10) => new hQ(a10, this.opts).exec(this.client);
        exec = (a10) => new hR(a10, this.opts).exec(this.client);
        exists = (...a10) => new hS(a10, this.opts).exec(this.client);
        expire = (...a10) => new hT(a10, this.opts).exec(this.client);
        expireat = (...a10) => new hU(a10, this.opts).exec(this.client);
        flushall = (a10) => new hV(a10, this.opts).exec(this.client);
        flushdb = (...a10) => new hW(a10, this.opts).exec(this.client);
        geoadd = (...a10) => new hX(a10, this.opts).exec(this.client);
        geopos = (...a10) => new h$(a10, this.opts).exec(this.client);
        geodist = (...a10) => new hY(a10, this.opts).exec(this.client);
        geohash = (...a10) => new hZ(a10, this.opts).exec(this.client);
        geosearch = (...a10) => new h_(a10, this.opts).exec(this.client);
        geosearchstore = (...a10) => new h0(a10, this.opts).exec(this.client);
        get = (...a10) => new h1(a10, this.opts).exec(this.client);
        getbit = (...a10) => new h2(a10, this.opts).exec(this.client);
        getdel = (...a10) => new h3(a10, this.opts).exec(this.client);
        getex = (...a10) => new h4(a10, this.opts).exec(this.client);
        getrange = (...a10) => new h5(a10, this.opts).exec(this.client);
        getset = (a10, b10) => new h6([a10, b10], this.opts).exec(this.client);
        hdel = (...a10) => new h7(a10, this.opts).exec(this.client);
        hexists = (...a10) => new h8(a10, this.opts).exec(this.client);
        hget = (...a10) => new h9(a10, this.opts).exec(this.client);
        hgetall = (...a10) => new ia(a10, this.opts).exec(this.client);
        hincrby = (...a10) => new ib(a10, this.opts).exec(this.client);
        hincrbyfloat = (...a10) => new ic(a10, this.opts).exec(this.client);
        hkeys = (...a10) => new id(a10, this.opts).exec(this.client);
        hlen = (...a10) => new ie(a10, this.opts).exec(this.client);
        hmget = (...a10) => new ig(a10, this.opts).exec(this.client);
        hmset = (a10, b10) => new ih([a10, b10], this.opts).exec(this.client);
        hrandfield = (a10, b10, c10) => new hD([a10, b10, c10], this.opts).exec(this.client);
        hscan = (...a10) => new ii(a10, this.opts).exec(this.client);
        hset = (a10, b10) => new ij([a10, b10], this.opts).exec(this.client);
        hsetnx = (a10, b10, c10) => new ik([a10, b10, c10], this.opts).exec(this.client);
        hstrlen = (...a10) => new il(a10, this.opts).exec(this.client);
        hvals = (...a10) => new im(a10, this.opts).exec(this.client);
        incr = (...a10) => new io(a10, this.opts).exec(this.client);
        incrby = (...a10) => new ip(a10, this.opts).exec(this.client);
        incrbyfloat = (...a10) => new iq(a10, this.opts).exec(this.client);
        keys = (...a10) => new iN(a10, this.opts).exec(this.client);
        lindex = (...a10) => new iO(a10, this.opts).exec(this.client);
        linsert = (a10, b10, c10, d10) => new iP([a10, b10, c10, d10], this.opts).exec(this.client);
        llen = (...a10) => new iQ(a10, this.opts).exec(this.client);
        lmove = (...a10) => new iR(a10, this.opts).exec(this.client);
        lpop = (...a10) => new iT(a10, this.opts).exec(this.client);
        lmpop = (...a10) => new iS(a10, this.opts).exec(this.client);
        lpos = (...a10) => new iU(a10, this.opts).exec(this.client);
        lpush = (a10, ...b10) => new iV([a10, ...b10], this.opts).exec(this.client);
        lpushx = (a10, ...b10) => new iW([a10, ...b10], this.opts).exec(this.client);
        lrange = (...a10) => new iX(a10, this.opts).exec(this.client);
        lrem = (a10, b10, c10) => new iY([a10, b10, c10], this.opts).exec(this.client);
        lset = (a10, b10, c10) => new iZ([a10, b10, c10], this.opts).exec(this.client);
        ltrim = (...a10) => new i$(a10, this.opts).exec(this.client);
        mget = (...a10) => new i_(a10, this.opts).exec(this.client);
        mset = (a10) => new i0([a10], this.opts).exec(this.client);
        msetnx = (a10) => new i1([a10], this.opts).exec(this.client);
        persist = (...a10) => new i2(a10, this.opts).exec(this.client);
        pexpire = (...a10) => new i3(a10, this.opts).exec(this.client);
        pexpireat = (...a10) => new i4(a10, this.opts).exec(this.client);
        pfadd = (...a10) => new i5(a10, this.opts).exec(this.client);
        pfcount = (...a10) => new i6(a10, this.opts).exec(this.client);
        pfmerge = (...a10) => new i7(a10, this.opts).exec(this.client);
        ping = (a10) => new i8(a10, this.opts).exec(this.client);
        psetex = (a10, b10, c10) => new i9([a10, b10, c10], this.opts).exec(this.client);
        psubscribe = (a10) => {
          let b10 = Array.isArray(a10) ? a10 : [a10];
          return new kn(this.client, b10, true);
        };
        pttl = (...a10) => new ja(a10, this.opts).exec(this.client);
        publish = (...a10) => new jb(a10, this.opts).exec(this.client);
        randomkey = () => new jc().exec(this.client);
        rename = (...a10) => new jd(a10, this.opts).exec(this.client);
        renamenx = (...a10) => new je(a10, this.opts).exec(this.client);
        rpop = (...a10) => new jf(a10, this.opts).exec(this.client);
        rpush = (a10, ...b10) => new jg([a10, ...b10], this.opts).exec(this.client);
        rpushx = (a10, ...b10) => new jh([a10, ...b10], this.opts).exec(this.client);
        sadd = (a10, b10, ...c10) => new ji([a10, b10, ...c10], this.opts).exec(this.client);
        scan = (...a10) => new jj(a10, this.opts).exec(this.client);
        scard = (...a10) => new jk(a10, this.opts).exec(this.client);
        scriptExists = (...a10) => new jl(a10, this.opts).exec(this.client);
        scriptFlush = (...a10) => new jm(a10, this.opts).exec(this.client);
        scriptLoad = (...a10) => new jn(a10, this.opts).exec(this.client);
        sdiff = (...a10) => new jo(a10, this.opts).exec(this.client);
        sdiffstore = (...a10) => new jp(a10, this.opts).exec(this.client);
        set = (a10, b10, c10) => new jq([a10, b10, c10], this.opts).exec(this.client);
        setbit = (...a10) => new jr(a10, this.opts).exec(this.client);
        setex = (a10, b10, c10) => new js([a10, b10, c10], this.opts).exec(this.client);
        setnx = (a10, b10) => new jt([a10, b10], this.opts).exec(this.client);
        setrange = (...a10) => new ju(a10, this.opts).exec(this.client);
        sinter = (...a10) => new jv(a10, this.opts).exec(this.client);
        sinterstore = (...a10) => new jw(a10, this.opts).exec(this.client);
        sismember = (a10, b10) => new jx([a10, b10], this.opts).exec(this.client);
        smismember = (a10, b10) => new jz([a10, b10], this.opts).exec(this.client);
        smembers = (...a10) => new jy(a10, this.opts).exec(this.client);
        smove = (a10, b10, c10) => new jA([a10, b10, c10], this.opts).exec(this.client);
        spop = (...a10) => new jB(a10, this.opts).exec(this.client);
        srandmember = (...a10) => new jC(a10, this.opts).exec(this.client);
        srem = (a10, ...b10) => new jD([a10, ...b10], this.opts).exec(this.client);
        sscan = (...a10) => new jE(a10, this.opts).exec(this.client);
        strlen = (...a10) => new jF(a10, this.opts).exec(this.client);
        subscribe = (a10) => {
          let b10 = Array.isArray(a10) ? a10 : [a10];
          return new kn(this.client, b10);
        };
        sunion = (...a10) => new jG(a10, this.opts).exec(this.client);
        sunionstore = (...a10) => new jH(a10, this.opts).exec(this.client);
        time = () => new jI().exec(this.client);
        touch = (...a10) => new jJ(a10, this.opts).exec(this.client);
        ttl = (...a10) => new jK(a10, this.opts).exec(this.client);
        type = (...a10) => new jL(a10, this.opts).exec(this.client);
        unlink = (...a10) => new jM(a10, this.opts).exec(this.client);
        xadd = (...a10) => new jO(a10, this.opts).exec(this.client);
        xack = (...a10) => new jN(a10, this.opts).exec(this.client);
        xdel = (...a10) => new jR(a10, this.opts).exec(this.client);
        xgroup = (...a10) => new jS(a10, this.opts).exec(this.client);
        xread = (...a10) => new jX(a10, this.opts).exec(this.client);
        xreadgroup = (...a10) => new jY(a10, this.opts).exec(this.client);
        xinfo = (...a10) => new jT(a10, this.opts).exec(this.client);
        xlen = (...a10) => new jU(a10, this.opts).exec(this.client);
        xpending = (...a10) => new jV(a10, this.opts).exec(this.client);
        xclaim = (...a10) => new jQ(a10, this.opts).exec(this.client);
        xautoclaim = (...a10) => new jP(a10, this.opts).exec(this.client);
        xtrim = (...a10) => new j$(a10, this.opts).exec(this.client);
        xrange = (...a10) => new jW(a10, this.opts).exec(this.client);
        xrevrange = (...a10) => new jZ(a10, this.opts).exec(this.client);
        zadd = (...a10) => ("score" in a10[1], new j_([a10[0], a10[1], ...a10.slice(2)], this.opts).exec(this.client));
        zcard = (...a10) => new j0(a10, this.opts).exec(this.client);
        zcount = (...a10) => new j1(a10, this.opts).exec(this.client);
        zdiffstore = (...a10) => new ki(a10, this.opts).exec(this.client);
        zincrby = (a10, b10, c10) => new j2([a10, b10, c10], this.opts).exec(this.client);
        zinterstore = (...a10) => new j3(a10, this.opts).exec(this.client);
        zlexcount = (...a10) => new j4(a10, this.opts).exec(this.client);
        zmscore = (...a10) => new kj(a10, this.opts).exec(this.client);
        zpopmax = (...a10) => new j5(a10, this.opts).exec(this.client);
        zpopmin = (...a10) => new j6(a10, this.opts).exec(this.client);
        zrange = (...a10) => new j7(a10, this.opts).exec(this.client);
        zrank = (a10, b10) => new j8([a10, b10], this.opts).exec(this.client);
        zrem = (a10, ...b10) => new j9([a10, ...b10], this.opts).exec(this.client);
        zremrangebylex = (...a10) => new ka(a10, this.opts).exec(this.client);
        zremrangebyrank = (...a10) => new kb(a10, this.opts).exec(this.client);
        zremrangebyscore = (...a10) => new kc(a10, this.opts).exec(this.client);
        zrevrank = (a10, b10) => new kd([a10, b10], this.opts).exec(this.client);
        zscan = (...a10) => new ke(a10, this.opts).exec(this.client);
        zscore = (a10, b10) => new kf([a10, b10], this.opts).exec(this.client);
        zunion = (...a10) => new kg(a10, this.opts).exec(this.client);
        zunionstore = (...a10) => new kh(a10, this.opts).exec(this.client);
      }, kr = c(356).Buffer;
      "u" < typeof atob && (global.atob = (a10) => kr.from(a10, "base64").toString("utf8"));
      var ks = class a10 extends kq {
        constructor(a11) {
          if ("request" in a11) return void super(a11);
          if (a11.url ? (a11.url.startsWith(" ") || a11.url.endsWith(" ") || /\r|\n/.test(a11.url)) && console.warn("[Upstash Redis] The redis url contains whitespace or newline, which can cause errors!") : console.warn("[Upstash Redis] The 'url' property is missing or undefined in your Redis config."), a11.token ? (a11.token.startsWith(" ") || a11.token.endsWith(" ") || /\r|\n/.test(a11.token)) && console.warn("[Upstash Redis] The redis token contains whitespace or newline, which can cause errors!") : console.warn("[Upstash Redis] The 'token' property is missing or undefined in your Redis config."), super(new hx({ baseUrl: a11.url, retry: a11.retry, headers: { authorization: `Bearer ${a11.token}` }, agent: a11.agent, responseEncoding: a11.responseEncoding, cache: a11.cache ?? "no-store", signal: a11.signal, keepAlive: a11.keepAlive, readYourWrites: a11.readYourWrites }), { automaticDeserialization: a11.automaticDeserialization, enableTelemetry: !process.env.UPSTASH_DISABLE_TELEMETRY, latencyLogging: a11.latencyLogging, enableAutoPipelining: a11.enableAutoPipelining }), this.addTelemetry({ runtime: "edge-light", platform: process.env.VERCEL ? "vercel" : process.env.AWS_REGION ? "aws" : "unknown", sdk: "@upstash/redis@v1.34.6" }), this.enableAutoPipelining) return this.autoPipeline();
        }
        static fromEnv(b10) {
          if (void 0 === process.env) throw TypeError('[Upstash Redis] Unable to get environment variables, `process.env` is undefined. If you are deploying to cloudflare, please import from "@upstash/redis/cloudflare" instead');
          let c10 = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
          c10 || console.warn("[Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_URL`");
          let d10 = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
          return d10 || console.warn("[Upstash Redis] Unable to find environment variable: `UPSTASH_REDIS_REST_TOKEN`"), new a10({ ...b10, url: c10, token: d10 });
        }
      };
      let kt = process.env.REDIS_URL, ku = process.env.REDIS_TOKEN, kv = null, kw = kt && kt.startsWith("https://") && !kt.includes("YOUR_UPSTASH_REDIS_URL"), kx = ku && !ku.includes("YOUR_UPSTASH_REDIS_TOKEN") && !ku.includes("PLACEHOLDER");
      function ky(a10, b10, c10) {
        try {
          let d10 = function() {
            if (!kv) throw Error("Redis not configured. Set REDIS_URL and REDIS_TOKEN environment variables.");
            return kv;
          }();
          return new hm.Ratelimit({ redis: d10, limiter: hm.Ratelimit.slidingWindow(a10, `${b10} s`), analytics: true, prefix: `zayron-x:ratelimit:${c10}` });
        } catch {
          return null;
        }
      }
      kw && kx && (kv = new ks({ url: kt, token: ku })), ky(3, 60, "subscribe");
      let kz = ky(5, 60, "login"), kA = ky(3, 60, "register");
      async function kB(a10, b10) {
        if (!a10) return console.error("[SECURITY] Rate limiter unavailable \u2014 denying request for:", b10), { allowed: false, remaining: 0, reset: 60 };
        let c10 = await a10.limit(b10);
        return { allowed: c10.success, remaining: c10.remaining, reset: c10.reset };
      }
      ky(20, 60, "search"), ky(30, 60, "views"), ky(60, 60, "articles"), ky(120, 60, "cves");
      let kC = "experimental-edge";
      function kD(a10) {
        let b10 = process.env.ADMIN_USER, c10 = process.env.ADMIN_PASSWORD;
        if (!b10 || !c10) return false;
        let d10 = a10.headers.get("authorization") ?? "";
        if (!d10.startsWith("Basic ")) return false;
        try {
          let a11 = d10.slice(6), [e10, ...f10] = atob(a11).split(":"), g10 = f10.join(":");
          return e10 === b10 && g10 === c10;
        } catch {
          return false;
        }
      }
      let kE = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
      var kF = Object.freeze({ __proto__: null, config: kE, default: async function(a10) {
        let b10, { pathname: c10 } = a10.nextUrl, d10 = (b10 = new Uint8Array(16), crypto.getRandomValues(b10), btoa(String.fromCharCode(...b10)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")), e10 = aD.next({ request: a10 });
        if (c10.startsWith("/api/remediate") || c10.startsWith("/api/download-sitrep")) {
          let b11 = hj(process.env.SUPABASE_URL ?? "https://xdfndojvqazffcjngglr.supabase.co", process.env.SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm5kb2p2cWF6ZmZjam5nZ2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDQ0MDQsImV4cCI6MjA5MzgyMDQwNH0.UGitfLsGYqQIATh6qK-uT-ZsTXpf7zFArE3QvR9JEYw", { cookies: { getAll: () => a10.cookies.getAll(), setAll(b12) {
            for (let { name: c12, value: d12 } of b12) a10.cookies.set(c12, d12);
          } } }), { data: { user: c11 } } = await b11.auth.getUser();
          if (!c11) return aD.json({ error: "Security clearance required. ZAYRON-X node access denied." }, { status: 401 });
          let { data: d11, error: e11 } = await b11.from("profiles").select("clearance_level").eq("id", c11.id).single();
          if (e11 || !d11 || "SUBSCRIBER" !== d11.clearance_level) return aD.json({ error: "Security clearance required. ZAYRON-X node access denied." }, { status: 401 });
        }
        if ("/api/seed-analysts" === c10 && !kD(a10)) return aD.json({ error: "Admin credentials required for database seeding." }, { status: 401 });
        if ("/login" === c10 || "/register" === c10) {
          let b11 = function(a11) {
            let b12 = "true" === process.env.CHAOS_STRIP_CF_HEADERS ? null : a11.headers.get("CF-Connecting-IP");
            if (b12) return b12.trim();
            let c11 = a11.headers.get("x-forwarded-for");
            if (c11) {
              let a12 = c11.split(","), b13 = a12[0]?.trim();
              if (b13) return b13;
            }
            return a11.headers.get("x-real-ip")?.trim() ?? "unknown";
          }(a10), d11 = "/login" === c10 ? kz : kA, { allowed: e11, remaining: f11 } = await kB(d11, `${c10}:${b11}`);
          if (!e11) return aD.json({ error: "Too many requests. Please wait and try again." }, { status: 429, headers: { "Retry-After": "60", "X-RateLimit-Remaining": String(f11) } });
        }
        if ("/auth/login" === c10) {
          let b11 = a10.nextUrl.clone();
          return b11.pathname = "/login", aD.redirect(b11);
        }
        if (c10.startsWith("/admin") && !kD(a10)) return new aD("Authentication required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="ZAYRON-X Admin", charset="UTF-8"', "Content-Type": "text/plain" } });
        var f10 = e10 = await hl(a10);
        a10.headers.set("x-csp-nonce", d10);
        let g10 = f10.headers.get("Content-Security-Policy");
        if (g10) {
          !g10.includes("'unsafe-inline'") && g10.includes("style-src") && (g10 = g10.replace("style-src", "style-src 'unsafe-inline'"));
          let a11 = g10.replace(/'strict-dynamic'/, `'nonce-${d10}' 'strict-dynamic'`);
          f10.headers.set("Content-Security-Policy", a11);
        } else g10 = `default-src 'self'; script-src 'self' *.supabase.co 'nonce-${d10}' 'strict-dynamic'; style-src 'self' fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: blob: images.unsplash.com *.supabase.co *.unsplash.com; connect-src 'self' *.supabase.co; font-src 'self' fonts.gstatic.com; frame-src 'self'; object-src 'none'; base-uri 'self'`, f10.headers.set("Content-Security-Policy", g10);
        let h10 = (f10.headers.get("Content-Security-Policy") ?? "").replace(/\b'unsafe-inline'\b/g, "").trim() + "; report-uri /api/csp-report";
        return f10.headers.set("Content-Security-Policy-Report-Only", h10), e10;
      }, runtime: kC });
      "middleware" in kF && "function" == typeof kF.middleware ? j = kF.middleware : "default" in kF && "function" == typeof kF.default ? k = kF.default : "function" == typeof kF && (k = kF);
      let kG = j ? dK(j) : void 0, kH = k ? dK(k) : void 0;
      Object.values({ NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401 });
      let kI = { ...O }, kJ = "/middleware", kK = (0, kI.middleware || kI.default);
      class kL extends Error {
        constructor(a10) {
          super(a10), this.stack = "";
        }
      }
      if ("function" != typeof kK) throw new kL(`The Middleware file "${kJ}" must export a function named \`middleware\` or a default function.`);
      let kM = (a10) => b0({ ...a10, IncrementalCache: cE, incrementalCacheHandler: null, page: kJ, handler: async (...a11) => {
        try {
          return await kK(...a11);
        } catch (e10) {
          let b10 = a11[0], c10 = new URL(b10.url), d10 = c10.pathname + c10.search;
          throw await S(e10, { path: d10, method: b10.method, headers: Object.fromEntries(b10.headers.entries()) }, { routerKind: "Pages Router", routePath: "/proxy", routeType: "proxy", revalidateReason: void 0 }), e10;
        }
      } });
      async function kN(a10, b10) {
        let c10 = await kM({ request: { url: a10.url, method: a10.method, headers: ae(a10.headers), nextConfig: { basePath: "", i18n: "", trailingSlash: false, experimental: { cacheLife: { default: { stale: 300, revalidate: 900, expire: 4294967294 }, seconds: { stale: 30, revalidate: 1, expire: 60 }, minutes: { stale: 300, revalidate: 60, expire: 3600 }, hours: { stale: 300, revalidate: 3600, expire: 86400 }, days: { stale: 300, revalidate: 86400, expire: 604800 }, weeks: { stale: 300, revalidate: 604800, expire: 2592e3 }, max: { stale: 300, revalidate: 2592e3, expire: 31536e3 } }, authInterrupts: false, clientParamParsingOrigins: [] } }, page: { name: kJ }, body: "GET" !== a10.method && "HEAD" !== a10.method ? a10.body ?? void 0 : void 0, waitUntil: b10.waitUntil, requestMeta: b10.requestMeta, signal: b10.signal || new AbortController().signal } });
        return null == b10.waitUntil || b10.waitUntil.call(b10, c10.waitUntil), c10.response;
      }
      let kO = kM;
    } }, (a) => {
      var b = a(a.s = 898);
      (_ENTRIES = "u" < typeof _ENTRIES ? {} : _ENTRIES).middleware_middleware = b;
    }]);
  }
});

// node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js
var edgeFunctionHandler_exports = {};
__export(edgeFunctionHandler_exports, {
  default: () => edgeFunctionHandler
});
async function edgeFunctionHandler(request) {
  const path3 = new URL(request.url).pathname;
  const routes = globalThis._ROUTES;
  const correspondingRoute = routes.find((route) => route.regex.some((r) => new RegExp(r).test(path3)));
  if (!correspondingRoute) {
    throw new Error(`No route found for ${request.url}`);
  }
  const entry = await self._ENTRIES[`middleware_${correspondingRoute.name}`];
  const result = await entry.default({
    page: correspondingRoute.page,
    request: {
      ...request,
      page: {
        name: correspondingRoute.name
      }
    }
  });
  globalThis.__openNextAls.getStore()?.pendingPromiseRunner.add(result.waitUntil);
  const response = result.response;
  return response;
}
var init_edgeFunctionHandler = __esm({
  "node_modules/@opennextjs/aws/dist/core/edgeFunctionHandler.js"() {
    globalThis._ENTRIES = {};
    globalThis.self = globalThis;
    globalThis._ROUTES = [{ "name": "middleware", "page": "/", "regex": ["^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/static|_next\\/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$"] }];
    require_edge_instrumentation();
    require_edge_runtime_webpack();
    require_middleware();
  }
});

// node_modules/@opennextjs/aws/dist/utils/promise.js
init_logger();

// node_modules/@opennextjs/aws/dist/utils/requestCache.js
var RequestCache = class {
  _caches = /* @__PURE__ */ new Map();
  /**
   * Returns the Map registered under `key`.
   * If no Map exists yet for that key, a new empty Map is created, stored, and returned.
   * Repeated calls with the same key always return the **same** Map instance.
   */
  getOrCreate(key) {
    let cache = this._caches.get(key);
    if (!cache) {
      cache = /* @__PURE__ */ new Map();
      this._caches.set(key, cache);
    }
    return cache;
  }
};

// node_modules/@opennextjs/aws/dist/utils/promise.js
var DetachedPromise = class {
  resolve;
  reject;
  promise;
  constructor() {
    let resolve;
    let reject;
    this.promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    this.resolve = resolve;
    this.reject = reject;
  }
};
var DetachedPromiseRunner = class {
  promises = [];
  withResolvers() {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    return detachedPromise;
  }
  add(promise) {
    const detachedPromise = new DetachedPromise();
    this.promises.push(detachedPromise);
    promise.then(detachedPromise.resolve, detachedPromise.reject);
  }
  async await() {
    debug(`Awaiting ${this.promises.length} detached promises`);
    const results = await Promise.allSettled(this.promises.map((p) => p.promise));
    const rejectedPromises = results.filter((r) => r.status === "rejected");
    rejectedPromises.forEach((r) => {
      error(r.reason);
    });
  }
};
async function awaitAllDetachedPromise() {
  const store = globalThis.__openNextAls.getStore();
  const promisesToAwait = store?.pendingPromiseRunner.await() ?? Promise.resolve();
  if (store?.waitUntil) {
    store.waitUntil(promisesToAwait);
    return;
  }
  await promisesToAwait;
}
function provideNextAfterProvider() {
  const NEXT_REQUEST_CONTEXT_SYMBOL = Symbol.for("@next/request-context");
  const VERCEL_REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
  const store = globalThis.__openNextAls.getStore();
  const waitUntil = store?.waitUntil ?? ((promise) => store?.pendingPromiseRunner.add(promise));
  const nextAfterContext = {
    get: () => ({
      waitUntil
    })
  };
  globalThis[NEXT_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  if (process.env.EMULATE_VERCEL_REQUEST_CONTEXT) {
    globalThis[VERCEL_REQUEST_CONTEXT_SYMBOL] = nextAfterContext;
  }
}
function runWithOpenNextRequestContext({ isISRRevalidation, waitUntil, requestId = Math.random().toString(36) }, fn) {
  return globalThis.__openNextAls.run({
    requestId,
    pendingPromiseRunner: new DetachedPromiseRunner(),
    isISRRevalidation,
    waitUntil,
    writtenTags: /* @__PURE__ */ new Set(),
    requestCache: new RequestCache()
  }, async () => {
    provideNextAfterProvider();
    let result;
    try {
      result = await fn();
    } finally {
      await awaitAllDetachedPromise();
    }
    return result;
  });
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/resolve.js
async function resolveConverter(converter2) {
  if (typeof converter2 === "function") {
    return converter2();
  }
  const m_1 = await Promise.resolve().then(() => (init_edge(), edge_exports));
  return m_1.default;
}
async function resolveWrapper(wrapper) {
  if (typeof wrapper === "function") {
    return wrapper();
  }
  const m_1 = await Promise.resolve().then(() => (init_cloudflare_edge(), cloudflare_edge_exports));
  return m_1.default;
}
async function resolveOriginResolver(originResolver) {
  if (typeof originResolver === "function") {
    return originResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_pattern_env(), pattern_env_exports));
  return m_1.default;
}
async function resolveAssetResolver(assetResolver) {
  if (typeof assetResolver === "function") {
    return assetResolver();
  }
  const m_1 = await Promise.resolve().then(() => (init_dummy(), dummy_exports));
  return m_1.default;
}
async function resolveProxyRequest(proxyRequest) {
  if (typeof proxyRequest === "function") {
    return proxyRequest();
  }
  const m_1 = await Promise.resolve().then(() => (init_fetch(), fetch_exports));
  return m_1.default;
}

// node_modules/@opennextjs/aws/dist/core/createGenericHandler.js
async function createGenericHandler(handler3) {
  const config = await import("./open-next.config.mjs").then((m) => m.default);
  globalThis.openNextConfig = config;
  const handlerConfig = config[handler3.type];
  const override = handlerConfig && "override" in handlerConfig ? handlerConfig.override : void 0;
  const converter2 = await resolveConverter(override?.converter);
  const { name, wrapper } = await resolveWrapper(override?.wrapper);
  debug("Using wrapper", name);
  return wrapper(handler3.handler, converter2);
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
import crypto2 from "node:crypto";
import { parse as parseQs, stringify as stringifyQs } from "node:querystring";

// node_modules/@opennextjs/aws/dist/adapters/config/index.js
init_logger();
import path from "node:path";
globalThis.__dirname ??= "";
var NEXT_DIR = path.join(__dirname, ".next");
var OPEN_NEXT_DIR = path.join(__dirname, ".open-next");
debug({ NEXT_DIR, OPEN_NEXT_DIR });
var NextConfig = { "env": { "_sentryRewriteFramesDistDir": ".next", "_sentryRewriteFramesAssetPrefixPath": "", "_sentryRewritesTunnelPath": "/api/monitoring", "NEXT_PUBLIC_SUPABASE_URL": "https://xdfndojvqazffcjngglr.supabase.co", "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZm5kb2p2cWF6ZmZjam5nZ2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDQ0MDQsImV4cCI6MjA5MzgyMDQwNH0.UGitfLsGYqQIATh6qK-uT-ZsTXpf7zFArE3QvR9JEYw" }, "typescript": { "ignoreBuildErrors": true }, "typedRoutes": false, "distDir": ".next", "cleanDistDir": true, "assetPrefix": "", "cacheMaxMemorySize": 52428800, "configOrigin": "next.config.ts", "useFileSystemPublicRoutes": true, "generateEtags": true, "pageExtensions": ["tsx", "ts", "jsx", "js"], "poweredByHeader": false, "compress": true, "images": { "deviceSizes": [390, 640, 768, 1024, 1280, 1536], "imageSizes": [16, 32, 48, 64, 96, 128, 256], "path": "/_next/image", "loader": "default", "loaderFile": "", "domains": [], "disableStaticImages": false, "minimumCacheTTL": 14400, "formats": ["image/avif", "image/webp"], "maximumRedirects": 3, "maximumResponseBody": 5e7, "dangerouslyAllowLocalIP": false, "dangerouslyAllowSVG": false, "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;", "contentDispositionType": "attachment", "localPatterns": [{ "pathname": "**", "search": "" }], "remotePatterns": [{ "protocol": "https", "hostname": "images.unsplash.com" }, { "protocol": "https", "hostname": "*.supabase.co" }], "qualities": [75], "unoptimized": false, "customCacheHandler": false }, "devIndicators": { "position": "bottom-left" }, "onDemandEntries": { "maxInactiveAge": 6e4, "pagesBufferLength": 5 }, "basePath": "", "sassOptions": {}, "trailingSlash": false, "i18n": null, "productionBrowserSourceMaps": false, "excludeDefaultMomentLocales": true, "reactProductionProfiling": false, "reactStrictMode": true, "reactMaxHeadersLength": 6e3, "httpAgentOptions": { "keepAlive": true }, "logging": { "serverFunctions": true, "browserToTerminal": "warn" }, "compiler": {}, "expireTime": 31536e3, "staticPageGenerationTimeout": 60, "output": "standalone", "modularizeImports": { "@mui/icons-material": { "transform": "@mui/icons-material/{{member}}" }, "lodash": { "transform": "lodash/{{member}}" } }, "outputFileTracingRoot": "D:\\Desktop\\zayron-app\\gerasys-online", "cacheComponents": false, "cacheLife": { "default": { "stale": 300, "revalidate": 900, "expire": 4294967294 }, "seconds": { "stale": 30, "revalidate": 1, "expire": 60 }, "minutes": { "stale": 300, "revalidate": 60, "expire": 3600 }, "hours": { "stale": 300, "revalidate": 3600, "expire": 86400 }, "days": { "stale": 300, "revalidate": 86400, "expire": 604800 }, "weeks": { "stale": 300, "revalidate": 604800, "expire": 2592e3 }, "max": { "stale": 300, "revalidate": 2592e3, "expire": 31536e3 } }, "cacheHandlers": {}, "experimental": { "appNewScrollHandler": false, "useSkewCookie": false, "cssChunking": true, "multiZoneDraftMode": false, "appNavFailHandling": false, "prerenderEarlyExit": true, "serverMinification": true, "linkNoTouchStart": false, "caseSensitiveRoutes": false, "cachedNavigations": false, "partialFallbacks": false, "dynamicOnHover": false, "varyParams": false, "prefetchInlining": false, "preloadEntriesOnStart": true, "clientRouterFilter": true, "clientRouterFilterRedirects": false, "fetchCacheKeyPrefix": "", "proxyPrefetch": "flexible", "optimisticClientCache": true, "manualClientBasePath": false, "cpus": 1, "memoryBasedWorkersCount": false, "imgOptConcurrency": null, "imgOptTimeoutInSeconds": 7, "imgOptMaxInputPixels": 268402689, "imgOptSequentialRead": null, "imgOptSkipMetadata": null, "isrFlushToDisk": true, "workerThreads": false, "optimizeCss": false, "nextScriptWorkers": false, "scrollRestoration": false, "externalDir": false, "disableOptimizedLoading": false, "gzipSize": true, "craCompat": false, "esmExternals": true, "fullySpecified": false, "swcTraceProfiling": false, "forceSwcTransforms": false, "largePageDataBytes": 128e3, "typedEnv": false, "clientTraceMetadata": ["baggage", "sentry-trace"], "parallelServerCompiles": false, "parallelServerBuildTraces": false, "ppr": false, "authInterrupts": false, "webpackMemoryOptimizations": true, "optimizeServerReact": true, "strictRouteTypes": false, "viewTransition": false, "removeUncaughtErrorAndRejectionListeners": false, "validateRSCRequestHeaders": false, "staleTimes": { "dynamic": 0, "static": 300 }, "reactDebugChannel": true, "serverComponentsHmrCache": true, "staticGenerationMaxConcurrency": 8, "staticGenerationMinPagesPerWorker": 25, "transitionIndicator": false, "gestureTransition": false, "inlineCss": false, "useCache": false, "globalNotFound": false, "browserDebugInfoInTerminal": "warn", "lockDistDir": true, "proxyClientMaxBodySize": 10485760, "hideLogsAfterAbort": false, "mcpServer": true, "turbopackFileSystemCacheForDev": true, "turbopackFileSystemCacheForBuild": false, "turbopackInferModuleSideEffects": true, "turbopackPluginRuntimeStrategy": "childProcesses", "optimizePackageImports": ["lucide-react", "date-fns", "lodash-es", "ramda", "antd", "react-bootstrap", "ahooks", "@ant-design/icons", "@headlessui/react", "@headlessui-float/react", "@heroicons/react/20/solid", "@heroicons/react/24/solid", "@heroicons/react/24/outline", "@visx/visx", "@tremor/react", "rxjs", "@mui/material", "@mui/icons-material", "recharts", "react-use", "effect", "@effect/schema", "@effect/platform", "@effect/platform-node", "@effect/platform-browser", "@effect/platform-bun", "@effect/sql", "@effect/sql-mssql", "@effect/sql-mysql2", "@effect/sql-pg", "@effect/sql-sqlite-node", "@effect/sql-sqlite-bun", "@effect/sql-sqlite-wasm", "@effect/sql-sqlite-react-native", "@effect/rpc", "@effect/rpc-http", "@effect/typeclass", "@effect/experimental", "@effect/opentelemetry", "@material-ui/core", "@material-ui/icons", "@tabler/icons-react", "mui-core", "react-icons/ai", "react-icons/bi", "react-icons/bs", "react-icons/cg", "react-icons/ci", "react-icons/di", "react-icons/fa", "react-icons/fa6", "react-icons/fc", "react-icons/fi", "react-icons/gi", "react-icons/go", "react-icons/gr", "react-icons/hi", "react-icons/hi2", "react-icons/im", "react-icons/io", "react-icons/io5", "react-icons/lia", "react-icons/lib", "react-icons/lu", "react-icons/md", "react-icons/pi", "react-icons/ri", "react-icons/rx", "react-icons/si", "react-icons/sl", "react-icons/tb", "react-icons/tfi", "react-icons/ti", "react-icons/vsc", "react-icons/wi"], "trustHostHeader": false, "isExperimentalCompile": false }, "htmlLimitedBots": "[\\w-]+-Google|Google-[\\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight", "bundlePagesRouterDependencies": false, "configFileName": "next.config.ts", "turbopack": { "root": "D:\\Desktop\\zayron-app\\gerasys-online" }, "distDirRoot": ".next", "_originalRewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/monitoring(/?)", "has": [{ "type": "query", "key": "o", "value": "(?<orgid>\\d*)" }, { "type": "query", "key": "p", "value": "(?<projectid>\\d*)" }, { "type": "query", "key": "r", "value": "(?<region>[a-z]{2})" }], "destination": "https://o:orgid.ingest.:region.sentry.io/api/:projectid/envelope/?hsts=0" }, { "source": "/api/monitoring(/?)", "has": [{ "type": "query", "key": "o", "value": "(?<orgid>\\d*)" }, { "type": "query", "key": "p", "value": "(?<projectid>\\d*)" }], "destination": "https://o:orgid.ingest.sentry.io/api/:projectid/envelope/?hsts=0" }], "fallback": [] }, "_originalRedirects": [{ "source": "/article/:slug", "destination": "/intelligence/threat-intelligence/:slug", "permanent": true }] };
var BuildId = "6HgLtW9DnlLryF6RjMYSe";
var RoutesManifest = { "basePath": "", "rewrites": { "beforeFiles": [], "afterFiles": [{ "source": "/api/monitoring(/?)", "has": [{ "type": "query", "key": "o", "value": "(?<orgid>\\d*)" }, { "type": "query", "key": "p", "value": "(?<projectid>\\d*)" }, { "type": "query", "key": "r", "value": "(?<region>[a-z]{2})" }], "destination": "https://o:orgid.ingest.:region.sentry.io/api/:projectid/envelope/?hsts=0", "regex": "^/api/monitoring(/?)(?:/)?$" }, { "source": "/api/monitoring(/?)", "has": [{ "type": "query", "key": "o", "value": "(?<orgid>\\d*)" }, { "type": "query", "key": "p", "value": "(?<projectid>\\d*)" }], "destination": "https://o:orgid.ingest.sentry.io/api/:projectid/envelope/?hsts=0", "regex": "^/api/monitoring(/?)(?:/)?$" }], "fallback": [] }, "redirects": [{ "source": "/:path+/", "destination": "/:path+", "internal": true, "priority": true, "statusCode": 308, "regex": "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$" }, { "source": "/article/:slug", "destination": "/intelligence/threat-intelligence/:slug", "statusCode": 308, "regex": "^(?!/_next)/article(?:/([^/]+?))(?:/)?$" }], "routes": { "static": [{ "page": "/", "regex": "^/(?:/)?$", "routeKeys": {}, "namedRegex": "^/(?:/)?$" }, { "page": "/_not-found", "regex": "^/_not\\-found(?:/)?$", "routeKeys": {}, "namedRegex": "^/_not\\-found(?:/)?$" }, { "page": "/about", "regex": "^/about(?:/)?$", "routeKeys": {}, "namedRegex": "^/about(?:/)?$" }, { "page": "/admin", "regex": "^/admin(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin(?:/)?$" }, { "page": "/admin/articles", "regex": "^/admin/articles(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/articles(?:/)?$" }, { "page": "/admin/cves", "regex": "^/admin/cves(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/cves(?:/)?$" }, { "page": "/admin/dashboard", "regex": "^/admin/dashboard(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/dashboard(?:/)?$" }, { "page": "/admin/feeds", "regex": "^/admin/feeds(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/feeds(?:/)?$" }, { "page": "/admin/settings", "regex": "^/admin/settings(?:/)?$", "routeKeys": {}, "namedRegex": "^/admin/settings(?:/)?$" }, { "page": "/analysts", "regex": "^/analysts(?:/)?$", "routeKeys": {}, "namedRegex": "^/analysts(?:/)?$" }, { "page": "/api/articles", "regex": "^/api/articles(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/articles(?:/)?$" }, { "page": "/api/csp-report", "regex": "^/api/csp\\-report(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/csp\\-report(?:/)?$" }, { "page": "/api/cves", "regex": "^/api/cves(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/cves(?:/)?$" }, { "page": "/api/db-status", "regex": "^/api/db\\-status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/db\\-status(?:/)?$" }, { "page": "/api/download-sitrep", "regex": "^/api/download\\-sitrep(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/download\\-sitrep(?:/)?$" }, { "page": "/api/og", "regex": "^/api/og(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/og(?:/)?$" }, { "page": "/api/remediate", "regex": "^/api/remediate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/remediate(?:/)?$" }, { "page": "/api/revalidate", "regex": "^/api/revalidate(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/revalidate(?:/)?$" }, { "page": "/api/rss", "regex": "^/api/rss(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/rss(?:/)?$" }, { "page": "/api/search", "regex": "^/api/search(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/search(?:/)?$" }, { "page": "/api/seed-analysts", "regex": "^/api/seed\\-analysts(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/seed\\-analysts(?:/)?$" }, { "page": "/api/status", "regex": "^/api/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/status(?:/)?$" }, { "page": "/api/subscribe", "regex": "^/api/subscribe(?:/)?$", "routeKeys": {}, "namedRegex": "^/api/subscribe(?:/)?$" }, { "page": "/auth/callback", "regex": "^/auth/callback(?:/)?$", "routeKeys": {}, "namedRegex": "^/auth/callback(?:/)?$" }, { "page": "/contact", "regex": "^/contact(?:/)?$", "routeKeys": {}, "namedRegex": "^/contact(?:/)?$" }, { "page": "/cve", "regex": "^/cve(?:/)?$", "routeKeys": {}, "namedRegex": "^/cve(?:/)?$" }, { "page": "/dark-web-recon", "regex": "^/dark\\-web\\-recon(?:/)?$", "routeKeys": {}, "namedRegex": "^/dark\\-web\\-recon(?:/)?$" }, { "page": "/developers", "regex": "^/developers(?:/)?$", "routeKeys": {}, "namedRegex": "^/developers(?:/)?$" }, { "page": "/dummy", "regex": "^/dummy(?:/)?$", "routeKeys": {}, "namedRegex": "^/dummy(?:/)?$" }, { "page": "/intelligence/operations", "regex": "^/intelligence/operations(?:/)?$", "routeKeys": {}, "namedRegex": "^/intelligence/operations(?:/)?$" }, { "page": "/intelligence/threat-intelligence", "regex": "^/intelligence/threat\\-intelligence(?:/)?$", "routeKeys": {}, "namedRegex": "^/intelligence/threat\\-intelligence(?:/)?$" }, { "page": "/login", "regex": "^/login(?:/)?$", "routeKeys": {}, "namedRegex": "^/login(?:/)?$" }, { "page": "/news", "regex": "^/news(?:/)?$", "routeKeys": {}, "namedRegex": "^/news(?:/)?$" }, { "page": "/offline", "regex": "^/offline(?:/)?$", "routeKeys": {}, "namedRegex": "^/offline(?:/)?$" }, { "page": "/privacy", "regex": "^/privacy(?:/)?$", "routeKeys": {}, "namedRegex": "^/privacy(?:/)?$" }, { "page": "/programming", "regex": "^/programming(?:/)?$", "routeKeys": {}, "namedRegex": "^/programming(?:/)?$" }, { "page": "/register", "regex": "^/register(?:/)?$", "routeKeys": {}, "namedRegex": "^/register(?:/)?$" }, { "page": "/robots.txt", "regex": "^/robots\\.txt(?:/)?$", "routeKeys": {}, "namedRegex": "^/robots\\.txt(?:/)?$" }, { "page": "/search", "regex": "^/search(?:/)?$", "routeKeys": {}, "namedRegex": "^/search(?:/)?$" }, { "page": "/sitemap.xml", "regex": "^/sitemap\\.xml(?:/)?$", "routeKeys": {}, "namedRegex": "^/sitemap\\.xml(?:/)?$" }, { "page": "/status", "regex": "^/status(?:/)?$", "routeKeys": {}, "namedRegex": "^/status(?:/)?$" }, { "page": "/terms", "regex": "^/terms(?:/)?$", "routeKeys": {}, "namedRegex": "^/terms(?:/)?$" }, { "page": "/tools", "regex": "^/tools(?:/)?$", "routeKeys": {}, "namedRegex": "^/tools(?:/)?$" }, { "page": "/vdp", "regex": "^/vdp(?:/)?$", "routeKeys": {}, "namedRegex": "^/vdp(?:/)?$" }], "dynamic": [{ "page": "/admin/feeds/[id]", "regex": "^/admin/feeds/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/admin/feeds/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/api/articles/[slug]", "regex": "^/api/articles/([^/]+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/api/articles/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/api/views/[id]", "regex": "^/api/views/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/api/views/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/article/[slug]", "regex": "^/article/([^/]+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/article/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/cve/[cveId]", "regex": "^/cve/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcveId": "nxtPcveId" }, "namedRegex": "^/cve/(?<nxtPcveId>[^/]+?)(?:/)?$" }, { "page": "/intelligence/[category]", "regex": "^/intelligence/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory" }, "namedRegex": "^/intelligence/(?<nxtPcategory>[^/]+?)(?:/)?$" }, { "page": "/intelligence/[category]/[slug]", "regex": "^/intelligence/([^/]+?)/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory", "nxtPslug": "nxtPslug" }, "namedRegex": "^/intelligence/(?<nxtPcategory>[^/]+?)/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/threats/[id]", "regex": "^/threats/([^/]+?)(?:/)?$", "routeKeys": { "nxtPid": "nxtPid" }, "namedRegex": "^/threats/(?<nxtPid>[^/]+?)(?:/)?$" }, { "page": "/tools/[slug]", "regex": "^/tools/([^/]+?)(?:/)?$", "routeKeys": { "nxtPslug": "nxtPslug" }, "namedRegex": "^/tools/(?<nxtPslug>[^/]+?)(?:/)?$" }, { "page": "/[category]", "regex": "^/([^/]+?)(?:/)?$", "routeKeys": { "nxtPcategory": "nxtPcategory" }, "namedRegex": "^/(?<nxtPcategory>[^/]+?)(?:/)?$" }], "data": { "static": [], "dynamic": [] } }, "locales": [] };
var ConfigHeaders = [{ "source": "/(.*)", "headers": [{ "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' *.supabase.co 'strict-dynamic'; style-src 'self' fonts.googleapis.com 'unsafe-inline'; img-src 'self' data: blob: images.unsplash.com *.supabase.co *.unsplash.com; connect-src 'self' *.supabase.co; font-src 'self' fonts.gstatic.com; frame-src 'self'; object-src 'none'; base-uri 'self'" }, { "key": "X-Frame-Options", "value": "DENY" }, { "key": "X-Content-Type-Options", "value": "nosniff" }, { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }, { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }, { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }], "regex": "^(?:/(.*))(?:/)?$" }, { "source": "/_next/static/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }], "regex": "^/_next/static(?:/(.*))(?:/)?$" }];
var PrerenderManifest = { "version": 4, "routes": { "/api/rss": { "initialHeaders": { "cache-control": "public, max-age=3600, stale-while-revalidate=300", "content-type": "application/xml; charset=utf-8", "x-next-cache-tags": "_N_T_/layout,_N_T_/api/layout,_N_T_/api/rss/layout,_N_T_/api/rss/route,_N_T_/api/rss" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": 3600, "initialExpireSeconds": 31536e3, "srcRoute": "/api/rss", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/robots.txt": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "text/plain", "x-next-cache-tags": "_N_T_/layout,_N_T_/robots.txt/layout,_N_T_/robots.txt/route,_N_T_/robots.txt" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/robots.txt", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] }, "/sitemap.xml": { "initialHeaders": { "cache-control": "public, max-age=0, must-revalidate", "content-type": "application/xml", "x-next-cache-tags": "_N_T_/layout,_N_T_/sitemap.xml/layout,_N_T_/sitemap.xml/route,_N_T_/sitemap.xml" }, "experimentalBypassFor": [{ "type": "header", "key": "next-action" }, { "type": "header", "key": "content-type", "value": "multipart/form-data;.*" }], "initialRevalidateSeconds": false, "srcRoute": "/sitemap.xml", "dataRoute": null, "allowHeader": ["host", "x-matched-path", "x-prerender-revalidate", "x-prerender-revalidate-if-generated", "x-next-revalidated-tags", "x-next-revalidate-tag-token"] } }, "dynamicRoutes": {}, "notFoundRoutes": [], "preview": { "previewModeId": "1097c994962e6c87a85eb68104960df2", "previewModeSigningKey": "fea9bd00811bbd285f93dfb1ced0f2e6981a33702a1e14ce3a92569741f643fc", "previewModeEncryptionKey": "f71d3de22aa388d7f49706b73d271605335f38a75ba9dbb507de88d75672a6be" } };
var MiddlewareManifest = { "version": 3, "middleware": { "/": { "files": ["server/edge-instrumentation.js", "server/edge-runtime-webpack.js", "server/middleware.js"], "entrypoint": "server/middleware.js", "name": "middleware", "page": "/", "matchers": [{ "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next\\/static|_next\\/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$", "originalSource": "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)" }], "wasm": [], "assets": [], "env": { "__NEXT_BUILD_ID": "6HgLtW9DnlLryF6RjMYSe", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY": "J/HoWalkzDMzs8mIyrGEiapM+d6sf/eSZQ5t35YLNd8=", "__NEXT_PREVIEW_MODE_ID": "1097c994962e6c87a85eb68104960df2", "__NEXT_PREVIEW_MODE_SIGNING_KEY": "fea9bd00811bbd285f93dfb1ced0f2e6981a33702a1e14ce3a92569741f643fc", "__NEXT_PREVIEW_MODE_ENCRYPTION_KEY": "f71d3de22aa388d7f49706b73d271605335f38a75ba9dbb507de88d75672a6be" } } }, "functions": {}, "sortedMiddleware": ["/"] };
var AppPathRoutesManifest = { "/_not-found/page": "/_not-found", "/api/articles/route": "/api/articles", "/api/csp-report/route": "/api/csp-report", "/api/cves/route": "/api/cves", "/api/download-sitrep/route": "/api/download-sitrep", "/api/og/route": "/api/og", "/api/remediate/route": "/api/remediate", "/api/revalidate/route": "/api/revalidate", "/api/search/route": "/api/search", "/api/seed-analysts/route": "/api/seed-analysts", "/api/subscribe/route": "/api/subscribe", "/api/views/[id]/route": "/api/views/[id]", "/auth/callback/route": "/auth/callback", "/robots.txt/route": "/robots.txt", "/sitemap.xml/route": "/sitemap.xml", "/api/articles/[slug]/route": "/api/articles/[slug]", "/api/db-status/route": "/api/db-status", "/api/rss/route": "/api/rss", "/api/status/route": "/api/status", "/news/page": "/news", "/offline/page": "/offline", "/(site)/developers/page": "/developers", "/(site)/[category]/page": "/[category]", "/(site)/about/page": "/about", "/(site)/analysts/page": "/analysts", "/(site)/article/[slug]/page": "/article/[slug]", "/(site)/contact/page": "/contact", "/(site)/cve/[cveId]/page": "/cve/[cveId]", "/(site)/cve/page": "/cve", "/(site)/dark-web-recon/page": "/dark-web-recon", "/(site)/privacy/page": "/privacy", "/(site)/page": "/", "/(site)/programming/page": "/programming", "/(site)/search/page": "/search", "/(site)/terms/page": "/terms", "/(site)/status/page": "/status", "/(site)/tools/[slug]/page": "/tools/[slug]", "/(site)/tools/page": "/tools", "/(site)/vdp/page": "/vdp", "/intelligence/[category]/[slug]/page": "/intelligence/[category]/[slug]", "/intelligence/[category]/page": "/intelligence/[category]", "/intelligence/operations/page": "/intelligence/operations", "/intelligence/threat-intelligence/page": "/intelligence/threat-intelligence", "/threats/[id]/page": "/threats/[id]", "/(auth)/login/page": "/login", "/(auth)/register/page": "/register", "/admin/dashboard/page": "/admin/dashboard", "/admin/articles/page": "/admin/articles", "/admin/cves/page": "/admin/cves", "/admin/feeds/[id]/page": "/admin/feeds/[id]", "/admin/feeds/page": "/admin/feeds", "/admin/page": "/admin", "/admin/settings/page": "/admin/settings" };
var FunctionsConfigManifest = { "version": 1, "functions": {} };
var PagesManifest = { "/_app": "pages/_app.js", "/_error": "pages/_error.js", "/dummy": "pages/dummy.html", "/_document": "pages/_document.js" };
process.env.NEXT_BUILD_ID = BuildId;
process.env.OPEN_NEXT_BUILD_ID = NextConfig.deploymentId ?? BuildId;
process.env.NEXT_PREVIEW_MODE_ID = PrerenderManifest?.preview?.previewModeId;

// node_modules/@opennextjs/aws/dist/http/openNextResponse.js
init_logger();
init_util();
import { Transform } from "node:stream";

// node_modules/@opennextjs/aws/dist/core/routing/util.js
init_util();
init_logger();
import { ReadableStream as ReadableStream3 } from "node:stream/web";

// node_modules/@opennextjs/aws/dist/utils/binary.js
var commonBinaryMimeTypes = /* @__PURE__ */ new Set([
  "application/octet-stream",
  // Docs
  "application/epub+zip",
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.amazon.ebook",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Fonts
  "font/otf",
  "font/woff",
  "font/woff2",
  // Images
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.microsoft.icon",
  "image/webp",
  // Audio
  "audio/3gpp",
  "audio/aac",
  "audio/basic",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wavaudio/webm",
  "audio/x-aiff",
  "audio/x-midi",
  "audio/x-wav",
  // Video
  "video/3gpp",
  "video/mp2t",
  "video/mpeg",
  "video/ogg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  // Archives
  "application/java-archive",
  "application/vnd.apple.installer+xml",
  "application/x-7z-compressed",
  "application/x-apple-diskimage",
  "application/x-bzip",
  "application/x-bzip2",
  "application/x-gzip",
  "application/x-java-archive",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/x-zip",
  "application/zip",
  // Serialized data
  "application/x-protobuf"
]);
function isBinaryContentType(contentType) {
  if (!contentType)
    return false;
  const value = contentType.split(";")[0];
  return commonBinaryMimeTypes.has(value);
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/i18n/accept-header.js
function parse(raw, preferences, options) {
  const lowers = /* @__PURE__ */ new Map();
  const header = raw.replace(/[ \t]/g, "");
  if (preferences) {
    let pos = 0;
    for (const preference of preferences) {
      const lower = preference.toLowerCase();
      lowers.set(lower, { orig: preference, pos: pos++ });
      if (options.prefixMatch) {
        const parts2 = lower.split("-");
        while (parts2.pop(), parts2.length > 0) {
          const joined = parts2.join("-");
          if (!lowers.has(joined)) {
            lowers.set(joined, { orig: preference, pos: pos++ });
          }
        }
      }
    }
  }
  const parts = header.split(",");
  const selections = [];
  const map = /* @__PURE__ */ new Set();
  for (let i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (!part) {
      continue;
    }
    const params = part.split(";");
    if (params.length > 2) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const token = params[0].toLowerCase();
    if (!token) {
      throw new Error(`Invalid ${options.type} header`);
    }
    const selection = { token, pos: i, q: 1 };
    if (preferences && lowers.has(token)) {
      selection.pref = lowers.get(token).pos;
    }
    map.add(selection.token);
    if (params.length === 2) {
      const q = params[1];
      const [key, value] = q.split("=");
      if (!value || key !== "q" && key !== "Q") {
        throw new Error(`Invalid ${options.type} header`);
      }
      const score = Number.parseFloat(value);
      if (score === 0) {
        continue;
      }
      if (Number.isFinite(score) && score <= 1 && score >= 1e-3) {
        selection.q = score;
      }
    }
    selections.push(selection);
  }
  selections.sort((a, b) => {
    if (b.q !== a.q) {
      return b.q - a.q;
    }
    if (b.pref !== a.pref) {
      if (a.pref === void 0) {
        return 1;
      }
      if (b.pref === void 0) {
        return -1;
      }
      return a.pref - b.pref;
    }
    return a.pos - b.pos;
  });
  const values = selections.map((selection) => selection.token);
  if (!preferences || !preferences.length) {
    return values;
  }
  const preferred = [];
  for (const selection of values) {
    if (selection === "*") {
      for (const [preference, value] of lowers) {
        if (!map.has(preference)) {
          preferred.push(value.orig);
        }
      }
    } else {
      const lower = selection.toLowerCase();
      if (lowers.has(lower)) {
        preferred.push(lowers.get(lower).orig);
      }
    }
  }
  return preferred;
}
function acceptLanguage(header = "", preferences) {
  return parse(header, preferences, {
    type: "accept-language",
    prefixMatch: true
  })[0] || void 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/i18n/index.js
function isLocalizedPath(path3) {
  return NextConfig.i18n?.locales.includes(path3.split("/")[1].toLowerCase()) ?? false;
}
function getLocaleFromCookie(cookies) {
  const i18n = NextConfig.i18n;
  const nextLocale = cookies.NEXT_LOCALE?.toLowerCase();
  return nextLocale ? i18n?.locales.find((locale) => nextLocale === locale.toLowerCase()) : void 0;
}
function detectDomainLocale({ hostname, detectedLocale }) {
  const i18n = NextConfig.i18n;
  const domains = i18n?.domains;
  if (!domains) {
    return;
  }
  const lowercasedLocale = detectedLocale?.toLowerCase();
  for (const domain of domains) {
    const domainHostname = domain.domain.split(":", 1)[0].toLowerCase();
    if (hostname === domainHostname || lowercasedLocale === domain.defaultLocale.toLowerCase() || domain.locales?.some((locale) => lowercasedLocale === locale.toLowerCase())) {
      return domain;
    }
  }
}
function detectLocale(internalEvent, i18n) {
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  if (i18n.localeDetection === false) {
    return domainLocale?.defaultLocale ?? i18n.defaultLocale;
  }
  const cookiesLocale = getLocaleFromCookie(internalEvent.cookies);
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  debug({
    cookiesLocale,
    preferredLocale,
    defaultLocale: i18n.defaultLocale,
    domainLocale
  });
  return domainLocale?.defaultLocale ?? cookiesLocale ?? preferredLocale ?? i18n.defaultLocale;
}
function localizePath(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n) {
    return internalEvent.rawPath;
  }
  if (isLocalizedPath(internalEvent.rawPath)) {
    return internalEvent.rawPath;
  }
  const detectedLocale = detectLocale(internalEvent, i18n);
  return `/${detectedLocale}${internalEvent.rawPath}`;
}
function handleLocaleRedirect(internalEvent) {
  const i18n = NextConfig.i18n;
  if (!i18n || i18n.localeDetection === false || internalEvent.rawPath !== "/") {
    return false;
  }
  const preferredLocale = acceptLanguage(internalEvent.headers["accept-language"], i18n?.locales);
  const detectedLocale = detectLocale(internalEvent, i18n);
  const domainLocale = detectDomainLocale({
    hostname: internalEvent.headers.host
  });
  const preferredDomain = detectDomainLocale({
    detectedLocale: preferredLocale
  });
  if (domainLocale && preferredDomain) {
    const isPDomain = preferredDomain.domain === domainLocale.domain;
    const isPLocale = preferredDomain.defaultLocale === preferredLocale;
    if (!isPDomain || !isPLocale) {
      const scheme = `http${preferredDomain.http ? "" : "s"}`;
      const rlocale = isPLocale ? "" : preferredLocale;
      return {
        type: "core",
        statusCode: 307,
        headers: {
          Location: `${scheme}://${preferredDomain.domain}/${rlocale}`
        },
        body: emptyReadableStream(),
        isBase64Encoded: false
      };
    }
  }
  const defaultLocale = domainLocale?.defaultLocale ?? i18n.defaultLocale;
  if (detectedLocale.toLowerCase() !== defaultLocale.toLowerCase()) {
    const nextUrl = constructNextUrl(internalEvent.url, `/${detectedLocale}${NextConfig.trailingSlash ? "/" : ""}`);
    const queryString = convertToQueryString(internalEvent.query);
    return {
      type: "core",
      statusCode: 307,
      headers: {
        Location: `${nextUrl}${queryString}`
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}

// node_modules/@opennextjs/aws/dist/core/routing/queue.js
function generateShardId(rawPath, maxConcurrency, prefix) {
  let a = cyrb128(rawPath);
  let t = a += 1831565813;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  const randomFloat = ((t ^ t >>> 14) >>> 0) / 4294967296;
  const randomInt = Math.floor(randomFloat * maxConcurrency);
  return `${prefix}-${randomInt}`;
}
function generateMessageGroupId(rawPath) {
  const maxConcurrency = Number.parseInt(process.env.MAX_REVALIDATE_CONCURRENCY ?? "10");
  return generateShardId(rawPath, maxConcurrency, "revalidate");
}
function cyrb128(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
  h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
  h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
  h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
  h1 ^= h2 ^ h3 ^ h4, h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return h1 >>> 0;
}

// node_modules/@opennextjs/aws/dist/core/routing/util.js
function isExternal(url, host) {
  if (!url)
    return false;
  const pattern = /^https?:\/\//;
  if (!pattern.test(url))
    return false;
  if (host) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.host !== host;
    } catch {
      return !url.includes(host);
    }
  }
  return true;
}
function convertFromQueryString(query) {
  if (query === "")
    return {};
  const queryParts = query.split("&");
  return getQueryFromIterator(queryParts.map((p) => {
    const [key, value] = p.split("=");
    return [key, value];
  }));
}
function getUrlParts(url, isExternal2) {
  if (!isExternal2) {
    const regex2 = /\/([^?]*)\??(.*)/;
    const match3 = url.match(regex2);
    return {
      hostname: "",
      pathname: match3?.[1] ? `/${match3[1]}` : url,
      protocol: "",
      queryString: match3?.[2] ?? ""
    };
  }
  const regex = /^(https?:)\/\/?([^\/\s]+)(\/[^?]*)?(\?.*)?/;
  const match2 = url.match(regex);
  if (!match2) {
    throw new Error(`Invalid external URL: ${url}`);
  }
  return {
    protocol: match2[1] ?? "https:",
    hostname: match2[2],
    pathname: match2[3] ?? "",
    queryString: match2[4]?.slice(1) ?? ""
  };
}
function constructNextUrl(baseUrl, path3) {
  const nextBasePath = NextConfig.basePath ?? "";
  const url = new URL(`${nextBasePath}${path3}`, baseUrl);
  return url.href;
}
function convertToQueryString(query) {
  const queryStrings = [];
  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => queryStrings.push(`${key}=${entry}`));
    } else {
      queryStrings.push(`${key}=${value}`);
    }
  });
  return queryStrings.length > 0 ? `?${queryStrings.join("&")}` : "";
}
function getMiddlewareMatch(middlewareManifest2, functionsManifest) {
  if (functionsManifest?.functions?.["/_middleware"]) {
    return functionsManifest.functions["/_middleware"].matchers?.map(({ regexp }) => new RegExp(regexp)) ?? [/.*/];
  }
  const rootMiddleware = middlewareManifest2.middleware["/"];
  if (!rootMiddleware?.matchers)
    return [];
  return rootMiddleware.matchers.map(({ regexp }) => new RegExp(regexp));
}
function escapeRegex(str, { isPath } = {}) {
  const result = str.replaceAll("(.)", "_\xB51_").replaceAll("(..)", "_\xB52_").replaceAll("(...)", "_\xB53_");
  return isPath ? result : result.replaceAll("+", "_\xB54_");
}
function unescapeRegex(str) {
  return str.replaceAll("_\xB51_", "(.)").replaceAll("_\xB52_", "(..)").replaceAll("_\xB53_", "(...)").replaceAll("_\xB54_", "+");
}
function convertBodyToReadableStream(method, body) {
  if (method === "GET" || method === "HEAD")
    return void 0;
  if (!body)
    return void 0;
  return new ReadableStream3({
    start(controller) {
      controller.enqueue(body);
      controller.close();
    }
  });
}
var CommonHeaders;
(function(CommonHeaders2) {
  CommonHeaders2["CACHE_CONTROL"] = "cache-control";
  CommonHeaders2["NEXT_CACHE"] = "x-nextjs-cache";
})(CommonHeaders || (CommonHeaders = {}));
function normalizeLocationHeader(location2, baseUrl, encodeQuery = false) {
  if (!URL.canParse(location2)) {
    return location2;
  }
  const locationURL = new URL(location2);
  const origin = new URL(baseUrl).origin;
  let search = locationURL.search;
  if (encodeQuery && search) {
    search = `?${stringifyQs(parseQs(search.slice(1)))}`;
  }
  const href = `${locationURL.origin}${locationURL.pathname}${search}${locationURL.hash}`;
  if (locationURL.origin === origin) {
    return href.slice(origin.length);
  }
  return href;
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
import { createHash } from "node:crypto";
init_stream();

// node_modules/@opennextjs/aws/dist/utils/cache.js
init_logger();

// node_modules/@opennextjs/aws/dist/utils/semver.js
function compareSemver(v1, operator, v2) {
  let versionDiff = 0;
  if (v1 === "latest") {
    versionDiff = 1;
  } else {
    if (/^[^\d]/.test(v1)) {
      v1 = v1.substring(1);
    }
    if (/^[^\d]/.test(v2)) {
      v2 = v2.substring(1);
    }
    const [major1, minor1 = 0, patch1 = 0] = v1.split(".").map(Number);
    const [major2, minor2 = 0, patch2 = 0] = v2.split(".").map(Number);
    if (Number.isNaN(major1) || Number.isNaN(major2)) {
      throw new Error("The major version is required.");
    }
    if (major1 !== major2) {
      versionDiff = major1 - major2;
    } else if (minor1 !== minor2) {
      versionDiff = minor1 - minor2;
    } else if (patch1 !== patch2) {
      versionDiff = patch1 - patch2;
    }
  }
  switch (operator) {
    case "=":
      return versionDiff === 0;
    case ">=":
      return versionDiff >= 0;
    case "<=":
      return versionDiff <= 0;
    case ">":
      return versionDiff > 0;
    case "<":
      return versionDiff < 0;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

// node_modules/@opennextjs/aws/dist/utils/cache.js
async function isStale(key, tags, lastModified) {
  if (!compareSemver(globalThis.nextVersion, ">=", "16.0.0")) {
    return false;
  }
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.isStale?.(tags, lastModified) ?? false;
  }
  return await globalThis.tagCache.isStale?.(key, lastModified) ?? false;
}
async function hasBeenRevalidated(key, tags, cacheEntry) {
  if (globalThis.openNextConfig.dangerous?.disableTagCache) {
    return false;
  }
  const value = cacheEntry.value;
  if (!value) {
    return true;
  }
  if ("type" in cacheEntry && cacheEntry.type === "page") {
    return false;
  }
  const lastModified = cacheEntry.lastModified ?? Date.now();
  if (globalThis.tagCache.mode === "nextMode") {
    return tags.length === 0 ? false : await globalThis.tagCache.hasBeenRevalidated(tags, lastModified);
  }
  const _lastModified = await globalThis.tagCache.getLastModified(key, lastModified);
  return _lastModified === -1;
}
function getTagsFromValue(value) {
  if (!value) {
    return [];
  }
  try {
    const cacheTags = value.meta?.headers?.["x-next-cache-tags"]?.split(",") ?? [];
    delete value.meta?.headers?.["x-next-cache-tags"];
    return cacheTags;
  } catch (e) {
    return [];
  }
}

// node_modules/@opennextjs/aws/dist/core/routing/cacheInterceptor.js
init_logger();
var CACHE_ONE_YEAR = 60 * 60 * 24 * 365;
var CACHE_ONE_MONTH = 60 * 60 * 24 * 30;
var VARY_HEADER = "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Router-Segment-Prefetch, Next-Url";
var NEXT_SEGMENT_PREFETCH_HEADER = "next-router-segment-prefetch";
var NEXT_PRERENDER_HEADER = "x-nextjs-prerender";
var NEXT_POSTPONED_HEADER = "x-nextjs-postponed";
async function computeCacheControl(path3, body, host, revalidate, lastModified, isStaleFromTagCache = false) {
  let finalRevalidate = CACHE_ONE_YEAR;
  const existingRoute = Object.entries(PrerenderManifest?.routes ?? {}).find((p) => p[0] === path3)?.[1];
  if (revalidate === void 0 && existingRoute) {
    finalRevalidate = existingRoute.initialRevalidateSeconds === false ? CACHE_ONE_YEAR : existingRoute.initialRevalidateSeconds;
  } else if (revalidate !== void 0) {
    finalRevalidate = revalidate === false ? CACHE_ONE_YEAR : revalidate;
  }
  const age = Math.round((Date.now() - (lastModified ?? 0)) / 1e3);
  const hash = (str) => createHash("md5").update(str).digest("hex");
  const etag = hash(body);
  if (revalidate === 0) {
    return {
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
      "x-opennext-cache": "ERROR",
      etag
    };
  }
  const isSSG = finalRevalidate === CACHE_ONE_YEAR;
  const remainingTtl = Math.max(finalRevalidate - age, 1);
  const isStaleFromTime = !isSSG && remainingTtl === 1;
  const isStale2 = isStaleFromTime || isStaleFromTagCache;
  if (!isSSG || isStaleFromTagCache) {
    const sMaxAge = isStaleFromTagCache ? 1 : remainingTtl;
    debug("sMaxAge", {
      finalRevalidate,
      age,
      lastModified,
      revalidate,
      isStaleFromTagCache
    });
    if (isStale2) {
      let url = NextConfig.trailingSlash ? `${path3}/` : path3;
      if (NextConfig.basePath) {
        url = `${NextConfig.basePath}${url}`;
      }
      await globalThis.queue.send({
        MessageBody: {
          host,
          url,
          eTag: etag,
          lastModified: lastModified ?? Date.now()
        },
        MessageDeduplicationId: hash(`${path3}-${lastModified}-${etag}`),
        MessageGroupId: generateMessageGroupId(path3)
      });
    }
    return {
      "cache-control": `s-maxage=${sMaxAge}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
      "x-opennext-cache": isStale2 ? "STALE" : "HIT",
      etag
    };
  }
  return {
    "cache-control": `s-maxage=${CACHE_ONE_YEAR}, stale-while-revalidate=${CACHE_ONE_MONTH}`,
    "x-opennext-cache": "HIT",
    etag
  };
}
function getBodyForAppRouter(event, cachedValue) {
  if (cachedValue.type !== "app") {
    throw new Error("getBodyForAppRouter called with non-app cache value");
  }
  try {
    const segmentHeader = `${event.headers[NEXT_SEGMENT_PREFETCH_HEADER]}`;
    const isSegmentResponse = Boolean(segmentHeader) && segmentHeader in (cachedValue.segmentData || {}) && !NextConfig.experimental?.prefetchInlining;
    const body = isSegmentResponse ? cachedValue.segmentData[segmentHeader] : cachedValue.rsc;
    return {
      body,
      additionalHeaders: isSegmentResponse ? { [NEXT_PRERENDER_HEADER]: "1", [NEXT_POSTPONED_HEADER]: "2" } : {}
    };
  } catch (e) {
    error("Error while getting body for app router from cache:", e);
    return { body: cachedValue.rsc, additionalHeaders: {} };
  }
}
async function generateResult(event, localizedPath, cachedValue, lastModified, isStaleFromTagCache = false) {
  debug("Returning result from experimental cache");
  let body = "";
  let type = "application/octet-stream";
  let isDataRequest = false;
  let additionalHeaders = {};
  if (cachedValue.type === "app") {
    isDataRequest = event.headers.rsc === "1";
    if (isDataRequest) {
      const { body: appRouterBody, additionalHeaders: appHeaders } = getBodyForAppRouter(event, cachedValue);
      body = appRouterBody;
      additionalHeaders = appHeaders;
    } else {
      body = cachedValue.html;
    }
    type = isDataRequest ? "text/x-component" : "text/html; charset=utf-8";
  } else if (cachedValue.type === "page") {
    isDataRequest = Boolean(event.query.__nextDataReq);
    body = isDataRequest ? JSON.stringify(cachedValue.json) : cachedValue.html;
    type = isDataRequest ? "application/json" : "text/html; charset=utf-8";
  } else {
    throw new Error("generateResult called with unsupported cache value type, only 'app' and 'page' are supported");
  }
  const cacheControl = await computeCacheControl(localizedPath, body, event.headers.host, cachedValue.revalidate, lastModified, isStaleFromTagCache);
  return {
    type: "core",
    // Sometimes other status codes can be cached, like 404. For these cases, we should return the correct status code
    // Also set the status code to the rewriteStatusCode if defined
    // This can happen in handleMiddleware in routingHandler.
    // `NextResponse.rewrite(url, { status: xxx})
    // The rewrite status code should take precedence over the cached one
    statusCode: event.rewriteStatusCode ?? cachedValue.meta?.status ?? 200,
    body: toReadableStream(body, false),
    isBase64Encoded: false,
    headers: {
      ...cacheControl,
      "content-type": type,
      ...cachedValue.meta?.headers,
      vary: VARY_HEADER,
      ...additionalHeaders
    }
  };
}
function escapePathDelimiters(segment, escapeEncoded) {
  return segment.replace(new RegExp(`([/#?]${escapeEncoded ? "|%(2f|23|3f|5c)" : ""})`, "gi"), (char) => encodeURIComponent(char));
}
function decodePathParams(pathname) {
  return pathname.split("/").map((segment) => {
    try {
      return escapePathDelimiters(decodeURIComponent(segment), true);
    } catch (e) {
      return segment;
    }
  }).join("/");
}
async function cacheInterceptor(event) {
  if (Boolean(event.headers["next-action"]) || Boolean(event.headers["x-prerender-revalidate"]))
    return event;
  const cookies = event.headers.cookie || "";
  const hasPreviewData = cookies.includes("__prerender_bypass") || cookies.includes("__next_preview_data");
  if (hasPreviewData) {
    debug("Preview mode detected, passing through to handler");
    return event;
  }
  let localizedPath = localizePath(event);
  if (NextConfig.basePath) {
    localizedPath = localizedPath.replace(NextConfig.basePath, "");
  }
  localizedPath = localizedPath.replace(/\/$/, "");
  localizedPath = decodePathParams(localizedPath);
  debug("Checking cache for", localizedPath, PrerenderManifest);
  const isISR = Object.keys(PrerenderManifest?.routes ?? {}).includes(localizedPath ?? "/") || Object.values(PrerenderManifest?.dynamicRoutes ?? {}).some((dr) => new RegExp(dr.routeRegex).test(localizedPath));
  debug("isISR", isISR);
  if (isISR) {
    try {
      const cachedData = await globalThis.incrementalCache.get(localizedPath ?? "/index");
      debug("cached data in interceptor", cachedData);
      if (!cachedData?.value) {
        return event;
      }
      const tags = getTagsFromValue(cachedData.value);
      if (cachedData.value?.type === "app" || cachedData.value?.type === "route") {
        const _hasBeenRevalidated = cachedData.shouldBypassTagCache ? false : await hasBeenRevalidated(localizedPath, tags, cachedData);
        if (_hasBeenRevalidated) {
          return event;
        }
      }
      const _isStale = cachedData.shouldBypassTagCache ? false : await isStale(localizedPath, tags, cachedData.lastModified ?? Date.now());
      const host = event.headers.host;
      switch (cachedData?.value?.type) {
        case "app":
        case "page":
          return generateResult(event, localizedPath, cachedData.value, cachedData.lastModified, _isStale);
        case "redirect": {
          const cacheControl = await computeCacheControl(localizedPath, "", host, cachedData.value.revalidate, cachedData.lastModified, _isStale);
          return {
            type: "core",
            statusCode: cachedData.value.meta?.status ?? 307,
            body: emptyReadableStream(),
            headers: {
              ...cachedData.value.meta?.headers ?? {},
              ...cacheControl
            },
            isBase64Encoded: false
          };
        }
        case "route": {
          const cacheControl = await computeCacheControl(localizedPath, cachedData.value.body, host, cachedData.value.revalidate, cachedData.lastModified, _isStale);
          const isBinary = isBinaryContentType(String(cachedData.value.meta?.headers?.["content-type"]));
          return {
            type: "core",
            statusCode: event.rewriteStatusCode ?? cachedData.value.meta?.status ?? 200,
            body: toReadableStream(cachedData.value.body, isBinary),
            headers: {
              ...cacheControl,
              ...cachedData.value.meta?.headers,
              vary: VARY_HEADER
            },
            isBase64Encoded: isBinary
          };
        }
        default:
          return event;
      }
    } catch (e) {
      debug("Error while fetching cache", e);
      return event;
    }
  }
  return event;
}

// node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
function parse2(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path3 = "";
  var tryConsume = function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  };
  var consumeText = function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  var isSafe = function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  };
  var safePattern = function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path3 += prefix;
        prefix = "";
      }
      if (path3) {
        result.push(path3);
        path3 = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path3 += value;
      continue;
    }
    if (path3) {
      result.push(path3);
      path3 = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
function compile(str, options) {
  return tokensToFunction(parse2(str, options), options);
}
function tokensToFunction(tokens, options) {
  if (options === void 0) {
    options = {};
  }
  var reFlags = flags(options);
  var _a = options.encode, encode = _a === void 0 ? function(x) {
    return x;
  } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
  var matches = tokens.map(function(token) {
    if (typeof token === "object") {
      return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
    }
  });
  return function(data) {
    var path3 = "";
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (typeof token === "string") {
        path3 += token;
        continue;
      }
      var value = data ? data[token.name] : void 0;
      var optional = token.modifier === "?" || token.modifier === "*";
      var repeat = token.modifier === "*" || token.modifier === "+";
      if (Array.isArray(value)) {
        if (!repeat) {
          throw new TypeError('Expected "'.concat(token.name, '" to not repeat, but got an array'));
        }
        if (value.length === 0) {
          if (optional)
            continue;
          throw new TypeError('Expected "'.concat(token.name, '" to not be empty'));
        }
        for (var j = 0; j < value.length; j++) {
          var segment = encode(value[j], token);
          if (validate && !matches[i].test(segment)) {
            throw new TypeError('Expected all "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
          }
          path3 += token.prefix + segment + token.suffix;
        }
        continue;
      }
      if (typeof value === "string" || typeof value === "number") {
        var segment = encode(String(value), token);
        if (validate && !matches[i].test(segment)) {
          throw new TypeError('Expected "'.concat(token.name, '" to match "').concat(token.pattern, '", but got "').concat(segment, '"'));
        }
        path3 += token.prefix + segment + token.suffix;
        continue;
      }
      if (optional)
        continue;
      var typeOfMessage = repeat ? "an array" : "a string";
      throw new TypeError('Expected "'.concat(token.name, '" to be ').concat(typeOfMessage));
    }
    return path3;
  };
}
function match(str, options) {
  var keys = [];
  var re2 = pathToRegexp(str, keys, options);
  return regexpToFunction(re2, keys, options);
}
function regexpToFunction(re2, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re2.exec(pathname);
    if (!m)
      return false;
    var path3 = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path: path3, index, params };
  };
}
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
function regexpToRegexp(path3, keys) {
  if (!keys)
    return path3;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path3.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path3.source);
  }
  return path3;
}
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path3) {
    return pathToRegexp(path3, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
function stringToRegexp(path3, keys, options) {
  return tokensToRegexp(parse2(path3, options), keys, options);
}
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
function pathToRegexp(path3, keys, options) {
  if (path3 instanceof RegExp)
    return regexpToRegexp(path3, keys);
  if (Array.isArray(path3))
    return arrayToRegexp(path3, keys, options);
  return stringToRegexp(path3, keys, options);
}

// node_modules/@opennextjs/aws/dist/utils/normalize-path.js
import path2 from "node:path";
function normalizeRepeatedSlashes(url) {
  const urlNoQuery = url.host + url.pathname;
  return `${url.protocol}//${urlNoQuery.replace(/\\/g, "/").replace(/\/\/+/g, "/")}${url.search}`;
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
init_stream();
init_logger();

// node_modules/@opennextjs/aws/dist/core/routing/routeMatcher.js
var optionalLocalePrefixRegex = `^/(?:${RoutesManifest.locales.map((locale) => `${locale}/?`).join("|")})?`;
var optionalBasepathPrefixRegex = RoutesManifest.basePath ? `^${RoutesManifest.basePath}/?` : "^/";
var optionalPrefix = optionalLocalePrefixRegex.replace("^/", optionalBasepathPrefixRegex);
function routeMatcher(routeDefinitions) {
  const regexp = routeDefinitions.map((route) => ({
    page: route.page,
    regexp: new RegExp(route.regex.replace("^/", optionalPrefix))
  }));
  const appPathsSet = /* @__PURE__ */ new Set();
  const routePathsSet = /* @__PURE__ */ new Set();
  for (const [k, v] of Object.entries(AppPathRoutesManifest)) {
    if (k.endsWith("page")) {
      appPathsSet.add(v);
    } else if (k.endsWith("route")) {
      routePathsSet.add(v);
    }
  }
  return function matchRoute(path3) {
    const foundRoutes = regexp.filter((route) => route.regexp.test(path3));
    return foundRoutes.map((foundRoute) => {
      let routeType = "page";
      if (appPathsSet.has(foundRoute.page)) {
        routeType = "app";
      } else if (routePathsSet.has(foundRoute.page)) {
        routeType = "route";
      }
      return {
        route: foundRoute.page,
        type: routeType
      };
    });
  };
}
var staticRouteMatcher = routeMatcher([
  ...RoutesManifest.routes.static,
  ...getStaticAPIRoutes()
]);
var dynamicRouteMatcher = routeMatcher(RoutesManifest.routes.dynamic);
function getStaticAPIRoutes() {
  const createRouteDefinition = (route) => ({
    page: route,
    regex: `^${route}(?:/)?$`
  });
  const dynamicRoutePages = new Set(RoutesManifest.routes.dynamic.map(({ page }) => page));
  const pagesStaticAPIRoutes = Object.keys(PagesManifest).filter((route) => route.startsWith("/api/") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  const appPathsStaticAPIRoutes = Object.values(AppPathRoutesManifest).filter((route) => (route.startsWith("/api/") || route === "/api") && !dynamicRoutePages.has(route)).map(createRouteDefinition);
  return [...pagesStaticAPIRoutes, ...appPathsStaticAPIRoutes];
}

// node_modules/@opennextjs/aws/dist/core/routing/matcher.js
var routeHasMatcher = (headers, cookies, query) => (redirect) => {
  switch (redirect.type) {
    case "header":
      return !!headers?.[redirect.key.toLowerCase()] && new RegExp(redirect.value ?? "").test(headers[redirect.key.toLowerCase()] ?? "");
    case "cookie":
      return !!cookies?.[redirect.key] && new RegExp(redirect.value ?? "").test(cookies[redirect.key] ?? "");
    case "query":
      return query[redirect.key] && Array.isArray(redirect.value) ? redirect.value.reduce((prev, current) => prev || new RegExp(current).test(query[redirect.key]), false) : new RegExp(redirect.value ?? "").test(query[redirect.key] ?? "");
    case "host":
      return headers?.host !== "" && new RegExp(redirect.value ?? "").test(headers.host);
    default:
      return false;
  }
};
function checkHas(matcher, has, inverted = false) {
  return has ? has.reduce((acc, cur) => {
    if (acc === false)
      return false;
    return inverted ? !matcher(cur) : matcher(cur);
  }, true) : true;
}
var getParamsFromSource = (source) => (value) => {
  debug("value", value);
  const _match = source(value);
  return _match ? _match.params : {};
};
var computeParamHas = (headers, cookies, query) => (has) => {
  if (!has.value)
    return {};
  const matcher = new RegExp(`^${has.value}$`);
  const fromSource = (value) => {
    const matches = value.match(matcher);
    return matches?.groups ?? {};
  };
  switch (has.type) {
    case "header":
      return fromSource(headers[has.key.toLowerCase()] ?? "");
    case "cookie":
      return fromSource(cookies[has.key] ?? "");
    case "query":
      return Array.isArray(query[has.key]) ? fromSource(query[has.key].join(",")) : fromSource(query[has.key] ?? "");
    case "host":
      return fromSource(headers.host ?? "");
  }
};
function convertMatch(match2, toDestination, destination) {
  if (!match2) {
    return destination;
  }
  const { params } = match2;
  const isUsingParams = Object.keys(params).length > 0;
  return isUsingParams ? toDestination(params) : destination;
}
function getNextConfigHeaders(event, configHeaders) {
  if (!configHeaders) {
    return {};
  }
  const matcher = routeHasMatcher(event.headers, event.cookies, event.query);
  const requestHeaders = {};
  const localizedRawPath = localizePath(event);
  for (const { headers, has, missing, regex, source, locale } of configHeaders) {
    const path3 = locale === false ? event.rawPath : localizedRawPath;
    if (new RegExp(regex).test(path3) && checkHas(matcher, has) && checkHas(matcher, missing, true)) {
      const fromSource = match(source);
      const _match = fromSource(path3);
      headers.forEach((h) => {
        try {
          const key = convertMatch(_match, compile(h.key), h.key);
          const value = convertMatch(_match, compile(h.value), h.value);
          requestHeaders[key] = value;
        } catch {
          debug(`Error matching header ${h.key} with value ${h.value}`);
          requestHeaders[h.key] = h.value;
        }
      });
    }
  }
  return requestHeaders;
}
function handleRewrites(event, rewrites) {
  const { rawPath, headers, query, cookies, url } = event;
  const localizedRawPath = localizePath(event);
  const matcher = routeHasMatcher(headers, cookies, query);
  const computeHas = computeParamHas(headers, cookies, query);
  const rewrite = rewrites.find((route) => {
    const path3 = route.locale === false ? rawPath : localizedRawPath;
    return new RegExp(route.regex).test(path3) && checkHas(matcher, route.has) && checkHas(matcher, route.missing, true);
  });
  let finalQuery = query;
  let rewrittenUrl = url;
  const isExternalRewrite = isExternal(rewrite?.destination);
  debug("isExternalRewrite", isExternalRewrite);
  if (rewrite) {
    const { pathname, protocol, hostname, queryString } = getUrlParts(rewrite.destination, isExternalRewrite);
    const pathToUse = rewrite.locale === false ? rawPath : localizedRawPath;
    debug("urlParts", { pathname, protocol, hostname, queryString });
    const toDestinationPath = compile(escapeRegex(pathname, { isPath: true }));
    const toDestinationHost = compile(escapeRegex(hostname));
    const toDestinationQuery = compile(escapeRegex(queryString));
    const params = {
      // params for the source
      ...getParamsFromSource(match(escapeRegex(rewrite.source, { isPath: true })))(pathToUse),
      // params for the has
      ...rewrite.has?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {}),
      // params for the missing
      ...rewrite.missing?.reduce((acc, cur) => {
        return Object.assign(acc, computeHas(cur));
      }, {})
    };
    const isUsingParams = Object.keys(params).length > 0;
    let rewrittenQuery = queryString;
    let rewrittenHost = hostname;
    let rewrittenPath = pathname;
    if (isUsingParams) {
      rewrittenPath = unescapeRegex(toDestinationPath(params));
      rewrittenHost = unescapeRegex(toDestinationHost(params));
      rewrittenQuery = unescapeRegex(toDestinationQuery(params));
    }
    if (NextConfig.i18n && !isExternalRewrite) {
      const strippedPathLocale = rewrittenPath.replace(new RegExp(`^/(${NextConfig.i18n.locales.join("|")})`), "");
      if (strippedPathLocale.startsWith("/api/")) {
        rewrittenPath = strippedPathLocale;
      }
    }
    rewrittenUrl = isExternalRewrite ? `${protocol}//${rewrittenHost}${rewrittenPath}` : new URL(rewrittenPath, event.url).href;
    finalQuery = {
      ...query,
      ...convertFromQueryString(rewrittenQuery)
    };
    rewrittenUrl += convertToQueryString(finalQuery);
    debug("rewrittenUrl", { rewrittenUrl, finalQuery, isUsingParams });
  }
  return {
    internalEvent: {
      ...event,
      query: finalQuery,
      rawPath: new URL(rewrittenUrl).pathname,
      url: rewrittenUrl
    },
    __rewrite: rewrite,
    isExternalRewrite
  };
}
function handleRepeatedSlashRedirect(event) {
  if (event.rawPath.match(/(\\|\/\/)/)) {
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: normalizeRepeatedSlashes(new URL(event.url))
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
  return false;
}
function handleTrailingSlashRedirect(event) {
  const url = new URL(event.rawPath, "http://localhost");
  if (
    // Someone is trying to redirect to a different origin, let's not do that
    url.host !== "localhost" || NextConfig.skipTrailingSlashRedirect || // We should not apply trailing slash redirect to API routes
    event.rawPath.startsWith("/api/")
  ) {
    return false;
  }
  const emptyBody = emptyReadableStream();
  if (NextConfig.trailingSlash && !(event.query.__nextDataReq === "1") && !event.rawPath.endsWith("/") && !event.rawPath.match(/[\w-]+\.[\w]+$/g)) {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0]}/${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  if (!NextConfig.trailingSlash && event.rawPath.endsWith("/") && event.rawPath !== "/") {
    const headersLocation = event.url.split("?");
    return {
      type: event.type,
      statusCode: 308,
      headers: {
        Location: `${headersLocation[0].replace(/\/$/, "")}${headersLocation[1] ? `?${headersLocation[1]}` : ""}`
      },
      body: emptyBody,
      isBase64Encoded: false
    };
  }
  return false;
}
function handleRedirects(event, redirects) {
  const repeatedSlashRedirect = handleRepeatedSlashRedirect(event);
  if (repeatedSlashRedirect)
    return repeatedSlashRedirect;
  const trailingSlashRedirect = handleTrailingSlashRedirect(event);
  if (trailingSlashRedirect)
    return trailingSlashRedirect;
  const localeRedirect = handleLocaleRedirect(event);
  if (localeRedirect)
    return localeRedirect;
  const { internalEvent, __rewrite } = handleRewrites(event, redirects.filter((r) => !r.internal));
  if (__rewrite && !__rewrite.internal) {
    return {
      type: event.type,
      statusCode: __rewrite.statusCode ?? 308,
      headers: {
        Location: internalEvent.url
      },
      body: emptyReadableStream(),
      isBase64Encoded: false
    };
  }
}
function fixDataPage(internalEvent, buildId) {
  const { rawPath, query } = internalEvent;
  const basePath = NextConfig.basePath ?? "";
  const dataPattern = `${basePath}/_next/data/${buildId}`;
  if (rawPath.startsWith("/_next/data") && !rawPath.startsWith(dataPattern)) {
    return {
      type: internalEvent.type,
      statusCode: 404,
      body: toReadableStream("{}"),
      headers: {
        "Content-Type": "application/json"
      },
      isBase64Encoded: false
    };
  }
  if (rawPath.startsWith(dataPattern) && rawPath.endsWith(".json")) {
    const newPath = `${basePath}${rawPath.slice(dataPattern.length, -".json".length).replace(/^\/index$/, "/")}`;
    query.__nextDataReq = "1";
    return {
      ...internalEvent,
      rawPath: newPath,
      query,
      url: new URL(`${newPath}${convertToQueryString(query)}`, internalEvent.url).href
    };
  }
  return internalEvent;
}
function handleFallbackFalse(internalEvent, prerenderManifest) {
  const { rawPath } = internalEvent;
  const { dynamicRoutes = {}, routes = {} } = prerenderManifest ?? {};
  const prerenderedFallbackRoutes = Object.entries(dynamicRoutes).filter(([, { fallback }]) => fallback === false);
  const routeFallback = prerenderedFallbackRoutes.some(([, { routeRegex }]) => {
    const routeRegexExp = new RegExp(routeRegex);
    return routeRegexExp.test(rawPath);
  });
  const locales = NextConfig.i18n?.locales;
  const routesAlreadyHaveLocale = locales?.includes(rawPath.split("/")[1]) || // If we don't use locales, we don't need to add the default locale
  locales === void 0;
  let localizedPath = routesAlreadyHaveLocale ? rawPath : `/${NextConfig.i18n?.defaultLocale}${rawPath}`;
  if (
    // Not if localizedPath is "/" tho, because that would not make it find `isPregenerated` below since it would be try to match an empty string.
    localizedPath !== "/" && NextConfig.trailingSlash && localizedPath.endsWith("/")
  ) {
    localizedPath = localizedPath.slice(0, -1);
  }
  const matchedStaticRoute = staticRouteMatcher(localizedPath);
  const prerenderedFallbackRoutesName = prerenderedFallbackRoutes.map(([name]) => name);
  const matchedDynamicRoute = dynamicRouteMatcher(localizedPath).filter(({ route }) => !prerenderedFallbackRoutesName.includes(route));
  const isPregenerated = Object.keys(routes).includes(localizedPath);
  if (routeFallback && !isPregenerated && matchedStaticRoute.length === 0 && matchedDynamicRoute.length === 0) {
    return {
      event: {
        ...internalEvent,
        rawPath: "/404",
        url: constructNextUrl(internalEvent.url, "/404"),
        headers: {
          ...internalEvent.headers,
          "x-invoke-status": "404"
        }
      },
      isISR: false
    };
  }
  return {
    event: internalEvent,
    isISR: routeFallback || isPregenerated
  };
}

// node_modules/@opennextjs/aws/dist/core/routing/middleware.js
init_stream();
init_utils();
var middlewareManifest = MiddlewareManifest;
var functionsConfigManifest = FunctionsConfigManifest;
var middleMatch = getMiddlewareMatch(middlewareManifest, functionsConfigManifest);
var REDIRECTS = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function defaultMiddlewareLoader() {
  return Promise.resolve().then(() => (init_edgeFunctionHandler(), edgeFunctionHandler_exports));
}
async function handleMiddleware(internalEvent, initialSearch, middlewareLoader = defaultMiddlewareLoader) {
  const headers = internalEvent.headers;
  if (headers["x-isr"] && headers["x-prerender-revalidate"] === PrerenderManifest?.preview?.previewModeId)
    return internalEvent;
  const normalizedPath = localizePath(internalEvent);
  const hasMatch = middleMatch.some((r) => r.test(normalizedPath));
  if (!hasMatch)
    return internalEvent;
  const initialUrl = new URL(normalizedPath, internalEvent.url);
  initialUrl.search = initialSearch;
  const url = initialUrl.href;
  const middleware = await middlewareLoader();
  const result = await middleware.default({
    // `geo` is pre Next 15.
    geo: {
      // The city name is percent-encoded.
      // See https://github.com/vercel/vercel/blob/4cb6143/packages/functions/src/headers.ts#L94C19-L94C37
      city: decodeURIComponent(headers["x-open-next-city"]),
      country: headers["x-open-next-country"],
      region: headers["x-open-next-region"],
      latitude: headers["x-open-next-latitude"],
      longitude: headers["x-open-next-longitude"]
    },
    headers,
    method: internalEvent.method || "GET",
    nextConfig: {
      basePath: NextConfig.basePath,
      i18n: NextConfig.i18n,
      trailingSlash: NextConfig.trailingSlash
    },
    url,
    body: convertBodyToReadableStream(internalEvent.method, internalEvent.body)
  });
  const statusCode = result.status;
  const responseHeaders = result.headers;
  const reqHeaders = {};
  const resHeaders = {};
  const filteredHeaders = [
    "x-middleware-override-headers",
    "x-middleware-next",
    "x-middleware-rewrite",
    // We need to drop `content-encoding` because it will be decoded
    "content-encoding"
  ];
  const xMiddlewareKey = "x-middleware-request-";
  responseHeaders.forEach((value, key) => {
    if (key.startsWith(xMiddlewareKey)) {
      const k = key.substring(xMiddlewareKey.length);
      reqHeaders[k] = value;
    } else {
      if (filteredHeaders.includes(key.toLowerCase()))
        return;
      if (key.toLowerCase() === "set-cookie") {
        resHeaders[key] = resHeaders[key] ? [...resHeaders[key], value] : [value];
      } else if (REDIRECTS.has(statusCode) && key.toLowerCase() === "location") {
        resHeaders[key] = normalizeLocationHeader(value, internalEvent.url);
      } else {
        resHeaders[key] = value;
      }
    }
  });
  const rewriteUrl = responseHeaders.get("x-middleware-rewrite");
  let isExternalRewrite = false;
  let middlewareQuery = internalEvent.query;
  let newUrl = internalEvent.url;
  if (rewriteUrl) {
    newUrl = rewriteUrl;
    if (isExternal(newUrl, internalEvent.headers.host)) {
      isExternalRewrite = true;
    } else {
      const rewriteUrlObject = new URL(rewriteUrl);
      middlewareQuery = getQueryFromSearchParams(rewriteUrlObject.searchParams);
      if ("__nextDataReq" in internalEvent.query) {
        middlewareQuery.__nextDataReq = internalEvent.query.__nextDataReq;
      }
    }
  }
  if (!rewriteUrl && !responseHeaders.get("x-middleware-next")) {
    const body = result.body ?? emptyReadableStream();
    return {
      type: internalEvent.type,
      statusCode,
      headers: resHeaders,
      body,
      isBase64Encoded: false
    };
  }
  return {
    responseHeaders: resHeaders,
    url: newUrl,
    rawPath: new URL(newUrl).pathname,
    type: internalEvent.type,
    headers: { ...internalEvent.headers, ...reqHeaders },
    body: internalEvent.body,
    method: internalEvent.method,
    query: middlewareQuery,
    cookies: internalEvent.cookies,
    remoteAddress: internalEvent.remoteAddress,
    isExternalRewrite,
    rewriteStatusCode: rewriteUrl && !isExternalRewrite ? statusCode : void 0
  };
}

// node_modules/@opennextjs/aws/dist/core/routingHandler.js
var MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
var MIDDLEWARE_HEADER_PREFIX_LEN = MIDDLEWARE_HEADER_PREFIX.length;
var INTERNAL_HEADER_PREFIX = "x-opennext-";
var INTERNAL_HEADER_INITIAL_URL = `${INTERNAL_HEADER_PREFIX}initial-url`;
var INTERNAL_HEADER_LOCALE = `${INTERNAL_HEADER_PREFIX}locale`;
var INTERNAL_HEADER_RESOLVED_ROUTES = `${INTERNAL_HEADER_PREFIX}resolved-routes`;
var INTERNAL_HEADER_REWRITE_STATUS_CODE = `${INTERNAL_HEADER_PREFIX}rewrite-status-code`;
var INTERNAL_EVENT_REQUEST_ID = `${INTERNAL_HEADER_PREFIX}request-id`;
var geoHeaderToNextHeader = {
  "x-open-next-city": "x-vercel-ip-city",
  "x-open-next-country": "x-vercel-ip-country",
  "x-open-next-region": "x-vercel-ip-country-region",
  "x-open-next-latitude": "x-vercel-ip-latitude",
  "x-open-next-longitude": "x-vercel-ip-longitude"
};
var NEXT_INTERNAL_HEADERS = [
  "x-middleware-rewrite",
  "x-middleware-redirect",
  "x-middleware-set-cookie",
  "x-middleware-skip",
  "x-middleware-override-headers",
  "x-middleware-next",
  "x-now-route-matches",
  "x-matched-path",
  "x-nextjs-data",
  "x-next-resume-state-length"
];
function applyMiddlewareHeaders(eventOrResult, middlewareHeaders) {
  const isResult = isInternalResult(eventOrResult);
  const headers = eventOrResult.headers;
  const keyPrefix = isResult ? "" : MIDDLEWARE_HEADER_PREFIX;
  Object.entries(middlewareHeaders).forEach(([key, value]) => {
    if (value) {
      headers[keyPrefix + key] = Array.isArray(value) ? value.join(",") : value;
    }
  });
}
async function routingHandler(event, { assetResolver }) {
  try {
    for (const [openNextGeoName, nextGeoName] of Object.entries(geoHeaderToNextHeader)) {
      const value = event.headers[openNextGeoName];
      if (value) {
        event.headers[nextGeoName] = value;
      }
    }
    for (const key of Object.keys(event.headers)) {
      const lowerCaseKey = key.toLowerCase();
      if (lowerCaseKey.startsWith(INTERNAL_HEADER_PREFIX) || lowerCaseKey.startsWith(MIDDLEWARE_HEADER_PREFIX) || NEXT_INTERNAL_HEADERS.includes(lowerCaseKey)) {
        delete event.headers[key];
      }
    }
    let headers = getNextConfigHeaders(event, ConfigHeaders);
    let eventOrResult = fixDataPage(event, BuildId);
    if (isInternalResult(eventOrResult)) {
      return eventOrResult;
    }
    const redirect = handleRedirects(eventOrResult, RoutesManifest.redirects);
    if (redirect) {
      redirect.headers.Location = normalizeLocationHeader(redirect.headers.Location, event.url, true);
      debug("redirect", redirect);
      return redirect;
    }
    const middlewareEventOrResult = await handleMiddleware(
      eventOrResult,
      // We need to pass the initial search without any decoding
      // TODO: we'd need to refactor InternalEvent to include the initial querystring directly
      // Should be done in another PR because it is a breaking change
      new URL(event.url).search
    );
    if (isInternalResult(middlewareEventOrResult)) {
      return middlewareEventOrResult;
    }
    const middlewareHeadersPrioritized = globalThis.openNextConfig.dangerous?.middlewareHeadersOverrideNextConfigHeaders ?? false;
    if (middlewareHeadersPrioritized) {
      headers = {
        ...headers,
        ...middlewareEventOrResult.responseHeaders
      };
    } else {
      headers = {
        ...middlewareEventOrResult.responseHeaders,
        ...headers
      };
    }
    let isExternalRewrite = middlewareEventOrResult.isExternalRewrite ?? false;
    eventOrResult = middlewareEventOrResult;
    if (!isExternalRewrite) {
      const beforeRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.beforeFiles);
      eventOrResult = beforeRewrite.internalEvent;
      isExternalRewrite = beforeRewrite.isExternalRewrite;
      if (!isExternalRewrite) {
        const assetResult = await assetResolver?.maybeGetAssetResult?.(eventOrResult);
        if (assetResult) {
          applyMiddlewareHeaders(assetResult, headers);
          return assetResult;
        }
      }
    }
    const foundStaticRoute = staticRouteMatcher(eventOrResult.rawPath);
    const isStaticRoute = !isExternalRewrite && foundStaticRoute.length > 0;
    if (!(isStaticRoute || isExternalRewrite)) {
      const afterRewrite = handleRewrites(eventOrResult, RoutesManifest.rewrites.afterFiles);
      eventOrResult = afterRewrite.internalEvent;
      isExternalRewrite = afterRewrite.isExternalRewrite;
    }
    let isISR = false;
    if (!isExternalRewrite) {
      const fallbackResult = handleFallbackFalse(eventOrResult, PrerenderManifest);
      eventOrResult = fallbackResult.event;
      isISR = fallbackResult.isISR;
    }
    const foundDynamicRoute = dynamicRouteMatcher(eventOrResult.rawPath);
    const isDynamicRoute = !isExternalRewrite && foundDynamicRoute.length > 0;
    if (!(isDynamicRoute || isStaticRoute || isExternalRewrite)) {
      const fallbackRewrites = handleRewrites(eventOrResult, RoutesManifest.rewrites.fallback);
      eventOrResult = fallbackRewrites.internalEvent;
      isExternalRewrite = fallbackRewrites.isExternalRewrite;
    }
    const isNextImageRoute = eventOrResult.rawPath.startsWith("/_next/image");
    const isRouteFoundBeforeAllRewrites = isStaticRoute || isDynamicRoute || isExternalRewrite;
    if (!(isRouteFoundBeforeAllRewrites || isNextImageRoute || // We need to check again once all rewrites have been applied
    staticRouteMatcher(eventOrResult.rawPath).length > 0 || dynamicRouteMatcher(eventOrResult.rawPath).length > 0)) {
      eventOrResult = {
        ...eventOrResult,
        rawPath: "/404",
        url: constructNextUrl(eventOrResult.url, "/404"),
        headers: {
          ...eventOrResult.headers,
          "x-middleware-response-cache-control": "private, no-cache, no-store, max-age=0, must-revalidate"
        }
      };
    }
    if (globalThis.openNextConfig.dangerous?.enableCacheInterception && !isInternalResult(eventOrResult)) {
      debug("Cache interception enabled");
      eventOrResult = await cacheInterceptor(eventOrResult);
      if (isInternalResult(eventOrResult)) {
        applyMiddlewareHeaders(eventOrResult, headers);
        return eventOrResult;
      }
    }
    applyMiddlewareHeaders(eventOrResult, headers);
    const resolvedRoutes = [
      ...foundStaticRoute,
      ...foundDynamicRoute
    ];
    debug("resolvedRoutes", resolvedRoutes);
    return {
      internalEvent: eventOrResult,
      isExternalRewrite,
      origin: false,
      isISR,
      resolvedRoutes,
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(eventOrResult, NextConfig.i18n) : void 0,
      rewriteStatusCode: middlewareEventOrResult.rewriteStatusCode
    };
  } catch (e) {
    error("Error in routingHandler", e);
    return {
      internalEvent: {
        type: "core",
        method: "GET",
        rawPath: "/500",
        url: constructNextUrl(event.url, "/500"),
        headers: {
          ...event.headers
        },
        query: event.query,
        cookies: event.cookies,
        remoteAddress: event.remoteAddress
      },
      isExternalRewrite: false,
      origin: false,
      isISR: false,
      resolvedRoutes: [],
      initialURL: event.url,
      locale: NextConfig.i18n ? detectLocale(event, NextConfig.i18n) : void 0
    };
  }
}
function isInternalResult(eventOrResult) {
  return eventOrResult != null && "statusCode" in eventOrResult;
}

// node_modules/@opennextjs/aws/dist/adapters/middleware.js
globalThis.internalFetch = fetch;
globalThis.__openNextAls = new AsyncLocalStorage();
var defaultHandler = async (internalEvent, options) => {
  const middlewareConfig = globalThis.openNextConfig.middleware;
  const originResolver = await resolveOriginResolver(middlewareConfig?.originResolver);
  const externalRequestProxy = await resolveProxyRequest(middlewareConfig?.override?.proxyExternalRequest);
  const assetResolver = await resolveAssetResolver(middlewareConfig?.assetResolver);
  const requestId = Math.random().toString(36);
  return runWithOpenNextRequestContext({
    isISRRevalidation: internalEvent.headers["x-isr"] === "1",
    waitUntil: options?.waitUntil,
    requestId
  }, async () => {
    const result = await routingHandler(internalEvent, { assetResolver });
    if ("internalEvent" in result) {
      debug("Middleware intercepted event", internalEvent);
      if (!result.isExternalRewrite) {
        const origin = await originResolver.resolve(result.internalEvent.rawPath);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_HEADER_INITIAL_URL]: internalEvent.url,
              [INTERNAL_HEADER_RESOLVED_ROUTES]: JSON.stringify(result.resolvedRoutes),
              [INTERNAL_EVENT_REQUEST_ID]: requestId,
              [INTERNAL_HEADER_REWRITE_STATUS_CODE]: String(result.rewriteStatusCode)
            }
          },
          isExternalRewrite: result.isExternalRewrite,
          origin,
          isISR: result.isISR,
          initialURL: result.initialURL,
          resolvedRoutes: result.resolvedRoutes
        };
      }
      try {
        return externalRequestProxy.proxy(result.internalEvent);
      } catch (e) {
        error("External request failed.", e);
        return {
          type: "middleware",
          internalEvent: {
            ...result.internalEvent,
            headers: {
              ...result.internalEvent.headers,
              [INTERNAL_EVENT_REQUEST_ID]: requestId
            },
            rawPath: "/500",
            url: constructNextUrl(result.internalEvent.url, "/500"),
            method: "GET"
          },
          // On error we need to rewrite to the 500 page which is an internal rewrite
          isExternalRewrite: false,
          origin: false,
          isISR: result.isISR,
          initialURL: result.internalEvent.url,
          resolvedRoutes: [{ route: "/500", type: "page" }]
        };
      }
    }
    if (process.env.OPEN_NEXT_REQUEST_ID_HEADER || globalThis.openNextDebug) {
      result.headers[INTERNAL_EVENT_REQUEST_ID] = requestId;
    }
    debug("Middleware response", result);
    return result;
  });
};
var handler2 = await createGenericHandler({
  handler: defaultHandler,
  type: "middleware"
});
var middleware_default = {
  fetch: handler2
};
export {
  middleware_default as default,
  handler2 as handler
};
