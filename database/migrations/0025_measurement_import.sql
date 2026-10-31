-- 0025 Instrument-data import (P2, ADR-0011): a measurement file exported by an instrument becomes FIELD_MEASURED values, each traceable
-- to the stored file (SHA-256), its row, the instrument, its calibration certificate and due date, the method and the uncertainty.
-- All-or-nothing: an import with any invalid row writes nothing. A file is imported once per room. Import records are append-only.
CREATE TABLE app.measurement_import (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES app.tenant(id),
  room_id           uuid NOT NULL,
  evidence_id       uuid NOT NULL,
  file_sha256       text NOT NULL CHECK (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_name         text NOT NULL,
  instrument_id     text NOT NULL CHECK (length(instrument_id) BETWEEN 2 AND 80),
  instrument_model  text CHECK (length(instrument_model) <= 120),
  calibration_ref   text NOT NULL CHECK (length(calibration_ref) BETWEEN 2 AND 120),   -- calibration certificate number
  calibration_due   date NOT NULL,
  method            text NOT NULL CHECK (length(method) BETWEEN 2 AND 80),
  uncertainty       numeric,
  uncertainty_unit  text,
  rows_total        int NOT NULL CHECK (rows_total > 0),
  rows_calibrated   int NOT NULL CHECK (rows_calibrated BETWEEN 0 AND rows_total),
  imported_by       uuid NOT NULL REFERENCES app.person(id),
  imported_role     text NOT NULL,
  imported_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, room_id, evidence_id),
  FOREIGN KEY (tenant_id, room_id) REFERENCES app.room(tenant_id, id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id)
);
CREATE TRIGGER measurement_import_append_only BEFORE UPDATE OR DELETE ON app.measurement_import FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
SELECT app.tenant_rls('app.measurement_import');

ALTER TABLE app.measurement ADD COLUMN import_id uuid, ADD COLUMN import_row int CHECK (import_row > 0),
  ADD CONSTRAINT measurement_import_fk FOREIGN KEY (tenant_id, import_id) REFERENCES app.measurement_import(tenant_id, id),
  ADD CONSTRAINT measurement_import_row CHECK ((import_id IS NULL) = (import_row IS NULL));
CREATE UNIQUE INDEX measurement_import_row_idx ON app.measurement (tenant_id, import_id, import_row) WHERE import_id IS NOT NULL;

-- the immutability rule now covers the import link and every provenance field as well
CREATE OR REPLACE FUNCTION app.measurement_approval_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM006 measurements are never deleted'; END IF;
  IF (NEW.value, NEW.unit, NEW.provenance, NEW.metric, NEW.measured_at, NEW.method, NEW.recorded_by, NEW.instrument_id, NEW.calibration_status, NEW.calibration_due, NEW.location, NEW.source, NEW.uncertainty, NEW.import_id, NEW.import_row)
     IS DISTINCT FROM (OLD.value, OLD.unit, OLD.provenance, OLD.metric, OLD.measured_at, OLD.method, OLD.recorded_by, OLD.instrument_id, OLD.calibration_status, OLD.calibration_due, OLD.location, OLD.source, OLD.uncertainty, OLD.import_id, OLD.import_row) THEN
    RAISE EXCEPTION 'EM006 a measurement is immutable; only its approval state may change'; END IF;
  IF OLD.approval_state <> 'UNREVIEWED' THEN RAISE EXCEPTION 'EM006 an approval decision is final; record a new measurement'; END IF;
  RETURN NEW;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT ON app.measurement_import TO empathia_app; END IF;
END $$;
