import { TelegramCollectorDO, Env } from './collector-do';

export { TelegramCollectorDO };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Use a singleton Durable Object ID for the global collector
    const id = env.TELEGRAM_COLLECTOR_DO.idFromName('global-telegram-collector');
    const stub = env.TELEGRAM_COLLECTOR_DO.get(id);

    // Proxy requests to the Durable Object
    return stub.fetch(request);
  },
};
