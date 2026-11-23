/**
 * ZAYRON-X Public Production Access Gate & Holding Worker
 *
 * Implements a fail-closed, zero-leak public access barrier for:
 * https://zayron-x.co and https://www.zayron-x.co
 *
 * Enforces:
 * 1. Root route ("/") -> HTTP 200 Minimal, high-trust "Coming Soon" holding page.
 * 2. Robots policy ("/robots.txt") -> HTTP 200 deliberate pre-launch policy.
 *    Crawling is ALLOWED so crawlers can fetch retired URLs and observe the
 *    authoritative HTTP 410 Gone (a bare `Disallow: /` would hide the 410s).
 * 3. Sitemap ("/sitemap.xml") -> HTTP 410 Gone (purges previous crawlers).
 * 4. Retired intelligence routes -> HTTP 410 Gone with explicit noindex metadata.
 * 5. All other nonexistent paths -> HTTP 404 Not Found.
 * 6. X-Robots-Tag: "noindex, nofollow, noarchive" header on EVERY response.
 * 7. Zero exposure of intelligence records, malware/vulnerability data, telemetry, or internal APIs.
 */

export const ROBOTS_HEADER = 'noindex, nofollow, noarchive';

const RETIRED_ROUTES_PREFIXES = [
  '/intelligence',
  '/malware',
  '/vulnerabilities',
  '/threats',
  '/actors',
  '/campaigns',
  '/iocs',
  '/exploits',
  '/research',
  '/news',
  '/search',
  '/pricing',
  '/onboarding',
  '/dashboard',
  '/reports',
];

const HOLDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZAYRON-X — Pre-Launch</title>
  <meta name="description" content="ZAYRON-X is currently in private development. Public access and discovery are restricted." />
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <meta name="googlebot" content="noindex, nofollow, noarchive" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Crect%20width='32'%20height='32'%20rx='6'%20fill='%2307090e'/%3E%3Ctext%20x='16'%20y='22'%20font-family='Arial,sans-serif'%20font-size='18'%20font-weight='bold'%20fill='%2338bdf8'%20text-anchor='middle'%3EZ%3C/text%3E%3C/svg%3E" />
  <style>
    :root {
      --bg: #07090e;
      --card-bg: rgba(14, 18, 27, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(56, 189, 248, 0.25);
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
      --text-dim: #64748b;
      --cyan: #38bdf8;
      --cyan-glow: rgba(56, 189, 248, 0.15);
      --amber: #f59e0b;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.08) 0%, transparent 60%),
        radial-gradient(circle at 80% 80%, rgba(14, 165, 233, 0.04) 0%, transparent 40%);
      color: var(--text-main);
      font-family: var(--font-family);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      width: 100%;
      max-width: 580px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 48px 40px;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
      text-align: center;
      position: relative;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #fbbf24;
      box-shadow: 0 0 8px #fbbf24;
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #ffffff;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .tagline {
      font-size: 13px;
      letter-spacing: 0.15em;
      color: var(--cyan);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .divider {
      height: 1px;
      width: 60px;
      background: var(--border-accent);
      margin: 0 auto 24px auto;
    }
    .headline {
      font-size: 20px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text-main);
      margin-bottom: 16px;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-muted);
      margin-bottom: 32px;
    }
    .contact-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 28px;
    }
    .contact-link {
      color: var(--cyan);
      text-decoration: none;
      font-weight: 500;
      transition: color 0.15s ease;
    }
    .contact-link:hover {
      color: #7dd3fc;
      text-decoration: underline;
    }
    .footer {
      font-size: 11px;
      color: var(--text-dim);
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">
      <span class="badge-dot"></span>
      Private Development — Pre-Launch
    </div>
    <div class="brand">ZAYRON-X</div>
    <div class="tagline">Evidence-Driven Cyber Threat Intelligence</div>
    <div class="divider"></div>
    <h1 class="headline">Platform Access Restricted</h1>
    <p class="description">
      The ZAYRON-X intelligence platform is currently undergoing closed engineering validation. Public access, registrations, and automated data discovery are restricted.
    </p>
    <div class="contact-box">
      For technical research inquiries or institutional partnerships:
      <br /><br />
      <a class="contact-link" href="mailto:contact@zayron-x.co">contact@zayron-x.co</a>
    </div>
    <div class="footer">
      &copy; 2026 ZAYRON-X. Evidentiary Architecture. All rights reserved.
    </div>
  </div>
</body>
</html>`;

const GONE_HTML = (path: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>410 Gone — ZAYRON-X</title>
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <meta name="googlebot" content="noindex, nofollow, noarchive" />
  <style>
    body {
      background-color: #07090e;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 480px;
      background: rgba(14, 18, 27, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 36px 32px;
    }
    h1 { color: #f1f5f9; font-size: 24px; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    a { color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>410 Resource Retired</h1>
    <p>The requested route has been removed from public access. The ZAYRON-X intelligence platform is currently in restricted pre-launch development.</p>
    <a href="/">Return to ZAYRON-X</a>
  </div>
</body>
</html>`;

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>404 Not Found — ZAYRON-X</title>
  <meta name="robots" content="noindex, nofollow, noarchive" />
  <meta name="googlebot" content="noindex, nofollow, noarchive" />
  <style>
    body {
      background-color: #07090e;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 480px;
      background: rgba(14, 18, 27, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 36px 32px;
    }
    h1 { color: #f1f5f9; font-size: 24px; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    a { color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404 Not Found</h1>
    <p>The requested page does not exist. ZAYRON-X is currently in private pre-launch development.</p>
    <a href="/">Return to ZAYRON-X</a>
  </div>
</body>
</html>`;

export function handleHoldingRequest(request: Request, env?: any): Response {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Base security & deindexing headers applied to ALL responses
  const baseHeaders = new Headers({
    'X-Robots-Tag': ROBOTS_HEADER,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    // This surface emits only static HTML with inline <style> and no scripts, so
    // a restrictive policy is safe here and cannot affect the Next.js app.
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });

  // 1. Root route: 200 Coming Soon
  if (pathname === '/' || pathname === '') {
    baseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(HOLDING_HTML, {
      status: 200,
      statusText: 'OK',
      headers: baseHeaders,
    });
  }

  // 2. Robots policy: deliberate pre-launch policy (200).
  //    `Disallow: /` must NOT be the primary removal mechanism: crawlers have
  //    to be able to fetch retired product URLs and observe the authoritative
  //    HTTP 410 Gone so they permanently drop them. No sitemap is advertised.
  if (pathname === '/robots.txt') {
    baseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
    baseHeaders.set('Cache-Control', 'public, max-age=3600');
    return new Response(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        '',
        '# ZAYRON-X is pre-launch. Retired product routes return HTTP 410 Gone',
        '# so crawlers permanently drop them. The homepage is served with',
        '# noindex/nofollow/noarchive. No sitemap is published pre-launch.',
        '',
      ].join('\n'),
      { status: 200, statusText: 'OK', headers: baseHeaders },
    );
  }

  // 3. Sitemap: 410 Gone (explicitly instruct crawlers that sitemap is permanently gone)
  if (pathname === '/sitemap.xml' || pathname === '/sitemap_index.xml') {
    baseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
    return new Response('410 Gone: Sitemap has been permanently removed.', {
      status: 410,
      statusText: 'Gone',
      headers: baseHeaders,
    });
  }

  // 4. Retired product/intelligence routes: 410 Gone
  const isRetiredRoute = RETIRED_ROUTES_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isRetiredRoute) {
    baseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(GONE_HTML(pathname), {
      status: 410,
      statusText: 'Gone',
      headers: baseHeaders,
    });
  }

  // 5. Static Assets fallback (favicon, manifest)
  if (
    pathname === '/favicon.ico' ||
    pathname === '/site.webmanifest' ||
    pathname.startsWith('/favicon-') ||
    pathname.startsWith('/apple-touch-icon')
  ) {
    if (env?.ASSETS) {
      // Delegate to assets binding if present, while forcing X-Robots-Tag
      return env.ASSETS.fetch(request).then((res: Response) => {
        const newHeaders = new Headers(res.headers);
        newHeaders.set('X-Robots-Tag', ROBOTS_HEADER);
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: newHeaders,
        });
      });
    }
  }

  // 6. Default fallback for unknown routes: 404 Not Found
  baseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    statusText: 'Not Found',
    headers: baseHeaders,
  });
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    return handleHoldingRequest(request, env);
  },
};
