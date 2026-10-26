# Integration priorities

Which integration categories to build first, and why. The catalogue (`integrations/contracts/INTEGRATION_REGISTRY.csv`, 83 entries)
names target platforms **for interface planning only** — no partnership, certification, endorsement or live connection is implied, and
every entry is `CONTRACT_ONLY` today. The three local `MOCK` adapters (`integrations/mocks`) exist to exercise the contract.
Catalogue entries by category: UC and collaboration 17 · Audio and DSP 14 · IT and network 11 · Signage and displays 10 · Identity and
data 8 · Video cameras and control 8 · Facilities and IoT 6 · AV management 5 · Service and ITSM 4.

## Principles (already enforced in code — `integrations/contracts/src/harmony.ts`)
1. **Read-only first, always.** An adapter starts `READ_ONLY`. Writes need a `VERIFIED` `READ_WRITE` adapter that supports CONTROL and
   an approved change carrying `baseline.approve` or `room.design.approve` (`mayWrite`, deny by default). Sensitive building
   infrastructure stays read-only unless an engineer approves otherwise.
2. **One authority per record kind**; conflicts are surfaced, never merged (`authorityFor`, `conflicts`).
3. **Canonical matching by serial or MAC only**; a name match is a suggestion (`matchCanonical`).
4. **Honest evidence**: until an adapter is VERIFIED its observations are `SYNTHETIC_MOCK` (database trigger EM004) and never feed
   Assurance.
5. **VERIFIED means evidence**: the adapter passes `integrations/mocks/src/conformance.ts` against an authorized vendor sandbox or test
   environment, and the integration row records that evidence (the database refuses VERIFIED without it, `0004_platform.sql`).
6. No network scanning, signal generation, camera movement or device actuation without explicit authorization and a verified test
   environment.

## Order (proposal)

| Order | Category | First capability | Why first | Unlocks |
|---|---|---|---|---|
| 1 | Identity and data — the customer's identity provider / directory | READ: people, groups, sign-in (OIDC) | every buyer requires SSO; Search Party needs real people and ownership | WP3, Search Party on real data |
| 2 | Service and ITSM | READ (+ signed webhooks) of incidents and requests | ServiceHands and Pro need the customer's tickets; read-only is low risk; the MOCK already models the signed-webhook scheme | ServiceHands, Pro KPIs on real data |
| 3 | AV management / device inventory | DISCOVER + READ of the device register (serial, MAC, firmware) | canonical device identity and firmware facts for Assurance presence/firmware dimensions | Assurance on real rooms |
| 4 | IT and network | READ of switch ports / reachability | network and dependency dimensions of Assurance | Assurance network rows |
| 5 | Audio and DSP; Video cameras and control | READ / OBSERVE parameter readback | configuration-signature and camera/audio dimensions | Assurance functional rows |
| 6 | UC and collaboration; Signage and displays; Facilities and IoT | READ | room usage, display state, environment readings | Pro, Assurance environment/experience |
| last | any CONTROL capability | approved, reversible changes only | highest risk; requires VERIFIED READ_WRITE + engineer approval + safety review | Control Studio beyond simulation |

## Per-adapter definition of done
* implements `Adapter` in `integrations/verified-adapters/<key>/`; credentials by reference only (`CredentialRef`), rotation policy set;
* passes `conformance()` against the vendor sandbox; fault behaviour (timeouts, 429 with Retry-After, 5xx, expired credential) tested;
* API terms of the vendor reviewed for permitted use (legal);
* the integration row moves to `VERIFIED` with its evidence (environment, models and firmware tested, date, tester);
* sync health, staleness and dead letters visible to the security administrator.
