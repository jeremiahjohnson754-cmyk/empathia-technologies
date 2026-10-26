# Frontend and 3D engineering

Directive section 13 F. What exists is labelled with its file; what does not exist is labelled **SPECIFIED ONLY**.

| Front end | Stack | Entry | Build | Tests |
|---|---|---|---|---|
| Enterprise web app (production starter) | React 19 + TypeScript, esbuild bundle, hash routes, `@empathia/ui`, typed `@empathia/api-client` | `apps/enterprise-web/src/main.tsx` | `node apps/enterprise-web/build.mjs` → `dist/` served by `server/serve.mjs` (127.0.0.1:4200, CSP) | `tests/browser/enterprise-web.test.mjs` (21 checks) |
| Founder Studio | React 19 + TypeScript, esbuild, hash routes; embeds the demonstrator in an iframe | `apps/founder-studio/src/main.tsx` | `node apps/founder-studio/build.mjs` | `tests/browser/founder-studio.test.mjs`, `tests/e2e/founder-townhall.e2e.mjs` |
| UI library + gallery | React components + CSS over tokens | `packages/ui/src/index.ts`; gallery `packages/ui/gallery/gallery.tsx` | consumed from source; `node packages/ui/gallery/build.mjs` | `packages/ui/gallery/check.mjs` (10 checks) |
| 2.5.4 demonstrator | single-file vanilla JS app (no framework), own SVG 3D renderer | `Empathia_V25/work/source-254/src/*.js` | `python3 build.py 2.5.4 --no-media` | its own suites (not part of this repository) |

Offline substitutions: `@types/react` is replaced by a shim (`tooling/types/react-offline/index.d.ts`); React Query by a 70-line cache
(`apps/enterprise-web/src/api.ts`); Storybook by the gallery. A connected team swaps each in (see `docs/architecture/DEPENDENCY_SWAPS.md`).

## 1. Component specifications (`packages/ui/src/components.tsx`)

| Component | Props | Behaviour and accessibility |
|---|---|---|
| `Button` | `children`, `onClick?`, `kind?: 'primary'\|'secondary'\|'quiet'\|'danger'` (default secondary), `type?: 'button'\|'submit'`, `disabled?`, `busy?`, `title?`, `small?`, `testId?` | native `<button>`; `busy` disables it, sets `aria-busy` and shows a spinner (static under reduced motion) |
| `Badge` | `spec: StatusSpec`, `compact?` | glyph (`aria-hidden`) + label; `compact` keeps the label for screen readers only; `title` = help text |
| `StatusBadge` | `table: Record<string, StatusSpec>`, `value`, `compact?` | looks up `RESULT`/`LIFECYCLE`/`SEVERITY`/`INTEGRATION`/`LIVE`; unknown values get a neutral humanised label |
| `Tag` | `children`, `tone?: Tone` | mono label; tone colours text and fill |
| `Loading` | `label?` | `role="status"`, `aria-live="polite"` |
| `Empty` | `title`, `children?`, `action?` | dashed container; says what to do next |
| `ErrorState` | `error: { status?, code?, detail?, message?, reasons?, correlationId? }`, `retry?` | `role="alert"`; title by status (403/404/422/other); reasons listed when more than one; "Reference <correlation id>" |
| `Notice` | `tone?`, `children` | `role="alert"` for `bad`, else `status` |
| `Stat` | `label`, `value` (null/undefined → "—" with a "no data" title), `unit?`, `definition?`, `tone?` | tabular numbers |
| `Composition` | `parts: {key,label,value,tone}[]`, `total`, `label` | `<figure aria-label>`; bar is `aria-hidden`; legend carries every number |
| `DataTable<T>` | `rows`, `columns: Column<T>[]` (`key`, `header`, `render`, `sort?`, `align?`, `width?`), `rowKey`, `empty?`, `caption?`, `onRowClick?`, `dense?` | sortable headers are buttons with `aria-sort`; caption for screen readers; row click is a mouse convenience — give the row a link too |
| `Field` | `label`, `hint?`, `error?`, `children: (id, describedBy) => ReactNode`, `id?` | render-prop wires `id` and `aria-describedby`; error replaces hint |
| `Tabs` | `tabs: {key,label,count?}[]`, `active`, `onChange`, `label` | `role="tablist"`, roving tabindex, ←/→ move selection and focus; panels use `id="panel-<key>"` / `aria-labelledby="tab-<key>"` |
| `Drawer` | `open`, `title`, `onClose`, `children?`, `footer?` | `role="dialog"` `aria-modal`; focus in, Tab trapped, Esc and scrim close, focus returned (verified, gallery G-drawer) |
| `Facts` | `items: [label, value][]` | `<dl>`; missing value → "—" |

Status vocabulary (`status.ts`): `RESULT`, `LIFECYCLE`, `SEVERITY`, `INTEGRATION`, `LIVE`, each `{ label, glyph, tone, help }`, and
`statusOf(table, key)`. Tones: `ok | warn | bad | info | muted | accent`.

## 2. CSS design tokens
Source `packages/design-tokens/tokens.json`; generated `dist/tokens.css` (custom properties, dark-first with light overrides and
`[data-theme]` forcing) and `dist/tokens.js`. Reference: `docs/design-system/DESIGN_SYSTEM.md`; live sheet: gallery › tokens.

## 3. Route maps

**Enterprise web** (`src/router.ts`, `src/App.tsx`) — hash routes; unauthenticated users see the sign-in page at any route.

| Route | Page | Notes |
|---|---|---|
| `#/rooms` (default) | `Rooms.tsx` | lifecycle filter tabs; New room drawer (shown to `room.design`) |
| `#/rooms/<code>/<tab>` | `Room.tsx` | tabs `overview` (default), `devices`, `issues`, `commissioning`, `drawings`, `service` |
| `#/projects` | `Projects.tsx` | New project for `project.decide` |
| `#/reports` | `Reports.tsx` | KPI summary |
| `#/inbox` | `Inbox.tsx` | notifications for the role |
| `#/admin/<tab>` | `Admin.tsx` | `integrations` (default), `outbox`, `people` (policy.configure), `audit` (provenance.review / policy.configure); nav item shown only with an admin authority |

Query `?api=<origin>` points the app at another API origin (the static server's CSP must allow it).

**Founder Studio** (`src/lib/router.ts`, `src/nav.ts`) — `#/<destination>[/<sub>][?k=v]`, default `mission-control`. The 27
destinations: Start — `mission-control`, `enterprise-platform`, `build-a-room`; seven operational products — `search-party`, `pro`,
`commissioning`, `assurance`, `field-intelligence`, `servicehands`, `intake`; expansion products — `drawing-intelligence`, `scouter`,
`procurement`, `control-studio`, `learn`, `signal`, `onboard`, `experiences`, `collaboro-sing`, `frontline`; Experience — `scenarios`,
`media`; Engineering — `architecture`, `docs`, `maturity`; Vault — `vault`, `settings`. Product destinations render `ProductPage.tsx`.
The embedded demonstrator keeps its own hash inside the iframe.

## 4. State management

**Enterprise web** (`src/api.ts`):
* Session: the access token only, in memory on the `EmpathiaClient` and mirrored to `sessionStorage['empathia.enterprise-web.session']`
  for reloads (every access guarded). The principal (person, role, authorities, site scope) is always read from `GET /v1/me` — the
  browser never decides authority. A 401 from any call clears the session. Production replaces this with OIDC and, preferably, a
  backend-for-frontend with an HttpOnly cookie (token in `sessionStorage` is exposed to XSS — tracked in `docs/security`).
* Server state: `useQuery(key, fn)` caches by key and re-renders subscribers; `useMutation(fn, affects[])` runs, then invalidates every
  cache key starting with each prefix in `affects`. Keys in use: `me`, `rooms:<filter>`, `room:<code>`, `history:<code>`, `read:<code>`,
  `cmp:<code>:<a>:<b>`, `sites`, `projects`, `report:summary`, `inbox`, `integrations`, `outbox`, `people`, `audit`.
* Idempotency: every create (room, device, revision, result, work order, project) sends a fresh `Idempotency-Key` (`newKey()`).
* UI state (open drawers, selected tab, form fields) is local `useState`; the tab is in the URL.

**Founder Studio** (`src/lib/store.ts`): `StudioState { theme, reducedMotion, scenario progress, notes, demoPersonaSwitch, lastVisited }`
in `localStorage['empathia.founder-studio.v1']`, guarded; snapshots of the demonstrator's state are stored on disk through the studio
server's `/api/snapshots` (`apps/founder-studio/server/serve.mjs`), never in the browser. The demonstrator owns
`empathia.living-campus.v1`; the studio writes it only on an explicit restore or reset.

## 5. Form workflows (enterprise web)

| Workflow | Steps and calls | Server rules the form relies on |
|---|---|---|
| New room | Drawer: name, template, building (from `GET /v1/sites`), optional length/width/ceiling (m), floor, people → `POST /v1/rooms` (idempotency key) → navigate to `#/rooms/<code>` | `room.design`; site scope on the building; typed lengths must parse; dimensions in range; classification, checks and applicability computed server-side |
| Record a result | Commissioning › Record (shown when the room is COMMISSIONING and the role is responsible or `cxeng`): outcome, evidence kind (from the test's accepted kinds), evidence file, instrument (required for instrument-measured tests) → `POST /v1/evidence` (raw body, `content-type`, `x-file-name`) → `POST /v1/rooms/<code>/results` | evidence stored by SHA-256 and re-verified on read; result refused unless COMMISSIONING, applicable, responsible role, accepted kind, stored evidence; PASS is PASS_UNVERIFIED |
| Verify | Commissioning › Verify on a PASS_UNVERIFIED row → `POST /v1/rooms/<code>/results/<test>/verify` | different person, verification authority, PASS only, once |
| Assign an issue | Issues › Assign → drawer with owner role → `POST /v1/issues/<code>/assign` | `issue.assign` or `route.internal`; issue open |
| Work order | Issues › Raise work order (commissioning deficiencies only) → `POST /v1/issues/<code>/work-orders`; Service › Close → `POST /v1/work-orders/<wo>/close` | closing never passes a test |
| Lifecycle | header button for the next state when the role holds its authority (`NEXT` table in `Room.tsx`, a display hint) → `POST /v1/rooms/<code>/lifecycle` | one governed step at a time; blockers returned as reasons and shown verbatim |

## 6. Room-builder geometry (`packages/commissioning-engine`)
Units are **metres** internally; feet are converted on entry (`UNITS`, `toMetres`, `fromMetres`; `parseLength` accepts `12' 6"`, `12ft 6in`
or a bare number in the chosen unit). A room outline is a polygon `Array<[x, y]>` in metres, first point not repeated. Shapes:
`rect(w, l)` and `lshape(w, l)` (`geometry.ts` `shapes`). `polygonCheck(points)` (`design.ts` 16–43) accepts a drawn or typed outline when:
3–40 distinct corners (corners closer than 1 cm merge); every coordinate finite; translated so the minimum x and y are 0; extent between
0.5 m and 200 m on both axes; no two non-adjacent edges cross or touch; enclosed area ≥ 2 m². `area` (shoelace, 0.01 m²), `box` (extent),
`inside` (even-odd test). Device positions `x, y` are metres in the same frame, `z` metres above the floor, `rot` degrees, `mount` one of
`wall | ceiling | floor | table | rack`. The API stores geometry with per-dimension provenance (DECLARED / MODELED / SCALED_PLAN /
PHOTO_INFERRED); photo-inferred values are never treated as known facts. Details and the JSON Schema: `spatial/`.

## 7. 2D editor contract (what an editor sends to the API)
An editor is a client of the room endpoints; it never computes classification, checks or applicability itself (the response of every
change carries `{ applicable, openIssues, planChanged }`, and the editor re-reads `GET /v1/rooms/<code>`).

| Edit | Call | Body |
|---|---|---|
| Create room with a drawn outline | `POST /v1/rooms` | `{ name, template, buildingCode?, floor?, unit?, length?, width?, ceiling?, intendedUse?, occupancy?, shape?: 'rect'\|'lshape', points?: [[x,y],…] (3–40), projectCode? }` |
| Add device | `POST /v1/rooms/<code>/devices` (+ Idempotency-Key) | `{ category, x?, y?, mount?, rot? }` → `{ assetId: 'PA-…' }` |
| Move / rotate / re-mount / substitute model | `PATCH /v1/rooms/<code>/devices/<asset>` | `{ x?, y?, rot?, mount?, model? }` — the asset keeps its id; model history is kept |
| Remove device | `DELETE /v1/rooms/<code>/devices/<asset>` | — (kept in earlier revisions) |
| Propose / remove connection | `POST /v1/rooms/<code>/connections` / `DELETE …/connections/<id>` | `{ from: 'PA-…', to: 'PA-…', kind: 'signal'\|'network'\|'control'\|'power' }` |
| Save revision | `POST /v1/rooms/<code>/revisions` | `{ reason? }` → `{ revision, sha256 }`; refused when nothing changed |
| Compare revisions | `GET /v1/rooms/<code>/revisions/compare?a=&b=` | geometry, devices added/removed/moved/swapped, connections |
| Rename / use / occupancy | `PATCH /v1/rooms/<code>` | `{ name?, intendedUse?, occupancy? }` |

Edits are allowed only while the room is PLANNED and only for `room.design`. **Gaps (not implemented):** changing the outline after
creation (no geometry-edit endpoint), undo/redo on the server (the demonstrator keeps an undo stack client-side), drag-to-move in the
enterprise web app (its plan view is read-only; the move endpoint exists), plan-image import and scale calibration (demonstrator only).

## 8. 3D scene contract and asset import

**What exists (demonstrator only):** a browser 3D view drawn by the demonstrator's own SVG projection renderer
(`src/87-ui-lite3d.js`: perspective camera with yaw/pitch/zoom, shaded boxes and discs, depth sorting, cut-away walls, labels; drag, pinch,
buttons and arrow keys; honours reduced motion) — **no WebGL, no three.js, no React Three Fiber** anywhere in the workspace. The room
scene is built by `v25RbScene` (`src/v25-61-room-ui.js` 55–63) and can be **exported** as JSON (`v25-rb-scene`, line 243):
`{ schema: 'empathia.room-scene.v1', units: 'm', room: { id, outline, ceiling }, objects: [{ id, category, model, generic, x, y, z, rotDeg, mount, size }] }`.
The demonstrator labels it "browser render (SVG projection) — not a native Unreal Engine 5 build".
**SPECIFIED ONLY:** a production 3D viewer (React Three Fiber / three.js) consuming that contract — see `spatial/browser-3d/SCENE_CONTRACT.md`.

**Asset import:** the demonstrator accepts an image (re-encoded to strip metadata; photo → conceptual layout, or a scaled plan via
two-point calibration) and records PDF and CAD files (`.dwg .dxf .rvt .ifc`) as references **without parsing them**
(`v25RbImportFile`, `src/v25-61-room-ui.js` 265). The starter API has no import endpoint; evidence upload accepts JPEG, PNG, PDF, CSV,
JSON and text as evidence, not as geometry. CAD/BIM parsing: **SPECIFIED ONLY** (needs external engineering tooling).

## 9. Accessibility specification
Target WCAG 2.2 AA. Requirements and what is verified versus NOT_RUN: `docs/design-system/DESIGN_SYSTEM.md` §16. Engineering rules:
real buttons and links (no clickable `div` without a role and key handling); every status as glyph + word; every input labelled; every
modal through `Drawer`; tab state in the URL; no information only in `title` tooltips; test new screens in the gallery check and the
enterprise E2E (keyboard and 390 px checks).

## 10. Unreal Engine integration roadmap — SPECIFIED ONLY
**No Unreal Engine code, project or asset exists** (a read-only search of `/home/claude` for `.uproject`, `.uasset`, `.umap` found none on
2026-10-26; the demonstrator states "UE5 not run" in `src/v25-47-onboard.js` 6 and 35). The roadmap and contract are in
`spatial/ue5-contracts/UE5_CONTRACT.md`: the room-scene JSON above as the interchange format, read-only visualisation first, no device
control from a game engine, and an evidence label on every rendered value.
