/**
 * Universal NOOP Polyfill for Cloudflare Workers
 *
 * Many Node.js built-in modules (http, https, zlib, child_process,
 * net, tls, dns, etc.) are imported by Next.js internals and Sentry's
 * Node.js fallback paths, but are never actually called at runtime in
 * an edge environment where all I/O goes through fetch().
 *
 * This stub provides enough surface API (constructors, factory functions)
 * to prevent "X is not a constructor" and "X is not a function" crashes
 * during module initialization, while being a true NOOP at runtime.
 */

// ── http.Agent / https.Agent — must be constructible ──────

function Agent() {
  this.destroy = function () {};
  this.destroyed = true;
  this.keepAlive = false;
  this.maxSockets = Infinity;
  this.maxFreeSockets = 256;
  this.scheduling = "lifo";
  this.timeout = 0;
}
Agent.prototype.destroy = function () {};

var globalAgent = new Agent();

// ── net.Socket / tls.TLSSocket — constructible shells ─────

function Socket() {
  this.destroy = function () {};
  this.destroyed = true;
  this.connecting = false;
  this.readyState = "closed";
}
Socket.prototype.destroy = function () {};
Socket.prototype.end = function () {};
Socket.prototype.write = function () {};
Socket.prototype.on = function () { return this; };
Socket.prototype.once = function () { return this; };
Socket.prototype.removeListener = function () { return this; };

function Server() {
  this.close = function () {};
  this.listen = function () {};
}
Server.prototype.on = function () { return this; };

// ── child_process — spawn returns a mock ChildProcess ─────

function ChildProcess() {
  this.stdin = null;
  this.stdout = null;
  this.stderr = null;
  this.pid = -1;
  this.killed = true;
  this.exitCode = 1;
  this.signalCode = null;
}
ChildProcess.prototype.kill = function () {};
ChildProcess.prototype.on = function () { return this; };

function spawn() { return new ChildProcess(); }
function exec(cmd, opts, cb) {
  if (typeof opts === "function") { cb = opts; }
  if (cb) cb(new Error("child_process.exec is not available in Cloudflare Workers"), "", "");
  return new ChildProcess();
}
function fork() { return new ChildProcess(); }

// ── NOOP function generators ───────────────────────────────

function noopFn() {}
function noopFactory() { return {}; }
function noopStreamFactory() { return { on: function() { return this; }, pipe: noopFn, destroy: noopFn }; }

// ── Exports — covers http, https, zlib, child_process, net, tls, dns, etc. ──

module.exports = {
  // http / https
  Agent: Agent,
  globalAgent: globalAgent,
  createServer: function () { return new Server(); },
  request: noopFn,
  get: noopFn,
  METHODS: [],
  STATUS_CODES: {},

  // net / tls
  Socket: Socket,
  Server: Server,
  createConnection: function () { return new Socket(); },
  connect: function () { return new Socket(); },
  createServer: function () { return new Server(); },
  createSecureContext: noopFn,
  TLSSocket: Socket,

  // zlib
  createGzip: noopStreamFactory,
  createGunzip: noopStreamFactory,
  createDeflate: noopStreamFactory,
  createInflate: noopStreamFactory,
  createDeflateRaw: noopStreamFactory,
  createInflateRaw: noopStreamFactory,
  createBrotliCompress: noopStreamFactory,
  createBrotliDecompress: noopStreamFactory,

  // child_process
  spawn: spawn,
  exec: exec,
  execSync: function () { throw new Error("child_process.execSync is not available in Cloudflare Workers"); },
  fork: fork,
  execFile: exec,
  spawnSync: function () { return { pid: -1, output: [], stdout: "", stderr: "", status: 1, signal: null, error: new Error("spawnSync is not available in Cloudflare Workers") }; },

  // dns
  lookup: function (hostname, opts, cb) {
    if (typeof opts === "function") { cb = opts; }
    if (cb) cb(null, "127.0.0.1", 4);
  },
  resolve: function () {},
  resolve4: function () {},
  resolve6: function () {},
  resolveCname: function () {},
  resolveMx: function () {},
  resolveTxt: function () {},
  resolveSrv: function () {},
  resolveNs: function () {},
  resolvePtr: function () {},
  resolveSoa: function () {},
  reverse: function () {},

  // perf_hooks
  performance: {
    now: function () { return Date.now(); },
    mark: noopFn,
    measure: noopFn,
    clearMarks: noopFn,
    clearMeasures: noopFn,
    getEntries: function () { return []; },
    getEntriesByName: function () { return []; },
    getEntriesByType: function () { return []; },
  },

  // readline
  createInterface: function () { return { close: noopFn, on: function () { return this; }, question: noopFn }; },

  // v8
  getHeapStatistics: function () { return { total_heap_size: 0, used_heap_size: 0, heap_size_limit: 0 }; },
  serialize: function () { return Buffer.alloc(0); },
  deserialize: function () { return {}; },

  // worker_threads
  Worker: function Worker() {},
  isMainThread: true,
  parentPort: null,
  workerData: null,

  // module
  createRequire: function () { return function () { return {}; }; },
};
