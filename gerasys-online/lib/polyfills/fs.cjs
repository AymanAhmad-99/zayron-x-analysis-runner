/**
 * Cloudflare Workers fs polyfill — CommonJS stub
 *
 * Next.js internals (app-page.runtime.prod.js, node-environment extensions,
 * etc.) import `fs` for logging and file-system operations.  The Workers V8
 * isolate has no filesystem, so every method throws ENOSYS with a clear
 * message instead of a cryptic "No such module: node:fs" error.
 *
 * This file is copied to .open-next/server-functions/default/ after the
 * OpenNext build and `require("node:fs")` calls are rewritten to point here.
 */

const ENOSYS = function (method) {
  return function () {
    throw new Error(
      "fs." + method + " is not available in Cloudflare Workers (no filesystem)."
    );
  };
};

const fs = {
  readFile: ENOSYS("readFile"),
  readFileSync: ENOSYS("readFileSync"),
  writeFile: ENOSYS("writeFile"),
  writeFileSync: ENOSYS("writeFileSync"),
  existsSync: ENOSYS("existsSync"),
  statSync: ENOSYS("statSync"),
  lstatSync: ENOSYS("lstatSync"),
  fstatSync: ENOSYS("fstatSync"),
  readdirSync: ENOSYS("readdirSync"),
  mkdirSync: ENOSYS("mkdirSync"),
  unlinkSync: ENOSYS("unlinkSync"),
  renameSync: ENOSYS("renameSync"),
  rmdirSync: ENOSYS("rmdirSync"),
  symlinkSync: ENOSYS("symlinkSync"),
  truncateSync: ENOSYS("truncateSync"),
  utimesSync: ENOSYS("utimesSync"),
  chmodSync: ENOSYS("chmodSync"),
  chownSync: ENOSYS("chownSync"),
  linkSync: ENOSYS("linkSync"),
  copyFileSync: ENOSYS("copyFileSync"),
  accessSync: ENOSYS("accessSync"),
  appendFileSync: ENOSYS("appendFileSync"),
  realpathSync: ENOSYS("realpathSync"),
  createReadStream: ENOSYS("createReadStream"),
  createWriteStream: ENOSYS("createWriteStream"),
  watch: ENOSYS("watch"),
  watchFile: ENOSYS("watchFile"),
  unwatchFile: ENOSYS("unwatchFile"),
  stat: ENOSYS("stat"),
  lstat: ENOSYS("lstat"),
  fstat: ENOSYS("fstat"),
  open: ENOSYS("open"),
  close: ENOSYS("close"),
  read: ENOSYS("read"),
  write: ENOSYS("write"),
  appendFile: ENOSYS("appendFile"),
  access: ENOSYS("access"),
  chmod: ENOSYS("chmod"),
  chown: ENOSYS("chown"),
  copyFile: ENOSYS("copyFile"),
  link: ENOSYS("link"),
  mkdir: ENOSYS("mkdir"),
  readdir: ENOSYS("readdir"),
  rmdir: ENOSYS("rmdir"),
  symlink: ENOSYS("symlink"),
  truncate: ENOSYS("truncate"),
  unlink: ENOSYS("unlink"),
  utimes: ENOSYS("utimes"),
  realpath: ENOSYS("realpath"),
  // Sub-modules
  promises: {
    readFile: function () { return Promise.reject(new Error("fs.promises.readFile is not available in Cloudflare Workers.")); },
    writeFile: function () { return Promise.reject(new Error("fs.promises.writeFile is not available in Cloudflare Workers.")); },
    readdir: function () { return Promise.reject(new Error("fs.promises.readdir is not available in Cloudflare Workers.")); },
    mkdir: function () { return Promise.reject(new Error("fs.promises.mkdir is not available in Cloudflare Workers.")); },
    stat: function () { return Promise.reject(new Error("fs.promises.stat is not available in Cloudflare Workers.")); },
    lstat: function () { return Promise.reject(new Error("fs.promises.lstat is not available in Cloudflare Workers.")); },
    unlink: function () { return Promise.reject(new Error("fs.promises.unlink is not available in Cloudflare Workers.")); },
    rename: function () { return Promise.reject(new Error("fs.promises.rename is not available in Cloudflare Workers.")); },
    access: function () { return Promise.reject(new Error("fs.promises.access is not available in Cloudflare Workers.")); },
    chmod: function () { return Promise.reject(new Error("fs.promises.chmod is not available in Cloudflare Workers.")); },
    chown: function () { return Promise.reject(new Error("fs.promises.chown is not available in Cloudflare Workers.")); },
    copyFile: function () { return Promise.reject(new Error("fs.promises.copyFile is not available in Cloudflare Workers.")); },
    link: function () { return Promise.reject(new Error("fs.promises.link is not available in Cloudflare Workers.")); },
    rmdir: function () { return Promise.reject(new Error("fs.promises.rmdir is not available in Cloudflare Workers.")); },
    symlink: function () { return Promise.reject(new Error("fs.promises.symlink is not available in Cloudflare Workers.")); },
    truncate: function () { return Promise.reject(new Error("fs.promises.truncate is not available in Cloudflare Workers.")); },
    utimes: function () { return Promise.reject(new Error("fs.promises.utimes is not available in Cloudflare Workers.")); },
    realpath: function () { return Promise.reject(new Error("fs.promises.realpath is not available in Cloudflare Workers.")); },
    open: function () { return Promise.reject(new Error("fs.promises.open is not available in Cloudflare Workers.")); },
    close: function () { return Promise.reject(new Error("fs.promises.close is not available in Cloudflare Workers.")); },
    read: function () { return Promise.reject(new Error("fs.promises.read is not available in Cloudflare Workers.")); },
    write: function () { return Promise.reject(new Error("fs.promises.write is not available in Cloudflare Workers.")); },
    appendFile: function () { return Promise.reject(new Error("fs.promises.appendFile is not available in Cloudflare Workers.")); },
  },
  constants: {
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
  },
  Dirent: function Dirent() {
    this.name = "";
    throw new Error("fs.Dirent is not available in Cloudflare Workers.");
  },
  Stats: function Stats() {
    throw new Error("fs.Stats is not available in Cloudflare Workers.");
  },
};

module.exports = fs;

// Also export named properties for ESM interop
Object.keys(fs).forEach(function (key) {
  if (key !== "default") {
    module.exports[key] = fs[key];
  }
});
