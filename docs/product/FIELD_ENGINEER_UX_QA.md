# Field engineer UX: quality assurance

Status, 14 Nov 2026. This is a deliverable of the 40/10 directive. It covers the pages a field engineer uses on site, tested on a phone at 390 × 844 by `tests/browser/demo-field-ux.test.mjs`. The evidence is in `tests/evidence/demo-field-ux.json`, which each run rewrites and which is not committed.

## The checks

On every page below, the test checks four things:

| Check | Standard applied |
|---|---|
| Nothing scrolls sideways. | — |
| Every visible control is at least 24 × 24 CSS px. | WCAG 2.2 target size, 2.5.8, AA. A link inside a sentence is exempt, as the criterion allows. A file input is measured by its visible label. |
| Every control has a name a screen reader can say. | — |
| No console error, and nothing is requested from outside the page. | — |

The share of controls at the comfortable 44 px is recorded, not required.

## Results (14 Nov 2026)

| Page | Who | Controls | At 44 px | Under 24 px | Unnamed | Sideways scroll |
|---|---|---|---|---|---|---|
| Room record with its registers (`#/commissioning/room/R-ATL-4-218`) | installer | 56 | 35 | 0 | 0 | 0 |
| Deficiency workbench | commissioning engineer | 33 | 25 | 0 | 0 | 0 |
| Reverberation instrument | commissioning engineer | 4 | 3 | 0 | 0 | 0 |
| STI workflow | commissioning engineer | 9 | 4 | 0 | 0 | 0 |
| An asset's life (`AS-0112`) | technician | 7 | 2 | 0 | 0 | 0 |
| ServiceHands | technician | 28 | 23 | 0 | 0 | 0 |
| The 45-second request | employee | 35 | 22 | 0 | 0 | 0 |

## What the first run found, and what was fixed

The first run failed on all seven pages. The failures and the fixes:

- **Breadcrumb links and the product tabs were 15–23 px tall.** The small chips now have a 24 px minimum (`packages/ui/src/kit.css`). Breadcrumbs, the service record's links, a card's standalone links and the drill paths are now 24 px tall (`apps/demo/src/pages/learn.css`).
- **A disclosure's summary was 23 px tall.** Every summary in a page now has a 24 px minimum.
- **The device markers on the request page's room plan were 22 px.** Each now has a transparent hit area of about 29 px around the visible marker (`apps/demo/src/spatial/Spatial.tsx`). The plan looks the same.
- **The file inputs measured 1 × 1 px.** This was the test measuring the visually hidden input instead of the labelled button a person presses. The test now measures the label.

## Not covered yet

- **Gloves, glare and one-handed use.** These are judged in the field, not in a browser. This needs a field trial with installers. **NOT RUN.**
- **Offline behaviour of these pages on site.** The demo has an offline shell. These pages' behaviour without a network is not tested here.
- **Every page at 44 px.** 44 px is the comfortable size for gloved hands. Today it is reached by about two-thirds of the controls on these pages.
