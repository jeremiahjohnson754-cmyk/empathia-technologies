# The twelve journeys, walked — Enterprise 3.0, 24 Nov 2026

Founder, 23 Nov 2026 19:22: "The next milestone should be less about adding pages and more about proving all the products work
together. Every product and workflow … walk the 12 end-to-end journeys, repair the remaining Assurance and APEX links."

## What a walk is

`tests/browser/demo-journeys.test.mjs` walks each journey of the Enterprise 3.0 text hop by hop in a real browser. A hop presses a
link or control that is on the page the hop before reached, as the role the journey names. It passes only if:

- the address changed to the expected product,
- the page is not the access page,
- the record the journey is about (the same room, job, case or request) is still on the page,
- the page does not scroll sideways, and nothing logged a console error on the way.

A hand-over to another role changes the role in the same browser, so what the first person did is what the next one finds.
J6 is two journeys (FLOW and VOICE), so there are thirteen walks; J5 and J12 are also walked on a phone (390 px).

A walk does not re-test a product's own rules. Those stay in the product's suite, named in the last column.

| Journey | Walked as | Hops | What the walk holds | The product's own rules are in |
|---|---|---|---|---|
| J1 Discover, explain, act | Product Architect | 13 | Mission Control → campus → building → room → Search Party → "camera in town halls" → one camera → the camera's room at its installed position → Assurance → back by the room row and by the browser's Back → the asset's own record | demo, demo-searchbar, demo-search-journey |
| J2 Requester → Lite → engineering | Employee → AV Operations Lead → Designer | 9 | room code → Lite → "Ask for work in this room" → request sent → the operations lead finds it in the queue → the designer opens the same room → concept → version kept and brief made → Space Optimizer proposals | demo-request, demo-request-45s, demo-lite*, demo-optimizer |
| J3 FORGE → Scouter → approved engineering | Designer → Commissioning Engineer | 7 | Lite → the room's engineering package → the author is not offered approval → Scouter and back → a second person approves → where the room is accepted | modules.test, demo-modules MD-16..21 |
| J4 Commissioning → documentation → Assurance | Commissioning Engineer | 11 | checks → traceability → deficiencies → sign-off → the documentation the room owes → its dossier → the room → Assurance → recommission (affected checks only) → baseline history → replay → back to commissioning | commissioning-engine, demo-proof, demo-docs5 |
| J5 Failure → Field Intelligence → APEX → ServiceHands → close | AV Operations Lead → Systems Engineer → Service Manager → Service Engineer → Commissioning Engineer → Executive | 13 | the room's open job → the graph → the scan → the diagnosis of the same job → APEX reads calling from VOICE → the call path → the queue → the work order → "closing does not pass a commissioning test" → the commissioning record → the executive's figure | service-engine, apex-engine, demo-servicehands |
| J6A FLOW | Systems Engineer | 4 | a switch → a room that depends on it in CallPath → back to the link → the platform map | voice.test, demo-voice VC-16 |
| J6B VOICE | UC / Voice Administrator → AV Operations Lead | 6 | VOICE → CallPath → the network hop → back → MissionProof → Assurance reads calling → the call path it was read from | voice.test, demo-voice |
| J7 PRISM and SENTINEL | AV Operations Lead | 6 | the banner → PRISM → one screen in Search Party → its room → back → ServiceHands | modules.test, demo-modules MD-01..10 |
| J8 MissionProof | AV Operations Lead | 5 | calling dependency and back → uplink dependency and back → the host room's commissioning record | voice.test, demo-voice VC-19, VC-20 |
| J9 ACCORD | AV Operations Lead | 5 | the capsule names one job → the call path → back → the commissioning record → ServiceHands, where the job is | modules.test, demo-modules MD-11..15 |
| J10 Learn / SIGNAL | Service Engineer | 6 | the job → the case file made from the room's records → the case on the clock → back → **return to the source job** → SIGNAL lists what can play → an authored episode opens | signal suites, demo-learn |
| J11 OMNIPRESENCE | Employee | 4 | a building's tag → a room → back → the platform map | modules.test, demo-modules MD-22..27 |
| J12 Executive decision | Executive | 9 | home → KPI passports → one passport → numerator, window, coverage, freshness, confidence, exclusions → **the records it counted, as links** → one record → back → decision desk → service, measured → a room behind a figure | kpi-engine, demo-service-analytics |

Result on this commit: see `tests/evidence/demo-shell/demo-journeys-*.json` and the regression summary.

## What walking found, and what was done

Each of these was a place where one product did not lead to the next for the same record.

| # | Found | Done |
|---|---|---|
| 1 | From a work order, a case under investigation, a room scan or a lesson, a person could reach the room but not the diagnosis, the scan or the proof **for the same job** | One shared "job row" (`rooms/JobJumps.tsx`, the room row's counterpart) on the work order, Investigate, the Field Intelligence scan and the Learn case file: ServiceHands, APEX, room scan, calling, commissioning, assurance, the lesson and the room, each only where the role may open it |
| 2 | The work order did not say what closing it does not do | The page states it: closing a job does not pass a commissioning test and does not change the accepted baseline |
| 3 | A camera found in Search Party led nowhere: no link to its record or its room | The asset opens its own record and its room at the position it is installed in |
| 4 | A lesson did not lead back to the job it came from (J10: "return to the source job") | The case file carries the job row of its source job |
| 5 | A KPI passport listed the records it counted as plain text (J12: "every KPI links to records") | Each record is a link to the first place it is kept that the reader may open; a reader kept out of service records by the policy (an executive) is taken to the room the job was in, and the link says so; an identifier with no page stays text |
| 6 | Commissioning sign-off did not lead to the documentation gate | Sign-off of the room whose deliverables are tracked links to its documentation and its dossier |
| 7 | FORGE and Lite did not lead to each other, and FORGE did not lead to Scouter (J3) | Lite's engineer view opens the room's package; the package opens Scouter, the design it was compiled from, and where the room is accepted |
| 8 | Assurance and APEX did not show calling | Assurance reads the room's calling from VOICE and links to the call path; APEX shows VOICE's reading beside its hypotheses and links to VOICE and FLOW. Neither stores a copy, and neither calls an unverified repair fixed |
| 9 | **An employee who scanned a room's code was offered a link to a page that refuses employees** | The link now opens the room in Lite for anyone the campus room is not open to |
| 10 | **An executive was offered commissioning records and service jobs from the service figures, and got the access page** | Each cell links to the first place the reader may open, and is text otherwise |
| 11 | **An executive who chose "check a device" in the request wizard was handed to Scouter, which is not open to executives** (found when the guard below closed the link and `demo-request` RQ-19 noticed; that check had read the link's address without opening it) | The wizard says the tool is not open to that role and offers the ordinary request for the same room. RQ-19 now holds that, and RQ-19b that the hand-off still opens Scouter for a designer |

## No page offers a role a link it may not open

Findings 9 and 10 were the same defect, so it was looked for everywhere: 977 pages were opened as all seventeen roles (two levels
of links from each role's home, one exemplar per kind of address). **29 kinds of link led to the access page**, on about a dozen
pages. Most were on pages served at more than one address (a V2.5.3 address that loads another product's screen keeps that
screen's links), or in tables and breadcrumbs written before the rule "absent, not disabled" was applied to rows of actions.

`apps/demo/src/shell/linkGuard.ts` now holds the rule for every page: in the page body, an in-app link whose address this role
may not open stops being a link. An action is hidden, like any other action the role does not have. A record's name or identifier
keeps its text and loses only the link, so nothing the person was shown disappears. An unknown address is left to the 404 page.
The guard asks the router's own decision in advance; it grants nothing.

`tests/browser/demo-links.test.mjs` holds it: the 29 cases as found (17 role and page pairs), a walk of every kind of link each of
those pages still offers, that closed information keeps its text and closed actions are not shown, and that switching role on the
same page gives the links back without a reload.

Not covered: links deeper than two levels from a role's home were not audited, though the guard applies to them. A page served at a
V2.5.3 address by another product's screen can still read oddly for a role that may open the address but not the product (for
example `#/service/fixes` shows the dispatch board to a Service Engineer, who may read it but not open a job). That is a question
of what those addresses should show, not of links, and is not changed here.
