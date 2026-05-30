import cache from "@opennextjs/cloudflare/kvCache";

export default {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: async () => cache,
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
    },
  },
};
