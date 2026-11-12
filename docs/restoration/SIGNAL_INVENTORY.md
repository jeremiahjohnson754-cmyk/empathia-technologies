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
| Quests / objectives | 121 / 720 | 121 quests in the canon stream | RESTORED as content. Quest log and ratings on Mission Control: TO VERIFY |
| Optional conversations (talks) | 121 | 121, canon | RESTORED, tested |
| Beats, twists, notes, history | 260 beats, 232 twists | canon | RESTORED, tested |
| Lessons | 161 (657 cards, 501 plate references) | 161, library, **an earlier revision**: 111 lessons differ in their cards; no plate references; no review flags | PARTIAL |
| Quizzes | **693** (2,105 questions) | **223** in the library the pages read. Missing there: 121 chapter quizzes, 121 chapter "UX" quizzes, 224 twist quizzes, 4 season finals; 42 of the 223 differ. All 693 are now held, unedited, in `packages/signal-canon/data/app-data.json`, which no page reads yet | **470 not yet reachable** |
| Labs | 91 in nine types | 91, library (earlier revision: about 30 differ). **Only the 26 signal-flow labs have a simulator**; the other 65 show their brief | PARTIAL: 65 of 91 not playable |
| Drills | 146 in six types | 146, library (42 briefs differ). All six types run in Practice | RESTORED in an earlier revision; TO VERIFY each type against the source's behaviour |
| Live incidents (Service Mode) | 121 | 121, library (41 briefings and 32 action lists differ; no plates; no notes) | PARTIAL; engine TO VERIFY |
| Case files | 62 | 62, library (60 differ in two fields) | PARTIAL |
| Formulas with calculators | 125 | 125, library (11 notes differ) | Content present. The calculators (step-by-step working): TO VERIFY |
| Glossary | 522 terms | 522, library (15 definitions differ; first-use chapter and season not carried) | PARTIAL. In-story term pop-overs (738 marked uses): TO VERIFY |
| Explorers (layered system views) | 4 | 4, library, not identical | TO VERIFY |
| Fieldbook plates | 160 images with captions, in nine domains | Not in the library. The story's own art is in the canon | **MISSING from Learn** (TO VERIFY whether the canon's art covers them) |
| Boss levels | 12, one per season | none | **MISSING** |
| Meltdowns | 5 | none | **MISSING** |
| Season reviews | 12 | none | **MISSING** |
| System maps per season | 12 | none found | **MISSING** (TO VERIFY) |
| Timeline | 55 entries | none found | **MISSING** (TO VERIFY) |
| Ask: offline answers and rules | 20 answers, 7 suggestions | Ask exists (`#/ask`); whether it carries these 20: TO VERIFY | TO VERIFY |
| Roles on Mission Control | 5 (two playable, three previews) | not carried | TO VERIFY |

## 3. Interactive pieces inside the chapters

In the source a chapter is not only read. By the build package's own list of gates in reading order (`packages/signal-canon/data/gates.json`,
1,366 gates: 537 hard, 488 soft, 341 optional), **979 interactive pieces sit inside the chapters** beside the 387 decisions.
747 are mounted between panels; 232 are the tests that follow a twist.

| In the chapters | Count | Tier in the source | In the product's story reader |
|---|---:|---|---|
| Quizzes | 470 (246 mounted, 224 after a twist) | 224 soft, 246 optional | **RESTORED 11 Nov:** played in place from the build package's own quizzes; each question answers once, right and wrong marked, the explanation shown; best and first scores kept. Soft ones hold the story until answered or skipped; optional ones never hold. `demo-story` ST-35..37, ST-42; `signal-story` SS-09..11 |
| Lessons | 148 | 142 soft, 6 optional | **RESTORED 11 Nov:** opened in place with its cards (formulas as code, only the source's inline marks kept) and its review flag; done when its own check is recorded; soft ones hold or can be skipped. `demo-story` ST-38..39 |
| Drills | 136 (128 mounted, 8 after a twist) | **79 hard**, 8 soft, 49 optional | "Not yet playable from the story in this build" |
| Live incidents | 121 | 114 soft, 7 optional | "Not yet playable from the story in this build" |
| Labs | 75 | **42 hard**, 33 optional | A link to the lab page; only the signal-flow labs have a simulator there |
| Season reviews | 12 | **hard** | "Not yet playable" |
| Boss levels | 12 | **hard** | "Not yet playable" |
| Meltdowns | 5 | **hard** | "Not yet playable" |

Verified in `apps/demo/src/signal/StoryPage.tsx` (the `mount` and `twist` cases). In the source, 150 of these pieces are hard gates
(79 drills, 42 labs, 12 reviews, 12 bosses, 5 meltdowns): the story does not go on until they are passed. In the product only the 387
decisions gate, and since 11 November the 366 soft quizzes and lessons. **The 150 hard gates of other kinds are the largest gap**: they are shown and said not to hold the story yet, rather than holding it unplayably.

(The first pass of this page counted 997 from the standalone's markup, which also counts pieces mounted in its other views. The
gate list is the authority and gives 979.)

## 4. Engines and interactions

| In the source | What it does | In the product | State |
|---|---|---|---|
| Story reader with decisions, a clock, hints, merit and trust | | `#/story` | RESTORED as content, tested. **Behaviour differs**, next line |
| What a decision does | The choice is recorded. A failing option is a costly call: it is kept, with its negative merit and trust, and the story goes on. Tapping another replaces it. A timeout is recorded (merit −2) and the card turns to review; Replay reopens it. The clock starts when the card is in view | Same, since 11 Nov (`signal/story.ts`). Hint credit is applied to merit, where the reference's own open issue OI-ENG-02 leaves it unapplied | **RESTORED**, tested (`signal-story` unit 8/8, 7 mutations caught; `demo-story` 38, `demo-play` 24, light and dark) |
| Echoes: the previous chapter's choices at the top of the next, and a verdict before the debrief | | Both, in the reference's words | **RESTORED**, tested (ST-19, ST-19b) |
| Result pop-ups when a gate is done, and "Chapter complete" with the quest grade | | not found | **MISSING** (TO VERIFY) |
| Story played as staged shots | (not in the source: added in this product) | `#/play/<chapter>` | ADDED, tested |
| Chapter locks and gates (hard, soft, optional) | A chapter opens when what it requires is done | Within a chapter: decisions (hard), quizzes and lessons (soft) gate, as in the reference's gate.js. Chapter locks are **deferred** until every hard kind is playable, since an unplayable hard gate would lock the rest of the story | PARTIAL |
| Nine lab simulators: signal flow; EQ and time alignment; camera against an LED wall; network and VLANs; power across circuits; RF; DMX; AV sync; physics (36 labs) | | Signal flow only. Three separate instrument labs exist in Learn (audio, camera, lighting), which are this product's own, not these | **8 of 9 MISSING** |
| Six drill types: route, first failure, clues, class match, order, triage | Timed, failable | All six in Practice | TO VERIFY behaviour |
| Service Mode: an incident with a clock, evidence, actions that cost time, crew trust, outcomes | | Service Mode pages exist with an incident runner | TO VERIFY against the source |
| Thirteen challenges in five modes, four levels each: Hear it (2), See it (3), Reach it (2), Build it (3), Record it (3). Web Audio synthesis, a song on the audio clock, cue timing | Scored, with records | none found | **MISSING** |
| Six demos: EQ, beam, ear, compressor, shutter, colour | Small live illustrations inside lessons | none found | **MISSING** (TO VERIFY) |
| Boss levels | Scope, estimate, design and cost a job against a clock | none | **MISSING** |
| Meltdowns | A multi-turn crisis with threats, actors and a budget | none | **MISSING** |
| Season run: loadout, forecast, game over, retry a season | | none found | **MISSING** (TO VERIFY) |
| Season review | | none | **MISSING** |
| Mission Control: continue the story, competency level, evidence locker, case journal, quest log, ratings, crew trust, support level | | Learn home shows progress of a different shape | PARTIAL, TO VERIFY line by line |
| Formula calculators and "ask the calculator" | | TO VERIFY | |
| Glossary pop-overs on marked terms, with "first met in" | | TO VERIFY | |
| Explorers and the system map | | An Explore page exists | TO VERIFY |
| Review mode (shows the 318 review flags) and calm mode | | Flags are shown in the story. Calm mode: TO VERIFY | |
| Keyboard: Space, Enter, Escape, Tab handled throughout | | Story reader: tested | TO VERIFY elsewhere |

## 5. Media in the SIGNAL source

| Kind | In the source | State in the product |
|---|---|---|
| Narration audio | **None.** The standalone has no recorded or synthesised speech | Nothing to restore from this file |
| Video | **None** | Nothing to restore from this file |
| Sound | Generated in the browser (Web Audio) by the challenges and demos; no audio file | MISSING with the challenges |
| Images | 160 fieldbook plates (WebP) and the chapter art | Chapter art RESTORED (canon). Plates: TO VERIFY |

Narration and films belong to the V2.5.3 application and the produced films, audited separately (`docs/parity/MEDIA_RESTORATION_STATUS.md`,
`docs/surpass/MEDIA_MASTER_MANIFEST.md`); that audit is to be redone under the same instruction, with playback verified in a browser
before any item is called working.

## 6. What restoration means here, in order

1. Bring the library to the source's revision. **Done as data (11 Nov):** the build package's complete content bundle
   (`app-data.json`, byte-for-byte what the reference build embeds: verified equal to the standalone's embedded data) and its gate list
   are in `packages/signal-canon/data/`, held by hash, with `tests/unit/signal-library.test.mjs`. **Not done:** the Learn pages still
   read the earlier library; the 160 fieldbook plate images are not in the repository (see §7).
2. Play every piece in place in the story, with the tier of gate it carries: quizzes and lessons first (618 of the 979; **done 11 November**), then drills
   and incidents (257), then labs, reviews, bosses and meltdowns.
3. The eight missing lab simulators, the thirteen challenges and the six demos.
4. Mission Control as the source has it: quest log, journal, ratings, trust, competency, evidence locker.
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
