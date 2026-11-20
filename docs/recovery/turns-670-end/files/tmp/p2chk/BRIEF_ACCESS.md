# LEI slice — role-based access: a role never sees what it cannot use (founder, 2026-11-03 09:39 CT; task #368)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice. Work in your worktree
on a branch cut from the `phase3/legendary-experience` tip named in your prompt; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.

## The founder's request (verbatim, 2026-11-03 09:39 CT)
"Remember how the roles are separated what each roles has access to and didn't have access to … let's make the roles and security and
access permissions behind it all extremely solid use this html to see how this file handles be creative and strategic make it so if this
role doesn't have proper access don't even give them the tab or the button or even the screen to see it be very structured about it …
that owl page is perfect for those pages." This SUPERSEDES the screen-level part of D1 (refusals that offer "Switch to …"): on screens, an
action or surface the role lacks is not rendered at all. Role switching stays transparent and convenient through View as in the
demonstration (D1's other half). Record it in `docs/phase3/LEI_DECISIONS.md` as D44 with the quote. Role motion/skins are a LATER slice
(#369) — do not build them here; keep the shell structured so they can be added.

## How V2.5.3 does it (read statically — `legacy/source/v253/Empathia-Living-Campus-V2.5.3-offline.html`; never execute it)
`AZ_AREA` (area → roles, label), `azArea(route)` (route → area), `canViewRoute`, `AZ_ENTITY`/`AZ_RECORD`/`canViewEntity`/`canViewField`
(record and field visibility), `canPerform(role, action)` (actions), `AZ_NOT_SURFACE`, `azSurfaces(role)`, and `tabsFor(role)` (each role's
own bottom tabs: visitor Welcome·Way·Places, exec Briefing·Portfolio·Campus·Budget, service Work·Issues·Room·Fixes, …). Learn the structure;
use THIS build's personas and authorities (`@empathia/domain-data` V25_PERSONAS via `apps/demo/src/build/store.ts` `holds()`), never
V2.5.3's numbers.

## What to build
1. **One policy, deny by default (demo).** A single module (e.g. `apps/demo/src/access/policy.ts`) declares every surface (route/page and
   in-page section/tab) and every action (button) with the authority keys or rule that grant it — consolidating what is scattered today
   (`pages/Control.tsx` PAGE_A table, Build a Room's `room.design`, Exec's list, APEX's authorities, ServiceHands' governed steps, Scouter's
   `scouter.propose`, `viewas/scope.ts`'s 25 pages + 52 actions). An item missing from the policy is hidden (deny by default), and a test
   fails if a route or action exists in the code without a policy entry.
2. **Render from the policy.** The rail, the phone menu, product cards on the investor start and not-found pages, in-page tabs, and every
   action button render only if the current perspective is granted. No disabled-but-visible buttons for missing authority (a disabled
   state remains only for transient reasons such as "already submitted"). Search Party results and the bar: hits the role may not open are
   not listed (records/fields per the existing 4b visibility rules); counts reflect only what is visible. View as's counts must still equal
   what the role actually sees.
3. **Route guard before the screen exists.** A forbidden address renders the owl access page INSTEAD of the screen; the lazy chunk for the
   forbidden screen is not even requested (assert in tests). Owl page wording for the demo: the page is not part of this role's work, what
   the role CAN open (its own destinations), and — because perspective switching is a demonstration convenience (D1) — "View as <a role that
   has it>" via the View-as flow, announced with the way back. The owl stays a supporting illustration (96–120 px, beside the copy), the
   shield stays the identity (D39 guidance).
4. **Enterprise app (real authorization).** The UI reads the signed-in account's authorities from the API (find the existing endpoint;
   add a minimal `GET /v1/me`-style one only if none exists, with its route-table authority and tests) and renders rail items, pages,
   in-page tabs and action buttons from a policy derived from the API's route table (`services/enterprise-api/src/modules/routes.ts`,
   `router.ts` `enforcedAuthorities`) — one source, not a parallel hand-written list. A forbidden address shows the owl page with wording
   that does not confirm the page exists for other roles ("This address isn't available to your account"), and the server still refuses
   (403) — the UI hiding is never the only defence. Administration stays for secadmin only.
5. **Proof.** (a) Unit: policy completeness (every route/action has an entry), deny-by-default, determinism. (b) Demo browser suite (e.g.
   `tests/browser/demo-access.test.mjs`, free port; register in `scripts/test.mjs`): for EVERY perspective × EVERY policy surface and
   action: visible in the UI ⇔ granted; forbidden address → owl page, chunk not requested; no forbidden button in the DOM (not merely
   hidden by CSS); View as counts = visible counts. (c) Enterprise: for every seeded role, the rail/pages/buttons shown ⇔ the API's
   authority matrix allows them (reuse `tests/security/authority-matrix.test.mjs`'s route × role data), and the server 403s the hidden
   ones. Update existing tests that relied on refusals-with-switch, each with its written reason (D44).

## Acceptance
ALWAYS `node scripts/build.mjs` from the repo root first. Green in light AND dark (`PW_COLOR_SCHEME=dark node --import
./tests/browser/color-scheme.mjs <suite>`): your new suites, every `demo*` browser suite in `scripts/test.mjs`, `learn-labs`, `website`,
`enterprise-web` and the security suites (reuse the DB on 55432 by linking `.local/pg` to the main checkout's; never start or stop a
database you did not start), the strict audit (light and `--color-scheme=dark`) P0 0 · P1 0. `flock /tmp/empathia-test.lock` around every
browser run; never kill a process you did not start. Do not commit regenerated `tests/evidence/*` or `media/screenshots/enterprise-web/*`.
Screenshots into `/tmp/lei-access/`: the shell and the investor start for visitor, employee, designer, service, exec and architect
(390/1440, both themes), the owl access page in the demo and the enterprise app. Report: the policy (counts of surfaces and actions,
per-role visible counts), what changed per surface, what was hidden that used to show, test counts, screenshots, what remains.
