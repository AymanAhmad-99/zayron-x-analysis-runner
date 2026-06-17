import { describe, expect, it } from 'vitest';

import { sanitizeHtml } from '@/lib/utils/sanitize-edge';

describe('sanitizeHtml', () => {
  it('removes script tags, event handlers, unsafe styles, and javascript URLs', async () => {
    const dirty = `
      <h2 onclick="alert(1)">Headline</h2>
      <p style="background-image:url(javascript:alert(1))">Body</p>
      <a href="javascript:alert(1)" target="_blank">Click me</a>
      <img src="/safe.png" onerror="alert(1)" />
      <iframe src="https://evil.example/embed"></iframe>
      <script>alert('owned')</script>
    `;

    const sanitized = await sanitizeHtml(dirty);

    expect(sanitized).toContain('<h2>Headline</h2>');
    expect(sanitized).toContain('<p>Body</p>');
    expect(sanitized).toContain('<a target="_blank" rel="noopener noreferrer">Click me</a>');
    expect(sanitized).toContain('<img src="/safe.png" />');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('<iframe');
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('background-image');
  });

  it('preserves safe formatting tags and safe links', async () => {
    const dirty = `
      <h3>Intel</h3>
      <p><strong>Critical</strong> update with <em>context</em>.</p>
      <blockquote>Quoted text</blockquote>
      <table><tbody><tr><td><a href="https://example.com/report">Report</a></td></tr></tbody></table>
      <pre><code>rule example { condition: true }</code></pre>
    `;

    const sanitized = await sanitizeHtml(dirty);

    expect(sanitized).toContain('<h3>Intel</h3>');
    expect(sanitized).toContain('<strong>Critical</strong>');
    expect(sanitized).toContain('<em>context</em>');
    expect(sanitized).toContain('<blockquote>Quoted text</blockquote>');
    expect(sanitized).toContain(
      '<table><tbody><tr><td><a href="https://example.com/report">Report</a></td></tr></tbody></table>',
    );
    expect(sanitized).toContain('<pre><code>rule example { condition: true }</code></pre>');
  });
});
