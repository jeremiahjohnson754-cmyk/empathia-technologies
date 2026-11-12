# SIGNAL: inventory of the source, reconciled against the product

**State: the inventory of the source is complete. The reconciliation is first-pass: each line says whether it was verified in code or
still has to be. Nothing is restored by this document.** Started 11 November 2026 on the founder's instruction of 17:06 that day
("Restoration first. Transformation second. Verification throughout."). SIGNAL is **not complete**; this page says by how much.

Counts and identifiers only. No dialogue or narrative text is reproduced here.

## 1. The source

| | |
|---|---|
| File | `signal-standalone1.html`, 27,825,274 bytes, SHA-256 `80f8d992…` |
| Identity | Byte-identical to the `signal-standalone.html` supplied on 3 November, the reference build of the founder's build package (`packages/signal-canon/README.md`) |
| How it was read | As text, with `python3 -I`. It was not opened in a browser and no script in it was run |
| What it is | One page: 14.0 MB of fieldbook plates (160 WebP images as data), 3.0 MB of application data, 609 KB of application code (398 named functions), and the story pre-rendered as markup (155 chapter sections, 5,946 element ids, 3,657 buttons) |
| Views | Seven: Mission Control (`home`), Story, Learn, Practice, Service Mode, Case Files, Ask |
| Kept in the browser | Progress, per viewer; two settings (calm mode, review mode) |
| Network | None needed except the web fonts. No audio or video file, no `<audio>` or `<video>` element, no speech synthesis |

## 2. Authored content

"Product" is this repository's demonstration. "Canon" is `packages/signal-canon` (the founder's build package, unedited, held by hash).
"Library" is `packages/domain-data/data/SIGNAL_LIB.json`.

| Content | In the source | In the product | State |
|---|---:|---|---|
| Prologue sections | 11 | 11, canon | RESTORED, tested (`signal-canon` unit suite, `demo-story` browser suite) |
| Chapters, twelve seasons | 133 | 133, canon | RESTORED, tested |
| Panels with art | 1,610 | 1,610, canon | RESTORED, tested |
| Decisions (350 timed) | 387 | 387, canon; they gate the story and can fail | RESTORED, tested |
| Discoveries | 250 | 250, canon | RESTORED, tested |
| Quests / objectives | 121 / 720 | 121 quests in the canon stream | RESTORED: content in the story; the quest log, objectives and S–D ratings on Mission Control (12 Nov, MC-07); objective lines in the result pop-ups (12 Nov) |
| Optional conversations (talks) | 121 | 121, canon | RESTORED, tested |
| Beats, twists, notes, history | 260 beats, 232 twists | canon | RESTORED, tested |
| Lessons | 161 (657 cards, 501 plate references) | Since 12 Nov Learn reads the library cut from the build package (`signal-lib.json` from `app-data.json`): the source's revision of all 161, without the plate references (the plates are not shipped, founder 11 Nov) | RESTORED 12 Nov (LR-01) |
| Quizzes | **693** (2,105 questions) | **223** in the library the pages read. Missing there: 121 chapter quizzes, 121 chapter "UX" quizzes, 224 twist quizzes, 4 season finals; 42 of the 223 differ. All 693 are now held, unedited, in `packages/signal-canon/data/app-data.json`, which no page reads yet | **470 not yet reachable** |
| Labs | 91 in nine types | All 91 at the source's revision; all nine types have a simulator (11 Nov), physics drawings (12 Nov) | RESTORED |
| Drills | 146 in six types | All 146 at the source's revision (12 Nov). All six types run in Practice and in the story | RESTORED; each type's behaviour TO VERIFY against the source |
| Live incidents (Service Mode) | 121 | All 121 at the source's revision (12 Nov), without plates; the shared runner (11 Nov) | RESTORED |
| Case files | 62 | Learn → Case Files: each SIGNAL case with its Learn, Service and Engineer perspectives, its check, the live incident, and the engineer's arithmetic step by step (reference renderCases / calcStep, 12 Nov) | RESTORED 12 Nov (CF-01..04) |
| Formulas with calculators | 125 | 125 at the source's revision; the formula card in boss stages by support tier (12 Nov); in case files the step's formula is shown with it | RESTORED, except the Mastery "choose the relationship" gate in case files (the boss stages have it) |
| Glossary | 522 terms | 522 at the source's revision in the Fieldbook; marked at first use in the story's reading text with the reference's pop-over (12 Nov): 460 marks across the story | RESTORED 12 Nov (GL-01..03, GP-01..04). Not carried: marks inside lesson cards and meltdown briefs |
| Explorers (layered system views) | 4 | All four; Reality and System views, three named levels, layer colours, each "?" answered for the view (12 Nov) | RESTORED 12 Nov (EX-01..02) |
| Fieldbook plates | 160 images with captions, in nine domains | Not in the library. The story's own art is in the canon | **NOT ADDED, by the founder's decision (11 Nov, 19:32)** |
| Boss levels | 12, one per season | 12, in the story (`BossRunner`) | **RESTORED 12 Nov** |
| Meltdowns | 5 | `packages/ui/src/meltdown.ts` + `MeltdownRunner` | **RESTORED 11 Nov** (in the story); listed and playable in Learn's Service Mode since 12 Nov (`a8d7732`, BN-10) |
| Season reviews | 12 | `apps/demo/src/signal/ratings.ts`, in the story | **RESTORED 11 Nov** |
| System maps per season | 12 | Mission Control's systems map, one per season, lit by chapters opened and incidents proven (12 Nov) | RESTORED 12 Nov (MC-02) |
| Timeline | 55 entries | Learn library → Quick facts timeline, by season, each tied to its chapter, RV-27 shown (12 Nov) | RESTORED 12 Nov (LR-02) |
| Ask: offline answers and rules | 20 answers, 7 suggestions | Ask → SIGNAL mentor channel on the 20 built-in answers and 7 suggestions (12 Nov). The live-model path and its rules prompt are not carried: no model is used here, and the page says so | RESTORED 12 Nov (MN-01..03, MC-11..13) |
| Roles on Mission Control | 5 (two playable, three previews) | Mission Control's role path (12 Nov) | RESTORED 12 Nov (MC-01) |

## 3. Interactive pieces inside the chapters

In the source a chapter is not only read. By the build package's own list of gates in reading order (`packages/signal-canon/data/gates.json`,
1,366 gates: 537 hard, 488 soft, 341 optional), **979 interactive pieces sit inside the chapters** beside the 387 decisions.
747 are mounted between panels; 232 are the tests that follow a twist.

| In the chapters | Count | Tier in the source | In the product's story reader |
|---|---:|---|---|
| Quizzes | 470 (246 mounted, 224 after a twist) | 224 soft, 246 optional | **RESTORED 11 Nov:** played in place from the build package's own quizzes; each question answers once, right and wrong marked, the explanation shown; best and first scores kept. Soft ones hold the story until answered or skipped; optional ones never hold. `demo-story` ST-35..37, ST-42; `signal-story` SS-09..11 |
| Lessons | 148 | 142 soft, 6 optional | **RESTORED 11 Nov:** opened in place with its cards (formulas as code, only the source's inline marks kept) and its review flag; done when its own check is recorded; soft ones hold or can be skipped. `demo-story` ST-38..39 |
| Drills | 136 (128 mounted, 8 after a twist) | **79 hard**, 8 soft, 49 optional | **RESTORED 11 Nov:** played in place on the reference's rules for all six kinds (`packages/ui/src/drills.ts`, one runner for Learn, the enterprise app and the story): seeded order as the reference, "Start the clock" after the brief, the story's clock (doubled or off), a timeout fails the try, each failure explains itself, Try again; triage scored against the best affordable plan; the eight failure classes; record `{passed, tries, first}`. The 79 hard ones (core skills) now hold the story until a try is recorded, as `gate.js`. `signal-drills` SD-01..09, `demo-story` ST-43..52 |
| Live incidents | 121 | 114 soft, 7 optional | **RESTORED 11 Nov:** played in place on the reference's rules (`packages/ui/src/incidents.ts`, one runner for Learn's Service Mode and the story): briefing, Start, a real-time clock that actions spend, refusals that cost time and count, boundary endings, lost evidence kept lost, trust 0–5, calculation gates with penalties, the reference's outcomes and debrief, record `{best, runs, first, firstWhy}`. Soft ones hold the story until a run ends or are skipped. All 121 of the package's solver paths replay to proven inside the clock (`signal-incidents` SI-01..07); `demo-story` ST-53..62 |
| Labs | 75 | **42 hard**, 33 optional | **RESTORED 11 Nov:** played in place on the reference's rules (`packages/ui/src/labs.ts`, `physics.ts`, `LabRunner`): all nine kinds have a simulator; every one of the 91 labs fails at its start and passes with its fix (51 fixes the package's own, 40 derived and marked so). Physics labs have controls, live readouts and (since 12 Nov) the reference's animated canvas drawings for all 24 simulations the canon mounts, held still under reduced motion (`physicsDraw.ts`, `signal-physics` SP-07). A lab gate clears when fixed or ended. Learn's lab page runs the same runner. `signal-labs`, `signal-physics`, `demo-story` ST-63..70, `learn-labs` LL-12..17 |
| Season reviews | 12 | **hard** | **RESTORED 11 Nov:** six ratings from first attempts, Story Score, what pulled it down, the Seasons 10–12 forecast (loadout locked at Season 9); below 65 game over with Retry season / Restart / Look back, and a banner until retried. `signal-ratings` RT-01..08 (hand-worked figures), `demo-story` ST-71..76 |
| Boss levels | 12 | **hard** | **RESTORED 12 Nov:** the reference's Episode 11 run (`packages/ui/src/boss.ts` + `BossRunner`): briefing with stakes, pips and rules; each stage on its own clock (§12 figures × the timer factor); the trace, the calls, five one-shot challenges at the season's level, and from Season 8 the commission — ask (question budget, must-asks, follow-ups, traps end the run), scope (one slip allowed where the package allows it), design (live meters, boundary options end the run), cost (the estimate to the package's own check, a formula gate at Mastery, value engineering inside the budget). Any failure ends the run with its reason; the alarm light pulses at most once a second, or holds a tint with calm lights or reduced motion. Record `{tries, passed, best}`; the hard gate clears on a pass. All twelve clear on the intended answers (`signal-boss` 30 tests, 21 mutations killed); `demo-boss` plays S01 and S08 to the end on the page |
| Meltdowns | 5 | **hard** | **RESTORED 11 Nov:** the cascade engine on the reference's rules, the map, dark time, objectives, holds, calculation card, real-time story clock (pauses off screen and on ⏸), Season 12's year and actors, the after-action review; loadout requirements read from the ratings. All five expert runs end proven with grade S. `signal-meltdown` MD-01..05, `demo-story` ST-77..82 |

Verified in `apps/demo/src/signal/StoryPage.tsx` (the `mount` and `twist` cases). In the source, 150 of these pieces are hard gates
(79 drills, 42 labs, 12 reviews, 12 bosses, 5 meltdowns): the story does not go on until they are passed. In the product only the 387
decisions gate, and since 11 November the 366 soft quizzes and lessons, the 136 drills, the 121 live incidents, the 75 labs, the 12 season reviews and the 5 meltdowns; since 12 November the 12 boss levels too, so every hard and soft gate kind in the canon plays and holds the story, and chapter locks are on.

(The first pass of this page counted 997 from the standalone's markup, which also counts pieces mounted in its other views. The
gate list is the authority and gives 979.)

## 4. Engines and interactions

| In the source | What it does | In the product | State |
|---|---|---|---|
| Story reader with decisions, a clock, hints, merit and trust | | `#/story` | RESTORED as content, tested. **Behaviour differs**, next line |
| What a decision does | The choice is recorded. A failing option is a costly call: it is kept, with its negative merit and trust, and the story goes on. Tapping another replaces it. A timeout is recorded (merit −2) and the card turns to review; Replay reopens it. The clock starts when the card is in view | Same, since 11 Nov (`signal/story.ts`). Hint credit is applied to merit, where the reference's own open issue OI-ENG-02 leaves it unapplied | **RESTORED**, tested (`signal-story` unit 8/8, 7 mutations caught; `demo-story` 38, `demo-play` 24, light and dark) |
| Echoes: the previous chapter's choices at the top of the next, and a verdict before the debrief | | Both, in the reference's words | **RESTORED**, tested (ST-19, ST-19b) |
| Result pop-ups when a gate is done, and "Chapter complete" with the quest grade |  | A card for each gate cleared by playing it and CHAPTER COMPLETE with the quest rating, discoveries and the chapter unlocked; focus and keys as the reference (12 Nov). `window.SIGNAL_NOPOP` turns them off, as in the reference's own QA | RESTORED 12 Nov (PO-01..05, PP-01..07) |
| Story played as staged shots | (not in the source: added in this product) | `#/play/<chapter>` | ADDED, tested |
| Chapter locks and gates (hard, soft, optional) | A chapter opens when what it requires is done | Every gate kind plays and gates within its chapter as the reference's gate.js has it. Since 12 Nov a chapter is **locked** until every hard and soft gate of the one before is cleared (done, or a soft one skipped); a locked chapter shows its heading, the review bar and flags and a card back to the chapter to finish; the library marks locked chapters in words; reviewer mode removes every lock without touching progress (`story.ts chapterLocks`, `signal-story` SS-12..16, `demo-story` ST-83..89) | **RESTORED** |
| Nine lab simulators: signal flow; EQ and time alignment; camera against an LED wall; network and VLANs; power across circuits; RF; DMX; AV sync; physics (36 labs) | | All nine, since 11 Nov (`labs.ts`, `physics.ts`, `LabRunner`; above); the physics drawings since 12 Nov. Learn's own three instrument labs (audio, camera, lighting) remain this product's own | **RESTORED** |
| Six drill types: route, first failure, clues, class match, order, triage | Timed, failable | All six in Practice | TO VERIFY behaviour |
| Service Mode: an incident with a clock, evidence, actions that cost time, crew trust, outcomes | | Learn's Service Mode runs the 121 incidents on the shared runner above since 11 Nov; before that its runner departed from the source in eight ways (listed in `incidents.ts`) | RESTORED (incident rules); the Service Mode queue page's other content not yet compared |
| Thirteen challenges in five modes, four levels each: Hear it (2), See it (3), Reach it (2), Build it (3), Record it (3). Web Audio synthesis, a song on the audio clock, cue timing | Scored, with records | `packages/ui/src/challenges/*` and `ChallengeRunner`, played inside the boss levels: every model, check and wording ported; every start fails and every recipe passes 100/100 at all four levels as the reference QA log records (`signal-challenges` 130 tests, 21 mutations killed). Drawings for eight of thirteen (EQ curves, word levels, the moiré sensor crop computed pixel by pixel, the promo slide with colour-blind and greyscale previews, lux across the walk, RT60, the RF plan, loudness); the vocal plays through your compressor; the strummed guitar (Karplus–Strong, the reference's seed) plays live through their EQ and yours with A/B bypass, under a ⅓-octave analyser against the untouched outline. The catalogue is in Learn at `#/learn/challenges` (mode tabs, four levels with your best, one stage). **Gaps:** the animated stage drawings for see-focus, record-take, record-panel, build-stream and reach-cues are not restored | **RESTORED (engines, in bosses); PARTIAL (catalogue, some drawings and sound)** |
| Six demos: EQ, beam, ear, compressor, shutter, colour | The reference's bench, "HEAR IT, SEE IT", after the meltdowns in Service Mode (`demos.js`) | Learn → Service Mode → The bench (`packages/ui/src/Bench.tsx`, 12 Nov): the ear and Terhardt's threshold, EQ with pink noise and a live ⅓-octave analyser, the compressor's transfer curve and two seconds of gain, shutter angle and rolling-shutter flicker bands, beam and field geometry with E = I ÷ d², colour temperature with mireds and additive mixing. Browser suite `demo-bench` 23/23 | **RESTORED 12 Nov** |
| Boss levels | Scope, estimate, design and cost a job against a clock | In the story since 12 Nov (above) | **RESTORED** |
| Meltdowns | A multi-turn crisis with threats, actors and a budget | in the story (above) | **RESTORED 11 Nov** |
| Season run: loadout, forecast, game over, retry a season | | Season reviews in the story carry the forecast (before Season 9) and the loadout (Seasons 10–12), game over below 65, retry a season or restart the story (11 Nov); meltdowns read the loadout | **RESTORED 11 Nov** |
| Season review |  | Season reviews in the story: six ratings, Story Score, game over and retry (11 Nov) | RESTORED 11 Nov |
| Mission Control: continue the story, competency level, evidence locker, case journal, quest log, ratings, crew trust, support level | | `#/learn/mission` since 12 Nov, on the story's own progress (`signal/mission.ts`, spec §14): the season's console, continue, the L0–L5 ladder (provisional, RV-20), the evidence locker (bosses and challenge levels added), role path, crew trust and merit from every choice and conversation, E0–E3 by domain, the twelve systems maps lit by chapters opened and incidents proven, the six ratings from first attempts, timers and support level (the support level now sets the boss formula tier), reviewer mode and reset (two taps each), the quest log (each chapter's objectives ticked as gates clear, the S–D quest rating with the reference's lines) and the case journal (250 discoveries by thread, with where to look for the ones not found). `signal-mission` MC-01..06, `demo-boss` MC-01..08 | **RESTORED** |
| Formula calculators and "ask the calculator" |  | Boss stages: the formula card by tier, the Mastery gate (12 Nov); case files: the engineer's calculator steps (12 Nov) | RESTORED 12 Nov |
| Glossary pop-overs on marked terms, with "first met in" |  | In the story (12 Nov): definition, first formula, "first met", a link to the glossary | RESTORED 12 Nov |
| Explorers and the system map |  | Learn → Explore (12 Nov); the systems map on Mission Control (12 Nov) | RESTORED 12 Nov |
| Review mode (shows the 318 review flags) and calm mode | | Flags are shown in the story. Calm mode: TO VERIFY | |
| Keyboard: Space, Enter, Escape, Tab handled throughout | | Story reader: tested | TO VERIFY elsewhere |

## 5. Media in the SIGNAL source

| Kind | In the source | State in the product |
|---|---|---|
| Narration audio | **None.** The standalone has no recorded or synthesised speech | Nothing to restore from this file |
| Video | **None** | Nothing to restore from this file |
| Sound | Generated in the browser (Web Audio) by the challenges and demos; no audio file | **RESTORED 12 Nov:** the synthesised vocal (hear-comp) plays untouched and through your compressor; the guitar (hear-eq) plays live through the EQ chain; the lighting desk plays the reference's band on the audio clock (cues judged against it). The bench plays a quiet tone (the ear) and pink noise through the five EQ filters into a live analyser (BN-04); the cue desk's band is checked on the audio clock (BS-28). Sound starts only from a button. Heard through a loudspeaker: NOT RUN (headless runs check scheduling and analysis only) |
| Images | 160 fieldbook plates (WebP) and the chapter art | Chapter art RESTORED (canon). Plates: not added, by the founder's decision (11 Nov, 19:32) |

Narration and films belong to the V2.5.3 application and the produced films, audited separately (`docs/parity/MEDIA_RESTORATION_STATUS.md`,
`docs/surpass/MEDIA_MASTER_MANIFEST.md`); that audit is to be redone under the same instruction, with playback verified in a browser
before any item is called working.

## 6. What restoration means here, in order

1. Bring the library to the source's revision. **Done as data (11 Nov):** the build package's complete content bundle
   (`app-data.json`, byte-for-byte what the reference build embeds: verified equal to the standalone's embedded data) and its gate list
   are in `packages/signal-canon/data/`, held by hash, with `tests/unit/signal-library.test.mjs`. **Not done:** the Learn pages still
   read the earlier library; the 160 fieldbook plate images are not in the repository (see §7).
2. Play every piece in place in the story, with the tier of gate it carries: quizzes and lessons first (618 of the 979; **done 11 November**), then drills and incidents (257; **both done 11 November**),
   then labs, reviews and meltdowns (**done 11 November**), then boss levels (**done 12 November**).
3. The eight missing lab simulators, the thirteen challenges and the six demos (**all done**: simulators 11 Nov; challenges and the bench 12 Nov).
4. Mission Control as the source has it: quest log, journal, ratings, trust, competency, evidence locker (**done 12 Nov**, `#/learn/mission`).
5. Every line above marked TO VERIFY, verified against the source's behaviour, then a functional and a visual test for each.

## 7. Limits of this inventory

- **The specification exists.** The founder's build package (`signal-build-package.zip`, SHA-256 `990cf805…`) carries the engine
  specification (`docs/04-engine-specs.md`: decisions, gates, quizzes and the skill ladder, six drill types, labs, physics, Service
  Mode, case files, meltdowns, ratings and reviews, the role-playing layer, boss levels, challenges, Mission Control, Ask), a QA plan
  and logs, 54 reference screenshots (27 views at desktop and phone width) and the reference runtime's source. It says: where a
  document and the reference build disagree, the reference build is the specification. Restoration follows it, engine by engine;
  the screenshots are the visual reference for each view. The package is held outside the repository.

- **Fieldbook plates.** The build package says the plates are the owner's own and are the one exception to the story's no-real-brands
  rule. Their captions are in the content bundle; the 160 images are not in this repository, and they will not be added without the
  founder's word, because a plate may show a real product or maker. Until then a plate shows a labelled card, which is also what
  the source does when a plate cannot load.

- The source was read, not run. Behaviour is inferred from its code and data; where that is uncertain the line says TO VERIFY.
- "Differ" means the stored data is not byte-equal after parsing. It does not yet say which side is newer in every case; the library
  carries a revision field the source does not, and the source carries fields the library does not.
- The second variant of the standalone (one remembered-choice flag on one decision) still needs the founder's ruling
  (`docs/surpass/SIGNAL_CANON_DIFF_AND_PLAYABILITY_AUDIT.md`).
