# V2.5.3 Lite and Campus — function-level no-loss check, first pass (10 November 2026)

How this was made: the three V2.5.3 files the founder supplied were read as text (never executed) and searched for the functions and
controls that make up Lite and Campus; the current demonstration's source was then searched for each. **It is a name-and-source
check, not a behavioural comparison**: "present" means a matching screen exists and is tested, not that it has been compared click
for click with V2.5.3. That comparison is step 1 of the Lite and Campus task.

## The three files

| File | Size | SHA-256 (first 16) | Note |
|---|---:|---|---|
| offline | 6,957,206 | `ecbde0bba17eafc9` | Identical to the offline file supplied on 9 November |
| live | 6,957,191 | `9d6e53ef9f5a4e79` | 15 bytes shorter than offline |
| engineer-private | 6,957,389 | `604cc7486e4a63a2` | 183 bytes longer; 13 more mentions of "engineer". Private: read for parity only, nothing from it is committed |

All three carry the same Lite and Campus code by every count taken (3D renderer references, orbit and rotation, isometric campus,
zoom, wayfinding, layers and overlays, camera view, microphone pickup, loudspeaker coverage, floors, inspector, the five modes).

## V2.5.3 view by view

| V2.5.3 function | What it is | Today | Evidence or gap |
|---|---|---|---|
| `viewLiteHome`, `liteCampusScene`, `viewCampus` | Campus scene with extruded buildings | PRESENT `#/lite`, `#/campus` | `tests/browser/demo-lite.test.mjs`, `demo-campus` |
| `viewLiteBuilding`, `viewLiteFloor` | Building and floor browsing | PRESENT `#/lite/b/<B>[/<floor>]` | demo-lite |
| `viewLiteRoom` | Interactive 3D room: orbit, tilt, plan, zoom, drag; layers, overlays, four states, lens by mode | PRESENT `#/lite/room/<id>` | demo-lite (41 checks × 3 viewports × 2 schemes) |
| `applyLiteOverlay`, measures panel (`lite-meas`) | Coverage overlays and seat counts | PRESENT | `tests/unit/demo-lite.test.mjs` |
| `viewLiteSpace`, `viewLiteServices` | The 14 spaces, each in 3D | PRESENT `#/lite/space/<id>`, `#/lite/services` | demo-lite |
| `viewLiteWay` | Wayfinding | PRESENT `#/lite/way?to=` (45 rooms, 14 places) | demo-lite. Routes are by building distance and floor, not a path graph |
| `viewLiteVisit` | Ten-step visitor journey | PRESENT `#/lite/visit` | demo-lite |
| `viewLiteQr` | QR types | PRESENT `#/lite/qr` | demo-lite |
| `viewLiteGuides` | Guides and chapters | PRESENT `#/lite/guides` | demo-lite |
| Modes: engineer, room user, visitor, employee, executive (and operations) | The same room read through each mode | PRESENT as lenses from the V2.5.3 policy | demo-lite, D44 checks |
| `engLiteZone`, `comLiteZone`, `ctlLiteZone`, `assureLiteZone` | Engineering, commissioning, control and assurance panels inside the room page | PRESENT IN PART as the lens panel | Not compared panel by panel |
| `agentLiteZone` | Field agent checks inside the room page | **NOT FOUND** in Lite | Field Intelligence has its own pages; the in-room panel is not there |
| `actLiteEdit`, in-room palette (`lite-pal`) | Placing and moving things in the room from a palette | **NOT FOUND** | This is the root of Showroom Builder |
| `actLitePropose`, `actLiteDrift`, `actLiteCheck` | Saving a proposal, marking drift, ticking checks on a room | PRESENT IN PART (Proposed and Current states are computed) | A visitor cannot yet save their own proposal or mark drift |
| `v25LiteStudio`, `v25LiteCreate`, `v25LiteAdd`, `v25LiteMove`, `v25LiteCorrect`, `v25LiteGeometry`, `v25LiteSvg` | Lite Studio: a conceptual model with its uncertainty, editable | PRESENT IN PART: `#/studio` "Design a Space" (a concept from a template or a real room, its plan and objects, judged by the planning rules, saved in this browser) | Objects can be moved; there is no drag on the plan, no undo or redo, and it has not been compared function by function with the V2.5.3 studio |
| `v25LiteVariant` | A variant of a model, with a required reason | **NOT FOUND** | |
| `v25LitePredict` | Predicted coverage from placements | PRESENT IN PART | The Space Optimizer and the Lite overlays compute coverage; not from a visitor's own placements |
| `v25LiteReconcile` | Reconciling model against field record, decision with a reason | **NOT FOUND** | |
| `v25FiToLite`, `v25LiteToFi` | Hand-offs between Field Intelligence and Lite | **NOT FOUND** | |
| X-ray (`lite-xray`), scenario (`lite-scen`), signal (`lite-signal`), state thread (`lite-thread`) | In-room toggles | Scenario, signal layer and states PRESENT; **X-ray NOT FOUND** | |

## What this means for the task

Lite's browsing, the 3D room, the spaces, wayfinding, visit, QR, guides and the modes came across on 4 November. What came across only in part is Lite as a place to *make* things: a studio exists (`#/studio`) but without drag, undo, variants
or reconciliation, and the in-room palette and the hand-offs with Field Intelligence are absent. Those are exactly what Showroom Builder and "surpass V2.5.3" need, so they are built first, on the shared
estate model so that all four worlds get them.
