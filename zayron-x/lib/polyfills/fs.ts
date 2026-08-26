/* ─────────────────────────────────────────────────────────
   Cloudflare Workers fs polyfill — NOOP stub

   Cloudflare Workers V8 isolates have NO filesystem.
   This stub prevents "No such module: node:fs" errors
   when a dependency (e.g. `postgres` npm package) imports
   `fs` at the top level but never actually calls it at
   runtime (because we pass SSL config as strings, not
   file paths).

   Any runtime call to fs methods will throw ENOSYS.
   ───────────────────────────────────────────────────────── */

const ENOSYS = (method: string) => () => {
  throw new Error(`fs.${method} is not available in Cloudflare Workers (no filesystem).`);
};

const promisesStub = {
  readFile: ENOSYS('promises.readFile'),
  writeFile: ENOSYS('promises.writeFile'),
  readdir: ENOSYS('promises.readdir'),
  mkdir: ENOSYS('promises.mkdir'),
  stat: ENOSYS('promises.stat'),
  unlink: ENOSYS('promises.unlink'),
  rename: ENOSYS('promises.rename'),
};

const fs = {
  readFile: ENOSYS('readFile'),
  readFileSync: ENOSYS('readFileSync'),
  writeFile: ENOSYS('writeFile'),
  writeFileSync: ENOSYS('writeFileSync'),
  existsSync: ENOSYS('existsSync'),
  statSync: ENOSYS('statSync'),
  readdirSync: ENOSYS('readdirSync'),
  mkdirSync: ENOSYS('mkdirSync'),
  unlinkSync: ENOSYS('unlinkSync'),
  renameSync: ENOSYS('renameSync'),
  promises: promisesStub,
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
};

export default fs;
export const {
  readFile,
  readFileSync,
  writeFile,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
  mkdirSync,
  unlinkSync,
  renameSync,
  promises,
  constants,
} = fs;
