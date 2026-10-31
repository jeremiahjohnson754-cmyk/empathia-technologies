# Website films: placement, renditions and rights (2026-10-31)

On 2026-10-31 at 15:53 CT the owner supplied five films and asked for them on the corporate website "in strategic places". All five
are already catalogued in `media/manifests/MEDIA_MANIFEST.json`; the SHA-256 of each upload matches its catalogued master. This
document records:
- where each film goes and why;
- what was produced;
- what still stands between each film and the public site.

## 1. Placement

| Key | Film | Runtime | Where | Why there |
|---|---|---|---|---|
| M2 | From business need to room intelligence | 2:00 | **Home, hero** | The most cinematic of the five. A city becomes a room, and the room's record follows it through request, design, commission, operate, support and learn. It states the thesis in two minutes. |
| FA | The platform vision | 2:00 | **/platform** | Screen recordings of every product in the demonstration. It answers "what is it, really?" right where a buyer asks. |
| F02P | The living system: a divisible hall, designed to proven | 3:00 | **/products/commissioning**, **/how-it-works**, /films | The deepest commissioning proof: states, loads, tests on a simulated processor, then acceptance. It belongs beside the claim it proves. |
| IE | Field Intelligence: a technician's day | 5:00 | **/products/field-intelligence**, /films | Declared vs observed vs verified, told through one illustrative shift. |
| F01 | The living system: one environment, one engineering language | 4:40 | **/films** | The longest product walk (V1.4.1). It suits viewers who chose to watch, not the first visit. |

The `/films` page and its navigation entry exist only when at least one film is built in.

## 2. What was produced, and how each film plays

Renditions come from the **clean (caption-free) masters**. Captions therefore ship as a real WebVTT text track, which can be switched
on or off, searched and read by assistive technology, instead of burned-in pixels.
- **Script:** `scripts/media/prepare-web-films.mjs`.
- **Settings:** H.264 High, CRF 24, maxrate 2.2 Mb/s, 720p, AAC 96 kb/s stereo, faststart.
- **Per film:** a poster in WebP and JPEG, and a `RENDITION.json` holding the hashes.

| Key | 720p size | Captions | Transcript |
|---|---|---|---|
| M2 | 15.0 MB | WebVTT (from `master.srt`) | rendered under the player, from the same cues |
| FA | 10.3 MB | WebVTT | yes |
| F02P | 11.8 MB | WebVTT | yes |
| IE | 13.0 MB | WebVTT | yes |
| F01 | 24.6 MB | WebVTT | yes |

Player behaviour (`apps/website/src/ui.tsx` → `FilmPlayer`):
- no autoplay;
- `preload="none"`, so nothing downloads until the viewer presses play;
- native controls for play, pause, seek, volume, fullscreen and captions;
- captions on by default;
- one film plays at a time;
- a disclosure line under each film, for example "Illustrative 3D scenes; figures on screen are demonstration data";
- the transcript in a disclosure below the player.

The site audit (rule A10) fails any film without a captions track and any video that autoplays with sound.

**Preview build** (owner review only): `node apps/website/build.mjs --films=preview` builds every film whose renditions exist. Every page
then carries a "Preview build — not for publication" banner and `noindex`, and robots.txt disallows everything. The dist-hygiene gate
refuses any unverified film in a build that is not a preview. Screenshots of the preview are in the handoff.

## 3. Why none is on the public site yet

The owner's rule, kept unchanged: *only VERIFIED assets authorized for the intended distribution channel may enter externally
distributed builds.* The owner's request now covers **channel authorization** for the website, and it is recorded in
`apps/website/films.json`. **Licence evidence** is still missing:

| Key | Narration | Picture | What would make it VERIFIED |
|---|---|---|---|
| M2 | vidIQ "Brian" (an ElevenLabs premade voice through vidIQ), recorded 2026-10-05 | 3D renders made in this programme | Proof of a vidIQ paid plan or invoice covering 2026-10-05, plus vidIQ's written confirmation that its grant covers commercial use of ElevenLabs-voiced output. **Or** re-voice the film (below). |
| F02P | vidIQ "Brian", 2026-10-10/11 | product screens, simulated processor | the same as M2 |
| FA | Kokoro v1.0 local TTS (the model is Apache-2.0; output rights are not documented) | demonstration screen recordings | Owner acceptance of Kokoro output for promotional use, filed with the model card, licence and voice hashes. **Or** re-voice the film. |
| F01 | Kokoro local TTS | V1.4.1 screen recordings | the same as FA |
| IE | not ledgered | includes **AI-generated photographic images of fictional people** | The generator, its terms and the plan at creation; the narration source. |

The full evidence chain is in `Empathia_V25/legal/media-rights/evidence/NARRATION_AND_FOOTAGE_EVIDENCE.md` (2026-10-23).

**Fastest clean path, which needs your approval and spends money:**
1. Re-voice M2 and F02P directly on your own paid ElevenLabs plan (Creator or above). The terms state that output generated during a
   paid subscription may be used commercially.
2. Keep the generation history export and the invoice.
3. Swap only the audio stream (`ffmpeg -c:v copy`, no picture re-encode) and regenerate the captions from the new takes.

Alternatively, a human voice actor under a written buyout removes the question entirely.

**To publish a film once its rights are cleared**:
1. Set `rights.website.status` to `VERIFIED` in `apps/website/films.json`, with the evidence reference.
2. Add `!apps/website/media/<KEY>/` to `.gitignore` and commit the four rendition files.
3. Push.

The normal build then includes the film; no code change is needed.

## 4. Hosting and cost

Served from the Render static site, each complete play transfers roughly 10–25 MB. Render bills bandwidth beyond the workspace's
included transfer; check the current allowance under Billing. Two hundred full plays of M2 come to about 3 GB.

Options:
1. Keep the films on the static site with `preload="none"`, as built, and watch usage.
2. Host them on a video platform and embed. This adds a third-party request; the CSP and the privacy notice ("loads nothing from third
   parties") would have to change, and the platform's tracking applies.
3. Use object storage with a CDN. That is new infrastructure and needs approval.

Recommendation: option 1, for the hero film only at first.

Committing about 75 MB of renditions to Git is within GitHub's per-file limits. It makes every clone heavier, so commit only the films
you clear.
