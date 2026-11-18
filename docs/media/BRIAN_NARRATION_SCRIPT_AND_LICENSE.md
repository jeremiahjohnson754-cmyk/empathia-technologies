# Tour G narration: script, takes, provenance and licence

**What this covers:** the spoken narration for Tour G, "The Life of a Room" (`#/tours/g`, 16 stops), in the investor demo.

**Approval:** founder, 18 Nov 2026 16:23 — "you're approved for any form of media generation paid or not if have credits and connectors you can use".

**Status on 18 Nov 2026:**
- **Shipped:** 11 of 16 takes (G1–G8, G10, G11, G14).
- **Not generated:** G9, G12, G13, G15 and G16. ElevenLabs refused them because the account ran out of credits (quota 39,980; 16 left). Those five stops are text only.
- **Nobody has listened to any Tour G take yet.** Each take was the first generated for its line, chosen by measurement alone (below). It has not been heard on a loudspeaker by anyone.

## The voice

| | |
|---|---|
| Voice | ElevenLabs premade voice **"Brian – Deep, Resonant and Comforting"**, voice id `nPczCjzI2devNBz1zQrb` |
| What it is | a stock synthetic voice from the ElevenLabs library, **not a clone of a real person**. It is not the founder's voice and imitates no named individual. |
| Model | `eleven_v4`, default settings, two takes requested per line |
| Generated through | the ElevenLabs connector (MCP), flow `tqtqM1ZAZZSfJji28HCc` |
| Account | the founder's ElevenLabs workspace. No key was read, pasted or stored. |
| Label shown to visitors | "AI-generated voice (synthetic, not a real person) · ElevenLabs premade voice Brian · eleven_v4". It appears under every narrated stop and in each caption file's NOTE. |

## Licence

**The generated audio is governed by the ElevenLabs terms for the account that generated it.**

**Not checked from here:** which plan the account is on, and therefore whether it allows commercial use. The connector's usage tool needs a permission this session does not have.

**Before any public commercial use** (a paid campaign, the public website), check:
1. that the plan allows commercial use of generated audio;
2. whether attribution is required.

**Until then:** these takes stay in the investor demonstration, labelled as AI-generated. That is where they are now.

## How each take was chosen and prepared

1. **Generated:** two takes per line, nothing re-generated. No line was generated twice to "retry".
2. **Chosen:** the first take of each line was kept. For G8 and G14 the second take was refused for lack of credits.
3. **Measured before use:**
   - integrated loudness (EBU R128);
   - duration against the words (2.4–2.6 words per second throughout, so nothing was cut short);
   - no silence longer than 0.9 s at −45 dB.
4. **Prepared:**
   - a fixed gain to bring each take toward −23 LUFS. It measures −23.4 to −23.5 after encoding, the same as the A5 pilot.
   - mono, 44.1 kHz, MP3 at 96 kb/s, metadata stripped.
5. **Captions:** one cue per sentence. Each boundary is placed at the measured pause (silencedetect, −45 dB) nearest the sentence's share of the line. All 22 boundaries fell on a real pause; none was estimated.
6. **Held by hash:** each shipped file's SHA-256 is in `NARRATION` (`apps/demo/src/tour/tours.ts`). The unit suite `demo-spaces` fails if a file changes.

**Behaviour in the tour:**
- Nothing plays until the visitor presses play (never autoplayed).
- Each narrated stop has captions and a transcript.
- If the audio cannot load, the transcript stands in.

Tests: `demo-tours` TR-g-narr-desktop, -phone, -files.

## Script and takes

The transcript is the exact text sent to the model, and it is also what the visitor can read under the stop. The on-screen stop text (the tour panel) is shorter and carries the ids (PA-0007, AS-0097, AS-0112). The spoken line leaves those out because a voice reading ids aloud does not help.

**Units:**
- **s:** duration in seconds.
- **LUFS:** integrated loudness after preparation.
- **Gain:** the gain applied, in dB.
- **Shipped sha256** and **source sha256:** the first 12 hex digits of each file's SHA-256.

| Stop | Spoken line | s | LUFS | Gain | Shipped sha256 | Source sha256 |
|---|---|---|---|---|---|---|
| G1 | Every room has a story. This is Atlas 4.218, a boardroom on a fictional campus. Core Replay plays its life from its own records, and every step tells you how sure it is. Watching never changes the room. | 15.31 | −23.5 | −0.5 | 1df29f1378de… | 64a5f6c37634… |
| G2 | It begins with intent. Nine requirements, six of them must-haves: everyone heard and seen at the far end, one touch to join, simple enough for a guest. Everything that follows is judged against these. | 14.03 | −23.5 | −0.8 | c797160408a4… | 0f365880f633… |
| G3 | Then the room is designed. Every device becomes a numbered position, and before anything is installed, the commissioning engine already knows which tests this design will need. | 10.53 | −23.4 | −1.0 | 8d455ef9c385… | 52316a435fc8… |
| G4 | This is the same room in Lite. The same record, seen in three dimensions: the walls, the furniture, and every device at its position. | 8.99 | −23.5 | −1.5 | 2a75054c0b56… | e86facabdd60… |
| G5 | The design becomes real. The front camera’s position now holds a physical unit with its own identity. A position and the asset in it are different things, and the record keeps both. | 11.65 | −23.4 | −0.8 | 43d5bc98bf6f… | fa1eaa76a153… |
| G6 | Commissioning proves it. Each test is recorded by the person responsible, and checked by somebody else. A result nobody independently verified does not count. | 10.37 | −23.5 | −0.6 | d92498366f4c… | ab273e70e12e… |
| G7 | Here is the record itself: what was required, what was observed, who recorded it, and who verified it. The evidence is synthetic, and it says so. | 9.95 | −23.5 | −0.8 | a1cc732a1276… | f6b0a4f4a116… |
| G8 | The room is no longer just installed. Its accepted condition is now documented. Baseline one is what this room was proven to do, and it is never overwritten. | 10.45 | −23.4 | −0.9 | a33766138344… | 2417e01a9d6a… |
| G9 | In use, things fail. When they do, the problem becomes work: a ServiceHands job tied to this room and, where it is known, to the exact device. | — | — | — | **not generated** (credits) | — |
| G10 | Who can fix it? Search Party starts from the room: who supports it, who knows it, and how they are connected, each with where that knowledge came from. | 9.64 | −23.5 | −1.2 | 28ba7d7e3c7a… | b4c8ddd6e334… |
| G11 | And where is the equipment? Search for the replacement unit, and every product finds the same asset: its position, its room, its history. | 8.83 | −23.5 | −1.0 | 4a9b67d1747a… | dd05387a17af… |
| G12 | When the camera is replaced, the system reopens only the tests that involve that position. The old results stay as history. They never count for the new unit. | — | — | — | **not generated** (credits) | — |
| G13 | The reopened tests are run again, and verified independently. Baseline two becomes current. Baseline one is kept, so you can always compare. | — | — | — | **not generated** (credits) | — |
| G14 | Assurance holds the accepted state, so any later difference shows as drift against a known baseline, not as a guess. | 7.63 | −23.5 | −0.9 | 97c2c43ccd28… | ac45e37ebca8… |
| G15 | The same records roll up to leadership. Every figure traces back to the rooms and the jobs it came from. None of it is streamed from a real building. | — | — | — | **not generated** (credits) | — |
| G16 | One room. One connected history. Every decision connected to the people, the technology and the evidence it affects. Now imagine that across your entire enterprise. | — | — | — | **not generated** (credits) | — |

## Still owed

1. **The five missing lines.**
   - When credits are available, generate G9, G12, G13, G15 and G16 in the same voice and model, on the same flow.
   - About 1,600 credits are needed at two takes per line, judging by the 116–202 credits each line cost per take.
   - Then prepare them as above and add each to `NARRATION` and its stop.
2. **A listening pass by a person.** Check for:
   - mispronunciations, especially "Atlas 4.218" in G1;
   - an odd stress;
   - the pace from one stop to the next.

   Replace any take that fails. Until that pass is done, no Tour G take is "approved by ear".
3. **The licence check** described above, before any public commercial use.
