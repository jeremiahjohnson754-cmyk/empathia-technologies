# Test results

Run 2026-11-25T19:56:27.457Z on Node v22.23.4. PASS 304 · FAIL 0 · NOT_RUN 2 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Notes (why not run; machine stalls; a second run) |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 158/158 | 1.2 |  |
| unit: packages/service-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/field-intelligence | unit | PASS | 4/4 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.2 |  |
| unit: ml research prototype (python) | unit | NOT_RUN | — | — | dataset not generated (node ml/datasets/generate_synthetic.mjs; python3 -I ml/training/train.py) |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 3.1 |  |
| security: proof-registry.test.mjs | security | PASS | 12/12 | 4 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 17.3 |  |
| security: project-lifecycle.test.mjs | security | PASS | 16/16 | 11.2 |  |
| security: mission-control.test.mjs | security | PASS | 8/8 | 5.3 |  |
| security: training-isolation.test.mjs | security | PASS | 5/5 | 22 |  |
| security: placement.test.mjs | security | PASS | 7/7 | 7.3 |  |
| security: flagship-model.test.mjs | security | PASS | 7/7 | 5.6 |  |
| security: directory.test.mjs | security | PASS | 7/7 | 7 |  |
| e2e: website lead form over the API | e2e | PASS | 6/6 | 10.6 |  |
| browser: public website | browser | PASS | 298/298 | 150.2 |  |
| unit: Learn cases — separation of duties held in the store, with the DENIED ledger event | unit | PASS | 2/2 | 0.3 |  |
| unit: certification study spaces — outlines add up, every question well formed, drills rebuilt from their ids, exams in the outline’s proportions, scoring and progress | unit | PASS | 7/7 | 0.5 |  |
| unit: lifecycle refresh planning — refresh year per unit, annual plan and multi-year strategy agree, cost only when declared | unit | PASS | 5/5 | 0.9 |  |
| unit: training and simulation never touch the real record (SIGNAL game day, drills, Learn cases, FI simulated run) | unit | PASS | 5/5 | 0.3 |  |
| browser: investor demo FI scan replay | browser | PASS | 33/33 | 8.4 |  |
| browser: investor demo hardening | browser | PASS | 38/38 | 8 |  |
| browser: demo-phoneshell | browser | PASS | 49/49 | 42.8 |  |
| browser: demo-training-isolation | browser | PASS | 12/12 | 115.6 |  |
| browser: demo-story-keys | browser | PASS | 11/11 | 8.2 |  |
| browser: demo-expo-live | browser | PASS | 15/15 | 43.2 |  |
| browser: demo-voice | browser | PASS | 60/60 | 73.8 |  |
| browser: demo-signal-film | browser | PASS | 39/39 | 70.9 |  |
| unit: demo estates (one model, University 38 classrooms / 4 dormitories / 3 campuses, Stadium, Convention) | unit | PASS | 21/21 | 0.4 |  |
| unit: typed launch intents (#232: every website→demonstration link opens a registered page for its perspective; no open redirect) | unit | PASS | 4/4 | 1.7 |  |
| unit: SIGNAL drills (six kinds on the reference rules, all 146 drills) | unit | PASS | 9/9 | 0.3 |  |
| unit: SIGNAL meltdowns (the cascade engine; the five expert runs end proven with grade S, boundaries and idling fail) | unit | PASS | 5/5 | 0.6 |  |
| unit: SIGNAL mentor channel, built-in answers (the twenty prepared answers and seven suggestions) | unit | PASS | 3/3 | 0.2 |  |
| unit: Build a Room commissioning workbook (a valid zip, seven sheets, formulas with cached counts, formula text kept as text) | unit | PASS | 3/3 | 0.3 |  |
| unit: generated documents are current (estate manifests, product census, workflow matrix) | unit | PASS | 4/4 | 2.4 |  |
| unit: Site Champion (the permission model over every legacy table and registered surface; four governed actions, site scope, sixteen-role matrix, ledger) | unit | PASS | 9/9 | 0.9 |  |
| unit: Microsoft Graph document source, MOCK-TESTED (same index as the simulated library after every change; folder rename and revocation found without the feed; no link off Graph followed; token never sent to a download; nothing outside the selection asked for) | unit | PASS | 11/11 | 0.3 |  |
| unit: Harmony tool registry (asking does not grant; answers carry sources; steps are prepared, never taken; no link a role cannot open; sixteen roles) | unit | PASS | 8/8 | 1.7 |  |
| unit: offline worker and its build step (atomic install, shells kept across builds, network-first with fallback, ranged answers, packs) | unit | PASS | 17/17 | 0.3 |  |
| browser: demo-coach | browser | PASS | 14/14 | 54.2 |  |
| browser: demo-room-jumps | browser | PASS | 11/11 | 18.2 |  |
| browser: demo-signal-lite | browser | PASS | 9/9 | 14.9 |  |
| browser: demo-lite-arrange | browser | PASS | 28/28 | 17.9 |  |
| browser: demo-tours | browser | PASS | 178/178 | 414.8 |  |
| browser: demo-docs5 | browser | PASS | 68/68 | 52.4 |  |
| browser: demo-story | browser | PASS | 99/99 | 146.8 |  |
| browser: demo-request | browser | PASS | 67/67 | 88.8 |  |
| browser: demo-connect | browser | PASS | 120/120 | 89.8 |  |
| browser: demo-instant | browser | PASS | 27/27 | 18.5 |  |
| browser: demo-bench | browser | PASS | 23/23 | 10 |  |
| browser: demo-workflows | browser | PASS | 7/7 | 12.5 |  |
| browser: demo-service-import | browser | PASS | 6/6 | 4.9 |  |
| browser: demo-people | browser | PASS | 7/7 | 9.2 |  |
| browser: demo-waiting | browser | PASS | 5/5 | 9.2 |  |
| browser: demo-field-redline | browser | PASS | 7/7 | 8.2 |  |
| unit: the migration ledger is checked (the pages it calls server are the ones listed; a server page imports the server client and the interface kit and reaches no browser-held record; the client stores the sandbox’s id and key only) | unit | PASS | 3/3 | 0.2 |  |
| e2e: founder town hall (Founder Edition) | e2e | PASS | 25/25 | 50.4 |  |
| deploy: public sites audit (functional, a11y, responsive; no P0/P1) | deploy | PASS | 260/260 | 396.1 |  |
| unit: what a frame costs, counted (a window is one face; the view test and the face test never leave out what could be seen; the renderer counts its triangles and draw calls) | unit | PASS | 7/7 | 0.3 |  |
| unit: evidence of record (a working run or a suite run by hand leaves tests/evidence and the ledger untouched; a run of record cannot be narrowed; temp cleanup removes only test directories; machine stalls are measured and only a failure during one is run a second time) | unit | PASS | 7/7 | 8 |  |
| browser: website FieldLink (optional hardware, a concept: optional, labelled, no cost internals) | browser | PASS | 26/26 | 5.6 |  |
| browser: website first screen (90-1) | browser | PASS | 37/37 | 26 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.2 |  |
| unit: packages/apex-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 18/18 | 0.2 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.2 |  |
| unit: demo access policy and Scouter | unit | PASS | 15/15 | 0.5 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 3.2 |  |
| security: room-thread.test.mjs | security | PASS | 9/9 | 10.6 |  |
| security: governance.test.mjs | security | PASS | 10/10 | 12.2 |  |
| security: service-lifecycle.test.mjs | security | PASS | 11/11 | 5.1 |  |
| security: competency.test.mjs | security | PASS | 6/6 | 5.6 |  |
| security: asset-retirement.test.mjs | security | PASS | 6/6 | 3.8 |  |
| security: criteria.test.mjs | security | PASS | 13/13 | 22.2 |  |
| security: second-room.test.mjs | security | PASS | 7/7 | 17.1 |  |
| security: vocabulary.test.mjs | security | PASS | 2/2 | 3.2 |  |
| e2e: the owner's checkpoint scenario, a room from Lite design to a changed camera, over the API | e2e | PASS | 103/103 | 12.9 |  |
| browser: investor demo shell | browser | PASS | 110/110 | 139 |  |
| unit: people and experience — who did each job, experience by complexity and kind, totals by layer and quarter | unit | PASS | 4/4 | 0.9 |  |
| unit: SIGNAL field calculator — the reference’s evaluator, error words and fourteen helpers; never eval | unit | PASS | 4/4 | 0.2 |  |
| unit: the universal phase engine — the verdict rule, the sign-off, commissioning unchanged on every room, a ServiceHands job phase by phase | unit | PASS | 3/3 | 0.9 |  |
| unit: export formats (every report in PDF, Word, Excel, PowerPoint, JSON and CSV, reopened by independent readers) | unit | PASS | 915/915 | 30.7 |  |
| browser: investor demo decisions | browser | PASS | 25/25 | 10.8 |  |
| browser: demo-deadends (every control on every fixed page does something) | browser | PASS | 139/139 | 862.2 |  |
| browser: demo-scouter | browser | PASS | 31/31 | 16.5 |  |
| browser: demo-fieldtools | browser | PASS | 35/35 | 14 |  |
| browser: demo-chal-drawings | browser | PASS | 11/11 | 4.2 |  |
| browser: demo-return-trail | browser | PASS | 40/40 | 111.4 |  |
| browser: demo-modules | browser | PASS | 60/60 | 54.1 |  |
| browser: demo-launch | browser | PASS | 13/13 | 55.2 |  |
| unit: Space Optimizer engine (nine dimensions, options A/B/C, stated rules, every world) | unit | PASS | 14/14 | 0.7 |  |
| unit: PRISM, SENTINEL, ACCORD, FORGE, OMNIPRESENCE (each on the estate’s own records and the existing engines; unknown never reported as good; what crosses to another organisation, what FORGE refuses, what a tag may carry, who may act) | unit | PASS | 18/18 | 1.9 |  |
| unit: SIGNAL live incidents (the reference rules; all 121 solver paths end proven inside the clock) | unit | PASS | 7/7 | 0.2 |  |
| unit: SIGNAL challenges (thirteen models in five modes; every start fails and every recipe passes as the reference QA logged) | unit | PASS | 131/131 | 0.7 |  |
| unit: Lite studio model (geometry with provenance, recipe, prediction, corrections, variants) | unit | PASS | 5/5 | 0.3 |  |
| unit: the five axes of the Experience Language (condition, provenance, confidence, workflow, maturity) | unit | PASS | 4/4 | 0.3 |  |
| unit: search that reads the sentence (corrections, conditions, counted answers, drop one condition; every count recomputed from the records) | unit | PASS | 13/13 | 0.9 |  |
| unit: connect (people directory and site champions from the estate; verified app-jump formats and encoding; schedule-aware proposals across time zones in thousands of random cases; confirm re-checks and is idempotent; one adapter contract over the simulated calendar and the mock-tested Graph adapter; who may) | unit | PASS | 33/33 | 20.8 |  |
| unit: IT Onboarding Success Guide (covers the founder’s list; holds no tenant detail; personalised only from records; each item done by whoever it names; checks marked in the store; milestones derived; progress shown only to the starter, manager and, in part, mentor; revisions kept) | unit | PASS | 10/10 | 0.5 |  |
| unit: knowledge contract (five trust zones; no cross-tenant read in 20,000 random cases; promotion and sharing need a named person and consent; source hierarchy; freshness) | unit | PASS | 12/12 | 0.3 |  |
| unit: game day state machine (phases, faults on estate records, holds, independent verification, public view) | unit | PASS | 11/11 | 0.2 |  |
| browser: demo-campus | browser | PASS | 102/102 | 52.5 |  |
| browser: demo-cx-as-rooms | browser | PASS | 20/20 | 10.7 |  |
| browser: demo-mixlab | browser | PASS | 31/31 | 27.2 |  |
| browser: demo-lite-worlds | browser | PASS | 46/46 | 30.2 |  |
| browser: demo-searchbar | browser | PASS | 120/120 | 69.6 |  |
| browser: demo-guides | browser | PASS | 25/25 | 12.3 |  |
| browser: demo-gameday | browser | PASS | 19/19 | 7 |  |
| browser: demo-here | browser | PASS | 57/57 | 28.5 |  |
| browser: demo-knowledge | browser | PASS | 104/104 | 73 |  |
| browser: demo-drawing | browser | PASS | 24/24 | 8.3 |  |
| browser: demo-story-more | browser | PASS | 55/55 | 59.4 |  |
| browser: demo-registers | browser | PASS | 10/10 | 8.1 |  |
| browser: demo-mission-work | browser | PASS | 5/5 | 8.9 |  |
| browser: demo-service-phases | browser | PASS | 10/10 | 10.3 |  |
| browser: demo-cx-analytics | browser | PASS | 4/4 | 6.6 |  |
| browser: demo-vertical-slice | browser | PASS | 11/11 | 44.8 |  |
| unit: private assets for the Founder Studio (the manifest holds names and hashes only; nothing private is tracked; a missing or altered store is refused; an unprovisioned studio suite is NOT RUN, never passed) | unit | PASS | 6/6 | 0.7 |  |
| e2e: founder decisions (hosted studio over the API) | e2e | PASS | 9/9 | 7.7 |  |
| deploy: public static sites under the declared headers | deploy | PASS | 26/26 | 20.3 |  |
| unit: the limits a simplified drawing must meet (set from the quality requirements before it was measured; a dimmer, thinner, recoloured or smeared crowd is refused; a person a pixel aside is accepted; identical parts of a picture cannot dilute a difference) | unit | PASS | 4/4 | 0.6 |  |
| unit: the public exposure audit catches each planted finding (secrets, maps, contact data, machine paths, embedded data, private markers) | unit | PASS | 13/13 | 0.8 |  |
| build: the website within its budgets with the staging URLs (19 Nov 2026: the Render build failed at 49,186 B while the local build passed) | build | PASS | 1/1 | 0.7 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/kpi-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/observability | unit | PASS | 10/10 | 0.2 |  |
| unit: packages/commercial (price list, pilot readiness, activation machines) | unit | PASS | 30/30 | 0.4 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.7 |  |
| integration: observability.test.mjs | integration | PASS | 5/5 | 2.7 |  |
| security: demo-sandbox.test.mjs | security | PASS | 18/18 | 35.2 |  |
| security: administration.test.mjs | security | PASS | 5/5 | 3.9 |  |
| security: apex.test.mjs | security | PASS | 5/5 | 4.9 |  |
| security: ledger.test.mjs | security | PASS | 5/5 | 3.8 |  |
| security: device-register.test.mjs | security | PASS | 10/10 | 4.5 |  |
| security: shutdown.test.mjs | security | PASS | 1/1 | 3.9 |  |
| security: measured-exception.test.mjs | security | PASS | 8/8 | 9.5 |  |
| security: platform-jumps.test.mjs | security | PASS | 4/4 | 4.2 |  |
| browser: enterprise web E2E | e2e | PASS | 89/89 | 33.3 |  |
| unit: demo operational workspaces | unit | PASS | 13/13 | 0.4 |  |
| unit: engineer faults — an injected fault refuses with its reason and leaves nothing half-done; the inspection sheets name files that exist | unit | PASS | 4/4 | 0.2 |  |
| unit: Field Tools — every calculator checked against a value worked by hand from its formula; search and the plain-text report | unit | PASS | 9/9 | 0.3 |  |
| unit: Search Party by asset ID and by person — every unit searchable, successions recorded, people and their rooms | unit | PASS | 3/3 | 0.9 |  |
| browser: investor demo dispatch | browser | PASS | 29/29 | 8.7 |  |
| browser: investor demo destructive-action safeguards | browser | PASS | 164/164 | 28.1 |  |
| browser: demo-parity-areas | browser | PASS | 115/115 | 209.9 |  |
| browser: demo-rolemotion | browser | PASS | 21/21 | 19.4 |  |
| browser: demo-certs | browser | PASS | 28/28 | 13.4 |  |
| browser: demo-campus-life | browser | PASS | 24/24 | 186.2 |  |
| browser: demo-map | browser | PASS | 35/35 | 78.8 |  |
| browser: demo-journeys | browser | PASS | 162/162 | 111.4 |  |
| unit: demo spaces (campus records, search, scenarios, tours) | unit | PASS | 11/11 | 1.5 |  |
| unit: SIGNAL canon (hash manifest, 133 chapters / 1,610 panels / 387 decisions, engine rules, every chapter readable) | unit | PASS | 19/19 | 0.8 |  |
| unit: Empathia VOICE (Enterprise 3.0 directive 1A, J6B: the CallPath fixture stands on the estate; unknown is never healthy; the quality method refuses rather than guesses; privacy; who may open what) | unit | PASS | 20/20 | 2.3 |  |
| unit: SIGNAL Fix-It Labs (shell rules; signal flow, network, power, fill, EQ, camera, DMX, RF: every lab fails at start, its fix passes) | unit | PASS | 15/15 | 0.3 |  |
| unit: SIGNAL boss levels (all twelve clear on the intended run; every wrong tap, call, question, scope, design or estimate ends it) | unit | PASS | 30/30 | 0.5 |  |
| unit: Design a Space concept (fixes, rehearsal, identity across versions, import guard) | unit | PASS | 4/4 | 0.3 |  |
| unit: Drawing Intelligence display viewing analysis (ST-VID-02 arithmetic, candidate sizes, provenance of every input) | unit | PASS | 3/3 | 0.2 |  |
| unit: request portal (the proposal is the design engine's output; sending, refusals, following; who may ask) | unit | PASS | 22/22 | 1.3 |  |
| unit: room guides ("How do I use this room?" generated for all 90 rooms: no sentence names equipment a room lacks; sections follow the panel; nothing unsafe) | unit | PASS | 6/6 | 0.8 |  |
| unit: Instant Room rules (guided shots and their safety wording; a photograph judged by arithmetic; coverage; measurements; differences from the record as questions; a plan only when enough was captured, with every guess listed) | unit | PASS | 9/9 | 0.4 |  |
| unit: knowledge ledger and governed ingestion (every object well-formed and its worked examples recomputed; isolation over all objects, both customers and every role; sync engine equals a fresh import over random sequences; untrusted documents; promotion and sharing refusals) | unit | PASS | 13/13 | 11.3 |  |
| unit: the critical signal (chain generated from estate records; simulated, inferred and known observations; the procedure for the isolated hop, for every hop; who may; engine invariants over 16,000 random actions; ledger) | unit | PASS | 22/22 | 1.2 |  |
| browser: demo-rooms | browser | PASS | 86/86 | 102.5 |  |
| browser: demo-assurance-v253 | browser | PASS | 39/39 | 19.3 |  |
| browser: demo-signal-s1 | browser | PASS | 6/6 | 18.9 |  |
| browser: demo-lite-eye | browser | PASS | 20/20 | 31.3 |  |
| browser: demo-search-scenarios | browser | PASS | 108/108 | 29.4 |  |
| browser: demo-worlds | browser | PASS | 67/67 | 165.7 |  |
| browser: demo-play | browser | PASS | 24/24 | 20.3 |  |
| browser: demo-control | browser | PASS | 34/34 | 46.9 |  |
| browser: demo-harmony | browser | PASS | 22/22 | 48.1 |  |
| browser: demo-manual | browser | PASS | 46/46 | 37.2 |  |
| browser: demo-exports | browser | PASS | 21/21 | 21.5 |  |
| browser: demo-service-analytics | browser | PASS | 8/8 | 12.7 |  |
| browser: demo-reverb | browser | PASS | 8/8 | 5.1 |  |
| browser: demo-sti | browser | PASS | 7/7 | 5.9 |  |
| browser: demo-field-ux | browser | PASS | 10/10 | 20 |  |
| browser: demo-engineer-start | browser | PASS | 6/6 | 10.6 |  |
| unit: the release gate (a FAIL or an unnamed skip is refused; the Founder Studio suites may be NOT RUN only where the runner declares it has no private store, never where the studio is built, never for a media release; the workflow asks for no secret and builds nothing private) | unit | PASS | 8/8 | 0.6 |  |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
| security: public sites (headers, build chain, servers, dist) | security | PASS | 10/10 | 5.8 |  |
| unit: the performance check a visitor runs on their own device (the pace of a run of frames; a target is held by the pace and the slow frames together; the synthetic environment; the report carries the result and what a result is; the page sends nothing) | unit | PASS | 7/7 | 0.3 |  |
| unit: link previews: both share cards are 1200 × 630, and the tags name the image only with a public address | unit | PASS | 2/2 | 0.1 |  |
| browser: website Build Your Empathia (price book 3: every figure from estimate(), shareable, enquiry and demonstration one click away) | browser | PASS | 29/29 | 16.3 |  |
| unit: packages/search-party | unit | PASS | 5/5 | 0.2 |  |
| unit: packages/proof-registry | unit | PASS | 43/43 | 1.4 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.2 |  |
| unit: packages/design-tokens (contrast both themes, D7/D37/D38) | unit | PASS | 23/23 | 0.1 |  |
| integration: api.test.mjs | integration | PASS | 22/22 | 7 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 5.5 |  |
| security: field-record.test.mjs | security | PASS | 9/9 | 11.3 |  |
| security: search-party.test.mjs | security | PASS | 7/7 | 4.1 |  |
| security: field-intelligence.test.mjs | security | PASS | 6/6 | 4.1 |  |
| security: measurement-import.test.mjs | security | PASS | 4/4 | 3.6 |  |
| security: deficiency-workflow.test.mjs | security | PASS | 7/7 | 4.5 |  |
| security: incidents.test.mjs | security | PASS | 11/11 | 12.4 |  |
| security: intelligibility-standard.test.mjs | security | PASS | 7/7 | 8.7 |  |
| security: data-report.test.mjs | security | PASS | 3/3 | 3.9 |  |
| browser: design tokens (themes, theme-init, Inter) | browser | PASS | 29/29 | 3.8 |  |
| unit: ServiceHands import — the CSV parser, hostile rows, the commit rule, round-trip of the queue exports | unit | PASS | 6/6 | 0.3 |  |
| unit: SIGNAL title page — extracted from the reference build, inert, resolves in the canon sprite sheet, agrees with the canon | unit | PASS | 3/3 | 0.2 |  |
| unit: phase 1 field record — mounting, hookups against the design, field moves decided independently, notes | unit | PASS | 5/5 | 0.2 |  |
| unit: STI workflow — readings against the project policy, flags, the intelligibility exception and its refusals | unit | PASS | 3/3 | 0.2 |  |
| browser: investor demo ServiceHands | browser | PASS | 31/31 | 10.3 |  |
| browser: investor demo enquiry links | browser | PASS | 23/23 | 10.2 |  |
| browser: demo-access | browser | PASS | 31/31 | 70.1 |  |
| browser: demo-searchparty-bar | browser | PASS | 29/29 | 34.6 |  |
| browser: demo-quizlib | browser | PASS | 9/9 | 8.1 |  |
| browser: demo-stadium-live | browser | PASS | 20/20 | 317 |  |
| browser: demo-gestures | browser | PASS | 38/38 | 171.7 |  |
| browser: demo-links | browser | PASS | 71/71 | 87.7 |  |
| unit: demo Lite (45 rooms, lenses, coverage overlays, four states, wayfinding, QR) | unit | PASS | 16/16 | 1.1 |  |
| unit: SIGNAL content bundle (lessons, quizzes, drills, labs, incidents, gates; held by hash) | unit | PASS | 7/7 | 0.3 |  |
| unit: failure-map measures (count, per room, per device, per room-month, severity-weighted, repeat vs unique; 18 Nov 15:38) | unit | PASS | 4/4 | 0.8 |  |
| unit: SIGNAL Physics in Motion (24 models; all 36 physics labs fail at start and pass with their setting) | unit | PASS | 7/7 | 0.5 |  |
| unit: SIGNAL Mission Control (points, the ladder, domain levels, crew trust, the systems map) | unit | PASS | 6/6 | 0.2 |  |
| unit: Scouter standard kits (propose, review by another role, publish, stale, adopt) | unit | PASS | 3/3 | 0.2 |  |
| unit: SIGNAL glossary terms in the story (first use per chapter, the reference’s expressions) | unit | PASS | 4/4 | 0.3 |  |
| unit: in this room (equipment, history, what a symptom points at, safe guidance, outcomes written to ServiceHands and the room; who may) | unit | PASS | 12/12 | 1.2 |  |
| unit: Phase 5 documentation in the demonstration (profiles for all 90 rooms; the tracked room agrees with its dossier; sixteen-role matrix; the dossier’s gate; captures committed once) | unit | PASS | 6/6 | 1.2 |  |
| unit: Drawing Intelligence, reading and reviewing (six classes of knowing; no scale claimed from too little; overlaps and contradictions raised with both sources kept; untrusted input; the commissioning engine’s own rules as the standards review; revision diff) | unit | PASS | 10/10 | 0.3 |  |
| unit: video QA (narration words, sync, captions, picture; the Film 13 scene record is what its measurements say) | unit | PASS | 8/8 | 0.2 |  |
| unit: demo core screens (health, spine, campus aggregates) | unit | PASS | 11/11 | 0.8 |  |
| browser: demo-lite | browser | PASS | 372/372 | 306 |  |
| browser: demo-lesson | browser | PASS | 10/10 | 11.4 |  |
| browser: demo-lite-spatial | browser | PASS | 74/74 | 44 |  |
| browser: demo-lite-rooms | browser | PASS | 22/22 | 24.2 |  |
| browser: demo-core | browser | PASS | 317/317 | 164 |  |
| browser: demo-estate | browser | PASS | 42/42 | 21.9 |  |
| browser: demo-offline | browser | PASS | 44/44 | 55.6 |  |
| browser: demo-critical-signal | browser | PASS | 93/93 | 32.7 |  |
| browser: demo-champion-start | browser | PASS | 21/21 | 13.3 |  |
| browser: demo-learn | browser | PASS | 50/50 | 14.4 |  |
| browser: demo-drill | browser | PASS | 13/13 | 7.8 |  |
| browser: demo-room-qr | browser | PASS | 7/7 | 15.7 |  |
| browser: demo-asset-life | browser | PASS | 6/6 | 8.3 |  |
| browser: demo-plan-why | browser | PASS | 6/6 | 3.6 |  |
| browser: demo-lite-device-checks | browser | PASS | 3/3 | 2.4 |  |
| browser: demo-connected | browser | PASS | 17/17 | 77.6 |  |
| unit: the durable copy of the private assets (requests signed as the published example; push only to a bucket that keeps versions and gives nothing without a credential; pull keeps only files the manifest names; encrypted backups open only with the recipient’s key and restore all or nothing; no secret printed) | unit | PASS | 9/9 | 2.8 |  |
| deploy: Render Blueprints (static validation) | deploy | PASS | 37/37 | 0.2 |  |
| browser: public sites security (CSP in the page, no request leaves, injection, tampering, View-as) | browser | PASS | 13/13 | 175 |  |
| unit: frame rates are kept with the evidence (each reading with the detail it was drawn at and labelled as the test machine’s; a figure that is not a number is refused; a file from another commit is not this run’s; the ledger line and the results table carry them) | unit | PASS | 4/4 | 0.2 |  |
| security: public builds expose nothing private (secrets, source maps, contact data, build-machine paths, embedded data, private markers) | security | PASS | 7/7 | 1.1 |  |
| browser: website Follow one device and product launches (#232, 17:25 §6) | browser | PASS | 19/19 | 6.7 |  |
| unit: packages/project-governance | unit | PASS | 9/9 | 0.2 |  |
| unit: packages/field-queue | unit | PASS | 22/22 | 0.2 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.2 |  |
| unit: packages/ui (canonical products, ui.css on the tokens) | unit | PASS | 7/7 | 0.2 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 3.4 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 3.8 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 4.2 |  |
| security: oidc.test.mjs | security | PASS | 4/4 | 3.7 |  |
| security: learn.test.mjs | security | PASS | 4/4 | 5.1 |  |
| security: hardening.test.mjs | security | PASS | 6/6 | 5.7 |  |
| security: privileges.test.mjs | security | PASS | 7/7 | 4.5 |  |
| security: second-technician.test.mjs | security | PASS | 7/7 | 7 |  |
| security: documentation.test.mjs | security | PASS | 7/7 | 9.8 |  |
| security: powerbi-export.test.mjs | security | PASS | 4/4 | 3.8 |  |
| browser: brand and type on the three surfaces (D39, D7) | browser | PASS | 66/66 | 10.2 |  |
| unit: reverberation instrument — known-answer decays, refusals on short range, octave filters, WAV/CSV readers | unit | PASS | 7/7 | 1.9 |  |
| unit: one room end to end — handoff to service, the job does not close the deficiency, the verified retest does, APEX hypotheses, the ids that tie the stages | unit | PASS | 5/5 | 0.3 |  |
| unit: the demo connected to the API — the sandbox key is stored and the session token is not, refusals are returned in the server’s words, a lost sandbox is forgotten, the nineteen-step journey reads its state from the server | unit | PASS | 6/6 | 0.2 |  |
| unit: ServiceHands analytics — measures on hand-built jobs, the synthetic history, the vendor scorecard | unit | PASS | 4/4 | 0.8 |  |
| browser: investor demo Core Replay | browser | PASS | 31/31 | 16.3 |  |
| browser: investor demo Learn labs | browser | PASS | 29/29 | 10.6 |  |
| browser: demo-viewas | browser | PASS | 20/20 | 34.4 |  |
| browser: demo-boundaries | browser | PASS | 5/5 | 17.3 |  |
| browser: demo-fieldcalc | browser | PASS | 13/13 | 11.6 |  |
| browser: demo-performance-check | browser | PASS | 12/12 | 58.6 |  |
| browser: demo-search-journey | browser | PASS | 29/29 | 33 |  |
| browser: demo-route-sweep | browser | PASS | 154/154 | 106.3 |  |
| unit: demo worlds (four worlds, 52 role configurations, no-loss, no grant) | unit | PASS | 7/7 | 0.5 |  |
| unit: SIGNAL interactive film (every chapter a valid film; Season 1 footage and takes placed; Ten Seats acoustics match the canon) | unit | PASS | 5/5 | 0.3 |  |
| unit: SIGNAL story engine (decisions recorded as the reference does, clock, echoes, gates, quiz records) | unit | PASS | 16/16 | 0.3 |  |
| unit: SIGNAL ratings, season reviews and the loadout (six ratings from first attempts, Story Score, game over and retry) | unit | PASS | 8/8 | 0.2 |  |
| unit: SIGNAL result pop-ups (each gate cleared, the chapter complete, the quest objective and rating) | unit | PASS | 5/5 | 0.2 |  |
| unit: Build a Room edits (move, duplicate, swap within a group, retire a connection, compare revisions) | unit | PASS | 8/8 | 0.3 |  |
| unit: Engineering Manual (chapters, rules, workflow, exceptions) | unit | PASS | 10/10 | 1.3 |  |
| unit: room control (panel generated from each room record; no impossible state in 18,000 random presses; commands, simulated adapter, authority, ledger) | unit | PASS | 8/8 | 1.1 |  |
| unit: Site Champion’s first weeks (lessons never say to open, unplug or climb; the check is marked in the store and needs the safety answer; the list is read from the record; champion only) | unit | PASS | 8/8 | 0.4 |  |
| unit: End User Success & Training Guide chapters (the founder’s twenty-eight contents each answered; no organisation, person or room named; nothing unsafe; no step-by-step for another company’s application; every link a registered page) | unit | PASS | 5/5 | 0.4 |  |
| unit: role start pages and keyboard shortcuts (16 roles against the real policy and records; every link opens for its role) | unit | PASS | 19/19 | 1.4 |  |
| browser: demo-welcome | browser | PASS | 11/11 | 37 |  |
| browser: demo-journey | browser | PASS | 10/10 | 12.7 |  |
| browser: demo-cinematic | browser | PASS | 17/17 | 28.9 |  |
| browser: demo-lite-tabs | browser | PASS | 30/30 | 18.1 |  |
| browser: demo-lite-views | browser | PASS | 15/15 | 20 |  |
| browser: demo-proof | browser | PASS | 94/94 | 77.5 |  |
| browser: demo-optimizer | browser | PASS | 36/36 | 12 |  |
| browser: demo-rolehome | browser | PASS | 125/125 | 169.3 |  |
| browser: demo-champion | browser | PASS | 21/21 | 53.1 |  |
| browser: demo-onboard | browser | PASS | 33/33 | 17.6 |  |
| browser: demo-boss | browser | PASS | 38/38 | 56.6 |  |
| browser: demo-search-parity | browser | PASS | 7/7 | 6.1 |  |
| browser: demo-request-45s | browser | PASS | 6/6 | 20.1 |  |
| browser: demo-deficiencies | browser | PASS | 7/7 | 6.9 |  |
| browser: demo-scenarios | browser | PASS | 5/5 | 3.2 |  |
| browser: demo-refresh | browser | PASS | 5/5 | 8.2 |  |
| browser: demo-flagship | browser | PASS | 44/44 | 170.6 |  |
| browser: Founder Studio | browser | PASS | 19/19 | 68.7 |  |
| deploy: the demonstration staging rehearsed from its Blueprint — the start command on an empty database, the deployment check (permissions, unauthorized access, isolation, persistence, cross-origin, reset), a restart, the V-1 gate | deploy | PASS | 13/13 | 52.5 |  |
| unit: drawing detail follows the frame rate (lowered step by step when a scene is slow, restored when fewer pixels buy no speed, never below half, off with detail=full) | unit | PASS | 6/6 | 0.2 |  |
| unit: the preflight (steps 2 and 3 of the engineering sequence: chooses the browser suites a change reaches from the code; its cross-product list exists; writes nothing of record) | unit | PASS | 7/7 | 7.2 |  |
| browser: website pricing and pilot readiness | browser | PASS | 54/54 | 19.6 |  |
| browser: website home opening (17:25 §4: the founder headline, the room-to-estate sequence from the demonstration, two actions) | browser | PASS | 19/19 | 6.4 |  |

## Frame rates this run measured

Measured on the machine that ran the tests, in headless Chromium. Not a measurement of any visitor’s device. The target for ordinary hardware is 30 frames a second; no device has been measured. Machine: 2 cores; WebGL drawn by ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver).

| Scene | Check and mode | What | Frames a second | Drawn at | Floor | Triangles a frame | Draw calls |
|---|---|---|---|---|---|---|---|
| campus | CL-13 adapted | desktop 1280 × 860, opened as a visitor opens it, read after the quest and a reload | 13 | 50% | 8 | — | — |
| campus | CL-21 full | desktop 1280 × 860, held at full detail, the middle of four one-second readings | 7 | 100% | — | 28412 | 103 |
| campus | CL-21 adapted | desktop 1280 × 860, left to adapt, the middle of four one-second readings | 18 | 50% | — | 28412 | 103 |
| campus | CL-16f adapted | phone size 390 × 844 in the same desktop browser (not a phone), opened as a visitor opens it | 20 | 50% | 8 | — | — |
| expo | XPO-10 full | desktop 1440 × 900, held at full detail, reduced motion, after every control was pressed | 10 | 100% | 4 | 6720 | 133 |
| expo | XPO-13 adapted | desktop 1440 × 900, left to adapt, once the level had held three seconds | 25 | 50% | — | 6708 | 132 |
| stadium | SLV-12 full | desktop 1440 × 900, held at full detail, reduced motion, after every control was pressed (the gallery view) | 6 | 100% | 2 | 34808 | 70 |
| stadium | SLV-15 adapted | desktop 1440 × 900, left to adapt, once the level had held three seconds (the overview) | 10 | 50% | — | 34394 | 59 |
