# Empathia Lite and its spatial tools: inventory of V2.5.3, reconciled against the product

**State: first pass, restoration under way (12 Nov: X-ray and measurements, object inspector, change the room).** The source's functions are listed in full for this area; each product line says whether it was verified in
code or still has to be. Nothing is restored by this document, and Lite is **not complete**. Started 11 November 2026 on the founder's
instruction of 17:06 ("Perform the same inventory for Empathia Lite, including spatial navigation, Room Builder, Scouter, design
optimization, camera coverage, acoustics, current/proposed comparisons, asset relationships, and digital-twin functionality").

The earlier inventory (`docs/parity/LITE_INVENTORY.md`, 4 November) lists what the rebuilt Lite holds. This page starts from the other
end: what V2.5.3 does, function by function, and whether the product does it.

## 1. The source

| | |
|---|---|
| File | `Empathia-Living-Campus-V2.5.3-live2.html`, 6,957,191 bytes, SHA-256 `9d6e53ef…`. Byte-identical to the live edition already held at `legacy/source/v253/` (not in version control) |
| How it was read | As text, with `python3 -I`. Not opened in a browser; no script in it was run |
| Size of the application | 1,987 named functions; 344 distinct addresses, of which 40 begin `#/lite`, 9 `#/scouter`, 7 `#/builder`, 4 `#/studio` |
| In this area | 72 functions named for Lite, 18 for Scouter, about 80 for the room builders and the studio, 30 for layouts and proposals, 13 for coverage, 17 for acoustics, 61 for states, baselines and comparison |

## 2. Spatial navigation

| V2.5.3 | In the product | State |
|---|---|---|
| Campus scene in 3D with the visitor's path from parking | `#/lite` campus scene, lenses | RESTORED (earlier inventory; `demo-lite` browser suite). TO VERIFY the visitor path |
| Building and floor scenes: floor selector, lifts and stairs, "you are here", network closet, health from Core, simulated availability | `#/lite/b/<building>/<floor>` | RESTORED. TO VERIFY: lifts and stairs, "you are here", simulated booking on the floor |
| Eight home storylines, one per room ("watch the cones swing between states", "follow the network layer to the shared switch" …) | Explore tiles on Lite home | **VERIFIED 12 Nov, NOT CARRIED, deliberately.** The eight are in V2.5.3's `viewLiteHome` (`STORY`), each a line about a state of one room's V2.5.3 data: presets moved after handover (R-ATL-4-218), heat and dust failing a display (R-FRG-1-104), three devices losing link at one switch (R-MER-2-305), firmware drift (R-HZN-2-215) and four more. The rebuilt records for those rooms do not hold those states, so the lines would describe what the rooms do not show. They can return with the states they describe |
| Wayfinding: destination search, quick jumps, step-free or stairs or lifts, start of route | `#/lite/way` | RESTORED. **Verified 12 Nov:** every route is step-free (the step-free entrance, then the lifts); V2.5.3's choice of stairs is not offered, so a route never sends anyone up a stair |
| Visitor check-in, ten steps, badge | `#/lite/visit` | RESTORED |
| Services, spaces, the Commons in five scenes, guides, QR launch centre | `#/lite/services`, `/space`, `/commons`, `/guides`, `/qr` | RESTORED |

## 3. The room as a digital twin

| V2.5.3 | In the product | State |
|---|---|---|
| Interactive 3D room: orbit, tilt, plan, zoom | `#/lite/room/<id>` | RESTORED |
| Layers (8) and states (Designed, Commissioned, Current, Proposed) | Layers and states on the room | RESTORED, tested. TO VERIFY state-by-state against the source's four |
| Six lenses, including Optimize | Six lenses (`lite/model.ts`) | RESTORED as lenses; the Optimize lens is reduced (next table) |
| **X-ray views: Measurement, Camera view, Microphone capture, Loudspeaker coverage, Sightlines, Signal flow**, with a measurements panel (seats in primary microphone pickup, rear-row speech intelligibility at the lowest seat, reverberation time, background noise, seats inside a camera preset, seats inside loudspeaker coverage, clear display sightlines, floor area) | Since 12 Nov: an X-ray group in the room (Signal flow: AV, network and control together with overlays off; Measurements), a sixth overlay **Sightlines** on V2.5.3's classes (more than 60° off axis or blocked by a lectern: obstructed; more than 45° or beyond six image heights: marginal) with one ray per seat, and the measurements panel's eight rows, modeled figures labelled modeled. Intelligibility, reverberation and background noise say "Not modeled here · no measurement on record": these rooms carry no acoustic data and this build has no acoustic model | **RESTORED 12 Nov except the acoustic figures** (unit tested; browser checks LT-X1..X5) |
| Object inspector: tap an object for its card (what this is, who it is for, how to use it, support path, technical purpose, what is inside, signal and data flow, catalogue figures, room standard, commissioning, assurance, troubleshooting, related guide) | Since 12 Nov the six facts are followed by V2.5.3's object card, carried word for word (`lite/data/objectCards.ts`): what this is, who it is for, how to use it, common issues and any open on the position, support path, learn more; for the engineer and optimize lenses its technical purpose, signal and data flow, modeled coverage and engineering chapter. Not carried: catalogue figures, room standard, commissioning and assurance rows, and the DOC-* references (not part of this product) | **RESTORED 12 Nov, about 11 of 15 sections** (browser check LT-X6) |
| Acoustic effect in the scene ("calculated" against "in the design") | not found | **MISSING** (TO VERIFY) |
| Asset relationships drawn in the scene: belongs to, connects to (the floor switch), has device, powered from (the floor panel), obstructed | Network and power layers | TO VERIFY each relationship |
| Divisible rooms and their configurations | Present | RESTORED, tested |
| "3D twin / Photo" toggle | not built: no photographs exist, none invented | NOT BUILT, by decision of 4 November |

## 4. Design optimisation in the room

| V2.5.3 | In the product | State |
|---|---|---|
| **Optimize panel in the room**: select an object; move it in 25-centimetre steps toward the display, left, right, or the back wall (a button for every move, no dragging needed); one seat more or fewer; modelled score bars with a tick for the current layout; "show in the room"; a rough-order-of-magnitude estimate; "AI assisted, engineer approval required" | The Optimize lens keeps its current-against-proposed table and, since 12 Nov, "Change the room": pick a camera, video bar, microphone, loudspeaker, lectern or table and move it in 25 cm steps with buttons; one seat more or fewer; five modeled scores with the current layout's tick, never added together; back to the current layout; send the layout to engineering as a change request. Not carried: turning (cameras aim themselves in this model), display size, room use, camera candidates, options A–C and the rough-order-of-magnitude estimate | **PARTIAL 12 Nov** (unit tested; browser checks LT-X8..X10) |
| Reconfigure and send: the Lite spatial model run on the current layout and again with the changes; "sent for engineering review", becoming a recommendation in Core and in Budget; undo | not found | **MISSING** (TO VERIFY) |
| Drift from baseline: a layout change applied as an overlay ("table moved toward the door"), an assurance check raised, "restored to the commissioned layout", recommission | not found in Lite | **MISSING** (TO VERIFY against Assurance) |
| **Optimize workspace**: Portfolio Optimize (every room ranked by the size of its best small move, with certainty), Quick Optimize, Room Optimize with baseline, scenarios and compare, undo and redo, edit conflicts, simulate, approve a published scenario, the learning loop, energy and incident assumptions by id | Space Optimizer (`#/optimizer/<world>`): one room, three ways to equip it, nine dimensions, modelled. No portfolio ranking, scenarios, undo or learning loop | **PARTIAL**: a different, smaller tool (verified in `optimizer/engine.ts`) |

## 5. Lite studio (V2.5.3 `#/v25/lite`)

| V2.5.3 | In the product | State |
|---|---|---|
| **Lite models**: a new model from a campus room, from a project request with its photographs and dimensions, or from an archetype for a room that does not exist yet | none: `#/v25/lite` opens Lite's home | **MISSING** (verified in `registry.parity.ts`) |
| Geometry with provenance: each dimension with its source (archetype, extracted from a model, inferred from a photograph, observed in the field, an engineer's approved target), its state and its uncertainty | Instant Room (`#/instant`, built 11 November) records how each dimension was found. It is a separate tool, not this one | **MISSING as built; a partial analogue exists** |
| Predicted coverage from the plan, labelled a prediction | | **MISSING** |
| Add, move and correct objects; variants of a model | | **MISSING** |
| Reconcile a model with Field Intelligence observations; send test protocols to Field Intelligence (noise at the seats, intelligibility, reverberation, field of view); what is and is not claimed about device capabilities | | **MISSING** |
| Export the plan as SVG; review states | | **MISSING** |

## 6. Room builders

V2.5.3 has three: Build a Room on the commissioning engine (`#/v25/build`), the Room Builder (`#/builder`) and Design a Space
(`#/studio`). In the product `#/builder` opens Build a Room.

| V2.5.3 | In the product | State |
|---|---|---|
| Build a Room: create from a template or dimensions; add and remove devices; save a revision; classify and approve the classification; design checks; applicable tests; drawings and their approval; lifecycle transitions; record and verify results; baselines and their difference; ledger | `#/v25/build` (`build/BuildRoom.tsx`, `build/store.ts`) | RESTORED, tested on the shared engine |
| Build a Room: **move, swap and duplicate a device; undo; join rooms; automatic connections and editing a connection; polygon outlines and confirming scale; import a record; compare revisions; redline a drawing; the workbook export (sheets); issues, assigning them, commissioning issues and retests; faults; work orders; APEX hand-off** | not found in `build/store.ts` (it exports create, add, remove, save revision, approve classification, approve drawing, transition, record, verify) | **PARTIAL: about fifteen functions MISSING** (TO VERIFY each; some live elsewhere, for instance work orders in ServiceHands) |
| Room Builder (`#/builder`): home, threads, a plan, scores, edits; a run with simulate, safety, sign-off and halt | The address opens Build a Room | **MISSING as its own tool** (TO VERIFY what it added over Build a Room) |
| Design a Space (`#/studio`): start from a template or a room; add kinds of object; select; move toward, move away, aim at; measures; inspector; findings; hand-offs; rehearsal; versions (snapshot, commit, apply, merge); import, export, download; the plan as an image | `#/studio` (`parity/Studio.tsx`): start, an editor, planning rules judged | **PARTIAL** (TO VERIFY: aim, rehearsal, versions, hand-offs, export and import) |

## 7. Scouter

| V2.5.3 | In the product | State |
|---|---|---|
| Find: devices a design needs, ranked for a room or for a room built from typed dimensions; reasons a candidate does not fit (no main camera position, does not fit the display wall, needs switch capacity, needs a larger processor, over budget, weak central management, no pilot device in a mission-critical room) | `#/campus/scouter`: every candidate class evaluated for a room template, with checks and a verdict | PARTIAL: classes, not candidates. TO VERIFY the reasons |
| Named candidates, prices, lead times, five-year cost; nine lifecycle states; market watch; competition and evidence from the estate | Not rebuilt, and the module says so (`scouter/evaluate.ts`, `NOT_REBUILT`), because the data would have to name makers | **NOT REBUILT, by decision** (no real makers or prices) |
| **Anatomy**: an educational layered model of a device ("not a maker's disassembly instructions"; nothing opens a housing) with questions and recorded answers | not found | **MISSING** |
| Evaluations on record; verification of catalogue data and "out of date" | TO VERIFY | |
| Proposals: propose, send to engineering review, review, publish, mark stale, adopt into a room with each position's provenance; cohorts; templates | A "propose" action exists on the page | TO VERIFY the review, publish and adopt steps |

## 8. Coverage, acoustics, states and comparison

| V2.5.3 | In the product | State |
|---|---|---|
| Camera coverage and field of view; who covers a seat; coverage map | Lite coverage overlays (camera cones from the catalogue's field of view; microphone discs; loudspeaker zones over a grid; accessibility; infrastructure) | RESTORED, unit-tested (`demo-lite`) |
| Acoustics: reverberation time, an intelligibility path, the acoustic effect, an acoustic zone | Not in Lite. A measurement page in Field Intelligence mentions them | **MISSING in Lite** |
| Four states and switching between them; comparing two states; geometry and layout differences | States in Lite; `#/compare` | RESTORED. TO VERIFY geometry and layout difference views |
| Baselines: snapshot, versions, propose, accept, compare | Build a Room baselines and their difference; Assurance | TO VERIFY proposal and acceptance |
| Rough-order-of-magnitude comparison | `#/compare` carries the wording | TO VERIFY |

## 9. What restoration means here, in order

1. Verify every TO VERIFY line against the source's behaviour, starting with the room: the Optimize lens, the inspector's sections,
   the relationships drawn, the eight home storylines.
2. The X-ray views and the measurements panel, including the signal-flow view and the acoustic figures, each labelled modelled.
3. The Optimize panel in the room: moves by button, seats, score bars against the current layout, send for review, undo; then drift
   and recommissioning.
4. Lite studio at `#/v25/lite`, joined to Instant Room rather than duplicating it.
5. The Build a Room functions that are missing; Design a Space; Scouter's anatomy and its proposal flow.
6. The Optimize workspace: portfolio, scenarios, compare, undo and redo, the learning loop.
7. A functional and a visual test for each, in both themes, at desktop and phone width.

## 10. Limits

- The source was read, not run; what a function does is inferred from its name, its size and the labels it shows. Lines marked
  TO VERIFY have not been checked against behaviour.
- Named makes, models and prices in V2.5.3's Scouter are not carried by decision; that is recorded, not hidden.
- No reference screenshots of V2.5.3's Lite were supplied with it, unlike SIGNAL. Its look can be captured only through the offline,
  all-requests-blocked capture, which has not been run for this pass.
