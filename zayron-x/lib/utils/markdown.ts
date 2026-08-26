/* ─────────────────────────────────────────────────────────
   Markdown HTML sanitization — Cloudflare Workers edition

   Uses the edge-native HTMLRewriter-based sanitizer.
   ZERO Node.js built-ins.  No linkedom.  No DOMPurify.
   ───────────────────────────────────────────────────────── */

export { sanitizeHtml } from './sanitize-edge';
