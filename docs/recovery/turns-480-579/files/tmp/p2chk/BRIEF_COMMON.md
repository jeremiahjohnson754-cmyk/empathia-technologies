# Common brief for Phase 2 Slice 2 workstreams (read fully before starting)

Repo: Empathia Technologies monorepo (your worktree is a copy of branch `phase2/living-universe` at bbb4bf3). Node 22, TypeScript (`tsc -b`), esbuild, React 19. Demo app = `apps/demo` (hash routes, ES-module code-split build, lazy chunks). Build everything: `node scripts/build.mjs`. Demo server: `node apps/demo/server/serve.mjs --port=<free port>` (serves apps/demo/dist under the production CSP: `style-src 'self'`, `script-src 'self'` — no inline <style>/<script>; React `style={}` props are fine because they go through CSSOM).

Read first:
- `docs/phase2/REFERENCE_ROOM.md`, `docs/phase2/CANONICAL_CAMPUS.md`, `docs/phase2/ARCHITECTURE_DECISIONS.md`
- `packages/campus/src/*` (canonical seeded dataset, seed 20261020, golden sha256 pinned in its unit test; `projections.ts`, `reference.ts`, `generate.ts`), `packages/spatial/src/*` (SVG 3D engine), `apps/demo/src/campus/room.tsx` (the reference room R-ATL-4-218 page: 3D/plan views, layers, device panel, connections), `apps/demo/src/story/assemble.ts` (Room Story), `apps/demo/src/search/*` (Search Party), `apps/demo/src/pages/FieldIntelligence.tsx`
- The owner's spec: `/mnt/user-data/attachments/73b60a1b-854c-5a1e-99ae-d3ec61696e66/14147a45-attachment.txt`, Parts IV–VI (lines ~311–530) and the testing section (~line 1030). Treat it as the requirements for your part.

Owner's standing rules (non-negotiable):
- All data synthetic and labelled so. Never present simulated/modeled data as operational, measured, monitored or live. Label every value DECLARED / DERIVED / MODELED / OBSERVED / SIMULATED as the existing code does. "spec to verify" where a manufacturer spec was not read.
- Real manufacturer/model names only where already in `packages/campus/src/catalogue.ts` (with spec URLs). No implied partnerships, certifications, live telemetry or hardware validation.
- No names AON / Kraft Heinz / Stefanini / KHC anywhere.
- One canonical data fabric: derive from `@empathia/campus` (and the commissioning/assurance engines). Never create a second, disagreeing set of entities. If you must ADD canonical data (events, people, competencies), add it inside `packages/campus` additively, update its golden sha in the unit test, and say so clearly in your report.
- Backend rules (commissioning, approvals, evidence validity, asset history, permissions, tenancy, baselines) are OUT OF SCOPE to change. Use the engines (`packages/commissioning-engine`, `packages/assurance-engine`) as-is; if they can't do something, report it — don't change them.
- Never invent test results. If you couldn't run something, say NOT RUN. Don't weaken or delete existing tests. Never report "100%" or "production-ready".
- Teams/Outlook stay NOT_CONNECTED / drafts.
- Accessibility: WCAG 2.2 AA; keyboard operable; visible focus; reduced motion respected (no tweens/autoplay animation under `prefers-reduced-motion`); everything draggable has a button; the 2D/list view is first-class. Must work at 360/768/1440 px with no horizontal page scroll.
- Never use `pkill -f` / `pgrep -f`. Kill only the server PIDs you started.
- Browser/e2e runs must hold the shared lock: `flock /tmp/empathia-test.lock <cmd>`.
- Disk is tight (~3.5 GB free): don't create large files; delete your own scratch output.
- Commit to your worktree branch with messages ending in exactly:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx
- Do not merge, push, deploy, or touch the live sites / Tally / any external service.

Visual bar: the owner wants this to feel like a genuine, beautiful place — not a dashboard of cards. Match the existing campus/room visual language (dark ground, `apps/demo/src/styles/campus.css` tokens, teal for the reference room, the existing glyph/legend conventions). Spend boldness in one place per screen. Take screenshots with Playwright at 360, 768 and 1440 and LOOK at them (Read the PNG); fix label collisions, overflow, faded/mid-transition states before you report.

Required in your report back (concise): commits (hash + subject), files touched, routes added, what's real vs simulated/modeled, test suites run with exact pass/fail counts (and NOT RUN items), screenshot paths (keep a few in /tmp/slice2-<yourname>/), bundle impact (first-load vs lazy chunk), open issues/decisions for the owner. Also run the existing suites your change could affect and report counts: `node apps/demo/test/*.test.mjs` style unit tests (see scripts/test.mjs for how they're invoked), `tests/browser/demo-campus.test.mjs` (48), `tests/browser/demo.test.mjs` (163), `tests/browser/demo-ux.test.mjs` (24), and `packages/campus` unit tests.
