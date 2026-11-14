# Drill down and drill up

Founder, 13 Nov 2026: "advanced drilldown and drillup capabilities in all data analytics surfaced."

## Built (13 Nov 2026)

| Surface | Levels | Across | In the address |
|---|---|---|---|
| Commissioning command centre `#/commissioning` | campus → building → floor → room (opens `#/commissioning/room/:id`) | by commissioning state (accepted, with conditions, blocked, in commissioning, not started) | `?b=ATL&f=4&s=blocked` |
| Assurance command centre `#/assurance` | campus → building → floor → room (opens `#/assurance/room/:id`) | by assurance state (match, drift, failed, no baseline) | `?b=HZN&s=drift` |

- `apps/demo/src/pages/EstateDrill.tsx`: the path (Campus › Atlas HQ › Floor 4, each a link up a level), the level's table (rooms, a
  stacked bar, one count per state, tests verified or open issues), and at a floor the rooms with their state and why. A count is a
  link that filters by its state; the filter chip clears it.
- The level lives in the address: shareable, bookmarkable, and the browser's Back walks it back. An unknown building, a floor that is
  not in the building, or a malformed value is ignored and the page falls back a level.
- The tiles above count the same rooms as the path (one scope), and the Building switch on Commissioning writes the same address.
- The portfolio brief (`apps/demo/src/export/estate.ts`) exports the drilled level: `EST-ATL-F4` holds exactly Atlas floor 4.
- The Excel workbook of every report is the offline drill-down: one sheet per level with a frozen, filterable header.

Verified: `tests/browser/demo-drill.test.mjs` 12/0 (down, up by the path and by Back, across by state, address opens directly,
malformed address, export scope, phone width).

## Not yet

Pro, ServiceHands, APEX, Search Party, Mission Control, Field Intelligence and Learn analytics do not have this drill yet (task #144/#147).
