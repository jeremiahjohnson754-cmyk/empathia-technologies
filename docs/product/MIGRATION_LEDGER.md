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
| The flagship room (`#/flagship`): Lecture Theatre SCI-110 by its canonical identifier `UNI-SCI-110`: plan, devices, connections, commissioning plan, thread; **moving a device**: drag, tap, arrow keys or numbers make a draft in the browser; submitting records a proposed field move on the server as the person chosen; someone else approves or rejects it on the server; designed, as-built and proposed are drawn as three layers; the room, the field record and the baselines are read separately and compared on the page | **server** | the page holds no record of the room or of a move (a draft is not a record and is drawn as a draft); `tests/browser/demo-flagship.test.mjs` FL-01…30 (what is shown equals what the server returned; a refusal is the server's; refresh and a second browser read the same); `tests/security/placement.test.mjs` PL-01…07 for the same rules without the page. **Commissioning** (FL-20…24): the register and the start of commissioning; the reverberation bench (an analysis in the browser of impulse responses, synthetic reference signals or loaded files) whose value, positions and analysis package are recorded on the server as a measurement; the verdict shown is the one the database gave (ADR-0014); a result is recorded on a measurement, PASS refused by the server when it misses the criterion, FAIL opening a deficiency the page lists. **The corrective action** (FL-24…27): the deficiency handed to ServiceHands, triaged, the question "who is qualified" answered by Search Party on the server and the gated candidates shown with their reasons, assigned, accepted, preflight, field evidence, verified by someone else, closed; and the deficiency's own record: owner and date, root cause and correction, a retest that is a new measurement at the bench, its verification. **To acceptance** (FL-28…30): the handover documents recorded one at a time, the other checks one request each, every result verified by someone else, the acceptance lent and then given by the operations lead, and the baseline the server publishes: the design revision and hash, each device's designed and as-built place, and the measured values the room was accepted on with their limits (migration 0038). Shortcuts of the demonstration, each stated on the page: a note stands in for each handover document, and the other checks are recorded on one synthetic observation note |
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
