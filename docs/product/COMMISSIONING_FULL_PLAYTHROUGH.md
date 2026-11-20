# Commissioning: the five reference journeys

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive (§24).

## Where to see them

The five journeys are on **`#/commissioning/scenarios`**, built by `apps/demo/src/campus/scenarios.ts`. Each journey runs from Request to Assurance in thirteen stages:

1. Request
2. Design intent
3. Device inventory
4. Generated checklist
5. Test execution
6. Measurement
7. Evidence
8. Deficiency
9. Repair
10. Retest
11. Documentation
12. Acceptance
13. Assurance

Every stage is **read from the room's own record**; nothing is typed for the scenario. Each stage states one of five things:

- done;
- in progress;
- blocked;
- not reached;
- does not apply.

Each stage links to where the record shows it. Each journey also lists what the system detected and what it blocks.

## The five journeys

The rooms are synthetic, and each is the closest one on the estate to its brief. The page states how each differs from its brief and never claims an exact match.

| | Brief | Room | The failure on its record |
|---|---|---|---|
| A | Enterprise Teams room | R-MER-1-140, collaboration room, 12 people | an open deficiency after acceptance (in service) |
| B | Executive boardroom | R-ATL-7-410, boardroom, 22 people | an open deficiency |
| C | University lecture hall | R-BCN-3-225, training room under a high open ceiling | speech intelligibility below the room standard (High). A failed check and acceptance blocked |
| D | Commentary and broadcast | R-WMR-2-120, a studio (clinical simulation theatre), not a stadium | an open deficiency; commissioning not complete |
| E | Divisible ballroom | R-BCN-1-300, divisible room A+B+C, 220 people | the combined configuration not yet commissioned. Acceptance blocked |

## How each stage is read

| Stage | Read from |
|---|---|
| Request | The decision desk's project for the room, or "delivered under the estate programme" when there is none. |
| Design intent | The archetype, capacity and stated use. |
| Device inventory | The positions, installed units and retired units. |
| Generated checklist | The checks the engine put in the plan, each with its reason (`COMMISSIONING_RULES_ENGINE_SPEC.md`). |
| Test execution | The checks run. |
| Measurement | The instrument checks measured. |
| Evidence | The results that carry evidence. |
| Deficiency | Open and resolved issues, and failed checks. |
| Repair | The service jobs on the room. |
| Retest | The tests reopened by a replacement, and the failed checks waiting for a retest. |
| Documentation | The completion package, which exports in six formats from the record. |
| Acceptance | The lifecycle, and the three reasons acceptance is blocked. |
| Assurance | The current baseline. |

## Tests

`tests/browser/demo-scenarios.test.mjs` (SC-01..04) checks:

- five scenarios of thirteen stages;
- each states how close its room is to its brief;
- each holds a detected failure;
- a room not yet accepted has acceptance blocked;
- the stages link to the record;
- there is no sideways scroll on a phone.

## Not built

- A scheduling panel in scenario A's room. Its record has none.
- A stadium commentary room on the estate.
- Live repair and retest *within* the scenario page. The deficiency workbench (`#/commissioning/deficiencies`) and the room pages are where those steps are taken.
