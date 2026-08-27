# ZAYRON-X Runtime Graph

Map of production runtimes:
- **zayron-x-web** (Worker): Wakes via HTTP requests, Stateless, Restarts dynamically, Needs D1/KV depending on rendering.
- **zayron-telegram-collector-do** (Durable Object): Wakes via Worker fetch/cron, Stateful (MTProto session), Persistent WebSocket.
- **zayron-x-ingest** (Worker): Wakes via Cloudflare Queue (zayron-ingest-queue), Stateless, Needs D1/Vectorize/AI.
- **zayron-x-api** (Worker): Wakes via HTTP, Stateless, Needs D1.
