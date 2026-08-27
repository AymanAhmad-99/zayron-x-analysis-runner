# ZAYRON-X — DESIGN CHANGE POLICY

**Classification:** Visual Governance Standard  
**Enforcement:** Strict Architectural Code Review  

---

## 1. Scope & Jurisdiction

This policy governs all modifications to the visual presentation layer of ZAYRON-X, including Next.js components, CSS variables, typography imports, layout grids, and interactive widgets.

---

## 2. Permitted Changes

- **Local Adjustments**: Refinements to text alignment, table column widths, data density padding, and responsive stacking within approved design tokens.
- **New Feature Integration**: Implementing new data fields inside existing canonical component primitives (e.g., adding an IOC tag inside a Threat Dossier).
- **Accessibility Improvements**: Enhancing ARIA labels, keyboard focus rings (using 2px solid `#111214`), and semantic contrast ratios.

---

## 3. Restricted Changes (Requires Architecture Authorization)

- **New Component Creation**: A new component primitive is permitted **only** when an existing canonical primitive cannot reasonably fulfill the product requirement.
- **New Semantic Color**: Requires explicit architectural justification demonstrating that existing severity or neutral tokens cannot convey the necessary status.

---

## 4. Absolute Prohibitions

1. **No Alternative Design Languages**: Introducing a second design theme (e.g., Tailwind default blue theme, Material UI, Bootstrap) is strictly forbidden.
2. **No Ad-Hoc Fonts**: Introducing fonts outside the established Display Serif / Inter / Geist Mono hierarchy is forbidden.
3. **No Page-Specific Visual Contradictions**: Every sub-page must feel like a natural section of the same unified sovereign intelligence institution.
