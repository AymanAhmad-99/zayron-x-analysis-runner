# ZAYRON-X Reference Architecture Report

Inspection date: 2026-09-15. Repositories were inspected from `D:\Temp\zayron-reference-repos` as reference material only. No source code was copied.

| Area | Repository | Component/Pattern | Why useful for ZAYRON-X | What we will NOT copy |
|---|---|---|---|---|
| Application shell | satnaing/shadcn-admin | `src/components/layout/`, sidebar and authenticated shell patterns | Strong React/Vite shell primitives, responsive navigation, accessible collapsible regions | Its dashboard information architecture, branding, demo data, and styling defaults |
| Navbar/header | launch-ui/launch-ui | `components/navbar.tsx`, marketing navigation patterns | Clear responsive header composition and restrained utility actions | Its SaaS copy, visual identity, and page-specific content |
| Sidebar | satnaing/shadcn-admin | `src/components/sidebar/` and layout context | Useful analyst workspace navigation model with mobile collapse behavior | Its route taxonomy and application chrome verbatim |
| Page container/grid | launch-ui/launch-ui | `components/container.tsx`, section wrappers, grid utilities | Good editorial max-width and section rhythm | Exact class combinations and typography choices |
| Hero/editorial composition | launch-ui/launch-ui | landing page hero and section composition | Closest fit for premium editorial hierarchy and product/content balance | Generic SaaS hero messaging, gradients, and decorative assets |
| Landing sections | leoMirandaa/shadcn-landing-page | `src/components/sections/` | Demonstrates modular landing sections with simple responsive composition | Its section ordering, copy, and template identity |
| CTI/analyst UX | AJings3c/Threat-Intelligence | `frontend/src/` dashboards, entity/search views, backend/frontend separation | Domain-relevant vocabulary and operational information density | Its data model, backend behavior, claims, and UI implementation |
| shadcn primitives | shadcn-ui/ui | registry primitives and accessibility-oriented component contracts | Good foundation for composable controls once implementation begins | Wholesale registry/template adoption before a concrete need |
| Tables | TanStack/table | `packages/react-table` and core row-model architecture | Headless sorting, filtering, pagination, and virtualization-compatible table logic | Its examples, styling, and unrelated adapters |
| Relationship graphs | xyflow/xyflow | React Flow packages, node/edge model, viewport controls | Appropriate for entity relationships and investigation graphs | Demo graphs, default node styling, and graph data |
| Charts | recharts/recharts | Cartesian/polar chart primitives and responsive containers | React-native composable charts with tooltips and accessible labels to be evaluated | Chart gallery visuals and default theme assumptions |
| Icons | lucide-icons/lucide | `lucide-react` package and SVG icon system | Consistent stroke icons with React support and permissive ISC license | Icon font assumptions and unrelated icon sets |
| Brand/vendor icons | simple-icons/simple-icons | CC0 brand icon data | Useful only for explicitly evidenced technology/vendor marks | Using marks as decorative claims or implying affiliation |
| Screenshot analysis | abi/screenshot-to-code | React/Vite frontend, FastAPI backend, local screenshot input, stack selector | Useful as an isolated visual-analysis laboratory | Adding its dependencies, API keys, backend, or generated output to `apps/web` |

## Explicit selection

PRIMARY FOUNDATION: satnaing/shadcn-admin — shell structure and responsive analyst workspace primitives.

EDITORIAL FOUNDATION: launch-ui/launch-ui — strongest composition fit for dark editorial landing work, subject to ZAYRON-X visual constraints.

CTI FOUNDATION: AJings3c/Threat-Intelligence — domain vocabulary and analyst workflow reference; not a code base to transplant.

TABLE FOUNDATION: TanStack/table — headless table behavior and row-model architecture.

GRAPH FOUNDATION: xyflow/xyflow — React node/edge interaction model.

CHART FOUNDATION: recharts/recharts — composable React chart primitives.

ICON FOUNDATION: lucide-icons/lucide — React icon package; Simple Icons remains an optional CC0 source for evidenced brand marks.

## Selection criteria and license notes

Selections use architecture, visual quality, compatibility with React/Vite, accessibility posture, maintainability, license, and CTI relevance rather than popularity alone. Top-level licenses were found for all twelve repositories: MIT for the principal UI/data libraries, ISC for Lucide, and CC0 1.0 for Simple Icons. Threat-Intelligence is MIT-licensed.

## Screenshot-to-code activation result

The local tool uses a React/Vite frontend (`frontend`, `pnpm dev`, normally `http://localhost:5173`) and a FastAPI backend (`backend`, Poetry, normally port 7001). It accepts screenshots and supports HTML + Tailwind, HTML + CSS, React + Tailwind, Vue + Tailwind, Bootstrap, and Ionic + Tailwind output.

It supports OpenAI, Anthropic, and Gemini model providers; Replicate is optional for image operations. At least one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` is required for model execution. No credentials were added. Therefore: **LOCAL TOOL READY**, but **MODEL EXECUTION UNAVAILABLE**.

The tool is isolated under `D:\Temp\zayron-reference-repos\screenshot-to-code`; it does not contaminate `apps/web`.

## Preview investigation

`apps/web/package.json` exposes `dev: vinext dev` and `build: vinext build`; it does not expose a `preview` or `start` script. Vite is configured through Vinext and the Cloudflare Vite plugin. `apps/web/wrangler.jsonc` is a Worker deployment/preview configuration with `workers_dev: true`, but it is not a local HTTP server command.

The existing `vinext build` succeeds. Local `vinext dev --host 127.0.0.1` and `vinext start --host 127.0.0.1` did not yield a reachable HTTP endpoint in this Windows session, and the PowerShell background-job probe returned connection failure. No backend or Wrangler configuration was changed. Root cause is **INFERRED** as local Vinext/Windows process binding behavior or an incomplete local dev-server startup path; it is not proven to be a frontend source error.

