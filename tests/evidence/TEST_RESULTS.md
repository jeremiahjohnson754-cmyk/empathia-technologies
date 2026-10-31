# Test results

Run 2026-10-31T10:45:46.583Z on Node v22.22.0. PASS 36 · FAIL 0 · NOT_RUN 1 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 128/128 | 0.6 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/search-party | unit | PASS | 5/5 | 0.2 |  |
| unit: packages/project-governance | unit | PASS | 9/9 | 0.1 |  |
| unit: packages/service-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/apex-engine | unit | PASS | 4/4 | 0.1 |  |
| unit: packages/kpi-engine | unit | PASS | 4/4 | 0.2 |  |
| unit: packages/field-intelligence | unit | PASS | 4/4 | 0.2 |  |
| unit: packages/assurance-engine | unit | PASS | 13/13 | 0.1 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.2 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 6.9 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.8 |  |
| integration: api.test.mjs | integration | PASS | 20/20 | 4.9 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 2.2 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 2.2 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 2.3 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 5.1 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 2.5 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 3.1 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 8.1 |  |
| security: governance.test.mjs | security | PASS | 9/9 | 6.5 |  |
| security: administration.test.mjs | security | PASS | 5/5 | 2.9 |  |
| security: search-party.test.mjs | security | PASS | 6/6 | 3 |  |
| security: oidc.test.mjs | security | PASS | 4/4 | 2.3 |  |
| security: project-lifecycle.test.mjs | security | PASS | 13/13 | 8.1 |  |
| e2e: website lead form over the API | e2e | PASS | 6/6 | 4.9 |  |
| browser: enterprise web E2E | e2e | PASS | 53/53 | 19.1 |  |
| browser: public website | browser | PASS | 32/32 | 8.2 |  |
| browser: investor demo shell | browser | PASS | 101/101 | 98.5 |  |
| browser: Founder Studio | browser | PASS | 19/19 | 44.1 |  |
| e2e: founder town hall (Founder Edition) | e2e | PASS | 25/25 | 51.4 |  |
| e2e: founder decisions (hosted studio over the API) | e2e | PASS | 9/9 | 7.1 |  |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
