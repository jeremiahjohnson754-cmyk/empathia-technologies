# Engineer start (V2.5.5 parity)

Status, 17 Nov 2026. Task #162, from the founder's V2.5.5 Private Engineer Edition (16 Nov 2026).

## What V2.5.5 added over V2.5.3

Read statically; the file was never run. The whole difference between the two engineer editions is 18 changed blocks:

- **An Engineer start page** with three demonstrations: room design, commissioning verification and issue handoff. Each has an
  inspection sheet: what to inspect, evidence states, the security boundary, source references, the tests that cover it, and failure
  handling.
- **Five injectable faults:** missing geometry, conflicting asset id, approval rejected, invalid test evidence, and Drawing Intelligence
  unavailable.
- **Navigation:** engineer pills, and a back link in the room builder.

## What is built here

- **The page.** `#/engineer` (also `#/v25/start`) for the systems and commissioning engineers, the designer, the service manager, the QA
  reviewer, the data steward and the architect.
- **The three demonstrations.** Each opens the product as the right perspective: Build a Room as the Systems Engineer, its
  commissioning as the Commissioning Engineer, and the room's thread as the Service Manager.
- **The inspection sheets.** They describe **this** build. The source paths and test ids are this repository's, not the legacy
  edition's, and a unit test fails if a named file does not exist.
- **Failure handling.** The five faults are switched on the page by an engineering persona (`room.classify.approve`,
  `tests.verify.all` or `provenance.review`). Each makes the product's own refusal with its reason, writes it to the room's ledger and
  leaves the state unchanged:

  | Fault | The step it stops |
  |---|---|
  | Missing geometry | A new room is refused; nothing is created. |
  | Conflicting asset id | A new device is refused and the id is named. |
  | Approval rejected | The classification stays proposed; the design stays PLANNED. |
  | Invalid test evidence | The result is not recorded; the workbook is refused. |
  | Drawing Intelligence unavailable | No drawing is approved. |

## Verified

- `tests/unit/engineer-faults.test.mjs` EF-01…04.
- `tests/browser/demo-engineer-start.test.mjs` ES-01…05.

## Not carried over

- V2.5.5's "sample room created on first use" and its Inspect tab (the state before the last change; canonical ids). Build a Room's
  ledger and revision compare cover part of it; the rest is to do.
- The engineer navigation pills.
