# Test results

Run 2026-11-14T03:59:51.087Z on Node v22.23.4. PASS 100 · FAIL 1 · NOT_RUN 85 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 145/145 | 0.7 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/search-party | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/project-governance | unit | PASS | 9/9 | 0.1 |  |
| unit: packages/service-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/apex-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/kpi-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/proof-registry | unit | PASS | 43/43 | 1.2 |  |
| unit: packages/field-queue | unit | PASS | 22/22 | 0.1 |  |
| unit: packages/field-intelligence | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 18/18 | 0.2 |  |
| unit: packages/observability | unit | PASS | 10/10 | 0.2 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/commercial (price list, pilot readiness, activation machines) | unit | PASS | 15/15 | 0.1 |  |
| unit: packages/design-tokens (contrast both themes, D7/D37/D38) | unit | PASS | 22/22 | 0.1 |  |
| unit: packages/ui (canonical products, ui.css on the tokens) | unit | PASS | 7/7 | 0.2 |  |
| unit: ml research prototype (python) | unit | NOT_RUN | — | — | dataset not generated (node ml/datasets/generate_synthetic.mjs; python3 -I ml/training/train.py) |
| unit: demo access policy and Scouter | unit | PASS | 15/15 | 0.4 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.8 |  |
| integration: api.test.mjs | integration | PASS | 22/22 | 5.1 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 2 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 2.1 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 2 |  |
| integration: observability.test.mjs | integration | PASS | 5/5 | 1.9 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 4.2 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 2.3 |  |
| security: proof-registry.test.mjs | security | PASS | 12/12 | 2.6 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 2.6 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 9.7 |  |
| security: governance.test.mjs | security | PASS | 10/10 | 7.8 |  |
| security: administration.test.mjs | security | PASS | 5/5 | 2.9 |  |
| security: search-party.test.mjs | security | PASS | 7/7 | 3 |  |
| security: oidc.test.mjs | security | PASS | 4/4 | 2.2 |  |
| security: project-lifecycle.test.mjs | security | PASS | 16/16 | 7.8 |  |
| security: service-lifecycle.test.mjs | security | PASS | 11/11 | 3.4 |  |
| security: apex.test.mjs | security | PASS | 5/5 | 3 |  |
| security: field-intelligence.test.mjs | security | PASS | 6/6 | 3 |  |
| security: learn.test.mjs | security | PASS | 4/4 | 3 |  |
| security: mission-control.test.mjs | security | PASS | 8/8 | 3.3 |  |
| security: competency.test.mjs | security | PASS | 6/6 | 3.8 |  |
| security: ledger.test.mjs | security | PASS | 5/5 | 2.7 |  |
| security: measurement-import.test.mjs | security | PASS | 4/4 | 2.4 |  |
| security: hardening.test.mjs | security | PASS | 6/6 | 4.2 |  |
| e2e: website lead form over the API | e2e | NOT_RUN | — | — | pass --browser |
| browser: enterprise web E2E | e2e | NOT_RUN | — | — | pass --browser |
| browser: design tokens (themes, theme-init, Inter) | browser | NOT_RUN | — | — | pass --browser |
| browser: brand and type on the three surfaces (D39, D7) | browser | NOT_RUN | — | — | pass --browser |
| browser: public website | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo shell | browser | NOT_RUN | — | — | pass --browser |
| unit: demo operational workspaces | unit | PASS | 13/13 | 0.3 |  |
| browser: investor demo dispatch | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo ServiceHands | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo Core Replay | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo FI scan replay | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo decisions | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo destructive-action safeguards | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo enquiry links | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo Learn labs | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo hardening | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-parity-areas | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-access | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-viewas | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-phoneshell | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-scouter | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-rolemotion | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-searchparty-bar | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-boundaries | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-training-isolation | browser | NOT_RUN | — | — | pass --browser |
| unit: demo spaces (campus records, search, scenarios, tours) | unit | PASS | 11/11 | 1.2 |  |
| unit: demo Lite (45 rooms, lenses, coverage overlays, four states, wayfinding, QR) | unit | PASS | 16/16 | 0.9 |  |
| unit: demo worlds (four worlds, 52 role configurations, no-loss, no grant) | unit | PASS | 7/7 | 0.3 |  |
| unit: demo estates (one model, University 38 classrooms / 4 dormitories / 3 campuses, Stadium, Convention) | unit | PASS | 21/21 | 0.3 |  |
| unit: Space Optimizer engine (nine dimensions, options A/B/C, stated rules, every world) | unit | PASS | 14/14 | 0.6 |  |
| unit: SIGNAL canon (hash manifest, 133 chapters / 1,610 panels / 387 decisions, engine rules, every chapter readable) | unit | PASS | 19/19 | 0.7 |  |
| unit: SIGNAL content bundle (lessons, quizzes, drills, labs, incidents, gates; held by hash) | unit | PASS | 7/7 | 0.3 |  |
| unit: SIGNAL story engine (decisions recorded as the reference does, clock, echoes, gates, quiz records) | unit | PASS | 16/16 | 0.2 |  |
| unit: SIGNAL drills (six kinds on the reference rules, all 146 drills) | unit | PASS | 9/9 | 0.2 |  |
| unit: SIGNAL live incidents (the reference rules; all 121 solver paths end proven inside the clock) | unit | PASS | 7/7 | 0.2 |  |
| unit: SIGNAL Fix-It Labs (shell rules; signal flow, network, power, fill, EQ, camera, DMX, RF: every lab fails at start, its fix passes) | unit | PASS | 15/15 | 0.2 |  |
| unit: SIGNAL Physics in Motion (24 models; all 36 physics labs fail at start and pass with their setting) | unit | PASS | 7/7 | 0.4 |  |
| unit: SIGNAL ratings, season reviews and the loadout (six ratings from first attempts, Story Score, game over and retry) | unit | PASS | 8/8 | 0.2 |  |
| unit: SIGNAL meltdowns (the cascade engine; the five expert runs end proven with grade S, boundaries and idling fail) | unit | PASS | 5/5 | 0.5 |  |
| unit: SIGNAL challenges (thirteen models in five modes; every start fails and every recipe passes as the reference QA logged) | unit | PASS | 131/131 | 0.6 |  |
| unit: SIGNAL boss levels (all twelve clear on the intended run; every wrong tap, call, question, scope, design or estimate ends it) | unit | PASS | 30/30 | 0.4 |  |
| unit: SIGNAL Mission Control (points, the ladder, domain levels, crew trust, the systems map) | unit | PASS | 6/6 | 0.2 |  |
| unit: SIGNAL result pop-ups (each gate cleared, the chapter complete, the quest objective and rating) | unit | PASS | 5/5 | 0.2 |  |
| unit: SIGNAL mentor channel, built-in answers (the twenty prepared answers and seven suggestions) | unit | PASS | 3/3 | 0.2 |  |
| unit: Lite studio model (geometry with provenance, recipe, prediction, corrections, variants) | unit | PASS | 5/5 | 0.2 |  |
| unit: Design a Space concept (fixes, rehearsal, identity across versions, import guard) | unit | PASS | 4/4 | 0.2 |  |
| unit: Scouter standard kits (propose, review by another role, publish, stale, adopt) | unit | PASS | 3/3 | 0.2 |  |
| unit: Build a Room edits (move, duplicate, swap within a group, retire a connection, compare revisions) | unit | PASS | 8/8 | 0.2 |  |
| unit: Build a Room commissioning workbook (a valid zip, seven sheets, formulas with cached counts, formula text kept as text) | unit | PASS | 3/3 | 0.2 |  |
| unit: the five axes of the Experience Language (condition, provenance, confidence, workflow, maturity) | unit | PASS | 4/4 | 0.3 |  |
| unit: Drawing Intelligence display viewing analysis (ST-VID-02 arithmetic, candidate sizes, provenance of every input) | unit | PASS | 3/3 | 0.1 |  |
| unit: SIGNAL glossary terms in the story (first use per chapter, the reference’s expressions) | unit | PASS | 4/4 | 0.2 |  |
| unit: Engineering Manual (chapters, rules, workflow, exceptions) | unit | PASS | 10/10 | 0.8 |  |
| unit: generated documents are current (estate manifests, product census, workflow matrix) | unit | PASS | 4/4 | 1.6 |  |
| unit: search that reads the sentence (corrections, conditions, counted answers, drop one condition; every count recomputed from the records) | unit | PASS | 13/13 | 0.8 |  |
| unit: request portal (the proposal is the design engine's output; sending, refusals, following; who may ask) | unit | PASS | 10/10 | 0.4 |  |
| unit: in this room (equipment, history, what a symptom points at, safe guidance, outcomes written to ServiceHands and the room; who may) | unit | PASS | 12/12 | 0.8 |  |
| unit: room control (panel generated from each room record; no impossible state in 18,000 random presses; commands, simulated adapter, authority, ledger) | unit | PASS | 8/8 | 0.9 |  |
| unit: Site Champion (the permission model over every legacy table and registered surface; four governed actions, site scope, sixteen-role matrix, ledger) | unit | PASS | 9/9 | 0.7 |  |
| unit: connect (people directory and site champions from the estate; verified app-jump formats and encoding; schedule-aware proposals across time zones in thousands of random cases; confirm re-checks and is idempotent; one adapter contract over the simulated calendar and the mock-tested Graph adapter; who may) | unit | PASS | 33/33 | 15 |  |
| unit: room guides ("How do I use this room?" generated for all 90 rooms: no sentence names equipment a room lacks; sections follow the panel; nothing unsafe) | unit | PASS | 6/6 | 0.8 |  |
| unit: Phase 5 documentation in the demonstration (profiles for all 90 rooms; the tracked room agrees with its dossier; sixteen-role matrix; the dossier’s gate; captures committed once) | unit | PASS | 6/6 | 0.8 |  |
| unit: Site Champion’s first weeks (lessons never say to open, unplug or climb; the check is marked in the store and needs the safety answer; the list is read from the record; champion only) | unit | PASS | 8/8 | 0.3 |  |
| unit: Microsoft Graph document source, MOCK-TESTED (same index as the simulated library after every change; folder rename and revocation found without the feed; no link off Graph followed; token never sent to a download; nothing outside the selection asked for) | unit | PASS | 11/11 | 0.3 |  |
| unit: IT Onboarding Success Guide (covers the founder’s list; holds no tenant detail; personalised only from records; each item done by whoever it names; checks marked in the store; milestones derived; progress shown only to the starter, manager and, in part, mentor; revisions kept) | unit | PASS | 10/10 | 0.3 |  |
| unit: Instant Room rules (guided shots and their safety wording; a photograph judged by arithmetic; coverage; measurements; differences from the record as questions; a plan only when enough was captured, with every guess listed) | unit | PASS | 9/9 | 0.3 |  |
| unit: Drawing Intelligence, reading and reviewing (six classes of knowing; no scale claimed from too little; overlaps and contradictions raised with both sources kept; untrusted input; the commissioning engine’s own rules as the standards review; revision diff) | unit | PASS | 10/10 | 0.3 |  |
| unit: End User Success & Training Guide chapters (the founder’s twenty-eight contents each answered; no organisation, person or room named; nothing unsafe; no step-by-step for another company’s application; every link a registered page) | unit | PASS | 5/5 | 0.3 |  |
| unit: Harmony tool registry (asking does not grant; answers carry sources; steps are prepared, never taken; no link a role cannot open; sixteen roles) | unit | PASS | 8/8 | 1.4 |  |
| unit: knowledge contract (five trust zones; no cross-tenant read in 20,000 random cases; promotion and sharing need a named person and consent; source hierarchy; freshness) | unit | PASS | 12/12 | 0.2 |  |
| unit: knowledge ledger and governed ingestion (every object well-formed and its worked examples recomputed; isolation over all objects, both customers and every role; sync engine equals a fresh import over random sequences; untrusted documents; promotion and sharing refusals) | unit | PASS | 13/13 | 10.5 |  |
| unit: video QA (narration words, sync, captions, picture; the Film 13 scene record is what its measurements say) | unit | PASS | 8/8 | 0.2 |  |
| unit: role start pages and keyboard shortcuts (16 roles against the real policy and records; every link opens for its role) | unit | PASS | 19/19 | 1.5 |  |
| unit: offline worker and its build step (atomic install, shells kept across builds, network-first with fallback, ranged answers, packs) | unit | PASS | 17/17 | 0.3 |  |
| unit: game day state machine (phases, faults on estate records, holds, independent verification, public view) | unit | PASS | 11/11 | 0.2 |  |
| unit: the critical signal (chain generated from estate records; simulated, inferred and known observations; the procedure for the isolated hop, for every hop; who may; engine invariants over 16,000 random actions; ledger) | unit | PASS | 22/22 | 1.2 |  |
| unit: demo core screens (health, spine, campus aggregates) | unit | PASS | 11/11 | 0.9 |  |
| browser: demo-campus | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-rooms | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-journey | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-room-jumps | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-cx-as-rooms | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-assurance-v253 | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lesson | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-cinematic | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-signal-lite | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-mixlab | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-signal-s1 | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-spatial | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-tabs | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-arrange | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-worlds | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-eye | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-rooms | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-lite-views | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-tours | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-searchbar | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-search-scenarios | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-core | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-proof | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-docs5 | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-guides | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-worlds | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-estate | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-optimizer | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-story | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-gameday | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-play | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-offline | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-rolehome | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-request | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-here | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-control | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-critical-signal | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-champion | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-connect | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-knowledge | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-harmony | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-champion-start | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-onboard | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-instant | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-drawing | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-manual | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-learn | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-boss | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-bench | browser | NOT_RUN | — | — | pass --browser |
| browser: demo-story-more | browser | NOT_RUN | — | — | pass --browser |
| browser: Founder Studio | browser | NOT_RUN | — | — | pass --studio |
| e2e: founder town hall (Founder Edition) | e2e | NOT_RUN | — | — | pass --studio |
| e2e: founder decisions (hosted studio over the API) | e2e | NOT_RUN | — | — | pass --studio |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
| deploy: Render Blueprints (static validation) | deploy | PASS | 23/23 | 0.1 |  |
| deploy: public sites audit (functional, a11y, responsive; no P0/P1) | deploy | NOT_RUN | — | — | pass --browser |
| deploy: public static sites under the declared headers | deploy | NOT_RUN | — | — | pass --browser |
| security: public sites (headers, build chain, servers, dist) | security | FAIL | 9/10 | 5 |  |
| browser: public sites security (CSP in the page, no request leaves, injection, tampering, View-as) | browser | NOT_RUN | — | — | pass --browser |
| browser: website pricing and pilot readiness | browser | NOT_RUN | — | — | pass --browser |
| browser: website first screen (90-1) | browser | NOT_RUN | — | — | pass --browser |
