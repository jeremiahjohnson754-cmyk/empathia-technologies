# Test results

Run 2026-11-01T03:24:34.013Z on Node v22.22.0. PASS 56 · FAIL 0 · NOT_RUN 1 suites.

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
| unit: packages/field-intelligence | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 18/18 | 0.2 |  |
| unit: packages/observability | unit | PASS | 10/10 | 0.1 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.2 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: apps/demo (story, impact) | unit | PASS | 32/32 | 2.9 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 5.3 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.6 |  |
| integration: api.test.mjs | integration | PASS | 22/22 | 5.1 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 2.1 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 2 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 2.1 |  |
| integration: observability.test.mjs | integration | PASS | 5/5 | 2 |  |
| integration: installation-migration.test.mjs | integration | PASS | 6/6 | 2 |  |
| integration: outbox.test.mjs | integration | PASS | 21/22 | 11.2 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 4.5 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 2.4 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 2.7 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 9.3 |  |
| security: governance.test.mjs | security | PASS | 10/10 | 7.5 |  |
| security: administration.test.mjs | security | PASS | 5/5 | 2.8 |  |
| security: search-party.test.mjs | security | PASS | 7/7 | 3.3 |  |
| security: oidc.test.mjs | security | PASS | 4/4 | 2.4 |  |
| security: project-lifecycle.test.mjs | security | PASS | 16/16 | 8.4 |  |
| security: service-lifecycle.test.mjs | security | PASS | 11/11 | 3.5 |  |
| security: apex.test.mjs | security | PASS | 5/5 | 3.1 |  |
| security: field-intelligence.test.mjs | security | PASS | 6/6 | 3.2 |  |
| security: learn.test.mjs | security | PASS | 4/4 | 3.2 |  |
| security: mission-control.test.mjs | security | PASS | 8/8 | 3.3 |  |
| security: competency.test.mjs | security | PASS | 6/6 | 4.1 |  |
| security: ledger.test.mjs | security | PASS | 5/5 | 2.8 |  |
| security: measurement-import.test.mjs | security | PASS | 4/4 | 2.5 |  |
| security: recommissioning-negative.test.mjs | security | PASS | 16/16 | 10.4 |  |
| security: hardening.test.mjs | security | PASS | 6/6 | 4.2 |  |
| e2e: website lead form over the API | e2e | PASS | 6/6 | 7.8 |  |
| e2e: checkpoint room lifecycle over the API (build → accept → camera swap → requirements → Room Story) | e2e | PASS | 100/100 | 9.6 |  |
| browser: enterprise web E2E | e2e | PASS | 88/88 | 29.4 |  |
| browser: public website | browser | PASS | 114/114 | 21 |  |
| browser: investor demo shell | browser | PASS | 163/163 | 126.6 |  |
| browser: investor demo enquiry links | browser | PASS | 21/21 | 2.7 |  |
| browser: Founder Studio | browser | PASS | 19/19 | 39.7 |  |
| e2e: founder town hall (Founder Edition) | e2e | PASS | 25/25 | 49.5 |  |
| e2e: founder decisions (hosted studio over the API) | e2e | PASS | 9/9 | 7.2 |  |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
| deploy: Render Blueprints (static validation) | deploy | PASS | 23/23 | 0.1 |  |
| deploy: public sites audit (functional, a11y, responsive; no P0/P1) | deploy | PASS | 164/164 | 174.4 |  |
| deploy: public static sites under the declared headers | deploy | PASS | 17/17 | 11 |  |
