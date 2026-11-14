# Lifecycle refresh planning (Pro)

Status, 14 Nov 2026. The founder's request, the same day: "lifecycle refresh planning … for ops lead and internal engineers in pro … a
separate thing that makes refresh planning every year and multi year strat planning — it's asset management made easy".

- **Where.** `#/pro/refresh`, for the operations lead, the systems and commissioning engineers, and the architect. Other roles are not
  admitted.
- **What it reads.** The asset spine (`apps/demo/src/refresh/plan.ts`): every unit in service now, by asset ID, with its position, room,
  building, class and installation date. It also reads the service history by asset ID. Units already taken out are never counted, and
  their IDs are never reissued.
- **What it gives.**
  - The year each unit falls due: the installation date plus its class's service life.
  - The annual plan: the units due in a year, room by room. When most of a room's units fall due within a year of each other, it
    suggests refreshing the room in one window.
  - The strategy: units due per year by class and by building over 1, 3, 5 or 7 years.
  - "Worth a look sooner": units with repeated break-fix jobs. This is an argument from the service record, never a change to the plan.
  - Six-format export.
- **Its basis.**
  - Service lives are planning assumptions that the planner sets per class. They are not manufacturer end-of-life or end-of-support
    dates; none are recorded.
  - Cost appears only when the planner declares a planning figure for every class involved. There is no partial total and no invented
    price.
  - Everything rests on synthetic records. On the starting assumptions the estate, installed in 2025–2026, has its first wave in 2029:
    the UC room compute.
- **Verified by:** `tests/unit/refresh-plan.test.mjs` (RP-01…05). The page itself was checked in a browser (ops lead at desktop width,
  the systems engineer at 390 px, an employee refused). It has no committed browser suite yet.
- **Outstanding:**
  - A browser suite.
  - The export added to `scripts/verify/export-formats.mjs`.
  - Recorded manufacturer end-of-support dates, if a licensed source is ever chosen.
  - A server-side version over the API.
