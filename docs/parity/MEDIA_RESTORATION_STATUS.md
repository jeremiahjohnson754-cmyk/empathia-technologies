# Media, narration and SIGNAL — restoration status (2026-10-31)

Answers the master brief's §1 special audit and hard question 3 ("does every video play with real licensed media and every narration
play as real audio with a transcript and captions?"). Short answer: **no, not yet** — and this file says exactly what exists.

## V2.5.3 single-file editions (census)

`python3 -I scripts/audit/v253-media-census.py <live.html> <offline.html>` → `docs/parity/V253_MEDIA_CENSUS.json` (text scan of the inline
scripts, never executed):

| | live | offline |
|---|---|---|
| Size / SHA-256 | 6,957,191 B · in the JSON | 6,957,206 B · in the JSON |
| `SIGNAL_EPISODES` playable ids | **S1E1, S1E2, S1E6** (3) | the same 3 |
| `VO_DUR` narration durations | 172 entries | 172 |
| `CINE_FILMS` definitions | 7: academy, agent, empathia, learn, lite-emp, lite-eng, signal | the same 7 |
| `<video>`/`<audio>` in the markup | 0 / 0 | 0 / 0 |
| Embedded `data:audio`/`data:video` | **0** | **0** |
| Media ids the code resolves | `film-empathia`, `media-files`, `media-migration`; the rest (`cine-*`, `vo-*`) are player element ids | the same |
| `voPlay` / `mediaUrl` / `mediaHas` present | yes | yes |

So the V2.5.3 editions carry **scripts, narration text and timings, and player code — not the media**. The only external audio id,
`film-empathia`, is the campus soundtrack whose voice is the vidIQ "Brian" stem; it was excluded from the 2.5.x builds for rights
(`MEDIA_RIGHTS_LEDGER`). The pattern counts for `VO_LINES` and `SIGNAL_SEASONS` did not resolve with the scanner's literal patterns and are
not reported (the 172 is from `VO_DUR`); the inspection findings' "172 VO_LINES entries, twelve seasons" is consistent with it.

## Reconciliation

| Content | Authored | Playable today | Narration as real audio | Captions / transcript | State |
|---|---|---|---|---|---|
| SIGNAL story (12 seasons, 133 chapters, 1,583 panels — standalone corpus) | yes (corpus) | **3 episodes** in V2.5.3; the demo's Learn shows the V1.4.1 lessons/labs/drills and the SIGNAL library | **no** cleared audio | text panels only | **NOT FULLY RESTORED** — 130 chapters have no playable experience |
| Campus voice-over (172 lines) | yes | timings only | Kokoro renders exist internally; **not cleared** | text | **NOT FULLY RESTORED** |
| CINE_FILMS (7 cinematic definitions) | yes (shot lists) | as scripted sequences in V2.5.3 | no | — | **PRESENT + DEGRADED** (no media) |
| Produced films (36 curated; 5 placed on the website) | yes | yes, as files | yes (vidIQ Brian or Kokoro) | WebVTT + transcripts produced | **Rights UNVERIFIED** for every external channel |

## What would complete it (in order)

1. Clear or replace narration rights (see `docs/media/WEBSITE_FILM_PLACEMENT.md` §3) — the decision gates everything below.
2. Voice the 172 campus lines and the 3 playable SIGNAL episodes with the cleared voice; captions from recogniser timings; a
   "narration unavailable" state instead of silent captions where a line has no audio.
3. Produce the remaining SIGNAL chapters in priority order — each one is new media work (script exists; voice, picture, QA), not a
   restoration; report the remaining count truthfully until done.

Nothing here was generated or purchased in this sprint; no ElevenLabs, HeyGen or Adobe credits were spent.
