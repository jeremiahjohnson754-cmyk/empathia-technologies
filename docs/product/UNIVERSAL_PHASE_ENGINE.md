# The universal phase engine

Founder, 14 Nov 2026: *"make sure ServiceHands commissioning workflow and phase structure and universal engine is the same as commissioning and assurance … keep the 6 phases how it is."*

## One engine, one rule (`apps/demo/src/phases/universal.ts`)

Every governed workflow has the same structure:

- numbered phases, each with a question;
- the items of each phase, read from the record;
- one verdict rule for every phase;
- a final sign-off.

### Item results

| Result | Meaning |
|---|---|
| pass | done and verified |
| ran | done, awaiting verification |
| fail | done and failed |
| pending | not done yet |
| na | does not apply |

### The verdict rule

This is commissioning's rule, unchanged:

| Condition | Verdict |
|---|---|
| no applicable item | none |
| any item failed | fail |
| every item run | pass |
| some items run | partial |
| no item run | not run |

### Sign-off

The sign-off waits for every phase to pass with every item verified. An item that has run but is awaiting verification is not enough. The signer is never someone who did any of the items (separation of duties).

## Commissioning keeps its six phases

Commissioning still has its five phases and its sign-off:

1. Readiness
2. Physical QA
3. Infrastructure and platform
4. Functional
5. Operational and experience
6. Sign-off

`campus/cxRecord.ts` `phaseStats` now runs on the shared engine and maps each test result to an item result:

| Test result | Item result |
|---|---|
| PASS_VERIFIED | pass |
| FAIL | fail |
| untested | pending |
| any other result | ran |

`tests/unit/universal-phases.test.mjs` UP-02 shows that every room's phase verdicts and counts are exactly what the earlier formula gave. The old formula is kept in the test as the reference.

## A ServiceHands job on the same engine (`apps/demo/src/service/phases.ts`)

| Phase | Question | Items (read from the incident, work order and history) |
|---|---|---|
| 1 Intake | Is the request on the record, in a known room, triaged? | room on the record; triaged |
| 2 Dispatch | Right person, through the hard gates, preflight passed, accepted? | assigned; preflight passed (a failed check fails it); accepted |
| 3 Field work | Was the work done, with evidence? | started; field evidence recorded (none by verification fails it) |
| 4 Verification | Verified by someone other than the technician? | verified by another person (by the technician fails it); not a reopened fix |
| 5 Confirmation | Did the requester confirm it works? | confirmed (closed without confirmation, as the policy allows, counts as ran) |
| Sign-off | | the service manager's close; open points are listed |

Where it shows:

- **ServiceHands record.** "The job, phase by phase" on each request, drawn by the same component a workflow uses anywhere (`phases/PhaseRail.tsx`).
- **Export.** The phases are a table in the service record's export.

## Tests

| Suite | What it checks |
|---|---|
| `tests/unit/universal-phases.test.mjs` | UP-01 the rule and sign-off; UP-02 commissioning unchanged on every room; UP-03 a ServiceHands job phase by phase |
| `tests/browser/demo-service-phases.test.mjs` | SP-01..04: a closed job passes and is signed off; a waiting job and its reasons; triage moves intake; the export carries the phases |

## Not yet on the engine

- Assurance's own cycle: drift, recertification and change. It still has its own model.
- The server's service lifecycle (`@empathia/service-engine`). The demonstration reads the server's states. The phases are a view of them, not new rules.
