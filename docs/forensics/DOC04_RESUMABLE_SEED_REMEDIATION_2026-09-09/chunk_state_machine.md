# State machine

`PLANNED -> RUNNING -> COMPLETED/FAILED`; expired `RUNNING` is reclaimable. Active leases cannot be claimed by another worker.
