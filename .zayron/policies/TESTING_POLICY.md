# ZAYRON-X Testing Policy

Define levels:
- L0 static inspection
- L1 typecheck
- L2 lint
- L3 unit/integration test
- L4 build
- L5 OpenNext build
- L6 local runtime
- L7 production HTTP
- L8 Cloudflare runtime
- L9 end-to-end

Never report a higher level than actually executed.
