# Media master manifest — as of 9 November 2026

States: PLANNED, PICTURE_RECORDED, NARRATED, QC_AUTOMATED, HUMAN_REVIEWED, APPROVED. Nothing here is HUMAN_REVIEWED or APPROVED.

| Item | State | Where | Rights and provenance | Not done |
|---|---|---|---|---|
| Film 13 "ONE ROOM. ONE TRUTH." — continuity scene 01 "Held" (27 s, 1920 × 1080) | **NARRATED**, picture QC_AUTOMATED (10 checks) | Narrated master: `https://assets.vidiq.com/compositions/e7ec6a97-bd7e-420a-ac60-5e9928295665/if3g33oya2ngvc8exbgisprb.mp4` · silent picture: branch `media/film-13-pilot` · captions: `.local/media/film-13/scene-01/scene-01.vtt` | Picture: screen recording of the built demonstration, synthetic data only. Voice: stock voice "Brian" through the founder's vidIQ account (five lines, generated 9 November 2026). No music, no generated imagery | **Nobody has listened to it.** The workspace cannot download the composed file, so audio level, pronunciation and sync are unverified. Founder review; second-browser playback; caption timing against the real voice |
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

## QC record — scene 01 narrated master (9 November, 22:40)

| Check | Result | How |
|---|---|---|
| Container and streams | PASS: 27.094 s, 1920 × 1080, two streams (picture and sound), 7.9 MB | Read from the file by the composing service's own metadata tool |
| Picture content (ten checks) | PASS | `QC.json` from the recording script, on the silent picture |
| Narration words, pronunciation, level | **NOT RUN** | The file cannot be brought into this workspace (the network gateway refuses the host), and the transcription connector accepts sound files only, not video. Plan: transcribe the five voice files with word timings and compare with the script |
| Sync of each line to its picture | NOT RUN (placed by construction at 1.2, 5.3, 10.9, 19.2 and 23.5 s) | Needs eyes and ears, or the transcription above |
| Frame-by-frame continuity of the joined file | NOT RUN | The five segments were re-encoded and joined by the service; cut points need viewing |
| Human review | NOT DONE | Founder |

Rule for every generated video from here on (founder, 9 November): no video is called done without this record filled in, and a row
that could not be run says NOT RUN.
