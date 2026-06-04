// open-next.config.ts
var config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "kv",
      tagCache: "dummy",
      queue: "dummy"
    }
  },
  cloudflare: {
    dangerousDisableConfigValidation: true
  }
};
var open_next_config_default = config;
export {
  open_next_config_default as default
};
