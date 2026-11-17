# Migration ledger: where each record lives

Founder, 17 Nov 2026 (50/10 §2.3): "Maintain a migration ledger identifying whether each feature uses browser, server, or
explicitly offline queued data. Avoid dual-write ambiguity." And earlier the same day: "One authoritative backend. No duplicated
business logic. No imaginary synchronization."

**Rule.** A feature is in exactly one row state. When a page moves to the server, the same change removes its browser record as an
authority. "Server" means the page reads and writes through the API as a signed-in person, and a test proves it shows what the
server returned. Nothing is "offline queued" today.

`tests/unit/migration-ledger.test.mjs` reads this table: the pages it calls **server** must be exactly the ones the test lists, and
each of them may import the server's client and the interface kit and nothing that holds a record in the browser.

State on 17 Nov 2026:

| Feature (page) | Authority | Notes |
|---|---|---|
| The connected demonstration (`#/connected`): sandbox, sessions per role, field record steps, results, deficiency, work order, thread, audit history | **server** | `tests/browser/demo-connected.test.mjs` CN-01…16; verified on staging with two browsers |
| The flagship room (`#/flagship`): Lecture Theatre SCI-110 by its canonical identifier `UNI-SCI-110`: plan, devices, connections, commissioning plan, thread | **server** | read-only so far; `tests/browser/demo-flagship.test.mjs` FL-01…11 (what is shown equals what the server returned); `tests/security/demo-sandbox.test.mjs` DS-17, DS-18. Not staged yet |
| Field record and redlines (`#/v25/field/…`) | **browser** | the server holds the same model (`0034`, `domain/fieldRecord.ts`); the page's move is parked on `wip/field-record-on-server`, untested |
| Commissioning room records, phases, results, deficiencies (`#/commissioning/…`) | **browser** | server equivalents exist and are enforced; not connected |
| Instrument benches (reverberation, STI) | **browser, file export only** | no record is written anywhere; the export is the evidence file |
| ServiceHands: requests, dispatch, work orders, analytics | **browser** | server equivalents exist; not connected |
| Assurance: baselines, drift | **browser** | server equivalents exist; not connected |
| APEX cases and analytics | **browser** | server equivalents exist; not connected |
| Search Party, people, knowledge | **browser** | the server searches its own records; the demo searches the estate held in the bundle |
| Lite rooms, worlds, estates, SIGNAL, Learn, guides | **browser (read-only content in the bundle)** | no visitor record beyond preferences |
| Decision desk, intake, drawing review, exports' audit trail | **browser** | |

Every other page of the demo is in the browser. This table grows a row, and a test, with each slice.
