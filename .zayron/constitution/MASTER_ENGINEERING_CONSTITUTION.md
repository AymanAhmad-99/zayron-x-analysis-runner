# ZAYRON-X Master Engineering Constitution

## 1. System Ownership and Scope
ZAYRON-X is governed by this single source of truth. The repository structure dictates the canonical architecture.

## 2. Protected Systems
- Production D1
- Production Migrations
- Telegram Session
- Telegram Collector
- Production Domains
- Production Secrets
- Production Queues
- Vectorize
- Workers AI Configuration
- Production API Contracts
- Production Bindings

## 3. Allowed Changes
Changes are permitted if they follow the CHANGE_CONTROL_POLICY and pass CI governance.

## 4. Prohibited Changes
- Silent architecture refactoring
- Duplicate production systems
- Deletion of files without dependency proof
- Modifying production data for debugging shortcuts
- Bypassing governance gates
- Deploying stale artifacts

## 5. Verification & Deployment Policy
Only VERIFIED claims may be used for final production acceptance. Production deployments must be validated through the canonical CI pipeline.

## 6. AI Behavior Requirements
- The AI is an implementer.
- The repository is the source of truth.
- The CI pipeline is the gate.
- Production verification is the final authority.
- The AI must not treat its own explanation as evidence.
