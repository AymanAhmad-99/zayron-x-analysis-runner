# Payload storage model

The required durable target is an immutable R2 object per deterministic seed/chunk identity, with D1 retaining object key, byte count, semantic chunk digest, and lifecycle metadata. The current implementation has the D1 metadata columns but no completed upload/registration endpoint; payload durability is therefore not yet proven.
