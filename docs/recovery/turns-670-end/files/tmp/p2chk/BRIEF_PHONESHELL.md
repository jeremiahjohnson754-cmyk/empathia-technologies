# LEI P1 slice — the phone shell (backlog 11; audit UX-10)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice (you change the shared
shell, the demo and enterprise app where they use it, and tests). Work in your worktree on a branch cut from `phase3/legendary-experience`
at 3e6f525; commit there; the lead cherry-picks. Commit attribution: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
`Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`. Another agent is changing `apps/website` in parallel: do not touch it.

## The problem (measured at 3e6f525, demo `#/investor`, 360–390 px, light theme)
The header takes ~180 px before content: brand row; a row holding only the System/Light/Dark switch (`packages/ui/src/theme.tsx`, 106 px
wide) and the View-as button; the Search Party bar; a horizontally scrolling product rail where only 4 of 9 products are visible; then the
"Demonstration · synthetic data" note (3–4 lines). Backlog acceptance: a menu that shows every product, the identity (View as) reachable,
the header under 120 px before content, every product reachable in two taps, 390 px audit pass.

## What to build (shared shell `packages/ui/src/shell.tsx` + `ui.css`; demo `apps/demo/src/App.tsx` only where it passes slots)
- Up to ~820 px: one compact top bar (brand mark, the Search Party bar or a search button that expands it, View as avatar, a menu button).
  The menu (a sheet or drawer; dialog semantics, focus trap, Escape, focus returns) lists every product with its product colour mark (`--p-*`)
  and its one-line purpose, the current one marked in words; it also holds the theme choice (System/Light/Dark) on phones. Consider
  the V2.5.3 phone bottom navigation (`legacy/source/v253/*live.html`, read statically — never execute it) as an alternative or complement;
  pick what gives two-tap reach to every product with the least chrome, and say why.
- The demonstration note stays visible and honest but shorter on phones (one line with a way to read the rest), never removed.
- Desktop (> 820 px) unchanged unless something is clearly better; the enterprise app (`apps/enterprise-web` or wherever it uses AppShell)
  gets the same phone behaviour.
- Keep `.persp select` (the native quick switch many suites drive, visually hidden until focused), the `search` slot, `#route-announcer`,
  route focus (`apps/demo/src/routeFocus.ts`), and every testid the suites use. Reduced motion respected. Both themes.

## Tests and acceptance
ALWAYS run `node scripts/build.mjs` from the repo root first. Add a browser suite (e.g. `tests/browser/demo-phoneshell.test.mjs`, a free port
such as 4431; register it in `scripts/test.mjs` beside the other Phase 2/LEI browser suites) proving at 360/390/768: header height before
content < 120 px, every product reachable in ≤ 2 taps, the menu's dialog semantics and focus return, View as reachable, theme switch
reachable, no sideways scroll; and at 1440 that the desktop shell is unchanged. Re-run in light AND dark
(`PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs <suite>`): `demo`, `demo-ux`, `demo-hardening`, `demo-decisions`,
`demo-searchbar`, `demo-viewas`, `demo-tours`, `demo-servicehands`, `demo-dispatch`, `demo-search-scenarios`, `demo-campus`, `demo-rooms`,
`demo-destructive`, `learn-labs`, `enterprise-web` (DB: `node scripts/db.mjs up`; port 55432 may already be up — reuse it, never stop a DB
you did not start), and `node scripts/audit/site-audit.mjs --strict` (P0 0 · P1 0) with `--color-scheme=dark` too. Any changed test carries
its reason. `flock /tmp/empathia-test.lock` around every browser run; never kill a process you did not start. Screenshots before/after at 360,
390 and 1440 (menu closed and open) in both themes into `/tmp/lei-phoneshell/`. Report: what you built and why, measured header heights,
test counts, screenshots, what remains.
