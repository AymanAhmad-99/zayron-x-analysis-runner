/**
 * Cloudflare Workers fs polyfill — CommonJS stub
 *
 * Next.js internals (app-page.runtime.prod.js, node-environment extensions,
 * etc.) import `fs` for file-system operations.  The Workers V8 isolate has
 * no filesystem, so every method returns a safe fallback rather than throwing.
 *
 * STRATEGY:
 *   Probing methods (existsSync, statSync, readdirSync, etc.) return safe
 *   defaults (false, [], ENOENT) so Next.js startup proceeds cleanly.
 *
 *   Mutation methods (writeFileSync, mkdirSync, etc.) throw ENOSYS — if
 *   those are reached at runtime, it's a real bug that needs attention.
 *
 * This file is copied to .open-next/server-functions/default/ after the
 * OpenNext build and `require("node:fs")` calls are rewritten to point here.
 */

// Standard ENOENT error — catchable by Next.js internals
function enoent(method, pathArg) {
  var err = new Error("ENOENT: no such file or directory, " + method + " '" + (pathArg || "/") + "'");
  err.code = "ENOENT";
  err.errno = -2;
  err.syscall = method;
  err.path = pathArg || "/";
  return err;
}

function enosys(method) {
  var err = new Error("ENOSYS: " + method + " is not available in Cloudflare Workers (no filesystem).");
  err.code = "ENOSYS";
  err.errno = -38;
  return err;
}

// ── Sync probing methods — safe fallbacks ──────────────────

function existsSync(path) { return false; }
function statSync(path) { throw enoent("stat", path); }
function lstatSync(path) { throw enoent("lstat", path); }
function fstatSync(fd) { throw enoent("fstat"); }
function readdirSync(path) { return []; }
function readFileSync(path) { throw enoent("open", path); }
function realpathSync(path) { return path; }
function accessSync(path, mode) { throw enoent("access", path); }

// ── Async probing methods — callback with safe fallback ────

function exists(path, cb) { if (cb) cb(false); }
function stat(path, cb) { if (cb) cb(enoent("stat", path)); }
function lstat(path, cb) { if (cb) cb(enoent("lstat", path)); }
function fstat(fd, cb) { if (cb) cb(enoent("fstat")); }
function readdir(path, cb) { if (cb) cb(null, []); }
function readFile(path, opts, cb) {
  if (!cb && typeof opts === "function") { cb = opts; }
  if (cb) cb(enoent("open", path));
}
function access(path, mode, cb) {
  if (!cb && typeof mode === "function") { cb = mode; }
  if (cb) cb(enoent("access", path));
}
function realpath(path, cb) { if (cb) cb(null, path); }

// ── Mutation methods — throw ENOSYS (real bug if reached) ──

var ENOSYS = function (method) {
  return function () { throw enosys(method); };
};

var fs = {
  // Sync probes
  existsSync: existsSync,
  statSync: statSync,
  lstatSync: lstatSync,
  fstatSync: fstatSync,
  readdirSync: readdirSync,
  readFileSync: readFileSync,
  realpathSync: realpathSync,
  accessSync: accessSync,

  // Async probes
  exists: exists,
  stat: stat,
  lstat: lstat,
  fstat: fstat,
  readdir: readdir,
  readFile: readFile,
  access: access,
  realpath: realpath,

  // Mutations — throw
  writeFile: ENOSYS("writeFile"),
  writeFileSync: ENOSYS("writeFileSync"),
  mkdirSync: ENOSYS("mkdirSync"),
  mkdir: ENOSYS("mkdir"),
  unlinkSync: ENOSYS("unlinkSync"),
  unlink: ENOSYS("unlink"),
  renameSync: ENOSYS("renameSync"),
  rename: ENOSYS("rename"),
  rmdirSync: ENOSYS("rmdirSync"),
  rmdir: ENOSYS("rmdir"),
  symlinkSync: ENOSYS("symlinkSync"),
  symlink: ENOSYS("symlink"),
  truncateSync: ENOSYS("truncateSync"),
  truncate: ENOSYS("truncate"),
  utimesSync: ENOSYS("utimesSync"),
  utimes: ENOSYS("utimes"),
  chmodSync: ENOSYS("chmodSync"),
  chmod: ENOSYS("chmod"),
  chownSync: ENOSYS("chownSync"),
  chown: ENOSYS("chown"),
  linkSync: ENOSYS("linkSync"),
  link: ENOSYS("link"),
  copyFileSync: ENOSYS("copyFileSync"),
  copyFile: ENOSYS("copyFile"),
  appendFileSync: ENOSYS("appendFileSync"),
  appendFile: ENOSYS("appendFile"),
  open: ENOSYS("open"),
  close: ENOSYS("close"),
  read: ENOSYS("read"),
  write: ENOSYS("write"),
  createReadStream: ENOSYS("createReadStream"),
  createWriteStream: ENOSYS("createWriteStream"),
  watch: ENOSYS("watch"),
  watchFile: ENOSYS("watchFile"),
  unwatchFile: ENOSYS("unwatchFile"),

  // Promises — probing reject with ENOENT, mutations reject with ENOSYS
  promises: {
    readFile: function () { return Promise.reject(enoent("open", arguments[0])); },
    writeFile: function () { return Promise.reject(enosys("writeFile")); },
    readdir: function () { return Promise.resolve([]); },
    mkdir: function () { return Promise.reject(enosys("mkdir")); },
    stat: function (path) { return Promise.reject(enoent("stat", path)); },
    lstat: function (path) { return Promise.reject(enoent("lstat", path)); },
    unlink: function () { return Promise.reject(enosys("unlink")); },
    rename: function () { return Promise.reject(enosys("rename")); },
    access: function (path) { return Promise.reject(enoent("access", path)); },
    chmod: function () { return Promise.reject(enosys("chmod")); },
    chown: function () { return Promise.reject(enosys("chown")); },
    copyFile: function () { return Promise.reject(enosys("copyFile")); },
    link: function () { return Promise.reject(enosys("link")); },
    rmdir: function () { return Promise.reject(enosys("rmdir")); },
    symlink: function () { return Promise.reject(enosys("symlink")); },
    truncate: function () { return Promise.reject(enosys("truncate")); },
    utimes: function () { return Promise.reject(enosys("utimes")); },
    realpath: function (path) { return Promise.resolve(path); },
    open: function () { return Promise.reject(enosys("open")); },
    close: function () { return Promise.reject(enosys("close")); },
    read: function () { return Promise.reject(enosys("read")); },
    write: function () { return Promise.reject(enosys("write")); },
    appendFile: function () { return Promise.reject(enosys("appendFile")); },
  },

  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },

  // Dirent and Stats constructors — usable as empty objects
  Dirent: function Dirent() { this.name = ""; },
  Stats: function Stats() {
    this.dev = 0;
    this.ino = 0;
    this.mode = 0;
    this.nlink = 0;
    this.uid = 0;
    this.gid = 0;
    this.rdev = 0;
    this.size = 0;
    this.blksize = 0;
    this.blocks = 0;
    this.atimeMs = 0;
    this.mtimeMs = 0;
    this.ctimeMs = 0;
    this.birthtimeMs = 0;
  },
};

fs.Stats.prototype.isFile = function () { return false; };
fs.Stats.prototype.isDirectory = function () { return false; };
fs.Stats.prototype.isBlockDevice = function () { return false; };
fs.Stats.prototype.isCharacterDevice = function () { return false; };
fs.Stats.prototype.isSymbolicLink = function () { return false; };
fs.Stats.prototype.isFIFO = function () { return false; };
fs.Stats.prototype.isSocket = function () { return false; };

module.exports = fs;

// Named exports for ESM interop
Object.keys(fs).forEach(function (key) {
  if (key !== "default") {
    module.exports[key] = fs[key];
  }
});
