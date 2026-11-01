# ADR-0012: Positions, physical assets and installations (the owner's device-installation model)

Status: implemented 2026-10-31 · migration `0026_device_installations.sql` · engine `packages/commissioning-engine/src/installations.ts`

## Context

A room's device (`app.planned_asset`, `PA-xxxx`) was both the slot in the room and the hardware in it. The API changed the model of the
same id when a camera was substituted; the demonstration created a new id when a device was swapped. Neither could say which physical
unit had been accepted, which unit is there now, or what happened to the unit that was taken out. The owner asked for three separate
identities and these invariants, in the database and in the application:

- one active installation per position and per physical asset; an asset never occupies two positions at once;
- replacing equipment never overwrites the previous unit's identity or history; accepted design and evidence history stay immutable;
- a replacement closes the old installation, opens the new one, writes its audit row and outbox event, and reopens the affected
  verification, atomically; a failed replacement leaves nothing behind;
- a unit's history follows it when it moves; existing records migrate without invented serials, makers, dates or verification.

## Decision

1. **Three records.**
   - The **position** stays `app.planned_asset`: the slot, its purpose, mounting and geometry, and its design history (`model_history`,
     the revision snapshots). It keeps its code when the unit at it changes. A different *category* is a different purpose, so it remains
     a different position (the API has no category change; Build a Room's category swap retires one position and creates another).
   - The **physical asset** `app.physical_asset` (`AS-xxxx`): category, `manufacturer` (nullable), `model` (immutable), `serial`
     (nullable) and `identity_state` UNKNOWN → DECLARED → OBSERVED → VERIFIED, forward only. CHECKs: UNKNOWN ⇔ no serial; OBSERVED and
     VERIFIED need an evidence object. A serial is unique per tenant, maker and model when present; once recorded it is final (a different
     serial is a different unit). Identity changes are appended to `app.asset_identity_event`.
   - The **installation** `app.asset_installation`: position × asset × `[installed_at, removed_at)`, with the reason, actor, role,
     note, evidence and outbox event of each end, and the correlation id. `effective_basis` says how the start is known: `RECORDED` (the
     time it was recorded through the API by the person named) or `KNOWN_AS_OF_MIGRATION` (in place no later than the migration; the real
     date is not on record).
2. **Exclusion constraints, not a trigger, for overlaps.** `EXCLUDE USING gist (tenant_id WITH =, position_id WITH =, tstzrange(...) WITH &&)`
   and the same per asset (btree_gist, a trusted contrib extension the schema owner can create). An overlap check in a trigger would be
   race-free only under an explicit lock; the exclusion constraint is enforced by its index, so two concurrent transactions cannot both
   commit an overlap. Partial unique indexes (one open row per position, per asset) state the "one active installation" rule directly;
   the exclusion constraint is checked first on an insert, so either refusal can be the one the database reports.
3. **Append-only, closed once.** A trigger refuses DELETE, any change to the installation half, any change to a closed row, and any update
   that does not close an open row (`EM009` → 422). Column grants back it: `empathia_app` may SELECT and INSERT, may UPDATE only the removal
   columns of an installation and only the identity columns of an asset, and may DELETE nothing. `empathia_worker` gets nothing (the
   outbox worker never reads installations). RLS (`app.tenant_rls`) is forced on all three tables.
4. **One set of rules, in the shared engine.** `planInstall`, `planReplacement` (like-for-like REPLACEMENT vs model SUBSTITUTION, and the
   refusals: no current installation, a stale expected installation (409), a unit installed elsewhere (409), the same unit, a different
   category or model), `planIdentity` (forward only, evidence, independence, final serial), `identityOf`/`identityText` (the one reading
   every surface shows: `PA-0061 · unit AS-0009 · identity UNKNOWN`), `replacementsOf`/`substitutionUnits`, `installationSentence`.
   `reopenedBySubstitution` is extended, not forked: a change has a `kind`; a REPLACED unit's reason reads "was replaced by another unit of
   the same model (AS-a → AS-b, both M)"; a substitution's wording is unchanged byte for byte. `reverificationBlockers` (the "to re-run"
   and the "re-run but not yet verified by a different person" sentences) and `rerunTask` are in the engine, so the API and Build a Room
   say the same thing. The API's adapter is `services/enterprise-api/src/domain/reverification.ts` (pure); a parity test feeds the same
   room through it and through the demonstration's store.
5. **The acceptance gate never counts a superseded result.** `lifecycleBlockers` takes the reopened tests: a result recorded at or before
   the change of unit that reopens its test is superseded and counted as nothing, whatever its label (even PASS_VERIFIED). When the
   superseded results are the only gap, the count travels with the re-run sentence ("— acceptance counts 63 of 75 …; the 12 earlier
   result(s) no longer count"); otherwise the general sentence names them ("…; 12 recorded before a change of device and no longer
   counted"). Historical labels stay readable; a superseded result cannot be verified; a re-run cannot cite evidence uploaded before the
   change. Design re-approval follows only from a design change (a model substitution), never from a like-for-like replacement.
6. **Reopening is derived, not stored.** Which tests a change reopens is computed on every read from the append-only installation records
   and the plan; nothing is "invalidated" separately. A rolled-back replacement therefore reopens nothing.
7. **Transactions.** Every mutation locks the room (the lock every room mutation takes), the position and the incoming unit, plans with the
   engine, writes the records, the outbox event (`commission.asset_registered`, `commission.asset_replaced`: existing contract types; no
   new event type) and the audit row in one transaction. Idempotency-Key is honoured (the existing mechanism); `expectedInstallation`
   makes a concurrent or stale replacement a 409. Recording the room's installation (→ INSTALLED_UNVERIFIED) gives every position without
   a unit a new one of UNKNOWN identity, recorded by the installer. The model-substitution PATCH runs through the same code: the old unit
   is closed SUBSTITUTED and a unit of the new model installed.
8. **Authorities reused.** Install and replace a unit: `work.evidence` (the authority that records the installation, INSTALLED_UNVERIFIED).
   A model substitution: `room.design` (a design change, as before). Declare or observe an identity: `work.evidence` or `field.scan`;
   verify it: the result-verification authorities (`tests.verify.all`, `test.verify`, `customer.accept`), never the person who declared or
   observed it. No new role, authority or event type.
9. **Assurance** compares the unit open at each position when the baseline was published (read back exactly from the append-only records)
   with the unit there now. A different unit of the same model is `UNIT_REPLACED` (an installation change); a different model is
   `MODEL_SUBSTITUTED` (a model drift); the two are never conflated. A unit not on record at publication (a room migrated after its
   acceptance) is not compared: Assurance does not guess.
10. **Migration.** Every live, non-furniture position whose lifecycle is INSTALLED_UNVERIFIED or later gets one physical asset — serial
    NULL, manufacturer NULL, identity UNKNOWN, origin MIGRATED, nobody named as its creator — carrying the position's designed model
    (the room records it as installed per design; UNKNOWN says nothing about the unit is confirmed), and one open installation with basis
    KNOWN_AS_OF_MIGRATION, reason MIGRATED and no installer. `model_history` stays the position's design history. The data step
    (`app.migrate_installations()`, owner only) skips any position with an installation record, so running it or the whole file again
    creates nothing. Tested on its own: `tests/integration/installation-migration.test.mjs`.

## Consequences

- API (156 operations): `POST /v1/rooms/{room}/positions/{position}/installation`, `POST …/positions/{position}/replace`,
  `GET …/positions/{position}/history`, `GET /v1/assets/{asset}/history`, `POST /v1/assets/{asset}/identity`; the device PATCH takes
  `expectedInstallation` and a spare `asset`. Read surfaces expose position · unit · identity: room detail (each device and its
  installation timeline), readiness (`installations`, `recommissioning.changes`), Assurance (`installation`, presence `changes`), Search
  Party (`Asset` nodes LOCATED_IN their position), the KPI summary (`assets.installations`, `commissioning.superseded`).
- Build a Room models positions, synthetic units (serials, when declared, are SYN-…; no maker is named) and installations with the same
  engine functions: a device register with the position's design history apart from the unit's history, like-for-like replacement and
  model substitution, identity records; the Impact panel, Search Party, Pro and the Room Story read the same identities.
- Tests: `tests/security/recommissioning-negative.test.mjs` (RN-01…13), checkpoint C-89…C-97, `packages/commissioning-engine/test/
  installations.test.ts`, `packages/assurance-engine/test/installation.test.ts`, `apps/demo/test/installations.test.mjs` (with the parity
  test). `tests/security/governance.test.mjs` BL-5 now uploads evidence after the substitution for its re-run: the evidence it reused from
  before the substitution is refused by the new rule (asserted there).
- Not done: a separate endpoint to register a spare unit (a unit becomes a spare when it is taken out; install and replace can register a
  new one); removal of a unit without a successor; a category change of a position in the API; external asset-registry connectors.
