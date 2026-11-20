# ADR-0020 · Pass with Exception for a measured test (migration 0042)

Status: accepted, 18 Nov 2026. Source: 50/10 master directive §3.1 (the V3.9 rules), `SOURCE_RECONCILIATION.md` item 4.

## Context

V3.9: "Pass with Exception also requires a deficiency." "Intelligibility failures require dedicated exception records."
"Acceptance cannot bypass server-side rules." "Test direct API attempts to bypass each gate." The workbook's exception holds the
measured value, why it is poor, the root cause, the mitigation, the evidence, the date and who logged it.

Before this, a deficiency's `except` step took any text as its exception reference (0032 checked only that a reference, a
requester and a different approver were named), and an excepted deficiency still counted as open, so it blocked acceptance
anyway: there was no Pass with Exception at all, only a label.

## Decision

- **A record of its own**: `app.measured_exception`, one live record per deficiency opened by a failed measured test
  (`test-failed:<test>`) in a room with a criterion for that test. The database fills the measured value, metric, unit, limits and
  criterion version from the measurement the current FAIL rests on; the request gives only why the value is poor, the root cause,
  the mitigation and optional evidence. Content immutable, never deleted; decided once, APPROVED or REJECTED, never by its logger;
  a rejection says why. A rejected record may be followed by a new one.
- **Who**: logged by someone who measures or verifies (`test.verify`, `tests.verify.all`, `work.evidence`, `fi.plan`); decided by
  `baseline.approve`. The deficiency's `except` step (also `baseline.approve`) names the approved record; its requester is the
  record's logger, so the logger can never except it.
- **The database holds it for every writer**: a trigger on `app.room_issue` refuses ACCEPTED_EXCEPTION for such a deficiency
  unless the reference is its own APPROVED record with that logger and that decider.
- **Acceptance**: an applicable test whose current FAIL rests on the excepted record's measurement counts as **PASS WITH
  EXCEPTION** (engine `lifecycleBlockers` fact `excepted`; an exception covers a FAIL and nothing else). Its deficiency no longer
  counts as open. It is never counted among the passes: the result stays FAIL, the count sentence names it separately, and the
  signed baseline records the label `PASS_WITH_EXCEPTION`.
- Deficiencies of other kinds keep 0032's rules and still block acceptance while excepted. A safety, security, evidence, tenancy or
  separation-of-duties deficiency is never open to exception (unchanged).

## Tests

`tests/security/measured-exception.test.mjs` ME-01…08: the record only for a failed measured test with a criterion; values from the
database; the decision never by the logger, never without the authority, once; the except step refused with no reference, a
made-up one, a rejected one and a requested one, and the same refused by the database when written straight to the table;
immutability; readiness counts PASS WITH EXCEPTION and not as open; another organization neither reads nor decides. Engine test
"Pass with Exception (0042)".

## Not done here

- No page shows the record yet: the flagship room page and the Commissioning Workstation still offer only the deficiency's own steps.
- Intelligibility (STI) has no criterion or bench on the server; reverberation is the measured test with one. The rule applies to
  any test that gets a criterion.
- The Documentation & Submission gate (V3.9's other addition) is the next slice.
