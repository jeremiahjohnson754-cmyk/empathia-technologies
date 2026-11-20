# ElevenLabs pilot: one investor-tour line (2026-11-01)

**Result: export into the repository's media pipeline PROVEN, by owner attachment; the connector does not deliver files directly.**
The take was generated, imported, measured, normalised and played in the demo's own browser page. It is **not yet promoted** into a
shipped manifest: that needs the owner to listen and approve (the perceived-quality judgement is his).

| Item | Value |
|---|---|
| Approval | owner, 08:00 CT: "exactly one ElevenLabs pilot generation, capped at 162 credits" (`scripts/media/elevenlabs/approvals.json`) |
| Script | "This is Atlas 4.218, a boardroom on the fourth floor. Every device here has a position, a history and evidence behind it. Let's see what changed, and how we know." (original, 162 characters) |
| Model / voice | `eleven_multilingual_v2` (on the confirmed non-Beta list) · Bella `hpp4J3VqNfWAUOO0d1Us` (ElevenLabs premade voice) |
| Generated | 2026-11-01 14:00:58 UTC, inside the paid Starter period. Flow `iseheusiw4XBn1k40MEh`, session `VDF7ksfJ4ul8EroVANTe`, generation `t9pfRYEV5P4poxNLfWNi`, history item `2yoOz28NBQpc3RQX5SgE` |
| Credits | **162 charged** (US$0.0324), exactly the approved cap; one take |
| Delivery | A signed MP3 link on storage.googleapis.com (2-hour expiry), which this workspace's gateway refuses. The owner downloaded it and attached it (08:03 CT). |
| Imported file | MP3, 44.1 kHz, mono, 128 kb/s, 10.81 s (generation record: 10.77 s) · 190,622 bytes · sha256 `8a9927d32a5319260a262931f8d051037f9bbf061d5fede39f2e712b2edfeb6a` |

## Measured quality (ffmpeg software meters; not a certified instrument)

| Measure | Raw take | After normalisation |
|---|---|---|
| Integrated loudness | −18.2 LUFS | **−23.1 LUFS** (lab reference −23, ±1 LU) |
| True peak | −1.4 dBTP: no inter-sample clipping | **−6.3 dBTP** (ceiling −3) |
| Noise floor | −75 dB | −81 dB |
| DC offset | −0.00025 | −0.00013 |
| Energy above 8 kHz / 16 kHz | −33 dB / −46 dB RMS: full bandwidth, sibilance intact | (same: one constant gain) |
| Phrasing (pauses longer than 0.15 s at −45 dB) | after "4.218" (0.40 s), after "floor" (0.54 s), after "behind it" (0.59 s), plus two short beats | unchanged |

**Normalisation** is ffmpeg `loudnorm` in two passes and **linear** mode: one constant gain of about −4.9 dB, with no dynamic gain riding.
The voice's own dynamics are untouched. The output is MP3 at 192 kb/s, sha256 `65cc49fc…`, recorded in the candidate entry with status
PENDING review.

## Playback in Empathia

`scripts/media/elevenlabs/playback-check.mjs` serves the file from the demo's own origin under the production CSP. Headless Chromium fetches
it, decodes it with `decodeAudioData` and plays it in real time through an AnalyserNode:

| File | Decoded | Duration | Peak |
|---|---|---|---|
| Raw take | PASS | 10.774 s | −1.37 dBFS, audible through the live graph |
| Normalised | PASS | 10.774 s | −6.28 dBFS, audible through the live graph |

## Not done

- **Listening.** Perceived quality (naturalness, pronunciation of "4.218", pacing) needs a human ear. Machine transcription through
  ElevenLabs speech-to-text would check the words, but it spends credits and was not approved.
- **Promotion.** The take is promoted only after the owner listens, with
  `promote.mjs --job=tour-sample --candidate=tour-sample-s01-t1 --reviewed-by=… --terms-url=… --terms-checked=… --channels=tours`.
  Its tour placement waits for the tours (Slice 6).
