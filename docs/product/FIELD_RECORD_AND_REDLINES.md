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
- **Where the data lives.** In the demo page the record is kept in this browser, synthetic. The server keeps the same record durably
  (below); the demo page does not read it yet.

## Verified

- `tests/unit/field-record.test.mjs` FR-01…05.
- `tests/browser/demo-field-redline.test.mjs` FL-01…06:
  - from Lite to the record;
  - recording a mounting and a hookup;
  - a move clicked on the plan, then approved by the systems engineer;
  - a note pinned and resolved;
  - phone width;
  - an employee refused.

## On the server (17 Nov 2026)

Founder: "make the Phase 1 field records database-backed, too." Migration `0034_field_record.sql`, `services/enterprise-api/src/domain/fieldRecord.ts`.

| Record | Table | Rule the database holds |
|---|---|---|
| Mounting | `app.field_mounting` | append-only versions in order; an overhead mounting states its tether; a fixing unless floor or other; only a device of the room |
| Hookup | `app.field_hookup` | one live hookup per port; exactly one other end; `connection_id` is the design's proposed connection it matches, or null ("not in the design"); removed once with a reason, never deleted |
| Field move | `app.field_move` | one PROPOSED per device; decided once; the decider is not the recorder; a rejection has its reason; what was recorded never changes |
| Note | `app.field_markup` | resolved once, with a resolution; never deleted |

- **API.** `GET /v1/rooms/{room}/field-record`, `PUT …/mounting/{asset}`, `POST …/hookups`, `POST …/hookups/{hookup}/remove`,
  `POST …/moves`, `POST …/moves/{move}/decide`, `POST …/markups`, `POST …/markups/{markup}/resolve`.
- **Who.** `work.evidence` or `field.scan` records; `room.design.approve` decides a move; both may pin and resolve notes.
- **When.** INSTALLATION_PENDING, INSTALLED_UNVERIFIED and COMMISSIONING. Earlier nothing is installed; after acceptance a change is a
  change order and recommissioning.
- **The design is not edited.** An approved move is the as-built position beside the designed one. The response lists the checks that
  name the device and were recorded before the move, for the commissioning engineer to look at again.
- **History.** Every write and refusal is an audit row on the room, so `GET /v1/rooms/{room}/thread` carries the field record
  (`stages[lite].records.fieldRecord`) and its history.
- **Verified.** `tests/security/field-record.test.mjs` FRS-01…09: the lifecycle gate, who may, the rules above at the API and again
  directly at the database, as-built beside design, the recheck list, the thread, tenancy and site scope, closed after acceptance.
  In a demonstration sandbox: `tests/security/demo-sandbox.test.mjs` DS-07.

## Not yet

- The demo page reading and writing the server's record (it still uses the browser's).
- Photographs larger than a short text note in a demonstration sandbox (uploads there are limited by design).
- The field record in the exported evidence package.
- Moves drawn in Lite's 3D view.
- Markup shapes beyond the note cloud: free-hand clouds, dimensions.
