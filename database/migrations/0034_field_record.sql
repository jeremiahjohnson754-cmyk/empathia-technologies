-- 0034 · Phase 1 installation documentation on the server: the field record and redlines.
-- Founder, 14 Nov 2026: "installation teams should tell us how everything is being mounted and have the lite design become like a
-- bluebeam redlining document … where are things mounted, hooked up to, did we change the position of a device during commissioning
-- because of a sprinkler"; and 17 Nov 2026: "make the Phase 1 field records database-backed, too."
--
-- Four records beside a room's design, none of which edits the design:
--   * app.field_mounting  how a position's device is held: method, height above the finished floor, fixing, backing, a safety tether for
--                         overhead mountings. Append-only versions: a correction is a new version, and the earlier ones stay.
--   * app.field_hookup    what a device is actually connected to: its port, the other end (a position of the room, or something outside
--                         it) and that port, the cable label. connection_id is the design's proposed connection it matches, when there
--                         is one ("as designed"); null means "recorded in the field, not in the design". The one permitted change is
--                         removing it once, with a reason.
--   * app.field_move      a device installed somewhere other than its designed position, with the reason (a sprinkler head, a diffuser…).
--                         PROPOSED until decided by someone who is not its recorder; an APPROVED move is the as-built position.
--   * app.field_markup    a note pinned to the plan, OPEN until resolved with a resolution.
-- EM016 is the field-record guard (the API answers 422).

CREATE TABLE app.field_mounting (
  id           bigserial PRIMARY KEY,
  tenant_id    uuid NOT NULL,
  room_id      uuid NOT NULL,
  position_id  uuid NOT NULL,
  version      integer NOT NULL CHECK (version >= 1),
  method       text NOT NULL CHECK (method IN ('ceiling-tile', 'ceiling-structure', 'wall-bracket', 'wall-box', 'under-table', 'rack', 'credenza', 'floor', 'other')),
  height_m     numeric(4,2) CHECK (height_m BETWEEN 0 AND 15),
  fixing       text NOT NULL DEFAULT '' CHECK (length(fixing) <= 300),
  backing      text NOT NULL DEFAULT '' CHECK (length(backing) <= 300),
  tether       text NOT NULL CHECK (tether IN ('yes', 'no', 'n/a')),
  note         text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  recorded_by  uuid NOT NULL REFERENCES app.person(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, position_id, version),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, position_id) REFERENCES app.planned_asset(tenant_id, id),
  CONSTRAINT field_mounting_overhead_tether CHECK (method NOT IN ('ceiling-tile', 'ceiling-structure') OR tether IN ('yes', 'no')),
  CONSTRAINT field_mounting_fixing CHECK (method IN ('other', 'floor') OR length(btrim(fixing)) > 0),
  CONSTRAINT field_mounting_other_note CHECK (method <> 'other' OR length(btrim(note)) > 0)
);
SELECT app.tenant_rls('app.field_mounting');
CREATE TRIGGER field_mounting_append_only BEFORE UPDATE OR DELETE ON app.field_mounting FOR EACH ROW EXECUTE FUNCTION app.refuse_change();

-- a device of this room (not furniture, not removed from the design), and versions in order
CREATE OR REPLACE FUNCTION app.field_position_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.planned_asset a WHERE a.tenant_id = NEW.tenant_id AND a.id = NEW.position_id AND a.room_id = NEW.room_id AND NOT a.furniture AND a.removed_at IS NULL) THEN
    RAISE EXCEPTION 'the field record names a device position of this room' USING ERRCODE = 'EM016'; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION app.field_mounting_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last int;
BEGIN
  SELECT coalesce(max(version), 0) INTO last FROM app.field_mounting WHERE tenant_id = NEW.tenant_id AND position_id = NEW.position_id;
  IF NEW.version <> last + 1 THEN RAISE EXCEPTION 'mounting version % does not follow % (written by someone else meanwhile)', NEW.version, last USING ERRCODE = '23505'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER field_mounting_position BEFORE INSERT ON app.field_mounting FOR EACH ROW EXECUTE FUNCTION app.field_position_guard();
CREATE TRIGGER field_mounting_version BEFORE INSERT ON app.field_mounting FOR EACH ROW EXECUTE FUNCTION app.field_mounting_version();

CREATE TABLE app.field_hookup (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  room_id         uuid NOT NULL,
  code            text NOT NULL CHECK (code ~ '^HK-[0-9]{4,10}$'),
  position_id     uuid NOT NULL,
  port            text NOT NULL CHECK (length(btrim(port)) BETWEEN 1 AND 60),
  to_position_id  uuid,
  to_outside      text CHECK (to_outside IN ('building network (outside the room)', 'power circuit', 'other room or rack')),
  to_port         text NOT NULL DEFAULT '' CHECK (length(to_port) <= 60),
  cable           text NOT NULL DEFAULT '' CHECK (length(cable) <= 60),
  connection_id   uuid,
  recorded_by     uuid NOT NULL REFERENCES app.person(id),
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  removed_at      timestamptz,
  removed_by      uuid REFERENCES app.person(id),
  removed_reason  text CHECK (removed_reason IS NULL OR length(btrim(removed_reason)) BETWEEN 3 AND 500),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, position_id) REFERENCES app.planned_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, to_position_id) REFERENCES app.planned_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, connection_id) REFERENCES app.connection(tenant_id, id),
  CONSTRAINT field_hookup_one_end CHECK ((to_position_id IS NULL) <> (to_outside IS NULL)),
  CONSTRAINT field_hookup_not_itself CHECK (to_position_id IS DISTINCT FROM position_id),
  CONSTRAINT field_hookup_removal CHECK ((removed_at IS NULL) = (removed_by IS NULL) AND (removed_at IS NULL) = (removed_reason IS NULL))
);
-- a port of a device is hooked up once at a time
CREATE UNIQUE INDEX field_hookup_port ON app.field_hookup (tenant_id, position_id, lower(btrim(port))) WHERE removed_at IS NULL;
CREATE INDEX field_hookup_room ON app.field_hookup (tenant_id, room_id);
SELECT app.tenant_rls('app.field_hookup');
CREATE OR REPLACE FUNCTION app.field_hookup_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'a hookup is removed with a reason, never deleted' USING ERRCODE = 'EM016'; END IF;
  IF OLD.removed_at IS NOT NULL OR NEW.removed_at IS NULL
     OR (NEW.id, NEW.tenant_id, NEW.room_id, NEW.code, NEW.position_id, NEW.port, NEW.to_position_id, NEW.to_outside, NEW.to_port, NEW.cable, NEW.connection_id, NEW.recorded_by, NEW.recorded_at)
        IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.room_id, OLD.code, OLD.position_id, OLD.port, OLD.to_position_id, OLD.to_outside, OLD.to_port, OLD.cable, OLD.connection_id, OLD.recorded_by, OLD.recorded_at) THEN
    RAISE EXCEPTION 'a hookup is immutable; the one change is removing it once' USING ERRCODE = 'EM016'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER field_hookup_guard BEFORE UPDATE OR DELETE ON app.field_hookup FOR EACH ROW EXECUTE FUNCTION app.field_hookup_guard();
CREATE TRIGGER field_hookup_position BEFORE INSERT ON app.field_hookup FOR EACH ROW EXECUTE FUNCTION app.field_position_guard();

CREATE TABLE app.field_move (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  room_id      uuid NOT NULL,
  code         text NOT NULL CHECK (code ~ '^FM-[0-9]{4,10}$'),
  position_id  uuid NOT NULL,
  from_x numeric(9,2) NOT NULL, from_y numeric(9,2) NOT NULL, to_x numeric(9,2) NOT NULL, to_y numeric(9,2) NOT NULL,
  reason       text NOT NULL CHECK (reason IN ('sprinkler head', 'HVAC diffuser or return', 'light fixture', 'structural member', 'ceiling grid or tile layout', 'access panel', 'power or data location', 'sightline or glare', 'client or architect request', 'other')),
  note         text NOT NULL DEFAULT '' CHECK (length(note) <= 1000),
  evidence_id  uuid,
  state        text NOT NULL DEFAULT 'PROPOSED' CHECK (state IN ('PROPOSED', 'APPROVED', 'REJECTED')),
  recorded_by  uuid NOT NULL REFERENCES app.person(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  decided_by   uuid REFERENCES app.person(id),
  decided_at   timestamptz,
  decision     text CHECK (decision IS NULL OR length(decision) <= 1000),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, position_id) REFERENCES app.planned_asset(tenant_id, id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  CONSTRAINT field_move_moved CHECK (from_x <> to_x OR from_y <> to_y),
  CONSTRAINT field_move_other_note CHECK (reason <> 'other' OR length(btrim(note)) > 0),
  CONSTRAINT field_move_decided CHECK ((state = 'PROPOSED') = (decided_by IS NULL) AND (decided_by IS NULL) = (decided_at IS NULL)),
  CONSTRAINT field_move_separation CHECK (decided_by IS NULL OR decided_by <> recorded_by),
  CONSTRAINT field_move_rejection_reason CHECK (state <> 'REJECTED' OR length(btrim(coalesce(decision, ''))) > 0)
);
-- one move waiting for a decision per device
CREATE UNIQUE INDEX field_move_one_proposed ON app.field_move (tenant_id, position_id) WHERE state = 'PROPOSED';
CREATE INDEX field_move_room ON app.field_move (tenant_id, room_id);
SELECT app.tenant_rls('app.field_move');
CREATE OR REPLACE FUNCTION app.field_move_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'a field move is decided, never deleted' USING ERRCODE = 'EM016'; END IF;
  IF OLD.state <> 'PROPOSED' OR NEW.state NOT IN ('APPROVED', 'REJECTED')
     OR (NEW.id, NEW.tenant_id, NEW.room_id, NEW.code, NEW.position_id, NEW.from_x, NEW.from_y, NEW.to_x, NEW.to_y, NEW.reason, NEW.note, NEW.evidence_id, NEW.recorded_by, NEW.recorded_at)
        IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.room_id, OLD.code, OLD.position_id, OLD.from_x, OLD.from_y, OLD.to_x, OLD.to_y, OLD.reason, OLD.note, OLD.evidence_id, OLD.recorded_by, OLD.recorded_at) THEN
    RAISE EXCEPTION 'a field move is decided once (PROPOSED to APPROVED or REJECTED); what was recorded does not change' USING ERRCODE = 'EM016'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER field_move_guard BEFORE UPDATE OR DELETE ON app.field_move FOR EACH ROW EXECUTE FUNCTION app.field_move_guard();
CREATE TRIGGER field_move_position BEFORE INSERT ON app.field_move FOR EACH ROW EXECUTE FUNCTION app.field_position_guard();

CREATE TABLE app.field_markup (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  room_id      uuid NOT NULL,
  code         text NOT NULL CHECK (code ~ '^RL-[0-9]{4,10}$'),
  x numeric(9,2) NOT NULL, y numeric(9,2) NOT NULL,
  body         text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 1000),
  state        text NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN', 'RESOLVED')),
  recorded_by  uuid NOT NULL REFERENCES app.person(id),
  recorded_at  timestamptz NOT NULL DEFAULT now(),
  resolved_by  uuid REFERENCES app.person(id),
  resolved_at  timestamptz,
  resolution   text CHECK (resolution IS NULL OR length(btrim(resolution)) BETWEEN 1 AND 1000),
  UNIQUE (tenant_id, id), UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  CONSTRAINT field_markup_resolved CHECK ((state = 'RESOLVED') = (resolved_by IS NOT NULL) AND (resolved_by IS NULL) = (resolved_at IS NULL) AND (resolved_by IS NULL) = (resolution IS NULL))
);
CREATE INDEX field_markup_room ON app.field_markup (tenant_id, room_id);
SELECT app.tenant_rls('app.field_markup');
CREATE OR REPLACE FUNCTION app.field_markup_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'a note is resolved, never deleted' USING ERRCODE = 'EM016'; END IF;
  IF OLD.state <> 'OPEN' OR NEW.state <> 'RESOLVED'
     OR (NEW.id, NEW.tenant_id, NEW.room_id, NEW.code, NEW.x, NEW.y, NEW.body, NEW.recorded_by, NEW.recorded_at) IS DISTINCT FROM (OLD.id, OLD.tenant_id, OLD.room_id, OLD.code, OLD.x, OLD.y, OLD.body, OLD.recorded_by, OLD.recorded_at) THEN
    RAISE EXCEPTION 'a note is resolved once; what it says does not change' USING ERRCODE = 'EM016'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER field_markup_guard BEFORE UPDATE OR DELETE ON app.field_markup FOR EACH ROW EXECUTE FUNCTION app.field_markup_guard();

REVOKE ALL ON app.field_mounting, app.field_hookup, app.field_move, app.field_markup FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT ON app.field_mounting TO empathia_app;
    GRANT USAGE, SELECT ON SEQUENCE app.field_mounting_id_seq TO empathia_app;
    GRANT SELECT, INSERT ON app.field_hookup, app.field_move, app.field_markup TO empathia_app;
    GRANT UPDATE (removed_at, removed_by, removed_reason) ON app.field_hookup TO empathia_app;
    GRANT UPDATE (state, decided_by, decided_at, decision) ON app.field_move TO empathia_app;
    GRANT UPDATE (state, resolved_by, resolved_at, resolution) ON app.field_markup TO empathia_app;
  END IF;
END $$;
