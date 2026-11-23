import { describe, it, expect } from 'bun:test';
import { handleHoldingRequest, ROBOTS_HEADER } from '../../apps/web/src/holdingWorker';

describe('ZAYRON-X PRODUCTION ACCESS GATE & HOLDING WORKER', () => {
  const origin = 'https://zayron-x.co';

  it('serves HTTP 200 Coming Soon page on root route with strict deindexing headers', async () => {
    const req = new Request(`${origin}/`);
    const res = handleHoldingRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe(ROBOTS_HEADER);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('ZAYRON-X');
    expect(html).toContain('Platform Access Restricted');
    expect(html).toContain('Private Development');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow, noarchive" />');
    expect(html).toContain('<meta name="googlebot" content="noindex, nofollow, noarchive" />');

    // Negative assertions: zero leak of intelligence features
    expect(html).not.toContain('/intelligence');
    expect(html).not.toContain('mir_');
    expect(html).not.toContain('CVE-');
    expect(html).not.toContain('telemetry');
    expect(html).not.toContain('pricing');
    expect(html).not.toContain('dashboard');
  });

  it('serves HTTP 200 with Disallow: / on /robots.txt with X-Robots-Tag', async () => {
    const req = new Request(`${origin}/robots.txt`);
    const res = handleHoldingRequest(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(res.headers.get('x-robots-tag')).toBe(ROBOTS_HEADER);

    const text = await res.text();
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Disallow: /');
  });

  it('serves HTTP 410 Gone on /sitemap.xml with X-Robots-Tag', async () => {
    const req = new Request(`${origin}/sitemap.xml`);
    const res = handleHoldingRequest(req);

    expect(res.status).toBe(410);
    expect(res.headers.get('x-robots-tag')).toBe(ROBOTS_HEADER);
    const text = await res.text();
    expect(text).toContain('410 Gone');
  });

  it('serves HTTP 410 Gone on retired intelligence and product routes', async () => {
    const retiredPaths = [
      '/intelligence',
      '/intelligence/malware',
      '/intelligence/vulnerabilities',
      '/intelligence/actors',
      '/intelligence/campaigns',
      '/intelligence/iocs',
      '/intelligence/exploits',
      '/intelligence/graph',
      '/research',
      '/malware/intelligence/reports/mir_66cd231d1563b12f',
      '/intelligence/malware/mir_66cd231d1563b12f',
      '/pricing',
    ];

    for (const p of retiredPaths) {
      const req = new Request(`${origin}${p}`);
      const res = handleHoldingRequest(req);

      expect(res.status).toBe(410);
      expect(res.headers.get('x-robots-tag')).toBe(ROBOTS_HEADER);
      const body = await res.text();
      expect(body).toContain('410 Resource Retired');
      expect(body).toContain('<meta name="robots" content="noindex, nofollow, noarchive" />');
      // Must not leak intelligence data
      expect(body).not.toContain('mir_66cd231d1563b12f');
      expect(body).not.toContain('telemetry');
    }
  });

  it('serves HTTP 404 Not Found on arbitrary nonexistent routes with X-Robots-Tag', async () => {
    const req = new Request(`${origin}/arbitrary-nonexistent-path`);
    const res = handleHoldingRequest(req);

    expect(res.status).toBe(404);
    expect(res.headers.get('x-robots-tag')).toBe(ROBOTS_HEADER);
    const body = await res.text();
    expect(body).toContain('404 Not Found');
    expect(body).toContain('<meta name="robots" content="noindex, nofollow, noarchive" />');
  });
});
