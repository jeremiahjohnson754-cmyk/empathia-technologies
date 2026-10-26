# Design-to-code map

Which code implements each design pattern, and which screens use it. Paths are relative to the repository root; demonstrator paths are
relative to `Empathia_V25/work/source-254/` (the 2.5.4 development source, read-only for this program). "Gallery" means
`packages/ui/gallery/dist/index.html` (built by `node packages/ui/gallery/build.mjs`).

| Pattern | Implementation (component / CSS) | Enterprise web app | Founder Studio | Demonstrator 2.5.4 | Gallery section |
|---|---|---|---|---|---|
| Colour, type, space, radius, motion tokens | `packages/design-tokens/tokens.json` → `dist/tokens.css` | everywhere (bundled into `app.css` by `build.mjs`) | everywhere (`studio.css`) | origin: `src/v30-aurora.css` (dark), not imported back | tokens |
| Button (primary / secondary / quiet / danger, small, busy) | `packages/ui/src/components.tsx` `Button`; `ui.css` `.ui-btn*` | every page | own `.btn` classes in `studio.css` | `.btn`, `.btn.quiet` (`src/app.css`), `.btn.sm` (`src/v50-v25.css`) | buttons |
| Status badge (result, lifecycle, severity, integration, live) | `status.ts` tables + `StatusBadge`/`Badge`; `.ui-badge`, `.ui-tone--*` | Rooms list, Room header and tabs, Reports, Admin › Integrations | `.chip` (`studio.css` 77–80) with text | `chip(text, tone)` (`src/70-ui-core.js` 27) | status |
| No-bare-PASS result labels | `RESULT` in `status.ts`; server labels from `app.current_result` | Room › Commissioning, Reports | Engine Lab result words | `v25RoomResultLabel` (`src/v25-60-room.js` 500) | status (check G-nobarepass) |
| Tag (category / state label) | `Tag`; `.ui-tag` | Devices (category), Issues (state), Drawings (state), Admin › People | — | `.pill` | tags |
| Loading / empty / error / notice | `Loading`, `Empty`, `ErrorState`, `Notice`; `.ui-state*`, `.ui-notice` | every data surface; sign-in errors; lifecycle refusals | page-level states in each page | `toast`, `.note` | states |
| KPI figure with definition | `Stat`; `.ui-stat*` | Reports | `.status-band` (`studio.css` 102–105), Mission Control | Pro dashboards | figures |
| Part-of-whole bar with text legend | `Composition`; `.ui-comp*` | Reports, Room › Commissioning | `.bar .track/.fill` | `src/71-ui-charts.js` | figures |
| Evidence ladder (8 states) | `apps/founder-studio/src/components/Ladder.tsx`; `--ev-*` tokens | — | rail mini-ladders, product pages, Product Maturity | — | tokens (`--ev-*`) |
| Data table (sortable, dense, empty) | `DataTable`; `.ui-table*` | Rooms, Devices, Connections, Issues, Commissioning plan, Drawings, Revisions, Work orders, Reports, Admin | own tables (`.ledger`, docs) | `.v14-table` | table |
| Form field with hint / error | `Field`; `.ui-field*` | Sign-in, New room, Change model, Record result, Assign issue, New project | Settings | wizard and inspector `<label>`s | forms |
| Tabs (roving tabindex) | `Tabs`; `.ui-tab*` | Room sections, Rooms lifecycle filter, Admin | `nav.tabs` (Build a Room) as links | room tabs (`src/89999994-ui-room-tabs.js`) | tabs |
| Drawer (modal side panel) | `Drawer`; `.ui-scrim`, `.ui-drawer*` | New room, Change model, Record result, Assign issue, New project | command palette (`Shell.tsx` 71–90, same focus rules) | role="dialog" panels in `src/91-aurora-shell.js` (96, 121) | drawer |
| Facts (definition list) | `Facts`; `.ui-facts` | Room › Overview, Service & read model | product facts | device inspector `.rb-dl` (`src/v25-61-room-ui.js` 107–118) | facts |
| Top navigation bar + synthetic strip | `apps/enterprise-web/src/App.tsx`; `.bar`, `.nav`, `.synthetic` (`app.css`) | every signed-in page | — | — | — |
| Left rail, command palette, skip link | `apps/founder-studio/src/components/Shell.tsx`; `.rail`, `.palette*`, `.skip` | — | every page | persona suite nav `src/82-ui-suite.js` 100–109 | — |
| Plan view (2D, read-only) | `apps/enterprise-web/src/components/FloorPlan.tsx`; `.plan*` | Room › Overview | — | editable plan `v25RbPlanSvg` (`src/v25-61-room-ui.js` 21) | — |
| Room builder (edit, palette, inspector) | demonstrator only: `src/v25-61-room-ui.js` (`v25RbDesignTab` 96, `v25RbInspector` 107); engine in `packages/commissioning-engine/src/design.ts` | partial: add/remove/change device, remove connection (`Room.tsx` Devices) | embeds the demonstrator (`BuildARoom.tsx`, `DemoFrame.tsx`) | full | — |
| 3D view | demonstrator only: SVG projection renderer `src/87-ui-lite3d.js`; scene builder `v25RbScene` (`src/v25-61-room-ui.js` 55) | — | via the embedded demonstrator | full (browser render, not UE5) | — |
| Sign-in (development identity provider) | `apps/enterprise-web/src/pages/SignIn.tsx`; `.signin*` | sign-in | — | persona switch `[data-act="v25-persona"]` | — |
| Theme switching | tokens (`:root`, `[data-theme]`); studio store `theme` | follows system | `Shell.tsx` 134, `lib/store.ts` | dark (Aurora) only; per-role skins (`SKIN_SWATCH`, `src/82-ui-suite.js` 89) — no light mode | header switch |
| Reduced motion | `ui.css` 41; `studio.css` 219–220 | spinner | global rule + setting | `l3Reduced` (`src/87-ui-lite3d.js`) | — |

## Screens → files

| Screen | File |
|---|---|
| Enterprise web: sign-in, Rooms, Room (Overview, Devices, Issues, Commissioning, Drawings & revisions, Service & read model), Projects, Reports, Inbox, Administration (Integrations, Outbox, People, Audit) | `apps/enterprise-web/src/pages/{SignIn,Rooms,Room,Projects,Reports,Inbox,Admin}.tsx` |
| Founder Studio: 27 destinations | `apps/founder-studio/src/nav.ts` → `pages/*.tsx` (product destinations share `ProductPage.tsx`) |
| Demonstrator Build a Room | `src/v25-61-room-ui.js`, services `src/v25-60-room.js` |

Screenshots of each are indexed in `STATIC_REFERENCES.md`.
