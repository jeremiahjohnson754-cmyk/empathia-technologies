# integrations/

| Folder | What | Maturity |
|---|---|---|
| `contracts/` | `@empathia/integration-contracts`: the common adapter interface (`src/contract.ts`) and the Harmony engine (`src/harmony.ts`); `INTEGRATION_REGISTRY.csv`, the 83-entry catalogue copied from the internal registry | contract + rules, 7/7 tests |
| `mocks/` | `@empathia/integration-mocks`: three local MOCK adapters (device inventory, DSP readback, service desk with signed webhooks), fault injection, and the conformance suite every adapter must pass | MOCK, 5/5 tests |
| `verified-adapters/` | Adapters tested against an authorized vendor environment | **none** |

**The catalogue names target platforms for interface planning only.** No entry implies a partnership, certification, endorsement or a
live connection. Every catalogue entry is `CONTRACT_ONLY` in the database except the three local mocks (`MOCK`). Nothing in this
repository opens a connection to a vendor system, scans a network, generates signals, moves a camera or actuates a device.

Rules (enforced in code and tests):
* only a `VERIFIED`, `READ_WRITE` adapter that supports `CONTROL` may act, and only on an approved change carrying `baseline.approve` or
  `room.design.approve` (`mayWrite`, deny by default); sensitive building infrastructure stays read-only unless an engineer approves;
* every record kind has one source authority; disagreements are surfaced as conflicts, never silently merged;
* matching to canonical assets is by serial or MAC only — a name match is a suggestion;
* observations from a non-VERIFIED source are stored as `SYNTHETIC_MOCK` (database trigger EM004) and never feed Assurance.

To add a real adapter: implement `Adapter` in `verified-adapters/<key>/`, pass `conformance()` against the vendor sandbox, record the
evidence (sandbox, models and firmware tested, date, tester) in the integration row's `evidence`, and only then change its maturity to
`VERIFIED` (the database refuses VERIFIED without evidence).
