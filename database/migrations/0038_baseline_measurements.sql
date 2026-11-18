-- 0038 · A baseline keeps the measured values it was accepted on.
-- Founder, 17 Nov 2026, 15:50: "create the accepted Assurance baseline… the original design should remain preserved alongside the
-- approved as-built and the accepted baseline."
--
-- A baseline already binds the approved design revision and its hash, the result labels, the evidence, and (0036 era) where each device
-- was: designed and as built. What it did not keep is the number a measured test was accepted on. A result's label says PASS_VERIFIED;
-- the value it rested on, and the limit it was judged against, were reachable only through the current result, which a later result
-- replaces. Assurance compares what a room does later with what it did when it was accepted, so the accepted values belong in the
-- baseline itself, immutable with the rest of it.
--
--   measurements   one entry for each current result that rests on a measurement (0037) at the moment the baseline is published:
--                  the test, the measurement, its metric, value and unit, its provenance, and the criterion it was judged against
--                  (version, limits, source). Empty for a room accepted with no measured results.

ALTER TABLE app.assurance_baseline ADD COLUMN measurements jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(measurements) = 'array');

-- the immutability rule (0011) now covers the measurements as well
CREATE OR REPLACE FUNCTION app.baseline_transition_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'EM005 assurance baselines are never deleted'; END IF;
  IF OLD.state <> 'CURRENT' OR NEW.state = 'CURRENT' THEN RAISE EXCEPTION 'EM005 a baseline version can only move from CURRENT to SUPERSEDED or WITHDRAWN'; END IF;
  IF NEW.version <> OLD.version OR NEW.results <> OLD.results OR NEW.devices <> OLD.devices OR NEW.measurements <> OLD.measurements OR NEW.design_revision <> OLD.design_revision OR NEW.design_sha256 <> OLD.design_sha256 OR NEW.evidence_ids <> OLD.evidence_ids OR NEW.published_by <> OLD.published_by OR NEW.published_at <> OLD.published_at OR NEW.room_id <> OLD.room_id THEN
    RAISE EXCEPTION 'EM005 the content of a published baseline is immutable'; END IF;
  RETURN NEW;
END $$;
