/**
 * ZAYRON-X — CONFIG-LEVEL PRE-DEPLOY GATE (WRANGLER `[build]` HOOK).
 *
 * WHY THIS EXISTS
 * `workers/nvd-candidate-trigger` and `workers/ready-candidate-trigger` are
 * config-only Workers: a wrangler config with a `main`, and no package.json, so
 * there is no repository script to route them through the approved deployment
 * guard (`tools/deployment/deploy-guard.mjs`). Their only way to production was
 * an operator launching the CLI by hand inside the directory, which no npm
 * script can intercept.
 *
 * A wrangler `[build]` hook IS interceptable. Wrangler runs the configured
 * command before it bundles, authenticates or uploads anything, and a non-zero
 * exit aborts the whole command with "Running custom build ... failed". Both
 * trigger Workers therefore declare this file as their `[build] command`, so
 * launching the CLI against either config — by hand or from a script — is gated
 * by the same approved guard every other deployment path already uses.
 *
 * Wrangler exports WRANGLER_COMMAND to the hook process (verified against the
 * installed wrangler bundle, `src/deployment-bundle/run-custom-build.ts`, which
 * passes `wranglerCommand: command` for every caller: "dev" for the dev server,
 * "types" for type generation, "deploy" for a deployment). Only commands that
 * cannot change the Cloudflare account are skipped; `deploy`, every other
 * account-touching subcommand, and an unset/unrecognised command must pass the
 * guard.
 *
 * SCOPE OF THIS CONTROL — stated precisely, because overclaiming here would be
 * the whole failure mode this file exists to prevent:
 *   - It intercepts any invocation that loads a config declaring this hook,
 *     i.e. every repository-defined deployment route for those two Workers.
 *   - It cannot intercept a process that never loads the repository config
 *     (for example a hand-written API call, or a configuration copied out of
 *     this worktree). No file inside the repository can.
 *
 * AUTHORIZATION
 * Production authorization is per-invocation and is deliberately NOT committed
 * anywhere, so a committed command can never self-authorize:
 *   ZX_DEPLOY_AUTHORIZE=<exact resolved identity>
 * — the same shape as the D1 policy's ZX_D1_AUTHORIZE. Without it the guard
 * refuses and the deploy aborts.
 *
 * This file constructs no command and launches nothing: it is a veto gate over
 * a deployment another process is already performing.
 */

import { pathToFileURL } from 'node:url';

import { guardComponent, renderDecision, REPO_ROOT, GUARD_ID } from './deploy-guard.mjs';

export const HOOK_ID = 'tools/deployment/build-guard-hook.mjs';
export const AUTHORIZATION_ENV_VAR = 'ZX_DEPLOY_AUTHORIZE';
export const WRANGLER_COMMAND_ENV_VAR = 'WRANGLER_COMMAND';

/**
 * Commands that cannot create, update or delete anything in the account. They
 * are skipped so that `dev`, type generation and local inspection keep working
 * exactly as before — the local development loop must not be collateral damage
 * of a deployment control. Everything else is gated, including an empty or
 * unrecognised command: unknown risk is treated as risk.
 */
export const NON_MUTATING_COMMANDS = Object.freeze([
  'dev',
  'types',
  'check',
  'docs',
  'init',
  'whoami',
  'login',
  'logout',
  'telemetry',
]);

export const HOOK_EXIT = Object.freeze({ PASS: 0, USAGE: 2, REFUSED: 3 });

/**
 * Decide whether the command wrangler is about to run may proceed.
 *
 * Pure apart from reading the repository policy/config for the declared
 * component. Fail-closed in every branch that is not an explicit local-only
 * command.
 *
 * @returns {{action:'skip'|'allow'|'refuse', component:string|null,
 *            wranglerCommand:string, reason:string, decision:object|null}}
 */
export function evaluateBuildHook({
  component = null,
  wranglerCommand = process.env[WRANGLER_COMMAND_ENV_VAR] ?? null,
  authorize = process.env[AUTHORIZATION_ENV_VAR] ?? null,
  root = REPO_ROOT,
} = {}) {
  const command = String(wranglerCommand ?? '').trim().toLowerCase();

  if (NON_MUTATING_COMMANDS.includes(command)) {
    return {
      action: 'skip',
      component,
      wranglerCommand: command,
      reason: `\`${command}\` cannot change the Cloudflare account, so no deployment is being gated`,
      decision: null,
    };
  }

  // Fail closed: without a declared component there is nothing to resolve, and
  // an unresolvable target must never be treated as safe.
  if (!component) {
    return {
      action: 'refuse',
      component: null,
      wranglerCommand: command,
      reason: 'this hook declares no --component, so the target of the pending command cannot be resolved',
      decision: null,
    };
  }

  const decision = guardComponent({
    component,
    env: 'production',
    intent: 'production',
    authorizeProduction: authorize,
    root,
  });

  return {
    action: decision.allowed ? 'allow' : 'refuse',
    component,
    wranglerCommand: command || '(unset)',
    reason: decision.allowed
      ? `${GUARD_ID} approved the resolved production target`
      : `${GUARD_ID} refused the resolved production target`,
    decision,
  };
}

/** Render a hook decision for an operator. Never prints a secret value. */
export function renderBuildHook(result) {
  const head =
    `build-guard-hook: ${WRANGLER_COMMAND_ENV_VAR}=${result.wranglerCommand} ` +
    `component=${result.component ?? '(none)'}`;
  const lines = [head];

  if (result.action === 'skip') {
    lines.push(`  SKIPPED — ${result.reason}`);
    return `${lines.join('\n')}\n`;
  }
  if (!result.decision) {
    lines.push(`  REFUSED [HOOK_UNRESOLVED_TARGET] ${result.reason}`);
    lines.push(`  the deploy was aborted before ${GUARD_ID} could approve it`);
    return `${lines.join('\n')}\n`;
  }

  lines.push(renderDecision(result.decision).trimEnd());
  if (result.action === 'refuse' && result.decision.identity) {
    lines.push(`  TO AUTHORIZE: ${AUTHORIZATION_ENV_VAR}=${result.decision.identity}`);
  }
  if (result.action === 'allow') {
    lines.push('  the pending command may proceed');
  } else {
    lines.push('  the deploy was aborted before anything was uploaded');
  }
  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] ?? null : null;
  };
  return { component: get('--component') };
}

export function main(argv = process.argv) {
  const { component } = parseArgs(argv);
  const result = evaluateBuildHook({ component });
  process.stdout.write(renderBuildHook(result));
  return result.action === 'refuse' ? HOOK_EXIT.REFUSED : HOOK_EXIT.PASS;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv);
}
