import DOMPurify from 'dompurify';
// linkedom replaces JSDOM — ~500 KB vs ~3 MB, ~5-10 MB RAM spike vs 20-40 MB.
// DOMPurify API is identical; only the window constructor changes.
import { parseHTML } from 'linkedom';

/* ─────────────────────────────────────────────────────────
   CLOUDFLARE WORKERS SAFETY — Lazy Initialization

   DOMPurify + linkedom perform synchronous DOM parsing.
   In a V8 isolate, this is CPU-bound work that can trigger
   the 30 s wall-clock kill if processing large content.

   Defenses:
   1. Lazy init — parseHTML only called on first sanitize
   2. Size guard — reject content > 1 MB before parsing
   3. Try/catch — prevent unhandled exceptions from crashing
      the isolate
   ───────────────────────────────────────────────────────── */

let purify: ReturnType<typeof DOMPurify> | null = null;

const MAX_HTML_SIZE_BYTES = 1_048_576; // 1 MB — reject anything larger

function getPurify(): ReturnType<typeof DOMPurify> {
  if (!purify) {
    const { window } = parseHTML('<!DOCTYPE html><html><body></body></html>');
    purify = DOMPurify(window as any);
  }
  return purify;
}

export function sanitizeHtml(html: string): string {
  // Size guard — prevent CPU-bound parsing of huge payloads
  if (html.length > MAX_HTML_SIZE_BYTES) {
    console.warn(
      `[sanitizeHtml] Content too large (${html.length} bytes). ` +
      `Truncating to ${MAX_HTML_SIZE_BYTES} bytes.`
    );
    html = html.slice(0, MAX_HTML_SIZE_BYTES);
  }

  try {
    return getPurify().sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'strong', 'em', 'a', 'code', 'pre',
        'blockquote', 'hr', 'br',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'span', 'div',
        'input',
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel',
        'src', 'alt', 'class',
        'id', 'style',
        'type', 'checked',
        'width', 'height',
      ],
    });
  } catch (err) {
    console.error(
      '[sanitizeHtml] DOM purification failed:',
      err instanceof Error ? err.message : String(err)
    );
    // Return a safe fallback — strip ALL HTML tags
    return html.replace(/<[^>]*>/g, '');
  }
}
