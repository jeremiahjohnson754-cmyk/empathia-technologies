# R2 · Media audit: SIGNAL, Lite and V2.5.3

**12 November 2026.** Every narration, film, cinematic and media reference in the two sources and the product, sorted into working,
missing assets, incomplete, or proposed. Per the founder's directive of 11 November 17:06, **"working" only after playback is verified** —
and "verified" here means an automated browser check loaded and played it (headless Chromium, no loudspeaker). Nobody has watched or
listened to anything listed below end to end; that is recorded, not hidden.

## In the sources

| Source | Media it references | Assets supplied | State |
|---|---|---|---|
| SIGNAL build package and standalone | No recorded narration, video or audio file. Sound is generated in the browser (challenges, the bench, the cue desk's band) | — | Nothing to restore from files |
| SIGNAL 160 fieldbook plates (images) | 160 WebP plates | in the package | **Not added, by the founder's decision** (11 Nov, 19:32) |
| V2.5.3 cinematics (`CINE_FILMS`) | Five short films: *SIGNAL — how the story works*, *ServiceHands Academy*, *How learning works here*, *From a health check to a discovery agent*, *Empathia*; clips `agent-1`, `labs`, `lite-emp`, `sh-intro`, `svc-mode`; a music bed `bed-story` | **None** — V2.5.3 itself says "the footage is not in this build" and plays its diagrams and captions without the clips | **MISSING ASSETS** in the source; scripts and shot lists exist in the source as text |
| V2.5.3 narration (`VO_LINES`) | 12 narration lines with caption chunks (the SIGNAL opener "Every room tells a story…", the Academy, Learn and others), played from a media library when one is present, otherwise timed captions | **None** (no audio files in the HTML) | **MISSING ASSETS**; the words exist |
| V2.5.3 SIGNAL scene examination (`sgs-exam`) | A video per examined scene | **None** ("The footage is not in this build. The shot list for this scene says: …") | **MISSING ASSETS** |
| V2.5.3 Lite | No media files | — | Nothing to restore |

## In the product

| Media | Where | Verified playback | State |
|---|---|---|---|
| Generated sound: SIGNAL challenges (vocal, guitar, band) and the bench (tone, pink noise) | `packages/ui/src/challenges/*`, `Bench.tsx` | Scheduling and analysis checked in the browser: the band on the audio clock (BS-28), the analyser live and finite (BN-04), the guitar through its EQ (BS-*) | **WORKING (automated)**; heard through a loudspeaker: NOT RUN |
| Guided tour narration, stop A5 (`media/narration/tour-a-05.mp3` + captions) | Demo, `#/tours` | Served with the right types, captions and transcript present, never autoplayed (TR-*-07, -08); since 12 Nov the file decodes, has a duration and its clock moves when played muted in headless Chromium (TR-*-08b) | **WORKING (automated)**; heard through a loudspeaker: NOT RUN; labelled AI-generated voice |
| SyncLab film (`media/SYNCLAB/720.mp4`, captions, descriptions, poster) | Corporate website, In Development section only | Plays, seeks to three points and shows the right frames (`website` suite) | **WORKING (automated)**; watched by a person: NOT RUN |
| Film 13 scene 01 | `docs/surpass/MEDIA_MASTER_MANIFEST.md` | QC automated, 41 checks; loudness and tone NOT RUN | **INCOMPLETE** (not shipped on a page) |
| Films 01–12, SIGNAL film, voice canon | As delivered 4 November | not inventoried against the media library index | **PROPOSED**: inventory first |

## Proposed, not started

- The V2.5.3 cinematics and narration could be carried as **captioned diagrams without footage**, as V2.5.3 itself runs them, with the
  narration text as captions. Voice would need a new recording or a generated voice labelled as such; ElevenLabs is blocked at this
  session's gateway (403) and is not retried.
- No footage, voice or music is to be invented to fill a gap, and no real person's voice imitated.
- Checked 12 Nov before carrying the SIGNAL opener (`n-opener`): its words describe Maya as "a new technician" in "a stone chapel", where the founder's canon opens with a volunteer at a sound desk. Because the canon governs, the opener is not carried word for word until the founder says which wording stands; the arc diagram it plays over can be carried without it.
