# Video QA process

Every video made for Empathia goes through this before anyone calls it done: films, cutdowns, tour narration, SIGNAL story scenes and
anything made with a generation service. It is built on the production gates in the founder's film campaign blueprint (G1 to G5) and
on the founder's rule of 9 November: no video is done without its record filled in, and a row that could not be run says NOT RUN.

The first video through it was Film 13, scene 01. The process failed it on one check and caught a caption fault nobody had noticed.
That record is `docs/media/film-13/SCENE_01_QC.md`.

## Three passes, in this order

1. **Machine pass.** Everything that can be measured is measured, by `scripts/media/qc-lib.mjs`. The result is a generated record that a
   test compares with the measurements (`tests/unit/media-qc.test.mjs`), so the record cannot say more than was measured.
2. **Critic pass.** The frames and the cut are judged against the rubric below. When the model does this it says so, says what it
   looked at (contact sheets, not playback) and does not count as a person.
3. **Person pass.** A person watches the delivered file with sound, at desktop size and on a phone, and signs. Only this pass can move
   a video to HUMAN_REVIEWED, and only the founder moves it to APPROVED.

## States

PLANNED → PICTURE_RECORDED → NARRATED → QC_FAILED or QC_AUTOMATED → HUMAN_REVIEWED → APPROVED.

QC_FAILED means at least one measured check fails. QC_AUTOMATED means none fails; it always carries "not reviewed by a person" while
any NOT RUN row remains. Nothing is published, embedded on the website or used as a source for a longer cut before APPROVED.

## The founder's gates, and what proves each

| Gate | Proved by | Who or what |
|---|---|---|
| **G1 Storyboard locked** | A scene document with the shot list, the route and viewing role of every shot, the one fact each shot proves, and the narration with its word count and pace | Written before recording; committed (`docs/media/<film>/SCENE_nn_*.md`) |
| **G2 Capture verified** | The recording script reads the facts off the page as it records (the totals, the refusal text, the role, the "Synthetic data" chip) and fails if any is absent; no console error; every shot within 0.4 s of plan. Nothing is composited: the picture is the built product | The recording script's `QC.json` |
| **G3 Rough cut accepted** | The machine pass below, then the critic pass. One asset, one room and one report throughout | `qc-lib.mjs`, then the rubric |
| **G4 Legal and evidence review** | Every frame carries the synthetic-data label; no real organisation, venue, brand or person; no claim the Proof Registry does not hold; voices are stock voices from the founder's accounts, never cloned or imitated; rights and provenance written in the media manifest | Checked on the frames and against the manifest; signed by a person |
| **G5 Distribution ready** | Exact length; captions that pass; text readable at every size it will be watched at; correct shapes (16:9, and a native 9:16 where a vertical is promised, never a crop); loudness measured; a clean version without narration; source archive | Machine pass for what it can measure; person pass for the rest |

## Machine pass: the checks

| Group | Check | Passes when |
|---|---|---|
| Narration words | Each voice file transcribed and compared with its scripted line | Every scripted word is heard, in order, and nothing else. Figures compare as words ("29" is "twenty-nine") |
| Narration in the joined file | The joined file's sound transcribed with word times | Every line is found whole and in order; nothing is spoken that is not in the script |
| | Each line inside its shot | First word at least 0.15 s after the shot's picture arrives; last word at least 0.25 s before the next picture |
| | Each line placed as planned | First word within 0.2 s of where it was placed |
| | Each line follows its picture | The thing a line speaks of is on screen before the line starts, and no more than 2 s before |
| | Silence between lines | At least 0.4 s |
| Captions | Parse, order, overlap, inside the file | A valid WebVTT file; no cue overlaps the next; none runs past the end |
| | Say the script | Word for word |
| | Timed to the voice | A cue is up when its line starts, no more than 0.3 s early; still up when the line ends |
| | Readable | Each cue at least 1 s; at most 17 characters a second |
| Picture | Encoding and length | The planned codec, pixel format, frame rate and size; length within 0.2 s of plan |
| | Dark frames | None, unless the record names the span and what it is (and it has been seen on the frames) |
| | Holds | No stretch without change longer than the plan allows (a longer one reads as a frozen player) |
| | Text size | Every piece of text the scene depends on is at least 9 px tall at each size it will be watched at, computed from the product's own type size |

A check with no measurement behind it is NOT RUN. `judge()` never returns a pass for a record with nothing measured, and never returns
HUMAN_REVIEWED or APPROVED.

## Critic pass: the rubric

Judge the cut as a hard reviewer would, one line of finding each, with the time it occurs.

- **Does it prove one thing?** A viewer who sees only this scene can say what the product did. If not, the scene is not finished.
- **Is every figure readable for long enough?** Each figure holds at least a second after it last changes.
- **Does the voice ever lead the picture?** A line that names something not yet on screen is a fault, even by a quarter second.
- **Is anything on screen in the way?** Pointer over a label, a tooltip left open, a scrollbar mid-travel.
- **Is there a frame that looks broken?** Blank, half-drawn, a flash of the wrong theme.
- **Is the pace the product's own?** Typing and page changes at the speed a careful person works; nothing sped up, nothing padded.
- **Would it survive the sound off?** Captions alone carry the meaning.
- **Would it survive a phone?** The text the scene exists for can be read.
- **Is anything claimed that the frame does not show?** Narration says only what is on screen.
- **Story scenes (SIGNAL):** each character's voice is the one on the cast sheet; no real brand; nobody defeats a protective earth,
  stands under a moving load, climbs in a storm or is shown rigging as instruction.

## What this workspace cannot do

It cannot play a file with sound, cannot download a file made by the composing service, and has no tool that reports loudness. So
these rows are always NOT RUN here and always belong to the person pass: loudness and true peak, pronunciation and tone, the joined
file's own picture, playback in a second browser and on a phone.

## Running it for a new scene

1. Write the scene document and get the storyboard agreed (G1).
2. Record with a script that checks the facts as it records (G2).
3. Generate each narration line as its own voice file; compose; ask the composing service for the sound track of the result.
4. Transcribe each voice file and the joined sound with word times; put the words in the scene's `*.qc.json` with the shot times, the
   text sizes and the sizes it will be watched at.
5. Time the captions to the measured voice. Run the record. Fix what fails and run it again; never edit the record by hand.
6. Critic pass; then send the file and the record to the founder.

Cost of the machine pass for a 27-second scene: six transcriptions, 223.8 ElevenLabs credits (about 4.5 US cents), and 2 vidIQ credits.
