/*
  Edge-native HTML sanitizer with browser and test fallbacks.

  Uses Cloudflare Workers HTMLRewriter when available, DOMParser in
  browsers, and a conservative string fallback elsewhere.
*/

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

const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'form',
  'textarea',
  'select',
  'button',
  'link',
  'meta',
  'base',
  'noscript',
  'svg',
  'math',
];

const ALLOWED_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'a',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'img',
  'span',
  'div',
  'input',
  'figure',
  'figcaption',
  'details',
  'summary',
  'dl',
  'dt',
  'dd',
  'sup',
  'sub',
  'mark',
  'del',
  'ins',
  'abbr',
  'kbd',
  'var',
  'samp',
]);

const ALLOWED_ATTRS = new Set([
  'href',
  'src',
  'alt',
  'title',
  'class',
  'id',
  'target',
  'rel',
  'width',
  'height',
  'type',
  'checked',
  'disabled',
  'colspan',
  'rowspan',
  'scope',
  'loading',
  'decoding',
  'name',
]);

const EVENT_HANDLER_RE = /^on/i;
const DANGEROUS_STYLE_RE =
  /expression\s*\(|url\s*\(\s*['"]?\s*(?:javascript:|data:text\/html)|behavior\s*:|@import/iu;
const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|#|\/)/i;
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'poster']);

function trimHtml(dirty: string): string {
  if (!dirty) return '';
  if (dirty.length <= MAX_HTML_SIZE_BYTES) return dirty;

  console.warn(
    `[sanitizeHtml] Content too large (${dirty.length} bytes). ` +
      `Truncating to ${MAX_HTML_SIZE_BYTES} bytes.`,
  );
  return dirty.slice(0, MAX_HTML_SIZE_BYTES);
}

function isSafeUrl(value: string): boolean {
  return SAFE_URL_RE.test(value.trim());
}

function sanitizeAttribute(name: string, value: string): string | null {
  const lower = name.toLowerCase();

  if (EVENT_HANDLER_RE.test(lower)) return null;
  if (!ALLOWED_ATTRS.has(lower)) return null;
  if (lower === 'style' && DANGEROUS_STYLE_RE.test(value)) return null;
  if (URL_ATTRS.has(lower) && value && !isSafeUrl(value)) return null;

  return lower === 'target' ? value.toLowerCase() : value;
}

function applySafeLinkRel(attrs: Map<string, string>) {
  if (attrs.get('target') === '_blank') {
    attrs.set('rel', 'noopener noreferrer');
  }
}

function sanitizeHtmlWithDomParser(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  for (const tag of DANGEROUS_TAGS) {
    for (const node of Array.from(doc.querySelectorAll(tag))) {
      node.remove();
    }
  }

  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    const tagName = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    const nextAttrs = new Map<string, string>();

    for (const attr of Array.from(el.attributes)) {
      const sanitizedValue = sanitizeAttribute(attr.name, attr.value);
      if (sanitizedValue !== null) {
        nextAttrs.set(attr.name.toLowerCase(), sanitizedValue);
      }
    }

    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }

    applySafeLinkRel(nextAttrs);

    for (const [name, value] of nextAttrs) {
      el.setAttribute(name, value);
    }
  }

  return doc.body.innerHTML;
}

async function sanitizeHtmlWithHtmlRewriter(html: string): Promise<string> {
  const rewriter = new HTMLRewriter();

  for (const tag of DANGEROUS_TAGS) {
    rewriter.on(tag, {
      element(el: CFElement) {
        el.remove();
      },
    });
  }

  rewriter.on('*', {
    element(el: CFElement) {
      const tagName = el.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        el.removeAndKeepContent();
        return;
      }

      const nextAttrs = new Map<string, string>();
      const seenAttrs = new Set<string>();

      for (const [name, value] of el.attributes) {
        const lower = name.toLowerCase();
        seenAttrs.add(name);

        const sanitizedValue = sanitizeAttribute(name, value);
        if (sanitizedValue === null) {
          el.removeAttribute(name);
          continue;
        }

        nextAttrs.set(lower, sanitizedValue);
      }

      applySafeLinkRel(nextAttrs);

      for (const [name, value] of nextAttrs) {
        el.setAttribute(name, value);
      }

      if (seenAttrs.has('target') || seenAttrs.has('TARGET')) {
        const target = nextAttrs.get('target');
        if (!target) {
          el.removeAttribute('target');
        }
      }
    },
  });

  const response = rewriter.transform(
    new Response(html, {
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    }),
  );

  return await response.text();
}

function sanitizeHtmlWithStringFallback(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|applet|form|textarea|select|button|link|meta|base|noscript|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu,
      '',
    )
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/giu, '')
    .replace(/\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/giu, '')
    .replace(/\s+(href|src|action|formaction|poster)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/giu, '')
    .replace(
      /\s+(href|src|action|formaction|poster)\s*=\s*(['"])\s*data:text\/html[\s\S]*?\2/giu,
      '',
    )
    .replace(
      /<a\b([^>]*?)\s+target=(['_"])_blank\2([^>]*)>/giu,
      '<a$1 target="_blank" rel="noopener noreferrer"$3>',
    )
    .replace(
      /<\s*\/?\s*(?!p\b|h1\b|h2\b|h3\b|h4\b|h5\b|h6\b|ul\b|ol\b|li\b|strong\b|em\b|b\b|i\b|u\b|s\b|a\b|code\b|pre\b|blockquote\b|hr\b|br\b|table\b|thead\b|tbody\b|tfoot\b|tr\b|th\b|td\b|img\b|span\b|div\b|input\b|figure\b|figcaption\b|details\b|summary\b|dl\b|dt\b|dd\b|sup\b|sub\b|mark\b|del\b|ins\b|abbr\b|kbd\b|var\b|samp\b)[a-z0-9:-]+\b[^>]*>/giu,
      '',
    );
}

export async function sanitizeHtml(dirty: string): Promise<string> {
  const html = trimHtml(dirty);
  if (!html) return '';

  try {
    if (typeof HTMLRewriter !== 'undefined') {
      return await sanitizeHtmlWithHtmlRewriter(html);
    }

    if (typeof DOMParser !== 'undefined') {
      return sanitizeHtmlWithDomParser(html);
    }

    return sanitizeHtmlWithStringFallback(html);
  } catch (err) {
    console.error(
      '[sanitizeHtml] Edge sanitization failed:',
      err instanceof Error ? err.message : String(err),
    );
    return sanitizeHtmlWithStringFallback(html);
  }
}
