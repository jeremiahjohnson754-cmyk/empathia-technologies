# Wording checkpoint, 26 Nov 2026: American English, Center and Theater, Collabora-SING

Founder decisions CR-D2 and CR-D3 (26 Nov 2026, 04:50 CT) and the American English the sites are written in.

## What changed

- **The text people read** in the demonstrator, the website and the shared interface package uses American spellings, written by
  `scripts/content/american-english.mjs --write` and, where the tool cannot reach, by hand (237 source files in all). The names of
  fictional places in the United States use Center and Theater (Larkspur Exchange Convention Center, Lecture Theater SCI-110,
  Stonebridge Resilience Center and the rest); so do the source comments, the current documents and the two place names the API's
  demonstration seed shows (`services/enterprise-api/src/domain/demo.ts`, shown on the flagship page).
- **Collabora-SING** is the one spelling people read and the current documents use, the media set's series name included.
- **Search finds either spelling** (`apps/demo/src/search/spelling.ts`, used by the page search and the menu search): "lecture theatre"
  finds what now says "theater", and "theater" finds text that keeps its British spelling. Checked by
  `tests/unit/search-spellings.test.mjs`.
- **By hand**, where the tool keeps a one-word or ALL-CAPS string because it cannot tell a label from a key: the shared status chip
  "Modeled", the bench's "WHITE IS NOT ONE COLOR" and "LIVE ANALYZER", the capture card's "Synchronize"/"Synchronized", the lighting
  lab's "Color" control and its knob labels, the color picker's accessible name, the meeting's "(organizer)", the lesson's "Practice".
- **The tool** was corrected twice. It judged each piece of a template literal on its own, so `${w} meters by ${l} metres` kept its
  last word; it now judges the pieces by the whole template, joined without inventing a space. It now also keeps: a word joined to
  `_` or `--` (a class name), a computed object key, a generated file ("do not edit by hand"; changed at its source), and lines marked
  `american-english: keep`. `--check` reports nothing left to change.

## What was kept as written, and why

- Identifiers, test ids, class names, routes, storage keys, enum values and room types (`lecture-theatre`, `convention-centre`,
  `xpo-organiser`, Founder Studio's `collaboro-sing`): changing them would break saved state and links, and nobody reads them as words.
- **SIGNAL**: its recorded takes speak the canon's own words, so their captions keep the canon's spelling (`cancelled`, `metres`);
  the first round had changed them, in two generated files among others, and they are restored. SIGNAL's own place names (the
  Wyndmere Centre) and its invented countries keep the canon's spelling. The canon (`packages/signal-canon`) is not edited.
- **Dated records** (decision records, assessments, audits, the 18 Nov handoff, the 26 Oct demonstrator capture, the source and parity
  registers, a change-log row, evidence) say what was true when they were written.

## Not yet changed (the next pass)

The tool's scope is the demonstrator, the website and the shared interface package. Still British, and said here so it is not
mistaken for done: text that reaches a screen from other packages (the price book's connector catalog and room licences, the search
engine's coverage notes, the service engine's equipment names such as "audio analyser") and from the API, apart from the two place
names; labels made from enum values (an export's state "Cancelled"); and one-word labels the tool keeps and nobody has listed yet
(for example a seat position "Centre", a level "Practised"). Search finds them by either spelling meanwhile.

## Tests

- **Changed lines** (table below): each compares text whose spelling changed, and changes that spelling only. Six are checks that a
  word must NOT appear (a fan's view twice, the public summary three times, the manual's unit names); they use the new spelling, or either spelling,
  so that they still test something. No condition, count, selector or check title was changed; no check was removed or loosened.
- **Added**: `tests/unit/search-spellings.test.mjs` (above).
- **Listed in the runner for the first time** (`scripts/test.mjs`): thirteen unit files written 12–13 Nov that no run of record had
  executed, `signal-cinematic` among them (it would have caught the change to the takes). Each passes on its own. Two other unlisted
  files fail on commits before this one too and are recorded as defects D-40 and D-41 (`docs/qa/DEFECT_REGISTER.md`), not listed
  until they are corrected.

| File | Line | Change |
|---|---|---|
| `tests/browser/demo-assurance-v253.test.mjs` | 16 | modelled → modeled |
| `tests/browser/demo-bench.test.mjs` | 32 | ANALYSER' → ANALYZER' |
| `tests/browser/demo-campus-life.test.mjs` | 91 | theatre → theater |
| `tests/browser/demo-champion-start.test.mjs` | 17 | practising → practicing |
| `tests/browser/demo-connect.test.mjs` | 73 | modelled → modeled |
| `tests/browser/demo-connect.test.mjs` | 133 | cancelled → canceled |
| `tests/browser/demo-connect.test.mjs` | 144 | modelled → modeled |
| `tests/browser/demo-control.test.mjs` | 53 | authorisation → authorization |
| `tests/browser/demo-critical-signal.test.mjs` | 69 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 77 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 80 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 81 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 83 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 89 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 93 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 94 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 97 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 109 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 125 | fibre → fiber |
| `tests/browser/demo-critical-signal.test.mjs` | 136 | programme → program |
| `tests/browser/demo-critical-signal.test.mjs` | 142 | programme → program |
| `tests/browser/demo-critical-signal.test.mjs` | 149 | programme → program |
| `tests/browser/demo-critical-signal.test.mjs` | 161 | must not appear: `fibre` → `fib(?:re|er)` (either spelling) |
| `tests/browser/demo-critical-signal.test.mjs` | 189 | must not appear: `fibre` → `fib(?:re|er)` (either spelling) |
| `tests/browser/demo-critical-signal.test.mjs` | 220 | fibre → fiber |
| `tests/browser/demo-docs5.test.mjs` | 174 | Synchronised → Synchronized |
| `tests/browser/demo-docs5.test.mjs` | 175 | synchronised → synchronized |
| `tests/browser/demo-docs5.test.mjs` | 177 | Synchronised → Synchronized, synchronised → synchronized |
| `tests/browser/demo-docs5.test.mjs` | 180 | synchronised → synchronized |
| `tests/browser/demo-drawing.test.mjs` | 20 | metre → meter, metres → meters |
| `tests/browser/demo-drawing.test.mjs` | 22 | Modelled → Modeled |
| `tests/browser/demo-drawing.test.mjs` | 28 | organisation’s → organization’s |
| `tests/browser/demo-drawing.test.mjs` | 44 | metres → meters |
| `tests/browser/demo-flagship.test.mjs` | 112 | Theatre → Theater |
| `tests/browser/demo-flagship.test.mjs` | 168 | theatre → theater |
| `tests/browser/demo-flagship.test.mjs` | 390 | Theatre → Theater |
| `tests/browser/demo-flagship.test.mjs` | 624 | Theatre → Theater |
| `tests/browser/demo-gameday.test.mjs` | 28 | Programme → Program |
| `tests/browser/demo-gameday.test.mjs` | 34 | programme → program |
| `tests/browser/demo-guides.test.mjs` | 56 | organisation → organization |
| `tests/browser/demo-guides.test.mjs` | 59 | organisation → organization |
| `tests/browser/demo-instant.test.mjs` | 24 | recognised → recognized |
| `tests/browser/demo-instant.test.mjs` | 54 | centimetres → centimeters, metres → meters |
| `tests/browser/demo-instant.test.mjs` | 61 | metres → meters |
| `tests/browser/demo-instant.test.mjs` | 65 | modelled → modeled |
| `tests/browser/demo-journeys.test.mjs` | 73 | Modelled → Modeled |
| `tests/browser/demo-journeys.test.mjs` | 137 | Modelled → Modeled |
| `tests/browser/demo-lite.test.mjs` | 39 | modelled → modeled |
| `tests/browser/demo-lite.test.mjs` | 266 | Catalogue → Catalog |
| `tests/browser/demo-manual.test.mjs` | 20 | practising → practicing |
| `tests/browser/demo-manual.test.mjs` | 21 | organisation → organization |
| `tests/browser/demo-manual.test.mjs` | 46 | catalogue → catalog, organisation → organization |
| `tests/browser/demo-manual.test.mjs` | 60 | catalogue → catalog |
| `tests/browser/demo-manual.test.mjs` | 62 | organisation → organization |
| `tests/browser/demo-onboard.test.mjs` | 18 | practising → practicing |
| `tests/browser/demo-onboard.test.mjs` | 20 | organisation → organization |
| `tests/browser/demo-onboard.test.mjs` | 41 | organisation → organization |
| `tests/browser/demo-onboard.test.mjs` | 70 | programme → program |
| `tests/browser/demo-optimizer.test.mjs` | 44 | Centre → Center |
| `tests/browser/demo-search-scenarios.test.mjs` | 35 | organisation → organization |
| `tests/browser/demo.test.mjs` | 73 | centre → center |
| `tests/browser/demo.test.mjs` | 76 | centre → center |
| `tests/browser/demo.test.mjs` | 118 | centre → center |
| `tests/browser/demo.test.mjs` | 142 | Harbour → Harbor |
| `tests/browser/website.test.mjs` | 225 | modelled → modeled |
| `tests/browser/website.test.mjs` | 509 | organisation → organization |
| `tests/security/demo-sandbox.test.mjs` | 370 | Theatre → Theater |
| `tests/security/second-room.test.mjs` | 51 | Centre → Center |
| `tests/unit/demo-connect.test.mjs` | 643 | authorised → authorized |
| `tests/unit/demo-connect.test.mjs` | 660 | organiser → organizer |
| `tests/unit/demo-critical-signal.test.mjs` | 196 | fibre → fiber |
| `tests/unit/demo-critical-signal.test.mjs` | 201 | fibre → fiber |
| `tests/unit/demo-critical-signal.test.mjs` | 206 | programme → program |
| `tests/unit/demo-critical-signal.test.mjs` | 225 | fibre → fiber |
| `tests/unit/demo-critical-signal.test.mjs` | 271 | fibre → fiber |
| `tests/unit/demo-drawing.test.mjs` | 92 | organisation’s → organization’s |
| `tests/unit/demo-drawing.test.mjs` | 103 | metres → meters |
| `tests/unit/demo-estates.test.mjs` | 92 | Theatre' → Theater' |
| `tests/unit/demo-estates.test.mjs` | 106 | theatre → theater |
| `tests/unit/demo-gameday.test.mjs` | 42 | programme → program |
| `tests/unit/demo-gameday.test.mjs` | 54 | programme → program |
| `tests/unit/demo-guide-chapters.test.mjs` | 46 | organisation → organization |
| `tests/unit/demo-instant.test.mjs` | 47 | centimetres → centimeters, metres → meters |
| `tests/unit/demo-intake.test.mjs` | 36 | modelled → modeled |
| `tests/unit/demo-intake.test.mjs` | 169 | modelled → modeled |
| `tests/unit/demo-intake.test.mjs` | 170 | modelled → modeled |
| `tests/unit/demo-manual.test.mjs` | 50 | must not appear: `metres?` kept, and a number followed by `meter(s)` added ("meter" alone is the instrument) |
| `tests/unit/demo-manual.test.mjs` | 57 | practising → practicing |
| `tests/unit/demo-manual.test.mjs` | 82 | organisation → organization |
| `tests/unit/demo-onboard.test.mjs` | 54 | organisation → organization |
| `tests/unit/demo-onboard.test.mjs` | 113 | organisation → organization |
| `tests/unit/demo-rolehome.test.mjs` | 49 | authorised' → authorized' |
| `tests/unit/demo-rolehome.test.mjs` | 96 | authorised → authorized |
| `tests/unit/demo-spaces.test.mjs` | 109 | organisation → organization |
| `tests/unit/perf-check.test.mjs` | 73 | recognised' → recognized' |
