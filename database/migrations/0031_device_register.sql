-- 0031 · The device register (founder, 14 Nov 2026: "I want the installation team to fill out the device register so we can get every
-- device and asset ID and asset information at the beginning of the project"; the v1.3 workbook's rule: networked devices require an IP
-- address and a hostname). What the installation team reads on site about a unit, beside its identity (0026: serial, maker, identity
-- state stay on app.physical_asset and keep their own forward-only rules):
--   hostname, IPv4 address, MAC address, firmware version, mounting / rack location.
-- Append-only: every entry is a new version of the unit's register row (the newest is current), naming who recorded it, in what role,
-- and the correlation id. Nothing is updated or deleted, so the register's history is the record of who touched the unit.
-- Uniqueness, for units in service: a hostname, an address or a MAC is current on one unit only per tenant (the API refuses first; a
-- trigger is the backstop, since "current" spans rows). A retired unit's entries stay on record and free their values.
-- Rollback: database/rollbacks/0031_device_register.down.sql.

CREATE TABLE IF NOT EXISTS app.asset_register_entry (
  id              bigserial PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES app.tenant(id),
  asset_id        uuid NOT NULL,
  version         int NOT NULL CHECK (version >= 1),
  hostname        text CHECK (hostname IS NULL OR hostname ~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$'),
  ip              inet CHECK (ip IS NULL OR family(ip) = 4),
  mac             macaddr,
  firmware        text CHECK (firmware IS NULL OR firmware ~ '^[A-Za-z0-9][A-Za-z0-9._ -]{0,39}$'),
  location        text CHECK (location IS NULL OR length(location) BETWEEN 1 AND 120),
  recorded_by     uuid NOT NULL REFERENCES app.person(id),
  recorded_role   text NOT NULL,
  correlation_id  text NOT NULL,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, asset_id, version),
  FOREIGN KEY (tenant_id, asset_id) REFERENCES app.physical_asset(tenant_id, id)
);
CREATE INDEX IF NOT EXISTS asset_register_entry_current ON app.asset_register_entry (tenant_id, asset_id, version DESC);
SELECT app.tenant_rls('app.asset_register_entry');

DROP TRIGGER IF EXISTS asset_register_entry_append_only ON app.asset_register_entry;
CREATE TRIGGER asset_register_entry_append_only BEFORE UPDATE OR DELETE ON app.asset_register_entry FOR EACH ROW EXECUTE FUNCTION app.refuse_change();

-- the backstop: the new row's version follows the unit's last; a retired unit takes no entry; a hostname, address or MAC current on
-- another unit in service is refused
CREATE OR REPLACE FUNCTION app.asset_register_entry_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last int; clash text;
BEGIN
  IF EXISTS (SELECT 1 FROM app.physical_asset a WHERE a.tenant_id = NEW.tenant_id AND a.id = NEW.asset_id AND a.disposition = 'RETIRED') THEN
    RAISE EXCEPTION 'a retired unit takes no register entry' USING ERRCODE = 'EM009'; END IF;
  SELECT coalesce(max(version), 0) INTO last FROM app.asset_register_entry WHERE tenant_id = NEW.tenant_id AND asset_id = NEW.asset_id;
  IF NEW.version <> last + 1 THEN RAISE EXCEPTION 'register version % does not follow % (written by someone else meanwhile)', NEW.version, last USING ERRCODE = '23505'; END IF;
  SELECT a.code INTO clash FROM app.asset_register_entry e JOIN app.physical_asset a ON a.tenant_id = e.tenant_id AND a.id = e.asset_id
    WHERE e.tenant_id = NEW.tenant_id AND e.asset_id <> NEW.asset_id AND a.disposition = 'IN_SERVICE'
      AND e.version = (SELECT max(version) FROM app.asset_register_entry x WHERE x.tenant_id = e.tenant_id AND x.asset_id = e.asset_id)
      AND ((NEW.hostname IS NOT NULL AND lower(e.hostname) = lower(NEW.hostname)) OR (NEW.ip IS NOT NULL AND e.ip = NEW.ip) OR (NEW.mac IS NOT NULL AND e.mac = NEW.mac))
    LIMIT 1;
  IF clash IS NOT NULL THEN RAISE EXCEPTION 'hostname, address or MAC already current on unit %', clash USING ERRCODE = '23505'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS asset_register_entry_guard ON app.asset_register_entry;
CREATE TRIGGER asset_register_entry_guard BEFORE INSERT ON app.asset_register_entry FOR EACH ROW EXECUTE FUNCTION app.asset_register_entry_guard();

REVOKE ALL ON app.asset_register_entry FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT ON app.asset_register_entry TO empathia_app;
    GRANT USAGE, SELECT ON SEQUENCE app.asset_register_entry_id_seq TO empathia_app;
  END IF;
END $$;
