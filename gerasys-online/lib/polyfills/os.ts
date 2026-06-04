/* ─────────────────────────────────────────────────────────
   Cloudflare Workers os polyfill — NOOP stub

   Cloudflare Workers V8 isolates have no OS-level APIs.
   This stub prevents "No such module: node:os" errors
   when a dependency imports `os` at the top level.
   ───────────────────────────────────────────────────────── */

const os = {
  hostname: () => 'cloudflare-worker',
  type: () => 'Linux',
  platform: () => 'linux',
  arch: () => 'x64',
  release: () => '5.0.0',
  uptime: () => 0,
  loadavg: () => [0, 0, 0],
  totalmem: () => 0,
  freemem: () => 0,
  cpus: () => [],
  networkInterfaces: () => ({}),
  userInfo: () => ({ uid: 0, gid: 0, username: 'worker', homedir: '/', shell: '/bin/sh' }),
  homedir: () => '/',
  tmpdir: () => '/tmp',
  endianness: () => 'LE',
  EOL: '\n',
  devNull: '/dev/null',
  constants: {
    signals: {},
    errno: {},
  },
};

export default os;
export const {
  hostname,
  type,
  platform,
  arch,
  release,
  uptime,
  loadavg,
  totalmem,
  freemem,
  cpus,
  networkInterfaces,
  userInfo,
  homedir,
  tmpdir,
  endianness,
  EOL,
  devNull,
  constants,
} = os;
