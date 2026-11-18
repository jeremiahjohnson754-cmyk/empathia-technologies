-- 0045 · The device register past the address: network facts and lifecycle dates of a unit; the firmware baseline of a model.
-- Source reconciliation items 5 ("The network facts of a device stop at the address. VLAN, addressing mode, gateway, switch and port,
-- PoE.") and 6 ("Lifecycle facts of a unit: firmware baseline per model, warranty and support-contract dates, replacement forecast").
-- Structure only.
--
--   * app.asset_register_entry gains, on the same append-only versions (0031): vlan, addressing, prefix, gateway, switch_asset (the
--     switch unit it is patched to), switch_port, poe; warranty_until, support_until. The checks below are the database's backstop for
--     what the engine's planRegisterEntry refuses first (the gateway in the unit's subnet, a static address complete, a switch port
--     with its switch, the switch a unit whose category is a switch).
--   * app.firmware_baseline: the firmware version approved for a model, proposed by someone who verifies tests, approved by a systems
--     engineer who did not propose it; one approved per model, a new approval superseding it. The register then says, per unit,
--     whether its recorded firmware matches its model's baseline. The replacement forecast is computed (installation date plus the
--     category's service life), never stored.

ALTER TABLE app.asset_register_entry
  ADD COLUMN IF NOT EXISTS vlan           integer CHECK (vlan IS NULL OR vlan BETWEEN 1 AND 4094),
  ADD COLUMN IF NOT EXISTS addressing     text CHECK (addressing IS NULL OR addressing IN ('DHCP', 'DHCP_RESERVATION', 'STATIC')),
  ADD COLUMN IF NOT EXISTS prefix         integer CHECK (prefix IS NULL OR prefix BETWEEN 8 AND 30),
  ADD COLUMN IF NOT EXISTS gateway        inet CHECK (gateway IS NULL OR family(gateway) = 4),
  ADD COLUMN IF NOT EXISTS switch_asset   uuid,
  ADD COLUMN IF NOT EXISTS switch_port    text CHECK (switch_port IS NULL OR switch_port ~ '^[A-Za-z0-9][A-Za-z0-9/:._-]{0,19}$'),
  ADD COLUMN IF NOT EXISTS poe            text CHECK (poe IS NULL OR poe IN ('NONE', 'POE', 'POE_PLUS', 'POE_PLUS_PLUS')),
  ADD COLUMN IF NOT EXISTS warranty_until date,
  ADD COLUMN IF NOT EXISTS support_until  date;
DO $$ BEGIN
  ALTER TABLE app.asset_register_entry ADD CONSTRAINT asset_register_switch FOREIGN KEY (tenant_id, switch_asset) REFERENCES app.physical_asset(tenant_id, id);
  ALTER TABLE app.asset_register_entry ADD CONSTRAINT asset_register_port_with_switch CHECK ((switch_asset IS NULL) = (switch_port IS NULL));
  ALTER TABLE app.asset_register_entry ADD CONSTRAINT asset_register_static_complete CHECK (addressing IS DISTINCT FROM 'STATIC' OR (ip IS NOT NULL AND prefix IS NOT NULL AND gateway IS NOT NULL));
  ALTER TABLE app.asset_register_entry ADD CONSTRAINT asset_register_gateway_in_subnet CHECK (gateway IS NULL OR ip IS NULL OR prefix IS NULL
    OR (gateway <> ip AND set_masklen(gateway, prefix)::cidr = set_masklen(ip, prefix)::cidr));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION app.asset_register_switch_is_switch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.switch_asset IS NOT NULL AND NOT EXISTS (SELECT 1 FROM app.physical_asset a WHERE a.tenant_id = NEW.tenant_id AND a.id = NEW.switch_asset AND a.category = 'switch' AND a.disposition <> 'RETIRED') THEN
    RAISE EXCEPTION 'EM023 a unit is patched to a switch unit that is not retired' USING ERRCODE = 'EM023'; END IF;
  IF NEW.switch_asset = NEW.asset_id THEN RAISE EXCEPTION 'EM023 a switch is not patched to itself' USING ERRCODE = 'EM023'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS asset_register_switch_is_switch ON app.asset_register_entry;
CREATE TRIGGER asset_register_switch_is_switch BEFORE INSERT ON app.asset_register_entry FOR EACH ROW EXECUTE FUNCTION app.asset_register_switch_is_switch();

CREATE TABLE app.firmware_baseline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES app.tenant(id),
  model         text NOT NULL CHECK (length(btrim(model)) BETWEEN 1 AND 120),
  version       text NOT NULL CHECK (version ~ '^[A-Za-z0-9][A-Za-z0-9._ -]{0,39}$'),
  note          text CHECK (note IS NULL OR length(note) <= 500),
  state         text NOT NULL DEFAULT 'PROPOSED' CHECK (state IN ('PROPOSED', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
  proposed_by   uuid NOT NULL REFERENCES app.person(id),
  proposed_at   timestamptz NOT NULL DEFAULT now(),
  decided_by    uuid REFERENCES app.person(id),
  decided_at    timestamptz,
  UNIQUE (tenant_id, id),
  CONSTRAINT firmware_baseline_decided CHECK ((state = 'PROPOSED') = (decided_by IS NULL) AND (decided_by IS NULL) = (decided_at IS NULL)),
  CONSTRAINT firmware_baseline_not_self_decided CHECK (decided_by IS NULL OR decided_by <> proposed_by)
);
SELECT app.tenant_rls('app.firmware_baseline');
CREATE UNIQUE INDEX firmware_baseline_one_approved ON app.firmware_baseline (tenant_id, lower(model)) WHERE state = 'APPROVED';
CREATE OR REPLACE FUNCTION app.firmware_baseline_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM023 a firmware baseline is never deleted' USING ERRCODE = 'EM023'; END IF;
  IF (NEW.model, NEW.version, NEW.note, NEW.proposed_by, NEW.proposed_at) IS DISTINCT FROM (OLD.model, OLD.version, OLD.note, OLD.proposed_by, OLD.proposed_at) THEN
    RAISE EXCEPTION 'EM023 a firmware baseline does not change: propose a new one' USING ERRCODE = 'EM023'; END IF;
  IF NOT ((OLD.state = 'PROPOSED' AND NEW.state IN ('APPROVED', 'REJECTED')) OR (OLD.state = 'APPROVED' AND NEW.state = 'SUPERSEDED')) THEN
    RAISE EXCEPTION 'EM023 a firmware baseline goes from % to % only by its rules', OLD.state, NEW.state USING ERRCODE = 'EM023'; END IF;
  IF OLD.state <> 'PROPOSED' AND (NEW.decided_by, NEW.decided_at) IS DISTINCT FROM (OLD.decided_by, OLD.decided_at) THEN
    RAISE EXCEPTION 'EM023 the decision on a firmware baseline is taken once' USING ERRCODE = 'EM023'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER firmware_baseline_guard BEFORE UPDATE OR DELETE ON app.firmware_baseline FOR EACH ROW EXECUTE FUNCTION app.firmware_baseline_guard();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT, UPDATE ON app.firmware_baseline TO empathia_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN GRANT SELECT ON app.firmware_baseline TO empathia_worker; END IF;
END $$;
