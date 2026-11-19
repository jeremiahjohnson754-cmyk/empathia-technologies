# Commissioning: the standard's requirements and where each one is enforced

Task #243, from the founder's 19 Nov 2026 03:36 message, priority 2:

> "Commissioning depth. Protect the adaptive commissioning requirements, including Pass with Exception, intelligibility exceptions,
> mandatory deficiency records, documentation gates, measurement workbenches, and baseline acceptance. Our original commissioning
> standard explicitly treats these as enforceable requirements."

The standard is the founder's commissioning workbooks (structure in `COMMISSIONING_SOURCE_PARITY_MATRIX.md`) and the V3.9 rules of the
50/10 master directive §3.1. For each requirement below, this page records three things:

- the rule
- where it is enforced: the engine (`packages/commissioning-engine`), the API (`services/enterprise-api`) and the database (a trigger
  or constraint, which holds for every writer, including one that skips the API)
- the tests that would fail if the rule were weakened

"Not enforced" and "gap" are stated plainly. Nothing here is weakened to make a test pass.

## 1. Pass with Exception

**Rule.** "Pass with Exception also requires a deficiency." An exception is a record of its own, holding:

- the measured value
- why it is poor
- the root cause and the mitigation
- the evidence, and who logged it and when

It is decided by someone other than its logger, and it is never counted as a pass.

**Where it is enforced:**
- **Database (0042).** `app.measured_exception` takes its value, metric and limit from the measurement, never from the request. It is
  immutable and never deleted, and it is decided once and never by its logger. A trigger on `app.room_issue` refuses
  `ACCEPTED_EXCEPTION` unless the deficiency rests on its own approved record.
- **API.** `domain/exceptions.ts` handles logging and deciding. The except step is in `domain/deficiencies.ts`.
- **Acceptance.** The engine's `lifecycleBlockers` counts an excepted FAIL as PASS WITH EXCEPTION, never among the passes. The baseline
  records `PASS_WITH_EXCEPTION`.

**Tests.** `measured-exception` ME-01 to ME-08, run through the API and written straight to the table.

**State.** Enforced at all three layers.

## 2. Intelligibility exceptions

**Rule.** The standard's control rule: "STI ≤ 0.40 or Fail/Marginal routes to intelligibility exceptions". V3.9: "Intelligibility
failures require dedicated exception records."

**Where it is enforced (0048, this task):**
- **Database.** `app.intelligibility_floor()` = 0.40.
  - A criterion for `sti` may be stricter than the standard, never looser: its lower limit must be above 0.40.
  - An STI at or below 0.40 is never a PASS, whether or not the room has a site criterion. That covers a PASS citing the measurement,
    and a PASS citing nothing while the latest STI is at or below the floor.
  - Recorded as FAIL, it opens its deficiency. That deficiency has its own exception record even with no site criterion. The record
    names the floor as its limit, with no criterion version, and a table constraint keeps it that way.
  - `app.exception_route()` decides which rule a record rests on, for every writer.
- **API.** `criteria.ts` refuses a criterion that is too loose and a PASS at or below the floor, each with a reason a person can act
  on. `exceptions.ts` logs and excepts on either route.
- **Interface.** The flagship's exception list says "against the commissioning standard" for such a record.

**Tests.** `intelligibility-standard` IS-01 to IS-07, run through the API and written straight to the table.

**Gaps:**
- The standard's "Marginal" is not a result state. A marginal reading is either above the floor or not.
- The workbook's exception fields beyond the record: microphone, DSP, scenario, RT60, noise, the temporary and long-term fixes as two
  fields, and the linked deficiency as a column. Today these are carried in the record's text and its deficiency.

## 3. Mandatory deficiency records

**Rule.** "Fail or exception requires a deficiency ID."

**Where it is enforced:**
- **API.** A recorded FAIL opens one deficiency per test (`domain/commissioning.ts`, `openCxDeficiency`). Only a verified retest
  resolves it.
- **Database (0032).** A trigger holds the deficiency workflow: no skipped step, no close without a retest, no close by the fixer.
- **Exceptions.** An exception exists only on a deficiency: both 0042 and 0048 require the `test-failed:` key.

**Tests:**
- `deficiency-workflow` DW-01 to DW-07
- `criteria` CR-05 and CR-11
- `measured-exception` ME-01
- `intelligibility-standard` IS-04

**Gap.** The database does not itself create the deficiency for a FAIL written straight to `app.test_result`: the API does. A FAIL
without one still cannot be accepted. It is not a pass, and it cannot be excepted without a deficiency and its record.

## 4. Documentation gates

**Rule.** V3.9: "Required documentation must be present". It is a mandatory gate between functional verification and handoff, with
auditable submissions and an evidence-linked sign-off.

**Where it is enforced:**
- **Database (0043).** Each version of each document is immutable and is reviewed once, never by its submitter.
- **Signatures.** The database computes the hash of the packet. Each signature covers that hash: a later change leaves the signatures
  on the packet they signed. Two sides sign, and they are two different people.
- **Acceptance.** `rooms.ts` → `lifecycleBlockers` refuses ACCEPTED until every required document is approved and both sides have signed
  the current packet. The engine's `documentation.ts` decides which documents a room requires.

**Tests.** `documentation` DOC-01 to DOC-07. DOC-06 sends a direct request to accept and has it refused.

**State.** Enforced. See §6 for the one gap that applies to every acceptance gate.

## 5. Measurement workbenches

**Rule.** "The measurement benches writing directly to authoritative server records" (founder, 17 Nov 2026).

**Where it is enforced:**
- **Every measurement** carries its metric, unit, method, instrument, calibration, provenance and evidence (0013, 0037).
- **Judging.** The database judges a measurement against the criterion in force (`measurement_judge`), whatever the writer sends.
- **What can pass.** Where there is a criterion, a PASS needs a field measurement on a calibrated instrument. A simulated value passes
  only inside a demonstration sandbox.
- **Imports.** CSV imports are validated all-or-nothing and traced to the file's hash and row (0025).
- **Recomputation.** The server works out a reverberation value again from its evidence and refuses one that does not follow (0040).

**Tests:**
- `criteria` CR-01 to CR-13
- `measurement-import` IMP-1 to IMP-4

**Gap.** Only reverberation is recomputed from evidence. Speech intelligibility, noise floor, coverage and limiter values are recorded
as sent, with their provenance. They are judged by the database, but not worked out again from the evidence.

## 6. Baseline acceptance

**Rule.** "Acceptance cannot bypass server-side rules." Every applicable test is executed, passed and independently verified, or
excepted on an approved record. No deficiency is open. The person accepting is not someone who recorded or verified the results. The
signed baseline is immutable.

**Where it is enforced:**
- **API.** `rooms.ts` `transition` applies the engine's `lifecycleBlockers`. It covers:
  - open issues
  - documentation
  - reverification after a change of device
  - the count of passes, verifications and PASS WITH EXCEPTION
  - separation of duties: `ctx.separate` refuses an acceptor who recorded or verified a result
- **Database.** The baseline is immutable (0011, 0038). Verification is independent and calibration-bound.

**Tests:**
- `recommissioning-negative` RN-05, RN-06 and RN-13
- `criteria` CR-06 and CR-12
- `measured-exception` ME-07
- `documentation` DOC-06
- `intelligibility-standard` IS-06

**Gap.** The gate to ACCEPTED is held by the API and the engine, not by a trigger on `app.room`. A writer with direct database access
could set the lifecycle without the gate. The next slice of #243 is a database guard on that transition, to be checked against the
same facts and tested by writing straight to the table.
