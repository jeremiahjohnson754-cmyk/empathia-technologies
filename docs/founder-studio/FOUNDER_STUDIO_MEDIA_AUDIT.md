# Founder Studio media audit

Directive 18 Nov 2026 21:34, §10 and §16: "All 36 known film references, their verified existence, playback status, captions and
hashes." Audited 19 Nov 2026 on this computer. Method, and nothing more is claimed than it shows:

- **The 36 references** are the records in the Founder Studio's own film list (Artifact A, `studio/films.json`, built 26 Oct 2026):
  key, title, series, dimensions, duration and the SHA-256 of each master as the studio recorded it then. The same 36 keys and file
  names are in `apps/founder-studio/src/data/films.ts`.
- **Existence** is by content, not by name: every `.mp4` in the private store (`~/.empathia-private`) and in this repository's
  apps and media folders (104 files) was hashed with SHA-256 and matched against the 36 recorded hashes.
- **Playback** here means `ffprobe` read the container and the first video stream (dimensions and duration, compared with the
  record). A full decode of every frame (`tests/media/decode-films.mjs`, the runner's `--films`) was **NOT RUN** for this audit.
- **Captions**: the masters whose file names say "captioned" carry burned-in captions by their own name (not checked frame by frame);
  the website renditions are checked for their WebVTT caption track.
- **Rights**: every one of the 36 records says "internal only — not distributable" (`NOT_IN_LEDGER` or `UNVERIFIED`). A film is on
  the public website only where `apps/website/films.json` records the owner's verification for the website.

## Summary

| | Films |
|---|---|
| Recorded in the studio's list | 36 |
| Master on this computer, same SHA-256 as the record, probed | 5 (FA, F01, IE, F02P, SyncLab) |
| The same five on the public website, VERIFIED for the website, with a caption track | 5 |
| A different master of the same film on the website (not the recorded file) | 1 (M2) |
| Missing: no master with the recorded hash is available | 31 (30 with no master at all, and M2's recorded file) |

The studio never labels a missing film playable: its launcher reports which files are on the computer, and a film whose file is
not there is shown as missing (`apps/founder-studio/src/pages/MediaLibrary.tsx`; tests/browser/founder-studio.test.mjs S-09 to S-11).
No film was substituted for another and no master was made from a script.

## The 36 films

| Key | Title | Series | Recorded | SHA-256 recorded | Master on this computer | On the public website | Status |
|---|---|---|---|---|---|---|---|
| `FL` | The flagship film (4:18) | Flagship | 3840×2160, 4:18 | `d2bbe353a68aad92770f89537bf37af256651dda70db1cccbd7e774fb13bab8f` | no | no | Missing: no master available |
| `FT` | Flagship teaser (0:15) | Flagship | 3840×2160, 0:15 | `61baf5cc670efc3a06d1c6321a8e844c318bc1fa6c0b73a213e67cb7be30c823` | no | no | Missing: no master available |
| `FA` | Film A — The Platform Vision (2:00) | Investor films | 1920×1080, 2:00 | `a136a65cb919dcf1ecf6a01674ede82a8f06715e6462c9ceb9c5c73e89c53393` | yes, same SHA-256; probe 1920×1080, 120 s | `FA`, VERIFIED for the website; 720p rendition probed 1280×720, 120 s; captions track yes | Available: master on this computer and on the website |
| `FB` | Film B — Intelligence Becomes Experience (1:30) | Investor films | 1920×1080, 1:30 | `7b3ef4057d039f5b933056c98e8c31f2165a890c9b54891b65b2afbf1867fc74` | no | no | Missing: no master available |
| `F01` | F01 — The Living System | V1.4.1 campaign | 1920×1080, 4:40 | `4d31db34fb218bed53c22b9991c253f6dfd0072efdd2bdeb81553905c8adcfc2` | yes, same SHA-256; probe 1920×1080, 280 s | `F01`, VERIFIED for the website; 720p rendition probed 1280×720, 280 s; captions track yes | Available: master on this computer and on the website |
| `F02` | F02 — One System (executive) | V1.4.1 campaign | 1920×1080, 4:10 | `756f77e885ace3d08676f5e973471d6c5862299366457735f6ee45a7cb83e2af` | no | no | Missing: no master available |
| `F03` | F03 — Empathia in Action | V1.4.1 campaign | 1920×1080, 6:00 | `eac4663e8e3c202a24718ef0da2fbece6dbb5fd4f74388a1ea2cd953c1a0eb4d` | no | no | Missing: no master available |
| `IE` | Field Intelligence film (4K) | Field Intelligence | 3840×2160, 5:00 | `6ee94d40ce8615f8584091cceb74adfab39f1a3faab925255b4e011dbff5fd55` | yes, same SHA-256; probe 3840×2160, 300 s | `IE`, VERIFIED for the website; 720p rendition probed 1280×720, 300 s; captions track yes | Available: master on this computer and on the website |
| `IE-trailer` | Field Intelligence trailer (0:60) | Field Intelligence | 3840×2160, 0:59 | `874a259d2ed5ee6f5a8b057e8ca1cb39eb4e90a27eb9d1ebbc2409befacb6afc` | no | no | Missing: no master available |
| `IE-teaser` | Field Intelligence teaser (0:30) | Field Intelligence | 3840×2160, 0:29 | `ec78da07a9a066de6e4b063e88774b7daf6ce6caa0e88c75877231118b7bf5c6` | no | no | Missing: no master available |
| `M2` | Empathia — the 2:00 master | Empathia 2:00 | 1920×1080, 2:00 | `10ad123ad3fd4cfd45cfde4b92b7281f39c4645fb93b07e667985810b9b221f9` | no | `M2` is a different file (master SHA-256 4578aadab522…, the owner's 13 Nov upload), not this record's | Missing here; a different master of the same film is on the website |
| `M60` | Empathia — executive cut (0:60) | Empathia 2:00 | 1920×1080, 1:00 | `90f83aab5409ac05138945ca325025c4ebcd89a0e1b6a17fc3c1b3f6ad1f79da` | no | no | Missing: no master available |
| `M30` | Empathia — social cut (0:30) | Empathia 2:00 | 1920×1080, 0:30 | `68c00e064e691f484dd8030035430cc323ca5febaa9b20694a401509e405b99c` | no | no | Missing: no master available |
| `M15` | Empathia — teaser (0:15) | Empathia 2:00 | 1920×1080, 0:15 | `7ab9b1e85476c1b26a47ddc2ab4b6aacc149d4b6f08f154d858fef9a1cd69655` | no | no | Missing: no master available |
| `F02P` | The Living System (3:00) | Campaign 2026-10-10 | 1920×1080, 3:00 | `46ee50741ad42d845f72c30bfec3ed2c3ba7122590e45220e9def1787a0e54f1` | yes, same SHA-256; probe 1920×1080, 180 s | `F02P`, VERIFIED for the website; 720p rendition probed 1280×720, 180 s; captions track yes | Available: master on this computer and on the website |
| `F04` | What If Your Environment Could Explain Itself? (2:00) | Campaign 2026-10-10 | 1920×1080, 2:00 | `3f9fba4055be8b2372e0e0175666f200cf56d44eb243a3de820709b020755c52` | no | no | Missing: no master available |
| `SyncLab` | SyncLab — From Hypothesis to Evidence | Collaboro-Sing | 1920×1080, 0:35 | `853f3436b21a500c8cb41f82b44d91d5c6a88b6dc99f1df2ace7533e094f15ff` | yes, same SHA-256; probe 1920×1080, 35 s | `SYNCLAB`, VERIFIED for the website; 720p rendition probed 1280×776, 35 s; captions track yes | Available: master on this computer and on the website |
| `S01` | S01 · Start with a building. Find everything connected. | Social shorts | 1080×1920, 0:25 | `918ebb96de4244c2086177f1d8a78e7a12f11427ea829e409f1cb925ef1cb289` | no | no | Missing: no master available |
| `S02` | S02 · Don’t browse blindly. Ask where to look. | Social shorts | 1080×1920, 0:27 | `999b695c6297cf4e7cdae6468e42cebd74a734eb7f71ca66dce3d429d106fdfe` | no | no | Missing: no master available |
| `S03` | S03 · An inventory isn’t an operating model. | Social shorts | 1080×1920, 0:26 | `8fe1e6cc02bbfabefc38ae7a675c7f391b03665921c0a9469dc0d96c42662508` | no | no | Missing: no master available |
| `S04` | S04 · Replace a device. Keep its history. | Social shorts | 1080×1920, 0:30 | `794f3dee1273cb36908d2444c25fceb786b92610f0ce797cbb948c79aa3c79e1` | no | no | Missing: no master available |
| `S05` | S05 · A room isn’t ready because someone says so. | Social shorts | 1080×1920, 0:27 | `29c7b9870ab05f5412c2770d8827fd5b82560a58cea7ec374e04d5fe3e500ea5` | no | no | Missing: no master available |
| `S06` | S06 · Reachable doesn’t mean working. | Social shorts | 1080×1920, 0:28 | `48c0f9c4fcf8ac2bb1fc397b359a3d33be57894aa23e42251a9f9740996cd9b7` | no | no | Missing: no master available |
| `S07` | S07 · See the room before you change the room. | Social shorts | 1080×1920, 0:26 | `d6572093f76a6d8772dbe2245f36fbcfc90f32038dd4d758237666af785f5c52` | no | no | Missing: no master available |
| `S08` | S08 · A projection should show its math. | Social shorts | 1080×1920, 0:28 | `090be6f59395e11b4cc3508344530a1f7fffd9888e20132153bf7e806f61483f` | no | no | Missing: no master available |
| `S09` | S09 · When remote evidence ends, field work begins. | Social shorts | 1080×1920, 0:25 | `9a6a2a158fb05a02e9aa6e6f0f474a055d9be05803bd328aed8a1732b5c19795` | no | no | Missing: no master available |
| `S10` | S10 · Not every critical space is a meeting room. | Social shorts | 1080×1920, 0:28 | `64054a1e1153d379a885b67f6ee019a6cf8c2459489db03116b6bf99505f73a5` | no | no | Missing: no master available |
| `S11` | S11 · Engineering knowledge shouldn’t disappear. | Social shorts | 1080×1920, 0:25 | `8346aa6b631bf180389ed73d54e7b9b78b6e3c8fae9e7fb6b3fe5b67594d4549` | no | no | Missing: no master available |
| `S12` | S12 · Six screens shouldn’t mean six versions of the truth. | Social shorts | 1080×1920, 0:30 | `46389f0a98a755c336f5a785a3f891e7829691fe73e1fb12a7aa704ee124bd8b` | no | no | Missing: no master available |
| `S13` | S13 · Let the AI draft. You decide. | Social shorts | 1080×1920, 0:30 | `7cde0a458d0b0a6e6e29c5350a86ecfb95d737199ef096335aa60ca6335a7074` | no | no | Missing: no master available |
| `S14` | S14 · A visitor shouldn’t need directions. | Social shorts | 1080×1920, 0:28 | `273224e19f8ef7599c9df37e3aaa56565ca1a92478462cd8d554854ece174ff3` | no | no | Missing: no master available |
| `S15` | S15 · Follow one issue to the room it lives in. | Social shorts | 1080×1920, 0:30 | `eb21ceefb3024c0ac25701f4478c84b7d407548746dd3f3b6ac19defe556218c` | no | no | Missing: no master available |
| `S16` | S16 · Watch a room’s whole life. | Social shorts | 1080×1920, 0:27 | `c9a2f11dad644652fd8144060bb6679c6900cb8a619e451d94a5c0200f347d45` | no | no | Missing: no master available |
| `S17` | S17 · Who answers after hours? | Social shorts | 1080×1920, 0:27 | `4306152535c9f3bb2463cd82bdadc31bb9940c90ae6bd78813e8f758864bf4b3` | no | no | Missing: no master available |
| `S18` | S18 · Who actually knows how? | Social shorts | 1080×1920, 0:26 | `cdf27d0de15a5416fad3d355864e7df88f7df374b287ed69843906059f3d20d0` | no | no | Missing: no master available |
| `S19` | S19 · Hear what one EQ band does. | Social shorts | 1080×1920, 0:30 | `7d66247e9a9385270117f8b6afc15074147f1b6656596cdbcfeecbd42bdf2d23` | no | no | Missing: no master available |

## Not in the 36

The website's newer films (the nine product films `P-*`, `W2`, `V141R`, `F-LIFE`, `F-FOLLOW`, `F-SIGNAL`) were made after the studio
list and are audited in `apps/website/films.json` and the website's media tests, not here.

## What it would take to close the gaps

The 31 missing masters can only come from the founder's original media store (the 26 Oct masters). When they are supplied, they
are hashed against this table before any of them is shown as available; anything for the public website also needs the owner's
verification for the website, as the five above have.
