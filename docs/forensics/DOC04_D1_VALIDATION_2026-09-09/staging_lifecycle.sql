-- STAGING TEST DATA ONLY. Never execute against production.
INSERT INTO v3_document_identities (document_identity_id, document_id, title, publisher, edition, source_reference, identity_status, lifecycle, created_at)
VALUES ('staging-di-1', 'staging-doc-1', 'DOC04 staging fixture', 'ZAYRON-X test', '1', 'staging://doc04', 'UNRESOLVED', 'PROPOSED', '2026-09-09T00:00:00Z');
INSERT INTO v3_corpus_revisions (corpus_revision_id, scope, lifecycle, object_set_digest, object_count, parser_version, schema_version, validation_state, approval_state, created_at)
VALUES ('staging-cr-1', 'STAGING', 'APPROVED', 'staging-digest-1', 1, 'doc04-test', 'v3', 'PASSED', 'APPROVED', '2026-09-09T00:00:00Z');
INSERT INTO v3_corpus_documents (corpus_revision_id, document_identity_id, source_digest)
VALUES ('staging-cr-1', 'staging-di-1', 'staging-source-1');
INSERT INTO v3_seed_revisions (seed_revision_id, corpus_revision_id, object_set_digest, payload_digest, target_environment, target_d1_database_id, operator_identity, idempotency_key, approval_state, execution_state, created_at)
VALUES ('staging-sr-1', 'staging-cr-1', 'staging-digest-1', 'staging-payload-1', 'STAGING', '34962f8f-abd1-4b0b-8bd7-b4eab59bd902', 'doc04-test', 'staging-idem-1', 'APPROVED', 'SUCCEEDED', '2026-09-09T00:00:00Z');
INSERT INTO v3_deployment_revisions (deployment_revision_id, git_commit, build_digest, worker_version, environment, corpus_revision_id, actor_identity, created_at, provenance_state)
VALUES ('staging-dr-1', 'UNKNOWN', 'staging-build-1', 'staging-worker-1', 'STAGING', 'staging-cr-1', 'doc04-test', '2026-09-09T00:00:00Z', 'PARTIAL');
INSERT INTO v3_production_dataset_states (dataset_state_id, d1_database_id, binding, environment, deployment_revision_id, corpus_revision_id, seed_revision_id, object_set_digest, row_count, distinct_document_count, duplicate_count, verification_timestamp, verification_result, verification_evidence_digest)
VALUES ('staging-ds-1', '34962f8f-abd1-4b0b-8bd7-b4eab59bd902', 'SOURCE_STATE', 'STAGING', 'staging-dr-1', 'staging-cr-1', 'staging-sr-1', 'staging-digest-1', 1, 1, 0, '2026-09-09T00:00:00Z', 'PASSED', 'staging-evidence-1');
