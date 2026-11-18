-- 0040 · A measured value the server worked out itself.
-- Founder, 17 Nov 2026, 19:05: "independent evidence validation". ADR-0014 said plainly what was missing: "The server does not
-- recompute the value from the evidence file. It records the value the recorder sends, with the file."
--
-- For the metrics the server can work out (reverberation: t30_mid, t20_mid) it now does (domain/recompute.ts): it reads the analysis
-- package and each impulse response, runs the same analysis the bench ran, and records ITS value. A value sent that differs is refused.
--
--   validation   on a measurement: how the server arrived at the value it recorded — the method, the value that was sent, the value
--                it worked out, and per position the source it read and the figures it got. Null on a measurement whose metric the
--                server does not work out, and on one recorded before this migration. Immutable with the rest of the measurement.
--
-- and the rule on results (0037) gains a line: PASS on a test that has a criterion, in a metric the server works out, is refused on a
-- measurement that carries no validation. The database cannot repeat the analysis; it holds that the analysis was done.

ALTER TABLE app.measurement ADD COLUMN validation jsonb CHECK (validation IS NULL OR jsonb_typeof(validation) = 'object');

CREATE OR REPLACE FUNCTION app.measurement_approval_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM006 measurements are never deleted'; END IF;
  IF (NEW.value, NEW.unit, NEW.provenance, NEW.metric, NEW.measured_at, NEW.method, NEW.recorded_by, NEW.instrument_id, NEW.calibration_status, NEW.calibration_due, NEW.location, NEW.source, NEW.uncertainty, NEW.import_id, NEW.import_row,
      NEW.test_id, NEW.evidence_id, NEW.detail, NEW.criterion_id, NEW.within, NEW.validation)
     IS DISTINCT FROM (OLD.value, OLD.unit, OLD.provenance, OLD.metric, OLD.measured_at, OLD.method, OLD.recorded_by, OLD.instrument_id, OLD.calibration_status, OLD.calibration_due, OLD.location, OLD.source, OLD.uncertainty, OLD.import_id, OLD.import_row,
      OLD.test_id, OLD.evidence_id, OLD.detail, OLD.criterion_id, OLD.within, OLD.validation) THEN
    RAISE EXCEPTION 'EM006 a measurement is immutable; only its approval state may change'; END IF;
  IF OLD.approval_state <> 'UNREVIEWED' THEN RAISE EXCEPTION 'EM006 an approval decision is final; record a new measurement'; END IF;
  RETURN NEW;
END $$;

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
    -- 0040: a value the server can work out from its evidence passes only when the server did
    IF has_criterion AND m.metric IN ('t30_mid', 't20_mid') AND m.validation IS NULL THEN
      RAISE EXCEPTION 'the measurement cited was not worked out again from its evidence by the server: it passes nothing' USING ERRCODE = 'EM019'; END IF;
  END IF;
  RETURN NEW;
END $$;
