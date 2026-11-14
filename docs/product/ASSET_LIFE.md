# One asset's life, by its asset ID

Founder, 14 Nov 2026: *"asset ID is the most important thing in this so every asset (device) must have a unique one so a replaced device/asset ID must be removed from the asset inventory but the record of that identifier must never be used again but be fully remembered."*

## Two IDs, two jobs

- **Device ID (PA-…)** is a position in the room's design: "camera 1 on the front wall". It stays the same when the unit there is swapped.
- **Asset ID (AS-…)** is the physical unit installed at that position. Every unit has its own asset ID, and no ID is ever issued twice.

## Where it holds

| Layer | What enforces it | Tested by |
|---|---|---|
| Database | `0030_asset_retirement.sql`: a retired unit is final (`physical_asset_guard`), and a retired unit cannot be installed (`installation_not_retired`). `0031_device_register.sql`: register entries are append-only and versioned; a retired unit cannot be registered; a hostname, IP or MAC already current on another in-service unit is refused. | `tests/security/asset-retirement.test.mjs` (AR-01..06), `tests/security/device-register.test.mjs` (DR-01..06) |
| Engine | `packages/commissioning-engine/src/installations.ts`: a replacement retires the outgoing unit by default (or keeps it as a spare); a retired unit cannot come back; `codeTaken` refuses a code ever used. | the same security suites, and `recommissioning-negative` |
| Demo | `apps/demo/src/campus/registers.ts`: the retired register; codes on record are never offered again. `apps/demo/src/campus/assetLife.ts`: one unit's life, joined by the asset ID alone. | `tests/browser/demo-registers.test.mjs`, `tests/browser/demo-asset-life.test.mjs` |

## The asset's life page (`#/v25/asset?a=AS-0112`)

Find any unit by its asset ID. The page shows:

- whether the unit is in service or retired;
- where it is and its position;
- every service job raised against it, with vendor, agreement and restore time against the SLA;
- what the installation team registered for it;
- the accepted baselines it was part of;
- the issues at its position.

A retired unit is still found. It shows when and why it was taken out and which unit replaced it. You can follow the chain both ways: back to the unit it replaced, and forward to the unit that replaced it. The page counts every asset ID on record and how many are retired, each one kept and never reissued.

Asset IDs link here from service analytics (each job's asset) and from each room's device register.

## Not built yet

- Asset IDs in APEX cases. (Search Party by asset ID is built: every unit, in service or retired, is a searchable record tracked from its position, with replacements as recorded successions — `tests/unit/search-asset-person.test.mjs`.)
- An export of one asset's life.
- Register entries are kept per position in this browser. A register entry made before a swap is not yet carried as the retired unit's own history in the demo, although the database keeps it (versioned, per asset).
