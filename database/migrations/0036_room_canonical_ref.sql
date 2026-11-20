-- 0036: a room keeps the identifier it has in the canonical estate.
--
-- Founder, 17 Nov 2026 (50/10): "Preserve original identifiers." "Do not delete, duplicate, or silently renumber existing assets."
-- And: "One underlying reality. Multiple specialized perspectives."
--
-- The estates name their rooms (the university's lecture theatre is UNI-SCI-110). The server names a room with a code of its own
-- (R-PLN-0001). Until now a room made on the server from an estate record had no way to say which estate record it is, so the two
-- were the same room only by a name that happened to match. canonical_ref is that identifier, kept exactly as the estate writes it:
--   * optional (a room planned from nothing has none);
--   * unique within a tenant (one server room per estate record; another tenant has its own);
--   * never changed and never removed once set (a correction is a new room, with the history of the old one kept).
-- It is an identifier, not a permission: reading a room by it goes through the same row-level security and site scope as any read.

ALTER TABLE app.room ADD COLUMN canonical_ref text
  CHECK (canonical_ref IS NULL OR canonical_ref ~ '^[A-Z][A-Z0-9]{1,11}(-[A-Z0-9]{1,12}){1,5}$');
COMMENT ON COLUMN app.room.canonical_ref IS 'The room''s identifier in the canonical estate (for example UNI-SCI-110), exactly as written there. Unique per tenant; immutable once set.';
CREATE UNIQUE INDEX room_canonical_ref_uq ON app.room (tenant_id, canonical_ref) WHERE canonical_ref IS NOT NULL;

CREATE FUNCTION app.room_canonical_ref_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.canonical_ref IS NOT NULL AND NEW.canonical_ref IS DISTINCT FROM OLD.canonical_ref THEN
    RAISE EXCEPTION 'a room''s canonical reference is not changed or removed once set (% stays %)', OLD.code, OLD.canonical_ref USING ERRCODE = 'EM018';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER room_canonical_ref_immutable BEFORE UPDATE OF canonical_ref ON app.room FOR EACH ROW EXECUTE FUNCTION app.room_canonical_ref_guard();
-- a trigger function is run by the trigger, not called: no role needs to be able to call it
REVOKE ALL ON FUNCTION app.room_canonical_ref_guard() FROM PUBLIC;
