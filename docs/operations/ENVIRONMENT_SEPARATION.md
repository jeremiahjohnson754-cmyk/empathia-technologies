# Environment separation

| Environment | Exists | Data | Identity | Notes |
|---|---|---|---|---|
| Local development | yes | synthetic seed only | dev IdP, documented password | `scripts/dev.mjs`; everything on 127.0.0.1 |
| Automated test | yes | per-suite scratch databases created and dropped by `tests/integration/harness.mjs` | dev IdP | `NODE_ENV=test` |
| Shared staging | no | synthetic or anonymised | customer-like OIDC test tenant | to create; same images as production |
| Production | no | customer data | customer OIDC | `NODE_ENV=production` refuses dev sign-in, missing secrets and the synthetic seed (`config.ts:35-43`, `db/seed.ts`) |

Rules: one database per environment with its own roles and passwords; no production data copied into lower environments (person
records, audit actors and evidence can be personal data — hashing alone does not make them anonymous); separate secrets per environment;
the integration catalogue's MOCK adapters must not be enabled in production; a VERIFIED adapter is verified per environment.
