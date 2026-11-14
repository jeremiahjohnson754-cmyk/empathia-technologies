# Commissioning rules engine: specification

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive. It describes the engine as built, in `packages/commissioning-engine/src/applicability.ts` and `results.ts`. The same code runs in the API and in the demonstration.

## What it does

For one room, the engine judges **every** test definition in the library:

- 33 base tests;
- 61 discipline-pack tests, in 11 packs.

The full catalogue is `COMMISSIONING_TEST_CATALOG.md`, generated from the same data. Each test comes out in exactly one of two ways.

### Applicable

The row carries `why`: every rule that selected the test. One execution state applies, the first that fits:

| State | When |
|---|---|
| `PENDING_INFORMATION` | facts the domain needs are missing; they are listed in `missing` |
| `BLOCKED_BY_PREREQUISITE` | the design is not approved |
| `REQUIRES_PHYSICAL_EXECUTION` | none of the above |

The row also names:

- the verifier role and the personas who may verify;
- the evidence kinds accepted;
- whether an instrument is needed;
- the devices of that family in the room.

### Not applicable

The row carries `justification`, the engine's reason. There are two forms:

- `no rule names it for <project type> / <room type> / <device families> / risk <risk>`
- `pack <name>: needs <the dimensions it did not match>; this room is …`

**The engine never produces a pass.** Results come only from recorded field evidence (`results.ts`), and a result is always shown as its full label (for example, "Pass · awaiting verification"), never as a bare PASS.

## How a test is selected

### Base tests

A base test is selected by the rule pack, adding the reasons in order:

1. **base**: every project;
2. **project type**;
3. **room type**, from the room's archetype;
4. **device families** present in the room;
5. **risk** level;
6. two additions carried from V2.5:
   - design conformance, when the room has devices;
   - reverberation time, for a town hall.

A test selected by several rules lists every reason.

### Discipline-pack tests

A discipline-pack test applies when every dimension it names matches the room: room types, families, tiers and risk. The dimensions it matched are its `why`. The ones it missed are its `justification`.

## Where the reasons are shown

On each room's commissioning record, **"The test plan, explained"** lists every check in the plan with its reasons, and every check left out with the engine's reason.

**Tested by:** `tests/browser/demo-plan-why.test.mjs` (PW-01..02) on two rooms. The plan and the left-out checks add up to the library. Every included check has a reason. Every left-out check carries one of the engine's two reason forms.

## Determinism and cost

The engine is deterministic: the same design always produces the same plan. Its cost is O(T) in the library size.

`packages/commissioning-engine/test/parity.test.ts` holds the engine to the V2.5.3 demonstrator's results over 92 golden cases.

## Not built

- An "explain this change" view: why a design change added or removed a given check. The engine can be run on both revisions, but the difference is not drawn.
- Policy overlays per client, such as a client adding a test to every room of a building.
