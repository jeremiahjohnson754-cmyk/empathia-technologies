# Two QR codes per Lite room

Founder, 14 Nov 2026: *"have empathia make two QR codes of the lite room one for public in employee/room user modes only and one that's
only for authorizated engineering personnel engineer mode."*

| Code | Address | Placed | Opens |
|---|---|---|---|
| Public | `#/lite/room/<id>?mode=user&qr=public` | door, table card | the room in the employee and room-user modes only; no other mode is offered from it, whoever scans it (an engineer included); a role with neither mode (a visitor) is told the code is for employees and room users and pointed to help (`#/here/<id>`) |
| Engineering | `#/lite/room/<id>?mode=engineer&qr=eng` | rack, ceiling tile, at the equipment | the engineer mode, for a role allowed to use it; the router refuses anyone else (the engineer lens authority, unchanged) |

A code is an address, not a key: it grants nothing. The public code is enforced by the page itself (it asks for no lens of its own, so a
role without the two modes reaches the page and is told so there); the engineering code goes through the same lens authority as any
`?mode=engineer` address. The codes panel is shown only to roles that may use the engineer mode (they place the labels); each code saves
as a print-ready SVG label that names what it is and says it grants no access. Encoder: `apps/demo/src/lite/qr.ts` (no library, no network).

Verified: `tests/browser/demo-room-qr.test.mjs` (QR-01…05: both codes and their addresses, the label file, the public restriction for an
employee and for an engineer, the visitor told, the engineering code refused to an employee and opening for an engineer, no panel for an
employee).
