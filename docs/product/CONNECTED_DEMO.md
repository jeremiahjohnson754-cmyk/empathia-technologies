# The demo connected to the server

Founder, 17 Nov 2026:

> Connect the actual interactive demo to the server-backed workflows, using safe synthetic tenants, authenticated demo sessions, scoped
> permissions, and a resettable demonstration dataset. Then make the Phase 1 field records database-backed, too. […] someone could
> inspect a device, update its field record, complete a commissioning workflow, switch roles, and observe the same durable history
> through ServiceHands, Assurance, and APEX — even in a fresh browser session.

## Where it stands

| Part | State |
|---|---|
| Sandboxes, sessions, caps, reset (server) | Built and tested: ADR-0013, `tests/security/demo-sandbox.test.mjs` DS-01…16 |
| Field records in the database (server) | Built and tested: `0034_field_record.sql`, `tests/security/field-record.test.mjs` FRS-01…09 |
| The connected page in the demo (`#/connected`) | Built and tested against a real API and database in a real browser: `tests/browser/demo-connected.test.mjs` CN-01…16 |
| The API and its database on staging | **Running** on Render's free plans since 17 Nov 2026; the deployment check passed 12 of 12 inside the deployed service. `docs/operations/RENDER_DEMO_STAGING.md` |
| On the public sites | **Not there yet.** The staging demo site is still built without a server address. It is switched over when a commit that contains the waking-server wording and the whole-site check (CN-11…13) has passed the full regression. Production is unchanged |

So the two implementations meet in a build that is given a server, and the server now exists on staging. The staging site is not yet
built that way.

### A server that sleeps

A free instance sleeps after 15 idle minutes and answers its first request only once it has started, about a minute later. The page
asks once and waits on that request. After five seconds it says so: the server has not answered yet, one that has been idle can take
about a minute to start, and there is nothing the visitor needs to do. If no answer comes at all it says the server did not answer
and offers **Ask again**. In a connected build the browser's thread page (`#/thread`) links to the server's.

### Interruptions

Founder, 17 Nov 2026: "Make sure the browser explains what's happening instead of presenting an apparent failure."

| What happens | What the page does |
|---|---|
| A step's answer is slow (the server slept while the page was open) | After five seconds, beside the step in progress: the server has not answered yet, one that has been idle can take about a minute to start, nothing needs to be done |
| The answer is lost after the server recorded the step | The page reads the server's record, finds the step there, and says so: recorded once, not sent again |
| The request never reaches the server | The page reads the record, finds the step is not there, and says so. Doing it again records it once |
| The connection is gone and the record cannot be read either | The page says it is not known yet whether the step was recorded and that nothing is assumed. It never sends a request again on its own |
| The browser goes offline | A notice says so. When the browser is online again the page reads the server by itself and says what the server holds, including whether the step it could not confirm is on the record |
| A session ran out while the page was open | The page asks for a new one with the key and repeats the read. If the sandbox itself is gone, it says so and offers a new one |

Nothing is kept in the browser to be "synchronized" later: an action is either on the server's record or it is not, and the page
finds out by asking. `tests/browser/demo-connected.test.mjs` CN-14…16.

## What a visitor does

1. Opens `#/connected` and presses **Open my sandbox**. The server creates a synthetic organization for that visitor: sixteen people
   (one for each of the fifteen roles and, since 18 Nov 2026, a second service technician whose field certificate is recorded and not
   yet verified), one site, one building, and a huddle room that has been designed, approved and installed by four of those people.
   (The sandbox also holds the two engineering rooms of `#/flagship`: Lecture Theater SCI-110 and Harbor 201 of the convention
   centre. This journey does not touch them.)
2. Takes the room through nineteen steps. Each is made as the person whose work it is:

   | Step | Person |
   |---|---|
   | Record how a device is mounted; record a field move (a sprinkler head) | Installer |
   | Approve the field move | Systems Engineer |
   | Fill the device register | Installer |
   | Start commissioning | Systems Engineer |
   | Record a failed check with its evidence | Commissioning Engineer |
   | Hand the deficiency to ServiceHands, triage, assign | Service Manager |
   | Accept, preflight, start, evidence, hand over | Service Technician |
   | Verify the work | Commissioning Engineer |
   | Close the work order (the deficiency stays open) | Service Manager |
   | Start the corrective work; retest | Commissioning Engineer |
   | Record the root cause and the correction | Installer |
   | Verify the retest (the deficiency closes) | Systems Engineer |
   | Record the remaining checks | Commissioning Engineer |
   | Verify every result; lend the acceptance | QA Reviewer |
   | Accept the room (baseline v1) | Operations Lead |
   | Open an APEX case on the deficiency | Commissioning Engineer |

3. At any step, tries it **as someone else**. The server refuses, and the page shows the server's own words (for example: "designer may
   not record how a device is mounted (needs work.evidence or field.scan)"). The refusal is a row in the room's audit history.
4. Reads the thread: six stages, the ids that tie them, and the audit trail — all read from the server each time.
5. Copies the **resume code**. In another browser, with nothing stored, the code opens the same sandbox and the same thread.
6. Resets. The server closes the sandbox and opens a new one; the old code opens nothing; nothing was deleted.

## What is kept where

- **In the browser:** the sandbox's id and key (`empathia.demo.sandbox.v1`). Nothing else. Session tokens are held in memory.
- **On the server:** every record, with its audit row. The server keeps the key only as a SHA-256 hash.

## What it is not

- Not production security. One visitor holds every role of their sandbox by turns. Separation of duties is enforced between the
  sandbox's people, and the visitor sees each refusal by trying it; nothing stops one person from then switching role. The page says so.
- Not a commissioning. The results recorded by the journey are synthetic and labelled so.
- Not a place for real data. Every sandbox carries that notice; uploads are limited to short text notes.

## Running it locally

```
node scripts/db.mjs up
node services/enterprise-api/dist/src/db/seed.js
node services/enterprise-api/dist/src/db/demo.js enable
DEMO_SESSIONS=on CORS_ORIGINS=http://127.0.0.1:4310 node services/enterprise-api/dist/src/main.js      # the API on :4100
DEMO_API_URL=http://127.0.0.1:4100 node apps/demo/build.mjs
DEMO_API_URL=http://127.0.0.1:4100 node apps/demo/server/serve.mjs                                      # the demo on :4310
```

Open `http://127.0.0.1:4310/#/connected`.

## What deploying it takes (the API and database: done on staging, 17 Nov 2026; the paid plans remain the founder's decision)

1. **A database and an API service for the demonstration only.** Its own PostgreSQL database (it holds nothing but sandboxes) and one
   web service running the API with `NODE_ENV=production`, `AUTH_MODE=demo`, `DEMO_SESSION_SECRET` (≥ 32 bytes, generated on the
   platform, never in the repository), `CORS_ORIGINS` set to the demo site's origin, `TRUSTED_PROXY=on`, and a disk or object store for
   the short evidence notes.
2. **Migrate and enable.** `migrate.js`, then `demo.js enable`, which also loads the role catalogue. No seed and no bootstrap: the
   database holds sandboxes and nothing else.
3. **Rebuild the demo with `DEMO_API_URL`** and add that origin to `connect-src` in the site's Content-Security-Policy header.
4. **A schedule for recreating the database**, since sandboxes are never deleted by the API. Until then growth is bounded: a sandbox
   records at most 4,000 actions and 60 evidence notes, and a database opens at most 5,000 sandboxes in all (`demo.js enable
   --max-total … --max-writes … --max-evidence …`); at the ceiling the page is told the demonstration is full until its next refresh.
5. **Cost.** Render's price list on 17 Nov 2026 shows a web service at $7 a month (0.5 CPU, 512 MB) and PostgreSQL at $6 a month
   (256 MB) plus $0.30 per GB of storage; both also have free plans with usage limits that the page does not spell out
   ([render.com/pricing](https://render.com/pricing.md)). The figures are the platform's, read that day, not a quote.

Steps 1 and 2 were done on Render's free plans on 17 Nov 2026 (no charge; what the free plans mean is in
`docs/operations/RENDER_DEMO_STAGING.md`). Step 3 has not been done. The production site is static, as before.

## Verified

- `tests/security/demo-sandbox.test.mjs` DS-01…16: off by default; isolation both ways; the token boundary both ways; the key; scoped
  permissions; the whole thread in a sandbox; reset; expiry; caps; database guards; upload limits; the standard tenants unchanged row
  for row; the demonstration deployment mode; a database with migrations and `enable` only; the storage ceilings.
- `tests/security/field-record.test.mjs` FRS-01…09.
- `tests/unit/connected-client.test.mjs` CC-01…06: the client and the journey without a server.
- `tests/browser/demo-connected.test.mjs` CN-01…16 (CN-14…16: a slow step, an interrupted step, offline and back): a build without a server address carries no connected page; opening a sandbox; a
  refusal in the server's words; the field move; the whole journey; a fresh browser session from the resume code; what the browser
  stores; reset; phone width; the server stopped; a server slow to answer; no answer and asking again; and every other page of a
  connected build (112) opening with no console error and no call to the server.
- On a build that names the staging API, run once on 17 Nov with the server out of reach: `demo-offline` 44 passed, `demo-field-ux`
  10 passed, `demo-deadends` on the two thread pages 3 passed.

## Not yet

- The other demo pages (Build a Room, Field record, ServiceHands, Assurance, APEX) still use the browser's records. Only `#/connected`
  reads and writes the server.
- Photographs as evidence in a sandbox (uploads there are short text notes by design).
- Hookups and notes in the connected journey (the server has them; the journey records a mounting and a move).
