# SIGNAL media asset ledger

This ledger covers SIGNAL's own media and where each piece plays: footage, recorded voices and sound.
It was started on 18 Nov 2026 for the Story Director directive (11:59, Part I §1) and the founder's 16:41 note:
"you made a bunch of videos and never used them for the story mode".

The founder's directive asks for one of two kinds of evidence:
- an automated check that the scene can play the file;
- a mark that it is not wired.

"The existence of a video file is not evidence that the corresponding scene can play it."

## Where SIGNAL media plays now

| Media | Files | Placed in | Proof it plays |
|---|---|---|---|
| Ten Seats (S01E01) establishing footage: sanctuary, broom, booth | 3 clips, `apps/demo/public/media/signal/s01e01/footage-*.mp4` | The interactive film `#/film/s01e01` (before canon items 11, 17 and 20). Also "Watch as a scene" in the written story. | `demo-signal-film` FM-03 (the clip's clock moves, muted, labelled); `signal-film` unit (each clip placed once, each file exists) |
| Season 1 footage, S01E00 and S01E02–S01E11 | 32 reviewed clips, `apps/demo/public/media/signal/s01/film/*.mp4`. Generated with vidIQ minimax-h3 on 12 Nov 2026 and reviewed shot by shot (see `media/signal/s01/film/README.md`). | Each chapter's interactive film `#/film/<id>`, before the canon item its shot list names (`takes-s01.ts`) | `signal-film` unit (all 35 Season 1 clips placed, files exist); `demo-signal-film` FM-31 (S01E05 plays its own clip) |
| Season 1 recorded voices: Maya, Ray, Dolores, Imani, Priya, Theo, Lily | Takes split from the founder's grouped takes, `apps/demo/public/media/signal/s01e01*/`, `.../s01/…` (see `takes-s01.ts`). They are AI stock voices, chosen by the founder on 12 Nov. | Each chapter's film. A line plays its take when the viewer chose sound; otherwise it is a subtitle. | `demo-signal-film` FM-24 (a recorded take plays, sound by the viewer's choice); `signal-cinematic` unit (every take speaks a canon line word for word) |
| Room tone and the comb filter at a seat | None: made in the browser (`film/sound.ts`) | The Ten Seats film, and the measurement and fill-test scenes ("Listen here") | FM-25 (offered only with sound on); FM-01/02 (nothing makes sound before the viewer chooses it) |

## Rejected footage (never placed)

These shots were generated but rejected in review, because they would teach the wrong thing (the founder's rule):

- **S01E01 centre fill, two attempts.** The loudspeaker faced the seats, not the ceiling.
- **S01E03 isolator, first attempt.** A power plug was lying unplugged.
- **S01E10 "read" first attempt.** Hands were on the faders.

The regenerated isolator and "read" shots are in place.

## Media that is not SIGNAL's

These files are not story media, and the story does not use them:

- **Product and campaign films:**
  - the Founder Studio films (`apps/founder-studio/dist/media/films/*`: F01, F02, FA, IE film, SyncLab);
  - the new S01 campaign film (`media/films-new/S01`);
  - the 120 s and 198 s founder films (`1000039170.mp4`, `1000041382.mp4`).
- **Vertical vidIQ shots.** Three 768×1344 shots among the founder's attachments (`minimax-462644446835059`, `…648523813097`, `…648081559918`) belong to the new S01 campaign film. They are not story footage.

## Still missing (marked incomplete, not faked)

- **Seasons 2–12:** no footage and no recorded voices. Their films play the canon art under a camera move, with subtitles, and the title card says so.
- **Ten Seats voices:**
  - Ana, Pastor Jo and Mateo have no takes; their lines are subtitles.
  - Dolores has 3 takes and Priya has 1.
  - Most of Maya's and Ray's Ten Seats lines are taken.
- **ElevenLabs credits:** the account ran out on 18 Nov at 16:5x, so no new voices could be made this session.
