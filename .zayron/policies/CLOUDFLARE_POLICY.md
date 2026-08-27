# ZAYRON-X Cloudflare Policy

Approved Cloudflare resources must have:
- explicit Worker ownership
- explicit environment
- explicit domain
- explicit bindings
- explicit deployment path

## Prevent
- duplicate domain bindings
- duplicate production workers
- unexpected production routes
- unapproved external compute
