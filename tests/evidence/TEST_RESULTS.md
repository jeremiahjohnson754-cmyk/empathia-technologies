# Test results

Run 2026-10-30T16:49:41.640Z on Node v22.22.0. PASS 16 · FAIL 1 · NOT_RUN 3 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 128/128 | 0.4 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.1 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 13/13 | 0.1 |  |
| unit: packages/api-client | unit | FAIL | 4/5 | 0.1 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.1 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.1 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.1 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 4.7 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.6 |  |
| integration: api.test.mjs | integration | PASS | 20/20 | 3.3 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 1.3 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 1.5 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 3 |  |
| browser: enterprise web E2E | e2e | PASS | 21/21 | 3.6 |  |
| browser: public website | browser | PASS | 32/32 | 6.6 |  |
| browser: investor demo shell | browser | PASS | 11/11 | 13.3 |  |
| browser: Founder Studio | browser | NOT_RUN | — | — | pass --studio |
| e2e: founder town hall (Founder Edition) | e2e | NOT_RUN | — | — | pass --studio |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
