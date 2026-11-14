-- 0030 · Asset retirement: a replaced unit leaves the active inventory, and its code is never used again (founder, 14 Nov 2026:
-- "a replaced device/asset ID must be removed from the asset inventory but the record of that identifier must never be used again but
-- be fully remembered"). ADR-0012 already made a unit's code unique per tenant and its row undeletable, so a code can never be issued
-- twice; this adds the disposition of a unit:
--   * IN_SERVICE  installed at a position, or held as a spare that may be installed;
--   * RETIRED     out of the inventory for good: replaced, failed, disposed of or returned. Final. A retired unit is never installed
--                 again, never returns to service, and keeps its whole history (identity events, every installation, the retirement).
-- A like-for-like replacement retires the unit it takes out unless the person replacing it says the unit goes back to the spares
-- (the API decides; this file is the backstop). Nothing is deleted and no code is freed.
-- Rollback: database/rollbacks/0030_asset_retirement.down.sql (drops only what this file adds; refuses if any unit is retired).

ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS disposition text NOT NULL DEFAULT 'IN_SERVICE' CHECK (disposition IN ('IN_SERVICE', 'RETIRED'));
ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS retired_at timestamptz;
ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS retired_by uuid REFERENCES app.person(id);
ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS retired_role text;
ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS retirement_reason text CHECK (retirement_reason IS NULL OR retirement_reason IN ('REPLACED', 'FAILED', 'DISPOSED', 'RETURNED_TO_VENDOR', 'LOST'));
ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS retirement_note text CHECK (retirement_note IS NULL OR length(retirement_note) <= 500);
ALTER TABLE app.physical_asset ADD COLUMN IF NOT EXISTS retirement_correlation_id text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'physical_asset_retirement_complete') THEN
    ALTER TABLE app.physical_asset ADD CONSTRAINT physical_asset_retirement_complete CHECK (
      (disposition = 'RETIRED') = (retired_at IS NOT NULL) AND (disposition = 'RETIRED') = (retired_by IS NOT NULL)
      AND (disposition = 'RETIRED') = (retirement_reason IS NOT NULL) AND (disposition = 'RETIRED') = (retirement_correlation_id IS NOT NULL));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS physical_asset_disposition ON app.physical_asset (tenant_id, disposition);

-- The guard of 0026, extended: an update either moves the identity forward (as before) or retires the unit (IN_SERVICE → RETIRED,
-- once, with no identity change); never both, never back. Code, category, model and origin stay immutable.
CREATE OR REPLACE FUNCTION app.physical_asset_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rank_old int; rank_new int;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'a physical asset is never deleted: its history follows the unit' USING ERRCODE = 'EM009'; END IF;
  IF (NEW.id, NEW.tenant_id, NEW.code, NEW.category, NEW.model, NEW.origin, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.code, OLD.category, OLD.model, OLD.origin, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'a physical asset''s code, category, model and origin are immutable (a different model is a different unit)' USING ERRCODE = 'EM009'; END IF;
  IF OLD.disposition = 'RETIRED' THEN
    RAISE EXCEPTION 'asset % is retired: a retired unit never changes again and its code is never reused', OLD.code USING ERRCODE = 'EM009'; END IF;
  IF NEW.disposition = 'RETIRED' THEN
    IF (NEW.identity_state, NEW.serial, NEW.manufacturer, NEW.identity_evidence_id, NEW.identity_by, NEW.identity_at)
       IS DISTINCT FROM (OLD.identity_state, OLD.serial, OLD.manufacturer, OLD.identity_evidence_id, OLD.identity_by, OLD.identity_at) THEN
      RAISE EXCEPTION 'retiring a unit changes nothing else about it' USING ERRCODE = 'EM009'; END IF;
    IF EXISTS (SELECT 1 FROM app.asset_installation i WHERE i.tenant_id = NEW.tenant_id AND i.asset_id = NEW.id AND i.removed_at IS NULL) THEN
      RAISE EXCEPTION 'asset % is still installed: close its installation before retiring it', NEW.code USING ERRCODE = 'EM009'; END IF;
    RETURN NEW;
  END IF;
  IF (NEW.retired_at, NEW.retired_by, NEW.retired_role, NEW.retirement_reason, NEW.retirement_note, NEW.retirement_correlation_id)
     IS DISTINCT FROM (OLD.retired_at, OLD.retired_by, OLD.retired_role, OLD.retirement_reason, OLD.retirement_note, OLD.retirement_correlation_id) THEN
    RAISE EXCEPTION 'retirement columns change only when a unit is retired' USING ERRCODE = 'EM009'; END IF;
  rank_old := array_position(ARRAY['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'], OLD.identity_state);
  rank_new := array_position(ARRAY['UNKNOWN', 'DECLARED', 'OBSERVED', 'VERIFIED'], NEW.identity_state);
  IF rank_new <= rank_old THEN RAISE EXCEPTION 'identity % → % is not a step forward (an identity is never downgraded or re-recorded)', OLD.identity_state, NEW.identity_state USING ERRCODE = 'EM009'; END IF;
  IF OLD.serial IS NOT NULL AND NEW.serial IS DISTINCT FROM OLD.serial THEN RAISE EXCEPTION 'a recorded serial is final: a different serial is a different unit' USING ERRCODE = 'EM009'; END IF;
  IF OLD.manufacturer IS NOT NULL AND NEW.manufacturer IS DISTINCT FROM OLD.manufacturer THEN RAISE EXCEPTION 'a recorded manufacturer is final' USING ERRCODE = 'EM009'; END IF;
  RETURN NEW;
END $$;

-- A retired unit is never installed again (the API refuses first; this is the backstop).
CREATE OR REPLACE FUNCTION app.installation_not_retired() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM app.physical_asset a WHERE a.tenant_id = NEW.tenant_id AND a.id = NEW.asset_id AND a.disposition = 'RETIRED') THEN
    RAISE EXCEPTION 'a retired unit is never installed again (its code stays on record and is never reused)' USING ERRCODE = 'EM009'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS installation_not_retired ON app.asset_installation;
CREATE TRIGGER installation_not_retired BEFORE INSERT ON app.asset_installation FOR EACH ROW EXECUTE FUNCTION app.installation_not_retired();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT UPDATE (disposition, retired_at, retired_by, retired_role, retirement_reason, retirement_note, retirement_correlation_id) ON app.physical_asset TO empathia_app;
  END IF;
END $$;
