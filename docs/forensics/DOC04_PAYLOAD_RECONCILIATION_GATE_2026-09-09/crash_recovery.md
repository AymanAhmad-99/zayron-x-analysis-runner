# Crash recovery

Owner leases make stale claims reclaimable. Independent detection of already-committed V3/FTS data is provided locally by `workers/scripts/reconcile_v3_seed.py`, but it is not yet connected to the Worker finalization route.
