# Claude + Fable seven-day execution board (23–29 Nov 2026)

Each line is DONE (with its evidence), IN PROGRESS, or TO DO. A line is DONE only when a test or a captured screen shows it.

## Day 1 — Mon 23 Nov

| Item | State | Evidence |
|---|---|---|
| Confirm repository, branch, deployed commits for both Next sites | DONE | docs/audit/CURRENT_TRUTH.md |
| Live browser audit of both sites, 390 and 1440 px, 124 checks | DONE | docs/audit/e3-day1/LIVE_AUDIT.json, live-*-home-*.jpg |
| Baseline build and non-browser suites at 1bc57f91 | DONE: 154 pass, 0 fail | .local/logs/e3-day1-baseline-*.log (local) |
| Full exact-commit regression | NOT RUN (last: fe30ba9d, 287/0/2) | — |
| Inspect `restoration/sprint-0-1` | DONE: already merged into HEAD | CURRENT_TRUTH.md |
| Cross-site context: website `/voice` opens the same room's CallPath with the way back | DONE | launch-intents suite; demo-voice VC-15 |
| VOICE corporate page and products section | DONE | website suite 272/272; website-voice-*.jpg |
| VOICE demonstrator: overview, CallPath, report; three cases; perspectives; refusal | DONE | voice.test 9/9; demo-voice 30/30; voice-*.jpg |
| Responsive shared shell improvement | NOT DONE today. The audit found no shell defect at 390/1440; the open mobile item is the CallPath table (P0 list, 5) | — |
| Kickoff audit, VOICE blueprint, decisions, this board | DONE | docs/ |
| Deliverables of Directive 0.6 not yet written: DEPLOYED_VS_REPO_VS_HISTORICAL, PARITY_LEDGER.csv, MEDIA_AND_RIGHTS, ROUTE_INVENTORY.csv | TO DO (Day 2) | — |
| Fable track (shell and IA prototype, tokens) | NOT STARTED: no Fable design session has run; today's pages reuse the existing component kit | — |

Suites run after the change: voice 9/9; launch-intents and demo-policy 19/19; all non-browser suites 155/0; demo-voice 30/30; website
272/272; website-follow 19/19; website-fold 37/37; demo 110/110; demo-access 31/31; demo-route-sweep 145/145; demo-phoneshell 49/49;
demo-launch 13/13; demo-searchbar 120/120.

## Day 2 — Tue 24 Nov (next)

1. Founder decision E3-D1, then the product menus and the platform page for the eight modules.
2. Shared room and endpoint passport section for VOICE on the room page; technician site scope; second site in the fixture for a cross-site refusal.
3. Phone layout of the CallPath sample table (cards instead of a wide table).
4. Module pages with fixtures on the estate: FLOW (J6A) first, because J6B step 4 links to it.
5. The four missing audit files; route inventory generated from the registry.
6. Exact-commit regression of the day's last commit; staging only with approval (E3-D4).

## Days 3–7

As the directive's day plan: Day 3 golden engineering journey (J2–J5) connected on one fixture; Day 4 J6B steps 5–6, FLOW, PRISM,
SENTINEL, ACCORD, MissionProof, OMNIPRESENCE; Day 5 corporate site, Learn/media check, OpenAPI/SDK/event contracts, methods register,
90–105-day board; Day 6 QA, security, negatives, widths, repair; Day 7 release candidate and handoff.
