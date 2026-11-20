# Audio batch 1: Learn passages and AV training sound effects (2026-11-01)

**State: generated, imported, mastered and played in the demo's browser. Not yet promoted: awaiting the owner's listen.** Two takes were not
in the download (p06, fx05) and need fetching from the flow.

- **Approval:** owner, 08:07 CT (`scripts/media/elevenlabs/approvals.json`).
- **Flow:** `VlC4ynRhYgxJr7oIuV9M`.
- **Models:**
  - `eleven_multilingual_v2`, voice Alice (`Xb7hH8MSUJpSbSDYk0k2`, premade);
  - `eleven_text_to_sound_v2`.
- **Credits:** estimate 1,241; **charged 817.67** (speech 606, effects 211.67), one take each, no failures.
- **Import:** owner download, attached 08:16–08:17 CT, matched by exact decoded duration (to 1 ms) against ElevenLabs' record and by
  acoustic signature:
  - **Speech:** matched by duration.
  - **Beds:** told apart by spectrum and steadiness:
    - room tone: low-frequency and steady;
    - meeting pre-roll: quiet and intermittent;
    - town hall: loud mid-band;
    - rain: broadband high-frequency.
  - **6 s effect:** steady, so the fans.
  - **3 s effects:** the one rising 20 dB is the feedback; the erratic one is the crackle.
  - **Duplicates:** `content_6`, `content_7` and `content_8` are byte-identical (all p07), and were refused as duplicates.

## Mastering (`scripts/media/elevenlabs/batch-import.mjs`)

Each take gets **one constant gain**: no limiter, no compression, no EQ. The loudness target or the −3 dBTP ceiling (with a 0.2 dB margin),
whichever binds first, sets it. Targets:
- **Speech:** −23 LUFS.
- **Looping beds:** −33 LUFS (10 LU under speech).
- **One-shots:** −23 LUFS, unless the peak ceiling binds first. Then the take is reported as peak-bound and not forced up, which keeps its
  transients intact.

Meters are ffmpeg's EBU R128 and astats, software meters rather than certified instruments.

| Item | Class | Raw | Gain | Result | Loop wrap point (level step / sample jump) | Browser decode + play |
|---|---|---|---|---|---|---|
| p01 "Please check that the ceiling microphones…" | speech | −22.2 LUFS / −3.2 dBTP | −0.8 dB | −23.2 / −4.3 | — | PASS 5.201 s |
| p02 "The quick brown projector…" | speech | −22.2 / −4.4 | −0.8 | −23.3 / −5.4 | — | PASS 4.319 s |
| p03 "Can everyone on the far end…" | speech | −21.5 / −2.3 | −1.5 | −23.2 / −4.1 | — | PASS 4.272 s |
| p04 "Sibilant sounds…" | speech | −22.5 / −2.7 | −0.5 | −23.3 / −3.4 | — | PASS 5.248 s |
| p05 "Bring the level down a little…" | speech | −20.6 / −3.5 | −2.4 | −23.2 / −6.2 | — | PASS 4.458 s |
| p06 "Thursday's budget review…" | speech | **not downloaded** | | | | |
| p07 "When the echo canceller is working…" | speech | −21.7 / −2.1 | −1.3 | −23.2 / −3.6 | — | PASS 4.226 s |
| p08 "Low hum from the air handling…" | speech | −21.5 / −2.5 | −1.5 | −23.3 / −4.3 | — | PASS 4.876 s |
| fx01 boardroom room tone | bed | −39.9 / −28.3 | +6.9 | −33.2 / −21.7 | 0.95 dB / 0.0002 | PASS 10 s |
| fx02 meeting pre-roll | bed | −47.6 / −24.6 | +14.6 | −33.3 / −10.2 | 0.06 dB / 0.0025 | PASS 10 s |
| fx03 town-hall audience | bed | −21.2 / −9.1 | −11.8 | −33.3 / −21.3 | 0.97 dB / 0.0033 | PASS 10 s |
| fx04 equipment fans | bed | −38.3 / −27.9 | +5.3 | −33.3 / −22.9 | 0.62 dB / 0.0021 | PASS 6 s |
| fx05 office typing | bed | **not downloaded** | | | | |
| fx06 feedback build-up | one-shot | **−3.8 / −1.8** (dangerously loud as delivered) | **−19.2** | −23.3 / −21.3 | — | PASS 3 s |
| fx07 cable crackle | one-shot | −32.3 / −8.1 | +4.9 (peak-bound) | −27.7 / −3.5 | — | PASS 3 s |
| fx08 rack power-up | one-shot | −33.2 / −7.0 | +3.8 (peak-bound) | −29.6 / −3.5 | — | PASS 4 s |
| fx09 door close | one-shot | −32.2 / −7.6 | +4.4 (peak-bound) | −28.0 / −3.5 | — | PASS 1.48 s |
| fx10 rain on glass | bed | −26.5 / −12.1 | −6.5 | −33.4 / −18.9 | 0.94 dB / 0.0047 | PASS 10 s |

A **loop is seamless** when the level step between its last and first 20 ms is under 1 dB and the sample jump at the wrap point is under 4×
the local RMS (no click).

## Remaining

1. **Owner's listen.** Review reel `empathia-audio-batch1-review.mp3` (1 min 49 s, cue sheet below). The owner names any take to re-generate.
2. **Fetch p06 and fx05** from the flow (nodes "p06 budget review" and "fx05 office typing"). They are already generated, so this costs no
   further credits.
3. **Promote** the approved takes with `promote.mjs` (channel `learn`). Then wire the passages as the Audio Lab's voices and the beds as its
   noise floors, labelled "AI-generated voice (synthetic, not a real person)" and "AI-generated sound effect". The lab's existing
   loudness normalisation and its −12 dBFS master cap apply on top.

Cue sheet: 0:00 p01 · 0:06 p02 · 0:12 p03 · 0:18 p04 · 0:24 p05 · 0:30 p07 · 0:35 p08 · 0:41 room tone · 0:52 meeting pre-roll · 1:04 town hall ·
1:15 fans · 1:22 rain · 1:33 feedback · 1:38 crackle · 1:42 rack power-up · 1:47 door close.
