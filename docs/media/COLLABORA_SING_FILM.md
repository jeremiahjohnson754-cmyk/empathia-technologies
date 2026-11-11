# Collabora-SING film and the founder's picture on the website (2026-11-10)

On 2026-11-10 the founder supplied two files and said where each goes:

- "The 35 second video with the piano player is for Collabora-SING, an in-development product, just for the corporate website
  section for Collabora-SING."
- "Founder picture."

This note records what was built, what the film shows, how its rights are recorded, and what is still open.

## 1. The film

| | |
|---|---|
| Supplied file | 35.0 s, 1920×1080, 30 fps, H.264 + AAC, 14,151,649 bytes |
| SHA-256 | `853f3436b21a500c8cb41f82b44d91d5c6a88b6dc99f1df2ace7533e094f15ff` |
| Same file as | `Collabora-sing-SyncLab-From-Hypothesis-to-Evidence-1080p` in `media/manifests/MEDIA_MANIFEST.json` |
| Catalogue key | `SYNCLAB` in `apps/website/films.json` |
| Plays on | `/collabora-sing` only (`exclusive: true`) |

**Sound.** The audio stream is digital silence: `ffmpeg astats` reports a peak of −inf dB on both channels for the whole 35 s
(`volumedetect`: −91 dB). There is no narration, music or effect. If music was intended, the export lost it; the founder should say.

**Picture.** One animated 3D scene with drawn, faceless figures: one seated at a keyboard, one standing with a tablet or clipboard.
No photograph, no recording of a person, and no third party's name, logo or mark was seen. The only name is "COLLABORA-SING SYNCLAB"
on the end card. The first frame is black.

### What it shows (on-screen text, with times)

Read from all 35 one-per-second frames, then from five frames per second for the times at which text changes, and cross-checked
against an independent reading. Times are accurate to about ±0.3 s. Figures in the film are left out here on purpose: they are
demonstration data.

| Time | Chapter | On-screen text |
|---|---|---|
| 0:00–0:04 | 01 HYPOTHESIS | "What if we transmitted the performance... instead of only the sound?" · chips (from 0:01.6): "Real network", "Real instrument", "Real musician", "NOT YET MEASURED" |
| 0:04–0:09 | 02 BENCH | "One performance, two ways to send it." · (from 0:05.6) "MODE A  Rendered audio → Opus / WebRTC → Jitter buffer → Shared output" · "MODE B  MIDI event → DataChannel → Software instrument → Shared output" · tags "Jitter buffer", "Same output" |
| 0:09–0:14 | 03 NETWORK | "Five network conditions, one stage at a time." · about one second each: "1 Wired LAN", "2 Church Wi-Fi", "3 Hotspot / internet", "4 Remote site" (with "SITE A", "SITE B"), "5 Controlled degradation" |
| 0:14–0:17 | 04 MUSICIAN | "A real player at a real keyboard." · "Hearing only what crossed the network." · tags "Wired headphones", "Keyboard sound off" |
| 0:17–0:22 | 05 BLIND TEST | "Twenty trials. Nobody in the room knows which is which." · badge, whole scene: "DEMO DATA  not a measurement" · card "TRIAL 07 / 20" to "TRIAL 10 / 20", "TRANSPORT HIDDEN", "Getting the next trial ready", "Play", "How immediate does it feel?", "1 2 3 4 5"; example answers "3 · Playable with effort", "5 · Feels immediate", "4 · Slight lag" |
| 0:22–0:26 | 06 TELEMETRY | "Every note is stamped at five moments." · (from 0:22.8) "1 Device event — 2 Captured — 3 Sent - - - 4 Received — 5 Triggered" · "MEASURED one clock", "ESTIMATED two clocks" · (from 0:24.4, with the badge "DEMO DATA  not a measurement") tiles "Round-trip time", "Jitter", "Packet loss" under a chip "MEASURED" and "Clock offset ±", "One-way latency" under a chip "ESTIMATED", each with a changing example value |
| 0:26–0:30 | 07 ANALYZER | "Exports, ratings and worksheets flow into one place." · tags "Ratings SUBJECTIVE", "Worksheet OBSERVED", "Exports MEASURED" · panel "Pilot Analyzer", "No pilot data yet", rows "Median / p95 latency ESTIMATED", "Round-trip time MEASURED", "Jitter MEASURED", "Packet loss MEASURED", "A/B preference SUBJECTIVE", "Musician ratings SUBJECTIVE", "Network condition OBSERVED", "Thresholds fixed before the first session" (no values) |
| 0:30–0:33 | 08 EVIDENCE | "From “not yet measured” to evidence." · small type, until about 0:32.5: "This is the plan. The pilot has not been run yet." · six boxes, each "NOT YET MEASURED", then: "A real keyboard MEASURED", "Real networks ESTIMATED MEASURED", "Facilitator’s notes OBSERVED", "What a player feels SUBJECTIVE", "Loss and stuck notes MEASURED OBSERVED"; "Playing together" stays "NOT YET MEASURED" |
| 0:33–0:35 | end card | "COLLABORA-SING SYNCLAB" · "Build the hypothesis. Measure the system. Let the musicians decide." · "REAL NETWORKS · REAL INSTRUMENTS · REAL MUSICIANS" |

### Where a viewer could take away a result that does not exist

The film says "This is the plan. The pilot has not been run yet." and "No pilot data yet", but only for a few seconds and in small
type. Example values sit under a chip that reads "MEASURED"; the last labels turn to "MEASURED"; the end card has no qualifier. The
founder ruled on 2026-11-10 that what qualifies the figures must be **in the film**, not only beside it. So:

- the web rendition and its posters carry a burned-in label for the whole 35 s: **"IN DEVELOPMENT · DEMONSTRATION DATA · NO PILOT HAS
  BEEN RUN"** (Inter SemiBold, light amber on near-black). It is drawn on a 56 px band added **above** the picture, because no area
  inside the frame is free of the film's own text for the whole length at a size that stays legible at 360 px wide, and because a
  player's controls sit over the bottom of a video. The band covers nothing; the picture is not altered. Checked on frames at 0:00, 0:20 and the end card, and at 360 px wide;
- the page prints a qualifier **directly above the player, always visible** (`qualifier` in `films.json`): every figure in the film
  is demonstration data, the labels show how results will be classified once a pilot runs, and no pilot has been run;
- no figure from the film appears in the page, its title or description, the text tracks or the catalogue (a test enforces it);
- the end card's line is described as the plan's aim; the plan's steps are written as a plan ("is to be", "are planned");
- the poster is the frame at 0:03, which carries the question and "NOT YET MEASURED".

## 2. What was produced

`node scripts/media/prepare-web-films.mjs --only=SYNCLAB --video=<the supplied file>` writes `apps/website/media/SYNCLAB/`:

| File | What | Size |
|---|---|---|
| `720.mp4` | H.264 High, CRF 24, ≤ 2.2 Mb/s, **1280×776** (the 56 px label band and the 720p picture under it), faststart, **no audio stream** (stripped only after the source was measured silent) | 3.6 MB |
| `poster.webp`, `poster.jpg` | the frame at 0:03 with the band, 1600×970 | 51 KB, 112 KB |
| `captions.vtt` | one cue: "[No sound: this film is silent.]" (source: `apps/website/films/SYNCLAB.captions.vtt`) | under 1 KB |
| `descriptions.vtt` | what is shown, scene by scene, on-screen words quoted (source: `apps/website/films/SYNCLAB.descriptions.vtt`) | 5 KB |
| `RENDITION.json` | hashes of the source and of every output | |

Total about 4.0 MB. The rendition differs from the master by the band, the 720p scale and the absent (silent) audio stream, and by
nothing else; the master is untouched. The player does not autoplay, has `preload="none"`, and offers captions (off until chosen) and a descriptions
track. The page prints the description under the player and says that it describes what is shown and that nothing was spoken.

## 3. Rights, as recorded

`apps/website/films.json` → `SYNCLAB` → `rights.website`:

- `status`: `VERIFIED`
- `basis`: rights confirmed by the founder, 2026-11-10; supplied for the Collabora-SING In Development section of the corporate website
- `scope`: that section only
- `evidence`: the founder confirmed on 10 Nov 2026 that he holds the necessary rights to the photographs, films, music and creative
  assets he supplied, for authorised use in Empathia (his statement, relayed by the integrator; no separate document on file); the
  file hash; the measured silence; what the picture contains
- `notEvidenced`: beyond that confirmation no licence or authorship document was supplied; the 3D library and typeface used to
  render the picture were not examined; the master is not in the media-rights ledger (`MEDIA_MANIFEST.json` still lists it as `NOT_IN_LEDGER`, owner `NOT ESTABLISHED`,
  `NOT_ELIGIBLE`)

The manifest and the ledger were not changed by this work (they are outside the website). They should be brought into line with
the founder's confirmation.

## 4. The renditions are in the repository

`.gitignore` ignores `apps/website/media/*` except `founder/`, `product/` and, since 2026-11-11, `SYNCLAB/`. The public site is built
from the repository, and the build stops when a film is `VERIFIED` but its renditions are missing, so the six files above are
committed (about 4.0 MB; this follows the rule already written in `.gitignore`: only a film verified for the website is committed).
`RENDITION.json` names the master by its catalogue path, not by the local path it was read from.

The script was run again on 2026-11-11 from the supplied file: `720.mp4`, both posters and both text tracks came out byte-identical
to the first run, so the committed files are what the script in the repository produces.

To hold the film without removing the page: set `rights.website.status` back to `UNVERIFIED` (or build with `--films=off`). The
section then publishes without a player; nothing else changes.

## 5. The founder's photograph

Supplied as a 1440×1440 WebP (SHA-256 `6b63e655f3f46d7d6ead1df9520a72ce1149b7bb3b395ff5f958458fc9aa0239`). It is the founder's
photograph, and it stays: "KEEP MY EXISTING FOUNDER PHOTOGRAPH. DO NOT REPLACE IT." (founder, 10 Nov 2026). His face, likeness and
pose are preserved; grading, lighting, tonal balance and clarity only; no generated version. Rights basis, as recorded in
`docs/media/FOUNDER_PORTRAIT.json`: the founder confirmed on 10 Nov 2026 that he holds the necessary rights to the photographs, films,
music and creative assets he supplied, for authorised use in Empathia.

- **The original is kept untouched** in the repository as the recoverable source:
  `apps/website/media-src/founder/founder-original.webp` (byte-identical to the supplied file; the script refuses to run if its hash
  changes).
- `node apps/website/scripts/portrait.mjs` writes 320, 640 and 960 px in WebP and JPEG to `apps/website/media/founder/` and the
  settings and hashes to `docs/media/FOUNDER_PORTRAIT.json`. The earlier 480/800/1200 files (a 4:5 crop of the same photograph,
  enlarged) are removed.
- The renditions carry a restrained grade applied to the whole picture alike: white balance (red × 0.965, green × 1.02, blue ×
  1.03), exposure (gamma 1.10), tonal balance (sigmoidal contrast 2.2 at 48 %) and clarity (unsharp mask 0 × 1.4, amount 0.35,
  threshold 0.02). No mask, no local edit, no retouching, no crop, nothing generated, background unchanged. `--no-grade` gives the
  renditions without it.
- On the site it is rendered by one component, `FounderPortrait` (`apps/website/src/ui.tsx`), on the home page's founder section and
  on the founder page: whole (square), `width="960" height="960"`, responsive sources, alternative text "Jeremiah Johnson, founder of
  Empathia Technologies". The component adds no animation.
