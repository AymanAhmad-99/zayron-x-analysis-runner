/**
 * Cloudflare Workers os polyfill — CommonJS stub
 *
 * Next.js internals import `os` for system information (os.cpus(),
 * os.freemem(), os.hostname(), etc.).  The Workers V8 isolate has no
 * OS-level APIs, so every method returns a safe default.
 *
 * This file is copied to .open-next/server-functions/default/ after the
 * OpenNext build and `require("node:os")` calls are rewritten to point here.
 */

module.exports = {
  hostname: function () { return "cloudflare-worker"; },
  type: function () { return "Linux"; },
  platform: function () { return "linux"; },
  release: function () { return "1.0.0"; },
  arch: function () { return "x64"; },
  cpus: function () {
    return [{ model: "Cloudflare V8", speed: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }];
  },
  freemem: function () { return 0; },
  totalmem: function () { return 0; },
  loadavg: function () { return [0, 0, 0]; },
  uptime: function () { return 0; },
  networkInterfaces: function () { return {}; },
  userInfo: function () { return { uid: 0, gid: 0, username: "worker", homedir: "/tmp", shell: "/bin/sh" }; },
  homedir: function () { return "/tmp"; },
  tmpdir: function () { return "/tmp"; },
  endianness: function () { return "LE"; },
  EOL: "\n",
  devNull: "/dev/null",
  constants: {
    signals: {},
    errno: {},
  },
};
