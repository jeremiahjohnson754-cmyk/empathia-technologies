# Test results

Run 2026-10-30T16:43:09.737Z on Node v22.22.0. PASS 16 · FAIL 0 · NOT_RUN 4 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 128/128 | 0.5 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 13/13 | 0.1 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 4.7 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.5 |  |
| integration: api.test.mjs | integration | PASS | 20/20 | 3.4 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 1.5 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 1.7 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 3.3 |  |
| browser: enterprise web E2E | e2e | NOT_RUN | — | — | pass --browser |
| browser: public website | browser | NOT_RUN | — | — | pass --browser |
| browser: investor demo shell | browser | NOT_RUN | — | — | pass --browser |
| browser: Founder Studio | browser | PASS | 19/19 | 36.2 |  |
| e2e: founder town hall (Founder Edition) | e2e | PASS | 25/25 | 47.3 |  |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
