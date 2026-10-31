# Defect register — public website and investor demo (2026-10-31)

Branch `restoration/sprint-0-1`, based on `main` at `ea84222` (the commit the live sites were built from).

**Live parity.** The live website was read on 2026-10-31. Its title, h1, navigation and footer match the `ea84222` build exactly. The
live demo is client-rendered: its HTML carries only the shell. This workspace cannot open the live URLs from a browser (its network
allow-list refuses `*.onrender.com`). The functional, accessibility and responsive audit therefore ran on the identical build of the
deployed commit, served with exactly the headers in `render.yaml`.

**Method.** `scripts/audit/site-audit.mjs`, which uses in-house Playwright rules A1–A10. It is not axe-core; axe could not be installed
here.
- **Coverage:** 13 website pages (23 after this change) and 15 demo addresses, each at 320, 390, 768 and 1440 px.
- **What it checks:**
  - horizontal scroll;
  - runtime errors and failed requests;
  - headings, names, labels and alt text;
  - text contrast against the nearest opaque background;
  - target size (WCAG 2.5.8 at 24 px, and the project's own 44 px target on phones);
  - document landmarks;
  - visible keyboard focus over the first 12 Tab stops;
  - internal links;
  - video captions and autoplay.
- **Evidence:** `tests/evidence/SITE_AUDIT_BASELINE.json` (before) and `tests/evidence/SITE_AUDIT.json` (after).
- **Reproducibility:** every audit finding is deterministic on the local build.

Severity:
- **P0** — a core path is broken.
- **P1** — blocks a group of users, or an advertised journey.
- **P2** — degraded.
- **P3** — polish.

## Audit totals

| | P0 | P1 | P2 | P3 | Page×width checks passing (no P0/P1) |
|---|---|---|---|---|---|
| Baseline (`ea84222`) | 0 | 99 | 0 | 324 | 32 of 108 |
| After this branch | 0 | **0** | 86 | 525 | **152 of 152** |

Read the totals with care:
- 74 of the baseline's P1 findings were demo targets smaller than 24 px. The rule was then corrected to P2, because WCAG 2.5.8 has a
  spacing exception the script cannot evaluate. **Those demo targets were reclassified, not fixed.**
- P3 rose because the site has more pages and more controls.

## Register, highest risk first

| ID | Sev | Component | Defect | Repro | Correction | State |
|---|---|---|---|---|---|---|
| D-01 | P1 | Website → lead capture | The live forms cannot send. No lead endpoint is deployed, and the site says so honestly. | Always | The backend exists and is tested: `POST /v1/public/leads` with consent, honeypot, per-address budget, admin inbox and audit. It needs the Phase 2 API (approvals A1–A3) and `WEBSITE_API_URL`. The website CSP's `connect-src` must also name the API origin. | **Open: external** |
| D-02 | P1 | Website → films | None of the five owner-supplied films is on the site. Website rights are UNVERIFIED for every film. **Owner authorization for the channel is now recorded.** The licence evidence is not: the vidIQ "Brian" narration (M2, F02P), Kokoro output rights (FA, F01), and the AI-generated images and unledgered narration (IE). | Always | Placements, renditions, captions, transcripts and a preview build are done. A film appears once its `films.json` website status is VERIFIED (see `docs/media/WEBSITE_FILM_PLACEMENT.md`). | **Open: owner/counsel** |
| D-03 | P1 | Website → founder | The live site shows the placeholder "[Founder name]" and has no founder page. | Always | Added `/founder`: the portrait (cropped 4:5, metadata stripped), the name, exactly CTS · CAPM · CompTIA Network+, and the supplied statement. Added a home-page founder section and an About link. | **Fixed** |
| D-04 | P1 | Demo → ledger, Field Intelligence, Search Party, policy | The page scrolls sideways on phones, by 51–296 px at 320/390. | Always | Wide tables and cards now scroll inside themselves (`apps/demo/src/styles/demo.css`). | **Fixed** (audit A1 0) |
| D-05 | P1 | Website → pilot form | The page scrolls sideways at 320 px: a long select option set the form's width. | Always | Form grid uses `minmax(0, 1fr)`; select width is 100%. | **Fixed** |
| D-06 | P1 | Demo → scenario coverage | Scouter is not in the demo. Pro command centre, Assurance history/recommission and SIGNAL are partial (parity ledger). | Always | The website product pages now state each product's demo status, read from the parity ledger, instead of implying parity. Restoration itself is open work. | **Open: engineering** |
| D-07 | P1 | Learn/SIGNAL media | The V2.5.3 source has 3 playable episodes (S1E1, S1E2, S1E6), 172 narration durations, 7 cinematic definitions and no embedded media (`docs/parity/V253_MEDIA_CENSUS.json`). The 12-season / 133-chapter corpus is not playable media. | Always | Recorded in `docs/parity/MEDIA_RESTORATION_STATUS.md`. Narration production needs authorized, licensed voice work. | **Open: assets/credits** |
| D-08 | P1 | Enterprise web (Phase 2) | No OIDC browser sign-in (B-2). | Always | Authorization Code + PKCE against the chosen IdP. | **Open: needs A3/A5** |
| D-09 | P2 | Website CSS | The class `.lead` was used for both the hero paragraph and the lead form, so the form's grid and width rules applied to every lead paragraph. | Always | Form renamed `.leadform`; stylesheet rewritten. | **Fixed** |
| D-10 | P2 | Website → forms | The consent checkbox was 18×18 px, below WCAG 2.5.8. | Always | 24×24 px with a 28 px column. | **Fixed** |
| D-11 | P2 | Lead API | No minimum fill time: a script could post the form instantly. | Always | `elapsedMs` is required and must be ≥ 3 s (`LEAD_MIN_FILL_MS`). Tested: too fast or untimed submissions are refused; the e2e waits like a person. | **Fixed** |
| D-12 | P2 | Website → forms | A successful submission showed no reference. | Always | It shows `reference XXXXXXXX` and the time, and focus moves to the status. | **Fixed** |
| D-13 | P2 | Demo (all pages) | 83 targets under 24 px: the brand link, "Back to the start", summaries and inline links. The spacing exception may apply. | Always | Raise to ≥ 24 px, or confirm the spacing exception per element. | **Open** |
| D-14 | P2 | Website → policy links | The "privacy notice" link inside the consent label is 19 px tall. | Always | Covered by the inline-text exception in practice; the script cannot tell. | **Open (review)** |
| D-15 | P2 | Hosting | Films on Render's static site would bill bandwidth per play (10–25 MB per 720p play) beyond the workspace's included transfer. | — | Owner decision (`WEBSITE_FILM_PLACEMENT.md` §4). | **Open: decision** |
| D-16 | P3 | Lead API | The route held a dead branch that would have read the leftmost (client-spoofable) `X-Forwarded-For` if `TRUSTED_PROXY` had ever been set to an address. | — | Now uses only the server-computed client address. | **Fixed** |
| D-17 | P3 | Both sites | About 520 controls on phones are below the project's own 44 px target (mostly the demo; the 24 px WCAG minimum is met). | Always | Systematic pass on the demo's `@empathia/ui` controls. | **Open** |
| D-18 | P3 | Demo | One skipped heading level. | Always | — | **Open** |

## What was not tested

- **Browsers:** real iOS Safari, Android Chrome, Firefox and Edge were not available. Chromium only.
- **Screen readers:** NVDA, VoiceOver and TalkBack were not run.
- **Performance:** LCP, INP and CLS were not measured, as field or lab data. The page-weight budgets passed: home 15.5 KiB HTML,
  site.js 2.3 KiB, site.css 25 KiB, no web fonts.
- **Users:** no tests were run with real people.
