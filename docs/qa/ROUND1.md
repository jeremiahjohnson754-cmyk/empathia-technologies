# Destructive QA — round one (website `apps/website`, investor demo `apps/demo`)

Branch `qa/round-1` from `origin/phase3/legendary-experience`. Method: the full regression, the dark pass, the strict audit in both
schemes, then a hostile/clumsy probe at 320/390/768/1440 in light and dark (every route and deep link, hostile hashes and queries,
back/forward and reload, rapid triple taps on every main-area button, keyboard-only walks, blocked and full storage, damaged stored
state, offline, failed chunk and failed main bundle, every role against every page for D44, external links). Severity: P0 broken core
path · P1 blocks a user group · P2 degraded · P3 polish. Regression tests name the defect ID in their check ID.

Scope note (coordinator, 2026-11-04): the demo is being restyled by the uplift builders (`docs/recovery/QUALITY_UPLIFT.md`); this round
fixes behaviour, workflow, data, accessibility-semantics and robustness defects and only *logs* pure visual nits on demo screens.

## Defect log

| ID | Where | Steps | Sev | Fix | Test |
|---|---|---|---|---|---|
| R1-01 | `tests/browser/demo.test.mjs` | Run the suite while anything else (another worktree's server) holds port 4398: the suite talks to that server and fails at D-desktop-01 | P2 (test infra) | The suite takes a free port like every other shell suite | the suite itself (101/101 on a free port) |
| R1-02 | Demo · Search Party result list (`packages/ui/src/ui.css` `.sp__list`) | `#/search` at any width: four items in a three-column row squeezed the record name to one character per line (found by the side-by-side) | P1 (unreadable) | Two columns: type and name on the first line, id under the type, subtitle under the name; long text wraps | `demo-access` R1-02-390, R1-02-1440 |
| R1-03 | Demo · every page after navigation (`apps/demo/src/styles/demo.css`) | Navigate by keyboard (or after any keyboard use): the route focus on the h1 drew the focus rectangle around the heading (found by the side-by-side) | P2 | Headings and `main` that receive the route focus (`tabindex=-1`, never a tab stop) draw no ring; controls keep theirs | `demo-access` R1-03 |
| R1-04 | Demo · investor tour panel (`apps/demo/src/tour/Tour.tsx`) | Session storage `empathia.demo.tour.v1` holding a non-step value (`abc`, `99`, `-1` — an older build, a damaged or edited value), reload: `STEPS[NaN]` threw outside every error boundary and the whole demo went blank | P1 | The stored step is used only when it is an integer index of a step; anything else is ignored | `demo-access` R1-04 |
| R1-05 | Demo · `index.html` | Block or fail `demo.js` (dropped connection on first load): an empty page with no word of what happened | P2 | A static line inside `#root` ("Loading the demonstration… if this stays, reload") that React replaces on start; CSP-clean (no inline script or style) | `demo-access` R1-05 |

## Refinements within the approved design

- R1-05 also gives a slow first load a visible state instead of a blank page.

## Logged for others

- (security slice) none yet.
- (uplift) none yet.
