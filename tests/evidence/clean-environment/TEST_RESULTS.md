# Test results

Run 2026-10-26T13:24:23.740Z on Node v22.22.0. PASS 15 · FAIL 0 · NOT_RUN 3 suites.

| Suite | Kind | Result | Passed / tests | Seconds | Why not run |
|---|---|---|---|---|---|
| unit: packages/commissioning-engine | unit | PASS | 128/128 | 0.9 |  |
| unit: packages/event-contracts | unit | PASS | 3/3 | 0.2 |  |
| unit: packages/relationship-engine | unit | PASS | 5/5 | 0.1 |  |
| unit: packages/assurance-engine | unit | PASS | 13/13 | 0.3 |  |
| unit: packages/api-client | unit | PASS | 5/5 | 0.2 |  |
| unit: packages/schemas | unit | PASS | 3/3 | 0.2 |  |
| unit: integrations/contracts | unit | PASS | 7/7 | 0.2 |  |
| unit: integrations/mocks | unit | PASS | 5/5 | 0.2 |  |
| unit: ml research prototype (python) | unit | PASS | 5/5 | 57.1 |  |
| service: intelligence-python | integration | PASS | 4/4 | 0.8 |  |
| integration: api.test.mjs | integration | PASS | 20/20 | 7 |  |
| integration: api-client.test.mjs | integration | PASS | 3/3 | 3 |  |
| integration: integration-worker.test.mjs | integration | PASS | 1/1 | 2.5 |  |
| security: authz.test.mjs | security | PASS | 45/45 | 5.9 |  |
| browser: enterprise web E2E | e2e | PASS | 21/21 | 7 |  |
| browser: Founder Studio | browser | NOT_RUN | — | — | pass --studio |
| e2e: founder town hall (Founder Edition) | e2e | NOT_RUN | — | — | pass --studio |
| media: full decode of every curated film | media | NOT_RUN | — | — | pass --films (slow: decodes ~47 minutes of video) |
