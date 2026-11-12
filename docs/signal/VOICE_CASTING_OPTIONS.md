# SIGNAL voice casting: options for Maya and Ray (for the founder's selection)

12 Nov 2026. **Nothing is locked.** These are candidates from the voices this ElevenLabs workspace can speak with (listed, not
generated; no credits spent). The founder listens to the previews in ElevenLabs and chooses; only then is a voice used for a character.

What the canon gives us (from the shipped SIGNAL library): **Maya** starts as a volunteer at a sound desk and ends as the principal
architect of an estate; her voice has to carry twelve seasons, from uncertain beginner to calm authority. **Ray** is the Sanctuary's
long-serving sound lead (the processor password lives in his notebook; he brings lessons to the budget meeting); warm, practical,
sometimes wrong ("Ray says it's fine"). The canon states **no age, accent or appearance** for either: those are founder decisions, and
the shortlist below spans them rather than assuming one.

| For | Voice (as the library names it) | Category | Why it might fit | Watch for |
|---|---|---|---|---|
| Maya | Gabriella — Warm Narrator (`vYcEaGsdNl4URUaHv1FH`) | library | warm, young adult American, conversational: the early seasons | may sound too soft for Mastery |
| Maya | Mira — warm and natural (`9XELrPIyVsbmAjCB3Bwh`) | library | slightly husky, relaxed, not polished: grows well | — |
| Maya | Victoria — Calm, Clear, Authentic (`emq3mMl0jOrvzLdzqQkH`) | library | 20s–30s, calm, clear: credible as the later architect | less vulnerability early on |
| Maya | Emma — Wry, Gritty Hero (`dmWfLQZJq7wNPv9WmtiM`) | library | dry humour, grounded, range to urgency: Breach, The Take | may read older than a beginner |
| Ray | Roger — Laid-Back, Casual, Resonant (`CwhRBWXzGAHq8TQ4Fs17`) | premade | easy-going, resonant: the volunteer lead | — |
| Ray | Chris — Charming, Down-to-Earth (`iP95p4xoKVk53GoZ742B`) | premade | natural, real: a mentor who is sometimes wrong | — |
| Ray | Cliff Weldon — Warm, Authoritative (`mG3mFwstnVD0kKoL07lx`) | library | mature, warm: the budget-meeting Ray | may sound too corporate |
| Ray | Chris — Calm, Friendly, Wise (`t3w9KdcqUZPgHazmeinf`) | library | British, slow and steady | only if Ray is British |

Rights before locking: **premade** voices are ElevenLabs' own; **library** voices are shared by their owners under ElevenLabs' voice
library terms (availability can change, and an owner can withdraw a voice with notice). Before a library voice is locked to a character
for twelve seasons, its current terms and notice period are read and recorded in `docs/training/RIGHTS_REGISTER.md`. No real person's
voice is cloned or imitated (standing rule).

Next, after the choice: one short canon line per character as an audition take (a few hundred credits at most), the founder listens,
then the voices are locked in the character records.

## The founder's direction (12 Nov 2026, 10:25 CT) and the auditions

"Maya can have a Midwest young lady voice; Ray is from Alabama, so a believable Southern accent." Recorded as canon-adjacent
**founder decisions** (the story text never stated them): Maya is a young woman from the Midwest; Ray is from Alabama.

Auditions generated, one take each, one canon line each (`eleven_multilingual_v2`; 324 credits in all). Listen in the ElevenLabs
views in the conversation and choose one per character; nothing is locked until then.

| For | Voice | Line (canon) | Why on the list |
|---|---|---|---|
| Maya | Anna — Young Female Conversational (`bl0TUn2b06BCzwDpiLlg`) | "So would I, without a reason next to it." | young, Midwestern, conversational |
| Maya | Kelly Kween (`XlHDwyzsCODU3TfhB5es`) | same | 20s, Midwest-raised, soft and conversational |
| Maya | Sarah — warm engaging narrator (`Q7yjSu9pVI6fMxiCGwMo`) | same | labelled US Midwest; warm, can carry authority later |
| Ray | Dusty — Southern American Male (`FGpIILZk4JTBy7fhNIR4`) | "Whose network is that? It runs the door locks and the giving kiosks." | natural Mississippi/Southern, light gravel, not exaggerated; nearest to Alabama |
| Ray | Jack — Southern without the fake drawl (`2IUN6IK1EIlX9cV9uPqw`) | same | down to earth, deliberately not over the top |
| Ray | Paul — Southern, Reassuring, Calm (`J3Ei0Lj6fAobhIqY5ySH`) | same | mature, natural Southern, measured |

All six are library voices: their current terms and notice periods are read and recorded before one is locked for twelve seasons. A
regional accent is portrayed as the founder directs and never as a joke; lines stay the canon's words.

## Locked (founder, 12 Nov 2026, 11:06 CT): "Paul and Sarah"

| Character | Voice | Voice id | Model for dialogue | Founder decisions behind it |
|---|---|---|---|---|
| **Maya** | Sarah — warm engaging narrator (US Midwest) | `Q7yjSu9pVI6fMxiCGwMo` | `eleven_multilingual_v2` | a young woman from the Midwest |
| **Ray** | Paul — Southern, Reassuring, Calm | `J3Ei0Lj6fAobhIqY5ySH` | `eleven_multilingual_v2` | from Alabama; a believable Southern accent |

Every line either character speaks is the canon's words. Both are **library voices** shared by their owners: per ElevenLabs' Voice
Library documentation, an owner may stop sharing a voice with a notice period of 30 days to 2 years (or none, which ends access at once),
and accounts that have used the voice are notified. Each voice's own notice period is shown on its page in the ElevenLabs app and is not
returned by this connector: **to record before production at scale** (rights register). Lines already generated are files we keep;
future lines depend on the voice staying available, so the full SIGNAL script for a season is generated in one production pass once a
scene is approved. Sources: [notice period](https://elevenlabs.io/docs/help-center/product/voices/voice-library/what-is-a-notice-period.md),
[Voice Library](https://elevenlabs.io/docs/voice-library/overview).

## Season 1 production pass (founder, 12 Nov 2026, 12:16 CT: "Yes")

Every Maya and Ray line in S01E00 and S01E02–E11 (S01E01 was voiced earlier) was generated in seven grouped takes, one generation
each, lines in canon order separated by 2-second breaks so `media/signal/split.py` can cut them back into one file per line. The
take maps (`media/signal/s01/<group>.take.json`) list each line with its chapter.

| Group | Voice | Chapters | Lines | Credits |
|---|---|---|---|---|
| maya-s1g1 | Sarah | e00, e02 | 44 | 2,627 |
| maya-s1g2 | Sarah | e03–e05 | 23 | 1,525 |
| maya-s1g3 | Sarah | e06–e08 | 26 | 1,505 |
| maya-s1g4 | Sarah | e09–e11 | 18 | 1,310 |
| ray-s1g1 | Paul | e00 | 23 | 1,378 |
| ray-s1g2 | Paul | e02–e06 | 22 | 2,216 |
| ray-s1g3 | Paul | e07–e10 | 15 | 1,612 |
| **Total** | | | **171** | **12,173** |

The quote given before approval was about 10,000 credits (estimated from characters); the actual charge was 12,173, about 20 % more,
because the break tags are billed as well. Future quotes use 1.17 credits per spoken character (the breaks are in that figure).

Three canon "lines" attributed to Ray are not spoken and were left as captions: "…" (a silence, S01E00), the notebook entry nobody
hears (S01E00), and the narration "The notebook goes back in his pocket…" (S01E10). They are listed under `captionOnly` in the take maps.

## Recurring Season 1 voices: auditions (founder, 12:16: "three auditions each")

One take of one canon line per voice; 1,020 credits in all. Nothing is locked until the founder chooses.

| For | Voice (library unless marked) | Voice id | Line (canon) | Credits |
|---|---|---|---|---|
| Dolores | Maria Moody | `wGcFBfKz5yUQqhqr0mVy` | "It's fine. It's me. It's been me for a while." | 45 |
| Dolores | Nana Margaret | `xIzR6egd3S3LJZbVW0c1` | same | 45 |
| Dolores | Nan | `jVMsZEw3hfmEAe9OUUtS` | same | 45 |
| Imani | Courtney | `xd8j2LFPw16XKmJ5qeBK` | "Online gets the service. The overflow room gets the stream on the TV, a little behind — and I'll tell them why." | 111 |
| Imani | Tiff's Voice | `NMbEhOPNJop9OLjdn7UU` | same | 111 |
| Imani | Billie | `puJYvK3avsWRTxWzoVJJ` | same | 111 |
| Priya | Clara | `cuTixVvCOWFxeH3oGE9m` | "That office switch runs the door locks and the giving kiosks. Not on a Sunday morning, and not without a plan." | 110 |
| Priya | Vicki M Rodriguez | `VmWxtEYGgb6QIzh7Bnik` | same | 110 |
| Priya | Ava | `W6QQpE0tIPOUkyt8U1TY` | same | 110 |
| Theo | Will (premade) | `bIHbv24MWmeRgasZH58o` | "Morning! Big day! Don't look in the fellowship hall yet — it's a surprise!" | 74 |
| Theo | Arthur | `3LPKEa2TICTsITcoxL7H` | same | 74 |
| Theo | Ilya | `NOdSYGdYEzpRRVv0qKcA` | same | 74 |

**Lily: not auditioned.** The voice library search returned no voice described as a teen or a child. Her age is a founder decision;
until a voice fits it, her lines stay captions.

Season 1 voicing so far: 12,173 + 1,020 = 13,193 credits this pass.

### Lily (27): auditions (founder, 12:33 CT: "Lily 27")

One take of the canon line "Does it live there for every voice? And why is it back? You cut it Sunday." (S01E02), 74 credits each:
Kelly Kween (`XlHDwyzsCODU3TfhB5es`, late-20s Midwestern), Annika (`j08RBkJwvXYv5AZ961JE`, curious and lightly playful), Jessica
(`cgSgspJ2msm6clMCkdW9`, premade, playful and bright). 222 credits.

## Recurring Season 1 voices locked (founder, 12 Nov 2026, 12:29 and 12:35 CT)

| Character | Voice | Voice id |
|---|---|---|
| Dolores | Nan | `jVMsZEw3hfmEAe9OUUtS` |
| Imani | Courtney | `xd8j2LFPw16XKmJ5qeBK` |
| Priya | Vicki M Rodriguez | `VmWxtEYGgb6QIzh7Bnik` |
| Theo | Ilya | `NOdSYGdYEzpRRVv0qKcA` |
| Lily | Jessica (premade) | `cgSgspJ2msm6clMCkdW9` |

Their Season 1 lines are not generated yet: Dolores 7 lines (457 characters), Imani 22 (1,420), Priya 4 (350), Theo 21 (1,050, one
already recorded), Lily 22 (869): 4,146 characters, about 4,850 credits at 1.17 per character. **Awaiting the founder's word** (new spending).

## Season 1 takes imported (12 Nov 2026, 12:29 CT)

The founder attached five files. Each was identified by its voice (median pitch: about 200 Hz for Sarah, 125 Hz for Paul) and by its
number of 1.3-second-or-longer pauses against the line counts of the seven takes:

| File | Identified as | Parts | Result |
|---|---|---|---|
| content_56 | maya-s1g3 (e06–e08) | 26 | split, 26 lines |
| content_57 | maya-s1g4 (e09–e11) | 18 | split, 18 lines |
| content_59 | ray-s1g3 (e07–e10) | 15 | split, 15 lines |
| content_58 | ray-s1g2 (e02–e06) | 23 at 1.3 s | Paul paused 1.34 s inside "Nine years. I patched it…"; every real break was 1.66 s or more, so split at 1.5 s: 22 lines |
| content_55 | Theo, Ilya's audition (5.2 s, male) | 1 | Theo's canon line in S01E00. Taken to be Ilya's take because it came with the founder's choice; the three Theo auditions cannot be told apart from the file. |

**Still to come:** maya-s1g1 (e00, e02), maya-s1g2 (e03–e05), ray-s1g1 (e00). Until they arrive, those lines stay captions.
Every split part's length was checked against its line (10–31 characters a second; none out of step). The takes are listed per
chapter in `apps/demo/src/signal/takes-s01.ts`, generated by `media/signal/s01/build-takes.py`; 82 takes across S01E00 and E02–E11.

## Finishing Season 1 (founder, 12 Nov 2026, 12:53 CT: "Regenerate the takes and let's completely finish out the full interactive … season 1")

Regenerated, because the first three were never received: maya-s1g1 (2,627), maya-s1g2 (1,525), ray-s1g1 (1,378). Recurring cast,
one take per character, every Season 1 line in canon order (take maps `media/signal/s01/<who>-s1g1.take.json`): Dolores, Nan, 7
lines (529); Imani, Courtney, 22 (1,672); Priya, Vicki M Rodriguez, 4 (386); Theo, Ilya, 20 (1,204; his first line is the audition
take); Lily, Jessica, 22 (1,121). **10,442 credits.** With these, every spoken line of Maya, Ray and the five recurring characters
in Season 1 has a take; guest characters (Dante, Gus, Mateo, Sofia, Andre, Malik, Avery, Lena, Tasha, Elias, Pastor Jo and others)
stay captions unless the founder casts them.
