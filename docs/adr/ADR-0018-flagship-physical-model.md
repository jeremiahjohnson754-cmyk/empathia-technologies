# ADR-0018 · The lecture theatre's physical model, and what building it showed

Date: 18 Nov 2026 · Status: accepted · Migration: none · Tests: `tests/security/flagship-model.test.mjs` FM-01…05;
`packages/commissioning-engine/test/design.test.ts` (capacity); `tests/browser/demo-flagship.test.mjs`

Founder, 17 Nov 2026, 19:05: "enrich SCI-110's physical model."

## What was wrong

Lecture Theatre SCI-110 was the auditorium template as it comes: nine devices and two seating blocks, in a room said to seat 180.
The template is the demonstrator's (a 300-seat hall, held by hash) and is not edited. So the room had twelve seats on its plan,
one camera, two loudspeakers for twenty metres of depth, and every ceiling device at 2.7 m under a 6.5 m ceiling.

## Decision

1. **The theatre's own equipment and seating are added by its designer, through the route anyone would use**
   (`POST /v1/rooms/{room}/devices`), in the sandbox's scenario, before the drawings are generated and the design approved
   (`FLAGSHIP_MODEL`, `services/enterprise-api/src/domain/demo.ts`). The design checks, the proposed connections, the commissioning
   plan, the register and the approved revision all see them. Nothing is written round the API.
   - seating: thirty blocks of six in ten rows of three, two aisles. 180 seats, the room's stated occupancy (FM-01 adds them up);
   - display: a relay display on each side wall at mid-depth and a confidence display on the rear wall, with the LED wall;
   - cameras: an audience camera at the front and a second presenter camera at the rear, with the template's;
   - microphones: four suspended over the seating, one at the lectern, with the wireless system;
   - loudspeakers: six more in three pairs down the room: eight;
   - equipment: a second amplifier, a control processor, a video switcher, a stream encoder, a second network switch, a power
     distribution unit, the rack;
   - control: a touch panel beside the lectern, a scheduling panel by the door, an occupancy sensor, the lighting control.
   Thirty-six devices and 92 applicable tests, as measured on a new sandbox (it was nine devices and 77 applicable tests). Every device is a class of device, generic.
2. **A device has a height.** `z` on `POST` and `PATCH /v1/rooms/{room}/devices`: metres above the floor, between 0 and the room's
   ceiling, or refused. Without it the category's usual height is used, as before. Changing it is a move, under the same rule as
   any move: a draft only, by the designer (FM-04).
3. **The room view gives each position its footprint** from the catalogue, and the page draws furniture at that size, so thirty
   seating blocks read as rows.
4. **A display test names the displays** — on the server. The catalogue files "Display picture settings and calibration" and
   "EDID / HDCP handshake" under Video, whose usual family is the camera. In a room with both, they named the cameras and left
   every display with no test. The engine keeps the demonstrator's behaviour on the demonstrator's catalogue (its parity tests pin
   it); the server compiles from `enterpriseCatalog`, which is that catalogue with this correction listed in one place
   (`packages/commissioning-engine/src/catalog.ts`).
5. **Proposed connections respect capacity** — in the shared engine. The rule was "the first switch" and "the first amplifier"
   whatever they already carried: the theatre's eight loudspeakers were all proposed on one four-channel amplifier with the second
   idle, and twenty-six devices on one 24-port switch with the second unconnected. Now a networked device goes to the first switch
   with a free port, a further switch uplinks to the first, and a loudspeaker goes to the first amplifier with a free channel;
   when none has room it is the first, as before. A room with one switch and one amplifier is proposed exactly as it was: the
   fifteen parity cases against the demonstrator are unchanged.
6. **A device's target on the plan is as large as its neighbours allow** (half the distance to the nearest device, between 0.5 m
   and 1.1 m), and furniture is drawn under the equipment. With equipment a metre apart along a wall, the fixed target put each
   device under its neighbour's and a press chose the neighbour.

## Consequences

- A sandbox takes longer to open: each added position is a request that re-runs the design checks. Measured here: about 0.5 s
  before, about 1.8 s now. Not yet measured on the staging instance.
- The register is 36 units and there are 15 more tests to record and verify. The page still sends one request each, in order.
- Build a Room in the browser (not a server page) still names cameras for the two display tests: it runs the demonstrator's
  catalogue. The server is the record.

## Not decided here, and known limits

- **The rake is not modelled.** Geometry is an outline and a ceiling height. `z` is a height above the flat floor of the plan.
- **Heights and positions are a plausible synthetic design**, not a design for any real room, and no coverage, sightline or
  intelligibility calculation stands behind them beyond the design checks the server already runs.
- **Seat spacing is the catalogue's block** (six seats in 2.4 m). No wheelchair positions are drawn; the room's description
  mentions six.
- No assistive-listening device, projector or lecture-capture appliance: the catalogue has no category for the first, and the room
  does not need the second.
- The video switcher and the encoder are named by no test's devices: the catalogue has no device family for them.
