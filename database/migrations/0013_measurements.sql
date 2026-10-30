-- 0013 · Measurements with provenance (ADR-0004; owner decision RT-14, 2026-10-30).
-- A measurement is a value with its unit, method, instrument and calibration state, time, location, source, uncertainty and approval
-- state. Its provenance is one of DESIGN_SPECIFIED, SIMULATED, INFERRED, OBSERVED, FIELD_MEASURED and never changes: a simulated or
-- inferred value cannot be promoted to a field measurement, and only a FIELD_MEASURED value from a calibrated instrument can be verified
-- as engineering evidence. Verification is by a different person from the recorder. Rows are append-only except the approval columns.
CREATE TABLE app.measurement (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES app.tenant(id),
  room_id            uuid NOT NULL,
  test_result_id     uuid,
  metric             text NOT NULL CHECK (metric ~ '^[a-z][a-z0-9_]{1,60}$'),
  value              numeric NOT NULL,
  unit               text NOT NULL CHECK (length(unit) BETWEEN 1 AND 20),
  method             text NOT NULL CHECK (length(method) BETWEEN 2 AND 120),
  instrument_id      text,
  calibration_status text NOT NULL DEFAULT 'UNKNOWN' CHECK (calibration_status IN ('CALIBRATED', 'EXPIRED', 'UNKNOWN', 'NOT_APPLICABLE')),
  calibration_due    date,
  measured_at        timestamptz NOT NULL,
  location           text NOT NULL CHECK (length(location) BETWEEN 1 AND 120),   -- a seat, a point, a zone of the room
  source             text NOT NULL CHECK (length(source) BETWEEN 1 AND 200),     -- who/what produced the value (collector, instrument export, model run)
  provenance         text NOT NULL CHECK (provenance IN ('DESIGN_SPECIFIED', 'SIMULATED', 'INFERRED', 'OBSERVED', 'FIELD_MEASURED')),
  uncertainty        numeric,
  uncertainty_unit   text,
  approval_state     text NOT NULL DEFAULT 'UNREVIEWED' CHECK (approval_state IN ('UNREVIEWED', 'VERIFIED', 'REJECTED')),
  approved_by        uuid REFERENCES app.person(id),
  approved_at        timestamptz,
  approval_note      text,
  recorded_by        uuid NOT NULL REFERENCES app.person(id),
  recorded_role      text NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, test_result_id) REFERENCES app.test_result(tenant_id, id),
  CHECK (provenance <> 'FIELD_MEASURED' OR instrument_id IS NOT NULL),
  CHECK (approval_state <> 'VERIFIED' OR (provenance = 'FIELD_MEASURED' AND calibration_status = 'CALIBRATED')),
  CHECK (approved_by IS NULL OR approved_by <> recorded_by),
  CHECK ((approval_state = 'UNREVIEWED') = (approved_by IS NULL))
);
CREATE INDEX measurement_room_idx ON app.measurement (tenant_id, room_id, metric, measured_at DESC);
CREATE OR REPLACE FUNCTION app.measurement_approval_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM006 measurements are never deleted'; END IF;
  IF NEW.value <> OLD.value OR NEW.unit <> OLD.unit OR NEW.provenance <> OLD.provenance OR NEW.metric <> OLD.metric OR NEW.measured_at <> OLD.measured_at OR NEW.method <> OLD.method OR NEW.recorded_by <> OLD.recorded_by OR NEW.instrument_id IS DISTINCT FROM OLD.instrument_id OR NEW.calibration_status <> OLD.calibration_status OR NEW.source <> OLD.source OR NEW.location <> OLD.location OR NEW.uncertainty IS DISTINCT FROM OLD.uncertainty THEN
    RAISE EXCEPTION 'EM006 a measurement is immutable; only its approval state may change'; END IF;
  IF OLD.approval_state <> 'UNREVIEWED' THEN RAISE EXCEPTION 'EM006 an approval decision is final; record a new measurement'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER measurement_immutable BEFORE UPDATE OR DELETE ON app.measurement FOR EACH ROW EXECUTE FUNCTION app.measurement_approval_only();
SELECT app.tenant_rls('app.measurement');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT, UPDATE ON app.measurement TO empathia_app; END IF;
END $$;
