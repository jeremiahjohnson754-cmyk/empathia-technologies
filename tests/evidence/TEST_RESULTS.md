# Test results

Run 2026-10-31T21:34:34.429Z on Node v22.22.0. PASS 50 · FAIL 0 · NOT_RUN 1 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 128/128 | 0.5 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/search-party | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/project-governance | unit | PASS | 9/9 | 0.1 |  |
| unit: packages/service-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/apex-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/kpi-engine | unit | PASS | 4/4 | 0.4 |  |
| unit: packages/field-intelligence | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 13/13 | 0.1 |  |
| unit: packages/observability | unit | PASS | 10/10 | 0.4 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 7 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.8 |  |
| integration: api.test.mjs | integration | PASS | 22/22 | 12.7 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 2.3 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 2.1 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 1.9 |  |
| integration: observability.test.mjs | integration | PASS | 5/5 | 1.9 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 4.3 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 2.5 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 3.1 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 9.9 |  |
| security: governance.test.mjs | security | PASS | 9/9 | 5.8 |  |
| security: administration.test.mjs | security | PASS | 5/5 | 2.8 |  |
| security: search-party.test.mjs | security | PASS | 7/7 | 3.1 |  |
| security: oidc.test.mjs | security | PASS | 4/4 | 2 |  |
| security: project-lifecycle.test.mjs | security | PASS | 16/16 | 7.3 |  |
| security: service-lifecycle.test.mjs | security | PASS | 11/11 | 3.8 |  |
| security: apex.test.mjs | security | PASS | 5/5 | 3.4 |  |
| security: field-intelligence.test.mjs | security | PASS | 6/6 | 3.2 |  |
| security: learn.test.mjs | security | PASS | 4/4 | 2.8 |  |
| security: mission-control.test.mjs | security | PASS | 8/8 | 3.2 |  |
| security: competency.test.mjs | security | PASS | 6/6 | 4.1 |  |
| security: ledger.test.mjs | security | PASS | 5/5 | 2.8 |  |
| security: measurement-import.test.mjs | security | PASS | 4/4 | 2.6 |  |
| security: hardening.test.mjs | security | PASS | 6/6 | 4.3 |  |
| e2e: website lead form over the API | e2e | PASS | 6/6 | 7.7 |  |
| browser: enterprise web E2E | e2e | PASS | 88/88 | 30.7 |  |
| browser: public website | browser | PASS | 54/54 | 13 |  |
| browser: investor demo shell | browser | PASS | 101/101 | 97.4 |  |
| browser: Founder Studio | browser | PASS | 19/19 | 39.6 |  |
| e2e: founder town hall (Founder Edition) | e2e | PASS | 25/25 | 49.1 |  |
| e2e: founder decisions (hosted studio over the API) | e2e | PASS | 9/9 | 6.8 |  |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
| deploy: Render Blueprints (static validation) | deploy | PASS | 23/23 | 0.1 |  |
| deploy: public sites audit (functional, a11y, responsive; no P0/P1) | deploy | PASS | 152/152 | 157 |  |
| deploy: public static sites under the declared headers | deploy | PASS | 17/17 | 10.4 |  |
