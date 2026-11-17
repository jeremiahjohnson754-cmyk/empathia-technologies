# State and outstanding work (17 Nov 2026)

This replaces `OUTSTANDING_2026-11-16.md` as the current list. Everything named here is committed on `v18/continuation`.

## What the public sites serve

- **Staging** (`empathia-demo-next`, `empathia-website-next`, branch `phase3/legendary-experience`): **`99cb84b`**, staged on 17 Nov
  after its full regression passed on that commit (below). Render reports both deploys `live` on `99cb84b` (finished 10:56 UTC).
  Before that: `bfdda7b`, staged on 14 Nov.
- **Production** (`main`): unchanged. It waits for the founder's word.
- **New on staging with `99cb84b`:** the six-stage thread page (`#/thread`), the SIGNAL title page, Engineer start (`#/engineer`),
  the phone-width fixes, and the fixes in the table below. The server work and the connected page are in the commit, but a public
  build names no server: `#/connected` does not exist on staging.

## The regression of `99cb84b`

- Build ok. Unit, integration and security tests: 124 passed, 0 failed.
- Browser, light: 106 suites; 105 passed in the regression worktree. Browser, dark: the same 106; 105 passed.
- The one exception in each is `founder-studio`, which fails in the worktree because that copy lacks the engineer-private local
  assets. Run in the main tree on `99cb84b`: 19 passed, 0 failed in light and in dark.
- `demo-connected` (the connected page against a real API and database) is among them: 11 passed, 0 failed in light and in dark.

## Regression history since `bfdda7b`

| Commit | Result |
|---|---|
| `1cde8b5` | Failed `demo-field-ux`: a 23 px link on the deficiency workbench. Fixed in `d77e55e`. Not staged |
| `d77e55e` | Failed a unit test: the API client's operation count was left at 168 when the thread route was added. Fixed in `52fce09`. Not staged |
| `52fce09` | Failed `demo-deadends`: on Engineer start, a persona who may not inject a fault was offered five switches that only repeated a refusal. Fixed in `4914a32`. Not staged |
| `4914a32` | Failed `demo-offline` OF-08 (43 passed, 1 failed; 78 other light suites passed): the SIGNAL title page asked for its 1.8 MB sprite sheet on every visit, so opening the story library offline logged a failed request. Fixed in the next commit. Not staged |
| `99cb84b` | Passed (above). Staged |

`99cb84b` contains everything below.

## Built on 17 Nov

1. **Demonstration sandboxes and sessions on the server** (ADR-0013, `0033`, `0035`): a synthetic tenant per visitor, a key shown once,
   sessions per role, reset without deleting, caps and storage ceilings, a demonstration-only deployment mode.
   `tests/security/demo-sandbox.test.mjs` DS-01…16.
2. **Phase 1 field records in the database** (`0034`): mounting versions, hookups against the design, field moves decided by someone
   other than their recorder, notes; in the room's thread with their audit history. `tests/security/field-record.test.mjs` FRS-01…09.
3. **The demo connected to the server** (`#/connected`, only in a build given `DEMO_API_URL`): nineteen steps from the field record to
   an APEX case, each as its own person; a step tried as someone else shows the server's refusal; the thread and the audit history
   are read from the server; a resume code opens the same sandbox in another browser. `tests/browser/demo-connected.test.mjs`
   CN-01…10, light and dark. See `CONNECTED_DEMO.md`.
4. **Refusals on the record they were aimed at**: a request refused by the central authority check is now a row of that room's,
   issue's or work order's audit history.
5. **Engineer start**: no switches for a persona who cannot use them.

## The demonstration API on staging

Founder, 17 Nov: "establish a repeatable staging deployment with the required API and database". Created on Render's free plans (no
charge): a PostgreSQL 16 database and the API in demonstration mode, from `deploy/render/demo.render.yaml` on the branch
`staging/demo-api`. Live on `14d1f45`. The deployment check (permissions, unauthorized access, isolation, persistence, reset) passed
12 of 12 inside the deployed service against its real database. Deploying found three faults that no local run had shown; all three
are fixed and now rehearsed. What was read from the platform, what was not verified and why: `docs/operations/RENDER_DEMO_STAGING.md`.

**The staging demo site is not connected to it yet.** Setting `DEMO_API_URL` on `empathia-demo-next` would put `#/connected` on
staging. It has not been set because the connected build has been through one suite, not the full matrix.

## Two things that are not to be confused (founder, 17 Nov 09:39)

- The API's security tests are this project's own tests. **No independent security audit has been made.**
- The hosted API serves one page of the demo, `#/connected`. **The rest of the demo site is not connected**: Lite, Engineering,
  Commissioning, ServiceHands, Assurance and APEX still keep their records in the browser. Moving them is task 167, one page at a time.

Secrets, session and sandbox expiry, and what is kept after a sandbox ends: `docs/operations/DEMO_SECRETS_AND_SESSIONS.md`
(rotation and expiry are rehearsed every test run, R-11 and R-12; neither has been done on the hosted service).

## Backup and recovery

Founder, 17 Nov 08:34: "automated database backup/export and recovery planning". `docs/operations/DEMO_BACKUP_AND_RECOVERY.md`.
The restore-and-verify drill is built and rehearsed every test run (export, restore as the owner, migrations, rows, forced row-level
security and every audit chain verified against the source, the API serving the restored copy; damage is reported). Two facts it
turned up: the free database has no backup and no export path at all, and `pg_dump` with the service's own user is refused on any
plan because row-level security is forced on the owner. Continuous backup comes with the paid database; the scheduled export and
the scheduled drill are not built and need a platform API key that only the founder can create.

## Decisions that are the founder's

- **Paid plans for the demonstration API.** The free instance sleeps after 15 idle minutes and takes about a minute to wake; the free
  database expires after 30 days. Render's list prices on 17 Nov: $7 a month for the service, $6 a month plus storage for the database.
- **Production.** Unchanged since before the pause.

## Outstanding

- **Connect the staging demo site** (#169, the rest): cover the connected build in the regression (the whole-site sweep on a
  connected build), say what the page is waiting for while a sleeping server wakes, then set `DEMO_API_URL` and stage. Then the
  two-browser check on staging, which needs a person with two browsers or a workstation allowed to reach `*.onrender.com`.
- The API takes more than eight seconds to stop on SIGTERM when its database is gone (seen on processes left by the rehearsal).
  Shutdown should be bounded.
- **#167, the rest:** the demo's other pages (Build a Room, the field record page, ServiceHands, Assurance, APEX) still use the
  browser's records. Only `#/connected` reads and writes the server.
- **#163** SIGNAL feel: the display face (needs the font file), reading toolbar, chapter progress, panel wash and bubbles, contents.
- **#164** corporate website on phones; **#165** the four worlds; **#166** ServiceHands ITIL depth, traceability matrix, analytics,
  AI controls. Each starts by testing the audit's claim before changing anything.
- Earlier: APEX by asset id; the Pro restyle; the zipped evidence package; imports from other products (#144); the university
  flagship (#142); SIGNAL/Learn (#146); Figma × Lite parity (#147); the Phase A state document (#141); the films (need the
  founder's files again); refresh-plan and field-record exports in the format verification; field moves in Lite's 3D view.
