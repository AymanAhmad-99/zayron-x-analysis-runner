import openNextHandler, {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from './.open-next/worker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const isApex = url.hostname === 'zayron-x.co';
    const isWWW = url.hostname === 'www.zayron-x.co';
    const isHttp = url.protocol === 'http:';

    // Redirect to secure www domain if requesting the apex domain or accessing over insecure HTTP
    if ((isApex || isWWW) && (isApex || isHttp)) {
      url.protocol = 'https:';
      url.hostname = 'www.zayron-x.co';

      return new Response(null, {
        status: 301,
        headers: {
          Location: url.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable', // SEO best-practice permanent redirect caching
        },
      });
    }

    // ── Asset-busting check ───────────────────────────────────────
    // If the request targets HTML pages or Next.js static JS/JSON chunks,
    // strip standard conditional headers (If-None-Match, If-Modified-Since)
    // to block server-side 304 Not Modified responses and force fresh generation.
    const isNextStatic =
      url.pathname.includes('/_next/static/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.json');
    const isPageRequest = request.headers.get('Accept')?.includes('text/html');

    let finalRequest = request;
    if (isNextStatic || isPageRequest) {
      const modifiedHeaders = new Headers(request.headers);
      modifiedHeaders.delete('If-None-Match');
      modifiedHeaders.delete('If-Modified-Since');
      finalRequest = new Request(request, { headers: modifiedHeaders });
    }

    // 2. Delegate normally to the main Next.js/OpenNext application logic
    return openNextHandler.fetch(finalRequest, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    const target = controller.cron.includes('*/5') ? '/api/broadcast' : '/api/ingest/telegram';
    const request = new Request(`https://zayron-x.co${target}`, {
      method: 'POST',
      headers: {
        'x-zayron-automation-secret': env.ZAYRON_AUTOMATION_SECRET,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ source: 'cloudflare-cron', cron: controller.cron }),
    });
    ctx.waitUntil(openNextHandler.fetch(request, env, ctx));
  },
};

// Re-export durable objects required by OpenNext cache system
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge };
