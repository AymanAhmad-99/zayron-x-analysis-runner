#!/usr/bin/env node
"use strict";

// ZAYRON-X R1 governance activator (MODEL B — dedicated tracked hook directory).
//
// Idempotently points THIS repository's LOCAL Git configuration at the tracked
// dispatcher directory:
//
//     core.hooksPath = .zayron/hooks
//
// Deliberately dependency-free (Node built-ins only) and deliberately explicit:
// there is no `prepare`/`postinstall` hook. Activation is an intentional,
// reproducible command:
//
//     node .zayron/hooks/install.cjs
//
// Only `--local` scope is ever written. Global and system Git configuration are
// never touched. Re-running is safe and simply re-asserts the same value.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HOOKS_PATH = ".zayron/hooks";

function fail(message) {
  console.error(`[ZAYRON-X] install-hooks: ${message}`);
  process.exit(1);
}

function git(args, options) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...(options || {}),
  }).trim();
}

// 1. Resolve the repository root (robust from any working directory).
let repoRoot;
try {
  repoRoot = git(["rev-parse", "--show-toplevel"]);
} catch (err) {
  const detail = err && err.stderr ? `: ${String(err.stderr).trim()}` : "";
  fail(`could not resolve repository root via 'git rev-parse --show-toplevel'${detail}`);
}

// 2. Validate the resolved root.
if (!repoRoot || !fs.existsSync(repoRoot) || !fs.statSync(repoRoot).isDirectory()) {
  fail(`resolved repository root is invalid: ${repoRoot}`);
}

// 3. Verify the mandatory tracked artifacts exist before activating.
const scanner = path.join(repoRoot, ".zayron", "scripts", "secret-scan.cjs");
const dispatcher = path.join(repoRoot, ".zayron", "hooks", "pre-commit");
if (!fs.existsSync(scanner)) {
  fail(`mandatory secret scanner missing: ${scanner}`);
}
if (!fs.existsSync(dispatcher)) {
  fail(`mandatory hook dispatcher missing: ${dispatcher}`);
}

// 4. Activate: write LOCAL scope only.
try {
  git(["config", "--local", "core.hooksPath", HOOKS_PATH], { cwd: repoRoot });
} catch (err) {
  const detail = err && err.stderr ? `: ${String(err.stderr).trim()}` : "";
  fail(`failed to set core.hooksPath${detail}`);
}

// 5. Read the value back and assert it.
let readBack;
try {
  readBack = git(["config", "--local", "--get", "core.hooksPath"], { cwd: repoRoot });
} catch (err) {
  const detail = err && err.stderr ? `: ${String(err.stderr).trim()}` : "";
  fail(`failed to read back core.hooksPath${detail}`);
}
if (readBack !== HOOKS_PATH) {
  fail(`core.hooksPath read-back mismatch: expected '${HOOKS_PATH}', got '${readBack}'`);
}

// 6. Report the exact resulting activation state.
console.log("[ZAYRON-X] install-hooks: activation complete");
console.log(`[ZAYRON-X] install-hooks: repository root      = ${repoRoot}`);
console.log(`[ZAYRON-X] install-hooks: core.hooksPath(local) = ${readBack}`);
console.log(`[ZAYRON-X] install-hooks: dispatcher           = ${dispatcher}`);
console.log(`[ZAYRON-X] install-hooks: scanner              = ${scanner}`);
process.exit(0);
