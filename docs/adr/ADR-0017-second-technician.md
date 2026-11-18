# ADR-0017 · A sandbox has two service technicians, and what separates them is in the records

Date: 18 Nov 2026 · Status: accepted · Migration: `0041_sandbox_second_person.sql` · Tests: `tests/security/second-technician.test.mjs`
ST-01…07; `tests/browser/demo-flagship.test.mjs` FL-32

Founder, 17 Nov 2026, 19:05: "a second technician whose permissions are actively tested."

## What was missing

A sandbox opened with one person for each role. Only the service technician holds `work.accept`, so the service pool had one
member. Search Party's answer to "who is qualified" was always that one person; no candidate was ever shown failing a gate;
"assign anyway" had nobody to be refused for; and "only the technician the job was assigned to" had no second technician to
refuse. The rules were in the server and tested with fixtures elsewhere. In the demonstration they had nothing to act on.

## Decision

1. **Naming a role twice makes a second person of it** (`app.demo_open_sandbox`, 0041): `service-2@<sandbox>.empathia.invalid`,
   "Service Technician 2 (synthetic)". The sandbox boundary of 0033 is unchanged and applies: the person is the sandbox's own and
   joins no other organization. A sandbox now opens with sixteen people.
2. **A session names a seat.** `POST /v1/demo/sessions` takes `seat` (from 1) beside `role`. Without it the session is the first
   person of the role, as before. A seat nobody holds is refused (400). The key is still the only credential.
3. **The two technicians hold the same authorities**, because they hold the same role. What one may do and the other may not is
   decided where it always was:
   - the hard gates read verified competency records only (ADR-0009). The scenario gives the second technician a staff profile and
     the field certificate the work needs, **recorded by the service manager and not verified**. It counts for nothing. The gate
     refuses them, and "assign anyway" is refused with the gate that fails;
   - a job is its assignee's: acceptance, preflight, start, field evidence and hand-over are each refused to anyone else, the other
     technician included, at every state (ST-04, and the mirror image in ST-06);
   - nobody verifies their own work, and holding the same role as the person who did it gives no right to verify it (ST-05).
4. **The gate says why, precisely.** "Not held" was true of an unverified credential and was not the whole of it. The reason now
   reads "recorded, not yet verified by someone other than its recorder and its holder (it counts for nothing until then)", and the
   candidate carries the pending record's id so that whoever may verify it can find it. The gate's outcome is the engine's and is
   unchanged.
5. **Verification is the steward's.** The service manager recorded the credential and cannot verify it; its holder cannot; the
   other technician cannot. Verified by the data steward it counts at once (the second technician passes the gates on the next
   read); revoked, it stops counting at once (ST-06, ST-07).

## On the page

`#/flagship` offers "Service technician 2" and "Data steward" among the people to act as. The candidates list shows the second
technician failing a gate with the server's reason and an "Assign anyway" that the server refuses. A block under the work order
lists the credentials as the acting person is allowed to see them (a technician sees their own; those who record or verify see
everyone's) with a button to verify a pending one. Step four says whose job it is. An answer Search Party gave before the gates last changed is withdrawn until it is asked again,
so the page never shows "1 of 2 pass" above two people who pass. Every outcome is the server's (FL-32).

## Not decided here, and known limits

- **Two is still a small pool.** No vendor technician, nobody on leave, nobody out of capacity, nobody without site access: those
  gates are exercised by fixtures in `search-party` and `service` suites, not by people of the sandbox.
- **The second technician's history is a profile and one credential.** No past jobs, no rating, no reliability record.
- A seat is a position in an ordering (first person of the role, then `-2`), not a stored number. A sandbox with three of a role
  would number them by address; nothing opens one today.
- The existing deployed staging API (0038) opens fifteen people: the smoke check SM-04 expects sixteen from this commit on, and is
  run from the commit that is staged.
