# End-user and investor acceptance guide

A repeatable protocol for people who were not involved in building Empathia, covering both public sites. Run it on a phone and on a
laptop. Report what you saw; do not score it.

**Sites:**
- corporate website — https://empathia-website.onrender.com (or the preview URL you were given);
- investor demonstration — https://empathia-demo.onrender.com.

**Data:** everything in the demonstration is synthetic. A perspective switch in the demo changes what is shown; it grants nothing.

## 0. Setup (2 minutes)

- **Devices:** one phone (Android Chrome or iOS Safari) and one laptop (Chrome, Firefox, Safari or Edge). Note the browser and its
  version.
- **Reset the demo:** open `#/investor`. In a guided scenario, press **Reset & replay**: it clears this browser's Build a Room draft and
  restarts the scenario. For a fully clean start, use a private window.
- **Timing:** about 35 minutes for the whole guide; 7 minutes for the investor tour alone (step 14).

## Tasks

| # | Task | Where | Expected | Typical time |
|---|---|---|---|---|
| 1 | Without help, say in one sentence what Empathia does | website home | You can say it from the first screen (headline, lead, the evidence line) | 1 min |
| 2 | Find the founder and his credentials | home → Founder section, or nav → Founder | Jeremiah Johnson; CTS (AVIXA), CAPM (PMI), CompTIA Network+; no other credentials | 1 min |
| 3 | New room: start a design and inspect where each dimension came from | demo → **Launch interactive room builder** (`#/v25/build`) | Dimensions carry provenance (extracted / inferred / simulated / field-measured / approved); coverage is labelled **modeled** | 4 min |
| 4 | Design: change the room's geometry and compare | Build a Room | The prediction updates and stays labelled modeled; nothing is called a measurement | 3 min |
| 5 | Scouter: compare equipment proposals | website → Products → Scouter | The page says Scouter is **not yet in the public demonstration**. That is the expected result today. | 1 min |
| 6 | Commissioning: see why each test applies; press an approval before its conditions are met | demo → guided scenario 4 (`#/tours/investor?scenario=4`) | The plan shows the WHY for each test. The blocked approval names every unresolved item and records nothing. | 4 min |
| 7 | Assurance: find the accepted baseline and what changed | scenario 5 ("The golden baseline and drift") | Baseline acceptance, recommissioning and the next version. Baseline-history pages are partial (website product page says so). | 3 min |
| 8 | Search Party: answer "what depends on this switch?" | scenario 1, or `#/search?focus=NetworkNode:SW-ATL-4A` | The rooms, devices and power behind the switch, each with a source; unknown edges shown as unknown | 3 min |
| 9 | ServiceHands: open a work order's context and closure | `#/v25/service` | Context packet, evidence, retest, closure by verification | 3 min |
| 10 | Learn: open a reviewed case and the SIGNAL lessons | `#/v25/learn`, `#/learn` | Cases with permission, de-identification and review; training grants no authority. **Narration audio is not available yet** (expected; see `docs/parity/MEDIA_RESTORATION_STATUS.md`). | 3 min |
| 11 | Executive view: find the measures and their denominators | `#/v25/exec`, perspective "exec" | Each measure shows its numerator, denominator, window and coverage. No privileged data appears. | 2 min |
| 12 | Accessible path: do tasks 1, 2 and 13 with the keyboard only, then on a 320–390 px phone | both sites | A visible focus ring on every stop; no sideways scrolling; the menu opens and closes with Enter/Escape | 5 min |
| 13 | Forms: request a demonstration | website → Request a demo | **Today the form says the endpoint is not configured and cannot send. That is the expected, honest result.** Once Phase 2 is live: a receipt with a reference appears, a second immediate submission is refused, and the message is in the admin inbox. | 2 min |
| 14 | Investor tour: reset, play scenarios 1–7, jump, resume | demo → **Watch a guided scenario** | No dead ends, no off-screen dialogs. Reset & replay works. Under 7 minutes when skimming. | 7 min |
| 15 | Report anything unexpected | — | Use the template below | — |

## Report template (one per finding)

| Field | Content |
|---|---|
| Ticket ID | your initials + number |
| Site / screen / address | e.g. demo `#/v25/fi` |
| Device / browser / width | e.g. Pixel 7, Chrome 130, 412 px |
| Steps | numbered |
| Expected / actual | |
| Severity | P0 core path broken · P1 blocks a user group · P2 degraded · P3 polish |
| Evidence | screenshot or screen recording |
| Owner / fix version / retest | filled in by engineering |

## Acceptance (from the master brief)

- **Defects:** zero open P0 or P1 defects in the advertised journeys (tasks 1–4, 6–9, 11–14). Today the automated audit reports 0 P0
  and 0 P1 on both sites (`tests/evidence/SITE_AUDIT.json`). Task 13 cannot pass until the lead endpoint is deployed.
- **Placeholders:** no unmarked placeholder in an experience declared finished. Scouter, Assurance history and SIGNAL narration are
  **marked** as not yet available.
- **Participants:** at least three people with different roles (for example CIO, integrator, systems engineer). Record task success
  and what they said, not an invented score.
