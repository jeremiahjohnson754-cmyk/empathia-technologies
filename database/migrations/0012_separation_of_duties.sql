-- 0012 · Separation of duties and scoped, expiring delegations (ADR-0005; owner decision RT-16, 2026-10-30).
-- Protected actions (funding.authorize, room.design.approve, room.classify.approve, customer.accept, baseline.approve) are never
-- performed by the author of the thing being approved; the API checks authorship per artifact (room revisions, classification proposals,
-- recorded results) and refuses with an audited rule refusal. A delegation lends an authority a person holds to another person, within a
-- scope and until an expiry; it never lifts the self-approval rule, and it can be revoked. Delegated authorities are resolved into the
-- principal at request time (app.auth_delegations) and marked so the audit shows they were delegated.
CREATE TABLE app.delegation (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES app.tenant(id),
  grantor_id   uuid NOT NULL REFERENCES app.person(id),
  grantee_id   uuid NOT NULL REFERENCES app.person(id),
  authority    text NOT NULL CHECK (authority ~ '^[a-z_][a-z0-9_.]*$' AND authority <> '*'),
  scope        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {sites:[uuid], rooms:[code], projects:[code]} — empty = the grantor's own scope
  reason       text NOT NULL CHECK (length(reason) BETWEEN 5 AND 1000),
  starts_at    timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  revoked_by   uuid REFERENCES app.person(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  CHECK (grantee_id <> grantor_id),
  CHECK (expires_at > starts_at AND expires_at <= starts_at + interval '90 days')
);
CREATE INDEX delegation_grantee_idx ON app.delegation (tenant_id, grantee_id) WHERE revoked_at IS NULL;
-- RLS ENABLED (the runtime role sees its tenant only) but not FORCED: like the identity tables, the SECURITY DEFINER resolver below
-- reads delegations at sign-in / per request before the transaction has a tenant (0002_core.sql explains the same choice).
ALTER TABLE app.delegation ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON app.delegation USING (tenant_id = app.current_tenant()) WITH CHECK (tenant_id = app.current_tenant());
-- the delegated authorities currently in force for a person in a tenant (SECURITY DEFINER: read at sign-in, like memberships)
CREATE OR REPLACE FUNCTION app.auth_delegations(p_person uuid, p_tenant uuid)
  RETURNS TABLE (authority text, grantor_id uuid, scope jsonb, expires_at timestamptz, delegation_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_temp AS
$$ SELECT d.authority, d.grantor_id, d.scope, d.expires_at, d.id FROM app.delegation d
     JOIN app.membership m ON m.tenant_id = d.tenant_id AND m.person_id = d.grantor_id AND m.revoked_at IS NULL
     JOIN app.role r ON r.key = m.role_key
    WHERE d.tenant_id = p_tenant AND d.grantee_id = p_person AND d.revoked_at IS NULL AND now() BETWEEN d.starts_at AND d.expires_at
      AND (d.authority = ANY(r.authorities) OR '*' = ANY(r.authorities)) $$;   -- a grantor can only lend what they still hold
REVOKE ALL ON FUNCTION app.auth_delegations(uuid, uuid) FROM PUBLIC;
-- who proposed the classification: recorded so the approver can be checked against it
ALTER TABLE app.room ADD COLUMN classification_proposed_by uuid REFERENCES app.person(id);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empathia_app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.delegation TO empathia_app;
    GRANT EXECUTE ON FUNCTION app.auth_delegations(uuid, uuid) TO empathia_app;
  END IF;
END $$;
