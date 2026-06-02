import DOMPurify from 'dompurify';
// linkedom replaces JSDOM — ~500 KB vs ~3 MB, ~5-10 MB RAM spike vs 20-40 MB.
// DOMPurify API is identical; only the window constructor changes.
import { parseHTML } from 'linkedom';

const { window } = parseHTML('<!DOCTYPE html><html><body></body></html>');
const purify = DOMPurify(window as any);

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
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
}
