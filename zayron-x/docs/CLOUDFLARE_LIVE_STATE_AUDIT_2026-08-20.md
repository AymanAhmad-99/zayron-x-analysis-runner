# Cloudflare Live-State Audit

Audit date: 2026-08-20

## Confirmed Access

Wrangler is authenticated to Cloudflare account `56534d53775d8280011a325dcf36ed09`, which matches the `account_id` in `wrangler.toml`.

The authenticated token includes read/write access relevant to Workers, Workers KV, D1, Queues, Workers AI, routes, and Worker log tails. Credentials were not read, copied, or committed.

## Confirmed Existing Resources

The configured KV namespaces exist:

| Binding use | Namespace | ID |
| --- | --- | --- |
| Production cache | `production-ZAYRON_CACHE` | `c5704144e6984dd597e2f000a1e84aa2` |
| Preview cache | `preview-ZAYRON_CACHE` | `834e78268ee0457196ecf48026b06ece` |

## Blocking Discrepancies

1. `wrangler deployments list --env production` reports that Worker `zayron-x` does not exist on this account.
2. `wrangler d1 info zayron-x-db` reports that D1 database ID `7f6e4f29-1ea4-4497-ba3a-10f57b21be0b` does not exist on this account.
3. `wrangler.toml` defines `d1_databases` only at the top level. Wrangler warns that it is not inherited by `env.production`; production must declare its own `[[env.production.d1_databases]]` binding.
4. `TELEGRAM_SOURCE` is defined only at the top level. Wrangler warns that it is not inherited by `env.production.vars`.

## Interpretation

The repository is authenticated to the intended Cloudflare account, and KV has been provisioned. The production Worker and D1 configuration are not deployable as written. This is a configuration and provisioning gap, not proof that DNS routes or production traffic are healthy.

## Required Decision Before Remediation

Choose one explicit path:

1. Provision a new D1 database and deploy Worker `zayron-x`, then update `wrangler.toml` with the resulting D1 ID and environment-scoped bindings.
2. Supply the authoritative existing Worker and D1 identifiers if this project should attach to resources created under different names or accounts.

No cloud resource was created, changed, or deleted during this audit.
