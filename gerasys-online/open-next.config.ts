import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: any = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: true,
    },
  },
};

export default config;
