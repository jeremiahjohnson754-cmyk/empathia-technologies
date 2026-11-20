# Engineering baseline before the Empathia Signature transformation (60/10 P0)

**12 November 2026, early morning CT.** Taken from the repository itself, before any design change. Nothing in this file is a plan; it
says what exists. Where a line could not be checked it says **NOT RUN**.

## Repository

| | |
|---|---|
| Branch | `v18/continuation`, level with `origin/v18/continuation`; nothing uncommitted when taken |
| Head when taken | `192fa7e` (restorations of 12 Nov included) |
| Staging branch | `phase3/legendary-experience` at `1dced1e` (Render: the demo and the website) |
| Production branch | `main` at `219d75f`, untouched in this work; production needs the founder's word |
| Package manager, runtime | pnpm 10.18.3 (`packageManager`), Node 22.23.4 (`engines: >=22`) |
| Workspaces | `apps/*`, `services/*`, `packages/*`, `integrations/*` |
| Applications | `apps/website` (the corporate site, prerendered), `apps/demo` (the Living Campus), `apps/enterprise-web`, `apps/founder-studio` (not in a public build), `apps/investor-demo`, `apps/engineer-demo` |
| Services | `services/enterprise-api`, `services/integration-worker`, `services/intelligence-python` |
| Packages | 21: `ui`, `design-tokens`, `domain-types`, `domain-data`, `commissioning-engine`, `assurance-engine`, `apex-engine`, `search-party`, `signal-canon`, `kpi-engine`, `relationship-engine`, `service-engine`, `field-intelligence`, `field-queue`, `project-governance`, `proof-registry`, `commercial`, `event-contracts`, `observability`, `api-client`, `schemas` |
| Framework | React 19.2.8 and React DOM, bundled with esbuild 0.28.2; TypeScript checked with `tsc --noEmit`; no Tailwind, no CSS framework |
| UI library | `@empathia/ui` (in the repository): cards, hero, tabs, charts, runners for SIGNAL's challenges and boss levels, bench |

## Commands (from `package.json`)

`build` → `node scripts/build.mjs` (`--public` for the public build); `test` → `node scripts/test.mjs` (76 suites: 52 unit files, 59
browser suites, plus build and hygiene checks); `verify` → `node scripts/verify-all.mjs`; `studio`, `db:*` and `api` belong to Founder
Studio and the enterprise API, which the public build does not serve. Results of a run belong in `TEST_RESULTS.md`, with exit codes.

## Routes

- **Website**: 29 prerendered pages (`apps/website/dist/**/index.html`): `/`, about, contact, films, founder, how-it-works, legal,
  pilot-partners, pilots, platform, pricing, pricing/catalogue, privacy, products and its nine product pages (apex, commissioning,
  field-intelligence, learn, lite, mission-control, pro, search-party, servicehands), proof, request-demo, solutions, technology, trust,
  collabora-sing, and the 404 page.
- **Living Campus**: a hash router over 20 registry files (`apps/demo/src/registry*.ts`), every page lazily loaded; each entry names its
  V2.5.3 authority (an area, a lens or an action) and the shell's policy (`access/policy.ts`) decides what a role sees; a role never
  sees a screen it cannot use (the access page instead). Aliases keep V2.5.3's addresses. Unknown addresses get a page that says so.

## Design system

- Tokens: `packages/design-tokens` (brand and font builders, a `dist` of CSS custom properties), with the rule that `[data-stage]` is
  reserved for dark spatial stages.
- Type: Inter (400, 500, 600, 700) and Inter Display 800, self-hosted under the SIL Open Font License (`design-tokens/fonts/OFL.txt`).
- Themes: light and dark through tokens; every browser suite runs both (`.local/run-matrix.sh <out> light|dark`).
- Accessibility infrastructure: keyboard-operable controls throughout (checked by the suites), visible focus (`--focus`), reduced
  motion respected, `ui-sr` for screen-reader text. Screen readers and physical phones: **NOT RUN**.

## Products in the Living Campus (as built)

Pro, Lite (campus, rooms in 3D with four states, Optimize, Portfolio Optimize, the Lite studio, Scouter with anatomy and standard kits),
Search Party, Connect, Commissioning and Build a Room, Assurance, ServiceHands, Field Intelligence (scan replay), APEX, Critical Signal,
Knowledge Ledger, Harmony, Learn and SIGNAL (the graphic novel, Mission Control, Practice, Service Mode, challenges, boss levels, case
files, the bench), Room Guide (end-user chapters), Site Champion, the AV Engineering Standards and Design Manual, Drawing Intelligence,
Instant Room, the IT Onboarding guide, Design a Space, Space Optimizer, the worlds, the guided tours.

## Data

Synthetic only. The estate is **90 rooms** (verified by `tests/unit/demo-lite.test.mjs`: the thirty, rows 31–45 of the rooms plan, then
rows 46–90; ids unique; the first 45 fingerprinted). `packages/domain-types` types the room: geometry with provenance, planned
devices, connections, classification, design findings, applicability and recorded results with evidence and independent verification.
Tenant, project, document, approval, incident and the API's events are in `packages/schemas` (JSON Schemas for the enterprise API);
site, building, floor, installation, baseline, issue, person and competency live in the demo's own modules (`campus/`, `connect/`,
`learn/`). No real organisation, person or measurement.

## Integrations

| | State |
|---|---|
| Microsoft Graph (calendar adapter, document source) | **mock-tested only**; real tenant validation, event creation, Teams, SharePoint: pending |
| Room control, calendar, knowledge ingestion | **simulated** |
| Hardware, device discovery, field measurements | **not built**; Field Intelligence is a replay of synthetic scans |
| Identity | personas of the demonstration; no sign-in |
| ElevenLabs | blocked at this session's gateway (403); not retried |
| Production deployment | `render.yaml`: the website from `main` with security headers (CSP, HSTS, frame, referrer, permissions, COOP); staging from `phase3/legendary-experience`; production only on the founder's word |

## Known open items at this baseline

From `docs/restoration/PARITY_MATRIX.md` and the inventories: Build a Room cannot join a designed room into the campus record; the
Optimize options A–C with an estimate need a costing basis; acoustics beyond the reverberation estimate; Room Builder's thread flow; the
SIGNAL opener held until the founder says which words stand. Before-change screenshots: to be taken from the build of the head after the
full matrix (`VISUAL_EVIDENCE.md`).
