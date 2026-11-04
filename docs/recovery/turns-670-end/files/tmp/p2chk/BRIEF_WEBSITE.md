# LEI P1 slice — the website on the shared tokens, its own light theme, and designed not-found states (backlog 8 and 3; plan M6)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice (you change the website,
its tests and, for item 3, the demo's and enterprise app's not-found states). Work in your worktree on a branch cut from
`phase3/legendary-experience` at 3e6f525; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.

## Where things stand (3e6f525)
Tokens v2 (Graphite dark / Paper light, teal as the only interaction accent, nine product colours `--p-*`, class colours `--c-*`, a separate
serious tone, tighter radii) and self-hosted Inter are in `packages/design-tokens` (build: `node scripts/build.mjs`). `packages/ui` has the
shell's System/Light/Dark switch (`packages/ui/src/theme.tsx`, key `empathia.theme`, applied before first paint). The demo and enterprise app
use them. The website (`apps/website`, static pages built by `apps/website/build.mjs`) already uses Inter Display 800 for headings but is
still dark-only on its OWN colour variables, with pill buttons, a header blur and a hero glow. Read `docs/phase3/DESIGN_SYSTEM_PLAN.md` (M6)
and `docs/phase3/UX_ARCHITECTURE_AUDIT.md` (UX-04/05/06).

## Founder decisions in force (`docs/phase3/LEI_DECISIONS.md`)
D7 Inter everywhere, "Netflix, Disney+ and Spotify style" (confident heavy display type, tight tracking, image-led); D8 teal is the
interaction accent only — "elegant and simple, never bland": keep a vibrant, sophisticated, colourful identity through the product colours,
meaningful visuals and accessible statuses; D9 follow the system theme by default AND let the visitor choose light or dark by hand,
remembered per browser (try/catch); D10 tighter radii. The concept images are visual direction only: no invented metrics, integrations,
certifications, testimonials or customers. Founder credentials are only CTS (AVIXA), CAPM (PMI) and CompTIA Network+.

## What to do
1. Item 8 / M6: the website's colours come from the shared tokens (map or replace its own variables), in both themes, designed not inverted:
   light is its own composition (no washed-out dark page). Tighter radii instead of pills where the plan says; no header blur; no hero glow
   (replace with something with more character that works in both themes — e.g. the product colours used meaningfully). A theme control
   (System / Light / Dark) in the website header, same key and behaviour as the shell's; it must work under the website's CSP (check
   `apps/website/server` and the declared headers: no inline script unless hashed/allowed — prefer a small external script, applied before
   first paint to avoid a flash). Product pages may use their product's colour (`--p-*`) as identity, words never relying on colour alone.
2. Item 3: a designed not-found state on all three surfaces: the website's `404.html` (served for unknown paths by its server and declared for
   the static host — check how the deploy headers/static config work), the demo's unknown route (it has one: `NotFound` in
   `apps/demo/src/App.tsx` — check it is designed and consistent; change only if needed), and the enterprise app's empty/unknown route.
   Each says the address isn't part of the site, offers the way back and the main destinations, and is in both themes. The site audit
   (`scripts/audit/site-audit.mjs`) should check the website's 404 (status 404, has an h1, has a link home).
3. Keep every website budget and check green: no third-party requests, the CSP/declared-headers suite, CLS 0 (fonts preloaded as now),
   page weight budgets, the lead form over the API.

## Tests and acceptance
ALWAYS run `node scripts/build.mjs` from the repo root before browser suites (the website build reads the tokens' built `dist/fonts.css`).
Green in both colour schemes (`PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs <suite>` for dark):
`website` (205+), `demo` (if you touch the demo), `enterprise-web` (needs `node scripts/db.mjs up`; port 55432 may already be up — reuse it,
never stop a DB you did not start), the deploy suites in `scripts/test.mjs` (public sites audit light and dark, static sites under declared
headers), and `node scripts/audit/site-audit.mjs --strict` P0 0 · P1 0 in both schemes. Any changed test carries its reason in the file.
`flock /tmp/empathia-test.lock` around every browser run; pick free ports; never kill a process you did not start. Screenshots before/after
of the website home, a product page, the 404 and the request-demo page at 390 and 1440 in both themes into `/tmp/lei-website/`.
Report: what changed, byte deltas (CSS, JS, fonts), test counts, screenshots, what remains.
