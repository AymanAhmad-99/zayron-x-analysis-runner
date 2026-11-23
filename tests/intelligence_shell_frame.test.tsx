import { describe, test, expect } from "bun:test";
// react-dom is installed under the web app workspace; resolve it explicitly
// so this root-level test needs no extra devDependency.
import { renderToStaticMarkup } from "../apps/web/node_modules/react-dom/server";
import { IntelligenceShellFrame } from "../apps/web/app/components/IntelligenceShellFrame";

/**
 * Regression coverage for the shared responsive intelligence shell.
 * Proves every page that uses the shell renders the mobile toggle + nav, and
 * that the active route is marked. (Open/close + Escape are effect-driven and
 * verified live in the preview browser; SSR covers the structural contract.)
 */
describe("ZAYRON-X — shared intelligence shell", () => {
  const html = renderToStaticMarkup(
    <IntelligenceShellFrame eyebrow="INTELLIGENCE / MALWARE" activeHref="/intelligence/malware">
      <div>content</div>
    </IntelligenceShellFrame>,
  );

  test("1. renders the mobile sidebar toggle (drawer control)", () => {
    expect(html).toContain("sidebar-toggle");
    expect(html).toContain('aria-label="Open intelligence navigation"');
    expect(html).toContain('aria-expanded="false"');
  });

  test("2. renders the full intelligence nav with active route marked", () => {
    expect(html).toContain('href="/intelligence/malware"');
    expect(html).toContain('href="/intelligence/vulnerabilities"');
    expect(html).toContain("intelligence-nav-item active");
    expect(html).toContain('aria-current="page"');
  });

  test("3. drawer is closed by default (no scrim) and content renders", () => {
    expect(html).not.toContain("sidebar-scrim");
    expect(html).toContain("content");
  });
});
