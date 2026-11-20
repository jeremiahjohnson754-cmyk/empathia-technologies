-- Rollback of 0030_asset_retirement.sql. Refuses when any unit is retired: dropping the disposition would put a retired code back
-- into the inventory, which is exactly what 0030 exists to prevent. Restores the 0026 guard.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM app.physical_asset WHERE disposition = 'RETIRED') THEN
    RAISE EXCEPTION 'refusing to roll back 0030: retired units exist, and their codes must never return to the inventory';
  END IF;
END $$;
DROP TRIGGER IF EXISTS installation_not_retired ON app.asset_installation;
DROP FUNCTION IF EXISTS app.installation_not_retired();
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
DROP INDEX IF EXISTS app.physical_asset_disposition;
ALTER TABLE app.physical_asset DROP CONSTRAINT IF EXISTS physical_asset_retirement_complete;
ALTER TABLE app.physical_asset DROP COLUMN IF EXISTS retirement_correlation_id, DROP COLUMN IF EXISTS retirement_note, DROP COLUMN IF EXISTS retirement_reason,
  DROP COLUMN IF EXISTS retired_role, DROP COLUMN IF EXISTS retired_by, DROP COLUMN IF EXISTS retired_at, DROP COLUMN IF EXISTS disposition;
