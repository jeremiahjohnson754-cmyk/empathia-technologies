# Commissioning, Assurance and APEX against V2.5.3

**State on 13 November 2026: in progress.** The founder asked on 13 November that these three products match V2.5.3 and go beyond it.
This page compares them section by section. V2.5.3 was rendered offline with every network request blocked. Its text was captured
for each page, and the side-by-side images are kept with the private baseline (`legacy/baseline/`, ignored by git).

Each row is marked with one of these:

- **MATCHED**: V2.5.3's section is present and does the same job.
- **SURPASSED**: present, and it does more. The extra is named.
- **PARTIAL**: present in part. The gap is stated.
- **NOT CARRIED**: absent, with the reason.

The browser suite `demo-assurance-v253` covers these pages on desktop and on a phone (39 checks). It includes a visitor being refused.
The unit test `assurance-model` covers the rules (6 tests). The room pages are covered by `demo-cx-as-rooms`.

## Assurance command center (`#/assurance`)

| V2.5.3 | Here | State |
|---|---|---|
| Hero sentence; five measures | The same sentence and five measures. The ready measure counts high and mission-critical rooms. | MATCHED |
| Needs attention | The same list (failed rooms first), plus the rule for each state | SURPASSED |
| Which way it is moving (assurance runs over four weeks) | A weekly run of every room with a baseline, over four weeks. Each run finds what the record held that day, so an issue opened on 23 October shows from that week on. The schedule is modelled and the page says so. | MATCHED |
| What the findings call for: four remedies with a ROM each | The same four remedies, priced with V2.5.3's eighteen-component cost model at V2.5.3's rates and catalog ranges. Each remedy opens to its rooms, each priced. The estimate opens to its eighteen components. It is labelled "ROM estimate · not a quote". | SURPASSED |
| What to open next | Ready checks, recommissioning (it opens the first room's seven-step recommission), the planned changes and the early signals | MATCHED |
| Room Health Check and coverage | Rooms with a device fault, the seats in them, and the seats in rooms with layout drift. All are counted from the faults on record. V2.5.3's agent health-check feed is not carried. | PARTIAL |
| Design reviews (rule DR-70) | A score from the engine's own design checks. A room is reviewed under 70 or when a high check fails. The rule is shown. V2.5.3's CF-01…CF-08 rule set is not carried. | PARTIAL |
| (not in V2.5.3) | Where the estate stands (donut), and the estate by building | SURPASSED |

## Ready checks (`#/assurance/ready`)

| V2.5.3 | Here | State |
|---|---|---|
| Eleven checks for each high and mission-critical room; one answer per room | The same eleven checks and three answers. Criticality comes from the room type, and the rule is shown. A check for equipment the room does not have is marked "not in this room". | MATCHED |
| Next sessions, least ready first | The same list. A session comes from the workspace's bookings where the room has one; otherwise it is generated, and the page says so. The list filters by answer. | SURPASSED |
| Confidence percentage | The share of the room's applicable tests that are verified | MATCHED |
| (not in V2.5.3) | A chart of which check holds rooms back | SURPASSED |
| A room's own ready check | The eleven checks on the room's Assurance page | MATCHED |

## Change impact (`#/assurance/change`)

| V2.5.3 | Here | State |
|---|---|---|
| Changes waiting, each with its impact assessed | Seven changes from this campus's records. Each opens to its validation plan: before, window, after in waves by criticality, and how to go back. | SURPASSED |
| Simulate another change (six kinds) | The same six kinds. The target list is built from this campus (switches by building and floor, device kinds, control profiles, rooms). "Find what it reaches" gives the rooms, devices, mission-critical rooms and the plan. | MATCHED |
| (not in V2.5.3) | Replacements, the tests they reopened, and the baselines and exceptions that are waiting | SURPASSED |

## Signals (`#/assurance/signals`)

| V2.5.3 | Here | State |
|---|---|---|
| Early maintenance signals with evidence | Devices are listed only when two signs from the records point the same way. The signs are service jobs, recurrences, an open issue on the device, a replaced unit, or age against service life. Each card links to Scouter, the device card and the room in Assurance. | PARTIAL |
| What people report (six kinds) | Not carried. This campus holds no experience reports. | NOT CARRIED |

V2.5.3 stated restart counts and start-up times that it had seeded. Here no telemetry is read, so no such figure is shown, and one device
qualifies today. No failure date is predicted, as in V2.5.3.

## Commissioning deficiencies (`#/commissioning/deficiencies`)

| V2.5.3 | Here | State |
|---|---|---|
| Counts by severity | The same counts, plus how many are past target | MATCHED |
| Past the target date | Each open deficiency has a target set from the day it was found: 14, 30 or 60 days by severity. In a room not yet installed, it is due before installation. The rule is shown. | MATCHED |
| Who has to act | Integrator, internal AV or network team, each with the number past target | MATCHED |
| Phase and place in the room | The source of the finding and the room's commissioning state. The phase is not named. | PARTIAL |

## APEX (`#/v25/apex`)

| V2.5.3 | Here | State |
|---|---|---|
| A worked case on arrival | APX-001: the far-end audio fault in Atlas 4.218, with three hypotheses and its layers citing the room's planned assets. It is part of the seed and is not counted as the person's saved work. | MATCHED |
| Action tiers A0–A5 with their boundaries | The same table, always shown | MATCHED |
| (V2.5.3 offline: readable branches only) | Each tier can be tried. A4 is blocked step by step by the real adapter state. Every outcome is in the log. | SURPASSED |

## Assurance and Commissioning room pages

These are the routed `#/assurance/room/<id>` and `#/commissioning/room/<id>/<view>` pages (see the commit of 13 November). A room is
drawn in its four states with V2.5.3's own room code. Each page has cards for what has changed between commissioning and now, the room's
links across products, the eleven ready checks, the seven-step recommission and the baseline history.

## Not yet done

1. Experience reports ("What people report").
2. V2.5.3's design rule set (CF-01…CF-08) and its health-check agent feed.
3. The phase of each deficiency.
4. Live telemetry for maintenance signals. That would need a real source, so none is shown.
