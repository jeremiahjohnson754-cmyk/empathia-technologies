# Empathia Pro parity and enhancement register (#319, Pro directive Phase 1)

Date: 2026-11-27. Compared: V2.5.3 live1 HTML (private reference); apps/demo Pro at 00c60a0e.

Not compared yet: the offline edition (not in this environment); Founder Studio Pro material (not yet read for this register); the E3 preview, which serves the same Pro pages as the commit it was built from (6d07d39b); not inspected separately.

Method: V2.5.3: the strings and routes of its Pro views, read from the file. Current: the page source and a search of apps/demo/src for each capability. A capability is called missing only when both searches agree.

The full register, with every field the directive asks for (data dependencies, navigation depth, cross-product links, authorization, evidence, performance, acceptance and tests), is `PRO_PARITY_REGISTER.json` beside this file. The V2.5.3 file is a private reference and is never committed; its locations are character offsets in it.

## Summary

| Classification | Capabilities |
|---|---|
| Partially restored | 12 |
| Missing | 9 |
| Preserved | 5 |
| Improved | 2 |
| Simplified | 2 |
| New enhancement | 2 |
| Not yet verifiable | 1 |

## Register

| ID | Area | Capability | Classification | Current route | Recommended action |
|---|---|---|---|---|---|
| PRO-CC-01 | Command Center | Open issues, past their target, rooms that need action | Preserved | #/pro | keep; replace "devices on record" only once an online state exists (PRO-AS-09) |
| PRO-CC-02 | Command Center | Devices offline | Missing | none | add a synthetic, labelled device state to the canonical model (additive), then the tile with its records |
| PRO-CC-03 | Command Center | Working now, most overdue first | Not yet verifiable | #/pro | verify the sort is most overdue first; state it in the subtitle |
| PRO-CC-04 | Command Center | Escalated and waiting | Partially restored | #/control/tower?view=incident | add the list to the command center, counted from the same records as the Tower |
| PRO-CC-05 | Command Center | Go deeper: the six Pro workspaces | Preserved | #/pro/* | keep |
| PRO-AS-01 | Asset Intelligence | Population and identity | Improved | #/pro/assets | keep; it goes beyond the original (identity states) |
| PRO-AS-02 | Asset Intelligence | Health by building | Preserved | #/pro/assets | keep |
| PRO-AS-03 | Asset Intelligence | Firmware posture: on, behind, not validated | Missing | none | add device standards with baselines and installed versions to the synthetic model, then the posture with its records |
| PRO-AS-04 | Asset Intelligence | Lifecycle status by support end date | Missing | #/pro/refresh | add support end dates to device standards; show status and link to refresh planning |
| PRO-AS-05 | Asset Intelligence | Refresh forecast: devices by the year support ends | Simplified | #/pro/refresh | fold the forecast into refresh planning once support end dates exist |
| PRO-AS-06 | Asset Intelligence | Warranty | Missing | none | add warranty ends to installations; show in force, ending, lapsed |
| PRO-AS-07 | Asset Intelligence | Documentation health and standards alignment | Partially restored | #/pro/assets | add standards alignment once device standards exist (PRO-EN-01) |
| PRO-AS-08 | Asset Intelligence | Drill: campus, building, floor, room, device | Partially restored | #/pro/assets?building= | add floor and room levels as drill state in the address |
| PRO-AS-09 | Asset Intelligence | Service on units by month | New enhancement | #/pro/assets | keep |
| PRO-IS-01 | Issue Intelligence | KPI row: open, past target, mean time to resolve, resolved inside target, came back, escalated still open | Partially restored | #/pro/issues | add past target, MTTR, inside target and escalated with an evidence sheet per tile |
| PRO-IS-02 | Issue Intelligence | Severity and time to resolve against the target | Missing | none | add from the same history as Service analytics |
| PRO-IS-03 | Issue Intelligence | Aging and incidents opened each month, resolved and open | Partially restored | #/pro/issues | add the resolved and open split and an aging view |
| PRO-IS-04 | Issue Intelligence | Patterns, systemic problems, recommended standards changes | Missing | #/pro/issues, #/v25/apex | model IssuePattern and SystemicProblem; restore the chain with an approval that is recorded |
| PRO-IS-05 | Issue Intelligence | Failure heatmap: building by technical domain | Improved | #/pro/issues | add the domain dimension as a heat grid beside the map |
| PRO-IS-06 | Issue Intelligence | Device failure trends by device category | Missing | none | add from incidents naming a unit |
| PRO-IS-07 | Issue Intelligence | Room risk: lost health, criticality, repeat faults, standards gaps | Simplified | #/pro/issues | add a room risk rule with its parts, reusing roomHealth |
| PRO-IS-08 | Issue Intelligence | Vendor and service trends | Partially restored | #/v25/service/analytics | add a vendor view joining population and issues |
| PRO-IS-09 | Issue Intelligence | Known fixes and root causes as reusable knowledge | Partially restored | none | model KnownFix and RootCause in the core; add the views |
| PRO-OP-01 | Operations Hub | Knowledge cards: SOPs, known fixes, troubleshooting, lessons, escalation paths, playbooks, ownership, documents; filter by symptom, device or word | Missing | #/pro/ops | add the card library beside the current capacity view (both are kept) |
| PRO-OP-02 | Operations Hub | Capacity, certifications, stock, work windows, SLA by month | New enhancement | #/pro/ops | keep |
| PRO-EN-01 | Standards and Engineering | Device standards: approved model, firmware baseline, service life | Missing | none | add device standards (feeds PRO-AS-03, -04, -07) |
| PRO-EN-02 | Standards and Engineering | Room archetypes and their templates, conformance | Preserved | #/pro/eng | add the archetype page |
| PRO-EN-03 | Standards and Engineering | Room packages with planning cost; approved technology stacks | Partially restored | #/forge | surface them on the standards page from the same model |
| PRO-EN-04 | Standards and Engineering | Signal flows, rack views, network topologies | Partially restored | #/flow, Lite | link from Pro to the existing views with the archetype in context |
| PRO-EN-05 | Standards and Engineering | Bills of materials, as-builts and their currency, successful room builds | Partially restored | #/forge | add as-built currency and successful builds to the standards page |
| PRO-EN-06 | Standards and Engineering | Standards governance: owners, reviews, drift, proposed changes | Partially restored | #/manual | add governance views on one standards model |
| PRO-EX-01 | Executive Intelligence | Six questions answered from the model, each with the records behind it | Partially restored | #/v25/exec (alias #/pro/exec) | add the six questions on top of the passports (both kept) |
| PRO-RG-01 | Registers | Device and room registers | Preserved | #/pro/registry | keep |

## What this says, in short

The current Pro keeps V2.5.3's six workspaces and goes further on asset identity, the campus map lenses, service history and the people and parts behind operations. What it lacks is the engineering knowledge layer: device standards with firmware baselines and support dates, the issue pattern to systemic problem to standards change chain, the operational knowledge cards and the executive six questions. Most of those need records the canonical model does not hold yet, so restoring them starts with additive, labelled synthetic data, then the views, each tested against its records.

Order proposed for Phase 3 (the five flagship workspaces): device standards and lifecycle data first (PRO-EN-01, PRO-AS-03/04/06), then Issue Intelligence KPIs and patterns (PRO-IS-01/04), then Executive six questions (PRO-EX-01), then the Operations Hub knowledge cards (PRO-OP-01).
