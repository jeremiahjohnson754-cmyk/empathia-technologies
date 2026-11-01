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

## Checkpoint defects: recommissioning, installations, outbox, enquiries (2026-10-31, evening)

Each was found by a test written before the fix. The "before" result is recorded in the commit that fixed it.

| ID | Sev | Component | Defect | Found by | Correction | State |
|---|---|---|---|---|---|---|
| D-19 | P0 | Outbox worker | Handlers ran with no tenant context, and the worker role could write notification and read-model rows into another tenant. | `outbox.test.mjs` (tenant isolation) | The worker sets each event's tenant before any handler runs; its cross-tenant permissions on those tables are removed (migration 0027). | **Fixed** |
| D-20 | P1 | Outbox worker | A room's later events could overtake earlier ones that were pending or retrying (21 out-of-order deliveries with 3 workers). | `outbox.test.mjs` (ordering) | Per-room ordering; a later event is held behind an earlier undelivered one. | **Fixed** |
| D-21 | P1 | Outbox / producers | Ordering used the producer's `aggregate_rev`, which several producers hard-code. A test failure (rev 1) overtook room events at revs 2–6; after a reopen, a work-order reassignment (rev 2) overtook revs 4–6. | `outbox.test.mjs` (real producers) | The database assigns `aggregate_seq` in commit order (a head row taken at commit, in sorted order, so no deadlock); delivery follows it. | **Fixed** |
| D-22 | P1 | Outbox worker | Malformed events (unknown type, invalid payload, a room of another tenant) reached handlers and were delivered. | `outbox.test.mjs` (contract) | The event-contract check runs before any handler; failures dead-letter at once as NON_RETRYABLE, and a replay re-checks them (422). | **Fixed** |
| D-23 | P1 | Outbox grants | The app role could rewrite an event's payload, type, aggregate, tenant and correlation id. | Constraint-proof test | Column grants: the app role can update delivery-state columns only. | **Fixed** |
| D-24 | P2 | Outbox replay | A dead-letter replay needed no reason, a second replay returned 404 instead of 409, the audit record had no detail, and nothing linked an event to its replays. | `outbox.test.mjs` (replay) | Reason required; 409 on a non-dead-letter; audit with who, why, prior attempts, last error and outcome; `replay_count` / `last_replay_audit_id`; failure kinds TRANSIENT / PERMANENT / NON_RETRYABLE. | **Fixed** |
| D-25 | P2 | Outbox, effects outside the database | No stage outside the transaction existed: an external call would have run inside it, and after a crash it ran twice. | `outbox.test.mjs` (SIGKILL) | Sinks run after commit under a lease, with the idempotency key `outbox:<event>:<sink>` and per-handler receipts. Proven against a local stub only. | **Fixed (stub)**; live Teams/Outlook **NOT RUN** (no connector) |
| D-26 | P1 | Commissioning engine | The general acceptance count included PASS_VERIFIED results that a substitution had superseded. A separate blocker still refused acceptance, so nothing was accepted wrongly. | Owner requirement 2 review | `lifecycle.ts` excludes superseded results in both callers. | **Fixed** |
| D-27 | P1 | Data model | Position and physical unit were one record. A replacement overwrote the position's model, a unit could not be followed across positions, and nothing prevented double installation. | Owner requirement 4 | ADR-0012: position, physical asset, effective-dated installations; exclusion constraints; append-only; atomic replacement. | **Fixed** |
| D-28 | P2 | Assurance | Compared device ids only: a model substitution or a different unit was invisible. | Checkpoint e2e | Model drift and installation change are detected and labelled differently. | **Fixed** |
| D-29 | P2 | Demo | "FUNDED" with no funding record; an empty project history; Atlas 4.218 shown with baseline v1 by the KPI records and none by APEX. | Demo review | Status only from records; history from the lifecycle events; APEX reads the KPI baseline record. | **Fixed** |
| D-30 | P2 | Demo | A swap during recommissioning kept the removed device's PASS_VERIFIED results, and nothing blocked re-acceptance. | Demo review | The shared reopened-tests rule (the same as the API's). | **Fixed** |
| D-31 | P3 | Website | The unconfigured lead form's notice sent visitors to contact details that are not published. | Review | Enquiries open the hosted form; the notice is reworded for builds that have neither. | **Fixed** |
| D-32 | P2 | Website (live, `main`) | The live privacy notice says forms send messages to "Empathia's own service". That is untrue for the Tally form. | Tally integration | Corrected on the branch (`/privacy#enquiries`); it stays live until the branch is deployed. | **Open: deployment** |
| D-33 | P3 | Tally form (owner's account) | In the consent checkbox, "View Privacy Policy" is plain text, not a link. | Read-only form check | Owner to link it to `/privacy#enquiries` once the branch is deployed. | **Open: owner** |
| D-34 | P3 | Outbox | There is no audited skip for an event that can never succeed: it holds its room's later events until it is fixed and replayed. | Design review | Decision needed: an audited skip, or keep replay-only. | **Open: decision** |
| D-35 | P3 | API | The Idempotency-Key check is not atomic with the handler: two concurrent requests with one key can both run (the precondition or the state check refuses the second's effect). | Negative-path review | Reserve the key in the handler's transaction. | **Open** |
| D-36 | P3 | Evidence | The checkpoint e2e evidence lists some items in a different order from run to run (normalised comparisons are unaffected). | Repeated runs | Sort the evidence output. | **Open** |
| D-37 | P3 | Tests | Two existing outbox ordering probes compare `aggregate_rev`. They pass, but now prove less than a comparison of `aggregate_seq` would. | Outbox review | Point them at `aggregate_seq`. | **Open** |

## What was not tested

- **Browsers:** real iOS Safari, Android Chrome, Firefox and Edge were not available. Chromium only.
- **Screen readers:** NVDA, VoiceOver and TalkBack were not run.
- **Performance:** LCP, INP and CLS were not measured, as field or lab data. The page-weight budgets passed: home 15.5 KiB HTML,
  site.js 2.3 KiB, site.css 25 KiB, no web fonts.
- **Users:** no tests were run with real people.
