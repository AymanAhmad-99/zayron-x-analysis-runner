/**
 * Universal NOOP Polyfill for Cloudflare Workers
 *
 * Many Node.js built-in modules (http, https, zlib, child_process,
 * net, tls, dns, etc.) are imported by Next.js internals and Sentry's
 * Node.js fallback paths, but are never actually called at runtime in
 * an edge environment where all I/O goes through fetch().
 *
 * Exporting an empty object prevents "No such module" crashes (error
 * code 10021) without adding any runtime overhead.
 */
module.exports = {};
