# Complete experience audit (deliverable A)

Founder's master directive, 20 Nov 2026 (`.local/directives/2026-11-20-0534-founder-master-experience-audit-directive.txt`), with the
founder's note: work against the repository, not only the deployed URLs, and give the most attention to **the campus maps, Search Party
and product-to-product navigation**, then the stadium and expo worlds ("you can click the booth but it does[n't] jump you over to them";
"the campus maps and maps everything in general are a little too sensitive especially for mobile users it's hard to scroll down to the
page").

## Method

- **Repository first.** Every finding below was traced to its code and fixed there; each fix carries a browser test that fails on the old
  build or checks the behaviour the founder described (the test IDs are in UX_UI_DEFECT_REGISTER.md).
- **Real input.** Touch is sent through the browser's own touch pipeline (Chrome DevTools Protocol `Input.dispatchTouchEvent` in a
  phone context with touch and a coarse pointer), mouse and wheel through Playwright; nothing is simulated by calling the page's handlers.
- **Every route.** The demonstration's routes are read from its page registries (`apps/demo/src/registry*.ts`, 143 paths) and each is
  opened at 390 × 844 and 1440 × 900 by `tests/browser/demo-route-sweep.test.mjs` (heading, no error, nothing off the page, no sideways
  scroll). The corporate website's 32 built pages are swept by `scripts/audit/site-audit.mjs` (in-house rules A1–A10; not an axe report).
- **Widths.** The directive's eight widths (320, 360, 390, 430, 768, 1024, 1440, 1920) through `site-audit.mjs --widths=…`; the
  regression keeps its four (320, 390, 768, 1440).
- **What a test cannot judge** (whether something feels right) was looked at in screenshots (RESPONSIVE_VISUAL_EVIDENCE/) and is said as
  such; a passing test is not offered as proof of good UX.

## The flagship interactions inspected

| Interaction | Where | What was looked at | Outcome |
|---|---|---|---|
| Campus map (Empathia Map) | `#/campus`, Lite's landing | one-finger scroll vs. map gestures on a phone, wheel vs. Ctrl-wheel, drag vs. tap, pins and labels at phone widths, full screen, controls inside the window | reworked (SPATIAL_MAP_QA.md) |
| Lite's campus, building, floor, room | `#/lite/...` | the 19 Nov phone readability work; the room and space scenes trapping vertical scroll on a phone | room/space scenes fixed today |
| Expo LIVE | `#/play/expo` | booth tap does not take you there; moving around; phone; full screen; moves without dragging (WCAG 2.2 2.5.7) | reworked |
| Stadium LIVE | `#/play/stadium` | orbit, zoom, phone scroll, full screen, moves without dragging | reworked |
| Campus Life | `#/play/campus` | phone scroll vs. turning, full screen | reworked |
| Search Party | `#/search`, the header bar, `#/find` | the directive's eighteen search cases; keyboard; clear; state kept across products | state kept in the address and on the trail; clear control everywhere |
| Product to product | Search Party → room → Lite → Commissioning → back | the directive's §3 journey | "Your search" on the trail; Back and refresh restore the search |
| Corporate website | apps/website, 32 pages | the eight widths through site-audit; the 19 Nov follow-tab fix | see END_TO_END_TEST_RESULTS.md |

## Corporate website: pages (32)

| Page | Swept by |
|---|---|
| `/` | site-audit (A1–A10), website suites |
| `/about/` | site-audit (A1–A10), website suites |
| `/collabora-sing/` | site-audit (A1–A10), website suites |
| `/contact/` | site-audit (A1–A10), website suites |
| `/experiences/` | site-audit (A1–A10), website suites |
| `/fieldlink/` | site-audit (A1–A10), website suites |
| `/films/` | site-audit (A1–A10), website suites |
| `/founder/` | site-audit (A1–A10), website suites |
| `/how-it-works/` | site-audit (A1–A10), website suites |
| `/intake/` | site-audit (A1–A10), website suites |
| `/legal/` | site-audit (A1–A10), website suites |
| `/pilot-partners/` | site-audit (A1–A10), website suites |
| `/pilots/` | site-audit (A1–A10), website suites |
| `/platform/` | site-audit (A1–A10), website suites |
| `/pricing/` | site-audit (A1–A10), website suites |
| `/pricing/catalogue/` | site-audit (A1–A10), website suites |
| `/privacy/` | site-audit (A1–A10), website suites |
| `/products/` | site-audit (A1–A10), website suites |
| `/products/apex/` | site-audit (A1–A10), website suites |
| `/products/commissioning/` | site-audit (A1–A10), website suites |
| `/products/field-intelligence/` | site-audit (A1–A10), website suites |
| `/products/learn/` | site-audit (A1–A10), website suites |
| `/products/lite/` | site-audit (A1–A10), website suites |
| `/products/mission-control/` | site-audit (A1–A10), website suites |
| `/products/pro/` | site-audit (A1–A10), website suites |
| `/products/search-party/` | site-audit (A1–A10), website suites |
| `/products/servicehands/` | site-audit (A1–A10), website suites |
| `/proof/` | site-audit (A1–A10), website suites |
| `/request-demo/` | site-audit (A1–A10), website suites |
| `/solutions/` | site-audit (A1–A10), website suites |
| `/technology/` | site-audit (A1–A10), website suites |
| `/trust/` | site-audit (A1–A10), website suites |

Browser suites on the website: website, website-fieldlink, website-fold, website-follow, website-opening, website-pilot, website-pricing.

## Demonstration: routes (143), by product

"Pressed by" lists the browser suites whose addresses match the route (a suite may also reach it by clicking). Every route is also opened by `demo-route-sweep`.

### Pro (25)

| Route | Page | Pressed by |
|---|---|---|
| `#/budget` | Budgeting | demo-champion |
| `#/compare` | Core Compare | demo-parity-areas |
| `#/decisions` | Decision Memory | demo-decisions, demo-destructive |
| `#/exports` | Reports and exports | demo-parity-areas |
| `#/gameday` | Game day | demo-critical-signal, demo-gameday, demo-offline |
| `#/gameday/incident/:fault` | Game-day incident | demo-boundaries, demo-critical-signal |
| `#/intake` | Intake | demo-request, demo-viewas |
| `#/intake/new` | New request | demo-request |
| `#/optimizer/:world` | Space Optimizer | demo-optimizer |
| `#/pro` | Pro command center | demo-drill |
| `#/pro/assets` | Asset Intelligence | demo-map |
| `#/pro/eng` | Standards and Engineering | demo-manual |
| `#/pro/issues` | Issue Intelligence | demo-access, demo-champion, demo-map, demo-welcome |
| `#/pro/ops` | Operations Hub | demo-connect |
| `#/pro/registry` | The registers | — (route sweep only) |
| `#/projects` | Project portfolio | enterprise-web |
| `#/request` | Intake | demo-champion, demo-field-ux, demo-request, demo-training-isolation +2 |
| `#/request/help` | How requests work | — (route sweep only) |
| `#/request/new` | New request | demo-request |
| `#/request/queue` | Requests to triage | demo-request |
| `#/request/spaces` | My spaces | — (route sweep only) |
| `#/requests` | My requests | demo-request, enterprise-web |
| `#/requests/:id` | Request | demo-request |
| `#/v25/decisions` | Decision desk | demo-decisions, demo-destructive, demo-hardening, public-security |
| `#/v25/exec` | Executive | demo, site-audit |

### Lite (24)

| Route | Page | Pressed by |
|---|---|---|
| `#/builder` | Room Builder | demo-champion, demo-connect |
| `#/campus` | Campus | demo-campus, demo-core, demo-estate, demo-gestures +6 |
| `#/campus/:building` | Building | demo-access, demo-boundaries, demo-campus, demo-core +6 |
| `#/campus/:building/:floor/:room` | Room | demo-campus, demo-knowledge, demo-lite-spatial, demo-request +2 |
| `#/campus/scouter` | Scouter | demo-access, demo-boundaries, demo-manual, demo-phoneshell +3 |
| `#/control` | Empathia Control | demo-control, demo-fieldtools, demo-guides, demo-here +1 |
| `#/estate/:world` | Estate | demo-critical-signal, demo-estate, demo-offline |
| `#/gate` | Welcome | demo-parity-areas |
| `#/guide` | How do I use this room? | demo-guides |
| `#/here` | In this room | demo-champion, demo-connect, demo-control, demo-guides +2 |
| `#/install/redline` | Field record and redlines | demo-field-redline, demo-field-ux |
| `#/instant` | Instant Room | demo-instant |
| `#/lite` | Empathia Lite | demo-champion, demo-estate, demo-lite, demo-lite-spatial +6 |
| `#/qr` | QR launch center | — (route sweep only) |
| `#/room` | Room | demo-connect, demo-control, demo-core, demo-here +1 |
| `#/rooms` | Rooms | demo-campus, demo-map, enterprise-web |
| `#/scan` | QR Hub | demo-here, demo-proof |
| `#/scheduler` | Room scheduler | demo-parity-areas |
| `#/scouter/anatomy` | Scouter anatomy | demo-lite |
| `#/site` | My site | demo-champion, demo-connect, demo-docs5, demo-knowledge |
| `#/site/start` | Getting started | demo-champion-start, demo-harmony |
| `#/studio` | Design a Space | demo-parity-areas |
| `#/v25/build` | Build a Room | demo, demo-rolemotion, site-audit |
| `#/v25/lite` | Lite studio | demo-lite |

### Commissioning & Assurance (23)

| Route | Page | Pressed by |
|---|---|---|
| `#/assurance` | Assurance | demo-assurance-v253, demo-drill, demo-manual, demo-offline |
| `#/assurance/:view` | Assurance | demo-assurance-v253 |
| `#/assurance/analysis` | Assurance analysis | — (route sweep only) |
| `#/assurance/change` | Change impact | demo-assurance-v253 |
| `#/assurance/ready` | Ready checks | demo-assurance-v253 |
| `#/assurance/room/:room` | Room assurance | demo-cx-as-rooms, demo-exports, demo-map |
| `#/assurance/signals` | Signals | demo-assurance-v253 |
| `#/commissioning` | Commissioning | demo-champion, demo-connect, demo-drill, demo-exports +5 |
| `#/commissioning/analytics` | Commissioning analytics | demo-cx-analytics |
| `#/commissioning/deficiencies` | Deficiencies | demo-assurance-v253, demo-deficiencies, demo-field-ux, demo-vertical-slice |
| `#/commissioning/instruments/reverb` | Reverberation instrument | demo-field-ux, demo-reverb |
| `#/commissioning/instruments/sti` | Speech intelligibility (STI) | demo-field-ux, demo-sti |
| `#/commissioning/room/:room` | Commissioning record | demo-asset-life, demo-cx-as-rooms, demo-exports, demo-field-ux +3 |
| `#/commissioning/scenarios` | Commissioning journeys | demo-scenarios |
| `#/connected` | One room, end to end, on the server | demo-connected, demo-flagship |
| `#/docs` | Documentation | demo-docs5 |
| `#/dossier` | Commissioning dossier | demo-docs5, demo-proof |
| `#/drawings` | Drawing Intelligence | demo-drawing, demo-manual |
| `#/engineer` | Engineer start | demo-engineer-start, demo-field-ux |
| `#/flagship` | The flagship room: Lecture Theatre SCI-110 | demo-connected, demo-flagship |
| `#/pro/refresh` | Refresh planning | demo-refresh |
| `#/thread` | One room, end to end | demo-connected, demo-field-ux, demo-vertical-slice |
| `#/v25/asset` | Asset life | demo-asset-life, demo-field-ux |

### Shell (home, access, tours) (17)

| Route | Page | Pressed by |
|---|---|---|
| `#/access` | Access policy | — (route sweep only) |
| `#/design/axes` | Five axes | demo-access |
| `#/find` | Search results | demo-search-journey, demo-search-parity, demo-searchbar, demo-searchparty-bar +2 |
| `#/hardening` | Resilience | demo-hardening |
| `#/investor` | Investor start | demo, demo-access, demo-champion, demo-coach +17 |
| `#/offline` | Offline and this device | demo-offline |
| `#/parity` | Every V2.5.3 address | demo-parity-areas |
| `#/play/campus` | Campus Life | demo-campus-life, demo-gestures, demo-welcome, site-audit |
| `#/play/expo` | Expo LIVE | demo-expo-live, demo-gestures, demo-welcome, site-audit |
| `#/play/stadium` | Stadium LIVE | demo-gestures, demo-stadium-live, demo-welcome, site-audit |
| `#/proof` | Proof Center | demo-proof |
| `#/tours` | Guided tours | demo-tours, public-security |
| `#/v25/policy` | Policy | demo, site-audit |
| `#/v25/walkthrough` | Walkthrough | — (route sweep only) |
| `#/world/:world` | World | demo-estate, demo-gameday, demo-worlds |
| `#/world/:world/:journey` | World journey | demo-critical-signal, demo-worlds |
| `#/worlds` | Choose a world | demo-offline, demo-worlds |

### Learn (16)

| Route | Page | Pressed by |
|---|---|---|
| `#/film/:chapter` | SIGNAL film | demo-signal-film |
| `#/labs/light` | Light the Stage | demo-mixlab, demo-training-isolation |
| `#/labs/mix` | Mix the Stream | demo-mixlab, demo-training-isolation |
| `#/labs/video` | Shoot the Service | demo-mixlab, demo-training-isolation |
| `#/learn/certifications` | Certifications: CTS, CTS-D, CTS-I | demo-certs |
| `#/learn/cts` | CTS study space | — (route sweep only) |
| `#/learn/cts-d` | CTS-D study space | — (route sweep only) |
| `#/learn/cts-i` | CTS-I study space | — (route sweep only) |
| `#/learn/labs` | Learn labs | demo-destructive, demo-hardening, demo-mixlab, demo-training-isolation +1 |
| `#/learn/lesson` | Equipment lesson | — (route sweep only) |
| `#/lessons` | Lessons learned | — (route sweep only) |
| `#/manual` | AV Engineering Standards & Design Manual | demo-manual |
| `#/onboard` | IT Onboarding Success Guide | demo-onboard |
| `#/play/:chapter` | SIGNAL played | demo-campus-life, demo-expo-live, demo-gestures, demo-offline +5 |
| `#/story` | SIGNAL story | demo-manual, demo-mixlab, demo-offline, demo-quizlib +5 |
| `#/v25/learn` | V2.5 Learn | demo, demo-exports, demo-manual, demo-workflows +1 |

### Search Party (10)

| Route | Page | Pressed by |
|---|---|---|
| `#/ask` | Ask Empathia | demo-connect, demo-knowledge, demo-parity-areas |
| `#/investigate` | Investigate | demo-parity-areas |
| `#/knowledge` | Knowledge Ledger | demo-knowledge, demo-manual, demo-training-isolation |
| `#/knowledge/sources` | Document sources | demo-knowledge |
| `#/list` | Core model | demo-parity-areas |
| `#/meet` | Schedule a meeting | demo-connect |
| `#/people` | People | demo-connect, demo-guides, demo-harmony, demo-map |
| `#/search` | Search Party | demo, demo-access, demo-champion, demo-connect +18 |
| `#/search/scenarios` | Search Party scenarios | demo-search-scenarios |
| `#/set` | The records behind a number | demo-parity-areas |

### Mission Control (10)

| Route | Page | Pressed by |
|---|---|---|
| `#/control/tower` | Control Tower | demo-parity-areas |
| `#/fabric` | Integration Fabric | demo-parity-areas |
| `#/harmony` | Harmony | demo-harmony |
| `#/home` | Mission Control | demo-champion, demo-connect, demo-core, demo-here +8 |
| `#/ledger` | Evidence ledger | demo-champion, demo-harmony, demo-parity-areas |
| `#/platforms` | Platform jumps | demo-connected, demo-flagship |
| `#/replay` | Core Replay | demo-hardening, demo-replay, public-security |
| `#/reports/server` | Reports from the server | demo-connected, demo-flagship |
| `#/v25` | Mission Control | demo, demo-offline, site-audit |
| `#/v25/ledger` | Ledger | demo, demo-critical-signal, site-audit |

### ServiceHands (10)

| Route | Page | Pressed by |
|---|---|---|
| `#/handoff` | Handoff chain | — (route sweep only) |
| `#/install` | Installation | — (route sweep only) |
| `#/service` | Dispatch board | demo-champion, demo-destructive, demo-dispatch, demo-hardening +2 |
| `#/service/fixes` | Known Fix library | — (route sweep only) |
| `#/servicehands` | ServiceHands workspace | demo-champion, demo-connect, demo-destructive, demo-enquiry +4 |
| `#/servicehands/new` | Report a problem | demo-champion, demo-map, demo-offline, demo-return-trail +1 |
| `#/servicehands/queue` | ServiceHands on the server | demo-connected, demo-flagship |
| `#/v25/people` | People intelligence | demo-people |
| `#/v25/service` | ServiceHands | demo, demo-exports, demo-field-ux, demo-flagship +9 |
| `#/v25/service/analytics` | Service analytics | demo-asset-life, demo-mission-work, demo-service-analytics |

### Field Intelligence (7)

| Route | Page | Pressed by |
|---|---|---|
| `#/agent` | Room Health Check | demo-parity-areas |
| `#/agent/architecture` | Agent architecture | demo-parity-areas |
| `#/field-tools` | Field Tools | demo-fieldtools |
| `#/v14` | V1.4 foundation | demo-parity-areas |
| `#/v25/fi` | Field Intelligence | demo, demo-fi-scan, demo-manual, demo-workflows +1 |
| `#/v25/fi/scan` | Field Intelligence scan | demo-fi-scan, public-security |
| `#/v25/fipv` | Physical Validation | demo, site-audit |

### APEX (1)

| Route | Page | Pressed by |
|---|---|---|
| `#/v25/apex` | APEX | demo, demo-assurance-v253, demo-exports, demo-vertical-slice +2 |
