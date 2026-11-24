# The seven capabilities beside VOICE — product and QA blueprint (23–24 Nov 2026)

Governing text: Enterprise 3.0 directive 1 (capabilities 1–8) and the founder's decision E3-D1: each is first-class, has its own page,
workflow, route and permissions, and is connected to the others through the shared record. VOICE has its own blueprint
(`VOICE_PRODUCT_BLUEPRINT.md`). Everything below is IMPLEMENTED in the demonstrator, TESTED, and SIMULATED on synthetic data. Nothing
is connected to a live system, and each page states what is not built.

| Capability | Family | Address | Journey | Stands on (reads, never copies) | Its one rule |
|---|---|---|---|---|---|
| FLOW | Infrastructure and communications | `#/flow`, `#/flow/link/<node>` | J6A | The estate graph's network nodes and edges; the relationship engine's impact traversal | A claim exists only where a record states it; what nobody recorded is UNKNOWN |
| MissionProof | Operations | `#/missionproof` | J8 | The host room's lifecycle, VOICE's evidence, FLOW's uplink, the ServiceHands job | One dependency that is not ready makes the event not ready; unknown is never ready |
| PRISM | Experience and safety | `#/prism` | J7 | Display positions and assets of six rooms in Core; ServiceHands for jobs | Intended, reported and proof of play stay apart; a stale or missing report is never "as scheduled" |
| SENTINEL | Experience and safety | `#/sentinel` | J7 | PRISM's screens; ServiceHands for the follow-up job | Requested, acknowledged and proven shown stay apart; it originates nothing; **SIMULATION — NOT A LIFE-SAFETY SYSTEM** |
| ACCORD | Collaboration and knowledge | `#/accord` | J9 | The ServiceHands job, VOICE's measurements, FLOW's uplink, the room's record | The provider reads `view(…, 'provider', …)` and nothing else; empty after expiry or withdrawal |
| FORGE | Design and engineering | `#/forge`, `#/forge/room/<room>` | J3 | The room's design record in Core (the one Lite, Commissioning and Assurance read) | No configuration without a vendor-verified capability pack; the author cannot approve |
| OMNIPRESENCE | Experience and safety | `#/omnipresence`, `#/omnipresence/b/<building>` | J11 | The campus's buildings and rooms; the existing room panel (`control/store.act`) and its ledger | A tag names a building and proves nothing else; control needs authority, scope, capability and a presence proof together |

Source: `apps/demo/src/{flow,mission,prism,sentinel,accord,forge,omni}/` (a `model.ts` with no React, and one page each);
pages and permissions in `registry.modules.ts` and `module-roles.ts`; families in `packages/ui/src/families.ts`; website launches in
`packages/ui/src/launches.ts` (`MODULE_LAUNCHES`).

## How they connect

- **VOICE → FLOW → VOICE**: the CallPath opens the shared uplink in FLOW with the room and the evidence case kept, and returns.
- **VOICE → ServiceHands → MissionProof**: a report is a real job; MissionProof's calling dependency is ready only when that job is
  verified by a second person and a later session is within the declared targets.
- **PRISM → SENTINEL**: SENTINEL's signage routes are PRISM's screens. A screen PRISM cannot reach is a route SENTINEL records as failed.
- **PRISM, SENTINEL → ServiceHands**: an exception or the failed routes become one real job, found again from the workspace.
- **ACCORD** reads the job, VOICE's measurements, FLOW's uplink and the room live; change the job and the capsule's line changes.
- **FORGE** compiles from the same design record as Lite and Commissioning, and links to both; approval in FORGE does not accept the room.
- **OMNIPRESENCE** lists the building's rooms with their passports and "In this room", and operates a room only through its existing panel.
- **Families** (`#/families`, website `/products#families`) place all seventeen and link each one the current role may open.

## Fixtures (deterministic; ids are the estate's own)

- PRISM: schedule `SCH-NORTH-PUBLIC` r7; screens AS-4854, AS-4950 (displays, Eastgate 1.130 and 1.150), AS-2500, AS-2400, AS-2250,
  AS-4750 (LED walls, Atlas 1.150, Horizon 1.400, Beacon 3.236, Eastgate 1.110). Freshness rule 5 minutes (the tenant's). One player
  issues no proof of play; one is stale since 13:02 UTC; one has no connection; one screen has nothing scheduled.
- SENTINEL: alert `ALERT-SIM-0001` from a fictional source; plan `SRP-NORTH-02`; acknowledgement window 10 s; seven routes (six screens
  and one mock staff channel). Result: 3 proven shown, 2 acknowledged without proof, 2 failed.
- ACCORD: capsule `CAP-0001` about job `ISS-0417`, room `R-ATL-4-218`; customer Northstar Industries (synthetic), provider Tidewater
  Service Partners (fictional), agreement `MSA-NT-01` (fictional); ends 30 Nov 2026 15:30 UTC.
- FORGE: rooms `R-ATL-4-218` (revision 2 pending, revision 1 accepted), `R-EGT-1-150` (one revision), `R-NST-2-101` (no equipment
  designed: nothing compiles). Zero capability packs.
- OMNIPRESENCE: the six campus buildings; the tag of ATL is `<demonstration address>#/omnipresence/b/ATL`.

## Who may open and act

| Capability | Opens | Acts |
|---|---|---|
| FLOW | Roles that may read a network node (V2.5.3's table) | Read-only |
| MissionProof | Architect, AV Ops Lead, Executive, Service Manager, Systems Engineer, UC / Voice Administrator, Integration PM, Internal PM, Commissioning Engineer | Record a rehearsal: AV Ops Lead, Architect |
| PRISM | Architect, AV Ops Lead, Service Manager, Service Engineer, Systems Engineer, Executive | Raise a job: AV Ops Lead, Service Manager, Architect |
| SENTINEL | Architect, AV Ops Lead, Service Manager, Systems Engineer, Executive | Follow up failed routes: AV Ops Lead, Service Manager, Architect |
| ACCORD | Architect, AV Ops Lead, Service Manager, Service Engineer, Data Steward, Executive, Integration PM | Withdraw: AV Ops Lead, Data Steward, Architect |
| FORGE | Architect, Designer, Commissioning Engineer, Installation Engineer, Systems Engineer, Integration PM, AV Ops Lead | Approve: Commissioning Engineer, Architect (never the Designer) |
| OMNIPRESENCE | Every role (anyone can scan a tag); each link is checked for the role | Switch a room: only a role that operates rooms, with a presence proof |

The Site Champion is in neither PRISM nor SENTINEL: both read screens across every site, and the champion's authority is their own
site only. A site-scoped view for the champion is SPECIFIED.

A role that may not open a page gets the access page and the page's code is never downloaded (checked in the browser suites).
These are demonstration perspectives. They grant nothing real; production authorisation is decided on the server.

## Tests

`tests/unit/modules.test.mjs` (14 tests): PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE and the platform map.
`tests/unit/voice.test.mjs` (15): VOICE, FLOW, MissionProof, J6B steps 5–6, families.
`tests/browser/demo-modules.test.mjs` (28 checks, on a desktop and a phone): each journey used as written, with the refusals.
`tests/browser/demo-voice.test.mjs` (25 checks, desktop and phone): VOICE, FLOW, MissionProof, the room's Calling jump, families.
Negative cases covered: stale and missing reports; a report from the future; acknowledgement without proof; a provider reading after
expiry and after withdrawal; forbidden strings in the provider's view; the author approving; approval of changed content; a room with
no design; a tag carrying a token, an address of equipment or a room; a presence proof without authority; a tag of another building.

## Not built (each page says so)

- FLOW: timing, multicast and WAN records; any live network read.
- MissionProof: the archive of the event and the lessons after it.
- PRISM: any content system or player connection; a visual check of a screen.
- SENTINEL: any alerting source, any real channel, and the review record of a qualified life-safety designer.
- ACCORD: two real tenants, signed capsules, a dispute record, enforcement of the delegation.
- FORGE: import and reconciliation of CAD, Revit or Visio extracts; an approved device catalogue; capability packs; file export.
- OMNIPRESENCE: reading a tag with the camera, NFC, a real presence proof, the signed channel to a site gateway, a rate limit.
- All: `/v1/...` API paths, events and SDK contracts (Day 5), and production authorisation on the server.
