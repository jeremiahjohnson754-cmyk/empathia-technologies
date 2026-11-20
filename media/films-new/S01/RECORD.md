# New film for S01 ("Start with a building. Find everything connected."): a new version, not the original

The original S01 (25 s, 9:16, captioned, V1.4.1 campaign; SHA-256 recorded in the Founder Studio's films.json) is **not on this
computer** and stays listed as missing. This folder holds a newly generated film built for the same title and purpose; it is shown
beside the original only as a labelled new version, once the founder accepts it.

| Shot | File | Made with | Settings | Credits | SHA-256 | Review |
|---|---|---|---|---|---|---|
| 1 | `shot1-vidiq-minimax-h3.mp4` | vidIQ `generate_video`, minimax-h3 | 8 s, 768×1344 (9:16), 24 fps, h264 + aac | 120 | `732f7d45…` | engineer: on brief (unbranded building at dusk, push-in, the meeting room's display, ceiling camera and network rack lit in turn; no faces, text or logos); founder: pending |

- The clip carries a generated audio bed (−12.6 LUFS); its rights follow vidIQ's terms, so the finished film uses our own narration
  (ElevenLabs) and the bed is dropped unless the founder keeps it.
- The glowing lines are an illustration of relationships, not a visualization of any real network; the film says so in its captions.
| 2 | `shot2` (awaiting the founder's download) | vidIQ, minimax-h3 | 8 s 9:16: from the network cabinet the lines travel to a second room's display, a corridor loudspeaker, a door's touch panel | 120 | — | pending |
| 3 | `shot3` (awaiting the founder's download) | vidIQ, minimax-h3 | 8 s 9:16: night exterior pull-back, the connected rooms outlined across floors | 120 | — | pending |

Narration (ElevenLabs, narrator voice Bella, 179 credits, awaiting import): "Start with a building. / Find everything connected:
every room, every device, and what each one depends on. / One record you can search, before something breaks." (new copy for the
new film, in the product's own claims: search across one record; nothing live is implied).

- Before this, after the founder's review: two more shots (about 240 credits), one narration line in the narrator voice, captions, a 9:16
  render through the same pipeline as the training film.

## Assembled (12 Nov 2026)

`render.sh` → `out/S01-new.mp4` and `out/S01-new-captioned.mp4` (not committed; rebuilt from the shots and the narration): 22.8 s,
1080×1920, h264 + aac, the three shots cross-faded, vidIQ's generated audio dropped, the narration's three lines placed on the shots they
describe, −18.0 LUFS integrated; captions are the narration word for word plus "Illustration. Synthetic demonstration data." (WebVTT
`out/S01-new.vtt`, and burned into the captioned version). Founder review pending; then it is listed in the Founder Studio as a new
version of S01, beside the missing original.
