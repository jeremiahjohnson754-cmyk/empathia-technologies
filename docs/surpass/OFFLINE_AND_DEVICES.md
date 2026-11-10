# Offline and any device — what is built, what is not (10 November 2026)

Founder instruction, 10 November 06:05: Commissioning, Assurance, ServiceHands and Lite must work smoothly offline and on any device,
the phone as smooth as the desktop. This file is the record of where that stands. Statuses are the Surpass directive's.

## State before this work

Checked on 10 November: the demonstration shipped a web manifest and **no service worker**. Without a connection nothing loaded:
not the page, not a screen that had already been opened. `navigator.onLine` was not read anywhere in the shell.

## Built now

| Part | Where | Status | Evidence |
|---|---|---|---|
| Offline worker for the demonstration | `apps/demo/src/offline/sw.template.js`, written to `dist/sw.js` by `apps/demo/build.offline.mjs` | SYNTHETIC_DEMO (built, tested, not deployed) | `tests/unit/demo-offline.test.mjs` (17), `tests/browser/demo-offline.test.mjs` (44 in all) |
| Page-side control and the offline strip | `apps/demo/src/offline/offline.ts`, `Strip.tsx` | SYNTHETIC_DEMO | same browser suite |
| "Offline and this device" page (`#/offline`) | `apps/demo/src/offline/OfflinePage.tsx` | SYNTHETIC_DEMO | same browser suite |
| Packs: 13 SIGNAL seasons, the library, narration | `dist/offline-packs.json` (generated) | SYNTHETIC_DEMO | OFU-15, OF-15..OF-21a |
| Field queue (work recorded offline, sent later) | `packages/field-queue` | IMPLEMENTED_NOT_VERIFIED against a real server (pure logic, tested) | `packages/field-queue/test/queue.test.ts` (22), six mutations each caught |
| The field queue demonstrated against a simulated server | `apps/demo/src/offline/FieldQueueDemo.tsx`, on `#/offline` | SYNTHETIC_DEMO: the server is an object in the page, and the page says so | browser `demo-offline` OF-40 to OF-50 (11) |

### What the worker does

- **Saves the whole app or nothing.** The shell is every file of the app's code: the page, the bundle, the style sheet, fonts, brand
  marks, every page chunk, and the SIGNAL story's contents list (about 150 files, about 3 MB). A failed file fails the install and the
  half-filled cache is removed.
- **Connected visitors always get what is published.** Code without a hash in its name is fetched from the network first; the saved
  copy answers only when the network fails or takes more than four seconds. A deploy is never hidden behind a stale copy.
- **Keeps the previous build** so a page still open on it can finish its session offline; older builds are removed. Hashed chunks
  already held are copied, not downloaded again.
- **Data is kept when first opened** (a SIGNAL chapter, the library, narration) and refreshed behind the saved copy. A season can be
  kept ahead of time from `#/offline`.
- **Audio seeks offline**: a ranged request is answered from the saved whole file.
- **Asks before spending data**: when the browser asks sites to use less data, nothing is saved until the visitor chooses to.
- **Can be removed**: one button removes the worker and every saved file, leaves the visitor's work alone, and the choice is kept.

### What was proven in a browser with the network cut

Lite, Commissioning, Assurance, ServiceHands, Dispatch, the worlds, two estates, game day, Mission Control, the story library, Campus
and Scouter all open from the saved app without ever having been opened before (OF-07). A problem reported through ServiceHands on a
phone-sized screen with no connection is still in the queue after an offline reload (OF-10). Game day advanced offline is at the same
phase after an offline reload (OF-09). A role that may not open a page still gets the access page offline (OF-22).

## The field queue (`@empathia/field-queue`)

The demonstration keeps a visitor's work in the browser and sends nothing to a server, so it has nothing to synchronise. The product
does. The package holds the rules for that, as pure functions with the clock and randomness passed in:

1. Nothing recorded on a device is lost, reordered or silently replaced.
2. Nothing counts as sent, passed or done until the server acknowledged it (`counts`, `standing`). **A replay can never make a PASS.**
3. One idempotency key per entry for its whole life, so a retry after a lost answer or a crash is applied once (the enterprise API
   already reserves the key with the effect, decision D-35).
4. A change made against stale data is a CONFLICT a person resolves. The server's record is kept beside the device's entry; later
   changes to the same record wait behind it.
5. One person's entries are never loaded or sent as another person. A stored queue that cannot be read is handed back, not discarded.

## Not done, said plainly

- **Not deployed.** The staging sites are still at `97201d4`.
- **No product screen sends its work through the field queue.** It is demonstrated on `#/offline` against a simulated server:
  record a result with the connection off, switch it on, lose an answer, let a colleague change the record first. Commissioning,
  Assurance and ServiceHands themselves still write to browser storage. The queue has never talked to the enterprise API: NOT_RUN
  against a real server.
- **Phone smoothness is not measured.** Layout at phone width is tested in many suites (targets of 44 px, no sideways scroll). Interaction
  latency, long tasks and memory on a mid-range phone profile are NOT_RUN. No INP, LCP or CLS figure exists and none is claimed.
- **Pinch and two-finger orbit** in the 3D room and plans: not built. Button equivalents exist.
- **No update prompt.** A connected visitor gets new code at once because of network-first; a page left open keeps its old code until
  it is reloaded, as before.
- **The saved app holds the code of every page**, including pages the current role is not shown. What a role is shown is unchanged
  (OF-22), and the demonstration is public and synthetic. In the product the saved set must be limited to what the signed-in person is
  entitled to; that requirement is recorded here and is not built.
- **The corporate website has no worker.** It was not asked for.
- **Only Chromium was used.** Safari and Firefox behave differently around storage eviction and ranges: NOT_RUN.
