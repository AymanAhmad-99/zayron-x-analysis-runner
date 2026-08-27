# ZAYRON-X — AI DESIGN BOOTSTRAP PROTOCOL

**Mandatory Reading for All Future AI Agents and Front-End Engineers**

---

## Required Pre-Execution Reading Order

Before writing, modifying, or refactoring ANY front-end code (in `apps/web/`, `packages/ui/`, or styling definitions), the agent MUST read the following canonical documents:

1. [`.zayron/README.md`](file:///d:/Desktop/zayron-app/.zayron/README.md)
2. [`.zayron/constitution/MASTER_ENGINEERING_CONSTITUTION.md`](file:///d:/Desktop/zayron-app/.zayron/constitution/MASTER_ENGINEERING_CONSTITUTION.md)
3. [`.zayron/architecture/SYSTEM_OF_RECORD.md`](file:///d:/Desktop/zayron-app/.zayron/architecture/SYSTEM_OF_RECORD.md)
4. [`.zayron/visual/VISUAL_SOURCE_OF_TRUTH.md`](file:///d:/Desktop/zayron-app/.zayron/visual/VISUAL_SOURCE_OF_TRUTH.md)
5. [`.zayron/visual/DESIGN_TOKENS.json`](file:///d:/Desktop/zayron-app/.zayron/visual/DESIGN_TOKENS.json)
6. [`.zayron/visual/COMPONENT_CONTRACTS.md`](file:///d:/Desktop/zayron-app/.zayron/visual/COMPONENT_CONTRACTS.md)
7. [`.zayron/visual/PAGE_PATTERNS.md`](file:///d:/Desktop/zayron-app/.zayron/visual/PAGE_PATTERNS.md)
8. [`.zayron/visual/VISUAL_FORBIDDEN.md`](file:///d:/Desktop/zayron-app/.zayron/visual/VISUAL_FORBIDDEN.md)

---

## Guiding Principles for Front-End Work

1. **Do Not Redesign the Brand**: Use established colors (`#F5F4F0`, `#FFFFFF`, `#111215`, `#D9531E`), fonts (Editorial Serif + Inter/Geist Sans), and 1px borders.
2. **Do Not Invent Novel UI Paradigms**: Build with canonical component primitives defined in `COMPONENT_CONTRACTS.md`.
3. **Always Run Governance Before Concluding**:
   ```bash
   node .zayron/scripts/visual-governance-check.cjs
   ```
