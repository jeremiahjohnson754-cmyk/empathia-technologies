# ADR-0023 · The device register past the address; the firmware baseline of a model (migration 0045)

Status: accepted, 18 Nov 2026. Source: `SOURCE_RECONCILIATION.md` items 5 ("VLAN, addressing mode, gateway, switch and port, PoE")
and 6 ("firmware baseline per model, warranty and support-contract dates, replacement forecast"). Structure only.

## Decision

- The register row (0031, append-only versions) gains VLAN (1–4094), addressing (DHCP, DHCP reservation, static), prefix length
  (8–30), gateway, the switch unit and port it is patched to, PoE class, warranty end and support-contract end. The engine's
  `planRegisterEntry` refuses with reasons; the database backs each rule: a gateway in the unit's subnet and not its own address, a
  static address complete (address, prefix, gateway), a port only with its switch, the switch a non-retired unit of category switch,
  never itself. A non-networked device class takes none of the network facts.
- The room register reports per unit `firmware: { baseline, state }` (MATCHES, DIFFERS, NOT_RECORDED, NO_BASELINE) and `lapsed`
  (warranty, support contract) against today.
- `app.firmware_baseline`: proposed by someone who verifies tests (`test.verify`, `tests.verify.all`) for a model with a unit on
  record; approved or rejected once by `baseline.approve`, never the proposer; one approved per model, a new approval superseding it.
  Immutable, never deleted.
- The room page's device detail shows the register row with its network facts, the firmware against the baseline and any lapsed
  date; "Fill the register" records a VLAN, a DHCP reservation in one /24 with its gateway and a warranty end (synthetic).

## Not done here

- The replacement forecast (installation date plus the category's service life) is not computed yet: the catalogue has no service
  life per category.
- No firmware is read from a device: every value is what someone recorded.
