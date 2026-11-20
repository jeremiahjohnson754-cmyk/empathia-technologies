# Narration take map (PARTIAL)

Source: artifact 2727fdf0-8f12-4c6d-b84c-cdce5361c808 "Narration Take Check". **The take-to-line pairing was not recovered.** It sits in line 25 of the page (base64 audio plus each take's `data-file` and `data-auto` attributes), which exceeds the 983,040-byte limit of `read_artifact` and `read_file`; `read_file` with `paths` refuses the file as over 4 MiB. Lines 1-24 and 26-41 were read and hold only the intro text, the dropdown script (below) and logic. Page text: "27 downloads hold 26 distinct takes (File 30 was a second copy of File 29)"; result string format is `<n>=<line id>` using `content_<n>`.

Note: File 30 duplicates File 29 (identical sha256).

## Candidate takes on disk (content_21 to content_48)

Measured locally from `/mnt/user-data/attachments/*/*-content_N.mp3` (content_1 to content_20 are the Learn/SFX batch, not tours). 28 files, 27 distinct; the page says 26 distinct, so one of these is not a tour take (likely an edge file such as 21 or 48) and which one is unknown.

| File | Duration (s) | Bytes | sha256 (first 16) | Paired stop | Note |
|---|---|---|---|---|---|
| content_21.mp3 | 11.94 | 208594 | 95264c8bb994884e | UNPAIRED |  |
| content_22.mp3 | 13.82 | 238687 | 6422959b10a5708c | UNPAIRED |  |
| content_23.mp3 | 7.78 | 142138 | 73b36298028b74d6 | UNPAIRED |  |
| content_24.mp3 | 9.04 | 162200 | 409e1002153ccaf6 | UNPAIRED |  |
| content_25.mp3 | 20.72 | 349028 | 1c13117bde006c19 | UNPAIRED |  |
| content_26.mp3 | 14.94 | 256659 | 75d89d001d37a283 | UNPAIRED |  |
| content_27.mp3 | 15.05 | 258331 | 72023da6e992c8d4 | UNPAIRED |  |
| content_28.mp3 | 18.10 | 307232 | c495fcab2c1caaf5 | UNPAIRED |  |
| content_29.mp3 | 13.27 | 229910 | ff1570a1f9b37d5b | UNPAIRED |  |
| content_30.mp3 | 13.27 | 229910 | ff1570a1f9b37d5b | UNPAIRED | duplicate of content_29.mp3 |
| content_31.mp3 | 11.05 | 194383 | ae8531bc8c845c56 | UNPAIRED |  |
| content_32.mp3 | 13.98 | 241195 | 7a6d766f01fec3fc | UNPAIRED |  |
| content_33.mp3 | 18.16 | 308068 | b5550d5588e43da4 | UNPAIRED |  |
| content_34.mp3 | 12.72 | 221133 | de1b73c81047f82e | UNPAIRED |  |
| content_35.mp3 | 11.94 | 208594 | f962fdbeebe00732 | UNPAIRED |  |
| content_36.mp3 | 11.78 | 206086 | 907cd99b8804dcd8 | UNPAIRED |  |
| content_37.mp3 | 15.28 | 262093 | 56768067283ec016 | UNPAIRED |  |
| content_38.mp3 | 10.63 | 187696 | 4821f84ad8b959ec | UNPAIRED |  |
| content_39.mp3 | 10.71 | 188950 | db5bff483dc4105a | UNPAIRED |  |
| content_40.mp3 | 11.78 | 206086 | 3152e3d2c6723744 | UNPAIRED |  |
| content_41.mp3 | 12.38 | 215699 | fb1e8d74a3ba63be | UNPAIRED |  |
| content_42.mp3 | 13.09 | 226984 | 6730898fe9601596 | UNPAIRED |  |
| content_43.mp3 | 10.87 | 191458 | 0930e095b7a0aac9 | UNPAIRED |  |
| content_44.mp3 | 10.21 | 181009 | e32a89c265f9a8f7 | UNPAIRED |  |
| content_45.mp3 | 10.27 | 181844 | afe3963dbfcb7c49 | UNPAIRED |  |
| content_46.mp3 | 11.36 | 199399 | 9a55af4349737ecd | UNPAIRED |  |
| content_47.mp3 | 16.07 | 274631 | 3a6814deec446c9d | UNPAIRED |  |
| content_48.mp3 | 18.34 | 310994 | 07367d230d77a0d1 | UNPAIRED |  |

## Script lines (26, verbatim, as in the page's `cap` object)

No `a05` exists in the page. The founder said 27; the page script has 26 entries.

- **a01-handoff**: The Empathia website’s demo link opens here. Everything in this demonstration is invented and runs in your browser: synthetic data, simulated adapters, and nothing connected to a real building.
- **a02-campus**: North Campus: three buildings and thirty rooms, generated from one seeded dataset. One room is complete, three keep earlier records, and the other twenty-six are outlines, with no invented detail.
- **a03-building**: Atlas Tower has twelve floors. Only the floors that hold rooms of the campus model open; a floor with nothing recorded says so.
- **a04-floor**: Floor four holds three rooms of the model on a schematic floor plate. Atlas 4.218, the boardroom, is the reference room, drawn in full.
- **a06-device**: Camera 1, at position A-0106. The unit there now is AS-0112, a Logitech Rally Camera named from its published specification page; anything not read from that page says ‘spec to verify’. The panel shows its baseline entry, its drift and the tests that cover it.
- **a07-support**: Search Party answers from the records: the AV Operations team for Atlas Tower, the integrator and its agreement, and who to escalate to. Every relationship says how it is known; the support model is declared, not guessed.
- **a08-replay**: Core Replay plays this room’s history from the synthetic event log, one recorded event at a time; there is no video. Months after acceptance, a change to replace the front camera like for like is approved by someone other than the person who asked for it.
- **a09-held**: The commissioning engine reopened twelve tests; each was re-run on the new unit and verified by a second person. Re-acceptance is still held on one design finding, its exception pending. The button here is a labelled scenario action that changes only this browser’s demo workspace.
- **a10-story**: Room Story assembles the same records from request to lesson: revisions, approvals, tests, baselines and repairs, with who did each and how it is evidenced. Where nothing is recorded, it says so.
- **b01-room**: Start from a room that is already installed. Field Intelligence can take it on as an existing installation, and this link replays that onboarding scan on the room’s own views.
- **b02-observe**: Observe Only reads the records, a synthetic discovery fixture and published specifications. It moves nothing, plays no sound and changes no configuration; passive network checks are not run in a browser.
- **b03-supervised**: Supervised Commissioning waits for a technician before any physical step. The replay stops at its first approval: a bounded camera sweep of A-0106 and A-0107. Every physical action here is a simulation, and no hardware command is sent.
- **b04-findings**: With each step approved, the scan report sorts twenty-one findings into known, inferred and requires verification. Not one is measured, because no instrument is connected.
- **b05-plan**: The commissioning engine derives seventy-five tests for this design, each with the reason it applies. The results are a synthetic seed, each recorded by one person and verified by another.
- **b06-reopened**: When the front camera was replaced, the engine read the change from the installation records and reopened twelve of the seventy-five tests. Their earlier results stay on record, but they no longer count.
- **b07-ledger**: The evidence ledger lists the room’s canonical event log: who did what, when, and to which record. Anything you do in this browser is listed separately, kept apart from the seeded record.
- **b08-drift**: The Assurance engine compares the room with its accepted baseline. After a re-tune, the audio processor’s configuration signature on record no longer matches baseline v1. Fourteen dimensions are not assessed, because nothing was measured.
- **b09-apex**: For the audio dropout that came back, APEX ranks hypotheses and says why none is proven. It is labelled modeled: no diagnosis has been opened on record.
- **b10-pattern**: Search Party then looks across all five incidents on record for what they share. Three rooms on one access switch have raised incidents: a lead to follow, not a conclusion.
- **c01-signal**: SIGNAL lesson A12 is about speech intelligibility in a meeting room. The scenario quotes the lesson, then asks you to fix the room, decide, and check your fix on a take you have not heard.
- **c02-audio**: The Audio Lab is a working Web Audio channel strip on synthesized voices. Change the EQ or the gain, and the sound and its spectrum change with it. Sound plays only when you press Play.
- **c03-challenge**: The challenge: make the conference-room voice intelligible. The score is an educational approximation computed from the processed signal, not a speech transmission measurement.
- **c04-camera**: The Camera Lab renders a conference room. Exposure, white balance and framing change the picture, and its readouts are computed from the pixels of that rendered frame.
- **c05-lighting**: The Lighting Lab has five fixtures, a DMX patch with overlap checks, and cues with fades. The DMX output is simulated and kept flash-safe.
- **c06-competency**: A saved lab attempt becomes a synthetic training record in this browser. It can support an internal competency assessment as evidence; it is never a credential and never counts for dispatch.
- **c07-return**: And back to the room the lesson came from: the audio processor of Atlas 4.218, where incident ISS-0417 is open. Its device panel links straight to the Audio Lab, so practice and the room’s record stay one step apart.

## Other docs read

- `AUDIO_PRODUCTION_PLAN.md`: no tour script lines; plans ~18 tour stops across tours A, B, C (voice Bella, `eleven_multilingual_v2`), scripts "still need to be written".
- `PILOT_TOUR_SAMPLE.md`: one line only: "This is Atlas 4.218, a boardroom on the fourth floor. Every device here has a position, a history and evidence behind it. Let's see what changed, and how we know." (10.8 s; not one of the 26 above).

## To finish the pairing

Open the artifact in claude.ai and copy its result string (`21=a01-handoff, ...`), or paste "all correct", or approve a speech-to-text pass (spends credits) on content_21 to content_48.
