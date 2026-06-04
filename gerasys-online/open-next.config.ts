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
     CLOUDFLARE WORKERS HANG FIX — edgeExternals

     The `postgres` npm package internally requires these
     Node.js built-in modules to establish TCP/TLS/DNS
     connections.  Externalizing them ensures the Workers
     runtime's nodejs_compat_v2 polyfills handle them
     instead of the bundler including conflicting shims.

     Without this: the bundler may embed Node.js polyfills
     that deadlock with the Workers runtime's connect() API,
     causing the "Worker had hung" kill at 30 s wall-clock.
     ────────────────────────────────────────────────────── */
  edgeExternals: [
    'node:crypto',
    'node:net',
    'node:tls',
    'node:dns',
    'node:stream',
    'node:buffer',
    'node:events',
    'node:assert',
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
