# Wording checkpoint, 26 Nov 2026: American English, Center and Theater, Collabora-SING

Founder decisions CR-D2 and CR-D3 (26 Nov 2026, 04:50 CT) and the American English the sites are written in. What changed:

- Text people read in the demonstrator, the website, the shared interface package and Founder Studio: British spellings changed to
  American ones (234 source files). The proper names of fictional places located in the United States use Center and Theater
  (for example Larkspur Exchange Convention Center, Lecture Theater SCI-110, Stonebridge Resilience Center). The comments in the
  source and the current documents say the same.
- Collaboro-Sing is written Collabora-SING everywhere people read it.
- Not changed: identifiers, test ids, class names, routes, storage keys and room types (for example `lecture-theatre`,
  `convention-centre`, `xpo-organiser`, `collaboro-sing` in Founder Studio), since changing them would break saved state and links
  and nobody reads them as words; dated records (decision records, assessments, audits, evidence), which say what was true when
  they were written; SIGNAL's invented countries, which are not American.

## Tests changed, and why

Each line below is a literal a test compares with the text on the screen. The screen's spelling changed, so the literal changed with
it; the condition each check states, and everything else it compares, is unchanged. No check was removed or loosened. The words
the checks describe themselves with (their titles) are left as they were.

| File | Line | Before | After |
|---|---|---|---|
| `tests/browser/demo-assurance-v253.test.mjs` | 16 | modelled schedule | modeled schedule |
| `tests/browser/demo-campus-life.test.mjs` | 91 | lecture theatre is ready | lecture theater is ready |
| `tests/browser/demo-champion-start.test.mjs` | 17 | Draft: not yet reviewed by a practising AV engineer | Draft: not yet reviewed by a practicing AV engineer |
| `tests/browser/demo-connect.test.mjs` | 73 | Public holidays and leave are not modelled | Public holidays and leave are not modeled |
| `tests/browser/demo-critical-signal.test.mjs` | 69 | Camera fibre, primary path | Camera fiber, primary path |
| `tests/browser/demo-critical-signal.test.mjs` | 94 | Nobody pulls, cleans or re-seats a fibre connector | Nobody pulls, cleans or re-seats a fiber connector |
| `tests/browser/demo-docs5.test.mjs` | 174 | Synchronised once | Synchronized once |
| `tests/browser/demo-docs5.test.mjs` | 175 | already synchronised | already synchronized |
| `tests/browser/demo-docs5.test.mjs` | 177 | was already synchronised | was already synchronized |
| `tests/browser/demo-drawing.test.mjs` | 28 | An organisation’s own approved standard would replace it | An organization’s own approved standard would replace it |
| `tests/browser/demo-flagship.test.mjs` | 168 | opened before the lecture theatre existed on the server | opened before the lecture theater existed on the server |
| `tests/browser/demo-guides.test.mjs` | 56 | From your organisation | From your organization |
| `tests/browser/demo-guides.test.mjs` | 59 | Step-by-step instructions for these applications are not written here: they change, and your organisation has its own approved guidance | Step-by-step instructions for these applications are not written here: they change, and your organization has its own approved guidance |
| `tests/browser/demo-instant.test.mjs` | 24 | Nothing is recognised by a machine | Nothing is recognized by a machine |
| `tests/browser/demo-instant.test.mjs` | 54 | metres, not feet or centimetres | meters, not feet or centimeters |
| `tests/browser/demo-instant.test.mjs` | 65 | modelled from geometry, not measured | modeled from geometry, not measured |
| `tests/browser/demo-lite.test.mjs` | 39 | No modelled room on this floor | No modeled room on this floor |
| `tests/browser/demo-lite.test.mjs` | 266 | Catalogue figures | Catalog figures |
| `tests/browser/demo-manual.test.mjs` | 20 | Draft: not yet reviewed by a practising professional | Draft: not yet reviewed by a practicing professional |
| `tests/browser/demo-manual.test.mjs` | 46 | Tests in the catalogue | Tests in the catalog |
| `tests/browser/demo-onboard.test.mjs` | 18 | Draft: not yet reviewed by a practising IT manager | Draft: not yet reviewed by a practicing IT manager |
| `tests/browser/demo-onboard.test.mjs` | 20 | a synthetic organisation | a synthetic organization |
| `tests/browser/demo-onboard.test.mjs` | 41 | This organisation has not recorded its access procedures | This organization has not recorded its access procedures |
| `tests/browser/demo-onboard.test.mjs` | 70 | The programme exists in English only | The program exists in English only |
| `tests/browser/website.test.mjs` | 225 | s own rooms, laid out by its room types: modelled layouts and devices, never surveyed | s own rooms, laid out by its room types: modeled layouts and devices, never surveyed |
| `tests/browser/website.test.mjs` | 509 | not the record of any organisation | not the record of any organization |
| `tests/unit/demo-connect.test.mjs` | 643 | Not authorised; ask your administrator for | Not authorized; ask your administrator for |
| `tests/unit/demo-connect.test.mjs` | 660 | Only the organiser | Only the organizer |
| `tests/unit/demo-critical-signal.test.mjs` | 196 | backup fibre path | backup fiber path |
| `tests/unit/demo-drawing.test.mjs` | 103 | How far in metres is not known | How far in meters is not known |
| `tests/unit/demo-estates.test.mjs` | 92 | Keynote Theatre | Keynote Theater |
| `tests/unit/demo-guide-chapters.test.mjs` | 46 | Step-by-step instructions for these applications are not written here: they change, and your organisation has its own approved guidance | Step-by-step instructions for these applications are not written here: they change, and your organization has its own approved guidance |
| `tests/unit/demo-instant.test.mjs` | 47 | in metres, as a number | in meters, as a number |
| `tests/unit/demo-intake.test.mjs` | 170 | Size modelled from | Size modeled from |
| `tests/unit/demo-manual.test.mjs` | 57 | not yet reviewed by a practising professional | not yet reviewed by a practicing professional |
| `tests/unit/demo-onboard.test.mjs` | 54 | synthetic organisation | synthetic organization |
| `tests/unit/demo-rolehome.test.mjs` | 49 | Funding authorised | Funding authorized |
| `tests/unit/perf-check.test.mjs` | 73 | browser not recognised | browser not recognized |
| `tests/browser/demo-connect.test.mjs` | 144 | Public holidays and leave are not modelled | Public holidays and leave are not modeled |
| `tests/browser/demo-docs5.test.mjs` | 177 | Synchronised once | Synchronized once |
| `tests/browser/demo-docs5.test.mjs` | 180 | already synchronised | already synchronized |
| `tests/unit/demo-drawing.test.mjs` | 92 | An organisation’s own approved standard would replace it | An organization’s own approved standard would replace it |
| `tests/unit/demo-instant.test.mjs` | 47 | metres, not feet or centimetres | meters, not feet or centimeters |
