# LEI security slice — least privilege in the enterprise API (founder: "make the roles and security and access permissions behind it all extremely solid"; task #371)

Read `/tmp/p2chk/BRIEF_LEI_COMMON.md` first: its standing rules apply, EXCEPT that this is an implementation slice. Work in your worktree
on a branch cut from the commit named in your prompt; commit there; the lead cherry-picks. Commit attribution:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01RMXk1jVqvE4J2bVn1EY9vx`.
Another agent is changing the shared shell and the demo's role visuals in parallel (packages/ui shell, apps/demo) — do not touch those.

## The gap (found at integration of D44)
The enterprise UI now shows exactly what the API allows (D44, `apps/enterprise-web/src/access.tsx`, derived from the route table). But in
`services/enterprise-api/src/modules/routes.ts` about 60 of 156 operations need no specific authority (any signed-in account), so a
requestor / employee is shown Pro, Commissioning & Assurance, APEX and more — while the demo's policy (`apps/demo/src/access/policy.ts`)
and V2.5.3's `AZ_AREA` (`legacy/source/v253/*offline.html`, read statically) give a requester far less. The server must be least privilege.

## What to do
1. Inventory every operation: method, path, current authority (keys / prose rule / none), and who should have it under the role model.
   Derive the intended model from the seeded roles' authorities (`services/enterprise-api/src/db/seed.ts`, `db/policy.ts`), the demo
   policy, and V2.5.3's AZ_AREA/AZ_ENTITY/AZ_RECORD. Write it as a reviewable table in `docs/security/LEAST_PRIVILEGE.md` (role × area,
   with the reason for each grant), and keep the founder-facing language plain.
2. Give every read and write a role-scoped authority (new read authorities such as `pro.read`, `apex.read`, `commissioning.read`,
   `search.read` … where needed), deny by default: an operation with no authority entry fails a test. Keep only genuinely universal reads
   open (e.g. `/v1/me`, health, the signed-in user's own requests) and list them with their reason. Record-level scope where the role model
   needs it (a requestor reads only their own requests; a technician their assigned work) — reuse existing record rules where they exist.
3. Seed the authorities into the roles (migration + seed, idempotent), so `/v1/me` reports them and the enterprise UI follows with no UI
   change beyond what falls out of D44's derivation. The secadmin and founder boundaries stay as they are.
4. Tests: `tests/security/authority-matrix.test.mjs` covers EVERY route (no "prose" exemptions without a listed rule and its own test);
   a new test asserts each role's reachable areas equal `docs/security/LEAST_PRIVILEGE.md`'s table (machine-readable copy, e.g. JSON);
   `enterprise-access` and `enterprise-web` browser suites green with the tightened model (update expectations with written reasons);
   integration, security, api-client and e2e suites green. No authority added only to make a test pass.

## Acceptance
ALWAYS `node scripts/build.mjs` from the repo root first. DB: reuse the one on 55432 by linking `.local/pg` to the main checkout's; never start
or stop a database you did not start (the test harness creates its own test databases — that is fine). Green: unit, integration, security,
e2e, `enterprise-web`, `enterprise-access` (light and dark: `PW_COLOR_SCHEME=dark node --import ./tests/browser/color-scheme.mjs <suite>`),
`website`, and `node scripts/verify/no-unexpected-skips.mjs --profile=platform` after `node scripts/test.mjs --browser` if time allows.
`flock /tmp/empathia-test.lock` around every browser run; never kill a process you did not start. Do not commit regenerated
`tests/evidence/*` or `media/screenshots/enterprise-web/*`. Report: the table (per role: areas before → after), operations tightened,
operations left open and why, test counts, what remains.
