# Audio production plan (ElevenLabs connector): SIGNAL, investor tours, Empathia Learn

Status 2026-11-01: **proposal; nothing has been generated and no credits have been spent.** The connector is enabled in this conversation.
The price figures below come from its `estimate_only` calls, which return a price and do not generate anything or charge anything. Each
call left an empty flow on the owner's ElevenLabs canvas: `qeBCSQj7…` for the speech estimate and `SMVgmeEL…` for the sound-effect estimate.

## What the connector offers here (read 2026-11-01)

| Capability | Models | Notes |
|---|---|---|
| Text to speech | `eleven_multilingual_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2_5`, `eleven_v3`, `eleven_v4` (connector default) | v3 and v4 take inline audio tags; the others take `<break>`. The connector does not state whether v3 or v4 is a Beta model. |
| Sound effects | `eleven_text_to_sound_v2` | 0.5 to 30 s, optional seamless loop, prompt influence 0 to 1 |
| Also | voice design, voice changer, voice isolator, audio effects (room, phone, distance), dubbing, speech to text | not needed for this plan |
| Not available | music, image, video | that needs the full ElevenLabs connector |

**Prices** (connector estimates, 2026-11-01):
- speech on `eleven_multilingual_v2`: 162 characters → 162 credits (about 1 credit per character, US$0.0324 for that line);
- one sound-effect variation: 50 credits at the default duration (US$0.01).

The plan's balance is 39,980 credits (Starter, Nov 1 to Dec 1, 2026), as recorded on the invoice.

## Voice assignments (proposed)

Only **ElevenLabs premade voices**: their use falls under the plan's own licence. Voice Library voices belong to third-party creators;
their terms were not checked, so none are proposed.

| Use | Voice | Why |
|---|---|---|
| Investor tours A, B and C | **Bella** (`hpp4J3VqNfWAUOO0d1Us`): professional, bright, warm; American | Polished narration; very intelligible over laptop speakers |
| Learn: intelligibility passages and lab instructions | **Alice** (`Xb7hH8MSUJpSbSDYk0k2`): clear, engaging educator; British | A different timbre from the tours, so a learner hears two distinct talkers; built for e-learning |
| SIGNAL narrator (blocked, see below) | **Daniel** (`onwK4e9ZLuTAKqWW03F9`): steady broadcaster; British | Story voice, distinct from the product tour |
| Alternate | **Matilda** (`XrExE9yKIg1WjnnlVkGX`): knowledgeable, professional; American | A second Learn talker for comparison exercises |

## Asset manifest

| Job | Assets | Model | Size | Estimate | State |
|---|---|---|---|---|---|
| `tour-sample` (pilot) | 1 line, 1 take | multilingual v2 · Bella | 162 chars | **162 credits** | awaiting approval |
| `learn-intelligibility` | 8 original sentences × 2 takes | multilingual v2 · Alice | 1,212 chars | ~1,212 credits | awaiting approval |
| `av-training-sfx` | 10 original effects × 2 variations | sound effects v2 | 10 prompts | ~1,000 credits (re-estimated per duration) | awaiting approval |
| `investor-tour-narration` | ~18 stops across tours A, B and C × 2 takes | multilingual v2 · Bella | ~4,500 chars (estimate) | ~9,000 credits | DRAFT: the scripts still need to be written and approved |
| `signal-narration` | — | — | — | — | BLOCKED: SIGNAL rights review |

The ready jobs (pilot, Learn and effects) total **~2,374 credits**, about 6% of the balance. Adding the tours brings the total to
~11,400 credits.

The **sound effects** are realistic rooms and faults, with a loop flag and duration per prompt:
- room tone;
- meeting pre-roll;
- town-hall audience;
- equipment fans;
- office typing;
- feedback build-up;
- cable crackle;
- rack power-up;
- door close;
- rain on glass.

The lab's precise test signals (tones, pink noise, sweeps, synthetic echo) **stay procedural**: their frequencies and levels are exact, and
the labs' scoring depends on that. The prompts are in `scripts/media/elevenlabs/jobs/av-training-sfx.json`.

## Commercial-use requirements (all enforced by `promote.mjs` or recorded in the manifest)

1. **Generated during a paid period on record.** The plan is ElevenLabs Starter, invoice MXU3VLVV-0001, Nov 1 to Dec 1, 2026
   (`ELEVENLABS_PLAN_EVIDENCE.md`). ElevenLabs' help centre says paid plans include a commercial licence, except for Beta services.
2. **Non-Beta models only, by allow-list:**
   - admitted: `eleven_multilingual_v2`, `eleven_turbo_v2_5`, `eleven_flash_v2_5` and `eleven_text_to_sound_v2`;
   - refused until their status is confirmed: `eleven_v3` and `eleven_v4`, including the connector's default (`promote.mjs`, test EL-13).
3. **Premade voices only.** No cloning of any real person. A voice of the founder would need his explicit consent and a separate decision.
4. **Original text only.** Scripts may contain no real customer or brand names. Device makers may be named only where the catalogue
   already shows them, with "no partnership implied".
5. **Disclosure.** The labs label every generated take "AI-generated voice (synthetic, not a real person)". Tours do the same.
6. **Review before use.** A named person listens to each take. Its sha256, measured loudness, terms URL and check date, and distribution
   channels are recorded; only then does it become VERIFIED.
7. **SIGNAL** stays unvoiced until its rights review clears the intended channel.

## The pilot, after approval

1. Generate `tour-sample` (one take, Bella, multilingual v2, 162 credits). Poll until it completes.
2. **Export into the repository: not yet proven.** This workspace cannot download from ElevenLabs or its storage hosts (the gateway refuses
   them: test 2026-11-01). The connector's run status will show how the audio is delivered:
   - If the bytes cannot reach the workspace, the owner downloads the take from the flow link and attaches it to this conversation.
   - The attachment is then hashed, normalised to −23 LUFS with a −3 dBTP ceiling, and re-measured (`export.mjs`).
3. **Verify:** decode and playback in the demo's own lab loader (a browser test: sha256 match, decode, duration, no clipping), and level
   consistency against the lab reference (integrated loudness within ±1 LU, true peak ≤ −3 dBTP).
4. Promote only after the owner has listened (`promote.mjs`, channel `tours`).
