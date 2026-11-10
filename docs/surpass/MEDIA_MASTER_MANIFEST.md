# Media master manifest — as of 10 November 2026

States: PLANNED, PICTURE_RECORDED, NARRATED, QC_FAILED, QC_AUTOMATED, HUMAN_REVIEWED, APPROVED. Nothing here is HUMAN_REVIEWED or APPROVED. The process every video goes through is `docs/media/VIDEO_QA_PROCESS.md`.

| Item | State | Where | Rights and provenance | Not done |
|---|---|---|---|---|
| Film 13 "ONE ROOM. ONE TRUTH." — continuity scene 01 "Held" (27 s, 1920 × 1080) | **NARRATED · QC_FAILED** (10 November: 39 checks pass, 1 fails, 6 not run; record in `docs/media/film-13/SCENE_01_QC.md`) | Narrated master: `https://assets.vidiq.com/compositions/e7ec6a97-bd7e-420a-ac60-5e9928295665/if3g33oya2ngvc8exbgisprb.mp4` · silent picture: branch `media/film-13-pilot` · captions: `docs/media/film-13/scene-01.vtt` (re-timed to the voice, 10 November) | Picture: screen recording of the built demonstration, synthetic data only. Voice: stock voice "Brian" through the founder's vidIQ account (five lines, generated 9 November 2026). No music, no generated imagery | **No person has listened to it.** A re-take of the picture with larger text (the failing check) and the pointer off the button label; loudness; the joined file's own picture; vertical version; founder review |
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

| Check | Result | How |
|---|---|---|
| Container and streams | PASS: 27.093 s, 1920 × 1080, two streams (picture and sound) | Read from the file by the composing service's metadata tool |
| Picture content (ten checks) | PASS | `QC.json` from the recording script, on the silent picture |
| Narration words | PASS: 30 of 30 words as scripted, in each of the five voice files and again in the joined file; nothing extra spoken | The sound track was taken out of the master by the composing service and transcribed with word timings (six transcriptions, 223.8 ElevenLabs credits, about 4.5 US cents; 2 vidIQ credits) |
| Sync of each line to its picture | PASS by measurement: every line starts inside its own shot, 0.5 to 2.5 s after the picture it speaks of, and ends at least 0.27 s before the next cut; each first word is within 0.12 s of where it was placed | Word times from the joined file's sound against picture times from the silent recording. **The joined file's own picture has not been seen**, so this assumes the service did not shift the picture |
| Captions | PASS after a fix: the first captions were cut to the shots and showed "So the answer is no." 2.5 s early. Re-timed to the voice; ten caption checks pass | `scene-01.vtt` against the measured word times |
| Picture, frame figures | PASS: 809 frames, no dropped or blank frame (the dark half second at 14.8 s is the product's role-change card), longest hold 4.3 s | ffprobe and ffmpeg on the silent recording |
| Text readable where it will be watched | **FAIL**: the refusal sentence is 13.5 px in a 1920 px frame, which is 5.9 px on a phone held sideways (floor 9 px). The totals and the headline pass | Computed from the product's own type sizes; confirmed on frames scaled to 844 px |
| Loudness, pronunciation and tone | **NOT RUN** | No tool here reports a measured level, and pronunciation needs ears. The name was transcribed as "Empathia", so it is intelligible |
| Joined file's picture, vertical version, second browser, phone | **NOT RUN** | The joined file cannot be brought into this workspace |
| Human review | NOT DONE | Founder |

What the failing check means for the next take: record the same scene with the page drawn 1.6 times larger (so the refusal sentence is
21.6 px in the frame and 9.5 px on a phone), move the pointer off the button label after the press, and start line 2 two tenths of a
second earlier. The voice files do not change, so the narration is not paid for again.

Rule for every generated video from here on (founder, 9 November): no video is called done without this record filled in, and a row
that could not be run says NOT RUN.
