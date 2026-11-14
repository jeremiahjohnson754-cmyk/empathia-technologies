# Commissioning evidence and deficiency audit

Status, 14 Nov 2026. This is a deliverable of the 40/10 Commissioning Engineering Workstation directive. It records what is built and tested; anything that is not is stated as not built.

## The deficiency state machine

The state machine is `packages/commissioning-engine/src/deficiencies.ts`. It is shared code: the demonstration uses it today, and the API is written to use the same code.

| From | Step | To | Rests on | Refused when |
|---|---|---|---|---|
| Open | start | In progress | an owner and a target date | no owner; target date in the past |
| In progress | fixed | Pending retest | root cause (one of eight) and the corrective action | action shorter than a sentence; unknown root cause |
| Pending retest | retest FAIL | In progress | the evidence reference | no evidence |
| Pending retest | retest PASS | Pending retest (awaiting verification) | the evidence reference | no evidence |
| Pending retest | verify | Closed | a passing retest | no passing retest; verifier is the fixer; verifier recorded the retest |
| Open / In progress | except | Accepted exception | an approved exception record | rule not open to exception (safety, security, evidence, tenant isolation, separation of duties); approver is the requester |
| Open / In progress | defer | Deferred | a reason and a future date | no reason; date not in the future; approver is the owner; High/Critical deficiency with acceptance due |
| Deferred | resume | Open | a reason (or `due()` when the date has passed) | no reason |
| Closed | reopen | Open | what regressed | no description of the regression |

These rules apply in every state:

- Every step records who took it and when.
- History only grows; nothing is deleted.
- An Accepted exception is final. A new finding opens a new deficiency.

A deficiency **blocks acceptance** in three cases:

- it is Open;
- it is In progress or Pending retest;
- it is Deferred and its severity is High or Critical.

Age and lateness come from `due()`: a deficiency is late when it is still open past its target date.

**Tested by:** `packages/commissioning-engine/test/deficiencies.test.ts`, 6/6. It covers every transition, every refusal, separation of duties, deferral resumption, age, lateness and reopening.

## In the demonstration

`#/commissioning/deficiencies` has a deficiency workbench (`apps/demo/src/pages/DeficiencyBench.tsx`). For each deficiency it shows:

- where the deficiency is in the six states;
- its age, owner, target date, root cause and action;
- the retest and whether the deficiency may be excepted;
- whether it blocks acceptance;
- its history.

Each step is offered with the authority it needs, as follows.

| Step | Authority needed |
|---|---|
| start | `deficiency.open` or `issue.assign` |
| fixed | `work.evidence` |
| retest | a `test.verify` authority |
| verify | `tests.verify.all` or `baseline.approve` |
| except | `baseline.approve` |
| defer | `issue.assign` or `baseline.approve` |

When a step is refused, the page shows the engine's reasons. Every step and every refusal is written to the workspace audit trail.

The steps worked in the demonstration are kept in this browser. Each deficiency starts from the room record's synthetic issue.

**Tested by:** `tests/browser/demo-deficiencies.test.mjs`. It works one deficiency from Open to Closed by four different perspectives and checks the refusals for authority, for an action without words and for separation of duties. It also checks the audit trail.

## On the server (migration 0032)

- **Routes.** `GET /v1/issues/{issue}/deficiency` returns the workflow and every step taken. `POST /v1/issues/{issue}/deficiency` takes one step through the engine's `step()`. Each step is checked against its own authority, the same mapping as the demonstration. Refusals are audited as DENIED with the engine's reasons. Every step is written to `app.issue_event` (kind `workflow`) and to the audit trail.
- **Stricter than the engine, by design.** A High or Critical deficiency is never deferred on the server. The role that owns a deficiency does not approve its deferral.
- **Database guard.** The guard trigger `room_issue_workflow_guard` holds the machine for every writer, the runtime role included. It refuses:
  - a skipped step;
  - a close without a passing retest;
  - a close by the fixer or by the retest's recorder;
  - an exception approved by its requester;
  - a deferral of a High deficiency.

  `workflow = CLOSED` exactly when `state = RESOLVED`. The system's own resolution paths, a verified retest and a design check that stops firing, name themselves in the transaction-local setting `app.issue_resolution`. Any other write of RESOLVED is refused.
- **Tests.** `tests/security/deficiency-workflow.test.mjs` (DW-01..07) runs against real HTTP and a private PostgreSQL database. It covers a designer refused (403, audited), a past target date, a one-word action, the retest recorder refused as verifier, the installer refused as verifier, a close by a third person, the database guard as the runtime role, a High deficiency not deferred, an exception not approved by its requester and final once accepted, and another tenant getting 404. The full unit, integration and security run on 14 Nov 2026: 111 PASS, 0 FAIL.

## Not built yet


- **Evidence as first-class data.** Today the retest references evidence by ID. Linking that ID to a stored file with its SHA-256, as the reverberation instrument's exports already carry, is not built.
- **The intelligibility exception record.**
