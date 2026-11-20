# SIGNAL voice cast — proposal 1, 9 November 2026

Status: **PROPOSED. No line has been recorded for any character and nobody has listened to a test.** The narrator is the founder's
choice. Every other row is my proposal from the voice descriptions alone and needs the founder's ear on two test lines each before
it is fixed. Once fixed, a character keeps the same voice in every episode. All voices are stock voices from the founder's ElevenLabs
library (the same voices are reachable through the video connector); none is cloned from, or directed to imitate, a real person.

How the canon describes people is thin on purpose (it draws them; it does not write casting notes), so the "read" column is taken from
what each character says and does in the chapters named, and is mine.

| Character | In the canon | Read (mine, from the chapters) | Proposed voice | Alternate | Direction |
|---|---|---|---|---|---|
| **Narrator** | Captions and narration throughout | Calm, close, unhurried | **Brian** (deep, resonant, comforting) — founder's choice | — | Plain and low; never sells; lets a number land |
| **Maya** | 797 panels, Prologue to S12 | Starts unsure and quick to blame herself; ends a principal who hands the estate on. Warm, fast-thinking, funny under pressure | Sarah (confident, warm, mature quality) | Jessica (bright, warm, younger) | Seasons 1–3 lighter and quicker, breath before hard lines; from Season 7 slower and lower. One voice across the whole arc |
| **Ray** | 83 panels, Prologue, S1, S3, S4, S12 | Lead engineer and mentor. Dry, exact, kind without saying so. "Not decaf" | Bill (wise, mature, balanced) | Eric (smooth, trustworthy, forties) | Under-played. Jokes delivered flat. Never raises his voice |
| **Imani** | 47 panels, S1–S3 | Technical director. Decisive, carries the room, short sentences | Matilda (knowledgeable, professional, alto) | Bella | Brisk; warmth shows only after the fix |
| **Theo** | 24 panels, S1 | Volunteer in his early twenties; eager, means well, caused the problem | Liam (energetic, young) | Will (relaxed optimist) | Fast and sunny, then small when he realises |
| **Priya** | 38 panels, S1–S7 | Owns the network. Precise, patient, teaches by asking | Alice (clear educator) | Bella | Even pace; every term pronounced fully |
| **Sofia** | 28 panels, S1–S2 | Volunteer; bright, a little chaotic | Laura (sunny, quirky) | Jessica | Light; overlaps other people's lines |
| **Dante** | 37 panels, S1–S2 | Peer on the desk; charming, later blamed unfairly | Chris (charming, down-to-earth) | Roger | Easy; hurt, not angry, when blamed |
| **Sam** | 80 panels, S3, S4, S7 | Workplace colleague; steady | Eric (smooth, trustworthy) | River | To be read against the Season 3 chapters first |
| **Tess** | 45 panels, S4–S5 | On Air; fast, clipped, live-show nerves | Jessica (bright) | Laura | To be read against Season 4 first |
| **Kit** | 32 panels, S6–S11 | Later-season colleague | River (relaxed, neutral) | Will | To be read first |
| **Walter** | Named in S1 as the grandfather watching from hospital | Older man, frail but dry | George (warm storyteller) | — | Few lines; never sentimental |
| **Ms. Evelyn** | S1, watching from home | Older congregant | Lily (velvety) | Matilda | One or two lines; clear, a little formal |

Not yet cast: the other 80 drawn characters. They are cast season by season when their chapters are scripted, and background
voices ("Colleague", "Crew") are cast per scene rather than as one person.

## The first episode in numbers (S01E00 "Signal")

55 panels, 62 spoken lines, 592 words, 11 named speakers. Narration lines and captions are extra.

## What must be true before a voice is "cast"

1. Two test lines recorded per candidate (one calm, one under pressure), from the canon text unchanged.
2. Each take transcribed back and compared with the script word for word (the workspace cannot play audio, so this is the check it can run).
3. The founder listens and chooses. The choice, the voice identifier and the date are written here.
4. Technical terms get a pronunciation line where a voice gets them wrong.

## Season 2: cast and voiced (Qwen3-TTS presets, 19–20 Nov 2026)

Season 2 is voiced on this machine with Qwen3-TTS (CustomVoice 0.6B) and its nine built-in preset voices, not with ElevenLabs, whose
credits are spent. No voice is cloned from a person and none was directed to imitate one: the Base (clone) models are not used. In the
demonstration, every Season 2 speaker is named with their voice ("Qwen3-TTS Vivian, AI voice").

**Founder's choice, 19 Nov 2026 17:54:** "Vivian and ben is good I pick those voices". Maya is **Vivian** and Ben is **Aiden**, chosen
after listening to casting samples. Every other speaker is my casting from the same presets, for contrast between people who speak in
the same scene. The founder has not auditioned those.

| Preset | Speakers |
|---|---|
| Vivian | Maya |
| Aiden | Ben |
| Ryan | Dante, house tech, video operator, houseperson |
| Serena | Leah, Priya, association president |
| Dylan | Jordan, ticketing lead, Pax, stream vendor |
| Ono Anna | Sofia, Imani, Odette, banquet captain |
| Sohee | Rosa, Kim, Marisol, Noor, lunch emcee |
| Eric | Graham, Gil, site tech, headliner's manager |
| Uncle Fu | Hank, crew, manager, Reid, camera 2 operator |

**Heard differently from Season 1:** Maya, Imani and Priya had ElevenLabs voices in Season 1 (Sarah, Courtney and Vicki M Rodriguez).
In Season 2 they sound different. The player names the voice of each season.

**How each take is checked:**

1. The line is spoken from its canon text. Numbers, times and acronyms are written out the way they are said.
2. Whisper (base.en) transcribes the take back. It is judged against the line with numbers set aside, because Whisper writes digits where
   the line spells them, and on its speaking rate: a take fails above 0.35 word error rate, below 3.5 characters a second or above 20.
3. A take that fails is generated once more. A line whose second take also fails is left as a caption.
4. The silence at both ends is trimmed. Each take is brought to −18 LUFS and encoded as 96 kbps mono MP3 at 44.1 kHz. Season 1 measures
   −17.5 LUFS.

**Where it stands:**

- 210 of the 339 lines were generated before the run stopped at its two-hour limit (20 Nov 03:13). These are episodes 1 to 6 and 12
  of the 34 lines of episode 7.
- Of those 210 takes, 202 pass the check. That includes three the check flagged that I read as false alarms: a sound-alike ("wear" for
  "where"), a digit ("7" for "seven's"), and a take where every word was heard but the score was thrown by "job's" and spelled numbers.
- The other eight were generated once more. Four second takes pass and are used: Ben "You didn't have to back me in front of her.",
  Sofia "You backed Ben.", Leah "Jordan." and the houseperson's line. Four lines failed both takes and are captions: Kim "A photo isn't a
  rating.", Marisol "It dies when I turn?", Sofia "That's cowardice in a hard hat." and Sofia "Eight counts. Okay. Eight counts."
- 206 takes are heard in the demonstration.
- The rest of episode 7, and episodes 8 to 11 (129 lines), are captions until they are voiced.

Files: `media/signal/s02/lines.json` (each line, its spoken form and its preset), `media/signal/s02/build-takes.py`,
`media/signal/s02/CHECKS.json` (each take's check), the takes in `apps/demo/public/media/signal/s02/`.
