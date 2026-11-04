# ElevenLabs workflow: SIGNAL narration, investor tours, Empathia Learn

Status 2026-11-01: **set up, not connected.** The pipeline and its guard rails are in `scripts/media/elevenlabs/` and tested
(14/14). Authentication has **not** been verified, and **no credits have been spent**.

## Environment (inspected 2026-11-01)

| Need | Found |
|---|---|
| Node.js / npm / npx | Node 22.22.0, npm/npx 10.9.4 |
| ffmpeg (normalisation, loudness meter) | present, with `loudnorm` and `ebur128` |
| Outbound to `registry.npmjs.org` | **blocked** (DNS ENOTFOUND). `npx -y @elevenlabs/cli@latest onboard init` was tried once at the owner's request (13:09Z) and failed before downloading; nothing installed |
| Outbound to `api.elevenlabs.io` | **blocked** by the workspace allowlist (connection refused); not retried or worked around |
| Secret storage | no managed secret store in this container. Supported: the `ELEVENLABS_API_KEY` environment variable, or the git-ignored `.env.local` at the repo root (`.gitignore` lines 8–9; test EL-14) |

**Key hygiene.** A key pasted into a conversation should be treated as exposed: revoke it in ElevenLabs and issue a new one. Put the new one
only in `.env.local` (one line, `ELEVENLABS_API_KEY=…`) or the environment, typed on the machine itself. The scripts never print, log or
write the key. Errors are redacted (EL-04, EL-05), and the repository's secret scanners now flag the ElevenLabs key shape
(`elevenlabs-key` in `scripts/verify/scan-secrets.py` and `scripts/discovery/secret-scan.py`).

## Pipeline

| Step | Command | Network | Credits |
|---|---|---|---|
| 1. Verify the key | `node scripts/media/elevenlabs/check-auth.mjs` | GET `/v1/user/subscription` | none |
| 2. Plan (dry run) | `node scripts/media/elevenlabs/plan.mjs` | none | none |
| 3. Generate one approved job | `ELEVENLABS_GENERATION=enabled node scripts/media/elevenlabs/generate.mjs --job=<id>` | POST `/v1/text-to-speech/{voice}` | **billable** |
| 4. Export | `node scripts/media/elevenlabs/export.mjs --job=<id>` | none | none |
| 5. Promote one reviewed take | `node scripts/media/elevenlabs/promote.mjs --job=… --candidate=… --reviewed-by=… --terms-url=… --terms-checked=… --channels=learn` | none | none |

- **Allow-list.** Only GET `/v1/user/subscription`, `/v1/models` and `/v1/voices` (read-only) and POST text-to-speech (billable) can be
  called. Everything else is refused before any I/O (EL-02). The billable route is reachable only from `generate.mjs` (EL-03).
- **Billable generation is off.** `generate.mjs` refuses unless every one of these holds:
  - `ELEVENLABS_GENERATION=enabled` is set;
  - `approvals.json` holds an owner approval for that job: who approved and when, the owner's own words, a credit ceiling that covers
    the estimate, and a chosen voice;
  - the job's status is READY.

  The repository ships with **no approvals** (EL-07…EL-11). It never retries a failed request, because a retry could bill twice. Output goes
  to the git-ignored `.local/media/elevenlabs/<job>/`.
- **Export.** Each take is normalised to the labs' reference (−23 LUFS integrated, −3 dBTP ceiling), re-measured by ffmpeg's EBU R128
  meter (a software meter, not a certified one) and hashed. It becomes a candidate with `rightsStatus: PENDING`. A self-test on a synthetic
  tone measured −23.4 LUFS after normalisation.
- **Promotion** applies the rule in `ELEVENLABS_PLAN_EVIDENCE.md`. All of these must hold, or the take is refused (EL-13):
  - it was generated inside a paid period on record (2026-11-01 to 2026-12-01);
  - the model is not a Beta/preview model;
  - a named person listened to it;
  - the terms URL and the date they were checked are recorded;
  - the distribution channels are named;
  - the bytes are unchanged.

  Only then does it enter `apps/demo/src/learn/labs/audio/sources.json` as VERIFIED. The lab re-checks the sha256 when it loads the file.

## Jobs

| Job | Status | Size | Estimate |
|---|---|---|---|
| `learn-intelligibility`: 8 original sentences for the Audio Lab's intelligibility challenge, 2 takes each | READY (needs an approval and a voice) | 1,212 characters | ~1,212 credits on `eleven_multilingual_v2` (estimate; ElevenLabs bills at its current rate) |
| `investor-tour-narration` | DRAFT: the tours and their scripts are still being built; the scripts need the owner's approval | — | — |
| `signal-narration` | BLOCKED: SIGNAL rights and review are unresolved (ARCHITECTURE_DECISIONS §7.3) | — | — |

## To connect (owner)

1. Revoke the exposed key and create a new one, ideally restricted to text-to-speech, voices and user-read.
2. Have this workspace's network policy allow `api.elevenlabs.io` (and `registry.npmjs.org` if the CLI is wanted). Alternatively, run the
   ElevenLabs CLI onboarding on your own machine.
3. Put the new key in `.env.local`, then run `check-auth.mjs`. This is the non-generative check.
4. Approve one test in the conversation: the job, the voice and a credit ceiling. Approving a test means writing it into `approvals.json`,
   then generating, exporting and listening. Only after review is a take promoted.
