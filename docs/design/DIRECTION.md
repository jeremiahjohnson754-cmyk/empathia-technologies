# Design direction — Empathia rebuild (demo + website)

Design studio hand-off for the six builders, 2026-11-04. Binding inputs: `docs/recovery/QUALITY_UPLIFT.md` (V2.5.3 is the floor),
`docs/phase3/LEI_DECISIONS.md` (D7 Inter, D8 teal accent only, D9 system/light/dark, D36 dark stages, D37/D40 nine products in order,
D39 emblem roles, D43 dark website captures, D44 a role never sees what it cannot use), the founder's concept images
(`docs/recovery/inspiration/`, inspiration only) and the 3 November phone screenshots (`docs/recovery/screens-2026-11-03/`).
Tokens come from `packages/design-tokens/tokens.json`; nothing here overrides it — this document says how to *compose* with it.

**Figma:** file "Empathia Emblem" (`vIAkEx5MIdBOy5KDIHJrzX`), page **Rebuild direction** (node `6:2`).
**Source of the frames:** `docs/design/direction/build_direction.py` renders `direction.html` (fourteen frames, 1440 + 390, every number
taken from `apps/demo/src/workspace/store.ts`, `campus/canon.ts`, `search/`, `access/v253.ts` — never typed in); `extract.mjs` +
`compact.py` + `figma-build.js` rebuild it in Figma as editable layers; `preview.mjs` renders PNGs locally.
**Screenshots:** `docs/design/direction/*.png` (rendered by Figma, `get_screenshot`).

| Screen | Figma node | 1440 | 390 |
|---|---|---|---|
| Mission Control | `8:2` | [01-mission-control-1440.png](direction/01-mission-control-1440.png) | source frame 2 in `direction.html` |
| Room · Atlas 4.218 | `9:2` | [03-room-atlas-4-218-1440.png](direction/03-room-atlas-4-218-1440.png) | frame 4 |
| ServiceHands · WO-0088 | `10:2` | [05-servicehands-wo-0088-1440.png](direction/05-servicehands-wo-0088-1440.png) | frame 6 |
| Search Party · ⌘K | `11:2` | [07-search-party-cmdk-1440.png](direction/07-search-party-cmdk-1440.png) | frame 8 |
| Lite · Living Campus | `13:2` | [09-lite-living-campus-1440.png](direction/09-lite-living-campus-1440.png) | frame 10 |
| Investor start · role flashcards | `12:2` | [11-investor-start-1440.png](direction/11-investor-start-1440.png) | frame 12 |
| Website · Home | `14:2` | [13-website-home-1440.png](direction/13-website-home-1440.png) | frame 14 |

Figma links: `https://www.figma.com/design/vIAkEx5MIdBOy5KDIHJrzX/Empathia-Emblem?node-id=8-2` (replace the node id per row).
All seven 1440 frames are in Figma; the seven 390 frames exist in `direction.html` (frames 2, 4, 6, 8, 10, 12, 14) and go in with the same builder (see "How to add a frame") — the mobile contact sheet is reproducible locally with `preview.mjs`.

---

## 1. The look in one paragraph

Deep navy graphite, not black (`bg #0e1012` / direction ground `#0a0e14`), with one soft product-coloured glow per page bleeding from
the top edge (blurred circle, 22 % opacity, product colour of the screen). Glass panels float on it: translucent graphite fills with a
1 px hairline and a 1 px inner highlight; the raised layer adds a long soft shadow. Inter everywhere, tight tracking on headings,
tabular numerals on every figure. Teal is the only thing you *press* — buttons, focus, the current rail item, selected tab, links.
The nine products keep their own vivid colours (D37 order) and appear as a strip of gradient tiles; statuses and evidence states are
chips that always carry a word and a dot/shape. Spatial stages (campus, room 3D, scan) sit in a darker radial well and stay dark in
light mode (D36). Everything is computed from records and labelled honestly: the amber "Synthetic data" chip by the logo, one footer
line, and the room's "Simulated adapters · no live telemetry" / "Real models named only from their published pages" chips.

## 2. Type scale (Inter, confirmed with Adobe Fonts)

Adobe Fonts lists Inter (designer Rasmus Andersson, foundry Google) in three optical sizes — **Inter 18pt, 24pt, 28pt** — each with
Thin 250 → Black 900 plus italics. Our self-hosted set (`packages/design-tokens/fonts`) ships 400/500/600/700 and Inter Display 800;
that matches the weights below, so nothing new needs preloading (D38 budget holds). Pairing: Inter only — no second family; Inter
Display (800) is the display face for the website hero and the investor start headline, the 18pt-optical cut for everything ≤ 20 px.
Use `font-feature-settings: 'cv11','ss01','tnum'` app-wide (single-storey a, open digits, tabular numbers).

| Role | Size / line | Weight | Tracking | Where |
|---|---|---|---|---|
| Display | 64 / 66 (website 1440), 40 / 44 (390) | 800 Display | −0.035em | website hero |
| Hero | 52 / 56 (1440), 32 / 36 (390) | 800 Display | −0.03em | investor start "Every role, one Core." |
| H1 | 32 / 38 (1440), 22–24 / 28–30 (390) | 700 | −0.02em | page title |
| H2 | 20 / 26 | 600 | −0.01em | card title |
| H3 | 15 / 20 (14 / 20 in lists) | 600 | 0 | list item title, tile label |
| Stat | 28 / 32 (22 inside rings) | 700 | −0.02em | stat tile value, ring value |
| Lead | 15 / 22 (18 / 28 website) | 400 | 0 | page sub-line |
| Body / sm | 13 / 18 | 400 | 0 | buttons 600, checklist rows |
| Caption / xs | 12 / 16 | 400 (600 for chips) | 0 | meta lines, chips, kv labels |
| Eyebrow | 12 / 15 | 600 | +0.06em, uppercase | section eyebrow ("MISSION CONTROL · …") |
| Rail / tab-bar label | 11 / 14 | 500 | 0 | icon rail, mobile tabs, stepper labels |
| Kbd | 11 | 600 | 0 | ⌘K, esc |

Text colours: `tx #f4f1ec`, `tx2 #bdb7ac`, `tx3 #a39d93` (dark); use the light-theme values from tokens.json in Paper.

## 3. Spacing, radii, elevation

- **Spacing** (tokens `space-px`): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Page body padding 28 (1440) / 16 (390); card padding 18 (14 on
  phone); card gap 16 (10–12 on phone); list row padding 12 vertical with a hairline between rows; chip row gap 8.
- **Shell**: icon rail 76 wide (Home, Campus, Search, Room, Work, Learn, More — items the role may open, D44), top bar 60 with brand,
  Synthetic-data chip, centred ⌘K field (560 max), bell, role pill. Phone: 56 top bar (small shield emblem, title, search, role avatar)
  and an 84 bottom tab bar (Home, Campus, Search, Work, More). Never stack a greeting bar + breadcrumb bar + product bar.
- **Radii**: control 10 (buttons) · field 12 (search) · chip/pill 999 · tile/card 16 · stage 20 · kbd 6 · label 6. Avatars round.
- **Elevation — the glass layers** (dark):
  - L0 ground `#0a0e14`; recessed `#0f141c` (rail, wells).
  - L1 glass `rgba(22,28,37,.82)` + hairline `rgba(255,255,255,.07)` + inner highlight `inset 0 1px 0 rgba(255,255,255,.04)` — cards, tiles, chips.
  - L2 raised `rgba(30,38,50,.88)` + hairline `.14` + `0 12px 32px -12px rgba(0,0,0,.6)` — the Search Party bar, role pill, secondary buttons.
  - L3 overlay `rgba(16,21,29,.96)` + hairline `.14` + `0 30px 80px -20px rgba(0,0,0,.8)` over a `rgba(5,7,10,.45)` scrim — ⌘K palette, sheets.
  - Stage well: radial `#1a2433 → #0b0f16` inside a 20-radius hairline frame; stays dark in light mode (D36).
  - Glow: one blurred (90 px) circle per page, product colour of the screen, 22 % opacity, positioned off the top edge.
  - Focus: `0 0 0 2px bg, 0 0 0 4px accent` on `:focus-visible` only; programmatic route focus (`tabindex=-1`) draws nothing.
- **Motion** (tokens): 140 / 220 / 350 ms, `cubic-bezier(.2,.7,.2,1)`; reduced motion → opacity only. Role switch: the role colour
  (`--role`) crossfades on the avatar, rail highlight and page glow over 350 ms; stepper/ring values count up once on mount (220 ms).

## 4. Component specs (the kit)

- **Stat tile** — L1, 3 px colour bar on the left edge (product/status colour), label 12/600 `tx2` with an optional 16 px icon on the
  right, value 28/700 tabular, optional sparkline (120×34, 2 px line + 14 % area fill, same colour) right-aligned with the value,
  caption 12 `tx3`. Minimum 230 wide; four across at 1440, two across at 390.
- **Score ring** — SVG, stroke 10, track `rgba(255,255,255,.08)`, round caps, starts at 12 o'clock; value 22/700 centred with a
  two-line caption under it; 112 px (104 on phone). Only for ratios that the records give (coverage 18/18, PoE 118.3/480, preflight 0/4).
- **Chip** — 24 high, 10 px side padding, 12/600, colour text on `colour14` fill with `colour55` hairline; dot (7 px) for statuses and
  evidence states, no dot for identity/descriptor chips (room class, "Synthetic data", "Real models …"). Statuses: OPEN `bad`,
  TRIAGED `warn`, RESOLVED `info`, CLOSED/VERIFIED `ok`, always with the word.
- **Product tile** — 160° gradient `colour30 → colour08`, hairline `colour40`, 10 px dot, name 14/600; nine in D37 order, one strip at
  1440, horizontal chip row at 390. The product colour is never used for a button.
- **Tabs** — underline tabs, 14/500, 2 px teal underline on the current one, hairline rule beneath the row.
- **Stepper / spine** — 22 px nodes with a 2 px connector; done = teal fill with ✓, current = teal 2 px ring + 4 px teal halo, future =
  hairline ring; labels 11/500 only near the current step on long strips (12 ServiceHands stages), all labels on short ones (6-step
  room delivery spine). Phone: a single 6 px progress bar + "Stage 2 of 12 · Intake" chip.
- **Timeline** — 12 px hollow dots (2 px stroke, `colour33` fill) joined by a 2 px hairline; title 14/600, meta 12 `tx3`; the next
  (future) step is grey.
- **List row** — 9 px status dot, title 14/600, meta 12 `tx3` ("ISS-0417 · Atlas 4.218 Boardroom · recurrence of ISS-0380 · WO-0088"),
  trailing status chip; hairline between rows; whole row is the link.
- **⌘K palette** — L3 overlay 640 wide at 1440 (full width sheet on phone), query row with a 20 px product-pink search icon and `esc`
  kbd, groups with an eyebrow "DEVICES & PHYSICAL UNITS · 32 MORE IN SEARCH PARTY", rows with a 8 px square swatch (asset = Pro violet,
  planned device = Lite orange, incident = ServiceHands green), two-line text, trailing type chip; footer with ↑↓ ↵ ⇥ hints and
  "Open all in Search Party →". Planned-device column never wraps per character (fixed min-width 120).
- **Role pill / flashcard** — avatar initials on the role colour (`--role-*` in `shell.css`), name 13/600, chevron. Flashcard 200×250
  (260×300 on phone carousel): gradient `role38 → role0a`, avatar 44, name 15/600, one line on what the role sees (D44), coverage bar
  (4 px, role colour) and "26 of 77 surfaces · 1,950 records" computed from the policy.
- **Buttons** — 36 high (46–48 for hero/phone primary), radius 10, 13/600; primary = teal fill + `accent-ink` text; secondary = L2.
  Destructive stays secondary with the serious tone text, never red fill.
- **Isometric campus** — extruded tiles per building (`map` rectangles from `canon.ts`), top face 75 %, side faces 35/22 %, building
  short name 13/700 + floors 11/600 in ink on the tile; one product colour per building for the direction (Lite orange = Atlas).
- **Room 3D stage** — floor plane, back wall, table, teal camera-coverage cone at 8 %, device labels as 11/600 label pills in the
  class colour (`--c-display`, `--c-camera`, `--c-audio`); view chips (3D view · Plan · Coverage) top-left.

## 5. Per-screen layout notes

**Mission Control (8:2).** Rail Home. Eyebrow "MISSION CONTROL · ONE CONNECTED LIFECYCLE", H1 "Good morning — two jobs need you
today" (count from open + triaged incidents), lead names role · campus · "every number computed from the demo's records"; right:
"Replay a story" + primary "Open ISS-0417". Then the Search Party bar (L2, pink glow, hint "Try “4.218”, “ISS-0417”, “switch” or a
device category", ⌘K), the nine product tiles, four stat tiles (30 rooms · open jobs 2 with weekly sparkline · verified repairs 3 of 3 ·
baseline 75/75), then a 1.35 : 1 split — Service jobs list (all five incidents) and a right column with the 12-stage spine for the
selected job and the reference-room ring card. Phone: H1, ⌘K field, 2×1 stats, jobs list, product chip row, bottom tabs.

**Room · Atlas 4.218 (9:2).** Breadcrumb "North Campus › Atlas HQ › Floor 4", H1 "Atlas 4.218 — Executive Boardroom", chips (EXE ·
14 seats · 6.6 × 9.8 × 3 m / COMMISSIONING · recommissioning held / Simulated adapters · no live telemetry / Real models named only
from their published pages), actions (Replay the room's history · Open scan replay · primary Report an issue), four tabs (Room, layers
and devices · Commissioning plan · Service history · Where the room has moved). Body: 860×520 stage + four tiles (Baseline 75/75 ·
Positions 11 · Open issues 1 · Lifecycle Held) left; 320 "The room" panel right with kv rows (baseline, camera coverage MODELED, PoE
118.3 of 480 W, drift 3 of 17) and the 6-step delivery spine Intake → Service with Accept current. Every V2.5.3 room address lands
here. Phone: stage 358×230, tabs, 2 tiles, open-issue row.

**ServiceHands · WO-0088 (10:2).** Breadcrumb, H1 "Restore far-end audio · Atlas 4.218", chips OPEN · High · ISS-0417 · Recurrence of
ISS-0380 · Atlas 4.218 Boardroom, actions (Cancel the work order… · primary Assign technician — only for roles that hold the authority,
D44). Full-width 12-stage spine card (Intake current). Three columns 1 : 1.35 : 1 — Timeline (opened → WO staged → linked as a
recurrence → next), Matching (four staff rows from `store.ts` with the eligibility reason: skills, agreement, expired cert + leave, not
on an Atlas site) with the competency disclaimer, Before you start (four unchecked preflight rows + 0/4 ring). Phone: progress bar
"Stage 2 of 12 · Intake", timeline card, preflight summary, 48 px "Accept the job".

**Search Party · ⌘K (frame 7).** Page behind dimmed to 55 %: eyebrow in product pink, H1 "Start anywhere. Follow the relationships.",
lead "Declared is not verified; modeled is not measured — and the product says so itself.", five "ways in" tiles (a room · a device ·
a job · a person · a question), recorded story card. Palette as specified in §4 with the "camera" query: 4 assets (AS-0106/0107/0112/
1302 Logitech Rally Camera, identity VERIFIED), 3 planned positions, 1 incident. Phone: full-sheet quick find with the same groups.

**Lite · Living Campus (frame 9).** Eyebrow in Lite orange, H1 "Northstar Innovation Campus", lead "Northstar Industries (synthetic) ·
30 rooms modeled · every room opens in the same room view", segmented control Designed · Commissioned · **Current** · Proposed. Stage
with the six extruded buildings (Atlas 7 floors, Meridian 2, Forge 2, Beacon 3, Horizon 2, Northstar Annex) and two footer chips
(stage stays dark · coverage legend); right column: Scouter card ("Scouter · part of Lite", "Will this model fit the room?", 9 catalogued
models, primary Open Scouter — D41 discoverability) and the Buildings list with purpose + floors. Phone: stage 300 high, building chip
row, Scouter card.

**Investor start (frame 11).** No rail: top bar with emblem, Synthetic-data chip, Light/dark, primary "Start the 2-minute story".
Centred hero "Every role, one Core." + lead "Each role is given what its work needs and nothing else; the tabs, buttons and screens
change with it.", three ways-in cards (Two minutes · Ten minutes · Your own pace), "Choose who you are" with the 14 role flashcards in a
horizontal strip (← → to browse). Phone: hero, two-up flashcard carousel with page dots, 48 px "View as AV Operations Lead".

**Website · Home (frame 13).** Dark only for captures (D43). Nav Products · Solutions · Evidence · Company + secondary "Explore the live
demo" + primary "Request a demonstration". Hero grid: Display headline "Every room. Every device. Every decision. With its evidence."
(last line teal), lede from `apps/website/src/content.tsx`, two large buttons; right a 600×420 stage with the isometric campus and the
caption "Demonstration campus · synthetic · dark capture (D43)". Evidence chip row (DECLARED · MODELED · SIMULATED · OBSERVED ·
MEASURED · VERIFIED), then "Nine products. One record." with nine product tiles (5 + 4) each carrying "in the public demonstration".

## 6. Reference patterns (what to adopt from the best-in-class apps)

Mobbin's MCP is plan-gated on this account (search returned "requires a paid plan"; not retried), so no collection could be saved.
The patterns the frames adopt, and the product each is borrowed from, are listed here instead so the builders have the same brief:

| Pattern | Borrowed from | Adopt |
|---|---|---|
| Command palette with grouped results, type chips, keyboard footer | Linear ⌘K, Raycast, Notion search | §4 palette; group counts "32 more in Search Party"; ⇥ jumps groups |
| Compact icon rail + centred global search in the top bar | Microsoft Teams, Slack, Figma | 76 px rail, 560 px ⌘K field; rail shows only permitted items (D44) |
| Account / role switcher as an avatar pill with a sheet | Google account switcher, Netflix profiles, Spotify | Role pill → View-as sheet with coverage bars; role colour crossfade |
| Onboarding role cards in a carousel | Netflix "Who's watching?", Disney+ profiles, Apple Setup | Investor start flashcards, 14 roles, ← → |
| Stat tiles with sparklines + score rings | Apple Health rings, Stripe dashboard, Vercel analytics | §4 stat tile and ring; values only from records |
| Work-order timeline + stepper | Linear issue activity, Jira transitions, Amazon order tracker | 12-stage spine, hollow-dot timeline, next step grey |
| Asset / room detail with tabs, header chips and a side property panel | Linear issue page, Notion page properties, Apple Home room view | Room page tabs + "The room" kv panel |
| Isometric building tiles with health badges | Apple Maps 3D, Autodesk Tandem, Matterport | Campus stage, extruded tiles, building pills |
| Mobile bottom tabs (5) with a centred search | Spotify, Apple Music, YouTube | 84 px tab bar; Home · Campus · Search · Work · More |
| Gradient product tiles in a fixed canonical order | Google Workspace launcher, Apple services strip | Nine tiles, D37 order, never reordered |
| Evidence / status chips that always carry a word | GitHub status checks, Linear labels | Chip spec; no colour-only meaning |
| Soft product glow behind a dark glass shell | Apple tvOS, Spotify Now Playing, Arc | One glow per page, product colour |

## 7. How to add a frame to Figma

1. `python3 -I docs/design/direction/build_direction.py` (optionally a function name, e.g. `search_d`) → `direction.html`.
2. From the main repo root: `node docs/design/direction/extract.mjs <direction.html> <out>` then
   `python3 -I docs/design/direction/compact.py <out> <cjson>`.
3. In Figma MCP `use_figma`: prepend `const D = <cjson/fNN.json>; const POS = [x, 0];` to `figma-build.js` (frames are spaced 1600 apart
   on page `6:2`). It loads Inter Regular/Medium/Semi Bold/Bold/Extra Bold, rebuilds boxes, gradients, text and SVG icons as editable layers.
4. `get_screenshot` with `enableBase64Response` (the asset URLs are blocked by the session proxy) and copy the PNG into
   `docs/design/direction/`.

Known limits of the current frames: no auto-layout (absolute geometry from Chrome), inset shadows approximated by hairlines, the V2.5.3
owl and emblem use a simplified small-shield mark (the real `packages/design-tokens/brand/emblem-small.svg` goes in when the kit is
componentised). The "Synthetic data" chip, the honesty chips and the footer line are part of every screen and are not optional.
