# Quality uplift — V2.5.3 is the visual bar (founder, 2026-11-04 01:11 CT, binding)

Founder: "look at … what v2.5.3 is — your version needs to be 500x better or the same quality as this … the quality needs to be 4 steps
better … make the UI UX and navigation and workflows and screens and data modeling a 13/10 Apple / Microsoft Teams / Google / Amazon /
Netflix / Spotify quality … same QA approaches and do better … don't forget a single directive."

## Side-by-side findings (V2.5.3 offline vs. the rebuilt demo at 1440, dark)

- **Atmosphere lost.** V2.5.3: deep navy graphite (not black), gradient hero panels with a soft glow, layered cards with icons, chips and
  status dots, health scores (87/100), donut charts, sparklines, progress bars, a left icon rail (Home, Campus, Search, Room, More) with a
  compact top bar (role, search, notifications). Rebuild: flat near-black, text-dense, a crowded top nav of products + a second nav row +
  a disclaimer banner on every page.
- **Campus:** V2.5.3 has the isometric 3D campus (buildings as extruded tiles with health badges and colour) plus building health bars;
  rebuild has flat boxes.
- **Room (`#/room`):** V2.5.3 shows Atlas 4.218 — Executive Collaboration with room tabs, status chips, action buttons, health/devices/
  issues/lifecycle tiles, the **delivery spine** (Intake → Service), "Where the room has moved", open issues. Rebuild shows a placeholder
  ("the technical room page … being connected"). Unacceptable: every V2.5.3 address must land on a finished screen.
- **Defects:** every page's h1 shows a visible focus rectangle (programmatic route focus must not draw a ring — use `:focus-visible`
  semantics / `tabindex=-1` + no outline for script focus); Search Party's "planned device" column wraps one character per line; the
  "DEMONSTRATION · SYNTHETIC DATA … grants nothing" banner repeats on every page (V2.5.3 shows a small "Synthetic data" chip by the logo
  and one footer line — do that); greeting row + breadcrumb row + product row stack three bars.
- Mission Control, ServiceHands (donut routing chart, board), Executive (KPI passports with period/building filters), Learn (readiness
  tiles, competencies, "learn from a room") all have richer composition in V2.5.3.

## Rules for the uplift

- V2.5.3 is the floor, not the ceiling: each screen must be at least as rich, clear and beautiful as its V2.5.3 counterpart, then better
  (clarity, motion that explains, accessibility, consistency). Keep the approved decisions: Inter (D7), teal as the interaction accent with
  vibrant product colours (D8), system/light/dark (D9 — light mode must be equally polished), spatial stages dark (D36), nine products in
  order (D37/D40), one primary mark (D39), D44 access (rail/tabs/buttons from the policy), synthetic data only, no invented equipment.
- Capture: `node scripts/legacy/compare-v253.mjs <out> legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html http://127.0.0.1:<port>/ [routes]`
  (run from the repo root so playwright resolves; V2.5.3 is rendered offline with every request blocked — never trust or execute it
  otherwise). Look at the pairs (PIL contact sheets) before and after each change; iterate until your screen beats V2.5.3's.
- Data modelling: every number on screen is computed from the demo's records (as V2.5.3 does) — never typed in.
- Keep every test green; when markup changes, update assertions with the reason in the file. Add visual-regression-ish checks (layout,
  no overflow, no focus ring on headings after navigation, banner shown once).
- Same QA approach as before at the end of each slice: destructive QA, fixes, light and dark, 320/390/768/1440.
