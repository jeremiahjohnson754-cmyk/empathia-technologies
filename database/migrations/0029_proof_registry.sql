-- 0029 Proof Registry (v1.8 workstream A, ADR-021): one record per capability claim, shared by the website, the demonstration and the
-- tenant application. Three questions are stored apart and never merged: how far the implementation is verified (verification_state),
-- what kind of data stands behind the claim (data_kind), and whether a person approved the public wording (public_approval).
--
-- Ownership: every claim belongs to the organization that governs it (owner_tenant_id). A PUBLIC_SANITIZED claim is governed by the
-- founder organization and names no tenant of its own; a TENANT or STAFF claim is that tenant's. Row-level security:
--   - a tenant sees and writes only its own claims (tenant_isolation, as everywhere);
--   - an unauthenticated request reads a claim only inside a transaction flagged app.proof_public = on, and then only rows that are
--     public in scope, approved for publication, and neither revoked nor blocked. The API sets the flag for the two public read routes
--     and sanitizes each row again through the shared projection before answering.
-- The cross-field rules that stop a claim saying more than its data can carry are CHECK constraints here as well as in the API.
-- Claim history is append-only. Rollback: database/rollbacks/0029_proof_registry.down.sql (drops only what this file creates).
CREATE TABLE app.proof_claim (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_tenant_id         uuid NOT NULL REFERENCES app.tenant(id),
  claim_id                text NOT NULL CHECK (claim_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{3,127}$'),
  capability_id           text NOT NULL CHECK (length(capability_id) BETWEEN 2 AND 160),
  product                 text NOT NULL CHECK (length(product) BETWEEN 2 AND 120),
  world                   text CHECK (world IS NULL OR length(world) <= 40),
  scope                   text NOT NULL CHECK (scope IN ('PUBLIC_SANITIZED', 'TENANT', 'STAFF')),
  environment             text NOT NULL CHECK (environment IN ('dev', 'test', 'staging', 'production', 'synthetic_demo')),
  data_kind               text NOT NULL CHECK (data_kind IN ('SYNTHETIC', 'MODELED', 'IMPORTED', 'LAB_OBSERVED', 'CUSTOMER_OBSERVED')),
  verification_state      text NOT NULL CHECK (verification_state IN ('SPECIFIED', 'SYNTHETIC_DEMO', 'IMPLEMENTED_NOT_VERIFIED', 'LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'LIVE_OBSERVING', 'DEGRADED', 'BLOCKED', 'REVOKED', 'RELEASED_VERIFIED')),
  implementation_revision text NOT NULL CHECK (length(implementation_revision) BETWEEN 1 AND 120),
  verification_method     text CHECK (verification_method IS NULL OR length(verification_method) <= 400),
  verifier_identity       text CHECK (verifier_identity IS NULL OR length(verifier_identity) <= 200),
  verified_at             timestamptz NOT NULL,
  expires_at              timestamptz,
  source_type             text NOT NULL CHECK (length(source_type) BETWEEN 1 AND 200),
  source_freshness_at     timestamptz,
  limitations             text[] NOT NULL DEFAULT '{}',
  claim_text_public       text CHECK (claim_text_public IS NULL OR length(claim_text_public) <= 1200),
  public_approval         text NOT NULL DEFAULT 'NOT_REQUESTED' CHECK (public_approval IN ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),
  owner                   text NOT NULL CHECK (length(owner) BETWEEN 1 AND 120),
  revision                int NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by              uuid NOT NULL REFERENCES app.person(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_tenant_id, claim_id),
  UNIQUE (owner_tenant_id, id),
  CONSTRAINT proof_synthetic_never_verified CHECK (NOT (data_kind = 'SYNTHETIC' AND verification_state IN ('LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'LIVE_OBSERVING', 'RELEASED_VERIFIED'))),
  CONSTRAINT proof_demo_holds_synthetic CHECK (NOT (environment = 'synthetic_demo' AND data_kind NOT IN ('SYNTHETIC', 'MODELED'))),
  CONSTRAINT proof_live_is_tenant_and_fresh CHECK (verification_state <> 'LIVE_OBSERVING' OR (data_kind = 'CUSTOMER_OBSERVED' AND scope = 'TENANT' AND source_freshness_at IS NOT NULL AND expires_at IS NOT NULL)),
  CONSTRAINT proof_verified_names_verifier CHECK (verification_state NOT IN ('LAB_VERIFIED', 'CUSTOMER_AUTHORIZED', 'LIVE_OBSERVING', 'RELEASED_VERIFIED') OR (verifier_identity IS NOT NULL AND verification_method IS NOT NULL)),
  CONSTRAINT proof_approved_is_public_with_wording CHECK (public_approval <> 'APPROVED' OR (scope = 'PUBLIC_SANITIZED' AND claim_text_public IS NOT NULL AND length(btrim(claim_text_public)) >= 12 AND cardinality(limitations) > 0)),
  CONSTRAINT proof_expiry_after_verification CHECK (expires_at IS NULL OR expires_at > verified_at)
);
-- a public claim's identifier is unique across the whole registry, so a public address names one claim
CREATE UNIQUE INDEX proof_claim_public_id ON app.proof_claim (claim_id) WHERE scope = 'PUBLIC_SANITIZED';
CREATE INDEX proof_claim_public_idx ON app.proof_claim (verification_state) WHERE scope = 'PUBLIC_SANITIZED' AND public_approval = 'APPROVED';

CREATE TABLE app.proof_evidence (
  owner_tenant_id     uuid NOT NULL,
  claim_uuid          uuid NOT NULL,
  evidence_id         text NOT NULL CHECK (length(evidence_id) BETWEEN 1 AND 160),
  approved_derivative boolean NOT NULL DEFAULT false,     -- only an approved derivative may ever appear in the public projection
  added_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_uuid, evidence_id),
  FOREIGN KEY (owner_tenant_id, claim_uuid) REFERENCES app.proof_claim(owner_tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE app.proof_claim_event (
  id              bigserial PRIMARY KEY,
  owner_tenant_id uuid NOT NULL,
  claim_uuid      uuid NOT NULL,
  action          text NOT NULL CHECK (action IN ('create', 'request_publication', 'approve_publication', 'reject_publication', 'revoke_publication', 'revoke', 'block', 'degrade')),
  from_state      text, to_state text NOT NULL, from_approval text, to_approval text NOT NULL,
  by_person       uuid NOT NULL REFERENCES app.person(id),
  by_role         text NOT NULL,
  note            text CHECK (note IS NULL OR length(note) <= 1000),
  at              timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (owner_tenant_id, claim_uuid) REFERENCES app.proof_claim(owner_tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX proof_claim_event_claim_idx ON app.proof_claim_event (claim_uuid, id);
CREATE TRIGGER proof_claim_event_append_only BEFORE UPDATE OR DELETE ON app.proof_claim_event FOR EACH ROW EXECUTE FUNCTION app.refuse_change();
-- a claim is withdrawn by state, never removed: its history must stay readable
CREATE FUNCTION app.proof_claim_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'EM006 a claim is revoked, never deleted'; END $$;
CREATE TRIGGER proof_claim_no_delete BEFORE DELETE ON app.proof_claim FOR EACH ROW EXECUTE FUNCTION app.proof_claim_no_delete();

ALTER TABLE app.proof_claim ENABLE ROW LEVEL SECURITY; ALTER TABLE app.proof_claim FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.proof_claim USING (owner_tenant_id = app.current_tenant()) WITH CHECK (owner_tenant_id = app.current_tenant());
CREATE POLICY proof_public_read ON app.proof_claim FOR SELECT USING (
  current_setting('app.proof_public', true) = 'on' AND scope = 'PUBLIC_SANITIZED' AND public_approval = 'APPROVED' AND verification_state NOT IN ('REVOKED', 'BLOCKED'));
ALTER TABLE app.proof_evidence ENABLE ROW LEVEL SECURITY; ALTER TABLE app.proof_evidence FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.proof_evidence USING (owner_tenant_id = app.current_tenant()) WITH CHECK (owner_tenant_id = app.current_tenant());
CREATE POLICY proof_public_read ON app.proof_evidence FOR SELECT USING (
  current_setting('app.proof_public', true) = 'on' AND approved_derivative
  AND EXISTS (SELECT 1 FROM app.proof_claim c WHERE c.id = claim_uuid));   -- the claim's own policy decides whether it is visible at all
ALTER TABLE app.proof_claim_event ENABLE ROW LEVEL SECURITY; ALTER TABLE app.proof_claim_event FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.proof_claim_event USING (owner_tenant_id = app.current_tenant()) WITH CHECK (owner_tenant_id = app.current_tenant());
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.proof_claim TO empathia_app;
    GRANT SELECT, INSERT ON app.proof_evidence, app.proof_claim_event TO empathia_app;
    GRANT USAGE, SELECT ON SEQUENCE app.proof_claim_event_id_seq TO empathia_app;
  END IF;
END $$;
