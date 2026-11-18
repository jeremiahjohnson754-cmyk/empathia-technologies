-- 0042 · Pass with Exception: a dedicated exception record for a measured test that failed its criterion.
-- 50/10 master directive §3.1, the V3.9 rules: "Pass with Exception also requires a deficiency." "Intelligibility failures require
-- dedicated exception records." "Acceptance cannot bypass server-side rules." Source reconciliation item 4: the workbook's exception
-- holds the measured value, why it is poor, the root cause, the mitigation, the evidence, the date and who logged it.
--
-- Until now a deficiency could be put in ACCEPTED_EXCEPTION with any text as its exception reference (0032 checked only that a
-- reference, a requester and a different approver were named), and an excepted deficiency still blocked acceptance as open. This adds:
--
--   * app.measured_exception   one per deficiency opened by a failed measured test (key 'test-failed:<test>') in a room with a
--                              criterion for that test. It cites the measurement the current FAIL rests on; the measured value,
--                              metric, unit, limits and criterion version are copied HERE from that measurement and its criterion,
--                              never from the request. Logged with why the value is poor, the root cause and the mitigation; decided
--                              once (APPROVED or REJECTED) by someone other than its logger. Its content never changes, it is never
--                              deleted.
--   * a guard on app.room_issue: such a deficiency goes to ACCEPTED_EXCEPTION only on its own APPROVED record (reference = the record's
--                              code, requester = its logger, approver = its decider), whoever the writer is.
--
-- Acceptance (domain/rooms.ts, engine lifecycle.ts) then counts the test as PASS WITH EXCEPTION: not a pass, never shown as one, and
-- recorded so in the baseline. Deficiencies of other kinds keep 0032's rules and still block acceptance while excepted.

CREATE TABLE app.measured_exception (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES app.tenant(id),
  code           text NOT NULL CHECK (code ~ '^EXC-[0-9]{4,}$'),
  room_id        uuid NOT NULL,
  issue_id       uuid NOT NULL REFERENCES app.room_issue(id),
  test_id        text NOT NULL CHECK (length(test_id) BETWEEN 1 AND 80),
  measurement_id uuid NOT NULL,
  criterion_id   uuid,
  metric         text,
  unit           text,
  measured_value numeric,
  lower          numeric(12,4),
  upper          numeric(12,4),
  criterion_version integer,
  why_poor       text NOT NULL CHECK (length(btrim(why_poor)) BETWEEN 10 AND 2000),
  root_cause     text NOT NULL CHECK (length(btrim(root_cause)) BETWEEN 5 AND 1000),
  mitigation     text NOT NULL CHECK (length(btrim(mitigation)) BETWEEN 10 AND 2000),
  evidence_id    uuid,
  logged_by      uuid NOT NULL REFERENCES app.person(id),
  logged_at      timestamptz NOT NULL DEFAULT now(),
  state          text NOT NULL DEFAULT 'REQUESTED' CHECK (state IN ('REQUESTED', 'APPROVED', 'REJECTED')),
  decided_by     uuid REFERENCES app.person(id),
  decided_at     timestamptz,
  decision_note  text CHECK (decision_note IS NULL OR length(decision_note) <= 2000),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, code),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, measurement_id) REFERENCES app.measurement(tenant_id, id),
  CONSTRAINT measured_exception_decided CHECK ((state = 'REQUESTED') = (decided_by IS NULL) AND (decided_by IS NULL) = (decided_at IS NULL)),
  CONSTRAINT measured_exception_not_self_decided CHECK (decided_by IS NULL OR decided_by <> logged_by)
);
-- one live record per deficiency: a rejected one may be followed by a new one, never two at once
CREATE UNIQUE INDEX measured_exception_one_live ON app.measured_exception (issue_id) WHERE state <> 'REJECTED';
SELECT app.tenant_rls('app.measured_exception');

-- The record is filled from the database: the deficiency must be a failed measured test of this room with a criterion, and the
-- measurement must be the one the test's current FAIL rests on. Whatever the writer sent for the copied facts is replaced.
CREATE OR REPLACE FUNCTION app.measured_exception_fill() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iss record; cur record; m record; k record; t text;
BEGIN
  SELECT i.room_id, i.key, i.workflow, i.category INTO iss FROM app.room_issue i WHERE i.id = NEW.issue_id AND i.tenant_id = NEW.tenant_id;
  IF NOT FOUND OR iss.room_id <> NEW.room_id THEN RAISE EXCEPTION 'EM020 the deficiency is not one of this room' USING ERRCODE = 'EM020'; END IF;
  t := substring(iss.key FROM '^test-failed:(.+)$');
  IF t IS NULL THEN RAISE EXCEPTION 'EM020 a measured exception is for a deficiency opened by a failed test' USING ERRCODE = 'EM020'; END IF;
  IF iss.workflow IN ('CLOSED', 'ACCEPTED_EXCEPTION') THEN RAISE EXCEPTION 'EM020 the deficiency is %: nothing to except', iss.workflow USING ERRCODE = 'EM020'; END IF;
  NEW.test_id := t;
  SELECT r.state, r.measurement_id INTO cur FROM app.current_result c JOIN app.test_result r ON r.id = c.result_id WHERE c.room_id = NEW.room_id AND c.test_id = t;
  IF NOT FOUND OR cur.state <> 'FAIL' OR cur.measurement_id IS NULL THEN
    RAISE EXCEPTION 'EM020 the current result of % is not a FAIL resting on a measurement', t USING ERRCODE = 'EM020'; END IF;
  NEW.measurement_id := cur.measurement_id;
  SELECT x.value, x.metric, x.unit, x.criterion_id, x.within INTO m FROM app.measurement x WHERE x.id = cur.measurement_id;
  IF m.criterion_id IS NULL OR m.within IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'EM020 an exception is for a measurement judged outside its criterion' USING ERRCODE = 'EM020'; END IF;
  SELECT a.lower, a.upper, a.version INTO k FROM app.acceptance_criterion a WHERE a.id = m.criterion_id;
  NEW.criterion_id := m.criterion_id; NEW.metric := m.metric; NEW.unit := m.unit; NEW.measured_value := m.value;
  NEW.lower := k.lower; NEW.upper := k.upper; NEW.criterion_version := k.version;
  NEW.state := 'REQUESTED'; NEW.decided_by := NULL; NEW.decided_at := NULL; NEW.decision_note := NULL; NEW.logged_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER measured_exception_fill BEFORE INSERT ON app.measured_exception FOR EACH ROW EXECUTE FUNCTION app.measured_exception_fill();

-- content immutable; one decision, from REQUESTED; never deleted
CREATE OR REPLACE FUNCTION app.measured_exception_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM020 an exception record is never deleted' USING ERRCODE = 'EM020'; END IF;
  IF (NEW.code, NEW.room_id, NEW.issue_id, NEW.test_id, NEW.measurement_id, NEW.criterion_id, NEW.metric, NEW.unit, NEW.measured_value, NEW.lower, NEW.upper,
      NEW.criterion_version, NEW.why_poor, NEW.root_cause, NEW.mitigation, NEW.evidence_id, NEW.logged_by, NEW.logged_at)
     IS DISTINCT FROM
     (OLD.code, OLD.room_id, OLD.issue_id, OLD.test_id, OLD.measurement_id, OLD.criterion_id, OLD.metric, OLD.unit, OLD.measured_value, OLD.lower, OLD.upper,
      OLD.criterion_version, OLD.why_poor, OLD.root_cause, OLD.mitigation, OLD.evidence_id, OLD.logged_by, OLD.logged_at) THEN
    RAISE EXCEPTION 'EM020 an exception record is immutable; only its decision is taken, once' USING ERRCODE = 'EM020'; END IF;
  IF OLD.state <> 'REQUESTED' THEN RAISE EXCEPTION 'EM020 the exception was decided already (%)', OLD.state USING ERRCODE = 'EM020'; END IF;
  IF NEW.state = 'REQUESTED' THEN RAISE EXCEPTION 'EM020 a decision is APPROVED or REJECTED' USING ERRCODE = 'EM020'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER measured_exception_guard BEFORE UPDATE OR DELETE ON app.measured_exception FOR EACH ROW EXECUTE FUNCTION app.measured_exception_guard();

-- a deficiency opened by a failed measured test with a criterion is excepted only on its own approved record
CREATE OR REPLACE FUNCTION app.room_issue_measured_exception() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t text; e record;
BEGIN
  IF NEW.workflow <> 'ACCEPTED_EXCEPTION' OR OLD.workflow = 'ACCEPTED_EXCEPTION' THEN RETURN NEW; END IF;
  t := substring(NEW.key FROM '^test-failed:(.+)$');
  IF t IS NULL OR NOT EXISTS (SELECT 1 FROM app.acceptance_criterion a WHERE a.tenant_id = NEW.tenant_id AND a.room_id = NEW.room_id AND a.test_id = t) THEN RETURN NEW; END IF;
  SELECT x.logged_by, x.decided_by INTO e FROM app.measured_exception x
    WHERE x.issue_id = NEW.id AND x.code = NEW.exception_ref AND x.state = 'APPROVED';
  IF NOT FOUND OR e.logged_by IS DISTINCT FROM NEW.exception_requested_by OR e.decided_by IS DISTINCT FROM NEW.exception_approved_by THEN
    RAISE EXCEPTION 'EM020 a failed measured test is excepted only on its own approved exception record (reference, logger and decider as recorded)' USING ERRCODE = 'EM020'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER room_issue_measured_exception BEFORE UPDATE ON app.room_issue FOR EACH ROW EXECUTE FUNCTION app.room_issue_measured_exception();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.measured_exception TO empathia_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_worker') THEN
    GRANT SELECT ON app.measured_exception TO empathia_worker;
  END IF;
END $$;
