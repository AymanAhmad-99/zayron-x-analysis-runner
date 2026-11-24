-- Migration 0017: Durable v3 Knowledge Object Schema Foundation
-- Additive columns ensuring complete persistent representation of the authoritative Knowledge Object contract.

ALTER TABLE knowledge_objects_v3 ADD COLUMN parent_node_id TEXT;
ALTER TABLE knowledge_objects_v3 ADD COLUMN classification_json TEXT;
ALTER TABLE knowledge_objects_v3 ADD COLUMN context_metadata_json TEXT;
ALTER TABLE knowledge_objects_v3 ADD COLUMN epistemic_constraints_json TEXT;
ALTER TABLE knowledge_objects_v3 ADD COLUMN graph_mappings_json TEXT;
ALTER TABLE knowledge_objects_v3 ADD COLUMN version_state_json TEXT;
