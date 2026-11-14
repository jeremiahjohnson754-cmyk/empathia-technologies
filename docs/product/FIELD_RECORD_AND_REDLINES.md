# Phase 1: the field record and redlines

Status, 14 Nov 2026. The founder's request, the same day: "Phase 1 in commissioning installation teams should tell us how everything
is being mounted and have the lite design become like a bluebeam redlining document to help figure out where are things mounted hooked
up to did we change the position of a device during commissioning because of a sprinkler or something in the field … give technicians
everything they need".

## Where

`#/install/redline?room=…`. It opens from:
- a device in Lite ("Field record: how it is mounted, hooked up and where it went in");
- a room's commissioning record.

The design is drawn in neutral ink. What the installation team found and did is drawn in red: the redline layer.

## What a technician records

The model is `apps/demo/src/install/fieldRecord.ts`.

| Record | What it holds | Rules |
|---|---|---|
| Mounting | method (ceiling tile with bridge, ceiling structure, wall bracket, in-wall box, under table, rack, credenza, floor, other), height above the finished floor, fixing, backing, a secondary safety tether for overhead mountings, and a note | A method and a fixing (except floor). A height of 0–15 m. An overhead mounting says yes or no to the tether. Every write is a new version; the earlier ones stay. |
| Hooked up to | the port on the device, the other end (a device of the room, the building network, a power circuit, another room or rack), its port and the cable label | Compared with the design's proposed connections: **as designed**, or **not in the design** (found in the field). A port is hooked up once. |
| Field move | the device, the as-built position clicked on the plan, the reason (sprinkler head, HVAC diffuser, light fixture, structural member, ceiling grid, access panel, power or data location, sightline or glare, client or architect request, other), a note and a photograph | The position is inside the room. The move stays PROPOSED until someone holding `room.design.approve` decides it, and that person is never its recorder. A rejection says why. An approved move is the as-built position: the design is not edited. The checks that name the device are listed for the commissioning engineer. |
| Note | a cloud pinned to the plan | OPEN until resolved, with a resolution. |

- **Who records.** The installation team (`work.evidence` or `field.scan`) records. The systems engineer and the designer of record
  decide moves. Anyone admitted can read.
- **Refusals.** Every refusal is shown with its reasons and kept in the page's log.
- **Export.** Mounting, hookups, moves and notes export as six files.
- **Where the data lives.** The record is kept in this browser, synthetic. A server-side version is to do.

## Verified

- `tests/unit/field-record.test.mjs` FR-01…05.
- `tests/browser/demo-field-redline.test.mjs` FL-01…06:
  - from Lite to the record;
  - recording a mounting and a hookup;
  - a move clicked on the plan, then approved by the systems engineer;
  - a note pinned and resolved;
  - phone width;
  - an employee refused.

## Not yet

- The server-side record: tables, API and audit.
- The field record in the exported evidence package.
- Moves drawn in Lite's 3D view.
- Markup shapes beyond the note cloud: free-hand clouds, dimensions.
