# ADR-0015 · An operational incident is an issue of a room in service

Date: 18 Nov 2026 · Status: accepted · Migration: `0039_operational_incidents.sql` · Tests: `tests/security/incidents.test.mjs` IN-01…11

Founder, 17 Nov 2026, 19:05: "prioritize operational incident intelligence." And the reconciliation of the founder's Operational
Issue Intelligence workbook (`docs/product/SOURCE_RECONCILIATION.md`): the server knew a deficiency of a design and a deficiency
of commissioning; a room in service with a fault had no record to open.

## Decision

1. **Not a second service desk.** An incident is a room issue of a third category, `OPERATIONAL_INCIDENT`, with its own detail in
   `app.incident`. The ServiceHands work order with its hard gates, the issue's history, an APEX case, the relationship graph and
   the workflow with its database guard all hang on an issue already, and now on an incident too. A separate incident record with
   its own work orders would have been two answers to "what is open in this room".
2. **Reported on a room in service** (ACCEPTED or OPERATIONAL), by anyone who can see the room. Before acceptance, what goes wrong
   is a deficiency and is recorded as one. The API refuses otherwise, and so does a trigger on the table.
3. **What was reported never changes**: the kind of entry (incident or engineering observation), the kind of issue (eighteen), the
   domain (twelve), how it was found (user report, support round, scheduled maintenance, production, monitoring), who it affected and
   how much, the device, the reporter. A correction is a note on the history.
4. **Nobody types "recurring".** When an incident is written the database finds the most recent incident of the same kind in the
   same room (and on the same device, when both name one) in the thirty days before, and records it as the one this repeats.
5. **The workflow is the deficiency workflow, through its own door.** Owner and date; root cause, what was done and how it was
   resolved (nine resolution types); confirmation that the room does again what it stopped doing; closing. `POST
   /v1/incidents/{incident}/steps` admits different people from the deficiency door, and each door refuses the other's records:
   - confirmation is the reporter's, whatever they hold, or someone holding `issue.assign` or a test-verification authority. The
     technician who fixed it is not asked whether it works;
   - "not restored" sends the work back, and the earlier resolution no longer stands;
   - closing is by someone who neither fixed nor confirmed (the engine's rule and the database guard's, unchanged);
   - a High or Critical incident is never deferred (the guard's rule, unchanged).
6. **Blocked is a fact with a reason**, set and cleared by the service manager or operations lead. While it stands, the correction,
   the confirmation and the closing wait. **An escalation is recorded once**, with its reason.
7. **Intelligence is what the records add up to** (`GET /v1/incidents/intelligence`): counts by status, kind, domain, how found,
   root cause, resolution and severity; mean and median time from report to recorded correction; the repeats; and for each room in
   service a status derived from its open incidents (DOWN for an open Critical, DEGRADED for an open High, ATTENTION for any other,
   otherwise NO_OPEN_INCIDENT). The answer says so in words: it is not a measurement of the room, and "no open incident" is not a
   statement that the room works.

## Not decided here, and known limits

- **Cancelled** is not a status. A report made in error is closed through the workflow or deferred; the workbook has Cancelled.
- **Service level per incident** is on the work order when one is triaged, not on the incident. An incident with no work order has
  no target but the date its owner was given.
- **Root causes are the workflow's eight.** The workbook's programming error, user training gap, vendor defect and end of life have
  no value of their own.
- **No page yet.** The demonstration's ServiceHands pages still keep their records in the browser; this is the server record they
  are to move to.
- **Monitoring as a source is a word, not a connection**: nothing opens an incident from telemetry, because no telemetry is connected.
- A user-facing reporter outside the organization (a guest in a room) cannot report: reporting needs a signed-in member.
