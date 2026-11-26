# Pilot measurement framework

Deliverable E of the founder's commercial-readiness directive (25 Nov 2026, §11). What an Empathia pilot would help a customer
investigate, measure and possibly improve, and how each measure would be taken so that its result can be trusted.

**Status: a framework, not a result.** No pilot has been run. Nothing below is a measured improvement, a projected saving or a
customer-validated return. The public demonstration runs on synthetic data, and a difference seen there says nothing about a customer's
estate. The pilot packages themselves, their scope, length and price, are the ones already published on the website's pricing and pilot
pages (`apps/website/src/commercial.tsx`); this framework adds no package, term or price.

## 1. How every measure is taken

The same rules hold for every metric in §2.

1. **A baseline before the pilot, from the customer's own records.** Each metric needs a baseline measured the same way, over a period of
   the same length, before Empathia is used (or, where the pilot runs alongside existing practice, on comparable rooms that do not use
   it). No baseline, no claim: a metric without one is reported as *not measured*.
2. **The population is fixed at kickoff.** The rooms, jobs or people in scope are listed before the baseline is read. Rooms added later
   are reported separately.
3. **Evidence labels are kept.** Each value is reported with the label the platform already uses: *verified* (recorded by one person,
   checked by another), *observed* (seen by a check or a person, not independently verified), *declared* (stated by someone),
   *modeled* (computed from a plan or assumption), *simulated*, or *unknown*. A pilot result is only as strong as its weakest input.
4. **Success criteria are agreed, written and dated before the baseline is read.** The criterion for each metric (for example, "a
   reduction the customer considers material, stated as a number at kickoff") is the customer's, not Empathia's. This document gives
   none, because any number written here would read as a promise.
5. **Confounders are named in advance** (§3) and the pilot report says which ones occurred.
6. **Continuous improvement, Lean Six Sigma style.** Define the measure and its operational definition; measure the baseline and its
   variation, not only its mean; analyze causes with the platform's own records (APEX cases, deficiencies, retests); improve one thing at
   a time; control by reading the same measure after the change. A difference smaller than the baseline's own variation is reported as
   *no detectable change*.
7. **Verification.** The pilot report names, for every figure, the records it was computed from and the query or method, so that someone
   on the customer's side can recompute it. Figures from a time-and-motion study are labeled *observed* and say how many observations
   they rest on.

## 2. The metrics

Each row gives the objective, how the measure is taken, the baseline it needs, where the data comes from, the period, the unit, the form
of the success criterion, what could distort it and how it is verified. "Empathia records" means records the platform keeps today in the
demonstration and the authenticated application: room lifecycles, commissioning results with who recorded and who verified, accepted
baselines, deficiencies and retests, ServiceHands requests and work orders, APEX cases, Search Party queries and Learn/SIGNAL completions.

| Metric | Business objective | Measurement method | Baseline requirement | Data source | Evaluation period | Unit | Success criterion (form) | Potential confounders | Verification |
|---|---|---|---|---|---|---|---|---|---|
| Commissioning cycle time | Rooms reach acceptance sooner | Time from installation complete to accepted baseline, per room | The same interval for rooms commissioned in the prior period | Empathia lifecycle events and baselines; the customer's project records for the baseline | Rooms accepted during the pilot | Working days per room (median and spread) | A reduction in the median, of a size agreed at kickoff | Room complexity, crew size, parts delays, room archetype mix | Per-room event timestamps listed; recomputed by the customer |
| Engineering handoff completeness | Fewer rooms handed over with something missing | Share of applicable handoff requirements met at the moment of handoff | Prior handoff packets scored against the same requirement list | Empathia documentation and requirement records; prior packets | Handoffs during the pilot | Percent of applicable requirements | An increase agreed at kickoff | A changed requirement list; a reviewer's strictness | Two reviewers score a sample independently |
| First-pass acceptance rate | Rooms accepted without a second round | Share of rooms accepted at the first acceptance review | Prior acceptance outcomes | Empathia acceptance reviews and baselines | Rooms reviewed during the pilot | Percent of rooms | An increase agreed at kickoff | Reviewer turnover; easier rooms in scope | Review records with reviewer and outcome |
| Deficiencies found before handoff | Problems found by commissioning, not by users | Deficiencies opened before acceptance divided by all deficiencies opened in the first 90 days of the room | Same ratio for prior rooms | Empathia deficiencies and service requests | 90 days after each room's acceptance | Percent | A higher share found before handoff | Short observation window; reporting habits of users | Every deficiency listed with its date and source |
| Repeat service visits | Fewer returns to the same fault | Work orders on the same room and fault class within 30 days of a closed one | Same count for prior jobs | ServiceHands work orders and their closure retests | Jobs closed during the pilot, plus 30 days | Repeat visits per 100 closed jobs | A reduction agreed at kickoff | Seasonal load; ageing equipment; a changed fault taxonomy | Job pairs listed; fault class rules written down |
| Technician diagnostic effort | Less time spent finding the cause | Time from dispatch to a recorded cause, per job | Same interval on prior comparable jobs, or a time study | ServiceHands and APEX case timestamps; time study where records are absent | Jobs during the pilot | Minutes per job (median and spread) | A reduction agreed at kickoff | Technician experience; job mix | Timestamps per job; time-study observations labeled observed |
| Mean time to restore service | Rooms back in use sooner | Time from a request being opened to the room confirmed usable | Same interval on prior requests | ServiceHands requests (open, verified retest) | Requests during the pilot | Hours (mean and median, with spread) | A reduction agreed at kickoff | Parts availability; out-of-hours requests; severity mix | Per-request intervals listed by severity |
| Recurring incidents | Fewer of the same incident | Incidents of the same class in the same room within 60 days | Same count for the prior period | ServiceHands requests; APEX cases | 60-day windows during the pilot | Recurrences per room per quarter | A reduction agreed at kickoff | Class definitions; occupancy changes | Recurrence pairs listed |
| Documentation completeness | Records a new person can work from | Share of required record items present and current for each room | Same scoring of prior records | Empathia room records, baselines, documents | Snapshot at start and end | Percent of required items | An increase agreed at kickoff | A changed list of required items | Independent sample scored by two people |
| Time to locate technical information | Less searching | Time for a person to find a named fact (a device's location, its switch port, its owner) in a set task | A timed task set on the customer's current tools | Observed task study; Search Party query log for context | One study before, one at the end | Seconds per task (median) | A reduction agreed at kickoff | Learning effect from repeating the tasks; task difficulty | Task list fixed in advance; observations recorded; labeled observed |
| Time to identify the right support resource | The right person sooner | Time to name the accountable person or team for a room or device in a set task | Same task on current tools | Observed task study; Search Party relationships | One study before, one at the end | Seconds per task (median) | A reduction agreed at kickoff | Organization changes during the pilot | As above |
| Operational readiness | Rooms ready for the work they host | Share of in-scope rooms with an accepted baseline, no open critical issue and every applicable test verified | Same definition read on the customer's records at kickoff | Empathia baselines, issues, tests (the "rooms at risk" definition in `apps/demo/src/campus/definitions.ts`) | Snapshot at start and end | Percent of rooms | An increase agreed at kickoff | Rooms added or retired; a stricter reading of "critical" | Room-by-room list with the record behind each state |
| Evidence completeness | Decisions resting on verified facts | Share of the values used in acceptance and service decisions that are verified rather than declared or modeled | Same share on prior decisions where they can be read | Empathia evidence labels | Decisions during the pilot | Percent of values by label | An increase in the verified share agreed at kickoff | Different decision types in the two periods | Values listed with their labels and sources |
| Workforce preparedness | People ready for the tasks they are given | Share of assigned tasks whose performer had completed the relevant reviewed lesson or SIGNAL lab beforehand, and the outcome of those tasks | The same share before Learn/SIGNAL is used | Learn and SIGNAL completions; ServiceHands outcomes | The pilot period | Percent of tasks; first-time-right rate | An increase agreed at kickoff | Selection: stronger staff may take training first | Completions and task outcomes listed; training never grants authority, so it is never used as an authorization record |

## 3. Confounders every pilot names

Seasonal load; staffing changes; a different mix of rooms or archetypes; parts and supply delays; changes to the customer's own
processes during the pilot; learning effects in repeated tasks; a changed definition (a fault class, a requirement list) between the
baseline and the pilot; the attention a pilot itself brings (people work differently while measured). The report says which occurred and
what was done about each.

## 4. What a pilot report contains

For each metric: the baseline and the pilot value with their spread and number of observations, the evidence label of each input, the
records and the query or method, the confounders observed, and one of four verdicts: *improved beyond the agreed criterion*, *changed
within the baseline's variation (no detectable change)*, *worse*, or *not measured* with the reason. Financial effects, if the customer
wishes to estimate them, are the customer's calculation from these figures and are labeled as estimates, never as savings achieved.
