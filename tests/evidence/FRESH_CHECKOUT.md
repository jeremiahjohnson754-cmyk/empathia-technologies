# Fresh-checkout validation (P7)

Commit `3c78b991030ac221dbe6991cd15a861f534c56d3`, cloned into an empty directory, toolchain linked by `scripts/bootstrap.mjs`, its own database cluster (port 55433), `node scripts/build.mjs`, `node scripts/test.mjs --browser --studio`. Run 2026-10-31T16:59:19.063Z, 52 s.

**Verdict: NOT_RUN: the fresh build did not reach the test stage (see steps)**

| Step | Exit | Seconds |
|---|---|---|
| clone | 0 | 13.5 |
| bootstrap | 0 | 0 |
| database | 0 | 1.1 |
| build | 1 | 37 |

The fresh copy did not reach the test stage.

| Suite | Fresh copy | Workspace |
|---|---|---|
| unit: packages/commissioning-engine | absent | PASS 128/128 |
| unit: packages/event-contracts | absent | PASS 3/3 |
| unit: packages/relationship-engine | absent | PASS 5/5 |
| unit: packages/search-party | absent | PASS 5/5 |
| unit: packages/project-governance | absent | PASS 9/9 |
| unit: packages/service-engine | absent | PASS 5/5 |
| unit: packages/apex-engine | absent | PASS 4/4 |
| unit: packages/kpi-engine | absent | PASS 4/4 |
| unit: packages/field-intelligence | absent | PASS 4/4 |
| unit: packages/assurance-engine | absent | PASS 13/13 |
| unit: packages/observability | absent | PASS 10/10 |
| unit: packages/api-client | absent | PASS 5/5 |
| unit: packages/schemas | absent | PASS 3/3 |
| unit: integrations/contracts | absent | PASS 7/7 |
| unit: integrations/mocks | absent | PASS 5/5 |
| unit: ml research prototype (python) | absent | PASS 5/5 |
| service: intelligence-python | absent | PASS 4/4 |
| integration: api.test.mjs | absent | PASS 22/22 |
| integration: leads.test.mjs | absent | PASS 5/5 |
| integration: api-client.test.mjs | absent | PASS 3/3 |
| integration: integration-worker.test.mjs | absent | PASS 1/1 |
| integration: observability.test.mjs | absent | PASS 5/5 |
| security: authz.test.mjs | absent | PASS 45/45 |
| security: founder-boundary.test.mjs | absent | PASS 6/6 |
| security: site-scope.test.mjs | absent | PASS 3/3 |
| security: authority-matrix.test.mjs | absent | PASS 2/2 |
| security: governance.test.mjs | absent | PASS 9/9 |
| security: administration.test.mjs | absent | PASS 5/5 |
| security: search-party.test.mjs | absent | PASS 7/7 |
| security: oidc.test.mjs | absent | PASS 4/4 |
| security: project-lifecycle.test.mjs | absent | PASS 16/16 |
| security: service-lifecycle.test.mjs | absent | PASS 11/11 |
| security: apex.test.mjs | absent | PASS 5/5 |
| security: field-intelligence.test.mjs | absent | PASS 6/6 |
| security: learn.test.mjs | absent | PASS 4/4 |
| security: mission-control.test.mjs | absent | PASS 8/8 |
| security: competency.test.mjs | absent | PASS 6/6 |
| security: ledger.test.mjs | absent | PASS 5/5 |
| security: measurement-import.test.mjs | absent | PASS 4/4 |
| security: hardening.test.mjs | absent | PASS 3/3 |
| e2e: website lead form over the API | absent | PASS 6/6 |
| browser: enterprise web E2E | absent | PASS 88/88 |
| browser: public website | absent | PASS 32/32 |
| browser: investor demo shell | absent | PASS 101/101 |
| browser: Founder Studio | absent | PASS 19/19 |
| e2e: founder town hall (Founder Edition) | absent | PASS 25/25 |
| e2e: founder decisions (hosted studio over the API) | absent | PASS 9/9 |
| media: full decode of every curated film | absent | NOT_RUN / |
