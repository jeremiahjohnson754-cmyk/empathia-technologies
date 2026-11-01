# Test results

Run 2026-11-01T00:27:43.746Z on Node v22.22.0. PASS 51 · FAIL 1 · NOT_RUN 1 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 134/134 | 0.6 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/search-party | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/project-governance | unit | PASS | 9/9 | 0.1 |  |
| unit: packages/service-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/apex-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/kpi-engine | unit | PASS | 4/4 | 0.2 |  |
| unit: packages/field-intelligence | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 14/14 | 0.1 |  |
| unit: packages/observability | unit | PASS | 10/10 | 0.2 |  |
| unit: packages/api-client | unit | FAIL | 4/5 | 0.1 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: apps/demo (story, impact) | unit | PASS | 21/21 | 1.2 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 5.5 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.6 |  |
| integration: api.test.mjs | integration | PASS | 22/22 | 4.7 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 2 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 1.8 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 2 |  |
| integration: observability.test.mjs | integration | PASS | 5/5 | 1.9 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 4.4 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 2.1 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 2.7 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 9.3 |  |
| security: governance.test.mjs | security | PASS | 10/10 | 7.1 |  |
| security: administration.test.mjs | security | PASS | 5/5 | 2.7 |  |
| security: search-party.test.mjs | security | PASS | 7/7 | 3 |  |
| security: oidc.test.mjs | security | PASS | 4/4 | 2.1 |  |
| security: project-lifecycle.test.mjs | security | PASS | 16/16 | 7.8 |  |
| security: service-lifecycle.test.mjs | security | PASS | 11/11 | 3.6 |  |
| security: apex.test.mjs | security | PASS | 5/5 | 3.1 |  |
| security: field-intelligence.test.mjs | security | PASS | 6/6 | 3.1 |  |
| security: learn.test.mjs | security | PASS | 4/4 | 3.2 |  |
| security: mission-control.test.mjs | security | PASS | 8/8 | 3.2 |  |
| security: competency.test.mjs | security | PASS | 6/6 | 4.2 |  |
| security: ledger.test.mjs | security | PASS | 5/5 | 2.7 |  |
| security: measurement-import.test.mjs | security | PASS | 4/4 | 2.5 |  |
| security: hardening.test.mjs | security | PASS | 6/6 | 4.1 |  |
| e2e: website lead form over the API | e2e | PASS | 6/6 | 7.7 |  |
| e2e: checkpoint room lifecycle over the API (build → accept → camera swap → requirements → Room Story) | e2e | PASS | 88/88 | 8.7 |  |
| browser: enterprise web E2E | e2e | PASS | 88/88 | 31.2 |  |
| browser: public website | browser | PASS | 54/54 | 14.3 |  |
| browser: investor demo shell | browser | PASS | 138/138 | 115.4 |  |
| browser: Founder Studio | browser | PASS | 19/19 | 41.9 |  |
| e2e: founder town hall (Founder Edition) | e2e | PASS | 25/25 | 51.2 |  |
| e2e: founder decisions (hosted studio over the API) | e2e | PASS | 9/9 | 8.4 |  |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
| deploy: Render Blueprints (static validation) | deploy | PASS | 23/23 | 0.1 |  |
| deploy: public sites audit (functional, a11y, responsive; no P0/P1) | deploy | PASS | 164/164 | 178.4 |  |
| deploy: public static sites under the declared headers | deploy | PASS | 17/17 | 11.4 |  |
