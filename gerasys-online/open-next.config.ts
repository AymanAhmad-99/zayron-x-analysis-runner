import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'kv',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  cloudflare: {
    dangerousDisableConfigValidation: true,
  },
} as any;

export default config;
