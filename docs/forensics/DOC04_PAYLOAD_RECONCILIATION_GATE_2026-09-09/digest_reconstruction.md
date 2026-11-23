# Digest reconstruction

Ordering is ascending `object_id`. Each entry serializes as `object_id<TAB>document_id<TAB>content_hash`; entries join with newline and are SHA-256 hashed. Missing or duplicate IDs produce a mismatch.
