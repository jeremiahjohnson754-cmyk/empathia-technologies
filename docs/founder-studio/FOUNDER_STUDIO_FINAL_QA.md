# Founder Studio final QA

Directive 18 Nov 2026 21:34, §15 and §16: "Functional testing, accessibility, mobile, security and regression results." Status on
19 Nov 2026, for release candidate a19216e (staged 14:24 UTC). **Cycle One has passed. Cycle Two has not been run as the eight
walkthroughs the directive names.** The release gate "Both QA cycles pass" is therefore not yet met, and this document does not claim it.

## Cycle One: restoration validation

| Check | Evidence | Result |
|---|---|---|
| The correct Founder Edition is established | `VERSION_RECONCILIATION.md` (B's code is the November 2.5.4 inventory, module for module; 2.5.5 and 2.5.3 kept separately) | done; the founder's decision on naming is still open |
| Nothing of the original studio is missing | `FEATURE_PARITY.md` (28 routes; 24 of 30 files unchanged; the 6 changed ones listed with why) | no missing feature found |
| Media references are verified | `FOUNDER_STUDIO_MEDIA_AUDIT.md` (36 films matched by SHA-256: 5 here and on the website, 31 missing, none labelled playable that is not here) | verified; 31 masters missing (founder to supply) |
| Documents open from the studio | studio suite S-02 (all 28 destinations render), S-12 (search opens a document by keyboard) | PASS |
| Version provenance | S-03, S-04 (the Founder Edition opens on its route with its SIMULATED label); S-11 (the flagship film's 3840 × 2160 and its rights status, not VERIFIED) | PASS |
| Cross-product navigation | S-03, S-05 (persona switching keeps each page's own authorization); the website's founder page links (website suite W-founder-page) | PASS |
| Functional: the studio's engines and state | S-06 (sealed read-only data inspector), S-07, S-08 (Engine Lab deficiency and PASS_UNVERIFIED → PASS_VERIFIED only by a different person), S-13, S-14 (snapshots) | PASS |
| Media playback | S-09 (byte ranges; a browser without H.264 says so), S-10 (a VP9 excerpt of Film A plays end to end) | PASS; H.264 playback in the test browser NOT RUN (it has no H.264) |

Founder Studio browser suite in the a19216e regression: **19/19**. Private-assets unit suite: PASS.

## Accessibility, mobile, security, regression

| Area | Evidence | Result |
|---|---|---|
| Keyboard | S-18 (the first Tab reaches "Skip to content"), S-12 (search by keyboard) | PASS |
| Light and dark | S-15 | PASS |
| Tablet (820 px) | S-17 (no sideways scroll; the rail becomes a drawer) | PASS |
| Phone (375–390 px) | — | **NOT RUN**: the studio is a desktop tool on the founder's computer; no phone check exists yet |
| Screen reader, contrast audit of the studio | — | **NOT RUN** for the studio (the public founder page is covered by the website's accessibility audit) |
| Security and privacy | `FOUNDER_STUDIO_SECURITY_AND_PRIVACY.md`; S-16 (no request leaves the computer); the public exposure audit (`scripts/audit/public-exposure.mjs`, 9/9 with the live probes on both staging sites) | PASS |
| Regression of the whole repository | a19216e: PASS 277 · FAIL 4 · NOT_RUN 2; each failure rerun alone (3 pass; CL-13, a frame-rate floor in Campus Life, fails again and is open as D18-25); `docs/releases/STAGING_2026-11-19.md` | recorded as it ran |

## Cycle Two: adversarial walkthroughs (not yet run)

| As | Status |
|---|---|
| Founder | not run; the founder's own walkthrough is the natural first one |
| Investor | not run as a studio walkthrough (the public site and demonstration were walked on 19 Nov: no sideways scroll, no console error on the main routes at 375 and 1440 px) |
| Enterprise customer | not run |
| Systems engineer | not run |
| AV integrator | not run |
| MSP executive | not run |
| Accessibility reviewer | partly covered by S-15, S-17, S-18; a full review is not run |
| Security reviewer | covered by the security and privacy review and the exposure audit; a separate adversarial session is not run |

## Release gates (§17)

| Gate | Status |
|---|---|
| The correct Founder Edition version is established | met (naming decision open) |
| The private Founder Studio is preserved | met |
| The public Founder Page is appropriately modernized | met (`PUBLIC_PAGE_CONTENT_AUDIT.md`) |
| The current product ecosystem is accurately represented | met for the public site; the studio's generated documents follow the repository at each build |
| The latest approved pricing information is consistent | met: price book 3 with complete-bundle discounts on the site and in the documents the studio embeds |
| All validated interactive workflows remain operational | met by the regression and the live checks |
| No confidential origins or contractor evidence has leaked | met (byte-level comparison and the exposure audit) |
| Media references are verified | met; 31 masters missing |
| Accessibility issues are resolved | **not met**: the studio's own accessibility review is not run |
| Mobile and desktop walkthroughs pass | **not met** for the studio (desktop and tablet only) |
| Cross-site navigation is correct | met |
| Both QA cycles pass | **not met**: Cycle Two not run |
| The exact release candidate is tested after its final changes | met for a19216e |
| Staging contains the intended version | met: both staging sites report source commit a19216e in their build manifests |
