# Engineering readiness brief: restoration sprint 0–1 (2026-10-31)

- **Branch:** `restoration/sprint-0-1`, based on `main` at `ea84222`. That is the commit the live sites were built from, as confirmed by
  reading the live website.
- **Status:** nothing is deployed, merged or provisioned. No credits were spent and no paid service was started.
- **Labels:** `IMPLEMENTED` means the code exists. `TESTED` means automated tests ran and passed. `SIMULATED` means it runs on
  synthetic or simulated data. `PLANNED` means it is not built. `NOT RUN` means no test was executed.

## 1. Finished on this branch

| Area | What changed | State | Evidence |
|---|---|---|---|
| Website, the whole experience | Rebuilt on Experience System v1. New home narrative: thesis, record card, evidence line, three doors, six evidence states, nine products, audiences, founder, closing call to action. New IA: `/products` plus nine product pages (each states its demo status from the parity ledger), `/founder`, `/films` (appears only when a film is built in). Sticky navigation, phone menu (Escape and click-outside close it), footer. | IMPLEMENTED · TESTED | `tests/browser/website.test.mjs`; site audit 0 P0 / 0 P1; desktop and phone screenshots in the handoff |
| Typography (owner direction 16:34 CT) | Warm, inviting type: self-hosted Poppins (OFL; 400/500/700, about 10 KB each), warm white and grey text, pill controls, rounder cards. No third-party font request. Contrast is still at or above 4.5:1 everywhere (audit A5). | IMPLEMENTED · TESTED | site audit 0 P0/P1; website test 54/54 |
| Founder | Portrait (owner-supplied; 4:5 crop; metadata stripped; 480/800/1200 px in WebP and JPEG). Name, "Founder, Empathia Technologies", exactly CTS (AVIXA) · CAPM (PMI) · CompTIA Network+, and the supplied statement. "[Founder name]" placeholder removed. | IMPLEMENTED · TESTED | `/founder`, home founder section |
| Films | Five placements chosen (home, platform, commissioning, Field Intelligence, films). Web renditions from the clean masters, with WebVTT captions, transcripts and posters. The player has no autoplay and `preload=none`. A **rights gate** admits a film to the public build only when it is VERIFIED; `--films=preview` gives an owner-review build. The dist-hygiene gate refuses an unverified film in a publishable build. | IMPLEMENTED · TESTED (preview) · **none published**: rights UNVERIFIED | `docs/media/WEBSITE_FILM_PLACEMENT.md` |
| Lead capture | Required minimum fill time (3 s) against instant bot posts. A receipt with reference and time; focus moves to the status. Consent target raised to 24 px. A spoofable client-address branch removed from the route. The backend was already complete (consent, honeypot, per-address budget, admin inbox, audit). | IMPLEMENTED · TESTED (integration + browser e2e over a real API and database) | `tests/integration/leads.test.mjs`, `tests/e2e/website-lead.e2e.mjs` |
| Demo, phones | Ledger, Field Intelligence, Search Party and policy no longer scroll sideways at 320/390 px. | IMPLEMENTED · TESTED | audit A1 = 0 |
| Audit tooling | `scripts/audit/site-audit.mjs`: A1–A10 at four widths, in a strict CI suite. `scripts/audit/v253-media-census.py`. | IMPLEMENTED · TESTED | `tests/evidence/SITE_AUDIT*.json`, `docs/parity/V253_MEDIA_CENSUS.json` |
| Release controls | CI fails when a suite FAILs or is NOT_RUN without a stated reason (`scripts/verify/no-unexpected-skips.mjs`). The Blueprint validator now runs in CI (PyYAML installed). The film rights gate is in dist hygiene. | IMPLEMENTED · CI NOT RUN (runs on push) | `.github/workflows/ci.yml` |
| Design system | Specification, tokens JSON and code mapping, plus the Figma file [Empathia — Experience System v1](https://www.figma.com/design/n6IyoAdwNpD5DnWbKeptIa): 44 variables, 10 text styles, 9 component sets plus 4 supporting components, Home and Founder frames for desktop and mobile, accessibility notes. | IMPLEMENTED · **Figma differs from code** in font (Inter) and portrait (placeholder); the Home composition is a first pass | `docs/design-system/EXPERIENCE_SYSTEM.md` |
| Competitive benchmark | Nine sites, source-linked. Four pages could not be retrieved; this is stated in the document. Differentiation is written as hypotheses to prove. | DONE | `docs/strategy/COMPETITOR_EXPERIENCE_BENCHMARK.md` |
| QA documents | Prioritized defect register (D-01…D-18), acceptance guide, media restoration status. | DONE | `docs/qa/`, `docs/parity/` |

## 2. What remains, in order of risk

| # | Item | Blocked by | Next action |
|---|---|---|---|
| 1 | The live forms cannot send (D-01) | The Phase 2 API is not deployed (approvals A1–A3) | Approve Phase 2, then set `WEBSITE_API_URL` and add the API origin to the website CSP `connect-src` |
| 2 | No film on the public site (D-02) | Narration and image licence evidence | Supply the vidIQ plan/invoice and its written position, accept Kokoro output, **or** approve a re-voice on your own paid ElevenLabs plan |
| 3 | Enterprise web OIDC sign-in (D-08, B-2) | IdP choice (Microsoft Entra ID is the candidate) | Next engineering sprint: Authorization Code + PKCE, tested against a local authorization server, then against the chosen IdP |
| 4 | Demo restoration gaps (D-06): Scouter missing; Pro command centre, Assurance history/recommission and Learn partial | Engineering time | Restore Scouter and baseline history next; they sit in the golden path |
| 5 | SIGNAL and narration (D-07): 3 of 133 chapters playable; no cleared audio | Item 2, plus production | Voice the 172 campus lines and 3 episodes after rights; report the remaining count truthfully |
| 6 | Demo target sizes (D-13, D-17) | Engineering time | A pass over `@empathia/ui` controls |
| 7 | Real-device, screen-reader and performance (LCP/INP/CLS) testing | Devices; the live URL cannot be reached from this workspace | Run the acceptance guide on your phone, plus three role participants |
| 8 | Motion graphics across both sites (owner request 16:38 CT): a motion map, then website hero, evidence line, scroll reveals and interactions; demo state transitions, graph, tour and Build a Room; then motion QA (INP/CLS, reduced motion, phones) | Queued as tasks | Next sprint, after this branch is reviewed |
| 9 | Render releases only after CI passes | **Your approval** (a deployment-policy change) | One line per site in `render.yaml`: `autoDeployTrigger: checksPass` |

## 3. Test evidence

- **Full regression:** `node scripts/test.mjs --browser --studio`. The result is recorded in `tests/evidence/TEST_RESULTS.md` and in
  the commit message.
- **Full build:** PASS, including type checks, the OpenAPI contract (regenerated for `elapsedMs`) and dist hygiene.

## 4. Connectors

| Tool | Status | Use |
|---|---|---|
| Figma (Professional) | available, authorized, **used** | the Experience System file. The portrait upload was blocked by this workspace's network policy. |
| GitHub | **not available here** (no linked account) | handoff by bundle |
| Render | not used | no deploy without approval |
| ElevenLabs, HeyGen, Adobe | available | **skipped**: chargeable; rights and approval first |
| Firecrawl / web | used (web fetch only) | live-site parity, competitor pages |

## 5. Next safe deployment action

1. Push this branch from Termux (`docs/operations/TERMUX_HANDOFF.md`). This changes nothing that is live.
2. Read the GitHub Actions result on the branch.
3. Open a pull request into `main`.
4. When you merge, Render rebuilds both static sites from `main`. This publishes the new website with no films and the demo phone
   fixes; the forms still say "not configured".

Rollback: Render → Deploys → previous deploy → Rollback, or `git revert -m 1 <merge>` followed by a push.
