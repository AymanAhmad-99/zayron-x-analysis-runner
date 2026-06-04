/* ─────────────────────────────────────────────────────────
   Edge-native HTML sanitizer — Cloudflare Workers compatible

   Uses the Workers-built-in HTMLRewriter to strip dangerous
   content from HTML strings.  ZERO npm dependencies.
   ZERO Node.js built-ins.  Runs at the edge with zero cost.

   Replaces the old DOMPurify + linkedom combo which pulled
   in `node:fs` and crashed the V8 isolate.
   ───────────────────────────────────────────────────────── */

/* ── Cloudflare Workers HTMLRewriter type declarations ──
   Declared inline so we don't need @cloudflare/workers-types
   as an npm dependency.  These types are provided at runtime
   by the Workers V8 isolate.
   ─────────────────────────────────────────────────────── */
interface CFElement {
  tagName: string;
  readonly attributes: IterableIterator<[string, string]>;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  remove(): void;
  removeAndKeepContent(): void;
}

interface CFElementHandler {
  element?(el: CFElement): void | Promise<void>;
  comments?(comment: { text: string; remove(): void }): void | Promise<void>;
  text?(chunk: { text: string; lastInTextNode: boolean }): void | Promise<void>;
}

declare class HTMLRewriter {
  on(selector: string, handler: CFElementHandler): HTMLRewriter;
  transform(response: Response): Response;
}

const MAX_HTML_SIZE_BYTES = 1_048_576; // 1 MB

/** Tags that are allowed to survive sanitization. */
const ALLOWED_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'code', 'pre',
  'blockquote', 'hr', 'br',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'img', 'span', 'div',
  'input',
  'figure', 'figcaption',
  'details', 'summary',
  'dl', 'dt', 'dd',
  'sup', 'sub',
  'mark', 'del', 'ins',
  'abbr', 'kbd', 'var', 'samp',
]);

/** Attributes that are safe to keep on any element. */
const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'class', 'id',
  'target', 'rel',
  'width', 'height',
  'style',
  'type', 'checked', 'disabled',
  'colspan', 'rowspan', 'scope',
  'loading', 'decoding',
  'name',
]);

/** Event handler attribute prefixes — always dangerous. */
const EVENT_HANDLER_RE = /^on/i;

/** Protocols allowed in href / src / action attributes. */
const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|#|\/)/i;

/** Attributes that contain URLs and must be URL-validated. */
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster']);

/**
 * Sanitize an HTML string for safe rendering.
 *
 * Uses Cloudflare's built-in HTMLRewriter — zero dependencies,
 * zero Node.js modules, runs natively on the Workers runtime.
 *
 * @param html  Raw HTML string (typically from Markdown rendering).
 * @returns     Sanitised HTML with dangerous elements removed.
 */
export async function sanitizeHtml(dirty: string): Promise<string> {
  if (!dirty) return '';

  // Size guard — prevent CPU-bound parsing of huge payloads
  let html = dirty;
  if (html.length > MAX_HTML_SIZE_BYTES) {
    console.warn(
      `[sanitizeHtml] Content too large (${html.length} bytes). ` +
      `Truncating to ${MAX_HTML_SIZE_BYTES} bytes.`,
    );
    html = html.slice(0, MAX_HTML_SIZE_BYTES);
  }

  try {
    const rewriter = new HTMLRewriter();

    // ── Remove dangerous tags entirely (tag + content) ────
    for (const tag of ['script', 'style', 'iframe', 'object', 'embed', 'applet', 'form', 'textarea', 'select', 'button', 'link', 'meta', 'base', 'noscript']) {
      rewriter.on(tag, {
        element(el: CFElement) { el.remove(); },
      });
    }

    // ── Scrub attributes on every element ─────────────────
    rewriter.on('*', {
      element(el: CFElement) {
        const tagName = el.tagName.toLowerCase();

        // If the tag itself isn't allowed, remove it but keep
        // its text children (unwrap, don't nuke content).
        if (!ALLOWED_TAGS.has(tagName)) {
          el.removeAndKeepContent();
          return;
        }

        // Scrub each attribute on allowed elements.
        const toRemove: string[] = [];
        for (const [name] of el.attributes) {
          const lower = name.toLowerCase();

          // Remove event handlers (onclick, onerror, etc.)
          if (EVENT_HANDLER_RE.test(lower)) {
            toRemove.push(name);
            continue;
          }

          // Remove non-allowlisted attributes
          if (!ALLOWED_ATTRS.has(lower)) {
            toRemove.push(name);
            continue;
          }

          // URL-validate attributes that can contain hrefs
          if (URL_ATTRS.has(lower)) {
            const val = el.getAttribute(name) ?? '';
            if (val && !SAFE_URL_RE.test(val.trim())) {
              toRemove.push(name);
            }
          }
        }

        for (const attr of toRemove) {
          el.removeAttribute(attr);
        }
      },
    });

    // HTMLRewriter operates on Response objects — wrap the HTML
    // in a minimal Response, transform, and read back out.
    const response = rewriter.transform(
      new Response(html, {
        headers: { 'content-type': 'text/html;charset=UTF-8' },
      }),
    );

    return await response.text();
  } catch (err) {
    console.error(
      '[sanitizeHtml] Edge sanitization failed:',
      err instanceof Error ? err.message : String(err),
    );
    // Safe fallback — strip ALL HTML tags
    return html.replace(/<[^>]*>/g, '');
  }
}
