# Test results

Run 2026-10-30T17:14:12.124Z on Node v22.22.0. PASS 22 · FAIL 0 · NOT_RUN 4 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 128/128 | 0.6 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 13/13 | 0.1 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 4.9 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.5 |  |
| integration: api.test.mjs | integration | PASS | 20/20 | 3.9 |  |
| integration: leads.test.mjs | integration | PASS | 5/5 | 1.5 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 1.6 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 2 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 3.7 |  |
| security: founder-boundary.test.mjs | security | PASS | 6/6 | 1.8 |  |
| security: site-scope.test.mjs | security | PASS | 3/3 | 2.2 |  |
| security: authority-matrix.test.mjs | security | PASS | 2/2 | 4.4 |  |
| e2e: website lead form over the API | e2e | PASS | 6/6 | 3.9 |  |
| browser: enterprise web E2E | e2e | PASS | 21/21 | 4 |  |
| browser: public website | browser | PASS | 32/32 | 6.7 |  |
| browser: investor demo shell | browser | PASS | 11/11 | 13.2 |  |
| browser: Founder Studio | browser | NOT_RUN | — | — | pass --studio |
| e2e: founder town hall (Founder Edition) | e2e | NOT_RUN | — | — | pass --studio |
| e2e: founder decisions (hosted studio over the API) | e2e | NOT_RUN | — | — | pass --studio |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
