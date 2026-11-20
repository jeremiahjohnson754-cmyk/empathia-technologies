# LEI P1 slice — one product vocabulary and order on all three surfaces, fresh website screenshots, a consistent not-found (backlog 10, plus follow-ups from the website and phone-shell slices)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice. Work in your worktree
on a branch cut from `phase3/legendary-experience` at c7f20c8; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.
Do not touch `media/brand/` (the emblem is a separate, undecided piece of work: D39).

## 1. Backlog 10 — one product vocabulary (founder priority: "consistent product terminology")
Today the products appear in different orders and sometimes under different names on the website (`apps/website`), the investor demo's
rail and phone menu (`apps/demo/src/App.tsx`, `packages/ui/src/shell.tsx`) and the enterprise app's rail and phone menu
(`apps/enterprise-web`). Example found at integration: the demo menu runs Investor start, Mission Control, Lite, Pro, Search Party,
ServiceHands, Commissioning & Assurance, APEX, Field Intelligence, Learn; the enterprise menu runs Mission Control, Pro, APEX,
ServiceHands, Lite, Search Party, …. Read `docs/phase3/UX_ARCHITECTURE_AUDIT.md`, `docs/phase3/NAVIGATION_AND_WORKFLOWS.md` and
`docs/phase3/LEI_DECISIONS.md` (D3 and the product colour order D37) for the agreed vocabulary and meanings.
- One canonical product list (name, short purpose, product colour `--p-*`, order) in ONE shared module (e.g. in `packages/ui` or
  `@empathia/domain-data`) that all three surfaces read; the order follows the lifecycle where it can (Request → Design → Commission →
  Operate → Support → Learn → Improve) and matches the product-colour order (D37) — if they conflict, report and keep D37's order.
- Same names everywhere (Lite, Pro, Search Party, ServiceHands, Commissioning & Assurance, APEX, Field Intelligence, Learn, Mission
  Control); the demo's "Investor start" stays demo-only; the enterprise app's role-gated products keep their lock and reason.
- A test that fails if any surface drifts from the canonical list (names and order), e.g. a unit test plus a browser check per surface.

## 2. Fresh website interface screenshots
The website's product screenshots still show the demo's old dark-only colours. Re-capture them from the current demo with
`scripts/evidence/website-captures.mjs` (read it; run it as its header says), in the theme(s) the website uses, keeping every website
budget (page weight, image sizes) green. Synthetic data only; the "Synthetic demonstration data" labels stay.

## 3. The demo's not-found page
Make `NotFound` in `apps/demo/src/App.tsx` consistent with the website's and the enterprise app's not-found pages (a primary "Back to the
investor start" button, the main destinations, the address asked for, both themes). Keep testid `not-found` and the existing assertions.

## Tests and acceptance
ALWAYS `node scripts/build.mjs` from the repo root first. Green in light AND dark (`PW_COLOR_SCHEME=dark node --import
./tests/browser/color-scheme.mjs <suite>`): `website`, `enterprise-web` (DB: `node scripts/db.mjs up`; port 55432 may already be up —
reuse it, never stop a DB you did not start), `demo`, `demo-ux`, `demo-hardening`, `demo-phoneshell`, `demo-viewas`, `demo-searchbar`,
and the strict audit (`node scripts/audit/site-audit.mjs --strict`, and `--color-scheme=dark`) P0 0 · P1 0. Any changed test carries its
reason. `flock /tmp/empathia-test.lock` around every browser run (another full regression may hold it for a while — wait, don't kill);
never kill a process you did not start. Screenshots of the three menus/rails side by side and the website's refreshed product images
into `/tmp/lei-vocab/`. Report: the canonical list, what changed on each surface, test counts, screenshots, what remains.
