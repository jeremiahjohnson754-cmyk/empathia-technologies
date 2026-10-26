# Production package — Closing film

**Status: NOT_RENDERED.** No closing film exists. This package is complete enough to produce it; nothing here is footage.

| | |
|---|---|
| Purpose | the last 45–60 seconds of an investor or customer session: what Empathia is, in one breath, and what happens next |
| Length | 0:50 (± 5 s) |
| Masters | 3840×2160 23.976/24 fps H.264 High (or ProRes 422 HQ mezzanine) · derivatives 1920×1080 and 1080×1920 |
| Audio | stereo 48 kHz; dialogue normalized to −16 LUFS integrated (web) / −24 LUFS (broadcast deliverable), true peak ≤ −1 dBTP |
| Captions | burned-in for social cuts; sidecar WebVTT for the master |

## Script and narration (≈ 110 words)
1. *(over black, a single line of type)* “Every building is a system.”
2. “Rooms, devices, networks, people — and the evidence that they work.”
3. “Empathia keeps one record of all of it: designed, installed, commissioned, serviced, assured.”
4. “Nothing passes because someone says so. Every result carries its evidence, and someone else verifies it.”
5. “When something changes, Empathia shows what it touches — before anyone touches it.”
6. “One platform for the built environment.” *(logo — see logo-ident.md)*
7. *(end card, no narration)* contact line chosen by the founder; “[Founder name]” placeholder until approved.

## Storyboard and shot list
| # | Time | Picture | Source | Text on screen |
|---|---|---|---|---|
| 1 | 0:00–0:05 | black → type | type only | Every building is a system. |
| 2 | 0:05–0:13 | slow push across a campus map | Founder Studio Mission Control screen capture (synthetic data) | — |
| 3 | 0:13–0:22 | a room's lifecycle strip PLANNED → … → ACCEPTED | enterprise web room page capture | Designed · Installed · Commissioned · Serviced · Assured |
| 4 | 0:22–0:31 | result badge changes “awaiting verification” → “passed, verified” | enterprise web Commissioning tab capture | Verified by someone else |
| 5 | 0:31–0:40 | relationship graph expanding from one device | Search Party in the Founder Edition | — |
| 6 | 0:40–0:47 | logo resolve | logo-ident.md | One platform for the built environment |
| 7 | 0:47–0:50 | end card | type only | (founder-approved line) |

## Editing specification
Cuts on narration phrase ends; 12-frame dissolves between 2–5; no fast cuts; motion respects a 3-second minimum hold for any on-screen
text; colour from the Aurora tokens (`packages/design-tokens/tokens.json`); type in the system UI stack or a licensed face the founder buys.

## Source requirements
* Screen captures at 3840×2160 from the Founder Studio and the enterprise web app on synthetic data (`media/screenshots/` shows
  what is available; recapture at 2× device scale).
* Narration: the existing closing narration (`vo-a-close.mp3`, 8.7 s, UNVERIFIED) is too short and not cleared; record or generate a new
  read under a licence that allows the intended channels, and enter it in the rights ledger.
* Music: a licensed bed with written terms for the channels; none in the workspace is cleared.

## Generation prompts (if AI tools are used)
* “Slow aerial push across an abstract, isometric office campus at dusk, glass and soft cyan light, no people's faces, no logos, no
  readable text, 16:9, 4K, 8 seconds, calm.” — check the tool's licence permits commercial use; keep the prompt and output in the ledger.
* Never generate a real company's building, logo, product or a recognizable person.

## Rights checklist before any external use
Every component (capture, narration, music, font, generated image) has a ledger entry with owner, licence and channels; the founder
authorizes the channel; the master is hashed and added to the manifest.
