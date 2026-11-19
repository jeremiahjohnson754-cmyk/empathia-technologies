# Qwen3-TTS voice: the missing tour lines and the website's recorded films

**What this covers**
- The spoken narration of every investor-demo tour stop that had no take before 19 Nov 2026: 62 stops of tours A to F and the five Tour G stops that were captions only (G9, G12, G13, G15, G16). 67 lines in all.
- The voice of the website's twelve recorded product and flow films (P-*, F-LIFE, F-FOLLOW, F-SIGNAL), which were silent with their words on screen.

**Directives** (founder, 19 Nov 2026, saved verbatim in `.local/directives/`):
- 09:48: "Qwen3-TTS use this for all the audio lines not completed so all the videos on the corporate website signal …".
- 10:12: "Let's just do one season of signal and the nonverbal but captioned videos on the corporate website and whatever tour lines that's missing".

## The voice

| | |
|---|---|
| Model | `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice` (Hugging Face snapshot `85e237c12c027371202489a0ec509ded67b5e4b5`) |
| Licence | Apache-2.0 (the model card's own licence field). The takes are this project's own output. |
| Voice | the model's **preset speaker "Ryan"** ("dynamic male voice with rhythm", native English). A built-in voice of the model: **not a clone** of anyone, not the founder's voice, no reference recording used. The model's Base (voice-cloning) variant was not used. |
| Settings | language English, the model's default sampling, one take per line, never regenerated to "retry". |
| Where it ran | on the project's own build machine (CPU, 2 cores), offline from the downloaded snapshot. Nothing was sent to any service. |
| Label shown to visitors | "AI-generated voice (synthetic, not a real person) · Qwen3-TTS preset voice Ryan · Qwen3-TTS-12Hz-0.6B-CustomVoice (Apache-2.0)", under every narrated stop and in each caption file's NOTE. The films say it in their disclosure line and captions. |

**Chosen by ear:** not yet. The founder was sent the same line (G9) in the two English preset voices, Ryan and Aiden, on 19 Nov; Ryan was used while that choice is open. If Aiden is chosen, the takes are regenerated (about an hour for the tour lines on this machine).

**Two voices in Tour G.** Eleven Tour G stops keep the ElevenLabs "Brian" takes the founder chose by ear on 18 Nov; the five that ElevenLabs refused are Ryan. Each stop names its own voice.

## The words

- **Tour stops A to F:** the stop's own on-screen text (`apps/demo/src/tour/tours.ts`), word for word.
- **Tour G9, G12, G13, G15, G16:** the lines already written for the voice on 18 Nov (they were shown as timed captions).
- **Films:** each step's own on-screen words (`scripts/media/product-films.mjs`).
- **Spoken forms:** the model was given the same words with ids, numbers and initialisms spelled as they are said, so that they are read correctly:

| Written | Said |
|---|---|
| 4.218, 3.225 | four point two one eight, three point two two five |
| PA-0007, AS-0097, A-0104 | P-A zero zero zero seven, A-S zero zero nine seven, A zero one zero four |
| 3D, 2D | three-D, two-D |
| v1, v2 | version one, version two |
| APEX, SIGNAL | Apex, Signal |
| PDF, JSON, CSV, EQ, HQ, IT | P-D-F, J-SON, C-S-V, E-Q, H-Q, I-T |

No word was added or left out. The transcript and the captions show the written form.

The scripts (all in the repository):
- `scripts/media/qwen-tour-manifest.py`: the tour lines and their spoken forms.
- `scripts/media/qwen-tts-batch.py`: generation, one take per line.
- `scripts/media/qwen-takes.py`: tour takes finished, captioned and catalogued (`apps/demo/src/tour/narration-qwen.gen.ts`).
- `scripts/media/qwen-film-takes.py`: film takes trimmed and levelled.
- `scripts/media/record-product-film.mjs --voice=<dir>`: films re-recorded with the voice.

## How each tour take was checked and prepared

1. **Heard back by a recogniser.** Every take was transcribed by Whisper base.en (on this machine) and compared word by word with its line. The word error rates are recorded in `media/narration-qwen/CHECKS.json`. A take that does not say its line is not shipped: that stop stays text only and is listed below.
2. **Measured:**
   - duration against the words (words per second);
   - the longest pause inside the take;
   - integrated loudness (EBU R128).
3. **Prepared:**
   - silence trimmed to 0.15 s before and 0.25 s after;
   - one fixed gain to −23 LUFS, the level of the shipped takes;
   - mono, 24 kHz (the model's own rate), MP3 at 48 kb/s, metadata stripped.
4. **Captions:** one cue per sentence. Each boundary sits at a measured pause (silencedetect, −45 dB): the pause nearest the end of the sentence's last word, as the recogniser timed it. A boundary with no pause within 0.8 s is placed at that word's end and reported as estimated.
5. **Held by hash:** each file's SHA-256 is in `narration-qwen.gen.ts`. The unit suite `demo-spaces` fails if a file changes or a stop has no take.

**In the tour:** nothing plays until the visitor presses Listen. Each narrated stop has captions and a transcript. If the audio cannot load, the transcript stands in.

## Results (tour takes, 19 Nov 2026)

- **67 takes shipped, one per stop that had none.** Every tour stop (79) now has a take; `media/narration-qwen/CHECKS.json` lists each
  take's words, spoken form, what the recogniser heard, its measurements and hash. The spoken script is `media/narration-qwen/tour-script.json`.
- **Heard back:** every take says its line. Word error rates (Whisper base.en against the written words) are 0 to 0.36, mean about 0.05;
  the non-zero rates are the recogniser writing digits for spelled numbers ("version 1" for "version one", "140" for the written 140
  read aloud), splitting "ServiceHands", or mishearing a name ("Began" for "Beacon", which Whisper small.en hears correctly).
- **Two takes replaced.** B8's first take said "overridden" for "overwritten" and F6's garbled "dossier". Both recognisers heard the
  errors. Each got one new take from a corrected spoken form, and both new takes say their lines. The replaced takes were not shipped.
- **Levels:** −23.2 to −23.5 LUFS after encoding. 673.5 s of narration in all, 4.05 MB (mono 24 kHz MP3, 48 kb/s).
- **Pace:** 1.3 to 3.0 written words a second (the shipped ElevenLabs takes run 2.4–2.6). Ryan is slower than Brian on some lines;
  C2 is the slowest. The longest pause inside any take is 0.98 s (A9).
- **Captions:** 53 sentence boundaries; 52 were placed by the recogniser's word timing, then snapped to a measured pause within 0.8 s
  where one exists. 15 boundaries had no pause that close and sit at the timed word end (listed per take in CHECKS.json as estimated).

**Not done:** nobody has listened to all 67 takes. The founder heard one line (G9) in Ryan and Aiden. A listening pass, and the founder's
choice of voice, remain open.

## The website's films (19 Nov 2026)

**The takes.** 110 lines, one per step of the twelve films (P-* and F-LIFE, F-FOLLOW, F-SIGNAL), the step's own on-screen words in their
spoken form, in the same preset voice Ryan. The first 107 were lost on the build machine (a check for half-written files ran with a Python
that could not read audio, and deleted them); all 110 were generated again from the same spoken forms.

**Heard back.** Every take was transcribed by Whisper base.en and compared word by word with its spoken form
(`media/narration-qwen/FILM_CHECKS.json`: what each says, what was heard, the word error rate, the prepared length, the fingerprint).
The mean word error rate is 0.11; the higher ones are the recogniser writing digits for spelled ids ("4.218" for "four point two one
eight", "AS0097" for "A-S zero zero nine seven") and mishearing names ("Light" for "Lite", "Hatless HQ" for "Atlas H-Q").

**Five takes replaced.** A take was replaced, once, from the same spoken form when the recogniser heard a sound before the first word that
is not in the line, or when its speech ran under 0.8 written words a second with no pause to explain it: P-lite-03 (a sound first, and
11.6 s of speech for an 8-word line), P-lite-09 (5 words stretched over 6.7 s), P-lite-11, P-search-party-10 and P-commissioning-04 (a
sound first, heard as "Uh-huh", "Mm-hmm", "Uh-uh"). All five new takes say their lines. The replaced takes are not shipped.

**Prepared** by `scripts/media/qwen-film-takes.py`: trimmed to 0.05 s before the first sound and 0.1 s after the last, one gain to
−23 LUFS, 48 kHz mono. 532.2 s of voice in all.

**Recorded** by `scripts/media/record-product-film.mjs --voice=<dir>`: each step's line is read as its words appear, the step holds until
the line is said, the mix is levelled to −16 LUFS, and the captions run from each line's start to the next step. Each film's RECORDING.json
names the voice; `apps/website/films.json` carries the disclosure "The voice reading the words on screen is AI-generated (synthetic, not a
real person): Qwen3-TTS preset voice Ryan."

**Not done:** nobody has listened to all 110 takes. The founder's choice between Ryan and Aiden (sent with G9 on 19 Nov) is still open.
