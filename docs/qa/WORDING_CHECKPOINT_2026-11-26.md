# Wording checkpoint, 26 Nov 2026: American English, Center and Theater, Collabora-SING

Founder decisions CR-D2 and CR-D3 (26 Nov 2026, 04:50 CT) and the American English the sites are written in. What changed:

- Text people read in the demonstrator, the website and the shared interface package: British spellings changed to American ones by
  `scripts/content/american-english.mjs --write` (235 source files with the hand edits below). The proper names of fictional places
  located in the United States use Center and Theater (Larkspur Exchange Convention Center, Lecture Theater SCI-110, Stonebridge
  Resilience Center and the rest); the comments in the source and the current documents say the same, and the API's demonstration
  seed (`services/enterprise-api/src/domain/demo.ts`) names its two places the same way, since the flagship page shows them.
- Collabora-SING is written Collabora-SING everywhere people read it.
- The tool was corrected during this checkpoint: it judged each piece of a template literal on its own, so in
  `${w} meters by ${l} metres` the last piece, a single word, was taken for a key and kept. It now judges the pieces by the whole
  template, and it leaves a word joined to `_` or `--` alone (a class name). Six pieces changed (plan descriptions and screen-reader
  labels). `--check` now reports nothing left to change.
- Not changed: identifiers, test ids, class names, routes, storage keys and room types (for example `lecture-theatre`,
  `convention-centre`, `xpo-organiser`, `collaboro-sing` in Founder Studio), since changing them would break saved state and links
  and nobody reads them as words; dated records (decision records, assessments, audits, evidence), which say what was true when
  they were written; SIGNAL's invented countries, which are not American.
- Not yet changed, and said here so it is not mistaken for done: the tool's scope is the demonstrator, the website and the shared
  interface package. Text that reaches a screen from other packages (for example the price book's connector catalog, the search
  engine's coverage notes, the service engine's equipment names) and from the API, apart from the two place names, keeps its British
  spelling, and so do single-word labels the tool cannot tell from keys (for example a seat position "Centre"). Those are the next
  pass, with their own tests.

## Tests changed, and why

Each line below compares the text on a screen (or the API's text) with a literal. The text's spelling changed, so the literal changed
with it; the condition each check states, and everything else it compares, is unchanged. Three of them are checks that a word must
NOT appear (a fan's view shows no `program return`; a public summary names no `fiber`): they would pass without testing anything if
they kept the old spelling, so they changed too. No check was removed or loosened, and no check title was changed.

| File | Line | Change | Where |
|---|---|---|---|
| `tests/browser/demo-assurance-v253.test.mjs` | 16 | modelled → modeled |  |
| `tests/browser/demo-campus-life.test.mjs` | 91 | theatre → theater | lecture theater is ready |
| `tests/browser/demo-champion-start.test.mjs` | 17 | practising → practicing | Draft: not yet reviewed by a practicing AV engineer |
| `tests/browser/demo-connect.test.mjs` | 73 | modelled → modeled | lic holidays and leave are not modeled |
| `tests/browser/demo-connect.test.mjs` | 133 | cancelled → canceled | MTG-0001 is canceled |
| `tests/browser/demo-connect.test.mjs` | 144 | modelled → modeled | lic holidays and leave are not modeled |
| `tests/browser/demo-critical-signal.test.mjs` | 69 | fibre → fiber | Camera fiber, primary path |
| `tests/browser/demo-critical-signal.test.mjs` | 77 | fibre → fiber | The loss starts at camera 3 fiber, primary path \(inferred\) |
| `tests/browser/demo-critical-signal.test.mjs` | 80 | fibre → fiber | Camera fiber, primary path: 2 earlier inci |
| `tests/browser/demo-critical-signal.test.mjs` | 81 | fibre → fiber | y broadcast engineer: camera 3 fiber, primary path, video router |
| `tests/browser/demo-critical-signal.test.mjs` | 83 | fibre → fiber | equipment:STA-CAM-MAIN:Camera fiber, primary path |
| `tests/browser/demo-critical-signal.test.mjs` | 89 | fibre → fiber | These isolate camera 3 fiber, primary path\. The picture p |
| `tests/browser/demo-critical-signal.test.mjs` | 93 | fibre → fiber | Move camera 3 to its backup fiber path |
| `tests/browser/demo-critical-signal.test.mjs` | 94 | fibre → fiber | dy pulls, cleans or re-seats a fiber connector |
| `tests/browser/demo-critical-signal.test.mjs` | 97 | fibre → fiber | e: Move camera 3 to its backup fiber path |
| `tests/browser/demo-critical-signal.test.mjs` | 109 | fibre → fiber | Camera 3 moved to the backup fiber path; 4 of 4 procedure steps |
| `tests/browser/demo-critical-signal.test.mjs` | 125 | fibre → fiber | on camera fiber, backup path |
| `tests/browser/demo-critical-signal.test.mjs` | 136 | programme → program | Broadcast program chain: working |
| `tests/browser/demo-critical-signal.test.mjs` | 142 | programme → program | is closed\. The broadcast program chain reads “working”, and fi |
| `tests/browser/demo-critical-signal.test.mjs` | 149 | programme → program | Broadcast program chain: working |
| `tests/browser/demo-critical-signal.test.mjs` | 220 | fibre → fiber | The loss starts at camera 3 fiber, primary path |
| `tests/browser/demo-docs5.test.mjs` | 174 | Synchronised → Synchronized |  |
| `tests/browser/demo-docs5.test.mjs` | 175 | synchronised → synchronized | already synchronized |
| `tests/browser/demo-docs5.test.mjs` | 177 | Synchronised → Synchronized, synchronised → synchronized |  |
| `tests/browser/demo-docs5.test.mjs` | 180 | synchronised → synchronized | already synchronized |
| `tests/browser/demo-drawing.test.mjs` | 20 | metres → meters | meters by 9\.4 meters, with 10 devices |
| `tests/browser/demo-drawing.test.mjs` | 28 | organisation’s → organization’s | An organization’s own approved standard would r |
| `tests/browser/demo-drawing.test.mjs` | 44 | metres → meters | meters by 8 meters |
| `tests/browser/demo-flagship.test.mjs` | 112 | Theatre → Theater | Lecture Theater SCI-110 (synthetic) |
| `tests/browser/demo-flagship.test.mjs` | 168 | theatre → theater | opened before the lecture theater existed on the server |
| `tests/browser/demo-flagship.test.mjs` | 624 | Theatre → Theater | Lecture Theater SCI-110 |
| `tests/browser/demo-gameday.test.mjs` | 28 | Programme → Program |  |
| `tests/browser/demo-gameday.test.mjs` | 34 | programme → program | STA-\|GD-0\|ribbon\|rack\|program return |
| `tests/browser/demo-guides.test.mjs` | 56 | organisation → organization | From your organization\. The hours support is staffe |
| `tests/browser/demo-guides.test.mjs` | 59 | organisation → organization | en here: they change, and your organization has its own approved guidance |
| `tests/browser/demo-instant.test.mjs` | 24 | recognised → recognized | Nothing is recognized by a machine |
| `tests/browser/demo-instant.test.mjs` | 54 | centimetres → centimeters, metres → meters |  |
| `tests/browser/demo-instant.test.mjs` | 61 | metres → meters | meters wide, 9\.4 meters long, with 2 pieces of equipm |
| `tests/browser/demo-instant.test.mjs` | 65 | modelled → modeled |  |
| `tests/browser/demo-journeys.test.mjs` | 73 | Modelled → Modeled | Verified\|Measured\|Modeled\|Declared\|Not tested\|baseline |
| `tests/browser/demo-lite.test.mjs` | 39 | modelled → modeled | No modeled room on this floor |
| `tests/browser/demo-lite.test.mjs` | 266 | Catalogue → Catalog |  |
| `tests/browser/demo-manual.test.mjs` | 20 | practising → practicing | Draft: not yet reviewed by a practicing professional |
| `tests/browser/demo-manual.test.mjs` | 21 | organisation → organization | values are for your organization to settle.*has set 0 of them |
| `tests/browser/demo-manual.test.mjs` | 46 | catalogue → catalog, organisation → organization | ference contains.*Tests in the catalog\. Echo cancellation\. |
| `tests/browser/demo-manual.test.mjs` | 60 | catalogue → catalog | other tests in the catalog do not apply\. A template hol |
| `tests/browser/demo-manual.test.mjs` | 62 | organisation → organization | depends on are not set by the organization |
| `tests/browser/demo-onboard.test.mjs` | 18 | practising → practicing | Draft: not yet reviewed by a practicing IT manager |
| `tests/browser/demo-onboard.test.mjs` | 20 | organisation → organization | Northstar \(a synthetic organization\) |
| `tests/browser/demo-onboard.test.mjs` | 41 | organisation → organization | This organization has not recorded its access p |
| `tests/browser/demo-onboard.test.mjs` | 70 | programme → program | The program exists in English only |
| `tests/browser/demo-optimizer.test.mjs` | 44 | Centre → Center | text=Back to Engineering Center 1.10 |
| `tests/browser/demo-search-scenarios.test.mjs` | 35 | organisation → organization | fictional organization |
| `tests/browser/demo.test.mjs` | 73 | centre → center | Place at the center |
| `tests/browser/demo.test.mjs` | 76 | centre → center | Place at the center |
| `tests/browser/demo.test.mjs` | 118 | centre → center | Place at the center |
| `tests/browser/demo.test.mjs` | 142 | Harbour → Harbor |  |
| `tests/browser/website.test.mjs` | 225 | modelled → modeled | s, laid out by its room types: modeled layouts and devices, never su |
| `tests/browser/website.test.mjs` | 509 | organisation → organization | not the record of any organization |
| `tests/security/demo-sandbox.test.mjs` | 370 | Theatre → Theater | Lecture Theater SCI-110 (synthetic) |
| `tests/security/second-room.test.mjs` | 51 | Centre → Center | Larkspur Exchange Convention Center \(synthetic\) |
| `tests/unit/demo-connect.test.mjs` | 643 | authorised → authorized | Not authorized; ask your administrator for $ |
| `tests/unit/demo-connect.test.mjs` | 660 | organiser → organizer | Only the organizer |
| `tests/unit/demo-critical-signal.test.mjs` | 196 | fibre → fiber | backup fiber path |
| `tests/unit/demo-critical-signal.test.mjs` | 201 | fibre → fiber | backup fiber path; 4 of 4 procedure steps |
| `tests/unit/demo-critical-signal.test.mjs` | 206 | programme → program | Broadcast program chain: working |
| `tests/unit/demo-critical-signal.test.mjs` | 225 | fibre → fiber | STA-\|GD-\d\|camera\|fiber\|incident\|broadcast\|router\|swi |
| `tests/unit/demo-critical-signal.test.mjs` | 271 | fibre → fiber | Camera fiber, primary path: 2 earlier inci |
| `tests/unit/demo-drawing.test.mjs` | 92 | organisation’s → organization’s | An organization’s own approved standard would r |
| `tests/unit/demo-drawing.test.mjs` | 103 | metres → meters | ed on the drawing\. How far in meters is not known |
| `tests/unit/demo-estates.test.mjs` | 92 | Theatre' → Theater' |  |
| `tests/unit/demo-estates.test.mjs` | 106 | theatre → theater | lecture theater sci-110 |
| `tests/unit/demo-gameday.test.mjs` | 42 | programme → program | STA-\|GD-0\|ribbon\|program return\|commentary\|broadcast\|i |
| `tests/unit/demo-gameday.test.mjs` | 54 | programme → program | Broadcast program chain: degraded |
| `tests/unit/demo-guide-chapters.test.mjs` | 46 | organisation → organization | en here: they change, and your organization has its own approved guidance |
| `tests/unit/demo-instant.test.mjs` | 47 | centimetres → centimeters, metres → meters | in meters, as a number |
| `tests/unit/demo-intake.test.mjs` | 36 | modelled → modeled |  |
| `tests/unit/demo-intake.test.mjs` | 169 | modelled → modeled | ou gave it: 5 × 7.5 m; ceiling modeled |
| `tests/unit/demo-intake.test.mjs` | 170 | modelled → modeled | Size modeled from |
| `tests/unit/demo-manual.test.mjs` | 57 | practising → practicing | not yet reviewed by a practicing professional |
| `tests/unit/demo-manual.test.mjs` | 82 | organisation → organization | depends on are not set by the organization: .*Until one is set, its test |
| `tests/unit/demo-onboard.test.mjs` | 54 | organisation → organization | synthetic organization |
| `tests/unit/demo-onboard.test.mjs` | 113 | organisation → organization | vision 2 .* published for this organization; to be reviewed within 90 day |
| `tests/unit/demo-rolehome.test.mjs` | 49 | authorised' → authorized' |  |
| `tests/unit/demo-rolehome.test.mjs` | 96 | authorised → authorized | k authorized |
| `tests/unit/demo-spaces.test.mjs` | 109 | organisation → organization | ater AV Integration (fictional organization) |
| `tests/unit/perf-check.test.mjs` | 73 | recognised' → recognized' |  |
