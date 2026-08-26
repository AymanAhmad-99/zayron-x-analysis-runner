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
  hostname: () => 'cloudflare-worker',
  type: () => 'Linux',
  platform: () => 'linux',
  release: () => '1.0.0',
  arch: () => 'x64',
  cpus: () => [
    { model: 'Cloudflare V8', speed: 0, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } },
  ],
  freemem: () => 0,
  totalmem: () => 0,
  loadavg: () => [0, 0, 0],
  uptime: () => 0,
  networkInterfaces: () => ({}),
  userInfo: () => ({ uid: 0, gid: 0, username: 'worker', homedir: '/tmp', shell: '/bin/sh' }),
  homedir: () => '/tmp',
  tmpdir: () => '/tmp',
  endianness: () => 'LE',
  EOL: '\n',
  devNull: '/dev/null',
  constants: {
    signals: {},
    errno: {},
  },
};
