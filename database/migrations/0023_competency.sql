-- 0023 Competency records (P1, ADR-0009): the credentials ServiceHands' hard gates read, with provenance, expiry, an independent
-- verifier and revocation. A credential counts for dispatch only when VERIFIED, unexpired and not revoked. Training records are never
-- competency by themselves; they may be cited as supporting evidence of an ASSESSMENT that someone else verifies.
-- app.staff_profile.certs is no longer read by the gates (kept for compatibility; the seed leaves it empty).
CREATE TABLE app.competency_record (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES app.tenant(id),
  person_id        uuid NOT NULL REFERENCES app.person(id),
  competency       text NOT NULL CHECK (competency ~ '^[a-z]+\.[a-z_]+$'),
  source           text NOT NULL CHECK (source IN ('EXTERNAL_CERTIFICATE', 'LICENCE', 'ASSESSMENT')),
  issuer           text NOT NULL CHECK (length(issuer) BETWEEN 2 AND 160),
  reference        text NOT NULL CHECK (length(reference) BETWEEN 1 AND 120),        -- certificate / licence / assessment number
  evidence_id      uuid,                                                              -- an uploaded copy (app.evidence_object), when there is one
  training_refs    bigint[] NOT NULL DEFAULT '{}',                                    -- supporting training records (never sufficient alone)
  issued_on        date NOT NULL,
  expires_on       date NOT NULL CHECK (expires_on > issued_on),
  state            text NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (state IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'REVOKED')),
  recorded_by      uuid NOT NULL REFERENCES app.person(id),
  recorded_at      timestamptz NOT NULL DEFAULT now(),
  decided_by       uuid REFERENCES app.person(id),
  decided_at       timestamptz,
  decision_note    text,
  revoked_by       uuid REFERENCES app.person(id),
  revoked_at       timestamptz,
  revoke_reason    text,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES app.evidence_object(tenant_id, id),
  CHECK (decided_by IS NULL OR (decided_by <> recorded_by AND decided_by <> person_id)),   -- independent of the recorder and of the holder
  CHECK ((state IN ('VERIFIED', 'REJECTED')) = (decided_by IS NOT NULL AND revoked_by IS NULL) OR state = 'REVOKED'),
  CHECK ((state = 'REVOKED') = (revoked_by IS NOT NULL))
);
CREATE INDEX competency_person_idx ON app.competency_record (tenant_id, person_id, competency) WHERE state = 'VERIFIED';
SELECT app.tenant_rls('app.competency_record');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN GRANT SELECT, INSERT, UPDATE ON app.competency_record TO empathia_app; END IF;
END $$;
