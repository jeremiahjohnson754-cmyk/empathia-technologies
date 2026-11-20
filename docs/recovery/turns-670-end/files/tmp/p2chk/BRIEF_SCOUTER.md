# LEI slice — Scouter highly discoverable within Lite (founder's D41 refinement, 2026-11-03 05:57 CT)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice. Work in your worktree
on a branch cut from the `phase3/legendary-experience` tip named in your prompt; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.

## The decision
D41 (approved): Scouter is part of Lite, not a separate product. The founder's refinement: "keep Scouter highly discoverable within Lite".
Also in force: "ensure our visual identity remains distinctive and consistent across all three applications"; "maintain the approved
image-performance budgets"; exceptional usability, accessibility, performance and engineering credibility. Equipment rule (30-room
decisions): keep the nine-model catalogue and the spec-to-verify classes; "Never invent specific equipment identities".

## What Scouter is (read statically, never execute legacy HTML)
V2.5.3 (`legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html`): device evaluation ("Ask Scouter whether a device suits <room>
before anyone buys it"), nine Scouter states, comparison against the requirement (not against each other), market watch, architectural
competition, a designer authority `scouter.propose`. Ledger: `docs/phase3/ROUTE_PARITY_LEDGER.csv` rows LP-031, LP-072, LP-091, LP-119,
LP-179 (RECOVERY NEEDED); recovery matrix `docs/phase2/CAPABILITY_RECOVERY_MATRIX.csv` CR-16. Today `#/scouter` and `#/v25/scouter` show the
"Not migrated yet" boundary; the website mentions Scouter only inside Lite's page (`apps/website/src/content.tsx`).

## What to build
1. **Discoverable everywhere Lite is:** Lite's purpose line in the canonical list (`packages/ui/src/products.ts`) names Scouter; the
   website's Lite page has a Scouter section with its own anchor (`/products/lite#scouter`) and the products page and site search (if any)
   reach it; the demo's Lite surfaces (campus/room pages) show a clear "Scouter" entry; the Search Party bar returns Scouter for "scouter",
   "evaluate a device", "does this device suit" (via the index, not a hard-coded special case if the index can carry it honestly);
   `#/scouter`, `#/v25/scouter`, `#/scouter/anatomy` land on the native Scouter page instead of the boundary (aliases.ts pattern).
2. **A native Scouter page inside Lite** (e.g. `#/campus/scouter`, its breadcrumb under Lite): what Scouter does, in plain words, and a
   minimal working evaluation ONLY if this build's own data supports it honestly — pick a room, see each relevant model from the existing
   nine-model catalogue checked against that room's recorded requirements (coverage, PoE budget, seats, … whatever the campus model really
   holds), each check stating its source and whether it is modelled or published, and the verdict in Scouter's own vocabulary (map to the
   V2.5.3 states only where the data allows). No invented models, prices, lead times or market data; anything V2.5.3 had that this build
   cannot back (market watch, competition, budgets) is listed as "not rebuilt yet" with the parity row id. The designer's `scouter.propose`
   authority gates proposing; a perspective grants nothing (D1). If the data does not support an evaluation, build the honest page without it
   and say why in your report.
3. **Identity:** Lite's product colour and the shared components; both themes; phone shell; no new images beyond the budget.
4. Update the parity ledger rows you move (with evidence) and the backlog item.

## Tests and acceptance
ALWAYS `node scripts/build.mjs` from the repo root first. Unit tests for any evaluation logic (deterministic, against the campus data). A
browser suite (e.g. `tests/browser/demo-scouter.test.mjs`, free port; register it in `scripts/test.mjs`) at 390 and 1440: discoverable from
Lite, the bar, the legacy addresses and the website anchor; the evaluation's checks cite their source; refusals for a perspective without
`scouter.propose` offer the switch (D1); no overflow; reduced motion. Re-run in light AND dark (`PW_COLOR_SCHEME=dark node --import
./tests/browser/color-scheme.mjs <suite>`): your suite, `demo`, `demo-ux`, `demo-searchbar`, `demo-search-scenarios`, `demo-campus`,
`demo-hardening`, `demo-phoneshell`, `website`, `enterprise-web` (reuse the DB on 55432 by linking `.local/pg` to the main checkout's; never
start or stop a database you did not start), and the strict audit (light and `--color-scheme=dark`) P0 0 · P1 0. Any changed test carries
its reason. `flock /tmp/empathia-test.lock` around every browser run; never kill a process you did not start. Do not commit regenerated
`tests/evidence/*` or `media/screenshots/enterprise-web/*`. Screenshots (390/1440, both themes) into `/tmp/lei-scouter/`. Report: what
Scouter does in this build (exactly), what was not rebuilt and why, test counts, screenshots, what remains.
