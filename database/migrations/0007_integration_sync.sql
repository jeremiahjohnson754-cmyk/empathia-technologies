-- 0007 — integration observations and sync state (Harmony / Field Intelligence starter).
-- Observations from external systems are stored per tenant with their source and evidence label. A MOCK integration can only ever
-- store SYNTHETIC_MOCK evidence (trigger EM004), so a mock can never be mistaken for a measurement downstream.
CREATE TABLE app.integration_observation (
  id               bigserial PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  integration_key  text NOT NULL REFERENCES app.integration(key),
  kind             text NOT NULL CHECK (kind IN ('device.inventory', 'device.state', 'device.firmware', 'dsp.parameter', 'ticket')),
  external_id      text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 200),
  canonical_id     text,
  match_how        text NOT NULL DEFAULT 'none' CHECK (match_how IN ('serial', 'mac', 'none')),
  value            jsonb NOT NULL,
  evidence         text NOT NULL CHECK (evidence IN ('MEASURED', 'REPORTED', 'SYNTHETIC_MOCK')),
  observed_at      timestamptz NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, integration_key, kind, external_id)
);
SELECT app.tenant_rls('app.integration_observation');
CREATE INDEX integration_observation_canonical_idx ON app.integration_observation (tenant_id, canonical_id) WHERE canonical_id IS NOT NULL;

CREATE OR REPLACE FUNCTION app.mock_evidence_only() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s text;
BEGIN
  SELECT state INTO s FROM app.integration WHERE key = NEW.integration_key;
  IF s IS DISTINCT FROM 'VERIFIED' AND NEW.evidence <> 'SYNTHETIC_MOCK' THEN
    RAISE EXCEPTION 'integration % is %: only SYNTHETIC_MOCK evidence may be stored from it', NEW.integration_key, s USING ERRCODE = 'EM004';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER integration_observation_evidence BEFORE INSERT OR UPDATE ON app.integration_observation FOR EACH ROW EXECUTE FUNCTION app.mock_evidence_only();

CREATE TABLE app.integration_sync (
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  integration_key  text NOT NULL REFERENCES app.integration(key),
  state            text NOT NULL CHECK (state IN ('OK', 'DEGRADED', 'DOWN', 'NOT_CONFIGURED')),
  last_attempt_at  timestamptz,
  last_success_at  timestamptz,
  last_error       text,
  observations     integer NOT NULL DEFAULT 0,
  retries          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, integration_key)
);
SELECT app.tenant_rls('app.integration_sync');

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.integration_observation, app.integration_sync TO empathia_app;
    GRANT USAGE, SELECT ON SEQUENCE app.integration_observation_id_seq TO empathia_app;
    GRANT EXECUTE ON FUNCTION app.mock_evidence_only() TO empathia_app;
  END IF;
END $$;
