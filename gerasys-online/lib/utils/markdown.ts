import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = DOMPurify(window as any);

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "strong", "em", "a", "code", "pre",
      "blockquote", "hr", "br",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "span", "div",
      "input",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel",
      "src", "alt", "class",
      "id", "style",
      "type", "checked",
      "width", "height",
    ],
  });
}
