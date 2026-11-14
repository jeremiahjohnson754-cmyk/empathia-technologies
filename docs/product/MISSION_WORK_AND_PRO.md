# Role homes centred on the work, and Pro in V2.5.3's vocabulary (14 Nov 2026)

The founder, 14 Nov 2026:
- *"make the mission control of every role much much better … center it around the work needing to be done"*;
- *"make pro look more like v2.5.3 … add more trend analysis wherever it makes sense … asset and issue intelligence and operational
  intelligence."*

**Role homes** (`campus/rolehome.ts` `startFor`): the work each role holds, added to its home.

| Role | What its home now shows |
|---|---|
| Service manager | **Vendors against their agreements**: those falling short first. Each row opens Service analytics drilled to that vendor. Also the figure *Vendors needing attention*. |
| Executive | The same vendor list, with the same figure. |
| Installer | **Devices to register**: the rooms being installed or commissioned, least complete first, with "n of m devices registered · k of 2 install photographs". Each row opens the room's registers. |
| Commissioning engineer | The same rooms as the installer, as *Registers before phase 1*. |

Each zone is offered only where the role may open the page it leads to (D44). A technician and an employee see neither.

**Pro** (`pages/ProViews.tsx`, `pages/Estate.tsx` command center):
- **Tabs and figures:** V2.5.3's pill tabs, and its joined strip of figures (one panel, cells divided by rules).
- **Asset Intelligence:** a second row of figures:
  - device register % (from the installation teams' registers in this browser);
  - retired units, with their codes reserved;
  - service jobs that named a unit in the last three months;
  - rooms with every document area recorded.

  It also has V2.5.3's *Buildings* list with each building's modelled health, and a monthly trend of service on units by layer.
- **Issue Intelligence:** issues by month and layer (a twelve-month trend), and *Rooms that keep coming back* (the most service jobs).
- **Operations Hub:** SLA attainment by month, with a link to the vendor scorecard.

The service trends come from the labelled synthetic service history (`service/history.ts`), as on Service analytics. The other figures
come from the records.

Verified:
- `tests/browser/demo-mission-work.test.mjs` (MW-01…04);
- `tests/browser/demo-rolehome.test.mjs`, where RS-30 now expects five executive figures, with its reason;
- `tests/unit/demo-rolehome.test.mjs`.

## Waiting for you (14 Nov 2026)

Each working role's start page now opens with **Waiting for you**: the steps across commissioning and service that wait on that role *now*. Each step links to where it is taken.

| Role | What waits for them |
|---|---|
| Installer | deficiencies they own, to fix (late ones in red) |
| Commissioning engineer | fixes waiting for their retest; service fixes waiting for verification |
| Systems engineer | deficiencies whose retest passed, to verify and close (never by the fixer or the retest's recorder); intelligibility exceptions to approve or refuse |
| Service manager | new requests to triage |
| Service technician | work orders to accept or work |

When nothing waits on the role, the page says so. Tested in `tests/browser/demo-waiting.test.mjs` (WF-01..04).
