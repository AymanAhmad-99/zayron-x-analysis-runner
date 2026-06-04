import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      // KV-backed incremental cache — replaces 'dummy'.
      // Enables ISR (revalidate), tag-based invalidation, and durable queue.
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  /* ──────────────────────────────────────────────────────
     CLOUDFLARE WORKERS — Complete Node.js Built‑ins Externalization

     The Workers V8 isolate does NOT have:
       node:fs, node:os, node:child_process, node:module,
       node:v8, node:worker_threads, node:http, node:https,
       node:http2, node:zlib, node:readline, node:punycode,
       node:trace_events

     Externalizing them tells esbuild to leave the import
     statements intact.  At runtime, Wrangler's [build] alias
     (in wrangler.toml) redirects `fs` and `os` to polyfill
     stubs in lib/polyfills/.  Other Node.js built‑ins are
     provided by the nodejs_compat_v2 runtime flag.

     Modules that nodejs_compat_v2 DOES provide (so we DON'T
     externalize them — let the runtime handle resolution):
       node:assert, node:async_hooks, node:buffer, node:crypto,
       node:dns, node:events, node:net, node:path, node:process,
       node:stream, node:string_decoder, node:tls, node:url,
       node:util

     ⚠️  DO NOT add node:net or node:tls here — the Workers
         runtime provides them, and externalizing prevents
         the polyfill from being loaded correctly.
     ────────────────────────────────────────────────────── */
  edgeExternals: [
    'node:crypto',
    'node:fs',
    'node:os',
    'node:path',
    'node:child_process',
    'node:module',
    'node:v8',
    'node:worker_threads',
    'node:http',
    'node:https',
    'node:http2',
    'node:zlib',
    'node:process',
    'node:readline',
    'node:url',
    'node:querystring',
    'node:string_decoder',
    'node:punycode',
    'node:perf_hooks',
    'node:async_hooks',
    'node:diagnostics_channel',
    'node:trace_events',
  ],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      // Middleware runs at the edge — use the same KV bindings
      // so that cookie-based session reads hit fast KV storage.
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};

export default config;
