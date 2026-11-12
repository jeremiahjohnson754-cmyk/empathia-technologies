# SIGNAL and Lite: one feature parity matrix (R4)

**State: 12 November 2026.** One line per supported experience of the two sources, set against the product on five axes: behaviour
(the rules), interactions (what a person does), data (the source's content at its revision), visual presentation, and tests. It is
built from the two inventories (`SIGNAL_INVENTORY.md`, `LITE_INVENTORY.md`), which hold the detail and the reasons; this page is the
summary the founder's directive of 11 November 17:06 asks for. "Defined ≠ implemented ≠ tested ≠ authorized ≠ live": a ✓ under
Tests means automated checks passed on a build; NOT RUN is never a pass, and nothing here was heard through a loudspeaker or used
on a physical phone.

Key: ✓ matches the source · ◐ partial (the inventory says what is missing) · ✕ missing · — not applicable · ⊘ not carried by decision.

## SIGNAL (founder's build package: `docs/04-engine-specs.md` and the reference runtime)

| Experience | Behaviour | Interactions | Data | Visual | Tests |
|---|---|---|---|---|---|
| The story: 134 chapters, panels, beats, talks, discoveries | ✓ | ✓ | ✓ canon | ✓ | demo-story, demo-play, demo-offline |
| Decisions: clock, hints, merit, trust, costly calls kept, replay | ✓ | ✓ | ✓ | ✓ | signal-story unit; demo-story |
| Gates and chapter locks (hard, soft, optional; reviewer mode) | ✓ | ✓ | ✓ gates.json | ✓ | SS-12..16; ST-83..89 |
| Result pop-ups and CHAPTER COMPLETE | ✓ | ✓ focus, Tab, Escape | ✓ | ✓ | PO-01..05; PP-01..08 |
| Quest card, objectives ticking live, quest log and ratings | ✓ | ✓ | ✓ | ✓ | MC-07; PP-08 |
| Quizzes and lessons in place; the skill ladder's formula scaffold | ✓ | ✓ | ✓ 693 quizzes | ✓ | demo-story |
| Glossary marks at first use and the pop-over; terms you'll need | ✓ | ✓ | ✓ 522 terms | ✓ | GL-01..04; GP-01..05 |
| Drills, six types | ✓ (verified against spec §4) | ✓ | ✓ 146 | ✓ | signal-drills unit; demo-story, Practice |
| Live incidents (Service Mode) | ✓ | ✓ | ✓ 121 | ✓ | demo-learn, demo-story |
| Fix-It Labs, nine simulators, physics drawings | ✓ | ✓ | ✓ 91 | ✓ | learn-labs (LL-17), SP-07 |
| Season reviews, ratings, forecast and loadout, game over, retry | ✓ | ✓ | ✓ | ✓ | signal-ratings unit; demo-story |
| Meltdowns (story and Service Mode) | ✓ | ✓ | ✓ 5 | ✓ | demo-story; BN-10 |
| Boss levels (12) | ✓ | ✓ | ✓ | ✓ | signal-boss unit; BS-01..28 |
| Challenges (13 × 4 levels), sound on the audio clock | ✓ | ✓ | ✓ | ✓ | signal-challenges unit; BS-*; heard: NOT RUN |
| The bench: six demos | ✓ | ✓ | ✓ | ✓ | BN-01..12; heard: NOT RUN |
| Case files: Learn, Service, Engineer with calculator steps | ✓ | ✓ | ✓ 62 | ✓ | CF-01..06; Mastery gate (12 Nov) |
| System explorers: Reality and System views, three levels | ✓ | ✓ | ✓ 4 | ✓ | EX-01..02; LN-36 |
| Mission Control: level, evidence, journal, crew trust, systems map, roles, ratings, support | ✓ | ✓ | ✓ | ✓ | MC-01..08 |
| Quick-facts timeline | ✓ | ✓ | ✓ 55 | ✓ | LR-02 |
| Mentor channel (Ask) | ◐ built-in answers only; the live model is not used | ✓ | ✓ 20 + 7 | ✓ | MN-01..03; MC-11..13 |
| Learn library at the source's revision | ✓ | ✓ | ✓ | ✓ | LR-01 |
| Still art; calm lights | ✓ | ✓ | — | ✓ | ST-S1; BS-* |
| Fieldbook plates (160 images) | — | — | ⊘ founder, 11 Nov | — | — |

## Lite (V2.5.3, read as text)

| Experience | Behaviour | Interactions | Data | Visual | Tests |
|---|---|---|---|---|---|
| Campus, buildings and floors in 3D | ✓ | ✓ | ✓ 90 rooms | ✓ | demo-lite |
| Room as a digital twin: orbit, layers, four states, divisible rooms | ✓ | ✓ | ✓ | ✓ | demo-lite |
| Coverage overlays (camera, microphones, loudspeakers, accessibility, infrastructure) | ✓ | ✓ | ✓ catalogue | ✓ | demo-lite unit and browser |
| X-ray: sightlines, signal flow, measurements panel | ◐ acoustic figures not modeled | ✓ | ◐ no measurements on record | ✓ | unit; LT-*-X1..X5 |
| Object inspector | ◐ about 14 of 15 sections | ✓ | ✓ V2.5.3's cards; catalogue, standard, commissioning rows | ✓ | LT-*-X6, X11 |
| Optimize: change the room | ◐ moves and seats; no options A–C, no estimate | ✓ buttons | ✓ | ✓ | unit; LT-*-X8..X10 |
| Wayfinding, visit, services, Commons, guides, QR | ✓ (step-free routing TO VERIFY) | ✓ | ✓ | ✓ | demo-lite |
| Eight home storylines | — | — | ⊘ the rooms do not hold those states | — | — |
| Drift from baseline (spatial), restore or review | ✓ (recommission not carried) | ✓ | ✓ the field report on R-MER-1-140 | ✓ | unit; LT-*-D1..D4 |
| Acoustics in Lite | ◐ reverberation estimate only (Sabine, assumed finishes) | ✓ | ◐ no acoustic data | ✓ | unit; LT-*-X3 |
| Lite studio (`#/v25/lite` models) | ◐ no models from requests; no Field Intelligence sync | ✓ | ✓ V2.5.3 recipes | ✓ | LS-01..04; LT-*-S1..S5 |
| Design a Space's verbs, versions, import, fixes, rehearsal, hand-offs | ◐ no measures panel, merge or image | ✓ | ✓ | ✓ | studio-concept unit; P checks |
| Scouter anatomy | ✓ | ✓ | ✓ V2.5.3's seven classes | ✓ | LT-*-A1..A2 |
| Scouter proposals (standard kits) | ✓ classes only | ✓ | ✓ | ✓ | scouter-profiles unit; S-20..S-22 |
| Room builders' missing functions | ✕ / ◐ | | | | see LITE_INVENTORY §6 |
| Scouter named makers and prices | — | — | ⊘ no real makers or prices | — | — |

## What this matrix does not claim

- Behaviour marked ✓ was compared with the source's code and specification, not with the source running: neither source was run.
- Visual ✓ means the page was looked at in the suites' screenshots and by eye at desktop and 390 px in both themes; it is not a
  pixel comparison with the source.
- Sound: generated and scheduled in the browser, checked by its analyser and its audio clock. Nobody has listened.
