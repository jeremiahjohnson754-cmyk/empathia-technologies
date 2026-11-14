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
