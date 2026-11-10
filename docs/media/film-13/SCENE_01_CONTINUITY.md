# Film 13 — ONE ROOM. ONE TRUTH. · Continuity-validation scene 01, "Held"

Status: **PICTURE RECORDED · NARRATION COMPOSED (Brian voice, 9 November) · MACHINE QC RUN 10 November: QC_FAILED on one check (the refusal sentence is too small to read on a phone) · NOT LISTENED TO BY A PERSON · NOT REVIEWED**. The measured record is `SCENE_01_QC.md`. The narrated master and its line timings are in `docs/surpass/MEDIA_MASTER_MANIFEST.md`. This file is the production package for one
27-second scene, made by `node scripts/media/film13-scene01.mjs` (output in `.local/media/film-13/scene-01/`, outside git until reviewed). It is not a film, and Film 13 is not made. Films 01 to 12 and the SIGNAL canon are untouched (V18-FILM-01, -06).

## Why this scene

Of the eight beats of Film 13 (room failure → device → Search Party → commissioning evidence → deficiency → service resolution →
assurance verification → executive report), this scene is the hinge: a label is read, the record opens, and the product **refuses** to
call the room accepted. It is the least glamorous beat and the most persuasive one, and every frame of it can be checked against the
working demonstration.

## Rule for every shot

Nothing is generated or composited. Every picture is a screen recording of the built demonstration (`apps/demo/dist`) driven by a
script, so what the film shows is what the product does. One asset, one room, one report throughout (V18-FILM-03):

| Thing | Value on screen | Where it comes from |
|---|---|---|
| Asset | `SIM-AV-0042`, digital signal processor | `@empathia/proof-registry` fixture (the founder's v1.6 reference) |
| Room | Atlas 4.218 Boardroom | the demonstration estate |
| Report | `SIM-REPORT-2026-11-08-001` | same fixture |
| Totals | 27 pass · 3 pending · 2 fail · 29 of 32 evidence records | computed from the fixture's 32 rows |
| State | Final acceptance **HELD**, 7 blockers | computed by the acceptance rules |
| Claim | `DEMO-COMMISSION-001`, Synthetic demonstration | the Proof Registry |

Every frame carries the product's own "Synthetic data" chip. No real equipment, brand, venue or person appears.

## Shot list (27 seconds, 1920 × 1080, 30 fps)

| # | Time | Picture (route, viewing role) | Action on screen | Narration |
|---|---|---|---|---|
| 1 | 0:00–0:05 | `#/scan` as Commissioning Engineer | The fixture label. The identifier `SIM-AV-0042` is typed and looked up | "One label." |
| 2 | 0:05–0:10 | `#/scan/SIM-AV-0042` | The passport opens: asset, room, 29 of 32 evidence records, "Held · 7 blockers" | "One record. Twenty-nine of thirty-two tests have their evidence." |
| 3 | 0:10–0:17 | `#/dossier/SIM-REPORT-2026-11-08-001` | The dossier: 27, 3, 2. The seven blockers listed | "Twenty-seven pass. Three are pending. Two fail." |
| 4 | 0:17–0:23 | same, viewing as Service Manager | "Record final acceptance" is pressed. The refusal appears: "Acceptance stays held: 7 blockers stand" | "So the answer is no." |
| 5 | 0:23–0:27 | same | Hold on the refusal and the red "Held" chip | "Empathia. Proof, before acceptance." |

Narration total: 33 words in 27 seconds, about 73 words a minute. The first cut was planned at 24 seconds; the product's own pace (typing, the role change) needed 27, so the plan was moved to the product rather than the product hurried. Deliberately slow; the pictures carry the detail.

## Direction

- **Camera:** none. The frame is the product at 1920 × 1080, locked off. Movement is the cursor and the page, at the speed a careful
  engineer works. No zooms, no parallax, no simulated depth.
- **Pacing:** each shot holds for at least a full second after its last change, so every figure can be read.
- **Sound:** narration only for this validation scene. No music bed and no interface sounds until a human has approved the cut.
- **Voice:** one calm, unhurried narrator; plain declarative reading; no sales energy. A stock voice licensed through the founder's
  ElevenLabs account (V18-FILM-08: no cloned or imitated voice). The voice id and model are recorded with the take.
- **Text on screen:** only the product's own text. No added titles except the closing line as a caption.

## Captions (WebVTT, to ship beside the file)

`docs/media/film-13/scene-01.vtt`, six cues timed to the recorded voice (each appears a tenth of a second before its first word and
stays until the line has been said). The first cut of the captions was timed to the shots, not the voice, and showed "So the answer is
no." two and a half seconds before it was spoken; the QC run of 10 November caught that and the file was re-timed.

## Continuity check (run on the finished file, frame by frame at each cut)

| Check | Pass condition |
|---|---|
| Asset id | `SIM-AV-0042` in shots 1, 2 and 3; never another id |
| Totals | 27 / 3 / 2 and 29 of 32 identical in shots 2, 3 and the narration |
| State | "Held" in every shot from 2 on; never a green accepted state |
| Refusal | The words "Acceptance stays held: 7 blockers stand" legible in shot 4 |
| Synthetic label | The "Synthetic data" chip visible in every shot |
| Role | The role shown in the top bar matches the action (an engineer cannot accept; the Service Manager is refused by the rule, not by the role) |
| Narration against picture | Every number spoken is on screen while it is spoken |
| Playback | Decodes with ffprobe: H.264, yuv420p, 30 fps, 1920 × 1080, faststart (AAC once narration exists) |
| Captions | The VTT loads and its cues match the narration timing to within 0.3 s |

## What needs a human before anything longer is made (V18-FILM-07, V18-GOV-08)

The founder watches the scene and answers: is the pacing right, is the voice right, is the claim it makes true and enough. An AV
engineer's review of physical plausibility (V18-FILM-05) does not apply to this scene, because it shows no equipment; it will apply
to every later scene that does. Until that review, the scene's media state is **PILOT, NOT APPROVED**.

## Result of the first recording (9 November 2026)

`QC.json` beside the file records ten automatic checks, all passing: encoded; H.264 / yuv420p / 30 fps / 1080p; 27 s; each shot
within 0.4 s of plan; the refusal text present; still HELD; 27 pass; the Synthetic chip present; the role at the refusal is the
Service Manager; no console error. Two frames were inspected by eye. Not done: narration (the workspace cannot fetch generated audio
from the voice service, so no take has been mixed), the caption-timing check against a real voice, playback in a second browser, and
any human review.
