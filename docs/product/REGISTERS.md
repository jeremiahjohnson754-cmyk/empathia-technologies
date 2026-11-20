# Room and device registers — where commissioning starts

Founder, 14 Nov 2026: *"I want the device register and room register in the beginning of commissioning framework. I want the installation
team to fill out the device register so we can get every device and asset ID and asset information at the beginning of the project, and a
small documentation tracker in the 1st phase … so we can have the before and after install."* The six phases (five plus the final sign-off)
are unchanged: the registers come before phase 1, on the room's commissioning page (`#/commissioning/room/:id`).

| Part | What it holds | Who writes it | Where |
|---|---|---|---|
| Room register | room ID, name, type, capacity, primary use, displays/cameras/microphones, divisible, devices to register, lifecycle | nobody: read from the record | `campus/registers.ts` `roomRegister` |
| Device register | per device: device ID (the position), asset ID (the unit installed there), class, serial, hostname, IP address, firmware, mounting location, who and when | the installation team (`work.evidence`: installer, service technician) | `campus/registers.ts`, `campus/registerStore.ts`, `campus/RegisterCard.tsx` |
| Retired register | every unit taken out of a position: asset ID, where it was, installed, retired, why, what replaced it; "code never reused" | nobody: read from the installation record | `retiredRegister` |
| Install documentation (phase 1) | a photograph before and one after the installation, with who, when and a note | anyone on the installation team | `setInstallPhoto` |

Rules (each refused with its reason, and each recorded write goes to the workspace audit trail):
- the device and asset IDs come from the record and are never typed;
- a serial is 3–40 label characters and, once recorded, final (a different serial is a different unit);
- a networked device needs a hostname and an IP address (the v1.3 workbook's rule); a device class that is not networked takes neither;
- a serial already registered to another unit of the same class, or a hostname or address already used by another device, anywhere on the
  estate in this browser, is refused;
- the after photograph needs the before one; photographs are scaled down in the browser (longest side 960 px) and kept only here.

The commissioning completion package (all six formats) carries the room register, the device register, the retired register and both
install photographs. Server side, the asset ID's lifecycle is migration 0030 (ADR-0012 addendum): a replaced unit is retired, its code
never reused.

Verified: `tests/browser/demo-registers.test.mjs` (RG-01…08, phone width, no console error, nothing off the page);
`scripts/verify/export-formats.mjs` (the reference room's package with two registered devices and both photographs, reopened by
independent readers). The values are synthetic: nothing here contacts a device.

## Server side (migration 0031, 14 Nov 2026)

- `PUT /v1/assets/{asset}/register` (work.evidence or field.scan): hostname, IPv4 address, MAC, firmware, location. Each write is a new
  version of the unit's register row (append-only; the history names who wrote each version and in what role).
- A hostname, address or MAC current on another unit in service is refused: 409 from the API, and 23505 from the database as the runtime
  role.
- A device class that is not networked takes none of the three. A retired unit takes no entry, and its values are free for the unit that
  replaced it.
- `GET /v1/rooms/{room}/register`: every position with its unit, identity, current row and what it still needs (the serial; hostname and
  IP when networked), with the totals.
- Unit history (`GET /v1/assets/{asset}/history`) lists every register version.
- Proven by `tests/security/device-register.test.mjs` (DR-01…06).

## The register is a gate before commissioning (founder, 14 Nov 2026)

The founder's words: "device register should be a blockable gated phase but licensing is okay I'm fine not gating that".

- **What is gated.** A room moves from INSTALLED_UNVERIFIED to COMMISSIONING only when every live position's unit is registered: a
  declared serial for every unit, and a hostname and an IPv4 address for every networked unit. This is the same rule the register
  already counted.
- **Where it is enforced.** In the commissioning engine (`lifecycleBlockers` with the room's register facts; the wording comes from
  `registerBlocker`), so the API and the demonstration give the same refusal. The API refuses with 422 and names the positions still
  open (the first four, with what each needs). The refusal is audited as DENIED with its reasons, and nothing changes.
- **Readiness.** `GET /v1/rooms/{room}/readiness` names the gate among the next step's blockers. It gives the installer an outstanding
  item ("complete the device register", with the count), and it carries a `register` block: devices, complete, and what is missing.
- **What is not gated.**
  - A recommissioning (ACCEPTED → COMMISSIONING): the room was registered before its first commissioning. A unit that a
    substitution brings in later starts UNKNOWN and is registered in the field.
  - The licensed standards registry: the founder chose not to gate on it.
- **The synthetic estate.** The demonstration's estate histories (rooms already commissioned or accepted) predate this rule, and they are
  not rewritten. The gate applies to every room that reaches the step from now on: in Build a Room in the demonstration, and over the API.
- **Demonstration.** Build a Room's lifecycle tab shows the device register from INSTALLED_UNVERIFIED on. The installation team
  (work.evidence or field.scan) records a serial, hostname and IP address per device, or registers every open device with labelled
  synthetic values. While the register is open, the move to COMMISSIONING is refused with the same wording.
- **Proven by:**
  - `tests/security/device-register.test.mjs` DR-07: refused with the positions named, audited, nothing changed; readiness; allowed once
    registered.
  - `tests/integration/api.test.mjs` slice 4: refused, then allowed.
  - `tests/e2e/checkpoint-room-lifecycle.e2e.mjs` C-21R and C-21G.
  - `tests/browser/demo.test.mjs` B-09R and B-09G.
- **Test fixtures.** Every test that walks a room into commissioning now registers its units first, with the shared helper `registerRoom`
  in `tests/integration/harness.mjs` (synthetic serials, hostnames and private addresses). The tests that read a unit's identity "as the
  installation recorded it" read it before the register: RN-01 and C-89. They also check that the register declared each serial
  afterwards. RN-04, RN-11, C-91 and C-97 now expect the declared identity, and each says why in the test.
