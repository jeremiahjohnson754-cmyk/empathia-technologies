# Empathia design system

The editable design system behind the enterprise web app (`apps/enterprise-web`), the Founder Studio (`apps/founder-studio`) and the
2.5.4 demonstrator. It is **code, not a design file**: tokens in `packages/design-tokens/tokens.json`, components in `packages/ui/src`,
layouts in each app's stylesheet. A live reference of every component and token is the gallery (`node packages/ui/gallery/build.mjs`,
open `packages/ui/gallery/dist/index.html`; screenshots in `media/screenshots/design-system/`).

**No Figma, Sketch, XD, Penpot, Affinity or Photoshop design source exists.** A read-only search of the whole workspace
(`/home/claude`, excluding `node_modules`) for `.fig .sketch .xd .psd .ai .figma .penpot .afdesign` found none (2026-10-26). The
designs were authored directly as HTML/CSS in the demonstrator and then as tokens and React components here. A team that wants a design
tool can import the gallery screenshots as references, but the source of truth stays in code.

| Layer | Where | Consumed by |
|---|---|---|
| Tokens (colour, type, space, radius, motion, shadow, breakpoints) | `packages/design-tokens/tokens.json` → `build-tokens.mjs` → `dist/tokens.css`, `dist/tokens.js` | every app |
| Components and status vocabulary | `packages/ui/src/components.tsx`, `status.ts`, `ui.css` | enterprise web app, gallery |
| App layouts | `apps/enterprise-web/src/styles/app.css`; `apps/founder-studio/src/styles/studio.css` | each app |
| Demonstrator skin (origin of the dark palette) | `Empathia_V25/work/source-254/src/v30-aurora.css`, `src/app.css`, `src/lite.css` | the 2.5.x editions (frozen releases untouched) |
| Reference and checks | `packages/ui/gallery/` (`gallery.tsx`, `check.mjs` → `GALLERY_CHECK.json`, `PALETTE_CHECK.json`) | engineers, reviewers |

## 1. Brand colours (Aurora)

Dark values are the demonstrator's **Aurora** skin unchanged; light values (**Aurora Daylight**) were added in the founder program with
the same hues darkened for a pale ground. `tokens.css` is dark-first: bare `:root` holds dark values; `prefers-color-scheme: light`
(unless `data-theme="dark"`) and `:root[data-theme="light"]` switch to light; `:root[data-theme="dark"]` forces dark.

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#070d1a` | `#f3f6fb` | page ground |
| `--bg2` | `#0a1222` | `#e9eef7` | recessed ground (rails, wells) |
| `--panel` | `#0f1a30` | `#ffffff` | card / panel surface |
| `--panel2` | `#16233e` | `#eef2f9` | raised or hovered surface, table headers |
| `--line` / `--line2` | `rgba(214,228,255,.09)` / `.17` | `rgba(16,32,64,.10)` / `.20` | hairline / strong borders |
| `--tx` / `--tx2` / `--tx3` | `#edf3ff` / `#aebbd8` / `#7f8fae` | `#0b1730` / `#3a4a68` / `#5c6b88` | primary / secondary / muted text (muted ≥ 4.5:1 on panel per tokens.json) |
| `--accent`, `--accent-bg` | `#3fd8ff`, cyan 11 % | `#0b76a8`, blue 10 % | interaction, selection, focus ring |
| `--indigo`, `--violet` | `#6473ff`, `#a68cff` | `#4553d6`, `#6b4fd8` | depth, Learn / SIGNAL mood, ceiling-mount devices in the plan view |
| `--ok` `--warn` `--bad` `--info` | `#3ddc97` `#f5b942` `#ff6b6b` `#7aa7ff` | `#137a4f` `#8a5a00` `#b42318` `#2f5bb7` | status — always with a word or a glyph |
| `--ev-*` (8) | see tokens.json `evidence` | | the eight evidence states (SPECIFIED → CUSTOMER_VALIDATED) on the Founder Studio maturity ladder |

**Palette check (recorded, not fixed).** The dataviz palette validator was run on the five tones `Composition` uses
(`packages/ui/gallery/PALETTE_CHECK.json`): **FAIL** in both themes. Light theme: `--warn` and `--bad` are almost identical under
deuteranopia (ΔE 0.3) and below the normal-vision floor (ΔE 12.8); dark theme: the status tones sit above the categorical lightness band;
the muted "not tested" slot is intentionally grey. Mitigation in place: no chart relies on colour alone (text legend with counts, 2 px gaps,
the same numbers in tables). Recommended fixes for the design owner are in that file; tokens were not changed.

## 2. Typography

System font stacks only — **no licensed or downloaded font files ship** (`--font-sans`, `--font-serif`, `--font-mono` in tokens.json).
A 1.2 modular scale from the demonstrator's 15 px body: `--fs-xs 12.5` · `sm 13.5` · `base 15` · `md 18` · `lg 21.6` · `xl 26` ·
`xxl 31` · `display 37` px. Headings use weight 700, `text-wrap: balance`; numbers that line up use `font-variant-numeric: tabular-nums`
(tables, stats, metadata); identifiers (room codes `R-PLN-0001`, asset ids `PA-0001`, test ids) use the mono stack.

## 3. Spacing, radii, shadow, grid and breakpoints

Space scale `--sp-1…8` = 4, 8, 12, 16, 24, 32, 48, 64 px. Radii `--r-sm 8px` (controls, rows), `--r-md 14px` (cards, drawers),
`--r-pill` (badges). One shadow token per theme (`--shadow`), used only on floating surfaces (drawer, sign-in card, studio rail on phones).

| Breakpoint | Token | Used in code |
|---|---|---|
| ≤ 900 px | (tablet, not a token) | enterprise web: splits and form rows collapse to one column (`app.css` line 70); studio: rail becomes an off-canvas drawer, two/three-column grids collapse (`studio.css` 204) |
| ≤ 1180 px | `desktop` | studio: split views, the Engine Lab and the status band reflow (`studio.css` 199) |
| 480 / 820 / 1520 px | `phone` / `tablet` / `wide` | declared in tokens.json; **not yet referenced** by any stylesheet — the apps use 900 px. Align or remove (design debt). |

Grids are CSS grid with `minmax(0, 1fr)` columns and `auto-fill/auto-fit` card grids (`.cards` 320 px minimum, `.stats` 200 px).
Every page keeps a 16–24 px side gutter; at 390 px the gallery and the enterprise sign-in page have no horizontal scroll (tested).

## 4. Navigation patterns

* **Enterprise web** — a sticky top bar (`.bar`): brand, primary nav (Rooms, Projects, Reports, Inbox, Administration when the role has an
  admin authority), the signed-in person and role. Hash routes; the current item carries `aria-current="page"`. A "synthetic data · not
  production-ready" strip sits under the bar on every page. Breadcrumbs on detail pages.
* **Founder Studio** — a left rail of 27 destinations in six groups (`Shell.tsx`, `nav.ts`), each with a mini evidence ladder; a command
  palette (Ctrl/⌘-K) searching products, pages, films, documents and source; an off-canvas rail under 900 px; skip link first.
* **Demonstrator** — persona-aware navigation (`82-ui-suite.js` NAV_GROUPS) and per-room tabs; personas are switched through the page's
  own control, never by URL.
* Hiding a navigation item is a convenience, never a control: the API refuses what a role may not do (tested in
  `tests/browser/enterprise-web.test.mjs` W-09).

## 5. Cards and dashboards

Cards (`.card` in the web app, `.panel` in the studio) set off one object; they are not applied to every block. Dashboards open with a
`.stats` row of `Stat` figures **only where the figures are the point** (Reports); every ratio shows its definition, and a figure with
no data shows "—", never 0. Live operational performance is shown as "Not monitored" until a monitoring feed exists.

## 6. Tables and data explorers

`DataTable` (`components.tsx`): sticky header on `--panel2`, sortable headers as buttons with `aria-sort`, tabular numbers, dense
variant for engineering views, an explicit empty state, horizontal scroll inside its own container. Clickable rows are a mouse
convenience; the first cell always carries a real link for keyboard and screen-reader users (enterprise web Rooms list). Filters sit in
one row above the table (lifecycle tabs on Rooms; "show tests that do not apply" on Commissioning).

## 7. Forms and validation

`Field` renders a real `<label>`, links hint or error with `aria-describedby`, and shows the error **instead of** the hint. Inputs are
full width with a 36 px minimum height. Validation is the server's: the API validates every body against its route contract and the
form shows the server's message and reasons verbatim (`ErrorState`). Client-side checks only prevent obviously empty submissions
(e.g. "Create room" disabled until a name is typed). Typed lengths accept metres, feet, or feet-and-inches (`24' 6"`); an unreadable
value is refused, never substituted.

## 8. Modal and drawer behaviour

`Drawer` is the only modal pattern in the enterprise web app: a right-hand panel over a scrim, `role="dialog"` + `aria-modal`, labelled by
its title. Focus moves to the first field on open, Tab and Shift-Tab are trapped inside, Esc or a scrim click closes it, and focus
returns to the control that opened it — all four verified by the gallery check (G-drawer). The studio's command palette follows the
same rules. No `alert()`/`confirm()` dialogs are used anywhere.

## 9. Room-builder controls

The full room builder is the demonstrator's **Build a Room with Lite** (`src/v25-61-room-ui.js`, route `#/v25/build`), embedded by the
Founder Studio (`BuildARoom.tsx`, tabs live / town hall / lab / outside). Its controls:
* wizard: template, dimensions (metres/feet), import (image → photo layout or scaled-plan tool with two-point scale; PDF and CAD files
  recorded as references, not parsed), typed or drawn outline (`v25-rb-outline-*`), sample plan;
* editor: 2D plan with drag (`v25RbPlanSvg`), 3D view (`v25-rb-view`, SVG projection), toggles (measurements, labels, furniture, coverage
  hypotheses, cable routes — `aria-pressed` pills), undo/redo, equipment palette grouped by family, device inspector (rotate ±15°,
  swap model or category, change mount, connect to another device with a kind, find in Search Party);
* engineer mode, drawings (generate, approve, redline), commissioning workbook, issues (assign, work order), history and revision compare,
  lifecycle actions, and — in the Private Engineer Edition only — inspection and fault injection.
The enterprise web app implements the server-backed subset: create room, add / remove device, change model, remove connection, save
revision, generate and approve drawings, approve classification, lifecycle steps, record and verify results (`Room.tsx`). It has a
read-only plan view (`FloorPlan.tsx`), not a drag editor (see `docs/frontend/FRONTEND_ENGINEERING.md` §7 for the editor contract).

## 10. Engineering inspectors

Dense definition lists (`Facts`, the demonstrator's `.rb-dl`) beside the object they describe: model (or "generic sample object"),
mount, position in the room's unit, properties, connections, the tests the device affects. Identifiers in mono; provenance always
stated (DECLARED / MODELED / PHOTO_INFERRED / SCALED_PLAN). The Private Engineer Edition adds state history, API contracts and fault
simulation; the investor experience never shows these.

## 11. Issue severity visuals

`SEVERITY` in `status.ts`: Critical `▲▲` and High `▲` (tone bad — both block design approval and acceptance), Medium `■` (warn — blocks
acceptance only), Low `·` (muted, advisory). Category (design deficiency vs installation/commissioning deficiency) is shown as text
beside severity, because it decides the remedy (design change vs field work order).

## 12. Commissioning status visuals

`RESULT` in `status.ts`. **There is no bare PASS anywhere**: a pass is either **Passed, verified** (`✓✓`, ok) — recorded with evidence
and verified by a different person — or **Passed, awaiting verification** (`✓`, info). Failed `✕` (bad), Not supported `⊘` and
Inconclusive `?` (warn), Not tested `○` (muted). The two pass states differ in glyph, word and tone, so they stay distinguishable in
greyscale, in print and for colour-blind users. The gallery check G-nobarepass fails the build of the reference if any badge reads a
bare PASS. Room lifecycle uses its own table (`LIFECYCLE`, `◇ ◆ ▷ ▶ ⚙ ✓ ●`); live health is `– Not monitored` until monitored.

## 13. Charts

`Composition` (part of a whole) is the only chart component in the starter: a 10 px bar of segments with 2 px gaps and a text legend
carrying every label and count, plus the total. Colour is never the only carrier of meaning. The Founder Studio draws the evidence ladder
(`Ladder.tsx`: filled / hatched / empty rungs with an `aria-label` sentence) and bar tracks; the demonstrator has its own SVG charts
(`71-ui-charts.js`). Dual axes are not used. See §1 for the recorded palette FAIL.

## 14. Tooltips

Native `title` attributes only, and only as a second channel: every badge's `title` repeats its help text, every plan-view device has an
SVG `<title>`. No information exists only in a tooltip (tooltips are unreachable on touch and by keyboard). A custom tooltip component is
not provided.

## 15. Empty, loading and error states

`Loading` (`role="status"`, polite), `Empty` (a title, what to do, an optional action), `ErrorState` (`role="alert"`): the title is chosen
by status — 403 "Your role cannot do this", 404 "Not found in your tenant or sites", 422 "Refused by a rule" — then the server's detail,
its reasons as a list, and the correlation id as "Reference …". Errors never apologise and are never vague. `Notice` carries standing
caveats (synthetic data, contract-only integrations).

## 16. Accessibility specification

Target: **WCAG 2.2 AA**. What is designed in: semantic landmarks and headings; skip links (web app, studio, gallery); visible 2 px focus
rings on `--accent`; keyboard operation of every control (roving-tabindex tabs with ←/→, drawer focus trap and return, sortable headers as
buttons); status by glyph + word; `prefers-reduced-motion` honoured; no horizontal scroll at phone width; form errors linked to fields.

| Verified | Evidence |
|---|---|
| every focusable element reachable by Tab; tabs operable by arrows; drawer focus trap, Esc, return | `packages/ui/gallery/GALLERY_CHECK.json` (10/10 PASS) |
| no horizontal scroll at 390 px (gallery both themes; enterprise sign-in) | GALLERY_CHECK G-390-*; `tests/browser/enterprise-web.test.mjs` W-21 |
| room tabs keyboard operable; skip link in the studio | W-17; `tests/browser/founder-studio.test.mjs` |

**NOT_RUN:** an automated WCAG audit (no axe-equivalent engine installed offline), a screen-reader walkthrough, colour-contrast audit of
every screen, zoom/reflow at 400 %, and testing with users with disabilities. The palette validator result above is a known gap.

## 17. Light and dark modes

Three states: system (no attribute), `data-theme="light"`, `data-theme="dark"`. Components style through tokens only; no component sets
a literal colour. The studio stores the choice per browser (`empathia.founder-studio.v1`); the enterprise web app follows the system;
the gallery has a switch. Mermaid diagrams in the studio are rendered twice and the theme picks one (`studio.css` 223–226).

## 18. Animation guidance

Motion answers an action (drawer open, rail slide, button spinner) and lasts `--t-fast 160ms` or `--t-med 240ms` on `--ease`. No
entrance animations on page load. `prefers-reduced-motion: reduce` removes transitions (studio global rule; `ui.css` stops the spinner);
the studio also offers its own reduced-motion setting (`data-motion="reduced"`), and the demonstrator's 3D view honours it (`l3Reduced`).

## 19. Iconography

Glyph-based: Unicode shapes in the status tables, `◈` brand mark, `☰ ☀ ☾ ◐ ⌕` in the studio top bar. **No icon font and no icon SVG set
ships.** Every glyph is `aria-hidden` and paired with text or an `aria-label`. A team adding an icon set should keep that pairing.

## 20. Reusable CSS tokens

Edit `packages/design-tokens/tokens.json`, run `node packages/design-tokens/build-tokens.mjs`, never edit `dist/tokens.css`. Components
use only `var(--…)`; component classes are prefixed `ui-`, gallery classes `g-`. The full token sheet with live swatches is the last
section of the gallery.

## 21. Two presentation layers

* **Investor-facing** (investor editions of the demonstrator, Founder Studio Mission Control and product pages): fewer, larger figures,
  plain-language labels, evidence ladders, films; no internal source vault, restricted evidence, engineering-only controls or private
  inspection. Synthetic-data and "not production-ready" notices stay visible.
* **Engineering tools** (enterprise web app, Engineer Mode, Private Engineer Edition, Architecture Explorer): data-dense tables, mono
  identifiers, every rule's reasons shown verbatim, state history and contracts. Same tokens and status vocabulary in both, so a status
  means the same thing everywhere.

## Typography (2026-10-30, Adobe Fonts)

The platform typeface is **Acumin Pro** (Adobe Originals, Robert Slimbach), chosen with Adobe's font recommendation for a data-dense
enterprise interface and published as a real Adobe Fonts kit under the owner's account: kit **`kis0uqz`** — *Empathia platform UI
(Acumin Pro)* — weights 400, 400 italic, 500, 600, 700, domains `localhost`, `127.0.0.1:4200/4310/4300` (production host names must be
added to the kit at fonts.adobe.com before go-live). The token `--font-sans` now reads `"acumin-pro", ui-sans-serif, system-ui, …`:
the fallback stack renders when the kit is not loaded.

Loading is a **deployment setting, never a build-time dependency**: each server (`apps/*/server/serve.mjs`) injects
`<link rel="stylesheet" href="https://use.typekit.net/<kit>.css">` and allow-lists `use.typekit.net` / `p.typekit.net` in `style-src`,
`font-src`, `img-src` and `connect-src` **only when `FONT_KIT_ID` is set** (`--font-kit=` on the command line). Tests run without it, so
the "no request leaves 127.0.0.1" checks stay meaningful; `.env.example` and `docker-compose.prod.yml` set it for a deployment.
Numerals: tables and KPIs use `font-variant-numeric: tabular-nums` (already in `ui.css`).

## One platform shell (2026-10-30)

`packages/ui/src/shell.tsx` — `AppShell` (brand, product rail, identity, status note) and `ProductHeader` (product name, one-line
purpose, actions) — is now the frame of the enterprise application and the investor demonstration. The rail lists the platform's
products in the same order everywhere: **Mission Control · Pro · Lite · Search Party · Commissioning & Assurance · Field Intelligence ·
Learn · Administration**. A product a role may not reach is shown locked with its reason (the platform's shape is not a secret; the API
decides what is behind the door). The Founder Studio keeps its own private shell on the same tokens (ADR-0001 §3).
