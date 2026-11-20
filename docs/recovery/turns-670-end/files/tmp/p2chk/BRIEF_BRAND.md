# LEI slice — the cleared Empathia emblem on all three surfaces (decision D39, decided 2026-11-03 04:39 CT)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice. Work in your worktree
on a branch cut from the `phase3/legendary-experience` tip named in your prompt; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.

## The decision (`docs/phase3/LEI_DECISIONS.md` D39; assets `packages/design-tokens/brand/`, roles and helpers in `packages/design-tokens/brand.mjs`)
The founder cleared the name and the marks. Roles: the flagship aspis (drafting compass on the Spartan shield) as the brand emblem on the
website and in lockups; the small shield (`emblem-small.svg`) for browser-tab icons and the shell header marks; the tile (`app-tile.svg`)
for app icons; the Agora Owl (`owl.svg`) on not-found and empty states; the original V2.5.3 mark kept unchanged (`original-mark.svg`) as
the single-colour glyph; war paint is marketing only and never appears in a product. Never edit the SVGs by hand (regenerate from
`media/brand/concepts/draw.py`). Wordmark: "Empathia" in Inter 800 in headers; "EMPATHIA" capitals with "THE LIVING SYSTEM" tracked
0.3 em only in lockups (website hero or footer lockup), as on the film end cards.

## What to do
1. Every build copies the brand files it serves with `copyBrand(distDir)` and puts `iconLinks()` in every page head (website pages and
   `404.html`, the demo's `index.html`, the enterprise app's `index.html`). Add a web app manifest (`site.webmanifest` / `manifest.json`)
   with the 192/512 tile icons and the theme colour where the surface is installable. Keep the CSP and declared-headers suites green
   (images are `'self'`).
2. The shared shell (`packages/ui/src/shell.tsx`, `.shell__mark` in `ui.css`, today a CSS square): the small shield as an `<img>` (alt ""
   beside the visible name, decorative) at the bar's height, both themes (the mark has its own dark bowl; check contrast of its edge on
   the light bar), phone shell included. The website header gets the same mark beside "Empathia".
3. The website: the flagship emblem in a place of honour without crowding the hero (e.g. a footer lockup with "THE LIVING SYSTEM", and/or
   the about/founder page); keep CLS 0 (explicit width/height on every image), page-weight budgets (the SVGs are 1–8 KB; never load
   `emblem-1024.png` on a page — it is for social cards: add it as `og:image` with absolute-path handling that the static host supports,
   or leave og:image out and report).
4. Not-found pages on all three surfaces get the owl (decorative, alt "") beside their existing copy; keep every testid and assertion.
5. Tests: assert the favicon links resolve (200, correct type) on each surface, the shell mark renders at its size in both themes and at
   390/1440, the owl is on each not-found page, no page loads `emblem-1024.png`, and the budgets/CSP/CLS checks stay green.

## Acceptance
ALWAYS `node scripts/build.mjs` from the repo root first. Green in light AND dark (`PW_COLOR_SCHEME=dark node --import
./tests/browser/color-scheme.mjs <suite>`): `website`, `enterprise-web` (DB: `node scripts/db.mjs up`; port 55432 may already be up —
reuse it, never stop a DB you did not start), `demo`, `demo-ux`, `demo-hardening`, `demo-phoneshell`, `demo-viewas`, and the deploy suites
(public sites audit light and dark, static sites under declared headers), strict audit P0 0 · P1 0. Any changed test carries its reason.
`flock /tmp/empathia-test.lock` around every browser run; never kill a process you did not start. Screenshots of the website header,
footer lockup and 404, the demo shell (390/1440, both themes) and the enterprise app header into `/tmp/lei-brand/`. Report: what changed,
byte deltas, test counts, screenshots, what remains.
