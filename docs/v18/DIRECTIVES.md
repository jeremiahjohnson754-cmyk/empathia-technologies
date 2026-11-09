# Founder directives in force (v1.8 continuation)

Every instruction the founder gave on 9 November 2026, in the order given, with where it stands. Earlier rules stay in force:
`docs/phase3/STANDING_RULES.md`, `docs/phase3/LEI_DECISIONS.md` (D1–D44), `docs/recovery/REBUILD_COMMON.md`.
Status words: **done** (built and a test ran), **in progress**, **not started**, **blocked** (says on what). A directive is never
marked done because a document describes it.

## Preserve (never reduce)

| # | Directive | Status | How it is checked |
|---|---|---|---|
| P1 | 1,099 requirements (1,009 from v1.7 + 90 new) stay tracked | done | `node scripts/verify/baseline-preserved.mjs` against `docs/v18/BASELINE_FINGERPRINTS.json` |
| P2 | 652 QA scenarios (562 + 90) stay tracked; a specification is not a passed test | done | same script; every v1.8 row is NOT_RUN until a test here runs it |
| P3 | The original 90-room Enterprise estate | in progress | 45 rooms exist; the other 45 are being added by the worlds slice |
| P4 | All 52 world role configurations (13 / 14 / 13 / 12), never a grant | in progress | fingerprint of the v1.4 matrix; the worlds slice adds a no-loss test |
| P5 | The SIGNAL source canon, original wording and choices | done (untouched) | the original HTML is kept outside git, byte-identical to the founder's copy |
| P6 | Pricing: $9.99 named user, 34 SKUs, 7 bundles, 4 pilots ($49.99 / $199.99 / $499.99 / $1,499.99), SIGNAL terms | in progress | pricing slice generates the catalogue from the founder's CSVs with a count-and-price test |
| P7 | All working functionality and the 31 October release candidate | done | `docs/recovery/SOURCE_RECONCILIATION_2026-11-09.md` |
| P8 | The founder page: portrait, overview, "The Missing Piece" ending "My Cinderella shoe.", CTS / CAPM / Network+ only | done | website suite W-founder-* |

## Build (the v1.8 master continuation directive, G0–G8)

| # | Directive | Status |
|---|---|---|
| G0 | Recover and verify the source, Render and baselines; report | done |
| G1 | Both website shells: navigation, routes, cross-site links, responsive | in progress (14 failing checks being fixed) |
| G2 | Shared Proof Registry; one synthetic commissioning claim identical on both sites | in progress (package, both sites and tests built; API next) |
| G3 | Four worlds with 4–6 journeys each; 52 roles preserved; no permission from a selection | in progress |
| G4 | Vertical slice: QR Hub, asset identity, Search Party, commissioning, Assurance, Import Studio, Export Center, executive dossier | in progress (QR Hub, dossier, JSON/CSV export built; Import Studio not started; PDF/DOCX/XLSX/ZIP not started) |
| G5 | Pilot conversion: readiness, pricing, hosted checkout sandbox, entitlement, onboarding | in progress |
| G6 | Mobile performance (2D first, 3D on request, measured budgets) and Film 13 continuity scene | not started |
| G7 | Destructive QA (the 18 perspectives + v1.8 negatives), repair, retest; CEH-style security pass | not started for v1.8 work |
| G8 | Release candidates, documentation, engineering handoff | not started |
| C1 | The unbroken path: homepage → use case → proof → tour → room problem → QR passport → Search Party → test → deficiency → verification → dossier → export → pilot eligibility → checkout sandbox → onboarding, with one real failure and recovery | in progress |

## How to work

| # | Directive | Status |
|---|---|---|
| W1 | Resume, never restart or scaffold a replacement; no planning loops | in force |
| W2 | Defined ≠ implemented ≠ tested ≠ authorized ≠ live; never optimistic status language | in force |
| W3 | No fabricated testimonials, customers, partnerships, integrations or measurements; inspired-by venues get fictional names | in force |
| W4 | No unauthorized discovery, device control or private-network access; read-only is the default | in force |
| W5 | Progress report after each iteration: source truth, work, evidence, defects, continuation | in force |
| W6 | Use the connectors that are really available (Figma, Render, Postman, Sentry, Supabase, Adobe, ElevenLabs …); mark the rest BLOCKED; no parallel sites or replaced backends | in progress |
| W7 | Human authorization before: live payments, production deployment, paid connectors, publishing public claims or commercial material, real customer networks, equipment actuation, disclosing proprietary material | in force — staging deploys only until the founder approves the cut-over and the public pricing |
| W8 | Every Empathia and SIGNAL video is impeccable: direction, cinematography, performance, narration, storytelling, no mistakes; a 20–30 s continuity scene first, human review before full production; never report a film that was not made | not started |
| W9 | Keep everything on GitHub after every slice; never lose work again | in force |
| W10 | No handoff documents, unpublished pricing notes or real organisations' names in the public repository | in force since `90e4d71`; the first copy remains in history pending the founder's decision |

## Waiting on the founder

1. Repository visibility: make it private, or have the history of `v18/continuation` rewritten.
2. Approval to switch the main Render sites to the new build, and to publish pricing on the public site.
3. A payment provider test account (for example Stripe test mode) before any real hosted checkout; until then checkout is a local sandbox simulation.
4. Review of the wording of the six published claims in the Proof Center.
