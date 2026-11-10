# Room Control — a capability of Lite

Founder, 10 November 2026: "visual references for the room control features — make it fully interactive and fully integrated into
Lite as a capability, fully connected, able to connect live real systems, and architecture and UI/UX."

**Status: working in the demonstration, simulated. Nothing is connected to a real system, and the page says so.**

## What a person gets

`#/control/<room>` is the room's panel. It keeps the language V2.5.3 introduced (one sentence, one room, one dock, five modes) and
gives it real things to act on:

- **One sentence.** The heading says what the room is doing now: "Atlas 4.218 shows the meeting, volume 55, microphones on."
- **One room.** The room's own plan (the positions Lite draws), with what is in use ringed and each screen joined to what feeds it.
- **One dock.** Microphones, Volume, Camera, Share, Session: the same five places in every room. A place the room has no use for
  stays, marked "not in this room".
- **Scenes** (Meet, Present, All off), **a source for each screen**, **volume and mute**, **microphones and privacy**, **camera
  presets**. Privacy mutes the microphones and closes the cameras, and while it is on they cannot be opened.
- **Engineer mode** (roles with V2.5.3's `control.engineer`): every command of the last action, the position it went to, what
  answered, and where the answer came from.

The two reference screenshots guided what a panel should offer (routing sources to displays, a volume control, presets, the room
drawn with its equipment). Nothing in them is copied: the layout, words and drawing are Empathia's, and no other company's name,
mark or product name appears.

## How it is built

| Part | File | What it does |
|---|---|---|
| Model | `apps/demo/src/control/model.ts` | Builds a panel from the room's record: its screens, its cameras, the sources its equipment can show. Turns an action into a new state, the commands a control system would be sent (one per position, each with its reason) and a sentence. Refuses what cannot be, with the reason |
| Adapter | `apps/demo/src/control/adapter.ts` | The contract between a panel and equipment: commands in, answers out, each answer with its source. One adapter exists, **SIMULATED** |
| Store | `apps/demo/src/control/store.ts` | The one way to operate a room: checks who may (V2.5.3 `control.use`), sends through the adapter, keeps the room's panel state, writes the ledger |
| Panel | `apps/demo/src/control/Panel.tsx` | The page |

A room is never offered a control for equipment its record does not have. Lighting and climate are not in these room records, so
there is no lighting or climate control; that is said on the page instead of drawn as a decoration.

Operating a room does not change its record or its commissioning baseline: panel state is kept apart from both.

## What "connect live real systems" needs, and what exists

| Needed | Today |
|---|---|
| An adapter that speaks to a real control system (a control processor's interface, a vendor cloud, or a gateway on the customer's network) | **Not written.** The contract it would implement exists and is exercised by the simulated adapter |
| The customer's written authorisation for each room | Nothing to authorise yet. Standing rule: no unauthorised discovery or device control |
| Credentials held on a server, never in the page | The demonstration has no server. The enterprise API exists as code and is not deployed for this |
| A dry run, a rate limit, an emergency stop | Not built |
| Every command in the audit ledger before it is sent | The ledger line is written for every operation in the demonstration |
| Feedback read back from the equipment and shown with its source | The panel shows the adapter's answer and labels it SIMULATED; a real adapter would label OBSERVED |
| A test against a real room | **Not possible from here.** It needs the founder's equipment, network and credentials |

## Tests

- `tests/unit/demo-control.test.mjs`: the panel of every one of the 90 rooms; 200 random presses in every room (18,000) with no
  impossible state (privacy with open microphones, a source on a screen of a room that is off, a command to a position the room does
  not have); the reference room press by press; routing through a switcher; the adapter; who may; the ledger; the record unchanged.
- `tests/browser/demo-control.test.mjs`: the panel operated in a browser in both themes and on a phone.

## Not done

- No real adapter, and so no real room has been operated.
- Lighting, shades and climate (not in the room records).
- Audio zones, per-microphone control, camera pan and tilt by hand, recording and streaming controls.
- The other three worlds' spaces (their estates are a different model).
- No person has used the panel; nobody with a control-systems background has reviewed the command set.
