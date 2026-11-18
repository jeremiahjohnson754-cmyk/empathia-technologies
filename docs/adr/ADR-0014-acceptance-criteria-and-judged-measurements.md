# ADR-0014 · Acceptance criteria, and results that rest on a judged measurement

Date: 17 Nov 2026 · Status: accepted · Migration: `0037_measurements.sql` · Tests: `tests/security/criteria.test.mjs` CR-01…11

Founder, 17 Nov 2026: "the measurement benches writing directly to authoritative server records"; "run a genuinely interactive
commissioning measurement, attach evidence, generate a failed test and deficiency".

## What was missing

A result was a state (PASS, FAIL…), an evidence file and the name of an instrument. A measurement (ADR-0004) was a value with its
provenance. Nothing joined them: the number a room had to meet was not a record, a measurement did not say which test it answered,
and an instrument-measured test could be recorded PASS whatever was measured. A bench in a page could have decided pass or fail and
told the server the outcome, which is the browser being trusted with the verdict.

## Decision

1. **A criterion is a record.** `app.acceptance_criterion`: for one room and one test, a metric, a unit, a lower and/or upper limit,
   and where the limit comes from. Set through `PUT /v1/rooms/{room}/criteria/{test}` by someone holding `room.design.approve`, before
   the room is accepted. Append-only versions: a changed limit is a new version and the earlier ones stay.
2. **The existing measurement record is extended, not duplicated.** `app.measurement` gains the test it answers, the evidence file
   it rests on, a bounded detail (positions, bands) and its judgement. `POST /v1/rooms/{room}/measurements` with `testId` is recorded
   by the test's responsible role on a room in COMMISSIONING, in the metric and unit the test is measured in.
3. **The database judges.** A trigger sets the criterion in force and `within` when the row is inserted; whatever the writer sent is
   replaced, and the columns are immutable afterwards. The API has no field for it: a request naming `within` is refused.
4. **A result rests on a measurement.** `POST /v1/rooms/{room}/results` takes `measurementId`. Where the room has a criterion for the
   test, the result must cite a measurement of that test judged against the criterion in force. PASS additionally needs the value to
   be within the limit, not rejected on review, and to be a field measurement on a calibrated instrument — or, inside a demonstration
   sandbox only, a SIMULATED value. The rule is in the API (where a refusal gets a reason a person can act on) and again as a trigger
   on `app.test_result`, so a row written round the API is refused by the table.
5. **A FAIL says what was measured.** The deficiency a FAIL opens carries the reading, the limit and its version.
6. **A retest is a measurement.** The retest of a deficiency opened by a failed test that has a criterion is the test's own new
   result: PASS, resting on a measurement recorded after the correction was recorded. The deficiency's retest names that
   measurement, whatever the request says; a sentence, an older measurement or a current FAIL is refused (CR-11).
7. **No limit is invented.** The scenario sets one criterion, on the lecture theatre's reverberation. Every other measured test has
   none until the design authority sets one, and a measurement of a test with no criterion has no verdict. A room with no criterion
   for a test records its results exactly as before.

## Consequences

- The verdict cannot come from a page. A bench works out a value and uploads the data it was worked out from; the server records the
  value; the database decides whether it meets the limit; the result is refused or recorded on that.
- Changing a limit after measuring does not rewrite history: earlier measurements keep the judgement they were given, and stop
  carrying a new result.
- In a sandbox a SIMULATED value can carry a PASS, so the journey can be followed without a room to measure. The record says
  SIMULATED, the deficiency says SIMULATED, and outside a sandbox the same request is refused (CR-09).

## Not decided here, and known limits

- **The server does not recompute the value from the evidence file.** It records the value the recorder sends, with the file. The
  control is the one commissioning already has: someone else verifies the result. Recomputing on the server needs the analysis code
  in a package both sides use; it is not done.
- **Pass with Exception** (V3.9) is not modelled: a value that misses its limit is FAIL or nothing.
- **Uncertainty is recorded and not used.** A value within the limit by less than its uncertainty is judged within.
- Five tests have metrics defined (`criteria.ts`): reverberation, intelligibility, noise floor, coverage, limiter level. Others
  cannot have a criterion until a metric is defined for them.
