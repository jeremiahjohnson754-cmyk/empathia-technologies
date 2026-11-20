# LEI slice — role transitions, motion and per-role colour from V2.5.3 (founder, 2026-11-03 09:39 CT; task #369)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice. Work in your worktree
on a branch cut from the commit named in your prompt; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.
Another agent is changing `services/enterprise-api` and the enterprise authority model in parallel — do not touch those.

## The request (verbatim)
"bring the same role transitions and motion graphics and color changes and roles UI UX stuff from this html use it as inspiration and
creative direction". Source: `legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html` (read statically, never execute it):
`applySkin()` (per-role `data-skin`/`data-tone` and a theme-color meta), `ROLE_UI` (skin, tone, sub label, "look"), `SKIN_SWATCH`,
`roleVeil()` (a full-screen veil naming the role — label, sub, home — ~950 ms, `.veil`/`.veil-b` keyframes, skipped under reduced motion and
during tours), `tabsFor(role)` (each role's own bottom tabs: visitor Welcome·Way·Places; employee Today·Explore·Rooms·Places; exec
Briefing·Portfolio·Campus·Budget; service Work·Issues·Room·Fixes; syseng Board·Requests·Design·Commission; steward Ledger·Records·
Quality·Core …), and the html[data-skin=…] palettes. Today's demo already has role colours and skins in View as
(`apps/demo/src/viewas/roles.ts`, `--role-*` in `demo.css`) and D44's policy (`apps/demo/src/access/policy.ts`).

## Constraints (founder decisions in force)
D9: the person's System/Light/Dark choice always wins — a role never flips the theme. D8: teal stays the interaction accent; colour must
stay vibrant and meaningful, "elegant and simple, never bland". D39 + 05:57 guidance: one primary mark (the shield); identity consistent
across the three apps. D44: a role never sees what it cannot open — role tabs and home must be derived from the policy, never a parallel
list. Accessibility: WCAG 2.2 AA, reduced motion fully respected (no veil, no movement), focus management after a switch (the existing
route-focus and announcement), no flashing, the veil never blocks input longer than its animation and never traps focus. Performance:
no new images; CSS/JS small; no layout shift.

## What to build (demo; the enterprise app gets the shared-shell parts)
1. **The role veil** on every perspective switch (View as, the shelf, the owl page's "View as"): the role's initials avatar, name, domain
   and where it lands, in the role colour, ~0.9 s, then the page; reduced motion → none (the announcement still says it). Skipped during
   guided tours.
2. **Per-role colour in the shell**: the role colour (validated `--role-*`, both themes) carried by the View-as avatar, a thin role bar /
   underline in the header, the current-product marker's halo, and the investor start's greeting — not the page background, not the theme.
3. **Role home and tabs**: each role's own "home" destinations in the phone shell (a bottom tab bar or the top of the menu — choose, and say
   why) after `tabsFor`, derived from the D44 policy so a tab never points at a denied screen; the desktop rail keeps the canonical product
   order (D40) with only granted products.
4. **Fix found at integration:** the owl page's "Roles whose work it is" must name roles that can open that exact address including its
   view/query (e.g. ServiceHands' queue view → service manager, technicians), not roles that only reach the product page.
5. Motion polish à la V2.5.3 (rise/fade on panels, sheet entrances) only where it shows what changed, all under reduced-motion control.

## Tests and acceptance
ALWAYS `node scripts/build.mjs` from the repo root first. A browser suite (e.g. `tests/browser/demo-rolemotion.test.mjs`, free port; register
it in `scripts/test.mjs`): the veil appears on a switch with the role's name and colour and is gone after ~1 s; reduced motion → no veil, no
animation; the theme never changes on a switch; role tabs ⊆ policy grants for every role; the owl page's suggested roles can each open the
exact address; no layout shift; focus lands per route-focus. Re-run in light AND dark (`PW_COLOR_SCHEME=dark node --import
./tests/browser/color-scheme.mjs <suite>`): your suite and every `demo*` browser suite in `scripts/test.mjs`, `learn-labs`, `enterprise-web`
(reuse the DB on 55432 by linking `.local/pg`; never start or stop a database you did not start), and the strict audit (light and
`--color-scheme=dark`) P0 0 · P1 0. Any changed test carries its reason. `flock /tmp/empathia-test.lock` around every browser run; never kill
a process you did not start. Do not commit regenerated `tests/evidence/*` or `media/screenshots/enterprise-web/*`. Screenshots and a short
screen recording if you can (Playwright video) of a switch into `/tmp/lei-rolemotion/` at 390/1440 in both themes. Report: what you built
and why, test counts, screenshots, what remains.
