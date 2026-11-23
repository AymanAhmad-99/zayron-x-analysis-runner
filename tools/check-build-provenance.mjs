#!/usr/bin/env node
/**
 * ZAYRON-X build provenance guard (ZX-15).
 *
 * Reports the exact commit a build is produced from and whether the working
 * tree carried uncommitted changes at build time. Release/deploy pipelines run
 * this with `--strict`, which fails the build unless the tree is clean, so a
 * deployed artifact can always be traced to a committed revision.
 *
 * Zero dependencies. Read-only against Git: it never stages, commits, checks
 * out, resets or cleans anything, and it writes no file unless `--out <path>`
 * is passed explicitly.
 *
 * Usage:
 *   node tools/check-build-provenance.mjs                       # report only
 *   node tools/check-build-provenance.mjs --strict              # exit 1 if DIRTY_COUNT > 0
 *   node tools/check-build-provenance.mjs --out provenance.json # also write JSON (.md => Markdown)
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXIT_OK = 0;
const EXIT_UNPROVEN = 1;
const EXIT_USAGE = 2;

function git(args) {
  // `--no-optional-locks` keeps `status` from refreshing the index on disk.
  return execFileSync('git', ['--no-optional-locks', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function parseArgs(argv) {
  const options = { strict: false, outPath: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--out') {
      const value = argv[i + 1];
      if (!value) {
        console.error('USAGE_ERROR: --out requires a path argument');
        process.exit(EXIT_USAGE);
      }
      options.outPath = value;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/check-build-provenance.mjs [--strict] [--out <path>]');
      process.exit(EXIT_OK);
    } else {
      console.error(`USAGE_ERROR: unknown argument '${arg}'`);
      process.exit(EXIT_USAGE);
    }
  }

  return options;
}

function collectProvenance() {
  const provenance = {
    COMMIT: 'UNKNOWN',
    BRANCH: 'UNKNOWN',
    DIRTY_COUNT: 0,
    TIMESTAMP: new Date().toISOString(),
    GIT_AVAILABLE: false,
  };

  try {
    provenance.COMMIT = git(['rev-parse', 'HEAD']) || 'UNKNOWN';
    provenance.BRANCH = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'UNKNOWN';
    const porcelain = git(['status', '--porcelain']);
    provenance.DIRTY_COUNT = porcelain ? porcelain.split('\n').filter((line) => line.trim().length > 0).length : 0;
    provenance.GIT_AVAILABLE = true;
  } catch (error) {
    // Not a Git checkout, or Git is unavailable: provenance stays UNKNOWN and
    // `--strict` fails closed below rather than reporting a clean tree.
    const message = error instanceof Error ? error.message : String(error);
    provenance.GIT_ERROR = message.split('\n')[0];
  }

  return provenance;
}

function render(provenance) {
  const lines = [
    '--- BUILD PROVENANCE ---',
    `COMMIT=${provenance.COMMIT}`,
    `BRANCH=${provenance.BRANCH}`,
    `DIRTY_COUNT=${provenance.DIRTY_COUNT}`,
    `TIMESTAMP=${provenance.TIMESTAMP}`,
    `GIT_AVAILABLE=${provenance.GIT_AVAILABLE}`,
  ];
  if (provenance.GIT_ERROR) lines.push(`GIT_ERROR=${provenance.GIT_ERROR}`);
  return `${lines.join('\n')}\n`;
}

function renderMarkdown(provenance) {
  return [
    '# Build Provenance',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| COMMIT | \`${provenance.COMMIT}\` |`,
    `| BRANCH | \`${provenance.BRANCH}\` |`,
    `| DIRTY_COUNT | ${provenance.DIRTY_COUNT} |`,
    `| TIMESTAMP | ${provenance.TIMESTAMP} |`,
    `| GIT_AVAILABLE | ${provenance.GIT_AVAILABLE} |`,
    '',
  ].join('\n');
}

const options = parseArgs(process.argv.slice(2));
const provenance = collectProvenance();

process.stdout.write(render(provenance));

if (options.outPath) {
  const target = resolve(process.cwd(), options.outPath);
  const body = target.toLowerCase().endsWith('.md')
    ? renderMarkdown(provenance)
    : `${JSON.stringify(provenance, null, 2)}\n`;
  writeFileSync(target, body, 'utf8');
  console.log(`PROVENANCE_WRITTEN=${target}`);
}

if (options.strict) {
  if (!provenance.GIT_AVAILABLE) {
    console.error('PROVENANCE_UNVERIFIABLE: Git metadata unavailable; refusing a strict-clean claim.');
    process.exit(EXIT_UNPROVEN);
  }
  if (provenance.DIRTY_COUNT > 0) {
    console.error(`PROVENANCE_DIRTY: ${provenance.DIRTY_COUNT} uncommitted path(s) at ${provenance.COMMIT}.`);
    process.exit(EXIT_UNPROVEN);
  }
}

process.exit(EXIT_OK);
