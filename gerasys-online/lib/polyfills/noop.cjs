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
  this.destroy = () => {};
  this.destroyed = true;
  this.keepAlive = false;
  this.maxSockets = Number.POSITIVE_INFINITY;
  this.maxFreeSockets = 256;
  this.scheduling = 'lifo';
  this.timeout = 0;
}
Agent.prototype.destroy = () => {};

var globalAgent = new Agent();

// ── net.Socket / tls.TLSSocket — constructible shells ─────

function Socket() {
  this.destroy = () => {};
  this.destroyed = true;
  this.connecting = false;
  this.readyState = 'closed';
}
Socket.prototype.destroy = () => {};
Socket.prototype.end = () => {};
Socket.prototype.write = () => {};
Socket.prototype.on = function () {
  return this;
};
Socket.prototype.once = function () {
  return this;
};
Socket.prototype.removeListener = function () {
  return this;
};

function Server() {
  this.close = () => {};
  this.listen = () => {};
}
Server.prototype.on = function () {
  return this;
};

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
ChildProcess.prototype.kill = () => {};
ChildProcess.prototype.on = function () {
  return this;
};

function spawn() {
  return new ChildProcess();
}
function exec(cmd, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
  }
  if (cb) cb(new Error('child_process.exec is not available in Cloudflare Workers'), '', '');
  return new ChildProcess();
}
function fork() {
  return new ChildProcess();
}

// ── NOOP function generators ───────────────────────────────

function noopFn() {}
function noopFactory() {
  return {};
}
function noopStreamFactory() {
  return {
    on: function () {
      return this;
    },
    pipe: noopFn,
    destroy: noopFn,
  };
}

// ── Exports — covers http, https, zlib, child_process, net, tls, dns, etc. ──

module.exports = {
  // http / https
  Agent: Agent,
  globalAgent: globalAgent,
  createServer: () => new Server(),
  request: noopFn,
  get: noopFn,
  METHODS: [],
  STATUS_CODES: {},

  // net / tls
  Socket: Socket,
  Server: Server,
  createConnection: () => new Socket(),
  connect: () => new Socket(),
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
  execSync: () => {
    throw new Error('child_process.execSync is not available in Cloudflare Workers');
  },
  fork: fork,
  execFile: exec,
  spawnSync: () => ({
    pid: -1,
    output: [],
    stdout: '',
    stderr: '',
    status: 1,
    signal: null,
    error: new Error('spawnSync is not available in Cloudflare Workers'),
  }),

  // dns
  lookup: (hostname, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    if (cb) cb(null, '127.0.0.1', 4);
  },
  resolve: () => {},
  resolve4: () => {},
  resolve6: () => {},
  resolveCname: () => {},
  resolveMx: () => {},
  resolveTxt: () => {},
  resolveSrv: () => {},
  resolveNs: () => {},
  resolvePtr: () => {},
  resolveSoa: () => {},
  reverse: () => {},

  // perf_hooks
  performance: {
    now: () => Date.now(),
    mark: noopFn,
    measure: noopFn,
    clearMarks: noopFn,
    clearMeasures: noopFn,
    getEntries: () => [],
    getEntriesByName: () => [],
    getEntriesByType: () => [],
  },

  // readline
  createInterface: () => ({
    close: noopFn,
    on: function () {
      return this;
    },
    question: noopFn,
  }),

  // v8
  getHeapStatistics: () => ({ total_heap_size: 0, used_heap_size: 0, heap_size_limit: 0 }),
  serialize: () => Buffer.alloc(0),
  deserialize: () => ({}),

  // worker_threads
  Worker: function Worker() {},
  isMainThread: true,
  parentPort: null,
  workerData: null,

  // module
  createRequire: () => () => ({}),
};
