-- 0048 · The commissioning standard's intelligibility rule, held for every writer.
-- Founder, 19 Nov 2026 03:36, priority 2: "Protect the adaptive commissioning requirements, including Pass with Exception,
-- intelligibility exceptions, mandatory deficiency records, documentation gates, measurement workbenches, and baseline acceptance. Our
-- original commissioning standard explicitly treats these as enforceable requirements." The standard's control rule (the founder's
-- commissioning workbook, "Start here"; docs/product/COMMISSIONING_SOURCE_PARITY_MATRIX.md): "STI <= 0.40 or Fail/Marginal routes to
-- intelligibility exceptions." V3.9: "Intelligibility failures require dedicated exception records."
--
-- Until now a site criterion could accept a speech transmission index of 0.40 or less, a room with no criterion recorded an STI with no
-- verdict at all, and a dedicated exception record (0042) existed only where the room had a criterion. This adds:
--
--   * app.intelligibility_floor()   0.40, the standard's figure, in one place.
--   * a criterion guard              a site criterion for sti may be stricter than the standard, never looser: its lower limit is above
--                                    the floor.
--   * the result guard (0037, 0040)  an STI of 0.40 or less is never a PASS, with a site criterion or without one: a PASS citing it is
--                                    refused, and so is a PASS citing nothing while the latest STI of the test is at or below the floor.
--                                    It is recorded as FAIL, and the FAIL opens its deficiency (commissioning.ts, unchanged).
--   * app.exception_route()          which rule a failed test's exception record rests on: 'criterion' (0042, unchanged) or 'standard'
--                                    (no site criterion; the current FAIL rests on an STI at or below the floor). NULL: no record.
--   * 0042's fill and issue guards   follow the route. A 'standard' record names the floor as its limit (lower 0.40, no criterion, no
--                                    criterion version): never a site limit the room does not have.
-- Everything else of 0042 stands: the record's facts are the database's, it is decided once by someone other than its logger, and the
-- deficiency is excepted only on its own approved record.

CREATE OR REPLACE FUNCTION app.intelligibility_floor() RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 0.40::numeric $$;

CREATE OR REPLACE FUNCTION app.acceptance_criterion_standard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.metric = 'sti' AND (NEW.lower IS NULL OR NEW.lower <= app.intelligibility_floor()) THEN
    RAISE EXCEPTION 'the commissioning standard routes a speech transmission index of % or less to an intelligibility exception: a criterion for sti has a lower limit above it', app.intelligibility_floor() USING ERRCODE = 'EM019'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acceptance_criterion_standard BEFORE INSERT ON app.acceptance_criterion FOR EACH ROW EXECUTE FUNCTION app.acceptance_criterion_standard();

-- 0040's guard, with the standard's floor added (marked 0048)
CREATE OR REPLACE FUNCTION app.result_measurement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c app.acceptance_criterion%ROWTYPE; m app.measurement%ROWTYPE; has_criterion boolean; last_sti numeric;
BEGIN
  SELECT * INTO c FROM app.acceptance_criterion WHERE tenant_id = NEW.tenant_id AND room_id = NEW.room_id AND test_id = NEW.test_id ORDER BY version DESC LIMIT 1;
  has_criterion := FOUND;
  IF NEW.measurement_id IS NULL THEN
    IF has_criterion THEN RAISE EXCEPTION '% has an acceptance criterion on this room (version %): its result cites a measurement', NEW.test_id, c.version USING ERRCODE = 'EM019'; END IF;
    -- 0048: a PASS citing nothing does not step over an STI at or below the floor
    IF NEW.state = 'PASS' THEN
      SELECT x.value INTO last_sti FROM app.measurement x WHERE x.tenant_id = NEW.tenant_id AND x.room_id = NEW.room_id AND x.test_id = NEW.test_id AND x.metric = 'sti'
        ORDER BY x.created_at DESC, x.id DESC LIMIT 1;
      IF FOUND AND last_sti <= app.intelligibility_floor() THEN
        RAISE EXCEPTION 'the latest speech transmission index of % in this room is %, at or below %: the commissioning standard routes it to an intelligibility exception; a PASS cites a measurement above it', NEW.test_id, last_sti, app.intelligibility_floor() USING ERRCODE = 'EM019'; END IF;
    END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO m FROM app.measurement WHERE tenant_id = NEW.tenant_id AND id = NEW.measurement_id;
  IF NOT FOUND OR m.room_id <> NEW.room_id OR m.test_id IS DISTINCT FROM NEW.test_id THEN
    RAISE EXCEPTION 'the measurement cited is not a measurement of % in this room', NEW.test_id USING ERRCODE = 'EM019'; END IF;
  IF has_criterion AND m.criterion_id IS DISTINCT FROM c.id THEN
    RAISE EXCEPTION 'the measurement cited was not judged against the criterion in force (version %): measure again', c.version USING ERRCODE = 'EM019'; END IF;
  IF NEW.state = 'PASS' THEN
    IF m.approval_state = 'REJECTED' THEN RAISE EXCEPTION 'the measurement cited was rejected on review: it passes nothing' USING ERRCODE = 'EM019'; END IF;
    IF m.within IS FALSE THEN RAISE EXCEPTION 'the measurement cited does not meet the criterion: it cannot be recorded as PASS' USING ERRCODE = 'EM019'; END IF;
    -- 0048: the standard's floor, with a site criterion or without one
    IF m.metric = 'sti' AND m.value <= app.intelligibility_floor() THEN
      RAISE EXCEPTION 'a speech transmission index of % is at or below %: the commissioning standard routes it to an intelligibility exception; record it as FAIL', m.value, app.intelligibility_floor() USING ERRCODE = 'EM019'; END IF;
    IF has_criterion AND NOT ((m.provenance = 'FIELD_MEASURED' AND m.calibration_status = 'CALIBRATED') OR (m.provenance = 'SIMULATED' AND app.is_demo_tenant(NEW.tenant_id))) THEN
      RAISE EXCEPTION 'a % value (calibration %) does not pass a test that has a criterion: that takes a field measurement on a calibrated instrument', m.provenance, m.calibration_status USING ERRCODE = 'EM019'; END IF;
    -- 0040: a value the server can work out from its evidence passes only when the server did
    IF has_criterion AND m.metric IN ('t30_mid', 't20_mid') AND m.validation IS NULL THEN
      RAISE EXCEPTION 'the measurement cited was not worked out again from its evidence by the server: it passes nothing' USING ERRCODE = 'EM019'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- Which rule a failed test's exception record rests on.
CREATE OR REPLACE FUNCTION app.exception_route(p_tenant uuid, p_room uuid, p_test text) RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE cur record; m record;
BEGIN
  IF EXISTS (SELECT 1 FROM app.acceptance_criterion a WHERE a.tenant_id = p_tenant AND a.room_id = p_room AND a.test_id = p_test) THEN RETURN 'criterion'; END IF;
  SELECT r.state, r.measurement_id INTO cur FROM app.current_result c JOIN app.test_result r ON r.id = c.result_id WHERE c.room_id = p_room AND c.test_id = p_test;
  IF NOT FOUND OR cur.state <> 'FAIL' OR cur.measurement_id IS NULL THEN RETURN NULL; END IF;
  SELECT x.metric, x.value INTO m FROM app.measurement x WHERE x.tenant_id = p_tenant AND x.id = cur.measurement_id;
  IF FOUND AND m.metric = 'sti' AND m.value <= app.intelligibility_floor() THEN RETURN 'standard'; END IF;
  RETURN NULL;
END $$;

-- 0042's fill, following the route
CREATE OR REPLACE FUNCTION app.measured_exception_fill() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE iss record; cur record; m record; k record; t text; route text;
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
  route := app.exception_route(NEW.tenant_id, NEW.room_id, t);
  NEW.metric := m.metric; NEW.unit := m.unit; NEW.measured_value := m.value;
  IF route = 'criterion' AND m.criterion_id IS NOT NULL AND m.within IS FALSE THEN
    SELECT a.lower, a.upper, a.version INTO k FROM app.acceptance_criterion a WHERE a.id = m.criterion_id;
    NEW.criterion_id := m.criterion_id; NEW.lower := k.lower; NEW.upper := k.upper; NEW.criterion_version := k.version;
  ELSIF route = 'standard' THEN
    -- 0048: no site criterion; the limit is the commissioning standard's floor, and nothing pretends to be a site limit
    NEW.criterion_id := NULL; NEW.lower := app.intelligibility_floor(); NEW.upper := NULL; NEW.criterion_version := NULL;
  ELSE
    RAISE EXCEPTION 'EM020 an exception is for a measurement judged outside its criterion, or for a speech transmission index at or below the commissioning standard''s %', app.intelligibility_floor() USING ERRCODE = 'EM020';
  END IF;
  NEW.state := 'REQUESTED'; NEW.decided_by := NULL; NEW.decided_at := NULL; NEW.decision_note := NULL; NEW.logged_at := now();
  RETURN NEW;
END $$;

-- 0042's issue guard, following the route
CREATE OR REPLACE FUNCTION app.room_issue_measured_exception() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t text; e record;
BEGIN
  IF NEW.workflow <> 'ACCEPTED_EXCEPTION' OR OLD.workflow = 'ACCEPTED_EXCEPTION' THEN RETURN NEW; END IF;
  t := substring(NEW.key FROM '^test-failed:(.+)$');
  IF t IS NULL OR app.exception_route(NEW.tenant_id, NEW.room_id, t) IS NULL THEN RETURN NEW; END IF;
  SELECT x.logged_by, x.decided_by INTO e FROM app.measured_exception x
    WHERE x.issue_id = NEW.id AND x.code = NEW.exception_ref AND x.state = 'APPROVED';
  IF NOT FOUND OR e.logged_by IS DISTINCT FROM NEW.exception_requested_by OR e.decided_by IS DISTINCT FROM NEW.exception_approved_by THEN
    RAISE EXCEPTION 'EM020 a failed measured test is excepted only on its own approved exception record (reference, logger and decider as recorded)' USING ERRCODE = 'EM020'; END IF;
  RETURN NEW;
END $$;

-- a 'standard' record has no criterion and no criterion version; a 'criterion' record has both (0042's records all do)
ALTER TABLE app.measured_exception ADD CONSTRAINT measured_exception_limit_source
  CHECK ((criterion_id IS NULL) = (criterion_version IS NULL) AND (criterion_id IS NOT NULL OR (metric = 'sti' AND lower = 0.40 AND upper IS NULL)));

REVOKE EXECUTE ON FUNCTION app.acceptance_criterion_standard() FROM PUBLIC;
