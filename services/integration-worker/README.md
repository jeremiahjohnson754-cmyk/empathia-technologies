# services/integration-worker

A second process of the enterprise API's modular monolith that runs integration syncs on a schedule (every 5 minutes; `--once` for one
round). The rules live in `services/enterprise-api/src/integrations/sync.ts` and the Harmony engine in `integrations/contracts`; this
folder only schedules them and gives them a service identity.

* Runs only the adapters this build has code for (`RUNNABLE`: three local MOCK adapters). Catalogue entries are CONTRACT_ONLY: nothing runs.
* Acts as a named account authorized like a person (needs `adapter.allowlist` or `policy.configure`); development uses the seeded security
  administrator, production a dedicated non-human account.
* Writes observations labelled `SYNTHETIC_MOCK` (the database refuses anything else from a non-VERIFIED source) and sync health; emits
  `integration.adapter_health_changed` and `integration.connector_stale` through the outbox.

`node services/integration-worker/main.mjs --once` · test: `node --test tests/integration/integration-worker.test.mjs`
