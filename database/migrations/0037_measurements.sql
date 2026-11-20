-- 0037 · Acceptance criteria, and measurements judged against them.
-- Founder, 17 Nov 2026, 15:29: "a single, truly interactive flagship engineering workstation around SCI-110, with the measurement benches
-- writing directly to authoritative server records"; 15:50: "run a genuinely interactive commissioning measurement, attach evidence,
-- generate a failed test and deficiency".
--
-- The measurement record already exists (0013, ADR-0004): a value with its unit, method, instrument, calibration, provenance and
-- approval. What it could not say is which test it answers, what the room had to meet, or whether it met it; and a result (0003) could
-- be recorded PASS with nothing but an evidence file and the name of an instrument. This migration adds, to the records that exist:
--
--   * app.acceptance_criterion  what a room has to meet for one test: a metric, a unit, and a lower and/or upper limit, with where the
--                               limit comes from. Set by the design authority. Append-only versions: a changed limit is a new version
--                               and the earlier ones stay, so a measurement always names the version it was judged against.
--   * app.measurement           gains the test it answers, the evidence file it rests on, a bounded detail (positions, bands) and the
--                               judgement: the criterion in force when it was recorded and whether the value is within it. The
--                               judgement is worked out HERE, by the database, and never taken from the request.
--   * app.test_result           gains the measurement it rests on.
--
-- and one rule joins them: when a room has a criterion for a test, a result for that test cites a measurement of that test judged
-- against the criterion in force, and PASS is refused unless the value is within it and its provenance can carry a pass: a field
-- measurement on a calibrated instrument — or, inside a demonstration sandbox only, a SIMULATED value, where every record is synthetic
-- and says so. Outside a sandbox a simulated, inferred, observed or design-specified value passes nothing (ADR-0004 stands).
--
-- A room with no criterion for a test is unchanged: its measurements have no judgement and its results are recorded as before.
-- EM019 is the criterion guard (the API answers 422).

CREATE TABLE app.acceptance_criterion (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL,
  room_id    uuid NOT NULL,
  test_id    text NOT NULL CHECK (length(test_id) BETWEEN 1 AND 80),
  version    integer NOT NULL CHECK (version >= 1),
  metric     text NOT NULL CHECK (metric ~ '^[a-z][a-z0-9_]{1,60}$'),
  unit       text NOT NULL CHECK (length(unit) BETWEEN 1 AND 20),
  lower      numeric(12,4),
  upper      numeric(12,4),
  source     text NOT NULL CHECK (length(btrim(source)) BETWEEN 3 AND 300),
  set_by     uuid NOT NULL REFERENCES app.person(id),
  set_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, room_id, test_id, version),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  CONSTRAINT acceptance_criterion_has_a_limit CHECK (lower IS NOT NULL OR upper IS NOT NULL),
  CONSTRAINT acceptance_criterion_limits_in_order CHECK (lower IS NULL OR upper IS NULL OR lower <= upper)
);
SELECT app.tenant_rls('app.acceptance_criterion');
CREATE TRIGGER acceptance_criterion_append_only BEFORE UPDATE OR DELETE ON app.acceptance_criterion FOR EACH ROW EXECUTE FUNCTION app.refuse_change();

CREATE OR REPLACE FUNCTION app.acceptance_criterion_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE last int;
BEGIN
  SELECT coalesce(max(version), 0) INTO last FROM app.acceptance_criterion WHERE tenant_id = NEW.tenant_id AND room_id = NEW.room_id AND test_id = NEW.test_id;
  IF NEW.version <> last + 1 THEN RAISE EXCEPTION 'criterion version % does not follow % (set by someone else meanwhile)', NEW.version, last USING ERRCODE = '23505'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acceptance_criterion_version BEFORE INSERT ON app.acceptance_criterion FOR EACH ROW EXECUTE FUNCTION app.acceptance_criterion_version();

ALTER TABLE app.measurement
  ADD COLUMN test_id text CHECK (length(test_id) BETWEEN 1 AND 80),
  ADD COLUMN evidence_id uuid,
  ADD COLUMN detail jsonb CHECK (detail IS NULL OR (jsonb_typeof(detail) = 'object' AND pg_column_size(detail) <= 65536)),
  -- filled by the trigger below, never by the writer
  ADD COLUMN criterion_id uuid,
  ADD COLUMN within boolean,
  ADD CONSTRAINT measurement_evidence_fk FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  ADD CONSTRAINT measurement_criterion_fk FOREIGN KEY (tenant_id, criterion_id) REFERENCES app.acceptance_criterion(tenant_id, id),
  ADD CONSTRAINT measurement_judged CHECK ((criterion_id IS NULL) = (within IS NULL)),
  ADD CONSTRAINT measurement_judged_for_a_test CHECK (criterion_id IS NULL OR test_id IS NOT NULL);
CREATE INDEX measurement_test_idx ON app.measurement (tenant_id, room_id, test_id, created_at DESC) WHERE test_id IS NOT NULL;

-- The database judges the value. Whatever the writer sent for criterion_id and within is replaced.
CREATE OR REPLACE FUNCTION app.measurement_judge() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c app.acceptance_criterion%ROWTYPE;
BEGIN
  NEW.criterion_id := NULL; NEW.within := NULL;
  IF NEW.test_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO c FROM app.acceptance_criterion WHERE tenant_id = NEW.tenant_id AND room_id = NEW.room_id AND test_id = NEW.test_id ORDER BY version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.metric <> c.metric OR NEW.unit <> c.unit THEN
    RAISE EXCEPTION 'the criterion for % is % in "%"; this measurement is % in "%"', NEW.test_id, c.metric, c.unit, NEW.metric, NEW.unit USING ERRCODE = 'EM019'; END IF;
  NEW.criterion_id := c.id;
  NEW.within := (c.lower IS NULL OR NEW.value >= c.lower) AND (c.upper IS NULL OR NEW.value <= c.upper);
  RETURN NEW;
END $$;
CREATE TRIGGER measurement_judge BEFORE INSERT ON app.measurement FOR EACH ROW EXECUTE FUNCTION app.measurement_judge();

-- the immutability rule (0013, 0025) now covers the test, the evidence, the detail and the judgement as well
CREATE OR REPLACE FUNCTION app.measurement_approval_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM006 measurements are never deleted'; END IF;
  IF (NEW.value, NEW.unit, NEW.provenance, NEW.metric, NEW.measured_at, NEW.method, NEW.recorded_by, NEW.instrument_id, NEW.calibration_status, NEW.calibration_due, NEW.location, NEW.source, NEW.uncertainty, NEW.import_id, NEW.import_row,
      NEW.test_id, NEW.evidence_id, NEW.detail, NEW.criterion_id, NEW.within)
     IS DISTINCT FROM (OLD.value, OLD.unit, OLD.provenance, OLD.metric, OLD.measured_at, OLD.method, OLD.recorded_by, OLD.instrument_id, OLD.calibration_status, OLD.calibration_due, OLD.location, OLD.source, OLD.uncertainty, OLD.import_id, OLD.import_row,
      OLD.test_id, OLD.evidence_id, OLD.detail, OLD.criterion_id, OLD.within) THEN
    RAISE EXCEPTION 'EM006 a measurement is immutable; only its approval state may change'; END IF;
  IF OLD.approval_state <> 'UNREVIEWED' THEN RAISE EXCEPTION 'EM006 an approval decision is final; record a new measurement'; END IF;
  RETURN NEW;
END $$;

-- A result may cite the measurement it rests on.
ALTER TABLE app.test_result ADD COLUMN measurement_id uuid;
ALTER TABLE app.test_result ADD CONSTRAINT test_result_measurement_fk FOREIGN KEY (tenant_id, measurement_id) REFERENCES app.measurement(tenant_id, id);

-- The rule that joins them. It is here as well as in the API so that no path to the table goes round it.
CREATE OR REPLACE FUNCTION app.result_measurement_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c app.acceptance_criterion%ROWTYPE; m app.measurement%ROWTYPE; has_criterion boolean;
BEGIN
  SELECT * INTO c FROM app.acceptance_criterion WHERE tenant_id = NEW.tenant_id AND room_id = NEW.room_id AND test_id = NEW.test_id ORDER BY version DESC LIMIT 1;
  has_criterion := FOUND;
  IF NEW.measurement_id IS NULL THEN
    IF has_criterion THEN RAISE EXCEPTION '% has an acceptance criterion on this room (version %): its result cites a measurement', NEW.test_id, c.version USING ERRCODE = 'EM019'; END IF;
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
    IF has_criterion AND NOT ((m.provenance = 'FIELD_MEASURED' AND m.calibration_status = 'CALIBRATED') OR (m.provenance = 'SIMULATED' AND app.is_demo_tenant(NEW.tenant_id))) THEN
      RAISE EXCEPTION 'a % value (calibration %) does not pass a test that has a criterion: that takes a field measurement on a calibrated instrument', m.provenance, m.calibration_status USING ERRCODE = 'EM019'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER test_result_measurement_guard BEFORE INSERT ON app.test_result FOR EACH ROW EXECUTE FUNCTION app.result_measurement_guard();

REVOKE ALL ON app.acceptance_criterion FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION app.acceptance_criterion_version(), app.measurement_judge(), app.result_measurement_guard() FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT ON app.acceptance_criterion TO empathia_app;
  END IF;
END $$;
