-- 0026 · Positions, physical assets and installations (ADR-0012).
--
-- app.planned_asset stays what it always described: the LOGICAL POSITION in a room (PA-xxxx: the slot, its purpose, its mounting
-- location and geometry, and its design history in model_history). Two new records separate the hardware from it:
--   * app.physical_asset      the actual unit (AS-xxxx): category, manufacturer (nullable), model (immutable), serial (nullable) and an
--                             identity state UNKNOWN → DECLARED → OBSERVED → VERIFIED that only moves forward;
--   * app.asset_installation  a dated relationship "this unit was at this position from … to …", with the reasons, the actors, the
--                             evidence and the event/correlation ids of both ends. It is append-only: the one permitted change is closing
--                             an open row, once.
-- Invariants, enforced here as the backstop of the API's own checks:
--   * one open installation per position and one per asset (partial unique indexes);
--   * no two installation periods of the same position, or of the same asset, overlap (EXCLUDE ... USING gist on tstzrange):
--     an asset never occupies two positions at once, and a position never holds two units at once, even historically;
--   * an installation is never deleted and never rewritten; a closed one is final (trigger + column grants);
--   * a physical asset's model, category and code never change; its identity never moves backwards; a serial, once recorded, is final
--     (a different serial is a different unit); OBSERVED and VERIFIED need an evidence object; UNKNOWN ⇔ no serial (CHECKs + trigger);
--   * a serial is unique per tenant, manufacturer and model when present.
-- The exclusion constraints use btree_gist (a trusted contrib extension: the schema owner can create it without superuser rights). A
-- trigger could check overlaps too, but only race-free with an explicit lock; the exclusion constraint is checked by the index itself,
-- so two concurrent transactions cannot both commit an overlap.
--
-- Existing rows: every current, non-furniture position whose lifecycle says hardware is in place (INSTALLED_UNVERIFIED and every later
-- state; never PLANNED) gets one physical asset with serial NULL, manufacturer NULL and identity UNKNOWN, recorded with the position's
-- designed model, and one open installation whose effective_basis is KNOWN_AS_OF_MIGRATION: its installed_at is the time of the
-- migration — the unit was in place no later than that — and never a claimed installation date. Nobody is named as its installer.
-- model_history stays where it is, as the position's design history. The data step is app.migrate_installations(): it skips any position
-- that already has an installation record, so running it (or this whole file) again creates nothing.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ------------------------------------------------------------------------------------------- the physical unit
CREATE TABLE IF NOT EXISTS app.physical_asset (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES app.tenant(id),
  code                  text NOT NULL CHECK (code ~ '^AS-[0-9]{4,10}$'),
  category              text NOT NULL CHECK (length(category) BETWEEN 1 AND 40),
  manufacturer          text CHECK (manufacturer IS NULL OR length(manufacturer) BETWEEN 1 AND 120),
  model                 text NOT NULL CHECK (length(model) BETWEEN 1 AND 120),
  serial                text CHECK (serial IS NULL OR length(serial) BETWEEN 1 AND 120),
  identity_state        text NOT NULL DEFAULT 'UNKNOWN' CHECK (identity_state IN ('UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED')),
  identity_evidence_id  uuid,
  identity_by           uuid REFERENCES app.person(id),
  identity_at           timestamptz,
  origin                text NOT NULL CHECK (origin IN ('MIGRATED', 'INSTALLATION_RECORD', 'REGISTERED')),
  created_by            uuid REFERENCES app.person(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, identity_evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  CONSTRAINT physical_asset_unknown_has_no_serial CHECK ((identity_state = 'UNKNOWN') = (serial IS NULL)),
  CONSTRAINT physical_asset_evidenced_identity CHECK (identity_state NOT IN ('OBSERVED', 'VERIFIED') OR identity_evidence_id IS NOT NULL),
  CONSTRAINT physical_asset_identity_actor CHECK (identity_state = 'UNKNOWN' OR (identity_by IS NOT NULL AND identity_at IS NOT NULL)),
  CONSTRAINT physical_asset_creator CHECK (origin = 'MIGRATED' OR created_by IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS physical_asset_serial_unique ON app.physical_asset (tenant_id, coalesce(manufacturer, ''), model, serial) WHERE serial IS NOT NULL;
SELECT app.tenant_rls('app.physical_asset');

-- identity changes of a unit, append-only (the asset row carries the current identity; this is how it got there)
CREATE TABLE IF NOT EXISTS app.asset_identity_event (
  id              bigserial PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  asset_id        uuid NOT NULL,
  from_state      text NOT NULL CHECK (from_state IN ('UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED')),
  to_state        text NOT NULL CHECK (to_state IN ('DECLARED', 'OBSERVED', 'VERIFIED')),
  manufacturer    text,
  serial          text NOT NULL,
  evidence_id     uuid,
  note            text CHECK (note IS NULL OR length(note) <= 500),
  actor_id        uuid NOT NULL REFERENCES app.person(id),
  actor_role      text NOT NULL,
  correlation_id  text NOT NULL,
  at              timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, asset_id) REFERENCES app.physical_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  CHECK (to_state NOT IN ('OBSERVED', 'VERIFIED') OR evidence_id IS NOT NULL)
);
DROP TRIGGER IF EXISTS asset_identity_event_append_only ON app.asset_identity_event;
CREATE TRIGGER asset_identity_event_append_only BEFORE UPDATE OR DELETE ON app.asset_identity_event FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.asset_identity_event');

-- a unit's code, category, model and origin never change; its identity only moves forward; a serial or a maker, once recorded, is final
CREATE OR REPLACE FUNCTION app.physical_asset_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rank_old int; rank_new int;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'a physical asset is never deleted: its history follows the unit' USING ERRCODE = 'EM009'; END IF;
  IF (NEW.id, NEW.tenant_id, NEW.code, NEW.category, NEW.model, NEW.origin, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.code, OLD.category, OLD.model, OLD.origin, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'a physical asset''s code, category, model and origin are immutable (a different model is a different unit)' USING ERRCODE = 'EM009'; END IF;
  rank_old := array_position(ARRAY['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'], OLD.identity_state);
  rank_new := array_position(ARRAY['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'], NEW.identity_state);
  IF rank_new <= rank_old THEN RAISE EXCEPTION 'identity % → % is not a step forward (an identity is never downgraded or re-recorded)', OLD.identity_state, NEW.identity_state USING ERRCODE = 'EM009'; END IF;
  IF OLD.serial IS NOT NULL AND NEW.serial IS DISTINCT FROM OLD.serial THEN RAISE EXCEPTION 'a recorded serial is final: a different serial is a different unit' USING ERRCODE = 'EM009'; END IF;
  IF OLD.manufacturer IS NOT NULL AND NEW.manufacturer IS DISTINCT FROM OLD.manufacturer THEN RAISE EXCEPTION 'a recorded manufacturer is final' USING ERRCODE = 'EM009'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS physical_asset_guard ON app.physical_asset;
CREATE TRIGGER physical_asset_guard BEFORE UPDATE OR DELETE ON app.physical_asset FOR EACH ROW EXECUTE FUNCTION app.physical_asset_guard();

-- ------------------------------------------------------------------------------------------- the installation: unit × position × period
CREATE TABLE IF NOT EXISTS app.asset_installation (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid NOT NULL REFERENCES app.tenant(id),
  position_id           uuid NOT NULL,
  asset_id              uuid NOT NULL,
  installed_at          timestamptz NOT NULL DEFAULT now(),
  -- how installed_at is known: RECORDED = the time the installation was recorded through the API by the person named;
  -- KNOWN_AS_OF_MIGRATION = the unit was in place no later than migration 0026 ran (the real installation date is not on record)
  effective_basis       text NOT NULL CHECK (effective_basis IN ('RECORDED', 'KNOWN_AS_OF_MIGRATION')),
  install_reason        text NOT NULL CHECK (install_reason IN ('INITIAL', 'REPLACEMENT', 'SUBSTITUTION', 'RELOCATION', 'MIGRATED')),
  installed_by          uuid REFERENCES app.person(id),
  installed_role        text,
  install_note          text CHECK (install_note IS NULL OR length(install_note) <= 500),
  install_evidence_id   uuid,
  install_event_id      uuid,
  correlation_id        text NOT NULL,
  removed_at            timestamptz,
  removal_reason        text CHECK (removal_reason IN ('REPLACED', 'SUBSTITUTED', 'RELOCATED', 'REMOVED')),
  removed_by            uuid REFERENCES app.person(id),
  removed_role          text,
  removal_note          text CHECK (removal_note IS NULL OR length(removal_note) <= 500),
  removal_evidence_id   uuid,
  removal_event_id      uuid,
  removal_correlation_id text,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, position_id) REFERENCES app.planned_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, asset_id) REFERENCES app.physical_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, install_evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  FOREIGN KEY (tenant_id, removal_evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  CONSTRAINT installation_period CHECK (removed_at IS NULL OR removed_at > installed_at),
  CONSTRAINT installation_removal_complete CHECK ((removed_at IS NULL) = (removal_reason IS NULL) AND (removed_at IS NULL) = (removed_by IS NULL) AND (removed_at IS NULL) = (removal_correlation_id IS NULL)),
  CONSTRAINT installation_migrated_basis CHECK ((install_reason = 'MIGRATED') = (effective_basis = 'KNOWN_AS_OF_MIGRATION')),
  CONSTRAINT installation_installer CHECK (install_reason = 'MIGRATED' OR installed_by IS NOT NULL),
  CONSTRAINT installation_no_overlap_per_position EXCLUDE USING gist (tenant_id WITH =, position_id WITH =, tstzrange(installed_at, removed_at, '[)') WITH &&),
  CONSTRAINT installation_no_overlap_per_asset EXCLUDE USING gist (tenant_id WITH =, asset_id WITH =, tstzrange(installed_at, removed_at, '[)') WITH &&)
);
CREATE UNIQUE INDEX IF NOT EXISTS installation_one_open_per_position ON app.asset_installation (tenant_id, position_id) WHERE removed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS installation_one_open_per_asset ON app.asset_installation (tenant_id, asset_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS installation_asset_idx ON app.asset_installation (tenant_id, asset_id, installed_at);
SELECT app.tenant_rls('app.asset_installation');

-- append-only: no DELETE; the only UPDATE closes an open row once (removal columns NULL → value), every other column unchanged
CREATE OR REPLACE FUNCTION app.installation_close_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'an installation record is never deleted' USING ERRCODE = 'EM009'; END IF;
  IF OLD.removed_at IS NOT NULL THEN RAISE EXCEPTION 'a closed installation is final' USING ERRCODE = 'EM009'; END IF;
  IF NEW.removed_at IS NULL THEN RAISE EXCEPTION 'an open installation is changed only to close it' USING ERRCODE = 'EM009'; END IF;
  IF (NEW.id, NEW.tenant_id, NEW.position_id, NEW.asset_id, NEW.installed_at, NEW.effective_basis, NEW.install_reason, NEW.installed_by, NEW.installed_role, NEW.install_note, NEW.install_evidence_id, NEW.install_event_id, NEW.correlation_id)
     IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.position_id, OLD.asset_id, OLD.installed_at, OLD.effective_basis, OLD.install_reason, OLD.installed_by, OLD.installed_role, OLD.install_note, OLD.install_evidence_id, OLD.install_event_id, OLD.correlation_id) THEN
    RAISE EXCEPTION 'the installation half of an installation record is immutable' USING ERRCODE = 'EM009'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS installation_close_only ON app.asset_installation;
CREATE TRIGGER installation_close_only BEFORE UPDATE OR DELETE ON app.asset_installation FOR EACH ROW EXECUTE FUNCTION app.installation_close_only();

-- ------------------------------------------------------------------------------------------- existing rows (idempotent data step)
CREATE OR REPLACE FUNCTION app.migrate_installations() RETURNS int LANGUAGE plpgsql AS $$
DECLARE t uuid; p record; a uuid; n int := 0;
BEGIN
  FOR t IN SELECT id FROM app.tenant ORDER BY id LOOP
    PERFORM set_config('app.tenant_id', t::text, true);   -- RLS is forced on the owner too: migrate each tenant under its own policy
    FOR p IN
      SELECT pa.id, pa.category, pa.model FROM app.planned_asset pa
       WHERE pa.tenant_id = t AND pa.removed_at IS NULL AND NOT pa.furniture
         AND pa.lifecycle IN ('INSTALLED_UNVERIFIED', 'COMMISSIONING', 'ACCEPTED', 'OPERATIONAL')
         AND NOT EXISTS (SELECT 1 FROM app.asset_installation i WHERE i.tenant_id = t AND i.position_id = pa.id)
       ORDER BY pa.code
    LOOP
      INSERT INTO app.physical_asset (tenant_id, code, category, manufacturer, model, serial, identity_state, origin)
      VALUES (t, app.next_code('physical_asset', 'AS-'), p.category, NULL, p.model, NULL, 'UNKNOWN', 'MIGRATED') RETURNING id INTO a;
      INSERT INTO app.asset_installation (tenant_id, position_id, asset_id, installed_at, effective_basis, install_reason, installed_by, install_note, correlation_id)
      VALUES (t, p.id, a, now(), 'KNOWN_AS_OF_MIGRATION', 'MIGRATED', NULL, 'in place when migration 0026 ran; the installation date and the unit''s identity are not on record', 'migration-0026');
      n := n + 1;
    END LOOP;
  END LOOP;
  PERFORM set_config('app.tenant_id', '', true);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION app.migrate_installations() FROM PUBLIC;
SELECT app.migrate_installations();

-- ------------------------------------------------------------------------------------------- least privilege for the runtime roles
REVOKE ALL ON app.physical_asset, app.asset_installation, app.asset_identity_event FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    -- no DELETE anywhere; an asset row changes only in its identity columns, an installation only in its removal columns
    GRANT SELECT, INSERT ON app.physical_asset, app.asset_installation, app.asset_identity_event TO empathia_app;
    GRANT UPDATE (identity_state, serial, manufacturer, identity_evidence_id, identity_by, identity_at) ON app.physical_asset TO empathia_app;
    GRANT UPDATE (removed_at, removal_reason, removed_by, removed_role, removal_note, removal_evidence_id, removal_event_id, removal_correlation_id) ON app.asset_installation TO empathia_app;
    GRANT USAGE, SELECT ON SEQUENCE app.asset_identity_event_id_seq TO empathia_app;
  END IF;
  -- empathia_worker gets nothing: the outbox worker delivers events and never reads or writes installations
END $$;
