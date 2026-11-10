# Media master manifest — as of 10 November 2026

States: PLANNED, PICTURE_RECORDED, NARRATED, QC_FAILED, QC_AUTOMATED, HUMAN_REVIEWED, APPROVED. Nothing here is HUMAN_REVIEWED or APPROVED. The process every video goes through is `docs/media/VIDEO_QA_PROCESS.md`.

| Item | State | Where | Rights and provenance | Not done |
|---|---|---|---|---|
| Film 13 "ONE ROOM. ONE TRUTH." — continuity scene 01 "Held", **take 2** (27 s, 1920 × 1080) | **NARRATED · QC_AUTOMATED, not reviewed by a person** (10 November: 41 checks pass, 0 fail, 6 not run; record in `docs/media/film-13/SCENE_01_QC.md`). Three things seen on the frames still to fix in a next take | Narrated master: `https://assets.vidiq.com/compositions/e7ec6a97-bd7e-420a-ac60-5e9928295665/f1cytes2hw3burixb9yfrxpy.mp4` · silent picture: branch `media/film-13-pilot` (`film-13/scene-01-take2-silent.mp4`) · captions: `docs/media/film-13/scene-01.vtt` · take 1 master kept: `…/if3g33oya2ngvc8exbgisprb.mp4` | Picture: screen recording of the built demonstration, synthetic data only, the page drawn 1.6 times larger than take 1. Voice: stock voice "Brian" through the founder's vidIQ account (five lines, generated 9 November 2026; unchanged in take 2). No music, no generated imagery | **No person has watched or listened.** Next take: pointer off the words "Held · 7 blockers" at 7 s; open on the top of the scan page; keep the "Held" chip in frame during the closing hold or change the storyboard. Then loudness, the joined file's own picture, a vertical version, founder review |
| Film 13 — 180-second master and 30 / 60-second cutdowns | PLANNED | Storyboard in the Surpass directive §27 | — | Starts only after the scene above is approved by the founder |
| Films 01–12, SIGNAL film and voice canon | Untouched | As delivered on 4 November | Unchanged | Inventory against the media library index (`EMPATHIA_MEDIA_AND_FILM_LIBRARY_INDEX`) not yet done |
| Collabora-SING | MEDIA_SOURCE_NOT_YET_ANALYSED | `Collabora-sing-SyncLab-3D.html` and the SyncLab engineering report were supplied | — | Read the source, establish what it is, then plan the upgrade. No film is claimed |

## Narration lines as recorded (scene 01)

| Starts | Line | Voice file length |
|---|---|---|
| 0:01.2 | One label. | 0.9 s |
| 0:05.3 | One record. Twenty-nine of thirty-two tests have their evidence. | 4.6 s |
| 0:10.9 | Twenty-seven pass. Three are pending. Two fail. | 4.0 s |
| 0:19.2 | So the answer is no. | 1.4 s |
| 0:23.5 | Empathia. Proof, before acceptance. | 2.8 s |

## QC record — scene 01 narrated master (10 November)

The full record is generated from measurements: `docs/media/film-13/SCENE_01_QC.md` (`node scripts/media/film13-scene01-qc.mjs`), and
`tests/unit/media-qc.test.mjs` fails if the committed record differs from what the measurements say.

| Check | Take 1 | Take 2 |
|---|---|---|
| Container and streams | PASS: 27.093 s, 1920 × 1080, picture and sound | PASS: 27.094 s, 1920 × 1080, picture and sound |
| Picture content (ten checks by the recording script) | PASS | PASS |
| Narration words | PASS: 30 of 30 as scripted, in each voice file and in the joined file | PASS: 30 of 30 in the joined file (voice files unchanged) |
| Each line inside its shot, after the picture it speaks of | PASS, but line 2 ended 0.27 s before its cut | PASS: the closest is 0.53 s |
| Captions | First captions were cut to the shots and showed "So the answer is no." 2.5 s early. Re-timed to the voice | PASS: ten caption checks |
| The picture fills the frame, no dropped or blank frame | PASS | PASS (a first try did not fill the frame and was discarded; the check was added because the recorder reported success) |
| Text readable where it will be watched | **FAIL**: the refusal sentence was 5.9 px on a phone held sideways (floor 9 px) | PASS: 9.5 px on a phone held sideways, 14.4 px in a desktop page |
| Seen on the frames (by the model, not a person) | The pointer hid the button label | Three things still to fix: see the record |
| Loudness, pronunciation and tone | **NOT RUN** | **NOT RUN** |
| Joined file's own picture, vertical version, second browser, phone | **NOT RUN** | **NOT RUN** |
| Human review | NOT DONE | NOT DONE |

Cost on 10 November: 372.8 ElevenLabs credits for seven transcriptions (about 7.5 US cents), and 20 vidIQ credits (two sound
extractions, one levelled copy, six compositions for take 2). Take 1's six compositions cost 17 vidIQ credits on 9 November.

Rule for every generated video from here on (founder, 9 November): no video is called done without this record filled in, and a row
that could not be run says NOT RUN.
